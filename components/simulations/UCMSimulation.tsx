"use client";

import { useState } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  normalizeAngle,
  phaseFromAngle,
  resolveUcmParams,
  sampleUcmState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type UCMSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 760;
const HEIGHT = 264;
const CENTER_X = 248;
const CENTER_Y = 136;
const ORBIT_SCALE = 62;
const MAX_VISIBLE_RADIUS = 2;
const SCALE_TICKS = [-2, -1, 0, 1, 2];
const VECTOR_SCALE = 20;
const METRICS_CARD_WIDTH = 188;
const METRICS_CARD_X = WIDTH - METRICS_CARD_WIDTH - 18;
const METRICS_CARD_Y = 18;

type UcmFrame = {
  params: ReturnType<typeof resolveUcmParams>;
  snapshot: ReturnType<typeof sampleUcmState>;
  orbitRadiusPx: number;
  particleX: number;
  particleY: number;
};

function buildFrame(source: SimulationParams, time: number): UcmFrame {
  const params = resolveUcmParams({
    radius: typeof source.radius === "number" ? source.radius : undefined,
    omega: typeof source.omega === "number" ? source.omega : undefined,
    angularSpeed:
      typeof source.angularSpeed === "number" ? source.angularSpeed : undefined,
    phase: typeof source.phase === "number" ? source.phase : undefined,
  });
  const snapshot = sampleUcmState(params, time);
  const orbitRadiusPx = clamp(params.radius * ORBIT_SCALE, 14, MAX_VISIBLE_RADIUS * ORBIT_SCALE);

  return {
    params,
    snapshot,
    orbitRadiusPx,
    particleX: CENTER_X + snapshot.x * ORBIT_SCALE,
    particleY: CENTER_Y - snapshot.y * ORBIT_SCALE,
  };
}

function polarPoint(angle: number, radius: number) {
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y - Math.sin(angle) * radius,
  };
}

function buildAngleArc(angle: number, radius: number) {
  if (radius <= 0 || angle <= 0.02) {
    return null;
  }

  const normalized = normalizeAngle(angle);
  const start = polarPoint(0, radius);
  const end = polarPoint(normalized, radius);
  const largeArcFlag = normalized > Math.PI ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function toSvgCoordinates(clientX: number, clientY: number, bounds: DOMRect) {
  return {
    x: ((clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH,
    y: ((clientY - bounds.top) / Math.max(bounds.height, 1)) * HEIGHT,
  };
}

export function UCMSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: UCMSimulationProps) {
  const [dragging, setDragging] = useState(false);
  const displayTime =
    graphPreview?.kind === "time" || graphPreview?.kind === "trajectory"
      ? graphPreview.time
      : time;
  const activeFrame = buildFrame(params, displayTime);
  const compareAFrame = compare ? buildFrame(compare.setupA, displayTime) : null;
  const compareBFrame = compare ? buildFrame(compare.setupB, displayTime) : null;
  const compareEnabled = Boolean(compare);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryFrame = compare
    ? primaryTarget === "a"
      ? compareAFrame!
      : compareBFrame!
    : activeFrame;
  const secondaryFrame = compare
    ? primaryTarget === "a"
      ? compareBFrame!
      : compareAFrame!
    : activeFrame;
  const primaryLabel = compare
    ? primaryTarget === "a"
      ? compare.labelA ?? "A"
      : compare.labelB ?? "B"
    : "Live";
  const secondaryLabel = compare
    ? primaryTarget === "a"
      ? compare.labelB ?? "B"
      : compare.labelA ?? "A"
    : "";
  const previewBadge =
    graphPreview && (graphPreview.kind === "time" || graphPreview.kind === "trajectory") ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        preview {graphPreview.seriesLabel} t = {formatNumber(displayTime)} s
      </span>
    ) : graphPreview ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        preview {graphPreview.seriesLabel}
      </span>
    ) : null;
  const compareLegend = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {primaryLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {secondaryLabel}
      </span>
    </div>
  ) : null;
  const showRadiusVector = overlayValues?.radiusVector ?? true;
  const showVelocityVector = overlayValues?.velocityVector ?? true;
  const showCentripetalVector = overlayValues?.centripetalVector ?? true;
  const showAngleMarker = overlayValues?.angleMarker ?? true;
  const showProjectionGuides = overlayValues?.projectionGuides ?? false;
  const overlayWeight = (overlayId: string) => {
    if (!focusedOverlayId) {
      return 1;
    }

    return focusedOverlayId === overlayId ? 1 : 0.42;
  };
  const angleArcPath = buildAngleArc(primaryFrame.snapshot.wrappedAngle, 34);
  const primaryVelocityScale = VECTOR_SCALE;
  const primaryAccelerationScale = 6;
  const metricRows = [
    { label: "radius", value: formatMeasurement(primaryFrame.params.radius, "m") },
    { label: "tangent speed", value: formatMeasurement(primaryFrame.snapshot.speed, "m/s") },
    { label: "period", value: formatMeasurement(primaryFrame.snapshot.period, "s") },
    {
      label: "centripetal accel.",
      value: formatMeasurement(primaryFrame.snapshot.centripetalAcceleration, "m/s^2"),
    },
  ];

  function updateFromClient(clientX: number, clientY: number, bounds: DOMRect) {
    const { x, y } = toSvgCoordinates(clientX, clientY, bounds);
    const dx = x - CENTER_X;
    const dy = CENTER_Y - y;

    if (Math.hypot(dx, dy) < 8) {
      return;
    }

    const nextAngle = normalizeAngle(Math.atan2(dy, dx));
    const nextPhase = phaseFromAngle(
      nextAngle,
      displayTime,
      primaryFrame.params.angularSpeed,
    );

    setParam("phase", Number(nextPhase.toFixed(3)));
  }

  function nudgePhase(delta: number) {
    const nextPhase = normalizeAngle(primaryFrame.params.phase + delta);
    setParam("phase", Number(nextPhase.toFixed(3)));
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.08),rgba(30,166,162,0.06))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">{concept.title}</p>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {previewBadge}
            <p className="text-xs text-ink-700">
              Drag the {compareEnabled ? primaryLabel : "particle"} to set the phase on the orbit.
            </p>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        onPointerMove={(event) => {
          if (!dragging) {
            return;
          }

          const bounds = event.currentTarget.getBoundingClientRect();
          updateFromClient(event.clientX, event.clientY, bounds);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
        {SCALE_TICKS.map((tick) => {
          const x = CENTER_X + tick * ORBIT_SCALE;
          const y = CENTER_Y - tick * ORBIT_SCALE;
          return (
            <g key={`ucm-scale-${tick}`}>
              <line
                x1={x}
                x2={x}
                y1="28"
                y2={HEIGHT - 34}
                stroke={tick === 0 ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.06)"}
                strokeDasharray={tick === 0 ? "10 8" : "4 10"}
                strokeWidth={tick === 0 ? "2" : "1.5"}
              />
              <line
                x1="54"
                x2={METRICS_CARD_X - 18}
                y1={y}
                y2={y}
                stroke={tick === 0 ? "rgba(15,28,36,0.18)" : "rgba(15,28,36,0.06)"}
                strokeDasharray={tick === 0 ? "10 8" : "4 10"}
                strokeWidth={tick === 0 ? "2" : "1.5"}
              />
              <text
                x={x}
                y={HEIGHT - 14}
                textAnchor="middle"
                className="fill-ink-500 text-[11px] font-medium"
              >
                {tick}
              </text>
              {tick !== 0 ? (
                <text
                  x="42"
                  y={y + 4}
                  textAnchor="end"
                  className="fill-ink-500 text-[11px] font-medium"
                >
                  {tick}
                </text>
              ) : null}
            </g>
          );
        })}
        <text
          x={METRICS_CARD_X - 18}
          y={HEIGHT - 14}
          textAnchor="end"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          x scale (m)
        </text>
        <text
          x="24"
          y="28"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          y scale (m)
        </text>
        {compareEnabled ? (
          <>
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={secondaryFrame.orbitRadiusPx}
              fill="none"
              stroke="rgba(78,166,223,0.8)"
              strokeDasharray="8 8"
              strokeWidth="3"
            />
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={primaryFrame.orbitRadiusPx}
              fill="none"
              stroke="#1ea6a2"
              strokeWidth="3.5"
            />
          </>
        ) : (
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={primaryFrame.orbitRadiusPx}
            fill="none"
            stroke="#1ea6a2"
            strokeWidth="3.5"
          />
        )}
        {showProjectionGuides ? (
          <>
            <line
              x1={primaryFrame.particleX}
              x2={primaryFrame.particleX}
              y1={primaryFrame.particleY}
              y2={CENTER_Y}
              stroke="rgba(78,166,223,0.5)"
              strokeDasharray="7 6"
              strokeWidth="2"
              strokeOpacity={overlayWeight("projectionGuides")}
            />
            <line
              x1={CENTER_X}
              x2={primaryFrame.particleX}
              y1={primaryFrame.particleY}
              y2={primaryFrame.particleY}
              stroke="rgba(241,102,89,0.5)"
              strokeDasharray="7 6"
              strokeWidth="2"
              strokeOpacity={overlayWeight("projectionGuides")}
            />
            <circle
              cx={primaryFrame.particleX}
              cy={CENTER_Y}
              r={focusedOverlayId === "projectionGuides" ? "8" : "7"}
              fill="rgba(78,166,223,0.18)"
              stroke="#4ea6df"
              strokeWidth="2"
              strokeOpacity={overlayWeight("projectionGuides")}
            />
            <circle
              cx={CENTER_X}
              cy={primaryFrame.particleY}
              r={focusedOverlayId === "projectionGuides" ? "8" : "7"}
              fill="rgba(241,102,89,0.18)"
              stroke="#f16659"
              strokeWidth="2"
              strokeOpacity={overlayWeight("projectionGuides")}
            />
            <text
              x={primaryFrame.particleX + 10}
              y={CENTER_Y - 8}
              className={`text-[12px] font-semibold ${focusedOverlayId === "projectionGuides" ? "fill-sky-600" : "fill-sky-500"}`}
            >
              x = {formatMeasurement(primaryFrame.snapshot.x, "m")}
            </text>
            <text
              x={CENTER_X + 10}
              y={primaryFrame.particleY - 8}
              className={`text-[12px] font-semibold ${focusedOverlayId === "projectionGuides" ? "fill-coral-700" : "fill-coral-600"}`}
            >
              y = {formatMeasurement(primaryFrame.snapshot.y, "m")}
            </text>
          </>
        ) : null}
        {compareEnabled ? (
          <g pointerEvents="none">
            {showRadiusVector ? (
              <line
                x1={CENTER_X}
                x2={secondaryFrame.particleX}
                y1={CENTER_Y}
                y2={secondaryFrame.particleY}
                stroke="rgba(78,166,223,0.78)"
                strokeDasharray="8 8"
                strokeWidth="3"
                strokeOpacity={overlayWeight("radiusVector")}
              />
            ) : null}
            <circle
              cx={secondaryFrame.particleX}
              cy={secondaryFrame.particleY}
              r="15"
              fill="rgba(255,255,255,0.92)"
              stroke="rgba(78,166,223,0.72)"
              strokeDasharray="8 8"
              strokeWidth="3"
            />
            <text
              x={secondaryFrame.particleX + 16}
              y={secondaryFrame.particleY - 12}
              className="fill-sky-500 text-[12px] font-semibold"
            >
              {secondaryLabel}
            </text>
          </g>
        ) : null}
        {showRadiusVector ? (
          <line
            x1={CENTER_X}
            x2={primaryFrame.particleX}
            y1={CENTER_Y}
            y2={primaryFrame.particleY}
            stroke="#1ea6a2"
            strokeWidth={focusedOverlayId === "radiusVector" ? "5" : "4"}
            strokeOpacity={overlayWeight("radiusVector")}
          />
        ) : null}
        {showAngleMarker && angleArcPath ? (
          <>
            <line
              x1={CENTER_X}
              x2={CENTER_X + 42}
              y1={CENTER_Y}
              y2={CENTER_Y}
              stroke="rgba(15,28,36,0.22)"
              strokeWidth="2"
              strokeOpacity={overlayWeight("angleMarker")}
            />
            <path
              d={angleArcPath}
              fill="none"
              stroke="#f0ab3c"
              strokeWidth={focusedOverlayId === "angleMarker" ? "4" : "3"}
              strokeOpacity={overlayWeight("angleMarker")}
            />
            <text
              x={CENTER_X + 34}
              y={CENTER_Y - 16}
              className={`text-[12px] font-semibold ${focusedOverlayId === "angleMarker" ? "fill-amber-700" : "fill-amber-600"}`}
            >
              θ = {formatMeasurement(primaryFrame.snapshot.wrappedAngle, "rad")}
            </text>
          </>
        ) : null}
        <g
          tabIndex={0}
          role="button"
          aria-label={`Draggable circular-motion particle for ${primaryLabel}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
            if (bounds) {
              updateFromClient(event.clientX, event.clientY, bounds);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              nudgePhase(-0.1);
            } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              nudgePhase(0.1);
            } else if (event.key === "Home") {
              event.preventDefault();
              setParam("phase", 0);
            }
          }}
          style={{ cursor: "grab" }}
        >
          <circle
            cx={primaryFrame.particleX}
            cy={primaryFrame.particleY}
            r="18"
            fill="#0f1c24"
            stroke="#f0ab3c"
            strokeWidth="4"
          />
          <circle cx={primaryFrame.particleX} cy={primaryFrame.particleY} r="7" fill="#f4f2eb" />
          {showVelocityVector ? (
            <>
              <line
                x1={primaryFrame.particleX}
                x2={primaryFrame.particleX + primaryFrame.snapshot.vx * primaryVelocityScale}
                y1={primaryFrame.particleY}
                y2={primaryFrame.particleY - primaryFrame.snapshot.vy * primaryVelocityScale}
                stroke="#4ea6df"
                strokeWidth={focusedOverlayId === "velocityVector" ? "5" : "4"}
                strokeLinecap="round"
                strokeOpacity={overlayWeight("velocityVector")}
              />
              <polygon
                points={`${
                  primaryFrame.particleX + primaryFrame.snapshot.vx * primaryVelocityScale
                },${
                  primaryFrame.particleY - primaryFrame.snapshot.vy * primaryVelocityScale
                } ${
                  primaryFrame.particleX +
                  primaryFrame.snapshot.vx * primaryVelocityScale -
                  primaryFrame.snapshot.vy * 2.8
                },${
                  primaryFrame.particleY -
                  primaryFrame.snapshot.vy * primaryVelocityScale -
                  primaryFrame.snapshot.vx * 2.8
                } ${
                  primaryFrame.particleX +
                  primaryFrame.snapshot.vx * primaryVelocityScale +
                  primaryFrame.snapshot.vy * 2.8
                },${
                  primaryFrame.particleY -
                  primaryFrame.snapshot.vy * primaryVelocityScale +
                  primaryFrame.snapshot.vx * 2.8
                }`}
                fill="#4ea6df"
                fillOpacity={overlayWeight("velocityVector")}
              />
            </>
          ) : null}
          {showCentripetalVector ? (
            <>
              <line
                x1={primaryFrame.particleX}
                x2={primaryFrame.particleX + primaryFrame.snapshot.ax * primaryAccelerationScale}
                y1={primaryFrame.particleY}
                y2={primaryFrame.particleY - primaryFrame.snapshot.ay * primaryAccelerationScale}
                stroke="#f16659"
                strokeWidth={focusedOverlayId === "centripetalVector" ? "5" : "4"}
                strokeLinecap="round"
                strokeOpacity={overlayWeight("centripetalVector")}
              />
              <polygon
                points={`${
                  primaryFrame.particleX + primaryFrame.snapshot.ax * primaryAccelerationScale
                },${
                  primaryFrame.particleY - primaryFrame.snapshot.ay * primaryAccelerationScale
                } ${
                  primaryFrame.particleX +
                  primaryFrame.snapshot.ax * primaryAccelerationScale -
                  primaryFrame.snapshot.ay * 2.8
                },${
                  primaryFrame.particleY -
                  primaryFrame.snapshot.ay * primaryAccelerationScale -
                  primaryFrame.snapshot.ax * 2.8
                } ${
                  primaryFrame.particleX +
                  primaryFrame.snapshot.ax * primaryAccelerationScale +
                  primaryFrame.snapshot.ay * 2.8
                },${
                  primaryFrame.particleY -
                  primaryFrame.snapshot.ay * primaryAccelerationScale +
                  primaryFrame.snapshot.ax * 2.8
                }`}
                fill="#f16659"
                fillOpacity={overlayWeight("centripetalVector")}
              />
            </>
          ) : null}
        </g>
        <SimulationReadoutCard
          x={METRICS_CARD_X}
          y={METRICS_CARD_Y}
          width={METRICS_CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} state` : "Live state"}
          rows={metricRows}
          noteLines={[
            "Velocity stays tangent.",
            "Acceleration points inward.",
            "x and y share the same meter scale.",
          ]}
        />
      </svg>
    </section>
  );
}
