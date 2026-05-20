import { useCallback, useMemo, useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import TypewriterText from "../ui/TypewriterText";
import type { ThreatPayload } from "../../types/threat";
import {
  AI_ANALYSIS_FALLBACK,
  ANALYSIS_TYPEWRITER_SPEED_MS,
  API_BASE,
} from "../../utils/constants";

type InvestigationPageProps = {
  threats: ThreatPayload[];
  selectedThreatId: string | null;
  aiEnabled: boolean;
  onSelectThreat: (threat: ThreatPayload) => void;
};

type AnalysisState = "idle" | "loading" | "done" | "error";

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", { hour12: false });
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[160px_1fr]">
      <span className="text-xs font-medium text-blue-600">{label}</span>
      <span className="break-all font-mono text-xs text-slate-700">{value}</span>
    </div>
  );
}

export default function InvestigationPage({
  threats,
  selectedThreatId,
  aiEnabled,
  onSelectThreat,
}: InvestigationPageProps) {
  const [analysis, setAnalysis] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [lastAnalyzedId, setLastAnalyzedId] = useState<string | null>(null);

  const selectedThreat = useMemo(() => {
    if (selectedThreatId) {
      return threats.find((t) => t.id === selectedThreatId) ?? null;
    }
    return threats[threats.length - 1] ?? null;
  }, [selectedThreatId, threats]);

  const relatedThreats = useMemo(() => {
    if (!selectedThreat) return [];
    return threats
      .filter((t) => t.type === selectedThreat.type && t.id !== selectedThreat.id)
      .slice()
      .reverse()
      .slice(0, 8);
  }, [selectedThreat, threats]);

  // Reset analysis state when the selected threat changes
  const isStaleAnalysis = selectedThreat?.id !== lastAnalyzedId;

  const handleRunAnalysis = useCallback(async () => {
    if (!selectedThreat || !aiEnabled) return;

    setAnalysisState("loading");
    setAnalysis("");
    setLastAnalyzedId(selectedThreat.id);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threat: selectedThreat }),
      });
      if (!response.ok) throw new Error("Analysis request failed");
      const data = (await response.json()) as { analysis?: string };
      setAnalysis(data.analysis ?? AI_ANALYSIS_FALLBACK);
      setAnalysisState("done");
    } catch {
      setAnalysis(AI_ANALYSIS_FALLBACK);
      setAnalysisState("error");
    }
  }, [selectedThreat, aiEnabled]);

  const showAnalysis = analysisState === "done" || analysisState === "error";
  const isCurrentThreatAnalyzed = !isStaleAnalysis && showAnalysis;

  return (
    <main className="h-screen overflow-hidden px-5 pb-5 pt-[138px] lg:pt-[88px]">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4">

        {/* Page heading */}
        <section className="flex shrink-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-900">Investigation Workspace</h1>
          <p className="text-sm text-slate-500">
            Threat detail, raw event data, and on-demand AI interpretation.
          </p>
        </section>

        {!selectedThreat ? (
          <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-800">No events available yet</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep the dashboard running until the WebSocket stream buffers a threat event.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(400px,0.9fr)_minmax(540px,1.1fr)]">

            {/* Left: event detail + related */}
            <section className="flex min-h-0 flex-col gap-4 overflow-y-auto">

              {/* Header card */}
              <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge severity={selectedThreat.severity} />
                      <span className="text-sm font-semibold text-slate-900">{selectedThreat.type}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">
                      {selectedThreat.malware_family}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {selectedThreat.src_geo.city}, {selectedThreat.src_geo.country}
                      <span className="mx-1.5 text-slate-300">→</span>
                      {selectedThreat.target_hq_name}
                    </p>
                  </div>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                    Event #{selectedThreat.misp_event_id}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedThreat.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Raw event fields */}
              <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Event Fields
                </h3>
                <div className="mt-3">
                  <DetailRow label="threat_id" value={selectedThreat.id} />
                  <DetailRow label="observed" value={formatTimestamp(selectedThreat.timestamp)} />
                  <DetailRow label="source" value={selectedThreat.source} />
                  <DetailRow label="src_ip" value={selectedThreat.src_ip} />
                  <DetailRow label="src_location" value={`${selectedThreat.src_geo.city}, ${selectedThreat.src_geo.country}`} />
                  <DetailRow label="dst_ip" value={selectedThreat.dst_ip} />
                  <DetailRow label="target_hq" value={selectedThreat.target_hq_name} />
                  <DetailRow label="hash_sha256" value={selectedThreat.hash_sha256} />
                  <DetailRow label="misp_event_id" value={selectedThreat.misp_event_id} />
                </div>
              </div>

              {/* Related events */}
              <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Related Events
                  <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
                    ({relatedThreats.length} same type in buffer)
                  </span>
                </h3>
                <div className="mt-3 space-y-2">
                  {relatedThreats.length === 0 ? (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-400">
                      No related events in the current buffer.
                    </div>
                  ) : (
                    relatedThreats.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                        onClick={() => onSelectThreat(t)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge severity={t.severity} />
                            <span className="font-mono text-xs text-slate-700">{t.src_ip}</span>
                          </div>
                          <span className="text-xs text-slate-400">{formatTimestamp(t.timestamp)}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {t.malware_family} · {t.target_hq_name}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Right: AI analysis + raw JSON */}
            <section className="grid min-h-0 gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">

              {/* AI Analysis panel */}
              <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">AI Analysis</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Gemini-backed SOC interpretation — run on demand to avoid unnecessary API calls.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrentThreatAnalyzed && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Analysis ready
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={!aiEnabled || analysisState === "loading"}
                      onClick={() => void handleRunAnalysis()}
                      className={`cursor-pointer rounded-lg border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${!aiEnabled
                          ? "border-slate-200 bg-slate-50 text-slate-400"
                          : isCurrentThreatAnalyzed
                            ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                    >
                      {analysisState === "loading"
                        ? "Analyzing…"
                        : isCurrentThreatAnalyzed
                          ? "Re-analyze"
                          : "Run Analysis"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {!aiEnabled ? (
                    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
                      <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p className="text-sm text-slate-500">AI analysis is disabled.</p>
                      <p className="text-xs text-slate-400">Enable it from Admin → Mode Control → AI Assist.</p>
                    </div>
                  ) : analysisState === "idle" || (isStaleAnalysis && analysisState !== "loading") ? (
                    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Analysis not started</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Click <strong>Run Analysis</strong> to send this indicator to Gemini for SOC interpretation.
                        </p>
                      </div>
                    </div>
                  ) : analysisState === "loading" ? (
                    <div className="flex h-full min-h-[180px] items-center justify-center gap-3">
                      <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-slate-500">Sending to Gemini…</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                      <TypewriterText text={analysis} speed={ANALYSIS_TYPEWRITER_SPEED_MS} />
                    </div>
                  )}
                </div>
              </div>

              {/* Raw event log */}
              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="shrink-0 border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">Raw Event Log</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Complete event payload for documentation and debugging.
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <pre className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs leading-6 text-slate-800">
                    {JSON.stringify(selectedThreat, null, 2)}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}