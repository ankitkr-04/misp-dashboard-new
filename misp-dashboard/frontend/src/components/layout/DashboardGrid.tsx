import ThreatTerminal from "../widgets/ThreatTerminal";
import ThreatGlobe3D from "../widgets/ThreatGlobe3D";
import AnalyticsPanel from "../widgets/AnalyticsPanel";
import ThreatDetailModal from "../widgets/ThreatDetailModal";
import type { HqNode, ThreatPayload } from "../../types/threat";

type DashboardGridProps = {
  threats: ThreatPayload[];
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
  return (
    <main className="h-screen overflow-hidden px-4 pb-4 pt-[84px]">
      <div className="mx-auto grid h-full max-w-[1800px] grid-cols-1 grid-rows-[30%_40%_30%] gap-4 lg:grid-cols-[25%_50%_25%] lg:grid-rows-1">
        <ThreatTerminal
          threats={threats}
          onSelectThreat={onSelectThreat}
        />
        <ThreatGlobe3D
          threats={threats}
          activeHqs={activeHqs}
          mitigatedIds={mitigatedIds}
        />
        <AnalyticsPanel
          threats={threats}
          onOpenThreatHistory={onOpenThreatHistory}
        />
      </div>

      <ThreatDetailModal
        threat={selectedThreat}
        threatHistoryType={selectedThreatHistoryType}
        relatedThreats={relatedThreatHistory}
        onClose={onCloseThreat}
        onMitigate={onMitigateThreat}
        onSelectRelatedThreat={onSelectThreatFromHistory}
        onBackToHistory={onBackToThreatHistory}
      />
    </main>
  );
}
