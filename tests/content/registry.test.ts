import { describe, expect, it } from "vitest";
import {
  buildConceptRegistry,
  validateConceptCatalogMetadata,
  type ConceptMetadata,
} from "@/lib/content";

const baseCatalog: ConceptMetadata[] = [
  {
    id: "concept-alpha",
    slug: "alpha",
    contentFile: "simple-harmonic-motion",
    title: "Alpha",
    shortTitle: "Alpha",
    summary: "Alpha summary",
    subject: "Physics",
    topic: "Oscillations",
    subtopic: "Foundations",
    difficulty: "Intro",
    sequence: 10,
    tags: ["phase"],
    published: true,
    status: "published",
    accent: "teal",
    highlights: ["A"],
    simulationKind: "shm",
  },
  {
    id: "concept-beta",
    slug: "beta",
    contentFile: "damping-resonance",
    title: "Beta",
    summary: "Beta summary",
    subject: "Physics",
    topic: "Oscillations",
    subtopic: "Driven response",
    difficulty: "Intermediate",
    sequence: 20,
    prerequisites: ["alpha"],
    published: true,
    status: "published",
    accent: "amber",
    highlights: ["B"],
    simulationKind: "damping-resonance",
  },
  {
    id: "concept-gamma",
    slug: "gamma",
    contentFile: "projectile-motion",
    title: "Gamma",
    summary: "Gamma summary",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "Intro",
    sequence: 30,
    related: ["alpha"],
    published: false,
    status: "draft",
    accent: "coral",
    highlights: ["C"],
    simulationKind: "projectile",
  },
];

describe("concept registry builder", () => {
  it("builds deterministic published ordering and topic grouping", () => {
    const registry = buildConceptRegistry(baseCatalog);

    expect(registry.published.map((entry) => entry.slug)).toEqual(["alpha", "beta"]);
    expect(registry.topics).toEqual(["Oscillations"]);
    expect(registry.byTopic.get("Oscillations")?.map((entry) => entry.slug)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(
      registry.bySubtopic.get("Oscillations::Driven response")?.map((entry) => entry.slug),
    ).toEqual(["beta"]);
  });

  it("rejects duplicate ids and duplicate slugs", () => {
    expect(() =>
      validateConceptCatalogMetadata([
        ...baseCatalog,
        {
          ...baseCatalog[0],
          slug: "delta",
        },
      ]),
    ).toThrow(/duplicate concept catalog id/i);

    expect(() =>
      validateConceptCatalogMetadata([
        ...baseCatalog,
        {
          ...baseCatalog[0],
          id: "concept-delta",
        },
      ]),
    ).toThrow(/duplicate concept catalog slug/i);
  });

  it("rejects broken relationship references", () => {
    expect(() =>
      validateConceptCatalogMetadata([
        baseCatalog[0],
        {
          ...baseCatalog[1],
          prerequisites: ["not-real"],
        },
        baseCatalog[2],
      ]),
    ).toThrow(/missing prerequisite/i);

    expect(() =>
      validateConceptCatalogMetadata([
        {
          ...baseCatalog[0],
          recommendedNext: [{ slug: "not-real" }],
        },
        baseCatalog[1],
        baseCatalog[2],
      ]),
    ).toThrow(/recommendedNext slug/i);
  });

  it("rejects self references and duplicate content file mappings", () => {
    expect(() =>
      validateConceptCatalogMetadata([
        {
          ...baseCatalog[0],
          related: ["alpha"],
        },
        baseCatalog[1],
        baseCatalog[2],
      ]),
    ).toThrow(/cannot relate to itself/i);

    expect(() =>
      validateConceptCatalogMetadata([
        ...baseCatalog,
        {
          ...baseCatalog[2],
          id: "concept-delta",
          slug: "delta",
          contentFile: "simple-harmonic-motion",
        },
      ]),
    ).toThrow(/duplicate concept catalog contentFile/i);
  });
});
