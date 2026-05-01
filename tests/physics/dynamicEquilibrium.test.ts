import { describe, expect, it } from "vitest";
import {
  buildDynamicEquilibriumSeries,
  describeDynamicEquilibriumState,
  sampleDynamicEquilibriumState,
} from "@/lib/physics";

describe("dynamic equilibrium helpers", () => {
  it("relaxes toward a balanced forward and reverse rate over time", () => {
    const early = sampleDynamicEquilibriumState({
      reactantAmount: 14,
      productAmount: 4,
      productFavor: 1.32,
    }, 0);
    const late = sampleDynamicEquilibriumState({
      reactantAmount: 14,
      productAmount: 4,
      productFavor: 1.32,
    }, 12);

    expect(early.rateGap).toBeGreaterThan(late.rateGap);
    expect(late.rateGap).toBeLessThanOrEqual(0.2);
    expect(late.currentProductShare).toBeGreaterThan(0.5);
  });

  it("builds concentration, rate-balance, and equilibrium-share graphs", () => {
    const series = buildDynamicEquilibriumSeries({
      reactantAmount: 14,
      productAmount: 4,
      productFavor: 1.12,
    });

    expect(series["concentration-history"]).toHaveLength(2);
    expect(series["rate-balance"]).toHaveLength(2);
    expect(series["equilibrium-share"]).toHaveLength(1);
  });

  it("describes the state as dynamic rather than stopped near equilibrium", () => {
    const description = describeDynamicEquilibriumState({
      reactantAmount: 14,
      productAmount: 4,
      productFavor: 1.12,
    }, 12);

    expect(description).toContain("dynamic equilibrium");
    expect(description).toContain("reactant units");
  });

  it("localizes zh-HK graph labels and runtime descriptions", () => {
    const series = buildDynamicEquilibriumSeries(
      {
        reactantAmount: 14,
        productAmount: 4,
        productFavor: 1.12,
      },
      "zh-HK",
    );
    const description = describeDynamicEquilibriumState(
      {
        reactantAmount: 14,
        productAmount: 4,
        productFavor: 1.12,
      },
      12,
      "zh-HK",
    );

    expect(series["concentration-history"][0]?.label).toBe("反應物");
    expect(series["rate-balance"][0]?.label).toBe("正向速率");
    expect(description).toContain("動態平衡");
    expect(description).toContain("反應物單位");
  });
});
