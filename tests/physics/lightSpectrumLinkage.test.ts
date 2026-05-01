import { describe, expect, it } from "vitest";
import {
  buildLightSpectrumLinkageSeries,
  describeLightSpectrumLinkageState,
  sampleLightSpectrumLinkageState,
} from "@/lib/physics";

describe("light-spectrum-linkage helpers", () => {
  it("classifies visible green light and shortens the wavelength in a denser medium", () => {
    const snapshot = sampleLightSpectrumLinkageState(
      {
        fieldAmplitude: 1.05,
        logWavelength: -6.27,
        mediumIndex: 1.52,
        probeCycles: 1,
      },
      0.25,
    );

    expect(snapshot.bandId).toBe("visible");
    expect(snapshot.visibleColorLabel).toBe("green");
    expect(snapshot.mediumWavelengthMeters).toBeCloseTo(
      snapshot.vacuumWavelengthMeters / snapshot.mediumIndex,
      12,
    );
    expect(snapshot.phaseVelocityFractionC).toBeCloseTo(1 / snapshot.mediumIndex, 12);
  });

  it("keeps non-visible wavelengths in the spectrum without inventing a visible-color cue", () => {
    const snapshot = sampleLightSpectrumLinkageState(
      {
        fieldAmplitude: 1.05,
        logWavelength: -5.92,
        mediumIndex: 1,
        probeCycles: 1,
      },
      0,
    );

    expect(snapshot.bandId).toBe("infrared");
    expect(snapshot.isVisible).toBe(false);
    expect(snapshot.visibleColorLabel).toBeNull();
  });

  it("builds the expected graph groups for probe, source, and display-space views", () => {
    const series = buildLightSpectrumLinkageSeries({
      fieldAmplitude: 1.05,
      logWavelength: -6.27,
      mediumIndex: 1.52,
      probeCycles: 1,
    });

    expect(series["probe-fields"]).toHaveLength(2);
    expect(series["source-probe"]).toHaveLength(2);
    expect(series["space-profile"]).toHaveLength(2);
    expect(series["probe-fields"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the spectrum-to-medium bridge honestly", () => {
    const description = describeLightSpectrumLinkageState(
      {
        fieldAmplitude: 1.05,
        logWavelength: -6.27,
        mediumIndex: 1.52,
        probeCycles: 1,
      },
      0.25,
    );

    expect(description).toContain("visible light");
    expect(description).toContain("frequency");
    expect(description).toContain("in-medium wavelength");
    expect(description).toContain("probe");
  });
});
