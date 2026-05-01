import { describe, expect, it } from "vitest";
import {
  buildUcmSeries,
  describeUcmState,
  normalizeAngle,
  phaseFromAngle,
  sampleUcmState,
} from "@/lib/physics";

describe("uniform circular motion helpers", () => {
  const params = {
    radius: 1.5,
    omega: 2,
    phase: 0,
  };

  it("samples the expected position and vectors at t = 0", () => {
    const state = sampleUcmState(params, 0);

    expect(state.x).toBeCloseTo(1.5);
    expect(state.y).toBeCloseTo(0);
    expect(state.speed).toBeCloseTo(3);
    expect(state.vx).toBeCloseTo(0);
    expect(state.vy).toBeCloseTo(3);
    expect(state.ax).toBeCloseTo(-6);
    expect(state.ay).toBeCloseTo(0);
  });

  it("builds projection, velocity, and angle series", () => {
    const series = buildUcmSeries(params);

    expect(series.projections[0].points.length).toBeGreaterThan(0);
    expect(series.velocity[0].points.length).toBeGreaterThan(0);
    expect(series.angle[0].points.length).toBeGreaterThan(0);
  });

  it("converts a dragged angle back into a normalized phase", () => {
    const angle = normalizeAngle(Math.PI / 2);
    const phase = phaseFromAngle(angle, 0.5, 2);

    expect(phase).toBeCloseTo(Math.PI / 2 - 1, 5);
  });

  it("describes the circular state in plain language", () => {
    expect(describeUcmState(params, 0)).toContain("particle");
    expect(describeUcmState(params, 0)).toContain("centripetal acceleration");
  });
});
