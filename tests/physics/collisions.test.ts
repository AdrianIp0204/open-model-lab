import { describe, expect, it } from "vitest";
import {
  buildCollisionsSeries,
  describeCollisionsState,
  resolveCollisionsExtents,
  sampleCollisionsState,
} from "@/lib/physics";

describe("collision helpers", () => {
  it("swaps the velocities for an elastic equal-mass collision with a resting target", () => {
    const snapshot = sampleCollisionsState(
      {
        massA: 1.5,
        massB: 1.5,
        speedA: 1.6,
        speedB: 0,
        elasticity: 1,
      },
      4,
    );

    expect(snapshot.finalVelocityA).toBeCloseTo(0, 4);
    expect(snapshot.finalVelocityB).toBeCloseTo(1.6, 4);
    expect(snapshot.totalMomentum).toBeCloseTo(2.4, 4);
    expect(snapshot.finalKineticEnergy).toBeCloseTo(snapshot.initialKineticEnergy, 4);
  });

  it("moves both carts together in a perfectly inelastic collision", () => {
    const snapshot = sampleCollisionsState(
      {
        massA: 1.5,
        massB: 1.5,
        speedA: 1.6,
        speedB: 0,
        elasticity: 0,
      },
      4,
    );

    expect(snapshot.sticking).toBe(true);
    expect(snapshot.finalVelocityA).toBeCloseTo(0.8, 4);
    expect(snapshot.finalVelocityB).toBeCloseTo(0.8, 4);
    expect(snapshot.totalMomentum).toBeCloseTo(2.4, 4);
    expect(snapshot.energyLoss).toBeGreaterThan(0);
  });

  it("builds velocity, momentum, and energy series with a visible collision instant", () => {
    const series = buildCollisionsSeries({
      massA: 1.2,
      massB: 3.2,
      speedA: 1.9,
      speedB: 0.2,
      elasticity: 0.9,
    });

    expect(series.velocity[0].points.length).toBeGreaterThan(200);
    expect(series.momentum[2].points.length).toBeGreaterThan(200);
    expect(series.energy[2].points.length).toBeGreaterThan(200);

    const extents = resolveCollisionsExtents([
      {
        massA: 1.2,
        massB: 3.2,
        speedA: 1.9,
        speedB: 0.2,
        elasticity: 0.9,
      },
    ]);
    expect(extents.maxAbsVelocity).toBeGreaterThan(0);
    expect(extents.maxEnergy).toBeGreaterThan(0);
    expect(describeCollisionsState({ massA: 1.2, massB: 3.2, speedA: 1.9, speedB: 0.2, elasticity: 0.9 }, 4)).toContain(
      "total momentum",
    );
  });

  it("localizes zh-HK series labels and state descriptions", () => {
    const series = buildCollisionsSeries(
      {
        massA: 1.2,
        massB: 3.2,
        speedA: 1.9,
        speedB: 0.2,
        elasticity: 0.9,
      },
      "zh-HK",
    );
    const description = describeCollisionsState(
      { massA: 1.2, massB: 3.2, speedA: 1.9, speedB: 0.2, elasticity: 0.9 },
      4,
      "zh-HK",
    );

    expect(series.velocity[0]?.label).toBe("A 的速度");
    expect(series.momentum[2]?.label).toBe("總動量");
    expect(description).toContain("總動量");
    expect(description).toContain("非彈性碰撞");
  });
});
