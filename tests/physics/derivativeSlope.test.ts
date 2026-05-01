import { describe, expect, it } from "vitest";
import {
  buildDerivativeSlopeSeries,
  describeDerivativeSlopeState,
  sampleDerivativeSlopeState,
} from "@/lib/physics";

describe("derivative-as-slope helpers", () => {
  it("samples the curve point, tangent slope, and secant slope together", () => {
    const snapshot = sampleDerivativeSlopeState({
      pointX: 2,
      deltaX: 0.5,
      showSecant: true,
    });

    expect(snapshot.pointY).toBeCloseTo(-0.56, 6);
    expect(snapshot.slope).toBeCloseTo(1.16, 6);
    expect(snapshot.secantX).toBeCloseTo(2.5, 6);
    expect(snapshot.secantSlope).toBeGreaterThan(1.5);
  });

  it("builds derivative and difference-quotient graph series", () => {
    const series = buildDerivativeSlopeSeries({
      pointX: -1.2,
      deltaX: 0.8,
      showSecant: true,
    });

    expect(series["slope-function"]).toHaveLength(1);
    expect(series["slope-function"][0]?.id).toBe("derivative-curve");
    expect(series["difference-quotient"]).toHaveLength(1);
    expect(series["difference-quotient"][0]?.id).toBe("secant-slope");
  });

  it("describes the tangent and secant relationship in plain terms", () => {
    const description = describeDerivativeSlopeState({
      pointX: 1.35,
      deltaX: 0.2,
      showSecant: true,
    });

    expect(description).toContain("tangent slope");
    expect(description).toContain("delta x");
    expect(description).toContain("secant slope");
  });
});
