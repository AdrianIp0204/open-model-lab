import { describe, expect, it } from "vitest";
import {
  buildEquivalentResistanceSeries,
  describeEquivalentResistanceState,
  sampleEquivalentResistanceState,
} from "@/lib/physics";

describe("equivalent-resistance helpers", () => {
  it("reduces the grouped pair before adding the outer resistor", () => {
    const seriesGroup = sampleEquivalentResistanceState(
      {
        voltage: 12,
        resistance1: 4,
        resistance2: 6,
        resistance3: 6,
        groupParallel: false,
      },
      3,
    );
    const parallelGroup = sampleEquivalentResistanceState(
      {
        voltage: 12,
        resistance1: 4,
        resistance2: 6,
        resistance3: 6,
        groupParallel: true,
      },
      3,
    );

    expect(seriesGroup.groupEquivalentResistance).toBeCloseTo(12, 6);
    expect(seriesGroup.equivalentResistance).toBeCloseTo(16, 6);
    expect(seriesGroup.totalCurrent).toBeCloseTo(0.75, 6);

    expect(parallelGroup.groupEquivalentResistance).toBeCloseTo(3, 6);
    expect(parallelGroup.equivalentResistance).toBeCloseTo(7, 6);
    expect(parallelGroup.totalCurrent).toBeCloseTo(12 / 7, 6);
  });

  it("tracks grouped branch charge honestly over inspected time", () => {
    const snapshot = sampleEquivalentResistanceState(
      {
        voltage: 12,
        resistance1: 4,
        resistance2: 4,
        resistance3: 12,
        groupParallel: true,
      },
      4,
    );

    expect(snapshot.resistor2.charge).toBeGreaterThan(snapshot.resistor3.charge);
    expect(snapshot.totalCharge).toBeCloseTo(snapshot.totalCurrent * 4, 6);
    expect(snapshot.groupVoltage).toBeCloseTo(snapshot.resistor3.voltage, 6);
  });

  it("keeps Kirchhoff current and loop balances honest on the bounded grouped circuit", () => {
    const parallel = sampleEquivalentResistanceState(
      {
        voltage: 12,
        resistance1: 4,
        resistance2: 6,
        resistance3: 12,
        groupParallel: true,
      },
      0,
    );
    const series = sampleEquivalentResistanceState(
      {
        voltage: 12,
        resistance1: 4,
        resistance2: 4,
        resistance3: 8,
        groupParallel: false,
      },
      0,
    );

    expect(parallel.totalCurrent).toBeCloseTo(
      parallel.resistor2.current + parallel.resistor3.current,
      6,
    );
    expect(
      parallel.voltage - parallel.resistor1.voltage - parallel.resistor3.voltage,
    ).toBeCloseTo(0, 6);
    expect(
      series.voltage -
        series.resistor1.voltage -
        series.resistor2.voltage -
        series.resistor3.voltage,
    ).toBeCloseTo(0, 6);
  });

  it("builds the expected response graph groups", () => {
    const series = buildEquivalentResistanceSeries({
      voltage: 12,
      resistance1: 4,
      resistance2: 4,
      resistance3: 12,
      groupParallel: true,
    });

    expect(series["equivalent-map"]).toHaveLength(2);
    expect(series["current-map"]).toHaveLength(3);
    expect(series["voltage-share"]).toHaveLength(3);
    expect(series["equivalent-map"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the reduction, current, and grouped behavior honestly", () => {
    const description = describeEquivalentResistanceState(
      {
        voltage: 12,
        resistance1: 4,
        resistance2: 4,
        resistance3: 12,
        groupParallel: true,
      },
      4,
    );

    expect(description).toContain("grouped pair");
    expect(description).toContain("total current");
    expect(description).toContain("R2 carries");
    expect(description).toContain("R3 carries");
  });
});
