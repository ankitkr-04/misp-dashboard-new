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


class TelemetryPayload(BaseModel):
    messages_per_second: float
    active_connections: int
    latency_ms: float
    db_nodes_online: int


class WSMessage(BaseModel):
    msg_type: str
    data: dict
