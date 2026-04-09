import asyncio
import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings

MALWARE_BEHAVIOR_HINTS = {
    "LockBit": [
        "Likely performs rapid endpoint encryption, shadow-copy deletion, and extortion pressure.",
        "Often pairs data theft with service disruption to raise recovery pressure.",
    ],
    "BlackCat": [
        "Typically blends encryption, credential abuse, and data extortion tactics.",
        "May move laterally before detonating to maximize operational impact.",
    ],
    "Cobalt Strike": [
        "Acts as a post-exploitation beacon for remote command execution, credential access, and lateral movement.",
        "Often indicates an operator already has an initial foothold and is staging follow-on actions.",
    ],
    "Emotet": [
        "Usually arrives through phishing and drops follow-on malware after establishing persistence.",
        "Can harvest credentials, reuse email threads, and spread laterally inside the network.",
    ],
    "REvil": [
        "Commonly combines encryption with extortion and pressure against backups or exposed infrastructure.",
        "Often seeks sensitive data before encrypting to increase leverage over the victim.",
    ],
    "QakBot": [
        "Commonly steals credentials, loads additional payloads, and supports hands-on-keyboard intrusion activity.",
        "Often functions as a loader for ransomware or broader access operations.",
    ],
    "TrickBot": [
        "Typically performs credential theft, reconnaissance, and modular payload delivery.",
        "Can support banking fraud, lateral movement, or ransomware staging.",
    ],
    "DarkComet": [
        "Behaves like a remote-access trojan that enables surveillance, file theft, and host control.",
        "Often supports persistent remote access rather than a single smash-and-grab action.",
    ],
    "Agent Tesla": [
        "Usually targets credentials, clipboard data, keystrokes, and local email or browser secrets.",
        "Primarily threatens data confidentiality and account compromise rather than service disruption.",
    ],
    "Ryuk": [
        "Likely focuses on enterprise-wide encryption and backup disruption.",
        "Its presence often implies manual attacker activity and high operational impact.",
    ],
}

THREAT_IMPACT_HINTS = {
    "Ransomware": [
        "Can encrypt endpoints and servers, interrupt business operations, and delay recovery for days or weeks.",
        "Often carries legal, regulatory, and reputational risk when exfiltration accompanies encryption.",
    ],
    "Phishing": [
        "Can compromise user identities, provide initial access, and bypass perimeter-focused controls.",
        "Frequently leads to account takeover, mailbox abuse, and further payload delivery.",
    ],
    "DDoS": [
        "Can saturate exposed services and force outages for customers, partners, and remote operators.",
        "Can also distract defenders while attackers attempt separate intrusion activity elsewhere.",
    ],
    "C2": [
        "Indicates potential remote control of an infected host, enabling persistence, staging, and tasking.",
        "Can be a precursor to credential theft, lateral movement, ransomware, or data exfiltration.",
    ],
    "Exploit": [
        "Can turn a vulnerable exposed service into an attacker-controlled foothold.",
        "Often enables privilege escalation, payload deployment, or unauthorized access before detection catches up.",
    ],
    "Botnet": [
        "Can conscript many hosts into coordinated DDoS, scanning, credential attacks, or malware delivery.",
        "Indicates scale: even low-complexity actions become dangerous when distributed across many nodes.",
    ],
}

DEFAULT_BEHAVIOR_HINT = [
    "Likely supports hostile access, persistence, or follow-on malicious tasking inside a target environment.",
]
DEFAULT_IMPACT_HINT = [
    "Can compromise availability, confidentiality, or control of systems if left uncontained.",
]

if settings.GEMINI_API_KEY:
    _client = genai.Client(api_key=settings.GEMINI_API_KEY)
else:
    _client = None


def _build_context(threat: dict) -> dict:
    malware_family = str(threat.get("malware_family") or "Unknown")
    threat_type = str(threat.get("type") or "Unknown")

    return {
        "type": threat_type,
        "severity": threat.get("severity"),
        "malware_family": malware_family,
        "src_ip": threat.get("src_ip"),
        "src_geo": {
            "country": (threat.get("src_geo") or {}).get("country"),
        },
        "hash_sha256": threat.get("hash_sha256"),
        "tags": threat.get("tags", []),
        "behavior_hints": MALWARE_BEHAVIOR_HINTS.get(malware_family, DEFAULT_BEHAVIOR_HINT),
        "impact_hints": THREAT_IMPACT_HINTS.get(threat_type, DEFAULT_IMPACT_HINT),
    }


def build_local_analysis(threat: dict) -> str:
    context = _build_context(threat)
    threat_type = str(context["type"])
    severity = str(context.get("severity") or "High")
    malware_family = str(context["malware_family"])
    behavior_hints = context["behavior_hints"]
    impact_hints = context["impact_hints"]

    return (
        f"1. SUMMARY: This {severity.lower()} {threat_type} indicator is associated with {malware_family}, "
        "which suggests active hostile capability rather than harmless scanning. The combination of the source IP, "
        "malware family, and tags indicates a threat that can progress beyond reconnaissance into intrusion or disruption.\n\n"
        "2. WHAT IT DOES:\n"
        f"- {behavior_hints[0]}\n"
        f"- {behavior_hints[1] if len(behavior_hints) > 1 else behavior_hints[0]}\n"
        "- Likely attempts to maintain attacker control long enough to stage follow-on actions or spread.\n\n"
        "3. WHY IT IS HARMFUL:\n"
        f"- {impact_hints[0]}\n"
        f"- {impact_hints[1] if len(impact_hints) > 1 else impact_hints[0]}\n\n"
        "4. ATTACKER PROFILE: The source profile is still partially inferred, but the indicator set fits an organized intrusion workflow rather than incidental noise.\n\n"
        "5. MITIGATION:\n"
        f"- Block {context['src_ip']} and closely related network indicators at perimeter controls immediately.\n"
        "- Push the SHA256 hash, tags, and malware family into EDR, SIEM, mail, and web detections.\n"
        "- Hunt for beaconing, lateral movement, credential use, and persistence linked to the same family.\n"
        "- Scope any affected hosts for data access, scheduled tasks, startup items, and follow-on payload delivery."
    )


def _extract_response_text(response: Any) -> str:
    direct_text = getattr(response, "text", None)
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    candidates = getattr(response, "candidates", None) or []
    collected_parts: list[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            text = getattr(part, "text", None)
            if isinstance(text, str) and text.strip():
                collected_parts.append(text.strip())

    return "\n".join(collected_parts).strip()


def _generate_analysis(prompt: str) -> str:
    if _client is None:
        return ""

    base_config = {
        "temperature": 0.2,
        "max_output_tokens": 1000,
    }

    try:
        response = _client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(**base_config),
        )
    except Exception:
        response = _client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(**base_config),
        )

    return _extract_response_text(response)


async def analyze_threat(threat: dict) -> str:
    context = _build_context(threat)

    prompt = (
        "You are a senior SOC malware and intrusion analyst. Be concrete and technically specific instead of generic.\n"
        "If the malware family or threat type implies known behavior, explain that behavior plainly. If something is inferred rather than proven, say Likely.\n"
        "Respond in exactly 5 parts with these labels:\n"
        "1. SUMMARY (2 sentences): identify the threat, what stage of intrusion it suggests, and why it matters.\n"
        "2. WHAT IT DOES (exactly 3 bullet points): explain the malicious behavior, attacker actions, or bot functionality.\n"
        "3. WHY IT IS HARMFUL (exactly 2 bullet points): explain business and technical impact.\n"
        "4. ATTACKER PROFILE (1-2 sentences): likely operator style, campaign maturity, or origin clues.\n"
        "5. MITIGATION (exactly 4 bullet points): specific containment and investigation steps.\n"
        "Avoid filler, avoid saying data is insufficient unless absolutely necessary, and use the hints when they are relevant.\n\n"
        f"Threat data: {json.dumps(context, separators=(',', ':'))}"
    )

    if _client is None:
        return build_local_analysis(threat)

    try:
        analysis_text = await asyncio.to_thread(_generate_analysis, prompt)
        return analysis_text or build_local_analysis(threat)
    except Exception:
        return build_local_analysis(threat)
