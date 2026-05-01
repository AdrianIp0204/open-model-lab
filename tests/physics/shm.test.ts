import { describe, expect, it } from "vitest";
import {
  buildShmSeries,
  describeShmState,
  resolveAngularFrequency,
  resolveSpringConstant,
  sampleShmState,
} from "@/lib/physics";

describe("SHM helpers", () => {
  const params = {
    amplitude: 2,
    angularFrequency: Math.PI,
    phase: 0,
    equilibriumShift: 0,
    damping: 0,
  };

  it("matches the expected displacement and velocity at t = 0", () => {
    const state = sampleShmState(params, 0);
    expect(state.displacement).toBeCloseTo(2);
    expect(state.velocity).toBeCloseTo(0);
  });

  it("conserves total energy for the undamped oscillator", () => {
    const atStart = sampleShmState(params, 0);
    const quarterCycle = sampleShmState(params, 0.5);

    expect(atStart.energy.total).toBeCloseTo(quarterCycle.energy.total, 6);
    expect(quarterCycle.energy.kinetic).toBeGreaterThan(0);
    expect(quarterCycle.energy.potential).toBeLessThan(atStart.energy.potential);
  });

  it("resolves the missing spring constant from mass and angular frequency", () => {
    const omega = resolveAngularFrequency({
      amplitude: 1,
      springConstant: 8,
      mass: 2,
      phase: 0,
    });

    expect(omega).toBeCloseTo(2);
    expect(
      resolveSpringConstant({
        amplitude: 1,
        angularFrequency: omega,
        mass: 2,
        phase: 0,
      }),
    ).toBeCloseTo(8);
  });

  it("produces series for the main graph tabs", () => {
    const series = buildShmSeries(params);
    expect(series.displacement[0].points.length).toBeGreaterThan(0);
    expect(series.velocity[0].points.length).toBeGreaterThan(0);
    expect(series.energy[0].points.length).toBeGreaterThan(0);
  });

  it("describes the oscillator state in plain language", () => {
    expect(describeShmState(params, 0)).toContain("oscillator");
  });
});
