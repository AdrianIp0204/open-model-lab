import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type MomentumImpulseParams = {
  mass?: ControlValue;
  initialVelocity?: ControlValue;
  force?: ControlValue;
  pulseDuration?: ControlValue;
};

export type MomentumImpulseSnapshot = {
  position: number;
  velocity: number;
  mass: number;
  force: number;
  currentForce: number;
  pulseDuration: number;
  pulseStart: number;
  pulseEnd: number;
  pulseElapsed: number;
  pulseWindowActive: boolean;
  forceActive: boolean;
  acceleration: number;
  momentum: number;
  initialMomentum: number;
  finalMomentum: number;
  impulse: number;
  totalImpulse: number;
  deltaMomentum: number;
  finalVelocity: number;
};

export type MomentumImpulseExtents = {
  maxAbsForce: number;
  maxAbsImpulse: number;
  maxAbsMomentum: number;
  maxAbsPosition: number;
};

const MIN_MASS = 1;
const MAX_MASS = 4;
const MIN_INITIAL_VELOCITY = -1.5;
const MAX_INITIAL_VELOCITY = 1.5;
const MIN_FORCE = -3;
const MAX_FORCE = 3;
const MIN_PULSE_DURATION = 0.2;
const MAX_PULSE_DURATION = 1;

export const MOMENTUM_IMPULSE_PULSE_START = 0.5;
export const MOMENTUM_IMPULSE_TOTAL_TIME = 2.5;
export const MOMENTUM_IMPULSE_TRACK_MIN_X = -9;
export const MOMENTUM_IMPULSE_TRACK_MAX_X = 9;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export function resolveMomentumImpulseParams(params: MomentumImpulseParams) {
  return {
    mass: clamp(safeNumber(params.mass, 1.5), MIN_MASS, MAX_MASS),
    initialVelocity: clamp(
      safeNumber(params.initialVelocity, 0.5),
      MIN_INITIAL_VELOCITY,
      MAX_INITIAL_VELOCITY,
    ),
    force: clamp(safeNumber(params.force, 3), MIN_FORCE, MAX_FORCE),
    pulseDuration: clamp(
      safeNumber(params.pulseDuration, 0.4),
      MIN_PULSE_DURATION,
      MAX_PULSE_DURATION,
    ),
  };
}

export function sampleMomentumImpulseState(
  params: MomentumImpulseParams,
  time: number,
): MomentumImpulseSnapshot {
  const normalized = resolveMomentumImpulseParams(params);
  const displayTime = clamp(safeNumber(time, 0), 0, MOMENTUM_IMPULSE_TOTAL_TIME);
  const pulseStart = MOMENTUM_IMPULSE_PULSE_START;
  const pulseDuration = normalized.pulseDuration;
  const pulseEnd = pulseStart + pulseDuration;
  const pulseElapsed = clamp(displayTime - pulseStart, 0, pulseDuration);
  const pulseWindowActive = displayTime >= pulseStart && displayTime <= pulseEnd;
  const forceActive = pulseWindowActive && Math.abs(normalized.force) > 1e-6;
  const acceleration = normalized.force / normalized.mass;
  const initialMomentum = normalized.mass * normalized.initialVelocity;
  const totalImpulse = normalized.force * pulseDuration;
  const impulse = normalized.force * pulseElapsed;
  const deltaMomentum = impulse;
  const finalVelocity = normalized.initialVelocity + acceleration * pulseDuration;
  const finalMomentum = initialMomentum + totalImpulse;
  const currentVelocity = normalized.initialVelocity + acceleration * pulseElapsed;
  const timeBeforePulse = Math.min(displayTime, pulseStart);
  const positionAtPulseStart = normalized.initialVelocity * pulseStart;

  let position = normalized.initialVelocity * timeBeforePulse;

  if (displayTime > pulseStart) {
    if (displayTime <= pulseEnd) {
      position =
        positionAtPulseStart +
        normalized.initialVelocity * pulseElapsed +
        0.5 * acceleration * pulseElapsed * pulseElapsed;
    } else {
      const postPulseTime = displayTime - pulseEnd;
      const positionAtPulseEnd =
        positionAtPulseStart +
        normalized.initialVelocity * pulseDuration +
        0.5 * acceleration * pulseDuration * pulseDuration;
      position = positionAtPulseEnd + finalVelocity * postPulseTime;
    }
  }

  return {
    position,
    velocity: currentVelocity,
    mass: normalized.mass,
    force: normalized.force,
    currentForce: forceActive ? normalized.force : 0,
    pulseDuration,
    pulseStart,
    pulseEnd,
    pulseElapsed,
    pulseWindowActive,
    forceActive,
    acceleration,
    momentum: normalized.mass * currentVelocity,
    initialMomentum,
    finalMomentum,
    impulse,
    totalImpulse,
    deltaMomentum,
    finalVelocity,
  };
}

export function resolveMomentumImpulseExtents(
  paramsList: MomentumImpulseParams[],
): MomentumImpulseExtents {
  const normalized = paramsList.map(resolveMomentumImpulseParams);
  const sampleTimes = sampleRange(0, MOMENTUM_IMPULSE_TOTAL_TIME, 180);
  const maxAbsForce = Math.max(...normalized.map((params) => Math.abs(params.force)), 0.5);
  const maxAbsImpulse = Math.max(
    ...normalized.map((params) => Math.abs(params.force * params.pulseDuration)),
    0.5,
  );
  const maxAbsMomentum = Math.max(
    ...normalized.flatMap((params) => {
      const initialMomentum = params.mass * params.initialVelocity;
      const finalMomentum = initialMomentum + params.force * params.pulseDuration;
      return [Math.abs(initialMomentum), Math.abs(finalMomentum)];
    }),
    0.5,
  );
  const maxAbsPosition = Math.max(
    ...normalized.flatMap((params) =>
      sampleTimes.map((timeValue) => Math.abs(sampleMomentumImpulseState(params, timeValue).position)),
    ),
    1,
  );

  return {
    maxAbsForce,
    maxAbsImpulse,
    maxAbsMomentum,
    maxAbsPosition,
  };
}

export function buildMomentumImpulseSeries(
  params: MomentumImpulseParams,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const normalized = resolveMomentumImpulseParams(params);
  const samples = 240;

  return {
    force: [
      sampleTimeSeries(
        "force",
        copyText(locale, "Applied force", "施加力"),
        0,
        MOMENTUM_IMPULSE_TOTAL_TIME,
        samples,
        (time) => sampleMomentumImpulseState(normalized, time).currentForce,
        "#f16659",
      ),
    ],
    momentum: [
      sampleTimeSeries(
        "momentum",
        copyText(locale, "Momentum", "動量"),
        0,
        MOMENTUM_IMPULSE_TOTAL_TIME,
        samples,
        (time) => sampleMomentumImpulseState(normalized, time).momentum,
        "#1ea6a2",
      ),
    ],
    impulse: [
      sampleTimeSeries(
        "impulse",
        copyText(locale, "Accumulated impulse", "累積衝量"),
        0,
        MOMENTUM_IMPULSE_TOTAL_TIME,
        samples,
        (time) => sampleMomentumImpulseState(normalized, time).impulse,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "delta-momentum",
        copyText(locale, "Change in momentum", "動量變化"),
        0,
        MOMENTUM_IMPULSE_TOTAL_TIME,
        samples,
        (time) => sampleMomentumImpulseState(normalized, time).deltaMomentum,
        "#4ea6df",
      ),
    ],
  };
}

export function describeMomentumImpulseState(
  params: MomentumImpulseParams,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleMomentumImpulseState(params, time);
  const motionDirection =
    snapshot.velocity > 0.04
      ? copyText(locale, "to the right", "向右")
      : snapshot.velocity < -0.04
        ? copyText(locale, "to the left", "向左")
        : copyText(locale, "almost not moving", "幾乎沒有移動");
  const forceSummary = snapshot.forceActive
    ? copyText(
        locale,
        `The pulse is active with ${formatMeasurement(snapshot.currentForce, "N")}, so the cart is changing momentum at ${formatMeasurement(snapshot.acceleration, "m/s^2")}.`,
        `脈衝目前作用中，大小為 ${formatMeasurement(snapshot.currentForce, "N")}，因此小車正以 ${formatMeasurement(snapshot.acceleration, "m/s^2")} 改變動量。`,
      )
    : displayTimeBeforePulse(snapshot)
      ? copyText(locale, "The pulse has not started yet, so momentum still matches the initial value.", "脈衝尚未開始，因此動量仍然和初始值相同。")
      : copyText(locale, "The pulse is over, so the cart keeps the new momentum unless another force acts.", "脈衝已經結束，因此除非再有其他力作用，小車會保持新的動量。");

  return copyText(
    locale,
    `At t = ${formatMeasurement(
      clamp(safeNumber(time, 0), 0, MOMENTUM_IMPULSE_TOTAL_TIME),
      "s",
    )}, the ${formatMeasurement(snapshot.mass, "kg")} cart is moving ${motionDirection} at ${formatMeasurement(snapshot.velocity, "m/s")}. Its momentum is ${formatMeasurement(snapshot.momentum, "kg m/s")}, and the pulse has delivered ${formatMeasurement(snapshot.impulse, "N s")} of impulse so far. ${forceSummary}`,
    `在 t = ${formatMeasurement(
      clamp(safeNumber(time, 0), 0, MOMENTUM_IMPULSE_TOTAL_TIME),
      "s",
    )} 時，${formatMeasurement(snapshot.mass, "kg")} 的小車正以 ${formatMeasurement(snapshot.velocity, "m/s")} ${motionDirection}移動。它的動量是 ${formatMeasurement(snapshot.momentum, "kg m/s")}，而脈衝目前已經提供了 ${formatMeasurement(snapshot.impulse, "N s")} 的衝量。${forceSummary}`,
  );
}

function displayTimeBeforePulse(snapshot: Pick<MomentumImpulseSnapshot, "pulseElapsed">) {
  return snapshot.pulseElapsed <= 0;
}
