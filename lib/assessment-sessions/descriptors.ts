import type { ConceptContent } from "@/lib/content";
import { getConceptBySlug } from "@/lib/content";
import {
  getConceptQuizCanonicalQuestionDescriptors,
  resolveConceptQuizDefinition,
} from "@/lib/quiz";
import {
  buildConceptTestHref,
  type ConceptTestCatalogEntry,
} from "@/lib/test-hub/catalog";
import {
  getPublishedPackTestDefinitionBySlug,
  type PackTestCatalogEntry,
} from "@/lib/test-hub/packs";
import {
  getPublishedTopicTestDefinitionBySlug,
  type TopicTestCatalogEntry,
} from "@/lib/test-hub/topic-tests";
import type { AssessmentSessionDescriptor, AssessmentSessionLocale } from "./model";

function stableSerialize(value: unknown) {
  return JSON.stringify(value);
}

function buildConceptDefinitionKey(concept: Pick<
  ConceptContent,
  "id" | "slug" | "quickTest" | "sections" | "simulation"
>) {
  const definition = resolveConceptQuizDefinition(concept);
  const descriptors = getConceptQuizCanonicalQuestionDescriptors(concept).map((descriptor) => {
    if ("template" in descriptor.versionSource) {
      return {
        canonicalQuestionId: descriptor.canonicalQuestionId,
        templateId: descriptor.versionSource.template.canonicalTemplateId,
        origin: descriptor.versionSource.template.origin,
        slotIndex: descriptor.versionSource.slotIndex,
        questionType: descriptor.versionSource.template.questionType,
      };
    }

    return {
      canonicalQuestionId: descriptor.canonicalQuestionId,
      type: descriptor.versionSource.type,
      prompt: descriptor.versionSource.prompt,
      choices: descriptor.versionSource.choices,
      correctChoiceId: descriptor.versionSource.correctChoiceId,
      explanation: descriptor.versionSource.explanation,
    };
  });

  return stableSerialize({
    version: 1,
    kind: "concept",
    conceptSlug: concept.slug,
    mode: definition.mode,
    questionCount: definition.questionCount,
    descriptors,
  });
}

function buildTopicDefinitionKey(topicSlug: string) {
  const definition = getPublishedTopicTestDefinitionBySlug(topicSlug);

  return stableSerialize({
    version: 1,
    kind: "topic",
    topicSlug,
    questionCount: definition.questionCount,
    plans: definition.plans.map((plan) =>
      plan.kind === "concept-question"
        ? {
            kind: plan.kind,
            conceptSlug: plan.conceptSlug,
            sourceCanonicalQuestionId: plan.sourceCanonicalQuestionId,
            sourceQuestionIndex: plan.sourceQuestionIndex,
          }
        : {
            kind: plan.kind,
            question: plan.question,
          },
    ),
  });
}

function buildPackDefinitionKey(packSlug: string) {
  const definition = getPublishedPackTestDefinitionBySlug(packSlug);

  return stableSerialize({
    version: 1,
    kind: "pack",
    packSlug,
    questionCount: definition.questionCount,
    plans: definition.plans.map((plan) =>
      plan.kind === "concept-question"
        ? {
            kind: plan.kind,
            topicSlug: plan.topicSlug,
            conceptSlug: plan.conceptSlug,
            sourceCanonicalQuestionId: plan.sourceCanonicalQuestionId,
            sourceQuestionIndex: plan.sourceQuestionIndex,
          }
        : {
            kind: plan.kind,
            question: plan.question,
          },
    ),
  });
}

export function buildConceptAssessmentSessionDescriptor(
  concept: Pick<ConceptContent, "id" | "slug" | "title" | "quickTest" | "sections" | "simulation">,
  locale: AssessmentSessionLocale,
): AssessmentSessionDescriptor {
  return {
    kind: "concept",
    assessmentId: concept.slug,
    locale,
    routeHref: buildConceptTestHref(concept.slug),
    definitionKey: buildConceptDefinitionKey(concept),
    title: concept.title,
  };
}

export function buildConceptEntryAssessmentSessionDescriptor(
  entry: ConceptTestCatalogEntry,
  locale: AssessmentSessionLocale,
) {
  return buildConceptAssessmentSessionDescriptor(getConceptBySlug(entry.conceptSlug), locale);
}

export function buildTopicAssessmentSessionDescriptor(
  entry: TopicTestCatalogEntry,
  locale: AssessmentSessionLocale,
): AssessmentSessionDescriptor {
  return {
    kind: "topic",
    assessmentId: entry.topicSlug,
    locale,
    routeHref: entry.testHref,
    definitionKey: buildTopicDefinitionKey(entry.topicSlug),
    title: entry.title,
  };
}

export function buildPackAssessmentSessionDescriptor(
  entry: PackTestCatalogEntry,
  locale: AssessmentSessionLocale,
): AssessmentSessionDescriptor {
  return {
    kind: "pack",
    assessmentId: entry.packSlug,
    locale,
    routeHref: entry.testHref,
    definitionKey: buildPackDefinitionKey(entry.packSlug),
    title: entry.title,
  };
}
