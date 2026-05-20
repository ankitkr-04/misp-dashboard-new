export const WS_URL = "ws://localhost:8000/ws";
export const API_BASE = "http://localhost:8000/api";
export const ADMIN_STATE_ENDPOINT = `${API_BASE}/admin/state`;
export const ADMIN_REFRESH_FEED_ENDPOINT = `${API_BASE}/admin/refresh-feed`;
export const MAX_TERMINAL_LINES = 120;
export const MAX_GLOBE_ARCS = 60;
export const ARC_DECAY_MS = 6000;
export const WS_RECONNECT_DELAY_MS = 3000;
export const ADMIN_STATE_POLL_INTERVAL_MS = 5000;
export const COUNTER_ANIMATION_DURATION_MS = 500;
export const ANALYSIS_TYPEWRITER_SPEED_MS = 12;
export const VELOCITY_SAMPLE_INTERVAL_MS = 1000;
export const VELOCITY_HISTORY_POINTS = 60;
export const TOPBAR_FLASH_MS = 2000;
export const MITIGATION_DELAY_MIN_MS = 300;
export const MITIGATION_DELAY_MAX_MS = 600;
export const THREAT_HISTORY_LIMIT = 24;
export const ANALYTICS_LIST_LIMIT = 6;
export const INSIGHT_ROTATION_INTERVAL_MS = 12000;
export const INSIGHT_LOOKBACK_SECONDS = 60;
export const SPARKLINE_POINTS = 10;
export const SPARKLINE_WINDOW_SECONDS = 10;
export const TERMINAL_SCROLL_BOTTOM_BEHAVIOR: ScrollBehavior = "smooth";

// Globe — day texture for light-mode compatibility
export const GLOBE_BACKGROUND = "#f1f5f9";
export const GLOBE_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-day.jpg";
export const GLOBE_BUMP_URL = "https://unpkg.com/three-globe/example/img/earth-topology.png";
export const GLOBE_AUTO_ROTATE_SPEED = 0.35;
export const GLOBE_ARC_DASH_LENGTH = 0.45;
export const GLOBE_ARC_DASH_GAP = 0.15;
export const GLOBE_ARC_ANIMATE_TIME_MS = 1800;
export const GLOBE_POINT_ALTITUDE = 0.012;
export const GLOBE_POINT_RADIUS = 0.1;
export const GLOBE_VIEW_ALTITUDE = 2.2;
export const GLOBE_LABEL_ALTITUDE = 0.025;
export const GLOBE_LABEL_SIZE = 0.65;
export const GLOBE_LABEL_DOT_RADIUS = 0.32;
export const GLOBE_DECAY_SWEEP_MS = 500;
export const GLOBE_RESIZE_FALLBACK = { width: 640, height: 640 };
export const GLOBE_VIEW_MODE_LABELS = {
  map: "2D Map",
  globe: "3D Globe",
} as const;

export const MAP_SOURCE_POINT_RADIUS = 4;
export const MAP_HQ_POINT_RADIUS = 6;
export const MAP_LABEL_LIMIT = 12;
export const MAP_GEOGRAPHY_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
export const MAP_PROJECTION_SCALE = 155;
export const MAP_COUNTRY_FILL = "#e2e8f0";
export const MAP_COUNTRY_STROKE = "rgba(100,116,139,0.3)";
export const MAP_GRATICULE_STROKE = "rgba(148,163,184,0.2)";
export const MAP_ROUTE_STROKE_MULTIPLIER = 2.2;

export const MITIGATED_COLOR = "#16a34a";
export const MODAL_SPRING = { type: "spring", stiffness: 200, damping: 24 } as const;

export const ROUTES = {
  dashboard: "/",
  feed: "/feed",
  geography: "/geography",
  analytics: "/analytics",
  investigations: "/investigations",
  admin: "/admin",
} as const;

export const DATA_SOURCE_LABELS = {
  mock: "Demo Simulation",
  public_misp: "Public MISP Feed",
  alienvault_otx: "AlienVault OTX",
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
    "Demo mode uses the in-memory generator and honours your profile, severity, and threat-type toggles.",
  live:
    "Live mode pulls real indicators from the selected source and enriches IPs with lightweight geolocation.",
} as const;

export const STREAM_INTERVAL_MIN_SECONDS = 0.2;
export const STREAM_INTERVAL_MAX_SECONDS = 10;
export const STREAM_INTERVAL_STEP_SECONDS = 0.1;
export const LIVE_REFRESH_MINUTES_MIN = 1;
export const LIVE_REFRESH_MINUTES_MAX = 120;
export const LIVE_REFRESH_MINUTES_STEP = 1;

export const CONNECTION_STATUS_TEXT = {
  connected: "Live",
  disconnected: "Offline",
} as const;

export const LIVE_FEED_STATUS_LABELS = {
  idle: "Idle",
  ready: "Ready",
  empty: "Empty",
  error: "Error",
} as const;

export const SEVERITY_COLORS = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#d97706",
  Low: "#16a34a",
} as const;

export const THREAT_TYPE_COLORS = {
  Ransomware: "#dc2626",
  Phishing: "#2563eb",
  DDoS: "#7c3aed",
  C2: "#ea580c",
  Exploit: "#d97706",
  Botnet: "#0891b2",
} as const;

export const THREAT_TYPE_DESCRIPTIONS = {
  Ransomware: "Encrypts assets, disrupts operations, and often couples extortion with data theft.",
  Phishing: "Steals credentials or drops payloads by abusing trusted communications.",
  DDoS: "Overwhelms exposed services until customers and operators lose access.",
  C2: "Gives an intruder remote control over infected hosts for staging and follow-on actions.",
  Exploit: "Abuses a software weakness to gain execution, elevate access, or deploy malware.",
  Botnet: "Coordinates many infected devices into one distributed attack or persistence platform.",
} as const;

export const ARC_STROKE_BY_SEVERITY: Record<string, number> = {
  Critical: 1.2,
  High: 0.9,
  Medium: 0.6,
  Low: 0.35,
};

export const DEFAULT_TELEMETRY = {
  messages_per_second: 0,
  active_connections: 0,
  latency_ms: 0,
  db_nodes_online: 3,
} as const;

export const AI_ANALYSIS_FALLBACK =
  "1. SUMMARY: Analysis service is temporarily unavailable, but this indicator still represents suspicious hostile activity. Treat it as a live threat until the investigation is completed.\n\n2. WHAT IT DOES:\n- Likely supports attacker access, tasking, or follow-on payload delivery.\n- Can help an operator maintain persistence or escalate from reconnaissance into intrusion.\n- May be used alongside additional infrastructure or malware stages that are not yet visible.\n\n3. WHY IT IS HARMFUL:\n- It can threaten system availability, data confidentiality, or operational continuity.\n- It raises the chance of lateral movement, credential theft, or business disruption if left uncontained.\n\n4. ATTACKER PROFILE: The available telemetry suggests a capable opportunistic intrusion source using commodity tooling.\n\n5. MITIGATION:\n- Block the source IP and related indicators at the network edge immediately.\n- Push the file hash and tags into EDR and SIEM detections across the fleet.\n- Hunt for matching process trees, persistence artifacts, and outbound beaconing tied to this malware family.\n- Scope any affected hosts for persistence, credential use, and follow-on payloads.";

export const MITIGATION_TERMINAL_STEPS = [
  "[SYS] Threat ID {id} flagged for containment...",
  "[FW]  Null-routing src IP {src_ip}...",
  "[FW]  Rule added: DROP src {src_ip} all ports",
  "[DNS] Poisoning domain associated with {malware_family}...",
  "[EDR] Pushing IOC hash {hash_sha256} to all endpoints...",
  "[EDR] Quarantine signal sent — 0 infections confirmed",
  "[SYS] Mitigation complete. Threat contained.",
  "[OK]  Status updated on MISP event #{misp_event_id}",
] as const;

// Legacy map constants kept for compatibility
export const MAP_LATITUDE_STEP = 30;
export const MAP_LONGITUDE_STEP = 30;
export const MAP_CURVE_HEIGHT = 54;
export const MAP_VIEWBOX = { width: 1000, height: 500 } as const;
export const MAP_CONTINENT_PATHS = [] as const;