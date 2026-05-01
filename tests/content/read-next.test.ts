import { describe, expect, it } from "vitest";
import {
  getReadNextRecommendations,
  resolveReadNextFromRegistry,
  type ConceptMetadata,
} from "@/lib/content";

const baseRegistry: ConceptMetadata[] = [
  {
    id: "concept-alpha",
    slug: "alpha",
    contentFile: "alpha",
    title: "Alpha",
    summary: "Alpha summary",
    subject: "Physics",
    topic: "Oscillations",
    subtopic: "Foundations",
    difficulty: "Intro",
    sequence: 10,
    tags: ["phase", "graphs"],
    published: true,
    status: "published",
    accent: "teal",
    highlights: ["A"],
    simulationKind: "shm",
  },
  {
    id: "concept-beta",
    slug: "beta",
    contentFile: "beta",
    title: "Beta",
    summary: "Beta summary",
    subject: "Physics",
    topic: "Oscillations",
    subtopic: "Driven response",
    difficulty: "Intermediate",
    sequence: 20,
    prerequisites: ["alpha"],
    tags: ["phase", "resonance"],
    published: true,
    status: "published",
    accent: "amber",
    highlights: ["B"],
    simulationKind: "damping-resonance",
  },
  {
    id: "concept-gamma",
    slug: "gamma",
    contentFile: "gamma",
    title: "Gamma",
    summary: "Gamma summary",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "Intro",
    sequence: 10,
    tags: ["graphs", "components"],
    published: true,
    status: "published",
    accent: "coral",
    highlights: ["C"],
    simulationKind: "projectile",
  },
  {
    id: "concept-delta",
    slug: "delta",
    contentFile: "delta",
    title: "Delta",
    summary: "Delta summary",
    subject: "Physics",
    topic: "Oscillations",
    difficulty: "Advanced",
    sequence: 30,
    prerequisites: ["beta"],
    tags: ["resonance"],
    published: false,
    status: "draft",
    accent: "sky",
    highlights: ["D"],
    simulationKind: "damping-resonance",
  },
];

describe("read-next resolver", () => {
  it("prioritizes explicit curated overrides before fallback logic", () => {
    const registry = baseRegistry.map((entry) => ({ ...entry }));
    registry[0] = {
      ...registry[0],
      recommendedNext: [
        {
          slug: "gamma",
          reasonLabel: "Useful comparison",
        },
      ],
    };

    const recommendations = resolveReadNextFromRegistry(registry, "alpha", 3);

    expect(recommendations[0]).toMatchObject({
      slug: "gamma",
      reasonLabel: "Useful comparison",
      reasonKind: "curated",
    });
    expect(recommendations.some((item) => item.slug === "beta")).toBe(true);
  });

  it("filters self links, duplicates, and unpublished concepts", () => {
    const registry = baseRegistry.map((entry) => ({ ...entry }));
    registry[0] = {
      ...registry[0],
      recommendedNext: [
        { slug: "alpha", reasonLabel: "Broken self-link" },
        { slug: "gamma", reasonLabel: "Useful comparison" },
        { slug: "gamma", reasonLabel: "Duplicate" },
        { slug: "delta", reasonLabel: "Hidden concept" },
      ],
      related: ["gamma", "delta"],
    };

    const recommendations = resolveReadNextFromRegistry(registry, "alpha", 4);

    expect(recommendations.map((item) => item.slug)).toEqual(["gamma", "beta"]);
  });

  it("falls back to same-topic progression and builds-on logic", () => {
    const registry = baseRegistry.map((entry) => ({ ...entry }));

    const recommendations = resolveReadNextFromRegistry(registry, "alpha", 2);

    expect(recommendations[0]).toMatchObject({
      slug: "beta",
      reasonLabel: "Builds on this",
      reasonKind: "builds-on-this",
    });
  });

  it("keeps the shipped math read-next path moving forward without a circular curated loop", () => {
    expect(getReadNextRecommendations("graph-transformations").map((item) => item.slug)).toContain(
      "exponential-change-growth-decay-logarithms",
    );
    expect(
      getReadNextRecommendations("graph-transformations")[0],
    ).toMatchObject({
      slug: "rational-functions-asymptotes-and-behavior",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("exponential-change-growth-decay-logarithms").map(
        (item) => item.slug,
      ),
    ).toContain("derivative-as-slope-local-rate-of-change");
    expect(
      getReadNextRecommendations("exponential-change-growth-decay-logarithms")[0],
    ).toMatchObject({
      slug: "derivative-as-slope-local-rate-of-change",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("derivative-as-slope-local-rate-of-change").map(
        (item) => item.slug,
      ),
    ).toContain("limits-and-continuity-approaching-a-value");
    expect(
      getReadNextRecommendations("derivative-as-slope-local-rate-of-change").map(
        (item) => item.slug,
      ),
    ).toContain("optimization-maxima-minima-and-constraints");
    expect(
      getReadNextRecommendations("derivative-as-slope-local-rate-of-change")[0],
    ).toMatchObject({
      slug: "limits-and-continuity-approaching-a-value",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("limits-and-continuity-approaching-a-value").map(
        (item) => item.slug,
      ),
    ).toEqual(
      expect.arrayContaining([
        "optimization-maxima-minima-and-constraints",
        "integral-as-accumulation-area",
      ]),
    );
    expect(
      getReadNextRecommendations("limits-and-continuity-approaching-a-value")[0],
    ).toMatchObject({
      slug: "optimization-maxima-minima-and-constraints",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("optimization-maxima-minima-and-constraints")[0],
    ).toMatchObject({
      slug: "integral-as-accumulation-area",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("integral-as-accumulation-area").map((item) => item.slug),
    ).toContain("vectors-in-2d");
    expect(
      getReadNextRecommendations("integral-as-accumulation-area")[0],
    ).toMatchObject({
      slug: "vectors-in-2d",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("vectors-in-2d").map((item) => item.slug)).toContain(
      "matrix-transformations",
    );
    expect(getReadNextRecommendations("vectors-in-2d")[0]).toMatchObject({
      slug: "matrix-transformations",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("matrix-transformations").map((item) => item.slug)).toContain(
      "dot-product-angle-and-projection",
    );
    expect(getReadNextRecommendations("matrix-transformations")[0]).toMatchObject({
      slug: "dot-product-angle-and-projection",
      reasonKind: "curated",
    });
    expect(
      getReadNextRecommendations("dot-product-angle-and-projection").map((item) => item.slug),
    ).toContain("vectors-components");
    expect(getReadNextRecommendations("dot-product-angle-and-projection")[0]).toMatchObject({
      slug: "vectors-components",
      reasonKind: "curated",
    });
  });
});
