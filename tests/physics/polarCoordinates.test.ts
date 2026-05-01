import { describe, expect, it } from "vitest";
import {
  buildPolarCoordinatesSeries,
  describePolarCoordinatesState,
  samplePolarCoordinatesState,
} from "@/lib/physics";

describe("polar coordinates helpers", () => {
  it("converts radius and angle into the matching Cartesian point", () => {
    const state = samplePolarCoordinatesState({
      radius: 4,
      angleDeg: 60,
    });

    expect(state.x).toBeCloseTo(2, 3);
    expect(state.y).toBeCloseTo(3.464, 3);
    expect(state.regionLabel).toBe("Quadrant I");
    expect(state.referenceAngleDeg).toBeCloseTo(60, 3);
    expect(state.principalAngleDeg).toBeCloseTo(60, 3);
  });

  it("keeps the principal inverse-angle output distinct from the full quadrant angle", () => {
    const state = samplePolarCoordinatesState({
      radius: 4,
      angleDeg: 140,
    });

    expect(state.regionLabel).toBe("Quadrant II");
    expect(state.referenceAngleDeg).toBeCloseTo(40, 3);
    expect(state.principalAngleDeg).toBeCloseTo(-40, 3);
  });

  it("builds the coordinate sweep and angle-recovery graph for a fixed radius", () => {
    const series = buildPolarCoordinatesSeries({
      radius: 3,
      angleDeg: 45,
    });

    expect(series["coordinate-sweep"][0].points.length).toBeGreaterThan(0);
    expect(series["coordinate-sweep"][1].points.length).toBeGreaterThan(0);
    expect(series["angle-recovery"][0].points.length).toBeGreaterThan(0);
    expect(series["angle-recovery"][1].points.length).toBeGreaterThan(0);
  });

  it("describes the polar and Cartesian views together", () => {
    const description = describePolarCoordinatesState({
      radius: 3.2,
      angleDeg: 135,
    });

    expect(description).toContain("polar point");
    expect(description).toContain("(x, y)");
    expect(description).toContain("r cos(theta)");
  });
});
