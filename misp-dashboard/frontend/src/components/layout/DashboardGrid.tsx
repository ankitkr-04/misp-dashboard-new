import ThreatTerminal from "../widgets/ThreatTerminal";
import ThreatGlobe3D from "../widgets/ThreatGlobe3D";
import AnalyticsPanel from "../widgets/AnalyticsPanel";
import ThreatDetailModal from "../widgets/ThreatDetailModal";
import type { HqNode, ThreatPayload } from "../../types/threat";
import {
  DASHBOARD_TICKER_DURATION_SECONDS,
  DASHBOARD_TICKER_HEADLINES,
  DASHBOARD_TICKER_HEIGHT_PX,
} from "../../utils/constants";

type DashboardGridProps = {
  threats: ThreatPayload[];
  aiEnabled: boolean;
  selectedThreat: ThreatPayload | null;
  selectedThreatHistoryType: string | null;
  relatedThreatHistory: ThreatPayload[];
  mitigatedIds: Set<string>;
  activeHqs: HqNode[];
  onSelectThreat: (threat: ThreatPayload) => void;
  onOpenThreatHistory: (threatType: string) => void;
  onSelectThreatFromHistory: (threat: ThreatPayload) => void;
  onCloseThreat: () => void;
  onBackToThreatHistory: () => void;
  onMitigateThreat: (id: string) => void;
};

export default function DashboardGrid({
  threats,
  aiEnabled,
  selectedThreat,
  selectedThreatHistoryType,
  relatedThreatHistory,
  mitigatedIds,
  activeHqs,
  onSelectThreat,
  onOpenThreatHistory,
  onSelectThreatFromHistory,
  onCloseThreat,
  onBackToThreatHistory,
  onMitigateThreat,
}: DashboardGridProps) {
  const dynamicTickerItems = threats
    .slice()
    .reverse()
    .slice(0, 6)
    .map(
      (threat) =>
        `[LIVE] ${threat.type} ${threat.src_geo.country} -> ${threat.target_hq_name} // ${threat.malware_family} // ${threat.src_ip}`,
    );
  const tickerItems = [...DASHBOARD_TICKER_HEADLINES, ...dynamicTickerItems];

  return (
    <main
      className="relative h-screen overflow-hidden px-4 pt-[84px]"
      style={{ paddingBottom: DASHBOARD_TICKER_HEIGHT_PX + 16 }}
    >
      <style>{`
        @keyframes dashboardTickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="mx-auto grid h-full max-w-[1800px] grid-cols-1 grid-rows-[30%_40%_30%] gap-4 lg:grid-cols-[25%_50%_25%] lg:grid-rows-1">
        <ThreatTerminal
          threats={threats}
          onSelectThreat={onSelectThreat}
        />
        <ThreatGlobe3D
          threats={threats}
          activeHqs={activeHqs}
          mitigatedIds={mitigatedIds}
          onSelectThreat={onSelectThreat}
        />
        <AnalyticsPanel
          threats={threats}
          aiEnabled={aiEnabled}
          onOpenThreatHistory={onOpenThreatHistory}
        />
      </div>

      <ThreatDetailModal
        threat={selectedThreat}
        threatHistoryType={selectedThreatHistoryType}
        relatedThreats={relatedThreatHistory}
        aiEnabled={aiEnabled}
        onClose={onCloseThreat}
        onMitigate={onMitigateThreat}
        onSelectRelatedThreat={onSelectThreatFromHistory}
        onBackToHistory={onBackToThreatHistory}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden border-t border-cyan-400/12 bg-[rgba(3,8,14,0.95)]"
        style={{ height: DASHBOARD_TICKER_HEIGHT_PX }}
      >
        <div
          className="flex min-w-max items-center gap-10 whitespace-nowrap px-4 text-[11px] uppercase tracking-[0.16em] text-slate-300"
          style={{
            animation: `dashboardTickerScroll ${DASHBOARD_TICKER_DURATION_SECONDS}s linear infinite`,
          }}
        >
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="shrink-0"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
