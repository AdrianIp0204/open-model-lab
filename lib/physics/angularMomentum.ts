import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type AngularMomentumParams = {
  massRadius?: number;
  angularSpeed?: number;
};

export type AngularMomentumSnapshot = {
  massRadius: number;
  angularSpeed: number;
  totalMass: number;
  puckCount: number;
  puckMass: number;
  hubInertia: number;
  momentOfInertia: number;
  angularMomentum: number;
  tangentialSpeed: number;
  rotationAngle: number;
  displayTime: number;
  compactReferenceRadius: number;
  compactReferenceInertia: number;
  referenceAngularSpeed: number;
  distributionLabel: "compact" | "mid" | "spread";
};

export const ANGULAR_MOMENTUM_MIN_RADIUS = 0.18;
export const ANGULAR_MOMENTUM_MAX_RADIUS = 1.15;
export const ANGULAR_MOMENTUM_MIN_SPEED = 0.6;
export const ANGULAR_MOMENTUM_MAX_SPEED = 6.5;
export const ANGULAR_MOMENTUM_TOTAL_MASS = 6;
export const ANGULAR_MOMENTUM_PUCK_COUNT = 6;
export const ANGULAR_MOMENTUM_PUCK_MASS =
  ANGULAR_MOMENTUM_TOTAL_MASS / ANGULAR_MOMENTUM_PUCK_COUNT;
export const ANGULAR_MOMENTUM_HUB_INERTIA = 0.45;
export const ANGULAR_MOMENTUM_REFERENCE_RADIUS = 0.28;
export const ANGULAR_MOMENTUM_TOTAL_TIME = 2.4;

function collapseNearZero(value: number, threshold = 1e-6) {
  return Math.abs(value) <= threshold ? 0 : value;
}

export function resolveAngularMomentumParams(params: AngularMomentumParams) {
  const massRadius = clamp(
    safeNumber(params.massRadius, 0.55),
    ANGULAR_MOMENTUM_MIN_RADIUS,
    ANGULAR_MOMENTUM_MAX_RADIUS,
  );
  const angularSpeed = clamp(
    safeNumber(params.angularSpeed, 2.4),
    ANGULAR_MOMENTUM_MIN_SPEED,
    ANGULAR_MOMENTUM_MAX_SPEED,
  );
  const compactReferenceInertia = collapseNearZero(
    ANGULAR_MOMENTUM_HUB_INERTIA +
      ANGULAR_MOMENTUM_TOTAL_MASS *
        ANGULAR_MOMENTUM_REFERENCE_RADIUS *
        ANGULAR_MOMENTUM_REFERENCE_RADIUS,
  );

  return {
    massRadius,
    angularSpeed,
    totalMass: ANGULAR_MOMENTUM_TOTAL_MASS,
    puckCount: ANGULAR_MOMENTUM_PUCK_COUNT,
    puckMass: ANGULAR_MOMENTUM_PUCK_MASS,
    hubInertia: ANGULAR_MOMENTUM_HUB_INERTIA,
    compactReferenceRadius: ANGULAR_MOMENTUM_REFERENCE_RADIUS,
    compactReferenceInertia,
  };
}

export function clampAngularMomentumTime(time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return 0;
  }

  return Math.min(time, ANGULAR_MOMENTUM_TOTAL_TIME);
}

export function sampleAngularMomentumState(
  params: AngularMomentumParams,
  time: number,
): AngularMomentumSnapshot {
  const resolved = resolveAngularMomentumParams(params);
  const displayTime = clampAngularMomentumTime(time);
  const momentOfInertia = collapseNearZero(
    resolved.hubInertia + resolved.totalMass * resolved.massRadius * resolved.massRadius,
  );
  const angularMomentum = collapseNearZero(momentOfInertia * resolved.angularSpeed);
  const tangentialSpeed = collapseNearZero(resolved.massRadius * resolved.angularSpeed);
  const rotationAngle = collapseNearZero(resolved.angularSpeed * displayTime);
  const referenceAngularSpeed = collapseNearZero(
    angularMomentum / resolved.compactReferenceInertia,
  );
  const normalizedRadius =
    (resolved.massRadius - ANGULAR_MOMENTUM_MIN_RADIUS) /
    (ANGULAR_MOMENTUM_MAX_RADIUS - ANGULAR_MOMENTUM_MIN_RADIUS);

  return {
    ...resolved,
    momentOfInertia,
    angularMomentum,
    tangentialSpeed,
    rotationAngle,
    displayTime,
    referenceAngularSpeed,
    distributionLabel:
      normalizedRadius <= 0.33 ? "compact" : normalizedRadius >= 0.67 ? "spread" : "mid",
  };
}

export function buildAngularMomentumSeries(params: AngularMomentumParams): GraphSeriesMap {
  const resolved = resolveAngularMomentumParams(params);
  const staticSnapshot = sampleAngularMomentumState(resolved, 0);
  const sampleCount = 241;
  const radiusSamples = sampleRange(
    ANGULAR_MOMENTUM_MIN_RADIUS,
    ANGULAR_MOMENTUM_MAX_RADIUS,
    181,
  );

  return {
    "rotation-angle": [
      sampleTimeSeries(
        "rotation-angle",
        "theta",
        0,
        ANGULAR_MOMENTUM_TOTAL_TIME,
        sampleCount,
        (time) => sampleAngularMomentumState(resolved, time).rotationAngle,
        "#4ea6df",
      ),
    ],
    "momentum-map": [
      buildSeries(
        "momentum-response",
        "L(r) at current omega",
        radiusSamples.map((massRadius) => {
          const momentOfInertia =
            ANGULAR_MOMENTUM_HUB_INERTIA +
            ANGULAR_MOMENTUM_TOTAL_MASS * massRadius * massRadius;

          return {
            x: massRadius,
            y: momentOfInertia * resolved.angularSpeed,
          };
        }),
        "#f0ab3c",
      ),
      buildSeries(
        "current-radius-momentum",
        "current setup",
        [{ x: resolved.massRadius, y: staticSnapshot.angularMomentum }],
        "#f16659",
      ),
    ],
    "conserved-spin-map": [
      buildSeries(
        "same-l-response",
        "omega(r) at current L",
        radiusSamples.map((massRadius) => {
          const momentOfInertia =
            ANGULAR_MOMENTUM_HUB_INERTIA +
            ANGULAR_MOMENTUM_TOTAL_MASS * massRadius * massRadius;

          return {
            x: massRadius,
            y: staticSnapshot.angularMomentum / momentOfInertia,
          };
        }),
        "#1ea6a2",
      ),
      buildSeries(
        "current-radius-speed",
        "current setup",
        [{ x: resolved.massRadius, y: staticSnapshot.angularSpeed }],
        "#f16659",
      ),
    ],
  };
}

export function describeAngularMomentumState(
  params: AngularMomentumParams,
  time: number,
) {
  const snapshot = sampleAngularMomentumState(params, time);
  const distributionSummary =
    snapshot.distributionLabel === "compact"
      ? "Because the same mass is packed close to the axis, the same angular momentum corresponds to a relatively fast spin."
      : snapshot.distributionLabel === "spread"
        ? "Because the same mass sits far from the axis, the same angular momentum can hide behind a much slower spin."
        : "At this mid-radius layout, the angular momentum sits between the compact and wide-layout extremes.";

  return `At t = ${formatMeasurement(snapshot.displayTime, "s")}, the six equal masses sit at ${formatMeasurement(snapshot.massRadius, "m")} from the axis and rotate at ${formatMeasurement(snapshot.angularSpeed, "rad/s")}. That gives a moment of inertia of ${formatMeasurement(snapshot.momentOfInertia, "kg m^2")}, an angular momentum of ${formatMeasurement(snapshot.angularMomentum, "kg m^2/s")}, a rim speed of ${formatMeasurement(snapshot.tangentialSpeed, "m/s")}, and a rotation angle of ${formatMeasurement(snapshot.rotationAngle, "rad")}. If that same angular momentum were packed to the compact reference radius, the spin would be ${formatMeasurement(snapshot.referenceAngularSpeed, "rad/s")}. ${distributionSummary}`;
}
