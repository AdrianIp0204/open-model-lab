import { describe, expect, it } from "vitest";
import {
  buildDotProductProjectionSeries,
  describeDotProductProjectionState,
  sampleDotProductProjectionState,
} from "@/lib/physics";

describe("dot-product projection helpers", () => {
  it("samples orthogonal and negative-projection states from live vectors", () => {
    const orthogonal = sampleDotProductProjectionState({
      ax: 4,
      ay: 2,
      bx: -1,
      by: 2,
    });

    expect(orthogonal.dotProduct).toBeCloseTo(0, 6);
    expect(orthogonal.angleBetween).toBeCloseTo(90, 6);
    expect(orthogonal.projectionScalar).toBeCloseTo(0, 6);
    expect(orthogonal.projectionX).toBeCloseTo(0, 6);
    expect(orthogonal.projectionY).toBeCloseTo(0, 6);

    const negative = sampleDotProductProjectionState({
      ax: 4,
      ay: 1,
      bx: -2.5,
      by: 2.5,
    });

    expect(negative.dotProduct).toBeCloseTo(-7.5, 6);
    expect(negative.projectionScalar).toBeLessThan(0);
    expect(negative.projectionX).toBeLessThan(0);
    expect(negative.angleBetween).toBeGreaterThan(90);
  });

  it("builds angle-response series that cross zero at ninety degrees", () => {
    const series = buildDotProductProjectionSeries({
      ax: 4,
      ay: 2,
      bx: 3,
      by: 1,
    });

    expect(series["dot-product-response"]).toHaveLength(1);
    expect(series["projection-response"]).toHaveLength(1);

    const dotAtNinety = series["dot-product-response"][0]?.points.find(
      (point) => point.x === 90,
    );
    const projectionAtNinety = series["projection-response"][0]?.points.find(
      (point) => point.x === 90,
    );

    expect(dotAtNinety?.y ?? Number.NaN).toBeCloseTo(0, 6);
    expect(projectionAtNinety?.y ?? Number.NaN).toBeCloseTo(0, 6);
  });

  it("describes the alignment state in plain language", () => {
    const description = describeDotProductProjectionState({
      ax: 4,
      ay: 1,
      bx: -2.5,
      by: 2.5,
    });

    expect(description).toContain("A dot B");
    expect(description).toContain("scalar projection");
    expect(description).toContain("opposite A");
  });
});
