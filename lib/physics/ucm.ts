import { TAU, formatMeasurement, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type UcmParams = {
  radius?: number;
  angularSpeed?: number;
  omega?: number;
  phase?: number;
};

export type UcmSnapshot = {
  angle: number;
  wrappedAngle: number;
  x: number;
  y: number;
  speed: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  centripetalAcceleration: number;
  period: number;
};

export function resolveUcmParams(params: UcmParams) {
  return {
    radius: Math.max(0.05, safeNumber(params.radius, 1)),
    angularSpeed: Math.max(
      0.05,
      safeNumber(params.omega ?? params.angularSpeed, 1),
    ),
    phase: safeNumber(params.phase, 0),
  };
}

export function normalizeAngle(angle: number) {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}

export function phaseFromAngle(angle: number, time: number, angularSpeed: number) {
  return normalizeAngle(angle - angularSpeed * time);
}

export function sampleUcmState(params: UcmParams, time: number): UcmSnapshot {
  const resolved = resolveUcmParams(params);
  const angle = resolved.angularSpeed * time + resolved.phase;
  const wrappedAngle = normalizeAngle(angle);
  const x = resolved.radius * Math.cos(angle);
  const y = resolved.radius * Math.sin(angle);
  const speed = resolved.angularSpeed * resolved.radius;
  const vx = -speed * Math.sin(angle);
  const vy = speed * Math.cos(angle);
  const ax = -(resolved.angularSpeed ** 2) * x;
  const ay = -(resolved.angularSpeed ** 2) * y;
  const centripetalAcceleration = resolved.angularSpeed ** 2 * resolved.radius;
  const period = TAU / resolved.angularSpeed;

  return {
    angle,
    wrappedAngle,
    x,
    y,
    speed,
    vx,
    vy,
    ax,
    ay,
    centripetalAcceleration,
    period,
  };
}

export function buildUcmSeries(params: UcmParams): GraphSeriesMap {
  const resolved = resolveUcmParams(params);
  const duration = 8;
  const sampleCount = 240;

  return {
    projections: [
      sampleTimeSeries(
        "x-projection",
        "x(t)",
        0,
        duration,
        sampleCount,
        (time) => sampleUcmState(resolved, time).x,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "y-projection",
        "y(t)",
        0,
        duration,
        sampleCount,
        (time) => sampleUcmState(resolved, time).y,
        "#f16659",
      ),
    ],
    velocity: [
      sampleTimeSeries(
        "vx",
        "vx(t)",
        0,
        duration,
        sampleCount,
        (time) => sampleUcmState(resolved, time).vx,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "vy",
        "vy(t)",
        0,
        duration,
        sampleCount,
        (time) => sampleUcmState(resolved, time).vy,
        "#f0ab3c",
      ),
    ],
    angle: [
      sampleTimeSeries(
        "angle",
        "theta(t)",
        0,
        duration,
        sampleCount,
        (time) => sampleUcmState(resolved, time).angle,
        "#315063",
      ),
    ],
  };
}

export function describeUcmState(params: UcmParams, time: number) {
  const resolved = resolveUcmParams(params);
  const snapshot = sampleUcmState(resolved, time);

  return `At t = ${formatMeasurement(time, "s")}, the particle is at ${formatMeasurement(snapshot.wrappedAngle, "rad")} with x = ${formatMeasurement(snapshot.x, "m")} and y = ${formatMeasurement(snapshot.y, "m")}. Its tangential speed stays ${formatMeasurement(snapshot.speed, "m/s")} while the centripetal acceleration of ${formatMeasurement(snapshot.centripetalAcceleration, "m/s^2")} points inward.`;
}
