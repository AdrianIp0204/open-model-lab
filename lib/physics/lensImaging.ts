import { buildSeries } from "./series";
import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import type { GraphSeries, GraphSeriesMap } from "./types";

export type LensImagingParams = {
  converging: boolean;
  focalLength: number;
  objectDistance: number;
  objectHeight: number;
};

export type LensImagingSnapshot = {
  converging: boolean;
  lensFamily: "converging" | "diverging";
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
    | "diverging"
    | "inside-focus"
    | "at-focus"
    | "between-focus-and-2f"
    | "at-2f"
    | "beyond-2f";
  canProjectOntoScreen: boolean;
  imageDistanceOffscale: boolean;
};

export const LENS_IMAGING_MIN_FOCAL_LENGTH = 0.4;
export const LENS_IMAGING_MAX_FOCAL_LENGTH = 1.8;
export const LENS_IMAGING_MIN_OBJECT_DISTANCE = 0.45;
export const LENS_IMAGING_MAX_OBJECT_DISTANCE = 4;
export const LENS_IMAGING_MIN_OBJECT_HEIGHT = 0.6;
export const LENS_IMAGING_MAX_OBJECT_HEIGHT = 1.8;
export const LENS_IMAGING_IMAGE_DISTANCE_PLOT_LIMIT = 4.4;
export const LENS_IMAGING_MAGNIFICATION_PLOT_LIMIT = 4;

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

function formatSignedLensValue(value: number, unit?: string) {
  if (!Number.isFinite(value)) {
    return value < 0 ? "-\u221e" : "\u221e";
  }

  return formatMeasurement(value, unit);
}

function formatSignedDistance(value: number) {
  return formatSignedLensValue(value, "m");
}

function classifyRegime(resolved: LensImagingParams) {
  if (!resolved.converging) {
    return "diverging" as const;
  }

  const twiceF = resolved.focalLength * 2;
  const focusGap = Math.abs(resolved.objectDistance - resolved.focalLength);
  const twiceFocusGap = Math.abs(resolved.objectDistance - twiceF);

  if (focusGap <= 0.04) {
    return "at-focus" as const;
  }

  if (resolved.objectDistance < resolved.focalLength) {
    return "inside-focus" as const;
  }

  if (twiceFocusGap <= 0.06) {
    return "at-2f" as const;
  }

  if (resolved.objectDistance < twiceF) {
    return "between-focus-and-2f" as const;
  }

  return "beyond-2f" as const;
}

function resolveImageDistance(signedFocalLength: number, objectDistance: number) {
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

export function resolveLensImagingParams(
  source: Partial<LensImagingParams> | Record<string, number | boolean | string>,
): LensImagingParams {
  return {
    converging: source.converging !== false,
    focalLength: clamp(
      safeNumber(source.focalLength, 0.8),
      LENS_IMAGING_MIN_FOCAL_LENGTH,
      LENS_IMAGING_MAX_FOCAL_LENGTH,
    ),
    objectDistance: clamp(
      safeNumber(source.objectDistance, 2),
      LENS_IMAGING_MIN_OBJECT_DISTANCE,
      LENS_IMAGING_MAX_OBJECT_DISTANCE,
    ),
    objectHeight: clamp(
      safeNumber(source.objectHeight, 1),
      LENS_IMAGING_MIN_OBJECT_HEIGHT,
      LENS_IMAGING_MAX_OBJECT_HEIGHT,
    ),
  };
}

export function sampleLensImagingState(
  source: Partial<LensImagingParams> | Record<string, number | boolean | string>,
  objectDistanceOverride?: number,
): LensImagingSnapshot {
  const resolvedBase = resolveLensImagingParams(source);
  const resolved =
    objectDistanceOverride === undefined
      ? resolvedBase
      : {
          ...resolvedBase,
          objectDistance: clamp(
            objectDistanceOverride,
            LENS_IMAGING_MIN_OBJECT_DISTANCE,
            LENS_IMAGING_MAX_OBJECT_DISTANCE,
          ),
        };
  const signedFocalLength = resolved.converging ? resolved.focalLength : -resolved.focalLength;
  const imageDistance = resolveImageDistance(signedFocalLength, resolved.objectDistance);
  const magnification = -imageDistance / resolved.objectDistance;
  const imageHeight = magnification * resolved.objectHeight;

  return {
    converging: resolved.converging,
    lensFamily: resolved.converging ? "converging" : "diverging",
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
      Math.abs(imageDistance) > LENS_IMAGING_IMAGE_DISTANCE_PLOT_LIMIT,
  };
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

export function buildLensImagingSeries(
  source: Partial<LensImagingParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveLensImagingParams(source);
  const imageDistanceAt = (objectDistance: number) =>
    clampForPlot(
      sampleLensImagingState(resolved, objectDistance).imageDistance,
      LENS_IMAGING_IMAGE_DISTANCE_PLOT_LIMIT,
    );
  const magnificationAt = (objectDistance: number) =>
    clampForPlot(
      sampleLensImagingState(resolved, objectDistance).magnification,
      LENS_IMAGING_MAGNIFICATION_PLOT_LIMIT,
    );

  if (!resolved.converging) {
    return {
      "image-map": [
        buildResponseBranch(
          "virtual-branch",
          "Virtual image distance",
          LENS_IMAGING_MIN_OBJECT_DISTANCE,
          LENS_IMAGING_MAX_OBJECT_DISTANCE,
          IMAGE_MAP_SAMPLES,
          imageDistanceAt,
          "#4ea6df",
        ),
      ].filter(Boolean) as GraphSeries[],
      magnification: [
        buildResponseBranch(
          "upright-branch",
          "Upright magnification",
          LENS_IMAGING_MIN_OBJECT_DISTANCE,
          LENS_IMAGING_MAX_OBJECT_DISTANCE,
          MAGNIFICATION_SAMPLES,
          magnificationAt,
          "#1ea6a2",
        ),
      ].filter(Boolean) as GraphSeries[],
    };
  }

  const nearFocusMax = Math.max(
    LENS_IMAGING_MIN_OBJECT_DISTANCE,
    resolved.focalLength - ASYMPTOTE_EPSILON,
  );
  const farFocusMin = Math.min(
    LENS_IMAGING_MAX_OBJECT_DISTANCE,
    resolved.focalLength + ASYMPTOTE_EPSILON,
  );

  return {
    "image-map": [
      buildResponseBranch(
        "virtual-branch",
        "Virtual branch",
        LENS_IMAGING_MIN_OBJECT_DISTANCE,
        nearFocusMax,
        Math.max(24, Math.round(IMAGE_MAP_SAMPLES * 0.45)),
        imageDistanceAt,
        "#4ea6df",
      ),
      buildResponseBranch(
        "real-branch",
        "Real branch",
        farFocusMin,
        LENS_IMAGING_MAX_OBJECT_DISTANCE,
        Math.max(24, Math.round(IMAGE_MAP_SAMPLES * 0.55)),
        imageDistanceAt,
        "#f16659",
      ),
    ].filter(Boolean) as GraphSeries[],
    magnification: [
      buildResponseBranch(
        "upright-branch",
        "Upright branch",
        LENS_IMAGING_MIN_OBJECT_DISTANCE,
        nearFocusMax,
        Math.max(24, Math.round(MAGNIFICATION_SAMPLES * 0.45)),
        magnificationAt,
        "#1ea6a2",
      ),
      buildResponseBranch(
        "inverted-branch",
        "Inverted branch",
        farFocusMin,
        LENS_IMAGING_MAX_OBJECT_DISTANCE,
        Math.max(24, Math.round(MAGNIFICATION_SAMPLES * 0.55)),
        magnificationAt,
        "#f0ab3c",
      ),
    ].filter(Boolean) as GraphSeries[],
  };
}

export function describeLensImagingState(
  source: Partial<LensImagingParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleLensImagingState(source);
  const signedFocalText = snapshot.converging
    ? formatMeasurement(snapshot.focalLength, "m")
    : `-${formatMeasurement(snapshot.focalLength, "m")}`;
  const imageSummary = `${snapshot.imageType} image at ${formatSignedDistance(snapshot.imageDistance)}`;
  const magnificationText = formatSignedLensValue(snapshot.magnification);

  const imageArticle = snapshot.orientation === "inverted" ? "an" : "a";

  return `The ${snapshot.lensFamily} lens uses signed focal length ${signedFocalText}. An object at ${formatMeasurement(snapshot.objectDistance, "m")} with height ${formatMeasurement(snapshot.objectHeight, "m")} forms ${imageArticle} ${snapshot.orientation}, ${snapshot.sizeRelation} ${imageSummary}, with magnification ${magnificationText}.`;
}
