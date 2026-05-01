import { describe, expect, it } from "vitest";
import {
  buildDoubleSlitInterferenceSeries,
  describeDoubleSlitInterferenceState,
  sampleDoubleSlitInterferencePattern,
  sampleDoubleSlitInterferenceState,
} from "@/lib/physics";

describe("double-slit interference helpers", () => {
  it("keeps the center of the pattern bright", () => {
    const snapshot = sampleDoubleSlitInterferenceState(
      {
        wavelength: 0.78,
        slitSeparation: 2.6,
        screenDistance: 5.4,
        probeY: 0,
      },
      0,
    );

    expect(snapshot.pathDifference).toBeCloseTo(0, 6);
    expect(snapshot.normalizedIntensity).toBeCloseTo(1, 6);
    expect(snapshot.resultantAmplitude).toBeCloseTo(2, 6);
  });

  it("drops toward the first dark fringe when the path difference approaches half a wavelength", () => {
    const center = sampleDoubleSlitInterferenceState(
      {
        wavelength: 0.78,
        slitSeparation: 2.6,
        screenDistance: 5.4,
        probeY: 0,
      },
      0,
    );
    const dark = sampleDoubleSlitInterferencePattern(
      {
        wavelength: 0.78,
        slitSeparation: 2.6,
        screenDistance: 5.4,
        probeY: center.firstDarkYApprox,
      },
      center.firstDarkYApprox,
    );

    expect(dark.pathDifferenceInWavelengths).toBeGreaterThan(0.45);
    expect(dark.pathDifferenceInWavelengths).toBeLessThan(0.55);
    expect(dark.normalizedIntensity).toBeLessThan(0.08);
  });

  it("widens when wavelength and screen distance grow relative to slit separation", () => {
    const tight = sampleDoubleSlitInterferenceState(
      {
        wavelength: 0.56,
        slitSeparation: 3.2,
        screenDistance: 4.4,
        probeY: 0,
      },
      0,
    );
    const wide = sampleDoubleSlitInterferenceState(
      {
        wavelength: 1,
        slitSeparation: 1.8,
        screenDistance: 6.2,
        probeY: 0,
      },
      0,
    );

    expect(wide.fringeSpacing).toBeGreaterThan(tight.fringeSpacing);
    expect(wide.firstDarkYApprox).toBeGreaterThan(tight.firstDarkYApprox);
  });

  it("builds time and screen-pattern series", () => {
    const series = buildDoubleSlitInterferenceSeries({
      wavelength: 0.78,
      slitSeparation: 2.6,
      screenDistance: 5.4,
      probeY: 0.8,
    });

    expect(series.displacement).toHaveLength(5);
    expect(series.pattern).toHaveLength(1);
    expect(series.pattern[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current fringe state in plain language", () => {
    const description = describeDoubleSlitInterferenceState(
      {
        wavelength: 0.78,
        slitSeparation: 2.6,
        screenDistance: 5.4,
        probeY: 0.8,
      },
      0.25,
    );

    expect(description).toContain("phase split");
    expect(description).toContain("bright-fringe spacing");
  });
});
