import { describe, expect, it } from "vitest";
import {
  buildSeriesParallelCircuitsSeries,
  describeSeriesParallelCircuitsState,
  sampleSeriesParallelCircuitsState,
} from "@/lib/physics";

describe("series-parallel-circuits helpers", () => {
  it("keeps equal loads consistent in series and parallel", () => {
    const seriesSnapshot = sampleSeriesParallelCircuitsState(
      {
        voltage: 12,
        resistanceA: 6,
        resistanceB: 6,
        parallelMode: false,
      },
      3,
    );
    const parallelSnapshot = sampleSeriesParallelCircuitsState(
      {
        voltage: 12,
        resistanceA: 6,
        resistanceB: 6,
        parallelMode: true,
      },
      3,
    );

    expect(seriesSnapshot.totalCurrent).toBeCloseTo(1, 6);
    expect(seriesSnapshot.branchA.power).toBeCloseTo(6, 6);
    expect(seriesSnapshot.branchB.power).toBeCloseTo(6, 6);

    expect(parallelSnapshot.totalCurrent).toBeCloseTo(4, 6);
    expect(parallelSnapshot.branchA.power).toBeCloseTo(24, 6);
    expect(parallelSnapshot.branchB.power).toBeCloseTo(24, 6);
  });

  it("tracks branch charge honestly over inspected time", () => {
    const snapshot = sampleSeriesParallelCircuitsState(
      {
        voltage: 12,
        resistanceA: 4,
        resistanceB: 12,
        parallelMode: true,
      },
      4,
    );

    expect(snapshot.branchA.charge).toBeCloseTo(12, 6);
    expect(snapshot.branchB.charge).toBeCloseTo(4, 6);
    expect(snapshot.totalCharge).toBeCloseTo(16, 6);
  });

  it("builds the expected response graph groups", () => {
    const series = buildSeriesParallelCircuitsSeries({
      voltage: 12,
      resistanceA: 4,
      resistanceB: 12,
      parallelMode: true,
    });

    expect(series["branch-current"]).toHaveLength(3);
    expect(series["branch-voltage"]).toHaveLength(2);
    expect(series["load-power"]).toHaveLength(2);
    expect(series["branch-current"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current, voltage, and brightness story honestly", () => {
    const description = describeSeriesParallelCircuitsState(
      {
        voltage: 12,
        resistanceA: 4,
        resistanceB: 12,
        parallelMode: true,
      },
      4,
    );

    expect(description).toContain("total current");
    expect(description).toContain("Load A has");
    expect(description).toContain("Load B");
    expect(description).toContain("brighter");
  });
});
