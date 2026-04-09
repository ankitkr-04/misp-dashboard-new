from threading import Lock

from app.core.config import settings
from app.models.schemas import (
    AdminCatalogPayload,
    AdminStatePayload,
    AdminStateResponse,
    AdminStateUpdateRequest,
    LiveFeedStatusPayload,
)
from app.services.threat_generator import (
    HQ_NODES,
    LIVE_DATA_SOURCES,
    SEVERITY_LEVELS,
    SIMULATION_PROFILES,
    THREAT_TYPES,
)


class ControlPlane:
    def __init__(self) -> None:
        self._lock = Lock()
        self._state = {
            "demo_mode": settings.DEFAULT_DEMO_MODE,
            "ai_features_enabled": settings.AI_FEATURES_ENABLED_DEFAULT,
            "data_source": settings.DEFAULT_DATA_SOURCE if settings.DEFAULT_DATA_SOURCE in LIVE_DATA_SOURCES else LIVE_DATA_SOURCES[0],
            "simulation_profile": settings.DEFAULT_SIMULATION_PROFILE if settings.DEFAULT_SIMULATION_PROFILE in SIMULATION_PROFILES else SIMULATION_PROFILES[0],
            "active_hq_ids": self._normalize_hq_ids(settings.DEFAULT_ACTIVE_HQ_IDS.split(",")),
            "enabled_threat_types": THREAT_TYPES.copy(),
            "enabled_severities": SEVERITY_LEVELS.copy(),
            "auto_refresh_live_feed": settings.AUTO_REFRESH_LIVE_FEED,
            "live_feed_refresh_minutes": float(settings.LIVE_FEED_REFRESH_MINUTES),
            "ws_broadcast_interval_seconds": settings.WS_BROADCAST_INTERVAL_SECONDS,
        }
        self._god_mode_active = False

    def _normalize_hq_ids(self, hq_ids: list[str]) -> list[str]:
        normalized = [hq.id for hq in HQ_NODES if hq.id in {item.strip() for item in hq_ids if item.strip()}]
        return normalized or ["nyc"]

    def _normalize_allowed(self, available: list[str], selected: list[str] | None) -> list[str]:
        if not selected:
            return available.copy()

        filtered = [value for value in available if value in selected]
        return filtered or available.copy()

    def get_runtime_snapshot(self) -> dict:
        with self._lock:
            return {
                "demo_mode": self._state["demo_mode"],
                "ai_features_enabled": self._state["ai_features_enabled"],
                "data_source": self._state["data_source"],
                "simulation_profile": self._state["simulation_profile"],
                "active_hq_ids": self._state["active_hq_ids"].copy(),
                "enabled_threat_types": self._state["enabled_threat_types"].copy(),
                "enabled_severities": self._state["enabled_severities"].copy(),
                "auto_refresh_live_feed": self._state["auto_refresh_live_feed"],
                "live_feed_refresh_minutes": self._state["live_feed_refresh_minutes"],
                "ws_broadcast_interval_seconds": self._state["ws_broadcast_interval_seconds"],
            }

    def update(self, patch: AdminStateUpdateRequest) -> dict:
        with self._lock:
            next_demo_mode = patch.demo_mode if patch.demo_mode is not None else self._state["demo_mode"]

            if patch.demo_mode is not None:
                self._state["demo_mode"] = patch.demo_mode

            if patch.ai_features_enabled is not None:
                self._state["ai_features_enabled"] = patch.ai_features_enabled

            if patch.data_source is not None and patch.data_source in LIVE_DATA_SOURCES:
                self._state["data_source"] = patch.data_source

            if (
                patch.simulation_profile is not None
                and patch.simulation_profile in SIMULATION_PROFILES
                and next_demo_mode
            ):
                self._state["simulation_profile"] = patch.simulation_profile

            if patch.active_hq_ids is not None:
                self._state["active_hq_ids"] = self._normalize_hq_ids(patch.active_hq_ids)

            if patch.enabled_threat_types is not None and next_demo_mode:
                self._state["enabled_threat_types"] = self._normalize_allowed(THREAT_TYPES, patch.enabled_threat_types)

            if patch.enabled_severities is not None and next_demo_mode:
                self._state["enabled_severities"] = self._normalize_allowed(SEVERITY_LEVELS, patch.enabled_severities)

            if patch.auto_refresh_live_feed is not None:
                self._state["auto_refresh_live_feed"] = patch.auto_refresh_live_feed

            if patch.live_feed_refresh_minutes is not None:
                self._state["live_feed_refresh_minutes"] = max(1.0, min(120.0, patch.live_feed_refresh_minutes))

            if patch.ws_broadcast_interval_seconds is not None:
                self._state["ws_broadcast_interval_seconds"] = max(0.2, min(10.0, patch.ws_broadcast_interval_seconds))

        return self.get_runtime_snapshot()

    def trigger_god_mode(self) -> None:
        with self._lock:
            self._god_mode_active = True

    def consume_god_mode(self) -> bool:
        with self._lock:
            if not self._god_mode_active:
                return False

            self._god_mode_active = False
            return True

    def build_catalog(self) -> AdminCatalogPayload:
        return AdminCatalogPayload(
            data_sources=LIVE_DATA_SOURCES.copy(),
            simulation_profiles=SIMULATION_PROFILES.copy(),
            threat_types=THREAT_TYPES.copy(),
            severities=SEVERITY_LEVELS.copy(),
            hqs=HQ_NODES.copy(),
        )

    def build_state_payload(self, live_feed_status: LiveFeedStatusPayload) -> AdminStatePayload:
        snapshot = self.get_runtime_snapshot()
        effective_source = "mock" if snapshot["demo_mode"] else snapshot["data_source"]

        return AdminStatePayload(
            demo_mode=snapshot["demo_mode"],
            ai_features_enabled=snapshot["ai_features_enabled"],
            data_source=snapshot["data_source"],
            simulation_profile=snapshot["simulation_profile"],
            active_hq_ids=snapshot["active_hq_ids"],
            enabled_threat_types=snapshot["enabled_threat_types"],
            enabled_severities=snapshot["enabled_severities"],
            auto_refresh_live_feed=snapshot["auto_refresh_live_feed"],
            live_feed_refresh_minutes=snapshot["live_feed_refresh_minutes"],
            ws_broadcast_interval_seconds=snapshot["ws_broadcast_interval_seconds"],
            effective_source=effective_source,
            otx_api_key_configured=bool(settings.OTX_API_KEY),
            live_feed_status=live_feed_status,
        )

    def build_response(self, live_feed_status: LiveFeedStatusPayload) -> AdminStateResponse:
        return AdminStateResponse(
            state=self.build_state_payload(live_feed_status),
            catalog=self.build_catalog(),
        )


control_plane = ControlPlane()
