import { useEffect, useRef, useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import { TERMINAL_SCROLL_BOTTOM_BEHAVIOR } from "../../utils/constants";
import type { ThreatPayload } from "../../types/threat";

type ThreatTerminalProps = {
  threats: ThreatPayload[];
  onSelectThreat: (threat: ThreatPayload) => void;
};

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
  });
}

export default function ThreatTerminal({
  threats,
  onSelectThreat,
}: ThreatTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isHovered) {
      return;
    }

    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: TERMINAL_SCROLL_BOTTOM_BEHAVIOR,
    });
  }, [threats, isHovered]);

  return (
    <section className="panel-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
            THREAT TERMINAL
          </h2>
          <p className="text-xs text-slate-400">Live MISP-style event ingestion feed</p>
        </div>
        <span className="mono-ui text-xs text-slate-500">{threats.length} buffered</span>
      </div>

      <div
        ref={containerRef}
        className="mono-ui min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {threats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.24em] text-slate-500">
            Waiting for telemetry stream
          </div>
        ) : (
          <div className="space-y-2">
            {threats.map((threat) => (
              <button
                key={threat.id}
                type="button"
                className="fade-in-highlight flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left transition hover:border-white/10 hover:bg-white/4"
                onClick={() => onSelectThreat(threat)}
              >
                <span className="shrink-0 text-[11px] text-slate-500">
                  [{formatTimestamp(threat.timestamp)}]
                </span>
                <StatusBadge severity={threat.severity} />
                <span className="shrink-0 text-[11px] uppercase text-slate-200">
                  [{threat.type}]
                </span>
                <span className="truncate text-[11px] text-slate-300">
                  {threat.src_ip} -&gt; {threat.malware_family}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
