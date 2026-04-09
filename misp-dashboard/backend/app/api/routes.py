from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.models.schemas import ThreatPayload
from app.services.ai_service import analyze_threat


router = APIRouter(prefix="/api", tags=["soc"])
god_mode_active = False


class AnalyzeRequest(BaseModel):
    threat: ThreatPayload


@router.post("/analyze")
async def analyze_endpoint(payload: AnalyzeRequest) -> dict[str, str]:
    analysis = await analyze_threat(payload.threat.model_dump())
    return {"analysis": analysis}


@router.post("/god-mode")
async def activate_god_mode() -> dict[str, str | int]:
    global god_mode_active
    god_mode_active = True
    return {
        "status": "God Mode activated",
        "burst_count": settings.GOD_MODE_BURST_COUNT,
    }
