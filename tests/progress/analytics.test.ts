import { describe, expect, it } from "vitest";
import { decorateConceptSummaries } from "@/components/concepts/concept-catalog";
import type { AchievementStats } from "@/lib/achievements";
import {
  getConceptSummaries,
  getGuidedCollections,
  getPublishedConceptMetadata,
  getStarterTracks,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import { getConceptDisplayTitle, getTopicDisplayTitle } from "@/lib/i18n/content";
import { buildPremiumLearningAnalytics, normalizeProgressSnapshot } from "@/lib/progress";

const concepts = decorateConceptSummaries(getConceptSummaries(), {
  conceptMetadata: getPublishedConceptMetadata(),
});
const starterTracks = getStarterTracks();
const subjectSummaries = getSubjectDiscoverySummaries();
const topicSummaries = getTopicDiscoverySummaries();
const guidedCollections = getGuidedCollections();

function buildSampleAnalytics(locale?: "en" | "zh-HK") {
  const snapshot = normalizeProgressSnapshot({
    version: 1,
    concepts: {
      "vectors-components": {
        conceptId: "concept-vectors-components",
        slug: "vectors-components",
        firstVisitedAt: "2026-04-01T08:00:00.000Z",
        lastVisitedAt: "2026-04-01T08:15:00.000Z",
        completedQuickTestAt: "2026-04-01T08:20:00.000Z",
        manualCompletedAt: "2026-04-01T08:25:00.000Z",
        usedPredictionModeAt: "2026-04-01T08:05:00.000Z",
      },
      "projectile-motion": {
        conceptId: "concept-projectile-motion",
        slug: "projectile-motion",
        firstVisitedAt: "2026-04-01T09:00:00.000Z",
        lastVisitedAt: "2026-04-01T09:20:00.000Z",
        completedQuickTestAt: "2026-04-01T09:25:00.000Z",
        manualCompletedAt: "2026-04-01T09:30:00.000Z",
        completedChallenges: {
          "pm-ch-flat-far-shot": "2026-04-01T09:35:00.000Z",
        },
      },
      "wave-speed-wavelength": {
        conceptId: "concept-wave-speed-wavelength",
        slug: "wave-speed-wavelength",
        firstVisitedAt: "2026-04-02T09:00:00.000Z",
        lastVisitedAt: "2026-04-02T09:10:00.000Z",
        completedQuickTestAt: "2026-04-02T09:12:00.000Z",
        quickTestAttemptCount: 2,
        quickTestLastIncorrectCount: 2,
        quickTestMissStreak: 2,
        quickTestLastMissedAt: "2026-04-02T09:12:00.000Z",
      },
      "wave-interference": {
        conceptId: "concept-wave-interference",
        slug: "wave-interference",
        firstVisitedAt: "2026-04-03T10:00:00.000Z",
        lastVisitedAt: "2026-04-03T10:15:00.000Z",
        usedChallengeModeAt: "2026-04-03T10:05:00.000Z",
        startedChallenges: {
          "wi-ch-find-dark-band": "2026-04-03T10:06:00.000Z",
        },
        engagedWorkedExampleAt: "2026-04-03T10:10:00.000Z",
      },
    },
  });
  const achievementStats: AchievementStats = {
    conceptVisitCount: 18,
    questionAnswerCount: 24,
    distinctChallengeCompletionCount: 3,
    distinctTrackCompletionCount: 1,
    activeStudySeconds: 18_000,
  };

  return buildPremiumLearningAnalytics({
    snapshot,
    achievementStats,
    concepts,
    starterTracks,
    subjectSummaries,
    topicSummaries,
    guidedCollections,
    locale,
  });
}

describe("premium learning analytics", () => {
  it("builds transparent usage, topic, and next-step summaries from saved signals", () => {
    const analytics = buildSampleAnalytics();
    const achievementMetrics = Object.fromEntries(
      analytics.usageSnapshot.achievementMetrics.map((metric) => [metric.label, metric.value]),
    );
    const progressMetrics = Object.fromEntries(
      analytics.usageSnapshot.progressMetrics.map((metric) => [metric.label, metric.value]),
    );

    expect(analytics.hasRecordedProgress).toBe(true);
    expect(achievementMetrics["Concept visits"]).toBe("18");
    expect(achievementMetrics["Questions answered"]).toBe("24");
    expect(achievementMetrics["Challenge completions"]).toBe("3");
    expect(achievementMetrics["Track completions"]).toBe("1");
    expect(achievementMetrics["Active study hours"]).toBe("5 hours");
    expect(progressMetrics["Concepts started"]).toBe("4");
    expect(progressMetrics["Concepts completed"]).toBe("2");
    expect(progressMetrics["Solved challenge concepts"]).toBe("1");
    expect(progressMetrics["Quick-test concepts"]).toBe("3");
    expect(progressMetrics["Study-tool touches"]).toBe("2");
    expect(analytics.checkpointHistory.metrics[0]?.label).toBe("Checkpoint clears");
    expect(analytics.checkpointHistory.methodologyNote).toMatch(/cross-device/i);

    expect(analytics.strengths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicSlug: "mechanics",
          href: "/concepts/topics/mechanics",
        }),
      ]),
    );
    expect(analytics.needsWork).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicSlug: "waves",
          href: "/concepts/topics/waves",
        }),
      ]),
    );
    expect(analytics.adaptiveReview.items[0]).toMatchObject({
      concept: {
        slug: "wave-speed-wavelength",
        title: "Wave Speed and Wavelength",
      },
      outcomeKind: "quick-test",
      primaryAction: {
        kind: "quick-test",
        href: "/concepts/wave-speed-wavelength#quick-test",
      },
    });
    expect(analytics.adaptiveReview.items[0]?.remediationSuggestions.length).toBeGreaterThan(0);
    expect(analytics.nextSteps[0]).toMatchObject({
      title: "Wave Interference",
      href: "/concepts/wave-interference",
    });
    expect(analytics.coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ topicSlug: "mechanics" }),
        expect.objectContaining({ topicSlug: "waves" }),
      ]),
    );
    expect(analytics.methodologyNote).toMatch(/synced checkpoint and mastery history/i);
    expect(analytics.methodologyNote).toMatch(/server-backed achievement counters/i);
  });

  it("preserves zh-HK locale in topic insight and next-step links", () => {
    const analytics = buildSampleAnalytics("zh-HK");
    const mechanicsTopic = topicSummaries.find((topic) => topic.slug === "mechanics");
    const wavesTopic = topicSummaries.find((topic) => topic.slug === "waves");
    const waveInterference = concepts.find((concept) => concept.slug === "wave-interference");

    expect(analytics.strengths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicSlug: "mechanics",
          title: getTopicDisplayTitle(mechanicsTopic!, "zh-HK"),
          href: "/zh-HK/concepts/topics/mechanics",
        }),
      ]),
    );
    expect(analytics.needsWork).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicSlug: "waves",
          title: getTopicDisplayTitle(wavesTopic!, "zh-HK"),
          href: "/zh-HK/concepts/topics/waves",
        }),
      ]),
    );
    expect(analytics.coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicSlug: "mechanics",
          title: getTopicDisplayTitle(mechanicsTopic!, "zh-HK"),
        }),
      ]),
    );
    expect(analytics.nextSteps[0]).toMatchObject({
      title: getConceptDisplayTitle(waveInterference!, "zh-HK"),
      href: "/zh-HK/concepts/wave-interference",
    });
  });
});
