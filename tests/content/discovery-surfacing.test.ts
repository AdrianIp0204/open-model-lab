import { describe, expect, it } from "vitest";
import {
  buildExpandedSubjectSpotlights,
  getGuidedCollections,
  getRecommendedGoalPaths,
  getSubjectDiscoverySummaries,
} from "@/lib/content";

describe("expanded subject spotlights", () => {
  const spotlights = buildExpandedSubjectSpotlights({
    subjects: getSubjectDiscoverySummaries(),
    guidedCollections: getGuidedCollections(),
    recommendedGoalPaths: getRecommendedGoalPaths(),
  });

  it("surfaces the newer subject branches in canonical subject order", () => {
    expect(spotlights.map((spotlight) => spotlight.subject.slug)).toEqual([
      "math",
      "chemistry",
      "computer-science",
    ]);
  });

  it("keeps each newer branch tied to its canonical track, collection, and goal-path surfaces", () => {
    const math = spotlights.find((spotlight) => spotlight.subject.slug === "math");
    const chemistry = spotlights.find(
      (spotlight) => spotlight.subject.slug === "chemistry",
    );
    const computerScience = spotlights.find(
      (spotlight) => spotlight.subject.slug === "computer-science",
    );

    expect(math).toMatchObject({
      starterTrack: expect.objectContaining({ slug: "functions-and-change" }),
      guidedCollection: expect.objectContaining({
        slug: "functions-and-change-lesson-set",
      }),
      goalPath: expect.objectContaining({ slug: "functions-and-change" }),
    });
    expect(chemistry).toMatchObject({
      starterTrack: expect.objectContaining({ slug: "rates-and-equilibrium" }),
      guidedCollection: expect.objectContaining({
        slug: "rates-and-equilibrium-lesson-set",
      }),
    });
    expect([
      "chemistry-rates-equilibrium",
      "chemistry-stoichiometry-and-yield",
      "solutions-and-ph",
    ]).toContain(chemistry?.goalPath?.slug);
    expect(computerScience).toMatchObject({
      starterTrack: expect.objectContaining({
        slug: "algorithms-and-search-foundations",
      }),
      guidedCollection: expect.objectContaining({
        slug: "algorithms-and-search-playlist",
      }),
      goalPath: expect.objectContaining({ slug: "algorithms-and-search" }),
    });
  });
});
