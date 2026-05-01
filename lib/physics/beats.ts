import { TAU, clamp, formatMeasurement, formatNumber, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type BeatsParams = {
  amplitude: number;
  frequencyA: number;
  frequencyB: number;
};

export type BeatsSnapshot = {
  amplitude: number;
  frequencyA: number;
  frequencyB: number;
  time: number;
  averageFrequency: number;
  frequencyDifference: number;
  beatFrequency: number;
  beatPeriod: number;
  carrierFrequency: number;
  carrierPeriod: number;
  sourceADisplacement: number;
  sourceBDisplacement: number;
  resultantDisplacement: number;
  rawEnvelopeFactor: number;
  envelopeSigned: number;
  envelopeAmplitude: number;
  envelopeRatio: number;
  loudnessCue: number;
  loudnessLabel: "steady" | "growing" | "fading" | "loud pulse" | "quiet gap";
  beatSpeedLabel: "none" | "slow" | "clear" | "fast";
};

export const BEATS_MIN_AMPLITUDE = 0.05;
export const BEATS_MAX_AMPLITUDE = 0.24;
export const BEATS_MIN_FREQUENCY = 0.6;
export const BEATS_MAX_FREQUENCY = 2.2;

const NO_BEAT_THRESHOLD = 1e-3;
const TIME_SAMPLE_COUNT = 321;
const MIN_TIME_WINDOW = 2.6;
const MAX_TIME_WINDOW = 8;

function classifyBeatSpeed(frequencyDifference: number) {
  if (frequencyDifference < 0.05) {
    return "none" as const;
  }

  if (frequencyDifference < 0.2) {
    return "slow" as const;
  }

  if (frequencyDifference < 0.55) {
    return "clear" as const;
  }

  return "fast" as const;
}

function classifyLoudness(
  envelopeRatio: number,
  rawEnvelopeFactor: number,
  frequencyDifference: number,
  time: number,
) {
  if (frequencyDifference < NO_BEAT_THRESHOLD) {
    return "steady" as const;
  }

  if (envelopeRatio >= 0.88) {
    return "loud pulse" as const;
  }

  if (envelopeRatio <= 0.12) {
    return "quiet gap" as const;
  }

  const derivative =
    -Math.sign(rawEnvelopeFactor || 1) *
    Math.PI *
    frequencyDifference *
    Math.sin(Math.PI * frequencyDifference * time);

  return derivative >= 0 ? "growing" : "fading";
}

function resolveWindowDuration(snapshot: BeatsSnapshot) {
  const carrierWindow = 4 / Math.max(snapshot.averageFrequency, 0.1);
  const beatWindow =
    snapshot.beatFrequency > NO_BEAT_THRESHOLD ? 2 / snapshot.beatFrequency : 0;

  return clamp(
    Math.max(carrierWindow, beatWindow, MIN_TIME_WINDOW),
    MIN_TIME_WINDOW,
    MAX_TIME_WINDOW,
  );
}

export function resolveBeatsParams(
  params: Partial<BeatsParams> | Record<string, number | boolean | string>,
): BeatsParams {
  return {
    amplitude: clamp(
      safeNumber(params.amplitude, 0.12),
      BEATS_MIN_AMPLITUDE,
      BEATS_MAX_AMPLITUDE,
    ),
    frequencyA: clamp(
      safeNumber(params.frequencyA, 1),
      BEATS_MIN_FREQUENCY,
      BEATS_MAX_FREQUENCY,
    ),
    frequencyB: clamp(
      safeNumber(params.frequencyB, 1.12),
      BEATS_MIN_FREQUENCY,
      BEATS_MAX_FREQUENCY,
    ),
  };
}

export function sampleBeatsState(
  params: Partial<BeatsParams> | Record<string, number | boolean | string>,
  time: number,
): BeatsSnapshot {
  const resolved = resolveBeatsParams(params);
  const averageFrequency = (resolved.frequencyA + resolved.frequencyB) / 2;
  const frequencyDifference = Math.abs(resolved.frequencyB - resolved.frequencyA);
  const beatFrequency = frequencyDifference;
  const beatPeriod =
    beatFrequency > NO_BEAT_THRESHOLD ? 1 / beatFrequency : Number.POSITIVE_INFINITY;
  const carrierFrequency = averageFrequency;
  const carrierPeriod = 1 / Math.max(carrierFrequency, 1e-6);
  const sourceADisplacement = resolved.amplitude * Math.sin(TAU * resolved.frequencyA * time);
  const sourceBDisplacement = resolved.amplitude * Math.sin(TAU * resolved.frequencyB * time);
  const resultantDisplacement = sourceADisplacement + sourceBDisplacement;
  const rawEnvelopeFactor = Math.cos(Math.PI * frequencyDifference * time);
  const envelopeSigned = 2 * resolved.amplitude * rawEnvelopeFactor;
  const envelopeAmplitude = Math.abs(envelopeSigned);
  const envelopeRatio =
    envelopeAmplitude / Math.max(2 * resolved.amplitude, Number.EPSILON);
  const loudnessCue = envelopeRatio * envelopeRatio;

  return {
    amplitude: resolved.amplitude,
    frequencyA: resolved.frequencyA,
    frequencyB: resolved.frequencyB,
    time,
    averageFrequency,
    frequencyDifference,
    beatFrequency,
    beatPeriod,
    carrierFrequency,
    carrierPeriod,
    sourceADisplacement,
    sourceBDisplacement,
    resultantDisplacement,
    rawEnvelopeFactor,
    envelopeSigned,
    envelopeAmplitude,
    envelopeRatio,
    loudnessCue,
    loudnessLabel: classifyLoudness(
      envelopeRatio,
      rawEnvelopeFactor,
      frequencyDifference,
      time,
    ),
    beatSpeedLabel: classifyBeatSpeed(frequencyDifference),
  };
}

export function buildBeatsSeries(
  params: Partial<BeatsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveBeatsParams(params);
  const snapshot = sampleBeatsState(resolved, 0);
  const timeWindow = resolveWindowDuration(snapshot);

  return {
    displacement: [
      sampleTimeSeries(
        "source-a",
        "Source A",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleBeatsState(resolved, time).sourceADisplacement,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "source-b",
        "Source B",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleBeatsState(resolved, time).sourceBDisplacement,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "resultant",
        "Resultant",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleBeatsState(resolved, time).resultantDisplacement,
        "#f16659",
      ),
    ],
    envelope: [
      sampleTimeSeries(
        "envelope-ratio",
        "Envelope ratio",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleBeatsState(resolved, time).envelopeRatio,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "loudness-cue",
        "Loudness cue",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleBeatsState(resolved, time).loudnessCue,
        "#f16659",
      ),
    ],
  };
}

export function describeBeatsState(
  params: Partial<BeatsParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleBeatsState(params, time);
  const beatPeriodText = Number.isFinite(snapshot.beatPeriod)
    ? formatMeasurement(snapshot.beatPeriod, "s")
    : "steady";

  if (snapshot.beatFrequency <= NO_BEAT_THRESHOLD) {
    return `At t = ${formatMeasurement(time, "s")}, both sources are effectively at ${formatMeasurement(snapshot.averageFrequency, "Hz")}, so the superposition stays at one steady envelope with no separate beat cycle. The resultant displacement is ${formatMeasurement(snapshot.resultantDisplacement, "m")}.`;
  }

  return `At t = ${formatMeasurement(time, "s")}, the two nearby frequencies average ${formatMeasurement(snapshot.averageFrequency, "Hz")} while their difference is ${formatMeasurement(snapshot.frequencyDifference, "Hz")}, so the beat frequency is ${formatMeasurement(snapshot.beatFrequency, "Hz")} and the loudness pulse repeats every ${beatPeriodText}. The instantaneous envelope is ${formatMeasurement(snapshot.envelopeAmplitude, "m")} and the bounded loudness cue is ${formatNumber(snapshot.loudnessCue)}.`;
}
