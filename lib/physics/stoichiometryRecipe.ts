import { clamp, formatNumber, safeNumber } from "./math";
import { buildSeries } from "./series";
import type { GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";

export type StoichiometryRecipeParams = {
  reactantAAmount?: number;
  reactantBAmount?: number;
  recipeA?: number;
  recipeB?: number;
  percentYield?: number;
};

export type StoichiometryLimitingReagent =
  | "reactant-a"
  | "reactant-b"
  | "balanced";

export type StoichiometryRecipeSnapshot = {
  reactantAAmount: number;
  reactantBAmount: number;
  recipeA: number;
  recipeB: number;
  percentYield: number;
  requiredBPerA: number;
  availableBPerA: number;
  maxBatchesFromA: number;
  maxBatchesFromB: number;
  theoreticalBatches: number;
  actualBatches: number;
  reactionExtent: number;
  theoreticalProductAmount: number;
  actualProductAmount: number;
  yieldGap: number;
  usedReactantA: number;
  usedReactantB: number;
  leftoverReactantA: number;
  leftoverReactantB: number;
  theoreticalLeftoverA: number;
  theoreticalLeftoverB: number;
  limitingReagent: StoichiometryLimitingReagent;
  batchMargin: number;
  reactantAParticleCount: number;
  reactantBParticleCount: number;
  productParticleCount: number;
};

export const STOICHIOMETRY_RECIPE_AMOUNT_MIN = 2;
export const STOICHIOMETRY_RECIPE_AMOUNT_MAX = 18;
export const STOICHIOMETRY_RECIPE_COEFFICIENT_MIN = 1;
export const STOICHIOMETRY_RECIPE_COEFFICIENT_MAX = 4;
export const STOICHIOMETRY_RECIPE_YIELD_PERCENT_MIN = 40;
export const STOICHIOMETRY_RECIPE_YIELD_PERCENT_MAX = 100;

const YIELD_STEP = 5;
const BALANCE_EPSILON = 0.05;

const amountSamples = Array.from(
  { length: STOICHIOMETRY_RECIPE_AMOUNT_MAX - STOICHIOMETRY_RECIPE_AMOUNT_MIN + 1 },
  (_, index) => STOICHIOMETRY_RECIPE_AMOUNT_MIN + index,
);

const yieldSamples = Array.from(
  {
    length:
      (STOICHIOMETRY_RECIPE_YIELD_PERCENT_MAX -
        STOICHIOMETRY_RECIPE_YIELD_PERCENT_MIN) /
        YIELD_STEP +
      1,
  },
  (_, index) => STOICHIOMETRY_RECIPE_YIELD_PERCENT_MIN + index * YIELD_STEP,
);

function roundToInteger(value: number) {
  return Math.round(value);
}

function resolveLimitingReagent(
  maxBatchesFromA: number,
  maxBatchesFromB: number,
): StoichiometryLimitingReagent {
  if (Math.abs(maxBatchesFromA - maxBatchesFromB) <= BALANCE_EPSILON) {
    return "balanced";
  }

  return maxBatchesFromA < maxBatchesFromB ? "reactant-a" : "reactant-b";
}

export function resolveStoichiometryRecipeParams(
  source: Partial<StoichiometryRecipeParams> | Record<string, number | boolean | string>,
): Required<StoichiometryRecipeParams> {
  return {
    reactantAAmount: clamp(
      roundToInteger(safeNumber(source.reactantAAmount, 10)),
      STOICHIOMETRY_RECIPE_AMOUNT_MIN,
      STOICHIOMETRY_RECIPE_AMOUNT_MAX,
    ),
    reactantBAmount: clamp(
      roundToInteger(safeNumber(source.reactantBAmount, 15)),
      STOICHIOMETRY_RECIPE_AMOUNT_MIN,
      STOICHIOMETRY_RECIPE_AMOUNT_MAX,
    ),
    recipeA: clamp(
      roundToInteger(safeNumber(source.recipeA, 2)),
      STOICHIOMETRY_RECIPE_COEFFICIENT_MIN,
      STOICHIOMETRY_RECIPE_COEFFICIENT_MAX,
    ),
    recipeB: clamp(
      roundToInteger(safeNumber(source.recipeB, 3)),
      STOICHIOMETRY_RECIPE_COEFFICIENT_MIN,
      STOICHIOMETRY_RECIPE_COEFFICIENT_MAX,
    ),
    percentYield: clamp(
      roundToInteger(safeNumber(source.percentYield, 100)),
      STOICHIOMETRY_RECIPE_YIELD_PERCENT_MIN,
      STOICHIOMETRY_RECIPE_YIELD_PERCENT_MAX,
    ),
  };
}

export function sampleStoichiometryRecipeState(
  source: Partial<StoichiometryRecipeParams> | Record<string, number | boolean | string>,
): StoichiometryRecipeSnapshot {
  const params = resolveStoichiometryRecipeParams(source);
  const maxBatchesFromA = params.reactantAAmount / Math.max(params.recipeA, 1);
  const maxBatchesFromB = params.reactantBAmount / Math.max(params.recipeB, 1);
  const limitingReagent = resolveLimitingReagent(maxBatchesFromA, maxBatchesFromB);
  const theoreticalBatches = Math.min(maxBatchesFromA, maxBatchesFromB);
  const reactionExtent = params.percentYield / 100;
  const actualBatches = theoreticalBatches * reactionExtent;
  const usedReactantA = actualBatches * params.recipeA;
  const usedReactantB = actualBatches * params.recipeB;

  return {
    ...params,
    requiredBPerA: params.recipeB / Math.max(params.recipeA, 0.001),
    availableBPerA: params.reactantBAmount / Math.max(params.reactantAAmount, 0.001),
    maxBatchesFromA,
    maxBatchesFromB,
    theoreticalBatches,
    actualBatches,
    reactionExtent,
    theoreticalProductAmount: theoreticalBatches,
    actualProductAmount: actualBatches,
    yieldGap: Math.max(0, theoreticalBatches - actualBatches),
    usedReactantA,
    usedReactantB,
    leftoverReactantA: Math.max(0, params.reactantAAmount - usedReactantA),
    leftoverReactantB: Math.max(0, params.reactantBAmount - usedReactantB),
    theoreticalLeftoverA: Math.max(0, params.reactantAAmount - theoreticalBatches * params.recipeA),
    theoreticalLeftoverB: Math.max(0, params.reactantBAmount - theoreticalBatches * params.recipeB),
    limitingReagent,
    batchMargin: Math.abs(maxBatchesFromA - maxBatchesFromB),
    reactantAParticleCount: Math.max(8, Math.round(params.reactantAAmount * 2.9)),
    reactantBParticleCount: Math.max(8, Math.round(params.reactantBAmount * 2.9)),
    productParticleCount: Math.max(6, Math.round(actualBatches * 9)),
  };
}

export function buildStoichiometryRecipeSeries(
  source: Partial<StoichiometryRecipeParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolveStoichiometryRecipeParams(source);
  const aCap = resolved.reactantBAmount / Math.max(resolved.recipeB, 1);
  const bCap = resolved.reactantAAmount / Math.max(resolved.recipeA, 1);
  const yieldReference = sampleStoichiometryRecipeState(resolved).theoreticalProductAmount;

  return {
    "batches-vs-reactant-a": [
      buildSeries(
        "possible-batches",
        copyText(locale, "Possible batches", "可形成批次"),
        amountSamples.map((reactantAAmount) => ({
          x: reactantAAmount,
          y: sampleStoichiometryRecipeState({
            ...resolved,
            reactantAAmount,
            percentYield: 100,
          }).theoreticalBatches,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "reactant-b-cap",
        copyText(locale, "B supply cap", "B 供應上限"),
        amountSamples.map((reactantAAmount) => ({
          x: reactantAAmount,
          y: aCap,
        })),
        "#f0ab3c",
        true,
      ),
    ],
    "batches-vs-reactant-b": [
      buildSeries(
        "possible-batches",
        copyText(locale, "Possible batches", "可形成批次"),
        amountSamples.map((reactantBAmount) => ({
          x: reactantBAmount,
          y: sampleStoichiometryRecipeState({
            ...resolved,
            reactantBAmount,
            percentYield: 100,
          }).theoreticalBatches,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "reactant-a-cap",
        copyText(locale, "A supply cap", "A 供應上限"),
        amountSamples.map((reactantBAmount) => ({
          x: reactantBAmount,
          y: bCap,
        })),
        "#1ea6a2",
        true,
      ),
    ],
    "yield-vs-percent": [
      buildSeries(
        "actual-product",
        copyText(locale, "Actual product", "實際產物"),
        yieldSamples.map((percentYield) => ({
          x: percentYield,
          y: sampleStoichiometryRecipeState({
            ...resolved,
            percentYield,
          }).actualProductAmount,
        })),
        "#f16659",
      ),
      buildSeries(
        "theoretical-product",
        copyText(locale, "Theoretical product", "理論產物"),
        yieldSamples.map((percentYield) => ({
          x: percentYield,
          y: yieldReference,
        })),
        "#4ea6df",
        true,
      ),
    ],
  };
}

export function describeStoichiometryRecipeState(
  source: Partial<StoichiometryRecipeParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
) {
  const snapshot = sampleStoichiometryRecipeState(source);
  const recipeSummary =
    locale === "zh-HK"
      ? `${snapshot.recipeA} 份 A + ${snapshot.recipeB} 份 B → 1 批產物`
      : `${snapshot.recipeA} A + ${snapshot.recipeB} B -> 1 batch`;
  const limitingSummary =
    snapshot.limitingReagent === "balanced"
      ? copyText(locale, "The supplies match the recipe closely, so neither reactant runs out first.", "供應量與配方相當接近，所以兩種反應物都不會先耗盡。")
      : snapshot.limitingReagent === "reactant-a"
        ? copyText(locale, "Reactant A runs out first, so extra B remains after the last full batch.", "反應物 A 會先耗盡，所以完成最後一批後仍會剩下 B。")
        : copyText(locale, "Reactant B runs out first, so extra A remains after the last full batch.", "反應物 B 會先耗盡，所以完成最後一批後仍會剩下 A。");
  const yieldSummary =
    snapshot.percentYield >= 100
      ? copyText(locale, "At full yield, the actual output reaches the theoretical batch count.", "在 100% 產率下，實際產量會達到理論批次數。")
      : locale === "zh-HK"
        ? `在 ${formatNumber(snapshot.percentYield)}% 產率下，只會完成 ${formatNumber(snapshot.theoreticalProductAmount)} 個理論批次中的 ${formatNumber(snapshot.actualProductAmount)} 個。`
        : `At ${formatNumber(snapshot.percentYield)}% yield, only ${formatNumber(snapshot.actualProductAmount)} of the ${formatNumber(snapshot.theoreticalProductAmount)} theoretical batches finish.`;

  if (locale === "zh-HK") {
    return `目前配方是 ${recipeSummary}。在 ${formatNumber(snapshot.reactantAAmount)} 份 A 和 ${formatNumber(snapshot.reactantBAmount)} 份 B 下，這次反應大約可支持 ${formatNumber(snapshot.theoreticalBatches)} 個完整批次。${limitingSummary}${yieldSummary}`;
  }

  return `The current recipe is ${recipeSummary}. With ${formatNumber(snapshot.reactantAAmount)} A and ${formatNumber(snapshot.reactantBAmount)} B, the run can support about ${formatNumber(snapshot.theoreticalBatches)} full batches. ${limitingSummary} ${yieldSummary}`;
}
