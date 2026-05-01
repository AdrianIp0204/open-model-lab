import { describe, expect, it } from "vitest";
import {
  buildElectromagneticInductionSeries,
  describeElectromagneticInductionState,
  sampleElectromagneticInductionState,
} from "@/lib/physics";

function getMaxAbsY(points: Array<{ x: number; y: number }>) {
  return Math.max(...points.map((point) => Math.abs(point.y)), 0);
}

describe("electromagnetic-induction helpers", () => {
  it("keeps emf and current near zero for a stationary centered magnet", () => {
    const snapshot = sampleElectromagneticInductionState({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 0,
      startOffset: 0,
      northFacingCoil: true,
    }, 0);

    expect(Math.abs(snapshot.fieldStrength)).toBeGreaterThan(0.1);
    expect(snapshot.emf).toBeCloseTo(0, 6);
    expect(snapshot.current).toBeCloseTo(0, 6);
    expect(snapshot.currentDirection).toBe("none");
  });

  it("reverses the induction sign when the facing pole flips", () => {
    const forward = sampleElectromagneticInductionState({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 1.2,
      startOffset: 2.6,
      northFacingCoil: true,
    }, 1.4);
    const reversed = sampleElectromagneticInductionState({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 1.2,
      startOffset: 2.6,
      northFacingCoil: false,
    }, 1.4);

    expect(reversed.fieldStrength).toBeCloseTo(-forward.fieldStrength, 6);
    expect(reversed.fluxLinkage).toBeCloseTo(-forward.fluxLinkage, 6);
    expect(reversed.emf).toBeCloseTo(-forward.emf, 6);
    expect(reversed.current).toBeCloseTo(-forward.current, 6);
  });

  it("makes the induced-response peaks larger for a faster pass", () => {
    const slowSeries = buildElectromagneticInductionSeries({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 0.8,
      startOffset: 2.6,
      northFacingCoil: true,
    });
    const fastSeries = buildElectromagneticInductionSeries({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 1.6,
      startOffset: 2.6,
      northFacingCoil: true,
    });

    const slowMaxEmf = getMaxAbsY(slowSeries["induced-response"][0]?.points ?? []);
    const fastMaxEmf = getMaxAbsY(fastSeries["induced-response"][0]?.points ?? []);

    expect(fastMaxEmf).toBeGreaterThan(slowMaxEmf);
  });

  it("builds the expected graph groups", () => {
    const series = buildElectromagneticInductionSeries({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 1.2,
      startOffset: 2.6,
      northFacingCoil: true,
    });

    expect(series["field-flux"]).toHaveLength(2);
    expect(series["induced-response"]).toHaveLength(2);
    expect(series["field-flux"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the flux-change story honestly", () => {
    const description = describeElectromagneticInductionState({
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 1.2,
      startOffset: 2.6,
      northFacingCoil: true,
    }, 1.4);

    expect(description).toContain("flux");
    expect(description).toContain("emf");
    expect(description).toContain("current");
  });
});
