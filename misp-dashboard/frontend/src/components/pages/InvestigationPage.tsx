import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import TypewriterText from "../ui/TypewriterText";
import type { ThreatPayload } from "../../types/threat";
import { AI_ANALYSIS_FALLBACK, ANALYSIS_TYPEWRITER_SPEED_MS, API_BASE } from "../../utils/constants";

type InvestigationPageProps = {
  threats: ThreatPayload[];
  selectedThreatId: string | null;
  aiEnabled: boolean;
  onSelectThreat: (threat: ThreatPayload) => void;
};

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", { hour12: false });
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1 border-b border-slate-200 py-3 last:border-b-0 sm:grid-cols-[160px_1fr]">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="break-all text-sm text-slate-950">{value}</span>
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
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const selectedThreat = useMemo(() => {
    if (selectedThreatId) {
      return threats.find((threat) => threat.id === selectedThreatId) ?? null;
    }

    return threats[threats.length - 1] ?? null;
  }, [selectedThreatId, threats]);

  const relatedThreats = useMemo(() => {
    if (!selectedThreat) {
      return [];
    }

    return threats
      .filter((threat) => threat.type === selectedThreat.type && threat.id !== selectedThreat.id)
      .slice()
      .reverse()
      .slice(0, 8);
  }, [selectedThreat, threats]);

  useEffect(() => {
    setAnalysis("");

    if (!selectedThreat || !aiEnabled) {
      return undefined;
    }

    let cancelled = false;
    setIsLoadingAnalysis(true);

    void fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threat: selectedThreat }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Analysis request failed");
        }
        return response.json() as Promise<{ analysis?: string }>;
      })
      .then((data) => {
        if (!cancelled) {
          setAnalysis(data.analysis ?? AI_ANALYSIS_FALLBACK);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalysis(AI_ANALYSIS_FALLBACK);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAnalysis(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [aiEnabled, selectedThreat]);

  return (
    <main className="h-screen overflow-hidden px-5 pb-5 pt-[138px] lg:pt-[88px]">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4">
        <section className="flex shrink-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-950">Investigation Workspace</h1>
          <p className="text-sm text-slate-600">
            Dedicated threat detail, raw logs, AI interpretation, and related event context.
          </p>
        </section>

        {!selectedThreat ? (
          <section className="panel-shell flex min-h-0 flex-1 items-center justify-center p-8 text-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">No events available yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Keep the dashboard running until the WebSocket stream buffers a threat event.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)]">
            <section className="panel-shell min-h-0 overflow-y-auto p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge severity={selectedThreat.severity} />
                    <span className="text-sm font-semibold text-slate-950">{selectedThreat.type}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">
                    {selectedThreat.malware_family}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedThreat.src_geo.city}, {selectedThreat.src_geo.country} to{" "}
                    {selectedThreat.target_hq_name}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Event #{selectedThreat.misp_event_id}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4">
                <DetailRow label="Threat ID" value={selectedThreat.id} />
                <DetailRow label="Observed" value={formatTimestamp(selectedThreat.timestamp)} />
                <DetailRow label="Source IP" value={selectedThreat.src_ip} />
                <DetailRow label="Destination IP" value={selectedThreat.dst_ip} />
                <DetailRow label="Source" value={selectedThreat.source} />
                <DetailRow label="SHA256" value={selectedThreat.hash_sha256} />
                <DetailRow label="Tags" value={selectedThreat.tags.join(", ")} />
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-950">Related Events</h3>
                <div className="mt-3 space-y-2">
                  {relatedThreats.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                      No related events in the current buffer.
                    </div>
                  ) : (
                    relatedThreats.map((threat) => (
                      <button
                        key={threat.id}
                        type="button"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => onSelectThreat(threat)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-950">{threat.src_ip}</span>
                          <span className="text-xs text-slate-500">{formatTimestamp(threat.timestamp)}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {threat.malware_family} to {threat.target_hq_name}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="grid min-h-0 gap-4 lg:grid-rows-[minmax(260px,0.9fr)_minmax(260px,1.1fr)]">
              <div className="panel-shell min-h-0 overflow-y-auto p-5">
                <h2 className="text-sm font-semibold text-slate-950">AI Analysis</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Gemini-backed interpretation for the selected indicator.
                </p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {!aiEnabled ? (
                    "AI analysis is disabled from Admin settings."
                  ) : isLoadingAnalysis ? (
                    "Preparing analysis..."
                  ) : (
                    <TypewriterText
                      text={analysis}
                      speed={ANALYSIS_TYPEWRITER_SPEED_MS}
                    />
                  )}
                </div>
              </div>

              <div className="panel-shell min-h-0 overflow-y-auto p-5">
                <h2 className="text-sm font-semibold text-slate-950">Raw Event Log</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Complete event payload for evaluation, debugging, and documentation.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800">
                  {JSON.stringify(selectedThreat, null, 2)}
                </pre>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
