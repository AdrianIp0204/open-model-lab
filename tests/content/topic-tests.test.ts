import { describe, expect, it } from "vitest";
import { getConceptBySlug, getTopicDiscoverySummaries } from "@/lib/content";
import {
  buildTopicTestDefinitionsFromTopics,
  buildTopicTestSession,
  getPublishedTopicTestAudit,
  getPublishedTopicTestCatalog,
} from "@/lib/test-hub";

describe("topic tests", () => {
  it("ships a published topic test for every published topic and keeps each test in the 10-20 question range", () => {
    const catalog = getPublishedTopicTestCatalog();
    const publishedTopics = getTopicDiscoverySummaries();

    expect(catalog.excluded).toEqual([]);
    expect(catalog.entries.map((entry) => entry.topicSlug)).toEqual(
      publishedTopics.map((topic) => topic.slug),
    );

    for (const entry of catalog.entries) {
      expect(entry.questionCount).toBeGreaterThanOrEqual(10);
      expect(entry.questionCount).toBeLessThanOrEqual(20);
      expect(entry.includedConceptCount).toBeGreaterThanOrEqual(2);
    }
  });

  it("audits shipped topic tests with explicit bridge-question coverage and balanced concept contributions", () => {
    const audit = getPublishedTopicTestAudit();
    const publishedTopics = getTopicDiscoverySummaries();
    const totalBridgeQuestions = audit.entries.reduce(
      (sum, entry) => sum + entry.bridgeQuestionCount,
      0,
    );

    expect(audit.excluded).toEqual([]);
    expect(audit.entries).toHaveLength(publishedTopics.length);
    expect(totalBridgeQuestions).toBe(audit.entries.length);

    for (const entry of audit.entries) {
      expect(entry.bridgeQuestionCount).toBeGreaterThanOrEqual(1);
      expect(entry.bridgeQuestionIds.length).toBe(entry.bridgeQuestionCount);
      expect(Object.values(entry.conceptContributionCounts).every((count) => count >= 1)).toBe(
        true,
      );
      expect(Object.values(entry.conceptContributionCounts).every((count) => count <= 5)).toBe(
        true,
      );
    }
  });

  it("keeps physics topic bridge answer keys varied while preserving the correct bridge claims", () => {
    const fixtures = [
      {
        topicSlug: "oscillations",
        correctChoiceId: "a",
        correctSnippet: "resonant amplitude falls",
      },
      {
        topicSlug: "mechanics",
        correctChoiceId: "b",
        correctSnippet: "Use impulse to track each object's momentum change",
      },
      {
        topicSlug: "fluids",
        correctChoiceId: "c",
        correctSnippet: "pressure is larger deeper down",
      },
      {
        topicSlug: "thermodynamics",
        correctChoiceId: "d",
        correctSnippet: "Heat transfer keeps adding energy",
      },
      {
        topicSlug: "electricity",
        correctChoiceId: "a",
        correctSnippet: "larger potential difference",
      },
      {
        topicSlug: "electromagnetism",
        correctChoiceId: "b",
        correctSnippet: "changing magnetic flux",
      },
      {
        topicSlug: "optics",
        correctChoiceId: "c",
        correctSnippet: "refraction depends on wavelength",
      },
      {
        topicSlug: "modern-physics",
        correctChoiceId: "d",
        correctSnippet: "threshold frequency",
      },
    ] as const;

    for (const fixture of fixtures) {
      const session = buildTopicTestSession(fixture.topicSlug, {
        locale: "en",
        seed: `topic-bridge-answer-key:${fixture.topicSlug}`,
      });
      const bridgeQuestion = session.questions.find((question) =>
        question.canonicalQuestionId.startsWith(`topic:${fixture.topicSlug}:authored:`),
      );

      expect(bridgeQuestion?.correctChoiceId).toBe(fixture.correctChoiceId);
      expect(
        bridgeQuestion?.choices.find((choice) => choice.id === fixture.correctChoiceId)?.label,
      ).toContain(fixture.correctSnippet);
    }

    expect(new Set(fixtures.map((fixture) => fixture.correctChoiceId)).size).toBe(4);
  });

  it("keeps Math topic bridge answer keys varied while preserving the correct bridge claims", () => {
    const fixtures = [
      {
        topicSlug: "functions",
        correctChoiceId: "b",
        correctSnippet: "same vertical transformation",
      },
      {
        topicSlug: "calculus",
        correctChoiceId: "c",
        correctSnippet: "derivative-style local-rate reasoning",
      },
      {
        topicSlug: "vectors",
        correctChoiceId: "d",
        correctSnippet: "matrix to get the new vector",
      },
      {
        topicSlug: "complex-numbers-and-parametric-motion",
        correctChoiceId: "a",
        correctSnippet: "polar magnitude-angle form",
      },
    ] as const;

    for (const fixture of fixtures) {
      const session = buildTopicTestSession(fixture.topicSlug, {
        locale: "en",
        seed: `math-topic-bridge-answer-key:${fixture.topicSlug}`,
      });
      const bridgeQuestion = session.questions.find((question) =>
        question.canonicalQuestionId.startsWith(`topic:${fixture.topicSlug}:authored:`),
      );

      expect(bridgeQuestion?.correctChoiceId).toBe(fixture.correctChoiceId);
      expect(
        bridgeQuestion?.choices.find((choice) => choice.id === fixture.correctChoiceId)?.label,
      ).toContain(fixture.correctSnippet);
    }

    expect(new Set(fixtures.map((fixture) => fixture.correctChoiceId)).size).toBe(4);
  });

  it("keeps Chemistry topic bridge answer keys varied while preserving the correct bridge claims", () => {
    const fixtures = [
      {
        topicSlug: "rates-and-equilibrium",
        correctChoiceId: "a",
        correctSnippet: "collision success rates",
      },
      {
        topicSlug: "stoichiometry-and-yield",
        correctChoiceId: "b",
        correctSnippet: "limiting reagent",
      },
      {
        topicSlug: "solutions-and-ph",
        correctChoiceId: "c",
        correctSnippet: "buffer can still resist",
      },
    ] as const;

    for (const fixture of fixtures) {
      const session = buildTopicTestSession(fixture.topicSlug, {
        locale: "en",
        seed: `chemistry-topic-bridge-answer-key:${fixture.topicSlug}`,
      });
      const bridgeQuestion = session.questions.find((question) =>
        question.canonicalQuestionId.startsWith(`topic:${fixture.topicSlug}:authored:`),
      );

      expect(bridgeQuestion?.correctChoiceId).toBe(fixture.correctChoiceId);
      expect(
        bridgeQuestion?.choices.find((choice) => choice.id === fixture.correctChoiceId)?.label,
      ).toContain(fixture.correctSnippet);
    }

    expect(new Set(fixtures.map((fixture) => fixture.correctChoiceId)).size).toBe(3);
  });

  it("keeps remaining topic bridge answer keys varied while preserving the correct bridge claims", () => {
    const fixtures = [
      {
        topicSlug: "algorithms-and-search",
        correctChoiceId: "b",
        correctSnippet: "sorted list lets you discard half",
      },
      {
        topicSlug: "gravity-and-orbits",
        correctChoiceId: "c",
        correctSnippet: "required circular speed is lower",
      },
      {
        topicSlug: "waves",
        correctChoiceId: "d",
        correctSnippet: "Doppler-shift the observed frequency",
      },
      {
        topicSlug: "sound",
        correctChoiceId: "a",
        correctSnippet: "beat rate comes from the small difference",
      },
      {
        topicSlug: "circuits",
        correctChoiceId: "b",
        correctSnippet: "equivalent resistance increases",
      },
      {
        topicSlug: "magnetism",
        correctChoiceId: "c",
        correctSnippet: "current creates a magnetic field",
      },
      {
        topicSlug: "mirrors-and-lenses",
        correctChoiceId: "d",
        correctSnippet: "diffraction limits the resolving power",
      },
    ] as const;

    for (const fixture of fixtures) {
      const session = buildTopicTestSession(fixture.topicSlug, {
        locale: "en",
        seed: `remaining-topic-bridge-answer-key:${fixture.topicSlug}`,
      });
      const bridgeQuestion = session.questions.find((question) =>
        question.canonicalQuestionId.startsWith(`topic:${fixture.topicSlug}:authored:`),
      );

      expect(bridgeQuestion?.correctChoiceId).toBe(fixture.correctChoiceId);
      expect(
        bridgeQuestion?.choices.find((choice) => choice.id === fixture.correctChoiceId)?.label,
      ).toContain(fixture.correctSnippet);
    }

    expect(new Set(fixtures.map((fixture) => fixture.correctChoiceId)).size).toBe(4);
  });

  it("builds topic sessions without duplicate canonical questions or fallback-backed question instances", () => {
    const catalog = getPublishedTopicTestCatalog();

    for (const entry of catalog.entries) {
      const session = buildTopicTestSession(entry.topicSlug, {
        locale: "en",
        seed: `topic-test-validation:${entry.topicSlug}`,
      });
      const canonicalQuestionIds = new Set(
        session.questions.map((question) => question.canonicalQuestionId),
      );

      expect(session.questions).toHaveLength(entry.questionCount);
      expect(canonicalQuestionIds.size).toBe(session.questions.length);
      expect(
        session.questions.some((question) =>
          question.canonicalQuestionId.startsWith(`topic:${entry.topicSlug}:authored:`),
        ),
      ).toBe(true);
      expect(
        session.questions.some(
          (question) => question.generationSource === "fallback-misconception",
        ),
      ).toBe(false);
    }
  });

  it("keeps next topic test ordering deterministic within the same subject before falling forward globally", () => {
    const catalog = getPublishedTopicTestCatalog();

    catalog.entries.forEach((entry, index) => {
      const sameSubjectNext =
        catalog.entries
          .slice(index + 1)
          .find((candidate) => candidate.subject === entry.subject) ?? null;
      const expectedNext = sameSubjectNext ?? catalog.entries[index + 1] ?? null;

      expect(catalog.nextByTopicSlug.get(entry.topicSlug) ?? null).toEqual(expectedNext);
    });
  });

  it("excludes a topic test when one of its concepts is unpublished in the generic builder", () => {
    const publishedConcept = getConceptBySlug("basic-circuits");
    const draftConcept = {
      ...publishedConcept,
      id: "draft-topic-test-concept",
      slug: "draft-topic-test-concept",
      published: false,
    };
    const result = buildTopicTestDefinitionsFromTopics(
      [
        {
          slug: "synthetic-topic",
          title: "Synthetic Topic",
          description: "Synthetic topic description",
          subject: "Physics",
          concepts: [publishedConcept, draftConcept],
        },
      ],
      {
        resolveConceptBySlug: (conceptSlug) => {
          if (conceptSlug === publishedConcept.slug) {
            return publishedConcept;
          }

          if (conceptSlug === draftConcept.slug) {
            return draftConcept;
          }

          return null;
        },
      },
    );

    expect(result.definitions).toEqual([]);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        topicSlug: "synthetic-topic",
        reason: expect.stringMatching(/published and resolves to quiz support/i),
      }),
    ]);
  });

  it("excludes a topic test from the generic builder when it has no explicit bridge question", () => {
    const publishedConcept = getConceptBySlug("basic-circuits");
    const result = buildTopicTestDefinitionsFromTopics(
      [
        {
          slug: "synthetic-topic",
          title: "Synthetic Topic",
          description: "Synthetic topic description",
          subject: "Physics",
          concepts: [publishedConcept, getConceptBySlug("power-energy-circuits")],
        },
      ],
      {
        resolveConceptBySlug: (conceptSlug) =>
          conceptSlug === publishedConcept.slug
            ? publishedConcept
            : getConceptBySlug(conceptSlug),
        authoringByTopicSlug: new Map([
          [
            "synthetic-topic",
            {
              topicSlug: "synthetic-topic",
              questions: [
                {
                  id: "single-concept-topic-check",
                  kind: "topic-check",
                  type: "reasoning",
                  relatedConceptSlugs: [publishedConcept.slug],
                  prompt: "Synthetic prompt",
                  choices: [
                    { id: "a", label: "A" },
                    { id: "b", label: "B" },
                  ],
                  correctChoiceId: "a",
                  explanation: "Synthetic explanation",
                },
              ],
            },
          ],
        ]),
      },
    );

    expect(result.definitions).toEqual([]);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        topicSlug: "synthetic-topic",
        reason: expect.stringMatching(/explicit bridge question/i),
      }),
    ]);
  });
});
