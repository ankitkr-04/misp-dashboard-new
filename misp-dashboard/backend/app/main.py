import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes
from app.core.config import settings
from app.models.schemas import ThreatPayload, WSMessage
from app.services.telemetry_service import TelemetryService
from app.services.threat_generator import generate_burst, generate_threat
from app.services.websocket_manager import WebSocketManager


app = FastAPI(title="MISP Security Operations Dashboard")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(routes.router)

websocket_manager = WebSocketManager()
telemetry_service = TelemetryService()

_broadcast_task: asyncio.Task[None] | None = None
_threat_counter = 0


async def _broadcast_ws_message(msg_type: str, payload: ThreatPayload | dict) -> None:
    message = WSMessage(
        msg_type=msg_type,
        data=payload.model_dump() if hasattr(payload, "model_dump") else payload,
    )
    await websocket_manager.broadcast(message.model_dump_json())


async def _broadcast_telemetry() -> None:
    telemetry_service.active_connections = len(websocket_manager.active_connections)
    snapshot = telemetry_service.get_snapshot()
    await _broadcast_ws_message("telemetry", snapshot)


async def _stream_threats() -> None:
    global _threat_counter

    while True:
        if not websocket_manager.active_connections:
            await asyncio.sleep(0.25)
            continue

        if routes.god_mode_active:
            burst = generate_burst(settings.GOD_MODE_BURST_COUNT)
            routes.god_mode_active = False

            for threat in burst:
                telemetry_service.increment()
                _threat_counter += 1
                await _broadcast_ws_message("threat", threat)

                if _threat_counter % 5 == 0:
                    await _broadcast_telemetry()

                await asyncio.sleep(settings.GOD_MODE_BURST_INTERVAL)

            continue

        threat = generate_threat()
        telemetry_service.increment()
        _threat_counter += 1
        await _broadcast_ws_message("threat", threat)

        if _threat_counter % 5 == 0:
            await _broadcast_telemetry()

        await asyncio.sleep(settings.WS_BROADCAST_INTERVAL_SECONDS)


async def _ensure_stream_task() -> None:
    global _broadcast_task

    if _broadcast_task is None or _broadcast_task.done():
        _broadcast_task = asyncio.create_task(_stream_threats())


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket_manager.connect(websocket)
    telemetry_service.active_connections = len(websocket_manager.active_connections)
    await _ensure_stream_task()

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        telemetry_service.active_connections = len(websocket_manager.active_connections)
