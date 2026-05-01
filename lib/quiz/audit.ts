import type { ConceptContent } from "@/lib/content";
import {
  buildConceptQuizSession,
  isConceptQuizQuantitative,
  resolveConceptQuizDefinition,
} from "./index";
import type { QuizGenerationSource, QuizQuestionInstance } from "./types";

export type ConceptQuizCoverageAudit = {
  conceptId: string;
  conceptSlug: string;
  conceptTitle: string;
  mode: "static" | "generated" | "hybrid";
  questionCount: number;
  sessionQuestionCount: number;
  staticQuestionCount: number;
  generatedQuestionCount: number;
  isQuantitative: boolean;
  quantitativeSource: "authored" | "simulation-kind" | "non-quantitative";
  explicitTemplateCount: number;
  derivedTemplateCount: number;
  fallbackTemplateCount: number;
  builtInTemplateCount: number;
  usedGenerationSources: QuizGenerationSource[];
  usesFallbackQuestion: boolean;
  parameterizedGeneratedQuestionCount: number;
  nonParameterizedGeneratedQuestionCount: number;
  freshAttemptVariationCount: number;
  generatedQuestionDetails: Array<{
    canonicalQuestionId: string;
    templateId: string | null;
    generationSource: QuizGenerationSource | "static";
    isParameterized: boolean;
    formattedCorrectAnswer: string;
  }>;
};

export type QuizCoverageSummary = {
  conceptCount: number;
  modeCounts: Record<"static" | "generated" | "hybrid", number>;
  quantitativeConceptCount: number;
  conceptsWithExplicitTemplates: number;
  conceptsUsingDerivedGeneration: number;
  conceptsUsingFallbackQuestions: number;
  conceptsUsingBuiltInTemplates: number;
};

function getQuestionGenerationSource(
  question: QuizQuestionInstance,
  concept: ConceptContent,
) {
  if (question.kind === "static") {
    return {
      source: "static" as const,
      isParameterized: false,
    };
  }

  const definition = resolveConceptQuizDefinition(concept);
  const template = definition.templates.find((item) => item.canonicalTemplateId === question.templateId);

  return {
    source:
      question.generationSource ??
      template?.origin ??
      ("derived-worked-example" as const),
    isParameterized:
      question.isParameterized ??
      template?.isParameterized ??
      false,
  };
}

export function auditConceptQuizCoverage(
  concept: ConceptContent,
): ConceptQuizCoverageAudit {
  const definition = resolveConceptQuizDefinition(concept);
  const session = buildConceptQuizSession(concept, {
    locale: "en",
    seed: `audit:${concept.slug}:attempt:1`,
  });
  const freshSessions = [2, 3, 4].map((attempt) =>
    buildConceptQuizSession(concept, {
      locale: "en",
      seed: `audit:${concept.slug}:attempt:${attempt}`,
    }),
  );
  const explicitTemplateCount = (concept.quickTest.templates ?? []).length;
  const derivedTemplateCount = definition.templates.filter(
    (template) => template.origin === "derived-worked-example",
  ).length;
  const fallbackTemplateCount = definition.templates.filter(
    (template) => template.origin === "fallback-misconception",
  ).length;
  const builtInTemplateCount = definition.templates.filter(
    (template) => template.origin === "built-in-exact-angle",
  ).length;
  const generatedQuestions = session.questions.filter(
    (question): question is QuizQuestionInstance & { kind: "generated" } =>
      question.kind === "generated",
  );
  const freshGeneratedByCanonicalId = freshSessions.map(
    (freshSession) =>
      new Map(
        freshSession.questions
          .filter((question) => question.kind === "generated")
          .map((question) => [question.canonicalQuestionId, question] as const),
      ),
  );
  const generatedQuestionDetails = session.questions.map((question) => {
    const generation = getQuestionGenerationSource(question, concept);

    return {
      canonicalQuestionId: question.canonicalQuestionId,
      templateId: question.templateId ?? null,
      generationSource: generation.source,
      isParameterized: generation.isParameterized,
      formattedCorrectAnswer: question.formattedCorrectAnswer,
    };
  });
  const usedGenerationSources = [
    ...new Set(
      generatedQuestionDetails
        .map((detail) => detail.generationSource)
        .filter((source): source is QuizGenerationSource => source !== "static"),
    ),
  ];
  const parameterizedGeneratedQuestionCount = generatedQuestionDetails.filter(
    (detail) => detail.generationSource !== "static" && detail.isParameterized,
  ).length;
  const nonParameterizedGeneratedQuestionCount = generatedQuestionDetails.filter(
    (detail) => detail.generationSource !== "static" && !detail.isParameterized,
  ).length;
  const freshAttemptVariationCount = generatedQuestions.reduce((count, question) => {
    const changed = freshGeneratedByCanonicalId.some((freshLookup) => {
      const freshQuestion = freshLookup.get(question.canonicalQuestionId);

      if (!freshQuestion) {
        return false;
      }

      return (
        freshQuestion.prompt !== question.prompt ||
        freshQuestion.formattedCorrectAnswer !== question.formattedCorrectAnswer ||
        JSON.stringify(freshQuestion.choices) !== JSON.stringify(question.choices) ||
        JSON.stringify(freshQuestion.givens ?? []) !== JSON.stringify(question.givens ?? [])
      );
    });

    return count + (changed ? 1 : 0);
  }, 0);

  return {
    conceptId: concept.id,
    conceptSlug: concept.slug,
    conceptTitle: concept.title,
    mode: definition.mode,
    questionCount: definition.questionCount,
    sessionQuestionCount: session.questions.length,
    staticQuestionCount: definition.staticQuestions.length,
    generatedQuestionCount: generatedQuestions.length,
    isQuantitative: isConceptQuizQuantitative(concept),
    quantitativeSource:
      typeof concept.quickTest.isQuantitative === "boolean"
        ? "authored"
        : isConceptQuizQuantitative(concept)
          ? "simulation-kind"
          : "non-quantitative",
    explicitTemplateCount,
    derivedTemplateCount,
    fallbackTemplateCount,
    builtInTemplateCount,
    usedGenerationSources,
    usesFallbackQuestion: generatedQuestionDetails.some(
      (detail) => detail.generationSource === "fallback-misconception",
    ),
    parameterizedGeneratedQuestionCount,
    nonParameterizedGeneratedQuestionCount,
    freshAttemptVariationCount,
    generatedQuestionDetails,
  };
}

export function summarizeQuizCoverageAudit(
  concepts: ConceptContent[],
): QuizCoverageSummary {
  const audits = concepts.map(auditConceptQuizCoverage);

  return {
    conceptCount: audits.length,
    modeCounts: audits.reduce(
      (counts, audit) => {
        counts[audit.mode] += 1;
        return counts;
      },
      { static: 0, generated: 0, hybrid: 0 },
    ),
    quantitativeConceptCount: audits.filter((audit) => audit.isQuantitative).length,
    conceptsWithExplicitTemplates: audits.filter((audit) => audit.explicitTemplateCount > 0).length,
    conceptsUsingDerivedGeneration: audits.filter((audit) =>
      audit.usedGenerationSources.includes("derived-worked-example"),
    ).length,
    conceptsUsingFallbackQuestions: audits.filter((audit) => audit.usesFallbackQuestion).length,
    conceptsUsingBuiltInTemplates: audits.filter((audit) =>
      audit.usedGenerationSources.includes("built-in-exact-angle"),
    ).length,
  };
}
