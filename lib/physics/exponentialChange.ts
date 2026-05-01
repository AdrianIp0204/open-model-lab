import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type ExponentialChangeParams = {
  initialValue?: number;
  rate?: number;
  targetValue?: number;
};

export type ExponentialChangeMode = "growth" | "decay" | "steady";

export type ExponentialChangeSnapshot = {
  initialValue: number;
  rate: number;
  targetValue: number;
  pairedRate: number;
  mode: ExponentialChangeMode;
  pairedMode: ExponentialChangeMode;
  targetRatio: number;
  targetLogRatio: number;
  targetTime: number | null;
  pairedTargetTime: number | null;
  targetReachable: boolean;
  pairedTargetReachable: boolean;
  targetInWindow: boolean;
  pairedTargetInWindow: boolean;
  doublingTime: number | null;
  halfLife: number | null;
  cadenceKind: "doubling" | "half-life" | null;
  cadenceTime: number | null;
  cadenceValue: number | null;
  currentAtWindowEnd: number;
  pairedAtWindowEnd: number;
};

export const EXPONENTIAL_CHANGE_TIME_MIN = 0;
export const EXPONENTIAL_CHANGE_TIME_MAX = 8;
export const EXPONENTIAL_CHANGE_INITIAL_MIN = 0.5;
export const EXPONENTIAL_CHANGE_INITIAL_MAX = 8;
export const EXPONENTIAL_CHANGE_RATE_MIN = -0.45;
export const EXPONENTIAL_CHANGE_RATE_MAX = 0.45;
export const EXPONENTIAL_CHANGE_TARGET_MIN = 0.25;
export const EXPONENTIAL_CHANGE_TARGET_MAX = 20;

const EXPONENTIAL_CHANGE_RATE_EPSILON = 0.0001;
const SAMPLE_COUNT = 241;

function resolveMode(rate: number): ExponentialChangeMode {
  if (rate > EXPONENTIAL_CHANGE_RATE_EPSILON) {
    return "growth";
  }

  if (rate < -EXPONENTIAL_CHANGE_RATE_EPSILON) {
    return "decay";
  }

  return "steady";
}

export function resolveExponentialChangeParams(
  source: Partial<ExponentialChangeParams> | Record<string, number | boolean | string>,
) {
  return {
    initialValue: clamp(
      safeNumber(source.initialValue, 3),
      EXPONENTIAL_CHANGE_INITIAL_MIN,
      EXPONENTIAL_CHANGE_INITIAL_MAX,
    ),
    rate: clamp(
      safeNumber(source.rate, 0.25),
      EXPONENTIAL_CHANGE_RATE_MIN,
      EXPONENTIAL_CHANGE_RATE_MAX,
    ),
    targetValue: clamp(
      safeNumber(source.targetValue, 12),
      EXPONENTIAL_CHANGE_TARGET_MIN,
      EXPONENTIAL_CHANGE_TARGET_MAX,
    ),
  } satisfies Required<ExponentialChangeParams>;
}

export function evaluateExponentialChangeValue(
  source: Partial<ExponentialChangeParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const params = resolveExponentialChangeParams(source);
  const clampedTime = clamp(time, EXPONENTIAL_CHANGE_TIME_MIN, EXPONENTIAL_CHANGE_TIME_MAX);

  return params.initialValue * Math.exp(params.rate * clampedTime);
}

export function evaluateExponentialChangeLogValue(
  source: Partial<ExponentialChangeParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const params = resolveExponentialChangeParams(source);
  const clampedTime = clamp(time, EXPONENTIAL_CHANGE_TIME_MIN, EXPONENTIAL_CHANGE_TIME_MAX);

  return params.rate * clampedTime;
}

function resolveTargetTime(initialValue: number, targetValue: number, rate: number) {
  const ratio = targetValue / initialValue;

  if (ratio <= 0) {
    return null;
  }

  if (Math.abs(rate) <= EXPONENTIAL_CHANGE_RATE_EPSILON) {
    return Math.abs(ratio - 1) <= EXPONENTIAL_CHANGE_RATE_EPSILON ? 0 : null;
  }

  const time = Math.log(ratio) / rate;
  return time >= 0 ? time : null;
}

export function sampleExponentialChangeState(
  source: Partial<ExponentialChangeParams> | Record<string, number | boolean | string>,
): ExponentialChangeSnapshot {
  const params = resolveExponentialChangeParams(source);
  const pairedRate = -params.rate;
  const targetRatio = params.targetValue / params.initialValue;
  const targetLogRatio = Math.log(targetRatio);
  const targetTime = resolveTargetTime(params.initialValue, params.targetValue, params.rate);
  const pairedTargetTime = resolveTargetTime(
    params.initialValue,
    params.targetValue,
    pairedRate,
  );
  const doublingTime =
    params.rate > EXPONENTIAL_CHANGE_RATE_EPSILON ? Math.log(2) / params.rate : null;
  const halfLife =
    params.rate < -EXPONENTIAL_CHANGE_RATE_EPSILON ? Math.log(2) / Math.abs(params.rate) : null;
  const cadenceKind = doublingTime !== null ? "doubling" : halfLife !== null ? "half-life" : null;
  const cadenceTime = doublingTime ?? halfLife;
  const cadenceValue =
    cadenceKind === "doubling"
      ? params.initialValue * 2
      : cadenceKind === "half-life"
        ? params.initialValue / 2
        : null;

  return {
    initialValue: params.initialValue,
    rate: params.rate,
    targetValue: params.targetValue,
    pairedRate,
    mode: resolveMode(params.rate),
    pairedMode: resolveMode(pairedRate),
    targetRatio,
    targetLogRatio,
    targetTime,
    pairedTargetTime,
    targetReachable: targetTime !== null,
    pairedTargetReachable: pairedTargetTime !== null,
    targetInWindow:
      targetTime !== null && targetTime <= EXPONENTIAL_CHANGE_TIME_MAX + EXPONENTIAL_CHANGE_RATE_EPSILON,
    pairedTargetInWindow:
      pairedTargetTime !== null &&
      pairedTargetTime <= EXPONENTIAL_CHANGE_TIME_MAX + EXPONENTIAL_CHANGE_RATE_EPSILON,
    doublingTime,
    halfLife,
    cadenceKind,
    cadenceTime,
    cadenceValue,
    currentAtWindowEnd: evaluateExponentialChangeValue(params, EXPONENTIAL_CHANGE_TIME_MAX),
    pairedAtWindowEnd: params.initialValue * Math.exp(pairedRate * EXPONENTIAL_CHANGE_TIME_MAX),
  };
}

export function resolveExponentialChangeViewport(
  sources: Array<Partial<ExponentialChangeParams> | Record<string, number | boolean | string>>,
) {
  const snapshots = sources.map((source) => sampleExponentialChangeState(source));
  const amountMax = Math.max(
    1,
    ...snapshots.flatMap((snapshot) => [
      snapshot.initialValue,
      snapshot.targetValue,
      snapshot.currentAtWindowEnd,
      snapshot.pairedAtWindowEnd,
    ]),
  );
  const logAbsMax = Math.max(
    0.6,
    ...snapshots.flatMap((snapshot) => [
      Math.abs(snapshot.targetLogRatio),
      Math.abs(snapshot.rate * EXPONENTIAL_CHANGE_TIME_MAX),
      Math.abs(snapshot.pairedRate * EXPONENTIAL_CHANGE_TIME_MAX),
    ]),
  );

  return {
    amountMax,
    logAbsMax,
  };
}

export function buildExponentialChangeSeries(
  source: Partial<ExponentialChangeParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const params = resolveExponentialChangeParams(source);
  const snapshot = sampleExponentialChangeState(params);
  const times = sampleRange(
    EXPONENTIAL_CHANGE_TIME_MIN,
    EXPONENTIAL_CHANGE_TIME_MAX,
    SAMPLE_COUNT,
  );

  return {
    "change-curve": [
      buildSeries(
        "current-change",
        snapshot.mode === "decay" ? "Current decay" : "Current growth",
        times.map((time) => ({
          x: time,
          y: evaluateExponentialChangeValue(params, time),
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "paired-change",
        "Opposite-rate comparison",
        times.map((time) => ({
          x: time,
          y: params.initialValue * Math.exp(snapshot.pairedRate * time),
        })),
        "#f16659",
        true,
      ),
      buildSeries(
        "target-line",
        "Target",
        [
          { x: EXPONENTIAL_CHANGE_TIME_MIN, y: params.targetValue },
          { x: EXPONENTIAL_CHANGE_TIME_MAX, y: params.targetValue },
        ],
        "#f0ab3c",
        true,
      ),
      ...(snapshot.targetInWindow
        ? [
            buildSeries(
              "target-hit",
              "Current target hit",
              [{ x: snapshot.targetTime ?? 0, y: params.targetValue }],
              "#f0ab3c",
            ),
          ]
        : []),
      ...(snapshot.pairedTargetInWindow
        ? [
            buildSeries(
              "paired-target-hit",
              "Opposite-rate target hit",
              [{ x: snapshot.pairedTargetTime ?? 0, y: params.targetValue }],
              "#f16659",
            ),
          ]
        : []),
    ],
    "log-view": [
      buildSeries(
        "log-line",
        "ln(y / y0)",
        times.map((time) => ({
          x: time,
          y: evaluateExponentialChangeLogValue(params, time),
        })),
        "#315063",
      ),
      buildSeries(
        "paired-log-line",
        "Opposite-rate log line",
        times.map((time) => ({
          x: time,
          y: -params.rate * time,
        })),
        "#f16659",
        true,
      ),
      buildSeries(
        "target-log-line",
        "ln(target / y0)",
        [
          { x: EXPONENTIAL_CHANGE_TIME_MIN, y: snapshot.targetLogRatio },
          { x: EXPONENTIAL_CHANGE_TIME_MAX, y: snapshot.targetLogRatio },
        ],
        "#f0ab3c",
        true,
      ),
      ...(snapshot.targetInWindow
        ? [
            buildSeries(
              "log-target-hit",
              "Current target time",
              [{ x: snapshot.targetTime ?? 0, y: snapshot.targetLogRatio }],
              "#f0ab3c",
            ),
          ]
        : []),
    ],
  };
}

export function describeExponentialChangeState(
  source: Partial<ExponentialChangeParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleExponentialChangeState(source);
  const modeSummary =
    snapshot.mode === "growth"
      ? `grows from ${formatNumber(snapshot.initialValue)} with continuous rate k = ${formatNumber(snapshot.rate)}`
      : snapshot.mode === "decay"
        ? `decays from ${formatNumber(snapshot.initialValue)} with continuous rate k = ${formatNumber(snapshot.rate)}`
        : `stays near ${formatNumber(snapshot.initialValue)} because k is essentially zero`;
  const targetSummary =
    snapshot.targetTime === null
      ? `The target ${formatNumber(snapshot.targetValue)} is not reached for the current sign of k.`
      : snapshot.targetTime <= EXPONENTIAL_CHANGE_TIME_MAX
        ? `The target ${formatNumber(snapshot.targetValue)} is reached at about t = ${formatNumber(snapshot.targetTime)}.`
        : `The target ${formatNumber(snapshot.targetValue)} is reached at about t = ${formatNumber(snapshot.targetTime)}, which is beyond the current graph window.`;
  const cadenceSummary =
    snapshot.cadenceKind === "doubling"
      ? `The doubling time is about ${formatNumber(snapshot.cadenceTime ?? 0)}, where the amount reaches ${formatNumber(snapshot.cadenceValue ?? 0)}.`
      : snapshot.cadenceKind === "half-life"
        ? `The half-life is about ${formatNumber(snapshot.cadenceTime ?? 0)}, where the amount falls to ${formatNumber(snapshot.cadenceValue ?? 0)}.`
        : "There is no fixed doubling or half-life cue while the rate stays near zero.";

  return `The exponential curve ${modeSummary}. ${targetSummary} ${cadenceSummary} The inverse question becomes logarithmic because ln(target / y0) = ${formatNumber(snapshot.targetLogRatio)}.`;
}
