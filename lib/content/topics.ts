import {
  getConceptLastModified,
  getConceptSummaries,
  getConceptTopics,
} from "./loaders";
import { getCatalogData } from "./content-registry";
import { getStarterTracks, type StarterTrackSummary } from "./starter-tracks";
import {
  topicLandingCatalogSchema,
  type ConceptAccent,
  type ConceptSummary,
  type TopicLandingMetadata,
} from "./schema";

export type TopicDiscoveryGroupSummary = {
  id: string;
  title: string;
  description?: string;
  concepts: ConceptSummary[];
  conceptCount: number;
  estimatedStudyMinutes: number;
};

export type TopicDiscoveryRelatedTopicSummary = {
  slug: string;
  title: string;
  description: string;
  path: string;
};

export type TopicDiscoverySummary = {
  subject: string;
  slug: string;
  title: string;
  description: string;
  introduction: string;
  accent: ConceptAccent;
  conceptCount: number;
  estimatedStudyMinutes: number;
  sourceTopics: string[];
  subtopics: string[];
  concepts: ConceptSummary[];
  featuredConcepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  recommendedStarterTracks: StarterTrackSummary[];
  relatedTopics: TopicDiscoveryRelatedTopicSummary[];
  groups: TopicDiscoveryGroupSummary[];
};

type TopicDiscoverySummaryDraft = Omit<TopicDiscoverySummary, "relatedTopics"> & {
  relatedTopicSlugs: string[];
};

type TopicDiscoveryCache = {
  all: TopicDiscoverySummary[];
  bySlug: Map<string, TopicDiscoverySummary>;
  bySourceTopic: Map<string, TopicDiscoverySummary>;
  bySourceTopicSlug: Map<string, TopicDiscoverySummary>;
  byConceptSlug: Map<string, TopicDiscoverySummary>;
};

let cachedTopicDiscovery: TopicDiscoveryCache | null = null;

const legacyTopicAliases = new Map<string, string>([
  ["resonance", "oscillations"],
  ["oscillations-and-waves", "waves"],
]);

export function getLegacyTopicDiscoverySlugs(): string[] {
  return [...legacyTopicAliases.keys()];
}

function slugifyTopic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readTopicCatalogFromDisk(): TopicLandingMetadata[] {
  return topicLandingCatalogSchema.parse(getCatalogData("topics")) as TopicLandingMetadata[];
}

function orderTopicCatalog(entries: TopicLandingMetadata[]) {
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

function buildEstimatedStudyMinutes(concepts: ConceptSummary[]) {
  return concepts.reduce((sum, concept) => sum + (concept.estimatedStudyMinutes ?? 0), 0);
}

function mergeStarterTracks(...trackGroups: StarterTrackSummary[][]) {
  const merged: StarterTrackSummary[] = [];
  const seenTrackSlugs = new Set<string>();

  for (const track of trackGroups.flat()) {
    if (seenTrackSlugs.has(track.slug)) {
      continue;
    }

    seenTrackSlugs.add(track.slug);
    merged.push(track);
  }

  return merged;
}

function buildTopicSummaries(): TopicDiscoverySummary[] {
  const conceptSummaries = getConceptSummaries();
  const conceptSummariesBySlug = new Map(
    conceptSummaries.map((concept) => [concept.slug, concept]),
  );
  const starterTracks = getStarterTracks();
  const starterTrackBySlug = new Map(starterTracks.map((track) => [track.slug, track]));
  const canonicalTopics = new Set(getConceptTopics());
  const topicEntries = orderTopicCatalog(readTopicCatalogFromDisk());
  const knownTopicSlugs = new Set(topicEntries.map((entry) => entry.slug));
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const sourceTopicOwners = new Map<string, string>();

  const drafts = topicEntries.map((entry): TopicDiscoverySummaryDraft => {
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate topic landing id found: ${entry.id}`);
    }

    if (seenSlugs.has(entry.slug)) {
      throw new Error(`Duplicate topic landing slug found: ${entry.slug}`);
    }

    seenIds.add(entry.id);
    seenSlugs.add(entry.slug);

    const seenTopicLabels = new Set<string>();
    for (const sourceTopic of entry.conceptTopics) {
      if (seenTopicLabels.has(sourceTopic)) {
        throw new Error(`Topic landing "${entry.slug}" contains duplicate conceptTopics "${sourceTopic}".`);
      }

      seenTopicLabels.add(sourceTopic);

      if (!canonicalTopics.has(sourceTopic)) {
        throw new Error(
          `Topic landing "${entry.slug}" references unknown concept topic "${sourceTopic}".`,
        );
      }

      const existingOwner = sourceTopicOwners.get(sourceTopic);

      if (existingOwner && existingOwner !== entry.slug) {
        throw new Error(
          `Concept topic "${sourceTopic}" is assigned to both "${existingOwner}" and "${entry.slug}".`,
        );
      }

      sourceTopicOwners.set(sourceTopic, entry.slug);
    }

    const seenRelatedTopicSlugs = new Set<string>();
    for (const relatedTopicSlug of entry.relatedTopicSlugs ?? []) {
      if (seenRelatedTopicSlugs.has(relatedTopicSlug)) {
        throw new Error(
          `Topic landing "${entry.slug}" contains duplicate relatedTopicSlugs "${relatedTopicSlug}".`,
        );
      }

      if (relatedTopicSlug === entry.slug) {
        throw new Error(`Topic landing "${entry.slug}" cannot relate to itself.`);
      }

      if (!knownTopicSlugs.has(relatedTopicSlug)) {
        throw new Error(
          `Topic landing "${entry.slug}" references unknown related topic "${relatedTopicSlug}".`,
        );
      }

      seenRelatedTopicSlugs.add(relatedTopicSlug);
    }

    const seenRecommendedTrackSlugs = new Set<string>();
    const recommendedStarterTracks = (entry.recommendedStarterTrackSlugs ?? []).map((trackSlug) => {
      if (seenRecommendedTrackSlugs.has(trackSlug)) {
        throw new Error(
          `Topic landing "${entry.slug}" contains duplicate recommendedStarterTrackSlugs "${trackSlug}".`,
        );
      }

      const track = starterTrackBySlug.get(trackSlug);

      if (!track) {
        throw new Error(
          `Topic landing "${entry.slug}" references unknown starter track "${trackSlug}".`,
        );
      }

      seenRecommendedTrackSlugs.add(trackSlug);
      return track;
    });

    const topicConcepts = conceptSummaries.filter((concept) =>
      entry.conceptTopics.includes(concept.topic),
    );

    if (!topicConcepts.length) {
      throw new Error(`Topic landing "${entry.slug}" does not resolve any published concepts.`);
    }

    const topicSubjects = new Set(topicConcepts.map((concept) => concept.subject));

    if (topicSubjects.size !== 1 || !topicSubjects.has(entry.subject)) {
      throw new Error(
        `Topic landing "${entry.slug}" subject "${entry.subject}" does not match the resolved concept subjects: ${Array.from(topicSubjects).join(", ")}.`,
      );
    }

    const topicConceptSlugs = new Set(topicConcepts.map((concept) => concept.slug));
    const featuredConceptSlugs = new Set<string>();

    for (const featuredSlug of entry.featuredConceptSlugs) {
      if (featuredConceptSlugs.has(featuredSlug)) {
        throw new Error(
          `Topic landing "${entry.slug}" contains duplicate featuredConceptSlugs "${featuredSlug}".`,
        );
      }

      if (!topicConceptSlugs.has(featuredSlug)) {
        throw new Error(
          `Topic landing "${entry.slug}" features concept "${featuredSlug}" outside its source topics.`,
        );
      }

      featuredConceptSlugs.add(featuredSlug);
    }

    const seenGroupIds = new Set<string>();
    const seenGroupedConceptSlugs = new Set<string>();
    const groups = entry.conceptGroups.map((group) => {
      if (seenGroupIds.has(group.id)) {
        throw new Error(`Topic landing "${entry.slug}" contains duplicate group id "${group.id}".`);
      }

      seenGroupIds.add(group.id);

      const concepts = group.conceptSlugs.map((conceptSlug) => {
        if (seenGroupedConceptSlugs.has(conceptSlug)) {
          throw new Error(
            `Topic landing "${entry.slug}" assigns concept "${conceptSlug}" to multiple groups.`,
          );
        }

        if (!topicConceptSlugs.has(conceptSlug)) {
          throw new Error(
            `Topic landing "${entry.slug}" group "${group.id}" references concept "${conceptSlug}" outside its source topics.`,
          );
        }

        const concept = conceptSummariesBySlug.get(conceptSlug);

        if (!concept) {
          throw new Error(
            `Topic landing "${entry.slug}" group "${group.id}" references missing concept "${conceptSlug}".`,
          );
        }

        seenGroupedConceptSlugs.add(conceptSlug);
        return concept;
      });

      return {
        id: group.id,
        title: group.title,
        description: group.description,
        concepts,
        conceptCount: concepts.length,
        estimatedStudyMinutes: buildEstimatedStudyMinutes(concepts),
      };
    });

    const missingGroupedConcepts = topicConcepts
      .map((concept) => concept.slug)
      .filter((conceptSlug) => !seenGroupedConceptSlugs.has(conceptSlug));

    if (missingGroupedConcepts.length) {
      throw new Error(
        `Topic landing "${entry.slug}" is missing grouped concepts: ${missingGroupedConcepts.join(", ")}.`,
      );
    }

    const concepts = groups.flatMap((group) => group.concepts);
    const conceptSlugSet = new Set(concepts.map((concept) => concept.slug));
    const sharedStarterTracks = starterTracks
      .map((track, index) => ({
        track,
        index,
        sharedConceptCount: track.concepts.filter((concept) => conceptSlugSet.has(concept.slug))
          .length,
      }))
      .filter(
        (entry) =>
          entry.sharedConceptCount >= 2 ||
          (entry.track.concepts.length === 1 && entry.sharedConceptCount === 1),
      )
      .sort((left, right) => {
        if (left.sharedConceptCount !== right.sharedConceptCount) {
          return right.sharedConceptCount - left.sharedConceptCount;
        }

        return left.index - right.index;
      })
      .map(({ track }) => track);
    const topicStarterTracks = mergeStarterTracks(
      recommendedStarterTracks,
      sharedStarterTracks,
    );

    const featuredConcepts = entry.featuredConceptSlugs.map((conceptSlug) => {
      const concept = conceptSummariesBySlug.get(conceptSlug);

      if (!concept) {
        throw new Error(
          `Topic landing "${entry.slug}" references missing featured concept "${conceptSlug}".`,
        );
      }

      return concept;
    });

    return {
      subject: entry.subject,
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      introduction: entry.introduction,
      accent: featuredConcepts[0]?.accent ?? concepts[0]?.accent ?? "ink",
      conceptCount: concepts.length,
      estimatedStudyMinutes: buildEstimatedStudyMinutes(concepts),
      sourceTopics: entry.conceptTopics,
      subtopics: Array.from(
        new Set(
          concepts
            .map((concept) => concept.subtopic)
            .filter((subtopic): subtopic is string => Boolean(subtopic)),
        ),
      ),
      concepts,
      featuredConcepts,
      starterTracks: topicStarterTracks,
      recommendedStarterTracks,
      relatedTopicSlugs: entry.relatedTopicSlugs ?? [],
      groups,
    };
  });

  const draftsBySlug = new Map(drafts.map((topic) => [topic.slug, topic]));

  return drafts.map(({ relatedTopicSlugs, ...topic }) => ({
    ...topic,
    relatedTopics: relatedTopicSlugs.map((relatedTopicSlug) => {
      const relatedTopic = draftsBySlug.get(relatedTopicSlug);

      if (!relatedTopic) {
        throw new Error(
          `Topic landing "${topic.slug}" could not resolve related topic "${relatedTopicSlug}".`,
        );
      }

      return {
        slug: relatedTopic.slug,
        title: relatedTopic.title,
        description: relatedTopic.description,
        path: `/concepts/topics/${relatedTopic.slug}`,
      };
    }),
  }));
}

function buildTopicDiscoveryCache(): TopicDiscoveryCache {
  const all = buildTopicSummaries();
  const bySlug = new Map(all.map((topic) => [topic.slug, topic]));
  const bySourceTopic = new Map<string, TopicDiscoverySummary>();
  const bySourceTopicSlug = new Map<string, TopicDiscoverySummary>();
  const byConceptSlug = new Map<string, TopicDiscoverySummary>();

  for (const topic of all) {
    for (const sourceTopic of topic.sourceTopics) {
      bySourceTopic.set(sourceTopic, topic);
      bySourceTopicSlug.set(slugifyTopic(sourceTopic), topic);
    }

    for (const concept of topic.concepts) {
      byConceptSlug.set(concept.slug, topic);
    }
  }

  return {
    all,
    bySlug,
    bySourceTopic,
    bySourceTopicSlug,
    byConceptSlug,
  };
}

function getCachedTopicDiscovery() {
  if (!cachedTopicDiscovery) {
    cachedTopicDiscovery = buildTopicDiscoveryCache();
  }

  return cachedTopicDiscovery;
}

function resolveTopicByInput(input: string) {
  const normalized = slugifyTopic(input);
  const cache = getCachedTopicDiscovery();
  const aliased = legacyTopicAliases.get(normalized);

  if (aliased) {
    return cache.bySlug.get(aliased) ?? null;
  }

  return (
    cache.bySlug.get(normalized) ??
    cache.bySourceTopic.get(input) ??
    cache.bySourceTopicSlug.get(normalized) ??
    null
  );
}

export function getTopicSlug(topic: string): string {
  return resolveTopicByInput(topic)?.slug ?? slugifyTopic(topic);
}

export function getTopicTitle(topic: string): string {
  return resolveTopicByInput(topic)?.title ?? topic;
}

export function getTopicPath(topic: string): string {
  return `/concepts/topics/${getTopicSlug(topic)}`;
}

export function getTopicDiscoverySummaries(): TopicDiscoverySummary[] {
  return getCachedTopicDiscovery().all;
}

export function getTopicDiscoverySlugs(): string[] {
  return getTopicDiscoverySummaries().map((topic) => topic.slug);
}

export function getTopicDiscoverySummaryBySlug(slug: string): TopicDiscoverySummary {
  const normalized = legacyTopicAliases.get(slugifyTopic(slug)) ?? slug;
  const topic = getCachedTopicDiscovery().bySlug.get(normalized);

  if (!topic) {
    throw new Error(`Unknown topic slug: ${slug}`);
  }

  return topic;
}

export function getTopicDiscoverySummaryForConceptSlug(conceptSlug: string): TopicDiscoverySummary {
  const topic = getCachedTopicDiscovery().byConceptSlug.get(conceptSlug);

  if (!topic) {
    throw new Error(`Unknown topic concept slug: ${conceptSlug}`);
  }

  return topic;
}

export function getTopicLastModified(slug: string): Date {
  const topic = getTopicDiscoverySummaryBySlug(slug);
  const lastModifiedTime = Math.max(
    ...topic.concepts.map((concept) => getConceptLastModified(concept.slug).getTime()),
  );

  return new Date(lastModifiedTime);
}
