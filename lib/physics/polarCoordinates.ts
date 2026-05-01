import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";
import { buildSeries } from "./series";
import { clamp, degToRad, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type PolarCoordinatesParams = {
  radius?: number;
  angleDeg?: number;
};

export type PolarCoordinatesSnapshot = {
  radius: number;
  angleDeg: number;
  wrappedAngleDeg: number;
  angleRad: number;
  x: number;
  y: number;
  cosTheta: number;
  sinTheta: number;
  principalAngleDeg: number;
  radiusSquared: number;
  regionLabel: string;
  xSign: "positive" | "negative" | "zero";
  ySign: "positive" | "negative" | "zero";
  referenceAngleDeg: number;
};

export type PolarCoordinatesViewport = {
  maxAbsCoordinate: number;
};

export const POLAR_COORDINATES_RADIUS_MIN = 0.5;
export const POLAR_COORDINATES_RADIUS_MAX = 5;
export const POLAR_COORDINATES_ANGLE_MIN = 0;
export const POLAR_COORDINATES_ANGLE_MAX = 360;

const AXIS_EPSILON = 0.03;
const VIEWPORT_BUCKETS = [2, 4, 6, 8, 10, 12];
const ANGLE_SAMPLES = 181;

function normalizeAngleDeg(angleDeg: number) {
  const wrapped = ((angleDeg % 360) + 360) % 360;
  return Math.abs(wrapped) < 0.0001 ? 0 : wrapped;
}

function resolveAxisSign(value: number): PolarCoordinatesSnapshot["xSign"] {
  if (value > AXIS_EPSILON) {
    return "positive";
  }

  if (value < -AXIS_EPSILON) {
    return "negative";
  }

  return "zero";
}

function resolveRegionLabel(angleDeg: number) {
  const angleRad = degToRad(normalizeAngleDeg(angleDeg));
  const x = Math.cos(angleRad);
  const y = Math.sin(angleRad);

  if (Math.abs(y) <= AXIS_EPSILON && x >= 0) {
    return "Positive x-axis";
  }

  if (Math.abs(y) <= AXIS_EPSILON && x < 0) {
    return "Negative x-axis";
  }

  if (Math.abs(x) <= AXIS_EPSILON && y > 0) {
    return "Positive y-axis";
  }

  if (Math.abs(x) <= AXIS_EPSILON && y < 0) {
    return "Negative y-axis";
  }

  if (x > 0 && y > 0) {
    return "Quadrant I";
  }

  if (x < 0 && y > 0) {
    return "Quadrant II";
  }

  if (x < 0 && y < 0) {
    return "Quadrant III";
  }

  return "Quadrant IV";
}

function resolveReferenceAngleDeg(angleDeg: number) {
  const wrapped = normalizeAngleDeg(angleDeg);

  if (wrapped <= 90) {
    return wrapped;
  }

  if (wrapped <= 180) {
    return 180 - wrapped;
  }

  if (wrapped <= 270) {
    return wrapped - 180;
  }

  return 360 - wrapped;
}

function resolvePrincipalAngleDeg(x: number, y: number) {
  if (Math.abs(x) <= AXIS_EPSILON) {
    if (y > 0) {
      return 90;
    }

    if (y < 0) {
      return -90;
    }

    return 0;
  }

  return (Math.atan(y / x) * 180) / Math.PI;
}

function pickBucket(value: number) {
  const safeValue = Math.max(0, value);
  return (
    VIEWPORT_BUCKETS.find((bucket) => safeValue <= bucket) ??
    VIEWPORT_BUCKETS.at(-1) ??
    safeValue
  );
}

export function resolvePolarCoordinatesParams(
  source: Partial<PolarCoordinatesParams> | Record<string, number | boolean | string>,
): Required<PolarCoordinatesParams> {
  return {
    radius: clamp(
      safeNumber(source.radius, 3.2),
      POLAR_COORDINATES_RADIUS_MIN,
      POLAR_COORDINATES_RADIUS_MAX,
    ),
    angleDeg: clamp(
      safeNumber(source.angleDeg, 55),
      POLAR_COORDINATES_ANGLE_MIN,
      POLAR_COORDINATES_ANGLE_MAX,
    ),
  };
}

export function samplePolarCoordinatesState(
  source: Partial<PolarCoordinatesParams> | Record<string, number | boolean | string>,
): PolarCoordinatesSnapshot {
  const params = resolvePolarCoordinatesParams(source);
  const wrappedAngleDeg = normalizeAngleDeg(params.angleDeg);
  const angleRad = degToRad(params.angleDeg);
  const x = params.radius * Math.cos(angleRad);
  const y = params.radius * Math.sin(angleRad);

  return {
    ...params,
    wrappedAngleDeg,
    angleRad,
    x,
    y,
    cosTheta: Math.cos(angleRad),
    sinTheta: Math.sin(angleRad),
    principalAngleDeg: resolvePrincipalAngleDeg(x, y),
    radiusSquared: params.radius ** 2,
    regionLabel: resolveRegionLabel(params.angleDeg),
    xSign: resolveAxisSign(x),
    ySign: resolveAxisSign(y),
    referenceAngleDeg: resolveReferenceAngleDeg(params.angleDeg),
  };
}

export function resolvePolarCoordinatesViewport(
  paramsList: Array<Partial<PolarCoordinatesParams> | Record<string, number | boolean | string>>,
) {
  const maxAbsCoordinate = Math.max(
    ...paramsList.flatMap((params) => {
      const snapshot = samplePolarCoordinatesState(params);
      return [snapshot.radius, Math.abs(snapshot.x), Math.abs(snapshot.y)];
    }),
    2,
  );

  return {
    maxAbsCoordinate: pickBucket(maxAbsCoordinate * 1.14),
  } satisfies PolarCoordinatesViewport;
}

export function buildPolarCoordinatesSeries(
  source: Partial<PolarCoordinatesParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolvePolarCoordinatesParams(source);
  const angleSamples = sampleRange(
    POLAR_COORDINATES_ANGLE_MIN,
    POLAR_COORDINATES_ANGLE_MAX,
    ANGLE_SAMPLES,
  );

  return {
    "coordinate-sweep": [
      buildSeries(
        "x-coordinate",
        copyText(locale, "x = r cos(theta)", "x = r cos(theta)"),
        angleSamples.map((angleDeg) => ({
          x: angleDeg,
          y: samplePolarCoordinatesState({ ...resolved, angleDeg }).x,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "y-coordinate",
        copyText(locale, "y = r sin(theta)", "y = r sin(theta)"),
        angleSamples.map((angleDeg) => ({
          x: angleDeg,
          y: samplePolarCoordinatesState({ ...resolved, angleDeg }).y,
        })),
        "#4ea6df",
      ),
    ],
    "angle-recovery": [
      buildSeries(
        "actual-angle",
        copyText(locale, "actual theta", "實際 θ"),
        angleSamples.map((angleDeg) => ({
          x: angleDeg,
          y: samplePolarCoordinatesState({ ...resolved, angleDeg }).wrappedAngleDeg,
        })),
        "#315063",
      ),
      buildSeries(
        "principal-ratio-angle",
        copyText(locale, "arctan(y / x)", "arctan(y / x)"),
        angleSamples.map((angleDeg) => ({
          x: angleDeg,
          y: samplePolarCoordinatesState({ ...resolved, angleDeg }).principalAngleDeg,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describePolarCoordinatesState(
  source: Partial<PolarCoordinatesParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
) {
  const snapshot = samplePolarCoordinatesState(source);

  if (locale === "zh-HK") {
    return `極坐標點由 r = ${formatNumber(snapshot.radius)} 和 θ = ${formatNumber(snapshot.angleDeg)}° 決定，因此同一點在笛卡兒坐標中位於 (x, y) = (${formatNumber(snapshot.x)}, ${formatNumber(snapshot.y)})。這些坐標直接來自 x = r cos(theta) 和 y = r sin(theta)。`;
  }

  return `The polar point is set by r = ${formatNumber(snapshot.radius)} and theta = ${formatNumber(snapshot.angleDeg)} deg, which places the same point at (x, y) = (${formatNumber(snapshot.x)}, ${formatNumber(snapshot.y)}). The Cartesian coordinates come straight from x = r cos(theta) and y = r sin(theta).`;
}
