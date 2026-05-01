import { buildSeries } from "./series";
import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import type { GraphSeries, GraphSeriesMap } from "./types";

export type MirrorsParams = {
  curved: boolean;
  concave: boolean;
  focalLength: number;
  objectDistance: number;
  objectHeight: number;
};

export type MirrorsSnapshot = {
  curved: boolean;
  concave: boolean;
  mirrorFamily: "plane" | "concave" | "convex";
  focalLength: number;
  signedFocalLength: number;
  objectDistance: number;
  objectHeight: number;
  imageDistance: number;
  magnification: number;
  imageHeight: number;
  imageType: "real" | "virtual";
  orientation: "upright" | "inverted";
  sizeRelation: "larger" | "same-size" | "smaller";
  regime:
    | "plane"
    | "convex"
    | "concave-inside-focus"
    | "concave-at-focus"
    | "concave-between-focus-and-center"
    | "concave-at-center"
    | "concave-beyond-center";
  canProjectOntoScreen: boolean;
  imageDistanceOffscale: boolean;
};

export const MIRRORS_MIN_FOCAL_LENGTH = 0.4;
export const MIRRORS_MAX_FOCAL_LENGTH = 1.8;
export const MIRRORS_MIN_OBJECT_DISTANCE = 0.35;
export const MIRRORS_MAX_OBJECT_DISTANCE = 4;
export const MIRRORS_MIN_OBJECT_HEIGHT = 0.6;
export const MIRRORS_MAX_OBJECT_HEIGHT = 1.8;
export const MIRRORS_IMAGE_DISTANCE_PLOT_LIMIT = 4.4;
export const MIRRORS_MAGNIFICATION_PLOT_LIMIT = 4;

const IMAGE_MAP_SAMPLES = 181;
const MAGNIFICATION_SAMPLES = 181;
const ASYMPTOTE_EPSILON = 0.03;
const INFINITY_THRESHOLD = 1e-6;

function clampForPlot(value: number, limit: number) {
  if (!Number.isFinite(value)) {
    return Math.sign(value || 1) * limit;
  }

  return clamp(value, -limit, limit);
}

function classifyRegime(resolved: MirrorsParams) {
  if (!resolved.curved) {
    return "plane" as const;
  }

  if (!resolved.concave) {
    return "convex" as const;
  }

  const centerDistance = resolved.focalLength * 2;
  const focusGap = Math.abs(resolved.objectDistance - resolved.focalLength);
  const centerGap = Math.abs(resolved.objectDistance - centerDistance);

  if (focusGap <= 0.04) {
    return "concave-at-focus" as const;
  }

  if (resolved.objectDistance < resolved.focalLength) {
    return "concave-inside-focus" as const;
  }

  if (centerGap <= 0.06) {
    return "concave-at-center" as const;
  }

  if (resolved.objectDistance < centerDistance) {
    return "concave-between-focus-and-center" as const;
  }

  return "concave-beyond-center" as const;
}

function resolveSignedFocalLength(resolved: MirrorsParams) {
  if (!resolved.curved) {
    return Number.POSITIVE_INFINITY;
  }

  return resolved.concave ? resolved.focalLength : -resolved.focalLength;
}

function resolveImageDistance(signedFocalLength: number, objectDistance: number) {
  if (!Number.isFinite(signedFocalLength)) {
    return -objectDistance;
  }

  const denominator = 1 / signedFocalLength - 1 / objectDistance;

  if (Math.abs(denominator) <= INFINITY_THRESHOLD) {
    return signedFocalLength > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }

  return 1 / denominator;
}

function classifySizeRelation(magnification: number) {
  const absoluteMagnification = Math.abs(magnification);

  if (Math.abs(absoluteMagnification - 1) <= 0.04) {
    return "same-size" as const;
  }

  return absoluteMagnification > 1 ? "larger" : "smaller";
}

function buildResponseBranch(
  id: string,
  label: string,
  xStart: number,
  xEnd: number,
  samples: number,
  sampleY: (objectDistance: number) => number,
  color: string,
): GraphSeries | null {
  if (!(xEnd > xStart)) {
    return null;
  }

  return buildSeries(
    id,
    label,
    sampleRange(xStart, xEnd, samples).map((objectDistance) => ({
      x: objectDistance,
      y: sampleY(objectDistance),
    })),
    color,
  );
}

function formatSignedMirrorValue(value: number, unit?: string) {
  if (!Number.isFinite(value)) {
    return value < 0 ? "-\u221e" : "\u221e";
  }

  return formatMeasurement(value, unit);
}

function formatSignedDistance(value: number) {
  return formatSignedMirrorValue(value, "m");
}

export function resolveMirrorsParams(
  source: Partial<MirrorsParams> | Record<string, number | boolean | string>,
): MirrorsParams {
  return {
    curved: source.curved !== false,
    concave: source.concave !== false,
    focalLength: clamp(
      safeNumber(source.focalLength, 0.8),
      MIRRORS_MIN_FOCAL_LENGTH,
      MIRRORS_MAX_FOCAL_LENGTH,
    ),
    objectDistance: clamp(
      safeNumber(source.objectDistance, 2),
      MIRRORS_MIN_OBJECT_DISTANCE,
      MIRRORS_MAX_OBJECT_DISTANCE,
    ),
    objectHeight: clamp(
      safeNumber(source.objectHeight, 1),
      MIRRORS_MIN_OBJECT_HEIGHT,
      MIRRORS_MAX_OBJECT_HEIGHT,
    ),
  };
}

export function sampleMirrorsState(
  source: Partial<MirrorsParams> | Record<string, number | boolean | string>,
  objectDistanceOverride?: number,
): MirrorsSnapshot {
  const resolvedBase = resolveMirrorsParams(source);
  const resolved =
    objectDistanceOverride === undefined
      ? resolvedBase
      : {
          ...resolvedBase,
          objectDistance: clamp(
            objectDistanceOverride,
            MIRRORS_MIN_OBJECT_DISTANCE,
            MIRRORS_MAX_OBJECT_DISTANCE,
          ),
        };
  const signedFocalLength = resolveSignedFocalLength(resolved);
  const imageDistance = resolveImageDistance(signedFocalLength, resolved.objectDistance);
  const magnification = -imageDistance / resolved.objectDistance;
  const imageHeight = magnification * resolved.objectHeight;

  return {
    curved: resolved.curved,
    concave: resolved.concave,
    mirrorFamily: !resolved.curved ? "plane" : resolved.concave ? "concave" : "convex",
    focalLength: resolved.focalLength,
    signedFocalLength,
    objectDistance: resolved.objectDistance,
    objectHeight: resolved.objectHeight,
    imageDistance,
    magnification,
    imageHeight,
    imageType: imageDistance > 0 ? "real" : "virtual",
    orientation: imageHeight >= 0 ? "upright" : "inverted",
    sizeRelation: classifySizeRelation(magnification),
    regime: classifyRegime(resolved),
    canProjectOntoScreen: Number.isFinite(imageDistance) && imageDistance > 0,
    imageDistanceOffscale:
      !Number.isFinite(imageDistance) ||
      Math.abs(imageDistance) > MIRRORS_IMAGE_DISTANCE_PLOT_LIMIT,
  };
}

export function buildMirrorsSeries(
  source: Partial<MirrorsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveMirrorsParams(source);
  const imageDistanceAt = (objectDistance: number) =>
    clampForPlot(
      sampleMirrorsState(resolved, objectDistance).imageDistance,
      MIRRORS_IMAGE_DISTANCE_PLOT_LIMIT,
    );
  const magnificationAt = (objectDistance: number) =>
    clampForPlot(
      sampleMirrorsState(resolved, objectDistance).magnification,
      MIRRORS_MAGNIFICATION_PLOT_LIMIT,
    );

  if (!resolved.curved) {
    return {
      "image-map": [
        buildResponseBranch(
          "plane-line",
          "Plane mirror",
          MIRRORS_MIN_OBJECT_DISTANCE,
          MIRRORS_MAX_OBJECT_DISTANCE,
          IMAGE_MAP_SAMPLES,
          imageDistanceAt,
          "#4ea6df",
        ),
      ].filter(Boolean) as GraphSeries[],
      magnification: [
        buildResponseBranch(
          "same-size-line",
          "Plane mirror magnification",
          MIRRORS_MIN_OBJECT_DISTANCE,
          MIRRORS_MAX_OBJECT_DISTANCE,
          MAGNIFICATION_SAMPLES,
          magnificationAt,
          "#1ea6a2",
        ),
      ].filter(Boolean) as GraphSeries[],
    };
  }

  if (!resolved.concave) {
    return {
      "image-map": [
        buildResponseBranch(
          "virtual-branch",
          "Virtual image distance",
          MIRRORS_MIN_OBJECT_DISTANCE,
          MIRRORS_MAX_OBJECT_DISTANCE,
          IMAGE_MAP_SAMPLES,
          imageDistanceAt,
          "#4ea6df",
        ),
      ].filter(Boolean) as GraphSeries[],
      magnification: [
        buildResponseBranch(
          "upright-branch",
          "Upright magnification",
          MIRRORS_MIN_OBJECT_DISTANCE,
          MIRRORS_MAX_OBJECT_DISTANCE,
          MAGNIFICATION_SAMPLES,
          magnificationAt,
          "#1ea6a2",
        ),
      ].filter(Boolean) as GraphSeries[],
    };
  }

  const nearFocusMax = Math.max(
    MIRRORS_MIN_OBJECT_DISTANCE,
    resolved.focalLength - ASYMPTOTE_EPSILON,
  );
  const farFocusMin = Math.min(
    MIRRORS_MAX_OBJECT_DISTANCE,
    resolved.focalLength + ASYMPTOTE_EPSILON,
  );

  return {
    "image-map": [
      buildResponseBranch(
        "virtual-branch",
        "Virtual branch",
        MIRRORS_MIN_OBJECT_DISTANCE,
        nearFocusMax,
        Math.max(24, Math.round(IMAGE_MAP_SAMPLES * 0.45)),
        imageDistanceAt,
        "#4ea6df",
      ),
      buildResponseBranch(
        "real-branch",
        "Real branch",
        farFocusMin,
        MIRRORS_MAX_OBJECT_DISTANCE,
        Math.max(24, Math.round(IMAGE_MAP_SAMPLES * 0.55)),
        imageDistanceAt,
        "#f16659",
      ),
    ].filter(Boolean) as GraphSeries[],
    magnification: [
      buildResponseBranch(
        "upright-branch",
        "Upright branch",
        MIRRORS_MIN_OBJECT_DISTANCE,
        nearFocusMax,
        Math.max(24, Math.round(MAGNIFICATION_SAMPLES * 0.45)),
        magnificationAt,
        "#1ea6a2",
      ),
      buildResponseBranch(
        "inverted-branch",
        "Inverted branch",
        farFocusMin,
        MIRRORS_MAX_OBJECT_DISTANCE,
        Math.max(24, Math.round(MAGNIFICATION_SAMPLES * 0.55)),
        magnificationAt,
        "#f0ab3c",
      ),
    ].filter(Boolean) as GraphSeries[],
  };
}

export function describeMirrorsState(
  source: Partial<MirrorsParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleMirrorsState(source);
  const signedFocalText = !snapshot.curved
    ? "\u221e"
    : snapshot.concave
      ? formatMeasurement(snapshot.focalLength, "m")
      : `-${formatMeasurement(snapshot.focalLength, "m")}`;
  const imageSummary = `${snapshot.imageType} image at ${formatSignedDistance(snapshot.imageDistance)}`;
  const magnificationText = formatSignedMirrorValue(snapshot.magnification);

  return `The ${snapshot.mirrorFamily} mirror uses signed focal length ${signedFocalText}. An object at ${formatMeasurement(snapshot.objectDistance, "m")} with height ${formatMeasurement(snapshot.objectHeight, "m")} forms a ${snapshot.orientation}, ${snapshot.sizeRelation} ${imageSummary}, with magnification ${magnificationText}.`;
}
