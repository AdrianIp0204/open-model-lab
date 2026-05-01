import { describe, expect, it } from "vitest";
import {
  buildUnitCircleRotationSeries,
  describeUnitCircleRotationState,
  sampleUnitCircleRotationState,
} from "@/lib/physics";

describe("unit circle rotation helpers", () => {
  const params = {
    angularSpeed: 1,
    phase: 0,
  };

  it("samples cosine and sine directly from the rotating point", () => {
    const state = sampleUnitCircleRotationState(params, Math.PI / 2);

    expect(state.x).toBeCloseTo(0, 3);
    expect(state.y).toBeCloseTo(1, 3);
    expect(state.sumSquares).toBeCloseTo(1, 6);
    expect(state.regionLabel).toBe("Positive y-axis");
    expect(state.cosineSign).toBe("zero");
    expect(state.sineSign).toBe("positive");
  });

  it("builds projection, identity, and angle history series", () => {
    const series = buildUnitCircleRotationSeries(params);

    expect(series["projection-history"][0].points.length).toBeGreaterThan(0);
    expect(series["projection-history"][1].points.length).toBeGreaterThan(0);
    expect(series["identity-balance"][0].points.length).toBeGreaterThan(0);
    expect(series["identity-balance"][1].points.length).toBeGreaterThan(0);
    expect(series["identity-balance"][2].points[0]?.y).toBeCloseTo(1, 6);
    expect(series["angle-history"][0].points.length).toBeGreaterThan(0);
  });

  it("describes the projection state in plain language", () => {
    const description = describeUnitCircleRotationState(params, Math.PI / 4);

    expect(description).toContain("horizontal projection");
    expect(description).toContain("vertical projection");
    expect(description).toContain("unit-circle point");
  });
});
