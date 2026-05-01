import { TAU, clamp, formatMeasurement, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type AirColumnResonanceParams = {
  amplitude: number;
  length: number;
  resonanceOrder: number;
  probeX: number;
  closedEnd: boolean;
};

export type AirColumnResonanceSnapshot = {
  amplitude: number;
  length: number;
  resonanceOrder: number;
  harmonicMultiple: number;
  closedEnd: boolean;
  boundaryLabel: "open-open" | "closed-open";
  resonanceLabel: string;
  harmonicLabel: string;
  time: number;
  wavelength: number;
  waveNumber: number;
  frequency: number;
  angularFrequency: number;
  period: number;
  nodePositions: number[];
  antinodePositions: number[];
  pressureNodePositions: number[];
  pressureAntinodePositions: number[];
  probeX: number;
  probeShapeValue: number;
  probeEnvelope: number;
  probeDisplacement: number;
  probePressureShapeValue: number;
  probePressureEnvelope: number;
  probePressureValue: number;
  probeRegionLabel: "node" | "antinode" | "between";
  probePressureRegionLabel: "node" | "antinode" | "between";
};

export const AIR_COLUMN_WAVE_SPEED = 34;
export const AIR_COLUMN_MIN_LENGTH = 0.6;
export const AIR_COLUMN_MAX_LENGTH = 1.8;
export const AIR_COLUMN_MIN_RESONANCE_ORDER = 1;
export const AIR_COLUMN_MAX_RESONANCE_ORDER = 4;

const MIN_AMPLITUDE = 0.04;
const MAX_AMPLITUDE = 0.18;
const POSITION_SAMPLE_COUNT = 241;
const TIME_SAMPLE_COUNT = 241;
const MIN_TIME_WINDOW = 0.14;
const MAX_TIME_WINDOW = 0.5;

function clampResonanceOrder(order: number) {
  return Math.round(
    clamp(order, AIR_COLUMN_MIN_RESONANCE_ORDER, AIR_COLUMN_MAX_RESONANCE_ORDER),
  );
}

function ordinal(value: number) {
  if (value === 1) {
    return "fundamental";
  }

  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return `${value}st`;
  }

  if (remainder10 === 2 && remainder100 !== 12) {
    return `${value}nd`;
  }

  if (remainder10 === 3 && remainder100 !== 13) {
    return `${value}rd`;
  }

  return `${value}th`;
}

function classifyRegion(amplitude: number, envelope: number) {
  if (amplitude <= 0) {
    return "between" as const;
  }

  const nodeThreshold = amplitude * 0.08;
  const antinodeThreshold = amplitude * 0.92;

  if (envelope <= nodeThreshold) {
    return "node" as const;
  }

  if (envelope >= antinodeThreshold) {
    return "antinode" as const;
  }

  return "between" as const;
}

export function resolveAirColumnHarmonicMultiple(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
) {
  const resonanceOrder = clampResonanceOrder(safeNumber(params.resonanceOrder, 1));
  const closedEnd = Boolean(params.closedEnd);

  return closedEnd ? resonanceOrder * 2 - 1 : resonanceOrder;
}

export function resolveAirColumnResonanceParams(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
): AirColumnResonanceParams {
  const length = clamp(
    safeNumber(params.length, 1.2),
    AIR_COLUMN_MIN_LENGTH,
    AIR_COLUMN_MAX_LENGTH,
  );

  return {
    amplitude: clamp(safeNumber(params.amplitude, 0.12), MIN_AMPLITUDE, MAX_AMPLITUDE),
    length,
    resonanceOrder: clampResonanceOrder(safeNumber(params.resonanceOrder, 2)),
    probeX: clamp(safeNumber(params.probeX, length / 2), 0, length),
    closedEnd: Boolean(params.closedEnd),
  };
}

function getWaveNumber(resolved: AirColumnResonanceParams) {
  const harmonicMultiple = resolveAirColumnHarmonicMultiple(resolved);

  return resolved.closedEnd
    ? (harmonicMultiple * Math.PI) / (2 * resolved.length)
    : (resolved.resonanceOrder * Math.PI) / resolved.length;
}

function getBoundaryLabel(resolved: AirColumnResonanceParams) {
  return resolved.closedEnd ? "closed-open" : "open-open";
}

function getResonanceLabel(resolved: AirColumnResonanceParams) {
  return `${ordinal(resolved.resonanceOrder)} resonance`;
}

function getHarmonicLabel(harmonicMultiple: number) {
  return harmonicMultiple === 1 ? "fundamental" : `${ordinal(harmonicMultiple)} harmonic`;
}

export function sampleAirColumnModeShape(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  position: number,
) {
  const resolved = resolveAirColumnResonanceParams(params);
  const x = clamp(position, 0, resolved.length);
  const waveNumber = getWaveNumber(resolved);

  return resolved.closedEnd
    ? resolved.amplitude * Math.sin(waveNumber * x)
    : resolved.amplitude * Math.cos(waveNumber * x);
}

export function sampleAirColumnEnvelope(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  position: number,
) {
  return Math.abs(sampleAirColumnModeShape(params, position));
}

export function sampleAirColumnPressureShape(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  position: number,
) {
  const resolved = resolveAirColumnResonanceParams(params);
  const x = clamp(position, 0, resolved.length);
  const waveNumber = getWaveNumber(resolved);

  return resolved.closedEnd ? Math.cos(waveNumber * x) : Math.sin(waveNumber * x);
}

export function sampleAirColumnPressureEnvelope(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  position: number,
) {
  const resolved = resolveAirColumnResonanceParams(params);
  return Math.abs(resolved.amplitude * sampleAirColumnPressureShape(resolved, position));
}

export function getAirColumnNodePositions(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
) {
  const resolved = resolveAirColumnResonanceParams(params);

  if (resolved.closedEnd) {
    const harmonicMultiple = resolveAirColumnHarmonicMultiple(resolved);
    return Array.from(
      { length: resolved.resonanceOrder },
      (_, index) => (2 * index * resolved.length) / harmonicMultiple,
    );
  }

  return Array.from(
    { length: resolved.resonanceOrder },
    (_, index) => ((2 * index + 1) * resolved.length) / (2 * resolved.resonanceOrder),
  );
}

export function getAirColumnAntinodePositions(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
) {
  const resolved = resolveAirColumnResonanceParams(params);

  if (resolved.closedEnd) {
    const harmonicMultiple = resolveAirColumnHarmonicMultiple(resolved);
    return Array.from(
      { length: resolved.resonanceOrder },
      (_, index) => ((2 * index + 1) * resolved.length) / harmonicMultiple,
    );
  }

  return Array.from(
    { length: resolved.resonanceOrder + 1 },
    (_, index) => (index * resolved.length) / resolved.resonanceOrder,
  );
}

export function getAirColumnPressureNodePositions(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
) {
  return getAirColumnAntinodePositions(params);
}

export function getAirColumnPressureAntinodePositions(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
) {
  return getAirColumnNodePositions(params);
}

export function sampleAirColumnDisplacement(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveAirColumnResonanceParams(params);
  return sampleAirColumnModeShape(resolved, position) * Math.cos(getAngularFrequency(resolved) * time);
}

export function sampleAirColumnPressureCue(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveAirColumnResonanceParams(params);
  return (
    resolved.amplitude *
    sampleAirColumnPressureShape(resolved, position) *
    Math.sin(getAngularFrequency(resolved) * time)
  );
}

function getWavelength(resolved: AirColumnResonanceParams) {
  const harmonicMultiple = resolveAirColumnHarmonicMultiple(resolved);
  return resolved.closedEnd
    ? (4 * resolved.length) / harmonicMultiple
    : (2 * resolved.length) / resolved.resonanceOrder;
}

function getFrequency(resolved: AirColumnResonanceParams) {
  return AIR_COLUMN_WAVE_SPEED / getWavelength(resolved);
}

function getAngularFrequency(resolved: AirColumnResonanceParams) {
  return TAU * getFrequency(resolved);
}

export function sampleAirColumnResonanceState(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  time: number,
  probeXOverride?: number,
): AirColumnResonanceSnapshot {
  const resolved = resolveAirColumnResonanceParams(params);
  const harmonicMultiple = resolveAirColumnHarmonicMultiple(resolved);
  const wavelength = getWavelength(resolved);
  const frequency = getFrequency(resolved);
  const angularFrequency = TAU * frequency;
  const period = 1 / Math.max(frequency, 1e-6);
  const waveNumber = getWaveNumber(resolved);
  const probeX = clamp(probeXOverride ?? resolved.probeX, 0, resolved.length);
  const probeShapeValue =
    resolved.closedEnd ? Math.sin(waveNumber * probeX) : Math.cos(waveNumber * probeX);
  const probeEnvelope = Math.abs(resolved.amplitude * probeShapeValue);
  const probeDisplacement = probeEnvelope * Math.sign(probeShapeValue || 1) * Math.cos(angularFrequency * time);
  const probePressureShapeValue = sampleAirColumnPressureShape(resolved, probeX);
  const probePressureEnvelope = Math.abs(resolved.amplitude * probePressureShapeValue);
  const probePressureValue =
    resolved.amplitude * probePressureShapeValue * Math.sin(angularFrequency * time);

  return {
    amplitude: resolved.amplitude,
    length: resolved.length,
    resonanceOrder: resolved.resonanceOrder,
    harmonicMultiple,
    closedEnd: resolved.closedEnd,
    boundaryLabel: getBoundaryLabel(resolved),
    resonanceLabel: getResonanceLabel(resolved),
    harmonicLabel: getHarmonicLabel(harmonicMultiple),
    time,
    wavelength,
    waveNumber,
    frequency,
    angularFrequency,
    period,
    nodePositions: getAirColumnNodePositions(resolved),
    antinodePositions: getAirColumnAntinodePositions(resolved),
    pressureNodePositions: getAirColumnPressureNodePositions(resolved),
    pressureAntinodePositions: getAirColumnPressureAntinodePositions(resolved),
    probeX,
    probeShapeValue,
    probeEnvelope,
    probeDisplacement,
    probePressureShapeValue,
    probePressureEnvelope,
    probePressureValue,
    probeRegionLabel: classifyRegion(resolved.amplitude, probeEnvelope),
    probePressureRegionLabel: classifyRegion(resolved.amplitude, probePressureEnvelope),
  };
}

function resolveTimeWindow(period: number) {
  return clamp(period * 4, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function buildAirColumnResonanceSeries(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveAirColumnResonanceParams(params);
  const snapshot = sampleAirColumnResonanceState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);

  return {
    shape: [
      buildSeries(
        "mode-shape",
        "Displacement shape",
        sampleRange(0, resolved.length, POSITION_SAMPLE_COUNT).map((position) => ({
          x: position,
          y: sampleAirColumnModeShape(resolved, position),
        })),
        "#1ea6a2",
      ),
    ],
    displacement: [
      sampleTimeSeries(
        "probe",
        "Probe motion",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleAirColumnResonanceState(resolved, time).probeDisplacement,
        "#f16659",
      ),
      buildSeries(
        "upper-envelope",
        "Probe envelope +",
        sampleRange(0, timeWindow, TIME_SAMPLE_COUNT).map((time) => ({
          x: time,
          y: snapshot.probeEnvelope,
        })),
        "#f0ab3c",
        true,
      ),
      buildSeries(
        "lower-envelope",
        "Probe envelope -",
        sampleRange(0, timeWindow, TIME_SAMPLE_COUNT).map((time) => ({
          x: time,
          y: -snapshot.probeEnvelope,
        })),
        "#f0ab3c",
        true,
      ),
    ],
    ladder: [
      buildSeries(
        "resonances",
        "Allowed frequencies",
        sampleRange(
          AIR_COLUMN_MIN_RESONANCE_ORDER,
          AIR_COLUMN_MAX_RESONANCE_ORDER,
          AIR_COLUMN_MAX_RESONANCE_ORDER,
        ).map((order) => ({
          x: order,
          y: getFrequency({
            ...resolved,
            resonanceOrder: clampResonanceOrder(order),
          }),
        })),
        "#4ea6df",
      ),
    ],
  };
}

export function describeAirColumnResonanceState(
  params: Partial<AirColumnResonanceParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleAirColumnResonanceState(params, time);
  const boundarySummary =
    snapshot.boundaryLabel === "open-open"
      ? "open at both ends"
      : "closed at one end and open at the other";

  return `At t = ${formatMeasurement(time, "s")}, the air column is ${boundarySummary}. The selected mode is the ${snapshot.resonanceLabel} and corresponds to the ${snapshot.harmonicLabel}. The allowed wavelength is ${formatMeasurement(snapshot.wavelength, "m")} and the frequency is ${formatMeasurement(snapshot.frequency, "Hz")}. At x = ${formatMeasurement(snapshot.probeX, "m")}, the probe is near a displacement ${snapshot.probeRegionLabel} and a pressure ${snapshot.probePressureRegionLabel}.`;
}
