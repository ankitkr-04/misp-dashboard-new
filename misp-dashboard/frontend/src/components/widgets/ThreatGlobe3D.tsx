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
    if (!globeRef.current) {
      return;
    }

    globeRef.current.pointOfView({ altitude: GLOBE_VIEW_ALTITUDE }, 0);
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = GLOBE_AUTO_ROTATE_SPEED;
  }, [dimensions.height, dimensions.width]);

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

  const arcs = arcThreats.map(({ threat, insertedAt }) => {
    const severityColor =
      SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;

    return {
      id: threat.id,
      insertedAt,
      startLat: threat.src_geo.lat,
      startLng: threat.src_geo.lon,
      endLat: threat.dst_geo.lat,
      endLng: threat.dst_geo.lon,
      color: mitigatedIds.has(threat.id) ? MITIGATED_COLOR : severityColor,
      stroke: ARC_STROKE_BY_SEVERITY[threat.severity] ?? ARC_STROKE_BY_SEVERITY.Low,
      label: `${threat.type} | ${threat.src_geo.city}, ${threat.src_geo.country} -> ${threat.target_hq_name}`,
    };
  });

  const points = arcThreats.map(({ threat }) => {
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
        <div className="orbital-pulse rounded-md border border-emerald-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-300">
          {arcs.length} active arcs
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1"
      >
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.08),transparent_44%)]" />

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
      </div>
    </section>
  );
}
