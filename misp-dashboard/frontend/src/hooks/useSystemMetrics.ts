import type { TelemetryPayload } from "../types/threat";
import { DEFAULT_TELEMETRY } from "../utils/constants";

export function useSystemMetrics(telemetry: TelemetryPayload | null) {
  const snapshot = telemetry ?? DEFAULT_TELEMETRY;
  const ingestionRateValue = Number(snapshot.messages_per_second.toFixed(1));
  const latencyValue = Number(snapshot.latency_ms.toFixed(1));
  const dbNodesValue = snapshot.db_nodes_online;

  return {
    ingestionRateValue,
    ingestionRateLabel: `${ingestionRateValue.toFixed(1)} evt/s`,
    latencyValue,
    latencyLabel: `${latencyValue.toFixed(1)} ms`,
    dbNodesValue,
    dbNodesLabel: `${dbNodesValue}`,
  };
}
