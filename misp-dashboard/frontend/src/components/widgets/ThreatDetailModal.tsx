import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ThreatPayload } from "../../types/threat";
import {
  AI_ANALYSIS_FALLBACK,
  ANALYSIS_TYPEWRITER_SPEED_MS,
  API_BASE,
  MITIGATION_DELAY_MAX_MS,
  MITIGATION_DELAY_MIN_MS,
  MITIGATION_TERMINAL_STEPS,
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
  onMitigate: (id: string) => void;
  onSelectRelatedThreat: (threat: ThreatPayload) => void;
  onBackToHistory: () => void;
};

type ModalView = "history" | "detail" | "analysis" | "mitigation";

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

function fillMitigationTemplate(threat: ThreatPayload) {
  return MITIGATION_TERMINAL_STEPS.map((step) =>
    step
      .replace("{id}", threat.id)
      .replaceAll("{src_ip}", threat.src_ip)
      .replace("{malware_family}", threat.malware_family)
      .replace("{hash_sha256}", threat.hash_sha256)
      .replace("{misp_event_id}", String(threat.misp_event_id)),
  );
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    hour12: false,
  });
}

export default function ThreatDetailModal({
  threat,
  threatHistoryType,
  relatedThreats,
  aiEnabled,
  onClose,
  onMitigate,
  onSelectRelatedThreat,
  onBackToHistory,
}: ThreatDetailModalProps) {
  const [view, setView] = useState<ModalView>("detail");
  const [analysis, setAnalysis] = useState("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [mitigationLines, setMitigationLines] = useState<string[]>([]);
  const [mitigationComplete, setMitigationComplete] = useState(false);
  const timeoutIdsRef = useRef<number[]>([]);
  const mitigationCommittedRef = useRef(false);

  useEffect(() => {
    setView(threat ? "detail" : threatHistoryType ? "history" : "detail");
    setAnalysis("");
    setIsLoadingAnalysis(false);
    setMitigationLines([]);
    setMitigationComplete(false);
    mitigationCommittedRef.current = false;

    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, [threat, threatHistoryType]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const modalActive = Boolean(threat || threatHistoryType);

  const handleAnalyze = async () => {
    if (!threat || !aiEnabled) {
      return;
    }

    setView("analysis");
    setIsLoadingAnalysis(true);
    setAnalysis("");

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ threat }),
      });

      if (!response.ok) {
        throw new Error("Analysis request failed");
      }

      const data = (await response.json()) as { analysis?: string };
      setAnalysis(data.analysis ?? AI_ANALYSIS_FALLBACK);
    } catch {
      setAnalysis(AI_ANALYSIS_FALLBACK);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleMitigation = () => {
    if (!threat) {
      return;
    }

    setView("mitigation");
    setMitigationLines([]);
    setMitigationComplete(false);

    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];

    const steps = fillMitigationTemplate(threat);
    let accumulatedDelay = 0;

    steps.forEach((step, index) => {
      const stepDelay =
        Math.floor(Math.random() * (MITIGATION_DELAY_MAX_MS - MITIGATION_DELAY_MIN_MS + 1)) +
        MITIGATION_DELAY_MIN_MS;
      accumulatedDelay += stepDelay;

      const timeoutId = window.setTimeout(() => {
        setMitigationLines((previous) => [...previous, step]);

        if (index === steps.length - 1) {
          setMitigationComplete(true);

          if (!mitigationCommittedRef.current) {
            mitigationCommittedRef.current = true;
            onMitigate(threat.id);
          }
        }
      }, accumulatedDelay);

      timeoutIdsRef.current.push(timeoutId);
    });
  };

  const historyCriticalCount = relatedThreats.filter((item) => item.severity === "Critical").length;
  const uniqueSourceCountries = new Set(relatedThreats.map((item) => item.src_geo.country)).size;
  const showHistoryView = view === "history" && Boolean(threatHistoryType);

  return (
    <AnimatePresence>
      {modalActive ? (
        <motion.div
          key={threat?.id ?? threatHistoryType ?? "modal"}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/72 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="panel-shell relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={MODAL_SPRING}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  {showHistoryView ? "Event History" : "Threat Investigation"}
                </h2>
                <p className="text-xs text-slate-400">
                  {showHistoryView
                    ? `${threatHistoryType} lane · ${relatedThreats.length} recent records`
                    : `Threat ID ${threat?.id ?? "n/a"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {threat && threatHistoryType ? (
                  <button
                    type="button"
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
                    onClick={() => {
                      setView("history");
                      onBackToHistory();
                    }}
                  >
                    Back To History
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>

            {showHistoryView ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-white/8 bg-white/[0.025] p-4">
                    <div className="text-xs font-medium text-slate-500">Buffered Events</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-100">
                      {relatedThreats.length}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/8 bg-white/[0.025] p-4">
                    <div className="text-xs font-medium text-slate-500">Critical Events</div>
                    <div className="mt-2 text-2xl font-semibold text-rose-300">
                      {historyCriticalCount}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/8 bg-white/[0.025] p-4">
                    <div className="text-xs font-medium text-slate-500">Source Countries</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-100">
                      {uniqueSourceCountries}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-white/8 bg-white/[0.025] p-3">
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
                          className="flex w-full items-center justify-between gap-3 rounded-md border border-white/8 bg-white/3 px-3 py-3 text-left transition hover:border-white/16 hover:bg-white/6"
                          onClick={() => onSelectRelatedThreat(item)}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge severity={item.severity} />
                              <span className="text-sm text-slate-100">{item.src_ip}</span>
                              <span className="text-xs text-slate-500">
                                {item.src_geo.city}, {item.src_geo.country}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              {item.malware_family} · {item.source} · {item.target_hq_name}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs text-slate-400">
                              {formatTimestamp(item.timestamp)}
                            </div>
                            <div className="mt-2 text-xs font-semibold text-sky-300">
                              Open investigation
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {view === "detail" && threat ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-md border border-white/8 bg-white/[0.025] p-4">
                  <div className="mono-ui space-y-2 text-sm">
                    {renderDetailRows(threat).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-[112px] text-sky-300">{key}</span>
                        <span className="break-all text-slate-200">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 pt-2">
                      <span className="min-w-[112px] text-sky-300">tags</span>
                      <span className="break-all text-slate-200">{threat.tags.join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-md border border-white/8 bg-white/[0.025] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Severity
                      </span>
                      <StatusBadge severity={threat.severity} />
                    </div>

                    <div className="space-y-3 text-sm text-slate-200">
                      <div>
                        <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                          Threat Type
                        </span>
                        <span className="mt-1 inline-flex rounded-md border border-white/10 bg-white/5 px-3 py-1">
                          {threat.type}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                          Malware Family
                        </span>
                        <span className="mt-1 inline-flex rounded-md border border-white/10 bg-white/5 px-3 py-1">
                          {threat.malware_family}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                          Tags
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {threat.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md border border-emerald-400/20 bg-emerald-400/6 px-2 py-1 text-xs text-emerald-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={`rounded-md border px-4 py-2 text-sm transition ${
                        aiEnabled
                          ? "border-sky-400/30 bg-sky-400/8 text-sky-200 hover:bg-sky-400/14"
                          : "cursor-not-allowed border-slate-600/60 bg-slate-700/20 text-slate-500"
                      }`}
                      disabled={!aiEnabled}
                      onClick={handleAnalyze}
                    >
                      {aiEnabled ? "Analyze with AI" : "AI Analysis Disabled"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-emerald-400/30 bg-emerald-400/8 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/14"
                      onClick={handleMitigation}
                    >
                      Initialize Mitigation
                    </button>
                  </div>
                </div>
              </div>
              </div>
            ) : null}

            {view === "analysis" && threat ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="rounded-md border border-white/8 bg-white/[0.025] p-5">
                  <div className="mb-4 text-sm font-semibold text-slate-100">
                    Gemini SOC Analyst
                  </div>

                  {isLoadingAnalysis ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                      <div className="flex items-center gap-3 text-sky-200">
                        <span className="h-3 w-3 rounded-full bg-sky-300" />
                        <span className="text-sm font-semibold">Parsing indicators</span>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-[56vh] min-h-[240px] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-slate-200">
                      <TypewriterText
                        text={analysis}
                        speed={ANALYSIS_TYPEWRITER_SPEED_MS}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
                    onClick={() => setView("detail")}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}

            {view === "mitigation" && threat ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="rounded-md border border-white/8 bg-white/[0.025] p-5">
                  <div className="mb-4 text-sm font-semibold text-slate-100">
                    Containment Workflow
                  </div>

                  <div className="mono-ui min-h-[280px] space-y-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {mitigationLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                    {!mitigationComplete ? (
                      <div className="cursor-blink text-slate-400">|</div>
                    ) : null}
                  </div>

                  {mitigationComplete ? (
                    <div className="mt-5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-sm font-semibold text-emerald-200">
                      Containment actions completed
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
                    onClick={() => setView("detail")}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
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
