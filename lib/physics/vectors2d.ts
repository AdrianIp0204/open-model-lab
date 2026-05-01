import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type Vectors2DParams = {
  ax?: number;
  ay?: number;
  bx?: number;
  by?: number;
  scalar?: number;
  subtractMode?: boolean;
};

export type Vectors2DSnapshot = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  scalar: number;
  subtractMode: boolean;
  scaledAx: number;
  scaledAy: number;
  effectiveBx: number;
  effectiveBy: number;
  resultX: number;
  resultY: number;
  magnitudeA: number;
  magnitudeB: number;
  scaledMagnitude: number;
  resultMagnitude: number;
  angleA: number;
  angleB: number;
  resultAngle: number;
};

export type Vectors2DViewport = {
  maxAbsCoordinate: number;
};

export const VECTORS_2D_COMPONENT_MIN = -5;
export const VECTORS_2D_COMPONENT_MAX = 5;
export const VECTORS_2D_SCALAR_MIN = -2.5;
export const VECTORS_2D_SCALAR_MAX = 2.5;

const RESPONSE_SAMPLES = 201;
const VIEWPORT_BUCKETS = [4, 6, 8, 10, 12];

function pickBucket(value: number, buckets: number[]) {
  const safeValue = Math.max(0, value);
  return buckets.find((bucket) => safeValue <= bucket) ?? buckets[buckets.length - 1] ?? safeValue;
}

function magnitude(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}

function angleDegrees(x: number, y: number) {
  return magnitude(x, y) <= 0.0001 ? 0 : (Math.atan2(y, x) * 180) / Math.PI;
}

export function resolveVectors2DParams(
  source: Partial<Vectors2DParams> | Record<string, number | boolean | string>,
): Required<Vectors2DParams> {
  return {
    ax: clamp(safeNumber(source.ax, 3), VECTORS_2D_COMPONENT_MIN, VECTORS_2D_COMPONENT_MAX),
    ay: clamp(safeNumber(source.ay, 2), VECTORS_2D_COMPONENT_MIN, VECTORS_2D_COMPONENT_MAX),
    bx: clamp(safeNumber(source.bx, 1.5), VECTORS_2D_COMPONENT_MIN, VECTORS_2D_COMPONENT_MAX),
    by: clamp(safeNumber(source.by, 3), VECTORS_2D_COMPONENT_MIN, VECTORS_2D_COMPONENT_MAX),
    scalar: clamp(
      safeNumber(source.scalar, 1),
      VECTORS_2D_SCALAR_MIN,
      VECTORS_2D_SCALAR_MAX,
    ),
    subtractMode: source.subtractMode === true,
  };
}

export function sampleVectors2DState(
  source: Partial<Vectors2DParams> | Record<string, number | boolean | string>,
): Vectors2DSnapshot {
  const resolved = resolveVectors2DParams(source);
  const scaledAx = resolved.scalar * resolved.ax;
  const scaledAy = resolved.scalar * resolved.ay;
  const effectiveBx = resolved.subtractMode ? -resolved.bx : resolved.bx;
  const effectiveBy = resolved.subtractMode ? -resolved.by : resolved.by;
  const resultX = scaledAx + effectiveBx;
  const resultY = scaledAy + effectiveBy;

  return {
    ...resolved,
    scaledAx,
    scaledAy,
    effectiveBx,
    effectiveBy,
    resultX,
    resultY,
    magnitudeA: magnitude(resolved.ax, resolved.ay),
    magnitudeB: magnitude(resolved.bx, resolved.by),
    scaledMagnitude: magnitude(scaledAx, scaledAy),
    resultMagnitude: magnitude(resultX, resultY),
    angleA: angleDegrees(resolved.ax, resolved.ay),
    angleB: angleDegrees(resolved.bx, resolved.by),
    resultAngle: angleDegrees(resultX, resultY),
  };
}

export function resolveVectors2DViewport(
  paramsList: Array<Partial<Vectors2DParams> | Record<string, number | boolean | string>>,
) {
  const maxAbsCoordinate = Math.max(
    ...paramsList.flatMap((params) => {
      const resolved = resolveVectors2DParams(params);
      const scalarSamples = [VECTORS_2D_SCALAR_MIN, resolved.scalar, VECTORS_2D_SCALAR_MAX];

      return scalarSamples.flatMap((scalar) => {
        const snapshot = sampleVectors2DState({ ...resolved, scalar });
        return [
          Math.abs(snapshot.ax),
          Math.abs(snapshot.ay),
          Math.abs(snapshot.bx),
          Math.abs(snapshot.by),
          Math.abs(snapshot.scaledAx),
          Math.abs(snapshot.scaledAy),
          Math.abs(snapshot.resultX),
          Math.abs(snapshot.resultY),
        ];
      });
    }),
    4,
  );

  return {
    maxAbsCoordinate: pickBucket(maxAbsCoordinate * 1.14, VIEWPORT_BUCKETS),
  } satisfies Vectors2DViewport;
}

export function buildVectors2DSeries(
  source: Partial<Vectors2DParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveVectors2DParams(source);
  const scalarSamples = sampleRange(VECTORS_2D_SCALAR_MIN, VECTORS_2D_SCALAR_MAX, RESPONSE_SAMPLES);

  return {
    "result-components": [
      buildSeries(
        "result-x",
        "result x",
        scalarSamples.map((scalar) => ({
          x: scalar,
          y: sampleVectors2DState({ ...resolved, scalar }).resultX,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "result-y",
        "result y",
        scalarSamples.map((scalar) => ({
          x: scalar,
          y: sampleVectors2DState({ ...resolved, scalar }).resultY,
        })),
        "#f16659",
      ),
    ],
    "result-magnitude": [
      buildSeries(
        "result-magnitude",
        "|result|",
        scalarSamples.map((scalar) => ({
          x: scalar,
          y: sampleVectors2DState({ ...resolved, scalar }).resultMagnitude,
        })),
        "#4ea6df",
      ),
    ],
  };
}

export function describeVectors2DState(
  source: Partial<Vectors2DParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleVectors2DState(source);
  const operationLabel = snapshot.subtractMode ? "sA - B" : "sA + B";
  const scalarSummary =
    snapshot.scalar < 0
      ? "The negative scalar flips vector A through the origin before scaling it."
      : Math.abs(snapshot.scalar) < 1
        ? "The scalar compresses vector A before it combines with vector B."
        : Math.abs(snapshot.scalar) > 1
          ? "The scalar stretches vector A before it combines with vector B."
          : "The scalar keeps vector A at its original size before combination.";
  const resultSummary =
    snapshot.resultMagnitude <= 0.05
      ? "The combined vector is almost the zero vector right now."
      : `The result points at about ${formatNumber(snapshot.resultAngle)} degrees with magnitude ${formatNumber(snapshot.resultMagnitude)}.`;

  return `${operationLabel} gives result <${formatNumber(snapshot.resultX)}, ${formatNumber(snapshot.resultY)}>. ${scalarSummary} ${resultSummary}`;
}
