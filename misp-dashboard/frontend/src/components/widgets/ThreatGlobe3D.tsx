import { useEffect, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Line,
  Marker,
  Sphere,
} from "react-simple-maps";
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
  MAP_COUNTRY_FILL,
  MAP_COUNTRY_STROKE,
  MAP_GEOGRAPHY_URL,
  MAP_GRATICULE_STROKE,
  MAP_HQ_POINT_RADIUS,
  MAP_LABEL_LIMIT,
  MAP_PROJECTION_SCALE,
  MAP_ROUTE_STROKE_MULTIPLIER,
  MAP_SOURCE_POINT_RADIUS,
  MAX_GLOBE_ARCS,
  MITIGATED_COLOR,
  SEVERITY_COLORS,
  THREAT_TYPE_DESCRIPTIONS,
} from "../../utils/constants";

type ThreatGlobe3DProps = {
  threats: ThreatPayload[];
  activeHqs: HqNode[];
  mitigatedIds?: Set<string>;
  onSelectThreat?: (threat: ThreatPayload) => void;
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
  threat: ThreatPayload;
};

type PointVisual = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  threat: ThreatPayload;
};

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
  });
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

function PreviewOverlay({
  threat,
  isPinned,
}: {
  threat: ThreatPayload | null;
  isPinned: boolean;
}) {
  if (!threat) {
    return null;
  }

  const severityColor =
    SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
  const description =
    THREAT_TYPE_DESCRIPTIONS[threat.type as keyof typeof THREAT_TYPE_DESCRIPTIONS] ??
    "Hostile activity that warrants containment and deeper investigation.";

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-30">
      <div className="rounded-md border border-white/10 bg-[rgba(6,12,22,0.9)] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: severityColor,
                boxShadow: `0 0 12px ${severityColor}`,
              }}
            />
            <span className="mono-ui text-xs tracking-[0.2em] text-slate-200">
              ROUTE PREVIEW
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {isPinned ? "Selected Route" : "Hover Route"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-100">
              <span>{threat.type}</span>
              <span className="text-slate-500">•</span>
              <span>{threat.malware_family}</span>
              <span className="text-slate-500">•</span>
              <span>{threat.severity}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
          </div>

          <div className="grid gap-2 text-[12px] text-slate-300">
            <div>
              <span className="text-slate-500">Route</span>
              <div className="mt-1">
                {threat.src_geo.city}, {threat.src_geo.country} {"->"} {threat.target_hq_name}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Indicator</span>
              <div className="mt-1">{threat.src_ip}</div>
            </div>
            <div>
              <span className="text-slate-500">Observed</span>
              <div className="mt-1">{formatTimestamp(threat.timestamp)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreatGlobe3D({
  threats,
  activeHqs,
  mitigatedIds = new Set<string>(),
  onSelectThreat,
}: ThreatGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const latestThreatIdsRef = useRef<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState(GLOBE_RESIZE_FALLBACK);
  const [arcThreats, setArcThreats] = useState<ArcThreat[]>([]);
  const [viewMode, setViewMode] = useState<GlobeViewMode>("globe");
  const [hoveredThreatId, setHoveredThreatId] = useState<string | null>(null);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedThreatId && !arcThreats.some((entry) => entry.threat.id === selectedThreatId)) {
      setSelectedThreatId(null);
    }

    if (hoveredThreatId && !arcThreats.some((entry) => entry.threat.id === hoveredThreatId)) {
      setHoveredThreatId(null);
    }
  }, [arcThreats, hoveredThreatId, selectedThreatId]);

  const arcs: ArcVisual[] = arcThreats.map(({ threat }) => {
    const severityColor =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
    const isHighlighted = hoveredThreatId === threat.id || selectedThreatId === threat.id;

    return {
      id: threat.id,
      startLat: threat.src_geo.lat,
      startLng: threat.src_geo.lon,
      endLat: threat.dst_geo.lat,
      endLng: threat.dst_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : severityColor,
      stroke:
        (ARC_STROKE_BY_SEVERITY[threat.severity] ?? ARC_STROKE_BY_SEVERITY.Low) *
        (isHighlighted ? 1.8 : 1),
      threat,
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
      threat,
    };
  });

  const latestThreat = arcThreats[arcThreats.length - 1]?.threat ?? null;
  const previewThreat =
    arcThreats.find((entry) => entry.threat.id === hoveredThreatId)?.threat ??
    arcThreats.find((entry) => entry.threat.id === selectedThreatId)?.threat ??
    latestThreat;
  const previewPinned = Boolean(selectedThreatId && hoveredThreatId !== selectedThreatId);
  const recentPointLabels = points.slice(-MAP_LABEL_LIMIT);

  return (
    <section className="panel-shell relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="mono-ui text-sm tracking-[0.22em] text-[var(--color-accent)]">
            GLOBAL ATTACK SURFACE
          </h2>
          <p className="text-xs text-slate-400">
            Hover a route for context, click to investigate, or switch to 2D tactical view
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
            onArcHover={(arc) => setHoveredThreatId((arc as ArcVisual | null)?.id ?? null)}
            onArcClick={(arc) => {
              const threat = (arc as ArcVisual | null)?.threat;
              if (!threat) {
                return;
              }
              setSelectedThreatId(threat.id);
              onSelectThreat?.(threat);
            }}
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={GLOBE_POINT_ALTITUDE}
            pointRadius={GLOBE_POINT_RADIUS}
            onPointHover={(point) => setHoveredThreatId((point as PointVisual | null)?.id ?? null)}
            onPointClick={(point) => {
              const threat = (point as PointVisual | null)?.threat;
              if (!threat) {
                return;
              }
              setSelectedThreatId(threat.id);
              onSelectThreat?.(threat);
            }}
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
            <ComposableMap
              width={dimensions.width}
              height={dimensions.height}
              projection="geoEqualEarth"
              projectionConfig={{ scale: MAP_PROJECTION_SCALE }}
              style={{ width: "100%", height: "100%", position: "relative", zIndex: 20 }}
            >
              <Sphere
                id="threat-map-sphere"
                fill="rgba(3,9,18,0.96)"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.6}
              />
              <Graticule stroke={MAP_GRATICULE_STROKE} />
              <Geographies geography={MAP_GEOGRAPHY_URL}>
                {({ geographies }) =>
                  geographies.map((geography) => (
                    <Geography
                      key={geography.rsmKey}
                      geography={geography}
                      fill={MAP_COUNTRY_FILL}
                      stroke={MAP_COUNTRY_STROKE}
                      strokeWidth={0.6}
                    />
                  ))
                }
              </Geographies>

              {arcs.map((arc) => {
                const isHighlighted = hoveredThreatId === arc.id || selectedThreatId === arc.id;

                return (
                  <Line
                    key={arc.id}
                    from={[arc.startLng, arc.startLat]}
                    to={[arc.endLng, arc.endLat]}
                    stroke={arc.color}
                    strokeWidth={Math.max(arc.stroke * MAP_ROUTE_STROKE_MULTIPLIER, 1)}
                    strokeOpacity={isHighlighted ? 1 : 0.76}
                    strokeLinecap="round"
                    strokeDasharray="9 7"
                    onMouseEnter={() => setHoveredThreatId(arc.id)}
                    onMouseLeave={() => setHoveredThreatId(null)}
                    onClick={() => {
                      setSelectedThreatId(arc.id);
                      onSelectThreat?.(arc.threat);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}

              {points.map((point) => (
                <Marker
                  key={point.id}
                  coordinates={[point.lng, point.lat]}
                >
                  <g
                    onMouseEnter={() => setHoveredThreatId(point.id)}
                    onMouseLeave={() => setHoveredThreatId(null)}
                    onClick={() => {
                      setSelectedThreatId(point.id);
                      onSelectThreat?.(point.threat);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      r={MAP_SOURCE_POINT_RADIUS + 2}
                      fill={point.color}
                      opacity={0.18}
                    />
                    <circle
                      r={MAP_SOURCE_POINT_RADIUS}
                      fill={point.color}
                    />
                  </g>
                </Marker>
              ))}

              {activeHqs.map((hq) => (
                <Marker
                  key={hq.id}
                  coordinates={[hq.lon, hq.lat]}
                >
                  <g>
                    <circle
                      r={MAP_HQ_POINT_RADIUS * 1.7}
                      fill="none"
                      stroke={hq.accent}
                      strokeOpacity={0.34}
                    />
                    <circle
                      r={MAP_HQ_POINT_RADIUS}
                      fill={hq.accent}
                    />
                    <text
                      x={MAP_HQ_POINT_RADIUS + 6}
                      y={-MAP_HQ_POINT_RADIUS - 2}
                      fill={hq.accent}
                      fontSize="11"
                      letterSpacing="0.14em"
                      style={{ pointerEvents: "none" }}
                    >
                      {hq.name}
                    </text>
                  </g>
                </Marker>
              ))}

              {recentPointLabels.map((point) => (
                <Marker
                  key={`label-${point.id}`}
                  coordinates={[point.lng, point.lat]}
                >
                  <text
                    x={MAP_SOURCE_POINT_RADIUS + 5}
                    y={MAP_SOURCE_POINT_RADIUS + 10}
                    fill="rgba(226,232,240,0.82)"
                    fontSize="10"
                    style={{ pointerEvents: "none" }}
                  >
                    {point.threat.src_geo.city}
                  </text>
                </Marker>
              ))}
            </ComposableMap>
          </div>
        )}

        <PreviewOverlay
          threat={previewThreat}
          isPinned={previewPinned}
        />
      </div>
    </section>
  );
}
