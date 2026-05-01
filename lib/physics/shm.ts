import {
  TAU,
  clamp,
  degToRad,
  formatMeasurement,
  safeNumber,
} from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type ShmParams = {
  amplitude: number;
  angularFrequency?: number;
  springConstant?: number;
  mass?: number;
  phase: number;
  equilibriumShift?: number;
  damping?: number;
};

export type ShmSnapshot = {
  displacement: number;
  velocity: number;
  acceleration: number;
  energy: {
    kinetic: number;
    potential: number;
    total: number;
  };
};

export function resolveAngularFrequency(params: ShmParams) {
  const explicit = safeNumber(params.angularFrequency, 0);
  if (explicit > 0) {
    return explicit;
  }

  const springConstant = safeNumber(params.springConstant, 1);
  const mass = Math.max(0.001, safeNumber(params.mass, 1));
  return Math.sqrt(springConstant / mass);
}

export function resolveSpringConstant(params: ShmParams) {
  const explicit = safeNumber(params.springConstant, 0);
  if (explicit > 0) {
    return explicit;
  }

  const mass = Math.max(0.001, safeNumber(params.mass, 1));
  const omega = resolveAngularFrequency(params);
  return mass * omega * omega;
}

export function sampleShmState(params: ShmParams, time: number): ShmSnapshot {
  const omega = resolveAngularFrequency(params);
  const amplitude = Math.max(0, safeNumber(params.amplitude, 0));
  const phase = safeNumber(params.phase, 0);
  const damping = clamp(safeNumber(params.damping, 0), 0, 8);
  const equilibriumShift = safeNumber(params.equilibriumShift, 0);
  const envelope = damping === 0 ? 1 : Math.exp(-damping * time);
  const angle = omega * time + phase;
  const displacement = equilibriumShift + amplitude * envelope * Math.cos(angle);
  const velocity =
    amplitude * envelope * (-damping * Math.cos(angle) - omega * Math.sin(angle));
  const acceleration =
    amplitude *
      envelope *
      ((damping * damping - omega * omega) * Math.cos(angle) + 2 * damping * omega * Math.sin(angle));
  const mass = Math.max(0.001, safeNumber(params.mass, 1));
  const effectiveK = resolveSpringConstant(params);
  const relativeDisplacement = displacement - equilibriumShift;
  const kinetic = 0.5 * mass * velocity * velocity;
  const potential = 0.5 * effectiveK * relativeDisplacement * relativeDisplacement;

  return {
    displacement,
    velocity,
    acceleration,
    energy: {
      kinetic,
      potential,
      total: kinetic + potential,
    },
  };
}

export function buildShmSeries(params: ShmParams): GraphSeriesMap {
  const duration = 8;
  const sampleCount = 240;

  const position = sampleTimeSeries(
    "position",
    "Displacement",
    0,
    duration,
    sampleCount,
    (time) => sampleShmState(params, time).displacement,
    "#1ea6a2",
  );

  const velocity = sampleTimeSeries(
    "velocity",
    "Velocity",
    0,
    duration,
    sampleCount,
    (time) => sampleShmState(params, time).velocity,
    "#f0ab3c",
  );

  const acceleration = sampleTimeSeries(
    "acceleration",
    "Acceleration",
    0,
    duration,
    sampleCount,
    (time) => sampleShmState(params, time).acceleration,
    "#f16659",
  );

  const energy = sampleTimeSeries(
    "energy",
    "Total energy",
    0,
    duration,
    sampleCount,
    (time) => sampleShmState(params, time).energy.total,
    "#4ea6df",
  );

  return {
    displacement: [position],
    velocity: [velocity],
    acceleration: [acceleration],
    energy: [
      sampleTimeSeries(
        "kinetic",
        "Kinetic",
        0,
        duration,
        sampleCount,
        (time) => sampleShmState(params, time).energy.kinetic,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "potential",
        "Potential",
        0,
        duration,
        sampleCount,
        (time) => sampleShmState(params, time).energy.potential,
        "#f0ab3c",
      ),
      energy,
    ],
  };
}

export function describeShmState(params: ShmParams, time: number) {
  const state = sampleShmState(params, time);
  const omega = resolveAngularFrequency(params);
  const period = TAU / Math.max(0.001, omega);
  const phaseAngle = omega * time + safeNumber(params.phase, 0);

  return `At t = ${formatMeasurement(time, "s")}, the oscillator is ${formatMeasurement(state.displacement, "m")} from equilibrium, moving at ${formatMeasurement(state.velocity, "m/s")}, with acceleration ${formatMeasurement(state.acceleration, "m/s^2")}. The phase angle is ${formatMeasurement(phaseAngle, "rad")} and the period is about ${formatMeasurement(period, "s")}.`;
}

export function inferShmPathPoint(params: ShmParams, time: number) {
  const state = sampleShmState(params, time);
  return {
    x: time,
    y: state.displacement,
  };
}

export function phaseFromDisplacement(displacement: number, amplitude: number, time: number, omega: number) {
  const safeAmplitude = Math.max(0.001, Math.abs(amplitude));
  const ratio = clamp(displacement / safeAmplitude, -1, 1);
  const principal = Math.acos(ratio);
  return principal - omega * time;
}

export function angleFromDegrees(degrees: number) {
  return degToRad(degrees);
}
