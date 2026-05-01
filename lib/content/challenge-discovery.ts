import { addLocalePrefix, type AppLocale } from "@/i18n/routing";
import { buildChallengeEntryHref } from "@/lib/share-links";
import { getChallengeCatalogEntries } from "./challenges";
import { getAllConcepts } from "./loaders";
import {
  getStarterTrackMembershipsForConcept,
  getStarterTracks,
} from "./starter-tracks";
import {
  getTopicDiscoverySummaries,
  getTopicDiscoverySummaryForConceptSlug,
} from "./topics";
import type {
  ConceptAccent,
  ConceptChallengeItem,
  ConceptSummary,
} from "./schema";

type ChallengeDiscoveryTrackMembership = {
  slug: string;
  title: string;
  path: string;
  stepIndex: number;
  totalSteps: number;
};

export type ChallengeDiscoveryConceptSummary = Pick<
  ConceptSummary,
  | "id"
  | "slug"
  | "title"
  | "shortTitle"
  | "summary"
  | "topic"
  | "subtopic"
  | "difficulty"
  | "sequence"
  | "estimatedStudyMinutes"
  | "heroConcept"
  | "accent"
  | "highlights"
> & {
  challengeCount: number;
  path: string;
  topicPath: string;
};

export type ChallengeDiscoveryTopicSummary = {
  slug: string;
  title: string;
  description: string;
  accent: ConceptAccent;
  path: string;
  challengeCount: number;
  conceptCount: number;
  starterTrackCount: number;
  estimatedStudyMinutes: number;
  sourceTopics: string[];
};

export type ChallengeDiscoveryTrackSummary = {
  slug: string;
  title: string;
  summary: string;
  accent: ConceptAccent;
  path: string;
  challengeCount: number;
  challengeConceptCount: number;
  totalSteps: number;
  estimatedStudyMinutes: number;
};

export type ChallengeDiscoveryTrackCtaTargets = {
  browserHref: string;
  firstChallengeHref: string | null;
  firstChallengeEntryId: string | null;
};

export type ChallengeDiscoveryEntry = {
  id: string;
  title: string;
  prompt: string;
  successMessage: string;
  style: ConceptChallengeItem["style"];
  depth: ReturnType<typeof getChallengeCatalogEntries>[number]["depth"];
  checkCount: number;
  hasSetup: boolean;
  hintCount: number;
  cueLabels: string[];
  requirementLabels: string[];
  targetLabels: string[];
  highlightVariableIds: string[];
  graphIds: string[];
  overlayIds: string[];
  targetMetrics: string[];
  targetParams: string[];
  usesCompare: boolean;
  compareTargets: Array<"a" | "b">;
  usesInspect: boolean;
  href: string;
  order: number;
  concept: ChallengeDiscoveryConceptSummary;
  topic: Pick<ChallengeDiscoveryTopicSummary, "slug" | "title" | "path" | "accent">;
  starterTracks: ChallengeDiscoveryTrackMembership[];
};

export type ChallengeDiscoveryIndex = {
  entries: ChallengeDiscoveryEntry[];
  topics: ChallengeDiscoveryTopicSummary[];
  tracks: ChallengeDiscoveryTrackSummary[];
  quickStartEntry: ChallengeDiscoveryEntry | null;
  totalChallenges: number;
  totalConcepts: number;
  totalTopics: number;
  totalTracks: number;
};

let cachedChallengeDiscoveryIndex: ChallengeDiscoveryIndex | null = null;

function compareConceptOrder(
  left: Pick<ConceptSummary, "sequence" | "title">,
  right: Pick<ConceptSummary, "sequence" | "title">,
) {
  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

export function buildChallengeTrackBrowserHref(trackSlug: string, locale?: AppLocale) {
  const search = new URLSearchParams({ track: trackSlug }).toString();
  const pathname = !locale || locale === "en"
    ? "/challenges"
    : addLocalePrefix("/challenges", locale);
  return `${pathname}?${search}#challenge-browser`;
}

export function resolveChallengeTrackCtaTargets(
  index: ChallengeDiscoveryIndex,
  trackSlug: string,
  locale?: AppLocale,
): ChallengeDiscoveryTrackCtaTargets | null {
  const track = index.tracks.find((item) => item.slug === trackSlug);

  if (!track) {
    return null;
  }

  const firstChallengeEntry =
    [...index.entries]
      .filter((entry) =>
        entry.starterTracks.some((membership) => membership.slug === trackSlug),
      )
      .sort((left, right) => {
        const leftMembership = left.starterTracks.find(
          (membership) => membership.slug === trackSlug,
        );
        const rightMembership = right.starterTracks.find(
          (membership) => membership.slug === trackSlug,
        );

        if (leftMembership && rightMembership && leftMembership.stepIndex !== rightMembership.stepIndex) {
          return leftMembership.stepIndex - rightMembership.stepIndex;
        }

        return left.order - right.order;
      })[0] ?? null;

  return {
    browserHref: buildChallengeTrackBrowserHref(trackSlug, locale),
    firstChallengeHref: firstChallengeEntry
      ? buildChallengeEntryHref(firstChallengeEntry.concept.slug, firstChallengeEntry.id, locale)
      : null,
    firstChallengeEntryId: firstChallengeEntry?.id ?? null,
  };
}

function buildChallengeDiscoveryIndex(): ChallengeDiscoveryIndex {
  const concepts = getAllConcepts()
    .filter((concept) => concept.published && concept.challengeMode?.items.length)
    .sort(compareConceptOrder);
  const challengeCountByConceptSlug = new Map<string, number>();
  const challengeCountByTopicSlug = new Map<string, number>();
  const challengeConceptCountByTrackSlug = new Map<string, number>();
  const challengeCountByTrackSlug = new Map<string, number>();
  const entries: ChallengeDiscoveryEntry[] = [];

  concepts.forEach((concept) => {
    const challengeEntries = getChallengeCatalogEntries(concept.challengeMode, concept.variableLinks);

    if (!challengeEntries.length) {
      return;
    }

    challengeCountByConceptSlug.set(concept.slug, challengeEntries.length);
    const topic = getTopicDiscoverySummaryForConceptSlug(concept.slug);
    const starterTracks = getStarterTrackMembershipsForConcept(concept.slug).map((membership) => ({
      slug: membership.track.slug,
      title: membership.track.title,
      path: `/tracks/${membership.track.slug}`,
      stepIndex: membership.stepIndex,
      totalSteps: membership.totalSteps,
    }));

    challengeCountByTopicSlug.set(
      topic.slug,
      (challengeCountByTopicSlug.get(topic.slug) ?? 0) + challengeEntries.length,
    );

    for (const membership of starterTracks) {
      challengeConceptCountByTrackSlug.set(
        membership.slug,
        (challengeConceptCountByTrackSlug.get(membership.slug) ?? 0) + 1,
      );
      challengeCountByTrackSlug.set(
        membership.slug,
        (challengeCountByTrackSlug.get(membership.slug) ?? 0) + challengeEntries.length,
      );
    }

    challengeEntries.forEach((entry) => {
      entries.push({
        ...entry,
        href: buildChallengeEntryHref(concept.slug, entry.id),
        order: entries.length,
        concept: {
          id: concept.id,
          slug: concept.slug,
          title: concept.title,
          shortTitle: concept.shortTitle,
          summary: concept.summary,
          topic: concept.topic,
          subtopic: concept.subtopic,
          difficulty: concept.difficulty,
          sequence: concept.sequence,
          estimatedStudyMinutes: concept.estimatedStudyMinutes,
          heroConcept: concept.heroConcept,
          accent: concept.accent,
          highlights: concept.highlights,
          challengeCount: challengeEntries.length,
          path: `/concepts/${concept.slug}`,
          topicPath: `/concepts/topics/${topic.slug}`,
        },
        topic: {
          slug: topic.slug,
          title: topic.title,
          path: `/concepts/topics/${topic.slug}`,
          accent: topic.accent,
        },
        starterTracks,
      });
    });
  });

  const topics = getTopicDiscoverySummaries()
    .map((topic) => {
      const challengeCount = challengeCountByTopicSlug.get(topic.slug) ?? 0;

      if (!challengeCount) {
        return null;
      }

      const conceptCount = topic.concepts.filter((concept) =>
        challengeCountByConceptSlug.has(concept.slug),
      ).length;

      return {
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        accent: topic.accent,
        path: `/concepts/topics/${topic.slug}`,
        challengeCount,
        conceptCount,
        starterTrackCount: topic.starterTracks.filter((track) =>
          challengeCountByTrackSlug.has(track.slug),
        ).length,
        estimatedStudyMinutes: topic.concepts
          .filter((concept) => challengeCountByConceptSlug.has(concept.slug))
          .reduce((sum, concept) => sum + (concept.estimatedStudyMinutes ?? 0), 0),
        sourceTopics: topic.sourceTopics,
      } satisfies ChallengeDiscoveryTopicSummary;
    })
    .filter((topic): topic is ChallengeDiscoveryTopicSummary => Boolean(topic));

  const tracks = getStarterTracks()
    .map((track) => {
      const challengeCount = challengeCountByTrackSlug.get(track.slug) ?? 0;

      if (!challengeCount) {
        return null;
      }

      return {
        slug: track.slug,
        title: track.title,
        summary: track.summary,
        accent: track.accent,
        path: `/tracks/${track.slug}`,
        challengeCount,
        challengeConceptCount: challengeConceptCountByTrackSlug.get(track.slug) ?? 0,
        totalSteps: track.concepts.length,
        estimatedStudyMinutes: track.estimatedStudyMinutes,
      } satisfies ChallengeDiscoveryTrackSummary;
    })
    .filter((track): track is ChallengeDiscoveryTrackSummary => Boolean(track));

  const quickStartEntry =
    entries.find((entry) => entry.concept.heroConcept) ??
    entries.find((entry) => entry.concept.difficulty === "Intro") ??
    entries[0] ??
    null;

  return {
    entries,
    topics,
    tracks,
    quickStartEntry,
    totalChallenges: entries.length,
    totalConcepts: concepts.length,
    totalTopics: topics.length,
    totalTracks: tracks.length,
  };
}

function getCachedChallengeDiscoveryIndex() {
  if (!cachedChallengeDiscoveryIndex) {
    cachedChallengeDiscoveryIndex = buildChallengeDiscoveryIndex();
  }

  return cachedChallengeDiscoveryIndex;
}

export function getChallengeDiscoveryIndex(): ChallengeDiscoveryIndex {
  return getCachedChallengeDiscoveryIndex();
}

export function getChallengeDiscoveryMetrics() {
  const index = getCachedChallengeDiscoveryIndex();

  return {
    totalChallenges: index.totalChallenges,
    totalConcepts: index.totalConcepts,
    totalTopics: index.totalTopics,
    totalTracks: index.totalTracks,
  };
}
