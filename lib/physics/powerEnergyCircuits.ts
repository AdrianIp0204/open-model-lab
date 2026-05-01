import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type PowerEnergyCircuitsParams = {
  voltage?: ControlValue;
  loadResistance?: ControlValue;
};

export type PowerEnergyCircuitsSnapshot = {
  time: number;
  voltage: number;
  loadResistance: number;
  current: number;
  power: number;
  energy: number;
  chargeTransferred: number;
  voltageAcrossLoad: number;
  powerRatio: number;
  energyFillRatio: number;
  brightnessLabel: "dim" | "warm" | "bright" | "very bright";
};

export const POWER_ENERGY_CIRCUITS_MIN_VOLTAGE = 4;
export const POWER_ENERGY_CIRCUITS_MAX_VOLTAGE = 18;
export const POWER_ENERGY_CIRCUITS_MIN_RESISTANCE = 3;
export const POWER_ENERGY_CIRCUITS_MAX_RESISTANCE = 24;
export const POWER_ENERGY_CIRCUITS_MAX_TIME = 12;

const GRAPH_SAMPLES = 121;

function resolveVoltage(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    POWER_ENERGY_CIRCUITS_MIN_VOLTAGE,
    POWER_ENERGY_CIRCUITS_MAX_VOLTAGE,
  );
}

function resolveLoadResistance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    POWER_ENERGY_CIRCUITS_MIN_RESISTANCE,
    POWER_ENERGY_CIRCUITS_MAX_RESISTANCE,
  );
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, POWER_ENERGY_CIRCUITS_MAX_TIME);
}

function classifyBrightness(power: number): PowerEnergyCircuitsSnapshot["brightnessLabel"] {
  if (power < 8) {
    return "dim";
  }

  if (power < 18) {
    return "warm";
  }

  if (power < 36) {
    return "bright";
  }

  return "very bright";
}

const MAX_POWER =
  (POWER_ENERGY_CIRCUITS_MAX_VOLTAGE * POWER_ENERGY_CIRCUITS_MAX_VOLTAGE) /
  POWER_ENERGY_CIRCUITS_MIN_RESISTANCE;

export function resolvePowerEnergyCircuitsParams(params: PowerEnergyCircuitsParams) {
  return {
    voltage: resolveVoltage(params.voltage, 12),
    loadResistance: resolveLoadResistance(params.loadResistance, 8),
  };
}

export function samplePowerEnergyCircuitsState(
  params: PowerEnergyCircuitsParams,
  time = 0,
  override?: Partial<PowerEnergyCircuitsParams>,
): PowerEnergyCircuitsSnapshot {
  const resolved = resolvePowerEnergyCircuitsParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  const current = resolved.voltage / Math.max(resolved.loadResistance, Number.EPSILON);
  const power = resolved.voltage * current;
  const energy = power * displayTime;
  const chargeTransferred = current * displayTime;
  const powerRatio = clamp(power / MAX_POWER, 0, 1);
  const energyFillRatio = clamp(
    (displayTime / POWER_ENERGY_CIRCUITS_MAX_TIME) * (0.45 + powerRatio * 0.55),
    0,
    1,
  );

  return {
    time: displayTime,
    voltage: resolved.voltage,
    loadResistance: resolved.loadResistance,
    current,
    power,
    energy,
    chargeTransferred,
    voltageAcrossLoad: resolved.voltage,
    powerRatio,
    energyFillRatio,
    brightnessLabel: classifyBrightness(power),
  };
}

function buildVoltageResponseSeries(
  id: string,
  label: string,
  params: PowerEnergyCircuitsParams,
  sampleY: (snapshot: PowerEnergyCircuitsSnapshot) => number,
  color: string,
) {
  const voltageSamples = sampleRange(
    0,
    POWER_ENERGY_CIRCUITS_MAX_VOLTAGE,
    GRAPH_SAMPLES,
  );

  return buildSeries(
    id,
    label,
    voltageSamples.map((voltage) => ({
      x: voltage,
      y: sampleY(samplePowerEnergyCircuitsState(params, 0, { voltage })),
    })),
    color,
  );
}

function buildResistanceResponseSeries(
  id: string,
  label: string,
  params: PowerEnergyCircuitsParams,
  sampleY: (snapshot: PowerEnergyCircuitsSnapshot) => number,
  color: string,
) {
  const resistanceSamples = sampleRange(
    POWER_ENERGY_CIRCUITS_MIN_RESISTANCE,
    POWER_ENERGY_CIRCUITS_MAX_RESISTANCE,
    GRAPH_SAMPLES,
  );

  return buildSeries(
    id,
    label,
    resistanceSamples.map((loadResistance) => ({
      x: loadResistance,
      y: sampleY(samplePowerEnergyCircuitsState(params, 0, { loadResistance })),
    })),
    color,
  );
}

export function buildPowerEnergyCircuitsSeries(
  params: PowerEnergyCircuitsParams,
): GraphSeriesMap {
  const normalized = resolvePowerEnergyCircuitsParams(params);

  return {
    "energy-transfer": [
      sampleTimeSeries(
        "delivered-energy",
        "Delivered energy",
        0,
        POWER_ENERGY_CIRCUITS_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => samplePowerEnergyCircuitsState(normalized, time).energy,
        "#1ea6a2",
      ),
    ],
    "current-voltage": [
      buildVoltageResponseSeries(
        "load-current",
        "Load current",
        normalized,
        (snapshot) => snapshot.current,
        "#4ea6df",
      ),
    ],
    "power-voltage": [
      buildVoltageResponseSeries(
        "load-power",
        "Load power",
        normalized,
        (snapshot) => snapshot.power,
        "#f0ab3c",
      ),
    ],
    "power-resistance": [
      buildResistanceResponseSeries(
        "load-power",
        "Load power",
        normalized,
        (snapshot) => snapshot.power,
        "#f16659",
      ),
    ],
  };
}

export function describePowerEnergyCircuitsState(
  params: PowerEnergyCircuitsParams,
  time: number,
) {
  const snapshot = samplePowerEnergyCircuitsState(params, time);
  const powerNote =
    snapshot.brightnessLabel === "very bright"
      ? "This is a high-power setting, so the load would heat or glow strongly in this bounded resistive model."
      : snapshot.brightnessLabel === "bright"
        ? "The load is dissipating power quickly enough that its visible response is strong but still controlled."
        : snapshot.brightnessLabel === "warm"
          ? "The load is taking energy at a moderate rate, so the change is steady rather than dramatic."
          : "The load is taking energy slowly, so the response stays gentle.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, a ${formatMeasurement(snapshot.voltage, "V")} source drives a ${formatMeasurement(snapshot.loadResistance, "ohm")} load. The current is ${formatMeasurement(snapshot.current, "A")}, so the load power is ${formatMeasurement(snapshot.power, "W")} and the delivered energy is ${formatMeasurement(snapshot.energy, "J")}. ${powerNote}`;
}
