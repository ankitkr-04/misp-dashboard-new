import json
import random
from datetime import datetime, timedelta, timezone
from threading import Lock
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from app.core.config import settings
from app.models.schemas import GeoLocation, LiveFeedStatusPayload, ThreatPayload
from app.services.threat_generator import (
    build_hash,
    coerce_sha256,
    fallback_geo_for_country,
    infer_malware_family,
    infer_threat_type,
    is_ip_value,
    pick_target_hq,
    select_active_hqs,
    severity_from_misp_level,
    stable_event_id,
)


HASH_ATTRIBUTE_TYPES = {"sha256", "sha1", "md5"}
IP_ATTRIBUTE_TYPES = {"ip-src", "ip-dst"}


class LiveFeedService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._items: list[dict] = []
        self._cursor = 0
        self._last_refresh: datetime | None = None
        self._last_error: str | None = None
        self._status = "idle"
        self._source = settings.DEFAULT_DATA_SOURCE
        self._geo_cache: dict[str, GeoLocation] = {}

    def _fetch_json(self, url: str, headers: dict[str, str] | None = None) -> dict:
        request = Request(url, headers=headers or {})
        with urlopen(request, timeout=settings.LIVE_FEED_REQUEST_TIMEOUT_SECONDS) as response:
            return json.load(response)

    def _build_event_url(self, event_uuid: str) -> str:
        base_url = settings.PUBLIC_MISP_FEED_URL.rsplit("/", 1)[0]
        return f"{base_url}/{event_uuid}.json"

    def _extract_tags(self, event: dict) -> list[str]:
        tags = [tag.get("name", "") for tag in event.get("Tag", []) if tag.get("name")]
        return tags or ["source:public-misp-feed"]

    def _parse_event(self, event_payload: dict) -> list[dict]:
        event = event_payload.get("Event", {})
        attributes = event.get("Attribute", [])
        tags = self._extract_tags(event)
        info = event.get("info", "Public MISP Indicator")
        threat_type = infer_threat_type(f"{info} {' '.join(tags)}")
        malware_family = infer_malware_family(f"{info} {' '.join(tags)}")
        severity = severity_from_misp_level(event.get("threat_level_id"))
        publish_timestamp = event.get("publish_timestamp") or event.get("timestamp")
        timestamp = datetime.fromtimestamp(int(publish_timestamp), tz=timezone.utc).isoformat() if publish_timestamp else datetime.now(timezone.utc).isoformat()
        hash_candidates = [attribute.get("value", "") for attribute in attributes if attribute.get("type") in HASH_ATTRIBUTE_TYPES]
        hash_value = coerce_sha256(hash_candidates[0] if hash_candidates else info)
        ip_candidates = [
            attribute.get("value", "")
            for attribute in attributes
            if attribute.get("type") in IP_ATTRIBUTE_TYPES and is_ip_value(attribute.get("value", ""))
        ]

        items: list[dict] = []
        for ip_value in ip_candidates[: settings.PUBLIC_MISP_IPS_PER_EVENT]:
            items.append(
                {
                    "source_ip": ip_value,
                    "timestamp": timestamp,
                    "type": threat_type,
                    "severity": severity,
                    "malware_family": malware_family,
                    "hash_sha256": hash_value,
                    "misp_event_id": stable_event_id(event.get("uuid", ip_value)),
                    "tags": tags[:6],
                    "event_uuid": event.get("uuid", str(uuid4())),
                    "info": info,
                }
            )

        return items

    def refresh_public_feed(self) -> int:
        manifest = self._fetch_json(settings.PUBLIC_MISP_FEED_URL)
        ranked_events = sorted(
            manifest.items(),
            key=lambda item: item[1].get("timestamp", 0),
            reverse=True,
        )[: settings.PUBLIC_MISP_EVENT_LIMIT]

        feed_items: list[dict] = []
        for event_uuid, _ in ranked_events:
            event_payload = self._fetch_json(self._build_event_url(event_uuid))
            feed_items.extend(self._parse_event(event_payload))
            if len(feed_items) >= settings.PUBLIC_MISP_MAX_ITEMS:
                break

        with self._lock:
            self._items = feed_items[: settings.PUBLIC_MISP_MAX_ITEMS]
            self._cursor = 0
            self._last_refresh = datetime.now(timezone.utc)
            self._last_error = None
            self._status = "ready" if self._items else "empty"
            self._source = "public_misp"
            return len(self._items)

    def refresh(self, source: str, force: bool = False) -> int:
        should_refresh = force

        with self._lock:
            if self._last_refresh is None or not self._items:
                should_refresh = True
            elif datetime.now(timezone.utc) - self._last_refresh >= timedelta(minutes=settings.LIVE_FEED_REFRESH_MINUTES):
                should_refresh = True

        if not should_refresh:
            with self._lock:
                return len(self._items)

        try:
            if source == "public_misp":
                return self.refresh_public_feed()
        except Exception as exc:
            with self._lock:
                self._last_error = str(exc)
                self._status = "error"
                return len(self._items)

        return 0

    def get_status(self, source: str) -> LiveFeedStatusPayload:
        with self._lock:
            return LiveFeedStatusPayload(
                data_source=source,
                loaded_count=len(self._items),
                last_refresh=self._last_refresh.isoformat() if self._last_refresh else None,
                last_error=self._last_error,
                status=self._status,
            )

    def _geolocate_ip(self, ip_value: str) -> GeoLocation:
        with self._lock:
            cached = self._geo_cache.get(ip_value)

        if cached is not None:
            return cached

        if not settings.ENABLE_IP_GEOLOOKUP:
            geo = fallback_geo_for_country(None)
            with self._lock:
                self._geo_cache[ip_value] = geo
            return geo

        try:
            lookup_url = settings.IP_GEOLOOKUP_URL_TEMPLATE.format(ip=quote(ip_value, safe=""))
            payload = self._fetch_json(lookup_url)
            if payload.get("success") is True:
                geo = GeoLocation(
                    lat=float(payload.get("latitude", 0.0)),
                    lon=float(payload.get("longitude", 0.0)),
                    city=payload.get("city") or "Unknown City",
                    country=payload.get("country_code") or payload.get("country") or "UN",
                )
            else:
                geo = fallback_geo_for_country(payload.get("country_code"))
        except Exception:
            geo = fallback_geo_for_country(None)

        with self._lock:
            self._geo_cache[ip_value] = geo

        return geo

    def next_threat(self, runtime_state: dict) -> ThreatPayload | None:
        if runtime_state.get("auto_refresh_live_feed", True):
            self.refresh(runtime_state.get("data_source", "public_misp"))
        else:
            self.refresh(runtime_state.get("data_source", "public_misp"), force=False)

        with self._lock:
            if not self._items:
                return None

            items = self._items.copy()
            start_cursor = self._cursor

        enabled_types = set(runtime_state.get("enabled_threat_types", []))
        enabled_severities = set(runtime_state.get("enabled_severities", []))

        attempts = 0
        selected_item: dict | None = None
        while attempts < len(items):
            with self._lock:
                item = self._items[self._cursor % len(self._items)]
                self._cursor = (self._cursor + 1) % len(self._items)

            if item["type"] in enabled_types and item["severity"] in enabled_severities:
                selected_item = item
                break

            attempts += 1

        if selected_item is None:
            with self._lock:
                self._cursor = start_cursor
            return None

        src_geo = self._geolocate_ip(selected_item["source_ip"])
        target_hq = random.choice(select_active_hqs(runtime_state.get("active_hq_ids")))

        return ThreatPayload(
            id=str(uuid4()),
            timestamp=selected_item["timestamp"],
            type=selected_item["type"],
            severity=selected_item["severity"],
            malware_family=selected_item["malware_family"],
            src_ip=selected_item["source_ip"],
            src_geo=src_geo,
            dst_ip=target_hq.ip,
            dst_geo=GeoLocation(
                lat=target_hq.lat,
                lon=target_hq.lon,
                city=target_hq.city,
                country=target_hq.country,
            ),
            hash_sha256=selected_item["hash_sha256"] or build_hash(selected_item["info"]),
            misp_event_id=selected_item["misp_event_id"],
            tags=selected_item["tags"],
            source="public_misp",
            target_hq_id=target_hq.id,
            target_hq_name=target_hq.name,
        )


live_feed_service = LiveFeedService()
