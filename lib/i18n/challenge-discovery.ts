import {
  getChallengeCatalogEntries,
  getChallengeDiscoveryIndex,
  getConceptBySlug,
  type ChallengeCatalogEntry,
  type ChallengeDiscoveryEntry,
  type ChallengeDiscoveryIndex,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayHighlights,
  getConceptDisplayShortTitle,
  getConceptDisplaySubtopic,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getTopicDisplayTitle,
  getTopicDisplayTitleFromValue,
  resolveLocalizedChallengeDisplayCopy,
} from "@/lib/i18n/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";

const localizedChallengeIndexCache = new Map<AppLocale, ChallengeDiscoveryIndex>();

type LocalizedChallengeEntryContext = {
  localizedConcept: ReturnType<typeof localizeConceptContent>;
  localizedChallengeEntries: Map<string, ChallengeCatalogEntry>;
  localizedChallengeEntryOrder: Map<string, number>;
};

function getLocalizedChallengeEntryContext(
  slug: string,
  locale: AppLocale,
  cache: Map<string, LocalizedChallengeEntryContext>,
) {
  const cached = cache.get(slug);

  if (cached) {
    return cached;
  }

  const concept = getConceptBySlug(slug);
  const localizedConcept = localizeConceptContent(concept, locale);
  const localizedChallengeEntries = new Map(
    getChallengeCatalogEntries(
      localizedConcept.challengeMode,
      localizedConcept.variableLinks,
    ).map((entry) => [entry.id, entry] as const),
  );
  const localizedChallengeEntryOrder = new Map(
    getChallengeCatalogEntries(
      localizedConcept.challengeMode,
      localizedConcept.variableLinks,
    ).map((entry, index) => [entry.id, index + 1] as const),
  );
  const resolved = {
    localizedConcept,
    localizedChallengeEntries,
    localizedChallengeEntryOrder,
  } satisfies LocalizedChallengeEntryContext;
  cache.set(slug, resolved);
  return resolved;
}

function localizeChallengeEntry(
  entry: ChallengeDiscoveryEntry,
  locale: AppLocale,
  cache: Map<string, LocalizedChallengeEntryContext>,
): ChallengeDiscoveryEntry {
  const {
    localizedConcept,
    localizedChallengeEntries,
    localizedChallengeEntryOrder,
  } =
    getLocalizedChallengeEntryContext(entry.concept.slug, locale, cache);
  const localizedChallenge = localizedChallengeEntries.get(entry.id);
  const localizedConceptTitle = getConceptDisplayTitle(localizedConcept, locale);
  const localizedConceptShortTitle = getConceptDisplayShortTitle(localizedConcept, locale);
  const localizedChallengeCopy = resolveLocalizedChallengeDisplayCopy(locale, {
    concept: {
      ...entry.concept,
      title: localizedConceptTitle,
      shortTitle: localizedConceptShortTitle,
    },
    fallbackTitle: entry.title,
    fallbackPrompt: entry.prompt,
    translatedTitle: localizedChallenge?.title,
    translatedPrompt: localizedChallenge?.prompt,
    challengeNumber: localizedChallengeEntryOrder.get(entry.id) ?? null,
  });

  return {
    ...entry,
    title: localizedChallengeCopy.title,
    prompt: localizedChallengeCopy.prompt,
    successMessage: localizedChallenge?.successMessage ?? entry.successMessage,
    cueLabels: localizedChallenge?.cueLabels ?? entry.cueLabels,
    requirementLabels:
      localizedChallenge?.requirementLabels ?? entry.requirementLabels,
    targetLabels: localizedChallenge?.targetLabels ?? entry.targetLabels,
    concept: {
      ...entry.concept,
      title: localizedConceptTitle,
      shortTitle: localizedConceptShortTitle,
      summary: getConceptDisplaySummary(localizedConcept, locale),
      topic: getTopicDisplayTitleFromValue(localizedConcept.topic, locale),
      subtopic: getConceptDisplaySubtopic(localizedConcept, locale),
      highlights: getConceptDisplayHighlights(localizedConcept, locale),
    },
    topic: {
      ...entry.topic,
      title: getTopicDisplayTitle(entry.topic, locale),
    },
    starterTracks: entry.starterTracks.map((track) => ({
      ...track,
      title: getStarterTrackDisplayTitle(track, locale),
    })),
  };
}

export function getLocalizedChallengeDiscoveryIndex(
  locale: AppLocale,
): ChallengeDiscoveryIndex {
  if (locale === "en") {
    return getChallengeDiscoveryIndex();
  }

  const cached = localizedChallengeIndexCache.get(locale);

  if (cached) {
    return cached;
  }

  const baseIndex = getChallengeDiscoveryIndex();
  const entryContextCache = new Map<string, LocalizedChallengeEntryContext>();
  const entries = baseIndex.entries.map((entry) =>
    localizeChallengeEntry(entry, locale, entryContextCache),
  );
  const localizedIndex = {
    ...baseIndex,
    entries,
    topics: baseIndex.topics.map((topic) => ({
      ...topic,
      title: getTopicDisplayTitle(topic, locale),
    })),
    tracks: baseIndex.tracks.map((track) => ({
      ...track,
      title: getStarterTrackDisplayTitle(track, locale),
      summary: getStarterTrackDisplaySummary(track, locale),
    })),
    quickStartEntry: baseIndex.quickStartEntry
      ? entries.find((entry) => entry.id === baseIndex.quickStartEntry?.id) ?? null
      : null,
  } satisfies ChallengeDiscoveryIndex;

  localizedChallengeIndexCache.set(locale, localizedIndex);
  return localizedIndex;
}
