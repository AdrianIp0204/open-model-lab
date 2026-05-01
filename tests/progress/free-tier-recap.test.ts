import { describe, expect, it } from "vitest";
import {
  getConceptSummaries,
  getGuidedCollections,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import { getConceptDisplayTitle } from "@/lib/i18n/content";
import {
  buildFreeTierProgressRecapSummary,
  normalizeProgressSnapshot,
} from "@/lib/progress";

describe("free-tier progress recap", () => {
  it("derives recent challenge clears, subject momentum, and bounded next prompts from saved progress", () => {
    const summary = buildFreeTierProgressRecapSummary({
      snapshot: normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            firstVisitedAt: "2026-04-02T08:00:00.000Z",
            lastVisitedAt: "2026-04-06T08:05:00.000Z",
            lastInteractedAt: "2026-04-06T08:05:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-04-05T08:00:00.000Z",
              "pm-ch-apex-freeze": "2026-04-06T08:00:00.000Z",
            },
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            firstVisitedAt: "2026-04-04T08:00:00.000Z",
            lastVisitedAt: "2026-04-04T08:10:00.000Z",
          },
        },
      }),
      concepts: getConceptSummaries(),
      starterTracks: getStarterTracks(),
      guidedCollections: getGuidedCollections(),
      subjects: getSubjectDiscoverySummaries(),
      locale: "zh-HK",
    });

    expect(summary.hasRecordedProgress).toBe(true);
    expect(summary.completedChallengeCount).toBe(2);
    expect(summary.completedCheckpointCount).toBe(1);
    expect(summary.recentCompletions[0]).toMatchObject({
      kind: "challenge",
      title: "Projectile Motion challenge",
      href: "/zh-HK/concepts/projectile-motion?challenge=pm-ch-apex-freeze#challenge-mode",
    });
    expect(summary.recentCompletions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "checkpoint",
          title: "Trajectory checkpoint",
          href: "/zh-HK/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        }),
      ]),
    );
    expect(summary.subjectMomentum[0]).toMatchObject({
      subjectTitle: "Physics",
      touchedConceptCount: 2,
      solvedChallengeCount: 2,
      clearedCheckpointCount: 1,
    });
    expect(
      summary.nextPrompts.some(
        (prompt) => prompt.kind === "track" || prompt.kind === "checkpoint",
      ),
    ).toBe(true);
  });

  it("preserves zh-HK locale in continue-learning recap prompts", () => {
    const concepts = getConceptSummaries();
    const waveInterference = concepts.find((concept) => concept.slug === "wave-interference");

    expect(waveInterference).toBeTruthy();

    const summary = buildFreeTierProgressRecapSummary({
      snapshot: normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            firstVisitedAt: "2026-04-24T08:00:00.000Z",
            lastVisitedAt: "2026-04-24T08:05:00.000Z",
            lastInteractedAt: "2026-04-24T08:05:00.000Z",
          },
        },
      }),
      concepts,
      starterTracks: [],
      guidedCollections: [],
      subjects: [],
      locale: "zh-HK",
      nextPromptLimit: 3,
    });

    expect(summary.nextPrompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "concept:wave-interference",
          title: getConceptDisplayTitle(waveInterference!, "zh-HK"),
          href: "/zh-HK/concepts/wave-interference",
          actionLabel: "繼續概念",
        }),
      ]),
    );
  });
});
