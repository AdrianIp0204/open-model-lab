import { TAU, clamp, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type DiffractionParams = {
  wavelength: number;
  slitWidth: number;
  probeY: number;
};

export type DiffractionGeometry = {
  slitTop: GraphPoint;
  slitBottom: GraphPoint;
  slitCenter: GraphPoint;
  probe: GraphPoint;
  topPath: number;
  bottomPath: number;
  centerPath: number;
  edgePathDifference: number;
  probeAngleRad: number;
  probeAngleDeg: number;
};

export type DiffractionSnapshot = DiffractionGeometry & {
  time: number;
  waveNumber: number;
  frequency: number;
  angularFrequency: number;
  period: number;
  beta: number;
  normalizedIntensity: number;
  envelopeAmplitude: number;
  centerDisplacement: number;
  probeDisplacement: number;
  edgePathDifferenceInWavelengths: number;
  wavelengthToSlitRatio: number;
  firstMinimumAngleRad: number | null;
  firstMinimumAngleDeg: number | null;
  firstMinimumScreenY: number | null;
  centralPeakWidth: number | null;
  diffractionLabel: "subtle" | "moderate" | "pronounced";
};

export const DIFFRACTION_SCREEN_DISTANCE = 5.4;
export const DIFFRACTION_SCREEN_HALF_HEIGHT = 3.2;
export const DIFFRACTION_WAVE_SPEED = 1.6;
export const DIFFRACTION_MIN_WAVELENGTH = 0.5;
export const DIFFRACTION_MAX_WAVELENGTH = 2.4;
export const DIFFRACTION_MIN_SLIT_WIDTH = 0.5;
export const DIFFRACTION_MAX_SLIT_WIDTH = 3.2;

const TIME_SAMPLE_COUNT = 241;
const PATTERN_SAMPLE_COUNT = 181;
const MIN_TIME_WINDOW = 2.4;
const MAX_TIME_WINDOW = 6;

function sinc(value: number) {
  if (Math.abs(value) < 1e-6) {
    return 1;
  }

  return Math.sin(value) / value;
}

function classifyDiffraction(wavelengthToSlitRatio: number) {
  if (wavelengthToSlitRatio >= 0.7) {
    return "pronounced" as const;
  }

  if (wavelengthToSlitRatio >= 0.35) {
    return "moderate" as const;
  }

  return "subtle" as const;
}

function resolveEdgePathDifference(screenY: number, slitWidth: number) {
  const topPath = Math.hypot(DIFFRACTION_SCREEN_DISTANCE, screenY - slitWidth / 2);
  const bottomPath = Math.hypot(DIFFRACTION_SCREEN_DISTANCE, screenY + slitWidth / 2);

  return Math.abs(bottomPath - topPath);
}

function solveFirstMinimumScreenY(params: DiffractionParams) {
  const target = params.wavelength;

  if (target >= params.slitWidth) {
    return null;
  }

  let low = 0;
  let high = 0.25;

  while (resolveEdgePathDifference(high, params.slitWidth) < target && high < 128) {
    high *= 2;
  }

  if (resolveEdgePathDifference(high, params.slitWidth) < target) {
    return null;
  }

  for (let index = 0; index < 60; index += 1) {
    const midpoint = (low + high) / 2;
    const difference = resolveEdgePathDifference(midpoint, params.slitWidth);

    if (difference >= target) {
      high = midpoint;
    } else {
      low = midpoint;
    }
  }

  return high;
}

function resolveTimeWindow(period: number) {
  return clamp(period * 4, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function resolveDiffractionParams(
  params: Partial<DiffractionParams> | Record<string, number | boolean | string>,
): DiffractionParams {
  return {
    wavelength: clamp(
      safeNumber(params.wavelength, 1),
      DIFFRACTION_MIN_WAVELENGTH,
      DIFFRACTION_MAX_WAVELENGTH,
    ),
    slitWidth: clamp(
      safeNumber(params.slitWidth, 2.4),
      DIFFRACTION_MIN_SLIT_WIDTH,
      DIFFRACTION_MAX_SLIT_WIDTH,
    ),
    probeY: clamp(
      safeNumber(params.probeY, 0),
      -DIFFRACTION_SCREEN_HALF_HEIGHT,
      DIFFRACTION_SCREEN_HALF_HEIGHT,
    ),
  };
}

export function getDiffractionGeometry(
  slitWidth: number,
  probeY: number,
): DiffractionGeometry {
  const resolvedSlitWidth = clamp(
    slitWidth,
    DIFFRACTION_MIN_SLIT_WIDTH,
    DIFFRACTION_MAX_SLIT_WIDTH,
  );
  const resolvedProbeY = clamp(
    probeY,
    -DIFFRACTION_SCREEN_HALF_HEIGHT,
    DIFFRACTION_SCREEN_HALF_HEIGHT,
  );
  const slitTop = { x: 0, y: resolvedSlitWidth / 2 };
  const slitBottom = { x: 0, y: -resolvedSlitWidth / 2 };
  const slitCenter = { x: 0, y: 0 };
  const probe = { x: DIFFRACTION_SCREEN_DISTANCE, y: resolvedProbeY };
  const topPath = Math.hypot(probe.x - slitTop.x, probe.y - slitTop.y);
  const bottomPath = Math.hypot(probe.x - slitBottom.x, probe.y - slitBottom.y);
  const centerPath = Math.hypot(probe.x - slitCenter.x, probe.y - slitCenter.y);

  return {
    slitTop,
    slitBottom,
    slitCenter,
    probe,
    topPath,
    bottomPath,
    centerPath,
    edgePathDifference: Math.abs(bottomPath - topPath),
    probeAngleRad: Math.atan2(Math.abs(resolvedProbeY), DIFFRACTION_SCREEN_DISTANCE),
    probeAngleDeg:
      (Math.atan2(Math.abs(resolvedProbeY), DIFFRACTION_SCREEN_DISTANCE) * 180) / Math.PI,
  };
}

export function sampleDiffractionState(
  params: Partial<DiffractionParams> | Record<string, number | boolean | string>,
  time: number,
  probeYOverride?: number,
): DiffractionSnapshot {
  const resolved = resolveDiffractionParams(params);
  const geometry = getDiffractionGeometry(
    resolved.slitWidth,
    probeYOverride ?? resolved.probeY,
  );
  const waveNumber = TAU / resolved.wavelength;
  const frequency = DIFFRACTION_WAVE_SPEED / resolved.wavelength;
  const angularFrequency = TAU * frequency;
  const period = 1 / Math.max(frequency, 1e-6);
  const beta = Math.PI * (geometry.edgePathDifference / resolved.wavelength);
  const envelopeAmplitude = clamp(Math.abs(sinc(beta)), 0, 1);
  const normalizedIntensity = clamp(envelopeAmplitude * envelopeAmplitude, 0, 1);
  const firstMinimumScreenY = solveFirstMinimumScreenY(resolved);
  const firstMinimumAngleRad =
    firstMinimumScreenY === null
      ? null
      : Math.atan2(firstMinimumScreenY, DIFFRACTION_SCREEN_DISTANCE);
  const centerPhase = -angularFrequency * time;
  const probePhase = waveNumber * geometry.centerPath - angularFrequency * time;

  return {
    ...geometry,
    time,
    waveNumber,
    frequency,
    angularFrequency,
    period,
    beta,
    normalizedIntensity,
    envelopeAmplitude,
    centerDisplacement: Math.sin(centerPhase),
    probeDisplacement: envelopeAmplitude * Math.sin(probePhase),
    edgePathDifferenceInWavelengths: geometry.edgePathDifference / resolved.wavelength,
    wavelengthToSlitRatio: resolved.wavelength / resolved.slitWidth,
    firstMinimumAngleRad,
    firstMinimumAngleDeg:
      firstMinimumAngleRad === null ? null : (firstMinimumAngleRad * 180) / Math.PI,
    firstMinimumScreenY,
    centralPeakWidth: firstMinimumScreenY === null ? null : firstMinimumScreenY * 2,
    diffractionLabel: classifyDiffraction(resolved.wavelength / resolved.slitWidth),
  };
}

export function sampleDiffractionPattern(
  params: Partial<DiffractionParams> | Record<string, number | boolean | string>,
  probeY: number,
) {
  return sampleDiffractionState(params, 0, probeY);
}

export function buildDiffractionSeries(
  params: Partial<DiffractionParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveDiffractionParams(params);
  const snapshot = sampleDiffractionState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);
  const timePoints = sampleRange(0, timeWindow, TIME_SAMPLE_COUNT).map((time) => ({
    x: time,
    y: snapshot.envelopeAmplitude,
  }));

  return {
    displacement: [
      sampleTimeSeries(
        "slit-center",
        "Slit center",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDiffractionState(resolved, time).centerDisplacement,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "probe-field",
        "Probe field",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDiffractionState(resolved, time).probeDisplacement,
        "#f16659",
      ),
      buildSeries("envelope-plus", "+ envelope", timePoints, "#f0ab3c", true),
      buildSeries(
        "envelope-minus",
        "- envelope",
        timePoints.map((point) => ({ ...point, y: -point.y })),
        "#f0ab3c",
        true,
      ),
    ],
    pattern: [
      buildSeries(
        "pattern",
        "Relative intensity",
        sampleRange(
          -DIFFRACTION_SCREEN_HALF_HEIGHT,
          DIFFRACTION_SCREEN_HALF_HEIGHT,
          PATTERN_SAMPLE_COUNT,
        ).map((probeY) => ({
          x: probeY,
          y: sampleDiffractionPattern(resolved, probeY).normalizedIntensity,
        })),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeDiffractionState(
  params: Partial<DiffractionParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleDiffractionState(params, time);
  const firstMinimumText =
    snapshot.firstMinimumAngleDeg === null
      ? "There is no finite first minimum because the wavelength is at least as large as the opening."
      : `The first minimum sits near ${formatMeasurement(snapshot.firstMinimumAngleDeg, "deg")}.`;

  return `At t = ${formatMeasurement(time, "s")}, the probe is at y = ${formatMeasurement(snapshot.probe.y, "m")} with edge-to-edge path difference ${formatMeasurement(snapshot.edgePathDifference, "m")}. The current lambda/a ratio is ${formatNumber(snapshot.wavelengthToSlitRatio)}, so the probe field has envelope ${formatNumber(snapshot.envelopeAmplitude)} and relative intensity ${formatNumber(snapshot.normalizedIntensity)}. ${firstMinimumText}`;
}
