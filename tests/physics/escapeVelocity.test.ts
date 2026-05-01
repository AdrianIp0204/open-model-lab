import { describe, expect, it } from "vitest";
import {
  buildEscapeVelocitySeries,
  describeEscapeVelocityState,
  sampleEscapeVelocityState,
} from "@/lib/physics";

describe("escape-velocity helpers", () => {
  it("puts the threshold launch at zero total specific energy", () => {
    const snapshot = sampleEscapeVelocityState(
      {
        sourceMass: 4,
        launchRadius: 1.6,
        speedFactor: 1,
      },
      0,
    );

    expect(snapshot.launchEscapeSpeed).toBeCloseTo(Math.sqrt((2 * 4) / 1.6), 6);
    expect(snapshot.launchCircularSpeed).toBeCloseTo(Math.sqrt(4 / 1.6), 6);
    expect(snapshot.launchEscapeSpeed / snapshot.launchCircularSpeed).toBeCloseTo(
      Math.sqrt(2),
      6,
    );
    expect(snapshot.totalEnergy).toBeCloseTo(0, 6);
    expect(snapshot.turnaroundRadius).toBeNull();
  });

  it("distinguishes bound and escaping launches by total energy and turnaround radius", () => {
    const bound = sampleEscapeVelocityState(
      {
        sourceMass: 4,
        launchRadius: 1.6,
        speedFactor: 0.92,
      },
      0,
    );
    const escape = sampleEscapeVelocityState(
      {
        sourceMass: 4,
        launchRadius: 1.6,
        speedFactor: 1.08,
      },
      0,
    );

    expect(bound.totalEnergy).toBeLessThan(0);
    expect(bound.turnaroundRadius).not.toBeNull();
    expect((bound.turnaroundRadius ?? 0) > 10).toBe(true);
    expect(escape.totalEnergy).toBeGreaterThan(0);
    expect(escape.turnaroundRadius).toBeNull();
  });

  it("builds the expected launch-history series groups", () => {
    const series = buildEscapeVelocitySeries({
      sourceMass: 4,
      launchRadius: 1.6,
      speedFactor: 1,
    });

    expect(series["radius-history"]).toHaveLength(2);
    expect(series["speed-thresholds"]).toHaveLength(3);
    expect(series["specific-energy"]).toHaveLength(4);
    expect(series["radius-history"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the energy verdict and turnaround honestly", () => {
    const description = describeEscapeVelocityState(
      {
        sourceMass: 4,
        launchRadius: 1.6,
        speedFactor: 0.92,
      },
      0,
    );

    expect(description).toContain("specific energies");
    expect(description).toContain("bound");
    expect(description).toMatch(/turn around|turnaround/i);
  });
});
