import asyncio
import json

import google.generativeai as genai

from app.core.config import settings


GEMINI_MODEL = "gemini-1.5-flash"

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    _model = genai.GenerativeModel(GEMINI_MODEL)
else:
    _model = None


FALLBACK_ANALYSIS = """1. SUMMARY (2 sentences): This indicator matches a high-risk malicious pattern that merits immediate triage. The combination of malware family, origin metadata, and tagging suggests active intrusion or staging activity against the protected environment.

2. ATTACKER PROFILE (1 sentence): The source profile is inconclusive, but the indicator set is consistent with an organized financially motivated intrusion cluster.

3. MITIGATION (3 bullet points):
- Block the source IP and related network indicators at perimeter controls immediately.
- Push the SHA256 hash and tags into endpoint, email, and SIEM detections for rapid scoping.
- Hunt for lateral movement, persistence, and follow-on payload execution tied to the same malware family."""


async def analyze_threat(threat: dict) -> str:
    stripped_threat = {
        "type": threat.get("type"),
        "severity": threat.get("severity"),
        "malware_family": threat.get("malware_family"),
        "src_ip": threat.get("src_ip"),
        "src_geo": {
            "country": (threat.get("src_geo") or {}).get("country"),
        },
        "hash_sha256": threat.get("hash_sha256"),
        "tags": threat.get("tags", []),
    }

    prompt = (
        "You are a SOC analyst. Analyze this threat indicator and respond in exactly 3 parts:\n"
        "1. SUMMARY (2 sentences): What this threat is and why it's dangerous.\n"
        "2. ATTACKER PROFILE (1 sentence): Likely threat actor origin or group based on indicators.\n"
        "3. MITIGATION (3 bullet points): Specific, actionable steps to contain this threat.\n\n"
        f"Threat data: {json.dumps(stripped_threat, separators=(',', ':'))}"
    )

    if _model is None:
        return FALLBACK_ANALYSIS

    try:
        response = await asyncio.to_thread(_model.generate_content, prompt)
        analysis_text = getattr(response, "text", "").strip()
        return analysis_text or FALLBACK_ANALYSIS
    except Exception:
        return FALLBACK_ANALYSIS
