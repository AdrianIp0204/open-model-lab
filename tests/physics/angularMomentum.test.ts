import { describe, expect, it } from "vitest";
import {
  buildAngularMomentumSeries,
  describeAngularMomentumState,
  sampleAngularMomentumState,
} from "@/lib/physics";

describe("angular momentum helpers", () => {
  const params = {
    massRadius: 0.55,
    angularSpeed: 2.4,
  };

  it("samples the expected inertia, angular momentum, and rim speed", () => {
    const state = sampleAngularMomentumState(params, 1.2);

    expect(state.momentOfInertia).toBeCloseTo(2.265, 5);
    expect(state.angularMomentum).toBeCloseTo(5.436, 5);
    expect(state.tangentialSpeed).toBeCloseTo(1.32, 5);
    expect(state.rotationAngle).toBeCloseTo(2.88, 5);
    expect(state.referenceAngularSpeed).toBeCloseTo(5.9061, 4);
  });

  it("builds time and response series for the live and same-L views", () => {
    const series = buildAngularMomentumSeries(params);

    expect(series["rotation-angle"][0].points.length).toBeGreaterThan(0);
    expect(series["momentum-map"][0].points.length).toBeGreaterThan(0);
    expect(series["conserved-spin-map"][0].points.length).toBeGreaterThan(0);
  });

  it("describes the rotating state in plain language", () => {
    expect(describeAngularMomentumState(params, 1.2)).toContain("angular momentum");
    expect(describeAngularMomentumState(params, 1.2)).toContain("compact reference");
  });
});
