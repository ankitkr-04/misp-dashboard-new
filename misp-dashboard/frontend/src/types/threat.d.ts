import type { ComponentType, RefAttributes } from "react";

export interface GeoLocation {
  lat: number;
  lon: number;
  city: string;
  country: string;
}

export interface ThreatPayload {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  malware_family: string;
  src_ip: string;
  src_geo: GeoLocation;
  dst_ip: string;
  dst_geo: GeoLocation;
  hash_sha256: string;
  misp_event_id: number;
  tags: string[];
  source: string;
  target_hq_id: string;
  target_hq_name: string;
}

export interface TelemetryPayload {
  messages_per_second: number;
  active_connections: number;
  latency_ms: number;
  db_nodes_online: number;
}

export interface WSMessage {
  msg_type: "threat" | "telemetry";
  data: Record<string, unknown>;
}

export interface HqNode {
  id: string;
  name: string;
  ip: string;
  lat: number;
  lon: number;
  city: string;
  country: string;
  accent: string;
}

export interface LiveFeedStatusPayload {
  data_source: string;
  loaded_count: number;
  last_refresh: string | null;
  last_error: string | null;
  status: string;
}

export interface AdminStatePayload {
  demo_mode: boolean;
  data_source: string;
  simulation_profile: string;
  active_hq_ids: string[];
  enabled_threat_types: string[];
  enabled_severities: string[];
  auto_refresh_live_feed: boolean;
  live_feed_refresh_minutes: number;
  ws_broadcast_interval_seconds: number;
  effective_source: string;
  otx_api_key_configured: boolean;
  live_feed_status: LiveFeedStatusPayload;
}

export interface AdminCatalogPayload {
  data_sources: string[];
  simulation_profiles: string[];
  threat_types: string[];
  severities: string[];
  hqs: HqNode[];
}

export interface AdminStateResponse {
  state: AdminStatePayload;
  catalog: AdminCatalogPayload;
}

export interface AdminStateUpdateRequest {
  demo_mode?: boolean;
  data_source?: string;
  simulation_profile?: string;
  active_hq_ids?: string[];
  enabled_threat_types?: string[];
  enabled_severities?: string[];
  auto_refresh_live_feed?: boolean;
  live_feed_refresh_minutes?: number;
  ws_broadcast_interval_seconds?: number;
}

declare module "react-globe.gl" {
  export interface GlobeMethods {
    controls: () => {
      autoRotate: boolean;
      autoRotateSpeed: number;
    };
    pointOfView: (
      coords: {
        lat?: number;
        lng?: number;
        altitude?: number;
      },
      durationMs?: number,
    ) => void;
  }

  const Globe: ComponentType<Record<string, unknown> & RefAttributes<GlobeMethods>>;

  export default Globe;
}
