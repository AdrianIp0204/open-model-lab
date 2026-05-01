import { describe, expect, it } from "vitest";
import {
  buildStartLearningSubjectChoices,
  getStartLearningRecommendationSet,
  getSubjectDiscoverySummaries,
} from "@/lib/content";

describe("start-learning recommendations", () => {
  const subjectChoices = buildStartLearningSubjectChoices(
    getSubjectDiscoverySummaries(),
  );

  it("derives one bounded quick concept and one starter track per subject", () => {
    expect(
      subjectChoices.map((choice) => ({
        subject: choice.subject.slug,
        concept: choice.quickConcept?.slug,
        topic: choice.starterTopic?.slug,
        track: choice.starterTrack?.slug,
      })),
    ).toEqual([
      {
        subject: "physics",
        concept: "vectors-components",
        topic: "mechanics",
        track: "motion-and-circular-motion",
      },
      {
        subject: "math",
        concept: "graph-transformations",
        topic: "functions",
        track: "functions-and-change",
      },
      {
        subject: "chemistry",
        concept: "reaction-rate-collision-theory",
        topic: "rates-and-equilibrium",
        track: "rates-and-equilibrium",
      },
      {
        subject: "computer-science",
        concept: "sorting-and-algorithmic-trade-offs",
        topic: "algorithms-and-search",
        track: "algorithms-and-search-foundations",
      },
    ]);
  });

  it("maps a brand-new quick math start to the first concept before the full track", () => {
    const recommendations = getStartLearningRecommendationSet(subjectChoices, {
      interest: "math",
      confidence: "brand-new",
      commitment: "quick-start",
    });

    expect(recommendations.primary.kind).toBe("concept");
    expect(recommendations.primary.href).toBe("/concepts/graph-transformations");
    expect(recommendations.alternate?.kind).toBe("track");
    expect(recommendations.alternate?.href).toBe("/tracks/functions-and-change");
    expect(recommendations.browse.href).toBe("/concepts/subjects/math");
  });

  it("maps a quicker confident math start to the topic page instead of a raw concept jump", () => {
    const recommendations = getStartLearningRecommendationSet(subjectChoices, {
      interest: "math",
      confidence: "know-some-basics",
      commitment: "quick-start",
    });

    expect(recommendations.primary.kind).toBe("topic");
    expect(recommendations.primary.href).toBe("/concepts/topics/functions");
    expect(recommendations.alternate?.href).toBe("/tracks/functions-and-change");
  });

  it("maps a deeper chemistry start to the authored chemistry starter track", () => {
    const recommendations = getStartLearningRecommendationSet(subjectChoices, {
      interest: "chemistry",
      confidence: "brand-new",
      commitment: "deeper-path",
    });

    expect(recommendations.primary.kind).toBe("track");
    expect(recommendations.primary.href).toBe("/tracks/rates-and-equilibrium");
    expect(recommendations.browse.href).toBe("/concepts/subjects/chemistry");
  });

  it("keeps the not-sure fallback compact with one concrete start and one wider browse path", () => {
    const recommendations = getStartLearningRecommendationSet(subjectChoices, {
      interest: "not-sure",
      confidence: "brand-new",
      commitment: "quick-start",
    });

    expect(recommendations.primary.kind).toBe("concept");
    expect(recommendations.primary.href.startsWith("/concepts/")).toBe(true);
    expect(
      recommendations.alternate === null ||
        recommendations.alternate.kind === "track",
    ).toBe(true);
    expect(recommendations.browse.href).toBe("/concepts/subjects");
  });

  it("leans the not-sure fallback toward the newer subject branches before defaulting back to physics-heavy starts", () => {
    const recommendations = getStartLearningRecommendationSet(subjectChoices, {
      interest: "not-sure",
      confidence: "brand-new",
      commitment: "deeper-path",
    });

    expect(recommendations.primary.subjectSlug).toMatch(
      /^(math|chemistry|computer-science)$/,
    );
    expect(recommendations.primary.kind).toBe("track");
  });
});
