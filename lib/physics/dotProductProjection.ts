import { buildSeries } from "./series";
import { clamp, degToRad, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type DotProductProjectionParams = {
  ax?: number;
  ay?: number;
  bx?: number;
  by?: number;
};

export type DotProductProjectionSnapshot = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  magnitudeA: number;
  magnitudeB: number;
  angleA: number;
  angleB: number;
  signedAngleBetween: number;
  angleBetween: number;
  dotProduct: number;
  projectionScalar: number;
  projectionX: number;
  projectionY: number;
  projectionMagnitude: number;
  rejectionX: number;
  rejectionY: number;
  rejectionMagnitude: number;
  alignmentLabel: "positive" | "orthogonal" | "negative";
};

export type DotProductProjectionViewport = {
  maxAbsCoordinate: number;
};

export const DOT_PRODUCT_PROJECTION_COMPONENT_MIN = -5;
export const DOT_PRODUCT_PROJECTION_COMPONENT_MAX = 5;
export const DOT_PRODUCT_PROJECTION_RESPONSE_MIN_ANGLE = 0;
export const DOT_PRODUCT_PROJECTION_RESPONSE_MAX_ANGLE = 180;

const RESPONSE_SAMPLES = 181;
const VIEWPORT_BUCKETS = [4, 6, 8, 10, 12];
const ZERO_TOLERANCE = 0.08;

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

function normalizeSignedAngleDegrees(value: number) {
  let normalized = value % 360;

  if (normalized <= -180) {
    normalized += 360;
  }

  if (normalized > 180) {
    normalized -= 360;
  }

  return normalized;
}

export function resolveDotProductProjectionParams(
  source: Partial<DotProductProjectionParams> | Record<string, number | boolean | string>,
): Required<DotProductProjectionParams> {
  return {
    ax: clamp(
      safeNumber(source.ax, 4),
      DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
      DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
    ),
    ay: clamp(
      safeNumber(source.ay, 1.5),
      DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
      DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
    ),
    bx: clamp(
      safeNumber(source.bx, 3),
      DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
      DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
    ),
    by: clamp(
      safeNumber(source.by, 2.5),
      DOT_PRODUCT_PROJECTION_COMPONENT_MIN,
      DOT_PRODUCT_PROJECTION_COMPONENT_MAX,
    ),
  };
}

export function sampleDotProductProjectionState(
  source: Partial<DotProductProjectionParams> | Record<string, number | boolean | string>,
): DotProductProjectionSnapshot {
  const resolved = resolveDotProductProjectionParams(source);
  const magnitudeA = magnitude(resolved.ax, resolved.ay);
  const magnitudeB = magnitude(resolved.bx, resolved.by);
  const angleA = angleDegrees(resolved.ax, resolved.ay);
  const angleB = angleDegrees(resolved.bx, resolved.by);
  const dotProduct = resolved.ax * resolved.bx + resolved.ay * resolved.by;
  const signedAngleBetween =
    magnitudeA <= 0.0001 || magnitudeB <= 0.0001
      ? 0
      : normalizeSignedAngleDegrees(angleB - angleA);
  const angleBetween = Math.abs(signedAngleBetween);
  const projectionScalar = magnitudeA <= 0.0001 ? 0 : dotProduct / magnitudeA;
  const projectionScale = magnitudeA <= 0.0001 ? 0 : dotProduct / Math.max(magnitudeA * magnitudeA, Number.EPSILON);
  const projectionX = projectionScale * resolved.ax;
  const projectionY = projectionScale * resolved.ay;
  const rejectionX = resolved.bx - projectionX;
  const rejectionY = resolved.by - projectionY;
  const alignmentLabel =
    dotProduct > ZERO_TOLERANCE
      ? "positive"
      : dotProduct < -ZERO_TOLERANCE
        ? "negative"
        : "orthogonal";

  return {
    ...resolved,
    magnitudeA,
    magnitudeB,
    angleA,
    angleB,
    signedAngleBetween,
    angleBetween,
    dotProduct,
    projectionScalar,
    projectionX,
    projectionY,
    projectionMagnitude: magnitude(projectionX, projectionY),
    rejectionX,
    rejectionY,
    rejectionMagnitude: magnitude(rejectionX, rejectionY),
    alignmentLabel,
  };
}

export function buildDotProductProjectionPreviewState(
  source: Partial<DotProductProjectionParams> | Record<string, number | boolean | string>,
  angleBetween: number,
) {
  const resolved = resolveDotProductProjectionParams(source);
  const magnitudeB = magnitude(resolved.bx, resolved.by);

  if (magnitudeB <= 0.0001) {
    return sampleDotProductProjectionState(resolved);
  }

  const previewAngle = angleDegrees(resolved.ax, resolved.ay) + angleBetween;
  const previewAngleRad = degToRad(previewAngle);

  return sampleDotProductProjectionState({
    ...resolved,
    bx: magnitudeB * Math.cos(previewAngleRad),
    by: magnitudeB * Math.sin(previewAngleRad),
  });
}

export function resolveDotProductProjectionViewport(
  paramsList: Array<Partial<DotProductProjectionParams> | Record<string, number | boolean | string>>,
) {
  const maxMagnitude = Math.max(
    ...paramsList.flatMap((params) => {
      const snapshot = sampleDotProductProjectionState(params);
      return [snapshot.magnitudeA, snapshot.magnitudeB];
    }),
    4,
  );

  return {
    maxAbsCoordinate: pickBucket(maxMagnitude * 1.18, VIEWPORT_BUCKETS),
  } satisfies DotProductProjectionViewport;
}

export function buildDotProductProjectionSeries(
  source: Partial<DotProductProjectionParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveDotProductProjectionParams(source);
  const angleSamples = sampleRange(
    DOT_PRODUCT_PROJECTION_RESPONSE_MIN_ANGLE,
    DOT_PRODUCT_PROJECTION_RESPONSE_MAX_ANGLE,
    RESPONSE_SAMPLES,
  );

  return {
    "dot-product-response": [
      buildSeries(
        "dot-product",
        "A dot B",
        angleSamples.map((angleBetween) => ({
          x: angleBetween,
          y: buildDotProductProjectionPreviewState(resolved, angleBetween).dotProduct,
        })),
        "#f16659",
      ),
    ],
    "projection-response": [
      buildSeries(
        "projection-scalar",
        "comp_A(B)",
        angleSamples.map((angleBetween) => ({
          x: angleBetween,
          y: buildDotProductProjectionPreviewState(resolved, angleBetween).projectionScalar,
        })),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeDotProductProjectionState(
  source: Partial<DotProductProjectionParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleDotProductProjectionState(source);

  if (snapshot.magnitudeA <= 0.0001) {
    return "Vector A is nearly zero, so the along-A projection has collapsed and the dot-product sign story is not informative yet.";
  }

  if (snapshot.magnitudeB <= 0.0001) {
    return "Vector B is nearly zero, so its dot product and projection onto A are both essentially zero.";
  }

  const alignmentSummary =
    snapshot.alignmentLabel === "positive"
      ? "B still points partly along A, so the projection lands in A's direction."
      : snapshot.alignmentLabel === "negative"
        ? "B points partly against A, so the projection lands opposite A's direction."
        : "The vectors are nearly orthogonal, so the along-A projection has collapsed close to zero.";

  return `A dot B = ${formatNumber(snapshot.dotProduct)}. The angle between the vectors is about ${formatNumber(snapshot.angleBetween)} deg, and the scalar projection of B onto A is ${formatNumber(snapshot.projectionScalar)}. ${alignmentSummary}`;
}
