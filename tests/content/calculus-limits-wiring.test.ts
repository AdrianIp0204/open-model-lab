import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("calculus limits wiring", () => {
  it("threads the calculus concepts through the topic and read-next path without inventing a second branch", () => {
    const limitsConcept = getConceptBySlug("limits-and-continuity-approaching-a-value");
    const optimizationConcept = getConceptBySlug("optimization-maxima-minima-and-constraints");
    const calculusTopic = getTopicDiscoverySummaryBySlug("calculus");
    const track = getStarterTrackBySlug("functions-and-change");

    expect(limitsConcept.topic).toBe("Calculus");
    expect(optimizationConcept.topic).toBe("Calculus");
    expect(calculusTopic.featuredConcepts.map((item) => item.slug)).toEqual([
      "derivative-as-slope-local-rate-of-change",
      "limits-and-continuity-approaching-a-value",
      "optimization-maxima-minima-and-constraints",
      "integral-as-accumulation-area",
    ]);
    expect(track.concepts.map((item) => item.slug)).toEqual([
      "graph-transformations",
      "rational-functions-asymptotes-and-behavior",
      "exponential-change-growth-decay-logarithms",
      "derivative-as-slope-local-rate-of-change",
      "limits-and-continuity-approaching-a-value",
      "integral-as-accumulation-area",
    ]);
    expect(limitsConcept.pageFramework?.featuredSetups?.map((item) => item.id)).toEqual([
      "continuous-match",
      "removable-hole",
      "jump-split",
      "vertical-blow-up",
    ]);
    expect(getReadNextRecommendations("derivative-as-slope-local-rate-of-change")[0]).toMatchObject(
      {
        slug: "limits-and-continuity-approaching-a-value",
        reasonKind: "curated",
      },
    );
    expect(
      getReadNextRecommendations("derivative-as-slope-local-rate-of-change").map(
        (item) => item.slug,
      ),
    ).toContain("optimization-maxima-minima-and-constraints");
    expect(getReadNextRecommendations("optimization-maxima-minima-and-constraints")[0]).toMatchObject(
      {
        slug: "integral-as-accumulation-area",
        reasonKind: "curated",
      },
    );
    expect(getReadNextRecommendations("limits-and-continuity-approaching-a-value")[0]).toMatchObject(
      {
        slug: "optimization-maxima-minima-and-constraints",
        reasonKind: "curated",
      },
    );
    expect(
      getReadNextRecommendations("limits-and-continuity-approaching-a-value").map(
        (item) => item.slug,
      ),
    ).toContain("integral-as-accumulation-area");
  });
});
