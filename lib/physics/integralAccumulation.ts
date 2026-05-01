import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type IntegralAccumulationParams = {
  upperBound?: number;
};

export type IntegralAccumulationSnapshot = {
  upperBound: number;
  sourceHeight: number;
  accumulatedValue: number;
  accumulationSlope: number;
};

export type IntegralAccumulationAreaSegment = {
  sign: "positive" | "negative";
  points: GraphPoint[];
};

export const INTEGRAL_ACCUMULATION_BOUND_MIN = -3.2;
export const INTEGRAL_ACCUMULATION_BOUND_MAX = 3.2;
export const INTEGRAL_ACCUMULATION_DOMAIN_MIN = INTEGRAL_ACCUMULATION_BOUND_MIN;
export const INTEGRAL_ACCUMULATION_DOMAIN_MAX = INTEGRAL_ACCUMULATION_BOUND_MAX;
export const INTEGRAL_ACCUMULATION_ZERO_LEFT = -Math.sqrt(3);
export const INTEGRAL_ACCUMULATION_ZERO_RIGHT = Math.sqrt(3);

const FUNCTION_SAMPLES = 241;
const AREA_SAMPLES_PER_UNIT = 36;

export function integralAccumulationSource(x: number) {
  return 1 - (x * x) / 3;
}

export function integralAccumulationValue(x: number) {
  return x - (x * x * x) / 9;
}

export function resolveIntegralAccumulationParams(
  source:
    | Partial<IntegralAccumulationParams>
    | Record<string, number | boolean | string>,
): Required<IntegralAccumulationParams> {
  return {
    upperBound: clamp(
      safeNumber(source.upperBound, 1.6),
      INTEGRAL_ACCUMULATION_BOUND_MIN,
      INTEGRAL_ACCUMULATION_BOUND_MAX,
    ),
  };
}

export function sampleIntegralAccumulationState(
  source:
    | Partial<IntegralAccumulationParams>
    | Record<string, number | boolean | string>,
): IntegralAccumulationSnapshot {
  const params = resolveIntegralAccumulationParams(source);
  const sourceHeight = integralAccumulationSource(params.upperBound);

  return {
    upperBound: params.upperBound,
    sourceHeight,
    accumulatedValue: integralAccumulationValue(params.upperBound),
    accumulationSlope: sourceHeight,
  };
}

export function sampleIntegralAccumulationAreaSegments(
  upperBound: number,
): IntegralAccumulationAreaSegment[] {
  const clampedUpperBound = clamp(
    upperBound,
    INTEGRAL_ACCUMULATION_BOUND_MIN,
    INTEGRAL_ACCUMULATION_BOUND_MAX,
  );

  if (Math.abs(clampedUpperBound) < 0.0001) {
    return [];
  }

  const direction = clampedUpperBound >= 0 ? 1 : -1;
  const internalZeroes = [INTEGRAL_ACCUMULATION_ZERO_LEFT, INTEGRAL_ACCUMULATION_ZERO_RIGHT]
    .filter((zero) =>
      direction > 0
        ? zero > 0 && zero < clampedUpperBound
        : zero < 0 && zero > clampedUpperBound,
    )
    .sort((left, right) => direction * (left - right));
  const boundaries = [0, ...internalZeroes, clampedUpperBound];
  const segments: IntegralAccumulationAreaSegment[] = [];

  for (let index = 1; index < boundaries.length; index += 1) {
    const start = boundaries[index - 1] ?? 0;
    const end = boundaries[index] ?? start;
    const span = Math.abs(end - start);

    if (span < 0.0001) {
      continue;
    }

    const sampleCount = Math.max(12, Math.ceil(span * AREA_SAMPLES_PER_UNIT));
    const points = sampleRange(start, end, sampleCount).map((x) => ({
      x,
      y: integralAccumulationSource(x),
    }));
    const midpoint = (start + end) / 2;

    segments.push({
      sign: integralAccumulationSource(midpoint) >= 0 ? "positive" : "negative",
      points,
    });
  }

  return segments;
}

export function buildIntegralAccumulationSeries(
  source:
    | Partial<IntegralAccumulationParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveIntegralAccumulationParams(source);
  const xs = Array.from(
    new Set([
      ...sampleRange(
        INTEGRAL_ACCUMULATION_DOMAIN_MIN,
        INTEGRAL_ACCUMULATION_DOMAIN_MAX,
        FUNCTION_SAMPLES,
      ).map((x) => Number(x.toFixed(6))),
      Number(resolved.upperBound.toFixed(6)),
    ]),
  ).sort((left, right) => left - right);

  return {
    "source-function": [
      buildSeries(
        "source-curve",
        "Source height",
        xs.map((x) => ({ x, y: integralAccumulationSource(x) })),
        "#1ea6a2",
      ),
    ],
    "accumulation-function": [
      buildSeries(
        "accumulation-curve",
        "Accumulated amount",
        xs.map((x) => ({ x, y: integralAccumulationValue(x) })),
        "#4ea6df",
      ),
    ],
    "accumulation-scan": [
      buildSeries(
        "accumulation-scan",
        "Accumulated amount",
        xs.map((x) => ({ x, y: integralAccumulationValue(x) })),
        "#4ea6df",
      ),
      buildSeries(
        "source-height-scan",
        "Source height",
        xs.map((x) => ({ x, y: integralAccumulationSource(x) })),
        "#f16659",
        true,
      ),
    ],
  };
}

export function describeIntegralAccumulationState(
  source:
    | Partial<IntegralAccumulationParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleIntegralAccumulationState(source);
  const sourceTrend =
    Math.abs(snapshot.sourceHeight) <= 0.05
      ? "The source height is almost zero here, so the accumulation graph is nearly flat."
      : snapshot.sourceHeight > 0
        ? "The source height is positive here, so moving the bound slightly to the right adds positive area."
        : "The source height is negative here, so moving the bound slightly to the right subtracts from the running total.";
  const accumulationSummary =
    Math.abs(snapshot.accumulatedValue) <= 0.05
      ? "The signed positive and negative contributions have nearly cancelled so far."
      : snapshot.accumulatedValue > 0
        ? "The running total is still positive overall."
        : "The running total has dropped below zero overall.";

  return `At x = ${formatNumber(snapshot.upperBound)}, the source height is ${formatNumber(snapshot.sourceHeight)} and the accumulated amount from 0 to x is ${formatNumber(snapshot.accumulatedValue)}. ${sourceTrend} ${accumulationSummary}`;
}
