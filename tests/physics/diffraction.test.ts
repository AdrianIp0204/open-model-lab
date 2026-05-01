import { describe, expect, it } from "vitest";
import {
  buildDiffractionSeries,
  describeDiffractionState,
  sampleDiffractionPattern,
  sampleDiffractionState,
} from "@/lib/physics";

describe("diffraction helpers", () => {
  it("keeps the center of the pattern bright", () => {
    const snapshot = sampleDiffractionState(
      {
        wavelength: 1,
        slitWidth: 2.4,
        probeY: 0,
      },
      0,
    );

    expect(snapshot.edgePathDifference).toBeCloseTo(0, 6);
    expect(snapshot.normalizedIntensity).toBeCloseTo(1, 6);
    expect(snapshot.envelopeAmplitude).toBeCloseTo(1, 6);
  });

  it("drops toward a minimum when the edge-path split approaches one wavelength", () => {
    const snapshot = sampleDiffractionPattern(
      {
        wavelength: 1,
        slitWidth: 2.4,
        probeY: 2.55,
      },
      2.55,
    );

    expect(snapshot.edgePathDifferenceInWavelengths).toBeGreaterThan(0.95);
    expect(snapshot.edgePathDifferenceInWavelengths).toBeLessThan(1.05);
    expect(snapshot.normalizedIntensity).toBeLessThan(0.08);
  });

  it("widens when wavelength grows relative to the opening", () => {
    const tight = sampleDiffractionState(
      {
        wavelength: 0.6,
        slitWidth: 3,
        probeY: 0,
      },
      0,
    );
    const broad = sampleDiffractionState(
      {
        wavelength: 1.6,
        slitWidth: 2,
        probeY: 0,
      },
      0,
    );

    expect(tight.firstMinimumAngleDeg).not.toBeNull();
    expect(broad.firstMinimumAngleDeg).not.toBeNull();
    expect((broad.firstMinimumAngleDeg ?? 0)).toBeGreaterThan(tight.firstMinimumAngleDeg ?? 0);
    expect(broad.wavelengthToSlitRatio).toBeGreaterThan(tight.wavelengthToSlitRatio);
  });

  it("builds time and screen-pattern series", () => {
    const series = buildDiffractionSeries({
      wavelength: 1,
      slitWidth: 2.4,
      probeY: 0.6,
    });

    expect(series.displacement).toHaveLength(4);
    expect(series.pattern).toHaveLength(1);
    expect(series.pattern[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current spread state in plain language", () => {
    const description = describeDiffractionState(
      {
        wavelength: 1,
        slitWidth: 2.4,
        probeY: 0.6,
      },
      0.25,
    );

    expect(description).toContain("lambda/a ratio");
    expect(description).toContain("first minimum");
  });
});
