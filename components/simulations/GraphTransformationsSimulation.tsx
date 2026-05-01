"use client";

import { useMemo, useRef } from "react";
import {
  buildGraphTransformationsSeries,
  clamp,
  formatNumber,
  GRAPH_TRANSFORMATIONS_DOMAIN_MAX,
  GRAPH_TRANSFORMATIONS_DOMAIN_MIN,
  GRAPH_TRANSFORMATIONS_MAX_SHIFT,
  GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SHIFT,
  GRAPH_TRANSFORMATIONS_MIN_SHIFT,
  GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SHIFT,
  mapRange,
  sampleGraphTransformationsState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import { useSvgPointerDrag } from "./primitives/useSvgPointerDrag";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type GraphTransformationsSimulationProps = {
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
const PLOT_LEFT = 56;
const PLOT_RIGHT = 642;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 304;
const Y_MIN = -6.5;
const Y_MAX = 6.5;
const CARD_WIDTH = 192;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const GRID_TICKS = [-4, -2, 0, 2, 4];

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => {
      const svgX = mapRange(
        point.x,
        GRAPH_TRANSFORMATIONS_DOMAIN_MIN,
        GRAPH_TRANSFORMATIONS_DOMAIN_MAX,
        PLOT_LEFT,
        PLOT_RIGHT,
      );
      const svgY = mapRange(point.y, Y_MIN, Y_MAX, PLOT_BOTTOM, PLOT_TOP);
      return `${index === 0 ? "M" : "L"} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
    })
    .join(" ");
}

function projectX(x: number) {
  return mapRange(
    x,
    GRAPH_TRANSFORMATIONS_DOMAIN_MIN,
    GRAPH_TRANSFORMATIONS_DOMAIN_MAX,
    PLOT_LEFT,
    PLOT_RIGHT,
  );
}

function projectY(y: number) {
  return mapRange(y, Y_MIN, Y_MAX, PLOT_BOTTOM, PLOT_TOP);
}

function svgXToDomain(svgX: number) {
  return mapRange(
    svgX,
    PLOT_LEFT,
    PLOT_RIGHT,
    GRAPH_TRANSFORMATIONS_DOMAIN_MIN,
    GRAPH_TRANSFORMATIONS_DOMAIN_MAX,
  );
}

function svgYToRange(svgY: number) {
  return mapRange(svgY, PLOT_BOTTOM, PLOT_TOP, Y_MIN, Y_MAX);
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.35;
}

export function GraphTransformationsSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: GraphTransformationsSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleGraphTransformationsState(primaryParams);
  const secondarySnapshot = secondaryParams
    ? sampleGraphTransformationsState(secondaryParams)
    : null;
  const primarySeries = buildGraphTransformationsSeries(primaryParams)["function-graph"];
  const secondarySeries = secondaryParams
    ? buildGraphTransformationsSeries(secondaryParams)["function-graph"]
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
  const previewPoint =
    graphPreview?.graphId === "function-graph" ? graphPreview.point : null;
  const showReferenceCurve = overlayValues?.referenceCurve ?? true;
  const showVertexMarkers = overlayValues?.vertexMarkers ?? true;
  const showShiftGuide = overlayValues?.shiftGuide ?? true;

  const readoutRows = useMemo(
    () => [
      { label: "h", value: formatNumber(primarySnapshot.horizontalShift) },
      { label: "k", value: formatNumber(primarySnapshot.verticalShift) },
      { label: "a", value: formatNumber(primarySnapshot.verticalScale) },
      {
        label: "vertex",
        value: `(${formatNumber(primarySnapshot.vertexX)}, ${formatNumber(primarySnapshot.vertexY)})`,
      },
      { label: "y-int", value: formatNumber(primarySnapshot.yIntercept) },
    ],
    [primarySnapshot],
  );

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (_target: "vertex", location) => {
      const reflectedBaseVertexX = primarySnapshot.mirrorY
        ? -primarySnapshot.baseVertexX
        : primarySnapshot.baseVertexX;
      const nextVertexX = clamp(
        svgXToDomain(location.svgX),
        GRAPH_TRANSFORMATIONS_DOMAIN_MIN,
        GRAPH_TRANSFORMATIONS_DOMAIN_MAX,
      );
      const nextVertexY = clamp(svgYToRange(location.svgY), Y_MIN, Y_MAX);
      const nextHorizontalShift = clamp(
        nextVertexX - reflectedBaseVertexX,
        GRAPH_TRANSFORMATIONS_MIN_SHIFT,
        GRAPH_TRANSFORMATIONS_MAX_SHIFT,
      );
      const nextVerticalShift = clamp(
        nextVertexY - primarySnapshot.verticalScale * primarySnapshot.baseVertexY,
        GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SHIFT,
        GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SHIFT,
      );

      setParam("horizontalShift", Number(nextHorizontalShift.toFixed(2)));
      setParam("verticalShift", Number(nextVerticalShift.toFixed(2)));
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(78,166,223,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">Graph transformations</p>
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
            {graphPreview ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                Preview {graphPreview.seriesLabel}
              </span>
            ) : null}
            <p>Drag the highlighted vertex to reposition the transformed graph.</p>
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
        {GRID_TICKS.map((tick) => (
          <g key={`grid-${tick}`}>
            <line
              x1={projectX(tick)}
              x2={projectX(tick)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="rgba(15,28,36,0.08)"
            />
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={projectY(tick)}
              y2={projectY(tick)}
              stroke="rgba(15,28,36,0.08)"
            />
            <text
              x={projectX(tick)}
              y={PLOT_BOTTOM + 16}
              textAnchor="middle"
              className="fill-ink-500 text-[11px]"
            >
              {formatNumber(tick)}
            </text>
            {tick !== 0 ? (
              <text
                x={PLOT_LEFT - 10}
                y={projectY(tick) + 4}
                textAnchor="end"
                className="fill-ink-500 text-[11px]"
              >
                {formatNumber(tick)}
              </text>
            ) : null}
          </g>
        ))}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={projectY(0)}
          y2={projectY(0)}
          stroke="rgba(15,28,36,0.34)"
          strokeWidth="2"
        />
        <line
          x1={projectX(0)}
          x2={projectX(0)}
          y1={PLOT_TOP}
          y2={PLOT_BOTTOM}
          stroke="rgba(15,28,36,0.34)"
          strokeWidth="2"
        />
        <text
          x={PLOT_RIGHT - 6}
          y={projectY(0) - 8}
          textAnchor="end"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          x
        </text>
        <text
          x={projectX(0) + 8}
          y={PLOT_TOP + 12}
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          y
        </text>
        <g transform={`translate(${PLOT_LEFT + 12} ${PLOT_TOP + 18})`}>
          <line x1="0" x2="22" y1="0" y2="0" stroke="rgba(49,80,99,0.78)" strokeDasharray="8 7" strokeWidth="3" />
          <text x="28" y="4" className="fill-ink-600 text-[11px] font-semibold">
            Parent curve
          </text>
          <line x1="0" x2="22" y1="18" y2="18" stroke="#1ea6a2" strokeWidth="3.5" />
          <text x="28" y="22" className="fill-teal-700 text-[11px] font-semibold">
            Current transform
          </text>
          {secondarySeries?.[1] ? (
            <>
              <line
                x1="0"
                x2="22"
                y1="36"
                y2="36"
                stroke="rgba(15,28,36,0.48)"
                strokeDasharray="10 8"
                strokeWidth="3"
              />
              <text x="28" y="40" className="fill-ink-600 text-[11px] font-semibold">
                {secondaryLabel} comparison
              </text>
            </>
          ) : null}
        </g>
        {showReferenceCurve && primarySeries?.[0] ? (
          <path
            d={buildPath(primarySeries[0].points)}
            fill="none"
            stroke="rgba(49,80,99,0.78)"
            strokeDasharray="8 7"
            strokeWidth="3"
            opacity={overlayOpacity(focusedOverlayId, "referenceCurve")}
          />
        ) : null}
        {secondarySeries?.[1] ? (
          <path
            d={buildPath(secondarySeries[1].points)}
            fill="none"
            stroke="rgba(15,28,36,0.48)"
            strokeDasharray="10 8"
            strokeWidth="3.2"
          />
        ) : null}
        {primarySeries?.[1] ? (
          <path
            d={buildPath(primarySeries[1].points)}
            fill="none"
            stroke="#1ea6a2"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}
        {showShiftGuide ? (
          <g opacity={overlayOpacity(focusedOverlayId, "shiftGuide")}>
            <line
              x1={projectX(primarySnapshot.baseVertexX)}
              x2={projectX(primarySnapshot.vertexX)}
              y1={projectY(primarySnapshot.baseVertexY)}
              y2={projectY(primarySnapshot.baseVertexY)}
              stroke="rgba(78,166,223,0.8)"
              strokeDasharray="7 6"
              strokeWidth="2.5"
            />
            <line
              x1={projectX(primarySnapshot.vertexX)}
              x2={projectX(primarySnapshot.vertexX)}
              y1={projectY(primarySnapshot.baseVertexY)}
              y2={projectY(primarySnapshot.vertexY)}
              stroke="rgba(240,171,60,0.84)"
              strokeDasharray="7 6"
              strokeWidth="2.5"
            />
            <text
              x={(projectX(primarySnapshot.baseVertexX) + projectX(primarySnapshot.vertexX)) / 2}
              y={projectY(primarySnapshot.baseVertexY) - 10}
              textAnchor="middle"
              className="fill-sky-700 text-[11px] font-semibold"
            >
              horizontal shift = {formatNumber(primarySnapshot.horizontalShift)}
            </text>
            <text
              x={projectX(primarySnapshot.vertexX) + 10}
              y={(projectY(primarySnapshot.baseVertexY) + projectY(primarySnapshot.vertexY)) / 2}
              className="fill-amber-700 text-[11px] font-semibold"
            >
              vertical shift = {formatNumber(primarySnapshot.verticalShift)}
            </text>
          </g>
        ) : null}
        {showVertexMarkers ? (
          <g opacity={overlayOpacity(focusedOverlayId, "vertexMarkers")}>
            <circle
              cx={projectX(primarySnapshot.baseVertexX)}
              cy={projectY(primarySnapshot.baseVertexY)}
              r="5"
              fill="rgba(49,80,99,0.78)"
            />
            <text
              x={projectX(primarySnapshot.baseVertexX)}
              y={projectY(primarySnapshot.baseVertexY) - 12}
              textAnchor="middle"
              className="fill-ink-500 text-[11px] font-semibold"
            >
              Base vertex
            </text>
            {secondarySnapshot ? (
              <>
                <circle
                  cx={projectX(secondarySnapshot.vertexX)}
                  cy={projectY(secondarySnapshot.vertexY)}
                  r="5"
                  fill="rgba(15,28,36,0.55)"
                />
                <text
                  x={projectX(secondarySnapshot.vertexX)}
                  y={projectY(secondarySnapshot.vertexY) - 12}
                  textAnchor="middle"
                  className="fill-ink-500 text-[11px] font-semibold"
                >
                  {secondaryLabel}
                </text>
              </>
            ) : null}
          </g>
        ) : null}
        <circle
          cx={projectX(primarySnapshot.vertexX)}
          cy={projectY(primarySnapshot.vertexY)}
          r={drag.activePointerId === null ? 8 : 10}
          fill="#1ea6a2"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="3"
          style={{ cursor: "grab" }}
          onPointerDown={(event) =>
            drag.startDrag(event.pointerId, "vertex", event.clientX, event.clientY)
          }
        />
        <text
          x={projectX(primarySnapshot.vertexX)}
          y={projectY(primarySnapshot.vertexY) - 14}
          textAnchor="middle"
          className="fill-teal-700 text-[11px] font-semibold"
        >
          {primaryLabel}
        </text>
        {previewPoint ? (
          <circle
            cx={projectX(previewPoint.x)}
            cy={projectY(previewPoint.y)}
            r="6"
            fill="#f16659"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="2.5"
          />
        ) : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Current transform"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={[
            primarySnapshot.verticalScale < 0
              ? "Negative a reflects the graph across the x-axis."
              : Math.abs(primarySnapshot.verticalScale) < 1
                ? "Small |a| compresses the graph vertically."
                : Math.abs(primarySnapshot.verticalScale) > 1
                  ? "Large |a| stretches the graph vertically."
                  : "a = 1 keeps the original vertical scale.",
            primarySnapshot.mirrorY
              ? "Reflect across y-axis is on, so the inside input flips left-right before the shift."
              : "Reflect across y-axis is off, so the inside input keeps its original left-right orientation.",
          ]}
        />
      </svg>
    </section>
  );
}
