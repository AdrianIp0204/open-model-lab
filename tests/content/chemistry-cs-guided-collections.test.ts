import { describe, expect, it } from "vitest";
import {
  getGuidedCollectionBySlug,
  getRecommendedGoalPathBySlug,
} from "@/lib/content";

describe("chemistry and computer-science guided collection packaging", () => {
  it("keeps the chemistry collections aligned with their topic handoffs and starter tracks", () => {
    const ratesCollection = getGuidedCollectionBySlug("rates-and-equilibrium-lesson-set");
    const stoichCollection = getGuidedCollectionBySlug("stoichiometry-and-yield-lesson-set");
    const solutionsCollection = getGuidedCollectionBySlug("solutions-and-ph-lesson-set");
    const ratesGoalPath = getRecommendedGoalPathBySlug("chemistry-rates-equilibrium");
    const stoichGoalPath = getRecommendedGoalPathBySlug("chemistry-stoichiometry-and-yield");
    const solutionsGoalPath = getRecommendedGoalPathBySlug("solutions-and-ph");

    expect(ratesCollection.format).toBe("lesson-set");
    expect(ratesCollection.relatedTracks.map((track) => track.slug)).toEqual([
      "rates-and-equilibrium",
    ]);
    expect(ratesCollection.topics.map((topic) => topic.slug)).toEqual(
      expect.arrayContaining(["rates-and-equilibrium", "solutions-and-ph"]),
    );
    expect(ratesCollection.steps.at(-1)).toMatchObject({
      kind: "surface",
      href: "/concepts/topics/solutions-and-ph",
    });
    expect(ratesGoalPath.relatedCollections.map((collection) => collection.slug)).toContain(
      "rates-and-equilibrium-lesson-set",
    );

    expect(stoichCollection.format).toBe("lesson-set");
    expect(stoichCollection.relatedTracks.map((track) => track.slug)).toEqual([
      "stoichiometry-and-yield",
    ]);
    expect(stoichCollection.topics.map((topic) => topic.slug)).toEqual(
      expect.arrayContaining(["stoichiometry-and-yield", "solutions-and-ph"]),
    );
    expect(stoichCollection.steps.at(-1)).toMatchObject({
      kind: "surface",
      href: "/concepts/topics/solutions-and-ph",
    });
    expect(stoichGoalPath.relatedCollections.map((collection) => collection.slug)).toContain(
      "stoichiometry-and-yield-lesson-set",
    );

    expect(solutionsCollection.format).toBe("lesson-set");
    expect(solutionsCollection.relatedTracks.map((track) => track.slug)).toEqual([
      "solutions-and-ph",
    ]);
    expect(solutionsCollection.topics.map((topic) => topic.slug)).toEqual(
      expect.arrayContaining(["solutions-and-ph", "rates-and-equilibrium"]),
    );
    expect(solutionsCollection.steps.at(-1)).toMatchObject({
      kind: "surface",
      href: "/concepts/topics/rates-and-equilibrium",
    });
    expect(solutionsGoalPath.relatedCollections.map((collection) => collection.slug)).toContain(
      "solutions-and-ph-lesson-set",
    );
  });

  it("keeps the algorithms collection in playlist mode while surfacing the new graph-traversal revisit", () => {
    const algorithmsCollection = getGuidedCollectionBySlug("algorithms-and-search-playlist");
    const algorithmsGoalPath = getRecommendedGoalPathBySlug("algorithms-and-search");

    expect(algorithmsCollection.format).toBe("playlist");
    expect(algorithmsCollection.relatedTracks.map((track) => track.slug)).toEqual([
      "algorithms-and-search-foundations",
    ]);
    expect(algorithmsCollection.topics.map((topic) => topic.slug)).toEqual([
      "algorithms-and-search",
    ]);
    expect(algorithmsCollection.steps.at(-1)).toMatchObject({
      kind: "surface",
      surfaceKind: "challenge-hub",
      href: "/challenges?track=algorithms-and-search-foundations",
    });
    expect(algorithmsCollection.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "concept",
          concept: expect.objectContaining({
            slug: "frontier-and-visited-state-on-graphs",
          }),
        }),
      ]),
    );
    expect(algorithmsGoalPath.relatedCollections.map((collection) => collection.slug)).toContain(
      "algorithms-and-search-playlist",
    );
    expect(algorithmsGoalPath.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "concept",
          concept: expect.objectContaining({
            slug: "frontier-and-visited-state-on-graphs",
          }),
        }),
      ]),
    );
  });
});
