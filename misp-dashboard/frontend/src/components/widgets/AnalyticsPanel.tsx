import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ThreatPayload } from "../../types/threat";
import {
  ANALYTICS_LIST_LIMIT,
  SEVERITY_COLORS,
  THREAT_TYPE_COLORS,
  VELOCITY_HISTORY_POINTS,
  VELOCITY_SAMPLE_INTERVAL_MS,
} from "../../utils/constants";

type AnalyticsPanelProps = {
  threats: ThreatPayload[];
  onOpenThreatHistory: (threatType: string) => void;
};

type VelocityPoint = {
  label: string;
  value: number;
};

type CountEntry = {
  label: string;
  count: number;
  color: string;
};

function buildVelocitySeries(values: number[]): VelocityPoint[] {
  return values.map((value, index) => {
    const secondsAgo = values.length - index - 1;
    return {
      label: secondsAgo === 0 ? "now" : `${secondsAgo}s ago`,
      value,
    };
  });
}

function countEntries(
  values: string[],
  palette: Record<string, string> | null = null,
  limit = ANALYTICS_LIST_LIMIT,
): CountEntry[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count], index) => ({
      label,
      count,
      color:
        palette?.[label] ??
        ["#00ff88", "#38bdf8", "#f97316", "#a855f7", "#eab308", "#14b8a6"][index % 6],
    }));
}

function StatList({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: CountEntry[];
}) {
  const highest = Math.max(...entries.map((entry) => entry.count), 1);

  return (
    <div className="rounded-md border border-white/8 bg-black/18 p-4">
      <div className="mb-3">
        <div className="mono-ui text-xs tracking-[0.2em] text-[var(--color-accent)]">{title}</div>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-slate-500">No attack samples in buffer yet.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-300">{entry.label}</span>
                <span className="mono-ui text-slate-100">{entry.count}</span>
              </div>
              <div className="h-2 rounded-full bg-white/6">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((entry.count / highest) * 100, 8)}%`,
                    backgroundColor: entry.color,
                    boxShadow: `0 0 16px ${entry.color}33`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
  });
}

export default function AnalyticsPanel({
  threats,
  onOpenThreatHistory,
}: AnalyticsPanelProps) {
  const processedThreatIdsRef = useRef<Set<string>>(new Set());
  const [velocityData, setVelocityData] = useState<VelocityPoint[]>(
    buildVelocitySeries(Array.from({ length: VELOCITY_HISTORY_POINTS }, () => 0)),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const visibleThreatIds = new Set(threats.map((threat) => threat.id));
      let newThreatCount = 0;

      threats.forEach((threat) => {
        if (!processedThreatIdsRef.current.has(threat.id)) {
          processedThreatIdsRef.current.add(threat.id);
          newThreatCount += 1;
        }
      });

      Array.from(processedThreatIdsRef.current).forEach((id) => {
        if (!visibleThreatIds.has(id)) {
          processedThreatIdsRef.current.delete(id);
        }
      });

      setVelocityData((previous) => {
        const nextValues = [...previous.map((point) => point.value), newThreatCount].slice(
          -VELOCITY_HISTORY_POINTS,
        );
        return buildVelocitySeries(nextValues);
      });
    }, VELOCITY_SAMPLE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [threats]);

  const threatTypeCounts = Object.keys(THREAT_TYPE_COLORS).map((type) => ({
    type,
    count: threats.filter((threat) => threat.type === type).length,
    color: THREAT_TYPE_COLORS[type as keyof typeof THREAT_TYPE_COLORS],
    lastSeen: threats
      .slice()
      .reverse()
      .find((threat) => threat.type === type)?.timestamp,
  }));

  const severityCounts = Object.keys(SEVERITY_COLORS).map((severity) => ({
    label: severity,
    count: threats.filter((threat) => threat.severity === severity).length,
    color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
  }));

  const hqPressure = countEntries(threats.map((threat) => threat.target_hq_name));
  const malwareLeaders = countEntries(threats.map((threat) => threat.malware_family));
  const sourceCountries = countEntries(threats.map((threat) => threat.src_geo.country));
  const recentAttackLanes = threats.slice().reverse().slice(0, ANALYTICS_LIST_LIMIT);

  return (
    <section className="panel-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/8 px-4 py-3">
        <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
          INTELLIGENCE PANEL
        </h2>
        <p className="text-xs text-slate-400">
          Threat mix, tempo, HQ pressure, and recent attack lanes
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-3 py-3">
        <div className="rounded-md border border-white/8 bg-black/18 p-4">
          <div className="mb-3">
            <div className="mono-ui text-xs tracking-[0.2em] text-[var(--color-accent)]">
              THREAT MIX
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Drill into any category to inspect the previous attacks in that lane.
            </p>
          </div>

          <div className="h-[190px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={threatTypeCounts}
                  dataKey="count"
                  nameKey="type"
                  innerRadius="55%"
                  outerRadius="84%"
                  paddingAngle={3}
                  isAnimationActive
                >
                  {threatTypeCounts.map((entry) => (
                    <Cell
                      key={entry.type}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(9, 15, 26, 0.96)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "#e5f4ee",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {threatTypeCounts.map((entry) => (
              <button
                key={entry.type}
                type="button"
                className="rounded-md border border-white/8 bg-black/20 px-3 py-2 text-left transition hover:border-white/16 hover:bg-white/5"
                onClick={() => onOpenThreatHistory(entry.type)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs text-slate-200">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.type}
                  </span>
                  <span className="mono-ui text-xs text-slate-100">{entry.count}</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  {entry.lastSeen ? `Last seen ${formatTime(entry.lastSeen)}` : "No hits in buffer"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-white/8 bg-black/18 p-4">
          <div className="mb-3">
            <div className="mono-ui text-xs tracking-[0.2em] text-[var(--color-accent)]">
              ATTACK VELOCITY
            </div>
            <p className="mt-1 text-xs text-slate-500">Observed arrivals per second</p>
          </div>

          <div className="h-[180px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient
                    id="velocityFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#ef4444"
                      stopOpacity={0.65}
                    />
                    <stop
                      offset="100%"
                      stopColor="#22c55e"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  hide
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(9, 15, 26, 0.96)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "#e5f4ee",
                  }}
                />
                <Area
                  dataKey="value"
                  type="monotone"
                  stroke="#00ff88"
                  strokeWidth={2}
                  fill="url(#velocityFill)"
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <StatList
          title="SEVERITY LOAD"
          description="How much of the active buffer sits in each severity tier."
          entries={severityCounts}
        />
        <StatList
          title="HQ PRESSURE"
          description="Which command centers are receiving the most inbound activity."
          entries={hqPressure}
        />
        <StatList
          title="MALWARE FAMILIES"
          description="Families appearing most often in the current event window."
          entries={malwareLeaders}
        />
        <StatList
          title="SOURCE COUNTRIES"
          description="Country mix inferred from the current attack sources."
          entries={sourceCountries}
        />

        <div className="rounded-md border border-white/8 bg-black/18 p-4">
          <div className="mb-3">
            <div className="mono-ui text-xs tracking-[0.2em] text-[var(--color-accent)]">
              RECENT LANES
            </div>
            <p className="mt-1 text-xs text-slate-500">
              The latest source-to-HQ routes flowing through the dashboard
            </p>
          </div>

          {recentAttackLanes.length === 0 ? (
            <div className="text-sm text-slate-500">Waiting for attacks to populate the lane log.</div>
          ) : (
            <div className="space-y-2">
              {recentAttackLanes.map((threat) => (
                <div
                  key={threat.id}
                  className="rounded-md border border-white/8 bg-white/3 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-200">
                      {threat.src_geo.country} {"->"} {threat.target_hq_name}
                    </span>
                    <span className="mono-ui text-[11px] text-slate-500">
                      {formatTime(threat.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {threat.type} • {threat.severity} • {threat.src_ip}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
