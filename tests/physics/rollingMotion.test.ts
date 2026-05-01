import { describe, expect, it } from "vitest";
import {
  buildRollingMotionSeries,
  describeRollingMotionState,
  sampleRollingMotionState,
} from "@/lib/physics";

describe("rolling motion helpers", () => {
  const params = {
    slopeAngle: 12,
    radius: 0.22,
    inertiaFactor: 0.5,
  };

  it("samples the expected rolling acceleration, speed, and energy split", () => {
    const state = sampleRollingMotionState(params, 1.2);

    expect(state.acceleration).toBeCloseTo(1.3597, 4);
    expect(state.linearSpeed).toBeCloseTo(1.6317, 4);
    expect(state.angularSpeed).toBeCloseTo(7.4168, 4);
    expect(state.travelTime).toBeCloseTo(1.8789, 3);
    expect(state.translationalEnergy).toBeCloseTo(1.5974, 3);
    expect(state.rotationalEnergy).toBeCloseTo(0.7987, 3);
    expect(state.staticFriction).toBeCloseTo(0.8158, 3);
  });

  it("builds time and response series for the rolling bench", () => {
    const series = buildRollingMotionSeries(params);

    expect(series.distance[0].points.length).toBeGreaterThan(0);
    expect(series["speed-link"][0].points.length).toBeGreaterThan(0);
    expect(series["energy-split"][0].points.length).toBeGreaterThan(0);
    expect(series["acceleration-map"][0].points.length).toBeGreaterThan(0);
  });

  it("describes the linked translational and rotational state in plain language", () => {
    expect(describeRollingMotionState(params, 1.2)).toContain("Rolling without slipping");
    expect(describeRollingMotionState(params, 1.2)).toContain("kinetic energy split");
  });
});
