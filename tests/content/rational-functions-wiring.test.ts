import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("rational functions wiring", () => {
  it("threads the new rational-functions concept through the functions topic and starter track", () => {
    const concept = getConceptBySlug("rational-functions-asymptotes-and-behavior");
    const functionsTopic = getTopicDiscoverySummaryBySlug("functions");
    const track = getStarterTrackBySlug("functions-and-change");

    expect(concept.topic).toBe("Functions");
    expect(functionsTopic.featuredConcepts.map((item) => item.slug)).toEqual([
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
    ]);
    expect(track.concepts.map((item) => item.slug)).toEqual([
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "derivative-as-slope-local-rate-of-change",
      "limits-and-continuity-approaching-a-value",
      "integral-as-accumulation-area",
    ]);
  });

  it("keeps the read-next path coherent between graph moves, rational behavior, and limits", () => {
    expect(getReadNextRecommendations("graph-transformations")[0]).toMatchObject({
      slug: "rational-functions-asymptotes-and-behavior",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("rational-functions-asymptotes-and-behavior").map(
        (item) => item.slug,
      ),
    ).toEqual(
      expect.arrayContaining([
        "exponential-change-growth-decay-logarithms",
        "limits-and-continuity-approaching-a-value",
      ]),
    );
  });
});
