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
  INSIGHT_LOOKBACK_SECONDS,
  INSIGHT_ROTATION_INTERVAL_MS,
  SEVERITY_COLORS,
  SPARKLINE_POINTS,
  SPARKLINE_WINDOW_SECONDS,
  THREAT_TYPE_COLORS,
  VELOCITY_HISTORY_POINTS,
  VELOCITY_SAMPLE_INTERVAL_MS,
} from "../../utils/constants";

type AnalyticsPanelProps = {
  threats: ThreatPayload[];
  aiEnabled: boolean;
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

function buildSparklineSeries(
  threats: ThreatPayload[],
  field: "target_hq_name" | "malware_family",
  label: string,
) {
  const now = Date.now();
  const series = Array.from({ length: SPARKLINE_POINTS }, () => 0);

  threats.forEach((threat) => {
    if (threat[field] !== label) {
      return;
    }

    const threatTime = new Date(threat.timestamp).getTime();
    if (Number.isNaN(threatTime)) {
      return;
    }

    const secondsAgo = Math.floor((now - threatTime) / 1000);
    if (secondsAgo < 0 || secondsAgo >= SPARKLINE_WINDOW_SECONDS) {
      return;
    }

    const bucketIndex = SPARKLINE_POINTS - secondsAgo - 1;
    if (bucketIndex >= 0 && bucketIndex < series.length) {
      series[bucketIndex] += 1;
    }
  });

  return series;
}

function buildSparklinePath(series: number[]) {
  const width = 64;
  const height = 20;
  const maxValue = Math.max(...series, 1);

  return series
    .map((value, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - (value / maxValue) * (height - 2) - 1;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildInsights(threats: ThreatPayload[], velocityData: VelocityPoint[]) {
  if (threats.length === 0) {
    return [
      "AI Alert: Waiting for enough attacks to form a stable pattern in the current buffer.",
    ];
  }

  const now = Date.now();
  const recentThreats = threats.filter((threat) => {
    const threatTime = new Date(threat.timestamp).getTime();
    return !Number.isNaN(threatTime) && now - threatTime <= INSIGHT_LOOKBACK_SECONDS * 1000;
  });
  const workingSet = recentThreats.length > 0 ? recentThreats : threats.slice(-24);

  const topType = countEntries(workingSet.map((threat) => threat.type), THREAT_TYPE_COLORS, 1)[0];
  const topHq = countEntries(workingSet.map((threat) => threat.target_hq_name), null, 1)[0];
  const topFamily = countEntries(workingSet.map((threat) => threat.malware_family), null, 1)[0];
  const topCountry = countEntries(workingSet.map((threat) => threat.src_geo.country), null, 1)[0];
  const criticalCount = workingSet.filter(
    (threat) => threat.severity === "Critical" || threat.severity === "High",
  ).length;
  const highShare = Math.round((criticalCount / Math.max(workingSet.length, 1)) * 100);
  const latestVelocity = velocityData[velocityData.length - 1]?.value ?? 0;
  const priorVelocity = average(velocityData.slice(-8, -1).map((point) => point.value));
  const velocityDelta =
    priorVelocity > 0 ? Math.round(((latestVelocity - priorVelocity) / priorVelocity) * 100) : 0;
  const dominantTypeShare = topType
    ? Math.round((topType.count / Math.max(workingSet.length, 1)) * 100)
    : 0;

  return [
    `AI Alert: ${dominantTypeShare}% of recent traffic is ${topType?.label ?? "hostile activity"} targeting ${topHq?.label ?? "the active HQ mesh"}. ${topFamily?.label ?? "Commodity tooling"} is the leading payload family in the current window.`,
    `AI Alert: ${highShare}% of the last ${workingSet.length} attacks are High or Critical severity, with ${topCountry?.label ?? "multiple source regions"} contributing the largest source share.`,
    latestVelocity > priorVelocity && priorVelocity > 0
      ? `AI Alert: Attack velocity is up ${velocityDelta}% versus the recent baseline. ${topHq?.label ?? "The busiest HQ"} is absorbing the sharpest pressure right now.`
      : `AI Alert: Attack tempo is stable, but ${topFamily?.label ?? "the leading malware family"} remains persistent across the active routes and deserves targeted hunting.`,
  ];
}

function StatList({
  title,
  description,
  entries,
  sparklines = {},
}: {
  title: string;
  description: string;
  entries: CountEntry[];
  sparklines?: Record<string, number[]>;
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
          {entries.map((entry) => {
            const sparkline = sparklines[entry.label] ?? [];
            const sparklinePath = sparkline.length > 0 ? buildSparklinePath(sparkline) : "";

            return (
              <div key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-slate-300">{entry.label}</span>
                  <div className="flex items-center gap-3">
                    {sparkline.length > 0 ? (
                      <svg
                        width="64"
                        height="20"
                        viewBox="0 0 64 20"
                        className="overflow-visible"
                      >
                        <path
                          d={sparklinePath}
                          fill="none"
                          stroke={entry.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                    <span className="mono-ui text-slate-100">{entry.count}</span>
                  </div>
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
            );
          })}
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
  aiEnabled,
  onOpenThreatHistory,
}: AnalyticsPanelProps) {
  const processedThreatIdsRef = useRef<Set<string>>(new Set());
  const [velocityData, setVelocityData] = useState<VelocityPoint[]>(
    buildVelocitySeries(Array.from({ length: VELOCITY_HISTORY_POINTS }, () => 0)),
  );
  const [insightIndex, setInsightIndex] = useState(0);

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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setInsightIndex((previous) => previous + 1);
    }, INSIGHT_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

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
  const insights = aiEnabled
    ? buildInsights(threats, velocityData)
    : [
        "AI Insight is paused from Admin to preserve Gemini quota. Live charts, threat history, and route analytics continue running locally.",
      ];
  const activeInsight = insights[insightIndex % insights.length];

  const hqPressureSparklines = Object.fromEntries(
    hqPressure.map((entry) => [
      entry.label,
      buildSparklineSeries(threats, "target_hq_name", entry.label),
    ]),
  );
  const malwareSparklines = Object.fromEntries(
    malwareLeaders.map((entry) => [
      entry.label,
      buildSparklineSeries(threats, "malware_family", entry.label),
    ]),
  );

  return (
    <section className="panel-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/8 px-4 py-3">
        <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
          INTELLIGENCE PANEL
        </h2>
        <p className="text-xs text-slate-400">
          Threat mix, tempo, AI summaries, pressure trends, and recent attack lanes
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

        <div className="rounded-md border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(4,10,20,0.94)_0%,rgba(6,16,28,0.94)_100%)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="mono-ui text-xs tracking-[0.2em] text-cyan-300">LIVE AI INSIGHT</div>
              <p className="mt-1 text-xs text-slate-500">
                {aiEnabled
                  ? "Plain-English interpretation of the active attack window"
                  : "Gemini-backed insight is paused to reduce API usage"}
              </p>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                aiEnabled ? "animate-pulse bg-cyan-300" : "bg-slate-500"
              }`}
            />
          </div>
          <div className="rounded-md border border-cyan-400/10 bg-black/24 px-4 py-4 text-sm leading-7 text-slate-200">
            {activeInsight}
          </div>
        </div>

        <StatList
          title="SEVERITY LOAD"
          description="How much of the active buffer sits in each severity tier."
          entries={severityCounts}
        />
        <StatList
          title="HQ PRESSURE"
          description="Which command centers are receiving the most inbound activity, with 10-second trend sparklines."
          entries={hqPressure}
          sparklines={hqPressureSparklines}
        />
        <StatList
          title="MALWARE FAMILIES"
          description="Families appearing most often in the current event window, plus immediate trend direction."
          entries={malwareLeaders}
          sparklines={malwareSparklines}
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
            <div className="text-sm text-slate-500">
              Waiting for attacks to populate the lane log.
            </div>
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
