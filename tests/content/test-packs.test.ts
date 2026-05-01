import { describe, expect, it } from "vitest";
import { getSubjectDiscoverySummaries } from "@/lib/content";
import {
  buildPackTestDefinitionsFromSubjects,
  buildPackTestSession,
  getPublishedPackTestAudit,
  getPublishedPackTestCatalog,
} from "@/lib/test-hub";

describe("cross-topic packs", () => {
  it("ships the expected public packs and reports the explicit excluded subject set", () => {
    const catalog = getPublishedPackTestCatalog();
    const audit = getPublishedPackTestAudit();

    expect(catalog.entries.map((entry) => entry.packSlug)).toEqual([
      "physics-connected-models",
      "math-linked-representations",
      "chemistry-connected-systems",
    ]);
    expect(audit.excluded).toEqual([
      expect.objectContaining({
        subjectSlug: "computer-science",
        reason: expect.stringMatching(/at least two published topics/i),
      }),
    ]);
  });

  it("keeps every shipped pack within the 10-20 question range, across multiple topics, with at least two explicit bridge questions", () => {
    const audit = getPublishedPackTestAudit();

    for (const entry of audit.entries) {
      expect(entry.questionCount).toBeGreaterThanOrEqual(10);
      expect(entry.questionCount).toBeLessThanOrEqual(20);
      expect(entry.includedTopicSlugs.length).toBeGreaterThanOrEqual(2);
      expect(entry.bridgeQuestionCount).toBeGreaterThanOrEqual(2);
      expect(entry.bridgeQuestionIds).toHaveLength(entry.bridgeQuestionCount);
      expect(
        Object.values(entry.topicContributionCounts).filter((count) => count > 0).length,
      ).toBeGreaterThanOrEqual(2);
      expect(Object.values(entry.topicContributionCounts).every((count) => count <= 5)).toBe(
        true,
      );
      expect(Object.values(entry.conceptContributionCounts).every((count) => count <= 3)).toBe(
        true,
      );
    }
  });

  it("keeps pack bridge answer keys varied while preserving the correct bridge claims", () => {
    const fixtures = [
      {
        packSlug: "physics-connected-models",
        expected: [
          {
            correctChoiceId: "a",
            correctSnippet: "Gravity provides the inward acceleration",
          },
          {
            correctChoiceId: "b",
            correctSnippet: "source point oscillates locally",
          },
        ],
      },
      {
        packSlug: "math-linked-representations",
        expected: [
          {
            correctChoiceId: "c",
            correctSnippet: "vertical stretch changes slope values",
          },
          {
            correctChoiceId: "d",
            correctSnippet: "real and imaginary parts are the vector components",
          },
        ],
      },
      {
        packSlug: "chemistry-connected-systems",
        expected: [
          {
            correctChoiceId: "a",
            correctSnippet: "full-conversion recipe",
          },
          {
            correctChoiceId: "b",
            correctSnippet: "Use mole ratios first",
          },
        ],
      },
    ] as const;

    for (const fixture of fixtures) {
      const session = buildPackTestSession(fixture.packSlug, {
        locale: "en",
        seed: `pack-bridge-answer-key:${fixture.packSlug}`,
      });
      const bridgeQuestions = session.questions.filter((question) =>
        question.canonicalQuestionId.startsWith(`pack:${fixture.packSlug}:authored:`),
      );

      expect(bridgeQuestions).toHaveLength(fixture.expected.length);
      fixture.expected.forEach((expected, index) => {
        const bridgeQuestion = bridgeQuestions[index]!;

        expect(bridgeQuestion.correctChoiceId).toBe(expected.correctChoiceId);
        expect(
          bridgeQuestion.choices.find((choice) => choice.id === expected.correctChoiceId)?.label,
        ).toContain(expected.correctSnippet);
      });
    }
  });

  it("builds pack sessions without duplicate canonical questions or fallback-backed question instances", () => {
    const catalog = getPublishedPackTestCatalog();

    for (const entry of catalog.entries) {
      const session = buildPackTestSession(entry.packSlug, {
        locale: "en",
        seed: `pack-test-validation:${entry.packSlug}`,
      });
      const canonicalQuestionIds = new Set(
        session.questions.map((question) => question.canonicalQuestionId),
      );
      const authoredQuestionCount = session.questions.filter((question) =>
        question.canonicalQuestionId.startsWith(`pack:${entry.packSlug}:authored:`),
      ).length;

      expect(session.questions).toHaveLength(entry.questionCount);
      expect(canonicalQuestionIds.size).toBe(session.questions.length);
      expect(authoredQuestionCount).toBeGreaterThanOrEqual(2);
      expect(
        session.questions.some(
          (question) => question.generationSource === "fallback-misconception",
        ),
      ).toBe(false);
    }
  });

  it("keeps next-pack ordering deterministic in stable subject order", () => {
    const catalog = getPublishedPackTestCatalog();

    expect(catalog.nextByPackSlug.get("physics-connected-models")?.packSlug).toBe(
      "math-linked-representations",
    );
    expect(catalog.nextByPackSlug.get("math-linked-representations")?.packSlug).toBe(
      "chemistry-connected-systems",
    );
    expect(catalog.nextByPackSlug.get("chemistry-connected-systems")).toBeNull();
  });

  it("excludes a synthetic subject without pack authoring even when it has multiple topics", () => {
    const subjects = getSubjectDiscoverySummaries();
    const syntheticSubject = {
      ...subjects[0]!,
      slug: "synthetic-subject",
      title: "Synthetic Subject",
      topics: subjects[0]!.topics.slice(0, 2),
      concepts: subjects[0]!.topics.slice(0, 2).flatMap((topic) => topic.concepts),
    };
    const result = buildPackTestDefinitionsFromSubjects([syntheticSubject], {
      authoringBySubjectSlug: new Map(),
    });

    expect(result.definitions).toEqual([]);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        subjectSlug: "synthetic-subject",
        reason: expect.stringMatching(/authoring entry/i),
      }),
    ]);
  });
});
