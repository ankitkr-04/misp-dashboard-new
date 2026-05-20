import { useCallback, useEffect, useRef, useState } from "react";
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
} from "../../utils/constants";

type ThreatGlobe3DProps = {
  threats: ThreatPayload[];
  activeHqs: HqNode[];
  mitigatedIds?: Set<string>;
  onSelectThreat?: (threat: ThreatPayload) => void;
};

type ArcThreat = { threat: ThreatPayload; insertedAt: number };
type GlobeViewMode = keyof typeof GLOBE_VIEW_MODE_LABELS;

type ArcVisual = {
  id: string; startLat: number; startLng: number; endLat: number; endLng: number;
  color: string; stroke: number; threat: ThreatPayload;
};
type PointVisual = {
  id: string; lat: number; lng: number; color: string; threat: ThreatPayload;
};

// ─── Compact one-liner hover overlay ────────────────────────────────────────

function RoutePreview({
  threat,
  onOpen,
}: {
  threat: ThreatPayload | null;
  onOpen: () => void;
}) {
  if (!threat) return null;
  const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-30 xl:right-auto xl:max-w-lg">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm
                   text-left transition hover:border-blue-300 hover:shadow-lg"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold text-slate-700">{threat.severity}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs font-medium text-slate-600">{threat.type}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs text-slate-500">{threat.malware_family}</span>
        <span className="text-slate-300">·</span>
        <span className="min-w-0 truncate text-xs text-slate-500">
          {threat.src_geo.city}, {threat.src_geo.country} → {threat.target_hq_name}
        </span>
        <span className="ml-auto shrink-0 text-xs font-medium text-blue-600">Investigate →</span>
      </button>
    </div>
  );
}

// ─── Zoom controls ─────────────────────────────────────────────────────────

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-30 flex flex-col gap-1">
      {[
        { label: "+", title: "Zoom in", fn: onZoomIn },
        { label: "−", title: "Zoom out", fn: onZoomOut },
        { label: "⊙", title: "Reset", fn: onReset },
      ].map(({ label, title, fn }) => (
        <button
          key={label}
          type="button"
          title={title}
          onClick={fn}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-medium
                     text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Mode button ────────────────────────────────────────────────────────────

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
        }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ThreatGlobe3D({
  threats,
  activeHqs,
  mitigatedIds = new Set<string>(),
  onSelectThreat,
}: ThreatGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const latestIdsRef = useRef<Set<string>>(new Set());
  const mapDragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; moved: boolean }>({
    active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false,
  });

  const [dimensions, setDimensions] = useState(GLOBE_RESIZE_FALLBACK);
  const [arcThreats, setArcThreats] = useState<ArcThreat[]>([]);
  const [viewMode, setViewMode] = useState<GlobeViewMode>("map");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Map transform state
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });

  // ── Resize observer ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      setDimensions({
        width: Math.max(Math.floor(e.contentRect.width), 1),
        height: Math.max(Math.floor(e.contentRect.height), 1),
      });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Globe init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!globeRef.current || viewMode !== "globe") return;
    globeRef.current.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 0);
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = GLOBE_AUTO_ROTATE_SPEED;
  }, [dimensions.height, dimensions.width, viewMode]);

  // ── Arc ingestion ────────────────────────────────────────────────────────
  useEffect(() => {
    const next: ArcThreat[] = [];
    latestIdsRef.current = new Set(threats.map((t) => t.id));
    threats.forEach((t) => {
      if (!processedIdsRef.current.has(t.id)) {
        processedIdsRef.current.add(t.id);
        next.push({ threat: t, insertedAt: Date.now() });
      }
    });
    if (next.length === 0) return;
    setArcThreats((prev) => {
      const merged = [...prev, ...next].slice(-MAX_GLOBE_ARCS);
      processedIdsRef.current = new Set([
        ...latestIdsRef.current,
        ...merged.map((e) => e.threat.id),
      ]);
      return merged;
    });
  }, [threats]);

  // ── Arc decay sweep ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      const cutoff = Date.now() - ARC_DECAY_MS;
      setArcThreats((prev) => {
        const next = prev.filter((e) => e.insertedAt >= cutoff);
        processedIdsRef.current = new Set([
          ...latestIdsRef.current,
          ...next.map((e) => e.threat.id),
        ]);
        return next;
      });
    }, GLOBE_DECAY_SWEEP_MS);
    return () => window.clearInterval(id);
  }, []);

  // ── Clean up stale hovered/selected ────────────────────────────────────
  useEffect(() => {
    if (selectedId && !arcThreats.some((e) => e.threat.id === selectedId)) setSelectedId(null);
    if (hoveredId && !arcThreats.some((e) => e.threat.id === hoveredId)) setHoveredId(null);
  }, [arcThreats, hoveredId, selectedId]);

  // ── Map zoom/pan handlers ────────────────────────────────────────────────
  const handleMapWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setMapTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(8, prev.scale * (e.deltaY < 0 ? 1.15 : 0.88))),
    }));
  }, []);

  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    mapDragRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: mapTransform.x, oy: mapTransform.y, moved: false };
  }, [mapTransform]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mapDragRef.current.active) return;
    const dx = e.clientX - mapDragRef.current.sx;
    const dy = e.clientY - mapDragRef.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) mapDragRef.current.moved = true;
    setMapTransform((prev) => ({ ...prev, x: mapDragRef.current.ox + dx, y: mapDragRef.current.oy + dy }));
  }, []);

  const handleMapMouseUp = useCallback(() => {
    mapDragRef.current.active = false;
  }, []);

  const resetMapTransform = useCallback(() => setMapTransform({ scale: 1, x: 0, y: 0 }), []);

  // ── Build visual data ────────────────────────────────────────────────────
  const arcs: ArcVisual[] = arcThreats.map(({ threat }) => {
    const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
    const highlighted = hoveredId === threat.id || selectedId === threat.id;
    return {
      id: threat.id,
      startLat: threat.src_geo.lat, startLng: threat.src_geo.lon,
      endLat: threat.dst_geo.lat, endLng: threat.dst_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
      stroke: (ARC_STROKE_BY_SEVERITY[threat.severity] ?? ARC_STROKE_BY_SEVERITY.Low) * (highlighted ? 2 : 1),
      threat,
    };
  });

  const points: PointVisual[] = arcThreats.map(({ threat }) => {
    const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
    return {
      id: threat.id,
      lat: threat.src_geo.lat, lng: threat.src_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
      threat,
    };
  });

  const latestThreat = arcThreats[arcThreats.length - 1]?.threat ?? null;
  const previewThreat =
    arcThreats.find((e) => e.threat.id === hoveredId)?.threat ??
    arcThreats.find((e) => e.threat.id === selectedId)?.threat ??
    latestThreat;
  const recentLabels = points.slice(-MAP_LABEL_LIMIT);

  const handleSelectThreat = (threat: ThreatPayload) => {
    setSelectedId(threat.id);
    onSelectThreat?.(threat);
  };

  return (
    <section className="panel-shell relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Threat Geography</h2>
          <p className="text-xs text-slate-500">Source routes and active command-centre targets</p>
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
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {arcs.length} routes
          </div>
        </div>
      </div>

      {/* Map / Globe area */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">

        {/* ── 3D Globe ─────────────────────────────────────────────────── */}
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
            arcStartLat="startLat" arcStartLng="startLng"
            arcEndLat="endLat" arcEndLng="endLng"
            arcColor="color"
            arcDashLength={GLOBE_ARC_DASH_LENGTH}
            arcDashGap={GLOBE_ARC_DASH_GAP}
            arcDashAnimateTime={GLOBE_ARC_ANIMATE_TIME_MS}
            arcStroke="stroke"
            onArcHover={(arc) => setHoveredId((arc as ArcVisual | null)?.id ?? null)}
            onArcClick={(arc) => {
              const t = (arc as ArcVisual | null)?.threat;
              if (t) handleSelectThreat(t);
            }}
            pointsData={points}
            pointLat="lat" pointLng="lng" pointColor="color"
            pointAltitude={GLOBE_POINT_ALTITUDE}
            pointRadius={GLOBE_POINT_RADIUS}
            onPointHover={(pt) => setHoveredId((pt as PointVisual | null)?.id ?? null)}
            onPointClick={(pt) => {
              const t = (pt as PointVisual | null)?.threat;
              if (t) handleSelectThreat(t);
            }}
            labelsData={activeHqs}
            labelLat="lat" labelLng="lon" labelText="name"
            labelColor={(hq) => String((hq as HqNode).accent)}
            labelAltitude={GLOBE_LABEL_ALTITUDE}
            labelSize={GLOBE_LABEL_SIZE}
            labelDotRadius={GLOBE_LABEL_DOT_RADIUS}
          />
        ) : null}

        {/* ── 2D Map ───────────────────────────────────────────────────── */}
        {viewMode === "map" ? (
          <>
            {/* Zoom controls */}
            <ZoomControls
              onZoomIn={() => setMapTransform((p) => ({ ...p, scale: Math.min(8, p.scale * 1.25) }))}
              onZoomOut={() => setMapTransform((p) => ({ ...p, scale: Math.max(0.5, p.scale * 0.8) }))}
              onReset={resetMapTransform}
            />

            {/* Scrollable/zoomable map wrapper */}
            <div
              className="absolute inset-0 overflow-hidden bg-slate-50"
              style={{ cursor: mapDragRef.current.active ? "grabbing" : "grab" }}
              onWheel={handleMapWheel}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={handleMapMouseUp}
              onMouseLeave={handleMapMouseUp}
            >
              <div
                style={{
                  transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})`,
                  transformOrigin: "center center",
                  width: "100%",
                  height: "100%",
                }}
              >
                <ComposableMap
                  width={dimensions.width}
                  height={dimensions.height}
                  projection="geoEqualEarth"
                  projectionConfig={{ scale: MAP_PROJECTION_SCALE }}
                  style={{ width: "100%", height: "100%", display: "block" }}
                >
                  <Sphere id="map-sphere" fill="#dbeafe" stroke="#bfdbfe" strokeWidth={0.5} />
                  <Graticule stroke={MAP_GRATICULE_STROKE} />
                  <Geographies geography={MAP_GEOGRAPHY_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={MAP_COUNTRY_FILL}
                          stroke={MAP_COUNTRY_STROKE}
                          strokeWidth={0.5}
                          style={{ default: { outline: "none" }, hover: { outline: "none", fill: "#cbd5e1" }, pressed: { outline: "none" } }}
                        />
                      ))
                    }
                  </Geographies>

                  {/* Routes */}
                  {arcs.map((arc) => {
                    const highlighted = hoveredId === arc.id || selectedId === arc.id;
                    return (
                      <Line
                        key={arc.id}
                        from={[arc.startLng, arc.startLat]}
                        to={[arc.endLng, arc.endLat]}
                        stroke={arc.color}
                        strokeWidth={Math.max(arc.stroke * MAP_ROUTE_STROKE_MULTIPLIER, 1)}
                        strokeOpacity={highlighted ? 1 : 0.7}
                        strokeLinecap="round"
                        strokeDasharray={highlighted ? undefined : "8 6"}
                        onMouseEnter={() => setHoveredId(arc.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => {
                          if (!mapDragRef.current.moved) handleSelectThreat(arc.threat);
                        }}
                        style={{ cursor: "pointer", pointerEvents: "auto" }}
                      />
                    );
                  })}

                  {/* Source points */}
                  {points.map((pt) => (
                    <Marker key={pt.id} coordinates={[pt.lng, pt.lat]}>
                      <g
                        onMouseEnter={() => setHoveredId(pt.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => { if (!mapDragRef.current.moved) handleSelectThreat(pt.threat); }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle r={MAP_SOURCE_POINT_RADIUS + 3} fill={pt.color} opacity={0.15} />
                        <circle r={MAP_SOURCE_POINT_RADIUS} fill={pt.color} />
                      </g>
                    </Marker>
                  ))}

                  {/* HQ nodes */}
                  {activeHqs.map((hq) => (
                    <Marker key={hq.id} coordinates={[hq.lon, hq.lat]}>
                      <g>
                        <circle r={MAP_HQ_POINT_RADIUS * 1.8} fill="none" stroke={hq.accent} strokeOpacity={0.3} />
                        <circle r={MAP_HQ_POINT_RADIUS} fill={hq.accent} />
                        <text
                          x={MAP_HQ_POINT_RADIUS + 6}
                          y={-MAP_HQ_POINT_RADIUS}
                          fill={hq.accent}
                          fontSize="10"
                          fontWeight="600"
                          letterSpacing="0.04em"
                          style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                          {hq.name}
                        </text>
                      </g>
                    </Marker>
                  ))}

                  {/* City labels */}
                  {recentLabels.map((pt) => (
                    <Marker key={`lbl-${pt.id}`} coordinates={[pt.lng, pt.lat]}>
                      <text
                        x={MAP_SOURCE_POINT_RADIUS + 5}
                        y={MAP_SOURCE_POINT_RADIUS + 9}
                        fill="#64748b"
                        fontSize="9"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {pt.threat.src_geo.city}
                      </text>
                    </Marker>
                  ))}
                </ComposableMap>
              </div>
            </div>
          </>
        ) : null}

        {/* Compact route preview strip */}
        <RoutePreview
          threat={previewThreat}
          onOpen={() => { if (previewThreat) handleSelectThreat(previewThreat); }}
        />
      </div>
    </section>
  );
}