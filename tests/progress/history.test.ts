import { describe, expect, it } from "vitest";
import {
  getConceptSummaries,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import {
  buildPremiumCheckpointHistoryView,
  createEmptyProgressSnapshot,
  normalizeProgressSnapshot,
  updateProgressHistoryStore,
} from "@/lib/progress";

const concepts = getConceptSummaries();
const subjects = getSubjectDiscoverySummaries();
const starterTracks = getStarterTracks();

describe("progress history", () => {
  it("records checkpoint and mastery changes into the bounded synced history", () => {
    const previousSnapshot = createEmptyProgressSnapshot();
    const nextSnapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-04-01T09:00:00.000Z",
          completedQuickTestAt: "2026-04-01T09:20:00.000Z",
          completedChallenges: {
            "pm-ch-flat-far-shot": "2026-04-01T09:30:00.000Z",
          },
        },
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          firstVisitedAt: "2026-04-02T09:00:00.000Z",
          completedChallenges: {
            "wi-ch-find-dark-band": "2026-04-02T09:30:00.000Z",
          },
        },
      },
    });

    const history = updateProgressHistoryStore({
      previousSnapshot,
      nextSnapshot,
      previousHistory: null,
      concepts,
      subjects,
      starterTracks,
      recordedAt: "2026-04-02T10:00:00.000Z",
      locale: "zh-HK",
    });

    expect(history.masteryTimeline).toHaveLength(1);
    expect(history.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "checkpoint-cleared",
          conceptSlug: "projectile-motion",
          title: "Trajectory checkpoint",
          href: "/zh-HK/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        }),
        expect.objectContaining({
          kind: "checkpoint-cleared",
          conceptSlug: "wave-interference",
          title: "Interference checkpoint",
        }),
        expect.objectContaining({
          kind: "mastery-updated",
          conceptSlug: "projectile-motion",
          masteryTo: "solid",
          href: "/zh-HK/concepts/projectile-motion",
        }),
        expect.objectContaining({
          kind: "mastery-updated",
          conceptSlug: "wave-interference",
          masteryTo: "shaky",
          href: "/zh-HK/concepts/wave-interference",
        }),
      ]),
    );
  });

  it("builds a premium checkpoint history view from the synced snapshot and compact history store", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-04-01T09:00:00.000Z",
          completedQuickTestAt: "2026-04-01T09:20:00.000Z",
          completedChallenges: {
            "pm-ch-flat-far-shot": "2026-04-01T09:30:00.000Z",
          },
        },
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          firstVisitedAt: "2026-04-02T09:00:00.000Z",
          completedChallenges: {
            "wi-ch-find-dark-band": "2026-04-02T09:30:00.000Z",
          },
        },
      },
    });
    const history = updateProgressHistoryStore({
      previousSnapshot: createEmptyProgressSnapshot(),
      nextSnapshot: snapshot,
      previousHistory: null,
      concepts,
      subjects,
      starterTracks,
      recordedAt: "2026-04-02T10:00:00.000Z",
    });

    const view = buildPremiumCheckpointHistoryView({
      snapshot,
      history,
      concepts,
      subjects,
      starterTracks,
    });

    expect(view.metrics.map((metric) => metric.label)).toEqual([
      "Checkpoint clears",
      "Challenge solves",
      "Solid concepts",
      "History points",
    ]);
    expect(view.recentEvents.map((event) => event.kind)).toContain("mastery-updated");
    expect(view.timeline[0]?.checkpointClearCount).toBe(2);
    expect(view.stableSubjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectTitle: "Physics",
        }),
      ]),
    );
    expect(view.needsWorkConcepts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conceptSlug: "wave-interference",
        }),
      ]),
    );
    expect(view.methodologyNote).toMatch(/compact cross-device checkpoint, challenge, and mastery history/i);
  });

  it("preserves zh-HK locale in premium checkpoint history concept links", () => {
    const snapshot = normalizeProgressSnapshot({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-04-01T09:00:00.000Z",
          completedQuickTestAt: "2026-04-01T09:20:00.000Z",
          completedChallenges: {
            "pm-ch-flat-far-shot": "2026-04-01T09:30:00.000Z",
          },
        },
        "wave-interference": {
          conceptId: "concept-wave-interference",
          slug: "wave-interference",
          firstVisitedAt: "2026-04-02T09:00:00.000Z",
          completedChallenges: {
            "wi-ch-find-dark-band": "2026-04-02T09:30:00.000Z",
          },
        },
      },
    });
    const history = updateProgressHistoryStore({
      previousSnapshot: createEmptyProgressSnapshot(),
      nextSnapshot: snapshot,
      previousHistory: null,
      concepts,
      subjects,
      starterTracks,
      recordedAt: "2026-04-02T10:00:00.000Z",
      locale: "zh-HK",
    });

    const view = buildPremiumCheckpointHistoryView({
      snapshot,
      history,
      concepts,
      subjects,
      starterTracks,
      locale: "zh-HK",
    });

    expect(view.stableConcepts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conceptSlug: "projectile-motion",
          href: "/zh-HK/concepts/projectile-motion",
        }),
      ]),
    );
    expect(view.needsWorkConcepts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conceptSlug: "wave-interference",
          href: "/zh-HK/concepts/wave-interference",
        }),
      ]),
    );
  });
});
