import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber } from "./math";
import type { GraphSeriesMap } from "./types";

export type EscapeVelocityParams = {
  sourceMass?: number;
  launchRadius?: number;
  speedFactor?: number;
};

export type EscapeVelocityState = {
  time: number;
  radius: number;
  radialVelocity: number;
  speed: number;
  gravityAcceleration: number;
  launchSpeed: number;
  launchEscapeSpeed: number;
  launchCircularSpeed: number;
  localEscapeSpeed: number;
  localCircularSpeed: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  turnaroundRadius: number | null;
};

export type EscapeVelocityTrajectory = {
  params: Required<EscapeVelocityParams>;
  duration: number;
  timeStep: number;
  samples: EscapeVelocityState[];
};

type RadialState = {
  radius: number;
  radialVelocity: number;
};

export const ESCAPE_VELOCITY_MIN_SOURCE_MASS = 2;
export const ESCAPE_VELOCITY_MAX_SOURCE_MASS = 6;
export const ESCAPE_VELOCITY_MIN_LAUNCH_RADIUS = 1;
export const ESCAPE_VELOCITY_MAX_LAUNCH_RADIUS = 2.4;
export const ESCAPE_VELOCITY_MIN_SPEED_FACTOR = 0.82;
export const ESCAPE_VELOCITY_MAX_SPEED_FACTOR = 1.12;
export const ESCAPE_VELOCITY_MIN_SAMPLE_RADIUS = 0.45;
export const ESCAPE_VELOCITY_STAGE_MAX_RADIUS = 12;

const ESCAPE_VELOCITY_SAMPLE_COUNT = 300;
const ESCAPE_VELOCITY_MIN_DURATION = 3.8;
const ESCAPE_VELOCITY_MAX_DURATION = 7.2;

function resolveSourceMass(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    ESCAPE_VELOCITY_MIN_SOURCE_MASS,
    ESCAPE_VELOCITY_MAX_SOURCE_MASS,
  );
}

function resolveLaunchRadius(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    ESCAPE_VELOCITY_MIN_LAUNCH_RADIUS,
    ESCAPE_VELOCITY_MAX_LAUNCH_RADIUS,
  );
}

function resolveSpeedFactor(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    ESCAPE_VELOCITY_MIN_SPEED_FACTOR,
    ESCAPE_VELOCITY_MAX_SPEED_FACTOR,
  );
}

function resolveEscapeSpeedAtRadius(sourceMass: number, radius: number) {
  return Math.sqrt(
    (2 * sourceMass) / Math.max(radius, ESCAPE_VELOCITY_MIN_SAMPLE_RADIUS),
  );
}

function resolveCircularSpeedAtRadius(sourceMass: number, radius: number) {
  return Math.sqrt(sourceMass / Math.max(radius, ESCAPE_VELOCITY_MIN_SAMPLE_RADIUS));
}

function resolveSpecificTotalEnergy(params: Required<EscapeVelocityParams>) {
  const launchEscapeSpeed = resolveEscapeSpeedAtRadius(params.sourceMass, params.launchRadius);
  const launchSpeed = launchEscapeSpeed * params.speedFactor;

  return 0.5 * launchSpeed * launchSpeed - params.sourceMass / params.launchRadius;
}

function resolveTurnaroundRadius(
  sourceMass: number,
  totalEnergy: number,
) {
  if (totalEnergy >= -1e-6) {
    return null;
  }

  return sourceMass / -totalEnergy;
}

function resolveCharacteristicTime(sourceMass: number, launchRadius: number) {
  return Math.sqrt(Math.pow(launchRadius, 3) / Math.max(sourceMass, 1e-6));
}

function resolveAcceleration(sourceMass: number, radius: number) {
  const effectiveRadius = Math.max(radius, ESCAPE_VELOCITY_MIN_SAMPLE_RADIUS);
  return -sourceMass / (effectiveRadius * effectiveRadius);
}

function advanceRadialState(
  state: RadialState,
  sourceMass: number,
  timeStep: number,
) {
  const k1Radius = state.radialVelocity;
  const k1Velocity = resolveAcceleration(sourceMass, state.radius);

  const k2Radius = state.radialVelocity + (k1Velocity * timeStep) / 2;
  const k2Velocity = resolveAcceleration(
    sourceMass,
    state.radius + (k1Radius * timeStep) / 2,
  );

  const k3Radius = state.radialVelocity + (k2Velocity * timeStep) / 2;
  const k3Velocity = resolveAcceleration(
    sourceMass,
    state.radius + (k2Radius * timeStep) / 2,
  );

  const k4Radius = state.radialVelocity + k3Velocity * timeStep;
  const k4Velocity = resolveAcceleration(
    sourceMass,
    state.radius + k3Radius * timeStep,
  );

  return {
    radius:
      state.radius +
      (timeStep / 6) * (k1Radius + 2 * k2Radius + 2 * k3Radius + k4Radius),
    radialVelocity:
      state.radialVelocity +
      (timeStep / 6) * (k1Velocity + 2 * k2Velocity + 2 * k3Velocity + k4Velocity),
  } satisfies RadialState;
}

function buildSample(
  state: RadialState,
  time: number,
  params: Required<EscapeVelocityParams>,
) {
  const effectiveRadius = Math.max(state.radius, ESCAPE_VELOCITY_MIN_SAMPLE_RADIUS);
  const speed = Math.abs(state.radialVelocity);
  const gravityAcceleration =
    params.sourceMass / (effectiveRadius * effectiveRadius);
  const launchEscapeSpeed = resolveEscapeSpeedAtRadius(
    params.sourceMass,
    params.launchRadius,
  );
  const launchCircularSpeed = resolveCircularSpeedAtRadius(
    params.sourceMass,
    params.launchRadius,
  );
  const totalEnergy = resolveSpecificTotalEnergy(params);

  return {
    time,
    radius: state.radius,
    radialVelocity: state.radialVelocity,
    speed,
    gravityAcceleration,
    launchSpeed: launchEscapeSpeed * params.speedFactor,
    launchEscapeSpeed,
    launchCircularSpeed,
    localEscapeSpeed: resolveEscapeSpeedAtRadius(params.sourceMass, effectiveRadius),
    localCircularSpeed: resolveCircularSpeedAtRadius(params.sourceMass, effectiveRadius),
    kineticEnergy: 0.5 * speed * speed,
    potentialEnergy: -params.sourceMass / effectiveRadius,
    totalEnergy,
    turnaroundRadius: resolveTurnaroundRadius(params.sourceMass, totalEnergy),
  } satisfies EscapeVelocityState;
}

function interpolateSample(
  first: EscapeVelocityState,
  second: EscapeVelocityState,
  time: number,
) {
  const span = second.time - first.time;
  const amount = span <= 0 ? 0 : (time - first.time) / span;

  return {
    ...first,
    time,
    radius: first.radius + (second.radius - first.radius) * amount,
    radialVelocity:
      first.radialVelocity + (second.radialVelocity - first.radialVelocity) * amount,
    speed: first.speed + (second.speed - first.speed) * amount,
    gravityAcceleration:
      first.gravityAcceleration +
      (second.gravityAcceleration - first.gravityAcceleration) * amount,
    localEscapeSpeed:
      first.localEscapeSpeed + (second.localEscapeSpeed - first.localEscapeSpeed) * amount,
    localCircularSpeed:
      first.localCircularSpeed +
      (second.localCircularSpeed - first.localCircularSpeed) * amount,
    kineticEnergy:
      first.kineticEnergy + (second.kineticEnergy - first.kineticEnergy) * amount,
    potentialEnergy:
      first.potentialEnergy + (second.potentialEnergy - first.potentialEnergy) * amount,
  } satisfies EscapeVelocityState;
}

function detectTurnaroundTime(params: Required<EscapeVelocityParams>, baseDuration: number) {
  if (params.speedFactor >= 1) {
    return null;
  }

  const characteristicTime = resolveCharacteristicTime(
    params.sourceMass,
    params.launchRadius,
  );
  const detectionDuration = Math.min(
    ESCAPE_VELOCITY_MAX_DURATION * 1.5,
    Math.max(baseDuration * 2.2, baseDuration + 2 * characteristicTime),
  );
  const detectionStep = Math.max(characteristicTime / 80, 0.01);
  let state: RadialState = {
    radius: params.launchRadius,
    radialVelocity:
      resolveEscapeSpeedAtRadius(params.sourceMass, params.launchRadius) * params.speedFactor,
  };
  let time = 0;
  let previousVelocity = state.radialVelocity;

  while (time < detectionDuration) {
    state = advanceRadialState(state, params.sourceMass, detectionStep);
    time += detectionStep;

    if (previousVelocity > 0 && state.radialVelocity <= 0) {
      return time;
    }

    previousVelocity = state.radialVelocity;
  }

  return null;
}

function resolveDuration(params: Required<EscapeVelocityParams>) {
  const characteristicTime = resolveCharacteristicTime(
    params.sourceMass,
    params.launchRadius,
  );
  const baseDuration = clamp(
    characteristicTime * 4.4 + 1,
    ESCAPE_VELOCITY_MIN_DURATION,
    ESCAPE_VELOCITY_MAX_DURATION,
  );
  const turnaroundTime = detectTurnaroundTime(params, baseDuration);

  if (turnaroundTime === null) {
    return baseDuration;
  }

  return clamp(
    Math.max(baseDuration, turnaroundTime * 1.25),
    ESCAPE_VELOCITY_MIN_DURATION,
    ESCAPE_VELOCITY_MAX_DURATION,
  );
}

export function resolveEscapeVelocityParams(
  source: Partial<EscapeVelocityParams> | Record<string, number | boolean | string>,
) {
  return {
    sourceMass: resolveSourceMass(source.sourceMass, 4),
    launchRadius: resolveLaunchRadius(source.launchRadius, 1.6),
    speedFactor: resolveSpeedFactor(source.speedFactor, 1),
  } satisfies Required<EscapeVelocityParams>;
}

export function buildEscapeVelocityTrajectory(
  source: Partial<EscapeVelocityParams> | Record<string, number | boolean | string>,
) {
  const params = resolveEscapeVelocityParams(source);
  const duration = resolveDuration(params);
  const timeStep = duration / (ESCAPE_VELOCITY_SAMPLE_COUNT - 1);
  let state: RadialState = {
    radius: params.launchRadius,
    radialVelocity:
      resolveEscapeSpeedAtRadius(params.sourceMass, params.launchRadius) * params.speedFactor,
  };

  const samples: EscapeVelocityState[] = [];

  for (let index = 0; index < ESCAPE_VELOCITY_SAMPLE_COUNT; index += 1) {
    const time = index * timeStep;
    samples.push(buildSample(state, time, params));

    if (index < ESCAPE_VELOCITY_SAMPLE_COUNT - 1) {
      state = advanceRadialState(state, params.sourceMass, timeStep);
    }
  }

  return {
    params,
    duration,
    timeStep,
    samples,
  } satisfies EscapeVelocityTrajectory;
}

export function sampleEscapeVelocityState(
  source: Partial<EscapeVelocityParams> | Record<string, number | boolean | string>,
  time: number,
  trajectory?: EscapeVelocityTrajectory,
) {
  const resolvedTrajectory = trajectory ?? buildEscapeVelocityTrajectory(source);
  const clampedTime = clamp(time, 0, resolvedTrajectory.duration);
  const lastIndex = resolvedTrajectory.samples.length - 1;
  const rawIndex = clampedTime / Math.max(resolvedTrajectory.timeStep, 1e-6);
  const baseIndex = Math.min(lastIndex, Math.max(0, Math.floor(rawIndex)));
  const nextIndex = Math.min(lastIndex, baseIndex + 1);
  const first = resolvedTrajectory.samples[baseIndex] ?? resolvedTrajectory.samples[0];
  const second = resolvedTrajectory.samples[nextIndex] ?? first;

  if (!first || !second || baseIndex === nextIndex) {
    return first ?? buildSample(
      {
        radius: resolvedTrajectory.params.launchRadius,
        radialVelocity:
          resolveEscapeSpeedAtRadius(
            resolvedTrajectory.params.sourceMass,
            resolvedTrajectory.params.launchRadius,
          ) * resolvedTrajectory.params.speedFactor,
      },
      0,
      resolvedTrajectory.params,
    );
  }

  return interpolateSample(first, second, clampedTime);
}

export function buildEscapeVelocitySeries(
  source: Partial<EscapeVelocityParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const trajectory = buildEscapeVelocityTrajectory(source);

  return {
    "radius-history": [
      buildSeries(
        "radius",
        "r(t)",
        trajectory.samples.map((sample) => ({ x: sample.time, y: sample.radius })),
        "#1d6f9f",
      ),
      buildSeries(
        "launch-radius",
        "r_launch",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: trajectory.params.launchRadius,
        })),
        "#f0ab3c",
        true,
      ),
    ],
    "speed-thresholds": [
      buildSeries(
        "actual-speed",
        "v(t)",
        trajectory.samples.map((sample) => ({ x: sample.time, y: sample.speed })),
        "#4ea6df",
      ),
      buildSeries(
        "local-escape-speed",
        "v_esc(r)",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.localEscapeSpeed,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "local-circular-speed",
        "v_c(r)",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.localCircularSpeed,
        })),
        "#f0ab3c",
      ),
    ],
    "specific-energy": [
      buildSeries(
        "kinetic-energy",
        "K/m",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.kineticEnergy,
        })),
        "#f16659",
      ),
      buildSeries(
        "potential-energy",
        "U/m",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.potentialEnergy,
        })),
        "#0f1c24",
      ),
      buildSeries(
        "total-energy",
        "E/m",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.totalEnergy,
        })),
        "#1d6f9f",
      ),
      buildSeries(
        "zero-energy",
        "E = 0",
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: 0,
        })),
        "#1ea6a2",
        true,
      ),
    ],
  };
}

function classifyEnergyState(snapshot: EscapeVelocityState) {
  if (snapshot.totalEnergy > 0.02) {
    return "The launch keeps positive specific total energy, so it never needs a finite turnaround radius even though the speed keeps dropping.";
  }

  if (Math.abs(snapshot.totalEnergy) <= 0.02) {
    return "The launch sits close to the escape threshold, where the total specific energy is about zero and the speed slowly trends toward zero only very far away.";
  }

  if (snapshot.radialVelocity < -0.02) {
    return "The launch was energetic enough to climb well above the start, but the negative total specific energy kept it bound and it is now returning.";
  }

  return "The launch is still climbing, but the negative total specific energy means it is only a high bound trip, not an escape.";
}

export function describeEscapeVelocityState(
  source: Partial<EscapeVelocityParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const trajectory = buildEscapeVelocityTrajectory(source);
  const snapshot = sampleEscapeVelocityState(source, time, trajectory);
  const turnaroundText = snapshot.turnaroundRadius
    ? `If nothing else changes, the bound case would turn around near ${formatMeasurement(snapshot.turnaroundRadius, "m")}.`
    : "There is no finite turnaround radius because the total specific energy is zero or positive.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the launch mass is ${formatMeasurement(snapshot.radius, "m")} from the source and moving at ${formatMeasurement(snapshot.speed, "m/s")} along the radial line. The local escape speed there is ${formatMeasurement(snapshot.localEscapeSpeed, "m/s")}, while the circular-orbit comparison speed at that same radius is ${formatMeasurement(snapshot.localCircularSpeed, "m/s")}. The specific energies are K/m = ${formatNumber(snapshot.kineticEnergy)}, U/m = ${formatNumber(snapshot.potentialEnergy)}, and E/m = ${formatNumber(snapshot.totalEnergy)}. ${classifyEnergyState(snapshot)} ${turnaroundText}`;
}
