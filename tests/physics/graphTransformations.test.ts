import { describe, expect, it } from "vitest";
import {
  buildGraphTransformationsSeries,
  describeGraphTransformationsState,
  sampleGraphTransformationsState,
} from "@/lib/physics";

describe("graph transformations helpers", () => {
  it("tracks the transformed vertex from shifts, scale, and y-axis reflection", () => {
    const snapshot = sampleGraphTransformationsState({
      horizontalShift: 1.5,
      verticalShift: 1,
      verticalScale: -1.5,
      mirrorY: true,
    });

    expect(snapshot.baseVertexX).toBe(1);
    expect(snapshot.baseVertexY).toBe(-2);
    expect(snapshot.vertexX).toBeCloseTo(0.5, 6);
    expect(snapshot.vertexY).toBeCloseTo(4, 6);
    expect(snapshot.mirrorY).toBe(true);
  });

  it("builds the graph and vertex-height series from the same live parameters", () => {
    const series = buildGraphTransformationsSeries({
      horizontalShift: -1.2,
      verticalShift: 0.6,
      verticalScale: 1.4,
      mirrorY: false,
    });

    expect(series["function-graph"]).toHaveLength(2);
    expect(series["function-graph"][0]?.id).toBe("base-curve");
    expect(series["function-graph"][1]?.id).toBe("transformed-curve");
    expect(series["vertex-height-map"]).toHaveLength(1);
    expect(series["vertex-height-map"][0]?.id).toBe("vertex-height");
  });

  it("describes reflection and scale honestly in the state summary", () => {
    const description = describeGraphTransformationsState({
      horizontalShift: 0.8,
      verticalShift: -0.5,
      verticalScale: -1.2,
      mirrorY: true,
    });

    expect(description).toContain("reflects across the x-axis");
    expect(description).toContain("reflected across the y-axis");
  });
});
