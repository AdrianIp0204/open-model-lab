import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type DeBroglieMatterWavesParams = {
  massMultiple: number;
  speedMms: number;
};

export type DeBroglieMatterWavesSnapshot = {
  massMultiple: number;
  speedMms: number;
  massKg: number;
  speedMps: number;
  speedFractionC: number;
  momentumKgMs: number;
  momentumScaled: number;
  wavelengthNm: number;
  stripLengthNm: number;
  loopCircumferenceNm: number;
  fitCount: number;
  nearestWholeFit: number;
  fitError: number;
  fitErrorAbs: number;
  seamMismatchNm: number;
  localCyclesOnStrip: number;
  isNearWholeNumberFit: boolean;
  fitLabel:
    | "less-than-one-wave"
    | "near-whole-number"
    | "between-whole-numbers";
};

export const DE_BROGLIE_ELECTRON_MASS_KG = 9.1093837015e-31;
export const DE_BROGLIE_PLANCK_CONSTANT = 6.62607015e-34;
export const DE_BROGLIE_LIGHT_SPEED_MPS = 299_792_458;
export const DE_BROGLIE_MMS_TO_MPS = 1_000_000;
export const DE_BROGLIE_MOMENTUM_DISPLAY_SCALE = 1e24;
export const DE_BROGLIE_MIN_MASS_MULTIPLE = 1;
export const DE_BROGLIE_MAX_MASS_MULTIPLE = 2.4;
export const DE_BROGLIE_MIN_SPEED_MMS = 0.8;
export const DE_BROGLIE_MAX_SPEED_MMS = 4.8;
export const DE_BROGLIE_STRIP_LENGTH_NM = 0.6;
export const DE_BROGLIE_LOOP_CIRCUMFERENCE_NM = 2 * Math.PI * 0.0529177210903;

const DE_BROGLIE_GRAPH_SAMPLES = 181;
const DE_BROGLIE_MOMENTUM_PER_MASS_SPEED =
  DE_BROGLIE_ELECTRON_MASS_KG *
  DE_BROGLIE_MMS_TO_MPS *
  DE_BROGLIE_MOMENTUM_DISPLAY_SCALE;

export const DE_BROGLIE_MIN_MOMENTUM_SCALED =
  DE_BROGLIE_MOMENTUM_PER_MASS_SPEED *
  DE_BROGLIE_MIN_MASS_MULTIPLE *
  DE_BROGLIE_MIN_SPEED_MMS;
export const DE_BROGLIE_MAX_MOMENTUM_SCALED =
  DE_BROGLIE_MOMENTUM_PER_MASS_SPEED *
  DE_BROGLIE_MAX_MASS_MULTIPLE *
  DE_BROGLIE_MAX_SPEED_MMS;
export const DE_BROGLIE_MAX_FIT_COUNT =
  DE_BROGLIE_LOOP_CIRCUMFERENCE_NM /
  ((DE_BROGLIE_PLANCK_CONSTANT /
    (DE_BROGLIE_MAX_MOMENTUM_SCALED / DE_BROGLIE_MOMENTUM_DISPLAY_SCALE)) *
    1e9);

function momentumScaledToWavelengthNm(momentumScaled: number) {
  const momentumKgMs = Math.max(momentumScaled, 1e-9) / DE_BROGLIE_MOMENTUM_DISPLAY_SCALE;
  return (DE_BROGLIE_PLANCK_CONSTANT / momentumKgMs) * 1e9;
}

function wavelengthToFitCount(wavelengthNm: number) {
  return DE_BROGLIE_LOOP_CIRCUMFERENCE_NM / Math.max(wavelengthNm, 1e-9);
}

export function resolveDeBroglieMatterWavesParams(
  params:
    | Partial<DeBroglieMatterWavesParams>
    | Record<string, number | boolean | string>,
): DeBroglieMatterWavesParams {
  return {
    massMultiple: clamp(
      safeNumber(params.massMultiple, 1),
      DE_BROGLIE_MIN_MASS_MULTIPLE,
      DE_BROGLIE_MAX_MASS_MULTIPLE,
    ),
    speedMms: clamp(
      safeNumber(params.speedMms, 2.2),
      DE_BROGLIE_MIN_SPEED_MMS,
      DE_BROGLIE_MAX_SPEED_MMS,
    ),
  };
}

export function resolveDeBroglieSpeedFromMomentumScaled(
  momentumScaled: number,
  massMultiple: number,
) {
  const safeMass = clamp(
    massMultiple,
    DE_BROGLIE_MIN_MASS_MULTIPLE,
    DE_BROGLIE_MAX_MASS_MULTIPLE,
  );

  return clamp(
    momentumScaled / (DE_BROGLIE_MOMENTUM_PER_MASS_SPEED * safeMass),
    DE_BROGLIE_MIN_SPEED_MMS,
    DE_BROGLIE_MAX_SPEED_MMS,
  );
}

export function sampleDeBroglieMatterWavesState(
  params:
    | Partial<DeBroglieMatterWavesParams>
    | Record<string, number | boolean | string>,
): DeBroglieMatterWavesSnapshot {
  const resolved = resolveDeBroglieMatterWavesParams(params);
  const massKg = resolved.massMultiple * DE_BROGLIE_ELECTRON_MASS_KG;
  const speedMps = resolved.speedMms * DE_BROGLIE_MMS_TO_MPS;
  const momentumKgMs = massKg * speedMps;
  const momentumScaled = momentumKgMs * DE_BROGLIE_MOMENTUM_DISPLAY_SCALE;
  const wavelengthNm = momentumScaledToWavelengthNm(momentumScaled);
  const fitCount = wavelengthToFitCount(wavelengthNm);
  const nearestWholeFit = Math.max(1, Math.round(fitCount));
  const fitError = fitCount - nearestWholeFit;
  const fitErrorAbs = Math.abs(fitError);
  const isNearWholeNumberFit = fitErrorAbs <= 0.08;

  return {
    massMultiple: resolved.massMultiple,
    speedMms: resolved.speedMms,
    massKg,
    speedMps,
    speedFractionC: speedMps / DE_BROGLIE_LIGHT_SPEED_MPS,
    momentumKgMs,
    momentumScaled,
    wavelengthNm,
    stripLengthNm: DE_BROGLIE_STRIP_LENGTH_NM,
    loopCircumferenceNm: DE_BROGLIE_LOOP_CIRCUMFERENCE_NM,
    fitCount,
    nearestWholeFit,
    fitError,
    fitErrorAbs,
    seamMismatchNm: fitErrorAbs * wavelengthNm,
    localCyclesOnStrip: DE_BROGLIE_STRIP_LENGTH_NM / Math.max(wavelengthNm, 1e-9),
    isNearWholeNumberFit,
    fitLabel:
      fitCount < 0.96
        ? "less-than-one-wave"
        : isNearWholeNumberFit
          ? "near-whole-number"
          : "between-whole-numbers",
  };
}

export function buildDeBroglieMatterWavesSeries(): GraphSeriesMap {
  const momentumSamples = sampleRange(
    DE_BROGLIE_MIN_MOMENTUM_SCALED,
    DE_BROGLIE_MAX_MOMENTUM_SCALED,
    DE_BROGLIE_GRAPH_SAMPLES,
  );

  return {
    "wavelength-momentum": [
      buildSeries(
        "matter-wavelength",
        "Matter wavelength",
        momentumSamples.map((momentumScaled) => ({
          x: momentumScaled,
          y: momentumScaledToWavelengthNm(momentumScaled),
        })),
        "#4ea6df",
      ),
    ],
    "loop-fit": [
      buildSeries(
        "fit-count",
        "Whole-loop fit",
        momentumSamples.map((momentumScaled) => {
          const wavelengthNm = momentumScaledToWavelengthNm(momentumScaled);
          return {
            x: momentumScaled,
            y: wavelengthToFitCount(wavelengthNm),
          };
        }),
        "#1ea6a2",
      ),
    ],
  };
}

export function describeDeBroglieMatterWavesState(
  params:
    | Partial<DeBroglieMatterWavesParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleDeBroglieMatterWavesState(params);
  const fitSentence = snapshot.isNearWholeNumberFit
    ? `That is close to a whole-number fit of n = ${snapshot.nearestWholeFit}, so the loop seam nearly closes after ${snapshot.nearestWholeFit} wavelengths.`
    : snapshot.fitCount < 1
      ? "That wavelength is longer than the fixed loop, so less than one full cycle fits around the path."
      : `That gives about ${formatNumber(snapshot.fitCount)} wavelengths around the loop, leaving a seam mismatch of ${formatMeasurement(snapshot.seamMismatchNm, "nm")} instead of a clean whole-number closure.`;

  return `A ${formatNumber(snapshot.massMultiple)} m_e particle moving at ${formatMeasurement(snapshot.speedMms, "Mm/s")} has momentum ${formatNumber(snapshot.momentumScaled)} x10^-24 kg m/s, so its de Broglie wavelength is ${formatMeasurement(snapshot.wavelengthNm, "nm")}. ${fitSentence} This page keeps that bridge bounded and non-relativistic: momentum changes the wavelength, and whole-number loop fits are used only as an intuition-first hint toward quantum behavior.`;
}
