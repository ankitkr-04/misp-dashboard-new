import { useEffect, useRef, useState } from "react";
import {
  MAX_TERMINAL_LINES,
  WS_RECONNECT_DELAY_MS,
  WS_URL,
} from "../utils/constants";
import type { TelemetryPayload, ThreatPayload, WSMessage } from "../types/threat";

export function useWebSocket() {
  const [threats, setThreats] = useState<ThreatPayload[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let shouldReconnect = true;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;

          if (message.msg_type === "threat") {
            const threat = message.data as unknown as ThreatPayload;
            setThreats((previous) => {
              const next = [...previous, threat];
              return next.slice(-MAX_TERMINAL_LINES);
            });
            return;
          }

          if (message.msg_type === "telemetry") {
            setTelemetry(message.data as unknown as TelemetryPayload);
          }
        } catch {
          setIsConnected(false);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        setIsConnected(false);

        if (shouldReconnect) {
          reconnectTimeoutRef.current = window.setTimeout(connect, WS_RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;

      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }

      socketRef.current?.close();
    };
  }, []);

  return { threats, telemetry, isConnected };
}
