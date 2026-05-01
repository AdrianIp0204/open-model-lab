import { clamp, degToRad, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type RollingMotionParams = {
  slopeAngle?: number;
  radius?: number;
  inertiaFactor?: number;
};

export type RollingMotionSnapshot = {
  slopeAngle: number;
  radius: number;
  inertiaFactor: number;
  gravity: number;
  objectMass: number;
  trackLength: number;
  totalHeightDrop: number;
  acceleration: number;
  angularAcceleration: number;
  travelTime: number;
  displayTime: number;
  distance: number;
  normalizedProgress: number;
  linearSpeed: number;
  angularSpeed: number;
  rotationAngle: number;
  translationalEnergy: number;
  rotationalEnergy: number;
  totalKineticEnergy: number;
  potentialEnergyDrop: number;
  staticFriction: number;
  torqueFromFriction: number;
  energyTranslationFraction: number;
  energyRotationFraction: number;
  shapeId: "sphere" | "cylinder" | "hoop" | "custom";
  shapeLabel: string;
  distributionLabel: "center-loaded" | "mid-loaded" | "rim-loaded";
};

export const ROLLING_MOTION_MIN_ANGLE = 6;
export const ROLLING_MOTION_MAX_ANGLE = 24;
export const ROLLING_MOTION_MIN_RADIUS = 0.16;
export const ROLLING_MOTION_MAX_RADIUS = 0.4;
export const ROLLING_MOTION_MIN_INERTIA_FACTOR = 0.4;
export const ROLLING_MOTION_MAX_INERTIA_FACTOR = 1.0;
export const ROLLING_MOTION_OBJECT_MASS = 1.2;
export const ROLLING_MOTION_GRAVITY = 9.81;
export const ROLLING_MOTION_TRACK_LENGTH = 2.4;

function collapseNearZero(value: number, threshold = 1e-6) {
  return Math.abs(value) <= threshold ? 0 : value;
}

function classifyRollingShape(
  inertiaFactor: number,
): Pick<RollingMotionSnapshot, "shapeId" | "shapeLabel" | "distributionLabel"> {
  if (Math.abs(inertiaFactor - 0.4) <= 0.02) {
    return {
      shapeId: "sphere",
      shapeLabel: "solid sphere",
      distributionLabel: "center-loaded",
    };
  }

  if (Math.abs(inertiaFactor - 0.5) <= 0.02) {
    return {
      shapeId: "cylinder",
      shapeLabel: "solid cylinder",
      distributionLabel: "mid-loaded",
    };
  }

  if (Math.abs(inertiaFactor - 1) <= 0.03) {
    return {
      shapeId: "hoop",
      shapeLabel: "hoop",
      distributionLabel: "rim-loaded",
    };
  }

  return inertiaFactor < 0.62
    ? {
        shapeId: "custom",
        shapeLabel: "custom center-loaded roller",
        distributionLabel: "center-loaded",
      }
    : inertiaFactor < 0.82
      ? {
          shapeId: "custom",
          shapeLabel: "custom mixed-distribution roller",
          distributionLabel: "mid-loaded",
        }
      : {
          shapeId: "custom",
          shapeLabel: "custom rim-loaded roller",
          distributionLabel: "rim-loaded",
        };
}

function resolveRollingAcceleration(slopeAngle: number, inertiaFactor: number) {
  return collapseNearZero(
    (ROLLING_MOTION_GRAVITY * Math.sin(degToRad(slopeAngle))) / (1 + inertiaFactor),
  );
}

function resolveRollingTravelTime(acceleration: number) {
  const safeAcceleration = Math.max(acceleration, 1e-6);
  return Math.sqrt((2 * ROLLING_MOTION_TRACK_LENGTH) / safeAcceleration);
}

export function resolveRollingMotionParams(params: RollingMotionParams) {
  const slopeAngle = clamp(
    safeNumber(params.slopeAngle, 12),
    ROLLING_MOTION_MIN_ANGLE,
    ROLLING_MOTION_MAX_ANGLE,
  );
  const radius = clamp(
    safeNumber(params.radius, 0.22),
    ROLLING_MOTION_MIN_RADIUS,
    ROLLING_MOTION_MAX_RADIUS,
  );
  const inertiaFactor = clamp(
    safeNumber(params.inertiaFactor, 0.5),
    ROLLING_MOTION_MIN_INERTIA_FACTOR,
    ROLLING_MOTION_MAX_INERTIA_FACTOR,
  );
  const shape = classifyRollingShape(inertiaFactor);

  return {
    slopeAngle,
    radius,
    inertiaFactor,
    gravity: ROLLING_MOTION_GRAVITY,
    objectMass: ROLLING_MOTION_OBJECT_MASS,
    trackLength: ROLLING_MOTION_TRACK_LENGTH,
    totalHeightDrop: ROLLING_MOTION_TRACK_LENGTH * Math.sin(degToRad(slopeAngle)),
    ...shape,
  };
}

export function resolveRollingMotionDuration(params: RollingMotionParams) {
  const resolved = resolveRollingMotionParams(params);
  return resolveRollingTravelTime(
    resolveRollingAcceleration(resolved.slopeAngle, resolved.inertiaFactor),
  );
}

export function clampRollingMotionTime(params: RollingMotionParams, time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return 0;
  }

  return Math.min(time, resolveRollingMotionDuration(params));
}

export function sampleRollingMotionState(
  params: RollingMotionParams,
  time: number,
): RollingMotionSnapshot {
  const resolved = resolveRollingMotionParams(params);
  const acceleration = resolveRollingAcceleration(
    resolved.slopeAngle,
    resolved.inertiaFactor,
  );
  const travelTime = resolveRollingTravelTime(acceleration);
  const displayTime = clampRollingMotionTime(resolved, time);
  const distance = collapseNearZero(0.5 * acceleration * displayTime * displayTime);
  const linearSpeed = collapseNearZero(acceleration * displayTime);
  const angularAcceleration = collapseNearZero(acceleration / resolved.radius);
  const angularSpeed = collapseNearZero(linearSpeed / resolved.radius);
  const rotationAngle = collapseNearZero(distance / resolved.radius);
  const potentialEnergyDrop = collapseNearZero(
    resolved.objectMass *
      resolved.gravity *
      distance *
      Math.sin(degToRad(resolved.slopeAngle)),
  );
  const energyTranslationFraction = 1 / (1 + resolved.inertiaFactor);
  const energyRotationFraction = resolved.inertiaFactor / (1 + resolved.inertiaFactor);
  const translationalEnergy = collapseNearZero(
    potentialEnergyDrop * energyTranslationFraction,
  );
  const rotationalEnergy = collapseNearZero(potentialEnergyDrop * energyRotationFraction);
  const staticFriction = collapseNearZero(
    resolved.objectMass * acceleration * resolved.inertiaFactor,
  );
  const torqueFromFriction = collapseNearZero(staticFriction * resolved.radius);

  return {
    ...resolved,
    acceleration,
    angularAcceleration,
    travelTime,
    displayTime,
    distance,
    normalizedProgress: collapseNearZero(distance / resolved.trackLength),
    linearSpeed,
    angularSpeed,
    rotationAngle,
    translationalEnergy,
    rotationalEnergy,
    totalKineticEnergy: collapseNearZero(translationalEnergy + rotationalEnergy),
    potentialEnergyDrop,
    staticFriction,
    torqueFromFriction,
    energyTranslationFraction,
    energyRotationFraction,
  };
}

export function buildRollingMotionSeries(params: RollingMotionParams): GraphSeriesMap {
  const resolved = resolveRollingMotionParams(params);
  const staticSnapshot = sampleRollingMotionState(resolved, 0);
  const travelTime = resolveRollingMotionDuration(resolved);
  const sampleCount = 241;
  const inertiaSamples = sampleRange(
    ROLLING_MOTION_MIN_INERTIA_FACTOR,
    ROLLING_MOTION_MAX_INERTIA_FACTOR,
    181,
  );

  return {
    distance: [
      sampleTimeSeries(
        "distance",
        "s",
        0,
        travelTime,
        sampleCount,
        (time) => sampleRollingMotionState(resolved, time).distance,
        "#4ea6df",
      ),
    ],
    "speed-link": [
      sampleTimeSeries(
        "linear-speed",
        "v_cm",
        0,
        travelTime,
        sampleCount,
        (time) => sampleRollingMotionState(resolved, time).linearSpeed,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "rolling-link",
        "r omega",
        0,
        travelTime,
        sampleCount,
        (time) => {
          const snapshot = sampleRollingMotionState(resolved, time);
          return snapshot.radius * snapshot.angularSpeed;
        },
        "#f16659",
      ),
    ],
    "energy-split": [
      sampleTimeSeries(
        "translational-energy",
        "K_trans",
        0,
        travelTime,
        sampleCount,
        (time) => sampleRollingMotionState(resolved, time).translationalEnergy,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "rotational-energy",
        "K_rot",
        0,
        travelTime,
        sampleCount,
        (time) => sampleRollingMotionState(resolved, time).rotationalEnergy,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "total-kinetic-energy",
        "K_total",
        0,
        travelTime,
        sampleCount,
        (time) => sampleRollingMotionState(resolved, time).totalKineticEnergy,
        "#0f1c24",
      ),
    ],
    "acceleration-map": [
      buildSeries(
        "acceleration-response",
        "a(k)",
        inertiaSamples.map((inertiaFactor) => ({
          x: inertiaFactor,
          y: resolveRollingAcceleration(resolved.slopeAngle, inertiaFactor),
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "current-acceleration",
        "current setup",
        [{ x: resolved.inertiaFactor, y: staticSnapshot.acceleration }],
        "#f16659",
      ),
    ],
  };
}

export function describeRollingMotionState(params: RollingMotionParams, time: number) {
  const snapshot = sampleRollingMotionState(params, time);
  const shapeSummary =
    snapshot.shapeId === "sphere"
      ? "The solid sphere keeps more of the mass close to the axis, so it reaches the bottom quickly while still obeying the same no-slip link."
      : snapshot.shapeId === "cylinder"
        ? "The solid cylinder sits in the middle: some of the downhill pull still builds rotation, but less than the hoop needs."
        : snapshot.shapeId === "hoop"
          ? "The hoop keeps the mass near the rim, so more of the same downhill pull is spent on spin and the center speeds up more gently."
          : "This custom roller lets you slide the mass distribution between center-loaded and rim-loaded limits without changing the same no-slip rule.";

  return `At t = ${formatMeasurement(snapshot.displayTime, "s")}, the ${snapshot.shapeLabel} rolls down a ${formatMeasurement(snapshot.slopeAngle, "deg")} incline with radius ${formatMeasurement(snapshot.radius, "m")}. Rolling without slipping, its center-of-mass acceleration is ${formatMeasurement(snapshot.acceleration, "m/s^2")}, the current speed is ${formatMeasurement(snapshot.linearSpeed, "m/s")}, the angular speed is ${formatMeasurement(snapshot.angularSpeed, "rad/s")}, and the rotation angle is ${formatMeasurement(snapshot.rotationAngle, "rad")}. The kinetic energy split is ${formatMeasurement(snapshot.translationalEnergy, "J")} translational plus ${formatMeasurement(snapshot.rotationalEnergy, "J")} rotational, with static friction ${formatMeasurement(snapshot.staticFriction, "N")} providing the rolling torque. ${shapeSummary}`;
}
