import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getStarterTrackMembershipsForConcept,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("polar coordinates wiring", () => {
  it("threads polar coordinates through the existing math plane topic and track", () => {
    const concept = getConceptBySlug("polar-coordinates-radius-and-angle");
    const topic = getTopicDiscoverySummaryBySlug("complex-numbers-and-parametric-motion");
    const track = getStarterTrackBySlug("complex-and-parametric-motion");

    expect(concept.topic).toBe("Complex Numbers and Parametric Motion");
    expect(concept.prerequisites).toEqual([
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
    ]);
    expect(topic.featuredConcepts.map((item) => item.slug)).toEqual([
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
      "trig-identities-from-unit-circle-geometry",
      "inverse-trig-angle-from-ratio",
      "parametric-curves-motion-from-equations",
    ]);
    expect(track.concepts.map((item) => item.slug)).toEqual([
      "complex-numbers-on-the-plane",
      "unit-circle-sine-cosine-from-rotation",
      "polar-coordinates-radius-and-angle",
      "trig-identities-from-unit-circle-geometry",
      "inverse-trig-angle-from-ratio",
      "parametric-curves-motion-from-equations",
    ]);
    expect(
      getStarterTrackMembershipsForConcept("polar-coordinates-radius-and-angle").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["complex-and-parametric-motion"]);
  });

  it("keeps read-next guidance moving from polar geometry into the trig deepening before motion", () => {
    const polarReadNext = getReadNextRecommendations("polar-coordinates-radius-and-angle");

    expect(
      getReadNextRecommendations("unit-circle-sine-cosine-from-rotation").map((item) => item.slug),
    ).toContain("polar-coordinates-radius-and-angle");
    expect(polarReadNext.map((item) => item.slug)).toEqual([
      "trig-identities-from-unit-circle-geometry",
      "inverse-trig-angle-from-ratio",
      "unit-circle-sine-cosine-from-rotation",
    ]);
    expect(polarReadNext).toEqual([
      expect.objectContaining({
        slug: "trig-identities-from-unit-circle-geometry",
        reasonKind: "curated",
      }),
      expect.objectContaining({
        slug: "inverse-trig-angle-from-ratio",
        reasonKind: "curated",
      }),
      expect.objectContaining({
        slug: "unit-circle-sine-cosine-from-rotation",
        reasonKind: "curated",
      }),
    ]);
  });
});
