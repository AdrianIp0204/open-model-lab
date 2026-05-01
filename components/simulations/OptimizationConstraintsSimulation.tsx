"use client";

import { useMemo, useRef } from "react";
import {
  clamp,
  formatNumber,
  optimizationConstraintArea,
  OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
  OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
  sampleOptimizationConstraintsState,
  sampleRange,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  buildCartesianPath,
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

type OptimizationConstraintsSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 820;
const HEIGHT = 340;
const STAGE_LEFT = 26;
const STAGE_TOP = 28;
const STAGE_WIDTH = 514;
const STAGE_HEIGHT = 284;
const FLOOR_Y = STAGE_TOP + STAGE_HEIGHT - 18;
const RECT_LEFT = STAGE_LEFT + 58;
const RECT_SCALE = 22;
const INSET_X = 558;
const INSET_Y = 42;
const INSET_PLANE: CartesianPlaneConfig = {
  width: 238,
  height: 132,
  paddingLeft: 36,
  paddingRight: 14,
  paddingTop: 16,
  paddingBottom: 24,
  minX: OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
  maxX: OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
  minY: 0,
  maxY: 40,
  xTickStep: 2,
  yTickStep: 8,
};
const CARD_X = 564;
const CARD_Y = 190;
const CARD_WIDTH = 232;

function invertCartesianX(config: CartesianPlaneConfig, svgX: number) {
  const usableWidth = config.width - config.paddingLeft - config.paddingRight;
  const clampedX = clamp(
    svgX,
    config.paddingLeft,
    config.width - config.paddingRight,
  );

  return (
    config.minX +
    ((clampedX - config.paddingLeft) / Math.max(usableWidth, Number.EPSILON)) *
      (config.maxX - config.minX)
  );
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.35;
}

function buildNoteLines(snapshot: ReturnType<typeof sampleOptimizationConstraintsState>) {
  if (Math.abs(snapshot.areaSlope) <= 0.12) {
    return [
      "The area curve is essentially flat here, so this width is the maximum-area case.",
      "Width and height match, which is why the square wins under the fixed perimeter.",
    ];
  }

  if (snapshot.areaSlope > 0) {
    return [
      "The area curve is still rising, so adding width would increase the area.",
      "This rectangle is narrower than the best square, so the saved height is not yet worth the lost width.",
    ];
  }

  return [
    "The area curve is falling, so this rectangle is already too wide for the fixed perimeter.",
    "Extra width is now costing more height than it gains area.",
  ];
}

function buildDimensionArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  color: string,
) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      <line x1={x1} x2={x2} y1={y1} y2={y2} stroke={color} strokeWidth="2.5" />
      <line x1={x1} x2={x1 + (x1 === x2 ? 0 : 8)} y1={y1} y2={y1 + (y1 === y2 ? 0 : -8)} stroke={color} strokeWidth="2.5" />
      <line x1={x2} x2={x2 - (x1 === x2 ? 0 : 8)} y1={y2} y2={y2 + (y1 === y2 ? 0 : 8)} stroke={color} strokeWidth="2.5" />
      <text x={midX} y={midY - (y1 === y2 ? 10 : 0)} textAnchor="middle" className="fill-ink-700 text-[11px] font-semibold">
        {label}
      </text>
    </g>
  );
}

export function OptimizationConstraintsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: OptimizationConstraintsSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewWidth =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
          OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
        )
      : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams =
    previewWidth === null ? livePrimaryParams : { ...livePrimaryParams, width: previewWidth };
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleOptimizationConstraintsState(primaryParams);
  const secondarySnapshot = secondaryParams
    ? sampleOptimizationConstraintsState(secondaryParams)
    : null;
  const primaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelB ?? "B"
      : compare.labelA ?? "A"
    : "Live";
  const secondaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelA ?? "A"
      : compare.labelB ?? "B"
    : "";
  const previewBadge = graphPreview ? graphPreview.seriesLabel : null;
  const showConstraintBand = overlayValues?.constraintBand ?? true;
  const showBestRectangle = overlayValues?.bestRectangle ?? true;
  const showAreaGuides = overlayValues?.areaGuides ?? true;

  const objectivePath = useMemo(
    () =>
      buildCartesianPath(
        INSET_PLANE,
        sampleRange(
          OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
          OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
          241,
        ).map((width) => ({
          x: width,
          y: optimizationConstraintArea(width),
        })),
      ),
    [],
  );

  const readoutRows = [
    { label: "w", value: `${formatNumber(primarySnapshot.width)} m` },
    { label: "h", value: `${formatNumber(primarySnapshot.height)} m` },
    { label: "A", value: `${formatNumber(primarySnapshot.area)} m^2` },
    { label: "A'(w)", value: formatNumber(primarySnapshot.areaSlope) },
    {
      label: "best",
      value: `${formatNumber(primarySnapshot.optimumArea)} m^2`,
    },
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: "corner" | "objective", location) => {
      const nextWidth =
        target === "corner"
          ? clamp(
              (location.svgX - RECT_LEFT) / RECT_SCALE,
              OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
              OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
            )
          : clamp(
              invertCartesianX(INSET_PLANE, location.svgX - INSET_X),
              OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
              OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
            );

      setParam("width", Number(nextWidth.toFixed(2)));
    },
  });

  const primaryRectWidth = primarySnapshot.width * RECT_SCALE;
  const primaryRectHeight = primarySnapshot.height * RECT_SCALE;
  const primaryRectTop = FLOOR_Y - primaryRectHeight;
  const primaryRectRight = RECT_LEFT + primaryRectWidth;
  const bestRectWidth = primarySnapshot.optimumWidth * RECT_SCALE;
  const bestRectTop = FLOOR_Y - primarySnapshot.optimumHeight * RECT_SCALE;

  const secondaryRectWidth = secondarySnapshot ? secondarySnapshot.width * RECT_SCALE : null;
  const secondaryRectHeight = secondarySnapshot ? secondarySnapshot.height * RECT_SCALE : null;
  const secondaryRectTop =
    secondarySnapshot && secondaryRectHeight !== null
      ? FLOOR_Y - secondaryRectHeight
      : null;

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.08),rgba(30,166,162,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">{concept.title}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-700">
            {compare ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {primaryLabel}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {secondaryLabel}
                </span>
              </div>
            ) : null}
            {previewBadge ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                Preview {previewBadge}
              </span>
            ) : null}
            <p>Drag the top-right corner or the objective point to change the width.</p>
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
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <rect
          x={STAGE_LEFT}
          y={STAGE_TOP}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx="20"
          fill="rgba(255,248,236,0.92)"
          stroke="rgba(15,28,36,0.08)"
        />
        <line
          x1={STAGE_LEFT + 28}
          x2={STAGE_LEFT + STAGE_WIDTH - 20}
          y1={FLOOR_Y}
          y2={FLOOR_Y}
          stroke="rgba(15,28,36,0.2)"
          strokeWidth="2.5"
        />
        <text
          x={STAGE_LEFT + 36}
          y={STAGE_TOP + 26}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Fixed perimeter: 24 m
        </text>
        {showBestRectangle ? (
          <g opacity={overlayOpacity(focusedOverlayId, "bestRectangle")}>
            <rect
              x={RECT_LEFT}
              y={bestRectTop}
              width={bestRectWidth}
              height={bestRectWidth}
              fill="rgba(78,166,223,0.08)"
              stroke="#4ea6df"
              strokeDasharray="10 7"
              strokeWidth="3"
              rx="10"
            />
            <text
              x={RECT_LEFT + bestRectWidth + 14}
              y={bestRectTop + 18}
              className="fill-sky-700 text-[11px] font-semibold"
            >
              best square
            </text>
          </g>
        ) : null}
        {secondarySnapshot && secondaryRectWidth !== null && secondaryRectHeight !== null && secondaryRectTop !== null ? (
          <rect
            x={RECT_LEFT}
            y={secondaryRectTop}
            width={secondaryRectWidth}
            height={secondaryRectHeight}
            fill="none"
            stroke="rgba(15,28,36,0.4)"
            strokeDasharray="10 8"
            strokeWidth="3"
            rx="8"
          />
        ) : null}
        <rect
          x={RECT_LEFT}
          y={primaryRectTop}
          width={primaryRectWidth}
          height={primaryRectHeight}
          fill="rgba(240,171,60,0.24)"
          stroke="#f0ab3c"
          strokeWidth="3.5"
          rx="10"
        />
        {showConstraintBand ? (
          <g opacity={overlayOpacity(focusedOverlayId, "constraintBand")}>
            <path
              d={[
                `M ${RECT_LEFT} ${primaryRectTop}`,
                `L ${primaryRectRight} ${primaryRectTop}`,
                `L ${primaryRectRight} ${FLOOR_Y}`,
                `L ${RECT_LEFT} ${FLOOR_Y}`,
                "Z",
              ].join(" ")}
              fill="none"
              stroke="rgba(241,102,89,0.92)"
              strokeDasharray="9 6"
              strokeWidth="3"
            />
            <text
              x={RECT_LEFT + primaryRectWidth / 2}
              y={primaryRectTop - 14}
              textAnchor="middle"
              className="fill-coral-700 text-[11px] font-semibold"
            >
              2w + 2h = 24
            </text>
          </g>
        ) : null}
        {showAreaGuides ? (
          <g opacity={overlayOpacity(focusedOverlayId, "areaGuides")}>
            {buildDimensionArrow(
              RECT_LEFT,
              FLOOR_Y + 18,
              primaryRectRight,
              FLOOR_Y + 18,
              `w = ${formatNumber(primarySnapshot.width)} m`,
              "#4ea6df",
            )}
            {buildDimensionArrow(
              primaryRectRight + 18,
              FLOOR_Y,
              primaryRectRight + 18,
              primaryRectTop,
              `h = ${formatNumber(primarySnapshot.height)} m`,
              "#1ea672",
            )}
          </g>
        ) : null}
        <circle
          cx={primaryRectRight}
          cy={primaryRectTop}
          r={drag.activePointerId === null ? 8 : 10}
          fill="#1ea6a2"
          stroke="rgba(255,255,255,0.94)"
          strokeWidth="3"
          style={{ cursor: "grab" }}
          onPointerDown={(event) =>
            drag.startDrag(event.pointerId, "corner", event.clientX, event.clientY)
          }
        />
        <text
          x={RECT_LEFT + primaryRectWidth / 2}
          y={FLOOR_Y + 38}
          textAnchor="middle"
          className="fill-ink-500 text-[11px]"
        >
          current rectangle
        </text>

        <g transform={`translate(${INSET_X} ${INSET_Y})`}>
          <CartesianPlane config={INSET_PLANE} xLabel="width w" yLabel="area A" />
          <text
            x={INSET_PLANE.paddingLeft}
            y={14}
            className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Objective graph
          </text>
          <path
            d={objectivePath}
            fill="none"
            stroke="#1ea6a2"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {showAreaGuides ? (
            <g opacity={overlayOpacity(focusedOverlayId, "areaGuides")}>
              <line
                x1={projectCartesianX(INSET_PLANE, primarySnapshot.width)}
                x2={projectCartesianX(INSET_PLANE, primarySnapshot.width)}
                y1={projectCartesianY(INSET_PLANE, 0)}
                y2={projectCartesianY(INSET_PLANE, primarySnapshot.area)}
                stroke="rgba(78,166,223,0.8)"
                strokeDasharray="7 6"
              />
              <line
                x1={projectCartesianX(INSET_PLANE, primarySnapshot.width)}
                x2={projectCartesianX(INSET_PLANE, OPTIMIZATION_CONSTRAINTS_WIDTH_MAX)}
                y1={projectCartesianY(INSET_PLANE, primarySnapshot.area)}
                y2={projectCartesianY(INSET_PLANE, primarySnapshot.area)}
                stroke="rgba(240,171,60,0.8)"
                strokeDasharray="7 6"
              />
            </g>
          ) : null}
          {secondarySnapshot ? (
            <circle
              cx={projectCartesianX(INSET_PLANE, secondarySnapshot.width)}
              cy={projectCartesianY(INSET_PLANE, secondarySnapshot.area)}
              r="5.5"
              fill="rgba(15,28,36,0.45)"
            />
          ) : null}
          {showBestRectangle ? (
            <circle
              cx={projectCartesianX(INSET_PLANE, primarySnapshot.optimumWidth)}
              cy={projectCartesianY(INSET_PLANE, primarySnapshot.optimumArea)}
              r="6"
              fill="#4ea6df"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="2"
            />
          ) : null}
          <circle
            cx={projectCartesianX(INSET_PLANE, primarySnapshot.width)}
            cy={projectCartesianY(INSET_PLANE, primarySnapshot.area)}
            r="7"
            fill="#f16659"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "objective", event.clientX, event.clientY)
            }
          />
          <text
            x={projectCartesianX(INSET_PLANE, primarySnapshot.width)}
            y={projectCartesianY(INSET_PLANE, primarySnapshot.area) - 12}
            textAnchor="middle"
            className="fill-coral-700 text-[11px] font-semibold"
          >
            {primaryLabel}
          </text>
        </g>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Constrained area"
          setupLabel={compare ? primaryLabel : null}
          rows={readoutRows}
          noteLines={buildNoteLines(primarySnapshot)}
        />
      </svg>
    </section>
  );
}
