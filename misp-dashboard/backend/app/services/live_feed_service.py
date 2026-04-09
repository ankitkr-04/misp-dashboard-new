import json
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
    severity_from_misp_level,
    stable_event_id,
)


HASH_ATTRIBUTE_TYPES = {"sha256", "sha1", "md5"}
IP_ATTRIBUTE_TYPES = {"ip-src", "ip-dst"}
OTX_HASH_TYPES = {"FileHash-SHA256", "FileHash-SHA1", "FileHash-MD5"}
OTX_IP_TYPES = {"IPv4"}


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

    def _commit_refresh_result(self, source: str, feed_items: list[dict]) -> int:
        with self._lock:
            self._items = feed_items
            self._cursor = 0
            self._last_refresh = datetime.now(timezone.utc)
            self._last_error = None
            self._status = "ready" if self._items else "empty"
            self._source = source
            return len(self._items)

    def _record_refresh_error(self, source: str, message: str) -> int:
        with self._lock:
            if source != self._source:
                self._items = []
                self._cursor = 0
            self._last_error = message
            self._status = "error"
            self._source = source
            return len(self._items)

    def _build_event_url(self, event_uuid: str) -> str:
        base_url = settings.PUBLIC_MISP_FEED_URL.rsplit("/", 1)[0]
        return f"{base_url}/{event_uuid}.json"

    def _build_otx_url(self, page: int) -> str:
        return f"{settings.OTX_PULSES_URL}?limit={settings.OTX_PULSE_PAGE_SIZE}&page={page}"

    def _otx_headers(self) -> dict[str, str]:
        return {
            "User-Agent": "misp-dashboard/1.0",
            "X-OTX-API-KEY": settings.OTX_API_KEY,
        }

    def _normalize_values(self, raw_value: object, prefix: str | None = None) -> list[str]:
        if not raw_value:
            return []

        values = raw_value if isinstance(raw_value, list) else [raw_value]
        normalized: list[str] = []
        for value in values:
            if isinstance(value, str) and value.strip():
                normalized.append(value.strip())
                continue

            if isinstance(value, dict):
                for key in ("name", "title", "display_name", "indicator", "value"):
                    candidate = value.get(key)
                    if isinstance(candidate, str) and candidate.strip():
                        normalized.append(candidate.strip())
                        break

        if prefix:
            return [f"{prefix}:{item}" for item in normalized]

        return normalized

    def _extract_tags(self, event: dict) -> list[str]:
        tags = [tag.get("name", "") for tag in event.get("Tag", []) if tag.get("name")]
        return tags or ["source:public-misp-feed"]

    def _extract_otx_tags(self, pulse: dict) -> list[str]:
        tags = self._normalize_values(pulse.get("tags"))
        tags.extend(self._normalize_values(pulse.get("attack_ids"), prefix="attack"))
        tags.extend(self._normalize_values(pulse.get("industries"), prefix="industry"))
        tags.extend(self._normalize_values(pulse.get("targeted_countries"), prefix="target"))
        if pulse.get("author_name"):
            tags.append(f"author:{pulse['author_name']}")
        if pulse.get("adversary"):
            tags.append(f"adversary:{pulse['adversary']}")
        return list(dict.fromkeys(tags))[:8] or ["source:alienvault-otx"]

    def _coerce_timestamp(self, value: object) -> str:
        if isinstance(value, str) and value:
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
            except ValueError:
                return value

        return datetime.now(timezone.utc).isoformat()

    def _severity_from_otx_pulse(
        self,
        pulse: dict,
        threat_type: str,
        indicator_count: int,
    ) -> str:
        searchable_text = " ".join(
            [
                str(pulse.get("name", "")),
                str(pulse.get("description", "")),
                str(pulse.get("adversary", "")),
                " ".join(self._normalize_values(pulse.get("attack_ids"))),
                " ".join(self._normalize_values(pulse.get("malware_families"))),
            ]
        ).lower()

        if any(token in searchable_text for token in ("ransomware", "wiper", "zero-day", "0day")):
            return "Critical"

        if threat_type in {"Exploit", "Ransomware"} and indicator_count >= 8:
            return "Critical"

        if indicator_count >= 16 or pulse.get("adversary") or pulse.get("malware_families"):
            return "High"

        if threat_type in {"C2", "Botnet", "DDoS"} or pulse.get("attack_ids"):
            return "High"

        if threat_type == "Phishing":
            return "Medium"

        return "Medium"

    def _parse_event(self, event_payload: dict) -> list[dict]:
        event = event_payload.get("Event", {})
        attributes = event.get("Attribute", [])
        tags = self._extract_tags(event)
        info = event.get("info", "Public MISP Indicator")
        threat_type = infer_threat_type(f"{info} {' '.join(tags)}")
        malware_family = infer_malware_family(f"{info} {' '.join(tags)}")
        severity = severity_from_misp_level(event.get("threat_level_id"))
        publish_timestamp = event.get("publish_timestamp") or event.get("timestamp")
        timestamp = (
            datetime.fromtimestamp(int(publish_timestamp), tz=timezone.utc).isoformat()
            if publish_timestamp
            else datetime.now(timezone.utc).isoformat()
        )
        hash_candidates = [
            attribute.get("value", "")
            for attribute in attributes
            if attribute.get("type") in HASH_ATTRIBUTE_TYPES
        ]
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
                    "source": "public_misp",
                    "source_ip": ip_value,
                    "timestamp": timestamp,
                    "type": threat_type,
                    "severity": severity,
                    "malware_family": malware_family,
                    "hash_sha256": hash_value,
                    "misp_event_id": stable_event_id(event.get("uuid", ip_value)),
                    "tags": tags[:6],
                    "info": info,
                    "country_hint": None,
                }
            )

        return items

    def _parse_otx_pulse(self, pulse: dict) -> list[dict]:
        indicators = pulse.get("indicators") or []
        tags = self._extract_otx_tags(pulse)
        text_blob = " ".join(
            [
                str(pulse.get("name", "")),
                str(pulse.get("description", "")),
                str(pulse.get("adversary", "")),
                " ".join(tags),
                " ".join(self._normalize_values(pulse.get("malware_families"))),
            ]
        )
        threat_type = infer_threat_type(text_blob)
        malware_family = self._normalize_values(pulse.get("malware_families"))[:1]
        resolved_malware_family = malware_family[0] if malware_family else infer_malware_family(text_blob)
        severity = self._severity_from_otx_pulse(pulse, threat_type, len(indicators))
        timestamp = self._coerce_timestamp(pulse.get("modified") or pulse.get("created"))
        hash_candidates = [
            indicator.get("indicator", "")
            for indicator in indicators
            if indicator.get("type") in OTX_HASH_TYPES
        ]
        hash_value = coerce_sha256(hash_candidates[0] if hash_candidates else pulse.get("name") or str(pulse.get("id", "")))
        ip_candidates = [
            indicator.get("indicator", "")
            for indicator in indicators
            if indicator.get("type") in OTX_IP_TYPES and is_ip_value(indicator.get("indicator", ""))
        ]
        country_hints = self._normalize_values(pulse.get("targeted_countries"))
        country_hint = country_hints[0] if country_hints else None

        items: list[dict] = []
        for ip_value in ip_candidates[: settings.OTX_IPS_PER_PULSE]:
            items.append(
                {
                    "source": "alienvault_otx",
                    "source_ip": ip_value,
                    "timestamp": timestamp,
                    "type": threat_type,
                    "severity": severity,
                    "malware_family": resolved_malware_family,
                    "hash_sha256": hash_value,
                    "misp_event_id": stable_event_id(pulse.get("id", ip_value)),
                    "tags": tags,
                    "info": pulse.get("name") or "AlienVault OTX Pulse",
                    "country_hint": country_hint,
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

        return self._commit_refresh_result("public_misp", feed_items[: settings.PUBLIC_MISP_MAX_ITEMS])

    def refresh_otx_feed(self) -> int:
        if not settings.OTX_API_KEY:
            return self._record_refresh_error("alienvault_otx", "OTX_API_KEY is not configured.")

        feed_items: list[dict] = []
        next_url = self._build_otx_url(page=1)
        pages_loaded = 0

        while next_url and pages_loaded < settings.OTX_PULSE_MAX_PAGES and len(feed_items) < settings.OTX_MAX_ITEMS:
            payload = self._fetch_json(next_url, headers=self._otx_headers())
            for pulse in payload.get("results", []):
                feed_items.extend(self._parse_otx_pulse(pulse))
                if len(feed_items) >= settings.OTX_MAX_ITEMS:
                    break

            next_value = payload.get("next")
            next_url = next_value if isinstance(next_value, str) and next_value else None
            pages_loaded += 1

        return self._commit_refresh_result("alienvault_otx", feed_items[: settings.OTX_MAX_ITEMS])

    def refresh(
        self,
        source: str,
        force: bool = False,
        allow_scheduled_refresh: bool = True,
        refresh_minutes: float | None = None,
    ) -> int:
        should_refresh = force
        refresh_window = refresh_minutes if refresh_minutes is not None else float(settings.LIVE_FEED_REFRESH_MINUTES)

        with self._lock:
            if source != self._source:
                should_refresh = True
            elif self._last_refresh is None or not self._items:
                should_refresh = True
            elif allow_scheduled_refresh and datetime.now(timezone.utc) - self._last_refresh >= timedelta(minutes=refresh_window):
                should_refresh = True

        if not should_refresh:
            with self._lock:
                return len(self._items)

        try:
            if source == "public_misp":
                return self.refresh_public_feed()
            if source == "alienvault_otx":
                return self.refresh_otx_feed()
        except Exception as exc:
            return self._record_refresh_error(source, str(exc))

        return self._record_refresh_error(source, f"Unsupported data source: {source}")

    def get_status(self, source: str) -> LiveFeedStatusPayload:
        with self._lock:
            return LiveFeedStatusPayload(
                data_source=self._source or source,
                loaded_count=len(self._items),
                last_refresh=self._last_refresh.isoformat() if self._last_refresh else None,
                last_error=self._last_error,
                status=self._status,
            )

    def _geolocate_ip(self, ip_value: str, country_hint: str | None = None) -> GeoLocation:
        with self._lock:
            cached = self._geo_cache.get(ip_value)

        if cached is not None:
            return cached

        if not settings.ENABLE_IP_GEOLOOKUP:
            geo = fallback_geo_for_country(country_hint)
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
                geo = fallback_geo_for_country(country_hint or payload.get("country_code"))
        except Exception:
            geo = fallback_geo_for_country(country_hint)

        with self._lock:
            self._geo_cache[ip_value] = geo

        return geo

    def next_threat(self, runtime_state: dict) -> ThreatPayload | None:
        selected_source = runtime_state.get("data_source", "public_misp")
        self.refresh(
            selected_source,
            force=False,
            allow_scheduled_refresh=bool(runtime_state.get("auto_refresh_live_feed", True)),
            refresh_minutes=float(runtime_state.get("live_feed_refresh_minutes", settings.LIVE_FEED_REFRESH_MINUTES)),
        )

        with self._lock:
            if not self._items:
                return None
            start_cursor = self._cursor
            items_count = len(self._items)

        if bool(runtime_state.get("demo_mode")):
            enabled_types = set(runtime_state.get("enabled_threat_types", []))
            enabled_severities = set(runtime_state.get("enabled_severities", []))
        else:
            enabled_types = set()
            enabled_severities = set()

        attempts = 0
        selected_item: dict | None = None
        while attempts < items_count:
            with self._lock:
                item = self._items[self._cursor % len(self._items)]
                self._cursor = (self._cursor + 1) % len(self._items)

            if not enabled_types or (
                item["type"] in enabled_types and item["severity"] in enabled_severities
            ):
                selected_item = item
                break

            attempts += 1

        if selected_item is None:
            with self._lock:
                self._cursor = start_cursor
            return None

        src_geo = self._geolocate_ip(
            str(selected_item["source_ip"]),
            selected_item.get("country_hint"),
        )
        target_hq = pick_target_hq(runtime_state.get("active_hq_ids"))

        return ThreatPayload(
            id=str(uuid4()),
            timestamp=str(selected_item["timestamp"]),
            type=str(selected_item["type"]),
            severity=str(selected_item["severity"]),
            malware_family=str(selected_item["malware_family"]),
            src_ip=str(selected_item["source_ip"]),
            src_geo=src_geo,
            dst_ip=target_hq.ip,
            dst_geo=GeoLocation(
                lat=target_hq.lat,
                lon=target_hq.lon,
                city=target_hq.city,
                country=target_hq.country,
            ),
            hash_sha256=str(selected_item["hash_sha256"] or build_hash(str(selected_item["info"]))),
            misp_event_id=int(selected_item["misp_event_id"]),
            tags=list(selected_item["tags"]),
            source=str(selected_item.get("source") or selected_source),
            target_hq_id=target_hq.id,
            target_hq_name=target_hq.name,
        )


live_feed_service = LiveFeedService()
