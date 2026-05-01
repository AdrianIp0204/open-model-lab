import { describe, expect, it } from "vitest";
import {
  buildRationalFunctionsSeries,
  describeRationalFunctionsState,
  sampleRationalFunctionsCurveSegments,
  sampleRationalFunctionsState,
} from "@/lib/physics";

describe("rational-functions helpers", () => {
  it("samples asymptotes, intercepts, and near-break values from the shifted reciprocal family", () => {
    const snapshot = sampleRationalFunctionsState({
      asymptoteX: 1,
      horizontalAsymptoteY: -1,
      branchScale: 2,
      sampleDistance: 0.5,
      showHole: false,
    });

    expect(snapshot.domainBreaks).toEqual([1]);
    expect(snapshot.leftProbeValue).toBeCloseTo(-5, 6);
    expect(snapshot.rightProbeValue).toBeCloseTo(3, 6);
    expect(snapshot.xIntercept).toBeCloseTo(3, 6);
    expect(snapshot.yIntercept).toBeCloseTo(-3, 6);
  });

  it("keeps a removable hole distinct from the true asymptote", () => {
    const snapshot = sampleRationalFunctionsState({
      asymptoteX: -1,
      horizontalAsymptoteY: -0.5,
      branchScale: 3,
      sampleDistance: 0.6,
      showHole: true,
      holeX: 1,
    });
    const segments = sampleRationalFunctionsCurveSegments({
      asymptoteX: -1,
      horizontalAsymptoteY: -0.5,
      branchScale: 3,
      sampleDistance: 0.6,
      showHole: true,
      holeX: 1,
    });

    expect(snapshot.domainBreaks).toEqual([-1, 1]);
    expect(snapshot.holeValue).toBeCloseTo(1, 6);
    expect(segments).toHaveLength(3);
  });

  it("builds the near-asymptote response series and describes the domain breaks plainly", () => {
    const series = buildRationalFunctionsSeries({
      asymptoteX: 1,
      horizontalAsymptoteY: -1,
      branchScale: -1.8,
      sampleDistance: 0.6,
      showHole: true,
      holeX: 2,
    });
    const description = describeRationalFunctionsState({
      asymptoteX: 1,
      horizontalAsymptoteY: -1,
      branchScale: -1.8,
      sampleDistance: 0.6,
      showHole: true,
      holeX: 2,
    });

    expect(series["asymptote-response"]).toHaveLength(3);
    expect(series["asymptote-response"][0]?.id).toBe("left-approach");
    expect(series["asymptote-response"][1]?.id).toBe("right-approach");
    expect(series["asymptote-response"][2]?.id).toBe("horizontal-asymptote");
    expect(description).toContain("vertical asymptote x = 1");
    expect(description).toContain("domain breaks at 1 and 2");
    expect(description).toContain("removable hole");
  });
});
