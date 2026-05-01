import { buildSeries } from "./series";
import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import type { ControlValue, GraphSeries, GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type CollisionsParams = {
  massA?: ControlValue;
  massB?: ControlValue;
  speedA?: ControlValue;
  speedB?: ControlValue;
  elasticity?: ControlValue;
};

export type CollisionsSnapshot = {
  time: number;
  massA: number;
  massB: number;
  speedA: number;
  speedB: number;
  elasticity: number;
  initialVelocityA: number;
  initialVelocityB: number;
  finalVelocityA: number;
  finalVelocityB: number;
  velocityA: number;
  velocityB: number;
  positionA: number;
  positionB: number;
  contactPositionA: number;
  contactPositionB: number;
  collisionTime: number;
  collisionOccurred: boolean;
  collisionHighlightActive: boolean;
  sticking: boolean;
  relativeSpeedBefore: number;
  relativeSpeedAfter: number;
  momentumA: number;
  momentumB: number;
  totalMomentum: number;
  kineticEnergyA: number;
  kineticEnergyB: number;
  totalKineticEnergy: number;
  initialKineticEnergy: number;
  finalKineticEnergy: number;
  energyLoss: number;
  energyRetainedFraction: number;
  centerOfMassPosition: number;
  centerOfMassVelocity: number;
};

export type CollisionsExtents = {
  maxAbsVelocity: number;
  maxAbsMomentum: number;
  maxEnergy: number;
  maxAbsPosition: number;
};

const MIN_MASS = 1;
const MAX_MASS = 4;
const MIN_SPEED_A = 0.8;
const MAX_SPEED_A = 2.2;
const MIN_SPEED_B = 0;
const MAX_SPEED_B = 1.8;
const MIN_ELASTICITY = 0;
const MAX_ELASTICITY = 1;

const INITIAL_POSITION_A = -1.6;
const INITIAL_POSITION_B = 1.6;
const CONTACT_DISTANCE = 0.8;
const COLLISION_HIGHLIGHT_WINDOW = 0.08;

export const COLLISIONS_TOTAL_TIME = 4.5;
export const COLLISIONS_TRACK_MIN_X = -6;
export const COLLISIONS_TRACK_MAX_X = 6;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export function resolveCollisionsParams(params: CollisionsParams) {
  return {
    massA: clamp(safeNumber(params.massA, 1.2), MIN_MASS, MAX_MASS),
    massB: clamp(safeNumber(params.massB, 2.2), MIN_MASS, MAX_MASS),
    speedA: clamp(safeNumber(params.speedA, 1.6), MIN_SPEED_A, MAX_SPEED_A),
    speedB: clamp(safeNumber(params.speedB, 0.7), MIN_SPEED_B, MAX_SPEED_B),
    elasticity: clamp(
      safeNumber(params.elasticity, 0.8),
      MIN_ELASTICITY,
      MAX_ELASTICITY,
    ),
  };
}

function resolveCollisionKinematics(params: ReturnType<typeof resolveCollisionsParams>) {
  const initialVelocityA = params.speedA;
  const initialVelocityB = -params.speedB;
  const relativeSpeedBefore = initialVelocityA - initialVelocityB;
  const collisionTime =
    (INITIAL_POSITION_B - INITIAL_POSITION_A - CONTACT_DISTANCE) /
    Math.max(relativeSpeedBefore, 0.001);
  const contactPositionA = INITIAL_POSITION_A + initialVelocityA * collisionTime;
  const contactPositionB = INITIAL_POSITION_B + initialVelocityB * collisionTime;
  const totalMomentum = params.massA * initialVelocityA + params.massB * initialVelocityB;
  const finalVelocityA =
    (totalMomentum - params.massB * params.elasticity * relativeSpeedBefore) /
    (params.massA + params.massB);
  const finalVelocityB =
    (totalMomentum + params.massA * params.elasticity * relativeSpeedBefore) /
    (params.massA + params.massB);

  return {
    initialVelocityA,
    initialVelocityB,
    collisionTime,
    contactPositionA,
    contactPositionB,
    finalVelocityA,
    finalVelocityB,
    totalMomentum,
    relativeSpeedBefore,
    relativeSpeedAfter: finalVelocityB - finalVelocityA,
  };
}

export function sampleCollisionsState(
  params: CollisionsParams,
  time: number,
): CollisionsSnapshot {
  const normalized = resolveCollisionsParams(params);
  const displayTime = clamp(safeNumber(time, 0), 0, COLLISIONS_TOTAL_TIME);
  const resolved = resolveCollisionKinematics(normalized);
  const sticking = normalized.elasticity <= 1e-3;
  const collisionOccurred = displayTime >= resolved.collisionTime;
  const elapsedAfterCollision = Math.max(0, displayTime - resolved.collisionTime);
  const velocityA = collisionOccurred
    ? resolved.finalVelocityA
    : resolved.initialVelocityA;
  const velocityB = collisionOccurred
    ? resolved.finalVelocityB
    : resolved.initialVelocityB;
  const positionA = collisionOccurred
    ? resolved.contactPositionA + resolved.finalVelocityA * elapsedAfterCollision
    : INITIAL_POSITION_A + resolved.initialVelocityA * displayTime;
  const positionB = collisionOccurred
    ? resolved.contactPositionB + resolved.finalVelocityB * elapsedAfterCollision
    : INITIAL_POSITION_B + resolved.initialVelocityB * displayTime;
  const momentumA = normalized.massA * velocityA;
  const momentumB = normalized.massB * velocityB;
  const kineticEnergyA = 0.5 * normalized.massA * velocityA * velocityA;
  const kineticEnergyB = 0.5 * normalized.massB * velocityB * velocityB;
  const totalKineticEnergy = kineticEnergyA + kineticEnergyB;
  const initialKineticEnergy =
    0.5 * normalized.massA * resolved.initialVelocityA * resolved.initialVelocityA +
    0.5 * normalized.massB * resolved.initialVelocityB * resolved.initialVelocityB;
  const finalKineticEnergy =
    0.5 * normalized.massA * resolved.finalVelocityA * resolved.finalVelocityA +
    0.5 * normalized.massB * resolved.finalVelocityB * resolved.finalVelocityB;
  const energyLoss = initialKineticEnergy - finalKineticEnergy;
  const centerOfMassPosition =
    (normalized.massA * positionA + normalized.massB * positionB) /
    (normalized.massA + normalized.massB);

  return {
    time: displayTime,
    massA: normalized.massA,
    massB: normalized.massB,
    speedA: normalized.speedA,
    speedB: normalized.speedB,
    elasticity: normalized.elasticity,
    initialVelocityA: resolved.initialVelocityA,
    initialVelocityB: resolved.initialVelocityB,
    finalVelocityA: resolved.finalVelocityA,
    finalVelocityB: resolved.finalVelocityB,
    velocityA,
    velocityB,
    positionA,
    positionB,
    contactPositionA: resolved.contactPositionA,
    contactPositionB: resolved.contactPositionB,
    collisionTime: resolved.collisionTime,
    collisionOccurred,
    collisionHighlightActive:
      Math.abs(displayTime - resolved.collisionTime) <= COLLISION_HIGHLIGHT_WINDOW,
    sticking,
    relativeSpeedBefore: resolved.relativeSpeedBefore,
    relativeSpeedAfter: resolved.relativeSpeedAfter,
    momentumA,
    momentumB,
    totalMomentum: resolved.totalMomentum,
    kineticEnergyA,
    kineticEnergyB,
    totalKineticEnergy,
    initialKineticEnergy,
    finalKineticEnergy,
    energyLoss,
    energyRetainedFraction:
      initialKineticEnergy > 1e-6 ? finalKineticEnergy / initialKineticEnergy : 1,
    centerOfMassPosition,
    centerOfMassVelocity: resolved.totalMomentum / (normalized.massA + normalized.massB),
  };
}

function buildCollisionTimeSamples(collisionTime: number, samples = 240) {
  const epsilon = 0.015;
  return Array.from(
    new Set(
      [
        ...sampleRange(0, COLLISIONS_TOTAL_TIME, samples),
        Math.max(0, collisionTime - epsilon),
        collisionTime,
        Math.min(COLLISIONS_TOTAL_TIME, collisionTime + epsilon),
      ].map((value) => Number(value.toFixed(6))),
    ),
  ).sort((left, right) => left - right);
}

function buildCollisionSeries(
  id: string,
  label: string,
  params: ReturnType<typeof resolveCollisionsParams>,
  sample: (snapshot: CollisionsSnapshot) => number,
  color: string,
) {
  const { collisionTime } = resolveCollisionKinematics(params);
  const times = buildCollisionTimeSamples(collisionTime);

  return buildSeries(
    id,
    label,
    times.map((timeValue) => {
      const snapshot = sampleCollisionsState(params, timeValue);
      return { x: timeValue, y: sample(snapshot) };
    }),
    color,
  );
}

export function buildCollisionsSeries(
  params: CollisionsParams,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const normalized = resolveCollisionsParams(params);

  return {
    velocity: [
      buildCollisionSeries(
        "velocity-a",
        copyText(locale, "Velocity of A", "A 的速度"),
        normalized,
        (snapshot) => snapshot.velocityA,
        "#1ea6a2",
      ),
      buildCollisionSeries(
        "velocity-b",
        copyText(locale, "Velocity of B", "B 的速度"),
        normalized,
        (snapshot) => snapshot.velocityB,
        "#f16659",
      ),
      buildCollisionSeries(
        "velocity-cm",
        copyText(locale, "Center-of-mass velocity", "質心速度"),
        normalized,
        (snapshot) => snapshot.centerOfMassVelocity,
        "#4ea6df",
      ),
    ],
    momentum: [
      buildCollisionSeries(
        "momentum-a",
        copyText(locale, "Momentum of A", "A 的動量"),
        normalized,
        (snapshot) => snapshot.momentumA,
        "#1ea6a2",
      ),
      buildCollisionSeries(
        "momentum-b",
        copyText(locale, "Momentum of B", "B 的動量"),
        normalized,
        (snapshot) => snapshot.momentumB,
        "#f16659",
      ),
      buildCollisionSeries(
        "momentum-total",
        copyText(locale, "Total momentum", "總動量"),
        normalized,
        (snapshot) => snapshot.totalMomentum,
        "#0f1c24",
      ),
    ],
    energy: [
      buildCollisionSeries(
        "energy-a",
        copyText(locale, "Kinetic energy of A", "A 的動能"),
        normalized,
        (snapshot) => snapshot.kineticEnergyA,
        "#1ea6a2",
      ),
      buildCollisionSeries(
        "energy-b",
        copyText(locale, "Kinetic energy of B", "B 的動能"),
        normalized,
        (snapshot) => snapshot.kineticEnergyB,
        "#f16659",
      ),
      buildCollisionSeries(
        "energy-total",
        copyText(locale, "Total kinetic energy", "總動能"),
        normalized,
        (snapshot) => snapshot.totalKineticEnergy,
        "#f0ab3c",
      ),
    ],
  };
}

export function resolveCollisionsExtents(
  paramsList: CollisionsParams[],
): CollisionsExtents {
  const normalized = paramsList.map(resolveCollisionsParams);
  const sampleTimes = sampleRange(0, COLLISIONS_TOTAL_TIME, 220);
  const maxAbsVelocity = Math.max(
    ...normalized.flatMap((params) => {
      const snapshot = sampleCollisionsState(params, COLLISIONS_TOTAL_TIME);
      return [
        Math.abs(snapshot.initialVelocityA),
        Math.abs(snapshot.initialVelocityB),
        Math.abs(snapshot.finalVelocityA),
        Math.abs(snapshot.finalVelocityB),
        Math.abs(snapshot.centerOfMassVelocity),
      ];
    }),
    0.5,
  );
  const maxAbsMomentum = Math.max(
    ...normalized.flatMap((params) => {
      const snapshot = sampleCollisionsState(params, COLLISIONS_TOTAL_TIME);
      return [
        Math.abs(snapshot.momentumA),
        Math.abs(snapshot.momentumB),
        Math.abs(snapshot.totalMomentum),
        Math.abs(snapshot.massA * snapshot.initialVelocityA),
        Math.abs(snapshot.massB * snapshot.initialVelocityB),
      ];
    }),
    0.5,
  );
  const maxEnergy = Math.max(
    ...normalized.flatMap((params) => {
      const snapshot = sampleCollisionsState(params, COLLISIONS_TOTAL_TIME);
      return [
        snapshot.initialKineticEnergy,
        snapshot.finalKineticEnergy,
        snapshot.totalKineticEnergy,
      ];
    }),
    0.5,
  );
  const maxAbsPosition = Math.max(
    ...normalized.flatMap((params) =>
      sampleTimes.flatMap((timeValue) => {
        const snapshot = sampleCollisionsState(params, timeValue);
        return [
          Math.abs(snapshot.positionA),
          Math.abs(snapshot.positionB),
          Math.abs(snapshot.centerOfMassPosition),
        ];
      }),
    ),
    1,
  );

  return {
    maxAbsVelocity,
    maxAbsMomentum,
    maxEnergy,
    maxAbsPosition,
  };
}

function describeCollisionPhase(snapshot: CollisionsSnapshot, locale: AppLocale) {
  if (!snapshot.collisionOccurred) {
    return copyText(
      locale,
      `Before contact, cart A approaches at ${formatMeasurement(snapshot.initialVelocityA, "m/s")} while cart B approaches at ${formatMeasurement(snapshot.initialVelocityB, "m/s")}.`,
      `接觸之前，A 車以 ${formatMeasurement(snapshot.initialVelocityA, "m/s")} 接近，而 B 車以 ${formatMeasurement(snapshot.initialVelocityB, "m/s")} 接近。`,
    );
  }

  if (snapshot.sticking) {
    return copyText(
      locale,
      `After a perfectly inelastic collision, the carts move together at ${formatMeasurement(snapshot.finalVelocityA, "m/s")} while total momentum stays conserved.`,
      `完全非彈性碰撞後，兩部小車會以 ${formatMeasurement(snapshot.finalVelocityA, "m/s")} 一起移動，而總動量仍然守恆。`,
    );
  }

  if (snapshot.elasticity >= 0.95) {
    return copyText(
      locale,
      `After an almost elastic collision, the carts separate with ${formatMeasurement(snapshot.relativeSpeedAfter, "m/s")} of rebound speed and the total kinetic energy stays nearly unchanged.`,
      `接近完全彈性的碰撞後，兩部小車會以 ${formatMeasurement(snapshot.relativeSpeedAfter, "m/s")} 的分離速度彈開，而總動能幾乎維持不變。`,
    );
  }

  return copyText(
    locale,
    `After an inelastic collision, the carts still conserve total momentum but only ${formatMeasurement(snapshot.relativeSpeedAfter, "m/s")} of separation speed comes back from ${formatMeasurement(snapshot.relativeSpeedBefore, "m/s")} of closing speed.`,
    `非彈性碰撞後，小車仍然守恆總動量，但 ${formatMeasurement(snapshot.relativeSpeedBefore, "m/s")} 的接近速度只會回來 ${formatMeasurement(snapshot.relativeSpeedAfter, "m/s")} 的分離速度。`,
  );
}

export function describeCollisionsState(
  params: CollisionsParams,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleCollisionsState(params, time);

  return copyText(
    locale,
    `At t = ${formatMeasurement(snapshot.time, "s")}, cart A has ${formatMeasurement(snapshot.momentumA, "kg m/s")} and cart B has ${formatMeasurement(snapshot.momentumB, "kg m/s")}. The total momentum is ${formatMeasurement(snapshot.totalMomentum, "kg m/s")} while the total kinetic energy is ${formatMeasurement(snapshot.totalKineticEnergy, "J")}. ${describeCollisionPhase(snapshot, locale)}`,
    `在 t = ${formatMeasurement(snapshot.time, "s")} 時，A 車的動量為 ${formatMeasurement(snapshot.momentumA, "kg m/s")}，B 車的動量為 ${formatMeasurement(snapshot.momentumB, "kg m/s")}。總動量是 ${formatMeasurement(snapshot.totalMomentum, "kg m/s")}，而總動能是 ${formatMeasurement(snapshot.totalKineticEnergy, "J")}。${describeCollisionPhase(snapshot, locale)}`,
  );
}

export function getCollisionSeriesDuration(series: GraphSeries[] | undefined) {
  const lastPoint = series?.[0]?.points.at(-1);
  return lastPoint?.x ?? COLLISIONS_TOTAL_TIME;
}
