import { clamp, formatNumber } from "./math";
import { buildSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type CapacitanceElectricEnergyParams = {
  plateArea: number;
  plateSeparation: number;
  batteryVoltage: number;
};

export type CapacitanceElectricEnergySnapshot = {
  plateArea: number;
  plateSeparation: number;
  batteryVoltage: number;
  capacitance: number;
  chargeMagnitude: number;
  fieldStrength: number;
  storedEnergy: number;
  energyDensity: number;
};

export const CAPACITANCE_ELECTRIC_ENERGY_MIN_AREA = 1;
export const CAPACITANCE_ELECTRIC_ENERGY_MAX_AREA = 5;
export const CAPACITANCE_ELECTRIC_ENERGY_MIN_SEPARATION = 0.6;
export const CAPACITANCE_ELECTRIC_ENERGY_MAX_SEPARATION = 3;
export const CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE = 2;
export const CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE = 10;

const VOLTAGE_RESPONSE_SAMPLES = 73;

function deriveCapacitance(params: Required<CapacitanceElectricEnergyParams>) {
  return params.plateArea / Math.max(params.plateSeparation, 0.001);
}

function deriveChargeMagnitude(
  params: Required<CapacitanceElectricEnergyParams>,
  capacitance: number,
) {
  return capacitance * params.batteryVoltage;
}

function deriveFieldStrength(params: Required<CapacitanceElectricEnergyParams>) {
  return params.batteryVoltage / Math.max(params.plateSeparation, 0.001);
}

function deriveStoredEnergy(
  params: Required<CapacitanceElectricEnergyParams>,
  capacitance: number,
) {
  return 0.5 * capacitance * params.batteryVoltage * params.batteryVoltage;
}

export function resolveCapacitanceElectricEnergyParams(
  source:
    | Partial<CapacitanceElectricEnergyParams>
    | Record<string, number | boolean | string>,
): Required<CapacitanceElectricEnergyParams> {
  return {
    plateArea: clamp(
      Number(source.plateArea ?? 2.4),
      CAPACITANCE_ELECTRIC_ENERGY_MIN_AREA,
      CAPACITANCE_ELECTRIC_ENERGY_MAX_AREA,
    ),
    plateSeparation: clamp(
      Number(source.plateSeparation ?? 1.4),
      CAPACITANCE_ELECTRIC_ENERGY_MIN_SEPARATION,
      CAPACITANCE_ELECTRIC_ENERGY_MAX_SEPARATION,
    ),
    batteryVoltage: clamp(
      Number(source.batteryVoltage ?? 6),
      CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE,
      CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE,
    ),
  };
}

export function sampleCapacitanceElectricEnergyState(
  source:
    | Partial<CapacitanceElectricEnergyParams>
    | Record<string, number | boolean | string>,
): CapacitanceElectricEnergySnapshot {
  const resolved = resolveCapacitanceElectricEnergyParams(source);
  const capacitance = deriveCapacitance(resolved);
  const chargeMagnitude = deriveChargeMagnitude(resolved, capacitance);
  const fieldStrength = deriveFieldStrength(resolved);
  const storedEnergy = deriveStoredEnergy(resolved, capacitance);
  const energyDensity = storedEnergy / Math.max(resolved.plateArea * resolved.plateSeparation, 0.001);

  return {
    plateArea: resolved.plateArea,
    plateSeparation: resolved.plateSeparation,
    batteryVoltage: resolved.batteryVoltage,
    capacitance,
    chargeMagnitude,
    fieldStrength,
    storedEnergy,
    energyDensity,
  };
}

export function buildCapacitanceElectricEnergySeries(
  source:
    | Partial<CapacitanceElectricEnergyParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveCapacitanceElectricEnergyParams(source);
  const step =
    (CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE - CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE) /
    (VOLTAGE_RESPONSE_SAMPLES - 1);

  const points = Array.from({ length: VOLTAGE_RESPONSE_SAMPLES }, (_, index) => {
    const batteryVoltage = CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE + step * index;
    const snapshot = sampleCapacitanceElectricEnergyState({
      ...resolved,
      batteryVoltage,
    });

    return {
      batteryVoltage,
      chargeMagnitude: snapshot.chargeMagnitude,
      storedEnergy: snapshot.storedEnergy,
    };
  });

  return {
    "voltage-response": [
      buildSeries(
        "stored-charge",
        "Stored charge Q",
        points.map((point) => ({ x: point.batteryVoltage, y: point.chargeMagnitude })),
        "#4ea6df",
      ),
      buildSeries(
        "stored-energy",
        "Stored energy U",
        points.map((point) => ({ x: point.batteryVoltage, y: point.storedEnergy })),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeCapacitanceElectricEnergyState(
  source:
    | Partial<CapacitanceElectricEnergyParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleCapacitanceElectricEnergyState(source);
  const voltageStory =
    snapshot.batteryVoltage >= 8
      ? "The voltage is high enough that stored energy is growing much faster than stored charge."
      : snapshot.batteryVoltage <= 3
        ? "This lower-voltage setup still stores charge, but the energy reservoir stays modest."
        : "This mid-voltage setup keeps both stored charge and stored energy easy to compare on one bounded bench.";
  const geometryStory =
    snapshot.plateSeparation <= 1
      ? "The plates are close, so the capacitor has a larger capacitance and a stronger field between the plates."
      : snapshot.plateSeparation >= 2.4
        ? "The wider gap lowers the capacitance, weakens the field, and reduces the stored energy at the same voltage."
        : "The plate geometry is moderate, so the geometry and voltage effects can be compared without one hiding the other.";

  return `A parallel-plate capacitor with plate area ${formatNumber(snapshot.plateArea)} area units, separation ${formatNumber(snapshot.plateSeparation)} m, and battery voltage ${formatNumber(snapshot.batteryVoltage)} V has capacitance ${formatNumber(snapshot.capacitance)}, stores charge magnitude ${formatNumber(snapshot.chargeMagnitude)}, creates field strength ${formatNumber(snapshot.fieldStrength)} between the plates, and stores electric energy ${formatNumber(snapshot.storedEnergy)}. ${voltageStory} ${geometryStory}`;
}
