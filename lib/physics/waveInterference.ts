import { TAU, clamp, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type WaveInterferenceParams = {
  amplitudeA: number;
  amplitudeB: number;
  wavelength: number;
  phaseOffset: number;
  probeY: number;
};

export type WaveInterferenceGeometry = {
  sourceA: GraphPoint;
  sourceB: GraphPoint;
  probe: GraphPoint;
  pathA: number;
  pathB: number;
  pathDifference: number;
};

export type WaveInterferenceSnapshot = WaveInterferenceGeometry & {
  time: number;
  wavenumber: number;
  frequency: number;
  angularFrequency: number;
  period: number;
  pathPhaseDifference: number;
  totalPhaseDifference: number;
  wrappedPhaseDifference: number;
  pathDifferenceInWavelengths: number;
  sourceADisplacement: number;
  sourceBDisplacement: number;
  resultantDisplacement: number;
  resultantAmplitude: number;
  normalizedIntensity: number;
  resultantPhase: number;
  interferenceLabel: "constructive" | "destructive" | "partial";
};

export const WAVE_INTERFERENCE_DURATION = 4;
export const WAVE_INTERFERENCE_SCREEN_DISTANCE = 5.4;
export const WAVE_INTERFERENCE_SOURCE_SEPARATION = 1.8;
export const WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT = 3;
export const WAVE_INTERFERENCE_WAVE_SPEED = 1.6;

const MIN_WAVELENGTH = 0.6;
const MAX_WAVELENGTH = 4;
const MIN_AMPLITUDE = 0;
const MAX_AMPLITUDE = 2;
const TIME_SAMPLE_COUNT = 240;
const PATTERN_SAMPLE_COUNT = 161;

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function classifyInterference(normalizedIntensity: number) {
  if (normalizedIntensity >= 0.85) {
    return "constructive" as const;
  }

  if (normalizedIntensity <= 0.1) {
    return "destructive" as const;
  }

  return "partial" as const;
}

export function resolveWaveInterferenceParams(
  params: Partial<WaveInterferenceParams> | Record<string, number | boolean | string>,
): WaveInterferenceParams {
  return {
    amplitudeA: clamp(safeNumber(params.amplitudeA, 1), MIN_AMPLITUDE, MAX_AMPLITUDE),
    amplitudeB: clamp(safeNumber(params.amplitudeB, 1), MIN_AMPLITUDE, MAX_AMPLITUDE),
    wavelength: clamp(safeNumber(params.wavelength, 1.6), MIN_WAVELENGTH, MAX_WAVELENGTH),
    phaseOffset: safeNumber(params.phaseOffset, 0),
    probeY: clamp(
      safeNumber(params.probeY, 0),
      -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
      WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
    ),
  };
}

export function getWaveInterferenceGeometry(probeY: number): WaveInterferenceGeometry {
  const clampedProbeY = clamp(
    probeY,
    -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
    WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
  );
  const sourceA = { x: 0, y: WAVE_INTERFERENCE_SOURCE_SEPARATION / 2 };
  const sourceB = { x: 0, y: -WAVE_INTERFERENCE_SOURCE_SEPARATION / 2 };
  const probe = { x: WAVE_INTERFERENCE_SCREEN_DISTANCE, y: clampedProbeY };
  const pathA = Math.hypot(probe.x - sourceA.x, probe.y - sourceA.y);
  const pathB = Math.hypot(probe.x - sourceB.x, probe.y - sourceB.y);

  return {
    sourceA,
    sourceB,
    probe,
    pathA,
    pathB,
    pathDifference: pathB - pathA,
  };
}

export function sampleWaveInterferenceState(
  params: Partial<WaveInterferenceParams> | Record<string, number | boolean | string>,
  time: number,
  probeYOverride?: number,
): WaveInterferenceSnapshot {
  const resolved = resolveWaveInterferenceParams(params);
  const geometry = getWaveInterferenceGeometry(probeYOverride ?? resolved.probeY);
  const wavelength = Math.max(resolved.wavelength, MIN_WAVELENGTH);
  const wavenumber = TAU / wavelength;
  const frequency = WAVE_INTERFERENCE_WAVE_SPEED / wavelength;
  const angularFrequency = TAU * frequency;
  const period = 1 / Math.max(frequency, 1e-6);
  const pathPhaseDifference = wavenumber * geometry.pathDifference;
  const totalPhaseDifference = pathPhaseDifference + resolved.phaseOffset;
  const wrappedPhaseDifference = wrapAngle(totalPhaseDifference);
  const phaseA = wavenumber * geometry.pathA - angularFrequency * time;
  const phaseB = wavenumber * geometry.pathB - angularFrequency * time + resolved.phaseOffset;
  const sourceADisplacement = resolved.amplitudeA * Math.sin(phaseA);
  const sourceBDisplacement = resolved.amplitudeB * Math.sin(phaseB);
  const resultantDisplacement = sourceADisplacement + sourceBDisplacement;
  const resultantAmplitude = Math.sqrt(
    Math.max(
      0,
      resolved.amplitudeA * resolved.amplitudeA +
        resolved.amplitudeB * resolved.amplitudeB +
        2 *
          resolved.amplitudeA *
          resolved.amplitudeB *
          Math.cos(totalPhaseDifference),
    ),
  );
  const intensityDenominator = Math.max(
    Math.pow(resolved.amplitudeA + resolved.amplitudeB, 2),
    1e-6,
  );
  const normalizedIntensity = clamp(
    (resultantAmplitude * resultantAmplitude) / intensityDenominator,
    0,
    1,
  );
  const resultantPhase = Math.atan2(
    resolved.amplitudeB * Math.sin(totalPhaseDifference),
    resolved.amplitudeA + resolved.amplitudeB * Math.cos(totalPhaseDifference),
  );

  return {
    ...geometry,
    time,
    wavenumber,
    frequency,
    angularFrequency,
    period,
    pathPhaseDifference,
    totalPhaseDifference,
    wrappedPhaseDifference,
    pathDifferenceInWavelengths: geometry.pathDifference / wavelength,
    sourceADisplacement,
    sourceBDisplacement,
    resultantDisplacement,
    resultantAmplitude,
    normalizedIntensity,
    resultantPhase,
    interferenceLabel: classifyInterference(normalizedIntensity),
  };
}

export function sampleWaveInterferencePattern(
  params: Partial<WaveInterferenceParams> | Record<string, number | boolean | string>,
  probeY: number,
) {
  return sampleWaveInterferenceState(params, 0, probeY);
}

export function buildWaveInterferenceSeries(
  params: Partial<WaveInterferenceParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveWaveInterferenceParams(params);

  return {
    displacement: [
      sampleTimeSeries(
        "source-a",
        "Source A",
        0,
        WAVE_INTERFERENCE_DURATION,
        TIME_SAMPLE_COUNT,
        (time) => sampleWaveInterferenceState(resolved, time).sourceADisplacement,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "source-b",
        "Source B",
        0,
        WAVE_INTERFERENCE_DURATION,
        TIME_SAMPLE_COUNT,
        (time) => sampleWaveInterferenceState(resolved, time).sourceBDisplacement,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "resultant",
        "Resultant",
        0,
        WAVE_INTERFERENCE_DURATION,
        TIME_SAMPLE_COUNT,
        (time) => sampleWaveInterferenceState(resolved, time).resultantDisplacement,
        "#f16659",
      ),
    ],
    pattern: [
      buildSeries(
        "pattern",
        "Relative intensity",
        sampleRange(
          -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
          WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
          PATTERN_SAMPLE_COUNT,
        ).map((probeY) => ({
          x: probeY,
          y: sampleWaveInterferencePattern(resolved, probeY).normalizedIntensity,
        })),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeWaveInterferenceState(
  params: Partial<WaveInterferenceParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleWaveInterferenceState(params, time);

  return `At t = ${formatMeasurement(time, "s")}, the probe is at y = ${formatMeasurement(snapshot.probe.y, "m")}. The path difference is ${formatMeasurement(snapshot.pathDifference, "m")}, so the total phase difference is ${formatMeasurement(snapshot.wrappedPhaseDifference, "rad")} and the interference is ${snapshot.interferenceLabel}. The resultant displacement is ${formatMeasurement(snapshot.resultantDisplacement, "a.u.")}, and the relative intensity at that screen point is ${formatNumber(snapshot.normalizedIntensity)}.`;
}
