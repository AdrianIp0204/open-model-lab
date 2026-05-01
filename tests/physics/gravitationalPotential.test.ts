import { describe, expect, it } from "vitest";
import {
  buildGravitationalPotentialSeries,
  describeGravitationalPotentialState,
  sampleGravitationalPotentialState,
} from "@/lib/physics";

describe("gravitational-potential helpers", () => {
  it("halves the potential magnitude while quartering the field at double distance", () => {
    const near = sampleGravitationalPotentialState({
      sourceMass: 2,
      probeX: 1,
      probeY: 0,
      testMass: 1,
    });
    const far = sampleGravitationalPotentialState({
      sourceMass: 2,
      probeX: 2,
      probeY: 0,
      testMass: 1,
    });

    expect(near.potential).toBeCloseTo(-2, 6);
    expect(far.potential).toBeCloseTo(-1, 6);
    expect(far.potential / near.potential).toBeCloseTo(0.5, 6);
    expect(far.fieldMagnitude / near.fieldMagnitude).toBeCloseTo(0.25, 6);
  });

  it("keeps the potential fixed while a heavier probe mass rescales energy", () => {
    const lightProbe = sampleGravitationalPotentialState({
      sourceMass: 2,
      probeX: 1.6,
      probeY: 1.2,
      testMass: 1,
    });
    const heavyProbe = sampleGravitationalPotentialState({
      sourceMass: 2,
      probeX: 1.6,
      probeY: 1.2,
      testMass: 2,
    });

    expect(heavyProbe.potential).toBeCloseTo(lightProbe.potential, 6);
    expect(heavyProbe.fieldMagnitude).toBeCloseTo(lightProbe.fieldMagnitude, 6);
    expect(heavyProbe.potentialEnergy).toBeCloseTo(lightProbe.potentialEnergy * 2, 6);
    expect(heavyProbe.forceMagnitude).toBeCloseTo(lightProbe.forceMagnitude * 2, 6);
  });

  it("builds the expected scan-line series groups", () => {
    const series = buildGravitationalPotentialSeries({
      sourceMass: 2,
      probeX: 1.6,
      probeY: 1.2,
      testMass: 1,
    });

    expect(series["potential-energy-scan"]).toHaveLength(2);
    expect(series["field-link"]).toHaveLength(2);
    expect(series["potential-energy-scan"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the potential well and downhill field relation honestly", () => {
    const description = describeGravitationalPotentialState({
      sourceMass: 2,
      probeX: 2,
      probeY: 0,
      testMass: 2,
    });

    expect(description).toContain("gravitational potential");
    expect(description).toContain("downhill direction");
    expect(description).toContain("potential energy");
  });
});
