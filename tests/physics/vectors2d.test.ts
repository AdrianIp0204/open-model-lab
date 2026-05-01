import { describe, expect, it } from "vitest";
import {
  buildVectors2DSeries,
  describeVectors2DState,
  sampleVectors2DState,
} from "@/lib/physics";

describe("vectors-2d helpers", () => {
  it("samples scaled, effective, and resultant vectors together", () => {
    const snapshot = sampleVectors2DState({
      ax: 3,
      ay: 4,
      bx: 1,
      by: -2,
      scalar: -2,
      subtractMode: true,
    });

    expect(snapshot.scaledAx).toBeCloseTo(-6, 6);
    expect(snapshot.scaledAy).toBeCloseTo(-8, 6);
    expect(snapshot.effectiveBx).toBeCloseTo(-1, 6);
    expect(snapshot.effectiveBy).toBeCloseTo(2, 6);
    expect(snapshot.resultX).toBeCloseTo(-7, 6);
    expect(snapshot.resultY).toBeCloseTo(-6, 6);
  });

  it("builds response series for resultant components and magnitude", () => {
    const series = buildVectors2DSeries({
      ax: 3,
      ay: 2,
      bx: 1.5,
      by: 3,
      scalar: 1,
      subtractMode: false,
    });

    expect(series["result-components"]).toHaveLength(2);
    expect(series["result-components"][0]?.id).toBe("result-x");
    expect(series["result-components"][1]?.id).toBe("result-y");
    expect(series["result-magnitude"]).toHaveLength(1);
    expect(series["result-magnitude"][0]?.id).toBe("result-magnitude");
  });

  it("describes scalar effects and the current operation in plain terms", () => {
    const description = describeVectors2DState({
      ax: 3,
      ay: 2,
      bx: 2.5,
      by: 1.5,
      scalar: -1.4,
      subtractMode: true,
    });

    expect(description).toContain("sA - B");
    expect(description).toContain("negative scalar");
    expect(description).toContain("magnitude");
  });
});
