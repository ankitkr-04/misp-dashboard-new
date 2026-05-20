import { useEffect, useRef, useState } from "react";
import {
  Area, AreaChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
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

type VelocityPoint = { label: string; value: number };
type CountEntry = { label: string; count: number; color: string };

function buildVelocitySeries(values: number[]): VelocityPoint[] {
  return values.map((value, i) => {
    const ago = values.length - i - 1;
    return { label: ago === 0 ? "now" : `${ago}s`, value };
  });
}

function countEntries(
  values: string[],
  palette: Record<string, string> | null = null,
  limit = ANALYTICS_LIST_LIMIT,
): CountEntry[] {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const fallback = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#f59e0b", "#06b6d4"];
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([label, count], i) => ({
      label, count,
      color: palette?.[label] ?? fallback[i % fallback.length],
    }));
}

function buildSparklineSeries(
  threats: ThreatPayload[],
  field: "target_hq_name" | "malware_family",
  label: string,
) {
  const now = Date.now();
  const series = Array.from({ length: SPARKLINE_POINTS }, () => 0);
  threats.forEach((t) => {
    if (t[field] !== label) return;
    const ago = Math.floor((now - new Date(t.timestamp).getTime()) / 1000);
    if (ago < 0 || ago >= SPARKLINE_WINDOW_SECONDS) return;
    const idx = SPARKLINE_POINTS - ago - 1;
    if (idx >= 0 && idx < series.length) series[idx] += 1;
  });
  return series;
}

function buildSparklinePath(series: number[]) {
  const W = 56; const H = 18;
  const max = Math.max(...series, 1);
  return series
    .map((v, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * W;
      const y = H - (v / max) * (H - 2) - 1;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function average(vs: number[]) {
  if (!vs.length) return 0;
  return vs.reduce((s, v) => s + v, 0) / vs.length;
}

function buildInsights(threats: ThreatPayload[], velocityData: VelocityPoint[]) {
  if (threats.length === 0) return ["Waiting for enough events to form a pattern."];
  const now = Date.now();
  const recent = threats.filter((t) => {
    const ms = new Date(t.timestamp).getTime();
    return !Number.isNaN(ms) && now - ms <= INSIGHT_LOOKBACK_SECONDS * 1000;
  });
  const ws = recent.length > 0 ? recent : threats.slice(-24);
  const topType = countEntries(ws.map((t) => t.type), THREAT_TYPE_COLORS, 1)[0];
  const topHq = countEntries(ws.map((t) => t.target_hq_name), null, 1)[0];
  const topFamily = countEntries(ws.map((t) => t.malware_family), null, 1)[0];
  const topCountry = countEntries(ws.map((t) => t.src_geo.country), null, 1)[0];
  const criticals = ws.filter((t) => t.severity === "Critical" || t.severity === "High").length;
  const highShare = Math.round((criticals / Math.max(ws.length, 1)) * 100);
  const lastV = velocityData[velocityData.length - 1]?.value ?? 0;
  const priorV = average(velocityData.slice(-8, -1).map((p) => p.value));
  const vDelta = priorV > 0 ? Math.round(((lastV - priorV) / priorV) * 100) : 0;
  const dominantShare = topType ? Math.round((topType.count / Math.max(ws.length, 1)) * 100) : 0;
  return [
    `${dominantShare}% of recent traffic is ${topType?.label ?? "hostile activity"} targeting ${topHq?.label ?? "the active HQ mesh"}. ${topFamily?.label ?? "Commodity tooling"} is the leading payload family.`,
    `${highShare}% of the last ${ws.length} events are High or Critical severity. ${topCountry?.label ?? "Multiple source regions"} contributes the largest source share.`,
    lastV > priorV && priorV > 0
      ? `Event velocity is up ${vDelta}% versus the recent baseline. ${topHq?.label ?? "The busiest HQ"} is absorbing the sharpest pressure.`
      : `Event tempo is stable, but ${topFamily?.label ?? "the leading malware family"} remains persistent across active routes.`,
  ];
}

// ─── StatList ────────────────────────────────────────────────────────────────

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
  const highest = Math.max(...entries.map((e) => e.count), 1);
  return (
    <div className="inner-card p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No samples in buffer yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const spark = sparklines[entry.label] ?? [];
            const path = spark.length > 0 ? buildSparklinePath(spark) : "";
            return (
              <div key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-700">{entry.label}</span>
                  <div className="flex items-center gap-2">
                    {path ? (
                      <svg width="56" height="18" viewBox="0 0 56 18" className="overflow-visible">
                        <path d={path} fill="none" stroke={entry.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                    <span className="w-6 text-right font-semibold text-slate-800">{entry.count}</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max((entry.count / highest) * 100, 6)}%`, backgroundColor: entry.color }}
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

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPanel({
  threats,
  aiEnabled,
  onOpenThreatHistory,
}: AnalyticsPanelProps) {
  const processedRef = useRef<Set<string>>(new Set());
  const [velocityData, setVelocityData] = useState<VelocityPoint[]>(
    buildVelocitySeries(Array.from({ length: VELOCITY_HISTORY_POINTS }, () => 0)),
  );
  const [insightIndex, setInsightIndex] = useState(0);

  // Velocity sampling
  useEffect(() => {
    const id = window.setInterval(() => {
      const visible = new Set(threats.map((t) => t.id));
      let newCount = 0;
      threats.forEach((t) => {
        if (!processedRef.current.has(t.id)) { processedRef.current.add(t.id); newCount++; }
      });
      Array.from(processedRef.current).forEach((id) => { if (!visible.has(id)) processedRef.current.delete(id); });
      setVelocityData((prev) => buildVelocitySeries([...prev.map((p) => p.value), newCount].slice(-VELOCITY_HISTORY_POINTS)));
    }, VELOCITY_SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [threats]);

  // Insight rotation
  useEffect(() => {
    const id = window.setInterval(() => setInsightIndex((p) => p + 1), INSIGHT_ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const threatTypeCounts = Object.keys(THREAT_TYPE_COLORS).map((type) => ({
    type,
    count: threats.filter((t) => t.type === type).length,
    color: THREAT_TYPE_COLORS[type as keyof typeof THREAT_TYPE_COLORS],
    lastSeen: threats.slice().reverse().find((t) => t.type === type)?.timestamp,
  }));

  const severityCounts = Object.keys(SEVERITY_COLORS).map((sev) => ({
    label: sev,
    count: threats.filter((t) => t.severity === sev).length,
    color: SEVERITY_COLORS[sev as keyof typeof SEVERITY_COLORS],
  }));

  const hqPressure = countEntries(threats.map((t) => t.target_hq_name));
  const malwareLeaders = countEntries(threats.map((t) => t.malware_family));
  const sourceCountries = countEntries(threats.map((t) => t.src_geo.country));
  const recentRoutes = threats.slice().reverse().slice(0, ANALYTICS_LIST_LIMIT);

  const insights = aiEnabled
    ? buildInsights(threats, velocityData)
    : ["AI-backed insight is paused to preserve Gemini API quota. Charts and statistics continue running locally."];
  const activeInsight = insights[insightIndex % insights.length];

  const hqSparklines = Object.fromEntries(
    hqPressure.map((e) => [e.label, buildSparklineSeries(threats, "target_hq_name", e.label)]),
  );
  const malwareSparklines = Object.fromEntries(
    malwareLeaders.map((e) => [e.label, buildSparklineSeries(threats, "malware_family", e.label)]),
  );

  const chartTooltipStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    color: "#0f172a",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <section className="panel-shell flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Analytics</h2>
        <p className="text-xs text-slate-500">Threat mix, velocity, summaries, and route trends</p>
      </div>

      {/* Scrollable body */}
      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-3 py-3">

        {/* ── Threat Mix ──────────────────────────────────────────────── */}
        <div className="inner-card p-4">
          <div className="mb-2">
            <div className="text-sm font-semibold text-slate-800">Threat Mix</div>
            <p className="mt-0.5 text-xs text-slate-500">
              Click a category to inspect recent events in that lane.
            </p>
          </div>

          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatTypeCounts} dataKey="count" nameKey="type"
                  innerRadius="52%" outerRadius="82%" paddingAngle={2} isAnimationActive
                >
                  {threatTypeCounts.map((e) => <Cell key={e.type} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {threatTypeCounts.map((e) => (
              <button
                key={e.type}
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left
                           transition hover:border-blue-200 hover:bg-blue-50/50"
                onClick={() => onOpenThreatHistory(e.type)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    {e.type}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">{e.count}</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {e.lastSeen ? `Last: ${formatTime(e.lastSeen)}` : "No records"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Event Velocity ──────────────────────────────────────────── */}
        <div className="inner-card p-4">
          <div className="mb-2">
            <div className="text-sm font-semibold text-slate-800">Event Velocity</div>
            <p className="mt-0.5 text-xs text-slate-500">Observed arrivals per second</p>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="velFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  dataKey="value" type="monotone"
                  stroke="#2563eb" strokeWidth={2}
                  fill="url(#velFill)"
                  isAnimationActive animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Analyst Summary ─────────────────────────────────────────── */}
        <div className="inner-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Analyst Summary</div>
              <p className="mt-0.5 text-xs text-slate-500">
                {aiEnabled ? "Plain-English interpretation of the active window" : "AI insight paused — quota conservation mode"}
              </p>
            </div>
            <span className={`h-2 w-2 rounded-full ${aiEnabled ? "bg-emerald-400" : "bg-slate-300"}`} />
          </div>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {activeInsight}
          </p>
        </div>

        {/* ── Severity Load ─────────────────────────────────────────────*/}
        <StatList
          title="Severity Distribution"
          description="Share of events per severity tier in the current buffer."
          entries={severityCounts}
        />

        {/* ── HQ Pressure ──────────────────────────────────────────────*/}
        <StatList
          title="HQ Pressure"
          description="Command centres receiving the most inbound routes, with 10-second sparklines."
          entries={hqPressure}
          sparklines={hqSparklines}
        />

        {/* ── Malware Families ─────────────────────────────────────────*/}
        <StatList
          title="Malware Families"
          description="Families appearing most in the current event window with trend direction."
          entries={malwareLeaders}
          sparklines={malwareSparklines}
        />

        {/* ── Source Countries ──────────────────────────────────────────*/}
        <StatList
          title="Source Countries"
          description="Country mix inferred from the current event sources."
          entries={sourceCountries}
        />

        {/* ── Recent Routes ─────────────────────────────────────────────*/}
        <div className="inner-card p-4">
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-800">Recent Routes</div>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest source-to-HQ routes flowing through the dashboard
            </p>
          </div>
          {recentRoutes.length === 0 ? (
            <p className="text-sm text-slate-400">Waiting for events…</p>
          ) : (
            <div className="space-y-1.5">
              {recentRoutes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-700">
                      {t.src_geo.country} → {t.target_hq_name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {t.type} · {t.severity} · {t.src_ip}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">{formatTime(t.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}