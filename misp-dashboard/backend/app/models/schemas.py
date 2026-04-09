from pydantic import BaseModel


class GeoLocation(BaseModel):
    lat: float
    lon: float
    city: str
    country: str


class ThreatPayload(BaseModel):
    id: str
    timestamp: str
    type: str
    severity: str
    malware_family: str
    src_ip: str
    src_geo: GeoLocation
    dst_ip: str
    dst_geo: GeoLocation
    hash_sha256: str
    misp_event_id: int
    tags: list[str]
    source: str
    target_hq_id: str
    target_hq_name: str


class TelemetryPayload(BaseModel):
    messages_per_second: float
    active_connections: int
    latency_ms: float
    db_nodes_online: int


class WSMessage(BaseModel):
    msg_type: str
    data: dict


class HQNode(BaseModel):
    id: str
    name: str
    ip: str
    lat: float
    lon: float
    city: str
    country: str
    accent: str


class LiveFeedStatusPayload(BaseModel):
    data_source: str
    loaded_count: int
    last_refresh: str | None
    last_error: str | None
    status: str


class AdminStatePayload(BaseModel):
    demo_mode: bool
    data_source: str
    simulation_profile: str
    active_hq_ids: list[str]
    enabled_threat_types: list[str]
    enabled_severities: list[str]
    auto_refresh_live_feed: bool
    live_feed_refresh_minutes: float
    ws_broadcast_interval_seconds: float
    effective_source: str
    otx_api_key_configured: bool
    live_feed_status: LiveFeedStatusPayload


class AdminCatalogPayload(BaseModel):
    data_sources: list[str]
    simulation_profiles: list[str]
    threat_types: list[str]
    severities: list[str]
    hqs: list[HQNode]


class AdminStateResponse(BaseModel):
    state: AdminStatePayload
    catalog: AdminCatalogPayload


class AdminStateUpdateRequest(BaseModel):
    demo_mode: bool | None = None
    data_source: str | None = None
    simulation_profile: str | None = None
    active_hq_ids: list[str] | None = None
    enabled_threat_types: list[str] | None = None
    enabled_severities: list[str] | None = None
    auto_refresh_live_feed: bool | None = None
    live_feed_refresh_minutes: float | None = None
    ws_broadcast_interval_seconds: float | None = None
