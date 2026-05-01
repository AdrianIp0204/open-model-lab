import { describe, expect, it } from "vitest";
import {
  buildOpticalResolutionSeries,
  describeOpticalResolutionState,
  sampleOpticalResolutionProfile,
  sampleOpticalResolutionState,
} from "@/lib/physics";

describe("optical-resolution helpers", () => {
  it("hits the Rayleigh threshold near the authored threshold preset", () => {
    const snapshot = sampleOpticalResolutionState({
      wavelengthNm: 550,
      apertureMm: 2.4,
      separationMrad: 0.28,
      probeYUm: 0,
    });

    expect(snapshot.separationRatio).toBeGreaterThan(0.98);
    expect(snapshot.separationRatio).toBeLessThan(1.02);
    expect(snapshot.centerDipRatio).toBeGreaterThan(0.7);
    expect(snapshot.centerDipRatio).toBeLessThan(0.9);
  });

  it("shows clearer separation when the aperture widens", () => {
    const blurred = sampleOpticalResolutionState({
      wavelengthNm: 650,
      apertureMm: 1.6,
      separationMrad: 0.22,
      probeYUm: 0,
    });
    const resolved = sampleOpticalResolutionState({
      wavelengthNm: 500,
      apertureMm: 3.6,
      separationMrad: 0.5,
      probeYUm: 0,
    });

    expect(resolved.separationRatio).toBeGreaterThan(blurred.separationRatio);
    expect(resolved.centerDipRatio).toBeLessThan(blurred.centerDipRatio);
    expect(resolved.resolutionLabel).toBe("resolved");
  });

  it("samples the detector profile and keeps the center normalized", () => {
    const center = sampleOpticalResolutionProfile(
      {
        wavelengthNm: 550,
        apertureMm: 2.4,
        separationMrad: 0.32,
        probeYUm: 0,
      },
      0,
    );

    expect(center.normalizedCombinedExposure).toBeGreaterThan(0.45);
    expect(center.normalizedCombinedExposure).toBeLessThan(0.7);
    expect(center.normalizedCombinedExposure).toBeLessThan(1);
  });

  it("builds the combined and component detector series", () => {
    const series = buildOpticalResolutionSeries({
      wavelengthNm: 550,
      apertureMm: 2.4,
      separationMrad: 0.32,
      probeYUm: 0,
    });

    expect(series["image-profile"]).toHaveLength(3);
    expect(series["image-profile"]?.[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current resolution state in plain language", () => {
    const description = describeOpticalResolutionState({
      wavelengthNm: 550,
      apertureMm: 2.4,
      separationMrad: 0.32,
      probeYUm: 0,
    });

    expect(description).toContain("Rayleigh limit");
    expect(description).toContain("point separation");
  });
});
