import { describe, expect, it } from "vitest";
import {
  buildSolubilitySaturationSeries,
  describeSolubilitySaturationState,
  sampleSolubilitySaturationState,
} from "@/lib/physics";

describe("solubility and saturation helpers", () => {
  it("keeps dissolved amount capped by the current capacity and sends the rest into excess solid", () => {
    const snapshot = sampleSolubilitySaturationState({
      soluteAmount: 12,
      solventVolume: 1.2,
      solubilityLimit: 5,
    });

    expect(snapshot.capacity).toBeCloseTo(6);
    expect(snapshot.dissolvedAmount).toBeCloseTo(6);
    expect(snapshot.excessAmount).toBeCloseTo(6);
    expect(snapshot.saturated).toBe(true);
  });

  it("builds separate response graphs for dissolved amount, excess solid, and current capacity", () => {
    const series = buildSolubilitySaturationSeries({
      soluteAmount: 8,
      solventVolume: 1.5,
      solubilityLimit: 5.4,
    });

    expect(series["dissolved-vs-solute"]).toHaveLength(1);
    expect(series["excess-vs-solute"]).toHaveLength(1);
    expect(series["capacity-vs-solvent"]).toHaveLength(1);
    expect(series["saturation-vs-limit"]).toHaveLength(1);
  });

  it("describes saturation as a current limit rather than a concentration slogan", () => {
    const description = describeSolubilitySaturationState({
      soluteAmount: 10.8,
      solventVolume: 1.5,
      solubilityLimit: 5.4,
    });

    expect(description).toContain("solubility limit");
    expect(description).toContain("capacity");
    expect(description).toContain("saturated");
  });
});
