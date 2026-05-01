import { describe, expect, it } from "vitest";
import { getStarterTrackBySlug } from "@/lib/content";
import {
  buildPremiumAdaptiveReviewSummary,
  normalizeProgressSnapshot,
} from "@/lib/progress";

describe("premium adaptive review summary", () => {
  it("prioritizes checkpoint recovery over generic stale review and keeps the authored remediation path attached", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "vectors-components": {
          conceptId: "concept-vectors-components",
          slug: "vectors-components",
          manualCompletedAt: "2026-03-20T09:00:00.000Z",
        },
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          manualCompletedAt: "2026-03-21T09:00:00.000Z",
        },
        "uniform-circular-motion": {
          conceptId: "concept-uniform-circular-motion",
          slug: "uniform-circular-motion",
          firstVisitedAt: "2026-03-25T09:00:00.000Z",
          lastVisitedAt: "2026-03-25T09:10:00.000Z",
        },
        "simple-harmonic-motion": {
          conceptId: "concept-shm",
          slug: "simple-harmonic-motion",
          manualCompletedAt: "2026-02-20T09:00:00.000Z",
          completedQuickTestAt: "2026-02-20T09:05:00.000Z",
          completedChallenges: {
            "shm-ch-phase-match": "2026-02-20T09:10:00.000Z",
          },
          lastVisitedAt: "2026-02-20T09:10:00.000Z",
        },
      },
    });
    const concepts = [
      {
        id: "concept-vectors-components",
        slug: "vectors-components",
        title: "Vectors and Components",
        shortTitle: "Vectors",
      },
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
        shortTitle: "Projectile",
        prerequisites: ["vectors-components"],
      },
      {
        id: "concept-uniform-circular-motion",
        slug: "uniform-circular-motion",
        title: "Uniform Circular Motion",
        shortTitle: "Circular",
      },
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
        shortTitle: "SHM",
      },
    ];

    const summary = buildPremiumAdaptiveReviewSummary({
      snapshot,
      concepts,
      starterTracks: [getStarterTrackBySlug("motion-and-circular-motion")],
      limit: 2,
      now: new Date("2026-03-29T12:00:00.000Z"),
    });

    expect(summary.hasRecordedProgress).toBe(true);
    expect(summary.items[0]).toMatchObject({
      concept: {
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      reasonKind: "checkpoint",
      reasonLabel: "Checkpoint recovery",
      outcomeKind: "checkpoint",
      outcomeLabel: "Checkpoint outcome",
      primaryAction: {
        kind: "checkpoint",
        href: "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
      },
    });
    expect(summary.items[0]?.whyChosen).toMatch(
      /still open even though later motion and circular motion work has already started/i,
    );
    expect(summary.items[0]?.remediationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "track-recap",
          action: expect.objectContaining({
            href: "/tracks/motion-and-circular-motion?mode=recap",
          }),
        }),
      ]),
    );
    expect(summary.items[0]?.concept.slug).not.toBe("simple-harmonic-motion");
  });

  it("stays empty when no saved progress exists yet", () => {
    const summary = buildPremiumAdaptiveReviewSummary({
      snapshot: normalizeProgressSnapshot({
        version: 1,
        concepts: {},
      }),
      concepts: [
        {
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        },
      ],
      starterTracks: [getStarterTrackBySlug("motion-and-circular-motion")],
    });

    expect(summary.hasRecordedProgress).toBe(false);
    expect(summary.items).toHaveLength(0);
  });
});
