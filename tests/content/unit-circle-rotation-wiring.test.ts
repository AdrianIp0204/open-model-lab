import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getSubjectDiscoverySummaryBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("unit circle rotation wiring", () => {
  it("threads unit circle rotation through the existing math plane topic and starter track", () => {
    const concept = getConceptBySlug("unit-circle-sine-cosine-from-rotation");
    const topic = getTopicDiscoverySummaryBySlug("complex-numbers-and-parametric-motion");
    const track = getStarterTrackBySlug("complex-and-parametric-motion");
    const math = getSubjectDiscoverySummaryBySlug("math");

    expect(concept.topic).toBe("Complex Numbers and Parametric Motion");
    expect(concept.prerequisites).toEqual(["complex-numbers-on-the-plane"]);
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
    expect(math.featuredConcepts.map((item) => item.slug)).toContain(
      "unit-circle-sine-cosine-from-rotation",
    );
  });

  it("keeps read-next guidance moving from the unit circle into plane geometry and motion bridges", () => {
    const concept = getConceptBySlug("unit-circle-sine-cosine-from-rotation");

    expect(getReadNextRecommendations("complex-numbers-on-the-plane")[0]).toMatchObject({
      slug: "unit-circle-sine-cosine-from-rotation",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("unit-circle-sine-cosine-from-rotation")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "polar-coordinates-radius-and-angle",
          reasonKind: "curated",
        }),
        expect.objectContaining({
          slug: "trig-identities-from-unit-circle-geometry",
          reasonKind: "curated",
        }),
        expect.objectContaining({
          slug: "uniform-circular-motion",
          reasonKind: "curated",
        }),
      ]),
    );
    expect(concept.recommendedNext).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "trig-identities-from-unit-circle-geometry",
        }),
      ]),
    );
  });
});
