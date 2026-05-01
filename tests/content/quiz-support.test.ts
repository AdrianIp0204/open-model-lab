import { describe, expect, it } from "vitest";
import { getAllConcepts, getConceptBySlug } from "@/lib/content";
import { buildConceptQuizSession, resolveConceptQuizDefinition } from "@/lib/quiz";

describe("concept quiz support", () => {
  it("builds at least five quiz questions for every concept page", () => {
    const concepts = getAllConcepts({ includeUnpublished: true });

    for (const concept of concepts) {
      const definition = resolveConceptQuizDefinition(concept);
      const session = buildConceptQuizSession(concept, {
        seed: `content-quiz:${concept.slug}`,
        locale: "en",
      });

      expect(definition.questionCount).toBeGreaterThanOrEqual(5);
      expect(session.questions).toHaveLength(definition.questionCount);
      expect(new Set(session.questions.map((question) => question.canonicalQuestionId)).size).toBe(
        session.questions.length,
      );
    }
  });

  it("keeps the damping and resonance quiz varied and computable", () => {
    const concept = getConceptBySlug("damping-resonance");
    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:damping-resonance-quality",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) => question.kind === "generated",
    );

    expect(generatedQuestion?.templateId).toBe("damping-response-amplitude-template");
    expect(generatedQuestion?.prompt).toContain("steady-state response amplitude");
    expect(generatedQuestion?.givens?.map((given) => given.label)).toEqual([
      "Drive amplitude",
      "Damping ratio",
      "Natural frequency",
      "Driving frequency",
    ]);

    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "a",
      "c",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
  });

  it("keeps the wave speed and wavelength authored answer key from forming a letter pattern", () => {
    const concept = getConceptBySlug("wave-speed-wavelength");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
  });
});
