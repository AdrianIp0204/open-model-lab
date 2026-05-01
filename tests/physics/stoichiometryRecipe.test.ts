import { describe, expect, it } from "vitest";
import {
  buildStoichiometryRecipeSeries,
  describeStoichiometryRecipeState,
  sampleStoichiometryRecipeState,
} from "@/lib/physics";

describe("stoichiometry recipe helpers", () => {
  it("treats matched supplies as a balanced recipe run", () => {
    const snapshot = sampleStoichiometryRecipeState({
      reactantAAmount: 10,
      reactantBAmount: 15,
      recipeA: 2,
      recipeB: 3,
      percentYield: 100,
    });

    expect(snapshot.limitingReagent).toBe("balanced");
    expect(snapshot.theoreticalBatches).toBeCloseTo(5);
    expect(snapshot.leftoverReactantA).toBeCloseTo(0);
    expect(snapshot.leftoverReactantB).toBeCloseTo(0);
  });

  it("identifies the limiting reagent and scales actual output with yield", () => {
    const limiting = sampleStoichiometryRecipeState({
      reactantAAmount: 9,
      reactantBAmount: 9,
      recipeA: 2,
      recipeB: 3,
      percentYield: 100,
    });
    const partialYield = sampleStoichiometryRecipeState({
      reactantAAmount: 12,
      reactantBAmount: 18,
      recipeA: 2,
      recipeB: 3,
      percentYield: 75,
    });

    expect(limiting.limitingReagent).toBe("reactant-b");
    expect(limiting.theoreticalBatches).toBeCloseTo(3);
    expect(limiting.leftoverReactantA).toBeCloseTo(3);
    expect(partialYield.theoreticalProductAmount).toBeCloseTo(6);
    expect(partialYield.actualProductAmount).toBeCloseTo(4.5);
    expect(partialYield.yieldGap).toBeCloseTo(1.5);
  });

  it("builds the shared stoichiometry graphs from the same bench state", () => {
    const series = buildStoichiometryRecipeSeries({
      reactantAAmount: 10,
      reactantBAmount: 15,
      recipeA: 2,
      recipeB: 3,
      percentYield: 75,
    });

    expect(series["batches-vs-reactant-a"]).toHaveLength(2);
    expect(series["batches-vs-reactant-b"]).toHaveLength(2);
    expect(series["yield-vs-percent"]).toHaveLength(2);
    expect(series["yield-vs-percent"][1]?.points.at(-1)?.y).toBeCloseTo(5);
  });

  it("describes yield as a shortfall from the same theoretical recipe run", () => {
    const description = describeStoichiometryRecipeState({
      reactantAAmount: 12,
      reactantBAmount: 18,
      recipeA: 2,
      recipeB: 3,
      percentYield: 75,
    });

    expect(description).toContain("2 A + 3 B -> 1 batch");
    expect(description).toContain("75%");
    expect(description).toContain("theoretical");
  });
});
