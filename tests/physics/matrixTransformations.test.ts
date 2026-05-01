import { describe, expect, it } from "vitest";
import {
  buildMatrixTransformationsSeries,
  describeMatrixTransformationsState,
  sampleMatrixTransformationsState,
} from "@/lib/physics";

describe("matrix-transformations helpers", () => {
  it("treats the columns as the transformed basis vectors", () => {
    const snapshot = sampleMatrixTransformationsState({
      m11: 2,
      m12: 1,
      m21: 0,
      m22: 1,
    });

    expect(snapshot.basis1X).toBeCloseTo(2, 6);
    expect(snapshot.basis1Y).toBeCloseTo(0, 6);
    expect(snapshot.basis2X).toBeCloseTo(1, 6);
    expect(snapshot.basis2Y).toBeCloseTo(1, 6);
    expect(snapshot.unitSquareTopRightX).toBeCloseTo(3, 6);
    expect(snapshot.unitSquareTopRightY).toBeCloseTo(1, 6);
  });

  it("builds blend-response series for the tracked point and basis lengths", () => {
    const series = buildMatrixTransformationsSeries({
      m11: -1,
      m12: 0.6,
      m21: 0,
      m22: 1,
    });

    expect(series["probe-image-blend"]).toHaveLength(2);
    expect(series["probe-image-blend"][0]?.id).toBe("probe-x");
    expect(series["basis-length-blend"]).toHaveLength(2);
    expect(series["basis-length-blend"][1]?.id).toBe("basis-2-length");
  });

  it("describes reflection and shear cues in plain terms", () => {
    const description = describeMatrixTransformationsState({
      m11: -1,
      m12: 0.8,
      m21: 0,
      m22: 1,
    });

    expect(description).toContain("reflection");
    expect(description).toContain("shearing");
    expect(description).toContain("M e1");
  });
});
