import { describe, expect, it } from "vitest";
import {
  buildIntegralAccumulationSeries,
  describeIntegralAccumulationState,
  sampleIntegralAccumulationState,
} from "@/lib/physics";

describe("integral-accumulation helpers", () => {
  it("samples the source height and accumulated amount from the same bound", () => {
    const snapshot = sampleIntegralAccumulationState({
      upperBound: 2,
    });

    expect(snapshot.upperBound).toBeCloseTo(2, 6);
    expect(snapshot.sourceHeight).toBeCloseTo(-1 / 3, 6);
    expect(snapshot.accumulatedValue).toBeCloseTo(10 / 9, 6);
    expect(snapshot.accumulationSlope).toBeCloseTo(snapshot.sourceHeight, 6);
  });

  it("builds source and accumulation graph series", () => {
    const series = buildIntegralAccumulationSeries({
      upperBound: 1.6,
    });

    expect(series["source-function"]).toHaveLength(1);
    expect(series["source-function"][0]?.id).toBe("source-curve");
    expect(series["accumulation-function"]).toHaveLength(1);
    expect(series["accumulation-function"][0]?.id).toBe("accumulation-curve");
    expect(series["accumulation-scan"]).toHaveLength(2);
  });

  it("describes the local height and running total plainly", () => {
    const description = describeIntegralAccumulationState({
      upperBound: 2.2,
    });

    expect(description).toContain("source height");
    expect(description).toContain("accumulated amount");
    expect(description).toContain("running total");
  });
});
