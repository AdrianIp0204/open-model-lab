import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackMembershipsForConcept,
  resolveConceptPageSections,
} from "@/lib/content";
import { createEmptyProgressSnapshot } from "@/lib/progress";
import { resolveConceptPageStatusModel } from "@/lib/progress/concept-page-status";

describe("resolveConceptPageStatusModel", () => {
  it("treats a fresh concept as not started and resumes in Explore", () => {
    const concept = getConceptBySlug("graph-transformations");
    const snapshot = createEmptyProgressSnapshot();

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "en",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "en",
    });

    expect(model.overallStatus).toBe("not-started");
    expect(model.recommendedStepLabel).toBe("Slide the parent curve");
    expect(model.primaryAction.kind).toBe("start-concept");
    expect(model.primaryAction.href).toContain("#guided-step-slide-the-parent-curve");
    expect(model.trackPosition).not.toBeNull();
  });

  it("treats a visit-only record as not started on the concept page", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const snapshot = createEmptyProgressSnapshot();
    snapshot.concepts[concept.slug] = {
      slug: concept.slug,
      firstVisitedAt: "2026-04-17T08:00:00.000Z",
      lastVisitedAt: "2026-04-17T08:00:00.000Z",
    };

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "en",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "en",
    });

    expect(model.overallStatus).toBe("not-started");
    expect(model.primaryAction.kind).toBe("start-concept");
  });

  it("resumes in Understand after compare/prediction-style progress", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const snapshot = createEmptyProgressSnapshot();
    snapshot.concepts[concept.slug] = {
      slug: concept.slug,
      firstVisitedAt: "2026-04-17T08:00:00.000Z",
      usedCompareModeAt: "2026-04-17T08:10:00.000Z",
    };

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "en",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "en",
    });

    expect(model.overallStatus).toBe("in-progress");
    expect(model.recommendedStepLabel).toBe("Link the stage and graphs");
    expect(model.primaryAction.kind).toBe("continue-phase");
    expect(model.primaryAction.href).toContain("#guided-step-link-stage-and-graphs");
  });

  it("resumes in Check after challenge or quick-test progress", () => {
    const concept = getConceptBySlug("reaction-rate-collision-theory");
    const snapshot = createEmptyProgressSnapshot();
    snapshot.concepts[concept.slug] = {
      slug: concept.slug,
      firstVisitedAt: "2026-04-17T08:00:00.000Z",
      usedChallengeModeAt: "2026-04-17T08:12:00.000Z",
    };

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "en",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "en",
    });

    expect(model.overallStatus).toBe("in-progress");
    expect(model.recommendedStepLabel).toBe("Check what you know");
    expect(model.primaryAction.kind).toBe("continue-phase");
    expect(model.primaryAction.href).toContain("#guided-step-check-what-you-can-explain");
  });

  it("localizes concept and track hrefs when a locale is provided", () => {
    const concept = getConceptBySlug("graph-transformations");
    const snapshot = createEmptyProgressSnapshot();

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "zh-HK",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "zh-HK",
    });

    expect(model.primaryAction.href).toMatch(/^\/zh-HK\/concepts\/graph-transformations#/);
    expect(model.secondaryAction?.href).toMatch(/^\/zh-HK\/tracks\//);
  });

  it("promotes the next guided track step after completion when a single track membership exists", () => {
    const concept = getConceptBySlug("graph-transformations");
    const snapshot = createEmptyProgressSnapshot();
    snapshot.concepts[concept.slug] = {
      slug: concept.slug,
      firstVisitedAt: "2026-04-17T08:00:00.000Z",
      manualCompletedAt: "2026-04-17T08:30:00.000Z",
    };

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "en",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "en",
    });

    expect(model.overallStatus).toBe("completed");
    expect(model.primaryAction.kind).toBe("next-track-step");
    expect(model.primaryAction.href).toMatch(/^\/concepts\//);
    expect(model.secondaryAction?.kind).toBe("review-concept");
  });

  it("keeps completed zh-HK concept status actions on localized routes", () => {
    const concept = getConceptBySlug("graph-transformations");
    const snapshot = createEmptyProgressSnapshot();
    snapshot.concepts[concept.slug] = {
      slug: concept.slug,
      firstVisitedAt: "2026-04-17T08:00:00.000Z",
      manualCompletedAt: "2026-04-17T08:30:00.000Z",
    };

    const model = resolveConceptPageStatusModel({
      concept,
      sections: resolveConceptPageSections(concept, {
        readNext: getReadNextRecommendations(concept.slug),
        locale: "zh-HK",
      }),
      snapshot,
      readNext: getReadNextRecommendations(concept.slug),
      starterTrackMemberships: getStarterTrackMembershipsForConcept(concept.slug),
      locale: "zh-HK",
    });

    expect(model.primaryAction.href).toMatch(/^\/zh-HK\//);
    expect(model.secondaryAction).toMatchObject({
      kind: "review-concept",
      href: expect.stringMatching(/^\/zh-HK\/concepts\/graph-transformations#/),
    });
  });
});
