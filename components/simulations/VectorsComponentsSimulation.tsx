"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  angleFromComponents,
  clamp,
  clampVectorsComponentsAngle,
  formatMeasurement,
  formatNumber,
  magnitudeFromComponents,
  resolveVectorsComponentsViewport,
  sampleVectorsComponentsState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  type SimulationControlSpec,
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

type VectorsComponentsSimulationProps = {
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
const HEIGHT = 310;
const PLOT_LEFT = 46;
const PLOT_RIGHT = 556;
const PLOT_TOP = 34;
const PLOT_BOTTOM = 286;
const ORIGIN_X = (PLOT_LEFT + PLOT_RIGHT) / 2;
const ORIGIN_Y = (PLOT_TOP + PLOT_BOTTOM) / 2;
const CARD_WIDTH = 174;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;
const REFERENCE_TIME = 1;

function roundTo(value: number, precision = 1) {
  return Number(value.toFixed(precision));
}

function getNumericControl(
  controls: SimulationControlSpec[],
  param: string,
  fallback: { min: number; max: number; step: number },
) {
  const control = controls.find((item) => item.param === param);
  return {
    min: typeof control?.min === "number" ? control.min : fallback.min,
    max: typeof control?.max === "number" ? control.max : fallback.max,
    step: typeof control?.step === "number" ? control.step : fallback.step,
  };
}

function toSvgPoint(x: number, y: number, scale: number) {
  return {
    svgX: ORIGIN_X + x * scale,
    svgY: ORIGIN_Y - y * scale,
  };
}

function toSvgCoordinates(clientX: number, clientY: number, bounds: DOMRect) {
  return {
    svgX: ((clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH,
    svgY: ((clientY - bounds.top) / Math.max(bounds.height, 1)) * HEIGHT,
  };
}

function buildArcPath(radius: number, angleDegrees: number) {
  const targetRadians = (-angleDegrees * Math.PI) / 180;
  const endX = ORIGIN_X + Math.cos(targetRadians) * radius;
  const endY = ORIGIN_Y + Math.sin(targetRadians) * radius;
  const largeArcFlag = Math.abs(angleDegrees) > 180 ? 1 : 0;
  const sweepFlag = angleDegrees > 0 ? 0 : 1;

  return `M ${ORIGIN_X + radius} ${ORIGIN_Y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

function describeQuadrant(
  x: number,
  y: number,
  labels: {
    origin: string;
    positiveYAxis: string;
    negativeYAxis: string;
    positiveXAxis: string;
    negativeXAxis: string;
    quadrantI: string;
    quadrantII: string;
    quadrantIII: string;
    quadrantIV: string;
  },
) {
  if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
    return labels.origin;
  }

  if (Math.abs(x) < 0.05) {
    return y >= 0 ? labels.positiveYAxis : labels.negativeYAxis;
  }

  if (Math.abs(y) < 0.05) {
    return x >= 0 ? labels.positiveXAxis : labels.negativeXAxis;
  }

  if (x > 0 && y > 0) {
    return labels.quadrantI;
  }

  if (x < 0 && y > 0) {
    return labels.quadrantII;
  }

  if (x < 0 && y < 0) {
    return labels.quadrantIII;
  }

  return labels.quadrantIV;
}

export function VectorsComponentsSimulation({
  concept,
  params,
  time,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: VectorsComponentsSimulationProps) {
  const t = useTranslations("VectorsComponentsSimulation");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const displayTime =
    graphPreview?.kind === "time" || graphPreview?.kind === "trajectory" ? graphPreview.time : time;
  const compareEnabled = Boolean(compare);
  const primaryTarget = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryParams =
    compare && primaryTarget === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && primaryTarget === "b" ? compare.setupA : compare?.setupB ?? null;
  const primarySnapshot = sampleVectorsComponentsState(primaryParams, displayTime);
  const secondarySnapshot = secondaryParams
    ? sampleVectorsComponentsState(secondaryParams, displayTime)
    : null;
  const primaryReference = sampleVectorsComponentsState(primaryParams, REFERENCE_TIME);
  const secondaryReference = secondaryParams
    ? sampleVectorsComponentsState(secondaryParams, REFERENCE_TIME)
    : null;
  const primaryEndpoint = sampleVectorsComponentsState(
    primaryParams,
    resolveVectorsComponentsViewport([primaryParams]).duration,
  );
  const secondaryEndpoint = secondaryParams
    ? sampleVectorsComponentsState(
        secondaryParams,
        resolveVectorsComponentsViewport([secondaryParams]).duration,
      )
    : null;
  const viewport = resolveVectorsComponentsViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const scale = Math.min(
    (PLOT_RIGHT - PLOT_LEFT) / (viewport.maxAbsPosition * 2),
    (PLOT_BOTTOM - PLOT_TOP) / (viewport.maxAbsPosition * 2),
  );
  const currentPoint = toSvgPoint(primarySnapshot.x, primarySnapshot.y, scale);
  const referencePoint = toSvgPoint(primaryReference.x, primaryReference.y, scale);
  const endPoint = toSvgPoint(primaryEndpoint.x, primaryEndpoint.y, scale);
  const compareCurrentPoint = secondarySnapshot
    ? toSvgPoint(secondarySnapshot.x, secondarySnapshot.y, scale)
    : null;
  const compareReferencePoint = secondaryReference
    ? toSvgPoint(secondaryReference.x, secondaryReference.y, scale)
    : null;
  const compareEndPoint = secondaryEndpoint
    ? toSvgPoint(secondaryEndpoint.x, secondaryEndpoint.y, scale)
    : null;
  const angleControl = getNumericControl(concept.simulation.controls, "angle", {
    min: -75,
    max: 165,
    step: 1,
  });
  const magnitudeControl = getNumericControl(concept.simulation.controls, "magnitude", {
    min: 3,
    max: 12,
    step: 0.1,
  });
  const showComponentGuides = overlayValues?.componentGuides ?? true;
  const showAngleMarker = overlayValues?.angleMarker ?? true;
  const showReferenceStep = overlayValues?.referenceStep ?? true;
  const activeLabel = compare
    ? primaryTarget === "b"
      ? compare.labelB ?? "B"
      : compare.labelA ?? "A"
    : t("labels.live");
  const secondaryLabel = compare
    ? primaryTarget === "b"
      ? compare.labelA ?? "A"
      : compare.labelB ?? "B"
    : "";
  const previewBadge =
    graphPreview && graphPreview.kind === "trajectory" ? (
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
        {t("preview.time", {
          label: graphPreview.seriesLabel,
          time: formatNumber(displayTime),
        })}
      </span>
    ) : graphPreview ? (
      <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
        {t("preview.default", { label: graphPreview.seriesLabel })}
      </span>
    ) : null;
  const quadrantLabels = {
    origin: t("quadrants.origin"),
    positiveYAxis: t("quadrants.positiveYAxis"),
    negativeYAxis: t("quadrants.negativeYAxis"),
    positiveXAxis: t("quadrants.positiveXAxis"),
    negativeXAxis: t("quadrants.negativeXAxis"),
    quadrantI: t("quadrants.quadrantI"),
    quadrantII: t("quadrants.quadrantII"),
    quadrantIII: t("quadrants.quadrantIII"),
    quadrantIV: t("quadrants.quadrantIV"),
  };
  const compareLegend = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {activeLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {secondaryLabel}
      </span>
    </div>
  ) : null;
  const overlayWeight = (overlayId: string) => {
    if (!focusedOverlayId) {
      return 1;
    }

    return focusedOverlayId === overlayId ? 1 : 0.38;
  };
  const axisTicks = [-viewport.maxAbsPosition, -viewport.maxAbsPosition / 2, 0, viewport.maxAbsPosition / 2, viewport.maxAbsPosition];
  const metricRows = [
    { label: "|v|", value: formatMeasurement(primarySnapshot.magnitude, "m/s") },
    { label: t("metrics.angle"), value: formatMeasurement(primarySnapshot.angle, "deg") },
    { label: "vx", value: formatMeasurement(primarySnapshot.vx, "m/s") },
    { label: "vy", value: formatMeasurement(primarySnapshot.vy, "m/s") },
    { label: "x(t)", value: formatMeasurement(primarySnapshot.x, "m") },
    { label: "y(t)", value: formatMeasurement(primarySnapshot.y, "m") },
  ];

  function updateVectorFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const pointer = toSvgCoordinates(clientX, clientY, bounds);
    const dx = (pointer.svgX - ORIGIN_X) / Math.max(scale, Number.EPSILON);
    const dy = (ORIGIN_Y - pointer.svgY) / Math.max(scale, Number.EPSILON);
    const nextAngle = clampVectorsComponentsAngle(
      angleFromComponents(dx, dy),
      angleControl.min,
      angleControl.max,
    );
    const nextMagnitude = clamp(
      magnitudeFromComponents(dx, dy),
      magnitudeControl.min,
      magnitudeControl.max,
    );

    setParam("angle", roundTo(nextAngle, angleControl.step < 1 ? 2 : 1));
    setParam("magnitude", roundTo(nextMagnitude, magnitudeControl.step < 1 ? 1 : 0));
  }

  function stopDrag(pointerId?: number) {
    const svg = svgRef.current;
    if (svg && pointerId !== undefined && svg.hasPointerCapture(pointerId)) {
      svg.releasePointerCapture(pointerId);
    }
    setActivePointerId(null);
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.08),rgba(240,171,60,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="lab-label">{t("header.title")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {previewBadge}
            <p className="text-xs text-ink-700">
              {t("header.instruction")}
            </p>
          </div>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) => {
          if (activePointerId !== event.pointerId) {
            return;
          }
          updateVectorFromClient(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (activePointerId === event.pointerId) {
            stopDrag(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          if (activePointerId === event.pointerId) {
            stopDrag(event.pointerId);
          }
        }}
        onLostPointerCapture={() => setActivePointerId(null)}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.56)" />
        {axisTicks.map((tick) => {
          const x = ORIGIN_X + tick * scale;
          const y = ORIGIN_Y - tick * scale;
          return (
            <g key={`tick-${tick}`}>
              <line x1={x} x2={x} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke="rgba(15,28,36,0.08)" />
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} stroke="rgba(15,28,36,0.08)" />
              <text x={x} y={PLOT_BOTTOM + 14} textAnchor="middle" className="fill-ink-500 text-[11px]">
                {formatNumber(tick)}
              </text>
              {tick !== 0 ? (
                <text x={PLOT_LEFT - 8} y={y + 4} textAnchor="end" className="fill-ink-500 text-[11px]">
                  {formatNumber(tick)}
                </text>
              ) : null}
            </g>
          );
        })}
        <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={ORIGIN_Y} y2={ORIGIN_Y} stroke="rgba(15,28,36,0.36)" strokeWidth="2" />
        <line x1={ORIGIN_X} x2={ORIGIN_X} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke="rgba(15,28,36,0.36)" strokeWidth="2" />
        <text x={PLOT_RIGHT - 6} y={ORIGIN_Y - 8} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          x
        </text>
        <text x={ORIGIN_X + 8} y={PLOT_TOP + 14} className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]">
          y
        </text>
        {compareEndPoint ? (
          <>
            <line
              x1={ORIGIN_X}
              x2={compareEndPoint.svgX}
              y1={ORIGIN_Y}
              y2={compareEndPoint.svgY}
              stroke="rgba(15,28,36,0.3)"
              strokeDasharray="8 8"
              strokeWidth="3"
            />
            <circle cx={compareCurrentPoint?.svgX} cy={compareCurrentPoint?.svgY} r="6" fill="rgba(15,28,36,0.7)" />
            {showReferenceStep ? (
              <line
                x1={ORIGIN_X}
                x2={compareReferencePoint?.svgX}
                y1={ORIGIN_Y}
                y2={compareReferencePoint?.svgY}
                stroke="rgba(15,28,36,0.35)"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
            ) : null}
          </>
        ) : null}
        <line x1={ORIGIN_X} x2={endPoint.svgX} y1={ORIGIN_Y} y2={endPoint.svgY} stroke="rgba(30,166,162,0.22)" strokeWidth="4" />
        <line x1={ORIGIN_X} x2={currentPoint.svgX} y1={ORIGIN_Y} y2={currentPoint.svgY} stroke="#1ea6a2" strokeWidth="4.5" strokeLinecap="round" />
        {showComponentGuides ? (
          <g opacity={overlayWeight("componentGuides")}>
            <line x1={ORIGIN_X} x2={currentPoint.svgX} y1={currentPoint.svgY} y2={currentPoint.svgY} stroke="#f0ab3c" strokeDasharray="7 6" strokeWidth="2.5" />
            <line x1={currentPoint.svgX} x2={currentPoint.svgX} y1={ORIGIN_Y} y2={currentPoint.svgY} stroke="#4ea6df" strokeDasharray="7 6" strokeWidth="2.5" />
            <text x={(ORIGIN_X + currentPoint.svgX) / 2} y={currentPoint.svgY - 10} textAnchor="middle" className="fill-amber-600 text-[11px] font-semibold">
              x = {formatNumber(primarySnapshot.x)}
            </text>
            <text x={currentPoint.svgX + 10} y={(ORIGIN_Y + currentPoint.svgY) / 2} className="fill-sky-700 text-[11px] font-semibold">
              y = {formatNumber(primarySnapshot.y)}
            </text>
          </g>
        ) : null}
        {showReferenceStep ? (
          <g opacity={overlayWeight("referenceStep")}>
            <line x1={ORIGIN_X} x2={referencePoint.svgX} y1={referencePoint.svgY} y2={referencePoint.svgY} stroke="rgba(240,171,60,0.45)" strokeDasharray="5 5" strokeWidth="2" />
            <line x1={referencePoint.svgX} x2={referencePoint.svgX} y1={ORIGIN_Y} y2={referencePoint.svgY} stroke="rgba(78,166,223,0.45)" strokeDasharray="5 5" strokeWidth="2" />
            <line x1={ORIGIN_X} x2={referencePoint.svgX} y1={ORIGIN_Y} y2={referencePoint.svgY} stroke="rgba(241,102,89,0.85)" strokeWidth="3" strokeLinecap="round" />
            <text x={referencePoint.svgX + 10} y={referencePoint.svgY - 8} className="fill-coral-600 text-[11px] font-semibold">
              {t("overlay.referenceStep")}
            </text>
          </g>
        ) : null}
        {showAngleMarker ? (
          <g opacity={overlayWeight("angleMarker")}>
            <path d={buildArcPath(34, primarySnapshot.angle)} fill="none" stroke="#f16659" strokeWidth="2.5" />
            <text x={ORIGIN_X + 44} y={ORIGIN_Y - 12} className="fill-coral-600 text-[11px] font-semibold">
              {t("overlay.angleMarker", {
                angle: formatNumber(primarySnapshot.angle),
              })}
            </text>
          </g>
        ) : null}
        <circle cx={currentPoint.svgX} cy={currentPoint.svgY} r="7" fill="#1ea6a2" stroke="rgba(255,255,255,0.92)" strokeWidth="3" />
        <circle
          cx={referencePoint.svgX}
          cy={referencePoint.svgY}
          r="9"
          fill="#f16659"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="3"
          style={{ cursor: "grab" }}
          onPointerDown={(event) => {
            svgRef.current?.setPointerCapture(event.pointerId);
            setActivePointerId(event.pointerId);
            updateVectorFromClient(event.clientX, event.clientY);
          }}
        />
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={t("readout.title")}
          rows={metricRows}
          noteLines={[
            t("readout.time", { time: formatNumber(displayTime) }),
            describeQuadrant(primarySnapshot.x, primarySnapshot.y, quadrantLabels),
          ]}
        />
      </svg>
    </section>
  );
}
