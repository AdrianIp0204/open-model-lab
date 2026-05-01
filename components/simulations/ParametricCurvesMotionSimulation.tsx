"use client";

import {
  buildCartesianPath,
  CartesianPlane,
  projectCartesianX,
  projectCartesianY,
  type CartesianPlaneConfig,
} from "./primitives/math-plane";
import { SimulationReadoutCard } from "./SimulationReadoutCard";
import {
  buildParametricCurvesPathPoints,
  formatNumber,
  PARAMETRIC_CURVES_TIME_MAX,
  resolveParametricCurvesMotionViewport,
  sampleParametricCurvesMotionState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type ParametricCurvesMotionSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 900;
const HEIGHT = 392;
const PLANE_X = 24;
const PLANE_Y = 26;
const CARD_X = 654;
const CARD_Y = 28;
const CARD_WIDTH = 214;

function buildPlaneConfig(maxAbsCoordinate: number): CartesianPlaneConfig {
  return {
    width: 590,
    height: 320,
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

  return focusedOverlayId === overlayId ? 1 : 0.3;
}

function resolvePreviewTime(time: number, preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "time") {
    return time;
  }

  return preview.time;
}

function resolvePreviewLabel(preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "time") {
    return null;
  }

  return `preview t = ${formatNumber(preview.time)}`;
}

function buildTrailPath(points: Array<{ x: number; y: number }>, fraction: number) {
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const count = Math.max(2, Math.round((points.length - 1) * clampedFraction) + 1);
  return points.slice(0, count);
}

export function ParametricCurvesMotionSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: ParametricCurvesMotionSimulationProps) {
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewTime = resolvePreviewTime(time, graphPreview);
  const primaryParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleParametricCurvesMotionState(primaryParams, previewTime);
  const secondary = secondaryParams
    ? sampleParametricCurvesMotionState(secondaryParams, previewTime)
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
  const previewLabel = resolvePreviewLabel(graphPreview);
  const viewport = resolveParametricCurvesMotionViewport(
    secondaryParams ? [primaryParams, secondaryParams] : [primaryParams],
  );
  const plane = buildPlaneConfig(viewport.maxAbsCoordinate);
  const primaryPathPoints = buildParametricCurvesPathPoints(primaryParams);
  const secondaryPathPoints = secondaryParams ? buildParametricCurvesPathPoints(secondaryParams) : null;
  const primaryTrailPoints = buildTrailPath(primaryPathPoints, previewTime / PARAMETRIC_CURVES_TIME_MAX);
  const secondaryTrailPoints = secondaryPathPoints
    ? buildTrailPath(secondaryPathPoints, previewTime / PARAMETRIC_CURVES_TIME_MAX)
    : null;
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
  const showFullPath = overlayValues?.fullPath ?? true;
  const showTimeTrail = overlayValues?.timeTrail ?? true;
  const showCoordinateProjections = overlayValues?.coordinateProjections ?? false;
  const readoutRows = [
    { label: "t", value: formatNumber(previewTime) },
    { label: "x(t)", value: formatNumber(primary.x) },
    { label: "y(t)", value: formatNumber(primary.y) },
    { label: "speed", value: formatNumber(primary.speed) },
    { label: "phi", value: `${formatNumber(primary.phaseShiftDeg)} deg` },
  ];
  const noteLines = [
    `The traced path is about ${formatNumber(primary.pathWidth)} units wide and ${formatNumber(primary.pathHeight)} units tall.`,
    primary.speed >= 8
      ? "Right now the point is traversing the path quickly, so the same geometric path and the timing story should be kept separate."
      : "Right now the point is moving more slowly, which is why one path can still carry a changing timing story.",
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.08),rgba(78,166,223,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              Keep x(t), y(t), the traced path, and the moving point tied together so shape and
              traversal do not collapse into the same idea.
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
            {previewLabel ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                {previewLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <g transform={`translate(${PLANE_X} ${PLANE_Y})`}>
          <CartesianPlane config={plane} xLabel="x(t)" yLabel="y(t)" />
          {secondaryPathPoints ? (
            <path
              d={buildCartesianPath(plane, secondaryPathPoints)}
              fill="none"
              stroke="rgba(241,102,89,0.48)"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
          ) : null}
          {showFullPath ? (
            <path
              d={buildCartesianPath(plane, primaryPathPoints)}
              fill="none"
              stroke="#1ea6a2"
              strokeWidth="3.5"
              opacity={overlayOpacity(focusedOverlayId, "fullPath")}
            />
          ) : null}
          {showTimeTrail ? (
            <path
              d={buildCartesianPath(plane, primaryTrailPoints)}
              fill="none"
              stroke="#4ea6df"
              strokeWidth="4.2"
              strokeLinecap="round"
              opacity={overlayOpacity(focusedOverlayId, "timeTrail")}
            />
          ) : null}
          {secondaryTrailPoints ? (
            <path
              d={buildCartesianPath(plane, secondaryTrailPoints)}
              fill="none"
              stroke="rgba(241,102,89,0.52)"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
          ) : null}
          {showCoordinateProjections ? (
            <g opacity={overlayOpacity(focusedOverlayId, "coordinateProjections")}>
              <line
                x1={projectCartesianX(plane, 0)}
                y1={primaryPoint.y}
                x2={primaryPoint.x}
                y2={primaryPoint.y}
                stroke="rgba(78,166,223,0.54)"
                strokeWidth="2"
                strokeDasharray="6 5"
              />
              <line
                x1={primaryPoint.x}
                y1={projectCartesianY(plane, 0)}
                x2={primaryPoint.x}
                y2={primaryPoint.y}
                stroke="rgba(30,166,162,0.54)"
                strokeWidth="2"
                strokeDasharray="6 5"
              />
            </g>
          ) : null}
          {secondaryPoint ? (
            <circle
              cx={secondaryPoint.x}
              cy={secondaryPoint.y}
              r="6.5"
              fill="rgba(241,102,89,0.6)"
              stroke="rgba(15,28,36,0.18)"
              strokeDasharray="4 3"
            />
          ) : null}
          <circle
            cx={primaryPoint.x}
            cy={primaryPoint.y}
            r="7.5"
            fill="#1ea6a2"
            stroke="rgba(15,28,36,0.18)"
          />
          <text x={primaryPoint.x + 10} y={primaryPoint.y - 10} className="fill-teal-700 text-[11px] font-semibold">
            moving point
          </text>
        </g>
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title="Parametric readout"
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
