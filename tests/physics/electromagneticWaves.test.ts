import { describe, expect, it } from "vitest";
import {
  buildElectromagneticWavesSeries,
  describeElectromagneticWavesState,
  sampleElectromagneticWavesState,
} from "@/lib/physics";

describe("electromagnetic-waves helpers", () => {
  it("keeps the electric and magnetic fields in phase at one probe point", () => {
    const snapshot = sampleElectromagneticWavesState(
      {
        electricAmplitude: 1.2,
        waveSpeed: 2.8,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0.4,
    );

    expect(snapshot.electricField / snapshot.magneticField).toBeCloseTo(snapshot.waveSpeed, 6);
    expect(snapshot.electricDirectionLabel).not.toBe("near zero");
    expect(snapshot.magneticDirectionLabel).not.toBe("near zero");
  });

  it("makes the magnetic amplitude larger when the same electric wave travels more slowly", () => {
    const slow = sampleElectromagneticWavesState(
      {
        electricAmplitude: 1.2,
        waveSpeed: 1.8,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0,
    );
    const fast = sampleElectromagneticWavesState(
      {
        electricAmplitude: 1.2,
        waveSpeed: 4.2,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0,
    );

    expect(slow.magneticAmplitude).toBeGreaterThan(fast.magneticAmplitude);
    expect(slow.travelDelay).toBeGreaterThan(fast.travelDelay);
  });

  it("builds the expected time-series graph groups", () => {
    const series = buildElectromagneticWavesSeries({
      electricAmplitude: 1.2,
      waveSpeed: 2.8,
      wavelength: 1.8,
      probeX: 2.7,
    });

    expect(series["probe-fields"]).toHaveLength(2);
    expect(series["source-probe"]).toHaveLength(2);
    expect(series["probe-fields"][0]?.points.length).toBeGreaterThan(100);
  });

  it("returns an in-phase label when the probe is one wavelength away", () => {
    const snapshot = sampleElectromagneticWavesState(
      {
        electricAmplitude: 1.2,
        waveSpeed: 2.8,
        wavelength: 1.8,
        probeX: 1.8,
      },
      0.2,
    );

    expect(snapshot.phaseLagCycles).toBeCloseTo(1, 6);
    expect(snapshot.phaseAlignmentLabel).toBe("in-phase");
  });

  it("describes the paired-field propagation story honestly", () => {
    const description = describeElectromagneticWavesState(
      {
        electricAmplitude: 1.2,
        waveSpeed: 2.8,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0.25,
    );

    expect(description).toContain("electric field");
    expect(description).toContain("magnetic field");
    expect(description).toContain("travel delay");
  });
});
