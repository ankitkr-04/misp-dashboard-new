import ThreatTerminal from "../widgets/ThreatTerminal";
import ThreatGlobe3D from "../widgets/ThreatGlobe3D";
import AnalyticsPanel from "../widgets/AnalyticsPanel";
import ThreatDetailModal from "../widgets/ThreatDetailModal";
import type { ThreatPayload } from "../../types/threat";

type DashboardGridProps = {
  threats: ThreatPayload[];
  selectedThreat: ThreatPayload | null;
  mitigatedIds: Set<string>;
  onSelectThreat: (threat: ThreatPayload) => void;
  onCloseThreat: () => void;
  onMitigateThreat: (id: string) => void;
};

export default function DashboardGrid({
  threats,
  selectedThreat,
  mitigatedIds,
  onSelectThreat,
  onCloseThreat,
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
          mitigatedIds={mitigatedIds}
        />
        <AnalyticsPanel threats={threats} />
      </div>

      <ThreatDetailModal
        threat={selectedThreat}
        onClose={onCloseThreat}
        onMitigate={onMitigateThreat}
      />
    </main>
  );
}
