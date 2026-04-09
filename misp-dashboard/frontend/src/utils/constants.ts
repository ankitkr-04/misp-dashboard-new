export const WS_URL = "ws://localhost:8000/ws";
export const API_BASE = "http://localhost:8000/api";
export const ADMIN_STATE_ENDPOINT = `${API_BASE}/admin/state`;
export const ADMIN_REFRESH_FEED_ENDPOINT = `${API_BASE}/admin/refresh-feed`;
export const MAX_TERMINAL_LINES = 120;
export const MAX_GLOBE_ARCS = 50;
export const ARC_DECAY_MS = 5000;
export const WS_RECONNECT_DELAY_MS = 3000;
export const ADMIN_STATE_POLL_INTERVAL_MS = 5000;
export const COUNTER_ANIMATION_DURATION_MS = 500;
export const ANALYSIS_TYPEWRITER_SPEED_MS = 14;
export const VELOCITY_SAMPLE_INTERVAL_MS = 1000;
export const VELOCITY_HISTORY_POINTS = 60;
export const TOPBAR_FLASH_MS = 2000;
export const MITIGATION_DELAY_MIN_MS = 300;
export const MITIGATION_DELAY_MAX_MS = 600;
export const TERMINAL_SCROLL_BOTTOM_BEHAVIOR: ScrollBehavior = "smooth";
export const GLOBE_BACKGROUND = "#000008";
export const GLOBE_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
export const GLOBE_BUMP_URL = "https://unpkg.com/three-globe/example/img/earth-topology.png";
export const GLOBE_AUTO_ROTATE_SPEED = 0.4;
export const GLOBE_ARC_DASH_LENGTH = 0.4;
export const GLOBE_ARC_DASH_GAP = 0.2;
export const GLOBE_ARC_ANIMATE_TIME_MS = 1500;
export const GLOBE_POINT_ALTITUDE = 0.015;
export const GLOBE_POINT_RADIUS = 0.12;
export const GLOBE_VIEW_ALTITUDE = 2.15;
export const GLOBE_LABEL_ALTITUDE = 0.02;
export const GLOBE_LABEL_SIZE = 0.7;
export const GLOBE_LABEL_DOT_RADIUS = 0.28;
export const GLOBE_DECAY_SWEEP_MS = 500;
export const GLOBE_RESIZE_FALLBACK = { width: 640, height: 640 };
export const MITIGATED_COLOR = "#22c55e";
export const MODAL_SPRING = { type: "spring", stiffness: 180, damping: 22 } as const;
export const ROUTES = {
  dashboard: "/",
  admin: "/admin",
} as const;
export const DATA_SOURCE_LABELS = {
  mock: "DEMO SIMULATION",
  public_misp: "PUBLIC MISP FEED",
} as const;
export const SIMULATION_PROFILE_LABELS = {
  balanced: "Balanced",
  ddos: "DDoS Storm",
  ransomware: "Ransomware Sweep",
  phishing: "Phishing Wave",
  botnet: "Botnet Mesh",
} as const;
export const ADMIN_PILLAR_COPY = {
  demo:
    "Demo mode uses the in-memory generator and honors your profile, severity, and threat-type toggles.",
  live:
    "Live mode pulls real indicators from the public MISP feed and enriches IPs with lightweight geolocation.",
} as const;
export const STREAM_INTERVAL_MIN_SECONDS = 0.2;
export const STREAM_INTERVAL_MAX_SECONDS = 10;
export const STREAM_INTERVAL_STEP_SECONDS = 0.1;
export const CONNECTION_STATUS_TEXT = {
  connected: "LINK STABLE",
  disconnected: "LINK LOST",
} as const;
export const LIVE_FEED_STATUS_LABELS = {
  idle: "Idle",
  ready: "Ready",
  empty: "Empty",
  error: "Error",
} as const;
export const SEVERITY_COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
} as const;
export const THREAT_TYPE_COLORS = {
  Ransomware: "#ef4444",
  Phishing: "#38bdf8",
  DDoS: "#a855f7",
  C2: "#f97316",
  Exploit: "#eab308",
  Botnet: "#14b8a6",
} as const;
export const ARC_STROKE_BY_SEVERITY: Record<string, number> = {
  Critical: 1.0,
  High: 0.75,
  Medium: 0.5,
  Low: 0.3,
};
export const DEFAULT_TELEMETRY = {
  messages_per_second: 0,
  active_connections: 0,
  latency_ms: 0,
  db_nodes_online: 3,
} as const;
export const AI_ANALYSIS_FALLBACK =
  "1. SUMMARY (2 sentences): Analysis service is temporarily unavailable, but this indicator still represents suspicious hostile activity. Treat it as a live threat until the investigation can be completed.\n\n2. ATTACKER PROFILE (1 sentence): The available telemetry suggests a capable opportunistic intrusion source using commodity tooling.\n\n3. MITIGATION (3 bullet points):\n- Block the source IP and related indicators at the network edge immediately.\n- Push the file hash and tags into EDR and SIEM detections across the fleet.\n- Hunt for matching process trees, persistence artifacts, and outbound beaconing tied to this malware family.";
export const MITIGATION_TERMINAL_STEPS = [
  "[SYS] Threat ID {id} flagged for containment...",
  "[FW]  Null-routing src IP {src_ip}...",
  "[FW]  Rule added: DROP src {src_ip} all ports",
  "[DNS] Poisoning domain associated with {malware_family}...",
  "[EDR] Pushing IOC hash {hash_sha256} to all endpoints...",
  "[EDR] Quarantine signal sent - 0 infections confirmed",
  "[SYS] Mitigation complete. Threat contained.",
  "[OK]  Status updated on MISP event #{misp_event_id}",
] as const;
