import { TAU, clamp, formatMeasurement, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type DoubleSlitInterferenceParams = {
  wavelength: number;
  slitSeparation: number;
  screenDistance: number;
  probeY: number;
};

export type DoubleSlitInterferenceGeometry = {
  slitUpper: GraphPoint;
  slitLower: GraphPoint;
  probe: GraphPoint;
  upperPath: number;
  lowerPath: number;
  pathDifference: number;
  probeAngleRad: number;
  probeAngleDeg: number;
};

export type DoubleSlitInterferenceSnapshot = DoubleSlitInterferenceGeometry & {
  time: number;
  wavenumber: number;
  frequency: number;
  angularFrequency: number;
  period: number;
  phaseDifference: number;
  wrappedPhaseDifference: number;
  pathDifferenceInWavelengths: number;
  sourceUpperDisplacement: number;
  sourceLowerDisplacement: number;
  resultantDisplacement: number;
  resultantAmplitude: number;
  normalizedIntensity: number;
  fringeSpacing: number;
  firstBrightYApprox: number;
  firstDarkYApprox: number;
  spacingLabel: "tight" | "moderate" | "wide";
  interferenceLabel: "bright" | "partial" | "dark";
};

export const DOUBLE_SLIT_INTERFERENCE_WAVE_SPEED = 1.6;
export const DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT = 3.2;
export const DOUBLE_SLIT_INTERFERENCE_MIN_WAVELENGTH = 0.5;
export const DOUBLE_SLIT_INTERFERENCE_MAX_WAVELENGTH = 1.1;
export const DOUBLE_SLIT_INTERFERENCE_MIN_SLIT_SEPARATION = 1.6;
export const DOUBLE_SLIT_INTERFERENCE_MAX_SLIT_SEPARATION = 3.4;
export const DOUBLE_SLIT_INTERFERENCE_MIN_SCREEN_DISTANCE = 4.2;
export const DOUBLE_SLIT_INTERFERENCE_MAX_SCREEN_DISTANCE = 6.4;

const TIME_SAMPLE_COUNT = 241;
const PATTERN_SAMPLE_COUNT = 181;
const MIN_TIME_WINDOW = 2.4;
const MAX_TIME_WINDOW = 6;

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function classifySpacing(fringeSpacing: number) {
  if (fringeSpacing >= 2.2) {
    return "wide" as const;
  }

  if (fringeSpacing <= 1) {
    return "tight" as const;
  }

  return "moderate" as const;
}

function classifyInterference(normalizedIntensity: number) {
  if (normalizedIntensity >= 0.85) {
    return "bright" as const;
  }

  if (normalizedIntensity <= 0.1) {
    return "dark" as const;
  }

  return "partial" as const;
}

function resolveTimeWindow(period: number) {
  return clamp(period * 4, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function resolveDoubleSlitInterferenceParams(
  params: Partial<DoubleSlitInterferenceParams> | Record<string, number | boolean | string>,
): DoubleSlitInterferenceParams {
  return {
    wavelength: clamp(
      safeNumber(params.wavelength, 0.78),
      DOUBLE_SLIT_INTERFERENCE_MIN_WAVELENGTH,
      DOUBLE_SLIT_INTERFERENCE_MAX_WAVELENGTH,
    ),
    slitSeparation: clamp(
      safeNumber(params.slitSeparation, 2.6),
      DOUBLE_SLIT_INTERFERENCE_MIN_SLIT_SEPARATION,
      DOUBLE_SLIT_INTERFERENCE_MAX_SLIT_SEPARATION,
    ),
    screenDistance: clamp(
      safeNumber(params.screenDistance, 5.4),
      DOUBLE_SLIT_INTERFERENCE_MIN_SCREEN_DISTANCE,
      DOUBLE_SLIT_INTERFERENCE_MAX_SCREEN_DISTANCE,
    ),
    probeY: clamp(
      safeNumber(params.probeY, 0),
      -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
      DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
    ),
  };
}

export function getDoubleSlitInterferenceGeometry(
  slitSeparation: number,
  screenDistance: number,
  probeY: number,
): DoubleSlitInterferenceGeometry {
  const resolvedSeparation = clamp(
    slitSeparation,
    DOUBLE_SLIT_INTERFERENCE_MIN_SLIT_SEPARATION,
    DOUBLE_SLIT_INTERFERENCE_MAX_SLIT_SEPARATION,
  );
  const resolvedScreenDistance = clamp(
    screenDistance,
    DOUBLE_SLIT_INTERFERENCE_MIN_SCREEN_DISTANCE,
    DOUBLE_SLIT_INTERFERENCE_MAX_SCREEN_DISTANCE,
  );
  const resolvedProbeY = clamp(
    probeY,
    -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
    DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
  );
  const slitUpper = { x: 0, y: resolvedSeparation / 2 };
  const slitLower = { x: 0, y: -resolvedSeparation / 2 };
  const probe = { x: resolvedScreenDistance, y: resolvedProbeY };
  const upperPath = Math.hypot(probe.x - slitUpper.x, probe.y - slitUpper.y);
  const lowerPath = Math.hypot(probe.x - slitLower.x, probe.y - slitLower.y);
  const probeAngleRad = Math.atan2(Math.abs(resolvedProbeY), resolvedScreenDistance);

  return {
    slitUpper,
    slitLower,
    probe,
    upperPath,
    lowerPath,
    pathDifference: lowerPath - upperPath,
    probeAngleRad,
    probeAngleDeg: (probeAngleRad * 180) / Math.PI,
  };
}

export function sampleDoubleSlitInterferenceState(
  params: Partial<DoubleSlitInterferenceParams> | Record<string, number | boolean | string>,
  time: number,
  probeYOverride?: number,
): DoubleSlitInterferenceSnapshot {
  const resolved = resolveDoubleSlitInterferenceParams(params);
  const geometry = getDoubleSlitInterferenceGeometry(
    resolved.slitSeparation,
    resolved.screenDistance,
    probeYOverride ?? resolved.probeY,
  );
  const wavelength = Math.max(
    resolved.wavelength,
    DOUBLE_SLIT_INTERFERENCE_MIN_WAVELENGTH,
  );
  const wavenumber = TAU / wavelength;
  const frequency = DOUBLE_SLIT_INTERFERENCE_WAVE_SPEED / wavelength;
  const angularFrequency = TAU * frequency;
  const period = 1 / Math.max(frequency, 1e-6);
  const phaseDifference = wavenumber * geometry.pathDifference;
  const wrappedPhaseDifference = wrapAngle(phaseDifference);
  const phaseUpper = wavenumber * geometry.upperPath - angularFrequency * time;
  const phaseLower = wavenumber * geometry.lowerPath - angularFrequency * time;
  const sourceUpperDisplacement = Math.sin(phaseUpper);
  const sourceLowerDisplacement = Math.sin(phaseLower);
  const resultantDisplacement = sourceUpperDisplacement + sourceLowerDisplacement;
  const resultantAmplitude = Math.sqrt(Math.max(0, 2 + 2 * Math.cos(phaseDifference)));
  const normalizedIntensity = clamp(
    (resultantAmplitude * resultantAmplitude) / 4,
    0,
    1,
  );
  const fringeSpacing = (resolved.wavelength * resolved.screenDistance) / resolved.slitSeparation;

  return {
    ...geometry,
    time,
    wavenumber,
    frequency,
    angularFrequency,
    period,
    phaseDifference,
    wrappedPhaseDifference,
    pathDifferenceInWavelengths: Math.abs(geometry.pathDifference) / wavelength,
    sourceUpperDisplacement,
    sourceLowerDisplacement,
    resultantDisplacement,
    resultantAmplitude,
    normalizedIntensity,
    fringeSpacing,
    firstBrightYApprox: fringeSpacing,
    firstDarkYApprox: fringeSpacing / 2,
    spacingLabel: classifySpacing(fringeSpacing),
    interferenceLabel: classifyInterference(normalizedIntensity),
  };
}

export function sampleDoubleSlitInterferencePattern(
  params: Partial<DoubleSlitInterferenceParams> | Record<string, number | boolean | string>,
  probeY: number,
) {
  return sampleDoubleSlitInterferenceState(params, 0, probeY);
}

export function buildDoubleSlitInterferenceSeries(
  params: Partial<DoubleSlitInterferenceParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveDoubleSlitInterferenceParams(params);
  const snapshot = sampleDoubleSlitInterferenceState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);
  const envelopePoints = sampleRange(0, timeWindow, TIME_SAMPLE_COUNT).map((time) => ({
    x: time,
    y: snapshot.resultantAmplitude,
  }));

  return {
    displacement: [
      sampleTimeSeries(
        "slit-1",
        "Slit 1",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDoubleSlitInterferenceState(resolved, time).sourceUpperDisplacement,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "slit-2",
        "Slit 2",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDoubleSlitInterferenceState(resolved, time).sourceLowerDisplacement,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "resultant",
        "Resultant",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDoubleSlitInterferenceState(resolved, time).resultantDisplacement,
        "#f16659",
      ),
      buildSeries("envelope-plus", "+ envelope", envelopePoints, "#f0ab3c", true),
      buildSeries(
        "envelope-minus",
        "- envelope",
        envelopePoints.map((point) => ({ ...point, y: -point.y })),
        "#f0ab3c",
        true,
      ),
    ],
    pattern: [
      buildSeries(
        "pattern",
        "Relative intensity",
        sampleRange(
          -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
          DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
          PATTERN_SAMPLE_COUNT,
        ).map((probeY) => ({
          x: probeY,
          y: sampleDoubleSlitInterferencePattern(resolved, probeY).normalizedIntensity,
        })),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeDoubleSlitInterferenceState(
  params: Partial<DoubleSlitInterferenceParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleDoubleSlitInterferenceState(params, time);

  return `At t = ${formatMeasurement(time, "s")}, the probe is at y = ${formatMeasurement(snapshot.probe.y, "m")} on a screen ${formatMeasurement(snapshot.probe.x, "m")} away from slits separated by ${formatMeasurement(Math.abs(snapshot.slitUpper.y - snapshot.slitLower.y), "m")}. The path difference is ${formatMeasurement(Math.abs(snapshot.pathDifference), "m")}, giving a phase split of ${formatMeasurement(Math.abs(snapshot.wrappedPhaseDifference), "rad")} and ${snapshot.interferenceLabel} interference at that point. The approximate bright-fringe spacing is ${formatMeasurement(snapshot.fringeSpacing, "m")}.`;
}
