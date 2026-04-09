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
