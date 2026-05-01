import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type SpecificHeatPhaseChangeParams = {
  mass?: ControlValue;
  specificHeat?: ControlValue;
  heaterPower?: ControlValue;
  startingTemperature?: ControlValue;
  latentHeat?: ControlValue;
  initialPhaseFraction?: ControlValue;
  phaseChangeTemperature?: ControlValue;
};

export type SpecificHeatPhaseChangeSnapshot = {
  time: number;
  mass: number;
  specificHeat: number;
  heaterPower: number;
  startingTemperature: number;
  initialPhaseFraction: number;
  latentHeat: number;
  phaseChangeTemperature: number;
  thermalCapacity: number;
  phaseChangeEnergy: number;
  temperature: number;
  temperatureChange: number;
  phaseFraction: number;
  sensibleStore: number;
  latentStore: number;
  sensibleEnergyChange: number;
  latentEnergyChange: number;
  totalAddedEnergy: number;
  shelfEnergyRemaining: number;
  shelfDurationMinutes: number;
  temperatureRate: number;
  hasShelf: boolean;
  shelfActive: boolean;
  powerDirectionLabel: "heating" | "cooling" | "idle";
  stageLabel: "solid-like" | "phase-change shelf" | "liquid-like";
  temperatureRatio: number;
  energyRatio: number;
};

export const SPECIFIC_HEAT_PHASE_CHANGE_MIN_MASS = 0.6;
export const SPECIFIC_HEAT_PHASE_CHANGE_MAX_MASS = 3.2;
export const SPECIFIC_HEAT_PHASE_CHANGE_MIN_SPECIFIC_HEAT = 0.8;
export const SPECIFIC_HEAT_PHASE_CHANGE_MAX_SPECIFIC_HEAT = 4.2;
export const SPECIFIC_HEAT_PHASE_CHANGE_MIN_HEATER_POWER = -30;
export const SPECIFIC_HEAT_PHASE_CHANGE_MAX_HEATER_POWER = 30;
export const SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE = -30;
export const SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE = 80;
export const SPECIFIC_HEAT_PHASE_CHANGE_DEFAULT_PHASE_TEMPERATURE = 0;
export const SPECIFIC_HEAT_PHASE_CHANGE_MIN_LATENT_HEAT = 60;
export const SPECIFIC_HEAT_PHASE_CHANGE_MAX_LATENT_HEAT = 420;
export const SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME = 18;
export const SPECIFIC_HEAT_PHASE_CHANGE_RESPONSE_TIME = 4;

const GRAPH_SAMPLES = 121;
const RESPONSE_SAMPLES = 91;
const REFERENCE_MAX_ENERGY =
  SPECIFIC_HEAT_PHASE_CHANGE_MAX_MASS *
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_SPECIFIC_HEAT *
    (SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE -
      SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE) +
  SPECIFIC_HEAT_PHASE_CHANGE_MAX_MASS * SPECIFIC_HEAT_PHASE_CHANGE_MAX_LATENT_HEAT;

function resolveMass(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SPECIFIC_HEAT_PHASE_CHANGE_MIN_MASS,
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_MASS,
  );
}

function resolveSpecificHeat(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SPECIFIC_HEAT_PHASE_CHANGE_MIN_SPECIFIC_HEAT,
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_SPECIFIC_HEAT,
  );
}

function resolveHeaterPower(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SPECIFIC_HEAT_PHASE_CHANGE_MIN_HEATER_POWER,
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_HEATER_POWER,
  );
}

function resolveStartingTemperature(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE,
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE,
  );
}

function resolveLatentHeat(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SPECIFIC_HEAT_PHASE_CHANGE_MIN_LATENT_HEAT,
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_LATENT_HEAT,
  );
}

function resolvePhaseChangeTemperature(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE,
    SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE,
  );
}

function resolveInitialPhaseFraction(
  value: ControlValue | undefined,
  fallback: number,
  startingTemperature: number,
  phaseChangeTemperature: number,
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp(value, 0, 1);
  }

  if (startingTemperature < phaseChangeTemperature) {
    return 0;
  }

  if (startingTemperature > phaseChangeTemperature) {
    return 1;
  }

  return clamp(fallback, 0, 1);
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME);
}

function resolvePowerDirectionLabel(
  heaterPower: number,
): SpecificHeatPhaseChangeSnapshot["powerDirectionLabel"] {
  if (heaterPower > 0.05) {
    return "heating";
  }

  if (heaterPower < -0.05) {
    return "cooling";
  }

  return "idle";
}

type ResolvedSpecificHeatPhaseChangeParams = ReturnType<
  typeof resolveSpecificHeatPhaseChangeParams
>;

type DecodedState = {
  temperature: number;
  phaseFraction: number;
  sensibleStore: number;
  latentStore: number;
  stageLabel: SpecificHeatPhaseChangeSnapshot["stageLabel"];
  shelfActive: boolean;
};

function encodeInitialEnergy(resolved: ResolvedSpecificHeatPhaseChangeParams) {
  const thermalCapacity = resolved.mass * resolved.specificHeat;
  const shelfEnergy = resolved.mass * resolved.latentHeat;

  if (resolved.initialPhaseFraction > 0 && resolved.initialPhaseFraction < 1) {
    return shelfEnergy * resolved.initialPhaseFraction;
  }

  if (
    resolved.initialPhaseFraction >= 1 &&
    resolved.startingTemperature <= resolved.phaseChangeTemperature
  ) {
    return shelfEnergy;
  }

  if (resolved.startingTemperature <= resolved.phaseChangeTemperature) {
    return thermalCapacity * (resolved.startingTemperature - resolved.phaseChangeTemperature);
  }

  return shelfEnergy + thermalCapacity * (resolved.startingTemperature - resolved.phaseChangeTemperature);
}

function decodeStateEnergy(
  stateEnergy: number,
  resolved: ResolvedSpecificHeatPhaseChangeParams,
): DecodedState {
  const thermalCapacity = resolved.mass * resolved.specificHeat;
  const shelfEnergy = resolved.mass * resolved.latentHeat;

  if (stateEnergy < 0) {
    const temperature = resolved.phaseChangeTemperature + stateEnergy / thermalCapacity;

    return {
      temperature,
      phaseFraction: 0,
      sensibleStore: thermalCapacity * (temperature - resolved.phaseChangeTemperature),
      latentStore: 0,
      stageLabel: "solid-like",
      shelfActive: false,
    };
  }

  if (stateEnergy <= shelfEnergy) {
    const phaseFraction = shelfEnergy > 0 ? clamp(stateEnergy / shelfEnergy, 0, 1) : 0;

    return {
      temperature: resolved.phaseChangeTemperature,
      phaseFraction,
      sensibleStore: 0,
      latentStore: shelfEnergy * phaseFraction,
      stageLabel:
        phaseFraction <= 0
          ? "solid-like"
          : phaseFraction >= 1
            ? "liquid-like"
            : "phase-change shelf",
      shelfActive: phaseFraction > 0 && phaseFraction < 1,
    };
  }

  const temperature =
    resolved.phaseChangeTemperature + (stateEnergy - shelfEnergy) / thermalCapacity;

  return {
    temperature,
    phaseFraction: 1,
    sensibleStore: thermalCapacity * (temperature - resolved.phaseChangeTemperature),
    latentStore: shelfEnergy,
    stageLabel: "liquid-like",
    shelfActive: false,
  };
}

export function resolveSpecificHeatPhaseChangeParams(params: SpecificHeatPhaseChangeParams) {
  const mass = resolveMass(params.mass, 1.4);
  const specificHeat = resolveSpecificHeat(params.specificHeat, 2.1);
  const heaterPower = resolveHeaterPower(params.heaterPower, 18);
  const phaseChangeTemperature = resolvePhaseChangeTemperature(
    params.phaseChangeTemperature,
    SPECIFIC_HEAT_PHASE_CHANGE_DEFAULT_PHASE_TEMPERATURE,
  );
  const startingTemperature = resolveStartingTemperature(params.startingTemperature, -15);
  const latentHeat = resolveLatentHeat(params.latentHeat, 260);
  const initialPhaseFraction = resolveInitialPhaseFraction(
    params.initialPhaseFraction,
    0,
    startingTemperature,
    phaseChangeTemperature,
  );

  return {
    mass,
    specificHeat,
    heaterPower,
    startingTemperature,
    initialPhaseFraction,
    latentHeat,
    phaseChangeTemperature,
  };
}

export function sampleSpecificHeatPhaseChangeState(
  params: SpecificHeatPhaseChangeParams,
  time = 0,
  override?: Partial<SpecificHeatPhaseChangeParams>,
): SpecificHeatPhaseChangeSnapshot {
  const resolved = resolveSpecificHeatPhaseChangeParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  const totalAddedEnergy = resolved.heaterPower * displayTime;
  const stateEnergy = encodeInitialEnergy(resolved) + totalAddedEnergy;
  const initialState = decodeStateEnergy(encodeInitialEnergy(resolved), resolved);
  const currentState = decodeStateEnergy(stateEnergy, resolved);
  const thermalCapacity = resolved.mass * resolved.specificHeat;
  const phaseChangeEnergy = resolved.mass * resolved.latentHeat;
  const temperatureChange = currentState.temperature - initialState.temperature;
  const sensibleEnergyChange = currentState.sensibleStore - initialState.sensibleStore;
  const latentEnergyChange = currentState.latentStore - initialState.latentStore;
  const powerDirectionLabel = resolvePowerDirectionLabel(resolved.heaterPower);
  const shelfEnergyRemaining =
    powerDirectionLabel === "cooling"
      ? currentState.latentStore
      : phaseChangeEnergy - currentState.latentStore;
  const shelfDurationMinutes =
    Math.abs(resolved.heaterPower) > 0.05
      ? phaseChangeEnergy / Math.abs(resolved.heaterPower)
      : 0;

  return {
    time: displayTime,
    mass: resolved.mass,
    specificHeat: resolved.specificHeat,
    heaterPower: resolved.heaterPower,
    startingTemperature: initialState.temperature,
    initialPhaseFraction: resolved.initialPhaseFraction,
    latentHeat: resolved.latentHeat,
    phaseChangeTemperature: resolved.phaseChangeTemperature,
    thermalCapacity,
    phaseChangeEnergy,
    temperature: currentState.temperature,
    temperatureChange,
    phaseFraction: currentState.phaseFraction,
    sensibleStore: currentState.sensibleStore,
    latentStore: currentState.latentStore,
    sensibleEnergyChange,
    latentEnergyChange,
    totalAddedEnergy,
    shelfEnergyRemaining: Math.max(0, shelfEnergyRemaining),
    shelfDurationMinutes,
    temperatureRate:
      Math.abs(resolved.heaterPower) <= 0.05 || currentState.shelfActive
        ? 0
        : resolved.heaterPower / thermalCapacity,
    hasShelf: phaseChangeEnergy > 0.001,
    shelfActive: currentState.shelfActive,
    powerDirectionLabel,
    stageLabel: currentState.stageLabel,
    temperatureRatio: clamp(
      (currentState.temperature - SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE) /
        (SPECIFIC_HEAT_PHASE_CHANGE_MAX_STARTING_TEMPERATURE -
          SPECIFIC_HEAT_PHASE_CHANGE_MIN_STARTING_TEMPERATURE),
      0,
      1,
    ),
    energyRatio: clamp(
      (Math.abs(sensibleEnergyChange) + Math.abs(latentEnergyChange)) / REFERENCE_MAX_ENERGY,
      0,
      1,
    ),
  };
}

function buildSpecificHeatResponseSeries(
  id: string,
  label: string,
  params: ResolvedSpecificHeatPhaseChangeParams,
  sampleY: (snapshot: SpecificHeatPhaseChangeSnapshot) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      SPECIFIC_HEAT_PHASE_CHANGE_MIN_SPECIFIC_HEAT,
      SPECIFIC_HEAT_PHASE_CHANGE_MAX_SPECIFIC_HEAT,
      RESPONSE_SAMPLES,
    ).map((specificHeat) => ({
      x: specificHeat,
      y: sampleY(
        sampleSpecificHeatPhaseChangeState(params, SPECIFIC_HEAT_PHASE_CHANGE_RESPONSE_TIME, {
          specificHeat,
        }),
      ),
    })),
    color,
  );
}

function buildLatentHeatResponseSeries(
  id: string,
  label: string,
  params: ResolvedSpecificHeatPhaseChangeParams,
  sampleY: (snapshot: SpecificHeatPhaseChangeSnapshot) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      SPECIFIC_HEAT_PHASE_CHANGE_MIN_LATENT_HEAT,
      SPECIFIC_HEAT_PHASE_CHANGE_MAX_LATENT_HEAT,
      RESPONSE_SAMPLES,
    ).map((latentHeat) => ({
      x: latentHeat,
      y: sampleY(
        sampleSpecificHeatPhaseChangeState(params, 0, {
          latentHeat,
        }),
      ),
    })),
    color,
  );
}

export function buildSpecificHeatPhaseChangeSeries(
  params: SpecificHeatPhaseChangeParams,
): GraphSeriesMap {
  const normalized = resolveSpecificHeatPhaseChangeParams(params);

  return {
    "heating-curve": [
      sampleTimeSeries(
        "temperature",
        "Temperature",
        0,
        SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleSpecificHeatPhaseChangeState(normalized, time).temperature,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "phase-temperature",
        "Phase-change temperature",
        0,
        SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        GRAPH_SAMPLES,
        () => normalized.phaseChangeTemperature,
        "#f0ab3c",
      ),
    ],
    "energy-allocation": [
      sampleTimeSeries(
        "total-added-energy",
        "Total added energy",
        0,
        SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleSpecificHeatPhaseChangeState(normalized, time).totalAddedEnergy,
        "#f16659",
      ),
      sampleTimeSeries(
        "sensible-energy-change",
        "Sensible energy change",
        0,
        SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleSpecificHeatPhaseChangeState(normalized, time).sensibleEnergyChange,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "latent-energy-change",
        "Latent energy change",
        0,
        SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleSpecificHeatPhaseChangeState(normalized, time).latentEnergyChange,
        "#f0ab3c",
      ),
    ],
    "specific-heat-response": [
      buildSpecificHeatResponseSeries(
        "temperature-change",
        "Temperature change after 4 min",
        normalized,
        (snapshot) => snapshot.temperatureChange,
        "#1ea6a2",
      ),
    ],
    "latent-response": [
      buildLatentHeatResponseSeries(
        "phase-change-energy",
        "Phase-change energy",
        normalized,
        (snapshot) => snapshot.phaseChangeEnergy,
        "#f0ab3c",
      ),
    ],
  };
}

export function describeSpecificHeatPhaseChangeState(
  params: SpecificHeatPhaseChangeParams,
  time: number,
) {
  const snapshot = sampleSpecificHeatPhaseChangeState(params, time);
  const shelfNote =
    snapshot.shelfActive
      ? "The sample is on the phase-change shelf, so the current energy flow is changing phase fraction rather than temperature."
      : snapshot.powerDirectionLabel === "heating"
        ? `Away from the shelf, the current temperature is rising at ${formatMeasurement(snapshot.temperatureRate, "degC/min")}.`
        : snapshot.powerDirectionLabel === "cooling"
          ? `Away from the shelf, the current temperature is falling at ${formatMeasurement(Math.abs(snapshot.temperatureRate), "degC/min")}.`
          : "With nearly zero power, the sample is holding its current state.";

  return `At t = ${formatMeasurement(snapshot.time, "min")}, a ${formatMeasurement(snapshot.mass, "kg")} sample with specific heat ${formatMeasurement(snapshot.specificHeat, "kJ/(kg degC)")} is at ${formatMeasurement(snapshot.temperature, "degC")}. The total added energy is ${formatMeasurement(snapshot.totalAddedEnergy, "kJ")}, split into ${formatMeasurement(snapshot.sensibleEnergyChange, "kJ")} of temperature-changing energy and ${formatMeasurement(snapshot.latentEnergyChange, "kJ")} on the phase shelf. ${shelfNote}`;
}
