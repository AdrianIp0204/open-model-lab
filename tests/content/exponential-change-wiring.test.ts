import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getSubjectDiscoverySummaryBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("exponential change wiring", () => {
  it("keeps the exponential bench in the functions branch while bridging honestly into calculus and half-life physics", () => {
    const concept = getConceptBySlug("exponential-change-growth-decay-logarithms");
    const functionsTopic = getTopicDiscoverySummaryBySlug("functions");
    const math = getSubjectDiscoverySummaryBySlug("math");
    const track = getStarterTrackBySlug("functions-and-change");
    const trackSlugs = track.concepts.map((item) => item.slug);
    const readNext = getReadNextRecommendations("exponential-change-growth-decay-logarithms");

    expect(concept.topic).toBe("Functions");
    expect(concept.related).toEqual(
      expect.arrayContaining([
        "graph-transformations",
        "rational-functions-asymptotes-and-behavior",
        "derivative-as-slope-local-rate-of-change",
        "radioactivity-half-life",
      ]),
    );
    expect(functionsTopic.featuredConcepts.map((item) => item.slug)).toEqual([
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
    ]);
    expect(math.featuredConcepts.map((item) => item.slug)).toContain(
      "exponential-change-growth-decay-logarithms",
    );
    expect(trackSlugs.indexOf("rational-functions-asymptotes-and-behavior")).toBeLessThan(
      trackSlugs.indexOf("exponential-change-growth-decay-logarithms"),
    );
    expect(trackSlugs.indexOf("exponential-change-growth-decay-logarithms")).toBeLessThan(
      trackSlugs.indexOf("derivative-as-slope-local-rate-of-change"),
    );
    expect(readNext[0]).toMatchObject({
      slug: "derivative-as-slope-local-rate-of-change",
      reasonKind: "curated",
    });
    expect(readNext).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "radioactivity-half-life",
          reasonKind: "curated",
        }),
      ]),
    );
  });
});
