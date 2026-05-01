import { describe, expect, it } from "vitest";
import {
  buildOptimizationConstraintsSeries,
  describeOptimizationConstraintsState,
  sampleOptimizationConstraintsState,
} from "@/lib/physics";

describe("optimization-constraints helpers", () => {
  it("samples the constrained rectangle, area, and local slope together", () => {
    const snapshot = sampleOptimizationConstraintsState({
      width: 4,
    });

    expect(snapshot.height).toBeCloseTo(8, 6);
    expect(snapshot.area).toBeCloseTo(32, 6);
    expect(snapshot.areaSlope).toBeCloseTo(4, 6);
    expect(snapshot.optimumArea).toBeCloseTo(36, 6);
    expect(snapshot.areaGap).toBeCloseTo(4, 6);
  });

  it("builds objective, slope, and constraint graph series", () => {
    const series = buildOptimizationConstraintsSeries({
      width: 6,
    });

    expect(series["area-vs-width"]).toHaveLength(1);
    expect(series["area-vs-width"][0]?.id).toBe("area-curve");
    expect(series["area-slope"]).toHaveLength(1);
    expect(series["area-slope"][0]?.id).toBe("area-slope-line");
    expect(series["height-vs-width"]).toHaveLength(1);
    expect(series["height-vs-width"][0]?.id).toBe("constraint-line");
  });

  it("describes the square as the maximum-area case when the local slope is flat", () => {
    const description = describeOptimizationConstraintsState({
      width: 6,
    });

    expect(description).toContain("maximum");
    expect(description).toContain("square");
    expect(description).toContain("24 m");
  });
});
