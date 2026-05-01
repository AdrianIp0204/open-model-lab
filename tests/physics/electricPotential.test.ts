import { describe, expect, it } from "vitest";
import {
  buildElectricPotentialSeries,
  describeElectricPotentialState,
  sampleElectricPotentialState,
} from "@/lib/physics";

describe("electric-potential helpers", () => {
  it("keeps positive potential at the midpoint between equal like charges while the field cancels", () => {
    const snapshot = sampleElectricPotentialState({
      sourceChargeA: 2,
      sourceChargeB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 0,
      testCharge: 1,
    });

    expect(snapshot.potential).toBeCloseTo(4, 6);
    expect(snapshot.fieldMagnitude).toBeCloseTo(0, 6);
  });

  it("keeps the potential fixed while a negative test charge flips the potential-energy sign", () => {
    const positive = sampleElectricPotentialState({
      sourceChargeA: 2,
      sourceChargeB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 1,
      testCharge: 1,
    });
    const negative = sampleElectricPotentialState({
      sourceChargeA: 2,
      sourceChargeB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 1,
      testCharge: -1,
    });

    expect(negative.potential).toBeCloseTo(positive.potential, 6);
    expect(negative.potentialEnergy).toBeCloseTo(-positive.potentialEnergy, 6);
  });

  it("shows zero potential but nonzero field at the midpoint of an equal dipole", () => {
    const snapshot = sampleElectricPotentialState({
      sourceChargeA: 2,
      sourceChargeB: -2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 0,
      testCharge: 1,
    });

    expect(snapshot.potential).toBeCloseTo(0, 6);
    expect(snapshot.fieldX).toBeGreaterThan(0);
    expect(snapshot.fieldMagnitude).toBeGreaterThan(0);
  });

  it("builds the expected scan-line series groups", () => {
    const series = buildElectricPotentialSeries({
      sourceChargeA: 2,
      sourceChargeB: -2,
      sourceSeparation: 2.4,
      probeX: -0.8,
      probeY: 0.8,
      testCharge: 1,
    });

    expect(series["potential-scan"]).toHaveLength(3);
    expect(series["field-link"]).toHaveLength(2);
    expect(series["potential-scan"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the downhill field relation honestly", () => {
    const description = describeElectricPotentialState({
      sourceChargeA: 2,
      sourceChargeB: -2,
      sourceSeparation: 2.4,
      probeX: -0.8,
      probeY: 0.8,
      testCharge: -1,
    });

    expect(description).toContain("net potential");
    expect(description).toContain("downhill direction");
    expect(description).toContain("potential energy");
  });
});
