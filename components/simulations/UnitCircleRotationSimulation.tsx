"use client";

import { useRef } from "react";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  normalizeAngle,
  phaseFromAngle,
  resolveUnitCircleRotationParams,
  sampleUnitCircleRotationState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  CartesianPlane,
  projectCartesianX,
  projectCartesianY,
  type CartesianPlaneConfig,
} from "./primitives/math-plane";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type UnitCircleRotationSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "point";

const WIDTH = 920;
const HEIGHT = 392;
const PLANE_X = 24;
const PLANE_Y = 28;
const CARD_X = 542;
const CARD_Y = 28;
const CARD_WIDTH = 324;
const QUADRANT_CARD_WIDTH = 144;
const QUADRANT_CARD_HEIGHT = 56;
const QUADRANT_PANEL_X = CARD_X;
const QUADRANT_PANEL_Y = 226;

const QUADRANT_CARDS = [
  { id: "Quadrant I", shortLabel: "QI", cosLabel: "cos > 0", sinLabel: "sin > 0", x: 0, y: 0 },
  {
    id: "Quadrant II",
    shortLabel: "QII",
    cosLabel: "cos < 0",
    sinLabel: "sin > 0",
    x: QUADRANT_CARD_WIDTH + 12,
    y: 0,
  },
  {
    id: "Quadrant III",
    shortLabel: "QIII",
    cosLabel: "cos < 0",
    sinLabel: "sin < 0",
    x: 0,
    y: QUADRANT_CARD_HEIGHT + 10,
  },
  {
    id: "Quadrant IV",
    shortLabel: "QIV",
    cosLabel: "cos > 0",
    sinLabel: "sin < 0",
    x: QUADRANT_CARD_WIDTH + 12,
    y: QUADRANT_CARD_HEIGHT + 10,
  },
] as const;

function buildPlaneConfig(): CartesianPlaneConfig {
  return {
    width: 474,
    height: 320,
    paddingLeft: 46,
    paddingRight: 18,
    paddingTop: 18,
    paddingBottom: 34,
    minX: -1.35,
    maxX: 1.35,
    minY: -1.35,
    maxY: 1.35,
    xTickStep: 0.5,
    yTickStep: 0.5,
  };
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.32;
}

function invertCartesianX(config: CartesianPlaneConfig, svgX: number) {
  const usableWidth = config.width - config.paddingLeft - config.paddingRight;
  const clampedX = clamp(svgX, config.paddingLeft, config.width - config.paddingRight);

  return (
    config.minX +
    ((clampedX - config.paddingLeft) / Math.max(usableWidth, Number.EPSILON)) *
      (config.maxX - config.minX)
  );
}

function invertCartesianY(config: CartesianPlaneConfig, svgY: number) {
  const usableHeight = config.height - config.paddingTop - config.paddingBottom;
  const clampedY = clamp(svgY, config.paddingTop, config.height - config.paddingBottom);

  return (
    config.maxY -
    ((clampedY - config.paddingTop) / Math.max(usableHeight, Number.EPSILON)) *
      (config.maxY - config.minY)
  );
}

function buildAngleArc(centerX: number, centerY: number, radius: number, angle: number) {
  const normalized = normalizeAngle(angle);

  if (radius <= 0 || normalized <= 0.02) {
    return null;
  }

  const start = {
    x: centerX + radius,
    y: centerY,
  };
  const end = {
    x: centerX + Math.cos(normalized) * radius,
    y: centerY - Math.sin(normalized) * radius,
  };
  const largeArcFlag = normalized > Math.PI ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function describeAxisSign(sign: "positive" | "negative" | "zero") {
  if (sign === "positive") {
    return "> 0";
  }

  if (sign === "negative") {
    return "< 0";
  }

  return "= 0";
}

function nudgePhaseValue(phase: number, delta: number) {
  return Number(normalizeAngle(phase + delta).toFixed(3));
}

export function UnitCircleRotationSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: UnitCircleRotationSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const plane = buildPlaneConfig();
  const displayTime =
    graphPreview?.kind === "time" || graphPreview?.kind === "trajectory"
      ? graphPreview.time
      : time;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primaryResolved = resolveUnitCircleRotationParams(primaryParams);
  const secondaryResolved = secondaryParams
    ? resolveUnitCircleRotationParams(secondaryParams)
    : null;
  const primary = sampleUnitCircleRotationState(primaryResolved, displayTime);
  const secondary = secondaryResolved
    ? sampleUnitCircleRotationState(secondaryResolved, displayTime)
    : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? "Variant"
      : compare.labelA ?? "Baseline"
    : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? "Baseline"
      : compare.labelB ?? "Variant"
    : null;
  const previewBadge =
    graphPreview && (graphPreview.kind === "time" || graphPreview.kind === "trajectory") ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        preview {graphPreview.seriesLabel} t = {formatNumber(displayTime)} s
      </span>
    ) : null;
  const origin = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, 0),
  };
  const circleRadius = projectCartesianX(plane, 1) - origin.x;
  const primaryPoint = {
    x: projectCartesianX(plane, primary.x),
    y: projectCartesianY(plane, primary.y),
  };
  const secondaryPoint = secondary
    ? {
        x: projectCartesianX(plane, secondary.x),
        y: projectCartesianY(plane, secondary.y),
      }
    : null;
  const projectionGuides = overlayValues?.projectionGuides ?? true;
  const angleMarker = overlayValues?.angleMarker ?? true;
  const quadrantSigns = overlayValues?.quadrantSigns ?? true;
  const rotationTrail = overlayValues?.rotationTrail ?? true;
  const angleArcPath = buildAngleArc(origin.x, origin.y, circleRadius * 0.42, primary.wrappedAngle);
  const secondaryAngleArcPath =
    secondary && rotationTrail
      ? buildAngleArc(origin.x, origin.y, circleRadius * 0.58, secondary.wrappedAngle)
      : null;
  const readoutRows = [
    { label: "theta", value: formatMeasurement(primary.angleDeg, "deg") },
    { label: "omega", value: formatMeasurement(primaryResolved.angularSpeed, "rad/s") },
    { label: "cos(theta)", value: formatNumber(primary.x) },
    { label: "sin(theta)", value: formatNumber(primary.y) },
    { label: "region", value: primary.regionLabel },
    { label: "period", value: formatMeasurement(primary.period, "s") },
  ];
  const noteLines = [
    `${primary.regionLabel}: cos ${describeAxisSign(primary.cosineSign)}, sin ${describeAxisSign(primary.sineSign)}.`,
    "cos = x on the horizontal axis.",
    "sin = y on the vertical axis.",
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target: DragTarget, location) => {
      const localX = location.svgX - PLANE_X;
      const localY = location.svgY - PLANE_Y;
      const x = invertCartesianX(plane, localX);
      const y = invertCartesianY(plane, localY);

      if (Math.hypot(x, y) < 0.14) {
        return;
      }

      const nextAngle = normalizeAngle(Math.atan2(y, x));
      const nextPhase = phaseFromAngle(nextAngle, displayTime, primaryResolved.angularSpeed);
      setParam("phase", Number(nextPhase.toFixed(3)));
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(78,166,223,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep one rotating point, its x and y projections, and the sine-cosine traces tied
              to the same angle so the unit circle reads as a live source for both functions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
            {compare ? (
              <>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {primaryLabel}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {secondaryLabel}
                </span>
              </>
            ) : null}
            {previewBadge}
            <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
              Drag the point or use the phase slider
            </span>
          </div>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) =>
          drag.handlePointerMove(event.pointerId, event.clientX, event.clientY)
        }
        onPointerUp={(event) => drag.handlePointerUp(event.pointerId)}
        onPointerCancel={(event) => drag.handlePointerCancel(event.pointerId)}
        onLostPointerCapture={drag.handleLostPointerCapture}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.52)" />
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane config={plane} xLabel="x = cos(theta)" yLabel="y = sin(theta)" />
          <circle
            cx={origin.x}
            cy={origin.y}
            r={circleRadius}
            fill="none"
            stroke="rgba(15,28,36,0.2)"
            strokeWidth="3"
          />
          {secondaryAngleArcPath ? (
            <path
              d={secondaryAngleArcPath}
              fill="none"
              stroke="rgba(241,102,89,0.48)"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
          ) : null}
          {rotationTrail && angleArcPath ? (
            <path
              d={angleArcPath}
              fill="none"
              stroke="#f0ab3c"
              strokeWidth="4"
              strokeLinecap="round"
              opacity={overlayOpacity(focusedOverlayId, "rotationTrail")}
            />
          ) : null}
          {quadrantSigns ? (
            <>
              <text
                x={projectCartesianX(plane, 0.62)}
                y={projectCartesianY(plane, 0.68)}
                textAnchor="middle"
                className="fill-ink-400 text-[13px] font-semibold uppercase tracking-[0.16em]"
                opacity={overlayOpacity(focusedOverlayId, "quadrantSigns")}
              >
                QI
              </text>
              <text
                x={projectCartesianX(plane, -0.62)}
                y={projectCartesianY(plane, 0.68)}
                textAnchor="middle"
                className="fill-ink-400 text-[13px] font-semibold uppercase tracking-[0.16em]"
                opacity={overlayOpacity(focusedOverlayId, "quadrantSigns")}
              >
                QII
              </text>
              <text
                x={projectCartesianX(plane, -0.62)}
                y={projectCartesianY(plane, -0.68)}
                textAnchor="middle"
                className="fill-ink-400 text-[13px] font-semibold uppercase tracking-[0.16em]"
                opacity={overlayOpacity(focusedOverlayId, "quadrantSigns")}
              >
                QIII
              </text>
              <text
                x={projectCartesianX(plane, 0.62)}
                y={projectCartesianY(plane, -0.68)}
                textAnchor="middle"
                className="fill-ink-400 text-[13px] font-semibold uppercase tracking-[0.16em]"
                opacity={overlayOpacity(focusedOverlayId, "quadrantSigns")}
              >
                QIV
              </text>
            </>
          ) : null}
          {secondaryPoint ? (
            <>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={secondaryPoint.x}
                y2={secondaryPoint.y}
                stroke="rgba(241,102,89,0.58)"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <circle
                cx={secondaryPoint.x}
                cy={secondaryPoint.y}
                r="7"
                fill="rgba(241,102,89,0.18)"
                stroke="rgba(241,102,89,0.72)"
                strokeWidth="2.5"
              />
            </>
          ) : null}
          <line
            x1={origin.x}
            y1={origin.y}
            x2={primaryPoint.x}
            y2={primaryPoint.y}
            stroke="#315063"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {projectionGuides ? (
            <g opacity={overlayOpacity(focusedOverlayId, "projectionGuides")}>
              <line
                x1={origin.x}
                y1={primaryPoint.y}
                x2={primaryPoint.x}
                y2={primaryPoint.y}
                stroke="rgba(78,166,223,0.68)"
                strokeWidth="2.5"
                strokeDasharray="7 5"
              />
              <line
                x1={primaryPoint.x}
                y1={origin.y}
                x2={primaryPoint.x}
                y2={primaryPoint.y}
                stroke="rgba(30,166,162,0.68)"
                strokeWidth="2.5"
                strokeDasharray="7 5"
              />
              <circle cx={primaryPoint.x} cy={origin.y} r="6" fill="#1ea6a2" />
              <circle cx={origin.x} cy={primaryPoint.y} r="6" fill="#4ea6df" />
              <text
                x={primaryPoint.x}
                y={origin.y + 24}
                textAnchor="middle"
                className="fill-teal-700 text-[11px] font-semibold"
              >
                cos(theta)
              </text>
              <text
                x={origin.x - 12}
                y={primaryPoint.y - 10}
                textAnchor="end"
                className="fill-sky-700 text-[11px] font-semibold"
              >
                sin(theta)
              </text>
            </g>
          ) : null}
          {angleMarker && angleArcPath ? (
            <>
              <path
                d={angleArcPath}
                fill="none"
                stroke="#f0ab3c"
                strokeWidth="4"
                strokeLinecap="round"
                opacity={overlayOpacity(focusedOverlayId, "angleMarker")}
              />
              <text
                x={origin.x + circleRadius * 0.36}
                y={origin.y - 16}
                className="fill-amber-700 text-[12px] font-semibold uppercase tracking-[0.14em]"
                opacity={overlayOpacity(focusedOverlayId, "angleMarker")}
              >
                theta
              </text>
            </>
          ) : null}
          <g
            role="button"
            aria-label="Draggable unit circle point"
            tabIndex={0}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "point", event.clientX, event.clientY)
            }
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                setParam("phase", nudgePhaseValue(primaryResolved.phase, -0.12));
              }

              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                setParam("phase", nudgePhaseValue(primaryResolved.phase, 0.12));
              }
            }}
          >
            <circle
              cx={primaryPoint.x}
              cy={primaryPoint.y}
              r="11"
              fill="#1ea6a2"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="3"
            />
            <circle
              cx={primaryPoint.x}
              cy={primaryPoint.y}
              r="17"
              fill="transparent"
              stroke="transparent"
              strokeWidth="12"
            />
          </g>
          <text
            x={origin.x}
            y={plane.height - 6}
            textAnchor="middle"
            className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            cosine stays on x, sine stays on y
          </text>
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Projection readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
        {quadrantSigns ? (
          <g
            transform={`translate(${QUADRANT_PANEL_X} ${QUADRANT_PANEL_Y})`}
            opacity={overlayOpacity(focusedOverlayId, "quadrantSigns")}
          >
            <text
              x="0"
              y="-10"
              className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
            >
              Sign map
            </text>
            {QUADRANT_CARDS.map((card) => {
              const active = primary.regionLabel === card.id;
              return (
                <g key={card.id} transform={`translate(${card.x} ${card.y})`}>
                  <rect
                    x="0"
                    y="0"
                    width={QUADRANT_CARD_WIDTH}
                    height={QUADRANT_CARD_HEIGHT}
                    rx="16"
                    fill={active ? "rgba(30,166,162,0.16)" : "rgba(255,253,247,0.9)"}
                    stroke={active ? "rgba(30,166,162,0.54)" : "rgba(15,28,36,0.12)"}
                    strokeWidth="1.5"
                  />
                  <text
                    x="14"
                    y="20"
                    className={
                      active
                        ? "fill-teal-800 text-[11px] font-semibold uppercase tracking-[0.16em]"
                        : "fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    }
                  >
                    {card.shortLabel}
                  </text>
                  <text x="14" y="36" className="fill-ink-950 text-[12px] font-semibold">
                    {card.cosLabel}
                  </text>
                  <text x="14" y="50" className="fill-ink-700 text-[11px] font-medium">
                    {card.sinLabel}
                  </text>
                </g>
              );
            })}
            {!primary.regionLabel.startsWith("Quadrant") ? (
              <text x="0" y="140" className="fill-ink-500 text-[11px]">
                Current point is on an axis, so one projection is exactly zero.
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </section>
  );
}
