import { useEffect, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { HqNode, ThreatPayload } from "../../types/threat";
import {
  ARC_DECAY_MS,
  ARC_STROKE_BY_SEVERITY,
  GLOBE_ARC_ANIMATE_TIME_MS,
  GLOBE_ARC_DASH_GAP,
  GLOBE_ARC_DASH_LENGTH,
  GLOBE_AUTO_ROTATE_SPEED,
  GLOBE_BACKGROUND,
  GLOBE_BUMP_URL,
  GLOBE_DECAY_SWEEP_MS,
  GLOBE_LABEL_ALTITUDE,
  GLOBE_LABEL_DOT_RADIUS,
  GLOBE_LABEL_SIZE,
  GLOBE_POINT_ALTITUDE,
  GLOBE_POINT_RADIUS,
  GLOBE_RESIZE_FALLBACK,
  GLOBE_TEXTURE_URL,
  GLOBE_VIEW_ALTITUDE,
  GLOBE_VIEW_MODE_LABELS,
  MAP_CURVE_HEIGHT,
  MAP_HQ_POINT_RADIUS,
  MAP_LABEL_LIMIT,
  MAP_LATITUDE_STEP,
  MAP_LONGITUDE_STEP,
  MAP_SOURCE_POINT_RADIUS,
  MAX_GLOBE_ARCS,
  MITIGATED_COLOR,
  SEVERITY_COLORS,
} from "../../utils/constants";

type ThreatGlobe3DProps = {
  threats: ThreatPayload[];
  activeHqs: HqNode[];
  mitigatedIds?: Set<string>;
};

type ArcThreat = {
  threat: ThreatPayload;
  insertedAt: number;
};

type GlobeViewMode = keyof typeof GLOBE_VIEW_MODE_LABELS;

type ArcVisual = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  stroke: number;
  label: string;
};

type PointVisual = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
};

function projectLongitude(lon: number, width: number) {
  return ((lon + 180) / 360) * width;
}

function projectLatitude(lat: number, height: number) {
  return ((90 - lat) / 180) * height;
}

function buildMapCurve(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number,
) {
  const horizontalDistance = Math.abs(endX - startX);
  const wrappedDistance = Math.min(horizontalDistance, width - horizontalDistance);
  const controlX = horizontalDistance > width / 2 ? (startX + endX + width) / 2 % width : (startX + endX) / 2;
  const controlY = Math.max(
    24,
    Math.min(startY, endY) - Math.min(MAP_CURVE_HEIGHT + wrappedDistance * 0.12, 120),
  );
  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
}

function ModeButton({
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
      className={`rounded-md border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition ${
        active
          ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-white/4 text-slate-500 hover:border-white/20 hover:text-slate-200"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function ThreatGlobe3D({
  threats,
  activeHqs,
  mitigatedIds = new Set<string>(),
}: ThreatGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const latestThreatIdsRef = useRef<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState(GLOBE_RESIZE_FALLBACK);
  const [arcThreats, setArcThreats] = useState<ArcThreat[]>([]);
  const [viewMode, setViewMode] = useState<GlobeViewMode>("globe");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setDimensions({
        width: Math.max(Math.floor(entry.contentRect.width), 1),
        height: Math.max(Math.floor(entry.contentRect.height), 1),
      });
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current || viewMode !== "globe") {
      return;
    }

    globeRef.current.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 0);
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = GLOBE_AUTO_ROTATE_SPEED;
  }, [dimensions.height, dimensions.width, viewMode]);

  useEffect(() => {
    const nextEntries: ArcThreat[] = [];
    latestThreatIdsRef.current = new Set(threats.map((threat) => threat.id));

    threats.forEach((threat) => {
      if (!processedIdsRef.current.has(threat.id)) {
        processedIdsRef.current.add(threat.id);
        nextEntries.push({
          threat,
          insertedAt: Date.now(),
        });
      }
    });

    if (nextEntries.length === 0) {
      return;
    }

    setArcThreats((previous) => {
      const next = [...previous, ...nextEntries].slice(-MAX_GLOBE_ARCS);
      processedIdsRef.current = new Set([
        ...latestThreatIdsRef.current,
        ...next.map((entry) => entry.threat.id),
      ]);
      return next;
    });
  }, [threats]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const cutoff = Date.now() - ARC_DECAY_MS;
      setArcThreats((previous) => {
        const next = previous.filter((entry) => entry.insertedAt >= cutoff);
        processedIdsRef.current = new Set([
          ...latestThreatIdsRef.current,
          ...next.map((entry) => entry.threat.id),
        ]);
        return next;
      });
    }, GLOBE_DECAY_SWEEP_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const arcs: ArcVisual[] = arcThreats.map(({ threat }) => {
    const severityColor =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;

    return {
      id: threat.id,
      startLat: threat.src_geo.lat,
      startLng: threat.src_geo.lon,
      endLat: threat.dst_geo.lat,
      endLng: threat.dst_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : severityColor,
      stroke: ARC_STROKE_BY_SEVERITY[threat.severity] ?? ARC_STROKE_BY_SEVERITY.Low,
      label: `${threat.type} | ${threat.src_geo.city}, ${threat.src_geo.country} -> ${threat.target_hq_name}`,
    };
  });

  const points: PointVisual[] = arcThreats.map(({ threat }) => {
    const severityColor =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;

    return {
      id: threat.id,
      lat: threat.src_geo.lat,
      lng: threat.src_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : severityColor,
      label: `${threat.src_geo.city}, ${threat.src_geo.country}`,
    };
  });

  const recentPointLabels = points.slice(-MAP_LABEL_LIMIT);
  const mapHeight = dimensions.height;
  const mapWidth = dimensions.width;
  const latitudeLines = Array.from(
    { length: Math.floor(180 / MAP_LATITUDE_STEP) + 1 },
    (_, index) => 90 - index * MAP_LATITUDE_STEP,
  );
  const longitudeLines = Array.from(
    { length: Math.floor(360 / MAP_LONGITUDE_STEP) + 1 },
    (_, index) => -180 + index * MAP_LONGITUDE_STEP,
  );

  return (
    <section className="panel-shell relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
            GLOBAL ATTACK SURFACE
          </h2>
          <p className="text-xs text-slate-400">
            Routing live indicators across {Math.max(activeHqs.length, 1)} active HQ nodes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(GLOBE_VIEW_MODE_LABELS).map(([mode, label]) => (
            <ModeButton
              key={mode}
              label={label}
              active={viewMode === mode}
              onClick={() => setViewMode(mode as GlobeViewMode)}
            />
          ))}
          <div className="orbital-pulse rounded-md border border-emerald-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-300">
            {arcs.length} active arcs
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1"
      >
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.08),transparent_44%)]" />

        {viewMode === "globe" ? (
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor={GLOBE_BACKGROUND}
            globeImageUrl={GLOBE_TEXTURE_URL}
            bumpImageUrl={GLOBE_BUMP_URL}
            animateIn
            arcsData={arcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor="color"
            arcDashLength={GLOBE_ARC_DASH_LENGTH}
            arcDashGap={GLOBE_ARC_DASH_GAP}
            arcDashAnimateTime={GLOBE_ARC_ANIMATE_TIME_MS}
            arcStroke="stroke"
            arcLabel="label"
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={GLOBE_POINT_ALTITUDE}
            pointRadius={GLOBE_POINT_RADIUS}
            pointLabel="label"
            labelsData={activeHqs}
            labelLat="lat"
            labelLng="lon"
            labelText="name"
            labelColor={(hq) => String((hq as HqNode).accent)}
            labelAltitude={GLOBE_LABEL_ALTITUDE}
            labelSize={GLOBE_LABEL_SIZE}
            labelDotRadius={GLOBE_LABEL_DOT_RADIUS}
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#01040c_0%,#04101a_38%,#071827_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_44%)]" />
            <svg
              className="relative z-20 h-full w-full"
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              preserveAspectRatio="none"
            >
              {latitudeLines.map((lat) => {
                const y = projectLatitude(lat, mapHeight);
                return (
                  <line
                    key={`lat-${lat}`}
                    x1={0}
                    x2={mapWidth}
                    y1={y}
                    y2={y}
                    stroke="rgba(148,163,184,0.12)"
                    strokeWidth={1}
                  />
                );
              })}
              {longitudeLines.map((lon) => {
                const x = projectLongitude(lon, mapWidth);
                return (
                  <line
                    key={`lon-${lon}`}
                    y1={0}
                    y2={mapHeight}
                    x1={x}
                    x2={x}
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth={1}
                  />
                );
              })}

              {arcs.map((arc) => {
                const startX = projectLongitude(arc.startLng, mapWidth);
                const startY = projectLatitude(arc.startLat, mapHeight);
                const endX = projectLongitude(arc.endLng, mapWidth);
                const endY = projectLatitude(arc.endLat, mapHeight);

                return (
                  <path
                    key={arc.id}
                    d={buildMapCurve(startX, startY, endX, endY, mapWidth)}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={Math.max(arc.stroke * 2.6, 1)}
                    strokeLinecap="round"
                    strokeOpacity={0.9}
                    strokeDasharray="10 8"
                  />
                );
              })}

              {points.map((point) => (
                <circle
                  key={point.id}
                  cx={projectLongitude(point.lng, mapWidth)}
                  cy={projectLatitude(point.lat, mapHeight)}
                  r={MAP_SOURCE_POINT_RADIUS}
                  fill={point.color}
                />
              ))}

              {activeHqs.map((hq) => (
                <g key={hq.id}>
                  <circle
                    cx={projectLongitude(hq.lon, mapWidth)}
                    cy={projectLatitude(hq.lat, mapHeight)}
                    r={MAP_HQ_POINT_RADIUS}
                    fill={hq.accent}
                    opacity={0.95}
                  />
                  <text
                    x={projectLongitude(hq.lon, mapWidth) + 10}
                    y={projectLatitude(hq.lat, mapHeight) - 10}
                    fill={hq.accent}
                    fontSize="11"
                    letterSpacing="0.14em"
                  >
                    {hq.name}
                  </text>
                </g>
              ))}

              {recentPointLabels.map((point) => (
                <text
                  key={`label-${point.id}`}
                  x={projectLongitude(point.lng, mapWidth) + 8}
                  y={projectLatitude(point.lat, mapHeight) + 14}
                  fill="rgba(226,232,240,0.8)"
                  fontSize="10"
                >
                  {point.label}
                </text>
              ))}
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
