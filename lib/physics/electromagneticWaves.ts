import { TAU, clamp, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type ElectromagneticWavesParams = {
  electricAmplitude: number;
  waveSpeed: number;
  wavelength: number;
  probeX: number;
};

export type ElectromagneticWavesSnapshot = {
  electricAmplitude: number;
  magneticAmplitude: number;
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
  sourceElectricField: number;
  sourceMagneticField: number;
  electricField: number;
  magneticField: number;
  displayMagneticField: number;
  electricDirectionLabel: "up" | "down" | "near zero";
  magneticDirectionLabel: "out of page" | "into page" | "near zero";
  phaseAlignmentLabel: "in-phase" | "opposite-phase" | "offset";
};

export const ELECTROMAGNETIC_WAVES_STAGE_LENGTH = 8;
export const ELECTROMAGNETIC_WAVES_MIN_SPEED = 1.6;
export const ELECTROMAGNETIC_WAVES_MAX_SPEED = 4.8;
export const ELECTROMAGNETIC_WAVES_MIN_WAVELENGTH = 1.2;
export const ELECTROMAGNETIC_WAVES_MAX_WAVELENGTH = 3.2;
export const ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE = 3;

const ELECTROMAGNETIC_WAVES_MIN_ELECTRIC_AMPLITUDE = 0.6;
const ELECTROMAGNETIC_WAVES_MAX_ELECTRIC_AMPLITUDE = 1.8;
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

function classifyElectricDirection(value: number) {
  if (value > 0.03) {
    return "up" as const;
  }

  if (value < -0.03) {
    return "down" as const;
  }

  return "near zero" as const;
}

function classifyMagneticDirection(value: number) {
  if (value > 0.03) {
    return "out of page" as const;
  }

  if (value < -0.03) {
    return "into page" as const;
  }

  return "near zero" as const;
}

function resolveTimeWindow(period: number) {
  return clamp(period * 4, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function resolveElectromagneticWavesParams(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
): ElectromagneticWavesParams {
  const wavelength = clamp(
    safeNumber(params.wavelength, 1.8),
    ELECTROMAGNETIC_WAVES_MIN_WAVELENGTH,
    ELECTROMAGNETIC_WAVES_MAX_WAVELENGTH,
  );

  return {
    electricAmplitude: clamp(
      safeNumber(params.electricAmplitude, 1.2),
      ELECTROMAGNETIC_WAVES_MIN_ELECTRIC_AMPLITUDE,
      ELECTROMAGNETIC_WAVES_MAX_ELECTRIC_AMPLITUDE,
    ),
    waveSpeed: clamp(
      safeNumber(params.waveSpeed, 2.8),
      ELECTROMAGNETIC_WAVES_MIN_SPEED,
      ELECTROMAGNETIC_WAVES_MAX_SPEED,
    ),
    wavelength,
    probeX: clamp(safeNumber(params.probeX, 2.7), 0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH),
  };
}

export function sampleElectromagneticWaveElectricField(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveElectromagneticWavesParams(params);
  const x = clamp(position, 0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH);
  const phase = TAU * (x / resolved.wavelength - (resolved.waveSpeed / resolved.wavelength) * time);

  return resolved.electricAmplitude * Math.sin(phase);
}

export function sampleElectromagneticWaveMagneticField(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveElectromagneticWavesParams(params);
  const electricField = sampleElectromagneticWaveElectricField(resolved, position, time);

  return electricField / Math.max(resolved.waveSpeed, 1e-6);
}

export function getElectromagneticWaveCrestPositions(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const resolved = resolveElectromagneticWavesParams(params);
  const offset = resolved.waveSpeed * time + resolved.wavelength / 4;
  const minIndex = Math.ceil((0 - offset) / resolved.wavelength);
  const maxIndex = Math.floor(
    (ELECTROMAGNETIC_WAVES_STAGE_LENGTH - offset) / resolved.wavelength,
  );

  return Array.from({ length: Math.max(0, maxIndex - minIndex + 1) }, (_, index) => {
    const crestIndex = minIndex + index;
    return offset + crestIndex * resolved.wavelength;
  }).filter((position) => position >= 0 && position <= ELECTROMAGNETIC_WAVES_STAGE_LENGTH);
}

export function sampleElectromagneticWavesState(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
  time: number,
  probeXOverride?: number,
): ElectromagneticWavesSnapshot {
  const resolved = resolveElectromagneticWavesParams(params);
  const probeX = clamp(
    probeXOverride ?? resolved.probeX,
    0,
    ELECTROMAGNETIC_WAVES_STAGE_LENGTH,
  );
  const frequency = resolved.waveSpeed / resolved.wavelength;
  const period = 1 / Math.max(frequency, 1e-6);
  const waveNumber = TAU / resolved.wavelength;
  const angularFrequency = TAU * frequency;
  const travelDelay = probeX / Math.max(resolved.waveSpeed, 1e-6);
  const phaseLagCycles = probeX / resolved.wavelength;
  const phaseLagRadians = TAU * phaseLagCycles;
  const wrappedPhaseLag = wrapAngle(phaseLagRadians);
  const magneticAmplitude = resolved.electricAmplitude / Math.max(resolved.waveSpeed, 1e-6);
  const sourceElectricField = resolved.electricAmplitude * Math.sin(-angularFrequency * time);
  const sourceMagneticField = magneticAmplitude * Math.sin(-angularFrequency * time);
  const electricField = sampleElectromagneticWaveElectricField(resolved, probeX, time);
  const magneticField = electricField / Math.max(resolved.waveSpeed, 1e-6);

  return {
    electricAmplitude: resolved.electricAmplitude,
    magneticAmplitude,
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
    sourceElectricField,
    sourceMagneticField,
    electricField,
    magneticField,
    displayMagneticField:
      magneticField * ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE,
    electricDirectionLabel: classifyElectricDirection(electricField),
    magneticDirectionLabel: classifyMagneticDirection(magneticField),
    phaseAlignmentLabel: classifyPhaseAlignment(phaseLagCycles),
  };
}

export function buildElectromagneticWavesSeries(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveElectromagneticWavesParams(params);
  const snapshot = sampleElectromagneticWavesState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);

  return {
    "probe-fields": [
      sampleTimeSeries(
        "electric-probe",
        "E at probe",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleElectromagneticWavesState(resolved, time).electricField,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "magnetic-probe",
        `B at probe (x${ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE} display)`,
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleElectromagneticWavesState(resolved, time).displayMagneticField,
        "#f0ab3c",
      ),
    ],
    "source-probe": [
      sampleTimeSeries(
        "electric-source",
        "E at source",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleElectromagneticWavesState(resolved, time).sourceElectricField,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "electric-probe",
        "E at probe",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleElectromagneticWavesState(resolved, time).electricField,
        "#1ea6a2",
      ),
    ],
    "space-profile": [
      {
        id: "electric-profile",
        label: "E along space",
        color: "#1ea6a2",
        points: sampleRange(0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH, POSITION_SAMPLE_COUNT).map(
          (position) => ({
            x: position,
            y: sampleElectromagneticWaveElectricField(resolved, position, 0),
          }),
        ),
      },
      {
        id: "magnetic-profile",
        label: `B along space (x${ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE} display)`,
        color: "#f0ab3c",
        points: sampleRange(0, ELECTROMAGNETIC_WAVES_STAGE_LENGTH, POSITION_SAMPLE_COUNT).map(
          (position) => ({
            x: position,
            y:
              sampleElectromagneticWaveMagneticField(resolved, position, 0) *
              ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE,
          }),
        ),
      },
    ],
  };
}

export function describeElectromagneticWavesState(
  params:
    | Partial<ElectromagneticWavesParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleElectromagneticWavesState(params, time);

  return `At t = ${formatMeasurement(time, "s")}, the electromagnetic wave travels right at ${formatMeasurement(snapshot.waveSpeed, "m/s")} with wavelength ${formatMeasurement(snapshot.wavelength, "m")}, so the field pattern repeats at ${formatMeasurement(snapshot.frequency, "Hz")} with period ${formatMeasurement(snapshot.period, "s")}. At the probe x = ${formatMeasurement(snapshot.probeX, "m")}, the electric field is ${formatMeasurement(snapshot.electricField, "arb.")} and the magnetic field is ${formatMeasurement(snapshot.magneticField, "arb.")}; the probe lags the source by ${formatNumber(snapshot.phaseLagCycles)} cycles after ${formatMeasurement(snapshot.travelDelay, "s")} of travel delay.`;
}
