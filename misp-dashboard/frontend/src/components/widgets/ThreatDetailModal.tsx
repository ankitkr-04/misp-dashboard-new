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
  onClose: () => void;
  onMitigate: (id: string) => void;
};

type ModalView = "detail" | "analysis" | "mitigation";

function stringifyLocation(value: ThreatPayload["src_geo"]) {
  return `${value.city}, ${value.country} (${value.lat.toFixed(4)}, ${value.lon.toFixed(4)})`;
}

function renderDetailRows(threat: ThreatPayload) {
  return [
    ["id", threat.id],
    ["timestamp", threat.timestamp],
    ["type", threat.type],
    ["severity", threat.severity],
    ["malware_family", threat.malware_family],
    ["src_ip", threat.src_ip],
    ["src_geo", stringifyLocation(threat.src_geo)],
    ["dst_ip", threat.dst_ip],
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

export default function ThreatDetailModal({
  threat,
  onClose,
  onMitigate,
}: ThreatDetailModalProps) {
  const [view, setView] = useState<ModalView>("detail");
  const [analysis, setAnalysis] = useState("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [mitigationLines, setMitigationLines] = useState<string[]>([]);
  const [mitigationComplete, setMitigationComplete] = useState(false);
  const timeoutIdsRef = useRef<number[]>([]);
  const mitigationCommittedRef = useRef(false);

  useEffect(() => {
    setView("detail");
    setAnalysis("");
    setIsLoadingAnalysis(false);
    setMitigationLines([]);
    setMitigationComplete(false);
    mitigationCommittedRef.current = false;

    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, [threat]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const handleAnalyze = async () => {
    if (!threat) {
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

  return (
    <AnimatePresence>
      {threat ? (
        <motion.div
          key={threat.id}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/72 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="panel-shell relative w-full max-w-5xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={MODAL_SPRING}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <h2 className="mono-ui text-sm tracking-[0.24em] text-[var(--color-accent)]">
                  THREAT INVESTIGATION
                </h2>
                <p className="text-xs text-slate-400">Threat ID {threat.id}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            {view === "detail" && (
              <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-md border border-white/8 bg-black/22 p-4">
                  <div className="mono-ui space-y-2 text-sm">
                    {renderDetailRows(threat).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-[112px] text-cyan-300">{key}</span>
                        <span className="break-all text-slate-200">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 pt-2">
                      <span className="min-w-[112px] text-cyan-300">tags</span>
                      <span className="break-all text-slate-200">{threat.tags.join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-md border border-white/8 bg-black/18 p-4">
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
                      className="rounded-md border border-cyan-400/30 bg-cyan-400/8 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/14"
                      onClick={handleAnalyze}
                    >
                      Analyze with AI
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
            )}

            {view === "analysis" && (
              <div className="space-y-5 p-5">
                <div className="rounded-md border border-cyan-400/12 bg-[rgba(4,10,20,0.96)] p-5">
                  <div className="mono-ui mb-4 text-sm tracking-[0.24em] text-cyan-300">
                    // GEMINI SOC ANALYST
                  </div>

                  {isLoadingAnalysis ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                      <div className="flex items-center gap-3 text-cyan-200">
                        <span className="h-3 w-3 rounded-full bg-cyan-300 animate-pulse" />
                        <span className="mono-ui text-sm uppercase tracking-[0.2em]">
                          Parsing indicators
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[240px] whitespace-pre-wrap text-sm leading-7 text-slate-200">
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
            )}

            {view === "mitigation" && (
              <div className="space-y-5 p-5">
                <div className="rounded-md border border-white/6 bg-black p-5">
                  <div className="mono-ui min-h-[280px] space-y-3 text-sm leading-6 text-emerald-300">
                    {mitigationLines.map((line, index) => (
                      <div
                        key={`${line}-${index}`}
                        className="fade-in-highlight"
                      >
                        {line}
                      </div>
                    ))}

                    {!mitigationComplete && (
                      <div className="cursor-blink text-emerald-400">|</div>
                    )}

                    {mitigationComplete && (
                      <div className="mt-4 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center font-semibold tracking-[0.24em] text-emerald-200">
                        THREAT NEUTRALIZED
                      </div>
                    )}
                  </div>
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
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
