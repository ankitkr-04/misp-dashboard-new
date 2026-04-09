import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { AdminStateResponse, TelemetryPayload } from "../../types/threat";
import { useSystemMetrics } from "../../hooks/useSystemMetrics";
import {
  CONNECTION_STATUS_TEXT,
  COUNTER_ANIMATION_DURATION_MS,
  DATA_SOURCE_LABELS,
  ROUTES,
  TOPBAR_FLASH_MS,
} from "../../utils/constants";
import AnimatedCounter from "../ui/AnimatedCounter";
import SecretTrigger from "../ui/SecretTrigger";

type TopNavBarProps = {
  telemetry: TelemetryPayload | null;
  isConnected: boolean;
  adminState: AdminStateResponse | null;
  currentPath: string;
  onNavigate: (path: string) => void;
};

function MetricPill({
  label,
  value,
  suffix,
  decimals = 1,
}: {
  label: string;
  value: number;
  suffix: string;
  decimals?: number;
}) {
  return (
    <div className="panel-shell flex min-w-[132px] flex-col gap-1 px-4 py-2">
      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
        {label}
      </span>
      <span className="flex items-baseline gap-1 text-lg font-semibold text-slate-100">
        <AnimatedCounter
          value={value}
          duration={COUNTER_ANIMATION_DURATION_MS}
          decimals={decimals}
        />
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          {suffix}
        </span>
      </span>
    </div>
  );
}

function TextPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-shell flex min-w-[140px] flex-col gap-1 px-4 py-2">
      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-400">{label}</span>
      <span className="mono-ui truncate text-sm text-slate-100">{value}</span>
    </div>
  );
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-2 text-xs uppercase tracking-[0.24em] transition ${
        active
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
          : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function TopNavBar({
  telemetry,
  isConnected,
  adminState,
  currentPath,
  onNavigate,
}: TopNavBarProps) {
  const [flashActive, setFlashActive] = useState(false);
  const metrics = useSystemMetrics(telemetry);
  const dataSourceLabel =
    DATA_SOURCE_LABELS[
      (adminState?.state.effective_source ?? "mock") as keyof typeof DATA_SOURCE_LABELS
    ] ?? adminState?.state.effective_source ?? "DEMO SIMULATION";
  const activeHqCount = adminState?.state.active_hq_ids.length ?? 0;

  useEffect(() => {
    if (!flashActive) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFlashActive(false);
    }, TOPBAR_FLASH_MS);

    return () => window.clearTimeout(timeoutId);
  }, [flashActive]);

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-30 border-b bg-[rgba(5,10,18,0.84)] px-4 py-3 backdrop-blur-xl"
      animate={{
        borderColor: flashActive ? "rgba(239,68,68,0.92)" : "rgba(255,255,255,0.08)",
        boxShadow: flashActive
          ? "0 10px 34px rgba(239,68,68,0.18)"
          : "0 10px 30px rgba(0,0,0,0.28)",
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
        <div className="flex min-w-[220px] items-center gap-4">
          <div className="mono-ui flex items-center gap-2 text-sm tracking-[0.22em] text-slate-200">
            <span className="text-[var(--color-accent)]">MISP-SOC // LIVE</span>
            <span className="cursor-blink text-[var(--color-accent)]">_</span>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <NavButton
              label="Dashboard"
              active={!currentPath.startsWith(ROUTES.admin)}
              onClick={() => onNavigate(ROUTES.dashboard)}
            />
            <NavButton
              label="Admin"
              active={currentPath.startsWith(ROUTES.admin)}
              onClick={() => onNavigate(ROUTES.admin)}
            />
          </div>
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <MetricPill
            label="Ingestion Rate"
            value={metrics.ingestionRateValue}
            suffix="evt/s"
          />
          <MetricPill
            label="Latency"
            value={metrics.latencyValue}
            suffix="ms"
          />
          <MetricPill
            label="DB Nodes"
            value={metrics.dbNodesValue}
            suffix="online"
            decimals={0}
          />
          <MetricPill
            label="HQ Coverage"
            value={activeHqCount}
            suffix="nodes"
            decimals={0}
          />
          <TextPill
            label="Mode"
            value={dataSourceLabel}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="panel-shell flex items-center gap-3 px-3 py-2">
            <span
              className={`status-pulse h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                WebSocket
              </span>
              <span className="mono-ui text-xs text-slate-200">
                {isConnected
                  ? CONNECTION_STATUS_TEXT.connected
                  : CONNECTION_STATUS_TEXT.disconnected}
              </span>
            </div>
          </div>
          <SecretTrigger
            disabled={Boolean(adminState && !adminState.state.demo_mode)}
            onTriggered={() => setFlashActive(true)}
          />
        </div>
      </div>
    </motion.header>
  );
}
