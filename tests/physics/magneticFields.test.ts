import { describe, expect, it } from "vitest";
import {
  buildMagneticFieldsSeries,
  describeMagneticFieldsState,
  sampleMagneticFieldsState,
} from "@/lib/physics";

describe("magnetic-fields helpers", () => {
  it("cancels the net field at the midpoint between equal same-direction currents on axis", () => {
    const snapshot = sampleMagneticFieldsState({
      currentA: 2,
      currentB: 2,
      sourceSeparation: 2,
      probeX: 0,
      probeY: 0,
    });

    expect(snapshot.fieldMagnitude).toBeCloseTo(0, 6);
  });

  it("points the opposite-current midpoint-above field upward", () => {
    const snapshot = sampleMagneticFieldsState({
      currentA: 2,
      currentB: -2,
      sourceSeparation: 2.4,
      probeX: 0,
      probeY: 1,
    });

    expect(snapshot.fieldY).toBeGreaterThan(0);
    expect(Math.abs(snapshot.fieldX)).toBeLessThan(0.001);
  });

  it("reverses the field when both currents reverse together", () => {
    const forward = sampleMagneticFieldsState({
      currentA: 2,
      currentB: -2,
      sourceSeparation: 2.4,
      probeX: 0.4,
      probeY: 0.9,
    });
    const reversed = sampleMagneticFieldsState({
      currentA: -2,
      currentB: 2,
      sourceSeparation: 2.4,
      probeX: 0.4,
      probeY: 0.9,
    });

    expect(reversed.fieldX).toBeCloseTo(-forward.fieldX, 6);
    expect(reversed.fieldY).toBeCloseTo(-forward.fieldY, 6);
    expect(reversed.fieldMagnitude).toBeCloseTo(forward.fieldMagnitude, 6);
  });

  it("builds the expected scan-line series groups", () => {
    const series = buildMagneticFieldsSeries({
      currentA: 2,
      currentB: -2,
      sourceSeparation: 2.4,
      probeX: 0,
      probeY: 1,
    });

    expect(series["field-scan"]).toHaveLength(3);
    expect(series["direction-scan"]).toHaveLength(2);
    expect(series["field-scan"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current-source field honestly", () => {
    const description = describeMagneticFieldsState({
      currentA: 2,
      currentB: -2,
      sourceSeparation: 2.4,
      probeX: 0,
      probeY: 1,
    });

    expect(description).toContain("net magnetic field");
    expect(description).toContain("currents");
    expect(description).toContain("vector addition");
  });
});
