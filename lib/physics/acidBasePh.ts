import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type AcidBasePhParams = {
  acidAmount?: number;
  baseAmount?: number;
  waterVolume?: number;
};

export type AcidBasePhSnapshot = {
  acidAmount: number;
  baseAmount: number;
  waterVolume: number;
  acidCharacter: number;
  baseCharacter: number;
  acidShare: number;
  baseShare: number;
  pH: number;
  hydroniumCount: number;
  hydroxideCount: number;
};

export const ACID_BASE_AMOUNT_MIN = 0;
export const ACID_BASE_AMOUNT_MAX = 10;
export const ACID_BASE_WATER_MIN = 0.8;
export const ACID_BASE_WATER_MAX = 2.4;

const RESPONSE_SAMPLES = 181;

export function resolveAcidBasePhParams(
  source: Partial<AcidBasePhParams> | Record<string, number | boolean | string>,
): Required<AcidBasePhParams> {
  return {
    acidAmount: clamp(
      safeNumber(source.acidAmount, 4.2),
      ACID_BASE_AMOUNT_MIN,
      ACID_BASE_AMOUNT_MAX,
    ),
    baseAmount: clamp(
      safeNumber(source.baseAmount, 3.1),
      ACID_BASE_AMOUNT_MIN,
      ACID_BASE_AMOUNT_MAX,
    ),
    waterVolume: clamp(
      safeNumber(source.waterVolume, 1.4),
      ACID_BASE_WATER_MIN,
      ACID_BASE_WATER_MAX,
    ),
  };
}

export function sampleAcidBasePhState(
  source: Partial<AcidBasePhParams> | Record<string, number | boolean | string>,
): AcidBasePhSnapshot {
  const params = resolveAcidBasePhParams(source);
  const acidCharacter = 1 + params.acidAmount / Math.max(params.waterVolume, 0.2);
  const baseCharacter = 1 + params.baseAmount / Math.max(params.waterVolume, 0.2);
  const totalCharacter = acidCharacter + baseCharacter;
  const acidShare = acidCharacter / Math.max(totalCharacter, 0.001);
  const baseShare = baseCharacter / Math.max(totalCharacter, 0.001);
  const pH = clamp(
    7 + 1.6 * Math.log10(baseCharacter / Math.max(acidCharacter, 0.001)),
    1,
    13,
  );

  return {
    ...params,
    acidCharacter,
    baseCharacter,
    acidShare,
    baseShare,
    pH,
    hydroniumCount: Math.max(8, Math.round(acidShare * 28)),
    hydroxideCount: Math.max(8, Math.round(baseShare * 28)),
  };
}

export function buildAcidBasePhSeries(
  source: Partial<AcidBasePhParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveAcidBasePhParams(source);
  const amountSamples = sampleRange(ACID_BASE_AMOUNT_MIN, ACID_BASE_AMOUNT_MAX, RESPONSE_SAMPLES);

  return {
    "ph-vs-acid": [
      buildSeries(
        "ph-vs-acid",
        "pH",
        amountSamples.map((acidAmount) => ({
          x: acidAmount,
          y: sampleAcidBasePhState({ ...resolved, acidAmount }).pH,
        })),
        "#f16659",
      ),
    ],
    "ph-vs-base": [
      buildSeries(
        "ph-vs-base",
        "pH",
        amountSamples.map((baseAmount) => ({
          x: baseAmount,
          y: sampleAcidBasePhState({ ...resolved, baseAmount }).pH,
        })),
        "#4ea6df",
      ),
    ],
  };
}

export function describeAcidBasePhState(
  source: Partial<AcidBasePhParams> | Record<string, number | boolean | string>,
  locale?: AppLocale,
) {
  const snapshot = sampleAcidBasePhState(source);
  if (locale === "zh-HK") {
    const characterSummary =
      snapshot.pH < 6
        ? "這份混合物偏酸，因為 H+ 特性仍然比 OH- 特性更強。"
        : snapshot.pH > 8
          ? "這份混合物偏鹼，因為 OH- 特性已經比 H+ 特性更明顯。"
          : "這份混合物接近中性，因為酸與鹼的特性仍然相當接近。";

    return `目前混合物大約位於 pH ${formatNumber(snapshot.pH)}，其中酸性比例約為 ${formatNumber(snapshot.acidShare * 100)}%，鹼性比例約為 ${formatNumber(snapshot.baseShare * 100)}%。${characterSummary}`;
  }

  const characterSummary =
    snapshot.pH < 6
      ? "The mixture leans acidic because the H+ character is stronger than the OH- character."
      : snapshot.pH > 8
        ? "The mixture leans basic because the OH- character is stronger than the H+ character."
        : "The mixture sits near neutral because the acid and base character are close together.";

  return `The current mixture sits near pH ${formatNumber(snapshot.pH)} with acid share ${formatNumber(snapshot.acidShare * 100)}% and base share ${formatNumber(snapshot.baseShare * 100)}%. ${characterSummary}`;
}
