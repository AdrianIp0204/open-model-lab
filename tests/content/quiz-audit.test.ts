import { describe, expect, it } from "vitest";
import { getAllConcepts } from "@/lib/content";
import { auditConceptQuizCoverage, summarizeQuizCoverageAudit } from "@/lib/quiz";

describe("quiz audit", () => {
  it("audits every concept quiz session and reports coverage facts", { timeout: 20_000 }, () => {
    const concepts = getAllConcepts({ includeUnpublished: true });
    const audits = concepts.map(auditConceptQuizCoverage);
    const summary = summarizeQuizCoverageAudit(concepts);

    console.info(
      "[quiz-audit]",
      JSON.stringify(
        {
          summary,
          fallbackConcepts: audits
            .filter((audit) => audit.usesFallbackQuestion)
            .map((audit) => audit.conceptSlug),
          quantitativeUsingFallback: audits
            .filter((audit) => audit.isQuantitative && audit.usesFallbackQuestion)
            .map((audit) => audit.conceptSlug),
          conceptsWithFreshVariation: audits
            .filter((audit) => audit.generatedQuestionCount > 0 && audit.freshAttemptVariationCount > 0)
            .map((audit) => audit.conceptSlug),
          generatedWithoutVariation: audits
            .filter(
              (audit) =>
                audit.generatedQuestionCount > 0 &&
                audit.parameterizedGeneratedQuestionCount > 0 &&
                audit.freshAttemptVariationCount === 0,
            )
            .map((audit) => audit.conceptSlug),
        },
        null,
        2,
      ),
    );

    expect(audits).toHaveLength(concepts.length);
    expect(audits.every((audit) => audit.sessionQuestionCount >= 5)).toBe(true);
    expect(
      audits.every((audit) => audit.sessionQuestionCount === audit.questionCount),
    ).toBe(true);
    expect(
      audits.every((audit) =>
        audit.generatedQuestionDetails.every((detail) => detail.canonicalQuestionId.length > 0),
      ),
    ).toBe(true);
    expect(
      audits
        .filter(
          (audit) =>
            audit.generatedQuestionCount > 0 &&
            audit.parameterizedGeneratedQuestionCount > 0,
        )
        .every((audit) => audit.freshAttemptVariationCount > 0),
    ).toBe(true);
    expect(
      audits
        .filter((audit) => audit.isQuantitative && audit.generatedQuestionCount > 0)
        .every((audit) => audit.parameterizedGeneratedQuestionCount > 0),
    ).toBe(true);
    expect(
      audits.some((audit) => audit.isQuantitative && audit.usesFallbackQuestion),
    ).toBe(false);
    expect(audits.some((audit) => audit.usesFallbackQuestion)).toBe(false);
  });
});
