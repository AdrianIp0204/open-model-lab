import { describe, expect, it } from "vitest";
import { getConceptBySlug, getTopicDiscoverySummaryForConceptSlug } from "@/lib/content";
import {
  buildPersonalizedTestSuggestions,
  getPublishedConceptTestCatalog,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";
import type { ProgressSnapshot } from "@/lib/progress";

const conceptCatalog = getPublishedConceptTestCatalog();
const topicCatalog = getPublishedTopicTestCatalog();
const packCatalog = getPublishedPackTestCatalog();

describe("test hub recommendations", () => {
  it("suggests the recently visited concept test when the concept was studied but not yet tested", () => {
    const concept = getConceptBySlug("basic-circuits");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "basic-circuits": {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(suggestions[0]).toMatchObject({
      kind: "concept",
      entry: expect.objectContaining({
        conceptSlug: "basic-circuits",
      }),
      reasonKind: "recent-study",
    });
  });

  it("surfaces started but unfinished assessments before other recommendation buckets", () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {
        oscillations: {
          slug: "oscillations",
          startedAt: "2026-04-18T08:10:00.000Z",
        },
      },
      packTests: {},
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(suggestions[0]).toMatchObject({
      kind: "topic",
      entry: expect.objectContaining({
        topicSlug: "oscillations",
      }),
      reasonKind: "recent-test-activity",
    });
  });

  it("suggests the next concept test in the same topic after a recent completed concept test", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const topic = getTopicDiscoverySummaryForConceptSlug(concept.slug);
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:05:00.000Z",
          completedQuickTestAt: "2026-04-18T08:06:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
      },
      topicTests: {},
      packTests: {},
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(
      suggestions.find(
        (suggestion) =>
          suggestion.reasonKind === "next-in-topic" &&
          suggestion.kind === "concept" &&
          suggestion.sourceTopicSlug === topic.slug,
      ),
    ).toMatchObject({
      entry: expect.objectContaining({
        conceptSlug: "oscillation-energy",
      }),
    });
  });

  it("suggests the topic milestone after enough concept-test progress in the same topic", () => {
    const shm = getConceptBySlug("simple-harmonic-motion");
    const energy = getConceptBySlug("oscillation-energy");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: shm.id,
          slug: shm.slug,
          completedQuickTestAt: "2026-04-18T08:05:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "oscillation-energy": {
          conceptId: energy.id,
          slug: energy.slug,
          completedQuickTestAt: "2026-04-18T08:15:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
      },
      topicTests: {},
      packTests: {},
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(
      suggestions.find(
        (suggestion) =>
          suggestion.kind === "topic" &&
          suggestion.reasonKind === "topic-milestone" &&
          suggestion.entry.kind === "topic" &&
          suggestion.entry.topicSlug === "oscillations",
      ),
    ).toBeTruthy();
  });

  it("suggests the follow-on pack after a topic-test milestone is completed", () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {
        oscillations: {
          slug: "oscillations",
          completedAt: "2026-04-18T08:25:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 0,
          lastQuestionCount: 10,
        },
      },
      packTests: {},
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(
      suggestions.find(
        (suggestion) =>
          suggestion.kind === "pack" &&
          suggestion.reasonKind === "pack-follow-on" &&
          suggestion.entry.kind === "pack" &&
          suggestion.entry.packSlug === "physics-connected-models",
      ),
    ).toBeTruthy();
  });

  it("surfaces a started but unfinished pack before lower-priority suggestions", () => {
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {},
      topicTests: {},
      packTests: {
        "physics-connected-models": {
          slug: "physics-connected-models",
          startedAt: "2026-04-18T08:30:00.000Z",
        },
      },
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(suggestions[0]).toMatchObject({
      kind: "pack",
      entry: expect.objectContaining({
        packSlug: "physics-connected-models",
      }),
      reasonKind: "recent-test-activity",
    });
  });

  it("keeps recommendation ids unique and ranking deterministic when multiple buckets overlap", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: concept.id,
          slug: concept.slug,
          firstVisitedAt: "2026-04-18T08:00:00.000Z",
          lastVisitedAt: "2026-04-18T08:05:00.000Z",
          quickTestStartedAt: "2026-04-18T08:06:00.000Z",
        },
      },
      topicTests: {
        oscillations: {
          slug: "oscillations",
          startedAt: "2026-04-18T08:08:00.000Z",
        },
      },
      packTests: {},
    };

    const suggestions = buildPersonalizedTestSuggestions({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    expect(new Set(suggestions.map((suggestion) => suggestion.id)).size).toBe(suggestions.length);
    expect(suggestions[0]?.reasonKind).toBe("recent-test-activity");
    expect(["topic", "concept"]).toContain(suggestions[0]?.kind);
  });
});
