import type { AppLocale } from "@/i18n/routing";
import { clamp, formatNumber, mapRange, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type SolubilitySaturationParams = {
  soluteAmount?: number;
  solventVolume?: number;
  solubilityLimit?: number;
};

export type SolubilitySaturationSnapshot = {
  soluteAmount: number;
  solventVolume: number;
  solubilityLimit: number;
  capacity: number;
  dissolvedAmount: number;
  excessAmount: number;
  concentration: number;
  saturationRatio: number;
  dissolvedFraction: number;
  saturated: boolean;
  dissolvedParticleCount: number;
  excessParticleCount: number;
  fillFraction: number;
  saturationMargin: number;
};

export const SOLUBILITY_SATURATION_SOLUTE_MIN = 0;
export const SOLUBILITY_SATURATION_SOLUTE_MAX = 18;
export const SOLUBILITY_SATURATION_VOLUME_MIN = 0.8;
export const SOLUBILITY_SATURATION_VOLUME_MAX = 2.8;
export const SOLUBILITY_SATURATION_LIMIT_MIN = 2.6;
export const SOLUBILITY_SATURATION_LIMIT_MAX = 8.4;

const RESPONSE_SAMPLES = 181;

export function resolveSolubilitySaturationParams(
  source: Partial<SolubilitySaturationParams> | Record<string, number | boolean | string>,
): Required<SolubilitySaturationParams> {
  return {
    soluteAmount: clamp(
      safeNumber(source.soluteAmount, 8.4),
      SOLUBILITY_SATURATION_SOLUTE_MIN,
      SOLUBILITY_SATURATION_SOLUTE_MAX,
    ),
    solventVolume: clamp(
      safeNumber(source.solventVolume, 1.4),
      SOLUBILITY_SATURATION_VOLUME_MIN,
      SOLUBILITY_SATURATION_VOLUME_MAX,
    ),
    solubilityLimit: clamp(
      safeNumber(source.solubilityLimit, 5.6),
      SOLUBILITY_SATURATION_LIMIT_MIN,
      SOLUBILITY_SATURATION_LIMIT_MAX,
    ),
  };
}

export function sampleSolubilitySaturationState(
  source: Partial<SolubilitySaturationParams> | Record<string, number | boolean | string>,
): SolubilitySaturationSnapshot {
  const params = resolveSolubilitySaturationParams(source);
  const capacity = params.solubilityLimit * params.solventVolume;
  const dissolvedAmount = Math.min(params.soluteAmount, capacity);
  const excessAmount = Math.max(params.soluteAmount - capacity, 0);
  const concentration = dissolvedAmount / Math.max(params.solventVolume, 0.2);
  const saturationRatio = params.soluteAmount / Math.max(capacity, 0.001);
  const dissolvedFraction =
    params.soluteAmount <= 0 ? 1 : dissolvedAmount / Math.max(params.soluteAmount, 0.001);

  return {
    ...params,
    capacity,
    dissolvedAmount,
    excessAmount,
    concentration,
    saturationRatio,
    dissolvedFraction,
    saturated: excessAmount > 0.01,
    dissolvedParticleCount: Math.max(8, Math.round(dissolvedAmount * 3.1)),
    excessParticleCount: Math.max(0, Math.round(excessAmount * 2.5)),
    fillFraction: mapRange(
      params.solventVolume,
      SOLUBILITY_SATURATION_VOLUME_MIN,
      SOLUBILITY_SATURATION_VOLUME_MAX,
      0.44,
      0.92,
    ),
    saturationMargin: capacity - params.soluteAmount,
  };
}

export function buildSolubilitySaturationSeries(
  source: Partial<SolubilitySaturationParams> | Record<string, number | boolean | string>,
  locale?: AppLocale,
): GraphSeriesMap {
  const resolved = resolveSolubilitySaturationParams(source);
  const isZhHk = locale === "zh-HK";
  const soluteSamples = sampleRange(
    SOLUBILITY_SATURATION_SOLUTE_MIN,
    SOLUBILITY_SATURATION_SOLUTE_MAX,
    RESPONSE_SAMPLES,
  );
  const volumeSamples = sampleRange(
    SOLUBILITY_SATURATION_VOLUME_MIN,
    SOLUBILITY_SATURATION_VOLUME_MAX,
    RESPONSE_SAMPLES,
  );
  const limitSamples = sampleRange(
    SOLUBILITY_SATURATION_LIMIT_MIN,
    SOLUBILITY_SATURATION_LIMIT_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "dissolved-vs-solute": [
      buildSeries(
        "dissolved-vs-solute",
        isZhHk ? "已溶解量" : "Dissolved amount",
        soluteSamples.map((soluteAmount) => {
          const snapshot = sampleSolubilitySaturationState({ ...resolved, soluteAmount });
          return { x: soluteAmount, y: snapshot.dissolvedAmount };
        }),
        "#1ea6a2",
      ),
    ],
    "excess-vs-solute": [
      buildSeries(
        "excess-vs-solute",
        isZhHk ? "過剩固體" : "Excess solid",
        soluteSamples.map((soluteAmount) => {
          const snapshot = sampleSolubilitySaturationState({ ...resolved, soluteAmount });
          return { x: soluteAmount, y: snapshot.excessAmount };
        }),
        "#f0ab3c",
      ),
    ],
    "capacity-vs-solvent": [
      buildSeries(
        "capacity-vs-solvent",
        isZhHk ? "溶解容量" : "Solubility capacity",
        volumeSamples.map((solventVolume) => {
          const snapshot = sampleSolubilitySaturationState({ ...resolved, solventVolume });
          return { x: solventVolume, y: snapshot.capacity };
        }),
        "#4ea6df",
      ),
    ],
    "saturation-vs-limit": [
      buildSeries(
        "saturation-vs-limit",
        isZhHk ? "飽和比例" : "Saturation ratio",
        limitSamples.map((solubilityLimit) => {
          const snapshot = sampleSolubilitySaturationState({ ...resolved, solubilityLimit });
          return { x: solubilityLimit, y: snapshot.saturationRatio };
        }),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeSolubilitySaturationState(
  source: Partial<SolubilitySaturationParams> | Record<string, number | boolean | string>,
  locale?: AppLocale,
) {
  const snapshot = sampleSolubilitySaturationState(source);
  if (locale === "zh-HK") {
    const stateSummary = snapshot.saturated
      ? "溶液現在已經達到飽和，所以在目前條件下必定有一部分溶質無法再溶解。"
      : "溶液目前仍未飽和，所以在這個條件下還可以再溶解更多溶質。";

    return `燒杯中目前有 ${formatNumber(snapshot.dissolvedAmount)} 單位的溶質已經溶解在 ${formatNumber(snapshot.solventVolume)} 單位的溶劑裡。當前溶解度上限是每單位體積 ${formatNumber(snapshot.solubilityLimit)}，所以目前的總容量大約是 ${formatNumber(snapshot.capacity)}。${stateSummary}`;
  }
  const stateSummary = snapshot.saturated
    ? "The solution is saturated, so some solute must remain undissolved at the current conditions."
    : "The solution is still unsaturated, so more solute can still dissolve under the current conditions.";

  return `The beaker holds ${formatNumber(snapshot.dissolvedAmount)} units of dissolved solute in ${formatNumber(snapshot.solventVolume)} units of solvent. The solubility limit is ${formatNumber(snapshot.solubilityLimit)} per volume, so the current capacity is about ${formatNumber(snapshot.capacity)}. ${stateSummary}`;
}
