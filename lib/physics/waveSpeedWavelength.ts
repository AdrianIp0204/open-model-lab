import { TAU, clamp, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type WaveSpeedWavelengthParams = {
  amplitude: number;
  waveSpeed: number;
  wavelength: number;
  probeX: number;
};

export type WaveSpeedWavelengthSnapshot = {
  amplitude: number;
  waveSpeed: number;
  wavelength: number;
  probeX: number;
  time: number;
  frequency: number;
  period: number;
  waveNumber: number;
  angularFrequency: number;
  travelDelay: number;
  phaseLagCycles: number;
  phaseLagRadians: number;
  wrappedPhaseLag: number;
  sourceDisplacement: number;
  probeDisplacement: number;
  distancePerPeriod: number;
  phaseAlignmentLabel: "in-phase" | "opposite-phase" | "offset";
};

export const WAVE_SPEED_WAVELENGTH_STAGE_LENGTH = 8;
export const WAVE_SPEED_WAVELENGTH_MIN_SPEED = 1.2;
export const WAVE_SPEED_WAVELENGTH_MAX_SPEED = 4.8;
export const WAVE_SPEED_WAVELENGTH_MIN_WAVELENGTH = 0.8;
export const WAVE_SPEED_WAVELENGTH_MAX_WAVELENGTH = 3.2;

const MIN_AMPLITUDE = 0.35;
const MAX_AMPLITUDE = 1.8;
const POSITION_SAMPLE_COUNT = 241;
const TIME_SAMPLE_COUNT = 241;
const MIN_TIME_WINDOW = 2.4;
const MAX_TIME_WINDOW = 6;

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function normalizeFraction(value: number) {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function classifyPhaseAlignment(phaseLagCycles: number) {
  const fractionalCycles = normalizeFraction(phaseLagCycles);

  if (fractionalCycles <= 0.08 || fractionalCycles >= 0.92) {
    return "in-phase" as const;
  }

  if (Math.abs(fractionalCycles - 0.5) <= 0.08) {
    return "opposite-phase" as const;
  }

  return "offset" as const;
}

export function resolveWaveSpeedWavelengthParams(
  params: Partial<WaveSpeedWavelengthParams> | Record<string, number | boolean | string>,
): WaveSpeedWavelengthParams {
  const wavelength = clamp(
    safeNumber(params.wavelength, 1.6),
    WAVE_SPEED_WAVELENGTH_MIN_WAVELENGTH,
    WAVE_SPEED_WAVELENGTH_MAX_WAVELENGTH,
  );

  return {
    amplitude: clamp(safeNumber(params.amplitude, 1), MIN_AMPLITUDE, MAX_AMPLITUDE),
    waveSpeed: clamp(
      safeNumber(params.waveSpeed, 2.4),
      WAVE_SPEED_WAVELENGTH_MIN_SPEED,
      WAVE_SPEED_WAVELENGTH_MAX_SPEED,
    ),
    wavelength,
    probeX: clamp(safeNumber(params.probeX, 2.4), 0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH),
  };
}

export function sampleWaveSpeedWavelengthDisplacement(
  params: Partial<WaveSpeedWavelengthParams> | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveWaveSpeedWavelengthParams(params);
  const x = clamp(position, 0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH);
  const waveNumber = TAU / resolved.wavelength;
  const angularFrequency = TAU * (resolved.waveSpeed / resolved.wavelength);

  return resolved.amplitude * Math.sin(waveNumber * x - angularFrequency * time);
}

export function getWaveSpeedWavelengthCrestPositions(
  params: Partial<WaveSpeedWavelengthParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const resolved = resolveWaveSpeedWavelengthParams(params);
  const offset = resolved.waveSpeed * time + resolved.wavelength / 4;
  const minIndex = Math.ceil((0 - offset) / resolved.wavelength);
  const maxIndex = Math.floor(
    (WAVE_SPEED_WAVELENGTH_STAGE_LENGTH - offset) / resolved.wavelength,
  );

  return Array.from({ length: Math.max(0, maxIndex - minIndex + 1) }, (_, index) => {
    const crestIndex = minIndex + index;
    return offset + crestIndex * resolved.wavelength;
  }).filter((position) => position >= 0 && position <= WAVE_SPEED_WAVELENGTH_STAGE_LENGTH);
}

export function sampleWaveSpeedWavelengthState(
  params: Partial<WaveSpeedWavelengthParams> | Record<string, number | boolean | string>,
  time: number,
  probeXOverride?: number,
): WaveSpeedWavelengthSnapshot {
  const resolved = resolveWaveSpeedWavelengthParams(params);
  const probeX = clamp(
    probeXOverride ?? resolved.probeX,
    0,
    WAVE_SPEED_WAVELENGTH_STAGE_LENGTH,
  );
  const frequency = resolved.waveSpeed / resolved.wavelength;
  const period = 1 / Math.max(frequency, 1e-6);
  const waveNumber = TAU / resolved.wavelength;
  const angularFrequency = TAU * frequency;
  const travelDelay = probeX / Math.max(resolved.waveSpeed, 1e-6);
  const phaseLagCycles = probeX / resolved.wavelength;
  const phaseLagRadians = TAU * phaseLagCycles;
  const wrappedPhaseLag = wrapAngle(phaseLagRadians);
  const sourceDisplacement = resolved.amplitude * Math.sin(-angularFrequency * time);
  const probeDisplacement = sampleWaveSpeedWavelengthDisplacement(resolved, probeX, time);

  return {
    amplitude: resolved.amplitude,
    waveSpeed: resolved.waveSpeed,
    wavelength: resolved.wavelength,
    probeX,
    time,
    frequency,
    period,
    waveNumber,
    angularFrequency,
    travelDelay,
    phaseLagCycles,
    phaseLagRadians,
    wrappedPhaseLag,
    sourceDisplacement,
    probeDisplacement,
    distancePerPeriod: resolved.waveSpeed * period,
    phaseAlignmentLabel: classifyPhaseAlignment(phaseLagCycles),
  };
}

function resolveTimeWindow(period: number) {
  return clamp(period * 4, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function buildWaveSpeedWavelengthSeries(
  params: Partial<WaveSpeedWavelengthParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveWaveSpeedWavelengthParams(params);
  const snapshot = sampleWaveSpeedWavelengthState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);

  return {
    displacement: [
      sampleTimeSeries(
        "source",
        "Source point",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleWaveSpeedWavelengthState(resolved, time).sourceDisplacement,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "probe",
        "Probe point",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleWaveSpeedWavelengthState(resolved, time).probeDisplacement,
        "#f16659",
      ),
    ],
    "phase-map": [
      buildSeries(
        "cycle-lag",
        "Cycle lag",
        sampleRange(0, WAVE_SPEED_WAVELENGTH_STAGE_LENGTH, POSITION_SAMPLE_COUNT).map(
          (position) => ({
            x: position,
            y: position / resolved.wavelength,
          }),
        ),
        "#4ea6df",
      ),
    ],
  };
}

export function describeWaveSpeedWavelengthState(
  params: Partial<WaveSpeedWavelengthParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleWaveSpeedWavelengthState(params, time);

  return `At t = ${formatMeasurement(time, "s")}, the traveling wave moves at ${formatMeasurement(snapshot.waveSpeed, "m/s")} with wavelength ${formatMeasurement(snapshot.wavelength, "m")}, so the source frequency is ${formatMeasurement(snapshot.frequency, "Hz")} and the period is ${formatMeasurement(snapshot.period, "s")}. The probe at x = ${formatMeasurement(snapshot.probeX, "m")} is ${formatNumber(snapshot.phaseLagCycles)} cycles behind the source after a travel delay of ${formatMeasurement(snapshot.travelDelay, "s")}, and its displacement is ${formatMeasurement(snapshot.probeDisplacement, "m")}.`;
}
