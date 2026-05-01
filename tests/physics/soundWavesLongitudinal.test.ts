import { describe, expect, it } from "vitest";
import {
  buildSoundWavesLongitudinalSeries,
  describeSoundWavesLongitudinalState,
  getSoundWaveCompressionCenters,
  getSoundWaveRarefactionCenters,
  sampleSoundWavesLongitudinalDisplacement,
  sampleSoundWavesLongitudinalState,
} from "@/lib/physics";

describe("sound-waves longitudinal helpers", () => {
  it("places compressions and rarefactions at the expected repeating positions", () => {
    const compressions = getSoundWaveCompressionCenters(
      {
        amplitude: 0.12,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0,
    );
    const rarefactions = getSoundWaveRarefactionCenters(
      {
        amplitude: 0.12,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0,
    );

    expect(compressions.map((value) => Number(value.toFixed(6)))).toEqual([0.9, 2.7, 4.5, 6.3]);
    expect(rarefactions.map((value) => Number(value.toFixed(6)))).toEqual([0, 1.8, 3.6, 5.4, 7.2]);
  });

  it("keeps the probe parcel near center while the local compression cue peaks", () => {
    const snapshot = sampleSoundWavesLongitudinalState(
      {
        amplitude: 0.12,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0,
    );

    expect(snapshot.probeDisplacement).toBeCloseTo(0, 6);
    expect(snapshot.normalizedProbeCompression).toBeCloseTo(1, 6);
    expect(snapshot.intensityCue).toBeCloseTo(0.0144, 6);
    expect(snapshot.compressionLabel).toBe("compression");
    expect(snapshot.phaseLagCycles).toBeCloseTo(1.5, 6);
    expect(snapshot.travelDelay).toBeCloseTo(1.125, 6);
  });

  it("supports frequency-driven sound setups when wavelength is not provided directly", () => {
    const snapshot = sampleSoundWavesLongitudinalState(
      {
        amplitude: 0.1,
        waveSpeed: 2.4,
        frequency: 1.6,
        probeX: 2.2,
      },
      0,
    );

    expect(snapshot.frequency).toBeCloseTo(1.6, 6);
    expect(snapshot.wavelength).toBeCloseTo(1.5, 6);
    expect(snapshot.period).toBeCloseTo(0.625, 6);
  });

  it("samples the live displacement field and builds linked time-domain series", () => {
    expect(
      sampleSoundWavesLongitudinalDisplacement(
        {
          amplitude: 0.16,
          waveSpeed: 2.4,
          wavelength: 1.8,
          probeX: 0,
        },
        0,
        0.1875,
      ),
    ).toBeCloseTo(-0.16, 6);

    const series = buildSoundWavesLongitudinalSeries({
      amplitude: 0.12,
      waveSpeed: 2.4,
      wavelength: 1.8,
      probeX: 2.25,
    });

    expect(series.displacement).toHaveLength(2);
    expect(series["probe-pressure"]).toHaveLength(2);
    expect(series["intensity-response"]).toHaveLength(1);
    expect(series.displacement[0]?.points.length).toBeGreaterThan(100);
    expect(series["probe-pressure"][0]?.points.length).toBeGreaterThan(100);
    expect(series["intensity-response"][0]?.points.at(-1)?.y).toBeCloseTo(0.0576, 6);
  });

  it("describes the live longitudinal-wave timing and local medium state", () => {
    const description = describeSoundWavesLongitudinalState(
      {
        amplitude: 0.12,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.7,
      },
      0,
    );

    expect(description).toContain("longitudinal wave");
    expect(description).toContain("travel delay");
    expect(description).toContain("compression");
  });
});
