import { clamp, formatMeasurement, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type TemperatureInternalEnergyParams = {
  particleCount?: ControlValue;
  heaterPower?: ControlValue;
  startingTemperature?: ControlValue;
  phasePlateauTemperature?: ControlValue;
  latentEnergyPerParticle?: ControlValue;
  initialPhaseProgress?: ControlValue;
  bondEnergyPerParticle?: ControlValue;
};

export type TemperatureInternalEnergySnapshot = {
  time: number;
  particleCount: number;
  heaterPower: number;
  startingTemperature: number;
  phasePlateauTemperature: number;
  temperature: number;
  averageKineticEnergy: number;
  thermalKineticEnergy: number;
  bondEnergy: number;
  latentEnergyAbsorbed: number;
  internalEnergy: number;
  internalEnergyPerParticle: number;
  addedEnergy: number;
  temperatureRate: number;
  phaseProgress: number;
  phaseShelfAvailable: boolean;
  plateauActive: boolean;
  temperatureRatio: number;
  internalEnergyRatio: number;
  stageLabel: "single-phase warming" | "phase-change shelf" | "after phase change";
  motionLabel: "cooler" | "warmer" | "hotter";
};

export const TEMPERATURE_INTERNAL_ENERGY_MIN_PARTICLE_COUNT = 8;
export const TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT = 48;
export const TEMPERATURE_INTERNAL_ENERGY_MIN_HEATER_POWER = 0;
export const TEMPERATURE_INTERNAL_ENERGY_MAX_HEATER_POWER = 6;
export const TEMPERATURE_INTERNAL_ENERGY_MIN_TEMPERATURE = 1.2;
export const TEMPERATURE_INTERNAL_ENERGY_MAX_TEMPERATURE = 6.4;
export const TEMPERATURE_INTERNAL_ENERGY_DEFAULT_PHASE_PLATEAU_TEMPERATURE = 3.6;
export const TEMPERATURE_INTERNAL_ENERGY_MAX_LATENT_ENERGY_PER_PARTICLE = 4.5;
export const TEMPERATURE_INTERNAL_ENERGY_MIN_BOND_ENERGY_PER_PARTICLE = 0.4;
export const TEMPERATURE_INTERNAL_ENERGY_MAX_BOND_ENERGY_PER_PARTICLE = 2.2;
export const TEMPERATURE_INTERNAL_ENERGY_KINETIC_ENERGY_PER_TEMP_UNIT = 0.75;
export const TEMPERATURE_INTERNAL_ENERGY_MAX_TIME = 20;

const GRAPH_TIME_SAMPLES = 141;
const PARTICLE_COUNT_STEP = 2;
const PARTICLE_COUNT_SAMPLES =
  (TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT -
    TEMPERATURE_INTERNAL_ENERGY_MIN_PARTICLE_COUNT) /
    PARTICLE_COUNT_STEP +
  1;
const MAX_INTERNAL_ENERGY =
  TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT *
    (TEMPERATURE_INTERNAL_ENERGY_MAX_TEMPERATURE *
      TEMPERATURE_INTERNAL_ENERGY_KINETIC_ENERGY_PER_TEMP_UNIT +
      TEMPERATURE_INTERNAL_ENERGY_MAX_BOND_ENERGY_PER_PARTICLE +
      TEMPERATURE_INTERNAL_ENERGY_MAX_LATENT_ENERGY_PER_PARTICLE) +
  TEMPERATURE_INTERNAL_ENERGY_MAX_HEATER_POWER * TEMPERATURE_INTERNAL_ENERGY_MAX_TIME;

function sampleParticleCounts() {
  return Array.from({ length: PARTICLE_COUNT_SAMPLES }, (_, index) => {
    return (
      TEMPERATURE_INTERNAL_ENERGY_MIN_PARTICLE_COUNT + index * PARTICLE_COUNT_STEP
    );
  });
}

function resolveParticleCount(value: ControlValue | undefined, fallback: number) {
  return Math.round(
    clamp(
      safeNumber(value, fallback),
      TEMPERATURE_INTERNAL_ENERGY_MIN_PARTICLE_COUNT,
      TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT,
    ),
  );
}

function resolveHeaterPower(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    TEMPERATURE_INTERNAL_ENERGY_MIN_HEATER_POWER,
    TEMPERATURE_INTERNAL_ENERGY_MAX_HEATER_POWER,
  );
}

function resolveStartingTemperature(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    TEMPERATURE_INTERNAL_ENERGY_MIN_TEMPERATURE,
    TEMPERATURE_INTERNAL_ENERGY_MAX_TEMPERATURE,
  );
}

function resolvePhasePlateauTemperature(
  value: ControlValue | undefined,
  fallback: number,
) {
  return clamp(
    safeNumber(value, fallback),
    TEMPERATURE_INTERNAL_ENERGY_MIN_TEMPERATURE,
    TEMPERATURE_INTERNAL_ENERGY_MAX_TEMPERATURE,
  );
}

function resolveLatentEnergyPerParticle(
  value: ControlValue | undefined,
  fallback: number,
) {
  return clamp(
    safeNumber(value, fallback),
    0,
    TEMPERATURE_INTERNAL_ENERGY_MAX_LATENT_ENERGY_PER_PARTICLE,
  );
}

function resolveInitialPhaseProgress(value: ControlValue | undefined, fallback: number) {
  return clamp(safeNumber(value, fallback), 0, 1);
}

function resolveBondEnergyPerParticle(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    TEMPERATURE_INTERNAL_ENERGY_MIN_BOND_ENERGY_PER_PARTICLE,
    TEMPERATURE_INTERNAL_ENERGY_MAX_BOND_ENERGY_PER_PARTICLE,
  );
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, TEMPERATURE_INTERNAL_ENERGY_MAX_TIME);
}

function classifyMotionLabel(temperature: number): TemperatureInternalEnergySnapshot["motionLabel"] {
  if (temperature < 2.6) {
    return "cooler";
  }

  if (temperature < 4.4) {
    return "warmer";
  }

  return "hotter";
}

export function resolveTemperatureInternalEnergyParams(
  params: TemperatureInternalEnergyParams,
) {
  const particleCount = resolveParticleCount(params.particleCount, 18);
  const heaterPower = resolveHeaterPower(params.heaterPower, 2.6);
  const startingTemperature = resolveStartingTemperature(params.startingTemperature, 2.4);
  const phasePlateauTemperature = resolvePhasePlateauTemperature(
    params.phasePlateauTemperature,
    TEMPERATURE_INTERNAL_ENERGY_DEFAULT_PHASE_PLATEAU_TEMPERATURE,
  );
  const latentEnergyPerParticle = resolveLatentEnergyPerParticle(
    params.latentEnergyPerParticle,
    0,
  );
  const initialPhaseProgress = resolveInitialPhaseProgress(
    params.initialPhaseProgress,
    latentEnergyPerParticle > 0 ? 0 : 1,
  );
  const bondEnergyPerParticle = resolveBondEnergyPerParticle(
    params.bondEnergyPerParticle,
    0.8,
  );

  return {
    particleCount,
    heaterPower,
    startingTemperature,
    phasePlateauTemperature,
    latentEnergyPerParticle,
    initialPhaseProgress:
      latentEnergyPerParticle > 0 ? initialPhaseProgress : 1,
    bondEnergyPerParticle,
  };
}

export function sampleTemperatureInternalEnergyState(
  params: TemperatureInternalEnergyParams,
  time = 0,
  override?: Partial<TemperatureInternalEnergyParams>,
): TemperatureInternalEnergySnapshot {
  const resolved = resolveTemperatureInternalEnergyParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  const inputEnergy = resolved.heaterPower * displayTime;
  const phaseShelfAvailable =
    resolved.latentEnergyPerParticle > 0 && resolved.initialPhaseProgress < 1;
  const energyPerTemperatureStep =
    resolved.particleCount * TEMPERATURE_INTERNAL_ENERGY_KINETIC_ENERGY_PER_TEMP_UNIT;
  const energyToPlateau =
    phaseShelfAvailable &&
    resolved.startingTemperature < resolved.phasePlateauTemperature
      ? energyPerTemperatureStep *
        (resolved.phasePlateauTemperature - resolved.startingTemperature)
      : 0;
  let remainingInput = inputEnergy;
  let temperature = resolved.startingTemperature;
  let phaseProgress = phaseShelfAvailable ? resolved.initialPhaseProgress : 1;
  let plateauActive = false;

  if (remainingInput > 0 && energyToPlateau > 0) {
    if (remainingInput < energyToPlateau) {
      temperature =
        resolved.startingTemperature + remainingInput / energyPerTemperatureStep;
      remainingInput = 0;
    } else {
      temperature = resolved.phasePlateauTemperature;
      remainingInput -= energyToPlateau;
    }
  }

  if (phaseShelfAvailable && phaseProgress < 1 && temperature >= resolved.phasePlateauTemperature) {
    const latentEnergyRemaining =
      resolved.particleCount *
      resolved.latentEnergyPerParticle *
      (1 - phaseProgress);
    const latentAbsorption = Math.min(remainingInput, latentEnergyRemaining);

    if (latentAbsorption > 0) {
      plateauActive = true;
      phaseProgress +=
        latentAbsorption /
        (resolved.particleCount * resolved.latentEnergyPerParticle);
      remainingInput -= latentAbsorption;
      temperature = resolved.phasePlateauTemperature;
    }
  }

  if (remainingInput > 0) {
    temperature += remainingInput / energyPerTemperatureStep;
  }

  const averageKineticEnergy =
    TEMPERATURE_INTERNAL_ENERGY_KINETIC_ENERGY_PER_TEMP_UNIT * temperature;
  const thermalKineticEnergy = averageKineticEnergy * resolved.particleCount;
  const latentEnergyAbsorbed =
    resolved.particleCount *
    resolved.latentEnergyPerParticle *
    (phaseShelfAvailable ? phaseProgress : 1);
  const bondEnergy =
    resolved.particleCount * resolved.bondEnergyPerParticle + latentEnergyAbsorbed;
  const internalEnergy = thermalKineticEnergy + bondEnergy;
  const internalEnergyPerParticle =
    internalEnergy / Math.max(resolved.particleCount, 1);
  const temperatureRate =
    resolved.heaterPower <= 0
      ? 0
      : phaseShelfAvailable &&
          phaseProgress < 1 &&
          temperature >= resolved.phasePlateauTemperature
        ? 0
        : resolved.heaterPower / energyPerTemperatureStep;
  const stageLabel: TemperatureInternalEnergySnapshot["stageLabel"] =
    phaseShelfAvailable && phaseProgress < 1 && temperature >= resolved.phasePlateauTemperature
      ? "phase-change shelf"
      : phaseShelfAvailable &&
          phaseProgress >= 1 &&
          temperature >= resolved.phasePlateauTemperature
        ? "after phase change"
        : "single-phase warming";

  return {
    time: displayTime,
    particleCount: resolved.particleCount,
    heaterPower: resolved.heaterPower,
    startingTemperature: resolved.startingTemperature,
    phasePlateauTemperature: resolved.phasePlateauTemperature,
    temperature,
    averageKineticEnergy,
    thermalKineticEnergy,
    bondEnergy,
    latentEnergyAbsorbed,
    internalEnergy,
    internalEnergyPerParticle,
    addedEnergy: inputEnergy,
    temperatureRate,
    phaseProgress,
    phaseShelfAvailable,
    plateauActive,
    temperatureRatio: clamp(
      (temperature - TEMPERATURE_INTERNAL_ENERGY_MIN_TEMPERATURE) /
        (TEMPERATURE_INTERNAL_ENERGY_MAX_TEMPERATURE -
          TEMPERATURE_INTERNAL_ENERGY_MIN_TEMPERATURE),
      0,
      1,
    ),
    internalEnergyRatio: clamp(internalEnergy / MAX_INTERNAL_ENERGY, 0, 1),
    stageLabel,
    motionLabel: classifyMotionLabel(temperature),
  };
}

function buildParticleCountResponseSeries(
  id: string,
  label: string,
  params: TemperatureInternalEnergyParams,
  sampleY: (snapshot: TemperatureInternalEnergySnapshot) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleParticleCounts().map((particleCount) => ({
      x: particleCount,
      y: sampleY(
        sampleTemperatureInternalEnergyState(params, 0, {
          particleCount,
        }),
      ),
    })),
    color,
  );
}

export function buildTemperatureInternalEnergySeries(
  params: TemperatureInternalEnergyParams,
): GraphSeriesMap {
  const normalized = resolveTemperatureInternalEnergyParams(params);

  return {
    "temperature-history": [
      sampleTimeSeries(
        "temperature",
        "Temperature",
        0,
        TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
        GRAPH_TIME_SAMPLES,
        (time) => sampleTemperatureInternalEnergyState(normalized, time).temperature,
        "#1ea6a2",
      ),
    ],
    "energy-breakdown": [
      sampleTimeSeries(
        "internal-energy",
        "Internal energy",
        0,
        TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
        GRAPH_TIME_SAMPLES,
        (time) => sampleTemperatureInternalEnergyState(normalized, time).internalEnergy,
        "#f16659",
      ),
      sampleTimeSeries(
        "thermal-kinetic",
        "Thermal kinetic energy",
        0,
        TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
        GRAPH_TIME_SAMPLES,
        (time) =>
          sampleTemperatureInternalEnergyState(normalized, time).thermalKineticEnergy,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "bond-store",
        "Bond and phase store",
        0,
        TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
        GRAPH_TIME_SAMPLES,
        (time) => sampleTemperatureInternalEnergyState(normalized, time).bondEnergy,
        "#f0ab3c",
      ),
    ],
    "amount-internal-energy": [
      buildParticleCountResponseSeries(
        "internal-energy",
        "Internal energy",
        normalized,
        (snapshot) => snapshot.internalEnergy,
        "#f16659",
      ),
    ],
    "amount-heating-rate": [
      buildParticleCountResponseSeries(
        "temperature-rate",
        "Temperature rise rate",
        normalized,
        (snapshot) => snapshot.temperatureRate,
        "#1ea6a2",
      ),
    ],
  };
}

export function describeTemperatureInternalEnergyState(
  params: TemperatureInternalEnergyParams,
  time: number,
) {
  const snapshot = sampleTemperatureInternalEnergyState(params, time);
  const phaseNote =
    snapshot.stageLabel === "phase-change shelf"
      ? "Added energy is still entering the sample, but it is feeding bond and phase changes instead of increasing the average particle speed."
      : snapshot.stageLabel === "after phase change"
        ? "The phase shelf is already passed, so new heater input is once again raising the average particle kinetic energy and the temperature together."
        : "In this single-phase stretch, temperature tracks the average thermal kinetic energy per particle directly.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the sample contains ${snapshot.particleCount} particles with temperature ${formatMeasurement(snapshot.temperature, "arb")}. The average thermal kinetic energy is ${formatMeasurement(snapshot.averageKineticEnergy, "u")} per particle, while the total internal energy is ${formatMeasurement(snapshot.internalEnergy, "u")}. ${phaseNote}`;
}
