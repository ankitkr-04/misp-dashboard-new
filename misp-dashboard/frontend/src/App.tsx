import { useEffect, useMemo, useState } from "react";
import AdminControlCenter from "./components/admin/AdminControlCenter";
import DashboardGrid from "./components/layout/DashboardGrid";
import TopNavBar from "./components/layout/TopNavBar";
import { useAdminState } from "./hooks/useAdminState";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ThreatPayload } from "./types/threat";
import { ROUTES } from "./utils/constants";

export default function App() {
  const { threats, telemetry, isConnected } = useWebSocket();
  const { adminState, isLoading, isSaving, error, updateState, refreshLiveFeed, triggerGodMode } =
    useAdminState();
  const [selectedThreat, setSelectedThreat] = useState<ThreatPayload | null>(null);
  const [mitigatedIds, setMitigatedIds] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleNavigate = (path: string) => {
    if (window.location.pathname === path) {
      return;
    }

    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const activeHqs = useMemo(() => {
    if (!adminState) {
      return [];
    }

    return adminState.catalog.hqs.filter((hq) => adminState.state.active_hq_ids.includes(hq.id));
  }, [adminState]);

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
        adminState={adminState}
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />
      {currentPath.startsWith(ROUTES.admin) ? (
        <AdminControlCenter
          adminState={adminState}
          isLoading={isLoading}
          isSaving={isSaving}
          error={error}
          onUpdateState={updateState}
          onRefreshLiveFeed={refreshLiveFeed}
          onTriggerGodMode={triggerGodMode}
          onNavigate={handleNavigate}
        />
      ) : (
        <DashboardGrid
          threats={threats}
          selectedThreat={selectedThreat}
          mitigatedIds={mitigatedIds}
          activeHqs={activeHqs}
          onSelectThreat={setSelectedThreat}
          onCloseThreat={() => setSelectedThreat(null)}
          onMitigateThreat={handleMitigate}
        />
      )}
    </div>
  );
}
