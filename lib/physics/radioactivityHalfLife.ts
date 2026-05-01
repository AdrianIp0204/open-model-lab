import { clamp, formatMeasurement, formatNumber, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type RadioactivityHalfLifeParams = {
  sampleSize: number;
  halfLifeSeconds: number;
};

export type RadioactivityHalfLifeParticle = {
  index: number;
  row: number;
  column: number;
  decayTimeSeconds: number;
  decayed: boolean;
  recentlyDecayed: boolean;
};

export type RadioactivityHalfLifeSnapshot = {
  sampleSize: number;
  halfLifeSeconds: number;
  decayConstant: number;
  timeSeconds: number;
  maxTimeSeconds: number;
  elapsedHalfLives: number;
  expectedRemainingCount: number;
  actualRemainingCount: number;
  decayedCount: number;
  expectedFraction: number;
  actualFraction: number;
  survivalProbability: number;
  deviationCount: number;
  deviationFraction: number;
  recentDecayCount: number;
  halfLifeMarkersSeconds: number[];
  sortedDecayTimesSeconds: number[];
  particles: RadioactivityHalfLifeParticle[];
};

export const RADIOACTIVITY_HALF_LIFE_MIN_SAMPLE_SIZE = 1;
export const RADIOACTIVITY_HALF_LIFE_MAX_SAMPLE_SIZE = 196;
export const RADIOACTIVITY_HALF_LIFE_MIN_HALF_LIFE_SECONDS = 0.6;
export const RADIOACTIVITY_HALF_LIFE_MAX_HALF_LIFE_SECONDS = 8;
export const RADIOACTIVITY_HALF_LIFE_TIME_MULTIPLE = 5;

const LN_2 = Math.LN2;
const GRAPH_SAMPLES = 241;

function fract(value: number) {
  return value - Math.floor(value);
}

function sampleDeterministicUnit(index: number) {
  const seed = Math.sin((index + 1) * 12.9898 + (index + 1) * 78.233) * 43758.5453123;
  return clamp(fract(seed), 1e-6, 1 - 1e-6);
}

function resolveGridShape(sampleSize: number) {
  const columns = Math.ceil(Math.sqrt(sampleSize));
  const rows = Math.ceil(sampleSize / columns);

  return { columns, rows };
}

function resolveDecayTimeSeconds(index: number, decayConstant: number) {
  const unitSample = sampleDeterministicUnit(index);
  return -Math.log(1 - unitSample) / Math.max(decayConstant, 1e-6);
}

function buildDecayTimeline(sampleSize: number, decayConstant: number) {
  return Array.from({ length: sampleSize }, (_, index) =>
    resolveDecayTimeSeconds(index, decayConstant),
  ).sort((left, right) => left - right);
}

function buildHalfLifeMarkers(halfLifeSeconds: number) {
  return Array.from({ length: RADIOACTIVITY_HALF_LIFE_TIME_MULTIPLE }, (_, index) =>
    halfLifeSeconds * (index + 1),
  );
}

function resolveRecentDecayWindowSeconds(halfLifeSeconds: number) {
  return Math.max(0.08, Math.min(0.32, halfLifeSeconds * 0.18));
}

function buildStepSeriesPoints(
  sortedDecayTimesSeconds: number[],
  sampleSize: number,
  maxTimeSeconds: number,
  normalizer = 1,
): GraphPoint[] {
  const points: GraphPoint[] = [{ x: 0, y: sampleSize / normalizer }];
  let remainingCount = sampleSize;

  for (const decayTimeSeconds of sortedDecayTimesSeconds) {
    if (decayTimeSeconds > maxTimeSeconds) {
      break;
    }

    points.push({
      x: decayTimeSeconds,
      y: remainingCount / normalizer,
    });
    remainingCount -= 1;
    points.push({
      x: decayTimeSeconds,
      y: remainingCount / normalizer,
    });
  }

  const lastPoint = points[points.length - 1];

  if (!lastPoint || lastPoint.x < maxTimeSeconds) {
    points.push({
      x: maxTimeSeconds,
      y: remainingCount / normalizer,
    });
  }

  return points;
}

export function resolveRadioactivityHalfLifeParams(
  params:
    | Partial<RadioactivityHalfLifeParams>
    | Record<string, number | boolean | string>,
): RadioactivityHalfLifeParams {
  return {
    sampleSize: Math.round(
      clamp(
        safeNumber(params.sampleSize, 64),
        RADIOACTIVITY_HALF_LIFE_MIN_SAMPLE_SIZE,
        RADIOACTIVITY_HALF_LIFE_MAX_SAMPLE_SIZE,
      ),
    ),
    halfLifeSeconds: clamp(
      safeNumber(params.halfLifeSeconds, 2.4),
      RADIOACTIVITY_HALF_LIFE_MIN_HALF_LIFE_SECONDS,
      RADIOACTIVITY_HALF_LIFE_MAX_HALF_LIFE_SECONDS,
    ),
  };
}

export function resolveRadioactivityHalfLifeMaxTime(
  params:
    | Partial<RadioactivityHalfLifeParams>
    | Record<string, number | boolean | string>,
) {
  const resolved = resolveRadioactivityHalfLifeParams(params);
  return resolved.halfLifeSeconds * RADIOACTIVITY_HALF_LIFE_TIME_MULTIPLE;
}

export function sampleRadioactivityHalfLifeState(
  params:
    | Partial<RadioactivityHalfLifeParams>
    | Record<string, number | boolean | string>,
  timeSeconds = 0,
): RadioactivityHalfLifeSnapshot {
  const resolved = resolveRadioactivityHalfLifeParams(params);
  const decayConstant = LN_2 / resolved.halfLifeSeconds;
  const maxTimeSeconds = resolveRadioactivityHalfLifeMaxTime(resolved);
  const clampedTimeSeconds = Math.max(0, safeNumber(timeSeconds, 0));
  const elapsedHalfLives = clampedTimeSeconds / resolved.halfLifeSeconds;
  const expectedFraction = Math.exp(-decayConstant * clampedTimeSeconds);
  const survivalProbability = expectedFraction;
  const expectedRemainingCount = resolved.sampleSize * expectedFraction;
  const sortedDecayTimesSeconds = buildDecayTimeline(resolved.sampleSize, decayConstant);
  const actualRemainingCount = sortedDecayTimesSeconds.filter(
    (decayTimeSeconds) => decayTimeSeconds > clampedTimeSeconds,
  ).length;
  const actualFraction = actualRemainingCount / resolved.sampleSize;
  const deviationCount = actualRemainingCount - expectedRemainingCount;
  const deviationFraction = Math.abs(actualFraction - expectedFraction);
  const recentWindowSeconds = resolveRecentDecayWindowSeconds(resolved.halfLifeSeconds);
  const { columns } = resolveGridShape(resolved.sampleSize);
  const particles = Array.from({ length: resolved.sampleSize }, (_, index) => {
    const decayTimeSeconds = resolveDecayTimeSeconds(index, decayConstant);
    return {
      index,
      row: Math.floor(index / columns),
      column: index % columns,
      decayTimeSeconds,
      decayed: decayTimeSeconds <= clampedTimeSeconds,
      recentlyDecayed:
        decayTimeSeconds <= clampedTimeSeconds &&
        decayTimeSeconds > clampedTimeSeconds - recentWindowSeconds,
    };
  });
  const recentDecayCount = particles.filter((particle) => particle.recentlyDecayed).length;

  return {
    sampleSize: resolved.sampleSize,
    halfLifeSeconds: resolved.halfLifeSeconds,
    decayConstant,
    timeSeconds: clampedTimeSeconds,
    maxTimeSeconds,
    elapsedHalfLives,
    expectedRemainingCount,
    actualRemainingCount,
    decayedCount: resolved.sampleSize - actualRemainingCount,
    expectedFraction,
    actualFraction,
    survivalProbability,
    deviationCount,
    deviationFraction,
    recentDecayCount,
    halfLifeMarkersSeconds: buildHalfLifeMarkers(resolved.halfLifeSeconds),
    sortedDecayTimesSeconds,
    particles,
  };
}

export function buildRadioactivityHalfLifeSeries(
  params:
    | Partial<RadioactivityHalfLifeParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const snapshot = sampleRadioactivityHalfLifeState(params, 0);
  const expectedCountSeries = sampleTimeSeries(
    "expected-remaining",
    "Expected remaining",
    0,
    snapshot.maxTimeSeconds,
    GRAPH_SAMPLES,
    (timeSeconds) =>
      snapshot.sampleSize *
      Math.exp((-LN_2 / snapshot.halfLifeSeconds) * timeSeconds),
    "#f16659",
  );
  const expectedFractionSeries = sampleTimeSeries(
    "expected-fraction",
    "Expected fraction",
    0,
    snapshot.maxTimeSeconds,
    GRAPH_SAMPLES,
    (timeSeconds) => Math.exp((-LN_2 / snapshot.halfLifeSeconds) * timeSeconds),
    "#f59e0b",
  );

  return {
    "remaining-count": [
      buildSeries(
        "actual-remaining",
        "Actual remaining",
        buildStepSeriesPoints(
          snapshot.sortedDecayTimesSeconds,
          snapshot.sampleSize,
          snapshot.maxTimeSeconds,
        ),
        "#1ea6a2",
      ),
      {
        ...expectedCountSeries,
        dashed: true,
      },
    ],
    "remaining-fraction": [
      buildSeries(
        "actual-fraction",
        "Actual fraction",
        buildStepSeriesPoints(
          snapshot.sortedDecayTimesSeconds,
          snapshot.sampleSize,
          snapshot.maxTimeSeconds,
          snapshot.sampleSize,
        ),
        "#4ea6df",
      ),
      {
        ...expectedFractionSeries,
        dashed: true,
      },
    ],
  };
}

export function describeRadioactivityHalfLifeState(
  params:
    | Partial<RadioactivityHalfLifeParams>
    | Record<string, number | boolean | string>,
  timeSeconds: number,
) {
  const snapshot = sampleRadioactivityHalfLifeState(params, timeSeconds);
  const regularityNote =
    snapshot.sampleSize <= 16
      ? "Because the sample is small, the stepped live count can wander noticeably around the smooth expectation."
      : "Because many nuclei are decaying independently, the stepped live count stays close to the smooth expectation.";

  return `At t = ${formatMeasurement(snapshot.timeSeconds, "s")}, ${snapshot.actualRemainingCount} of ${snapshot.sampleSize} nuclei remain while the expectation is about ${formatNumber(snapshot.expectedRemainingCount, 1)}. The half-life is ${formatMeasurement(snapshot.halfLifeSeconds, "s")}, so one nucleus has survival probability ${formatNumber(snapshot.survivalProbability * 100, 1)}% by this time. ${regularityNote}`;
}
