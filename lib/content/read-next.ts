import {
  getConceptMetadataBySlug,
  getPublishedConceptMetadata,
} from "./loaders";
import type { ConceptMetadata, ConceptSlug } from "./schema";

export type ReadNextReasonKind =
  | "curated"
  | "builds-on-this"
  | "next-in-topic"
  | "useful-comparison"
  | "try-this-next";

export type ReadNextRecommendation = {
  slug: ConceptSlug;
  title: string;
  summary: string;
  topic: string;
  difficulty: string;
  reasonLabel: string;
  reasonKind: ReadNextReasonKind;
};

function getDifficultyRank(difficulty: string): number {
  const normalized = difficulty.trim().toLowerCase();

  if (normalized === "intro") {
    return 0;
  }

  if (normalized === "intermediate") {
    return 1;
  }

  if (normalized === "advanced") {
    return 2;
  }

  return 99;
}

function getSequenceDistance(current: ConceptMetadata, candidate: ConceptMetadata): number {
  if (current.sequence === undefined || candidate.sequence === undefined) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (candidate.sequence > current.sequence) {
    return candidate.sequence - current.sequence;
  }

  return 10_000 + Math.abs(candidate.sequence - current.sequence);
}

function getTagOverlap(current: ConceptMetadata, candidate: ConceptMetadata): number {
  const currentTags = new Set(current.tags ?? []);
  let overlap = 0;

  for (const tag of candidate.tags ?? []) {
    if (currentTags.has(tag)) {
      overlap += 1;
    }
  }

  return overlap;
}

function buildRecommendation(
  candidate: ConceptMetadata,
  reasonLabel: string,
  reasonKind: ReadNextReasonKind,
): ReadNextRecommendation {
  return {
    slug: candidate.slug,
    title: candidate.title,
    summary: candidate.summary,
    topic: candidate.topic,
    difficulty: candidate.difficulty,
    reasonLabel,
    reasonKind,
  };
}

export function resolveReadNextFromRegistry(
  registry: ConceptMetadata[],
  currentSlug: string,
  limit = 3,
): ReadNextRecommendation[] {
  const published = registry.filter((entry) => entry.published);
  const registryMap = new Map(published.map((entry) => [entry.slug, entry]));
  const current = registryMap.get(currentSlug);

  if (!current) {
    throw new Error(`Unknown concept slug: ${currentSlug}`);
  }

  const currentConcept = current;

  const recommendations: ReadNextRecommendation[] = [];
  const seen = new Set<string>();

  function addCandidate(
    slug: string,
    reasonLabel: string,
    reasonKind: ReadNextReasonKind,
  ) {
    if (recommendations.length >= limit) {
      return;
    }

    if (slug === currentConcept.slug || seen.has(slug)) {
      return;
    }

    const candidate = registryMap.get(slug);

    if (!candidate) {
      return;
    }

    seen.add(slug);
    recommendations.push(buildRecommendation(candidate, reasonLabel, reasonKind));
  }

  for (const override of currentConcept.recommendedNext ?? []) {
    addCandidate(override.slug, override.reasonLabel ?? "Try this next", "curated");
  }

  const sameTopicCandidates = published
    .filter(
      (candidate) =>
        candidate.slug !== currentConcept.slug && candidate.topic === currentConcept.topic,
    )
    .sort((left, right) => {
      const leftBuildsOn = left.prerequisites?.includes(currentConcept.slug) ? 0 : 1;
      const rightBuildsOn = right.prerequisites?.includes(currentConcept.slug) ? 0 : 1;

      if (leftBuildsOn !== rightBuildsOn) {
        return leftBuildsOn - rightBuildsOn;
      }

      const sequenceDelta =
        getSequenceDistance(currentConcept, left) - getSequenceDistance(currentConcept, right);
      if (sequenceDelta !== 0) {
        return sequenceDelta;
      }

      const difficultyDelta =
        Math.abs(getDifficultyRank(left.difficulty) - getDifficultyRank(currentConcept.difficulty)) -
        Math.abs(getDifficultyRank(right.difficulty) - getDifficultyRank(currentConcept.difficulty));

      if (difficultyDelta !== 0) {
        return difficultyDelta;
      }

      return left.title.localeCompare(right.title);
    });

  for (const candidate of sameTopicCandidates) {
    const reasonKind = candidate.prerequisites?.includes(currentConcept.slug)
      ? "builds-on-this"
      : "next-in-topic";
    const reasonLabel =
      reasonKind === "builds-on-this"
        ? "Builds on this"
        : `Next in ${candidate.subtopic ?? candidate.topic}`;

    addCandidate(candidate.slug, reasonLabel, reasonKind);
  }

  const buildsOnCandidates = published
    .filter(
      (candidate) =>
        candidate.slug !== currentConcept.slug &&
        candidate.prerequisites?.includes(currentConcept.slug),
    )
    .sort((left, right) => {
      const sameTopicDelta =
        Number(left.topic !== currentConcept.topic) - Number(right.topic !== currentConcept.topic);
      if (sameTopicDelta !== 0) {
        return sameTopicDelta;
      }

      const sequenceDelta =
        getSequenceDistance(currentConcept, left) - getSequenceDistance(currentConcept, right);
      if (sequenceDelta !== 0) {
        return sequenceDelta;
      }

      return left.title.localeCompare(right.title);
    });

  for (const candidate of buildsOnCandidates) {
    addCandidate(candidate.slug, "Builds on this", "builds-on-this");
  }

  const relatedCandidates = [
    ...(currentConcept.related ?? [])
      .map((slug) => registryMap.get(slug))
      .filter((candidate): candidate is ConceptMetadata => Boolean(candidate)),
    ...published
      .filter(
        (candidate) =>
          candidate.slug !== currentConcept.slug &&
          candidate.topic !== currentConcept.topic &&
          getTagOverlap(currentConcept, candidate) > 0,
      )
      .sort(
        (left, right) =>
          getTagOverlap(currentConcept, right) - getTagOverlap(currentConcept, left),
      ),
  ];

  for (const candidate of relatedCandidates) {
    addCandidate(candidate.slug, "Useful comparison", "useful-comparison");
  }

  const fallbackCandidates = published
    .filter((candidate) => candidate.slug !== currentConcept.slug)
    .sort((left, right) => {
      const sequenceDelta =
        getSequenceDistance(currentConcept, left) - getSequenceDistance(currentConcept, right);
      if (sequenceDelta !== 0) {
        return sequenceDelta;
      }

      const difficultyDelta =
        Math.abs(getDifficultyRank(left.difficulty) - getDifficultyRank(currentConcept.difficulty)) -
        Math.abs(getDifficultyRank(right.difficulty) - getDifficultyRank(currentConcept.difficulty));

      if (difficultyDelta !== 0) {
        return difficultyDelta;
      }

      return left.title.localeCompare(right.title);
    });

  for (const candidate of fallbackCandidates) {
    const reasonLabel =
      candidate.topic === currentConcept.topic
        ? `Next in ${candidate.subtopic ?? candidate.topic}`
        : "Try this next";
    const reasonKind =
      candidate.topic === currentConcept.topic ? "next-in-topic" : "try-this-next";

    addCandidate(candidate.slug, reasonLabel, reasonKind);
  }

  return recommendations.slice(0, limit);
}

export function getReadNextRecommendations(
  currentSlug: string,
  limit = 3,
): ReadNextRecommendation[] {
  getConceptMetadataBySlug(currentSlug);
  return resolveReadNextFromRegistry(getPublishedConceptMetadata(), currentSlug, limit);
}
