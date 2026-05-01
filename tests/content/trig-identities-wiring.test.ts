import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackMembershipsForConcept,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("trig identities wiring", () => {
  it("threads the identity concept through the existing plane-based math topic and track", () => {
    const concept = getConceptBySlug("trig-identities-from-unit-circle-geometry");
    const topic = getTopicDiscoverySummaryBySlug("complex-numbers-and-parametric-motion");

    expect(concept.topic).toBe("Complex Numbers and Parametric Motion");
    expect(concept.prerequisites).toEqual([
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
    ]);
    expect(topic.featuredConcepts.map((item) => item.slug)).toContain(
      "trig-identities-from-unit-circle-geometry",
    );
    expect(
      getStarterTrackMembershipsForConcept("trig-identities-from-unit-circle-geometry").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
  });

  it("keeps read-next guidance moving from trig identities into inverse-angle reasoning and calculus links", () => {
    expect(getReadNextRecommendations("polar-coordinates-radius-and-angle").map((item) => item.slug)).toContain(
      "trig-identities-from-unit-circle-geometry",
    );
    expect(getReadNextRecommendations("trig-identities-from-unit-circle-geometry")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "inverse-trig-angle-from-ratio",
          reasonKind: "curated",
        }),
        expect.objectContaining({
          slug: "derivative-as-slope-local-rate-of-change",
          reasonKind: "curated",
        }),
      ]),
    );
  });
});
