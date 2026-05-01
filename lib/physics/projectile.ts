import { degToRad, formatMeasurement, safeNumber } from "./math";
import { samplePathSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type ProjectileParams = {
  launchSpeed?: number;
  launchAngle?: number;
  speed?: number;
  angle?: number;
  gravity?: number;
  launchHeight?: number;
};

export type ProjectileSnapshot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timeOfFlight: number;
  range: number;
  maxHeight: number;
};

export type ProjectileViewport = {
  maxRange: number;
  maxHeight: number;
  maxTime: number;
};

const RANGE_BUCKETS = [20, 40, 80, 160, 320, 640];
const HEIGHT_BUCKETS = [6, 12, 24, 48, 96, 192];
const TIME_BUCKETS = [2, 4, 6, 8, 12, 18, 24];

function pickViewportBucket(value: number, buckets: number[]) {
  const safeValue = Math.max(0, value);
  return buckets.find((bucket) => safeValue <= bucket) ?? buckets[buckets.length - 1] ?? safeValue;
}

export function resolveProjectileParams(params: ProjectileParams) {
  return {
    launchSpeed: Math.max(0, safeNumber(params.speed ?? params.launchSpeed, 10)),
    launchAngle: safeNumber(params.angle ?? params.launchAngle, 45),
    gravity: Math.max(0.001, safeNumber(params.gravity, 9.81)),
    launchHeight: Math.max(0, safeNumber(params.launchHeight, 0)),
  };
}

export function sampleProjectileState(params: ProjectileParams, time: number): ProjectileSnapshot {
  const { launchSpeed, launchAngle, gravity, launchHeight } = resolveProjectileParams(params);
  const angle = degToRad(launchAngle);
  const vx = launchSpeed * Math.cos(angle);
  const vy0 = launchSpeed * Math.sin(angle);
  const x = vx * time;
  const y = launchHeight + vy0 * time - 0.5 * gravity * time * time;
  const timeOfFlight = (vy0 + Math.sqrt(Math.max(0, vy0 * vy0 + 2 * gravity * launchHeight))) / gravity;
  const range = vx * timeOfFlight;
  const maxHeight = launchHeight + (vy0 * vy0) / (2 * gravity);

  return {
    x,
    y,
    vx,
    vy: vy0 - gravity * time,
    timeOfFlight,
    range,
    maxHeight,
  };
}

export function normalizeProjectileTime(params: ProjectileParams, time: number) {
  const snapshot = sampleProjectileState(params, 0);
  const duration = snapshot.timeOfFlight;

  if (!Number.isFinite(time) || time <= 0 || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return time % duration;
}

export function clampProjectileTime(params: ProjectileParams, time: number) {
  const snapshot = sampleProjectileState(params, 0);
  const duration = snapshot.timeOfFlight;

  if (!Number.isFinite(time) || time <= 0 || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return Math.min(time, duration);
}

export function resolveProjectileViewport(paramsList: ProjectileParams[]) {
  const normalized = paramsList.map(resolveProjectileParams);
  const snapshots = normalized.map((params) => sampleProjectileState(params, 0));
  const requiredRange = Math.max(...snapshots.map((snapshot) => snapshot.range), 18);
  const requiredHeight = Math.max(...snapshots.map((snapshot) => snapshot.maxHeight), 5);
  const requiredTime = Math.max(...snapshots.map((snapshot) => snapshot.timeOfFlight), 2);

  return {
    maxRange: pickViewportBucket(requiredRange * 1.08, RANGE_BUCKETS),
    maxHeight: pickViewportBucket(requiredHeight * 1.12, HEIGHT_BUCKETS),
    maxTime: pickViewportBucket(requiredTime * 1.05, TIME_BUCKETS),
  } satisfies ProjectileViewport;
}

export function buildProjectileSeries(params: ProjectileParams): GraphSeriesMap {
  const normalized = resolveProjectileParams(params);
  const state = sampleProjectileState(normalized, 0);
  const duration = Math.max(0.5, state.timeOfFlight);
  const sampleCount = 220;
  const launchAngle = degToRad(normalized.launchAngle);
  const launchSpeed = normalized.launchSpeed;
  const gravity = normalized.gravity;
  const vx = launchSpeed * Math.cos(launchAngle);
  const vy0 = launchSpeed * Math.sin(launchAngle);

  return {
    trajectory: [
      samplePathSeries(
        "trajectory",
        "Trajectory",
        (time) => {
          const snapshot = sampleProjectileState(normalized, Math.min(time, state.timeOfFlight));
          return { x: snapshot.x, y: Math.max(0, snapshot.y) };
        },
        duration,
        sampleCount,
        "#1ea6a2",
      ),
    ],
    components: [
      sampleTimeSeries(
        "x-position",
        "Horizontal position",
        0,
        duration,
        sampleCount,
        (time) => vx * time,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "y-position",
        "Vertical position",
        0,
        duration,
        sampleCount,
        (time) => Math.max(0, normalized.launchHeight + vy0 * time - 0.5 * gravity * time * time),
        "#f16659",
      ),
    ],
    velocity: [
      sampleTimeSeries(
        "vx",
        "Horizontal velocity",
        0,
        duration,
        sampleCount,
        () => vx,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "vy",
        "Vertical velocity",
        0,
        duration,
        sampleCount,
        (time) => vy0 - gravity * time,
        "#4ea6df",
      ),
    ],
  };
}

export function describeProjectileState(params: ProjectileParams, time: number) {
  const normalized = resolveProjectileParams(params);
  const displayTime = clampProjectileTime(normalized, time);
  const state = sampleProjectileState(normalized, displayTime);
  return `At t = ${formatMeasurement(displayTime, "s")}, the projectile has traveled ${formatMeasurement(state.x, "m")} horizontally and ${formatMeasurement(state.y, "m")} vertically. The launch angle is ${formatMeasurement(normalized.launchAngle, "deg")}, the predicted range is ${formatMeasurement(state.range, "m")}, and the maximum height is ${formatMeasurement(state.maxHeight, "m")}.`;
}

export function angleFromVector(dx: number, dy: number) {
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function speedFromVector(dx: number, dy: number) {
  return Math.sqrt(dx * dx + dy * dy);
}
