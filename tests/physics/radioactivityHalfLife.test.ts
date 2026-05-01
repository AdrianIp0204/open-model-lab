import { describe, expect, it } from "vitest";
import {
  buildRadioactivityHalfLifeSeries,
  describeRadioactivityHalfLifeState,
  sampleRadioactivityHalfLifeState,
} from "@/lib/physics";

describe("radioactivity-half-life helpers", () => {
  it("keeps single-nucleus chance distinct from sample-level expectation", () => {
    const single = sampleRadioactivityHalfLifeState(
      {
        sampleSize: 1,
        halfLifeSeconds: 2.4,
      },
      2.4,
    );
    const sample = sampleRadioactivityHalfLifeState(
      {
        sampleSize: 64,
        halfLifeSeconds: 2.4,
      },
      2.4,
    );

    expect(single.survivalProbability).toBeCloseTo(0.5, 6);
    expect(single.actualRemainingCount).toBe(1);
    expect(sample.expectedRemainingCount).toBeCloseTo(32, 6);
    expect(sample.actualRemainingCount).toBe(27);
    expect(sample.halfLifeMarkersSeconds.map((value) => Number(value.toFixed(1)))).toEqual([
      2.4,
      4.8,
      7.2,
      9.6,
      12,
    ]);
  });

  it("builds stepped actual and smooth expected graph series for both graph tabs", () => {
    const series = buildRadioactivityHalfLifeSeries({
      sampleSize: 64,
      halfLifeSeconds: 2.4,
    });

    expect(series["remaining-count"]).toHaveLength(2);
    expect(series["remaining-count"][0]?.id).toBe("actual-remaining");
    expect(series["remaining-count"][1]?.id).toBe("expected-remaining");
    expect(series["remaining-count"][0]?.points[0]).toEqual({ x: 0, y: 64 });
    expect(series["remaining-fraction"]).toHaveLength(2);
    expect(series["remaining-fraction"][0]?.id).toBe("actual-fraction");
    expect(series["remaining-fraction"][1]?.id).toBe("expected-fraction");
  });

  it("describes the probability and regularity story without hiding sample noise", () => {
    const description = describeRadioactivityHalfLifeState(
      {
        sampleSize: 64,
        halfLifeSeconds: 2.4,
      },
      2.4,
    );

    expect(description).toContain("27 of 64 nuclei remain");
    expect(description).toContain("survival probability 50%");
    expect(description).toMatch(/many nuclei|smooth expectation/i);
  });
});
