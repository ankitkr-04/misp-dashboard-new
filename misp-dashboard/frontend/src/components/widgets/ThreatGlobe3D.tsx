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
  GLOBE_DECAY_SWEEP_MS,
  GLOBE_LABEL_ALTITUDE,
  GLOBE_LABEL_DOT_RADIUS,
  GLOBE_LABEL_SIZE,
  GLOBE_POINT_ALTITUDE,
  GLOBE_POINT_RADIUS,
  GLOBE_RESIZE_FALLBACK,
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

type RingVisual = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
};

// ─── Severity config ─────────────────────────────────────────────────────────

const SEVERITY_RING_CONFIG: Record<string, { maxR: number; speed: number; period: number }> = {
  Critical: { maxR: 5, speed: 3.5, period: 600 },
  High: { maxR: 4, speed: 2.5, period: 800 },
  Medium: { maxR: 3, speed: 1.8, period: 1100 },
  Low: { maxR: 2, speed: 1.2, period: 1500 },
};

// ─── Route preview strip ─────────────────────────────────────────────────────

function RoutePreview({
  threat,
  onOpen,
  dark = false,
}: {
  threat: ThreatPayload | null;
  onOpen: () => void;
  dark?: boolean;
}) {
  if (!threat) return null;
  const color =
    SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-30">
      <button
        type="button"
        onClick={onOpen}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left shadow-md backdrop-blur-sm transition hover:shadow-lg ${dark
          ? "border-slate-600/60 bg-slate-900/80 hover:border-slate-500"
          : "border-slate-200 bg-white/95 hover:border-blue-300"
          }`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
          {threat.severity}
        </span>
        <span className={dark ? "text-slate-600" : "text-slate-300"}>·</span>
        <span className={`text-xs ${dark ? "text-slate-300" : "text-slate-600"}`}>{threat.type}</span>
        <span className={dark ? "text-slate-600" : "text-slate-300"}>·</span>
        <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{threat.malware_family}</span>
        <span className={dark ? "text-slate-600" : "text-slate-300"}>·</span>
        <span className={`max-w-[180px] truncate text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {threat.src_geo.city} → {threat.target_hq_name}
        </span>
        <span className="ml-1 shrink-0 text-xs font-medium text-blue-400">Investigate →</span>
      </button>
    </div>
  );
}

// ─── Stats overlay for globe mode ────────────────────────────────────────────

function GlobeStatsOverlay({
  arcCount,
  activeHqCount,
  criticalCount,
}: {
  arcCount: number;
  activeHqCount: number;
  criticalCount: number;
}) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/75 px-2.5 py-1.5 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-xs font-medium tabular-nums text-slate-300">
          {arcCount} active routes
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/75 px-2.5 py-1.5 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        <span className="text-xs font-medium tabular-nums text-slate-300">
          {activeHqCount} HQ nodes
        </span>
      </div>
      {criticalCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-800/70 bg-red-950/75 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          <span className="text-xs font-semibold tabular-nums text-red-300">
            {criticalCount} critical
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Severity legend ──────────────────────────────────────────────────────────

function SeverityLegend({ dark = false }: { dark?: boolean }) {
  const items = [
    { label: "Critical", color: SEVERITY_COLORS.Critical },
    { label: "High", color: SEVERITY_COLORS.High },
    { label: "Medium", color: SEVERITY_COLORS.Medium },
    { label: "Low", color: SEVERITY_COLORS.Low },
  ];
  return (
    <div
      className={`pointer-events-none absolute bottom-3 right-3 z-30 flex flex-col gap-1 rounded-lg border px-2.5 py-2 backdrop-blur-sm ${dark
        ? "border-slate-700/60 bg-slate-900/75"
        : "border-slate-200 bg-white/90"
        }`}
    >
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: color }} />
          <span className={`text-[10px] font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Zoom controls ─────────────────────────────────────────────────────────────

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  dark = false,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  dark?: boolean;
}) {
  const base = dark
    ? "border-slate-600/60 bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 hover:text-white backdrop-blur-sm"
    : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600";

  return (
    <div className="absolute right-3 top-3 z-30 flex flex-col gap-1">
      {[
        { label: "+", title: "Zoom in", fn: onZoomIn },
        { label: "−", title: "Zoom out", fn: onZoomOut },
        { label: "⊙", title: "Reset view", fn: onReset },
      ].map(({ label, title, fn }) => (
        <button
          key={label}
          type="button"
          title={title}
          onClick={fn}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition ${base}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Mode button ───────────────────────────────────────────────────────────────

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
      className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition ${active
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
        }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ─── Globe altitude tracker (per-arc) ─────────────────────────────────────────

function getArcAltitude(startLat: number, startLng: number, endLat: number, endLng: number): number {
  // Great-circle distance in degrees → scale arc height naturally
  const dlat = Math.abs(endLat - startLat);
  const dlng = Math.abs(endLng - startLng);
  const dist = Math.sqrt(dlat * dlat + dlng * dlng);
  // Clamp between 0.15 and 0.55
  return Math.min(0.55, Math.max(0.15, dist * 0.0028));
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ThreatGlobe3D({
  threats,
  activeHqs,
  mitigatedIds = new Set<string>(),
  onSelectThreat,
}: ThreatGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const latestIdsRef = useRef<Set<string>>(new Set());
  const mapDragRef = useRef<{
    active: boolean;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
  }>({ active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false });

  const [dimensions, setDimensions] = useState(GLOBE_RESIZE_FALLBACK);
  const [arcThreats, setArcThreats] = useState<ArcThreat[]>([]);
  const [viewMode, setViewMode] = useState<GlobeViewMode>("map");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [globeAltitude, setGlobeAltitude] = useState(GLOBE_VIEW_ALTITUDE);

  // ── Resize observer ───────────────────────────────────────────────────────
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

  // ── Non-passive wheel for 2D map zoom ────────────────────────────────────
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || viewMode !== "map") return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setMapTransform((prev) => ({
        ...prev,
        scale: Math.max(0.5, Math.min(8, prev.scale * (e.deltaY < 0 ? 1.15 : 0.87))),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewMode]);

  // ── Globe init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!globeRef.current || viewMode !== "globe") return;
    globeRef.current.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 0);
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = GLOBE_AUTO_ROTATE_SPEED;
  }, [dimensions.height, dimensions.width, viewMode]);

  // ── Arc ingestion ─────────────────────────────────────────────────────────
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

  // ── Arc decay ─────────────────────────────────────────────────────────────
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

  // ── Clean stale hover/select ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedId && !arcThreats.some((e) => e.threat.id === selectedId)) setSelectedId(null);
    if (hoveredId && !arcThreats.some((e) => e.threat.id === hoveredId)) setHoveredId(null);
  }, [arcThreats, hoveredId, selectedId]);

  // ── Map drag ──────────────────────────────────────────────────────────────
  const handleMapMouseDown = useCallback(
    (e: React.MouseEvent) => {
      mapDragRef.current = {
        active: true,
        sx: e.clientX,
        sy: e.clientY,
        ox: mapTransform.x,
        oy: mapTransform.y,
        moved: false,
      };
    },
    [mapTransform],
  );

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mapDragRef.current.active) return;
    const dx = e.clientX - mapDragRef.current.sx;
    const dy = e.clientY - mapDragRef.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) mapDragRef.current.moved = true;
    setMapTransform((prev) => ({
      ...prev,
      x: mapDragRef.current.ox + dx,
      y: mapDragRef.current.oy + dy,
    }));
  }, []);

  const handleMapMouseUp = useCallback(() => {
    mapDragRef.current.active = false;
  }, []);

  const resetMapTransform = useCallback(() => setMapTransform({ scale: 1, x: 0, y: 0 }), []);

  const handleSelectThreat = useCallback(
    (threat: ThreatPayload) => {
      setSelectedId(threat.id);
      onSelectThreat?.(threat);
    },
    [onSelectThreat],
  );

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const handleGlobeZoomIn = useCallback(() => {
    const next = Math.max(0.8, globeAltitude - 0.5);
    setGlobeAltitude(next);
    globeRef.current?.pointOfView({ altitude: next }, 400);
  }, [globeAltitude]);

  const handleGlobeZoomOut = useCallback(() => {
    const next = Math.min(6, globeAltitude + 0.5);
    setGlobeAltitude(next);
    globeRef.current?.pointOfView({ altitude: next }, 400);
  }, [globeAltitude]);

  const handleGlobeReset = useCallback(() => {
    setGlobeAltitude(GLOBE_VIEW_ALTITUDE);
    globeRef.current?.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 700);
  }, []);

  // ── Build visual data ──────────────────────────────────────────────────────
  const arcs: ArcVisual[] = arcThreats.map(({ threat }) => {
    const color =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
    const highlighted = hoveredId === threat.id || selectedId === threat.id;
    const baseStroke = ARC_STROKE_BY_SEVERITY[threat.severity] ?? ARC_STROKE_BY_SEVERITY.Low;
    return {
      id: threat.id,
      startLat: threat.src_geo.lat,
      startLng: threat.src_geo.lon,
      endLat: threat.dst_geo.lat,
      endLng: threat.dst_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
      stroke: baseStroke * (highlighted ? 2.5 : 1),
      threat,
    };
  });

  const points: PointVisual[] = arcThreats.map(({ threat }) => {
    const color =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
    return {
      id: threat.id,
      lat: threat.src_geo.lat,
      lng: threat.src_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
      threat,
    };
  });

  // Rings pulse on HQ target nodes (destination of arcs)
  const rings: RingVisual[] = arcThreats.map(({ threat }) => {
    const color =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
    const cfg = SEVERITY_RING_CONFIG[threat.severity] ?? SEVERITY_RING_CONFIG.Low;
    return {
      id: `ring-${threat.id}`,
      lat: threat.dst_geo.lat,
      lng: threat.dst_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
      maxR: cfg.maxR,
      propagationSpeed: cfg.speed,
      repeatPeriod: cfg.period,
    };
  });

  // HQ rings — persistent slow pulse on active HQs
  const hqRings: RingVisual[] = activeHqs.map((hq) => ({
    id: `hq-${hq.id}`,
    lat: hq.lat,
    lng: hq.lon,
    color: hq.accent,
    maxR: 3,
    propagationSpeed: 0.8,
    repeatPeriod: 2000,
  }));

  const allRings = [...rings, ...hqRings];

  const latestThreat = arcThreats[arcThreats.length - 1]?.threat ?? null;
  const previewThreat =
    arcThreats.find((e) => e.threat.id === hoveredId)?.threat ??
    arcThreats.find((e) => e.threat.id === selectedId)?.threat ??
    latestThreat;
  const recentLabels = points.slice(-MAP_LABEL_LIMIT);

  const isGlobeMode = viewMode === "globe";
  const criticalCount = arcThreats.filter((e) => e.threat.severity === "Critical").length;

  return (
    <section
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm transition-colors ${isGlobeMode ? "border-slate-700 bg-[#060d1a]" : "border-slate-200 bg-white"
        }`}
    >
      {/* Header */}
      <div
        className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${isGlobeMode ? "border-slate-700/80 bg-[#080f1f]" : "border-slate-200 bg-white"
          }`}
      >
        <div>
          <h2
            className={`text-sm font-semibold ${isGlobeMode ? "text-slate-100" : "text-slate-800"}`}
          >
            Threat Geography
          </h2>
          <p className={`text-xs ${isGlobeMode ? "text-slate-500" : "text-slate-500"}`}>
            Source routes and active command-centre targets
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
          <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${isGlobeMode
              ? "border-slate-600 bg-slate-800 text-slate-300"
              : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
          >
            {arcs.length} routes
          </span>
        </div>
      </div>

      {/* Map / Globe area */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">

        {/* ── 3D Globe ───────────────────────────────────────────────────── */}
        {isGlobeMode ? (
          <>
            <GlobeStatsOverlay
              arcCount={arcs.length}
              activeHqCount={activeHqs.length}
              criticalCount={criticalCount}
            />
            <ZoomControls
              dark
              onZoomIn={handleGlobeZoomIn}
              onZoomOut={handleGlobeZoomOut}
              onReset={handleGlobeReset}
            />
            <SeverityLegend dark />
            <Globe
              ref={globeRef}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#060d1a"
              // Use night texture — we own the dark theme fully
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              atmosphereColor="#1e6fcc"
              atmosphereAltitude={0.22}
              animateIn
              showGraticules={false}

              // ── Arcs — solid, smooth, no dash blink ──
              arcsData={arcs}
              arcStartLat={(d) => (d as ArcVisual).startLat}
              arcStartLng={(d) => (d as ArcVisual).startLng}
              arcEndLat={(d) => (d as ArcVisual).endLat}
              arcEndLng={(d) => (d as ArcVisual).endLng}
              arcColor={(d: unknown) => {
                const arc = d as ArcVisual;
                const highlighted = hoveredId === arc.id || selectedId === arc.id;
                // Return gradient array for a nice fade effect
                return [
                  `${arc.color}55`,  // source: semi-transparent
                  arc.color,         // peak: full
                  `${arc.color}cc`,  // destination: slightly faded
                ];
              }}
              // Solid lines: dashLength=1, dashGap=0 = no blinking
              arcDashLength={1}
              arcDashGap={0}
              arcDashAnimateTime={0}
              arcStroke={(d) => (d as ArcVisual).stroke}
              arcAltitude={(d) => {
                const arc = d as ArcVisual;
                return getArcAltitude(arc.startLat, arc.startLng, arc.endLat, arc.endLng);
              }}
              arcCurveResolution={64}
              arcsTransitionDuration={800}
              onArcHover={(arc) => setHoveredId((arc as ArcVisual | null)?.id ?? null)}
              onArcClick={(arc) => {
                const t = (arc as ArcVisual | null)?.threat;
                if (t) handleSelectThreat(t);
              }}

              // ── Source points ──
              pointsData={points}
              pointLat={(d) => (d as PointVisual).lat}
              pointLng={(d) => (d as PointVisual).lng}
              pointColor={(d) => (d as PointVisual).color}
              pointAltitude={GLOBE_POINT_ALTITUDE}
              pointRadius={GLOBE_POINT_RADIUS}
              pointResolution={16}
              pointsMerge={false}
              pointsTransitionDuration={600}
              onPointHover={(pt) => setHoveredId((pt as PointVisual | null)?.id ?? null)}
              onPointClick={(pt) => {
                const t = (pt as PointVisual | null)?.threat;
                if (t) handleSelectThreat(t);
              }}

              // ── Rings — pulse on destination HQs ──
              ringsData={allRings}
              ringLat={(d) => (d as RingVisual).lat}
              ringLng={(d) => (d as RingVisual).lng}
              ringColor={(d: unknown) => {
                const r = d as RingVisual;
                // Fade from color to transparent
                return (t: number) => {
                  const alpha = Math.max(0, 1 - t);
                  return `${r.color}${Math.round(alpha * 160).toString(16).padStart(2, "0")}`;
                };
              }}
              ringMaxRadius={(d) => (d as RingVisual).maxR}
              ringPropagationSpeed={(d) => (d as RingVisual).propagationSpeed}
              ringRepeatPeriod={(d) => (d as RingVisual).repeatPeriod}

              // ── HQ labels ──
              labelsData={activeHqs}
              labelLat={(d) => (d as HqNode).lat}
              labelLng={(d) => (d as HqNode).lon}
              labelText={(d) => (d as HqNode).name}
              labelColor={(d) => String((d as HqNode).accent)}
              labelAltitude={GLOBE_LABEL_ALTITUDE}
              labelSize={GLOBE_LABEL_SIZE}
              labelDotRadius={GLOBE_LABEL_DOT_RADIUS}
              labelsTransitionDuration={500}
            />
          </>
        ) : null}

        {/* ── 2D Map ────────────────────────────────────────────────────── */}
        {viewMode === "map" ? (
          <>
            <ZoomControls
              onZoomIn={() =>
                setMapTransform((p) => ({ ...p, scale: Math.min(8, p.scale * 1.25) }))
              }
              onZoomOut={() =>
                setMapTransform((p) => ({ ...p, scale: Math.max(0.5, p.scale * 0.8) }))
              }
              onReset={resetMapTransform}
            />
            <SeverityLegend />

            <div
              ref={mapContainerRef}
              className="absolute inset-0 overflow-hidden bg-slate-50 select-none"
              style={{ cursor: mapDragRef.current.active ? "grabbing" : "grab" }}
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
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", fill: "#cbd5e1" },
                            pressed: { outline: "none" },
                          }}
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
                        strokeOpacity={highlighted ? 1 : 0.65}
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
                        onClick={() => {
                          if (!mapDragRef.current.moved) handleSelectThreat(pt.threat);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle r={MAP_SOURCE_POINT_RADIUS + 3} fill={pt.color} opacity={0.18} />
                        <circle r={MAP_SOURCE_POINT_RADIUS} fill={pt.color} />
                      </g>
                    </Marker>
                  ))}

                  {/* HQ nodes */}
                  {activeHqs.map((hq) => (
                    <Marker key={hq.id} coordinates={[hq.lon, hq.lat]}>
                      <g>
                        <circle
                          r={MAP_HQ_POINT_RADIUS * 1.8}
                          fill="none"
                          stroke={hq.accent}
                          strokeOpacity={0.35}
                        />
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

                  {/* City labels for recent sources */}
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

        {/* Route preview */}
        <RoutePreview
          dark={isGlobeMode}
          threat={previewThreat}
          onOpen={() => {
            if (previewThreat) handleSelectThreat(previewThreat);
          }}
        />
      </div>
    </section>
  );
}