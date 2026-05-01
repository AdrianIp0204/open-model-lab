import { describe, expect, it } from "vitest";
import {
  buildElectricFieldsSeries,
  describeElectricFieldsState,
  sampleElectricFieldsState,
} from "@/lib/physics";

describe("electric-fields helpers", () => {
  it("cancels the net field at the midpoint between equal like charges on axis", () => {
    const snapshot = sampleElectricFieldsState({
      sourceChargeA: 2,
      sourceChargeB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 0,
      testCharge: 1,
    });

    expect(snapshot.fieldMagnitude).toBeCloseTo(0, 6);
    expect(snapshot.forceMagnitude).toBeCloseTo(0, 6);
  });

  it("keeps the field fixed while a negative test charge reverses the force", () => {
    const positive = sampleElectricFieldsState({
      sourceChargeA: 2,
      sourceChargeB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 1,
      testCharge: 1,
    });
    const negative = sampleElectricFieldsState({
      sourceChargeA: 2,
      sourceChargeB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 1,
      testCharge: -1,
    });

    expect(negative.fieldX).toBeCloseTo(positive.fieldX, 6);
    expect(negative.fieldY).toBeCloseTo(positive.fieldY, 6);
    expect(negative.forceX).toBeCloseTo(-positive.forceX, 6);
    expect(negative.forceY).toBeCloseTo(-positive.forceY, 6);
  });

  it("points the dipole field mostly toward the negative charge above the midpoint", () => {
    const snapshot = sampleElectricFieldsState({
      sourceChargeA: 2,
      sourceChargeB: -2,
      sourceSeparation: 2.4,
      probeX: 0,
      probeY: 1,
      testCharge: 1,
    });

    expect(snapshot.fieldX).toBeGreaterThan(0);
    expect(Math.abs(snapshot.fieldX)).toBeGreaterThan(Math.abs(snapshot.fieldY));
  });

  it("builds the expected scan-line series groups", () => {
    const series = buildElectricFieldsSeries({
      sourceChargeA: 2,
      sourceChargeB: -2,
      sourceSeparation: 2.4,
      probeX: 0,
      probeY: 1,
      testCharge: 1,
    });

    expect(series["field-scan"]).toHaveLength(3);
    expect(series["direction-scan"]).toHaveLength(2);
    expect(series["field-scan"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the field-force relationship honestly", () => {
    const description = describeElectricFieldsState({
      sourceChargeA: 2,
      sourceChargeB: -2,
      sourceSeparation: 2.4,
      probeX: 0,
      probeY: 1,
      testCharge: -1,
    });

    expect(description).toContain("net field");
    expect(description).toContain("test charge");
    expect(description).toContain("force arrow flips opposite the field");
  });
});
