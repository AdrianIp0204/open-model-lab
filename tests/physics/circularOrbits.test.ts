import { describe, expect, it } from "vitest";
import {
  buildCircularOrbitsSeries,
  describeCircularOrbitsState,
  resolveCircularOrbitKeplerRatio,
  sampleCircularOrbitsState,
} from "@/lib/physics";

describe("circular-orbits helpers", () => {
  it("matches gravity to the turning requirement at the circular speed", () => {
    const snapshot = sampleCircularOrbitsState({
      sourceMass: 4,
      orbitRadius: 1.6,
      speedFactor: 1,
    }, 0);

    expect(snapshot.referenceCircularSpeed).toBeCloseTo(Math.sqrt(4 / 1.6), 6);
    expect(snapshot.gravityAcceleration).toBeCloseTo(4 / (1.6 * 1.6), 6);
    expect(snapshot.requiredCentripetalAcceleration).toBeCloseTo(
      snapshot.gravityAcceleration,
      6,
    );
    expect(snapshot.balanceGap).toBeCloseTo(0, 6);
  });

  it("shows the balance-gap sign for too-slow and too-fast launches", () => {
    const slow = sampleCircularOrbitsState(
      {
        sourceMass: 4,
        orbitRadius: 1.6,
        speedFactor: 0.85,
      },
      0,
    );
    const fast = sampleCircularOrbitsState(
      {
        sourceMass: 4,
        orbitRadius: 1.6,
        speedFactor: 1.08,
      },
      0,
    );

    expect(slow.balanceGap).toBeGreaterThan(0);
    expect(fast.balanceGap).toBeLessThan(0);
  });

  it("keeps T^2 / r^3 fixed for the same source mass", () => {
    const inner = resolveCircularOrbitKeplerRatio(4, 1.05);
    const outer = resolveCircularOrbitKeplerRatio(4, 2.1);
    const heavier = resolveCircularOrbitKeplerRatio(5.2, 1.4);

    expect(inner).toBeCloseTo(outer, 6);
    expect(heavier).not.toBeCloseTo(inner, 2);
  });

  it("builds the expected time-series groups", () => {
    const series = buildCircularOrbitsSeries({
      sourceMass: 4,
      orbitRadius: 1.6,
      speedFactor: 1,
    });

    expect(series["radius-history"]).toHaveLength(2);
    expect(series["speed-history"]).toHaveLength(2);
    expect(series["acceleration-balance"]).toHaveLength(2);
    expect(series["radius-history"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes gravity as the circular-turning source", () => {
    const description = describeCircularOrbitsState({
      sourceMass: 4,
      orbitRadius: 1.6,
      speedFactor: 1,
    }, 0);

    expect(description).toContain("circular speed");
    expect(description).toContain("Gravity supplies");
    expect(description).toContain("turn");
  });
});
