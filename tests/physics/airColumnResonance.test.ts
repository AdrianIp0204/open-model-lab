import { describe, expect, it } from "vitest";
import {
  buildAirColumnResonanceSeries,
  describeAirColumnResonanceState,
  getAirColumnAntinodePositions,
  getAirColumnNodePositions,
  sampleAirColumnResonanceState,
} from "@/lib/physics";

describe("air-column resonance helpers", () => {
  it("places displacement nodes and antinodes at the expected positions for open and closed tubes", () => {
    expect(
      getAirColumnNodePositions({
        length: 1.2,
        closedEnd: false,
        resonanceOrder: 2,
      }),
    ).toEqual([0.3, 0.8999999999999999]);
    expect(
      getAirColumnAntinodePositions({
        length: 1.2,
        closedEnd: false,
        resonanceOrder: 2,
      }),
    ).toEqual([0, 0.6, 1.2]);
    expect(
      getAirColumnNodePositions({
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
      }),
    ).toEqual([0, 0.7999999999999999]);
    expect(
      getAirColumnAntinodePositions({
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
      }),
    ).toEqual([0.39999999999999997, 1.2]);
  });

  it("keeps the closed wall as a displacement node and a pressure antinode", () => {
    const closedWall = sampleAirColumnResonanceState(
      {
        amplitude: 0.12,
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
        probeX: 0,
      },
      0.05,
    );
    const openMouth = sampleAirColumnResonanceState(
      {
        amplitude: 0.12,
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
        probeX: 1.2,
      },
      0.05,
    );

    expect(closedWall.probeEnvelope).toBeLessThan(0.001);
    expect(closedWall.probePressureEnvelope).toBeCloseTo(0.12, 6);
    expect(closedWall.probeRegionLabel).toBe("node");
    expect(openMouth.probePressureEnvelope).toBeLessThan(0.001);
    expect(openMouth.probeRegionLabel).toBe("antinode");
  });

  it("builds linked shape, probe, and ladder series", () => {
    const series = buildAirColumnResonanceSeries({
      amplitude: 0.12,
      length: 1.2,
      closedEnd: false,
      resonanceOrder: 2,
      probeX: 0.6,
    });

    expect(series.shape).toHaveLength(1);
    expect(series.displacement).toHaveLength(3);
    expect(series.ladder).toHaveLength(1);
    expect(series.shape[0]?.points.length).toBeGreaterThan(100);
    expect(series.ladder[0]?.points).toHaveLength(4);
  });

  it("describes the current tube resonance state", () => {
    const description = describeAirColumnResonanceState(
      {
        amplitude: 0.12,
        length: 1.2,
        closedEnd: true,
        resonanceOrder: 2,
        probeX: 0.4,
      },
      0.05,
    );

    expect(description).toContain("closed at one end");
    expect(description).toContain("frequency");
    expect(description).toContain("probe");
  });
});
