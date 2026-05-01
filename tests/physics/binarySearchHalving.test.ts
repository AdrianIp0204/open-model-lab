import { describe, expect, it } from "vitest";
import {
  buildBinarySearchHalvingSeries,
  describeBinarySearchHalvingState,
  sampleBinarySearchHalvingState,
} from "@/lib/physics";

describe("binary search / halving helpers", () => {
  it("keeps ordered-interval narrowing visible and beats a left-to-right scan on a far-right target", () => {
    const snapshot = sampleBinarySearchHalvingState(
      {
        arraySize: 18,
        targetIndex: 16,
        linearContrast: true,
      },
      99,
    );

    expect(snapshot.completed).toBe(true);
    expect(snapshot.found).toBe(true);
    expect(snapshot.targetValue).toBe(snapshot.values[16]);
    expect(snapshot.comparisons).toBeLessThan(snapshot.targetIndex + 1);
    expect(snapshot.binaryLead).toBeGreaterThan(0);
  });

  it("builds interval, pointer, and check histories from the same ordered search state", () => {
    const series = buildBinarySearchHalvingSeries({
      arraySize: 14,
      targetIndex: 9,
      linearContrast: true,
    });

    expect(series["interval-width-history"]).toHaveLength(1);
    expect(series["interval-width-history"][0]?.id).toBe("interval-width");
    expect(series["pointer-history"]).toHaveLength(3);
    expect(series["checks-history"]).toHaveLength(2);
  });

  it("describes the ordered-data constraint and the linear-search contrast honestly", () => {
    const description = describeBinarySearchHalvingState(
      {
        arraySize: 14,
        targetIndex: 11,
        linearContrast: true,
      },
      99,
    );

    expect(description).toContain("ordered list");
    expect(description).toContain("midpoint checks");
    expect(description).toContain("left-to-right scan");
  });
});
