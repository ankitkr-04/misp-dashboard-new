import { useState } from "react";
import DashboardGrid from "./components/layout/DashboardGrid";
import TopNavBar from "./components/layout/TopNavBar";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ThreatPayload } from "./types/threat";

export default function App() {
  const { threats, telemetry, isConnected } = useWebSocket();
  const [selectedThreat, setSelectedThreat] = useState<ThreatPayload | null>(null);
  const [mitigatedIds, setMitigatedIds] = useState<Set<string>>(new Set());

  const handleMitigate = (id: string) => {
    setMitigatedIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-dashboard-bg text-slate-100">
      <TopNavBar
        telemetry={telemetry}
        isConnected={isConnected}
      />
      <DashboardGrid
        threats={threats}
        selectedThreat={selectedThreat}
        mitigatedIds={mitigatedIds}
        onSelectThreat={setSelectedThreat}
        onCloseThreat={() => setSelectedThreat(null)}
        onMitigateThreat={handleMitigate}
      />
    </div>
  );
}
