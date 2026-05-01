import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type BuffersNeutralizationParams = {
  acidAmount?: number;
  baseAmount?: number;
  bufferAmount?: number;
  waterVolume?: number;
};

export type BuffersNeutralizationSnapshot = {
  acidAmount: number;
  baseAmount: number;
  bufferAmount: number;
  waterVolume: number;
  neutralizedAmount: number;
  activeExcess: number;
  bufferUsed: number;
  bufferRemaining: number;
  acidCharacter: number;
  baseCharacter: number;
  acidShare: number;
  baseShare: number;
  pH: number;
  hydroniumCount: number;
  hydroxideCount: number;
};

export const BUFFERS_NEUTRALIZATION_AMOUNT_MIN = 0;
export const BUFFERS_NEUTRALIZATION_AMOUNT_MAX = 10;
export const BUFFERS_NEUTRALIZATION_BUFFER_MIN = 0;
export const BUFFERS_NEUTRALIZATION_BUFFER_MAX = 5;
export const BUFFERS_NEUTRALIZATION_WATER_MIN = 0.8;
export const BUFFERS_NEUTRALIZATION_WATER_MAX = 2.4;

const RESPONSE_SAMPLES = 181;

export function resolveBuffersNeutralizationParams(
  source: Partial<BuffersNeutralizationParams> | Record<string, number | boolean | string>,
): Required<BuffersNeutralizationParams> {
  return {
    acidAmount: clamp(
      safeNumber(source.acidAmount, 5.8),
      BUFFERS_NEUTRALIZATION_AMOUNT_MIN,
      BUFFERS_NEUTRALIZATION_AMOUNT_MAX,
    ),
    baseAmount: clamp(
      safeNumber(source.baseAmount, 4.6),
      BUFFERS_NEUTRALIZATION_AMOUNT_MIN,
      BUFFERS_NEUTRALIZATION_AMOUNT_MAX,
    ),
    bufferAmount: clamp(
      safeNumber(source.bufferAmount, 2.4),
      BUFFERS_NEUTRALIZATION_BUFFER_MIN,
      BUFFERS_NEUTRALIZATION_BUFFER_MAX,
    ),
    waterVolume: clamp(
      safeNumber(source.waterVolume, 1.4),
      BUFFERS_NEUTRALIZATION_WATER_MIN,
      BUFFERS_NEUTRALIZATION_WATER_MAX,
    ),
  };
}

export function sampleBuffersNeutralizationState(
  source: Partial<BuffersNeutralizationParams> | Record<string, number | boolean | string>,
): BuffersNeutralizationSnapshot {
  const params = resolveBuffersNeutralizationParams(source);
  const neutralizedAmount = Math.min(params.acidAmount, params.baseAmount);
  const acidExcess = Math.max(0, params.acidAmount - params.baseAmount);
  const baseExcess = Math.max(0, params.baseAmount - params.acidAmount);
  const activeExcess = Math.max(acidExcess, baseExcess);
  const bufferUsed = Math.min(params.bufferAmount, activeExcess);
  const bufferRemaining = Math.max(0, params.bufferAmount - bufferUsed);
  const bufferedResidual = (Math.min(activeExcess, params.bufferAmount) * 0.18) / Math.max(params.waterVolume, 0.2);
  const effectiveAcid =
    1 +
    Math.max(0, acidExcess - params.bufferAmount) / Math.max(params.waterVolume, 0.2) +
    (acidExcess > 0 ? bufferedResidual : 0);
  const effectiveBase =
    1 +
    Math.max(0, baseExcess - params.bufferAmount) / Math.max(params.waterVolume, 0.2) +
    (baseExcess > 0 ? bufferedResidual : 0);
  const totalCharacter = effectiveAcid + effectiveBase;
  const acidShare = effectiveAcid / Math.max(totalCharacter, 0.001);
  const baseShare = effectiveBase / Math.max(totalCharacter, 0.001);
  const pH = clamp(
    7 + 1.85 * Math.log10(effectiveBase / Math.max(effectiveAcid, 0.001)),
    1,
    13,
  );

  return {
    ...params,
    neutralizedAmount,
    activeExcess,
    bufferUsed,
    bufferRemaining,
    acidCharacter: effectiveAcid,
    baseCharacter: effectiveBase,
    acidShare,
    baseShare,
    pH,
    hydroniumCount: Math.max(8, Math.round(acidShare * 28)),
    hydroxideCount: Math.max(8, Math.round(baseShare * 28)),
  };
}

export function buildBuffersNeutralizationSeries(
  source: Partial<BuffersNeutralizationParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveBuffersNeutralizationParams(source);
  const amountSamples = sampleRange(
    BUFFERS_NEUTRALIZATION_AMOUNT_MIN,
    BUFFERS_NEUTRALIZATION_AMOUNT_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "ph-vs-acid": [
      buildSeries(
        "ph-vs-acid",
        "pH",
        amountSamples.map((acidAmount) => ({
          x: acidAmount,
          y: sampleBuffersNeutralizationState({ ...resolved, acidAmount }).pH,
        })),
        "#f16659",
      ),
    ],
    "buffer-remaining-vs-acid": [
      buildSeries(
        "buffer-remaining-vs-acid",
        "Buffer reserve",
        amountSamples.map((acidAmount) => ({
          x: acidAmount,
          y: sampleBuffersNeutralizationState({ ...resolved, acidAmount }).bufferRemaining,
        })),
        "#1ea6a2",
      ),
    ],
  };
}

export function describeBuffersNeutralizationState(
  source: Partial<BuffersNeutralizationParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleBuffersNeutralizationState(source);
  const balanceSummary =
    snapshot.bufferRemaining > 0 && Math.abs(snapshot.pH - 7) < 0.9
      ? "The buffer is still absorbing the imbalance, so the pH stays near the middle even though the mixture is not unchanged."
      : snapshot.pH < 6
        ? "The acid side is now pushing past the available buffer reserve, so the pH shifts clearly downward."
        : snapshot.pH > 8
          ? "The base side is now pushing past the available buffer reserve, so the pH shifts clearly upward."
          : "The mixture sits near neutral because direct neutralization and the remaining buffer reserve keep the imbalance small.";

  return `The mixture uses ${formatNumber(snapshot.neutralizedAmount)} units in direct neutralization, keeps about ${formatNumber(snapshot.bufferRemaining)} units of buffer reserve, and sits near pH ${formatNumber(snapshot.pH)}. ${balanceSummary}`;
}
