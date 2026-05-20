import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ThreatPayload } from "../../types/threat";
import {
  AI_ANALYSIS_FALLBACK,
  ANALYSIS_TYPEWRITER_SPEED_MS,
  API_BASE,
  MODAL_SPRING,
} from "../../utils/constants";
import StatusBadge from "../ui/StatusBadge";
import TypewriterText from "../ui/TypewriterText";

type ThreatDetailModalProps = {
  threat: ThreatPayload | null;
  threatHistoryType: string | null;
  relatedThreats: ThreatPayload[];
  aiEnabled: boolean;
  onClose: () => void;
  onSelectRelatedThreat: (threat: ThreatPayload) => void;
  onBackToHistory: () => void;
};

type ModalView = "history" | "detail" | "analysis";

function stringifyLocation(value: ThreatPayload["src_geo"]) {
  return `${value.city}, ${value.country} (${value.lat.toFixed(4)}, ${value.lon.toFixed(4)})`;
}

function renderDetailRows(threat: ThreatPayload) {
  return [
    ["id", threat.id],
    ["timestamp", threat.timestamp],
    ["source", threat.source],
    ["type", threat.type],
    ["severity", threat.severity],
    ["malware_family", threat.malware_family],
    ["src_ip", threat.src_ip],
    ["src_geo", stringifyLocation(threat.src_geo)],
    ["dst_ip", threat.dst_ip],
    ["target_hq", threat.target_hq_name],
    ["dst_geo", stringifyLocation(threat.dst_geo)],
    ["hash_sha256", threat.hash_sha256],
    ["misp_event_id", String(threat.misp_event_id)],
  ] as const;
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", { hour12: false });
}

export default function ThreatDetailModal({
  threat,
  threatHistoryType,
  relatedThreats,
  aiEnabled,
  onClose,
  onSelectRelatedThreat,
  onBackToHistory,
}: ThreatDetailModalProps) {
  const [view, setView] = useState<ModalView>("detail");
  const [analysis, setAnalysis] = useState("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  useEffect(() => {
    setView(threat ? "detail" : threatHistoryType ? "history" : "detail");
    setAnalysis("");
    setIsLoadingAnalysis(false);
  }, [threat, threatHistoryType]);

  const modalActive = Boolean(threat || threatHistoryType);

  const handleAnalyze = async () => {
    if (!threat || !aiEnabled) return;
    setView("analysis");
    setIsLoadingAnalysis(true);
    setAnalysis("");
    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threat }),
      });
      if (!response.ok) throw new Error("Analysis request failed");
      const data = (await response.json()) as { analysis?: string };
      setAnalysis(data.analysis ?? AI_ANALYSIS_FALLBACK);
    } catch {
      setAnalysis(AI_ANALYSIS_FALLBACK);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const historyCriticalCount = relatedThreats.filter(
    (item) => item.severity === "Critical",
  ).length;
  const uniqueSourceCountries = new Set(
    relatedThreats.map((item) => item.src_geo.country),
  ).size;
  const showHistoryView = view === "history" && Boolean(threatHistoryType);

  return (
    <AnimatePresence>
      {modalActive ? (
        <motion.div
          key={threat?.id ?? threatHistoryType ?? "modal"}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={MODAL_SPRING}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {showHistoryView ? "Event History" : "Threat Investigation"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {showHistoryView
                    ? `${threatHistoryType} lane · ${relatedThreats.length} recent records`
                    : `Event ID: ${threat?.id ?? "n/a"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {threat && threatHistoryType ? (
                  <button
                    type="button"
                    className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => { setView("history"); onBackToHistory(); }}
                  >
                    ← Back to History
                  </button>
                ) : null}
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>

            {/* History view */}
            {showHistoryView ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "Buffered Events", value: relatedThreats.length, cls: "text-slate-900" },
                    { label: "Critical Events", value: historyCriticalCount, cls: "text-rose-600" },
                    { label: "Source Countries", value: uniqueSourceCountries, cls: "text-slate-900" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-medium text-slate-500">{stat.label}</div>
                      <div className={`mt-2 text-2xl font-semibold ${stat.cls}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {relatedThreats.length === 0 ? (
                    <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                      No events of this type are currently buffered.
                    </div>
                  ) : (
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {relatedThreats.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                          onClick={() => onSelectRelatedThreat(item)}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge severity={item.severity} />
                              <span className="text-sm font-medium text-slate-900">{item.src_ip}</span>
                              <span className="text-xs text-slate-500">
                                {item.src_geo.city}, {item.src_geo.country}
                              </span>
                            </div>
                            <div className="mt-1.5 text-xs text-slate-500">
                              {item.malware_family} · {item.source} · {item.target_hq_name}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs text-slate-400">{formatTimestamp(item.timestamp)}</div>
                            <div className="mt-1.5 text-xs font-medium text-blue-600">Open →</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Detail view */}
            {view === "detail" && threat ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  {/* Raw fields */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Event Data
                    </h3>
                    <div className="font-mono space-y-0">
                      {renderDetailRows(threat).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-start gap-3 border-b border-slate-100 py-2 last:border-b-0"
                        >
                          <span className="min-w-[120px] text-xs font-medium text-blue-600">{key}</span>
                          <span className="break-all text-xs text-slate-700">{value}</span>
                        </div>
                      ))}
                      <div className="flex items-start gap-3 pt-2">
                        <span className="min-w-[120px] text-xs font-medium text-blue-600">tags</span>
                        <span className="break-all text-xs text-slate-700">{threat.tags.join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary + actions */}
                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                          Severity
                        </span>
                        <StatusBadge severity={threat.severity} />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-medium text-slate-500">Threat Type</span>
                          <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-800">
                            {threat.type}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500">Malware Family</span>
                          <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-800">
                            {threat.malware_family}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500">Route</span>
                          <div className="mt-1 text-sm text-slate-700">
                            {threat.src_geo.city}, {threat.src_geo.country}
                            <span className="mx-1 text-slate-400">→</span>
                            {threat.target_hq_name}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500">Tags</span>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {threat.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <button
                        type="button"
                        className={`w-full cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition ${aiEnabled
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                          }`}
                        disabled={!aiEnabled}
                        onClick={handleAnalyze}
                      >
                        {aiEnabled ? "Analyze with AI" : "AI Analysis Disabled"}
                      </button>
                      {!aiEnabled && (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          Enable AI in Admin → Mode Control
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Analysis view */}
            {view === "analysis" && threat ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-semibold text-slate-900">AI Analysis</h3>
                    <span className="ml-auto text-xs text-slate-500">Gemini-backed SOC interpretation</span>
                  </div>
                  <div className="mt-4 min-h-[240px] rounded-lg border border-slate-200 bg-white p-4">
                    {isLoadingAnalysis ? (
                      <div className="flex min-h-[200px] items-center justify-center">
                        <div className="flex items-center gap-2 text-slate-500">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm">Preparing analysis…</span>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        <TypewriterText text={analysis} speed={ANALYSIS_TYPEWRITER_SPEED_MS} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    type="button"
                    className="cursor-pointer rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    onClick={() => setView("detail")}
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}