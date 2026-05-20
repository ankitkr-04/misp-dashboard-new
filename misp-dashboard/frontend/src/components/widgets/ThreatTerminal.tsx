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
  return new Date(timestamp).toLocaleTimeString("en-US", { hour12: false });
}

export default function ThreatTerminal({
  threats,
  onSelectThreat,
  onOpenThreatPage,
}: ThreatTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isHovered) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: TERMINAL_SCROLL_BOTTOM_BEHAVIOR,
    });
  }, [threats, isHovered]);

  return (
    <section className="panel-shell flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Event Feed</h2>
          <p className="text-xs text-slate-500">Live threat intelligence records</p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {threats.length} buffered
        </span>
      </div>

      {/* Feed list */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {threats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Waiting for incoming events…
          </div>
        ) : (
          <div className="space-y-1.5">
            {threats.map((threat) => (
              <div
                key={threat.id}
                role="button"
                tabIndex={0}
                className="fade-in-row group w-full cursor-pointer rounded-lg border border-slate-200 bg-white
                           px-3 py-2.5 text-left transition-all
                           hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
                onClick={() => onSelectThreat(threat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectThreat(threat);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge severity={threat.severity} />
                      <span className="text-sm font-medium text-slate-800">{threat.type}</span>
                    </div>
                    <div className="mono-ui mt-1.5 truncate text-xs text-slate-500">
                      {threat.src_ip} → {threat.target_hq_name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {threat.malware_family} · {threat.src_geo.city}, {threat.src_geo.country}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-slate-400">{formatTimestamp(threat.timestamp)}</span>
                  </div>
                </div>

                {onOpenThreatPage ? (
                  <div className="mt-2 flex justify-end">
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm
                                 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenThreatPage(threat);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
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