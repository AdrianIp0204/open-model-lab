import { describe, expect, it } from "vitest";
import {
  buildGravitationalFieldsSeries,
  describeGravitationalFieldsState,
  sampleGravitationalFieldsState,
} from "@/lib/physics";

describe("gravitational-fields helpers", () => {
  it("drops the field to one quarter when the same source is sampled at double distance", () => {
    const near = sampleGravitationalFieldsState({
      sourceMass: 2,
      probeX: 1,
      probeY: 0,
      testMass: 1,
    });
    const far = sampleGravitationalFieldsState({
      sourceMass: 2,
      probeX: 2,
      probeY: 0,
      testMass: 1,
    });

    expect(near.fieldMagnitude).toBeCloseTo(2, 6);
    expect(far.fieldMagnitude).toBeCloseTo(0.5, 6);
    expect(far.fieldMagnitude / near.fieldMagnitude).toBeCloseTo(0.25, 6);
  });

  it("keeps the field fixed while a heavier probe mass scales the force", () => {
    const lightProbe = sampleGravitationalFieldsState({
      sourceMass: 2,
      probeX: 1.6,
      probeY: 1.2,
      testMass: 1,
    });
    const heavyProbe = sampleGravitationalFieldsState({
      sourceMass: 2,
      probeX: 1.6,
      probeY: 1.2,
      testMass: 2,
    });

    expect(heavyProbe.fieldX).toBeCloseTo(lightProbe.fieldX, 6);
    expect(heavyProbe.fieldY).toBeCloseTo(lightProbe.fieldY, 6);
    expect(heavyProbe.forceX).toBeCloseTo(lightProbe.forceX * 2, 6);
    expect(heavyProbe.forceY).toBeCloseTo(lightProbe.forceY * 2, 6);
  });

  it("builds the expected scan-line series groups", () => {
    const series = buildGravitationalFieldsSeries({
      sourceMass: 2,
      probeX: 1.6,
      probeY: 1.2,
      testMass: 1,
    });

    expect(series["field-components"]).toHaveLength(2);
    expect(series["strength-response"]).toHaveLength(2);
    expect(series["field-components"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the source-field and probe-force relationship honestly", () => {
    const description = describeGravitationalFieldsState({
      sourceMass: 2,
      probeX: 2,
      probeY: 0,
      testMass: 2,
    });

    expect(description).toContain("source mass");
    expect(description).toContain("gravitational field");
    expect(description).toContain("test mass");
  });
});
