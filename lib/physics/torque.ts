import { buildSeries, sampleTimeSeries } from "./series";
import { clamp, degToRad, formatMeasurement, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type TorqueParams = {
  forceMagnitude?: number;
  forceAngle?: number;
  applicationDistance?: number;
};

export type TorqueSnapshot = {
  forceMagnitude: number;
  forceAngle: number;
  forceAngleRad: number;
  applicationDistance: number;
  momentOfInertia: number;
  forceParallel: number;
  forcePerpendicular: number;
  momentArm: number;
  momentArmMagnitude: number;
  torque: number;
  angularAcceleration: number;
  angularSpeed: number;
  rotationAngle: number;
  displayTime: number;
  turningDirectionLabel: "counterclockwise" | "clockwise" | "balanced";
};

export const TORQUE_BAR_LENGTH = 1.6;
export const TORQUE_MIN_DISTANCE = 0.2;
export const TORQUE_MAX_DISTANCE = TORQUE_BAR_LENGTH;
export const TORQUE_MIN_FORCE = 0.5;
export const TORQUE_MAX_FORCE = 5;
export const TORQUE_MIN_ANGLE = -180;
export const TORQUE_MAX_ANGLE = 180;
export const TORQUE_TOTAL_TIME = 2.4;
export const TORQUE_MOMENT_OF_INERTIA = 7;

function collapseNearZero(value: number, threshold = 1e-6) {
  return Math.abs(value) <= threshold ? 0 : value;
}

export function resolveTorqueParams(params: TorqueParams) {
  return {
    forceMagnitude: clamp(
      safeNumber(params.forceMagnitude, 2),
      TORQUE_MIN_FORCE,
      TORQUE_MAX_FORCE,
    ),
    forceAngle: clamp(
      safeNumber(params.forceAngle, 90),
      TORQUE_MIN_ANGLE,
      TORQUE_MAX_ANGLE,
    ),
    applicationDistance: clamp(
      safeNumber(params.applicationDistance, TORQUE_BAR_LENGTH),
      TORQUE_MIN_DISTANCE,
      TORQUE_MAX_DISTANCE,
    ),
    momentOfInertia: TORQUE_MOMENT_OF_INERTIA,
  };
}

export function clampTorqueTime(time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return 0;
  }

  return Math.min(time, TORQUE_TOTAL_TIME);
}

export function sampleTorqueState(
  params: TorqueParams,
  time: number,
): TorqueSnapshot {
  const resolved = resolveTorqueParams(params);
  const displayTime = clampTorqueTime(time);
  const forceAngleRad = degToRad(resolved.forceAngle);
  const forceParallel = collapseNearZero(
    resolved.forceMagnitude * Math.cos(forceAngleRad),
  );
  const forcePerpendicular = collapseNearZero(
    resolved.forceMagnitude * Math.sin(forceAngleRad),
  );
  const momentArm = collapseNearZero(
    resolved.applicationDistance * Math.sin(forceAngleRad),
  );
  const torque = collapseNearZero(resolved.applicationDistance * forcePerpendicular);
  const angularAcceleration = collapseNearZero(torque / resolved.momentOfInertia);
  const angularSpeed = collapseNearZero(angularAcceleration * displayTime);
  const rotationAngle = collapseNearZero(
    0.5 * angularAcceleration * displayTime * displayTime,
  );

  return {
    ...resolved,
    forceAngleRad,
    forceParallel,
    forcePerpendicular,
    momentArm,
    momentArmMagnitude: Math.abs(momentArm),
    torque,
    angularAcceleration,
    angularSpeed,
    rotationAngle,
    displayTime,
    turningDirectionLabel:
      Math.abs(torque) <= 0.02
        ? "balanced"
        : torque > 0
          ? "counterclockwise"
          : "clockwise",
  };
}

export function buildTorqueSeries(params: TorqueParams): GraphSeriesMap {
  const resolved = resolveTorqueParams(params);
  const staticSnapshot = sampleTorqueState(resolved, 0);
  const sampleCount = 241;
  const angleSamples = sampleRange(TORQUE_MIN_ANGLE, TORQUE_MAX_ANGLE, 181).map(
    (forceAngle) => ({
      x: forceAngle,
      y:
        resolved.applicationDistance *
        resolved.forceMagnitude *
        Math.sin(degToRad(forceAngle)),
    }),
  );

  return {
    torque: [
      sampleTimeSeries(
        "torque",
        "tau",
        0,
        TORQUE_TOTAL_TIME,
        sampleCount,
        () => staticSnapshot.torque,
        "#f16659",
      ),
    ],
    "angular-speed": [
      sampleTimeSeries(
        "angular-speed",
        "omega",
        0,
        TORQUE_TOTAL_TIME,
        sampleCount,
        (time) => sampleTorqueState(resolved, time).angularSpeed,
        "#1ea6a2",
      ),
    ],
    "rotation-angle": [
      sampleTimeSeries(
        "rotation-angle",
        "theta",
        0,
        TORQUE_TOTAL_TIME,
        sampleCount,
        (time) => sampleTorqueState(resolved, time).rotationAngle,
        "#4ea6df",
      ),
    ],
    "direction-map": [
      buildSeries("torque-angle-map", "tau(phi)", angleSamples, "#4ea6df"),
      buildSeries(
        "current-angle-marker",
        "current setup",
        [{ x: resolved.forceAngle, y: staticSnapshot.torque }],
        "#f16659",
      ),
    ],
  };
}

export function describeTorqueState(params: TorqueParams, time: number) {
  const snapshot = sampleTorqueState(params, time);
  const directionSummary =
    snapshot.turningDirectionLabel === "balanced"
      ? "The force line nearly passes through the pivot, so the bar is not gaining much spin."
      : snapshot.turningDirectionLabel === "counterclockwise"
        ? "The positive torque keeps building counterclockwise rotation."
        : "The negative torque keeps building clockwise rotation.";

  return `At t = ${formatMeasurement(snapshot.displayTime, "s")}, a ${formatMeasurement(snapshot.forceMagnitude, "N")} force is applied ${formatMeasurement(snapshot.applicationDistance, "m")} from the pivot at ${formatMeasurement(snapshot.forceAngle, "deg")}. The perpendicular component is ${formatMeasurement(snapshot.forcePerpendicular, "N")}, so the torque is ${formatMeasurement(snapshot.torque, "N m")}. The angular acceleration is ${formatMeasurement(snapshot.angularAcceleration, "rad/s^2")}, the bar's angular speed is ${formatMeasurement(snapshot.angularSpeed, "rad/s")}, and its rotation is ${formatMeasurement(snapshot.rotationAngle, "rad")}. ${directionSummary}`;
}
