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
    <div className="hidden min-w-[104px] flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm xl:flex">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="flex items-baseline gap-1 text-base font-semibold text-slate-950">
        <AnimatedCounter
          value={value}
          duration={COUNTER_ANIMATION_DURATION_MS}
          decimals={decimals}
        />
        <span className="text-xs font-medium text-slate-500">{suffix}</span>
      </span>
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
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
  const navItems = [
    ["Overview", ROUTES.dashboard],
    ["Event Feed", ROUTES.feed],
    ["Geography", ROUTES.geography],
    ["Analytics", ROUTES.analytics],
    ["Investigations", ROUTES.investigations],
    ["Admin", ROUTES.admin],
  ] as const;

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
      className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-3 shadow-sm backdrop-blur"
      animate={{
        borderColor: flashActive ? "rgba(239,68,68,0.38)" : "rgba(226,232,240,1)",
        boxShadow: flashActive
          ? "0 10px 28px rgba(239,68,68,0.12)"
          : "0 1px 0 rgba(15,23,42,0.04)",
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
        <div className="flex min-w-[260px] items-center gap-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-950">MISP SOC Dashboard</span>
            <span className="text-xs text-slate-500">{dataSourceLabel}</span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 lg:flex">
          {navItems.map(([label, path]) => (
            <NavButton
              key={path}
              label={label}
              active={
                path === ROUTES.dashboard
                  ? currentPath === ROUTES.dashboard
                  : currentPath.startsWith(path)
              }
              onClick={() => onNavigate(path)}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-2 2xl:flex">
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
          <MetricPill label="HQ Coverage" value={activeHqCount} suffix="nodes" decimals={0} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span
              className={`status-pulse h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-medium text-slate-500">Stream</span>
              <span className="text-xs font-semibold text-slate-950">
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
      <nav className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 lg:hidden">
        {navItems.map(([label, path]) => (
          <NavButton
            key={path}
            label={label}
            active={
              path === ROUTES.dashboard ? currentPath === ROUTES.dashboard : currentPath.startsWith(path)
            }
            onClick={() => onNavigate(path)}
          />
        ))}
      </nav>
    </motion.header>
  );
}
