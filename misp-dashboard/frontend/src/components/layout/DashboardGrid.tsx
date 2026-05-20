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
    (t) => t.severity === "Critical" || t.severity === "High",
  ).length;
  const uniqueSourceCountries = new Set(threats.map((t) => t.src_geo.country)).size;
  const latestThreat = threats[threats.length - 1];
  const lastUpdated = latestThreat
    ? new Date(latestThreat.timestamp).toLocaleTimeString("en-US", { hour12: false })
    : "—";

  const summaryCards = [
    { label: "Buffered Events", value: threats.length, sub: "Active WebSocket window" },
    { label: "High Priority", value: highPriorityCount, sub: "High & Critical severity" },
    { label: "Source Countries", value: uniqueSourceCountries, sub: "Observed this session" },
    { label: "Active HQ Nodes", value: activeHqs.length, sub: `Updated ${lastUpdated}` },
  ];

  const SummaryBar = () => (
    <section className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <div key={card.label} className="panel-shell px-4 py-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{card.value}</div>
          <div className="mt-0.5 text-xs text-slate-400">{card.sub}</div>
        </div>
      ))}
    </section>
  );

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
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-3">

        {/* Page heading — shown on all tabs */}
        <section className="flex shrink-0 items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {view === "overview" ? "Operations Overview"
                : view === "feed" ? "Event Feed"
                  : view === "geography" ? "Threat Geography"
                    : "Analytics"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {view === "overview" ? "Real-time MISP indicator stream, geographic routing, and analytics."
                : view === "feed" ? "Incoming threat intelligence records from the active data source."
                  : view === "geography" ? "Source IP routes plotted against active command-centre targets."
                    : "Threat mix, event velocity, malware families, and session trends."}
            </p>
          </div>
        </section>

        {/* Overview: summary at top, then 2-col (feed | globe+analytics stacked) */}
        {view === "overview" ? (
          <>
            <SummaryBar />
            {/* Desktop: feed left, [globe / analytics] right. Mobile: globe → feed → analytics */}
            <div className="grid min-h-0 flex-1 gap-3
              grid-cols-1
              xl:grid-cols-[minmax(300px,0.9fr)_minmax(540px,1.65fr)]">

              {/* Feed — order-2 on mobile so globe appears first */}
              <div className="order-2 xl:order-1 min-h-0">
                {feedPanel}
              </div>

              {/* Right column: globe (grows) + analytics (fixed height, scrollable) — order-1 on mobile */}
              <div className="order-1 xl:order-2 flex min-h-0 flex-col gap-3">
                <div className="min-h-0 flex-1 xl:flex-[7]">
                  {geographyPanel}
                </div>
                <div className="min-h-0 xl:flex-[3] xl:max-h-[340px]">
                  {analyticsPanel}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* Feed tab — summary at bottom */}
        {view === "feed" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 grid gap-3 xl:grid-cols-[minmax(520px,1.2fr)_minmax(340px,0.8fr)]">
              {feedPanel}
              {/* Workflow guide */}
              <section className="panel-shell flex min-h-0 flex-col overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-800">Review Workflow</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Click any record to triage, then open a full investigation.</p>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto p-4 text-sm text-slate-600">
                  {[
                    { step: "1", title: "Triage", body: "Review severity, source IP, threat type, and the targeted HQ node." },
                    { step: "2", title: "Investigate", body: "Open the full investigation page to see raw JSON, tags, route context, and AI analysis." },
                    { step: "3", title: "Contain", body: "Record simulated containment actions for project documentation and evaluation." },
                  ].map((s) => (
                    <div key={s.step} className="inner-card p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{s.step}</span>
                        <span className="font-semibold text-slate-800">{s.title}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{s.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            {/* Summary cards at bottom */}
            <SummaryBar />
          </div>
        ) : null}

        {/* Geography tab — summary at bottom */}
        {view === "geography" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1">{geographyPanel}</div>
            <SummaryBar />
          </div>
        ) : null}

        {/* Analytics tab — summary at bottom */}
        {view === "analytics" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1">{analyticsPanel}</div>
            <SummaryBar />
          </div>
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