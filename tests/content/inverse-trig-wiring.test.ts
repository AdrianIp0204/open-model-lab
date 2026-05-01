import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackMembershipsForConcept,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("inverse trig wiring", () => {
  it("threads inverse-angle recovery through the same plane-based math topic and track", () => {
    const concept = getConceptBySlug("inverse-trig-angle-from-ratio");
    const topic = getTopicDiscoverySummaryBySlug("complex-numbers-and-parametric-motion");

    expect(concept.topic).toBe("Complex Numbers and Parametric Motion");
    expect(concept.prerequisites).toEqual([
      "polar-coordinates-radius-and-angle",
      "trig-identities-from-unit-circle-geometry",
    ]);
    expect(topic.featuredConcepts.map((item) => item.slug)).toContain(
      "inverse-trig-angle-from-ratio",
    );
    expect(
      getStarterTrackMembershipsForConcept("inverse-trig-angle-from-ratio").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
  });

  it("keeps read-next guidance moving from inverse-angle recovery into motion and vectors", () => {
    expect(
      getReadNextRecommendations("trig-identities-from-unit-circle-geometry").map(
        (item) => item.slug,
      ),
    ).toContain("inverse-trig-angle-from-ratio");
    expect(getReadNextRecommendations("inverse-trig-angle-from-ratio")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "parametric-curves-motion-from-equations",
          reasonKind: "curated",
        }),
        expect.objectContaining({
          slug: "dot-product-angle-and-projection",
          reasonKind: "curated",
        }),
      ]),
    );
  });
});
