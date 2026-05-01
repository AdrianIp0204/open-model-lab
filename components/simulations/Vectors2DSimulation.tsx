"use client";

import { useRef } from "react";
import {
  clamp,
  formatNumber,
  resolveVectors2DViewport,
  sampleVectors2DState,
  VECTORS_2D_COMPONENT_MAX,
  VECTORS_2D_COMPONENT_MIN,
  VECTORS_2D_SCALAR_MAX,
  VECTORS_2D_SCALAR_MIN,
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

type Vectors2DSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "vector-a" | "vector-b";

const WIDTH = 840;
const HEIGHT = 356;
const PLANE_X = 20;
const PLANE_Y = 24;
const CARD_X = 596;
const CARD_Y = 184;
const CARD_WIDTH = 220;

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.34;
}

function buildPlaneConfig(maxAbsCoordinate: number): CartesianPlaneConfig {
  return {
    width: 548,
    height: 300,
    paddingLeft: 42,
    paddingRight: 16,
    paddingTop: 18,
    paddingBottom: 28,
    minX: -maxAbsCoordinate,
    maxX: maxAbsCoordinate,
    minY: -maxAbsCoordinate,
    maxY: maxAbsCoordinate,
    xTickStep: 2,
    yTickStep: 2,
  };
}

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

function invertCartesianY(config: CartesianPlaneConfig, svgY: number) {
  const usableHeight = config.height - config.paddingTop - config.paddingBottom;
  const clampedY = clamp(
    svgY,
    config.paddingTop,
    config.height - config.paddingBottom,
  );

  return (
    config.maxY -
    ((clampedY - config.paddingTop) / Math.max(usableHeight, Number.EPSILON)) *
      (config.maxY - config.minY)
  );
}

function roundToTenth(value: number) {
  return Number(value.toFixed(1));
}

function getLineLabelPosition(start: { x: number; y: number }, end: { x: number; y: number }) {
  return {
    x: start.x + (end.x - start.x) * 0.56,
    y: start.y + (end.y - start.y) * 0.56,
  };
}

export function Vectors2DSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: Vectors2DSimulationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewScalar =
    graphPreview?.kind === "response"
      ? clamp(graphPreview.point.x, VECTORS_2D_SCALAR_MIN, VECTORS_2D_SCALAR_MAX)
      : null;
  const livePrimaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams =
    previewScalar === null ? livePrimaryParams : { ...livePrimaryParams, scalar: previewScalar };
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleVectors2DState(primaryParams);
  const secondarySnapshot = secondaryParams ? sampleVectors2DState(secondaryParams) : null;
  const viewport = resolveVectors2DViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const plane = buildPlaneConfig(viewport.maxAbsCoordinate);
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
  const showComponentGuides = overlayValues?.componentGuides ?? true;
  const showTipToTail = overlayValues?.tipToTail ?? true;
  const showScaledVector = overlayValues?.scaledVector ?? true;

  const origin = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, 0),
  };
  const vectorAEnd = {
    x: projectCartesianX(plane, primarySnapshot.ax),
    y: projectCartesianY(plane, primarySnapshot.ay),
  };
  const vectorBEnd = {
    x: projectCartesianX(plane, primarySnapshot.bx),
    y: projectCartesianY(plane, primarySnapshot.by),
  };
  const scaledAEnd = {
    x: projectCartesianX(plane, primarySnapshot.scaledAx),
    y: projectCartesianY(plane, primarySnapshot.scaledAy),
  };
  const resultEnd = {
    x: projectCartesianX(plane, primarySnapshot.resultX),
    y: projectCartesianY(plane, primarySnapshot.resultY),
  };
  const translatedBBase = scaledAEnd;
  const secondaryResultEnd = secondarySnapshot
    ? {
        x: projectCartesianX(plane, secondarySnapshot.resultX),
        y: projectCartesianY(plane, secondarySnapshot.resultY),
      }
    : null;
  const translatedBLabel = primarySnapshot.subtractMode ? "-B" : "B";
  const resultLabelPosition = getLineLabelPosition(origin, resultEnd);
  const scaledLabelPosition = getLineLabelPosition(origin, scaledAEnd);
  const translatedBLabelPosition = getLineLabelPosition(translatedBBase, resultEnd);
  const resultComponentX = {
    x: projectCartesianX(plane, primarySnapshot.resultX),
    y: projectCartesianY(plane, 0),
  };
  const resultComponentY = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, primarySnapshot.resultY),
  };
  const readoutRows = [
    {
      label: "A",
      value: `<${formatNumber(primarySnapshot.ax)}, ${formatNumber(primarySnapshot.ay)}>`,
    },
    {
      label: "B",
      value: `<${formatNumber(primarySnapshot.bx)}, ${formatNumber(primarySnapshot.by)}>`,
    },
    {
      label: "sA",
      value: `<${formatNumber(primarySnapshot.scaledAx)}, ${formatNumber(primarySnapshot.scaledAy)}>`,
    },
    {
      label: "result",
      value: `<${formatNumber(primarySnapshot.resultX)}, ${formatNumber(primarySnapshot.resultY)}>`,
    },
    {
      label: "|result|",
      value: formatNumber(primarySnapshot.resultMagnitude),
    },
  ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: DragTarget, location) => {
      const localX = location.svgX - PLANE_X;
      const localY = location.svgY - PLANE_Y;
      const nextX = roundToTenth(
        clamp(invertCartesianX(plane, localX), VECTORS_2D_COMPONENT_MIN, VECTORS_2D_COMPONENT_MAX),
      );
      const nextY = roundToTenth(
        clamp(invertCartesianY(plane, localY), VECTORS_2D_COMPONENT_MIN, VECTORS_2D_COMPONENT_MAX),
      );

      if (target === "vector-a") {
        setParam("ax", nextX);
        setParam("ay", nextY);
        return;
      }

      setParam("bx", nextX);
      setParam("by", nextY);
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(240,171,60,0.08),rgba(78,166,223,0.08))] px-3 py-2">
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
            <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primarySnapshot.subtractMode ? "sA - B" : "sA + B"}
            </span>
            {previewBadge ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                Preview {previewBadge}
              </span>
            ) : null}
            <p>Drag A and B on the plane. Use the scalar to stretch or flip A.</p>
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
        <defs>
          <marker
            id="vectors-a-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1ea6a2" />
          </marker>
          <marker
            id="vectors-b-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f16659" />
          </marker>
          <marker
            id="vectors-scaled-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0ab3c" />
          </marker>
          <marker
            id="vectors-result-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4ea6df" />
          </marker>
          <marker
            id="vectors-ghost-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(15,28,36,0.48)" />
          </marker>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane
            config={plane}
            xLabel="x"
            yLabel="y"
            backgroundFill="rgba(255,255,255,0.7)"
          />
          <g transform={`translate(${plane.paddingLeft + 8} ${plane.paddingTop + 18})`}>
            <line x1="0" x2="22" y1="0" y2="0" stroke="#1ea6a2" strokeWidth="3.5" />
            <text x="28" y="4" className="fill-teal-700 text-[11px] font-semibold">
              A
            </text>
            <line x1="0" x2="22" y1="18" y2="18" stroke="#f0ab3c" strokeWidth="3.5" />
            <text x="28" y="22" className="fill-amber-700 text-[11px] font-semibold">
              sA
            </text>
            <line x1="0" x2="22" y1="36" y2="36" stroke="#f16659" strokeWidth="3.5" />
            <text x="28" y="40" className="fill-coral-700 text-[11px] font-semibold">
              {translatedBLabel}
            </text>
            <line x1="0" x2="22" y1="54" y2="54" stroke="#4ea6df" strokeWidth="3.5" />
            <text x="28" y="58" className="fill-sky-700 text-[11px] font-semibold">
              Result
            </text>
          </g>
          {secondaryResultEnd ? (
            <>
              <line
                x1={origin.x}
                x2={secondaryResultEnd.x}
                y1={origin.y}
                y2={secondaryResultEnd.y}
                stroke="rgba(15,28,36,0.48)"
                strokeDasharray="8 7"
                strokeWidth="3"
                markerEnd="url(#vectors-ghost-arrow)"
                opacity="0.58"
              />
              <circle
                cx={secondaryResultEnd.x}
                cy={secondaryResultEnd.y}
                r="4.5"
                fill="rgba(15,28,36,0.52)"
                opacity="0.58"
              />
            </>
          ) : null}
          <line
            x1={origin.x}
            x2={vectorAEnd.x}
            y1={origin.y}
            y2={vectorAEnd.y}
            stroke="#1ea6a2"
            strokeWidth="4"
            markerEnd="url(#vectors-a-arrow)"
          />
          <text
            x={vectorAEnd.x + 10}
            y={vectorAEnd.y - 10}
            className="fill-teal-700 text-[11px] font-semibold"
          >
            A
          </text>
          <line
            x1={origin.x}
            x2={vectorBEnd.x}
            y1={origin.y}
            y2={vectorBEnd.y}
            stroke="rgba(241,102,89,0.42)"
            strokeWidth="3.2"
            markerEnd="url(#vectors-b-arrow)"
          />
          <text
            x={vectorBEnd.x + 10}
            y={vectorBEnd.y + 12}
            className="fill-coral-700 text-[11px] font-semibold"
          >
            B
          </text>
          {showScaledVector ? (
            <>
              <line
                x1={origin.x}
                x2={scaledAEnd.x}
                y1={origin.y}
                y2={scaledAEnd.y}
                stroke="#f0ab3c"
                strokeWidth="4"
                markerEnd="url(#vectors-scaled-arrow)"
                opacity={overlayOpacity(focusedOverlayId, "scaledVector")}
              />
              <text
                x={scaledLabelPosition.x + 10}
                y={scaledLabelPosition.y - 10}
                className="fill-amber-700 text-[11px] font-semibold"
                opacity={overlayOpacity(focusedOverlayId, "scaledVector")}
              >
                sA
              </text>
            </>
          ) : null}
          {showTipToTail ? (
            <>
              <line
                x1={translatedBBase.x}
                x2={resultEnd.x}
                y1={translatedBBase.y}
                y2={resultEnd.y}
                stroke="#f16659"
                strokeWidth="3.4"
                markerEnd="url(#vectors-b-arrow)"
                opacity={overlayOpacity(focusedOverlayId, "tipToTail")}
              />
              <text
                x={translatedBLabelPosition.x + 10}
                y={translatedBLabelPosition.y + 14}
                className="fill-coral-700 text-[11px] font-semibold"
                opacity={overlayOpacity(focusedOverlayId, "tipToTail")}
              >
                {translatedBLabel}
              </text>
            </>
          ) : null}
          <line
            x1={origin.x}
            x2={resultEnd.x}
            y1={origin.y}
            y2={resultEnd.y}
            stroke="#4ea6df"
            strokeWidth="4.6"
            markerEnd="url(#vectors-result-arrow)"
          />
          <text
            x={resultLabelPosition.x + 10}
            y={resultLabelPosition.y - 12}
            className="fill-sky-700 text-[11px] font-semibold"
          >
            result
          </text>
          {showComponentGuides ? (
            <g opacity={overlayOpacity(focusedOverlayId, "componentGuides")}>
              <line
                x1={origin.x}
                x2={resultComponentX.x}
                y1={resultEnd.y}
                y2={resultEnd.y}
                stroke="#f0ab3c"
                strokeDasharray="7 6"
                strokeWidth="2.5"
              />
              <line
                x1={resultEnd.x}
                x2={resultEnd.x}
                y1={origin.y}
                y2={resultEnd.y}
                stroke="#4ea6df"
                strokeDasharray="7 6"
                strokeWidth="2.5"
              />
              <text
                x={(origin.x + resultComponentX.x) / 2}
                y={resultEnd.y - 10}
                textAnchor="middle"
                className="fill-amber-700 text-[11px] font-semibold"
              >
                result x = {formatNumber(primarySnapshot.resultX)}
              </text>
              <text
                x={resultEnd.x + 10}
                y={(origin.y + resultComponentY.y) / 2}
                className="fill-sky-700 text-[11px] font-semibold"
              >
                result y = {formatNumber(primarySnapshot.resultY)}
              </text>
            </g>
          ) : null}
          <circle
            cx={vectorAEnd.x}
            cy={vectorAEnd.y}
            r={drag.activePointerId === null ? 8 : 10}
            fill="#1ea6a2"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "vector-a", event.clientX, event.clientY)
            }
          />
          <circle
            cx={vectorBEnd.x}
            cy={vectorBEnd.y}
            r={drag.activePointerId === null ? 8 : 10}
            fill="#f16659"
            stroke="rgba(255,255,255,0.94)"
            strokeWidth="3"
            style={{ cursor: "grab" }}
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "vector-b", event.clientX, event.clientY)
            }
          />
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Vector readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={[
            primarySnapshot.scalar < 0
              ? "Negative scalar flips A through the origin before it combines."
              : Math.abs(primarySnapshot.scalar) < 1
                ? "The scalar compresses A before the combination."
                : Math.abs(primarySnapshot.scalar) > 1
                  ? "The scalar stretches A before the combination."
                  : "The scalar keeps A at its original size.",
            primarySnapshot.subtractMode
              ? "Subtraction works by adding the opposite vector -B tip-to-tail."
              : "Addition uses the translated B arrow without changing its components.",
          ]}
        />
      </svg>
    </section>
  );
}
