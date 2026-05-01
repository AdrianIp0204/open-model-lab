import { describe, expect, it } from "vitest";
import { resolveSavedStudyPlanRecord } from "@/lib/account/study-plans";
import {
  buildSavedStudyPlanProgressSummary,
  createEmptyProgressSnapshot,
} from "@/lib/progress";

describe("saved study plan progress", () => {
  it("respects saved entry order when later entries already have progress", () => {
    const snapshot = createEmptyProgressSnapshot();

    snapshot.concepts["wave-interference"] = {
      conceptId: "concept-wave-interference",
      slug: "wave-interference",
      firstVisitedAt: "2026-03-28T10:00:00.000Z",
      lastVisitedAt: "2026-03-28T10:05:00.000Z",
    };

    const plan = resolveSavedStudyPlanRecord({
      id: "1e9f9eb5-515e-4fb4-a2dd-2b2e0bc5ab4d",
      title: "Ordered study path",
      summary: "Lead with a direct concept before widening into a goal path.",
      entries: [
        {
          kind: "concept",
          slug: "projectile-motion",
        },
        {
          kind: "goal-path",
          slug: "waves-intuition",
        },
      ],
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
    });

    expect(plan).not.toBeNull();

    const summary = buildSavedStudyPlanProgressSummary(snapshot, plan!);

    expect(summary.status).toBe("in-progress");
    expect(summary.primaryAction).toMatchObject({
      href: "/concepts/projectile-motion",
      label: "Start concept",
    });
    expect(summary.nextEntry?.entry.kind).toBe("concept");
  });

  it("turns completed one-entry plans into review actions", () => {
    const snapshot = createEmptyProgressSnapshot();

    snapshot.concepts["projectile-motion"] = {
      conceptId: "concept-projectile-motion",
      slug: "projectile-motion",
      manualCompletedAt: "2026-04-05T10:00:00.000Z",
      completedQuickTestAt: "2026-04-05T09:59:00.000Z",
      firstVisitedAt: "2026-04-05T09:50:00.000Z",
      lastVisitedAt: "2026-04-05T10:00:00.000Z",
      lastInteractedAt: "2026-04-05T10:00:00.000Z",
    };

    const plan = resolveSavedStudyPlanRecord({
      id: "62cd6421-5bb7-4793-8b95-dc5d7875e367",
      title: "Projectile review",
      summary: null,
      entries: [
        {
          kind: "concept",
          slug: "projectile-motion",
        },
      ],
      createdAt: "2026-04-05T10:00:00.000Z",
      updatedAt: "2026-04-05T10:00:00.000Z",
    });

    expect(plan).not.toBeNull();

    const summary = buildSavedStudyPlanProgressSummary(snapshot, plan!);

    expect(summary.status).toBe("completed");
    expect(summary.primaryAction).toMatchObject({
      href: "/concepts/projectile-motion",
      label: "Review concept",
    });
    expect(summary.completedEntryCount).toBe(1);
  });

  it("preserves zh-HK locale in saved study plan links", () => {
    const snapshot = createEmptyProgressSnapshot();

    const conceptPlan = resolveSavedStudyPlanRecord({
      id: "e4417f0f-13d2-4b2f-922c-a468a63d2d9f",
      title: "Localized concept plan",
      summary: null,
      entries: [
        {
          kind: "concept",
          slug: "projectile-motion",
        },
      ],
      createdAt: "2026-04-06T10:00:00.000Z",
      updatedAt: "2026-04-06T10:00:00.000Z",
    });
    const trackPlan = resolveSavedStudyPlanRecord({
      id: "1b2ff6cd-3f4b-496d-bd77-43f7b263d851",
      title: "Localized track plan",
      summary: null,
      entries: [
        {
          kind: "track",
          slug: "waves",
        },
      ],
      createdAt: "2026-04-06T10:00:00.000Z",
      updatedAt: "2026-04-06T10:00:00.000Z",
    });

    expect(conceptPlan).not.toBeNull();
    expect(trackPlan).not.toBeNull();

    const conceptSummary = buildSavedStudyPlanProgressSummary(snapshot, conceptPlan!, "zh-HK");

    const trackEntry = trackPlan!.entries[0];
    expect(trackEntry?.kind).toBe("track");

    if (trackEntry?.kind !== "track") {
      throw new Error("Expected a track entry");
    }

    for (const concept of trackEntry.track.concepts) {
      snapshot.concepts[concept.slug] = {
        conceptId: concept.id,
        slug: concept.slug,
        firstVisitedAt: "2026-04-06T10:00:00.000Z",
        lastVisitedAt: "2026-04-06T10:05:00.000Z",
        manualCompletedAt: "2026-04-06T10:05:00.000Z",
        completedQuickTestAt: "2026-04-06T10:04:00.000Z",
        completedChallenges: Object.fromEntries(
          trackEntry.track.checkpoints
            .filter((checkpoint) => checkpoint.challenge.concept.slug === concept.slug)
            .map((checkpoint) => [checkpoint.challenge.challengeId, "2026-04-06T10:06:00.000Z"]),
        ),
      };
    }

    const trackSummary = buildSavedStudyPlanProgressSummary(snapshot, trackPlan!, "zh-HK");

    expect(conceptSummary.primaryAction.href).toBe("/zh-HK/concepts/projectile-motion");
    expect(trackSummary.primaryAction.href).toBe("/zh-HK/tracks/waves/complete");
  });
});
