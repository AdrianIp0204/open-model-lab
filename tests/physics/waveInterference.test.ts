import { describe, expect, it } from "vitest";
import {
  buildWaveInterferenceSeries,
  describeWaveInterferenceState,
  sampleWaveInterferencePattern,
  sampleWaveInterferenceState,
} from "@/lib/physics";

describe("wave interference helpers", () => {
  it("reinforces at the center when the sources are in phase", () => {
    const snapshot = sampleWaveInterferenceState(
      {
        amplitudeA: 1,
        amplitudeB: 1,
        wavelength: 1.6,
        phaseOffset: 0,
        probeY: 0,
      },
      0,
    );

    expect(snapshot.pathDifference).toBeCloseTo(0, 6);
    expect(snapshot.resultantAmplitude).toBeCloseTo(2, 6);
    expect(snapshot.normalizedIntensity).toBeCloseTo(1, 6);
    expect(snapshot.interferenceLabel).toBe("constructive");
  });

  it("nearly cancels when the total phase split is destructive", () => {
    const snapshot = sampleWaveInterferencePattern(
      {
        amplitudeA: 1,
        amplitudeB: 1,
        wavelength: 1.6,
        phaseOffset: 0,
        probeY: 2.6,
      },
      2.6,
    );

    expect(Math.abs(snapshot.wrappedPhaseDifference)).toBeGreaterThan(3);
    expect(snapshot.resultantAmplitude).toBeLessThan(0.15);
    expect(snapshot.normalizedIntensity).toBeLessThan(0.01);
    expect(snapshot.interferenceLabel).toBe("destructive");
  });

  it("uses amplitude balance as well as phase to determine the envelope", () => {
    const balanced = sampleWaveInterferenceState(
      {
        amplitudeA: 1,
        amplitudeB: 1,
        wavelength: 1.6,
        phaseOffset: Math.PI,
        probeY: 0,
      },
      0,
    );
    const unbalanced = sampleWaveInterferenceState(
      {
        amplitudeA: 1.2,
        amplitudeB: 0.55,
        wavelength: 1.6,
        phaseOffset: Math.PI,
        probeY: 0,
      },
      0,
    );

    expect(balanced.resultantAmplitude).toBeCloseTo(0, 6);
    expect(unbalanced.resultantAmplitude).toBeGreaterThan(0.6);
    expect(unbalanced.normalizedIntensity).toBeGreaterThan(0.1);
  });

  it("builds probe-motion and screen-pattern series", () => {
    const series = buildWaveInterferenceSeries({
      amplitudeA: 1,
      amplitudeB: 1,
      wavelength: 1.6,
      phaseOffset: 0,
      probeY: 0.8,
    });

    expect(series.displacement).toHaveLength(3);
    expect(series.pattern).toHaveLength(1);
    expect(series.pattern[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the live geometry and probe state in plain language", () => {
    const description = describeWaveInterferenceState(
      {
        amplitudeA: 1,
        amplitudeB: 1,
        wavelength: 1.6,
        phaseOffset: 0,
        probeY: 0.8,
      },
      0.25,
    );

    expect(description).toContain("probe");
    expect(description).toContain("phase difference");
  });
});
