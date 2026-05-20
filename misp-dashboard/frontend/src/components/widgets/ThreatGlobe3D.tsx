import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
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

// ─── Types ──────────────────────────────────────────────────────────────────

type ThreatGlobe3DProps = {
  threats: ThreatPayload[];
  activeHqs: HqNode[];
  mitigatedIds?: Set<string>;
  onSelectThreat?: (threat: ThreatPayload) => void;
};

type ArcThreat = { threat: ThreatPayload; insertedAt: number };
type GlobeViewMode = keyof typeof GLOBE_VIEW_MODE_LABELS;

// Arc: start = attacker source, end = HQ target (resolved from activeHqs)
type ArcVisual = {
  id: string;
  startLat: number; startLng: number;
  endLat: number; endLng: number;
  color: string; stroke: number;
  threat: ThreatPayload;
};

// Source point (attacker city)
type SrcPoint = {
  id: string; lat: number; lng: number;
  color: string; city: string; country: string;
  threat: ThreatPayload;
};

// Destination point (HQ node being attacked)
type DstPoint = {
  id: string; lat: number; lng: number;
  color: string; name: string;
  hq: HqNode;
};

type RingVisual = {
  id: string; lat: number; lng: number;
  color: string; maxR: number; propagationSpeed: number; repeatPeriod: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_RING: Record<string, { maxR: number; speed: number; period: number }> = {
  Critical: { maxR: 4.5, speed: 3.2, period: 550 },
  High: { maxR: 3.5, speed: 2.2, period: 750 },
  Medium: { maxR: 2.5, speed: 1.6, period: 1050 },
  Low: { maxR: 1.8, speed: 1.0, period: 1600 },
};

const GLOBE_BG = "#f1f5f9";
const HEX_MARGIN = 0.38;
const HEX_RES = 3;
const HEX_COLOR = "#94a3b8";

// HQ target marker: cross/diamond shape size
const HQ_GLOBE_RADIUS = 0.45; // larger than source points
const HQ_GLOBE_ALTITUDE = 0.025;

function arcAlt(sLat: number, sLng: number, eLat: number, eLng: number): number {
  const d = Math.sqrt((eLat - sLat) ** 2 + (eLng - sLng) ** 2);
  return Math.min(0.6, Math.max(0.12, d * 0.0027));
}

function makeGlobeMaterial() {
  const mat = new THREE.MeshPhongMaterial();
  mat.color = new THREE.Color("#dde3ed");
  mat.emissive = new THREE.Color("#8fafd4");
  mat.emissiveIntensity = 0.06;
  mat.shininess = 6;
  mat.transparent = false;
  return mat;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition ${active
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
        }`}
    >
      {label}
    </button>
  );
}

function ZoomControls({ onZoomIn, onZoomOut, onReset }: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void }) {
  return (
    <div className="absolute right-3 top-3 z-30 flex flex-col gap-1">
      {([["+", "Zoom in", onZoomIn], ["−", "Zoom out", onZoomOut], ["⊙", "Reset view", onReset]] as const).map(([label, title, fn]) => (
        <button
          key={label}
          type="button"
          title={title}
          onClick={fn}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SeverityLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur-sm">
      {(["Critical", "High", "Medium", "Low"] as const).map((sev) => (
        <div key={sev} className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
          <span className="text-[10px] font-medium text-slate-500">{sev}</span>
        </div>
      ))}
      <div className="mt-1 border-t border-slate-100 pt-1 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-slate-400 bg-white" />
          <span className="text-[10px] text-slate-400">Source city</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-slate-500" style={{ transform: "rotate(45deg)", display: "inline-block" }} />
          <span className="text-[10px] text-slate-400">HQ target</span>
        </div>
      </div>
    </div>
  );
}

function GlobeOverlay({ arcCount, hqCount, criticalCount }: { arcCount: number; hqCount: number; criticalCount: number }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium tabular-nums text-slate-600">{arcCount} active routes</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        <span className="text-xs font-medium tabular-nums text-slate-600">{hqCount} HQ nodes online</span>
      </div>
      {criticalCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs font-semibold tabular-nums text-red-600">{criticalCount} critical</span>
        </div>
      )}
    </div>
  );
}

function RoutePreview({ threat, onOpen }: { threat: ThreatPayload | null; onOpen: () => void }) {
  if (!threat) return null;
  const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-30">
      <button
        type="button"
        onClick={onOpen}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-left shadow-md backdrop-blur-sm transition hover:border-blue-300 hover:shadow-lg"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-slate-700">{threat.severity}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs text-slate-600">{threat.type}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs text-slate-500">{threat.src_geo.city}, {threat.src_geo.country}</span>
        <span className="text-slate-300">→</span>
        <span className="text-xs font-medium text-slate-600">{threat.target_hq_name}</span>
        <span className="ml-1 shrink-0 text-xs font-medium text-blue-600">Investigate →</span>
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ThreatGlobe3D({
  threats,
  activeHqs,
  mitigatedIds = new Set<string>(),
  onSelectThreat,
}: ThreatGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const processedRef = useRef<Set<string>>(new Set());
  const latestRef = useRef<Set<string>>(new Set());
  const mapDragRef = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false });

  const [dimensions, setDimensions] = useState(GLOBE_RESIZE_FALLBACK);
  const [arcThreats, setArcThreats] = useState<ArcThreat[]>([]);
  const [viewMode, setViewMode] = useState<GlobeViewMode>("map");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [altitude, setAltitude] = useState(GLOBE_VIEW_ALTITUDE);
  const [hexPolygons, setHexPolygons] = useState<unknown[]>([]);

  const globeMaterial = useMemo(() => makeGlobeMaterial(), []);

  // Build HQ lookup: id → HqNode (for resolving exact lat/lon)
  const hqById = useMemo(
    () => new Map(activeHqs.map((h) => [h.id, h])),
    [activeHqs],
  );

  // ── GeoJSON for hex dots ──────────────────────────────────────────────
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((r) => r.json())
      .then((gj) => setHexPolygons((gj as { features: unknown[] }).features))
      .catch(() => { });
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      setDimensions({ width: Math.max(Math.floor(e.contentRect.width), 1), height: Math.max(Math.floor(e.contentRect.height), 1) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Map wheel (non-passive) ───────────────────────────────────────────
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || viewMode !== "map") return undefined;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      setMapTransform((p) => ({ ...p, scale: Math.max(0.5, Math.min(8, p.scale * (e.deltaY < 0 ? 1.15 : 0.87))) }));
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [viewMode]);

  // ── Globe init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!globeRef.current || viewMode !== "globe") return;
    globeRef.current.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 0);
    const c = globeRef.current.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = GLOBE_AUTO_ROTATE_SPEED;
  }, [dimensions, viewMode]);

  // ── Arc ingestion ─────────────────────────────────────────────────────
  useEffect(() => {
    const next: ArcThreat[] = [];
    latestRef.current = new Set(threats.map((t) => t.id));
    threats.forEach((t) => {
      if (!processedRef.current.has(t.id)) {
        processedRef.current.add(t.id);
        next.push({ threat: t, insertedAt: Date.now() });
      }
    });
    if (!next.length) return;
    setArcThreats((prev) => {
      const merged = [...prev, ...next].slice(-MAX_GLOBE_ARCS);
      processedRef.current = new Set([...latestRef.current, ...merged.map((e) => e.threat.id)]);
      return merged;
    });
  }, [threats]);

  // ── Arc decay ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      const cutoff = Date.now() - ARC_DECAY_MS;
      setArcThreats((prev) => {
        const next = prev.filter((e) => e.insertedAt >= cutoff);
        processedRef.current = new Set([...latestRef.current, ...next.map((e) => e.threat.id)]);
        return next;
      });
    }, GLOBE_DECAY_SWEEP_MS);
    return () => window.clearInterval(id);
  }, []);

  // ── Stale cleanup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedId && !arcThreats.some((e) => e.threat.id === selectedId)) setSelectedId(null);
    if (hoveredId && !arcThreats.some((e) => e.threat.id === hoveredId)) setHoveredId(null);
  }, [arcThreats, hoveredId, selectedId]);

  // ── Map drag ──────────────────────────────────────────────────────────
  const onMapDown = useCallback((e: React.MouseEvent) => {
    mapDragRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: mapTransform.x, oy: mapTransform.y, moved: false };
  }, [mapTransform]);
  const onMapMove = useCallback((e: React.MouseEvent) => {
    if (!mapDragRef.current.active) return;
    const dx = e.clientX - mapDragRef.current.sx, dy = e.clientY - mapDragRef.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) mapDragRef.current.moved = true;
    setMapTransform((p) => ({ ...p, x: mapDragRef.current.ox + dx, y: mapDragRef.current.oy + dy }));
  }, []);
  const onMapUp = useCallback(() => { mapDragRef.current.active = false; }, []);
  const resetMap = useCallback(() => setMapTransform({ scale: 1, x: 0, y: 0 }), []);
  const selectThreat = useCallback((t: ThreatPayload) => { setSelectedId(t.id); onSelectThreat?.(t); }, [onSelectThreat]);

  // ── Globe zoom ────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => { const n = Math.max(0.8, altitude - 0.45); setAltitude(n); globeRef.current?.pointOfView({ altitude: n }, 400); }, [altitude]);
  const zoomOut = useCallback(() => { const n = Math.min(6, altitude + 0.45); setAltitude(n); globeRef.current?.pointOfView({ altitude: n }, 400); }, [altitude]);
  const zoomReset = useCallback(() => { setAltitude(GLOBE_VIEW_ALTITUDE); globeRef.current?.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 700); }, []);

  // ── Visual data ───────────────────────────────────────────────────────

  // Arcs: end coords resolved from HQ node (authoritative lat/lon), NOT dst_geo
  const arcs = useMemo<ArcVisual[]>(() =>
    arcThreats.flatMap(({ threat }) => {
      const hq = hqById.get(threat.target_hq_id);
      if (!hq) return []; // skip if HQ not in active list
      const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
      const hi = hoveredId === threat.id || selectedId === threat.id;
      return [{
        id: threat.id,
        startLat: threat.src_geo.lat,
        startLng: threat.src_geo.lon,
        // Use exact HQ coordinates — this is the fix
        endLat: hq.lat,
        endLng: hq.lon,
        color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
        stroke: (ARC_STROKE_BY_SEVERITY[threat.severity] ?? ARC_STROKE_BY_SEVERITY.Low) * (hi ? 2.8 : 1),
        threat,
      }];
    }),
    [arcThreats, hoveredId, selectedId, mitigatedIds, hqById],
  );

  // Source points: attacker city — shown when arc exists
  const srcPoints = useMemo<SrcPoint[]>(() =>
    arcThreats.map(({ threat }) => {
      const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
      return {
        id: threat.id,
        lat: threat.src_geo.lat,
        lng: threat.src_geo.lon,
        color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
        city: threat.src_geo.city,
        country: threat.src_geo.country,
        threat,
      };
    }),
    [arcThreats, mitigatedIds],
  );

  // Destination points: one entry per active HQ that has ≥1 arc targeting it
  // Always show all active HQs (they are permanent nodes), but highlight ones under attack
  const dstPoints = useMemo<DstPoint[]>(() => {
    // Count arcs per HQ
    const attackedIds = new Set(arcThreats.map((e) => e.threat.target_hq_id));
    return activeHqs.map((hq) => {
      const underAttack = attackedIds.has(hq.id);
      return {
        id: `hq-${hq.id}`,
        lat: hq.lat,
        lng: hq.lon,
        // Brighter when under attack, muted when idle
        color: underAttack ? hq.accent : `${hq.accent}88`,
        name: hq.name,
        hq,
      };
    });
  }, [activeHqs, arcThreats]);

  // Rings: pulse at HQ targets that are being hit (severity-scaled)
  const threatRings = useMemo<RingVisual[]>(() =>
    arcThreats.flatMap(({ threat }) => {
      const hq = hqById.get(threat.target_hq_id);
      if (!hq) return [];
      const color = SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;
      const cfg = SEVERITY_RING[threat.severity] ?? SEVERITY_RING.Low;
      return [{
        id: `r-${threat.id}`,
        lat: hq.lat,   // use HQ coords, not dst_geo
        lng: hq.lon,
        color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : color,
        maxR: cfg.maxR, propagationSpeed: cfg.speed, repeatPeriod: cfg.period,
      }];
    }),
    [arcThreats, mitigatedIds, hqById],
  );

  // Idle HQ rings — slow ambient pulse
  const hqRings = useMemo<RingVisual[]>(() =>
    activeHqs.map((hq) => ({
      id: `hqr-${hq.id}`, lat: hq.lat, lng: hq.lon, color: hq.accent,
      maxR: 2, propagationSpeed: 0.6, repeatPeriod: 2400,
    })),
    [activeHqs],
  );

  const allRings = useMemo(() => [...threatRings, ...hqRings], [threatRings, hqRings]);

  // Labels: source city name for the most recent arcs + all HQ names
  // Split into two labelsData arrays so we can style them differently
  const srcLabels = useMemo(() =>
    srcPoints.slice(-MAP_LABEL_LIMIT).map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      text: `${p.city}`,
      color: "#475569", // slate-600
      size: 0.45,
      dotR: 0.2,
    })),
    [srcPoints],
  );

  const hqLabels = useMemo(() =>
    activeHqs.map((hq) => ({
      id: hq.id,
      lat: hq.lat,
      lng: hq.lon,
      text: hq.name,
      color: hq.accent,
      size: GLOBE_LABEL_SIZE,
      dotR: GLOBE_LABEL_DOT_RADIUS,
    })),
    [activeHqs],
  );

  const allLabels = useMemo(() => [...srcLabels, ...hqLabels], [srcLabels, hqLabels]);

  // Combined points for globe: src (small sphere) + dst HQs (larger sphere at higher altitude)
  // We use two separate pointsData arrays via a wrapper approach:
  // Globe only accepts one pointsData, so we merge with a type discriminator
  type GlobePoint = {
    _type: "src" | "dst";
    id: string; lat: number; lng: number; color: string;
    radius: number; altitude: number;
    payload: SrcPoint | DstPoint;
  };

  const allGlobePoints = useMemo<GlobePoint[]>(() => [
    ...srcPoints.map((p) => ({
      _type: "src" as const,
      id: p.id, lat: p.lat, lng: p.lng, color: p.color,
      radius: GLOBE_POINT_RADIUS,
      altitude: GLOBE_POINT_ALTITUDE,
      payload: p,
    })),
    ...dstPoints.map((p) => ({
      _type: "dst" as const,
      id: p.id, lat: p.lat, lng: p.lng, color: p.color,
      radius: HQ_GLOBE_RADIUS,
      altitude: HQ_GLOBE_ALTITUDE,
      payload: p,
    })),
  ], [srcPoints, dstPoints]);

  const recentLbls = srcPoints.slice(-MAP_LABEL_LIMIT);
  const previewThreat =
    arcThreats.find((e) => e.threat.id === hoveredId)?.threat ??
    arcThreats.find((e) => e.threat.id === selectedId)?.threat ??
    arcThreats[arcThreats.length - 1]?.threat ?? null;
  const criticalCount = arcThreats.filter((e) => e.threat.severity === "Critical").length;
  const isGlobe = viewMode === "globe";

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Threat Geography</h2>
          <p className="text-xs text-slate-500">Source routes and active command-centre targets</p>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(GLOBE_VIEW_MODE_LABELS).map(([mode, label]) => (
            <ModeButton key={mode} label={label} active={viewMode === mode} onClick={() => setViewMode(mode as GlobeViewMode)} />
          ))}
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {arcs.length} routes
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">

        {/* ── 3D Globe ──────────────────────────────────────────────────── */}
        {isGlobe && (
          <>
            <GlobeOverlay arcCount={arcs.length} hqCount={activeHqs.length} criticalCount={criticalCount} />
            <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={zoomReset} />
            <SeverityLegend />

            <Globe
              ref={globeRef}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor={GLOBE_BG}
              globeImageUrl=""
              globeMaterial={globeMaterial}
              atmosphereColor="#93c5fd"
              atmosphereAltitude={0.18}
              showGraticules={false}
              animateIn

              // Hex dot surface
              hexPolygonsData={hexPolygons as object[]}
              hexPolygonResolution={HEX_RES}
              hexPolygonMargin={HEX_MARGIN}
              hexPolygonUseDots={true}
              hexPolygonColor={() => HEX_COLOR}
              hexPolygonAltitude={0.001}

              // ── Arcs: solid gradient, destination = exact HQ coords ──
              arcsData={arcs}
              arcStartLat={(d) => (d as ArcVisual).startLat}
              arcStartLng={(d) => (d as ArcVisual).startLng}
              arcEndLat={(d) => (d as ArcVisual).endLat}
              arcEndLng={(d) => (d as ArcVisual).endLng}
              arcColor={(d: unknown) => { const a = d as ArcVisual; return [`${a.color}22`, a.color, `${a.color}cc`]; }}
              arcDashLength={1}
              arcDashGap={0}
              arcDashAnimateTime={0}
              arcStroke={(d) => (d as ArcVisual).stroke}
              arcAltitude={(d) => { const a = d as ArcVisual; return arcAlt(a.startLat, a.startLng, a.endLat, a.endLng); }}
              arcCurveResolution={64}
              arcsTransitionDuration={800}
              onArcHover={(arc) => setHoveredId((arc as ArcVisual | null)?.id ?? null)}
              onArcClick={(arc) => { const t = (arc as ArcVisual | null)?.threat; if (t) selectThreat(t); }}

              // ── Points: merged src + dst with per-point radius/altitude ──
              pointsData={allGlobePoints}
              pointLat={(d) => (d as GlobePoint).lat}
              pointLng={(d) => (d as GlobePoint).lng}
              pointColor={(d) => (d as GlobePoint).color}
              pointAltitude={(d) => (d as GlobePoint).altitude}
              pointRadius={(d) => (d as GlobePoint).radius}
              pointResolution={16}
              pointsMerge={false}
              pointsTransitionDuration={600}
              onPointHover={(pt) => {
                const p = pt as GlobePoint | null;
                if (!p || p._type === "dst") return; // HQ points don't drive hover
                setHoveredId(p.id);
              }}
              onPointClick={(pt) => {
                const p = pt as GlobePoint | null;
                if (!p) return;
                if (p._type === "src") selectThreat((p.payload as SrcPoint).threat);
              }}

              // ── Rings: threat rings at HQ coords + ambient HQ pulse ──
              ringsData={allRings}
              ringLat={(d) => (d as RingVisual).lat}
              ringLng={(d) => (d as RingVisual).lng}
              ringColor={(d: unknown) => {
                const r = d as RingVisual;
                return (t: number) => {
                  const a = Math.max(0, 1 - t);
                  return `${r.color}${Math.round(a * 180).toString(16).padStart(2, "0")}`;
                };
              }}
              ringMaxRadius={(d) => (d as RingVisual).maxR}
              ringPropagationSpeed={(d) => (d as RingVisual).propagationSpeed}
              ringRepeatPeriod={(d) => (d as RingVisual).repeatPeriod}

              // ── Labels: source city names + HQ names ──
              labelsData={allLabels}
              labelLat={(d) => (d as typeof allLabels[0]).lat}
              labelLng={(d) => (d as typeof allLabels[0]).lng}
              labelText={(d) => (d as typeof allLabels[0]).text}
              labelColor={(d) => (d as typeof allLabels[0]).color}
              labelAltitude={GLOBE_LABEL_ALTITUDE}
              labelSize={(d) => (d as typeof allLabels[0]).size}
              labelDotRadius={(d) => (d as typeof allLabels[0]).dotR}
              labelsTransitionDuration={500}
            />
          </>
        )}

        {/* ── 2D Map ────────────────────────────────────────────────────── */}
        {viewMode === "map" && (
          <>
            <ZoomControls
              onZoomIn={() => setMapTransform((p) => ({ ...p, scale: Math.min(8, p.scale * 1.25) }))}
              onZoomOut={() => setMapTransform((p) => ({ ...p, scale: Math.max(0.5, p.scale * 0.8) }))}
              onReset={resetMap}
            />
            <SeverityLegend />

            <div
              ref={mapContainerRef}
              className="absolute inset-0 overflow-hidden bg-slate-50 select-none"
              style={{ cursor: mapDragRef.current.active ? "grabbing" : "grab" }}
              onMouseDown={onMapDown}
              onMouseMove={onMapMove}
              onMouseUp={onMapUp}
              onMouseLeave={onMapUp}
            >
              <div style={{ transform: `translate(${mapTransform.x}px,${mapTransform.y}px) scale(${mapTransform.scale})`, transformOrigin: "center center", width: "100%", height: "100%" }}>
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

                  {/* Arc lines: end at exact HQ lat/lon */}
                  {arcs.map((arc) => {
                    const hi = hoveredId === arc.id || selectedId === arc.id;
                    return (
                      <Line
                        key={arc.id}
                        from={[arc.startLng, arc.startLat]}
                        to={[arc.endLng, arc.endLat]}
                        stroke={arc.color}
                        strokeWidth={Math.max(arc.stroke * MAP_ROUTE_STROKE_MULTIPLIER, 1)}
                        strokeOpacity={hi ? 1 : 0.6}
                        strokeLinecap="round"
                        strokeDasharray={hi ? undefined : "8 6"}
                        onMouseEnter={() => setHoveredId(arc.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => { if (!mapDragRef.current.moved) selectThreat(arc.threat); }}
                        style={{ cursor: "pointer", pointerEvents: "auto" }}
                      />
                    );
                  })}

                  {/* Source points: attacker city */}
                  {srcPoints.map((pt) => (
                    <Marker key={pt.id} coordinates={[pt.lng, pt.lat]}>
                      <g
                        onMouseEnter={() => setHoveredId(pt.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => { if (!mapDragRef.current.moved) selectThreat(pt.threat); }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle r={MAP_SOURCE_POINT_RADIUS + 4} fill={pt.color} opacity={0.15} />
                        <circle r={MAP_SOURCE_POINT_RADIUS} fill={pt.color} />
                      </g>
                    </Marker>
                  ))}

                  {/* Source city labels (recent arcs only) */}
                  {recentLbls.map((pt) => (
                    <Marker key={`lbl-src-${pt.id}`} coordinates={[pt.lng, pt.lat]}>
                      <text
                        x={MAP_SOURCE_POINT_RADIUS + 5}
                        y={MAP_SOURCE_POINT_RADIUS - 2}
                        fill="#475569"
                        fontSize="9"
                        fontWeight="500"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {pt.city}
                      </text>
                    </Marker>
                  ))}

                  {/* HQ destination nodes — always visible, highlighted when under attack */}
                  {dstPoints.map((dp) => {
                    const underAttack = arcThreats.some((e) => e.threat.target_hq_id === dp.hq.id);
                    return (
                      <Marker key={dp.id} coordinates={[dp.lng, dp.lat]}>
                        <g>
                          {/* Pulse ring when under attack */}
                          {underAttack && (
                            <circle r={MAP_HQ_POINT_RADIUS * 2.8} fill="none" stroke={dp.hq.accent} strokeOpacity={0.25} strokeWidth={1} />
                          )}
                          {/* Outer ring always */}
                          <circle r={MAP_HQ_POINT_RADIUS * 1.7} fill="none" stroke={dp.hq.accent} strokeOpacity={underAttack ? 0.5 : 0.2} strokeWidth={0.8} />
                          {/* Diamond shape for HQ (rotated square) */}
                          <rect
                            x={-MAP_HQ_POINT_RADIUS * 0.85}
                            y={-MAP_HQ_POINT_RADIUS * 0.85}
                            width={MAP_HQ_POINT_RADIUS * 1.7}
                            height={MAP_HQ_POINT_RADIUS * 1.7}
                            fill={dp.color}
                            transform="rotate(45)"
                            rx={1}
                          />
                          {/* HQ name label */}
                          <text
                            x={MAP_HQ_POINT_RADIUS + 7}
                            y={-MAP_HQ_POINT_RADIUS + 1}
                            fill={dp.hq.accent}
                            fontSize="10"
                            fontWeight="600"
                            letterSpacing="0.03em"
                            style={{ pointerEvents: "none", userSelect: "none" }}
                          >
                            {dp.name}
                          </text>
                          {/* City sub-label */}
                          <text
                            x={MAP_HQ_POINT_RADIUS + 7}
                            y={-MAP_HQ_POINT_RADIUS + 11}
                            fill="#94a3b8"
                            fontSize="8"
                            style={{ pointerEvents: "none", userSelect: "none" }}
                          >
                            {dp.hq.city}
                          </text>
                        </g>
                      </Marker>
                    );
                  })}
                </ComposableMap>
              </div>
            </div>
          </>
        )}

        <RoutePreview threat={previewThreat} onOpen={() => { if (previewThreat) selectThreat(previewThreat); }} />
      </div>
    </section>
  );
}