import { describe, expect, it } from "vitest";
import {
  buildMagneticForceSeries,
  describeMagneticForceState,
  sampleMagneticForceState,
} from "@/lib/physics";

describe("magnetic-force helpers", () => {
  it("keeps a positive charge and same-direction wire on the same force side", () => {
    const snapshot = sampleMagneticForceState({
      fieldStrength: 1.6,
      speed: 4.5,
      directionAngle: 0,
      negativeCharge: false,
      current: 2,
    }, 0);

    expect(snapshot.chargeForceY).toBeLessThan(0);
    expect(snapshot.wireForceY).toBeLessThan(0);
    expect(snapshot.chargeMatchesWireDirection).toBe(true);
    expect(snapshot.curvatureSense).toBe("clockwise");
  });

  it("separates the negative charge from the wire force in a reversed field", () => {
    const snapshot = sampleMagneticForceState({
      fieldStrength: -0.8,
      speed: 1.5,
      directionAngle: 0,
      negativeCharge: true,
      current: 2,
    }, 0);

    expect(snapshot.chargeForceY).toBeLessThan(0);
    expect(snapshot.wireForceY).toBeGreaterThan(0);
    expect(snapshot.chargeMatchesWireDirection).toBe(false);
    expect(snapshot.radius).toBeCloseTo(1.875, 6);
  });

  it("builds the expected position and force series groups", () => {
    const series = buildMagneticForceSeries({
      fieldStrength: -0.8,
      speed: 1.5,
      directionAngle: 0,
      negativeCharge: true,
      current: 2,
    });

    expect(series.position).toHaveLength(2);
    expect(series.force).toHaveLength(3);
    expect(series.position[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the charge and wire representations honestly", () => {
    const description = describeMagneticForceState({
      fieldStrength: -0.8,
      speed: 1.5,
      directionAngle: 0,
      negativeCharge: true,
      current: 2,
    }, 0);

    expect(description).toContain("negative charge");
    expect(description).toContain("wire segment force");
    expect(description).toContain("charge force points down");
  });
});
