import { describe, expect, it } from "vitest";
import {
  buildBernoulliPrincipleSeries,
  describeBernoulliPrincipleState,
  sampleBernoulliPrincipleState,
} from "@/lib/physics";

describe("bernoulli-principle helpers", () => {
  it("speeds the throat up and lowers its pressure when the throat narrows", () => {
    const uniform = sampleBernoulliPrincipleState({
      entryPressure: 32,
      flowRate: 0.18,
      entryArea: 0.1,
      throatArea: 0.1,
      throatHeight: 0,
    });
    const narrowed = sampleBernoulliPrincipleState({
      entryPressure: 32,
      flowRate: 0.18,
      entryArea: 0.1,
      throatArea: 0.05,
      throatHeight: 0,
    });

    expect(uniform.entrySpeed).toBeCloseTo(uniform.throatSpeed, 6);
    expect(uniform.throatPressure).toBeCloseTo(uniform.entryPressure, 6);
    expect(narrowed.throatSpeed).toBeCloseTo(narrowed.entrySpeed * 2, 6);
    expect(narrowed.throatPressure).toBeLessThan(narrowed.entryPressure);
    expect(narrowed.pressureDrop).toBeCloseTo(4.86, 2);
  });

  it("drops the throat pressure further when the same throat is raised", () => {
    const level = sampleBernoulliPrincipleState({
      entryPressure: 32,
      flowRate: 0.18,
      entryArea: 0.1,
      throatArea: 0.05,
      throatHeight: 0,
    });
    const raised = sampleBernoulliPrincipleState({
      entryPressure: 32,
      flowRate: 0.18,
      entryArea: 0.1,
      throatArea: 0.05,
      throatHeight: 0.25,
    });

    expect(raised.throatSpeed).toBeCloseTo(level.throatSpeed, 6);
    expect(raised.throatPressure).toBeLessThan(level.throatPressure);
    expect(level.throatPressure - raised.throatPressure).toBeCloseTo(2.45, 2);
  });

  it("builds the expected response graph groups", () => {
    const series = buildBernoulliPrincipleSeries({
      entryPressure: 32,
      flowRate: 0.18,
      entryArea: 0.1,
      throatArea: 0.05,
      throatHeight: 0.25,
    });

    expect(series["speed-throat-area"]).toHaveLength(2);
    expect(series["pressure-throat-area"]).toHaveLength(2);
    expect(series["pressure-flow-rate"]).toHaveLength(2);
    expect(series["pressure-throat-height"]).toHaveLength(2);
    expect(series["pressure-throat-area"][0]?.points.length).toBeGreaterThan(80);
  });

  it("describes the continuity-plus-bernoulli trade directly", () => {
    const description = describeBernoulliPrincipleState(
      {
        entryPressure: 32,
        flowRate: 0.18,
        entryArea: 0.1,
        throatArea: 0.05,
        throatHeight: 0.25,
      },
      0.8,
    );

    expect(description).toContain("Q = 0.18 m³/s");
    expect(description).toContain("static pressure");
    expect(description).toMatch(/Continuity sets the speed change/i);
    expect(description).toContain("24.69");
  });
});
