import { buildSeries } from "./series";
import { clamp, formatNumber, mapRange, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type ConcentrationDilutionParams = {
  soluteAmount?: number;
  solventVolume?: number;
};

export type ConcentrationDilutionSnapshot = {
  soluteAmount: number;
  solventVolume: number;
  concentration: number;
  particleCount: number;
  fillFraction: number;
  particleDensity: number;
};

export const CONCENTRATION_DILUTION_SOLUTE_MIN = 2;
export const CONCENTRATION_DILUTION_SOLUTE_MAX = 16;
export const CONCENTRATION_DILUTION_VOLUME_MIN = 0.8;
export const CONCENTRATION_DILUTION_VOLUME_MAX = 2.8;

const RESPONSE_SAMPLES = 181;

export function resolveConcentrationDilutionParams(
  source: Partial<ConcentrationDilutionParams> | Record<string, number | boolean | string>,
): Required<ConcentrationDilutionParams> {
  return {
    soluteAmount: clamp(
      safeNumber(source.soluteAmount, 8),
      CONCENTRATION_DILUTION_SOLUTE_MIN,
      CONCENTRATION_DILUTION_SOLUTE_MAX,
    ),
    solventVolume: clamp(
      safeNumber(source.solventVolume, 1.4),
      CONCENTRATION_DILUTION_VOLUME_MIN,
      CONCENTRATION_DILUTION_VOLUME_MAX,
    ),
  };
}

export function sampleConcentrationDilutionState(
  source: Partial<ConcentrationDilutionParams> | Record<string, number | boolean | string>,
): ConcentrationDilutionSnapshot {
  const params = resolveConcentrationDilutionParams(source);
  const concentration = params.soluteAmount / Math.max(params.solventVolume, 0.2);

  return {
    ...params,
    concentration,
    particleCount: Math.max(10, Math.round(params.soluteAmount * 3.6)),
    fillFraction: mapRange(
      params.solventVolume,
      CONCENTRATION_DILUTION_VOLUME_MIN,
      CONCENTRATION_DILUTION_VOLUME_MAX,
      0.42,
      0.92,
    ),
    particleDensity: concentration / 6.8,
  };
}

export function buildConcentrationDilutionSeries(
  source: Partial<ConcentrationDilutionParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveConcentrationDilutionParams(source);
  const volumeSamples = sampleRange(
    CONCENTRATION_DILUTION_VOLUME_MIN,
    CONCENTRATION_DILUTION_VOLUME_MAX,
    RESPONSE_SAMPLES,
  );
  const soluteSamples = sampleRange(
    CONCENTRATION_DILUTION_SOLUTE_MIN,
    CONCENTRATION_DILUTION_SOLUTE_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "concentration-vs-solvent": [
      buildSeries(
        "concentration-vs-solvent",
        "Concentration",
        volumeSamples.map((solventVolume) => ({
          x: solventVolume,
          y: sampleConcentrationDilutionState({ ...resolved, solventVolume }).concentration,
        })),
        "#4ea6df",
      ),
    ],
    "concentration-vs-solute": [
      buildSeries(
        "concentration-vs-solute",
        "Concentration",
        soluteSamples.map((soluteAmount) => ({
          x: soluteAmount,
          y: sampleConcentrationDilutionState({ ...resolved, soluteAmount }).concentration,
        })),
        "#1ea6a2",
      ),
    ],
  };
}

export function describeConcentrationDilutionState(
  source: Partial<ConcentrationDilutionParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleConcentrationDilutionState(source);
  const densitySummary =
    snapshot.concentration >= 6
      ? "The beaker is crowded, so the same volume holds a lot of solute."
      : snapshot.concentration <= 3.4
        ? "The beaker is more dilute, so the same amount of solute is spread through more liquid."
        : "The beaker sits in a middle concentration range where both solute amount and liquid volume still matter visibly.";

  return `The mixture holds ${formatNumber(snapshot.soluteAmount)} units of solute in ${formatNumber(snapshot.solventVolume)} units of solvent, giving a concentration of about ${formatNumber(snapshot.concentration)}. ${densitySummary}`;
}
