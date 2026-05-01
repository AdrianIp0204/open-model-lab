import { describe, expect, it } from "vitest";
import {
  buildProjectileSeries,
  clampProjectileTime,
  describeProjectileState,
  normalizeProjectileTime,
  resolveProjectileViewport,
  sampleProjectileState,
} from "@/lib/physics";

describe("projectile helpers", () => {
  const params = {
    launchSpeed: 20,
    launchAngle: 45,
    gravity: 9.81,
    launchHeight: 0,
  };

  it("computes a sensible trajectory at launch", () => {
    const state = sampleProjectileState(params, 0);
    expect(state.x).toBeCloseTo(0);
    expect(state.y).toBeCloseTo(0);
    expect(state.range).toBeGreaterThan(0);
  });

  it("accepts speed and angle aliases from the interactive state", () => {
    const canonical = sampleProjectileState(params, 0);
    const aliases = sampleProjectileState(
      {
        speed: params.launchSpeed,
        angle: params.launchAngle,
        gravity: params.gravity,
        launchHeight: params.launchHeight,
      },
      0,
    );

    expect(aliases.vx).toBeCloseTo(canonical.vx);
    expect(aliases.vy).toBeCloseTo(canonical.vy);
    expect(aliases.range).toBeCloseTo(canonical.range);
    expect(describeProjectileState({ speed: 20, angle: 45, gravity: 9.81, launchHeight: 0 }, 0)).toContain("45");
  });

  it("prefers the live control aliases when both alias and canonical fields are present", () => {
    const state = sampleProjectileState(
      {
        launchSpeed: 12,
        speed: 20,
        launchAngle: 20,
        angle: 60,
        gravity: 9.81,
        launchHeight: 0,
      },
      0,
    );

    expect(state.vx).toBeCloseTo(10, 4);
    expect(state.vy).toBeCloseTo(17.3205, 4);
  });

  it("builds series for trajectory and velocity graphs", () => {
    const series = buildProjectileSeries(params);
    expect(series.trajectory[0].points.length).toBeGreaterThan(0);
    expect(series.velocity[0].points.length).toBeGreaterThan(0);
  });

  it("keeps series consistent when using aliases", () => {
    const canonical = buildProjectileSeries(params);
    const aliases = buildProjectileSeries({
      speed: params.launchSpeed,
      angle: params.launchAngle,
      gravity: params.gravity,
      launchHeight: params.launchHeight,
    });

    expect(aliases.trajectory[0].points[10].x).toBeCloseTo(canonical.trajectory[0].points[10].x);
    expect(aliases.trajectory[0].points[10].y).toBeCloseTo(canonical.trajectory[0].points[10].y);
    expect(aliases.velocity[1].points[10].y).toBeCloseTo(canonical.velocity[1].points[10].y);
  });

  it("describes the trajectory", () => {
    expect(describeProjectileState(params, 0)).toContain("projectile");
  });

  it("wraps animation time to the projectile flight window", () => {
    const state = sampleProjectileState(params, 0);
    expect(normalizeProjectileTime(params, state.timeOfFlight + 0.35)).toBeCloseTo(0.35, 1);
  });

  it("clamps inspection time to the landing point instead of wrapping", () => {
    const state = sampleProjectileState(params, 0);
    expect(clampProjectileTime(params, state.timeOfFlight + 0.35)).toBeCloseTo(state.timeOfFlight, 3);
    expect(describeProjectileState(params, state.timeOfFlight)).toContain("At t =");
  });

  it("uses stable viewport buckets instead of exact-fit scaling", () => {
    const low = resolveProjectileViewport([{ speed: 18, angle: 28, gravity: 9.8 }]);
    const higher = resolveProjectileViewport([{ speed: 18, angle: 45, gravity: 9.8 }]);

    expect(low.maxRange).toBe(40);
    expect(low.maxHeight).toBe(6);
    expect(higher.maxRange).toBe(40);
    expect(higher.maxHeight).toBe(12);
  });
});
