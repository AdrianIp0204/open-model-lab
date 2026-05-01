import { buildSeries } from "./series";
import { clamp, degToRad, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import type { GraphSeriesMap } from "./types";

export type PolarizationParams = {
  inputAmplitude: number;
  inputAngle: number;
  polarizerAngle: number;
  unpolarized: boolean;
};

export type PolarizationSnapshot = {
  inputAmplitude: number;
  inputAngle: number;
  polarizerAngle: number;
  unpolarized: boolean;
  angleDifference: number;
  transmittedFieldAmplitude: number;
  blockedFieldAmplitude: number;
  transmittedIntensityFraction: number;
  blockedIntensityFraction: number;
  detectorBrightness: number;
  outputAngle: number;
  blockedAngle: number;
  inputStateLabel: string;
  outputStateLabel: string;
  projectionLabel: string;
  brightnessLabel: string;
};

export const POLARIZATION_MIN_AMPLITUDE = 0.7;
export const POLARIZATION_MAX_AMPLITUDE = 1.4;
export const POLARIZATION_MIN_ANGLE = 0;
export const POLARIZATION_MAX_ANGLE = 180;

const RESPONSE_SAMPLE_COUNT = 181;
const POLARIZATION_HALF_POWER_FIELD_FRACTION = Math.SQRT1_2;

function normalizePolarizationAngle(angle: number) {
  const wrapped = angle % 180;
  return wrapped < 0 ? wrapped + 180 : wrapped;
}

export function resolvePolarizationAngleDifference(inputAngle: number, polarizerAngle: number) {
  const normalizedInput = normalizePolarizationAngle(inputAngle);
  const normalizedPolarizer = normalizePolarizationAngle(polarizerAngle);
  const rawDifference = Math.abs(normalizedInput - normalizedPolarizer);

  return rawDifference > 90 ? 180 - rawDifference : rawDifference;
}

function resolveProjectionLabel(unpolarized: boolean, angleDifference: number) {
  if (unpolarized) {
    return "angle-independent half-intensity baseline";
  }

  if (angleDifference <= 8) {
    return "aligned transmission";
  }

  if (Math.abs(angleDifference - 45) <= 6) {
    return "half-power projection";
  }

  if (angleDifference >= 82) {
    return "crossed suppression";
  }

  return "partial projection";
}

function resolveBrightnessLabel(transmittedIntensityFraction: number) {
  if (transmittedIntensityFraction >= 0.9) {
    return "bright";
  }

  if (transmittedIntensityFraction <= 0.08) {
    return "nearly dark";
  }

  if (Math.abs(transmittedIntensityFraction - 0.5) <= 0.06) {
    return "half-bright";
  }

  return transmittedIntensityFraction > 0.5 ? "mostly bright" : "dim";
}

function sampleAtPolarizerAngle(
  params: PolarizationParams,
  polarizerAngle: number,
) {
  return samplePolarizationState({
    ...params,
    polarizerAngle,
  });
}

export function resolvePolarizationParams(
  params:
    | Partial<PolarizationParams>
    | Record<string, number | boolean | string>,
): PolarizationParams {
  return {
    inputAmplitude: clamp(
      safeNumber(params.inputAmplitude, 1.1),
      POLARIZATION_MIN_AMPLITUDE,
      POLARIZATION_MAX_AMPLITUDE,
    ),
    inputAngle: clamp(
      safeNumber(params.inputAngle, 30),
      POLARIZATION_MIN_ANGLE,
      POLARIZATION_MAX_ANGLE,
    ),
    polarizerAngle: clamp(
      safeNumber(params.polarizerAngle, 30),
      POLARIZATION_MIN_ANGLE,
      POLARIZATION_MAX_ANGLE,
    ),
    unpolarized: params.unpolarized === true,
  };
}

export function samplePolarizationState(
  params:
    | Partial<PolarizationParams>
    | Record<string, number | boolean | string>,
): PolarizationSnapshot {
  const resolved = resolvePolarizationParams(params);
  const angleDifference = resolvePolarizationAngleDifference(
    resolved.inputAngle,
    resolved.polarizerAngle,
  );
  const angleDifferenceRadians = degToRad(angleDifference);
  const transmittedFieldAmplitude = resolved.unpolarized
    ? resolved.inputAmplitude * POLARIZATION_HALF_POWER_FIELD_FRACTION
    : resolved.inputAmplitude * Math.abs(Math.cos(angleDifferenceRadians));
  const blockedFieldAmplitude = resolved.unpolarized
    ? resolved.inputAmplitude * POLARIZATION_HALF_POWER_FIELD_FRACTION
    : resolved.inputAmplitude * Math.abs(Math.sin(angleDifferenceRadians));
  const transmittedIntensityFraction = resolved.unpolarized
    ? 0.5
    : transmittedFieldAmplitude ** 2 / Math.max(resolved.inputAmplitude ** 2, 1e-6);
  const blockedIntensityFraction = Math.max(0, 1 - transmittedIntensityFraction);
  const normalizedInputAngle = normalizePolarizationAngle(resolved.inputAngle);
  const normalizedPolarizerAngle = normalizePolarizationAngle(resolved.polarizerAngle);

  return {
    inputAmplitude: resolved.inputAmplitude,
    inputAngle: normalizedInputAngle,
    polarizerAngle: normalizedPolarizerAngle,
    unpolarized: resolved.unpolarized,
    angleDifference,
    transmittedFieldAmplitude,
    blockedFieldAmplitude,
    transmittedIntensityFraction,
    blockedIntensityFraction,
    detectorBrightness: transmittedIntensityFraction,
    outputAngle: normalizedPolarizerAngle,
    blockedAngle: normalizePolarizationAngle(normalizedPolarizerAngle + 90),
    inputStateLabel: resolved.unpolarized
      ? "Unpolarized transverse input"
      : `Linear input at ${formatMeasurement(normalizedInputAngle, "deg")}`,
    outputStateLabel: `Linear output at ${formatMeasurement(normalizedPolarizerAngle, "deg")}`,
    projectionLabel: resolveProjectionLabel(resolved.unpolarized, angleDifference),
    brightnessLabel: resolveBrightnessLabel(transmittedIntensityFraction),
  };
}

export function buildPolarizationSeries(
  params:
    | Partial<PolarizationParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolvePolarizationParams(params);
  const responseAngles = sampleRange(
    POLARIZATION_MIN_ANGLE,
    POLARIZATION_MAX_ANGLE,
    RESPONSE_SAMPLE_COUNT,
  );

  return {
    "power-split": [
      buildSeries(
        "transmitted-power",
        "Transmitted I/I0",
        responseAngles.map((polarizerAngle) => ({
          x: polarizerAngle,
          y: sampleAtPolarizerAngle(resolved, polarizerAngle).transmittedIntensityFraction,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "blocked-power",
        "Blocked I/I0",
        responseAngles.map((polarizerAngle) => ({
          x: polarizerAngle,
          y: sampleAtPolarizerAngle(resolved, polarizerAngle).blockedIntensityFraction,
        })),
        "#f97316",
      ),
    ],
    "field-projection": [
      buildSeries(
        "axis-field",
        "Axis field / E0",
        responseAngles.map((polarizerAngle) => {
          const snapshot = sampleAtPolarizerAngle(resolved, polarizerAngle);

          return {
            x: polarizerAngle,
            y: snapshot.transmittedFieldAmplitude / Math.max(snapshot.inputAmplitude, 1e-6),
          };
        }),
        "#4ea6df",
      ),
      buildSeries(
        "blocked-field",
        "Blocked field / E0",
        responseAngles.map((polarizerAngle) => {
          const snapshot = sampleAtPolarizerAngle(resolved, polarizerAngle);

          return {
            x: polarizerAngle,
            y: snapshot.blockedFieldAmplitude / Math.max(snapshot.inputAmplitude, 1e-6),
          };
        }),
        "#f59e0b",
      ),
    ],
  };
}

export function describePolarizationState(
  params:
    | Partial<PolarizationParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = samplePolarizationState(params);

  if (snapshot.unpolarized) {
    return `An unpolarized transverse beam hits a polarizer with axis ${formatMeasurement(snapshot.polarizerAngle, "deg")}. One ideal polarizer sends out linearly polarized light along that axis with transmitted field ${formatMeasurement(snapshot.transmittedFieldAmplitude, "arb.")} and detector fraction ${formatNumber(snapshot.transmittedIntensityFraction)} while the other half of the intensity is blocked.`;
  }

  return `A linearly polarized input at ${formatMeasurement(snapshot.inputAngle, "deg")} meets a polarizer at ${formatMeasurement(snapshot.polarizerAngle, "deg")}, so the relative angle is ${formatMeasurement(snapshot.angleDifference, "deg")}. The transmitted field amplitude is ${formatMeasurement(snapshot.transmittedFieldAmplitude, "arb.")}, the blocked field is ${formatMeasurement(snapshot.blockedFieldAmplitude, "arb.")}, and the detector receives ${formatNumber(snapshot.transmittedIntensityFraction)} of the incoming intensity.`;
}
