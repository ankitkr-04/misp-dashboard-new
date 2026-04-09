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
  THREAT_TYPE_COLORS,
  VELOCITY_HISTORY_POINTS,
  VELOCITY_SAMPLE_INTERVAL_MS,
} from "../../utils/constants";

type AnalyticsPanelProps = {
  threats: ThreatPayload[];
};

type VelocityPoint = {
  label: string;
  value: number;
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

export default function AnalyticsPanel({ threats }: AnalyticsPanelProps) {
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

  const threatTypeCounts = Object.keys(THREAT_TYPE_COLORS).map((type) => {
    const count = threats.filter((threat) => threat.type === type).length;

    return {
      type,
      count,
      color: THREAT_TYPE_COLORS[type as keyof typeof THREAT_TYPE_COLORS],
    };
  });

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="panel-shell flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/8 px-4 py-3">
          <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
            THREAT MIX
          </h2>
          <p className="text-xs text-slate-400">Type distribution across the active buffer</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
          <div className="min-h-0 flex-1">
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
                  outerRadius="82%"
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

          <div className="grid grid-cols-2 gap-2 px-2 pb-2">
            {threatTypeCounts.map((entry) => (
              <div
                key={entry.type}
                className="flex items-center justify-between rounded-md border border-white/8 bg-black/15 px-2 py-1 text-xs"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.type}
                </span>
                <span className="mono-ui text-slate-100">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-shell flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/8 px-4 py-3">
          <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
            ATTACK VELOCITY
          </h2>
          <p className="text-xs text-slate-400">Observed attack arrivals per second</p>
        </div>

        <div className="min-h-0 flex-1 px-3 py-3">
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
    </section>
  );
}
