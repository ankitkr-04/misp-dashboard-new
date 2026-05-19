import { useEffect, useMemo, useState } from "react";
import AdminControlCenter from "./components/admin/AdminControlCenter";
import DashboardGrid from "./components/layout/DashboardGrid";
import TopNavBar from "./components/layout/TopNavBar";
import InvestigationPage from "./components/pages/InvestigationPage";
import { useAdminState } from "./hooks/useAdminState";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ThreatPayload } from "./types/threat";
import { ROUTES, THREAT_HISTORY_LIMIT } from "./utils/constants";

export default function App() {
  const { threats, telemetry, isConnected } = useWebSocket();
  const { adminState, isLoading, isSaving, error, updateState, refreshLiveFeed, triggerGodMode } =
    useAdminState();
  const [selectedThreat, setSelectedThreat] = useState<ThreatPayload | null>(null);
  const [selectedThreatHistoryType, setSelectedThreatHistoryType] = useState<string | null>(null);
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
  const aiEnabled = adminState?.state.ai_features_enabled ?? true;
  const investigationThreatId = currentPath.startsWith(`${ROUTES.investigations}/`)
    ? decodeURIComponent(currentPath.slice(`${ROUTES.investigations}/`.length))
    : null;

  const relatedThreatHistory = useMemo(() => {
    if (!selectedThreatHistoryType) {
      return [];
    }

    return threats
      .filter((threat) => threat.type === selectedThreatHistoryType)
      .slice()
      .reverse()
      .slice(0, THREAT_HISTORY_LIMIT);
  }, [selectedThreatHistoryType, threats]);

  const handleSelectThreat = (threat: ThreatPayload) => {
    setSelectedThreatHistoryType(null);
    setSelectedThreat(threat);
  };

  const handleOpenThreatPage = (threat: ThreatPayload) => {
    setSelectedThreat(null);
    setSelectedThreatHistoryType(null);
    handleNavigate(`${ROUTES.investigations}/${encodeURIComponent(threat.id)}`);
  };

  const handleSelectInvestigationThreat = (threat: ThreatPayload) => {
    handleNavigate(`${ROUTES.investigations}/${encodeURIComponent(threat.id)}`);
  };

  const handleOpenThreatHistory = (threatType: string) => {
    setSelectedThreat(null);
    setSelectedThreatHistoryType(threatType);
  };

  const handleSelectThreatFromHistory = (threat: ThreatPayload) => {
    setSelectedThreat(threat);
  };

  const handleCloseModal = () => {
    setSelectedThreat(null);
    setSelectedThreatHistoryType(null);
  };

  const handleBackToHistory = () => {
    setSelectedThreat(null);
  };

  const handleMitigate = (id: string) => {
    setMitigatedIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="app-light h-screen w-full overflow-hidden bg-dashboard-bg text-slate-950">
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
      ) : currentPath.startsWith(ROUTES.investigations) ? (
        <InvestigationPage
          threats={threats}
          selectedThreatId={investigationThreatId}
          aiEnabled={aiEnabled}
          onSelectThreat={handleSelectInvestigationThreat}
        />
      ) : (
        <DashboardGrid
          threats={threats}
          aiEnabled={aiEnabled}
          view={
            currentPath.startsWith(ROUTES.feed)
              ? "feed"
              : currentPath.startsWith(ROUTES.geography)
              ? "geography"
              : currentPath.startsWith(ROUTES.analytics)
              ? "analytics"
              : "overview"
          }
          selectedThreat={selectedThreat}
          selectedThreatHistoryType={selectedThreatHistoryType}
          relatedThreatHistory={relatedThreatHistory}
          mitigatedIds={mitigatedIds}
          activeHqs={activeHqs}
          onSelectThreat={handleSelectThreat}
          onOpenThreatPage={handleOpenThreatPage}
          onOpenThreatHistory={handleOpenThreatHistory}
          onSelectThreatFromHistory={handleSelectThreatFromHistory}
          onCloseThreat={handleCloseModal}
          onBackToThreatHistory={handleBackToHistory}
          onMitigateThreat={handleMitigate}
        />
      )}
    </div>
  );
}
