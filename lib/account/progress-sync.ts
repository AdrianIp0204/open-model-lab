import {
  getConceptSummaries,
  getPublishedConceptMetadata,
  getStarterTracks,
  type StarterTrackSummary,
} from "@/lib/content";
import {
  buildSavedContinueLearningState,
  type ContinueLearningStateConcept,
  type SavedContinueLearningState,
} from "@/lib/progress/continue-learning-state";
import type { ProgressSnapshot } from "@/lib/progress/model";

let cachedContinueLearningCatalog:
  | {
      concepts: ContinueLearningStateConcept[];
      starterTracks: StarterTrackSummary[];
    }
  | null = null;

function getContinueLearningCatalog() {
  if (cachedContinueLearningCatalog) {
    return cachedContinueLearningCatalog;
  }

  const metadataBySlug = new Map(
    getPublishedConceptMetadata().map((metadata) => [metadata.slug, metadata] as const),
  );
  const concepts = getConceptSummaries().map((concept) => ({
    ...concept,
    recommendedNext: metadataBySlug.get(concept.slug)?.recommendedNext,
  }));

  cachedContinueLearningCatalog = {
    concepts,
    starterTracks: getStarterTracks(),
  };

  return cachedContinueLearningCatalog;
}

export function deriveSavedContinueLearningState(
  snapshot: ProgressSnapshot,
  updatedAt: string,
) {
  return buildSavedContinueLearningState(snapshot, {
    ...getContinueLearningCatalog(),
    computedAt: updatedAt,
  });
}

export type { SavedContinueLearningState };
