from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.models.schemas import AdminStateResponse, AdminStateUpdateRequest, ThreatPayload
from app.services.ai_service import analyze_threat
from app.services.control_plane import control_plane
from app.services.live_feed_service import live_feed_service


router = APIRouter(prefix="/api", tags=["soc"])


class AnalyzeRequest(BaseModel):
    threat: ThreatPayload


@router.post("/analyze")
async def analyze_endpoint(payload: AnalyzeRequest) -> dict[str, str]:
    analysis = await analyze_threat(payload.threat.model_dump())
    return {"analysis": analysis}


@router.get("/admin/state", response_model=AdminStateResponse)
async def get_admin_state() -> AdminStateResponse:
    return control_plane.build_response(live_feed_service.get_status(control_plane.get_runtime_snapshot()["data_source"]))


@router.post("/admin/state", response_model=AdminStateResponse)
async def update_admin_state(payload: AdminStateUpdateRequest) -> AdminStateResponse:
    snapshot = control_plane.update(payload)
    return control_plane.build_response(live_feed_service.get_status(snapshot["data_source"]))


@router.post("/admin/refresh-feed", response_model=AdminStateResponse)
async def refresh_live_feed() -> AdminStateResponse:
    snapshot = control_plane.get_runtime_snapshot()
    live_feed_service.refresh(snapshot["data_source"], force=True)
    return control_plane.build_response(live_feed_service.get_status(snapshot["data_source"]))


@router.post("/god-mode")
async def activate_god_mode() -> dict[str, str | int]:
    control_plane.trigger_god_mode()
    return {
        "status": "God Mode activated",
        "burst_count": settings.GOD_MODE_BURST_COUNT,
    }
