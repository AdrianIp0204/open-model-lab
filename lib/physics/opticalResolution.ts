import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type OpticalResolutionParams = {
  wavelengthNm: number;
  apertureMm: number;
  separationMrad: number;
  probeYUm: number;
};

export type OpticalResolutionProfileSample = {
  imageYUm: number;
  pointAExposure: number;
  pointBExposure: number;
  combinedExposure: number;
  normalizedPointAExposure: number;
  normalizedPointBExposure: number;
  normalizedCombinedExposure: number;
};

export type OpticalResolutionSnapshot = {
  wavelengthNm: number;
  apertureMm: number;
  separationMrad: number;
  probeYUm: number;
  focalLengthMm: number;
  pointACenterUm: number;
  pointBCenterUm: number;
  rayleighLimitRad: number;
  rayleighLimitMrad: number;
  airyRadiusUm: number;
  imageSeparationUm: number;
  separationRatio: number;
  probePointAExposure: number;
  probePointBExposure: number;
  probeExposure: number;
  peakExposure: number;
  centerExposure: number;
  centerDipRatio: number;
  rayleighResolvedFlag: boolean;
  resolutionLabel: "merged" | "threshold" | "resolved";
};

export const OPTICAL_RESOLUTION_FOCAL_LENGTH_MM = 120;
export const OPTICAL_RESOLUTION_MIN_WAVELENGTH_NM = 420;
export const OPTICAL_RESOLUTION_MAX_WAVELENGTH_NM = 700;
export const OPTICAL_RESOLUTION_MIN_APERTURE_MM = 0.8;
export const OPTICAL_RESOLUTION_MAX_APERTURE_MM = 4.5;
export const OPTICAL_RESOLUTION_MIN_SEPARATION_MRAD = 0.08;
export const OPTICAL_RESOLUTION_MAX_SEPARATION_MRAD = 1.4;
export const OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM = 180;

const PROFILE_SAMPLE_COUNT = 241;
const PEAK_SAMPLE_COUNT = 721;
const BESSEL_INTEGRATION_STEPS = 72;

function besselJ1(value: number) {
  if (value === 0) {
    return 0;
  }

  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);

  if (x < 1e-3) {
    return (
      sign *
      (x / 2 - (x * x * x) / 16 + (x * x * x * x * x) / 384)
    );
  }

  const step = Math.PI / BESSEL_INTEGRATION_STEPS;
  let total = 0;

  for (let index = 0; index <= BESSEL_INTEGRATION_STEPS; index += 1) {
    const t = index * step;
    const term = Math.cos(t - x * Math.sin(t));
    const weight =
      index === 0 || index === BESSEL_INTEGRATION_STEPS ? 1 : index % 2 === 0 ? 2 : 4;
    total += weight * term;
  }

  return sign * ((step / 3) * total) / Math.PI;
}

function resolveAiryArgument(
  apertureMm: number,
  wavelengthNm: number,
  imageYUm: number,
  imageCenterUm: number,
) {
  const apertureMeters = apertureMm * 1e-3;
  const wavelengthMeters = wavelengthNm * 1e-9;
  const focalLengthMeters = OPTICAL_RESOLUTION_FOCAL_LENGTH_MM * 1e-3;
  const angularOffset = ((imageYUm - imageCenterUm) * 1e-6) / focalLengthMeters;

  return (Math.PI * apertureMeters * angularOffset) / wavelengthMeters;
}

function resolveAiryExposure(argument: number) {
  if (Math.abs(argument) < 1e-6) {
    return 1;
  }

  const j1 = besselJ1(argument);
  return clamp(((2 * j1) / argument) ** 2, 0, 1);
}

function classifyResolution(separationRatio: number) {
  if (separationRatio < 0.85) {
    return "merged" as const;
  }

  if (separationRatio < 1.15) {
    return "threshold" as const;
  }

  return "resolved" as const;
}

function resolveProfileRaw(
  params: OpticalResolutionParams,
  imageYUm: number,
) {
  const imageSeparationUm =
    OPTICAL_RESOLUTION_FOCAL_LENGTH_MM * params.separationMrad;
  const pointACenterUm = -imageSeparationUm / 2;
  const pointBCenterUm = imageSeparationUm / 2;
  const pointAExposure = resolveAiryExposure(
    resolveAiryArgument(params.apertureMm, params.wavelengthNm, imageYUm, pointACenterUm),
  );
  const pointBExposure = resolveAiryExposure(
    resolveAiryArgument(params.apertureMm, params.wavelengthNm, imageYUm, pointBCenterUm),
  );

  return {
    pointACenterUm,
    pointBCenterUm,
    pointAExposure,
    pointBExposure,
    combinedExposure: pointAExposure + pointBExposure,
  };
}

function buildProfileSamples(
  params: OpticalResolutionParams,
  sampleCount = PROFILE_SAMPLE_COUNT,
) {
  const rawSamples = sampleRange(
    -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
    OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
    sampleCount,
  ).map((imageYUm) => ({
    imageYUm,
    ...resolveProfileRaw(params, imageYUm),
  }));
  const peakExposure = Math.max(
    ...rawSamples.map((sample) => sample.combinedExposure),
    1e-9,
  );

  return {
    peakExposure,
    samples: rawSamples.map((sample) => ({
      imageYUm: sample.imageYUm,
      pointAExposure: sample.pointAExposure,
      pointBExposure: sample.pointBExposure,
      combinedExposure: sample.combinedExposure,
      normalizedPointAExposure: sample.pointAExposure / peakExposure,
      normalizedPointBExposure: sample.pointBExposure / peakExposure,
      normalizedCombinedExposure: sample.combinedExposure / peakExposure,
    })),
  };
}

export function resolveOpticalResolutionParams(
  source: Partial<OpticalResolutionParams> | Record<string, number | boolean | string>,
): OpticalResolutionParams {
  return {
    wavelengthNm: clamp(
      safeNumber(source.wavelengthNm, 550),
      OPTICAL_RESOLUTION_MIN_WAVELENGTH_NM,
      OPTICAL_RESOLUTION_MAX_WAVELENGTH_NM,
    ),
    apertureMm: clamp(
      safeNumber(source.apertureMm, 2.4),
      OPTICAL_RESOLUTION_MIN_APERTURE_MM,
      OPTICAL_RESOLUTION_MAX_APERTURE_MM,
    ),
    separationMrad: clamp(
      safeNumber(source.separationMrad, 0.32),
      OPTICAL_RESOLUTION_MIN_SEPARATION_MRAD,
      OPTICAL_RESOLUTION_MAX_SEPARATION_MRAD,
    ),
    probeYUm: clamp(
      safeNumber(source.probeYUm, 0),
      -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
      OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
    ),
  };
}

export function sampleOpticalResolutionProfile(
  source: Partial<OpticalResolutionParams> | Record<string, number | boolean | string>,
  imageYUm: number,
): OpticalResolutionProfileSample {
  const params = resolveOpticalResolutionParams(source);
  const peakExposure = buildProfileSamples(params, PEAK_SAMPLE_COUNT).peakExposure;
  const raw = resolveProfileRaw(
    params,
    clamp(
      imageYUm,
      -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
      OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
    ),
  );

  return {
    imageYUm,
    pointAExposure: raw.pointAExposure,
    pointBExposure: raw.pointBExposure,
    combinedExposure: raw.combinedExposure,
    normalizedPointAExposure: raw.pointAExposure / peakExposure,
    normalizedPointBExposure: raw.pointBExposure / peakExposure,
    normalizedCombinedExposure: raw.combinedExposure / peakExposure,
  };
}

export function sampleOpticalResolutionState(
  source: Partial<OpticalResolutionParams> | Record<string, number | boolean | string>,
  probeYOverride?: number,
): OpticalResolutionSnapshot {
  const resolved = resolveOpticalResolutionParams(source);
  const params =
    probeYOverride === undefined
      ? resolved
      : {
          ...resolved,
          probeYUm: clamp(
            probeYOverride,
            -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
            OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
          ),
        };
  const profile = sampleOpticalResolutionProfile(params, params.probeYUm);
  const centerProfile = sampleOpticalResolutionProfile(params, 0);
  const imageSeparationUm =
    OPTICAL_RESOLUTION_FOCAL_LENGTH_MM * params.separationMrad;
  const rayleighLimitRad =
    (1.22 * params.wavelengthNm * 1e-9) / (params.apertureMm * 1e-3);
  const rayleighLimitMrad = rayleighLimitRad * 1e3;
  const airyRadiusUm =
    OPTICAL_RESOLUTION_FOCAL_LENGTH_MM * rayleighLimitMrad;
  const separationRatio = params.separationMrad / rayleighLimitMrad;

  return {
    wavelengthNm: params.wavelengthNm,
    apertureMm: params.apertureMm,
    separationMrad: params.separationMrad,
    probeYUm: params.probeYUm,
    focalLengthMm: OPTICAL_RESOLUTION_FOCAL_LENGTH_MM,
    pointACenterUm: -imageSeparationUm / 2,
    pointBCenterUm: imageSeparationUm / 2,
    rayleighLimitRad,
    rayleighLimitMrad,
    airyRadiusUm,
    imageSeparationUm,
    separationRatio,
    probePointAExposure: profile.normalizedPointAExposure,
    probePointBExposure: profile.normalizedPointBExposure,
    probeExposure: profile.normalizedCombinedExposure,
    peakExposure: 1,
    centerExposure: centerProfile.normalizedCombinedExposure,
    centerDipRatio: centerProfile.normalizedCombinedExposure,
    rayleighResolvedFlag: separationRatio >= 1,
    resolutionLabel: classifyResolution(separationRatio),
  };
}

export function sampleOpticalResolutionProfileSamples(
  source: Partial<OpticalResolutionParams> | Record<string, number | boolean | string>,
  sampleCount = PROFILE_SAMPLE_COUNT,
) {
  return buildProfileSamples(resolveOpticalResolutionParams(source), sampleCount).samples;
}

export function buildOpticalResolutionSeries(
  source: Partial<OpticalResolutionParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const profileSamples = sampleOpticalResolutionProfileSamples(source, PROFILE_SAMPLE_COUNT);

  return {
    "image-profile": [
      buildSeries(
        "combined-profile",
        "Combined exposure",
        profileSamples.map((sample) => ({
          x: sample.imageYUm,
          y: sample.normalizedCombinedExposure,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "point-a-profile",
        "Point A spread",
        profileSamples.map((sample) => ({
          x: sample.imageYUm,
          y: sample.normalizedPointAExposure,
        })),
        "#1ea6a2",
        true,
      ),
      buildSeries(
        "point-b-profile",
        "Point B spread",
        profileSamples.map((sample) => ({
          x: sample.imageYUm,
          y: sample.normalizedPointBExposure,
        })),
        "#f16659",
        true,
      ),
    ],
  };
}

export function describeOpticalResolutionState(
  source: Partial<OpticalResolutionParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleOpticalResolutionState(source);
  const resolutionText =
    snapshot.resolutionLabel === "merged"
      ? "The peaks are still mostly merged."
      : snapshot.resolutionLabel === "threshold"
        ? "The pair is near the Rayleigh threshold."
        : "A distinct dip now separates the peaks clearly.";

  return `With wavelength ${formatMeasurement(snapshot.wavelengthNm, "nm")} and aperture ${formatMeasurement(snapshot.apertureMm, "mm")}, the Rayleigh limit is about ${formatMeasurement(snapshot.rayleighLimitMrad, "mrad")}. The current point separation is ${formatMeasurement(snapshot.separationMrad, "mrad")}, which is ${formatNumber(snapshot.separationRatio)} times that limit. ${resolutionText}`;
}
