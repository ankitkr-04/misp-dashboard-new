import hashlib
import random
import zlib
from datetime import datetime, timezone
from ipaddress import ip_address
from uuid import uuid4

from app.models.schemas import GeoLocation, HQNode, ThreatPayload


MALICIOUS_IPS = [
    "198.51.100.11",
    "198.51.100.12",
    "198.51.100.13",
    "198.51.100.14",
    "198.51.100.15",
    "198.51.100.16",
    "198.51.100.17",
    "198.51.100.18",
    "198.51.100.19",
    "198.51.100.20",
    "198.51.100.21",
    "198.51.100.22",
    "198.51.100.23",
    "198.51.100.24",
    "198.51.100.25",
    "198.51.100.26",
    "198.51.100.27",
    "198.51.100.28",
    "198.51.100.29",
    "198.51.100.30",
    "198.51.100.31",
    "198.51.100.32",
    "198.51.100.33",
    "198.51.100.34",
    "198.51.100.35",
    "198.51.100.36",
    "198.51.100.37",
    "198.51.100.38",
    "198.51.100.39",
    "198.51.100.40",
    "203.0.113.11",
    "203.0.113.12",
    "203.0.113.13",
    "203.0.113.14",
    "203.0.113.15",
    "203.0.113.16",
    "203.0.113.17",
    "203.0.113.18",
    "203.0.113.19",
    "203.0.113.20",
    "203.0.113.21",
    "203.0.113.22",
    "203.0.113.23",
    "203.0.113.24",
    "203.0.113.25",
    "203.0.113.26",
    "203.0.113.27",
    "203.0.113.28",
    "203.0.113.29",
    "203.0.113.30",
    "203.0.113.31",
    "203.0.113.32",
    "203.0.113.33",
    "203.0.113.34",
    "203.0.113.35",
    "203.0.113.36",
    "203.0.113.37",
    "203.0.113.38",
    "203.0.113.39",
    "203.0.113.40",
    "192.0.2.11",
    "192.0.2.12",
    "192.0.2.13",
    "192.0.2.14",
    "192.0.2.15",
    "192.0.2.16",
    "192.0.2.17",
    "192.0.2.18",
    "192.0.2.19",
    "192.0.2.20",
    "192.0.2.21",
    "192.0.2.22",
    "192.0.2.23",
    "192.0.2.24",
    "192.0.2.25",
    "192.0.2.26",
    "192.0.2.27",
    "192.0.2.28",
    "192.0.2.29",
    "192.0.2.30",
    "192.0.2.31",
    "192.0.2.32",
    "192.0.2.33",
    "192.0.2.34",
    "192.0.2.35",
    "192.0.2.36",
    "192.0.2.37",
    "192.0.2.38",
    "192.0.2.39",
    "192.0.2.40",
]

CITY_CATALOG = [
    GeoLocation(lat=55.7558, lon=37.6173, city="Moscow", country="RU"),
    GeoLocation(lat=39.9042, lon=116.4074, city="Beijing", country="CN"),
    GeoLocation(lat=31.2304, lon=121.4737, city="Shanghai", country="CN"),
    GeoLocation(lat=19.0760, lon=72.8777, city="Mumbai", country="IN"),
    GeoLocation(lat=28.6139, lon=77.2090, city="Delhi", country="IN"),
    GeoLocation(lat=12.9716, lon=77.5946, city="Bengaluru", country="IN"),
    GeoLocation(lat=35.6895, lon=139.6917, city="Tokyo", country="JP"),
    GeoLocation(lat=37.5665, lon=126.9780, city="Seoul", country="KR"),
    GeoLocation(lat=1.3521, lon=103.8198, city="Singapore", country="SG"),
    GeoLocation(lat=13.7563, lon=100.5018, city="Bangkok", country="TH"),
    GeoLocation(lat=-6.2088, lon=106.8456, city="Jakarta", country="ID"),
    GeoLocation(lat=14.5995, lon=120.9842, city="Manila", country="PH"),
    GeoLocation(lat=25.2048, lon=55.2708, city="Dubai", country="AE"),
    GeoLocation(lat=24.7136, lon=46.6753, city="Riyadh", country="SA"),
    GeoLocation(lat=41.0082, lon=28.9784, city="Istanbul", country="TR"),
    GeoLocation(lat=52.5200, lon=13.4050, city="Berlin", country="DE"),
    GeoLocation(lat=48.8566, lon=2.3522, city="Paris", country="FR"),
    GeoLocation(lat=51.5072, lon=-0.1276, city="London", country="GB"),
    GeoLocation(lat=40.4168, lon=-3.7038, city="Madrid", country="ES"),
    GeoLocation(lat=41.9028, lon=12.4964, city="Rome", country="IT"),
    GeoLocation(lat=52.3676, lon=4.9041, city="Amsterdam", country="NL"),
    GeoLocation(lat=59.3293, lon=18.0686, city="Stockholm", country="SE"),
    GeoLocation(lat=60.1699, lon=24.9384, city="Helsinki", country="FI"),
    GeoLocation(lat=50.0755, lon=14.4378, city="Prague", country="CZ"),
    GeoLocation(lat=52.2297, lon=21.0122, city="Warsaw", country="PL"),
    GeoLocation(lat=50.4501, lon=30.5234, city="Kyiv", country="UA"),
    GeoLocation(lat=30.0444, lon=31.2357, city="Cairo", country="EG"),
    GeoLocation(lat=6.5244, lon=3.3792, city="Lagos", country="NG"),
    GeoLocation(lat=-1.2921, lon=36.8219, city="Nairobi", country="KE"),
    GeoLocation(lat=-26.2041, lon=28.0473, city="Johannesburg", country="ZA"),
    GeoLocation(lat=33.5731, lon=-7.5898, city="Casablanca", country="MA"),
    GeoLocation(lat=-23.5505, lon=-46.6333, city="Sao Paulo", country="BR"),
    GeoLocation(lat=-34.6037, lon=-58.3816, city="Buenos Aires", country="AR"),
    GeoLocation(lat=-33.4489, lon=-70.6693, city="Santiago", country="CL"),
    GeoLocation(lat=4.7110, lon=-74.0721, city="Bogota", country="CO"),
    GeoLocation(lat=19.4326, lon=-99.1332, city="Mexico City", country="MX"),
    GeoLocation(lat=45.5017, lon=-73.5673, city="Montreal", country="CA"),
    GeoLocation(lat=43.6532, lon=-79.3832, city="Toronto", country="CA"),
    GeoLocation(lat=37.7749, lon=-122.4194, city="San Francisco", country="US"),
    GeoLocation(lat=34.0522, lon=-118.2437, city="Los Angeles", country="US"),
    GeoLocation(lat=47.6062, lon=-122.3321, city="Seattle", country="US"),
    GeoLocation(lat=41.8781, lon=-87.6298, city="Chicago", country="US"),
    GeoLocation(lat=25.7617, lon=-80.1918, city="Miami", country="US"),
    GeoLocation(lat=32.7767, lon=-96.7970, city="Dallas", country="US"),
    GeoLocation(lat=-37.8136, lon=144.9631, city="Melbourne", country="AU"),
    GeoLocation(lat=-33.8688, lon=151.2093, city="Sydney", country="AU"),
    GeoLocation(lat=-36.8485, lon=174.7633, city="Auckland", country="NZ"),
]

MALWARE_FAMILIES = [
    "LockBit",
    "BlackCat",
    "Cobalt Strike",
    "Emotet",
    "REvil",
    "QakBot",
    "TrickBot",
    "DarkComet",
    "Agent Tesla",
    "Ryuk",
]

THREAT_TYPES = [
    "Ransomware",
    "Phishing",
    "DDoS",
    "C2",
    "Exploit",
    "Botnet",
]

SIMULATION_PROFILES = [
    "balanced",
    "ddos",
    "ransomware",
    "phishing",
    "botnet",
]

LIVE_DATA_SOURCES = ["public_misp", "alienvault_otx"]
SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low"]
SEVERITY_WEIGHTS = [0.10, 0.25, 0.40, 0.25]
BURST_SEVERITY_WEIGHTS = [0.45, 0.35, 0.15, 0.05]
MISP_THREAT_LEVEL_MAP = {
    1: "Critical",
    2: "High",
    3: "Medium",
    4: "Low",
}
MISP_TAGS = [
    "misp:tlp:amber",
    "misp:tlp:red",
    "misp:tlp:green",
    "misp:confidence-level=\"usually-confident\"",
    "misp:confidence-level=\"fairly-confident\"",
    "source:osint",
    "source:honeypot",
    "attack:T1486",
    "attack:T1566",
    "attack:T1071",
    "attack:T1105",
    "attack:T1041",
    "attack:T1059",
    "threat-actor:apt",
    "threat-actor:fin7",
    "threat-actor:lazarus",
    "campaign:credential-harvest",
    "campaign:data-extortion",
    "ioc:hash-sha256",
    "ioc:ipv4",
]

PROFILE_TYPE_WEIGHTS = {
    "balanced": {
        "Ransomware": 1,
        "Phishing": 1,
        "DDoS": 1,
        "C2": 1,
        "Exploit": 1,
        "Botnet": 1,
    },
    "ddos": {
        "Ransomware": 0.4,
        "Phishing": 0.4,
        "DDoS": 4.8,
        "C2": 1.8,
        "Exploit": 0.6,
        "Botnet": 3.4,
    },
    "ransomware": {
        "Ransomware": 5.0,
        "Phishing": 1.0,
        "DDoS": 0.4,
        "C2": 1.8,
        "Exploit": 2.2,
        "Botnet": 0.8,
    },
    "phishing": {
        "Ransomware": 0.6,
        "Phishing": 5.0,
        "DDoS": 0.4,
        "C2": 2.0,
        "Exploit": 0.6,
        "Botnet": 0.8,
    },
    "botnet": {
        "Ransomware": 0.5,
        "Phishing": 0.6,
        "DDoS": 2.4,
        "C2": 3.8,
        "Exploit": 0.8,
        "Botnet": 4.7,
    },
}

HQ_NODES = [
    HQNode(
        id="nyc",
        name="NYC HQ",
        ip="10.0.0.1",
        lat=40.7128,
        lon=-74.0060,
        city="New York",
        country="US",
        accent="#00ff88",
    ),
    HQNode(
        id="mumbai",
        name="Mumbai SOC",
        ip="10.0.10.1",
        lat=19.0760,
        lon=72.8777,
        city="Mumbai",
        country="IN",
        accent="#38bdf8",
    ),
    HQNode(
        id="bengaluru",
        name="Bengaluru IR",
        ip="10.0.20.1",
        lat=12.9716,
        lon=77.5946,
        city="Bengaluru",
        country="IN",
        accent="#f97316",
    ),
    HQNode(
        id="delhi",
        name="Delhi Hub",
        ip="10.0.30.1",
        lat=28.6139,
        lon=77.2090,
        city="Delhi",
        country="IN",
        accent="#a855f7",
    ),
    HQNode(
        id="singapore",
        name="Singapore Edge",
        ip="10.0.40.1",
        lat=1.3521,
        lon=103.8198,
        city="Singapore",
        country="SG",
        accent="#14b8a6",
    ),
    HQNode(
        id="london",
        name="London Relay",
        ip="10.0.50.1",
        lat=51.5072,
        lon=-0.1276,
        city="London",
        country="GB",
        accent="#eab308",
    ),
    HQNode(
        id="tokyo",
        name="Tokyo Ops",
        ip="10.0.60.1",
        lat=35.6895,
        lon=139.6917,
        city="Tokyo",
        country="JP",
        accent="#fb7185",
    ),
    HQNode(
        id="dubai",
        name="Dubai Transit",
        ip="10.0.70.1",
        lat=25.2048,
        lon=55.2708,
        city="Dubai",
        country="AE",
        accent="#22d3ee",
    ),
    HQNode(
        id="toronto",
        name="Toronto Mesh",
        ip="10.0.80.1",
        lat=43.6532,
        lon=-79.3832,
        city="Toronto",
        country="CA",
        accent="#818cf8",
    ),
    HQNode(
        id="sydney",
        name="Sydney Shield",
        ip="10.0.90.1",
        lat=-33.8688,
        lon=151.2093,
        city="Sydney",
        country="AU",
        accent="#34d399",
    ),
]
HQ_BY_ID = {hq.id: hq for hq in HQ_NODES}


def _geo_from_hq(hq: HQNode) -> GeoLocation:
    return GeoLocation(lat=hq.lat, lon=hq.lon, city=hq.city, country=hq.country)


def _allowed_values(available: list[str], selected: list[str] | None) -> list[str]:
    if not selected:
        return available

    filtered = [value for value in available if value in selected]
    return filtered or available


def _weighted_choice(choices: list[str], weights: list[float], allowed: list[str] | None = None) -> str:
    allowed_choices = _allowed_values(choices, allowed)
    filtered_weights = [weights[choices.index(choice)] for choice in allowed_choices]
    return random.choices(allowed_choices, weights=filtered_weights, k=1)[0]


def _pick_threat_type(profile: str, enabled_types: list[str] | None) -> str:
    profile_name = profile if profile in PROFILE_TYPE_WEIGHTS else "balanced"
    allowed = _allowed_values(THREAT_TYPES, enabled_types)
    weights = [PROFILE_TYPE_WEIGHTS[profile_name][threat_type] for threat_type in allowed]
    return random.choices(allowed, weights=weights, k=1)[0]


def select_active_hqs(active_hq_ids: list[str] | None) -> list[HQNode]:
    if not active_hq_ids:
        return [HQ_BY_ID["nyc"]]

    resolved = [HQ_BY_ID[hq_id] for hq_id in active_hq_ids if hq_id in HQ_BY_ID]
    return resolved or [HQ_BY_ID["nyc"]]


def pick_target_hq(active_hq_ids: list[str] | None) -> HQNode:
    return random.choice(select_active_hqs(active_hq_ids))


def is_ip_value(value: str) -> bool:
    try:
        ip_address(value)
    except ValueError:
        return False
    return True


def build_hash(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def coerce_sha256(value: str) -> str:
    if len(value) == 64 and all(char in "0123456789abcdef" for char in value.lower()):
        return value.lower()

    return build_hash(value)


def stable_event_id(seed: str) -> int:
    return zlib.crc32(seed.encode("utf-8")) % 1_000_000


def severity_from_misp_level(level: int | str | None) -> str:
    try:
        numeric_level = int(level) if level is not None else 2
    except (TypeError, ValueError):
        numeric_level = 2

    return MISP_THREAT_LEVEL_MAP.get(numeric_level, "Medium")


def infer_threat_type(text: str) -> str:
    lowered = text.lower()

    if any(keyword in lowered for keyword in ("ransom", "locker", "extortion", "lockbit", "revil")):
        return "Ransomware"
    if any(keyword in lowered for keyword in ("phish", "credential", "spoof", "mail")):
        return "Phishing"
    if any(keyword in lowered for keyword in ("ddos", "flood", "traffic spike", "amplification")):
        return "DDoS"
    if any(keyword in lowered for keyword in ("c2", "beacon", "command and control", "callback")):
        return "C2"
    if any(keyword in lowered for keyword in ("botnet", "mirai", "infected hosts", "loader")):
        return "Botnet"
    if any(keyword in lowered for keyword in ("exploit", "zero-day", "vulnerability", "payload")):
        return "Exploit"

    return random.choice(THREAT_TYPES)


def infer_malware_family(text: str) -> str:
    lowered = text.lower()
    for family in MALWARE_FAMILIES:
        if family.lower() in lowered:
            return family

    return random.choice(MALWARE_FAMILIES)


def fallback_geo_for_country(country: str | None) -> GeoLocation:
    if country:
        country_matches = [city for city in CITY_CATALOG if city.country == country]
        if country_matches:
            return random.choice(country_matches)

    return random.choice(CITY_CATALOG)


def _build_mock_threat(runtime_state: dict, severity_weights: list[float], source: str) -> ThreatPayload:
    source_geo = random.choice(CITY_CATALOG)
    threat_id = str(uuid4())
    event_type = _pick_threat_type(
        runtime_state.get("simulation_profile", "balanced"),
        runtime_state.get("enabled_threat_types"),
    )
    severity = _weighted_choice(
        SEVERITY_LEVELS,
        severity_weights,
        runtime_state.get("enabled_severities"),
    )
    malware_family = random.choice(MALWARE_FAMILIES)
    timestamp = datetime.now(timezone.utc).isoformat()
    tag_count = random.randint(2, 4)
    misp_event_id = random.randint(100000, 999999)
    target_hq = pick_target_hq(runtime_state.get("active_hq_ids"))

    return ThreatPayload(
        id=threat_id,
        timestamp=timestamp,
        type=event_type,
        severity=severity,
        malware_family=malware_family,
        src_ip=random.choice(MALICIOUS_IPS),
        src_geo=source_geo,
        dst_ip=target_hq.ip,
        dst_geo=_geo_from_hq(target_hq),
        hash_sha256=build_hash(f"{threat_id}:{source_geo.city}:{malware_family}:{timestamp}"),
        misp_event_id=misp_event_id,
        tags=random.sample(MISP_TAGS, k=tag_count),
        source=source,
        target_hq_id=target_hq.id,
        target_hq_name=target_hq.name,
    )


def generate_threat(runtime_state: dict) -> ThreatPayload:
    return _build_mock_threat(runtime_state, SEVERITY_WEIGHTS, "mock")


def generate_burst(count: int, runtime_state: dict) -> list[ThreatPayload]:
    return [_build_mock_threat(runtime_state, BURST_SEVERITY_WEIGHTS, "mock") for _ in range(count)]
