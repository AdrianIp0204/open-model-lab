import type {
  ConceptSummary,
  GuidedCollectionStepSummary,
  GuidedCollectionSummary,
} from "@/lib/content";

export const GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_STEP_COUNT = 12;
export const GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH = 96;
export const GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH = 260;
export const MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION = 12;

type GuidedCollectionConceptBundleBase = {
  collectionSlug: string;
  title: string;
  summary: string;
  stepIds: string[];
  launchStepId?: string | null;
};

export type GuidedCollectionConceptBundleDraft = GuidedCollectionConceptBundleBase;

export type GuidedCollectionConceptBundleRecord = GuidedCollectionConceptBundleBase & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedGuidedCollectionConceptBundle = {
  id: string;
  collectionSlug: string;
  collectionTitle: string;
  collectionPath: string;
  title: string;
  summary: string;
  stepIds: string[];
  steps: GuidedCollectionStepSummary[];
  launchStep: GuidedCollectionStepSummary;
  conceptSlugs: GuidedCollectionSummary["conceptSlugs"];
  concepts: ConceptSummary[];
  topics: GuidedCollectionSummary["topics"];
  relatedTracks: GuidedCollectionSummary["relatedTracks"];
  estimatedStudyMinutes: number;
  conceptCount: number;
  trackCount: number;
  challengeStepCount: number;
  surfaceStepCount: number;
};

function normalizeText(value: string, maxLength: number, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return normalized || fallback;
}

function normalizeBundleStepIds(
  collection: GuidedCollectionSummary,
  stepIds: string[],
) {
  const availableStepIds = new Set(collection.steps.map((step) => step.id));
  const nextStepIds: string[] = [];
  const seen = new Set<string>();

  for (const stepId of stepIds) {
    if (
      typeof stepId !== "string" ||
      seen.has(stepId) ||
      !availableStepIds.has(stepId)
    ) {
      continue;
    }

    seen.add(stepId);
    nextStepIds.push(stepId);

    if (nextStepIds.length >= GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_STEP_COUNT) {
      break;
    }
  }

  return nextStepIds;
}

function collectUniqueConcepts(steps: GuidedCollectionStepSummary[]) {
  const conceptsBySlug = new Map<string, ConceptSummary>();

  for (const step of steps) {
    for (const concept of step.relatedConcepts) {
      conceptsBySlug.set(concept.slug, concept);
    }
  }

  return Array.from(conceptsBySlug.values());
}

export function getDefaultGuidedCollectionConceptBundleDraft(
  collection: GuidedCollectionSummary,
): GuidedCollectionConceptBundleDraft {
  const stepIds = collection.steps
    .slice(0, GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_STEP_COUNT)
    .map((step) => step.id);

  return {
    collectionSlug: collection.slug,
    title: collection.title,
    summary: collection.summary,
    stepIds,
    launchStepId: stepIds[0] ?? null,
  };
}

export function resolveGuidedCollectionConceptBundle(
  collection: GuidedCollectionSummary,
  input: Pick<
    ResolvedGuidedCollectionConceptBundle,
    "id" | "title" | "summary" | "stepIds"
  > & {
    launchStepId?: string | null;
  },
): ResolvedGuidedCollectionConceptBundle | null {
  const stepIds = normalizeBundleStepIds(collection, input.stepIds);

  if (!stepIds.length) {
    return null;
  }

  const stepsById = new Map(collection.steps.map((step) => [step.id, step] as const));
  const steps = stepIds
    .map((stepId) => stepsById.get(stepId))
    .filter((step): step is GuidedCollectionStepSummary => Boolean(step));

  if (!steps.length) {
    return null;
  }

  const title = normalizeText(
    input.title,
    GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH,
    collection.title,
  );
  const summary = normalizeText(
    input.summary,
    GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH,
    collection.summary,
  );
  const launchStep =
    (input.launchStepId ? stepsById.get(input.launchStepId) : null) ??
    steps[0] ??
    null;

  if (!launchStep || !stepIds.includes(launchStep.id)) {
    return null;
  }

  const concepts = collectUniqueConcepts(steps);
  const relatedTracks = Array.from(
    new Map(
      steps
        .filter((step) => step.kind === "track")
        .map((step) => [step.track.slug, { ...step.track, path: step.href }] as const),
    ).values(),
  );

  return {
    id: input.id,
    collectionSlug: collection.slug,
    collectionTitle: collection.title,
    collectionPath: collection.path,
    title,
    summary,
    stepIds,
    steps,
    launchStep,
    conceptSlugs: concepts.map((concept) => concept.slug),
    concepts,
    topics: collection.topics,
    relatedTracks,
    estimatedStudyMinutes: steps.reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0),
    conceptCount: concepts.length,
    trackCount: relatedTracks.length,
    challengeStepCount: steps.filter((step) => step.kind === "challenge").length,
    surfaceStepCount: steps.filter((step) => step.kind === "surface").length,
  };
}
