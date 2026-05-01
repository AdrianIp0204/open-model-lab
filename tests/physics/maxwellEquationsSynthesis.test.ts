import { describe, expect, it } from "vitest";
import {
  buildMaxwellEquationsSynthesisSeries,
  describeMaxwellEquationsSynthesisState,
  sampleMaxwellEquationsSynthesisState,
} from "@/lib/physics";

describe("maxwell-equations-synthesis helpers", () => {
  it("keeps magnetic net flux at zero while electric flux tracks enclosed charge", () => {
    const snapshot = sampleMaxwellEquationsSynthesisState(
      {
        chargeSource: -1.2,
        conductionCurrent: 0.4,
        electricChangeRate: 0.8,
        magneticChangeRate: 0.6,
        cycleRate: 0.9,
      },
      0.25,
    );

    expect(snapshot.electricFlux).toBeCloseTo(-1.2, 6);
    expect(snapshot.electricFluxDirection).toBe("inward");
    expect(snapshot.magneticNetFlux).toBeCloseTo(0, 6);
  });

  it("allows the changing-electric term to sustain B circulation without conduction current", () => {
    const snapshot = sampleMaxwellEquationsSynthesisState(
      {
        chargeSource: 0.6,
        conductionCurrent: 0,
        electricChangeRate: 1.2,
        magneticChangeRate: 0.9,
        cycleRate: 1,
      },
      0.25,
    );

    expect(snapshot.bCurrentContribution).toBeCloseTo(0, 6);
    expect(snapshot.bDisplacementContribution).toBeGreaterThan(1);
    expect(snapshot.bCirculation).toBeCloseTo(snapshot.bDisplacementContribution, 6);
  });

  it("marks the bridge as misaligned when the changing-field terms oppose each other", () => {
    const snapshot = sampleMaxwellEquationsSynthesisState(
      {
        chargeSource: 0.4,
        conductionCurrent: 0.4,
        electricChangeRate: 1.2,
        magneticChangeRate: -1.2,
        cycleRate: 1.1,
      },
      0.25,
    );

    expect(snapshot.alignedFieldPair).toBe(false);
    expect(snapshot.waveStateLabel).toBe("misaligned");
    expect(snapshot.waveSignedCue).toBeLessThan(0);
  });

  it("builds the expected graph groups", () => {
    const series = buildMaxwellEquationsSynthesisSeries({
      chargeSource: 1.1,
      conductionCurrent: 0.7,
      electricChangeRate: 0.9,
      magneticChangeRate: 0.9,
      cycleRate: 0.85,
    });

    expect(series["flux-laws"]).toHaveLength(2);
    expect(series["ampere-maxwell-link"]).toHaveLength(3);
    expect(series["faraday-wave-link"]).toHaveLength(3);
    expect(series["ampere-maxwell-link"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the source, circulation, and light bridge state", () => {
    const description = describeMaxwellEquationsSynthesisState(
      {
        chargeSource: 1.1,
        conductionCurrent: 0.7,
        electricChangeRate: 0.9,
        magneticChangeRate: 0.9,
        cycleRate: 0.85,
      },
      0.25,
    );

    expect(description).toContain("electric flux");
    expect(description).toContain("B circulation");
    expect(description).toContain("light");
  });
});
