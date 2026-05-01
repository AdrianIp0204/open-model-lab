import { getChallengeCatalogEntries, type ChallengeCatalogEntry } from "./challenges";
import { getCatalogData, getCatalogFilePath, getCatalogLastModified } from "./content-registry";
import {
  resolveLearningPathEntryDiagnostic,
  type ResolvedLearningPathEntryDiagnostic,
} from "./entry-diagnostics";
import { getConceptBySlug, getConceptSummaries } from "./loaders";
import { getStarterTrackBySlug, type StarterTrackSummary } from "./starter-tracks";
import {
  getTopicDiscoverySummaryForConceptSlug,
  type TopicDiscoverySummary,
} from "./topics";
import {
  guidedCollectionCatalogSchema,
  type ConceptSlug,
  type ConceptSummary,
  type GuidedCollectionMetadata,
  type GuidedCollectionStepMetadata,
  type GuidedCollectionSurfaceCompletionMode,
  type GuidedCollectionSurfaceKind,
} from "./schema";

type GuidedCollectionTopicSummary = Pick<TopicDiscoverySummary, "slug" | "title"> & {
  path: string;
};

type GuidedCollectionTrackSummary = Pick<
  StarterTrackSummary,
  "slug" | "title" | "accent" | "estimatedStudyMinutes"
> & {
  path: string;
};

type GuidedCollectionResolvedStepBase = {
  id: string;
  title: string;
  summary: string;
  purpose: string;
  estimatedMinutes: number | null;
  href: string;
  relatedConceptSlugs: ConceptSlug[];
  relatedConcepts: ConceptSummary[];
};

export type GuidedCollectionConceptStepSummary = GuidedCollectionResolvedStepBase & {
  kind: "concept";
  concept: ConceptSummary;
};

export type GuidedCollectionTrackStepSummary = GuidedCollectionResolvedStepBase & {
  kind: "track";
  track: StarterTrackSummary;
};

export type GuidedCollectionChallengeStepSummary = GuidedCollectionResolvedStepBase & {
  kind: "challenge";
  concept: ConceptSummary;
  challengeId: string;
  challengeTitle: ChallengeCatalogEntry["title"];
  prompt: ChallengeCatalogEntry["prompt"];
  depth: ChallengeCatalogEntry["depth"];
  checkCount: ChallengeCatalogEntry["checkCount"];
  hintCount: ChallengeCatalogEntry["hintCount"];
  cueLabels: ChallengeCatalogEntry["cueLabels"];
  usesCompare: ChallengeCatalogEntry["usesCompare"];
  usesInspect: ChallengeCatalogEntry["usesInspect"];
};

export type GuidedCollectionSurfaceStepSummary = GuidedCollectionResolvedStepBase & {
  kind: "surface";
  surfaceKind: GuidedCollectionSurfaceKind;
  actionLabel: string;
  completionMode: GuidedCollectionSurfaceCompletionMode;
};

export type GuidedCollectionStepSummary =
  | GuidedCollectionConceptStepSummary
  | GuidedCollectionTrackStepSummary
  | GuidedCollectionChallengeStepSummary
  | GuidedCollectionSurfaceStepSummary;

export type GuidedCollectionEntryDiagnosticSummary = ResolvedLearningPathEntryDiagnostic & {
  skipToStep: GuidedCollectionStepSummary | null;
};

export type GuidedCollectionSummary = Omit<
  GuidedCollectionMetadata,
  "steps" | "entryDiagnostic"
> & {
  path: string;
  steps: GuidedCollectionStepSummary[];
  entryDiagnostic: GuidedCollectionEntryDiagnosticSummary | null;
  conceptSlugs: ConceptSlug[];
  concepts: ConceptSummary[];
  topics: GuidedCollectionTopicSummary[];
  relatedTracks: GuidedCollectionTrackSummary[];
  estimatedStudyMinutes: number;
  conceptCount: number;
  trackCount: number;
  challengeStepCount: number;
  surfaceStepCount: number;
};

let cachedGuidedCollections: GuidedCollectionSummary[] | null = null;
let cachedGuidedCollectionBySlug: Map<string, GuidedCollectionSummary> | null = null;

function readGuidedCollectionsFromDisk(): GuidedCollectionMetadata[] {
  return guidedCollectionCatalogSchema.parse(
    getCatalogData("guidedCollections"),
  ) as GuidedCollectionMetadata[];
}

function orderGuidedCollections(entries: GuidedCollectionMetadata[]) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftSequence = left.entry.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.entry.sequence ?? Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

function buildChallengeHref(conceptSlug: string, challengeId: string) {
  const search = new URLSearchParams({ challenge: challengeId }).toString();
  return `/concepts/${conceptSlug}?${search}#challenge-mode`;
}

function resolveChallengeEntry(step: Extract<GuidedCollectionStepMetadata, { kind: "challenge" }>) {
  const concept = getConceptBySlug(step.conceptSlug);
  const challengeEntry = getChallengeCatalogEntries(
    concept.challengeMode,
    concept.variableLinks,
  ).find((entry) => entry.id === step.challengeId);

  if (!challengeEntry) {
    throw new Error(
      `Guided collection challenge step "${step.id}" references missing challenge "${step.challengeId}" in concept "${step.conceptSlug}".`,
    );
  }

  return challengeEntry;
}

function getSurfaceCompletionMode(step: Extract<GuidedCollectionStepMetadata, { kind: "surface" }>) {
  if (step.completionMode) {
    return step.completionMode;
  }

  return step.surfaceKind === "challenge-hub" ? "all-complete" : "any-progress";
}

export function validateGuidedCollectionCatalog(
  entries: GuidedCollectionMetadata[],
): GuidedCollectionMetadata[] {
  const collectionIds = new Set<string>();
  const collectionSlugs = new Set<string>();

  for (const entry of entries) {
    if (collectionIds.has(entry.id)) {
      throw new Error(`Duplicate guided collection id found: ${entry.id}`);
    }

    if (collectionSlugs.has(entry.slug)) {
      throw new Error(`Duplicate guided collection slug found: ${entry.slug}`);
    }

    collectionIds.add(entry.id);
    collectionSlugs.add(entry.slug);
  }

  for (const entry of entries) {
    const stepIds = new Set<string>();
    const relatedConceptSlugs = new Set<string>();

    for (const step of entry.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(
          `Guided collection "${entry.slug}" cannot contain duplicate step id "${step.id}".`,
        );
      }

      stepIds.add(step.id);

      if (step.kind === "concept") {
        getConceptBySlug(step.conceptSlug);
        relatedConceptSlugs.add(step.conceptSlug);
        continue;
      }

      if (step.kind === "track") {
        const track = getStarterTrackBySlug(step.trackSlug);
        track.concepts.forEach((concept) => {
          relatedConceptSlugs.add(concept.slug);
        });
        continue;
      }

      if (step.kind === "challenge") {
        getConceptBySlug(step.conceptSlug);
        relatedConceptSlugs.add(step.conceptSlug);
        resolveChallengeEntry(step);
        continue;
      }

      const seenConceptSlugs = new Set<string>();

      for (const conceptSlug of step.relatedConceptSlugs) {
        if (seenConceptSlugs.has(conceptSlug)) {
          throw new Error(
            `Guided collection "${entry.slug}" surface step "${step.id}" cannot repeat related concept "${conceptSlug}".`,
          );
        }

        seenConceptSlugs.add(conceptSlug);
        getConceptBySlug(conceptSlug);
        relatedConceptSlugs.add(conceptSlug);
      }

      if (step.surfaceKind === "topic" && !step.href.startsWith("/concepts/topics/")) {
        throw new Error(
          `Guided collection "${entry.slug}" topic surface step "${step.id}" must point to a topic route.`,
        );
      }

      if (step.surfaceKind === "challenge-hub" && !step.href.startsWith("/challenges")) {
        throw new Error(
          `Guided collection "${entry.slug}" challenge-hub step "${step.id}" must point to the challenge hub.`,
        );
      }

      if (step.surfaceKind === "reference" && !step.href.startsWith("/")) {
        throw new Error(
          `Guided collection "${entry.slug}" reference step "${step.id}" must use an internal path.`,
        );
      }
    }

    if (entry.entryDiagnostic) {
      if (entry.entryDiagnostic.skipToConcept) {
        throw new Error(
          `Guided collection "${entry.slug}" entry diagnostic cannot use skipToConcept.`,
        );
      }

      if (
        entry.entryDiagnostic.skipToStepId &&
        !stepIds.has(entry.entryDiagnostic.skipToStepId)
      ) {
        throw new Error(
          `Guided collection "${entry.slug}" entry diagnostic skip target "${entry.entryDiagnostic.skipToStepId}" must be one of the collection steps.`,
        );
      }

      for (const probe of entry.entryDiagnostic.probes) {
        if (!relatedConceptSlugs.has(probe.conceptSlug)) {
          throw new Error(
            `Guided collection "${entry.slug}" entry diagnostic probe "${probe.id}" references concept "${probe.conceptSlug}" outside the collection.`,
          );
        }
      }

      resolveLearningPathEntryDiagnostic(
        entry.entryDiagnostic,
        `Guided collection "${entry.slug}"`,
      );
    }
  }

  return orderGuidedCollections(entries);
}

function loadGuidedCollections(): GuidedCollectionSummary[] {
  const collections = validateGuidedCollectionCatalog(readGuidedCollectionsFromDisk());
  const conceptsBySlug = new Map(getConceptSummaries().map((concept) => [concept.slug, concept]));

  return collections.map((collection) => {
    const conceptSlugSet = new Set<ConceptSlug>();
    const trackMap = new Map<string, GuidedCollectionTrackSummary>();
    let challengeStepCount = 0;
    let surfaceStepCount = 0;

    const steps = collection.steps.map((step) => {
      if (step.kind === "concept") {
        const concept = conceptsBySlug.get(step.conceptSlug);

        if (!concept) {
          throw new Error(
            `Guided collection "${collection.slug}" concept step "${step.id}" references missing published concept "${step.conceptSlug}".`,
          );
        }

        conceptSlugSet.add(concept.slug);
        return {
          kind: "concept",
          id: step.id,
          title: step.title,
          summary: step.summary,
          purpose: step.purpose,
          estimatedMinutes: step.estimatedMinutes ?? concept.estimatedStudyMinutes ?? null,
          href: `/concepts/${concept.slug}`,
          relatedConceptSlugs: [concept.slug],
          relatedConcepts: [concept],
          concept,
        } satisfies GuidedCollectionConceptStepSummary;
      }

      if (step.kind === "track") {
        const track = getStarterTrackBySlug(step.trackSlug);

        trackMap.set(track.slug, {
          slug: track.slug,
          title: track.title,
          accent: track.accent,
          estimatedStudyMinutes: track.estimatedStudyMinutes,
          path: `/tracks/${track.slug}`,
        });

        for (const concept of track.concepts) {
          conceptSlugSet.add(concept.slug);
        }

        return {
          kind: "track",
          id: step.id,
          title: step.title,
          summary: step.summary,
          purpose: step.purpose,
          estimatedMinutes: step.estimatedMinutes ?? track.estimatedStudyMinutes,
          href: `/tracks/${track.slug}`,
          relatedConceptSlugs: [...track.conceptSlugs],
          relatedConcepts: track.concepts,
          track,
        } satisfies GuidedCollectionTrackStepSummary;
      }

      if (step.kind === "challenge") {
        challengeStepCount += 1;
        const concept = conceptsBySlug.get(step.conceptSlug);
        const challengeEntry = resolveChallengeEntry(step);

        if (!concept) {
          throw new Error(
            `Guided collection "${collection.slug}" challenge step "${step.id}" references missing published concept "${step.conceptSlug}".`,
          );
        }

        conceptSlugSet.add(concept.slug);

        return {
          kind: "challenge",
          id: step.id,
          title: step.title,
          summary: step.summary,
          purpose: step.purpose,
          estimatedMinutes: step.estimatedMinutes ?? null,
          href: buildChallengeHref(concept.slug, step.challengeId),
          relatedConceptSlugs: [concept.slug],
          relatedConcepts: [concept],
          concept,
          challengeId: step.challengeId,
          challengeTitle: challengeEntry.title,
          prompt: challengeEntry.prompt,
          depth: challengeEntry.depth,
          checkCount: challengeEntry.checkCount,
          hintCount: challengeEntry.hintCount,
          cueLabels: challengeEntry.cueLabels,
          usesCompare: challengeEntry.usesCompare,
          usesInspect: challengeEntry.usesInspect,
        } satisfies GuidedCollectionChallengeStepSummary;
      }

      surfaceStepCount += 1;
      const relatedConcepts = step.relatedConceptSlugs.map((conceptSlug) => {
        const concept = conceptsBySlug.get(conceptSlug);

        if (!concept) {
          throw new Error(
            `Guided collection "${collection.slug}" surface step "${step.id}" references missing published concept "${conceptSlug}".`,
          );
        }

        conceptSlugSet.add(concept.slug);
        return concept;
      });

      return {
        kind: "surface",
        id: step.id,
        title: step.title,
        summary: step.summary,
        purpose: step.purpose,
        estimatedMinutes: step.estimatedMinutes ?? null,
        href: step.href,
        relatedConceptSlugs: step.relatedConceptSlugs as ConceptSlug[],
        relatedConcepts,
        surfaceKind: step.surfaceKind,
        actionLabel: step.actionLabel,
        completionMode: getSurfaceCompletionMode(step),
      } satisfies GuidedCollectionSurfaceStepSummary;
    });
    const stepsById = new Map(steps.map((step) => [step.id, step] as const));
    const entryDiagnostic = collection.entryDiagnostic
      ? (() => {
          const resolved = resolveLearningPathEntryDiagnostic(
            collection.entryDiagnostic,
            `Guided collection "${collection.slug}"`,
          );
          const skipToStep = collection.entryDiagnostic.skipToStepId
            ? stepsById.get(collection.entryDiagnostic.skipToStepId) ?? null
            : null;

          if (collection.entryDiagnostic.skipToStepId && !skipToStep) {
            throw new Error(
              `Guided collection "${collection.slug}" entry diagnostic skip target "${collection.entryDiagnostic.skipToStepId}" references a missing step.`,
            );
          }

          return {
            ...resolved,
            skipToStep,
          } satisfies GuidedCollectionEntryDiagnosticSummary;
        })()
      : null;

    const concepts = [...conceptSlugSet].map((conceptSlug) => {
      const concept = conceptsBySlug.get(conceptSlug);

      if (!concept) {
        throw new Error(
          `Guided collection "${collection.slug}" references missing published concept "${conceptSlug}".`,
        );
      }
      return concept;
    });

    const topics = Array.from(
      new Map(
        concepts.map((concept) => {
          const topic = getTopicDiscoverySummaryForConceptSlug(concept.slug);

          return [
            topic.slug,
            {
              slug: topic.slug,
              title: topic.title,
              path: `/concepts/topics/${topic.slug}`,
            } satisfies GuidedCollectionTopicSummary,
          ] as const;
        }),
      ).values(),
    );

    return {
      ...collection,
      path: `/guided/${collection.slug}`,
      steps,
      entryDiagnostic,
      conceptSlugs: concepts.map((concept) => concept.slug),
      concepts,
      topics,
      relatedTracks: Array.from(trackMap.values()),
      estimatedStudyMinutes: steps.reduce(
        (sum, step) => sum + (step.estimatedMinutes ?? 0),
        0,
      ),
      conceptCount: concepts.length,
      trackCount: trackMap.size,
      challengeStepCount,
      surfaceStepCount,
    } satisfies GuidedCollectionSummary;
  });
}

function buildGuidedCollectionCache() {
  if (!cachedGuidedCollections || !cachedGuidedCollectionBySlug) {
    cachedGuidedCollections = loadGuidedCollections();
    cachedGuidedCollectionBySlug = new Map(
      cachedGuidedCollections.map((collection) => [collection.slug, collection]),
    );
  }

  return {
    all: cachedGuidedCollections,
    bySlug: cachedGuidedCollectionBySlug,
  };
}

export function getGuidedCollections(): GuidedCollectionSummary[] {
  return buildGuidedCollectionCache().all;
}

export function getGuidedCollectionBySlug(slug: string): GuidedCollectionSummary {
  const collection = buildGuidedCollectionCache().bySlug.get(slug);

  if (!collection) {
    throw new Error(`Unknown guided collection slug: ${slug}`);
  }

  return collection;
}

export function getGuidedCollectionCatalogMetrics() {
  const collections = getGuidedCollections();
  const coveredConceptSlugs = new Set<string>();

  for (const collection of collections) {
    for (const conceptSlug of collection.conceptSlugs) {
      coveredConceptSlugs.add(conceptSlug);
    }
  }

  return {
    totalCollections: collections.length,
    totalSteps: collections.reduce((sum, collection) => sum + collection.steps.length, 0),
    totalCoveredConcepts: coveredConceptSlugs.size,
    totalEstimatedStudyMinutes: collections.reduce(
      (sum, collection) => sum + collection.estimatedStudyMinutes,
      0,
    ),
  };
}

export function getGuidedCollectionCatalogFilePath() {
  return getCatalogFilePath("guidedCollections");
}

export function getGuidedCollectionCatalogLastModified() {
  return getCatalogLastModified("guidedCollections");
}
