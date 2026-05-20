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

function SectionCard({
  title,
  description,
  children,
  badge,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {badge}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  valueColor = "text-slate-900",
}: {
  label: string;
  value: string;
  hint?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1.5 text-lg font-semibold ${valueColor}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
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
      className="cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: active ? `${accent ?? "#2563eb"}40` : "#e2e8f0",
        background: active ? `${accent ?? "#2563eb"}10` : "#f8fafc",
        color: disabled ? "#94a3b8" : active ? "#1e40af" : "#475569",
      }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ModeToggle({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 text-left transition ${active
        ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full border-2 ${active ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
            }`}
        />
        <span className={`text-sm font-semibold ${active ? "text-blue-800" : "text-slate-700"}`}>
          {label}
        </span>
      </div>
      <p className={`mt-1.5 text-xs leading-5 ${active ? "text-blue-600" : "text-slate-500"}`}>
        {description}
      </p>
    </button>
  );
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
      className={`cursor-pointer rounded-lg border p-4 text-left transition ${active
        ? "border-slate-300 bg-slate-50 shadow-sm"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hq.accent }} />
            <span className="text-sm font-semibold text-slate-900">{hq.name}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {hq.city}, {hq.country}
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${active
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-500"
            }`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="mono-ui mt-2.5 text-xs text-slate-400">{hq.ip}</div>
    </button>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { hour12: false });
}

function toggleSelection(items: string[], value: string) {
  if (items.includes(value)) return items.filter((item) => item !== value);
  return [...items, value];
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
      {children}
    </div>
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
      <main className="h-screen overflow-y-auto px-4 pb-6 pt-[138px] lg:pt-[88px]">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-center">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
            Loading admin control plane…
          </div>
        </div>
      </main>
    );
  }

  if (!adminState) {
    return (
      <main className="h-screen overflow-y-auto px-4 pb-6 pt-[138px] lg:pt-[88px]">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-center">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700 shadow-sm">
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
  const feedStatus = state.live_feed_status;

  return (
    <main className="h-screen overflow-y-auto bg-slate-50 px-4 pb-8 pt-[138px] lg:pt-[88px]">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Admin Control Panel</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Runtime configuration for data pipeline, simulation, and HQ routing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              onClick={() => onNavigate(ROUTES.dashboard)}
            >
              ← Back to Dashboard
            </button>
            {isDemoMode ? (
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:bg-amber-100"
                onClick={() => void onTriggerGodMode()}
              >
                Trigger Demo Burst
              </button>
            ) : (
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
                onClick={() => void onRefreshLiveFeed()}
              >
                Refresh Live Feed
              </button>
            )}
          </div>
        </motion.div>

        {/* Error banner */}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* System Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              label: "Operating Mode",
              value: isDemoMode ? "Demo Simulation" : "Live Feed",
              badge: isDemoMode
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            },
            {
              label: "Active Pipeline",
              value: effectiveSourceLabel,
              badge: "border-blue-200 bg-blue-50 text-blue-700",
            },
            {
              label: "Save State",
              value: isSaving ? "Applying…" : "Synchronized",
              badge: isSaving
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            },
            {
              label: "HQ Coverage",
              value: `${state.active_hq_ids.length} / ${catalog.hqs.length} active`,
              badge: "border-slate-200 bg-slate-100 text-slate-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="text-xs font-medium text-slate-500">{item.label}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${item.badge}`}
                >
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-5 xl:grid-cols-2">

          {/* Operating Mode */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
            <SectionCard
              title="Operating Mode"
              description="Controls which data pipeline is active. Demo uses the in-memory generator; Live pulls real indicators."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ModeToggle
                  label="Demo Simulation"
                  description={ADMIN_PILLAR_COPY.demo}
                  active={isDemoMode}
                  onClick={() => void onUpdateState({ demo_mode: true })}
                />
                <ModeToggle
                  label="Live Feed Mode"
                  description={ADMIN_PILLAR_COPY.live}
                  active={!isDemoMode}
                  onClick={() => void onUpdateState({ demo_mode: false })}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">AI Assist</div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Enables Gemini-backed analysis in investigation views. Disable to conserve API quota.
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${state.ai_features_enabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                  >
                    {state.ai_features_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <ToggleChip
                    label="Enable"
                    active={state.ai_features_enabled}
                    onClick={() => void onUpdateState({ ai_features_enabled: true })}
                    accent="#16a34a"
                  />
                  <ToggleChip
                    label="Disable"
                    active={!state.ai_features_enabled}
                    onClick={() => void onUpdateState({ ai_features_enabled: false })}
                    accent="#dc2626"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">
                    Stream interval:{" "}
                    <span className="font-semibold text-blue-600">
                      {state.ws_broadcast_interval_seconds.toFixed(1)}s
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Applies to both modes</span>
                </div>
                <input
                  type="range"
                  min={STREAM_INTERVAL_MIN_SECONDS}
                  max={STREAM_INTERVAL_MAX_SECONDS}
                  step={STREAM_INTERVAL_STEP_SECONDS}
                  value={state.ws_broadcast_interval_seconds}
                  className="w-full accent-blue-600"
                  onChange={(e) =>
                    void onUpdateState({ ws_broadcast_interval_seconds: Number(e.target.value) })
                  }
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>Faster (0.2s)</span>
                  <span>Slower (10s)</span>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* HQ Mesh */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
            <SectionCard
              title="HQ Mesh"
              description="Threat events are routed to selected command centers. Active in both demo and live mode."
              badge={
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {state.active_hq_ids.length} active
                </span>
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-2 [&>*]:min-w-0">
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
            </SectionCard>
          </motion.div>
        </div>

        {/* Demo-specific controls */}
        {isDemoMode ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
              <SectionCard
                title="Simulation Profile"
                description="Sets the threat-type distribution for synthetic event generation."
              >
                <div className="flex flex-wrap gap-2">
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
                      accent="#7c3aed"
                    />
                  ))}
                </div>
                <InfoNote>
                  The selected profile biases the random event generator without affecting the live
                  feed source. You can trigger a high-density burst from the top-right button.
                </InfoNote>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <StatTile
                    label="Selected Profile"
                    value={
                      SIMULATION_PROFILE_LABELS[
                      state.simulation_profile as keyof typeof SIMULATION_PROFILE_LABELS
                      ] ?? state.simulation_profile
                    }
                  />
                  <StatTile
                    label="Live Source (standby)"
                    value={liveSourceLabel}
                    hint="Will activate when you switch to live mode"
                  />
                </div>
              </SectionCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
              <SectionCard
                title="Threat Shaping"
                description="Filter the event stream to a specific threat type or severity range for demonstrations."
              >
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Threat Types
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                        accent="#2563eb"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Severity Gates
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                          SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? "#2563eb"
                        }
                      />
                    ))}
                  </div>
                </div>
              </SectionCard>
            </motion.div>
          </div>
        ) : null}

        {/* Live feed controls */}
        {!isDemoMode ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
              <SectionCard
                title="Live Feed"
                description="Select the real-time intelligence source and control how frequently indicators are fetched and released."
              >
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Data Source
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {catalog.data_sources.map((source) => (
                      <ToggleChip
                        key={source}
                        label={
                          DATA_SOURCE_LABELS[source as keyof typeof DATA_SOURCE_LABELS] ?? source
                        }
                        active={state.data_source === source}
                        onClick={() => void onUpdateState({ data_source: source })}
                        accent="#2563eb"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                    onClick={() => void onRefreshLiveFeed()}
                  >
                    Refresh Now
                  </button>
                  <ToggleChip
                    label={state.auto_refresh_live_feed ? "Auto-refresh On" : "Auto-refresh Off"}
                    active={state.auto_refresh_live_feed}
                    onClick={() =>
                      void onUpdateState({ auto_refresh_live_feed: !state.auto_refresh_live_feed })
                    }
                    accent="#0891b2"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-700">
                      Refresh cadence:{" "}
                      <span className="font-semibold text-blue-600">
                        {state.live_feed_refresh_minutes.toFixed(0)} min
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={LIVE_REFRESH_MINUTES_MIN}
                    max={LIVE_REFRESH_MINUTES_MAX}
                    step={LIVE_REFRESH_MINUTES_STEP}
                    value={state.live_feed_refresh_minutes}
                    className="w-full accent-blue-600"
                    onChange={(e) =>
                      void onUpdateState({ live_feed_refresh_minutes: Number(e.target.value) })
                    }
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>1 min</span>
                    <span>120 min</span>
                  </div>
                </div>

                {state.live_feed_status.last_error ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                    {state.live_feed_status.last_error}
                  </div>
                ) : null}
              </SectionCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
              <SectionCard title="Feed Status" description="Current state of the live indicator cache.">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <StatTile
                    label="Feed Status"
                    value={
                      LIVE_FEED_STATUS_LABELS[
                      feedStatus.status as keyof typeof LIVE_FEED_STATUS_LABELS
                      ] ?? feedStatus.status
                    }
                    hint={`${feedStatus.loaded_count} indicators loaded`}
                    valueColor={
                      feedStatus.status === "ready"
                        ? "text-emerald-700"
                        : feedStatus.status === "error"
                          ? "text-rose-700"
                          : "text-slate-700"
                    }
                  />
                  <StatTile
                    label="Last Refresh"
                    value={formatDateTime(feedStatus.last_refresh)}
                    hint="Manual refresh rebuilds the cache immediately"
                  />
                  <StatTile
                    label="OTX API Key"
                    value={state.otx_api_key_configured ? "Configured" : "Not Set"}
                    hint="Required for AlienVault OTX source"
                    valueColor={
                      state.otx_api_key_configured ? "text-emerald-700" : "text-amber-700"
                    }
                  />
                  <StatTile
                    label="Selected Source"
                    value={liveSourceLabel}
                    hint="Only source feeding the live WebSocket stream"
                  />
                </div>
                <InfoNote>
                  In live mode, only source selection, refresh cadence, and release speed are
                  configurable. Threat shaping and simulation profiles are locked.
                </InfoNote>
              </SectionCard>
            </motion.div>
          </div>
        ) : null}

      </div>
    </main>
  );
}