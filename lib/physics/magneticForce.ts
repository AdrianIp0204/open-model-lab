import { TAU, clamp, degToRad, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type MagneticForceParams = {
  fieldStrength?: number;
  speed?: number;
  directionAngle?: number;
  negativeCharge?: boolean;
  current?: number;
};

export type MagneticForcePathPoint = {
  time: number;
  x: number;
  y: number;
};

export type MagneticForceSnapshot = {
  fieldStrength: number;
  fieldOrientation: "out of the page" | "into the page" | "zero";
  speed: number;
  directionAngle: number;
  directionRadians: number;
  negativeCharge: boolean;
  chargeSign: -1 | 1;
  chargeLabel: "positive" | "negative";
  current: number;
  duration: number;
  time: number;
  angularRate: number;
  radius: number | null;
  period: number | null;
  curvatureSense: "clockwise" | "counterclockwise" | "straight";
  positionX: number;
  positionY: number;
  velocityX: number;
  velocityY: number;
  chargeForceX: number;
  chargeForceY: number;
  chargeForceMagnitude: number;
  wireForceX: number;
  wireForceY: number;
  wireForceMagnitude: number;
  orbitCenterX: number | null;
  orbitCenterY: number | null;
  chargeMatchesWireDirection: boolean;
};

export type MagneticForceViewport = {
  extent: number;
  maxDuration: number;
};

export const MAGNETIC_FORCE_MIN_FIELD = -2.4;
export const MAGNETIC_FORCE_MAX_FIELD = 2.4;
export const MAGNETIC_FORCE_MIN_SPEED = 1;
export const MAGNETIC_FORCE_MAX_SPEED = 7;
export const MAGNETIC_FORCE_MIN_DIRECTION = -180;
export const MAGNETIC_FORCE_MAX_DIRECTION = 180;
export const MAGNETIC_FORCE_MIN_CURRENT = 0;
export const MAGNETIC_FORCE_MAX_CURRENT = 4;
export const MAGNETIC_FORCE_DEFAULT_DURATION = 3.2;
export const MAGNETIC_FORCE_MIN_DURATION = 1.6;
export const MAGNETIC_FORCE_MAX_DURATION = 4.2;

const MAGNETIC_FORCE_GRAPH_SAMPLES = 220;
const VIEWPORT_BUCKETS = [2.5, 3.5, 5, 6.5, 8, 10, 12, 16, 20];

function pickBucket(value: number) {
  const safeValue = Math.max(0, value);
  return VIEWPORT_BUCKETS.find((bucket) => safeValue <= bucket) ?? safeValue;
}

function resolveFieldStrength(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    MAGNETIC_FORCE_MIN_FIELD,
    MAGNETIC_FORCE_MAX_FIELD,
  );
}

function resolveDirectionAngle(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    MAGNETIC_FORCE_MIN_DIRECTION,
    MAGNETIC_FORCE_MAX_DIRECTION,
  );
}

function resolveSpeed(value: unknown, fallback: number) {
  return clamp(safeNumber(value, fallback), MAGNETIC_FORCE_MIN_SPEED, MAGNETIC_FORCE_MAX_SPEED);
}

function resolveCurrent(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    MAGNETIC_FORCE_MIN_CURRENT,
    MAGNETIC_FORCE_MAX_CURRENT,
  );
}

function resolveFieldOrientation(
  fieldStrength: number,
): MagneticForceSnapshot["fieldOrientation"] {
  if (Math.abs(fieldStrength) <= 0.02) {
    return "zero";
  }

  return fieldStrength > 0 ? "out of the page" : "into the page";
}

function describeVectorDirection(x: number, y: number) {
  const threshold = 0.08;
  const horizontal =
    Math.abs(x) <= threshold ? "" : x > 0 ? "right" : "left";
  const vertical = Math.abs(y) <= threshold ? "" : y > 0 ? "up" : "down";

  if (horizontal && vertical) {
    return `${vertical}-${horizontal}`;
  }

  return horizontal || vertical || "neutral";
}

function sampleLinearPosition(speed: number, angle: number, time: number) {
  return {
    x: speed * Math.cos(angle) * time,
    y: speed * Math.sin(angle) * time,
  };
}

export function resolveMagneticForceParams(
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
): Required<MagneticForceParams> {
  return {
    fieldStrength: resolveFieldStrength(source.fieldStrength, 1.6),
    speed: resolveSpeed(source.speed, 4.5),
    directionAngle: resolveDirectionAngle(source.directionAngle, 0),
    negativeCharge: source.negativeCharge === true,
    current: resolveCurrent(source.current, 2),
  };
}

export function resolveMagneticForceDuration(
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
) {
  const resolved = resolveMagneticForceParams(source);
  const fieldMagnitude = Math.abs(resolved.fieldStrength);

  if (fieldMagnitude <= 0.08) {
    return MAGNETIC_FORCE_DEFAULT_DURATION;
  }

  const period = TAU / fieldMagnitude;
  return clamp(period * 0.55, MAGNETIC_FORCE_MIN_DURATION, MAGNETIC_FORCE_MAX_DURATION);
}

export function clampMagneticForceTime(
  time: number,
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
) {
  const maxTime = resolveMagneticForceDuration(source);

  if (!Number.isFinite(time) || time <= 0) {
    return 0;
  }

  return Math.min(time, maxTime);
}

export function sampleMagneticForceState(
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
  time: number,
): MagneticForceSnapshot {
  const resolved = resolveMagneticForceParams(source);
  const duration = resolveMagneticForceDuration(resolved);
  const displayTime = clampMagneticForceTime(time, resolved);
  const directionRadians = degToRad(resolved.directionAngle);
  const chargeSign = resolved.negativeCharge ? -1 : 1;
  const angularRate = chargeSign * resolved.fieldStrength;
  const fieldMagnitude = Math.abs(resolved.fieldStrength);
  const currentVelocityX = resolved.speed * Math.cos(directionRadians - angularRate * displayTime);
  const currentVelocityY = resolved.speed * Math.sin(directionRadians - angularRate * displayTime);
  const wireForceX = resolved.current * resolved.fieldStrength * Math.sin(directionRadians);
  const wireForceY = -resolved.current * resolved.fieldStrength * Math.cos(directionRadians);
  const wireForceMagnitude = Math.hypot(wireForceX, wireForceY);

  if (fieldMagnitude <= 1e-4) {
    const linearPosition = sampleLinearPosition(resolved.speed, directionRadians, displayTime);

    return {
      fieldStrength: resolved.fieldStrength,
      fieldOrientation: resolveFieldOrientation(resolved.fieldStrength),
      speed: resolved.speed,
      directionAngle: resolved.directionAngle,
      directionRadians,
      negativeCharge: resolved.negativeCharge,
      chargeSign,
      chargeLabel: resolved.negativeCharge ? "negative" : "positive",
      current: resolved.current,
      duration,
      time: displayTime,
      angularRate,
      radius: null,
      period: null,
      curvatureSense: "straight",
      positionX: linearPosition.x,
      positionY: linearPosition.y,
      velocityX: currentVelocityX,
      velocityY: currentVelocityY,
      chargeForceX: 0,
      chargeForceY: 0,
      chargeForceMagnitude: 0,
      wireForceX,
      wireForceY,
      wireForceMagnitude,
      orbitCenterX: null,
      orbitCenterY: null,
      chargeMatchesWireDirection: true,
    };
  }

  const rotatedAngle = directionRadians - angularRate * displayTime;
  const positionX =
    (resolved.speed / angularRate) *
    (Math.sin(directionRadians) - Math.sin(rotatedAngle));
  const positionY =
    (resolved.speed / angularRate) *
    (Math.cos(rotatedAngle) - Math.cos(directionRadians));
  const chargeForceX = angularRate * currentVelocityY;
  const chargeForceY = -angularRate * currentVelocityX;
  const chargeForceMagnitude = Math.hypot(chargeForceX, chargeForceY);
  const radius = resolved.speed / fieldMagnitude;
  const period = TAU / fieldMagnitude;
  const orbitCenterX = (resolved.speed / angularRate) * Math.sin(directionRadians);
  const orbitCenterY = -(resolved.speed / angularRate) * Math.cos(directionRadians);

  return {
    fieldStrength: resolved.fieldStrength,
    fieldOrientation: resolveFieldOrientation(resolved.fieldStrength),
    speed: resolved.speed,
    directionAngle: resolved.directionAngle,
    directionRadians,
    negativeCharge: resolved.negativeCharge,
    chargeSign,
    chargeLabel: resolved.negativeCharge ? "negative" : "positive",
    current: resolved.current,
    duration,
    time: displayTime,
    angularRate,
    radius,
    period,
    curvatureSense: angularRate > 0 ? "clockwise" : "counterclockwise",
    positionX,
    positionY,
    velocityX: currentVelocityX,
    velocityY: currentVelocityY,
    chargeForceX,
    chargeForceY,
    chargeForceMagnitude,
    wireForceX,
    wireForceY,
    wireForceMagnitude,
    orbitCenterX,
    orbitCenterY,
    chargeMatchesWireDirection: !resolved.negativeCharge,
  };
}

export function sampleMagneticForcePath(
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
  pointCount = 161,
) {
  const resolved = resolveMagneticForceParams(source);
  const duration = resolveMagneticForceDuration(resolved);

  return sampleRange(0, duration, pointCount).map((timePoint) => {
    const snapshot = sampleMagneticForceState(resolved, timePoint);

    return {
      time: snapshot.time,
      x: snapshot.positionX,
      y: snapshot.positionY,
    } satisfies MagneticForcePathPoint;
  });
}

export function resolveMagneticForceViewport(
  sources: Array<Partial<MagneticForceParams> | Record<string, number | boolean | string>>,
): MagneticForceViewport {
  const viewportSources = sources.length ? sources : [{}];
  const maxDuration = Math.max(
    ...viewportSources.map((source) => resolveMagneticForceDuration(source)),
    MAGNETIC_FORCE_DEFAULT_DURATION,
  );
  let maxAbs = 2.4;

  for (const source of viewportSources) {
    const path = sampleMagneticForcePath(source, 121);
    const resolved = resolveMagneticForceParams(source);
    const centerSnapshot = sampleMagneticForceState(resolved, 0);

    for (const point of path) {
      maxAbs = Math.max(maxAbs, Math.abs(point.x), Math.abs(point.y));
    }

    if (centerSnapshot.orbitCenterX !== null && centerSnapshot.orbitCenterY !== null) {
      maxAbs = Math.max(
        maxAbs,
        Math.abs(centerSnapshot.orbitCenterX),
        Math.abs(centerSnapshot.orbitCenterY),
      );
    }
  }

  return {
    extent: pickBucket(maxAbs * 1.18),
    maxDuration,
  };
}

export function buildMagneticForceSeries(
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveMagneticForceParams(source);
  const duration = resolveMagneticForceDuration(resolved);

  return {
    position: [
      sampleTimeSeries(
        "charge-x",
        "Charge x",
        0,
        duration,
        MAGNETIC_FORCE_GRAPH_SAMPLES,
        (time) => sampleMagneticForceState(resolved, time).positionX,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "charge-y",
        "Charge y",
        0,
        duration,
        MAGNETIC_FORCE_GRAPH_SAMPLES,
        (time) => sampleMagneticForceState(resolved, time).positionY,
        "#f16659",
      ),
    ],
    force: [
      sampleTimeSeries(
        "charge-force-x",
        "F_q,x",
        0,
        duration,
        MAGNETIC_FORCE_GRAPH_SAMPLES,
        (time) => sampleMagneticForceState(resolved, time).chargeForceX,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "charge-force-y",
        "F_q,y",
        0,
        duration,
        MAGNETIC_FORCE_GRAPH_SAMPLES,
        (time) => sampleMagneticForceState(resolved, time).chargeForceY,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "charge-force-magnitude",
        "|F_q|",
        0,
        duration,
        MAGNETIC_FORCE_GRAPH_SAMPLES,
        (time) => sampleMagneticForceState(resolved, time).chargeForceMagnitude,
        "#0f1c24",
      ),
    ],
  };
}

export function describeMagneticForceState(
  source: Partial<MagneticForceParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleMagneticForceState(source, time);
  const chargeForceDirection = describeVectorDirection(
    snapshot.chargeForceX,
    snapshot.chargeForceY,
  );
  const wireForceDirection = describeVectorDirection(snapshot.wireForceX, snapshot.wireForceY);
  const fieldText =
    snapshot.fieldOrientation === "zero"
      ? "zero field"
      : `${formatMeasurement(Math.abs(snapshot.fieldStrength), "T")} ${snapshot.fieldOrientation}`;
  const radiusText =
    snapshot.radius === null
      ? "so the motion stays straight."
      : `with a radius of about ${formatMeasurement(snapshot.radius, "m")}.`;
  const relationText =
    snapshot.fieldOrientation === "zero"
      ? "Zero field means neither the charge nor the wire segment feels a magnetic force."
      : snapshot.negativeCharge
        ? "The negative charge flips the moving-charge force, but the current-carrying segment still follows I L x B."
        : "The positive charge and same-direction current segment point to the same force side in this uniform field.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, a ${snapshot.chargeLabel} charge moving at ${formatMeasurement(snapshot.speed, "m/s")} in ${fieldText} has F_q = (${formatNumber(snapshot.chargeForceX)}, ${formatNumber(snapshot.chargeForceY)}), so the charge force points ${chargeForceDirection} ${radiusText} The matching wire segment force points ${wireForceDirection} with magnitude ${formatNumber(snapshot.wireForceMagnitude)}. ${relationText}`;
}
