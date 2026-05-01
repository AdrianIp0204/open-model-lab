import { clamp, formatMeasurement, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type RcChargingDischargingParams = {
  sourceVoltage?: ControlValue;
  resistance?: ControlValue;
  capacitance?: ControlValue;
  charging?: ControlValue;
};

export type RcChargingDischargingSnapshot = {
  time: number;
  sourceVoltage: number;
  resistance: number;
  capacitance: number;
  charging: boolean;
  mode: "charging" | "discharging";
  timeConstant: number;
  normalizedTime: number;
  capacitorVoltage: number;
  resistorVoltage: number;
  current: number;
  currentMagnitude: number;
  currentFraction: number;
  chargeStored: number;
  chargeFraction: number;
  storedEnergy: number;
  energyFraction: number;
};

export const RC_CHARGING_MIN_VOLTAGE = 4;
export const RC_CHARGING_MAX_VOLTAGE = 12;
export const RC_CHARGING_MIN_RESISTANCE = 1;
export const RC_CHARGING_MAX_RESISTANCE = 6;
export const RC_CHARGING_MIN_CAPACITANCE = 0.4;
export const RC_CHARGING_MAX_CAPACITANCE = 2.4;
export const RC_CHARGING_MAX_TIME = 24;

const GRAPH_SAMPLES = 141;

function resolveVoltage(value: ControlValue | undefined, fallback: number) {
  return clamp(safeNumber(value, fallback), RC_CHARGING_MIN_VOLTAGE, RC_CHARGING_MAX_VOLTAGE);
}

function resolveResistance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    RC_CHARGING_MIN_RESISTANCE,
    RC_CHARGING_MAX_RESISTANCE,
  );
}

function resolveCapacitance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    RC_CHARGING_MIN_CAPACITANCE,
    RC_CHARGING_MAX_CAPACITANCE,
  );
}

function resolveCharging(value: ControlValue | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function resolveRcChargingDischargingParams(
  params: RcChargingDischargingParams,
) {
  return {
    sourceVoltage: resolveVoltage(params.sourceVoltage, 8),
    resistance: resolveResistance(params.resistance, 2),
    capacitance: resolveCapacitance(params.capacitance, 1),
    charging: resolveCharging(params.charging, true),
  };
}

export function resolveRcChargingDischargingDuration(
  params: RcChargingDischargingParams | Record<string, ControlValue>,
) {
  const resolved = resolveRcChargingDischargingParams(params);
  return clamp(Math.max(resolved.resistance * resolved.capacitance * 5, 4), 4, RC_CHARGING_MAX_TIME);
}

export function sampleRcChargingDischargingState(
  params: RcChargingDischargingParams | Record<string, ControlValue>,
  time = 0,
  override?: Partial<RcChargingDischargingParams>,
): RcChargingDischargingSnapshot {
  const resolved = resolveRcChargingDischargingParams({
    ...params,
    ...override,
  });
  const timeConstant = Math.max(resolved.resistance * resolved.capacitance, 0.001);
  const maxTime = resolveRcChargingDischargingDuration(resolved);
  const displayTime = clamp(safeNumber(time, 0), 0, maxTime);
  const normalizedTime = displayTime / timeConstant;
  const decay = Math.exp(-normalizedTime);
  const chargeFraction = resolved.charging ? 1 - decay : decay;
  const capacitorVoltage = resolved.sourceVoltage * chargeFraction;
  const resistorVoltage = resolved.charging
    ? resolved.sourceVoltage - capacitorVoltage
    : capacitorVoltage;
  const currentMagnitude = (resolved.sourceVoltage / Math.max(resolved.resistance, 0.001)) * decay;
  const current = resolved.charging ? currentMagnitude : -currentMagnitude;
  const chargeStored = resolved.capacitance * capacitorVoltage;
  const storedEnergy = 0.5 * resolved.capacitance * capacitorVoltage * capacitorVoltage;
  const energyFraction = resolved.sourceVoltage > 0 ? (capacitorVoltage / resolved.sourceVoltage) ** 2 : 0;

  return {
    time: displayTime,
    sourceVoltage: resolved.sourceVoltage,
    resistance: resolved.resistance,
    capacitance: resolved.capacitance,
    charging: resolved.charging,
    mode: resolved.charging ? "charging" : "discharging",
    timeConstant,
    normalizedTime,
    capacitorVoltage,
    resistorVoltage,
    current,
    currentMagnitude,
    currentFraction: decay,
    chargeStored,
    chargeFraction,
    storedEnergy,
    energyFraction,
  };
}

export function buildRcChargingDischargingSeries(
  params: RcChargingDischargingParams | Record<string, ControlValue>,
): GraphSeriesMap {
  const resolved = resolveRcChargingDischargingParams(params);
  const duration = resolveRcChargingDischargingDuration(resolved);

  return {
    "voltage-time": [
      sampleTimeSeries(
        "capacitor-voltage",
        "Capacitor voltage Vc",
        0,
        duration,
        GRAPH_SAMPLES,
        (time) => sampleRcChargingDischargingState(resolved, time).capacitorVoltage,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "resistor-voltage",
        "Resistor drop Vr",
        0,
        duration,
        GRAPH_SAMPLES,
        (time) => sampleRcChargingDischargingState(resolved, time).resistorVoltage,
        "#f0ab3c",
      ),
    ],
    "normalized-response": [
      sampleTimeSeries(
        "charge-fraction",
        "Charge fraction",
        0,
        duration,
        GRAPH_SAMPLES,
        (time) => sampleRcChargingDischargingState(resolved, time).chargeFraction,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "current-fraction",
        "Current fraction",
        0,
        duration,
        GRAPH_SAMPLES,
        (time) => sampleRcChargingDischargingState(resolved, time).currentFraction,
        "#f16659",
      ),
      sampleTimeSeries(
        "energy-fraction",
        "Stored-energy fraction",
        0,
        duration,
        GRAPH_SAMPLES,
        (time) => sampleRcChargingDischargingState(resolved, time).energyFraction,
        "#b87000",
      ),
    ],
  };
}

export function describeRcChargingDischargingState(
  params: RcChargingDischargingParams | Record<string, ControlValue>,
  time = 0,
) {
  const snapshot = sampleRcChargingDischargingState(params, time);
  const modeText = snapshot.charging
    ? "The source is connected, so the capacitor is charging upward toward the battery voltage."
    : "The source is disconnected, so the capacitor is discharging through the resistor and the current has reversed direction.";
  const tauText =
    snapshot.normalizedTime < 1
      ? "The circuit is still inside the first time constant, so the big changes are happening now."
      : snapshot.normalizedTime < 3
        ? "The circuit is a few time constants in, so the voltage is approaching its long-term level while the current is fading."
        : "Several time constants have passed, so the transient is close to finished.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, an RC loop with source ${formatMeasurement(snapshot.sourceVoltage, "V")}, resistance ${formatMeasurement(snapshot.resistance, "ohm")}, and capacitance ${formatMeasurement(snapshot.capacitance, "F")} has time constant ${formatMeasurement(snapshot.timeConstant, "s")}. The capacitor voltage is ${formatMeasurement(snapshot.capacitorVoltage, "V")}, the resistor drop is ${formatMeasurement(snapshot.resistorVoltage, "V")}, the current is ${formatMeasurement(snapshot.current, "A")}, and the stored energy is ${formatMeasurement(snapshot.storedEnergy, "J")}. ${modeText} ${tauText}`;
}
