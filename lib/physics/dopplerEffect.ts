import { TAU, clamp, formatMeasurement, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type DopplerEffectParams = {
  sourceFrequency: number;
  sourceSpeed: number;
  observerSpeed: number;
  observerAhead: boolean;
};

export type DopplerEffectWavefront = {
  emissionTime: number;
  sourceX: number;
  radius: number;
  frontX: number;
  backX: number;
};

export type DopplerEffectSnapshot = {
  waveSpeed: number;
  time: number;
  sourceFrequency: number;
  sourcePeriod: number;
  sourceSpeed: number;
  observerSpeed: number;
  observerActualVelocity: number;
  observerAhead: boolean;
  observerSideLabel: "ahead" | "behind";
  observerMotionLabel: "toward" | "away" | "stationary";
  sourceX: number;
  observerX: number;
  currentSeparation: number;
  restWavelength: number;
  frontSpacing: number;
  backSpacing: number;
  selectedSpacing: number;
  oppositeSpacing: number;
  selectedSpacingLabel: "front spacing" | "rear spacing";
  oppositeSpacingLabel: "rear spacing" | "front spacing";
  observedFrequency: number;
  observedPeriod: number;
  arrivalSpeed: number;
  pitchRatio: number;
  pitchShiftLabel: "higher" | "lower" | "matched";
  travelDelay: number;
  retardedEmissionTime: number;
  sourceSignal: number;
  observerSignal: number;
  frontAxisPositions: number[];
  backAxisPositions: number[];
};

export const DOPPLER_EFFECT_WAVE_SPEED = 3.2;
export const DOPPLER_EFFECT_STAGE_HALF_LENGTH = 7.2;
export const DOPPLER_EFFECT_OBSERVER_BASE_DISTANCE = 4.4;
export const DOPPLER_EFFECT_MIN_SOURCE_FREQUENCY = 0.7;
export const DOPPLER_EFFECT_MAX_SOURCE_FREQUENCY = 1.8;
export const DOPPLER_EFFECT_MIN_SOURCE_SPEED = 0;
export const DOPPLER_EFFECT_MAX_SOURCE_SPEED = 0.8;
export const DOPPLER_EFFECT_MIN_OBSERVER_SPEED = -0.8;
export const DOPPLER_EFFECT_MAX_OBSERVER_SPEED = 0.8;

const TIME_SAMPLE_COUNT = 241;
const RESPONSE_SAMPLE_COUNT = 121;
const MIN_TIME_WINDOW = 2.4;
const MAX_TIME_WINDOW = 5.2;

function resolveObserverMotionLabel(observerSpeed: number) {
  if (observerSpeed >= 0.03) {
    return "toward" as const;
  }

  if (observerSpeed <= -0.03) {
    return "away" as const;
  }

  return "stationary" as const;
}

function resolvePitchShiftLabel(pitchRatio: number) {
  if (pitchRatio >= 1.03) {
    return "higher" as const;
  }

  if (pitchRatio <= 0.97) {
    return "lower" as const;
  }

  return "matched" as const;
}

function resolveSideDirection(observerAhead: boolean) {
  return observerAhead ? 1 : -1;
}

function resolveObserverVelocity(
  observerAhead: boolean,
  observerSpeed: number,
) {
  return -resolveSideDirection(observerAhead) * observerSpeed;
}

function resolveRetardedEmissionTime(
  params: DopplerEffectParams,
  time: number,
) {
  const side = resolveSideDirection(params.observerAhead);
  const observerVelocity = resolveObserverVelocity(params.observerAhead, params.observerSpeed);
  const denominator = params.sourceSpeed - side * DOPPLER_EFFECT_WAVE_SPEED;

  if (Math.abs(denominator) <= 1e-6) {
    return time;
  }

  return (
    side * DOPPLER_EFFECT_OBSERVER_BASE_DISTANCE +
    (observerVelocity - side * DOPPLER_EFFECT_WAVE_SPEED) * time
  ) / denominator;
}

function buildWavefrontAxisPositions(
  wavefronts: DopplerEffectWavefront[],
  key: "frontX" | "backX",
) {
  return wavefronts.map((wavefront) => wavefront[key]).sort((left, right) => left - right);
}

function resolveTimeWindow(sourcePeriod: number, observedPeriod: number) {
  return clamp(
    Math.max(sourcePeriod, observedPeriod) * 4,
    MIN_TIME_WINDOW,
    MAX_TIME_WINDOW,
  );
}

export function resolveDopplerEffectParams(
  params: Partial<DopplerEffectParams> | Record<string, number | boolean | string>,
): DopplerEffectParams {
  return {
    sourceFrequency: clamp(
      safeNumber(params.sourceFrequency, 1.1),
      DOPPLER_EFFECT_MIN_SOURCE_FREQUENCY,
      DOPPLER_EFFECT_MAX_SOURCE_FREQUENCY,
    ),
    sourceSpeed: clamp(
      safeNumber(params.sourceSpeed, 0.45),
      DOPPLER_EFFECT_MIN_SOURCE_SPEED,
      DOPPLER_EFFECT_MAX_SOURCE_SPEED,
    ),
    observerSpeed: clamp(
      safeNumber(params.observerSpeed, 0),
      DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
      DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
    ),
    observerAhead: typeof params.observerAhead === "boolean" ? params.observerAhead : true,
  };
}

export function getDopplerEffectWavefronts(
  params: Partial<DopplerEffectParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const resolved = resolveDopplerEffectParams(params);
  const horizon =
    (DOPPLER_EFFECT_STAGE_HALF_LENGTH * 2) / DOPPLER_EFFECT_WAVE_SPEED +
    1 / Math.max(resolved.sourceFrequency, 1e-6);
  const count = Math.max(4, Math.ceil(horizon * resolved.sourceFrequency) + 1);
  const wavefronts = Array.from({ length: count }, (_, index) => {
    const emissionTime = time - index / resolved.sourceFrequency;
    const sourceX = resolved.sourceSpeed * emissionTime;
    const radius = DOPPLER_EFFECT_WAVE_SPEED * (time - emissionTime);

    return {
      emissionTime,
      sourceX,
      radius,
      frontX: sourceX + radius,
      backX: sourceX - radius,
    } satisfies DopplerEffectWavefront;
  });

  return wavefronts
    .filter(
      (wavefront) =>
        wavefront.frontX >= -DOPPLER_EFFECT_STAGE_HALF_LENGTH - 0.6 &&
        wavefront.backX <= DOPPLER_EFFECT_STAGE_HALF_LENGTH + 0.6,
    )
    .reverse();
}

export function sampleDopplerEffectState(
  params: Partial<DopplerEffectParams> | Record<string, number | boolean | string>,
  time: number,
): DopplerEffectSnapshot {
  const resolved = resolveDopplerEffectParams(params);
  const side = resolveSideDirection(resolved.observerAhead);
  const observerActualVelocity = resolveObserverVelocity(
    resolved.observerAhead,
    resolved.observerSpeed,
  );
  const sourcePeriod = 1 / Math.max(resolved.sourceFrequency, 1e-6);
  const sourceX = resolved.sourceSpeed * time;
  const observerX =
    side * DOPPLER_EFFECT_OBSERVER_BASE_DISTANCE + observerActualVelocity * time;
  const restWavelength = DOPPLER_EFFECT_WAVE_SPEED / resolved.sourceFrequency;
  const frontSpacing =
    (DOPPLER_EFFECT_WAVE_SPEED - resolved.sourceSpeed) / resolved.sourceFrequency;
  const backSpacing =
    (DOPPLER_EFFECT_WAVE_SPEED + resolved.sourceSpeed) / resolved.sourceFrequency;
  const selectedSpacing = resolved.observerAhead ? frontSpacing : backSpacing;
  const oppositeSpacing = resolved.observerAhead ? backSpacing : frontSpacing;
  const observedFrequency =
    resolved.sourceFrequency *
    ((DOPPLER_EFFECT_WAVE_SPEED + resolved.observerSpeed) /
      (DOPPLER_EFFECT_WAVE_SPEED - side * resolved.sourceSpeed));
  const observedPeriod = 1 / Math.max(observedFrequency, 1e-6);
  const retardedEmissionTime = resolveRetardedEmissionTime(resolved, time);
  const sourceSignal = Math.sin(TAU * resolved.sourceFrequency * time);
  const observerSignal = Math.sin(TAU * resolved.sourceFrequency * retardedEmissionTime);
  const wavefronts = getDopplerEffectWavefronts(resolved, time);
  const frontAxisPositions = buildWavefrontAxisPositions(wavefronts, "frontX");
  const backAxisPositions = buildWavefrontAxisPositions(wavefronts, "backX");

  return {
    waveSpeed: DOPPLER_EFFECT_WAVE_SPEED,
    time,
    sourceFrequency: resolved.sourceFrequency,
    sourcePeriod,
    sourceSpeed: resolved.sourceSpeed,
    observerSpeed: resolved.observerSpeed,
    observerActualVelocity,
    observerAhead: resolved.observerAhead,
    observerSideLabel: resolved.observerAhead ? "ahead" : "behind",
    observerMotionLabel: resolveObserverMotionLabel(resolved.observerSpeed),
    sourceX,
    observerX,
    currentSeparation: Math.abs(observerX - sourceX),
    restWavelength,
    frontSpacing,
    backSpacing,
    selectedSpacing,
    oppositeSpacing,
    selectedSpacingLabel: resolved.observerAhead ? "front spacing" : "rear spacing",
    oppositeSpacingLabel: resolved.observerAhead ? "rear spacing" : "front spacing",
    observedFrequency,
    observedPeriod,
    arrivalSpeed: DOPPLER_EFFECT_WAVE_SPEED + resolved.observerSpeed,
    pitchRatio: observedFrequency / Math.max(resolved.sourceFrequency, 1e-6),
    pitchShiftLabel: resolvePitchShiftLabel(
      observedFrequency / Math.max(resolved.sourceFrequency, 1e-6),
    ),
    travelDelay: time - retardedEmissionTime,
    retardedEmissionTime,
    sourceSignal,
    observerSignal,
    frontAxisPositions,
    backAxisPositions,
  };
}

export function buildDopplerEffectSeries(
  params: Partial<DopplerEffectParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveDopplerEffectParams(params);
  const baseline = sampleDopplerEffectState(resolved, 0);
  const timeWindow = resolveTimeWindow(
    baseline.sourcePeriod,
    baseline.observedPeriod,
  );

  return {
    displacement: [
      sampleTimeSeries(
        "source",
        "Source signal",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDopplerEffectState(resolved, time).sourceSignal,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "observer",
        "Observer signal",
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleDopplerEffectState(resolved, time).observerSignal,
        "#f16659",
      ),
    ],
    "source-spacing": [
      buildSeries(
        "front-spacing",
        "Front spacing",
        sampleRange(
          DOPPLER_EFFECT_MIN_SOURCE_SPEED,
          DOPPLER_EFFECT_MAX_SOURCE_SPEED,
          RESPONSE_SAMPLE_COUNT,
        ).map((sourceSpeed) => ({
          x: sourceSpeed,
          y: (DOPPLER_EFFECT_WAVE_SPEED - sourceSpeed) / resolved.sourceFrequency,
        })),
        "#f16659",
      ),
      buildSeries(
        "rear-spacing",
        "Rear spacing",
        sampleRange(
          DOPPLER_EFFECT_MIN_SOURCE_SPEED,
          DOPPLER_EFFECT_MAX_SOURCE_SPEED,
          RESPONSE_SAMPLE_COUNT,
        ).map((sourceSpeed) => ({
          x: sourceSpeed,
          y: (DOPPLER_EFFECT_WAVE_SPEED + sourceSpeed) / resolved.sourceFrequency,
        })),
        "#4ea6df",
      ),
    ],
    "observer-response": [
      buildSeries(
        "observed-frequency",
        "Observed frequency",
        sampleRange(
          DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
          DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
          RESPONSE_SAMPLE_COUNT,
        ).map((observerSpeed) => ({
          x: observerSpeed,
          y:
            resolved.sourceFrequency *
            ((DOPPLER_EFFECT_WAVE_SPEED + observerSpeed) /
              (DOPPLER_EFFECT_WAVE_SPEED -
                resolveSideDirection(resolved.observerAhead) * resolved.sourceSpeed)),
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "emitted-frequency",
        "Emitted frequency",
        sampleRange(
          DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
          DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
          RESPONSE_SAMPLE_COUNT,
        ).map((observerSpeed) => ({
          x: observerSpeed,
          y: resolved.sourceFrequency,
        })),
        "#1ea6a2",
        true,
      ),
    ],
  };
}

export function describeDopplerEffectState(
  params: Partial<DopplerEffectParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleDopplerEffectState(params, time);
  const observerMotionText =
    snapshot.observerMotionLabel === "toward"
      ? `moving toward the source at ${formatMeasurement(snapshot.observerSpeed, "m/s")}`
      : snapshot.observerMotionLabel === "away"
        ? `moving away from the source at ${formatMeasurement(Math.abs(snapshot.observerSpeed), "m/s")}`
        : "momentarily stationary relative to the medium";

  return `At t = ${formatMeasurement(time, "s")}, the source emits ${formatMeasurement(snapshot.sourceFrequency, "Hz")} while moving at ${formatMeasurement(snapshot.sourceSpeed, "m/s")}, so the front spacing is ${formatMeasurement(snapshot.frontSpacing, "m")} and the rear spacing is ${formatMeasurement(snapshot.backSpacing, "m")}. The observer on the ${snapshot.observerSideLabel} side is ${observerMotionText}, receives ${formatMeasurement(snapshot.observedFrequency, "Hz")}, and hears a ${snapshot.pitchShiftLabel} pitch cue in this bounded classical sound model.`;
}
