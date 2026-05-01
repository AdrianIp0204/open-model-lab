import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type RotationalInertiaParams = {
  appliedTorque?: number;
  massRadius?: number;
};

export type RotationalInertiaSnapshot = {
  appliedTorque: number;
  massRadius: number;
  totalMass: number;
  puckCount: number;
  puckMass: number;
  hubInertia: number;
  momentOfInertia: number;
  angularAcceleration: number;
  angularSpeed: number;
  rotationAngle: number;
  displayTime: number;
  distributionLabel: "compact" | "mid" | "spread";
};

export const ROTATIONAL_INERTIA_MIN_TORQUE = 1.5;
export const ROTATIONAL_INERTIA_MAX_TORQUE = 6;
export const ROTATIONAL_INERTIA_MIN_RADIUS = 0.18;
export const ROTATIONAL_INERTIA_MAX_RADIUS = 1.15;
export const ROTATIONAL_INERTIA_TOTAL_MASS = 6;
export const ROTATIONAL_INERTIA_PUCK_COUNT = 6;
export const ROTATIONAL_INERTIA_PUCK_MASS =
  ROTATIONAL_INERTIA_TOTAL_MASS / ROTATIONAL_INERTIA_PUCK_COUNT;
export const ROTATIONAL_INERTIA_HUB_INERTIA = 0.45;
export const ROTATIONAL_INERTIA_TOTAL_TIME = 2.4;

function collapseNearZero(value: number, threshold = 1e-6) {
  return Math.abs(value) <= threshold ? 0 : value;
}

export function resolveRotationalInertiaParams(params: RotationalInertiaParams) {
  return {
    appliedTorque: clamp(
      safeNumber(params.appliedTorque, 4),
      ROTATIONAL_INERTIA_MIN_TORQUE,
      ROTATIONAL_INERTIA_MAX_TORQUE,
    ),
    massRadius: clamp(
      safeNumber(params.massRadius, 0.35),
      ROTATIONAL_INERTIA_MIN_RADIUS,
      ROTATIONAL_INERTIA_MAX_RADIUS,
    ),
    totalMass: ROTATIONAL_INERTIA_TOTAL_MASS,
    puckCount: ROTATIONAL_INERTIA_PUCK_COUNT,
    puckMass: ROTATIONAL_INERTIA_PUCK_MASS,
    hubInertia: ROTATIONAL_INERTIA_HUB_INERTIA,
  };
}

export function clampRotationalInertiaTime(time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return 0;
  }

  return Math.min(time, ROTATIONAL_INERTIA_TOTAL_TIME);
}

export function sampleRotationalInertiaState(
  params: RotationalInertiaParams,
  time: number,
): RotationalInertiaSnapshot {
  const resolved = resolveRotationalInertiaParams(params);
  const displayTime = clampRotationalInertiaTime(time);
  const momentOfInertia = collapseNearZero(
    resolved.hubInertia + resolved.totalMass * resolved.massRadius * resolved.massRadius,
  );
  const angularAcceleration = collapseNearZero(resolved.appliedTorque / momentOfInertia);
  const angularSpeed = collapseNearZero(angularAcceleration * displayTime);
  const rotationAngle = collapseNearZero(
    0.5 * angularAcceleration * displayTime * displayTime,
  );
  const normalizedRadius =
    (resolved.massRadius - ROTATIONAL_INERTIA_MIN_RADIUS) /
    (ROTATIONAL_INERTIA_MAX_RADIUS - ROTATIONAL_INERTIA_MIN_RADIUS);

  return {
    ...resolved,
    momentOfInertia,
    angularAcceleration,
    angularSpeed,
    rotationAngle,
    displayTime,
    distributionLabel:
      normalizedRadius <= 0.33 ? "compact" : normalizedRadius >= 0.67 ? "spread" : "mid",
  };
}

export function buildRotationalInertiaSeries(
  params: RotationalInertiaParams,
): GraphSeriesMap {
  const resolved = resolveRotationalInertiaParams(params);
  const staticSnapshot = sampleRotationalInertiaState(resolved, 0);
  const sampleCount = 241;
  const radiusSamples = sampleRange(
    ROTATIONAL_INERTIA_MIN_RADIUS,
    ROTATIONAL_INERTIA_MAX_RADIUS,
    181,
  );

  return {
    "angular-speed": [
      sampleTimeSeries(
        "angular-speed",
        "omega",
        0,
        ROTATIONAL_INERTIA_TOTAL_TIME,
        sampleCount,
        (time) => sampleRotationalInertiaState(resolved, time).angularSpeed,
        "#1ea6a2",
      ),
    ],
    "rotation-angle": [
      sampleTimeSeries(
        "rotation-angle",
        "theta",
        0,
        ROTATIONAL_INERTIA_TOTAL_TIME,
        sampleCount,
        (time) => sampleRotationalInertiaState(resolved, time).rotationAngle,
        "#4ea6df",
      ),
    ],
    "inertia-map": [
      buildSeries(
        "inertia-response",
        "I(r)",
        radiusSamples.map((massRadius) => ({
          x: massRadius,
          y:
            ROTATIONAL_INERTIA_HUB_INERTIA +
            ROTATIONAL_INERTIA_TOTAL_MASS * massRadius * massRadius,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "current-radius-inertia",
        "current setup",
        [{ x: resolved.massRadius, y: staticSnapshot.momentOfInertia }],
        "#f16659",
      ),
    ],
    "spin-up-map": [
      buildSeries(
        "acceleration-response",
        "alpha(r)",
        radiusSamples.map((massRadius) => {
          const momentOfInertia =
            ROTATIONAL_INERTIA_HUB_INERTIA +
            ROTATIONAL_INERTIA_TOTAL_MASS * massRadius * massRadius;

          return {
            x: massRadius,
            y: resolved.appliedTorque / momentOfInertia,
          };
        }),
        "#1ea6a2",
      ),
      buildSeries(
        "current-radius-acceleration",
        "current setup",
        [{ x: resolved.massRadius, y: staticSnapshot.angularAcceleration }],
        "#f16659",
      ),
    ],
  };
}

export function describeRotationalInertiaState(
  params: RotationalInertiaParams,
  time: number,
) {
  const snapshot = sampleRotationalInertiaState(params, time);
  const spreadSummary =
    snapshot.distributionLabel === "compact"
      ? "Most of the mass stays close to the axis, so the same torque spins the rotor up quickly."
      : snapshot.distributionLabel === "spread"
        ? "More of the same mass sits far from the axis, so the same torque produces a gentler spin-up."
        : "The mass sits at a moderate radius, so the spin-up is neither especially quick nor especially sluggish.";

  return `At t = ${formatMeasurement(snapshot.displayTime, "s")}, the motor applies ${formatMeasurement(snapshot.appliedTorque, "N m")} while the six equal masses sit at ${formatMeasurement(snapshot.massRadius, "m")} from the axis. That gives a moment of inertia of ${formatMeasurement(snapshot.momentOfInertia, "kg m^2")}, so the angular acceleration is ${formatMeasurement(snapshot.angularAcceleration, "rad/s^2")}, the angular speed is ${formatMeasurement(snapshot.angularSpeed, "rad/s")}, and the rotation angle is ${formatMeasurement(snapshot.rotationAngle, "rad")}. ${spreadSummary}`;
}
