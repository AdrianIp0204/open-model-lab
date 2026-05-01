import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type InternalResistanceTerminalVoltageParams = {
  emf?: ControlValue;
  internalResistance?: ControlValue;
  loadResistance?: ControlValue;
};

export type InternalResistanceTerminalVoltageSnapshot = {
  emf: number;
  internalResistance: number;
  loadResistance: number;
  current: number;
  terminalVoltage: number;
  internalDrop: number;
  loadPower: number;
  internalPower: number;
  sourcePower: number;
  efficiency: number;
};

export const INTERNAL_SOURCE_MIN_EMF = 6;
export const INTERNAL_SOURCE_MAX_EMF = 18;
export const INTERNAL_SOURCE_MIN_INTERNAL_RESISTANCE = 0.2;
export const INTERNAL_SOURCE_MAX_INTERNAL_RESISTANCE = 5;
export const INTERNAL_SOURCE_MIN_LOAD_RESISTANCE = 1;
export const INTERNAL_SOURCE_MAX_LOAD_RESISTANCE = 16;

const GRAPH_SAMPLES = 121;

function resolveEmf(value: ControlValue | undefined, fallback: number) {
  return clamp(safeNumber(value, fallback), INTERNAL_SOURCE_MIN_EMF, INTERNAL_SOURCE_MAX_EMF);
}

function resolveInternalResistance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    INTERNAL_SOURCE_MIN_INTERNAL_RESISTANCE,
    INTERNAL_SOURCE_MAX_INTERNAL_RESISTANCE,
  );
}

function resolveLoadResistance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    INTERNAL_SOURCE_MIN_LOAD_RESISTANCE,
    INTERNAL_SOURCE_MAX_LOAD_RESISTANCE,
  );
}

export function resolveInternalResistanceTerminalVoltageParams(
  params: InternalResistanceTerminalVoltageParams | Record<string, ControlValue>,
) {
  return {
    emf: resolveEmf(params.emf, 12),
    internalResistance: resolveInternalResistance(params.internalResistance, 1),
    loadResistance: resolveLoadResistance(params.loadResistance, 6),
  };
}

export function sampleInternalResistanceTerminalVoltageState(
  params: InternalResistanceTerminalVoltageParams | Record<string, ControlValue>,
  override?: Partial<InternalResistanceTerminalVoltageParams>,
): InternalResistanceTerminalVoltageSnapshot {
  const resolved = resolveInternalResistanceTerminalVoltageParams({
    ...params,
    ...override,
  });
  const totalResistance = Math.max(
    resolved.internalResistance + resolved.loadResistance,
    Number.EPSILON,
  );
  const current = resolved.emf / totalResistance;
  const internalDrop = current * resolved.internalResistance;
  const terminalVoltage = current * resolved.loadResistance;
  const loadPower = current * current * resolved.loadResistance;
  const internalPower = current * current * resolved.internalResistance;
  const sourcePower = resolved.emf * current;
  const efficiency = sourcePower > Number.EPSILON ? loadPower / sourcePower : 0;

  return {
    emf: resolved.emf,
    internalResistance: resolved.internalResistance,
    loadResistance: resolved.loadResistance,
    current,
    terminalVoltage,
    internalDrop,
    loadPower,
    internalPower,
    sourcePower,
    efficiency,
  };
}

function buildLoadResistanceResponseSeries(
  id: string,
  label: string,
  params: InternalResistanceTerminalVoltageParams | Record<string, ControlValue>,
  sampleY: (snapshot: InternalResistanceTerminalVoltageSnapshot) => number,
  color: string,
) {
  const loadSamples = sampleRange(
    INTERNAL_SOURCE_MIN_LOAD_RESISTANCE,
    INTERNAL_SOURCE_MAX_LOAD_RESISTANCE,
    GRAPH_SAMPLES,
  );

  return buildSeries(
    id,
    label,
    loadSamples.map((loadResistance) => ({
      x: loadResistance,
      y: sampleY(sampleInternalResistanceTerminalVoltageState(params, { loadResistance })),
    })),
    color,
  );
}

export function buildInternalResistanceTerminalVoltageSeries(
  params: InternalResistanceTerminalVoltageParams | Record<string, ControlValue>,
): GraphSeriesMap {
  return {
    "terminal-response": [
      buildLoadResistanceResponseSeries(
        "terminal-voltage",
        "Terminal voltage",
        params,
        (snapshot) => snapshot.terminalVoltage,
        "#4ea6df",
      ),
      buildLoadResistanceResponseSeries(
        "internal-drop",
        "Internal drop",
        params,
        (snapshot) => snapshot.internalDrop,
        "#f0ab3c",
      ),
    ],
    "power-split": [
      buildLoadResistanceResponseSeries(
        "load-power",
        "Load power",
        params,
        (snapshot) => snapshot.loadPower,
        "#1ea6a2",
      ),
      buildLoadResistanceResponseSeries(
        "internal-power",
        "Internal loss",
        params,
        (snapshot) => snapshot.internalPower,
        "#f16659",
      ),
    ],
  };
}

export function describeInternalResistanceTerminalVoltageState(
  params: InternalResistanceTerminalVoltageParams | Record<string, ControlValue>,
) {
  const snapshot = sampleInternalResistanceTerminalVoltageState(params);
  const sourceStory =
    snapshot.internalResistance <= 0.3
      ? "This source is close to the ideal limit, so the terminal voltage stays close to the emf."
      : snapshot.internalResistance >= 3
        ? "This source has a large internal resistance, so it loses a noticeable chunk of voltage inside itself when the current rises."
        : "This source is clearly non-ideal, but not so lossy that the load behavior becomes hidden.";
  const loadStory =
    snapshot.loadResistance <= 2
      ? "The heavy load pulls a larger current, which increases both the internal drop and the internal power loss."
      : snapshot.loadResistance >= 12
        ? "The lighter load pulls only a small current, so the terminal voltage sits much closer to the emf."
        : "This middle load keeps both the terminal-voltage drop and the internal loss easy to compare.";

  return `A source with emf ${formatMeasurement(snapshot.emf, "V")}, internal resistance ${formatMeasurement(snapshot.internalResistance, "ohm")}, and load resistance ${formatMeasurement(snapshot.loadResistance, "ohm")} drives current ${formatMeasurement(snapshot.current, "A")}. The terminal voltage is ${formatMeasurement(snapshot.terminalVoltage, "V")} while the internal drop is ${formatMeasurement(snapshot.internalDrop, "V")}. The load takes ${formatMeasurement(snapshot.loadPower, "W")} and the source loses ${formatMeasurement(snapshot.internalPower, "W")} internally, so the delivered fraction is about ${formatMeasurement(snapshot.efficiency * 100, "%")}. ${sourceStory} ${loadStory}`;
}
