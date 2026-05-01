import { getChallengeCatalogEntries, type ChallengeCatalogEntry } from "./challenges";
import { getCatalogData, getCatalogFilePath, getCatalogLastModified } from "./content-registry";
import {
  resolveLearningPathEntryDiagnostic,
  type ResolvedLearningPathEntryDiagnostic,
} from "./entry-diagnostics";
import {
  getConceptBySlug,
  getConceptMetadataBySlug,
  getConceptSummaries,
} from "./loaders";
import {
  starterTrackCatalogSchema,
  type ConceptSlug,
  type ConceptSummary,
  type StarterTrackCheckpointMetadata,
  type StarterTrackMetadata,
} from "./schema";

export type StarterTrackCheckpointSummary = Omit<
  StarterTrackCheckpointMetadata,
  "conceptSlugs" | "afterConcept" | "challenge"
> & {
  conceptSlugs: ConceptSlug[];
  concepts: ConceptSummary[];
  afterConcept: ConceptSummary;
  stepIndex: number;
  challenge: Pick<StarterTrackCheckpointMetadata["challenge"], "challengeId"> & {
    concept: ConceptSummary;
    title: ChallengeCatalogEntry["title"];
    prompt: ChallengeCatalogEntry["prompt"];
    depth: ChallengeCatalogEntry["depth"];
    checkCount: ChallengeCatalogEntry["checkCount"];
    hintCount: ChallengeCatalogEntry["hintCount"];
    cueLabels: ChallengeCatalogEntry["cueLabels"];
    usesCompare: ChallengeCatalogEntry["usesCompare"];
    usesInspect: ChallengeCatalogEntry["usesInspect"];
  };
};

export type StarterTrackEntryDiagnosticSummary = ResolvedLearningPathEntryDiagnostic & {
  skipToConcept: ConceptSummary | null;
};

export type StarterTrackSummary = Omit<
  StarterTrackMetadata,
  "conceptSlugs" | "checkpoints" | "entryDiagnostic"
> & {
  conceptSlugs: ConceptSlug[];
  concepts: ConceptSummary[];
  checkpoints: StarterTrackCheckpointSummary[];
  entryDiagnostic: StarterTrackEntryDiagnosticSummary | null;
  estimatedStudyMinutes: number;
};

export type StarterTrackConceptMembership = {
  track: StarterTrackSummary;
  stepIndex: number;
  totalSteps: number;
  previousConcept: ConceptSummary | null;
  currentConcept: ConceptSummary;
  nextConcept: ConceptSummary | null;
};

let cachedStarterTracks: StarterTrackSummary[] | null = null;
let cachedStarterTrackBySlug: Map<string, StarterTrackSummary> | null = null;

function orderStarterTracks(entries: StarterTrackMetadata[]): StarterTrackMetadata[] {
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

function readStarterTracksFromDisk(): StarterTrackMetadata[] {
  return starterTrackCatalogSchema.parse(
    getCatalogData("starterTracks"),
  ) as StarterTrackMetadata[];
}

function orderStarterTrackCheckpoints(
  checkpoints: StarterTrackCheckpointMetadata[],
  stepIndexBySlug: Map<string, number>,
) {
  return checkpoints
    .map((checkpoint, index) => ({ checkpoint, index }))
    .sort((left, right) => {
      const leftStepIndex = stepIndexBySlug.get(left.checkpoint.afterConcept) ?? Number.MAX_SAFE_INTEGER;
      const rightStepIndex =
        stepIndexBySlug.get(right.checkpoint.afterConcept) ?? Number.MAX_SAFE_INTEGER;

      if (leftStepIndex !== rightStepIndex) {
        return leftStepIndex - rightStepIndex;
      }

      return left.index - right.index;
    })
    .map(({ checkpoint }) => checkpoint);
}

function resolveChallengeEntryForCheckpoint(
  trackSlug: string,
  checkpoint: StarterTrackCheckpointMetadata,
) {
  const challengeConcept = getConceptBySlug(checkpoint.challenge.conceptSlug);
  const challengeEntry = getChallengeCatalogEntries(
    challengeConcept.challengeMode,
    challengeConcept.variableLinks,
  ).find((entry) => entry.id === checkpoint.challenge.challengeId);

  if (!challengeEntry) {
    throw new Error(
      `Starter track "${trackSlug}" checkpoint "${checkpoint.id}" references missing challenge "${checkpoint.challenge.challengeId}" in concept "${checkpoint.challenge.conceptSlug}".`,
    );
  }

  return challengeEntry;
}

export function validateStarterTrackCatalog(
  entries: StarterTrackMetadata[],
): StarterTrackMetadata[] {
  const trackIds = new Set<string>();
  const trackSlugs = new Set<string>();
  const heroTrackSlugs: string[] = [];

  for (const entry of entries) {
    if (trackIds.has(entry.id)) {
      throw new Error(`Duplicate starter track id found: ${entry.id}`);
    }

    if (trackSlugs.has(entry.slug)) {
      throw new Error(`Duplicate starter track slug found: ${entry.slug}`);
    }

    trackIds.add(entry.id);
    trackSlugs.add(entry.slug);

    if (entry.heroTrack) {
      heroTrackSlugs.push(entry.slug);
    }
  }

  if (heroTrackSlugs.length > 1) {
    throw new Error(
      `Only one starter track can set heroTrack. Found: ${heroTrackSlugs.join(", ")}.`,
    );
  }

  for (const entry of entries) {
    for (const fieldName of [
      "recommendedNextTrackSlugs",
      "prerequisiteTrackSlugs",
    ] as const) {
      const seenTrackSlugs = new Set<string>();

      for (const trackSlug of entry[fieldName] ?? []) {
        if (seenTrackSlugs.has(trackSlug)) {
          throw new Error(
            `Starter track "${entry.slug}" cannot contain duplicate ${fieldName} value "${trackSlug}".`,
          );
        }

        if (trackSlug === entry.slug) {
          throw new Error(
            `Starter track "${entry.slug}" cannot reference itself in ${fieldName}.`,
          );
        }

        if (!trackSlugs.has(trackSlug)) {
          throw new Error(
            `Starter track "${entry.slug}" references unknown starter track "${trackSlug}" in ${fieldName}.`,
          );
        }

        seenTrackSlugs.add(trackSlug);
      }
    }

    const stepSlugs = new Set<string>();
    const stepIndexBySlug = new Map<string, number>();
    const stepMetadata = entry.conceptSlugs.map((conceptSlug, index) => {
      if (stepSlugs.has(conceptSlug)) {
        throw new Error(
          `Starter track "${entry.slug}" cannot contain duplicate concept slug "${conceptSlug}".`,
        );
      }

      stepSlugs.add(conceptSlug);
      stepIndexBySlug.set(conceptSlug, index);

      return getConceptMetadataBySlug(conceptSlug);
    });

    for (const concept of stepMetadata) {
      const currentStepIndex = stepIndexBySlug.get(concept.slug);

      if (currentStepIndex === undefined) {
        continue;
      }

      for (const prerequisiteSlug of concept.prerequisites ?? []) {
        const prerequisiteIndex = stepIndexBySlug.get(prerequisiteSlug);

        if (prerequisiteIndex === undefined || prerequisiteIndex < currentStepIndex) {
          continue;
        }

        throw new Error(
          `Starter track "${entry.slug}" places "${concept.slug}" before prerequisite "${prerequisiteSlug}".`,
        );
      }
    }

    const checkpointIds = new Set<string>();
    const orderedCheckpoints = orderStarterTrackCheckpoints(entry.checkpoints ?? [], stepIndexBySlug);

    for (const checkpoint of orderedCheckpoints) {
      if (checkpointIds.has(checkpoint.id)) {
        throw new Error(
          `Starter track "${entry.slug}" cannot contain duplicate checkpoint id "${checkpoint.id}".`,
        );
      }

      checkpointIds.add(checkpoint.id);

      const afterConceptIndex = stepIndexBySlug.get(checkpoint.afterConcept);

      if (afterConceptIndex === undefined) {
        throw new Error(
          `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" references unknown afterConcept "${checkpoint.afterConcept}".`,
        );
      }

      const checkpointConceptSlugs = new Set<string>();

      for (const conceptSlug of checkpoint.conceptSlugs) {
        if (checkpointConceptSlugs.has(conceptSlug)) {
          throw new Error(
            `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" cannot contain duplicate concept slug "${conceptSlug}".`,
          );
        }

        checkpointConceptSlugs.add(conceptSlug);

        const conceptIndex = stepIndexBySlug.get(conceptSlug);

        if (conceptIndex === undefined) {
          throw new Error(
            `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" references concept "${conceptSlug}" outside the track.`,
          );
        }

        if (conceptIndex > afterConceptIndex) {
          throw new Error(
            `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" cannot reference future concept "${conceptSlug}" after "${checkpoint.afterConcept}".`,
          );
        }
      }

      const challengeConceptIndex = stepIndexBySlug.get(checkpoint.challenge.conceptSlug);

      if (challengeConceptIndex === undefined) {
        throw new Error(
          `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" references challenge concept "${checkpoint.challenge.conceptSlug}" outside the track.`,
        );
      }

      if (challengeConceptIndex > afterConceptIndex) {
        throw new Error(
          `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" cannot point to a challenge in future concept "${checkpoint.challenge.conceptSlug}".`,
        );
      }

      resolveChallengeEntryForCheckpoint(entry.slug, checkpoint);
    }

    if (entry.entryDiagnostic) {
      if (entry.entryDiagnostic.skipToStepId) {
        throw new Error(
          `Starter track "${entry.slug}" entry diagnostic cannot use skipToStepId.`,
        );
      }

      if (
        entry.entryDiagnostic.skipToConcept &&
        !stepIndexBySlug.has(entry.entryDiagnostic.skipToConcept)
      ) {
        throw new Error(
          `Starter track "${entry.slug}" entry diagnostic skip target "${entry.entryDiagnostic.skipToConcept}" must be one of the track concepts.`,
        );
      }

      for (const probe of entry.entryDiagnostic.probes) {
        if (!stepIndexBySlug.has(probe.conceptSlug)) {
          throw new Error(
            `Starter track "${entry.slug}" entry diagnostic probe "${probe.id}" references concept "${probe.conceptSlug}" outside the track.`,
          );
        }
      }

      resolveLearningPathEntryDiagnostic(
        entry.entryDiagnostic,
        `Starter track "${entry.slug}"`,
      );
    }
  }

  return orderStarterTracks(entries);
}

function loadStarterTracks(): StarterTrackSummary[] {
  const trackEntries = validateStarterTrackCatalog(readStarterTracksFromDisk());
  const conceptsBySlug = new Map(getConceptSummaries().map((concept) => [concept.slug, concept]));

  return trackEntries.map((entry) => {
    const stepIndexBySlug = new Map(entry.conceptSlugs.map((slug, index) => [slug, index]));
    const concepts = entry.conceptSlugs.map((slug) => {
      const concept = conceptsBySlug.get(slug);

      if (!concept) {
        throw new Error(
          `Starter track "${entry.slug}" references missing published concept "${slug}".`,
        );
      }

      return concept;
    });
    const checkpoints = orderStarterTrackCheckpoints(entry.checkpoints ?? [], stepIndexBySlug).map(
      (checkpoint) => {
        const challengeEntry = resolveChallengeEntryForCheckpoint(entry.slug, checkpoint);
        const afterConcept = conceptsBySlug.get(checkpoint.afterConcept);
        const challengeConcept = conceptsBySlug.get(checkpoint.challenge.conceptSlug);

        if (!afterConcept || !challengeConcept) {
          throw new Error(
            `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" references a missing published concept.`,
          );
        }

        return {
          ...checkpoint,
          conceptSlugs: checkpoint.conceptSlugs as ConceptSlug[],
          concepts: checkpoint.conceptSlugs.map((slug) => {
            const concept = conceptsBySlug.get(slug);

            if (!concept) {
              throw new Error(
                `Starter track "${entry.slug}" checkpoint "${checkpoint.id}" references missing published concept "${slug}".`,
              );
            }

            return concept;
          }),
          afterConcept,
          stepIndex: stepIndexBySlug.get(checkpoint.afterConcept) ?? 0,
          challenge: {
            challengeId: checkpoint.challenge.challengeId,
            concept: challengeConcept,
            title: challengeEntry.title,
            prompt: challengeEntry.prompt,
            depth: challengeEntry.depth,
            checkCount: challengeEntry.checkCount,
            hintCount: challengeEntry.hintCount,
            cueLabels: challengeEntry.cueLabels,
            usesCompare: challengeEntry.usesCompare,
            usesInspect: challengeEntry.usesInspect,
          },
        } satisfies StarterTrackCheckpointSummary;
      },
    );
    const entryDiagnostic = entry.entryDiagnostic
      ? (() => {
          const resolved = resolveLearningPathEntryDiagnostic(
            entry.entryDiagnostic,
            `Starter track "${entry.slug}"`,
          );
          const skipToConcept = entry.entryDiagnostic.skipToConcept
            ? conceptsBySlug.get(entry.entryDiagnostic.skipToConcept) ?? null
            : null;

          if (entry.entryDiagnostic.skipToConcept && !skipToConcept) {
            throw new Error(
              `Starter track "${entry.slug}" entry diagnostic skip target "${entry.entryDiagnostic.skipToConcept}" references a missing published concept.`,
            );
          }

          return {
            ...resolved,
            skipToConcept,
          } satisfies StarterTrackEntryDiagnosticSummary;
        })()
      : null;

    return {
      ...entry,
      conceptSlugs: entry.conceptSlugs as ConceptSlug[],
      concepts,
      checkpoints,
      entryDiagnostic,
      estimatedStudyMinutes: concepts.reduce(
        (sum, concept) => sum + (concept.estimatedStudyMinutes ?? 0),
        0,
      ),
    };
  });
}

function getCachedStarterTracks() {
  if (!cachedStarterTracks || !cachedStarterTrackBySlug) {
    cachedStarterTracks = loadStarterTracks();
    cachedStarterTrackBySlug = new Map(
      cachedStarterTracks.map((track) => [track.slug, track]),
    );
  }

  return {
    all: cachedStarterTracks,
    bySlug: cachedStarterTrackBySlug,
  };
}

export function getStarterTracks(): StarterTrackSummary[] {
  return getCachedStarterTracks().all;
}

export function getStarterTrackDiscoveryHighlights(limit = 4): StarterTrackSummary[] {
  const tracks = getStarterTracks();
  const highlights: StarterTrackSummary[] = [];
  const seenTrackSlugs = new Set<string>();
  const pendingHeroConceptSlugs = new Set(
    getConceptSummaries()
      .filter((concept) => concept.heroConcept)
      .map((concept) => concept.slug),
  );

  function addTrack(track: StarterTrackSummary | null) {
    if (!track || seenTrackSlugs.has(track.slug)) {
      return;
    }

    seenTrackSlugs.add(track.slug);
    highlights.push(track);

    for (const concept of track.concepts) {
      if (concept.heroConcept) {
        pendingHeroConceptSlugs.delete(concept.slug);
      }
    }
  }

  addTrack(tracks.find((track) => track.heroTrack) ?? null);

  for (const track of tracks) {
    if (track.discoveryHighlight) {
      addTrack(track);
    }
  }

  for (const track of tracks) {
    if (track.concepts.some((concept) => pendingHeroConceptSlugs.has(concept.slug))) {
      addTrack(track);
    }
  }

  for (const track of tracks) {
    if (highlights.length >= limit) {
      break;
    }

    addTrack(track);
  }

  return highlights.slice(0, limit);
}

export function getStarterTrackBySlug(slug: string): StarterTrackSummary {
  const track = getCachedStarterTracks().bySlug.get(slug);

  if (!track) {
    throw new Error(`Unknown starter track slug: ${slug}`);
  }

  return track;
}

export function getStarterTrackMembershipsForConcept(
  conceptSlug: string,
): StarterTrackConceptMembership[] {
  const memberships: StarterTrackConceptMembership[] = [];

  for (const track of getStarterTracks()) {
    const stepIndex = track.concepts.findIndex((concept) => concept.slug === conceptSlug);

    if (stepIndex < 0) {
      continue;
    }

    memberships.push({
      track,
      stepIndex,
      totalSteps: track.concepts.length,
      previousConcept: track.concepts[stepIndex - 1] ?? null,
      currentConcept: track.concepts[stepIndex],
      nextConcept: track.concepts[stepIndex + 1] ?? null,
    });
  }

  return memberships;
}

export function getStarterTrackCatalogMetrics() {
  const tracks = getStarterTracks();

  return {
    totalTracks: tracks.length,
    totalTrackSteps: tracks.reduce((sum, track) => sum + track.concepts.length, 0),
    totalTrackCheckpoints: tracks.reduce((sum, track) => sum + track.checkpoints.length, 0),
  };
}

export function getStarterTrackCatalogFilePath() {
  return getCatalogFilePath("starterTracks");
}

export function getStarterTrackCatalogLastModified() {
  return getCatalogLastModified("starterTracks");
}
