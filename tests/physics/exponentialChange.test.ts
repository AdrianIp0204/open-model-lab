import { describe, expect, it } from "vitest";
import {
  buildExponentialChangeSeries,
  describeExponentialChangeState,
  sampleExponentialChangeState,
} from "@/lib/physics";

describe("exponential-change helpers", () => {
  it("solves target time and fixed cadence for both growth and decay", () => {
    const growth = sampleExponentialChangeState({
      initialValue: 3,
      rate: 0.25,
      targetValue: 12,
    });
    const decay = sampleExponentialChangeState({
      initialValue: 8,
      rate: -0.23,
      targetValue: 3,
    });

    expect(growth.targetRatio).toBeCloseTo(4, 6);
    expect(growth.targetTime).toBeCloseTo(5.55, 2);
    expect(growth.doublingTime).toBeCloseTo(2.77, 2);
    expect(growth.cadenceKind).toBe("doubling");
    expect(growth.cadenceTime).toBeCloseTo(2.77, 2);
    expect(growth.cadenceValue).toBeCloseTo(6, 6);
    expect(growth.halfLife).toBeNull();
    expect(decay.targetTime).toBeCloseTo(4.26, 2);
    expect(decay.halfLife).toBeCloseTo(3.01, 2);
    expect(decay.cadenceKind).toBe("half-life");
    expect(decay.cadenceTime).toBeCloseTo(3.01, 2);
    expect(decay.cadenceValue).toBeCloseTo(4, 6);
    expect(decay.doublingTime).toBeNull();
  });

  it("builds amount and log series with target markers for the live bench", () => {
    const series = buildExponentialChangeSeries({
      initialValue: 3,
      rate: 0.25,
      targetValue: 12,
    });

    expect(series["change-curve"].map((entry) => entry.id)).toEqual([
      "current-change",
      "paired-change",
      "target-line",
      "target-hit",
    ]);
    expect(series["log-view"].map((entry) => entry.id)).toEqual([
      "log-line",
      "paired-log-line",
      "target-log-line",
      "log-target-hit",
    ]);
    expect(series["change-curve"][0]?.points[0]).toEqual({ x: 0, y: 3 });
  });

  it("describes unreachable targets plainly when the sign of k disagrees with the target", () => {
    const description = describeExponentialChangeState({
      initialValue: 5,
      rate: -0.2,
      targetValue: 12,
    });

    expect(description).toMatch(/not reached for the current sign of k/i);
    expect(description).toMatch(/inverse question becomes logarithmic/i);
  });

  it("describes the one-step doubling or half-life amount instead of only the time", () => {
    const growthDescription = describeExponentialChangeState({
      initialValue: 3,
      rate: 0.25,
      targetValue: 12,
    });
    const decayDescription = describeExponentialChangeState({
      initialValue: 8,
      rate: -0.23,
      targetValue: 3,
    });

    expect(growthDescription).toMatch(/amount reaches 6/i);
    expect(decayDescription).toMatch(/amount falls to 4/i);
  });
});
