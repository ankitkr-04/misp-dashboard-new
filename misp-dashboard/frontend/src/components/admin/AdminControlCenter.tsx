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
  LIVE_REFRESH_MINUTES_MAX,
  LIVE_REFRESH_MINUTES_MIN,
  LIVE_REFRESH_MINUTES_STEP,
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

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-white/8 bg-black/16 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
      {hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  accent,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="rounded-md border px-3 py-2 text-sm transition disabled:cursor-not-allowed"
      style={{
        borderColor: active ? `${accent ?? "#00ff88"}66` : "rgba(255,255,255,0.08)",
        background: active ? `${accent ?? "#00ff88"}16` : "rgba(255,255,255,0.03)",
        color: disabled ? "#64748b" : active ? "#f8fafc" : "#94a3b8",
        boxShadow: active ? `0 0 12px ${accent ?? "#00ff88"}22` : "none",
        opacity: disabled ? 0.55 : 1,
      }}
      disabled={disabled}
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
  const isDemoMode = state.demo_mode;
  const liveSourceLabel =
    DATA_SOURCE_LABELS[state.data_source as keyof typeof DATA_SOURCE_LABELS] ?? state.data_source;
  const effectiveSourceLabel =
    DATA_SOURCE_LABELS[state.effective_source as keyof typeof DATA_SOURCE_LABELS] ??
    state.effective_source;

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
              Demo mode shapes the narrative. Live mode only controls real-feed pacing, refresh
              cadence, and where attacks land across the HQ mesh.
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
            {isDemoMode ? (
              <button
                type="button"
                className="rounded-md border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/14"
                onClick={() => void onTriggerGodMode()}
              >
                Trigger Demo Burst
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/16"
                onClick={() => void onRefreshLiveFeed()}
              >
                Refresh Live Feed
              </button>
            )}
          </div>
        </motion.section>

        {error ? (
          <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="Mode Control"
              description="The dashboard now treats demo and live as different operating modes instead of one mixed control surface."
            >
              <div className="flex flex-wrap gap-3">
                <ToggleChip
                  label="Demo Mode"
                  active={isDemoMode}
                  onClick={() => void onUpdateState({ demo_mode: true })}
                />
                <ToggleChip
                  label="Live Feed Mode"
                  active={!isDemoMode}
                  onClick={() => void onUpdateState({ demo_mode: false })}
                  accent="#38bdf8"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <StatTile
                  label="Effective Pipeline"
                  value={effectiveSourceLabel}
                  hint={isDemoMode ? ADMIN_PILLAR_COPY.demo : ADMIN_PILLAR_COPY.live}
                />
                <StatTile
                  label="HQ Coverage"
                  value={`${state.active_hq_ids.length} active`}
                  hint="HQ routing remains available in both modes."
                />
                <StatTile
                  label="Save State"
                  value={isSaving ? "Applying..." : "Synchronized"}
                  hint="Control changes are committed to the backend runtime immediately."
                />
              </div>

              <div className="rounded-md border border-white/8 bg-black/16 px-4 py-4 text-sm text-slate-300">
                {isDemoMode
                  ? "Demo-only controls are unlocked below: simulation profile, threat mix, severity gates, and burst mode. Live-feed controls stay visible in standby, but they do not shape the current stream."
                  : "Live-feed controls are unlocked below: source selection, refresh cadence, manual refresh, and ingestion speed. Demo shaping controls are preserved but locked until you switch back to demo mode."}
              </div>

              <div className="rounded-md border border-white/8 bg-black/16 px-4 py-4">
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    AI Quota Guard
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Controls Gemini-backed investigation output. When disabled, the modal falls
                    back to local analysis and the AI insight card pauses.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ToggleChip
                    label="AI Assist On"
                    active={state.ai_features_enabled}
                    onClick={() => void onUpdateState({ ai_features_enabled: true })}
                    accent="#22c55e"
                  />
                  <ToggleChip
                    label="AI Assist Off"
                    active={!state.ai_features_enabled}
                    onClick={() => void onUpdateState({ ai_features_enabled: false })}
                    accent="#f97316"
                  />
                </div>
              </div>
            </Panel>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <Panel
              title="HQ Mesh"
              description="Threats route into the selected command centers. This affects both demo and live traffic."
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

        {isDemoMode ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Demo Scenario"
                  description="These controls only affect synthetic traffic, so you can tell a sharper story during a presentation."
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <StatTile
                      label="Burst Control"
                      value="God Mode Ready"
                      hint="Generates a short high-pressure synthetic burst without changing live-feed state."
                    />
                    <StatTile
                      label="Live Feed Standby"
                      value={liveSourceLabel}
                      hint="Your live source selection is stored, but it is idle while demo mode is active."
                    />
                  </div>
                </Panel>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Threat Shaping"
                  description="Use these controls to bias the terminal, globe, and analytics toward the attack story you want to show."
                >
                  <div>
                    <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                      Threat Mix
                    </div>
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
                  </div>

                  <div>
                    <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                      Severity Gates
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {catalog.severities.map((severity) => (
                        <ToggleChip
                          key={severity}
                          label={severity}
                          active={state.enabled_severities.includes(severity)}
                          onClick={() =>
                            void onUpdateState({
                              enabled_severities: toggleSelection(
                                state.enabled_severities,
                                severity,
                              ),
                            })
                          }
                          accent={
                            SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? "#00ff88"
                          }
                        />
                      ))}
                    </div>
                  </div>
                </Panel>
              </motion.section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Stream Controls"
                  description="This pacing control applies to both modes, but it is especially helpful while shaping the demo narrative."
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
                  title="Live Feed Standby"
                  description="These values are still visible while you are in demo mode, but they will only take effect after you switch to live."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatTile
                      label="Selected Live Source"
                      value={liveSourceLabel}
                      hint="Switch to live mode to make this the active pipeline."
                    />
                    <StatTile
                      label="Last Feed Refresh"
                      value={formatDateTime(state.live_feed_status.last_refresh)}
                      hint={`${state.live_feed_status.loaded_count} indicators cached`}
                    />
                    <StatTile
                      label="Refresh Cadence"
                      value={`${state.live_feed_refresh_minutes.toFixed(0)} min`}
                      hint="Stored live setting"
                    />
                    <StatTile
                      label="OTX Key"
                      value={state.otx_api_key_configured ? "Configured" : "Not Set"}
                      hint="Required only when AlienVault OTX is the selected live source."
                    />
                  </div>
                </Panel>
              </motion.section>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Live Feed Controls"
                  description="Live mode is intentionally narrower: choose the source, control refresh cadence, and decide how quickly the feed is emitted."
                >
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

                  <label className="flex flex-col gap-3">
                    <span className="text-sm text-slate-300">
                      Feed refresh cadence:{" "}
                      <span className="mono-ui text-cyan-200">
                        {state.live_feed_refresh_minutes.toFixed(0)} min
                      </span>
                    </span>
                    <input
                      type="range"
                      min={LIVE_REFRESH_MINUTES_MIN}
                      max={LIVE_REFRESH_MINUTES_MAX}
                      step={LIVE_REFRESH_MINUTES_STEP}
                      value={state.live_feed_refresh_minutes}
                      onChange={(event) =>
                        void onUpdateState({
                          live_feed_refresh_minutes: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <StatTile
                      label="Feed Status"
                      value={
                        LIVE_FEED_STATUS_LABELS[
                          state.live_feed_status.status as keyof typeof LIVE_FEED_STATUS_LABELS
                        ] ?? state.live_feed_status.status
                      }
                      hint={`${state.live_feed_status.loaded_count} indicators loaded`}
                    />
                    <StatTile
                      label="Last Refresh"
                      value={formatDateTime(state.live_feed_status.last_refresh)}
                      hint="Manual refresh will rebuild the cached live indicator set immediately."
                    />
                    <StatTile
                      label="OTX Env Key"
                      value={state.otx_api_key_configured ? "Configured" : "Not Set"}
                      hint="Only needed when AlienVault OTX is the active source."
                    />
                    <StatTile
                      label="Selected Source"
                      value={liveSourceLabel}
                      hint="This is the only source feeding the live WebSocket stream."
                    />
                  </div>

                  {state.live_feed_status.last_error ? (
                    <div className="rounded-md border border-rose-500/20 bg-rose-500/8 px-3 py-3 text-sm text-rose-200">
                      {state.live_feed_status.last_error}
                    </div>
                  ) : null}
                </Panel>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Live Ingestion"
                  description="In live mode you can only change the release rate of real indicators, not the character of the threat set itself."
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

                  <div className="rounded-md border border-cyan-400/12 bg-cyan-400/5 px-4 py-4 text-sm text-cyan-100">
                    Live mode no longer applies simulation profile, threat mix shaping, or
                    severity gating. The feed is emitted as collected and only paced at the
                    WebSocket boundary.
                  </div>
                </Panel>
              </motion.section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Demo Controls Locked"
                  description="These settings are preserved for the next time you return to demo mode, but they do not affect the live feed."
                >
                  <div className="rounded-md border border-white/8 bg-black/16 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Stored Demo Profile
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-100">
                      {SIMULATION_PROFILE_LABELS[
                        state.simulation_profile as keyof typeof SIMULATION_PROFILE_LABELS
                      ] ?? state.simulation_profile}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {catalog.threat_types.map((threatType) => (
                      <ToggleChip
                        key={threatType}
                        label={threatType}
                        active={state.enabled_threat_types.includes(threatType)}
                        onClick={() => undefined}
                        accent="#38bdf8"
                        disabled
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {catalog.severities.map((severity) => (
                      <ToggleChip
                        key={severity}
                        label={severity}
                        active={state.enabled_severities.includes(severity)}
                        onClick={() => undefined}
                        accent={
                          SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? "#00ff88"
                        }
                        disabled
                      />
                    ))}
                  </div>
                </Panel>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
                <Panel
                  title="Runbook"
                  description="How to use the control plane now that demo and live mode are split."
                >
                  <div className="space-y-3 text-sm leading-7 text-slate-300">
                    <p>
                      Use demo mode when you want to force a DDoS narrative, a ransomware sweep, or
                      a tighter severity band during a presentation.
                    </p>
                    <p>
                      Use live mode when you want the dashboard to behave like an intake surface for
                      real threat intelligence. In that mode, the feed source, refresh cadence, and
                      release speed are the only stream-shaping controls.
                    </p>
                    <p>
                      Configuration stays centralized: backend runtime values live in
                      `misp-dashboard/.env` and `backend/app/core/config.py`, while frontend display
                      constants stay in `frontend/src/utils/constants.ts`.
                    </p>
                  </div>
                </Panel>
              </motion.section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
