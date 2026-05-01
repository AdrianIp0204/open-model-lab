import type {
  ConceptSummary,
  GuidedCollectionSummary,
  ReadNextRecommendation,
  RecommendedGoalPathSummary,
  StarterTrackSummary,
  SubjectDiscoverySummary,
  TopicDiscoverySummary,
} from "@/lib/content";
import {
  getChallengeCatalogEntries,
  getConceptBySlug,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import { contentTranslationsByLocale as generatedContentTranslationsByLocale } from "@/lib/i18n/generated/content-bundle";
import { optimizedConceptUiCopy } from "@/lib/content/generated/content-variant-ui";
import conceptsCatalog from "@/content/catalog/concepts.json";
import subjectsCatalog from "@/content/catalog/subjects.json";
import topicsCatalog from "@/content/catalog/topics.json";
import {
  type CatalogTranslationCollection,
  type DeepPartial,
  type ConceptRecommendationSource,
  type ConceptRecommendationWithReason,
  type ConceptTranslationCollection,
  type ContentTranslationBundle,
  emptyContentTranslations,
} from "@/lib/i18n/content-translations";
import { isPlainObject, mergeTranslatedValue } from "./content-merge";

// Keep this module lightweight for shared display/catalog helpers. Rich concept variant resolution
// lives in `lib/i18n/concept-content.ts` so client-facing imports do not pull the full concept
// variant manifest and overlay bundles into route-level display code.
const contentTranslationsByLocale = generatedContentTranslationsByLocale as Partial<
  Record<AppLocale, ContentTranslationBundle>
>;
const subjectSlugByTitle = new Map(
  (subjectsCatalog as Array<{ slug: string; title: string }>).map((subject) => [
    subject.title,
    subject.slug,
  ]),
);
const topicSlugByValue = new Map(
  (
    topicsCatalog as Array<{
      slug: string;
      title: string;
      conceptTopics?: string[];
    }>
  ).flatMap((topic) => [
    [topic.slug, topic.slug] as const,
    [topic.title, topic.slug] as const,
    ...((topic.conceptTopics ?? []).map((value) => [value, topic.slug] as const)),
  ]),
);
const conceptSlugsBySubtopic = new Map(
  (
    conceptsCatalog as Array<{
      slug: string;
      subtopic?: string | null;
    }>
  ).reduce<Array<[string, string[]]>>((entries, concept) => {
    if (!concept.subtopic) {
      return entries;
    }

    const existing = entries.find(([subtopic]) => subtopic === concept.subtopic);

    if (existing) {
      existing[1].push(concept.slug);
      return entries;
    }

    entries.push([concept.subtopic, [concept.slug]]);
    return entries;
  }, []),
);

function getContentTranslations(locale: AppLocale): ContentTranslationBundle {
  return contentTranslationsByLocale[locale] ?? emptyContentTranslations;
}

function getCatalogTranslations(locale: AppLocale): CatalogTranslationCollection {
  return getContentTranslations(locale).catalog;
}

function getConceptTranslations(locale: AppLocale): ConceptTranslationCollection {
  return getContentTranslations(locale).concepts;
}

function getOptimizedConceptUiContent(slug: string) {
  return optimizedConceptUiCopy[slug];
}

function getLocalizedConceptUiContent(slug: string, locale: AppLocale) {
  return getConceptTranslations(locale)[slug];
}

function getTranslatedChallengeItemCopy(
  slug: string,
  challengeId: string,
  locale: AppLocale,
) {
  const optimizedItem = getOptimizedConceptUiContent(slug)?.challengeMode?.items?.find(
    (item) => item.id === challengeId,
  );
  const localizedItems = getLocalizedConceptUiContent(slug, locale)?.challengeMode?.items;
  const localizedItem =
    Array.isArray(localizedItems)
      ? localizedItems.find(
          (item): item is Record<string, unknown> & { id: string } =>
            isPlainObject(item) && item.id === challengeId,
        )
      : null;

  if (!optimizedItem && !localizedItem) {
    return null;
  }

  return {
    title:
      typeof localizedItem?.title === "string"
        ? localizedItem.title
        : optimizedItem?.title,
    prompt:
      typeof localizedItem?.prompt === "string"
        ? localizedItem.prompt
        : optimizedItem?.prompt,
  };
}

function getResolvedChallengeItemCopy(
  conceptSlug: string,
  challengeId: string,
  locale: AppLocale,
) {
  return getTranslatedChallengeItemCopy(conceptSlug, challengeId, locale);
}

function hasDirectLocalizedChallengeCopy(
  candidate: unknown,
  fallbackValue: string,
): candidate is string {
  if (typeof candidate !== "string") {
    return false;
  }

  const trimmed = candidate.trim();

  if (!trimmed.length || trimmed === fallbackValue.trim()) {
    return false;
  }

  if (/^\[\s*"[^"]+"/u.test(trimmed)) {
    return false;
  }

  return (
    hasVisibleCjk(trimmed) ||
    !/\b[A-Za-z]{3,}(?:[\s/-]+[A-Za-z][A-Za-z0-9-]{1,})+\b/u.test(trimmed)
  );
}

function hasVisibleCjk(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function getZhHkFallbackConceptLabel(
  concept: Pick<ConceptSummary, "title" | "shortTitle">,
) {
  const preferredLabel = concept.shortTitle?.trim() || concept.title.trim();
  return hasVisibleCjk(preferredLabel) ? preferredLabel : "概念";
}

function buildZhHkChallengeFallbackTitle(
  concept: Pick<ConceptSummary, "title" | "shortTitle">,
  challengeNumber?: number | null,
) {
  const conceptLabel = getZhHkFallbackConceptLabel(concept);
  return challengeNumber && challengeNumber > 0
    ? `${conceptLabel} 挑戰 ${challengeNumber}`
    : `${conceptLabel} 挑戰`;
}

function buildZhHkQuickTestFallbackTitle(
  concept: Pick<ConceptSummary, "title" | "shortTitle">,
) {
  return `${getZhHkFallbackConceptLabel(concept)} 快速測驗`;
}

export function resolveLocalizedChallengeDisplayCopy(
  locale: AppLocale,
  input: {
    concept: Pick<ConceptSummary, "title" | "shortTitle">;
    fallbackTitle: string;
    fallbackPrompt: string;
    translatedTitle?: unknown;
    translatedPrompt?: unknown;
    challengeNumber?: number | null;
  },
) {
  if (locale !== "zh-HK") {
    return {
      title:
        typeof input.translatedTitle === "string" && input.translatedTitle.trim().length > 0
          ? input.translatedTitle
          : input.fallbackTitle,
      prompt:
        typeof input.translatedPrompt === "string" && input.translatedPrompt.trim().length > 0
          ? input.translatedPrompt
          : input.fallbackPrompt,
    };
  }

  return {
    title: hasDirectLocalizedChallengeCopy(input.translatedTitle, input.fallbackTitle)
      ? input.translatedTitle
      : buildZhHkChallengeFallbackTitle(input.concept, input.challengeNumber),
    prompt: hasDirectLocalizedChallengeCopy(input.translatedPrompt, input.fallbackPrompt)
      ? input.translatedPrompt
      : "打開這個挑戰以查看完整任務要求與目標。",
  };
}

/*
function localizeSharedConceptAuthoringCopy(
  concept: ConceptContent,
  locale: AppLocale,
): ConceptContent {
  if (locale !== "zh-HK") {
    return concept;
  }

  if (!concept.noticePrompts) {
    return concept;
  }

  const localizedNoticeTitle =
    concept.noticePrompts.title === "What to notice"
      ? "觀察重點"
      : concept.noticePrompts.title;
  const localizedChallengeTitle =
    concept.challengeMode?.title === "Challenge mode"
      ? "挑戰模式"
      : concept.challengeMode?.title === "Challenge mode: centripetal force"
        ? "挑戰模式：向心力"
        : concept.challengeMode?.title;

  if (
    localizedNoticeTitle === concept.noticePrompts.title &&
    localizedChallengeTitle === concept.challengeMode?.title
  ) {
    return concept;
  }

  return {
    ...concept,
    noticePrompts: {
      ...concept.noticePrompts,
      title: localizedNoticeTitle,
    },
    challengeMode: concept.challengeMode
      ? {
          ...concept.challengeMode,
          title: localizedChallengeTitle,
        }
      : concept.challengeMode,
  };
}

function resolveTranslatedChallengeItem(
  concept: ConceptContent,
  challengeContext: Pick<
    ConceptContent,
    "graphs" | "simulation" | "variableLinks"
  >,
  locale: AppLocale,
  baseItem: NonNullable<ConceptContent["challengeMode"]>["items"][number],
  translatedItem: Record<string, unknown>,
) {
  const translatedTargets = Array.isArray(translatedItem.targets)
    ? translatedItem.targets
    : undefined;
  const translatedChecks = Array.isArray(translatedItem.checks)
    ? translatedItem.checks
    : undefined;
  const hasAuthoringTargets =
    translatedTargets?.some((target) => isPlainObject(target) && !("type" in target)) ?? false;
  const hasRequirementAuthoring = isPlainObject(translatedItem.requirements);
  const hasMislabeledChecks =
    translatedTargets?.length && translatedTargets.every((target) => isChallengeCheckLike(target));
  const hasTranslatedChecks = translatedChecks?.every((check) => isPlainObject(check)) ?? false;

  if (hasTranslatedChecks && !hasAuthoringTargets && !hasRequirementAuthoring && !hasMislabeledChecks) {
    const mergedChecks = mergeChallengeChecksByIndex(
      baseItem.checks,
      (translatedChecks ?? []) as Array<DeepPartial<(typeof baseItem.checks)[number]>>,
    );

    return mergeTranslatedValue(baseItem, {
      ...(translatedItem as DeepPartial<typeof baseItem>),
      checks: mergedChecks,
    });
  }

  if (!hasAuthoringTargets && !hasRequirementAuthoring && !hasMislabeledChecks) {
    if (locale === "en") {
      return mergeTranslatedValue(baseItem, translatedItem as DeepPartial<typeof baseItem>);
    }

    return mergeTranslatedValue(baseItem, {
      ...(translatedItem as DeepPartial<typeof baseItem>),
      checks: localizeChallengeChecks(baseItem.checks, {
        graphs: challengeContext.graphs,
        overlays: challengeContext.simulation.overlays,
        controls: challengeContext.simulation.controls,
        variableLinks: challengeContext.variableLinks,
        locale,
      }),
    });
  }

  const normalizedMode = normalizeChallengeModeAuthoring(
    {
      items: [
        {
          id: baseItem.id,
          title:
            typeof translatedItem.title === "string" ? translatedItem.title : baseItem.title,
          style: baseItem.style,
          prompt:
            typeof translatedItem.prompt === "string" ? translatedItem.prompt : baseItem.prompt,
          successMessage:
            typeof translatedItem.successMessage === "string"
              ? translatedItem.successMessage
              : baseItem.successMessage,
          setup: isPlainObject(translatedItem.setup)
            ? mergeTranslatedValue(baseItem.setup ?? {}, translatedItem.setup as DeepPartial<NonNullable<typeof baseItem.setup>>)
            : baseItem.setup,
          hints: Array.isArray(translatedItem.hints)
            ? (translatedItem.hints as typeof baseItem.hints)
            : baseItem.hints,
          checks: hasMislabeledChecks
            ? (translatedTargets as NonNullable<typeof baseItem.checks>)
            : (translatedChecks as NonNullable<typeof baseItem.checks> | undefined),
          requirements: hasRequirementAuthoring
            ? (translatedItem.requirements as Record<string, unknown>)
            : undefined,
          targets: hasAuthoringTargets ? (translatedTargets as Array<Record<string, unknown>>) : undefined,
        },
      ],
    },
    {
      graphs: challengeContext.graphs,
      overlays: challengeContext.simulation.overlays,
      controls: challengeContext.simulation.controls,
      variableLinks: challengeContext.variableLinks,
      locale,
    },
  );
  const normalizedItem = normalizedMode?.items[0];

  if (!normalizedItem) {
    return mergeTranslatedValue(baseItem, translatedItem as DeepPartial<typeof baseItem>);
  }

  return mergeTranslatedValue(baseItem, {
    ...(normalizedItem as DeepPartial<typeof baseItem>),
    checks: mergeChallengeChecksByIndex(
      baseItem.checks,
      (normalizedItem.checks ?? []) as Array<DeepPartial<(typeof baseItem.checks)[number]>>,
      { preferTrailing: hasAuthoringTargets && !hasRequirementAuthoring },
    ),
  });
}

function resolveTranslatedChallengeMode(
  concept: ConceptContent,
  challengeContext: Pick<ConceptContent, "graphs" | "simulation" | "variableLinks">,
  locale: AppLocale,
  translatedChallengeMode: Record<string, unknown>,
) {
  const baseMode = concept.challengeMode;

  if (!baseMode) {
    return undefined;
  }

  const translatedItems = Array.isArray(translatedChallengeMode.items)
    ? translatedChallengeMode.items
    : [];
  const translatedItemsById = new Map(
    translatedItems
      .filter(
        (item): item is Record<string, unknown> & { id: string } =>
          isPlainObject(item) && typeof item.id === "string",
      )
      .map((item) => [item.id, item]),
  );

  return {
    ...baseMode,
    title:
      typeof translatedChallengeMode.title === "string"
        ? translatedChallengeMode.title
        : baseMode.title,
    intro:
      typeof translatedChallengeMode.intro === "string"
        ? translatedChallengeMode.intro
        : baseMode.intro,
    items: baseMode.items.map((item) => {
      const translatedItem = translatedItemsById.get(item.id);
      return translatedItem
        ? resolveTranslatedChallengeItem(concept, challengeContext, locale, item, translatedItem)
        : item;
    }),
  };
}
*/

export function localizeConceptSummaryDisplay<T extends ConceptSummary>(
  concept: T,
  locale: AppLocale,
): T {
  return {
    ...concept,
    title: getConceptDisplayTitle(concept, locale),
    shortTitle: getConceptDisplayShortTitle(concept, locale),
    summary: getConceptDisplaySummary(concept, locale),
    highlights: getConceptDisplayHighlights(concept, locale),
    subject: getSubjectDisplayTitleFromValue(concept.subject, locale),
    topic: getTopicDisplayTitleFromValue(concept.topic, locale),
    subtopic: concept.subtopic
      ? getConceptDisplaySubtopic(concept, locale)
      : concept.subtopic,
  };
}

export function getSubjectDisplayTitle(
  subject: SubjectDiscoverySummary,
  locale: AppLocale,
) {
  return getCatalogTranslations(locale).subjects?.[subject.slug]?.title ?? subject.title;
}

export function getSubjectDisplayDescription(
  subject: SubjectDiscoverySummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).subjects?.[subject.slug]?.description ??
    subject.description
  );
}

export function getSubjectDisplayIntroduction(
  subject: SubjectDiscoverySummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).subjects?.[subject.slug]?.introduction ??
    subject.introduction
  );
}

export function getTopicDisplayTitle(
  topic: Pick<TopicDiscoverySummary, "slug" | "title">,
  locale: AppLocale,
) {
  return getCatalogTranslations(locale).topics?.[topic.slug]?.title ?? topic.title;
}

export function getTopicDisplayDescription(
  topic: TopicDiscoverySummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).topics?.[topic.slug]?.description ?? topic.description
  );
}

export function getTopicDisplayIntroduction(
  topic: TopicDiscoverySummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).topics?.[topic.slug]?.introduction ??
    topic.introduction
  );
}

export function getTopicDisplayGroups(
  topic: TopicDiscoverySummary,
  locale: AppLocale,
) {
  const translatedGroups = getCatalogTranslations(locale).topics?.[topic.slug]?.groups;

  if (!translatedGroups?.length) {
    return topic.groups;
  }

  const translationsById = new Map(
    translatedGroups
      .filter((group): group is { id: string; title?: string; description?: string } =>
        typeof group?.id === "string",
      )
      .map((group) => [group.id, group]),
  );

  return topic.groups.map((group) => {
    const translatedGroup = translationsById.get(group.id);

    if (!translatedGroup) {
      return group;
    }

    return {
      ...group,
      title: translatedGroup.title ?? group.title,
      description: translatedGroup.description ?? group.description,
    };
  });
}

export function getStarterTrackDisplayTitle(
  track: Pick<StarterTrackSummary, "slug" | "title">,
  locale: AppLocale,
) {
  return getCatalogTranslations(locale).starterTracks?.[track.slug]?.title ?? track.title;
}

export function getStarterTrackDisplaySummary(
  track: Pick<StarterTrackSummary, "slug" | "summary">,
  locale: AppLocale,
) {
  return getCatalogTranslations(locale).starterTracks?.[track.slug]?.summary ?? track.summary;
}

export function getStarterTrackDisplayHighlights(
  track: Pick<StarterTrackSummary, "slug" | "highlights">,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).starterTracks?.[track.slug]?.highlights ??
    track.highlights
  );
}

export function getStarterTrackDisplayIntroduction(
  track: StarterTrackSummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).starterTracks?.[track.slug]?.introduction ??
    track.introduction
  );
}

export function getGuidedCollectionDisplayTitle(
  collection: Pick<GuidedCollectionSummary, "slug" | "title">,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).guidedCollections?.[collection.slug]?.title ??
    collection.title
  );
}

export function getGuidedCollectionDisplaySummary(
  collection: GuidedCollectionSummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).guidedCollections?.[collection.slug]?.summary ??
    collection.summary
  );
}

export function getGuidedCollectionDisplayHighlights(
  collection: Pick<GuidedCollectionSummary, "slug" | "highlights">,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).guidedCollections?.[collection.slug]?.highlights ??
    collection.highlights
  );
}

export function getGoalPathDisplayTitle(
  goalPath: RecommendedGoalPathSummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).recommendedGoalPaths?.[goalPath.slug]?.title ??
    goalPath.title
  );
}

export function getGoalPathDisplaySummary(
  goalPath: RecommendedGoalPathSummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).recommendedGoalPaths?.[goalPath.slug]?.summary ??
    goalPath.summary
  );
}

export function getGoalPathDisplayObjective(
  goalPath: RecommendedGoalPathSummary,
  locale: AppLocale,
) {
  return (
    getCatalogTranslations(locale).recommendedGoalPaths?.[goalPath.slug]?.objective ??
    goalPath.objective
  );
}

export function localizeRecommendedGoalPath(
  goalPath: RecommendedGoalPathSummary,
  locale: AppLocale,
): RecommendedGoalPathSummary {
  const translation = getCatalogTranslations(locale).recommendedGoalPaths?.[
    goalPath.slug
  ] as DeepPartial<RecommendedGoalPathSummary> | undefined;
  const merged = translation ? mergeTranslatedValue(goalPath, translation) : goalPath;

  return {
    ...merged,
    title: getGoalPathDisplayTitle(merged, locale),
    summary: getGoalPathDisplaySummary(merged, locale),
    objective: getGoalPathDisplayObjective(merged, locale),
    concepts: merged.concepts.map((concept) =>
      localizeConceptSummaryDisplay(concept, locale),
    ),
    relatedCollections: merged.relatedCollections.map((collection) => ({
      ...collection,
      title: getGuidedCollectionDisplayTitle(collection, locale),
    })),
    steps: merged.steps.map((step) => ({
      ...step,
      ...(step.kind === "concept"
        ? { concept: localizeConceptSummaryDisplay(step.concept, locale) }
        : {}),
      ...(step.kind === "guided-collection"
        ? { collection: localizeGuidedCollection(step.collection, locale) }
        : {}),
      ...(step.kind === "track"
        ? { track: localizeStarterTrack(step.track, locale) }
        : {}),
      ...(step.kind === "topic"
        ? {
            topic: {
              ...step.topic,
              title: getTopicDisplayTitle(step.topic, locale),
            },
          }
        : {}),
    })),
  };
}

export function getConceptDisplayTitle(
  concept: Pick<ConceptSummary, "slug" | "title">,
  locale: AppLocale,
) {
  return getLocalizedConceptUiContent(concept.slug, locale)?.title ??
    getOptimizedConceptUiContent(concept.slug)?.title ??
    concept.title;
}

export function getConceptDisplayShortTitle(
  concept: Pick<ConceptSummary, "slug" | "shortTitle" | "title">,
  locale: AppLocale,
) {
  return (
    getLocalizedConceptUiContent(concept.slug, locale)?.shortTitle ??
    getOptimizedConceptUiContent(concept.slug)?.shortTitle ??
    concept.shortTitle ??
    getConceptDisplayTitle(concept, locale)
  );
}

export function getConceptDisplaySummary(
  concept: Pick<ConceptSummary, "slug" | "summary">,
  locale: AppLocale,
) {
  return (
    getLocalizedConceptUiContent(concept.slug, locale)?.summary ??
    getOptimizedConceptUiContent(concept.slug)?.summary ??
    concept.summary
  );
}

export function getConceptDisplayHighlights(
  concept: Pick<ConceptSummary, "slug" | "highlights">,
  locale: AppLocale,
) {
  return (
    getLocalizedConceptUiContent(concept.slug, locale)?.highlights ??
    getOptimizedConceptUiContent(concept.slug)?.highlights ??
    concept.highlights
  );
}

export function getConceptDisplaySubtopic(
  concept: Pick<ConceptSummary, "slug" | "subtopic">,
  locale: AppLocale,
) {
  return (
    getLocalizedConceptUiContent(concept.slug, locale)?.subtopic ??
    getOptimizedConceptUiContent(concept.slug)?.subtopic ??
    concept.subtopic
  );
}

export function getConceptDisplayRecommendedNextReasonLabel(
  concept: ConceptRecommendationSource,
  recommendation: ConceptRecommendationWithReason,
  locale: AppLocale,
) {
  const translatedRecommendation =
    getLocalizedConceptUiContent(concept.slug, locale)?.recommendedNext?.find(
      (candidate) => candidate?.slug === recommendation.slug,
    ) ??
    getOptimizedConceptUiContent(concept.slug)?.recommendedNext?.find(
      (candidate) => candidate?.slug === recommendation.slug,
    );

  return translatedRecommendation?.reasonLabel ?? recommendation.reasonLabel;
}

export function getSubjectDisplayTitleFromValue(
  subjectTitle: string,
  locale: AppLocale,
) {
  const subjectSlug = subjectSlugByTitle.get(subjectTitle);

  return subjectSlug
    ? getCatalogTranslations(locale).subjects?.[subjectSlug]?.title ?? subjectTitle
    : subjectTitle;
}

export function getTopicDisplayTitleFromValue(topicTitle: string, locale: AppLocale) {
  const topicSlug = topicSlugByValue.get(topicTitle);

  return topicSlug
    ? getCatalogTranslations(locale).topics?.[topicSlug]?.title ?? topicTitle
    : topicTitle;
}

export function getConceptSubtopicDisplayFromValue(
  subtopic: string,
  locale: AppLocale,
) {
  const conceptSlugs = conceptSlugsBySubtopic.get(subtopic);

  if (!conceptSlugs?.length) {
    return subtopic;
  }

  for (const slug of conceptSlugs) {
    const translatedSubtopic = getConceptTranslations(locale)[slug]?.subtopic;

    if (translatedSubtopic) {
      return translatedSubtopic;
    }
  }

  return subtopic;
}

export function getTopicDisplaySubject(
  topic: Pick<TopicDiscoverySummary, "subject">,
  locale: AppLocale,
) {
  return getSubjectDisplayTitleFromValue(topic.subject, locale);
}

export function getTopicDisplaySubtopics(
  topic: Pick<TopicDiscoverySummary, "subtopics">,
  locale: AppLocale,
) {
  return topic.subtopics.map((subtopic) =>
    getConceptSubtopicDisplayFromValue(subtopic, locale),
  );
}

export function localizeStarterTrack(
  track: StarterTrackSummary,
  locale: AppLocale,
): StarterTrackSummary {
  const translation = getCatalogTranslations(locale).starterTracks?.[
    track.slug
  ] as DeepPartial<StarterTrackSummary> | undefined;
  const merged = translation ? mergeTranslatedValue(track, translation) : track;
  const localizedConcepts = merged.concepts.map((concept) =>
    localizeConceptSummaryDisplay(concept, locale),
  );
  const baseCheckpointById = new Map(track.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
  const baseEntryDiagnosticProbeById = new Map(
    track.entryDiagnostic?.probes.map((probe) => [probe.id, probe]) ?? [],
  );
  const localizedCheckpoints = merged.checkpoints.map((checkpoint) => {
    const baseCheckpoint = baseCheckpointById.get(checkpoint.id);
    const localizedChallengeConcept = localizeConceptSummaryDisplay(
      checkpoint.challenge.concept,
      locale,
    );
    const translatedChallengeItem = getResolvedChallengeItemCopy(
      checkpoint.challenge.concept.slug,
      checkpoint.challenge.challengeId,
      locale,
    );
    const challengeConceptContent = getConceptBySlug(checkpoint.challenge.concept.slug);
    const challengeEntries = getChallengeCatalogEntries(
      challengeConceptContent.challengeMode,
      challengeConceptContent.variableLinks,
    );
    const challengeNumber =
      challengeEntries.findIndex(
        (item) => item.id === checkpoint.challenge.challengeId,
      ) + 1;
    const localizedChallengeCopy = resolveLocalizedChallengeDisplayCopy(locale, {
      concept: localizedChallengeConcept,
      fallbackTitle: checkpoint.challenge.title,
      fallbackPrompt: checkpoint.challenge.prompt,
      translatedTitle: translatedChallengeItem?.title,
      translatedPrompt: translatedChallengeItem?.prompt,
      challengeNumber: challengeNumber > 0 ? challengeNumber : null,
    });
    const localizedChallengeTitle = localizedChallengeCopy.title;
    const localizedChallengePrompt = localizedChallengeCopy.prompt;

    return {
      ...checkpoint,
      title:
        baseCheckpoint && checkpoint.title === baseCheckpoint.title
          ? localizedChallengeTitle
          : checkpoint.title,
      summary:
        baseCheckpoint && checkpoint.summary === baseCheckpoint.summary
          ? localizedChallengePrompt
          : checkpoint.summary,
      concepts: checkpoint.concepts.map((concept) =>
        localizeConceptSummaryDisplay(concept, locale),
      ),
      afterConcept: localizeConceptSummaryDisplay(checkpoint.afterConcept, locale),
      challenge: {
        ...checkpoint.challenge,
        concept: localizedChallengeConcept,
        title: localizedChallengeTitle,
        prompt: localizedChallengePrompt,
      },
    };
  });

  return {
    ...merged,
    title: getStarterTrackDisplayTitle(merged, locale),
    summary: getStarterTrackDisplaySummary(merged, locale),
    highlights: getStarterTrackDisplayHighlights(merged, locale),
    introduction: getStarterTrackDisplayIntroduction(merged, locale),
    concepts: localizedConcepts,
    checkpoints: localizedCheckpoints,
    entryDiagnostic: merged.entryDiagnostic
      ? {
          ...merged.entryDiagnostic,
          probes: merged.entryDiagnostic.probes.map((probe) => {
            const localizedConcept = localizeConceptSummaryDisplay(probe.concept, locale);
            const baseProbe = baseEntryDiagnosticProbeById.get(probe.id);

            if (probe.kind === "challenge") {
              const translatedChallengeItem = getResolvedChallengeItemCopy(
                probe.concept.slug,
                probe.challengeId,
                locale,
              );
              const conceptContent = getConceptBySlug(probe.concept.slug);
              const challengeEntries = getChallengeCatalogEntries(
                conceptContent.challengeMode,
                conceptContent.variableLinks,
              );
              const challengeNumber =
                challengeEntries.findIndex((item) => item.id === probe.challengeId) + 1;
              const localizedChallengeCopy = resolveLocalizedChallengeDisplayCopy(locale, {
                concept: localizedConcept,
                fallbackTitle: probe.challengeTitle,
                fallbackPrompt: probe.prompt,
                translatedTitle: translatedChallengeItem?.title,
                translatedPrompt: translatedChallengeItem?.prompt,
                challengeNumber: challengeNumber > 0 ? challengeNumber : null,
              });

              return {
                ...probe,
                concept: localizedConcept,
                title:
                  baseProbe && probe.title === baseProbe.title
                    ? localizedChallengeCopy.title
                    : probe.title,
                summary:
                  baseProbe && probe.summary === baseProbe.summary
                    ? localizedChallengeCopy.prompt
                    : probe.summary,
                challengeTitle: localizedChallengeCopy.title,
                prompt: localizedChallengeCopy.prompt,
              };
            }

            return {
              ...probe,
              concept: localizedConcept,
              title:
                locale === "zh-HK" && baseProbe && probe.title === baseProbe.title
                  ? buildZhHkQuickTestFallbackTitle(localizedConcept)
                  : probe.title,
              summary:
                locale === "zh-HK" && baseProbe && probe.summary === baseProbe.summary
                  ? "打開快速測驗以檢查這個概念的關鍵理解。"
                  : probe.summary,
            };
          }),
          skipToConcept: merged.entryDiagnostic.skipToConcept
            ? localizeConceptSummaryDisplay(merged.entryDiagnostic.skipToConcept, locale)
            : null,
        }
      : null,
  };
}

export function localizeGuidedCollection(
  collection: GuidedCollectionSummary,
  locale: AppLocale,
): GuidedCollectionSummary {
  const translation = getCatalogTranslations(locale).guidedCollections?.[
    collection.slug
  ] as DeepPartial<GuidedCollectionSummary> | undefined;
  const merged = translation ? mergeTranslatedValue(collection, translation) : collection;
  const localizedConcepts = merged.concepts.map((concept) =>
    localizeConceptSummaryDisplay(concept, locale),
  );
  const localizedTopics = merged.topics.map((topic) => ({
    ...topic,
    title: getTopicDisplayTitle(topic, locale),
  }));
  const localizedRelatedTracks = merged.relatedTracks.map((track) => ({
    ...track,
    title: getStarterTrackDisplayTitle(track, locale),
  }));
  const baseEntryDiagnosticProbeById = new Map(
    collection.entryDiagnostic?.probes.map((probe) => [probe.id, probe]) ?? [],
  );
  const localizedSteps = merged.steps.map((step) => ({
    ...step,
    relatedConcepts: step.relatedConcepts.map((concept) =>
      localizeConceptSummaryDisplay(concept, locale),
    ),
    ...(step.kind === "concept"
      ? { concept: localizeConceptSummaryDisplay(step.concept, locale) }
      : {}),
    ...(step.kind === "challenge"
      ? { concept: localizeConceptSummaryDisplay(step.concept, locale) }
      : {}),
    ...(step.kind === "track" ? { track: localizeStarterTrack(step.track, locale) } : {}),
  }));
  const localizedStepsById = new Map(localizedSteps.map((step) => [step.id, step]));

  return {
    ...merged,
    title: getGuidedCollectionDisplayTitle(merged, locale),
    summary: getGuidedCollectionDisplaySummary(merged, locale),
    highlights: getGuidedCollectionDisplayHighlights(merged, locale),
    concepts: localizedConcepts,
    topics: localizedTopics,
    relatedTracks: localizedRelatedTracks,
    steps: localizedSteps,
    entryDiagnostic: merged.entryDiagnostic
      ? {
          ...merged.entryDiagnostic,
          probes: merged.entryDiagnostic.probes.map((probe) => {
            const localizedConcept = localizeConceptSummaryDisplay(probe.concept, locale);
            const baseProbe = baseEntryDiagnosticProbeById.get(probe.id);

            if (probe.kind === "challenge") {
              const translatedChallengeItem = getResolvedChallengeItemCopy(
                probe.concept.slug,
                probe.challengeId,
                locale,
              );
              const conceptContent = getConceptBySlug(probe.concept.slug);
              const challengeEntries = getChallengeCatalogEntries(
                conceptContent.challengeMode,
                conceptContent.variableLinks,
              );
              const challengeNumber =
                challengeEntries.findIndex((item) => item.id === probe.challengeId) + 1;
              const localizedChallengeCopy = resolveLocalizedChallengeDisplayCopy(locale, {
                concept: localizedConcept,
                fallbackTitle: probe.challengeTitle,
                fallbackPrompt: probe.prompt,
                translatedTitle: translatedChallengeItem?.title,
                translatedPrompt: translatedChallengeItem?.prompt,
                challengeNumber: challengeNumber > 0 ? challengeNumber : null,
              });

              return {
                ...probe,
                concept: localizedConcept,
                title:
                  baseProbe && probe.title === baseProbe.title
                    ? localizedChallengeCopy.title
                    : probe.title,
                summary:
                  baseProbe && probe.summary === baseProbe.summary
                    ? localizedChallengeCopy.prompt
                    : probe.summary,
                challengeTitle: localizedChallengeCopy.title,
                prompt: localizedChallengeCopy.prompt,
              };
            }

            return {
              ...probe,
              concept: localizedConcept,
              title:
                locale === "zh-HK" && baseProbe && probe.title === baseProbe.title
                  ? buildZhHkQuickTestFallbackTitle(localizedConcept)
                  : probe.title,
              summary:
                locale === "zh-HK" && baseProbe && probe.summary === baseProbe.summary
                  ? "打開快速測驗以檢查這個概念的關鍵理解。"
                  : probe.summary,
            };
          }),
          skipToStep: merged.entryDiagnostic.skipToStep
            ? {
                ...(
                  localizedStepsById.get(merged.entryDiagnostic.skipToStep.id) ??
                  merged.entryDiagnostic.skipToStep
                ),
                relatedConcepts: (
                  localizedStepsById.get(merged.entryDiagnostic.skipToStep.id)?.relatedConcepts ??
                  merged.entryDiagnostic.skipToStep.relatedConcepts
                ).map((concept) => localizeConceptSummaryDisplay(concept, locale)),
              }
            : null,
        }
      : null,
  };
}

function getGenericReadNextReasonLabel(
  recommendation: ReadNextRecommendation,
  locale: AppLocale,
) {
  if (locale !== "zh-HK") {
    return recommendation.reasonLabel;
  }

  const localizedTopic = getTopicDisplayTitleFromValue(recommendation.topic, locale);

  switch (recommendation.reasonKind) {
    case "builds-on-this":
      return "建基於這一節";
    case "next-in-topic":
      return `同主題下一步：${localizedTopic}`;
    case "useful-comparison":
      return "適合作比較";
    case "try-this-next":
      return "接著試試這個";
    default:
      return recommendation.reasonLabel;
  }
}

export function localizeReadNextRecommendations(
  concept: ConceptRecommendationSource,
  recommendations: ReadNextRecommendation[],
  locale: AppLocale,
): ReadNextRecommendation[] {
  return recommendations.map((recommendation) => {
    const localizedConcept = {
      slug: recommendation.slug,
      title: recommendation.title,
      shortTitle: recommendation.title,
      summary: recommendation.summary,
      highlights: [],
      subject: "",
      topic: recommendation.topic,
      subtopic: recommendation.topic,
    } as Pick<
      ConceptSummary,
      | "slug"
      | "title"
      | "shortTitle"
      | "summary"
      | "highlights"
      | "subject"
      | "topic"
      | "subtopic"
    >;

    return {
      ...recommendation,
      title: getConceptDisplayTitle(localizedConcept, locale),
      summary: getConceptDisplaySummary(localizedConcept, locale),
      topic: getTopicDisplayTitleFromValue(recommendation.topic, locale),
      reasonLabel:
        (recommendation.reasonKind === "curated"
          ? getConceptDisplayRecommendedNextReasonLabel(
              concept,
              recommendation,
              locale,
            )
          : getGenericReadNextReasonLabel(recommendation, locale)) ??
        recommendation.reasonLabel,
    };
  });
}
