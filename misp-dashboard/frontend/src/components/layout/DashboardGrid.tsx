import ThreatTerminal from "../widgets/ThreatTerminal";
import ThreatGlobe3D from "../widgets/ThreatGlobe3D";
import AnalyticsPanel from "../widgets/AnalyticsPanel";
import ThreatDetailModal from "../widgets/ThreatDetailModal";
import type { HqNode, ThreatPayload } from "../../types/threat";

type DashboardGridProps = {
  threats: ThreatPayload[];
  aiEnabled: boolean;
  view: "overview" | "feed" | "geography" | "analytics";
  selectedThreat: ThreatPayload | null;
  selectedThreatHistoryType: string | null;
  relatedThreatHistory: ThreatPayload[];
  mitigatedIds: Set<string>;
  activeHqs: HqNode[];
  onSelectThreat: (threat: ThreatPayload) => void;
  onOpenThreatPage: (threat: ThreatPayload) => void;
  onOpenThreatHistory: (threatType: string) => void;
  onSelectThreatFromHistory: (threat: ThreatPayload) => void;
  onCloseThreat: () => void;
  onBackToThreatHistory: () => void;
  onMitigateThreat: (id: string) => void;
};

export default function DashboardGrid({
  threats,
  aiEnabled,
  view,
  selectedThreat,
  selectedThreatHistoryType,
  relatedThreatHistory,
  mitigatedIds,
  activeHqs,
  onSelectThreat,
  onOpenThreatPage,
  onOpenThreatHistory,
  onSelectThreatFromHistory,
  onCloseThreat,
  onBackToThreatHistory,
  onMitigateThreat,
}: DashboardGridProps) {
  const highPriorityCount = threats.filter(
    (threat) => threat.severity === "Critical" || threat.severity === "High",
  ).length;
  const uniqueSourceCountries = new Set(threats.map((threat) => threat.src_geo.country)).size;
  const latestThreat = threats[threats.length - 1];
  const lastUpdated = latestThreat
    ? new Date(latestThreat.timestamp).toLocaleTimeString("en-US", { hour12: false })
    : "Waiting";

  const summaryCards = [
    { label: "Buffered events", value: threats.length, hint: "Active WebSocket window" },
    { label: "High priority", value: highPriorityCount, hint: "High and Critical severity" },
    { label: "Source countries", value: uniqueSourceCountries, hint: "Observed in this session" },
    { label: "Active HQ nodes", value: activeHqs.length, hint: `Last update ${lastUpdated}` },
  ];
  const pageTitle = {
    overview: "Operations Overview",
    feed: "Event Feed",
    geography: "Threat Geography",
    analytics: "Analytics",
  }[view];
  const pageDescription = {
    overview: "A concise command view of current MISP-style indicators and SOC telemetry.",
    feed: "A focused event queue for reviewing incoming indicators and opening investigations.",
    geography: "Source routes, affected command centers, and geographic concentration.",
    analytics: "Threat mix, severity trends, event velocity, and analyst summaries.",
  }[view];

  const feedPanel = (
    <ThreatTerminal
      threats={threats}
      onSelectThreat={onSelectThreat}
      onOpenThreatPage={onOpenThreatPage}
    />
  );
  const geographyPanel = (
    <ThreatGlobe3D
      threats={threats}
      activeHqs={activeHqs}
      mitigatedIds={mitigatedIds}
      onSelectThreat={onSelectThreat}
    />
  );
  const analyticsPanel = (
    <AnalyticsPanel
      threats={threats}
      aiEnabled={aiEnabled}
      onOpenThreatHistory={onOpenThreatHistory}
    />
  );

  return (
    <main className="h-screen overflow-hidden px-5 pb-5 pt-[138px] lg:pt-[88px]">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4">
        <section className="flex shrink-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-950">{pageTitle}</h1>
          <p className="text-sm text-slate-600">{pageDescription}</p>
        </section>

        <section className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="panel-shell px-4 py-3"
            >
              <div className="text-xs font-medium text-slate-400">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
            </div>
          ))}
        </section>

        {view === "overview" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(280px,0.85fr)_minmax(420px,1.35fr)_minmax(320px,1fr)] gap-4 xl:grid-cols-[minmax(310px,0.9fr)_minmax(560px,1.55fr)_minmax(340px,1fr)] xl:grid-rows-1">
            {feedPanel}
            {geographyPanel}
            {analyticsPanel}
          </div>
        ) : null}

        {view === "feed" ? (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(520px,1.15fr)_minmax(360px,0.85fr)]">
            {feedPanel}
            <section className="panel-shell flex min-h-0 flex-col overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">Review Workflow</h2>
                <p className="text-xs text-slate-500">Open a record for quick review or use full investigation for raw logs.</p>
              </div>
              <div className="grid gap-3 overflow-y-auto p-4 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-950">1. Triage</div>
                  <p className="mt-1">Review severity, source IP, threat type, and target HQ.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-950">2. Investigate</div>
                  <p className="mt-1">Use full investigation to see raw JSON, tags, route context, and AI analysis.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-950">3. Contain</div>
                  <p className="mt-1">Record simulated containment actions for presentation and project evaluation.</p>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {view === "geography" ? (
          <div className="min-h-0 flex-1">{geographyPanel}</div>
        ) : null}

        {view === "analytics" ? (
          <div className="min-h-0 flex-1">{analyticsPanel}</div>
        ) : null}
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

    </main>
  );
}
