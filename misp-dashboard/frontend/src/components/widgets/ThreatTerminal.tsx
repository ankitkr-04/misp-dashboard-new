import { useEffect, useRef, useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import { TERMINAL_SCROLL_BOTTOM_BEHAVIOR } from "../../utils/constants";
import type { ThreatPayload } from "../../types/threat";

type ThreatTerminalProps = {
  threats: ThreatPayload[];
  onSelectThreat: (threat: ThreatPayload) => void;
  onOpenThreatPage?: (threat: ThreatPayload) => void;
};

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
  });
}

export default function ThreatTerminal({
  threats,
  onSelectThreat,
  onOpenThreatPage,
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
          <h2 className="text-sm font-semibold text-slate-100">Event Feed</h2>
          <p className="text-xs text-slate-400">Live threat intelligence records</p>
        </div>
        <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-slate-400">
          {threats.length} buffered
        </span>
      </div>

      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {threats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Waiting for incoming events
          </div>
        ) : (
          <div className="space-y-2">
            {threats.map((threat) => (
              <div
                key={threat.id}
                role="button"
                tabIndex={0}
                className="fade-in-highlight w-full rounded-md border border-white/8 bg-white/[0.025] px-3 py-3 text-left transition hover:border-sky-300/25 hover:bg-white/[0.05]"
                onClick={() => onSelectThreat(threat)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelectThreat(threat);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge severity={threat.severity} />
                      <span className="text-sm font-medium text-slate-100">{threat.type}</span>
                    </div>
                    <div className="mt-2 truncate text-xs text-slate-400">
                      {threat.src_ip} to {threat.target_hq_name}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {threat.malware_family} · {threat.src_geo.city}, {threat.src_geo.country}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatTimestamp(threat.timestamp)}
                  </span>
                </div>
                {onOpenThreatPage ? (
                  <div className="mt-3 flex justify-end">
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenThreatPage(threat);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.stopPropagation();
                          onOpenThreatPage(threat);
                        }
                      }}
                    >
                      Full investigation
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
