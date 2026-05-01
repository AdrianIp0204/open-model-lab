import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type ConservationMomentumParams = {
  massA?: ControlValue;
  massB?: ControlValue;
  systemVelocity?: ControlValue;
  interactionForce?: ControlValue;
  interactionDuration?: ControlValue;
};

export type ConservationMomentumSnapshot = {
  positionA: number;
  positionB: number;
  velocityA: number;
  velocityB: number;
  finalVelocityA: number;
  finalVelocityB: number;
  massA: number;
  massB: number;
  totalMass: number;
  systemVelocity: number;
  interactionForce: number;
  forceOnA: number;
  forceOnB: number;
  interactionDuration: number;
  interactionStart: number;
  interactionEnd: number;
  interactionElapsed: number;
  interactionWindowActive: boolean;
  interactionActive: boolean;
  momentumA: number;
  momentumB: number;
  totalMomentum: number;
  initialMomentumA: number;
  initialMomentumB: number;
  finalMomentumA: number;
  finalMomentumB: number;
  deltaMomentumA: number;
  deltaMomentumB: number;
  totalImpulseMagnitude: number;
  centerOfMassPosition: number;
  centerOfMassVelocity: number;
};

export type ConservationMomentumExtents = {
  maxAbsForce: number;
  maxAbsMomentum: number;
  maxAbsVelocity: number;
  maxAbsPosition: number;
};

const MIN_MASS = 1;
const MAX_MASS = 4;
const MIN_SYSTEM_VELOCITY = -1;
const MAX_SYSTEM_VELOCITY = 1;
const MIN_INTERACTION_FORCE = -2.4;
const MAX_INTERACTION_FORCE = 2.4;
const MIN_INTERACTION_DURATION = 0.3;
const MAX_INTERACTION_DURATION = 0.8;

const INITIAL_POSITION_A = -1.5;
const INITIAL_POSITION_B = 1.5;

export const CONSERVATION_MOMENTUM_INTERACTION_START = 0.5;
export const CONSERVATION_MOMENTUM_TOTAL_TIME = 2.4;
export const CONSERVATION_MOMENTUM_TRACK_MIN_X = -8;
export const CONSERVATION_MOMENTUM_TRACK_MAX_X = 8;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export function resolveConservationMomentumParams(
  params: ConservationMomentumParams,
) {
  return {
    massA: clamp(safeNumber(params.massA, 1.2), MIN_MASS, MAX_MASS),
    massB: clamp(safeNumber(params.massB, 1.8), MIN_MASS, MAX_MASS),
    systemVelocity: clamp(
      safeNumber(params.systemVelocity, 0),
      MIN_SYSTEM_VELOCITY,
      MAX_SYSTEM_VELOCITY,
    ),
    interactionForce: clamp(
      safeNumber(params.interactionForce, 1.8),
      MIN_INTERACTION_FORCE,
      MAX_INTERACTION_FORCE,
    ),
    interactionDuration: clamp(
      safeNumber(params.interactionDuration, 0.5),
      MIN_INTERACTION_DURATION,
      MAX_INTERACTION_DURATION,
    ),
  };
}

function resolveOneDimensionalPosition(
  initialPosition: number,
  initialVelocity: number,
  acceleration: number,
  interactionStart: number,
  interactionDuration: number,
  time: number,
) {
  const interactionEnd = interactionStart + interactionDuration;

  if (time <= interactionStart) {
    return initialPosition + initialVelocity * time;
  }

  const positionAtStart = initialPosition + initialVelocity * interactionStart;

  if (time <= interactionEnd) {
    const elapsed = time - interactionStart;
    return (
      positionAtStart +
      initialVelocity * elapsed +
      0.5 * acceleration * elapsed * elapsed
    );
  }

  const finalVelocity = initialVelocity + acceleration * interactionDuration;
  const positionAtEnd =
    positionAtStart +
    initialVelocity * interactionDuration +
    0.5 * acceleration * interactionDuration * interactionDuration;

  return positionAtEnd + finalVelocity * (time - interactionEnd);
}

export function sampleConservationMomentumState(
  params: ConservationMomentumParams,
  time: number,
): ConservationMomentumSnapshot {
  const normalized = resolveConservationMomentumParams(params);
  const displayTime = clamp(
    safeNumber(time, 0),
    0,
    CONSERVATION_MOMENTUM_TOTAL_TIME,
  );
  const interactionStart = CONSERVATION_MOMENTUM_INTERACTION_START;
  const interactionDuration = normalized.interactionDuration;
  const interactionEnd = interactionStart + interactionDuration;
  const interactionElapsed = clamp(
    displayTime - interactionStart,
    0,
    interactionDuration,
  );
  const interactionWindowActive =
    displayTime >= interactionStart && displayTime <= interactionEnd;
  const interactionActive =
    interactionWindowActive && Math.abs(normalized.interactionForce) > 1e-6;
  const accelerationA = -normalized.interactionForce / normalized.massA;
  const accelerationB = normalized.interactionForce / normalized.massB;
  const velocityA = normalized.systemVelocity + accelerationA * interactionElapsed;
  const velocityB = normalized.systemVelocity + accelerationB * interactionElapsed;
  const finalVelocityA =
    normalized.systemVelocity + accelerationA * interactionDuration;
  const finalVelocityB =
    normalized.systemVelocity + accelerationB * interactionDuration;
  const initialMomentumA = normalized.massA * normalized.systemVelocity;
  const initialMomentumB = normalized.massB * normalized.systemVelocity;
  const deltaMomentumA = -normalized.interactionForce * interactionElapsed;
  const deltaMomentumB = normalized.interactionForce * interactionElapsed;
  const finalDeltaMomentumA =
    -normalized.interactionForce * interactionDuration;
  const finalDeltaMomentumB =
    normalized.interactionForce * interactionDuration;
  const positionA = resolveOneDimensionalPosition(
    INITIAL_POSITION_A,
    normalized.systemVelocity,
    accelerationA,
    interactionStart,
    interactionDuration,
    displayTime,
  );
  const positionB = resolveOneDimensionalPosition(
    INITIAL_POSITION_B,
    normalized.systemVelocity,
    accelerationB,
    interactionStart,
    interactionDuration,
    displayTime,
  );
  const totalMass = normalized.massA + normalized.massB;
  const totalMomentum = totalMass * normalized.systemVelocity;
  const centerOfMassPosition =
    (normalized.massA * positionA + normalized.massB * positionB) / totalMass;

  return {
    positionA,
    positionB,
    velocityA,
    velocityB,
    finalVelocityA,
    finalVelocityB,
    massA: normalized.massA,
    massB: normalized.massB,
    totalMass,
    systemVelocity: normalized.systemVelocity,
    interactionForce: normalized.interactionForce,
    forceOnA: interactionActive ? -normalized.interactionForce : 0,
    forceOnB: interactionActive ? normalized.interactionForce : 0,
    interactionDuration,
    interactionStart,
    interactionEnd,
    interactionElapsed,
    interactionWindowActive,
    interactionActive,
    momentumA: normalized.massA * velocityA,
    momentumB: normalized.massB * velocityB,
    totalMomentum,
    initialMomentumA,
    initialMomentumB,
    finalMomentumA: initialMomentumA + finalDeltaMomentumA,
    finalMomentumB: initialMomentumB + finalDeltaMomentumB,
    deltaMomentumA,
    deltaMomentumB,
    totalImpulseMagnitude: Math.abs(
      normalized.interactionForce * interactionDuration,
    ),
    centerOfMassPosition,
    centerOfMassVelocity: normalized.systemVelocity,
  };
}

export function resolveConservationMomentumExtents(
  paramsList: ConservationMomentumParams[],
): ConservationMomentumExtents {
  const normalized = paramsList.map(resolveConservationMomentumParams);
  const sampleTimes = sampleRange(0, CONSERVATION_MOMENTUM_TOTAL_TIME, 180);
  const maxAbsForce = Math.max(
    ...normalized.map((params) => Math.abs(params.interactionForce)),
    0.5,
  );
  const maxAbsMomentum = Math.max(
    ...normalized.flatMap((params) => {
      const samples = sampleTimes.map((timeValue) =>
        sampleConservationMomentumState(params, timeValue),
      );

      return samples.flatMap((sample) => [
        Math.abs(sample.momentumA),
        Math.abs(sample.momentumB),
        Math.abs(sample.totalMomentum),
      ]);
    }),
    0.5,
  );
  const maxAbsVelocity = Math.max(
    ...normalized.flatMap((params) => {
      const samples = sampleTimes.map((timeValue) =>
        sampleConservationMomentumState(params, timeValue),
      );

      return samples.flatMap((sample) => [
        Math.abs(sample.velocityA),
        Math.abs(sample.velocityB),
        Math.abs(sample.centerOfMassVelocity),
      ]);
    }),
    0.5,
  );
  const maxAbsPosition = Math.max(
    ...normalized.flatMap((params) =>
      sampleTimes.flatMap((timeValue) => {
        const sample = sampleConservationMomentumState(params, timeValue);
        return [
          Math.abs(sample.positionA),
          Math.abs(sample.positionB),
          Math.abs(sample.centerOfMassPosition),
        ];
      }),
    ),
    1,
  );

  return {
    maxAbsForce,
    maxAbsMomentum,
    maxAbsVelocity,
    maxAbsPosition,
  };
}

export function buildConservationMomentumSeries(
  params: ConservationMomentumParams,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const normalized = resolveConservationMomentumParams(params);
  const samples = 240;

  return {
    forces: [
      sampleTimeSeries(
        "force-a",
        copyText(locale, "Force on A", "A 受到的力"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).forceOnA,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "force-b",
        copyText(locale, "Force on B", "B 受到的力"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).forceOnB,
        "#f16659",
      ),
      sampleTimeSeries(
        "net-external-force",
        copyText(locale, "Net external force", "外力合力"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        () => 0,
        "#0f1c24",
      ),
    ],
    momenta: [
      sampleTimeSeries(
        "momentum-a",
        copyText(locale, "Momentum of A", "A 的動量"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).momentumA,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "momentum-b",
        copyText(locale, "Momentum of B", "B 的動量"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).momentumB,
        "#f16659",
      ),
      sampleTimeSeries(
        "momentum-total",
        copyText(locale, "Total momentum", "總動量"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).totalMomentum,
        "#0f1c24",
      ),
    ],
    velocity: [
      sampleTimeSeries(
        "velocity-a",
        copyText(locale, "Velocity of A", "A 的速度"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).velocityA,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "velocity-b",
        copyText(locale, "Velocity of B", "B 的速度"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).velocityB,
        "#f16659",
      ),
      sampleTimeSeries(
        "velocity-cm",
        copyText(locale, "Center-of-mass velocity", "質心速度"),
        0,
        CONSERVATION_MOMENTUM_TOTAL_TIME,
        samples,
        (time) =>
          sampleConservationMomentumState(normalized, time).centerOfMassVelocity,
        "#4ea6df",
      ),
    ],
  };
}

export function describeConservationMomentumState(
  params: ConservationMomentumParams,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleConservationMomentumState(params, time);
  const motionSummary =
    snapshot.centerOfMassVelocity > 0.04
      ? copyText(locale, "to the right", "向右")
      : snapshot.centerOfMassVelocity < -0.04
        ? copyText(locale, "to the left", "向左")
        : copyText(locale, "with no net drift", "且沒有整體漂移");
  const interactionSummary = snapshot.interactionActive
    ? copyText(
        locale,
        `The carts are exchanging equal and opposite internal forces of ${formatMeasurement(Math.abs(snapshot.forceOnB), "N")}, so their individual momenta are changing while the total stays fixed.`,
        `兩部小車正在交換大小相同、方向相反的內力 ${formatMeasurement(Math.abs(snapshot.forceOnB), "N")}，因此個別動量會改變，但總動量保持不變。`,
      )
    : snapshot.interactionElapsed <= 0
      ? copyText(locale, "Before the interaction starts, both carts move together with the shared system velocity.", "互動開始之前，兩部小車都會以共同的系統速度一起移動。")
      : copyText(locale, "After the interaction ends, the carts keep the redistributed momenta because no external force has acted on the system.", "互動結束之後，由於系統沒有受到外力作用，小車會保持重新分配後的動量。");

  return copyText(
    locale,
    `At t = ${formatMeasurement(
      clamp(safeNumber(time, 0), 0, CONSERVATION_MOMENTUM_TOTAL_TIME),
      "s",
    )}, cart A has ${formatMeasurement(snapshot.momentumA, "kg m/s")} and cart B has ${formatMeasurement(snapshot.momentumB, "kg m/s")}. The total momentum is ${formatMeasurement(snapshot.totalMomentum, "kg m/s")}, and the center of mass continues ${motionSummary} at ${formatMeasurement(snapshot.centerOfMassVelocity, "m/s")}. ${interactionSummary}`,
    `在 t = ${formatMeasurement(
      clamp(safeNumber(time, 0), 0, CONSERVATION_MOMENTUM_TOTAL_TIME),
      "s",
    )} 時，A 車的動量為 ${formatMeasurement(snapshot.momentumA, "kg m/s")}，B 車的動量為 ${formatMeasurement(snapshot.momentumB, "kg m/s")}。總動量是 ${formatMeasurement(snapshot.totalMomentum, "kg m/s")}，而質心會以 ${formatMeasurement(snapshot.centerOfMassVelocity, "m/s")} ${motionSummary}持續前進。${interactionSummary}`,
  );
}
