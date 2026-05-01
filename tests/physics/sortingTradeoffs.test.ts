import { describe, expect, it } from "vitest";
import {
  buildSortingTradeoffsSeries,
  describeSortingTradeoffsState,
  sampleSortingTradeoffsState,
} from "@/lib/physics";

describe("sorting trade-offs helpers", () => {
  it("shows how insertion can exploit a nearly sorted list more cheaply than a heavy bubble run", () => {
    const insertionNearlySorted = sampleSortingTradeoffsState(
      {
        algorithmIndex: 2,
        patternIndex: 1,
        arraySize: 9,
      },
      99,
    );
    const bubbleReverse = sampleSortingTradeoffsState(
      {
        algorithmIndex: 0,
        patternIndex: 2,
        arraySize: 9,
      },
      99,
    );

    expect(insertionNearlySorted.completed).toBe(true);
    expect(insertionNearlySorted.values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(insertionNearlySorted.writeCount).toBeLessThan(bubbleReverse.writeCount);
    expect(insertionNearlySorted.comparisons).toBeLessThan(bubbleReverse.comparisons);
  });

  it("builds the operations and disorder graphs from the same live sorting trace", () => {
    const series = buildSortingTradeoffsSeries({
      algorithmIndex: 1,
      patternIndex: 0,
      arraySize: 8,
    });

    expect(series["operations-history"]).toHaveLength(2);
    expect(series["operations-history"][0]?.id).toBe("comparisons-history");
    expect(series["operations-history"][1]?.id).toBe("writes-history");
    expect(series["disorder-history"]).toHaveLength(2);
    expect(series["disorder-share"]).toHaveLength(1);
  });

  it("describes sorting as visible work instead of only the final answer", () => {
    const description = describeSortingTradeoffsState(
      {
        algorithmIndex: 2,
        patternIndex: 1,
        arraySize: 9,
      },
      99,
    );

    expect(description).toContain("Insertion");
    expect(description).toContain("nearly sorted");
    expect(description).toContain("Comparisons:");
    expect(description).toContain("Writes:");
  });
});
