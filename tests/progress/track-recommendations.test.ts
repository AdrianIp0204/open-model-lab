import { describe, expect, it } from "vitest";
import { getTopicDiscoverySummaries } from "@/lib/content";
import {
  buildTopicStarterTrackRecommendations,
  normalizeProgressSnapshot,
} from "@/lib/progress";

describe("track recommendations", () => {
  it("localizes zh-HK starter-track titles inside topic recommendations", () => {
    const topic = getTopicDiscoverySummaries().find(
      (candidate) => candidate.slug === "algorithms-and-search",
    );
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {},
    });

    const recommendations = buildTopicStarterTrackRecommendations(
      snapshot,
      topic!,
      {},
      "zh-HK",
    );

    expect(recommendations[0]?.href).toMatch(/^\/zh-HK\/tracks\//);
    expect(recommendations[0]?.actionLabel).toContain("演算法與搜尋基礎");
    expect(recommendations[0]?.note).toContain("演算法與搜尋基礎");
    expect(recommendations[0]?.note).toContain("排序與演算法權衡");
    expect(recommendations[0]?.note).not.toContain("Algorithms and Search Foundations");
    expect(recommendations[0]?.note).not.toContain("Sorting and Algorithmic Trade-offs");
  });
});
