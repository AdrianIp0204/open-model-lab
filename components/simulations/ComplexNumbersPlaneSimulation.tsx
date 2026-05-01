"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  clamp,
  formatNumber,
  formatComplex,
  resolveComplexNumbersPlaneViewport,
  sampleComplexNumbersPlaneState,
  COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
  COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
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

type ComplexNumbersPlaneSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type DragTarget = "z" | "w";

const WIDTH = 860;
const HEIGHT = 360;
const PLANE_X = 20;
const PLANE_Y = 20;
const CARD_X = 606;
const CARD_Y = 22;
const CARD_WIDTH = 228;

function buildPlaneConfig(maxAbsCoordinate: number): CartesianPlaneConfig {
  return {
    width: 560,
    height: 304,
    paddingLeft: 44,
    paddingRight: 18,
    paddingTop: 18,
    paddingBottom: 30,
    minX: -maxAbsCoordinate,
    maxX: maxAbsCoordinate,
    minY: -maxAbsCoordinate,
    maxY: maxAbsCoordinate,
    xTickStep: 2,
    yTickStep: 2,
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

function roundToTenth(value: number) {
  return Number(value.toFixed(1));
}

function buildPreviewSource(source: SimulationParams, preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "response") {
    return source;
  }

  if (preview.graphId === "addition-sweep" || preview.graphId === "multiplication-sweep") {
    return {
      ...source,
      operandReal: preview.point.x,
    };
  }

  return source;
}

function resolvePreviewLabel(
  preview: GraphStagePreview | null | undefined,
  isZhHk: boolean,
) {
  if (!preview || preview.kind !== "response") {
    return null;
  }

  return isZhHk
    ? `預覽 Re(w) = ${formatNumber(preview.point.x)}`
    : `preview Re(w) = ${formatNumber(preview.point.x)}`;
}

function describePoint(x: number, y: number) {
  return `(${formatNumber(x)}, ${formatNumber(y)})`;
}

function buildArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startDeg: number,
  endDeg: number,
) {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const start = {
    x: centerX + radius * Math.cos(startRad),
    y: centerY - radius * Math.sin(startRad),
  };
  const end = {
    x: centerX + radius * Math.cos(endRad),
    y: centerY - radius * Math.sin(endRad),
  };
  const rawDelta = endDeg - startDeg;
  const largeArcFlag = Math.abs(rawDelta) > 180 ? 1 : 0;
  const sweepFlag = rawDelta >= 0 ? 0 : 1;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

export function ComplexNumbersPlaneSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ComplexNumbersPlaneSimulationProps) {
  const locale = useLocale() as AppLocale;
  const isZhHk = locale === "zh-HK";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewedParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const primaryParams = buildPreviewSource(previewedParams, graphPreview);
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleComplexNumbersPlaneState(primaryParams);
  const secondary = secondaryParams ? sampleComplexNumbersPlaneState(secondaryParams) : null;
  const secondaryMultiplyMode = secondary?.multiplyMode ?? false;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? (isZhHk ? "變化版本" : "Variant")
      : compare.labelA ?? (isZhHk ? "基準版本" : "Baseline")
    : isZhHk
      ? "即時"
      : "Live";
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? (isZhHk ? "基準版本" : "Baseline")
      : compare.labelB ?? (isZhHk ? "變化版本" : "Variant")
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, isZhHk);
  const viewport = resolveComplexNumbersPlaneViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const plane = buildPlaneConfig(viewport.maxAbsCoordinate);
  const origin = {
    x: projectCartesianX(plane, 0),
    y: projectCartesianY(plane, 0),
  };
  const zEnd = {
    x: projectCartesianX(plane, primary.realPart),
    y: projectCartesianY(plane, primary.imaginaryPart),
  };
  const wEnd = {
    x: projectCartesianX(plane, primary.operandReal),
    y: projectCartesianY(plane, primary.operandImaginary),
  };
  const sumEnd = {
    x: projectCartesianX(plane, primary.sumReal),
    y: projectCartesianY(plane, primary.sumImaginary),
  };
  const productEnd = {
    x: projectCartesianX(plane, primary.productReal),
    y: projectCartesianY(plane, primary.productImaginary),
  };
  const sumBase = zEnd;
  const unitRadius = Math.max(
    0,
    projectCartesianX(plane, 1) - projectCartesianX(plane, 0),
  );
  const additionGuide = overlayValues?.additionGuide ?? true;
  const magnitudeCircle = overlayValues?.magnitudeCircle ?? true;
  const rotationCue = overlayValues?.rotationCue ?? false;

  const secondaryZEnd = secondary
    ? {
        x: projectCartesianX(plane, secondary.realPart),
        y: projectCartesianY(plane, secondary.imaginaryPart),
      }
    : null;
  const secondaryWEnd = secondary
    ? {
        x: projectCartesianX(plane, secondary.operandReal),
        y: projectCartesianY(plane, secondary.operandImaginary),
      }
    : null;
  const secondaryResultEnd = secondary
    ? {
        x: projectCartesianX(
          plane,
          secondaryMultiplyMode ? secondary.productReal : secondary.sumReal,
        ),
        y: projectCartesianY(
          plane,
          secondaryMultiplyMode ? secondary.productImaginary : secondary.sumImaginary,
        ),
      }
    : null;
  const currentResult = primary.multiplyMode
    ? formatComplex(primary.productReal, primary.productImaginary)
    : formatComplex(primary.sumReal, primary.sumImaginary);
  const readoutRows = primary.multiplyMode
    ? [
        { label: "z", value: formatComplex(primary.realPart, primary.imaginaryPart) },
        { label: "w", value: formatComplex(primary.operandReal, primary.operandImaginary) },
        { label: "|z|", value: formatNumber(primary.magnitude) },
        { label: "arg z", value: `${formatNumber(primary.argumentDeg)} deg` },
        { label: "|w|", value: formatNumber(primary.operandMagnitude) },
        { label: "arg w", value: `${formatNumber(primary.operandArgumentDeg)} deg` },
        { label: "z · w", value: currentResult },
      ]
    : [
        { label: "z", value: formatComplex(primary.realPart, primary.imaginaryPart) },
        { label: "w", value: formatComplex(primary.operandReal, primary.operandImaginary) },
        { label: "|z|", value: formatNumber(primary.magnitude) },
        { label: "arg z", value: `${formatNumber(primary.argumentDeg)} deg` },
        { label: "z + w", value: currentResult },
        { label: "|z + w|", value: formatNumber(primary.sumMagnitude) },
      ];
  const noteLines = primary.multiplyMode
    ? [
        isZhHk
          ? `|w| = ${formatNumber(primary.scaleFactor)} 會縮放 z，而 arg(w) = ${formatNumber(primary.rotationDeg)}° 會令它旋轉。`
          : `|w| = ${formatNumber(primary.scaleFactor)} scales z while arg(w) = ${formatNumber(primary.rotationDeg)} deg rotates it.`,
        isZhHk
          ? `乘積會落在同一個平面上的 ${describePoint(primary.productReal, primary.productImaginary)}。`
          : `The product lands at ${describePoint(primary.productReal, primary.productImaginary)} on the same plane.`,
      ]
    : [
        isZhHk
          ? `用首尾相接的方法後，z + w 會落在 ${describePoint(primary.sumReal, primary.sumImaginary)}。`
          : `z + w lands at ${describePoint(primary.sumReal, primary.sumImaginary)} after the head-to-tail move.`,
        isZhHk
          ? "加法讓平面視圖保持誠實：同樣兩個分量，得到一個新的單一結果。"
          : "Addition keeps the plane view honest: same two components, new single result.",
      ];

  const drag = useSvgPointerDrag({
    svgRef,
    width: WIDTH,
    height: HEIGHT,
    onDrag: (target: DragTarget, location) => {
      const localX = location.svgX - PLANE_X;
      const localY = location.svgY - PLANE_Y;
      const nextX = roundToTenth(
        clamp(
          invertCartesianX(plane, localX),
          COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
          COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
        ),
      );
      const nextY = roundToTenth(
        clamp(
          invertCartesianY(plane, localY),
          COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
          COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
        ),
      );

      if (target === "z") {
        setParam("realPart", nextX);
        setParam("imaginaryPart", nextY);
        return;
      }

      setParam("operandReal", nextX);
      setParam("operandImaginary", nextY);
    },
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(240,171,60,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{isZhHk ? "平面複數" : "Complex numbers on the plane"}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {isZhHk
                ? "直接在平面上拖曳 z 和 w，讓實部、虛部、模長、幅角、加法與乘法都維持為同一個幾何故事。"
                : "Drag z and w directly on the plane so real part, imaginary part, magnitude, argument, addition, and multiplication still read as one geometric story."}
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
            <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
              {primary.multiplyMode
                ? isZhHk
                  ? "乘法視圖"
                  : "Multiplication view"
                : isZhHk
                  ? "加法視圖"
                  : "Addition view"}
            </span>
            {previewLabel ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                {previewLabel}
              </span>
            ) : null}
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
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane config={plane} xLabel="Re" yLabel="Im" />
          {magnitudeCircle ? (
            <circle
              cx={origin.x}
              cy={origin.y}
              r={unitRadius}
              fill="none"
              stroke="rgba(15,28,36,0.18)"
              strokeDasharray="6 6"
              opacity={overlayOpacity(focusedOverlayId, "magnitudeCircle")}
            />
          ) : null}
          {secondaryZEnd && secondaryWEnd && secondaryResultEnd ? (
            <g opacity="0.46">
              <line
                x1={origin.x}
                y1={origin.y}
                x2={secondaryZEnd.x}
                y2={secondaryZEnd.y}
                stroke="#1ea6a2"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <line
                x1={origin.x}
                y1={origin.y}
                x2={secondaryWEnd.x}
                y2={secondaryWEnd.y}
                stroke="#f16659"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <line
                x1={origin.x}
                y1={origin.y}
                x2={secondaryResultEnd.x}
                y2={secondaryResultEnd.y}
                stroke={secondaryMultiplyMode ? "#f0ab3c" : "#4ea6df"}
                strokeWidth="3"
                strokeDasharray="8 6"
              />
            </g>
          ) : null}
          {additionGuide && !primary.multiplyMode ? (
            <g opacity={overlayOpacity(focusedOverlayId, "additionGuide")}>
              <line
                x1={sumBase.x}
                y1={sumBase.y}
                x2={sumEnd.x}
                y2={sumEnd.y}
                stroke="#f16659"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />
              <line
                x1={wEnd.x}
                y1={wEnd.y}
                x2={sumEnd.x}
                y2={sumEnd.y}
                stroke="#1ea6a2"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />
            </g>
          ) : null}
          <line
            x1={origin.x}
            y1={origin.y}
            x2={zEnd.x}
            y2={zEnd.y}
            stroke="#1ea6a2"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={origin.x}
            y1={origin.y}
            x2={wEnd.x}
            y2={wEnd.y}
            stroke="#f16659"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={origin.x}
            y1={origin.y}
            x2={primary.multiplyMode ? productEnd.x : sumEnd.x}
            y2={primary.multiplyMode ? productEnd.y : sumEnd.y}
            stroke={primary.multiplyMode ? "#f0ab3c" : "#4ea6df"}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {rotationCue && primary.multiplyMode ? (
            <g opacity={overlayOpacity(focusedOverlayId, "rotationCue")}>
              <path
                d={buildArcPath(origin.x, origin.y, Math.max(unitRadius * 1.7, 38), primary.argumentDeg, primary.productArgumentDeg)}
                fill="none"
                stroke="rgba(240,171,60,0.72)"
                strokeWidth="2.5"
                strokeDasharray="6 5"
              />
            </g>
          ) : null}
          <circle
            cx={zEnd.x}
            cy={zEnd.y}
            r="8.5"
            fill="#1ea6a2"
            stroke="rgba(15,28,36,0.2)"
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "z", event.clientX, event.clientY)
            }
          />
          <circle
            cx={wEnd.x}
            cy={wEnd.y}
            r="8.5"
            fill="#f16659"
            stroke="rgba(15,28,36,0.2)"
            onPointerDown={(event) =>
              drag.startDrag(event.pointerId, "w", event.clientX, event.clientY)
            }
          />
          <circle
            cx={primary.multiplyMode ? productEnd.x : sumEnd.x}
            cy={primary.multiplyMode ? productEnd.y : sumEnd.y}
            r="7"
            fill={primary.multiplyMode ? "#f0ab3c" : "#4ea6df"}
            stroke="rgba(15,28,36,0.18)"
          />
          <text x={zEnd.x + 10} y={zEnd.y - 8} className="fill-teal-700 text-[11px] font-semibold">
            z
          </text>
          <text x={wEnd.x + 10} y={wEnd.y - 8} className="fill-coral-700 text-[11px] font-semibold">
            w
          </text>
          <text
            x={(primary.multiplyMode ? productEnd.x : sumEnd.x) + 10}
            y={(primary.multiplyMode ? productEnd.y : sumEnd.y) - 8}
            className={`text-[11px] font-semibold ${
              primary.multiplyMode ? "fill-amber-700" : "fill-sky-700"
            }`}
          >
            {primary.multiplyMode ? "z · w" : "z + w"}
          </text>
        </g>

        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={
            primary.multiplyMode
              ? isZhHk
                ? "乘積讀數"
                : "Product readout"
              : isZhHk
                ? "加法讀數"
                : "Addition readout"
          }
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
