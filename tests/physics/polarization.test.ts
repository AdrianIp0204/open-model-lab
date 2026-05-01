import { describe, expect, it } from "vitest";
import {
  buildPolarizationSeries,
  describePolarizationState,
  samplePolarizationState,
} from "@/lib/physics";

describe("polarization helpers", () => {
  it("keeps aligned linear input fully transmitted", () => {
    const snapshot = samplePolarizationState({
      inputAmplitude: 1.1,
      inputAngle: 30,
      polarizerAngle: 30,
      unpolarized: false,
    });

    expect(snapshot.angleDifference).toBeCloseTo(0, 6);
    expect(snapshot.transmittedIntensityFraction).toBeCloseTo(1, 6);
    expect(snapshot.blockedIntensityFraction).toBeCloseTo(0, 6);
  });

  it("makes crossed linear input nearly dark", () => {
    const snapshot = samplePolarizationState({
      inputAmplitude: 1.1,
      inputAngle: 30,
      polarizerAngle: 120,
      unpolarized: false,
    });

    expect(snapshot.angleDifference).toBeCloseTo(90, 6);
    expect(snapshot.transmittedIntensityFraction).toBeLessThan(1e-6);
    expect(snapshot.blockedIntensityFraction).toBeCloseTo(1, 6);
  });

  it("keeps an ideal first polarizer at half intensity for unpolarized input", () => {
    const snapshot = samplePolarizationState({
      inputAmplitude: 1.1,
      inputAngle: 30,
      polarizerAngle: 70,
      unpolarized: true,
    });

    expect(snapshot.transmittedIntensityFraction).toBeCloseTo(0.5, 6);
    expect(snapshot.blockedIntensityFraction).toBeCloseTo(0.5, 6);
    expect(snapshot.outputAngle).toBeCloseTo(70, 6);
  });

  it("builds the expected response graphs", () => {
    const series = buildPolarizationSeries({
      inputAmplitude: 1.1,
      inputAngle: 20,
      polarizerAngle: 50,
      unpolarized: false,
    });

    expect(series["power-split"]).toHaveLength(2);
    expect(series["field-projection"]).toHaveLength(2);
    expect(series["power-split"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current polarizer state in plain language", () => {
    const description = describePolarizationState({
      inputAmplitude: 1.1,
      inputAngle: 0,
      polarizerAngle: 45,
      unpolarized: false,
    });

    expect(description).toContain("linearly polarized input");
    expect(description).toContain("relative angle");
    expect(description).toContain("detector");
  });
});
