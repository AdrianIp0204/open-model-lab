import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type DerivativeSlopeParams = {
  pointX?: number;
  deltaX?: number;
  showSecant?: boolean;
};

export type DerivativeSlopeSnapshot = {
  pointX: number;
  pointY: number;
  slope: number;
  deltaX: number;
  secantX: number;
  secantY: number;
  secantSlope: number;
  showSecant: boolean;
};

export const DERIVATIVE_SLOPE_DOMAIN_MIN = -3.8;
export const DERIVATIVE_SLOPE_DOMAIN_MAX = 3.8;
export const DERIVATIVE_SLOPE_DELTA_MIN = 0.15;
export const DERIVATIVE_SLOPE_DELTA_MAX = 2;

const FUNCTION_SAMPLES = 241;

export function derivativeSlopeCurve(x: number) {
  return 0.18 * x * x * x - x;
}

export function derivativeSlopeAt(x: number) {
  return 0.54 * x * x - 1;
}

export function resolveDerivativeSlopeParams(
  source: Partial<DerivativeSlopeParams> | Record<string, number | boolean | string>,
): Required<DerivativeSlopeParams> {
  const pointX = clamp(
    safeNumber(source.pointX, -1.2),
    DERIVATIVE_SLOPE_DOMAIN_MIN,
    DERIVATIVE_SLOPE_DOMAIN_MAX,
  );
  const maxDeltaX = Math.min(DERIVATIVE_SLOPE_DELTA_MAX, DERIVATIVE_SLOPE_DOMAIN_MAX - pointX);

  return {
    pointX,
    deltaX: clamp(
      safeNumber(source.deltaX, 0.8),
      DERIVATIVE_SLOPE_DELTA_MIN,
      Math.max(DERIVATIVE_SLOPE_DELTA_MIN, maxDeltaX),
    ),
    showSecant: source.showSecant !== false,
  };
}

export function sampleDerivativeSlopeState(
  source: Partial<DerivativeSlopeParams> | Record<string, number | boolean | string>,
): DerivativeSlopeSnapshot {
  const resolved = resolveDerivativeSlopeParams(source);
  const pointY = derivativeSlopeCurve(resolved.pointX);
  const secantX = clamp(
    resolved.pointX + resolved.deltaX,
    DERIVATIVE_SLOPE_DOMAIN_MIN,
    DERIVATIVE_SLOPE_DOMAIN_MAX,
  );
  const secantY = derivativeSlopeCurve(secantX);
  const secantSlope = (secantY - pointY) / Math.max(secantX - resolved.pointX, 0.0001);

  return {
    pointX: resolved.pointX,
    pointY,
    slope: derivativeSlopeAt(resolved.pointX),
    deltaX: secantX - resolved.pointX,
    secantX,
    secantY,
    secantSlope,
    showSecant: resolved.showSecant,
  };
}

export function buildDerivativeSlopeSeries(
  source: Partial<DerivativeSlopeParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveDerivativeSlopeParams(source);

  return {
    "slope-function": [
      buildSeries(
        "derivative-curve",
        "f'(x)",
        sampleRange(
          DERIVATIVE_SLOPE_DOMAIN_MIN,
          DERIVATIVE_SLOPE_DOMAIN_MAX,
          FUNCTION_SAMPLES,
        ).map((x) => ({ x, y: derivativeSlopeAt(x) })),
        "#1ea6a2",
      ),
    ],
    "difference-quotient": [
      buildSeries(
        "secant-slope",
        "Average rate over delta x",
        sampleRange(
          DERIVATIVE_SLOPE_DELTA_MIN,
          DERIVATIVE_SLOPE_DELTA_MAX,
          FUNCTION_SAMPLES,
        ).map((deltaX) => {
          const secantX = clamp(
            resolved.pointX + deltaX,
            DERIVATIVE_SLOPE_DOMAIN_MIN,
            DERIVATIVE_SLOPE_DOMAIN_MAX,
          );
          const effectiveDeltaX = Math.max(secantX - resolved.pointX, 0.0001);

          return {
            x: effectiveDeltaX,
            y:
              (derivativeSlopeCurve(secantX) - derivativeSlopeCurve(resolved.pointX)) /
              effectiveDeltaX,
          };
        }),
        "#f16659",
      ),
    ],
  };
}

export function describeDerivativeSlopeState(
  source: Partial<DerivativeSlopeParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleDerivativeSlopeState(source);
  const tangentSummary =
    Math.abs(snapshot.slope) <= 0.08
      ? "The tangent is almost flat here."
      : snapshot.slope > 0
        ? "The tangent rises from left to right here."
        : "The tangent falls from left to right here.";
  const secantSummary = snapshot.showSecant
    ? `With delta x = ${formatMeasurement(snapshot.deltaX)}, the secant slope is ${formatNumber(snapshot.secantSlope)}.`
    : "The secant comparison is hidden right now.";

  return `At x = ${formatMeasurement(snapshot.pointX)}, the point on the curve is y = ${formatMeasurement(snapshot.pointY)} and the tangent slope is ${formatNumber(snapshot.slope)}. ${tangentSummary} ${secantSummary}`;
}
