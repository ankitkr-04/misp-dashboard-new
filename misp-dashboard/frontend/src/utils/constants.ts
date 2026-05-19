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
export const THREAT_HISTORY_LIMIT = 24;
export const ANALYTICS_LIST_LIMIT = 6;
export const INSIGHT_ROTATION_INTERVAL_MS = 12000;
export const INSIGHT_LOOKBACK_SECONDS = 60;
export const SPARKLINE_POINTS = 10;
export const SPARKLINE_WINDOW_SECONDS = 10;
export const TERMINAL_SCROLL_BOTTOM_BEHAVIOR: ScrollBehavior = "smooth";
export const GLOBE_BACKGROUND = "#f8fafc";
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
export const GLOBE_VIEW_MODE_LABELS = {
  map: "Map",
  globe: "Globe",
} as const;
export const MAP_LATITUDE_STEP = 30;
export const MAP_LONGITUDE_STEP = 30;
export const MAP_CURVE_HEIGHT = 54;
export const MAP_SOURCE_POINT_RADIUS = 4;
export const MAP_HQ_POINT_RADIUS = 7;
export const MAP_LABEL_LIMIT = 10;
export const MAP_GEOGRAPHY_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
export const MAP_PROJECTION_SCALE = 165;
export const MAP_COUNTRY_FILL = "#e5e7eb";
export const MAP_COUNTRY_STROKE = "rgba(100, 116, 139, 0.24)";
export const MAP_GRATICULE_STROKE = "rgba(100,116,139,0.18)";
export const MAP_ROUTE_STROKE_MULTIPLIER = 2.1;
export const MAP_VIEWBOX = {
  width: 1000,
  height: 500,
} as const;
export const MAP_CONTINENT_PATHS = [
  "M74 98 L112 78 L160 70 L211 82 L248 110 L254 144 L236 171 L226 196 L194 205 L170 189 L145 181 L129 157 L109 153 L92 132 Z",
  "M216 214 L236 230 L248 257 L255 284 L271 322 L261 355 L237 392 L219 433 L196 451 L180 426 L186 395 L194 364 L183 332 L177 302 L185 273 L198 244 Z",
  "M440 87 L470 75 L514 70 L555 80 L592 96 L633 96 L675 111 L690 131 L677 149 L639 153 L610 144 L579 153 L551 169 L514 166 L496 184 L468 179 L444 165 L430 140 Z",
  "M495 191 L517 188 L541 201 L554 228 L548 252 L536 278 L526 301 L517 323 L501 342 L481 353 L467 332 L470 304 L476 278 L482 248 L489 219 Z",
  "M646 181 L677 172 L711 180 L740 194 L764 216 L781 246 L785 271 L767 286 L747 281 L731 257 L714 243 L693 261 L668 276 L642 264 L629 240 L633 211 Z",
  "M778 333 L811 323 L848 329 L879 347 L905 369 L922 393 L914 415 L888 420 L860 403 L842 386 L826 367 L804 357 Z",
  "M854 151 L889 141 L923 149 L947 166 L955 186 L937 197 L907 194 L885 185 L866 171 Z",
] as const;
export const MITIGATED_COLOR = "#22c55e";
export const MODAL_SPRING = { type: "spring", stiffness: 180, damping: 22 } as const;
export const ROUTES = {
  dashboard: "/",
  feed: "/feed",
  geography: "/geography",
  analytics: "/analytics",
  investigations: "/investigations",
  admin: "/admin",
} as const;
export const DATA_SOURCE_LABELS = {
  mock: "DEMO SIMULATION",
  public_misp: "PUBLIC MISP FEED",
  alienvault_otx: "ALIENVAULT OTX",
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
    "Live mode pulls real indicators from the selected source, either the public MISP feed or AlienVault OTX, and enriches IPs with lightweight geolocation.",
} as const;
export const STREAM_INTERVAL_MIN_SECONDS = 0.2;
export const STREAM_INTERVAL_MAX_SECONDS = 10;
export const STREAM_INTERVAL_STEP_SECONDS = 0.1;
export const LIVE_REFRESH_MINUTES_MIN = 1;
export const LIVE_REFRESH_MINUTES_MAX = 120;
export const LIVE_REFRESH_MINUTES_STEP = 1;
export const CONNECTION_STATUS_TEXT = {
  connected: "Connected",
  disconnected: "Disconnected",
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
export const THREAT_TYPE_DESCRIPTIONS = {
  Ransomware: "Encrypts assets, disrupts operations, and often couples extortion with data theft.",
  Phishing: "Steals credentials or drops payloads by abusing trusted communications and identities.",
  DDoS: "Overwhelms exposed services until customers and operators lose access to them.",
  C2: "Gives an intruder remote control over infected hosts for staging, persistence, and follow-on actions.",
  Exploit: "Abuses a software weakness to gain execution, elevate access, or deploy malware.",
  Botnet: "Coordinates many infected devices into one distributed attack or persistence platform.",
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
  "1. SUMMARY: Analysis service is temporarily unavailable, but this indicator still represents suspicious hostile activity. Treat it as a live threat until the investigation is completed.\n\n2. WHAT IT DOES:\n- Likely supports attacker access, tasking, or follow-on payload delivery.\n- Can help an operator maintain persistence or escalate from reconnaissance into intrusion.\n- May be used alongside additional infrastructure or malware stages that are not yet visible.\n\n3. WHY IT IS HARMFUL:\n- It can threaten system availability, data confidentiality, or operational continuity.\n- It raises the chance of lateral movement, credential theft, or business disruption if left uncontained.\n\n4. ATTACKER PROFILE: The available telemetry suggests a capable opportunistic intrusion source using commodity tooling.\n\n5. MITIGATION:\n- Block the source IP and related indicators at the network edge immediately.\n- Push the file hash and tags into EDR and SIEM detections across the fleet.\n- Hunt for matching process trees, persistence artifacts, and outbound beaconing tied to this malware family.\n- Scope any affected hosts for persistence, credential use, and follow-on payloads.";
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
