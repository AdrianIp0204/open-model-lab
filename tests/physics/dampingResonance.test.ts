import { describe, expect, it } from "vitest";
import { buildDampingSeries, describeDampingState, sampleDampingState } from "@/lib/physics";

describe("damping / resonance helpers", () => {
  const params = {
    naturalFrequency: 4,
    drivingFrequency: 4,
    damping: 0.15,
    driveAmplitude: 1,
    resonanceMode: true,
    phase: 0,
  };

  it("creates a larger response near resonance than off resonance", () => {
    const near = sampleDampingState(params, 0).responseAmplitude;
    const off = sampleDampingState({ ...params, drivingFrequency: 1.5 }, 0).responseAmplitude;
    expect(near).toBeGreaterThan(off);
  });

  it("builds transient and response series", () => {
    const series = buildDampingSeries(params);
    expect(series.transient[0].points.length).toBeGreaterThan(0);
    expect(series.response[0].points.length).toBeGreaterThan(0);
  });

  it("describes the mode", () => {
    expect(describeDampingState(params, 0)).toContain("resonance");
  });
});
