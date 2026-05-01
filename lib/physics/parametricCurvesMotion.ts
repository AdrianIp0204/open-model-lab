import { sampleTimeSeries } from "./series";
import { clamp, formatNumber, TAU, degToRad, safeNumber, sampleRange } from "./math";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type ParametricCurvesMotionParams = {
  xAmplitude?: number;
  yAmplitude?: number;
  xFrequency?: number;
  yFrequency?: number;
  phaseShiftDeg?: number;
};

export type ParametricCurvesMotionSnapshot = {
  xAmplitude: number;
  yAmplitude: number;
  xFrequency: number;
  yFrequency: number;
  phaseShiftDeg: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  pathWidth: number;
  pathHeight: number;
};

export type ParametricCurvesMotionViewport = {
  maxAbsCoordinate: number;
};

export const PARAMETRIC_CURVES_TIME_MAX = TAU;
export const PARAMETRIC_CURVES_AMPLITUDE_MIN = 1;
export const PARAMETRIC_CURVES_AMPLITUDE_MAX = 4.2;
export const PARAMETRIC_CURVES_FREQUENCY_MIN = 1;
export const PARAMETRIC_CURVES_FREQUENCY_MAX = 4;
export const PARAMETRIC_CURVES_PHASE_MIN = -180;
export const PARAMETRIC_CURVES_PHASE_MAX = 180;

const VIEWPORT_BUCKETS = [2, 4, 6, 8, 10];
const PATH_SAMPLES = 240;

function pickBucket(value: number) {
  const safeValue = Math.max(0, value);
  return VIEWPORT_BUCKETS.find((bucket) => safeValue <= bucket) ?? VIEWPORT_BUCKETS.at(-1) ?? safeValue;
}

export function resolveParametricCurvesMotionParams(
  source: Partial<ParametricCurvesMotionParams> | Record<string, number | boolean | string>,
): Required<ParametricCurvesMotionParams> {
  return {
    xAmplitude: clamp(
      safeNumber(source.xAmplitude, 3.2),
      PARAMETRIC_CURVES_AMPLITUDE_MIN,
      PARAMETRIC_CURVES_AMPLITUDE_MAX,
    ),
    yAmplitude: clamp(
      safeNumber(source.yAmplitude, 2.4),
      PARAMETRIC_CURVES_AMPLITUDE_MIN,
      PARAMETRIC_CURVES_AMPLITUDE_MAX,
    ),
    xFrequency: clamp(
      safeNumber(source.xFrequency, 1),
      PARAMETRIC_CURVES_FREQUENCY_MIN,
      PARAMETRIC_CURVES_FREQUENCY_MAX,
    ),
    yFrequency: clamp(
      safeNumber(source.yFrequency, 2),
      PARAMETRIC_CURVES_FREQUENCY_MIN,
      PARAMETRIC_CURVES_FREQUENCY_MAX,
    ),
    phaseShiftDeg: clamp(
      safeNumber(source.phaseShiftDeg, 0),
      PARAMETRIC_CURVES_PHASE_MIN,
      PARAMETRIC_CURVES_PHASE_MAX,
    ),
  };
}

export function sampleParametricCurvesMotionState(
  source: Partial<ParametricCurvesMotionParams> | Record<string, number | boolean | string>,
  time: number,
): ParametricCurvesMotionSnapshot {
  const params = resolveParametricCurvesMotionParams(source);
  const safeTime = ((time % PARAMETRIC_CURVES_TIME_MAX) + PARAMETRIC_CURVES_TIME_MAX) % PARAMETRIC_CURVES_TIME_MAX;
  const phaseShift = degToRad(params.phaseShiftDeg);
  const x = params.xAmplitude * Math.cos(params.xFrequency * safeTime);
  const y = params.yAmplitude * Math.sin(params.yFrequency * safeTime + phaseShift);
  const vx = -params.xAmplitude * params.xFrequency * Math.sin(params.xFrequency * safeTime);
  const vy =
    params.yAmplitude * params.yFrequency * Math.cos(params.yFrequency * safeTime + phaseShift);

  return {
    ...params,
    x,
    y,
    vx,
    vy,
    speed: Math.hypot(vx, vy),
    pathWidth: params.xAmplitude * 2,
    pathHeight: params.yAmplitude * 2,
  };
}

export function buildParametricCurvesPathPoints(
  source: Partial<ParametricCurvesMotionParams> | Record<string, number | boolean | string>,
  samples = PATH_SAMPLES,
) {
  const times = sampleRange(0, PARAMETRIC_CURVES_TIME_MAX, samples);
  return times.map((time) => {
    const snapshot = sampleParametricCurvesMotionState(source, time);
    return {
      x: snapshot.x,
      y: snapshot.y,
    } satisfies GraphPoint;
  });
}

export function resolveParametricCurvesMotionViewport(
  paramsList: Array<
    Partial<ParametricCurvesMotionParams> | Record<string, number | boolean | string>
  >,
) {
  const maxAbsCoordinate = Math.max(
    ...paramsList.flatMap((params) => {
      const resolved = resolveParametricCurvesMotionParams(params);
      return [resolved.xAmplitude, resolved.yAmplitude];
    }),
    2,
  );

  return {
    maxAbsCoordinate: pickBucket(maxAbsCoordinate * 1.14),
  } satisfies ParametricCurvesMotionViewport;
}

export function buildParametricCurvesMotionSeries(
  source: Partial<ParametricCurvesMotionParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveParametricCurvesMotionParams(source);

  return {
    "coordinate-time": [
      sampleTimeSeries(
        "x-coordinate",
        "x(t)",
        0,
        PARAMETRIC_CURVES_TIME_MAX,
        PATH_SAMPLES,
        (time) => sampleParametricCurvesMotionState(resolved, time).x,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "y-coordinate",
        "y(t)",
        0,
        PARAMETRIC_CURVES_TIME_MAX,
        PATH_SAMPLES,
        (time) => sampleParametricCurvesMotionState(resolved, time).y,
        "#4ea6df",
      ),
    ],
    "speed-history": [
      sampleTimeSeries(
        "speed-history",
        "speed(t)",
        0,
        PARAMETRIC_CURVES_TIME_MAX,
        PATH_SAMPLES,
        (time) => sampleParametricCurvesMotionState(resolved, time).speed,
        "#f16659",
      ),
    ],
  };
}

export function describeParametricCurvesMotionState(
  source: Partial<ParametricCurvesMotionParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleParametricCurvesMotionState(source, time);
  const speedSummary =
    snapshot.speed >= 8
      ? "The point is moving quickly through this part of the path."
      : snapshot.speed <= 3
        ? "The point is moving more slowly here even though the traced path stays the same."
        : "The point is moving at a moderate speed through the traced path.";

  return `At t = ${formatNumber(time)}, the point is near (${formatNumber(snapshot.x)}, ${formatNumber(snapshot.y)}). The path spans about ${formatNumber(snapshot.pathWidth)} units wide and ${formatNumber(snapshot.pathHeight)} units tall. ${speedSummary}`;
}
