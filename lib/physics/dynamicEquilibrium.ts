import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type DynamicEquilibriumParams = {
  reactantAmount?: number;
  productAmount?: number;
  productFavor?: number;
};

export type DynamicEquilibriumSnapshot = {
  reactantAmount: number;
  productAmount: number;
  productFavor: number;
  totalAmount: number;
  equilibriumReactantAmount: number;
  equilibriumProductAmount: number;
  currentReactantAmount: number;
  currentProductAmount: number;
  forwardRate: number;
  reverseRate: number;
  netRate: number;
  rateGap: number;
  currentProductShare: number;
  equilibriumProductShare: number;
  reactantParticleCount: number;
  productParticleCount: number;
};

export const DYNAMIC_EQUILIBRIUM_AMOUNT_MIN = 3;
export const DYNAMIC_EQUILIBRIUM_AMOUNT_MAX = 18;
export const DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MIN = 0.75;
export const DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MAX = 1.45;
export const DYNAMIC_EQUILIBRIUM_TOTAL_TIME = 12;

const RESPONSE_SAMPLES = 181;
const BASE_RATE_CONSTANT = 0.2;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export function resolveDynamicEquilibriumParams(
  source: Partial<DynamicEquilibriumParams> | Record<string, number | boolean | string>,
): Required<DynamicEquilibriumParams> {
  return {
    reactantAmount: clamp(
      safeNumber(source.reactantAmount, 14),
      DYNAMIC_EQUILIBRIUM_AMOUNT_MIN,
      DYNAMIC_EQUILIBRIUM_AMOUNT_MAX,
    ),
    productAmount: clamp(
      safeNumber(source.productAmount, 4),
      DYNAMIC_EQUILIBRIUM_AMOUNT_MIN,
      DYNAMIC_EQUILIBRIUM_AMOUNT_MAX,
    ),
    productFavor: clamp(
      safeNumber(source.productFavor, 1.12),
      DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MIN,
      DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MAX,
    ),
  };
}

function resolveEquilibriumShares(productFavor: number) {
  const forwardConstant = BASE_RATE_CONSTANT * productFavor;
  const reverseConstant = BASE_RATE_CONSTANT / productFavor;
  const denominator = forwardConstant + reverseConstant;
  const equilibriumProductShare = denominator <= 0 ? 0.5 : forwardConstant / denominator;

  return {
    forwardConstant,
    reverseConstant,
    equilibriumProductShare,
  };
}

export function sampleDynamicEquilibriumState(
  source: Partial<DynamicEquilibriumParams> | Record<string, number | boolean | string>,
  time = 0,
): DynamicEquilibriumSnapshot {
  const params = resolveDynamicEquilibriumParams(source);
  const totalAmount = params.reactantAmount + params.productAmount;
  const { forwardConstant, reverseConstant, equilibriumProductShare } =
    resolveEquilibriumShares(params.productFavor);
  const equilibriumProductAmount = totalAmount * equilibriumProductShare;
  const equilibriumReactantAmount = totalAmount - equilibriumProductAmount;
  const relaxationRate = forwardConstant + reverseConstant;
  const clampedTime = clamp(time, 0, DYNAMIC_EQUILIBRIUM_TOTAL_TIME);
  const currentProductAmount =
    equilibriumProductAmount +
    (params.productAmount - equilibriumProductAmount) * Math.exp(-relaxationRate * clampedTime);
  const currentReactantAmount = totalAmount - currentProductAmount;
  const forwardRate = forwardConstant * currentReactantAmount;
  const reverseRate = reverseConstant * currentProductAmount;
  const netRate = forwardRate - reverseRate;
  const rateGap = Math.abs(netRate);
  const currentProductShare = currentProductAmount / Math.max(totalAmount, 0.001);

  return {
    ...params,
    totalAmount,
    equilibriumReactantAmount,
    equilibriumProductAmount,
    currentReactantAmount,
    currentProductAmount,
    forwardRate,
    reverseRate,
    netRate,
    rateGap,
    currentProductShare,
    equilibriumProductShare,
    reactantParticleCount: Math.max(6, Math.round(currentReactantAmount)),
    productParticleCount: Math.max(6, Math.round(currentProductAmount)),
  };
}

export function buildDynamicEquilibriumSeries(
  source: Partial<DynamicEquilibriumParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolveDynamicEquilibriumParams(source);
  const timeSamples = sampleRange(0, DYNAMIC_EQUILIBRIUM_TOTAL_TIME, 241);
  const favorSamples = sampleRange(
    DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MIN,
    DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "concentration-history": [
      buildSeries(
        "reactants",
        copyText(locale, "Reactants", "反應物"),
        timeSamples.map((time) => ({
          x: time,
          y: sampleDynamicEquilibriumState(resolved, time).currentReactantAmount,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "products",
        copyText(locale, "Products", "生成物"),
        timeSamples.map((time) => ({
          x: time,
          y: sampleDynamicEquilibriumState(resolved, time).currentProductAmount,
        })),
        "#f16659",
      ),
    ],
    "rate-balance": [
      buildSeries(
        "forward-rate",
        copyText(locale, "Forward rate", "正向速率"),
        timeSamples.map((time) => ({
          x: time,
          y: sampleDynamicEquilibriumState(resolved, time).forwardRate,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "reverse-rate",
        copyText(locale, "Reverse rate", "逆向速率"),
        timeSamples.map((time) => ({
          x: time,
          y: sampleDynamicEquilibriumState(resolved, time).reverseRate,
        })),
        "#f0ab3c",
      ),
    ],
    "equilibrium-share": [
      buildSeries(
        "product-share",
        copyText(locale, "Product share at equilibrium", "平衡時的生成物比例"),
        favorSamples.map((productFavor) => ({
          x: productFavor,
          y: sampleDynamicEquilibriumState({
            ...resolved,
            productFavor,
          }).equilibriumProductShare,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describeDynamicEquilibriumState(
  source: Partial<DynamicEquilibriumParams> | Record<string, number | boolean | string>,
  time = 0,
  locale: AppLocale = "en",
) {
  const snapshot = sampleDynamicEquilibriumState(source, time);
  const balanceSummary =
    snapshot.rateGap <= 0.12
      ? copyText(
          locale,
          "Forward and reverse changes are now almost matched, so the mixture is at dynamic equilibrium rather than stopped.",
          "正向和逆向變化現在幾乎一樣，因此這個混合物進入了動態平衡，而不是完全停止。",
        )
      : snapshot.netRate > 0
        ? copyText(
            locale,
            "Forward change is still winning, so the mixture is shifting toward more products.",
            "正向變化仍然較強，所以混合物正朝向更多生成物移動。",
          )
        : copyText(
            locale,
            "Reverse change is still winning, so the mixture is shifting back toward more reactants.",
            "逆向變化仍然較強，所以混合物正往較多反應物的方向回移。",
          );
  const favorSummary =
    snapshot.productFavor >= 1.2
      ? copyText(
          locale,
          "The current conditions favor the product side once the system settles.",
          "目前條件會在系統穩定後偏向生成物一側。",
        )
      : snapshot.productFavor <= 0.9
        ? copyText(
            locale,
            "The current conditions favor the reactant side once the system settles.",
            "目前條件會在系統穩定後偏向反應物一側。",
          )
        : copyText(
            locale,
            "The current conditions only lean gently toward one side, so the settled mixture stays more balanced.",
            "目前條件只輕微偏向其中一側，因此穩定後的混合物會較為平均。",
          );

  return copyText(
    locale,
    `At t = ${formatNumber(clamp(time, 0, DYNAMIC_EQUILIBRIUM_TOTAL_TIME))} s, the mixture shows about ${formatNumber(snapshot.currentReactantAmount)} reactant units and ${formatNumber(snapshot.currentProductAmount)} product units. ${balanceSummary} ${favorSummary}`,
    `在 t = ${formatNumber(clamp(time, 0, DYNAMIC_EQUILIBRIUM_TOTAL_TIME))} s 時，混合物大約有 ${formatNumber(snapshot.currentReactantAmount)} 個反應物單位和 ${formatNumber(snapshot.currentProductAmount)} 個生成物單位。${balanceSummary}${favorSummary}`,
  );
}
