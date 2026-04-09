import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type {
  AdminStateResponse,
  AdminStateUpdateRequest,
  HqNode,
} from "../../types/threat";
import {
  ADMIN_PILLAR_COPY,
  DATA_SOURCE_LABELS,
  LIVE_FEED_STATUS_LABELS,
  ROUTES,
  SEVERITY_COLORS,
  SIMULATION_PROFILE_LABELS,
  STREAM_INTERVAL_MAX_SECONDS,
  STREAM_INTERVAL_MIN_SECONDS,
  STREAM_INTERVAL_STEP_SECONDS,
} from "../../utils/constants";

type AdminControlCenterProps = {
  adminState: AdminStateResponse | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onUpdateState: (patch: AdminStateUpdateRequest) => Promise<void>;
  onRefreshLiveFeed: () => Promise<void>;
  onTriggerGodMode: () => Promise<void>;
  onNavigate: (path: string) => void;
};

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="panel-shell flex h-full flex-col gap-4 p-5">
      <div>
        <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      className="rounded-md border px-3 py-2 text-sm transition"
      style={{
        borderColor: active ? `${accent ?? "#00ff88"}66` : "rgba(255,255,255,0.08)",
        background: active ? `${accent ?? "#00ff88"}16` : "rgba(255,255,255,0.03)",
        color: active ? "#f8fafc" : "#94a3b8",
        boxShadow: active ? `0 0 12px ${accent ?? "#00ff88"}22` : "none",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    hour12: false,
  });
}

function toggleSelection(items: string[], value: string) {
  if (items.includes(value)) {
    return items.filter((item) => item !== value);
  }

  return [...items, value];
}

function HqCard({
  hq,
  active,
  onClick,
}: {
  hq: HqNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-md border px-4 py-4 text-left transition"
      style={{
        borderColor: active ? `${hq.accent}66` : "rgba(255,255,255,0.08)",
        background: active ? `${hq.accent}18` : "rgba(255,255,255,0.03)",
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{hq.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
            {hq.city}, {hq.country}
          </div>
        </div>
        <span
          className="h-3 w-3 rounded-full"
          style={{
            backgroundColor: hq.accent,
            boxShadow: `0 0 12px ${hq.accent}`,
          }}
        />
      </div>
      <div className="mono-ui mt-3 text-xs text-slate-300">{hq.ip}</div>
    </button>
  );
}

export default function AdminControlCenter({
  adminState,
  isLoading,
  isSaving,
  error,
  onUpdateState,
  onRefreshLiveFeed,
  onTriggerGodMode,
  onNavigate,
}: AdminControlCenterProps) {
  if (isLoading && !adminState) {
    return (
      <main className="h-screen overflow-y-auto px-4 pb-6 pt-[84px]">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-center">
          <div className="panel-shell px-6 py-5 text-sm text-slate-300">
            Loading admin control plane...
          </div>
        </div>
      </main>
    );
  }

  if (!adminState) {
    return (
      <main className="h-screen overflow-y-auto px-4 pb-6 pt-[84px]">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-center">
          <div className="panel-shell px-6 py-5 text-sm text-rose-300">
            {error ?? "Admin state is unavailable."}
          </div>
        </div>
      </main>
    );
  }

  const { state, catalog } = adminState;

  return (
    <main className="h-screen overflow-y-auto px-4 pb-6 pt-[84px]">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-shell flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="mono-ui text-base tracking-[0.24em] text-[var(--color-accent)]">
              ADMIN CONTROL PLANE
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Switch between demo simulation and live public MISP feed, expand HQ coverage, and
              shape the stream without touching code.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/6"
              onClick={() => onNavigate(ROUTES.dashboard)}
            >
              Back To Dashboard
            </button>
            <button
              type="button"
              className="rounded-md border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/14"
              onClick={() => void onTriggerGodMode()}
            >
              Trigger God Mode
            </button>
          </div>
        </motion.section>

        {error ? (
          <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Mode Control"
              description="Demo mode stays presentation-safe. Disable it to stream real indicators from the public MISP feed."
            >
              <div className="flex flex-wrap gap-3">
                <ToggleChip
                  label="Demo Mode"
                  active={state.demo_mode}
                  onClick={() => void onUpdateState({ demo_mode: true })}
                />
                <ToggleChip
                  label="Live Feed Mode"
                  active={!state.demo_mode}
                  onClick={() => void onUpdateState({ demo_mode: false })}
                  accent="#38bdf8"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-white/8 bg-black/16 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Active Pipeline
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-100">
                    {DATA_SOURCE_LABELS[state.effective_source as keyof typeof DATA_SOURCE_LABELS] ??
                      state.effective_source}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {state.demo_mode ? ADMIN_PILLAR_COPY.demo : ADMIN_PILLAR_COPY.live}
                  </p>
                </div>
                <div className="rounded-md border border-white/8 bg-black/16 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Feed Status
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-100">
                    {LIVE_FEED_STATUS_LABELS[
                      state.live_feed_status.status as keyof typeof LIVE_FEED_STATUS_LABELS
                    ] ?? state.live_feed_status.status}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {state.live_feed_status.loaded_count} indicators loaded
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {catalog.data_sources.map((source) => (
                  <ToggleChip
                    key={source}
                    label={
                      DATA_SOURCE_LABELS[source as keyof typeof DATA_SOURCE_LABELS] ?? source
                    }
                    active={state.data_source === source}
                    onClick={() => void onUpdateState({ data_source: source })}
                    accent="#38bdf8"
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/16"
                  onClick={() => void onRefreshLiveFeed()}
                >
                  Refresh Live Feed
                </button>
                <ToggleChip
                  label={state.auto_refresh_live_feed ? "Auto Refresh On" : "Auto Refresh Off"}
                  active={state.auto_refresh_live_feed}
                  onClick={() =>
                    void onUpdateState({
                      auto_refresh_live_feed: !state.auto_refresh_live_feed,
                    })
                  }
                  accent="#14b8a6"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-white/8 bg-black/16 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Last Refresh
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    {formatDateTime(state.live_feed_status.last_refresh)}
                  </div>
                </div>
                <div className="rounded-md border border-white/8 bg-black/16 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    OTX Env Key
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    {state.otx_api_key_configured ? "Configured" : "Not Set"}
                  </div>
                </div>
                <div className="rounded-md border border-white/8 bg-black/16 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Save State
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    {isSaving ? "Applying..." : "Synchronized"}
                  </div>
                </div>
              </div>

              {state.live_feed_status.last_error ? (
                <div className="rounded-md border border-rose-500/20 bg-rose-500/8 px-3 py-3 text-sm text-rose-200">
                  {state.live_feed_status.last_error}
                </div>
              ) : null}
            </Panel>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="HQ Mesh"
              description="Threats will route to one of the selected headquarters. This gives the globe multiple destinations instead of a single NYC sink."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.hqs.map((hq) => (
                  <HqCard
                    key={hq.id}
                    hq={hq}
                    active={state.active_hq_ids.includes(hq.id)}
                    onClick={() =>
                      void onUpdateState({
                        active_hq_ids: toggleSelection(state.active_hq_ids, hq.id),
                      })
                    }
                  />
                ))}
              </div>
            </Panel>
          </motion.section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Simulation Profiles"
              description="These only affect demo mode, so you can pivot the story quickly during a presentation."
            >
              <div className="flex flex-wrap gap-3">
                {catalog.simulation_profiles.map((profile) => (
                  <ToggleChip
                    key={profile}
                    label={
                      SIMULATION_PROFILE_LABELS[
                        profile as keyof typeof SIMULATION_PROFILE_LABELS
                      ] ?? profile
                    }
                    active={state.simulation_profile === profile}
                    onClick={() => void onUpdateState({ simulation_profile: profile })}
                    accent="#a855f7"
                  />
                ))}
              </div>
            </Panel>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Threat Filters"
              description="Filter the stream at the backend so the terminal, globe, and charts all stay aligned."
            >
              <div className="flex flex-wrap gap-3">
                {catalog.threat_types.map((threatType) => (
                  <ToggleChip
                    key={threatType}
                    label={threatType}
                    active={state.enabled_threat_types.includes(threatType)}
                    onClick={() =>
                      void onUpdateState({
                        enabled_threat_types: toggleSelection(
                          state.enabled_threat_types,
                          threatType,
                        ),
                      })
                    }
                    accent="#38bdf8"
                  />
                ))}
              </div>
            </Panel>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Severity Gates"
              description="Cut low-noise traffic or force a high-pressure threat picture depending on the story you want to tell."
            >
              <div className="flex flex-wrap gap-3">
                {catalog.severities.map((severity) => (
                  <ToggleChip
                    key={severity}
                    label={severity}
                    active={state.enabled_severities.includes(severity)}
                    onClick={() =>
                      void onUpdateState({
                        enabled_severities: toggleSelection(state.enabled_severities, severity),
                      })
                    }
                    accent={
                      SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? "#00ff88"
                    }
                  />
                ))}
              </div>
            </Panel>
          </motion.section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Stream Rate"
              description="Control how quickly the backend emits new threats over the WebSocket."
            >
              <label className="flex flex-col gap-3">
                <span className="text-sm text-slate-300">
                  Current interval:{" "}
                  <span className="mono-ui text-[var(--color-accent)]">
                    {state.ws_broadcast_interval_seconds.toFixed(1)}s
                  </span>
                </span>
                <input
                  type="range"
                  min={STREAM_INTERVAL_MIN_SECONDS}
                  max={STREAM_INTERVAL_MAX_SECONDS}
                  step={STREAM_INTERVAL_STEP_SECONDS}
                  value={state.ws_broadcast_interval_seconds}
                  onChange={(event) =>
                    void onUpdateState({
                      ws_broadcast_interval_seconds: Number(event.target.value),
                    })
                  }
                />
              </label>
            </Panel>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Runbook"
              description="How the admin route maps to your demo story and to real-data mode."
            >
              <div className="space-y-3 text-sm leading-7 text-slate-300">
                <p>
                  `Demo Mode` keeps everything local and safe for a presentation. Use the profile
                  chips to bias toward DDoS, ransomware, phishing, or botnet-heavy traffic.
                </p>
                <p>
                  Turning demo mode off switches the backend to the real public MISP feed. The
                  stream then uses live indicators from the public feed instead of fabricated ones.
                </p>
                <p>
                  Configuration stays centralized: backend secrets and live-feed URLs belong in
                  `misp-dashboard/.env`, while UI-level values stay in `frontend/src/utils/constants.ts`.
                </p>
              </div>
            </Panel>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
