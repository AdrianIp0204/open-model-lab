import { describe, expect, it } from "vitest";
import {
  buildStandingWavesSeries,
  describeStandingWavesState,
  getStandingWaveAntinodePositions,
  getStandingWaveNodePositions,
  sampleStandingWaveDisplacement,
  sampleStandingWavesState,
} from "@/lib/physics";

describe("standing-wave helpers", () => {
  it("places nodes and antinodes at the expected fixed positions", () => {
    const nodes = getStandingWaveNodePositions({
      length: 1.6,
      modeNumber: 3,
    });
    const antinodes = getStandingWaveAntinodePositions({
      length: 1.6,
      modeNumber: 3,
    });

    expect(nodes).toEqual([0, 0.5333333333333333, 1.0666666666666667, 1.6]);
    expect(antinodes).toEqual([0.26666666666666666, 0.8, 1.3333333333333333]);
  });

  it("keeps a node fixed while an antinode reaches full amplitude", () => {
    const nodeSnapshot = sampleStandingWavesState(
      {
        amplitude: 1.1,
        length: 1.6,
        modeNumber: 3,
        probeX: 1.0666666666666667,
      },
      0.2,
    );
    const antinodeSnapshot = sampleStandingWavesState(
      {
        amplitude: 1.1,
        length: 1.6,
        modeNumber: 3,
        probeX: 0.8,
      },
      0,
    );

    expect(nodeSnapshot.probeEnvelope).toBeLessThan(0.01);
    expect(nodeSnapshot.probeRegionLabel).toBe("node");
    expect(antinodeSnapshot.probeEnvelope).toBeCloseTo(1.1, 6);
    expect(antinodeSnapshot.probeDisplacement).toBeCloseTo(-1.1, 6);
    expect(antinodeSnapshot.probeRegionLabel).toBe("antinode");
  });

  it("builds linked mode-shape and probe-motion series", () => {
    const series = buildStandingWavesSeries({
      amplitude: 1.1,
      length: 1.6,
      modeNumber: 2,
      probeX: 1,
    });

    expect(series.shape).toHaveLength(1);
    expect(series.displacement).toHaveLength(3);
    expect(series.shape[0]?.points.length).toBeGreaterThan(100);
    expect(series.displacement[0]?.points.length).toBeGreaterThan(100);
  });

  it("samples the live displacement field and describes the current harmonic state", () => {
    expect(
      sampleStandingWaveDisplacement(
        {
          amplitude: 1,
          length: 1.6,
          modeNumber: 1,
          probeX: 0.8,
        },
        0.8,
        0,
      ),
    ).toBeCloseTo(1, 6);

    const description = describeStandingWavesState(
      {
        amplitude: 1,
        length: 1.6,
        modeNumber: 2,
        probeX: 0.8,
      },
      0.25,
    );

    expect(description).toContain("standing");
    expect(description).toContain("probe");
    expect(description).toContain("wavelength");
  });
});
