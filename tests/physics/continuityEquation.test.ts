import { describe, expect, it } from "vitest";
import {
  buildContinuityEquationSeries,
  describeContinuityEquationState,
  sampleContinuityEquationState,
} from "@/lib/physics";

describe("continuity-equation helpers", () => {
  it("speeds the middle section up when the same flow rate enters a smaller area", () => {
    const uniform = sampleContinuityEquationState({
      flowRate: 0.18,
      entryArea: 0.24,
      middleArea: 0.24,
    });
    const narrowed = sampleContinuityEquationState({
      flowRate: 0.18,
      entryArea: 0.24,
      middleArea: 0.12,
    });

    expect(uniform.entrySpeed).toBeCloseTo(uniform.middleSpeed, 6);
    expect(narrowed.entrySpeed).toBeCloseTo(uniform.entrySpeed, 6);
    expect(narrowed.middleSpeed).toBeCloseTo(narrowed.entrySpeed * 2, 6);
    expect(narrowed.middleVolumeFlow).toBeCloseTo(narrowed.entryVolumeFlow, 6);
  });

  it("slows the middle section down when that section becomes wider", () => {
    const widened = sampleContinuityEquationState({
      flowRate: 0.18,
      entryArea: 0.24,
      middleArea: 0.3,
    });

    expect(widened.middleSpeed).toBeLessThan(widened.entrySpeed);
    expect(widened.speedRatio).toBeLessThan(1);
  });

  it("builds the expected response graph groups", () => {
    const series = buildContinuityEquationSeries({
      flowRate: 0.18,
      entryArea: 0.24,
      middleArea: 0.12,
    });

    expect(series["speed-entry-area"]).toHaveLength(2);
    expect(series["speed-middle-area"]).toHaveLength(2);
    expect(series["speed-flow-rate"]).toHaveLength(2);
    expect(series["flow-balance"]).toHaveLength(2);
    expect(series["speed-middle-area"][0]?.points.length).toBeGreaterThan(80);
  });

  it("describes the same-flow-rate story directly", () => {
    const description = describeContinuityEquationState(
      {
        flowRate: 0.18,
        entryArea: 0.24,
        middleArea: 0.12,
      },
      1.2,
    );

    expect(description).toContain("Q = 0.18 m³/s");
    expect(description).toContain("section A");
    expect(description).toContain("same flow rate");
    expect(description).toMatch(/speeds up|narrower/i);
  });
});
