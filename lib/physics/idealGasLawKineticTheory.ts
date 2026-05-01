import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type IdealGasLawKineticTheoryParams = {
  particleCount?: ControlValue;
  temperature?: ControlValue;
  volume?: ControlValue;
};

export type IdealGasLawKineticTheorySnapshot = {
  particleCount: number;
  temperature: number;
  volume: number;
  density: number;
  averageSpeed: number;
  collisionRate: number;
  pressure: number;
  pressureRatio: number;
  densityRatio: number;
  speedRatio: number;
  collisionRateRatio: number;
  volumeRatio: number;
  speedLabel: "slow" | "moderate" | "fast";
  densityLabel: "sparse" | "balanced" | "crowded";
  pressureLabel: "gentle" | "steady" | "strong";
};

export const IDEAL_GAS_KINETIC_MIN_PARTICLE_COUNT = 8;
export const IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT = 48;
export const IDEAL_GAS_KINETIC_MIN_TEMPERATURE = 1.2;
export const IDEAL_GAS_KINETIC_MAX_TEMPERATURE = 5.4;
export const IDEAL_GAS_KINETIC_MIN_VOLUME = 0.8;
export const IDEAL_GAS_KINETIC_MAX_VOLUME = 2.4;

const PARTICLE_COUNT_STEP = 2;
const RESPONSE_SAMPLES = 91;
const SPEED_SCALE = 1.35;
const COLLISION_SCALE = 1.8;
const PRESSURE_SCALE = 0.067;
const MAX_PRESSURE =
  ((PRESSURE_SCALE * COLLISION_SCALE * SPEED_SCALE * SPEED_SCALE) *
    IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT *
    IDEAL_GAS_KINETIC_MAX_TEMPERATURE) /
  IDEAL_GAS_KINETIC_MIN_VOLUME;
const MAX_COLLISION_RATE =
  (COLLISION_SCALE *
    IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT *
    SPEED_SCALE *
    Math.sqrt(IDEAL_GAS_KINETIC_MAX_TEMPERATURE)) /
  Math.sqrt(IDEAL_GAS_KINETIC_MIN_VOLUME);
const MAX_DENSITY =
  IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT / IDEAL_GAS_KINETIC_MIN_VOLUME;

function resolveParticleCount(value: ControlValue | undefined, fallback: number) {
  return Math.round(
    clamp(
      safeNumber(value, fallback),
      IDEAL_GAS_KINETIC_MIN_PARTICLE_COUNT,
      IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT,
    ),
  );
}

function resolveTemperature(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    IDEAL_GAS_KINETIC_MIN_TEMPERATURE,
    IDEAL_GAS_KINETIC_MAX_TEMPERATURE,
  );
}

function resolveVolume(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    IDEAL_GAS_KINETIC_MIN_VOLUME,
    IDEAL_GAS_KINETIC_MAX_VOLUME,
  );
}

function classifySpeed(averageSpeed: number): IdealGasLawKineticTheorySnapshot["speedLabel"] {
  if (averageSpeed < 2.1) {
    return "slow";
  }

  if (averageSpeed < 2.8) {
    return "moderate";
  }

  return "fast";
}

function classifyDensity(density: number): IdealGasLawKineticTheorySnapshot["densityLabel"] {
  if (density < 13) {
    return "sparse";
  }

  if (density < 22) {
    return "balanced";
  }

  return "crowded";
}

function classifyPressure(pressure: number): IdealGasLawKineticTheorySnapshot["pressureLabel"] {
  if (pressure < 10) {
    return "gentle";
  }

  if (pressure < 22) {
    return "steady";
  }

  return "strong";
}

function sampleParticleCounts() {
  const count =
    (IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT - IDEAL_GAS_KINETIC_MIN_PARTICLE_COUNT) /
      PARTICLE_COUNT_STEP +
    1;

  return Array.from({ length: count }, (_, index) => {
    return IDEAL_GAS_KINETIC_MIN_PARTICLE_COUNT + index * PARTICLE_COUNT_STEP;
  });
}

function computeAverageSpeed(temperature: number) {
  return SPEED_SCALE * Math.sqrt(Math.max(temperature, 0));
}

function computeCollisionRate(
  particleCount: number,
  averageSpeed: number,
  volume: number,
) {
  return (COLLISION_SCALE * particleCount * averageSpeed) / Math.sqrt(volume);
}

function computePressure(
  collisionRate: number,
  averageSpeed: number,
  volume: number,
) {
  return (PRESSURE_SCALE * collisionRate * averageSpeed) / Math.sqrt(volume);
}

export function resolveIdealGasLawKineticTheoryParams(
  params: IdealGasLawKineticTheoryParams,
) {
  return {
    particleCount: resolveParticleCount(params.particleCount, 24),
    temperature: resolveTemperature(params.temperature, 3.2),
    volume: resolveVolume(params.volume, 1.6),
  };
}

export function sampleIdealGasLawKineticTheoryState(
  params: IdealGasLawKineticTheoryParams,
  override?: Partial<IdealGasLawKineticTheoryParams>,
): IdealGasLawKineticTheorySnapshot {
  const resolved = resolveIdealGasLawKineticTheoryParams({
    ...params,
    ...override,
  });
  const density = resolved.particleCount / resolved.volume;
  const averageSpeed = computeAverageSpeed(resolved.temperature);
  const collisionRate = computeCollisionRate(
    resolved.particleCount,
    averageSpeed,
    resolved.volume,
  );
  const pressure = computePressure(collisionRate, averageSpeed, resolved.volume);

  return {
    particleCount: resolved.particleCount,
    temperature: resolved.temperature,
    volume: resolved.volume,
    density,
    averageSpeed,
    collisionRate,
    pressure,
    pressureRatio: clamp(pressure / MAX_PRESSURE, 0, 1),
    densityRatio: clamp(density / MAX_DENSITY, 0, 1),
    speedRatio: clamp(
      (averageSpeed - computeAverageSpeed(IDEAL_GAS_KINETIC_MIN_TEMPERATURE)) /
        (computeAverageSpeed(IDEAL_GAS_KINETIC_MAX_TEMPERATURE) -
          computeAverageSpeed(IDEAL_GAS_KINETIC_MIN_TEMPERATURE)),
      0,
      1,
    ),
    collisionRateRatio: clamp(collisionRate / MAX_COLLISION_RATE, 0, 1),
    volumeRatio: clamp(
      (resolved.volume - IDEAL_GAS_KINETIC_MIN_VOLUME) /
        (IDEAL_GAS_KINETIC_MAX_VOLUME - IDEAL_GAS_KINETIC_MIN_VOLUME),
      0,
      1,
    ),
    speedLabel: classifySpeed(averageSpeed),
    densityLabel: classifyDensity(density),
    pressureLabel: classifyPressure(pressure),
  };
}

function buildVolumeResponseSeries(params: ReturnType<typeof resolveIdealGasLawKineticTheoryParams>) {
  return buildSeries(
    "pressure",
    "Pressure",
    sampleRange(
      IDEAL_GAS_KINETIC_MIN_VOLUME,
      IDEAL_GAS_KINETIC_MAX_VOLUME,
      RESPONSE_SAMPLES,
    ).map((volume) => ({
      x: volume,
      y: sampleIdealGasLawKineticTheoryState(params, { volume }).pressure,
    })),
    "#f16659",
  );
}

function buildTemperatureResponseSeries(
  params: ReturnType<typeof resolveIdealGasLawKineticTheoryParams>,
  sampleY: (snapshot: IdealGasLawKineticTheorySnapshot) => number,
  id: string,
  label: string,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      IDEAL_GAS_KINETIC_MIN_TEMPERATURE,
      IDEAL_GAS_KINETIC_MAX_TEMPERATURE,
      RESPONSE_SAMPLES,
    ).map((temperature) => ({
      x: temperature,
      y: sampleY(sampleIdealGasLawKineticTheoryState(params, { temperature })),
    })),
    color,
  );
}

function buildParticleCountResponseSeries(
  params: ReturnType<typeof resolveIdealGasLawKineticTheoryParams>,
) {
  return buildSeries(
    "pressure",
    "Pressure",
    sampleParticleCounts().map((particleCount) => ({
      x: particleCount,
      y: sampleIdealGasLawKineticTheoryState(params, { particleCount }).pressure,
    })),
    "#f16659",
  );
}

export function buildIdealGasLawKineticTheorySeries(
  params: IdealGasLawKineticTheoryParams,
): GraphSeriesMap {
  const resolved = resolveIdealGasLawKineticTheoryParams(params);

  return {
    "pressure-volume": [buildVolumeResponseSeries(resolved)],
    "pressure-temperature": [
      buildTemperatureResponseSeries(
        resolved,
        (snapshot) => snapshot.pressure,
        "pressure",
        "Pressure",
        "#f16659",
      ),
    ],
    "pressure-particle-count": [buildParticleCountResponseSeries(resolved)],
    "collision-temperature": [
      buildTemperatureResponseSeries(
        resolved,
        (snapshot) => snapshot.collisionRate,
        "collision-rate",
        "Wall collision rate",
        "#1ea6a2",
      ),
    ],
  };
}

export function describeIdealGasLawKineticTheoryState(
  params: IdealGasLawKineticTheoryParams,
) {
  const snapshot = sampleIdealGasLawKineticTheoryState(params);
  const pressureNote =
    snapshot.pressureLabel === "strong"
      ? "The pressure is strong because the gas is crowded, fast, or both."
      : snapshot.pressureLabel === "gentle"
        ? "The pressure is gentle because the walls are being hit less often or with smaller momentum changes."
        : "The pressure stays in the middle because density and particle speed are balanced rather than extreme.";
  const kineticNote =
    snapshot.speedLabel === "fast"
      ? "Hotter particles move faster, so each wall hit transfers more momentum."
      : snapshot.speedLabel === "slow"
        ? "Cooler particles move more slowly, so each wall hit transfers less momentum."
        : "The particle speeds are moderate, so pressure changes are easier to trace to density and volume as well.";

  return `The gas has ${snapshot.particleCount} particles at ${formatNumber(snapshot.temperature)} temperature units in volume ${formatNumber(snapshot.volume)}, so the density is ${formatNumber(snapshot.density)} particles per volume unit. The bounded kinetic model gives an average speed of ${formatMeasurement(snapshot.averageSpeed, "u/s")} and a wall collision rate of ${formatMeasurement(snapshot.collisionRate, "hits/s")}, which combine into a pressure of ${formatMeasurement(snapshot.pressure, "u")}. ${pressureNote} ${kineticNote}`;
}
