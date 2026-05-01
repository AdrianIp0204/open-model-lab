import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getSubjectDiscoverySummaryBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("math vectors wiring", () => {
  it("wires matrix transformations into the vectors topic and read-next path", () => {
    const concept = getConceptBySlug("matrix-transformations");
    const vectorsTopic = getTopicDiscoverySummaryBySlug("vectors");
    const math = getSubjectDiscoverySummaryBySlug("math");

    expect(concept.topic).toBe("Vectors");
    expect(concept.prerequisites).toEqual(["vectors-in-2d"]);
    expect(concept.simulation.defaults).toMatchObject({
      m11: 1,
      m12: 0.6,
      m21: 0,
      m22: 1,
    });
    expect(concept.simulation.ui).toMatchObject({
      initialGraphId: "probe-image-blend",
      primaryControlIds: ["m12", "m22"],
      primaryPresetIds: ["shear-right", "reflect-y"],
    });
    expect(vectorsTopic.featuredConcepts.map((item) => item.slug)).toEqual([
      "vectors-in-2d",
      "matrix-transformations",
      "dot-product-angle-and-projection",
    ]);
    expect(math.featuredConcepts.map((item) => item.slug)).toContain("matrix-transformations");
    expect(getReadNextRecommendations("vectors-in-2d")[0]).toMatchObject({
      slug: "matrix-transformations",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("matrix-transformations")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "dot-product-angle-and-projection",
          reasonKind: "curated",
        }),
        expect.objectContaining({
          slug: "complex-numbers-on-the-plane",
          reasonKind: "curated",
        }),
      ]),
    );
  });

  it("wires dot product projection into the vectors topic and read-next path", () => {
    const concept = getConceptBySlug("dot-product-angle-and-projection");
    const vectorsTopic = getTopicDiscoverySummaryBySlug("vectors");
    const math = getSubjectDiscoverySummaryBySlug("math");

    expect(concept.topic).toBe("Vectors");
    expect(concept.prerequisites).toEqual(["vectors-in-2d"]);
    expect(vectorsTopic.featuredConcepts.map((item) => item.slug)).toContain(
      "dot-product-angle-and-projection",
    );
    expect(math.featuredConcepts.map((item) => item.slug)).toContain(
      "dot-product-angle-and-projection",
    );
    expect(getReadNextRecommendations("vectors-in-2d")[1]).toMatchObject({
      slug: "dot-product-angle-and-projection",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("dot-product-angle-and-projection")[0]).toMatchObject({
      slug: "vectors-components",
      reasonKind: "curated",
    });
  });
});
