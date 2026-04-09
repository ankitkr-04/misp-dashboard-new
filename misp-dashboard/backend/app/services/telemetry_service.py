import random
import time

from app.models.schemas import TelemetryPayload


class TelemetryService:
    def __init__(self) -> None:
        self.message_count = 0
        self.last_second_timestamp = time.monotonic()
        self.messages_per_second = 0.0
        self.active_connections = 0

    def _refresh_rate(self) -> float:
        now = time.monotonic()
        elapsed = now - self.last_second_timestamp

        if elapsed >= 1:
            self.messages_per_second = self.message_count / elapsed if elapsed else 0.0
            self.message_count = 0
            self.last_second_timestamp = now
            return self.messages_per_second

        if elapsed <= 0:
            return self.messages_per_second

        return self.message_count / elapsed

    def increment(self) -> None:
        self._refresh_rate()
        self.message_count += 1

    def get_snapshot(self) -> TelemetryPayload:
        live_mps = self._refresh_rate()
        base_latency = 18 + (live_mps * 0.35)
        latency = max(4.0, base_latency + random.uniform(-5, 5))
        db_nodes_online = max(2, min(4, 3 + random.choice([-1, 0, 1])))

        return TelemetryPayload(
            messages_per_second=round(live_mps, 2),
            active_connections=self.active_connections,
            latency_ms=round(latency, 2),
            db_nodes_online=db_nodes_online,
        )
