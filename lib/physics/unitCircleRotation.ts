import { formatMeasurement, formatNumber, radToDeg, safeNumber, TAU } from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";
import { normalizeAngle } from "./ucm";

export type UnitCircleRotationParams = {
  angularSpeed?: number;
  omega?: number;
  phase?: number;
};

export type UnitCircleRotationSnapshot = {
  angle: number;
  wrappedAngle: number;
  angleDeg: number;
  x: number;
  y: number;
  xSquared: number;
  ySquared: number;
  sumSquares: number;
  period: number;
  regionLabel: string;
  cosineSign: "positive" | "negative" | "zero";
  sineSign: "positive" | "negative" | "zero";
  referenceAngleDeg: number;
};

export const UNIT_CIRCLE_ROTATION_TIME_MAX = TAU;
export const UNIT_CIRCLE_ROTATION_OMEGA_MIN = 0.6;
export const UNIT_CIRCLE_ROTATION_OMEGA_MAX = 1.6;
export const UNIT_CIRCLE_ROTATION_PHASE_MIN = 0;
export const UNIT_CIRCLE_ROTATION_PHASE_MAX = TAU;

const SAMPLE_COUNT = 240;
const AXIS_EPSILON = 0.03;

function resolveTrigSign(value: number): UnitCircleRotationSnapshot["cosineSign"] {
  if (value > AXIS_EPSILON) {
    return "positive";
  }

  if (value < -AXIS_EPSILON) {
    return "negative";
  }

  return "zero";
}

function resolveRegionLabel(angle: number) {
  const cosValue = Math.cos(angle);
  const sinValue = Math.sin(angle);

  if (Math.abs(sinValue) <= AXIS_EPSILON && cosValue >= 0) {
    return "Positive x-axis";
  }

  if (Math.abs(sinValue) <= AXIS_EPSILON && cosValue < 0) {
    return "Negative x-axis";
  }

  if (Math.abs(cosValue) <= AXIS_EPSILON && sinValue > 0) {
    return "Positive y-axis";
  }

  if (Math.abs(cosValue) <= AXIS_EPSILON && sinValue < 0) {
    return "Negative y-axis";
  }

  if (cosValue > 0 && sinValue > 0) {
    return "Quadrant I";
  }

  if (cosValue < 0 && sinValue > 0) {
    return "Quadrant II";
  }

  if (cosValue < 0 && sinValue < 0) {
    return "Quadrant III";
  }

  return "Quadrant IV";
}

function resolveReferenceAngleDeg(angleDeg: number) {
  if (angleDeg <= 90) {
    return angleDeg;
  }

  if (angleDeg <= 180) {
    return 180 - angleDeg;
  }

  if (angleDeg <= 270) {
    return angleDeg - 180;
  }

  return 360 - angleDeg;
}

export function resolveUnitCircleRotationParams(
  source: Partial<UnitCircleRotationParams> | Record<string, number | boolean | string>,
) {
  return {
    angularSpeed: Math.min(
      UNIT_CIRCLE_ROTATION_OMEGA_MAX,
      Math.max(
        UNIT_CIRCLE_ROTATION_OMEGA_MIN,
        safeNumber(source.omega ?? source.angularSpeed, 1),
      ),
    ),
    phase: normalizeAngle(
      Math.min(
        UNIT_CIRCLE_ROTATION_PHASE_MAX,
        Math.max(UNIT_CIRCLE_ROTATION_PHASE_MIN, safeNumber(source.phase, 0.18)),
      ),
    ),
  };
}

export function sampleUnitCircleRotationState(
  source: Partial<UnitCircleRotationParams> | Record<string, number | boolean | string>,
  time: number,
): UnitCircleRotationSnapshot {
  const params = resolveUnitCircleRotationParams(source);
  const angle = params.angularSpeed * time + params.phase;
  const wrappedAngle = normalizeAngle(angle);
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  const xSquared = x ** 2;
  const ySquared = y ** 2;

  return {
    angle,
    wrappedAngle,
    angleDeg: radToDeg(wrappedAngle),
    x,
    y,
    xSquared,
    ySquared,
    sumSquares: xSquared + ySquared,
    period: TAU / params.angularSpeed,
    regionLabel: resolveRegionLabel(wrappedAngle),
    cosineSign: resolveTrigSign(x),
    sineSign: resolveTrigSign(y),
    referenceAngleDeg: resolveReferenceAngleDeg(radToDeg(wrappedAngle)),
  };
}

export function buildUnitCircleRotationSeries(
  source: Partial<UnitCircleRotationParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveUnitCircleRotationParams(source);

  return {
    "projection-history": [
      sampleTimeSeries(
        "cosine-projection",
        "cos(theta)",
        0,
        UNIT_CIRCLE_ROTATION_TIME_MAX,
        SAMPLE_COUNT,
        (time) => sampleUnitCircleRotationState(resolved, time).x,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "sine-projection",
        "sin(theta)",
        0,
        UNIT_CIRCLE_ROTATION_TIME_MAX,
        SAMPLE_COUNT,
        (time) => sampleUnitCircleRotationState(resolved, time).y,
        "#4ea6df",
      ),
    ],
    "angle-history": [
      sampleTimeSeries(
        "angle-history",
        "theta(t)",
        0,
        UNIT_CIRCLE_ROTATION_TIME_MAX,
        SAMPLE_COUNT,
        (time) => sampleUnitCircleRotationState(resolved, time).angle,
        "#315063",
      ),
    ],
    "identity-balance": [
      sampleTimeSeries(
        "cosine-square",
        "cos^2(theta)",
        0,
        UNIT_CIRCLE_ROTATION_TIME_MAX,
        SAMPLE_COUNT,
        (time) => sampleUnitCircleRotationState(resolved, time).xSquared,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "sine-square",
        "sin^2(theta)",
        0,
        UNIT_CIRCLE_ROTATION_TIME_MAX,
        SAMPLE_COUNT,
        (time) => sampleUnitCircleRotationState(resolved, time).ySquared,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "pythagorean-sum",
        "cos^2(theta) + sin^2(theta)",
        0,
        UNIT_CIRCLE_ROTATION_TIME_MAX,
        SAMPLE_COUNT,
        (time) => sampleUnitCircleRotationState(resolved, time).sumSquares,
        "#315063",
      ),
    ],
  };
}

export function describeUnitCircleRotationState(
  source: Partial<UnitCircleRotationParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const params = resolveUnitCircleRotationParams(source);
  const snapshot = sampleUnitCircleRotationState(params, time);

  return `At t = ${formatMeasurement(time, "s")}, the unit-circle point sits in ${snapshot.regionLabel} at theta = ${formatMeasurement(snapshot.angleDeg, "deg")}. The horizontal projection is cos(theta) = ${formatNumber(snapshot.x)}, the vertical projection is sin(theta) = ${formatNumber(snapshot.y)}, and one full turn takes ${formatMeasurement(snapshot.period, "s")}.`;
}
