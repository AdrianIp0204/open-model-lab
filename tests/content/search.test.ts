import { describe, expect, it } from "vitest";
import {
  buildConceptSearchMetadataBySlug,
  buildSiteSearchIndex,
  getConceptSummaries,
  getGuidedCollections,
  getPublishedConceptMetadata,
  getRecommendedGoalPaths,
  getStarterTracks,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
  searchSiteIndex,
} from "@/lib/content";

describe("site search index", () => {
  const index = buildSiteSearchIndex({
    subjects: getSubjectDiscoverySummaries(),
    topics: getTopicDiscoverySummaries(),
    starterTracks: getStarterTracks(),
    guidedCollections: getGuidedCollections(),
    recommendedGoalPaths: getRecommendedGoalPaths(),
    concepts: getConceptSummaries(),
    conceptMetadataBySlug: buildConceptSearchMetadataBySlug(
      getPublishedConceptMetadata(),
    ),
  });

  it("indexes subjects, topics, starter tracks, and concepts together", () => {
    expect(new Set(index.entries.map((entry) => entry.kind))).toEqual(
      new Set([
        "subject",
        "topic",
        "track",
        "guided-collection",
        "goal-path",
        "concept",
      ]),
    );
  });

  it("prefers exact subject titles over weaker content matches", () => {
    const results = searchSiteIndex(index, { query: "math" });

    expect(results[0]?.entry.kind).toBe("subject");
    expect(results[0]?.entry.slug).toBe("math");
    expect(results[0]?.strength).toBe("exact-title");
  });

  it("finds short-title and keyword style concept queries deterministically", () => {
    const results = searchSiteIndex(index, { query: "graph transforms" });

    expect(results[0]?.entry.kind).toBe("concept");
    expect(results[0]?.entry.slug).toBe("graph-transformations");
  });

  it("handles chemistry naming with punctuation stripped out", () => {
    const results = searchSiteIndex(index, { query: "le chatelier" });

    expect(results[0]?.entry.slug).toBe(
      "dynamic-equilibrium-le-chateliers-principle",
    );
  });

  it("supports subject-prefilled search without inventing a second catalog", () => {
    const results = searchSiteIndex(index, {
      query: "vectors",
      subjectSlug: "math",
    });

    expect(results.every((result) => result.entry.subjectSlugs.includes("math"))).toBe(
      true,
    );
    expect(
      results.some((result) => result.entry.slug === "vectors-in-2d"),
    ).toBe(true);
  });

  it("supports topic-prefilled search on the same canonical index", () => {
    const results = searchSiteIndex(index, {
      query: "motion",
      subjectSlug: "physics",
      topicSlug: "mechanics",
    });

    expect(results.some((result) => result.entry.slug === "projectile-motion")).toBe(
      true,
    );
    expect(
      results.some((result) => result.entry.slug === "simple-harmonic-motion"),
    ).toBe(false);
  });

  it("keeps the exact starter-track match first while surfacing matching concept pages from that track", () => {
    const results = searchSiteIndex(index, {
      query: "Functions and Change",
      subjectSlug: "math",
    });

    expect(results[0]?.entry.kind).toBe("track");
    expect(results[0]?.entry.slug).toBe("functions-and-change");
    expect(results[0]?.strength).toBe("exact-title");
    expect(
      results
        .filter((result) => result.entry.kind === "concept")
        .map((result) => result.entry.slug),
    ).toEqual(
      expect.arrayContaining([
        "graph-transformations",
        "exponential-change-growth-decay-logarithms",
        "derivative-as-slope-local-rate-of-change",
        "integral-as-accumulation-area",
      ]),
    );
  });

  it("keeps an exact starter-track title ahead of supporting computer-science matches", () => {
    const results = searchSiteIndex(index, {
      query: "Algorithms and Search Foundations",
      subjectSlug: "computer-science",
    });

    expect(results[0]?.entry.kind).toBe("track");
    expect(results[0]?.entry.slug).toBe("algorithms-and-search-foundations");
    expect(results[0]?.strength).toBe("exact-title");
    expect(
      results.some(
        (result) =>
          result.entry.kind === "concept" &&
          result.entry.slug === "binary-search-halving-the-search-space",
      ),
    ).toBe(true);
    expect(
      results.some(
        (result) =>
          result.entry.kind === "concept" &&
          result.entry.slug === "breadth-first-search-and-layered-frontiers",
      ),
    ).toBe(true);
  });

  it("surfaces the graph-traversal cluster through the same canonical search index", () => {
    const results = searchSiteIndex(index, {
      query: "graph traversal",
      subjectSlug: "computer-science",
    });

    expect(
      results.some(
        (result) =>
          result.entry.kind === "concept" &&
          result.entry.slug === "graph-representation-and-adjacency-intuition",
      ),
    ).toBe(true);
    expect(
      results.some(
        (result) =>
          result.entry.kind === "concept" &&
          result.entry.slug === "breadth-first-search-and-layered-frontiers",
      ),
    ).toBe(true);
    expect(
      results.some(
        (result) =>
          result.entry.kind === "concept" &&
          result.entry.slug === "frontier-and-visited-state-on-graphs",
      ),
    ).toBe(true);
  });

  it("surfaces guided collections and goal paths for newer-subject discovery queries", () => {
    const collectionResults = searchSiteIndex(index, {
      query: "algorithms and search playlist",
      subjectSlug: "computer-science",
    });
    const goalPathResults = searchSiteIndex(index, {
      query: "build chemistry intuition through rates and equilibrium",
    });

    expect(collectionResults[0]?.entry.kind).toBe("guided-collection");
    expect(collectionResults[0]?.entry.slug).toBe("algorithms-and-search-playlist");
    expect(goalPathResults[0]?.entry.kind).toBe("goal-path");
    expect(goalPathResults[0]?.entry.slug).toBe("chemistry-rates-equilibrium");
  });

  it("keeps topic routes ahead of tied newer-branch track and goal-path matches", () => {
    const results = searchSiteIndex(index, {
      query: "solutions and ph",
      subjectSlug: "chemistry",
    });

    expect(results[0]?.entry.kind).toBe("topic");
    expect(results[0]?.entry.slug).toBe("solutions-and-ph");
    expect(
      results.some(
        (result) =>
          result.entry.kind === "track" && result.entry.slug === "solutions-and-ph",
      ),
    ).toBe(true);
    expect(
      results.some(
        (result) =>
          result.entry.kind === "goal-path" &&
          result.entry.slug === "solutions-and-ph",
      ),
    ).toBe(true);
  });
});
