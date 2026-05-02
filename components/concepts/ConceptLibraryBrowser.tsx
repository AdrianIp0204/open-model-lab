"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type {
  StarterTrackSummary,
  SubjectDiscoverySummary,
  TopicDiscoverySummary,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayHighlights,
  getConceptDisplayRecommendedNextReasonLabel,
  getConceptDisplayShortTitle,
  getConceptDisplaySubtopic,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  getProgressActionKey,
  getProgressReasonKey,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import {
  getConceptProgressSummary,
  getConceptResurfacingCue,
  resolveAccountProgressSnapshot,
  selectAdaptiveReviewQueue,
  selectContinueLearning,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { DiscoveryFilterSelect } from "@/components/layout/DiscoveryFilterSelect";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { getConceptVisualDescriptor } from "@/components/visuals/learningVisualDescriptors";
import { ConceptTile } from "./ConceptTile";
import { type ConceptSummary } from "./concept-catalog";
import { StarterTrackEntryLink } from "./StarterTrackEntryLink";
import { MotionStaggerGroup } from "@/components/motion";

type ConceptLibraryBrowserProps = {
  concepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  subjects: SubjectDiscoverySummary[];
  topics: TopicDiscoverySummary[];
  quickStartConcept?: ConceptSummary | null;
  guidedTrack?: StarterTrackSummary | null;
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

type ProgressFilter = "all" | "not-started" | "in-progress" | "completed";
type TrackFilter = "all" | string;
type SortFilter = "subject-topic" | "catalog" | "title" | "study-time";

const DEFAULT_SUBJECT = "all" as const;
const DEFAULT_TOPIC = "all" as const;
const DEFAULT_TRACK = "all" as const;
const DEFAULT_PROGRESS_FILTER = "all" as const;
const DEFAULT_SORT_FILTER = "subject-topic" as const;

function getConceptLibrarySubjectSectionId(subjectSlug: string) {
  return `concept-library-subject-${subjectSlug}`;
}

type ConceptTrackMembership = {
  trackSlug: string;
  trackTitle: string;
  stepIndex: number;
  totalSteps: number;
};

type RecommendationCard = {
  eyebrow: string;
  title: string;
  note: string;
  href: string;
  actionLabel: string;
  targetSlug: string;
};

function getWeakAreaCueLabel(
  candidate: Pick<ReturnType<typeof selectAdaptiveReviewQueue>[number], "reasonKind" | "primaryAction">,
  t: ReturnType<typeof useTranslations<"ConceptLibrary">>,
) {
  switch (candidate.reasonKind) {
    case "missed-checks":
      return {
        label: t("cueLabels.quickTestFollowUp"),
        tone: "coral" as const,
      };
    case "challenge":
      return {
        label: t("cueLabels.challengeFollowUp"),
        tone: "amber" as const,
      };
    case "checkpoint":
      return {
        label: t("cueLabels.checkpointRecovery"),
        tone: "amber" as const,
      };
    case "diagnostic":
      return {
        label: t("cueLabels.entryDiagnostic"),
        tone: "sky" as const,
      };
    case "confidence":
      return {
        label: t("cueLabels.needsConfidence"),
        tone: "amber" as const,
      };
    case "unfinished":
      return {
        label: t("cueLabels.returnToFinish"),
        tone: "coral" as const,
      };
    default:
      return {
        label: t("cueLabels.staleRevisit"),
        tone: "sky" as const,
      };
  }
}

function getProgressFilterLabel(value: ProgressFilter) {
  switch (value) {
    case "not-started":
      return "notStarted";
    case "in-progress":
      return "inProgress";
    case "completed":
      return "completed";
    default:
      return "all";
  }
}

function getSortFilterLabel(value: SortFilter) {
  switch (value) {
    case "catalog":
      return "catalog";
    case "title":
      return "title";
    case "study-time":
      return "studyTime";
    default:
      return "subjectTopic";
  }
}

function isProgressFilter(value: string | null): value is ProgressFilter {
  return (
    value === "all" ||
    value === "not-started" ||
    value === "in-progress" ||
    value === "completed"
  );
}

function isSortFilter(value: string | null): value is SortFilter {
  return (
    value === "subject-topic" ||
    value === "catalog" ||
    value === "title" ||
    value === "study-time"
  );
}

function isInProgressStatus(status: ReturnType<typeof getConceptProgressSummary>["status"]) {
  return status === "started" || status === "practiced";
}

function buildTrackMemberships(starterTracks: StarterTrackSummary[]) {
  const memberships = new Map<string, ConceptTrackMembership[]>();

  for (const track of starterTracks) {
    track.concepts.forEach((concept, index) => {
      const currentMemberships = memberships.get(concept.slug) ?? [];

      currentMemberships.push({
        trackSlug: track.slug,
        trackTitle: track.title,
        stepIndex: index,
        totalSteps: track.concepts.length,
      });

      memberships.set(concept.slug, currentMemberships);
    });
  }

  return memberships;
}

function compareConceptsForQuickStart(left: ConceptSummary, right: ConceptSummary) {
  const leftHero = left.heroConcept ? 0 : 1;
  const rightHero = right.heroConcept ? 0 : 1;

  if (leftHero !== rightHero) {
    return leftHero - rightHero;
  }

  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

function getContextualQuickStartConcept(
  concepts: ConceptSummary[],
  fallback: ConceptSummary | null,
  subject: string,
  topic: string,
  resolveSubjectSlug: (title: string) => string | null,
  resolveTopicSlug: (title: string) => string | null,
) {
  const scopedConcepts = concepts
    .filter(
      (concept) =>
        (subject === DEFAULT_SUBJECT || resolveSubjectSlug(concept.subject) === subject) &&
        (topic === DEFAULT_TOPIC || resolveTopicSlug(concept.topic) === topic),
    )
    .sort(compareConceptsForQuickStart);

  if (!scopedConcepts.length) {
    return fallback;
  }

  if (
    fallback &&
    (subject === DEFAULT_SUBJECT || resolveSubjectSlug(fallback.subject) === subject) &&
    (topic === DEFAULT_TOPIC || resolveTopicSlug(fallback.topic) === topic)
  ) {
    return fallback;
  }

  return scopedConcepts[0] ?? fallback;
}

function getContextualGuidedTrack(
  starterTracks: StarterTrackSummary[],
  fallback: StarterTrackSummary | null,
  subject: string,
  topic: string,
  resolveSubjectSlug: (title: string) => string | null,
  resolveTopicSlug: (title: string) => string | null,
) {
  if (!fallback) {
    return null;
  }

  const matchingTracks = starterTracks.filter((track) => {
    const matchesSubject =
      subject === DEFAULT_SUBJECT ||
      track.concepts.some((concept) => resolveSubjectSlug(concept.subject) === subject);
    const matchesTopic =
      topic === DEFAULT_TOPIC ||
      track.concepts.some((concept) => resolveTopicSlug(concept.topic) === topic);

    return matchesSubject && matchesTopic;
  });

  if (!matchingTracks.length) {
    return fallback;
  }

  if (fallback && matchingTracks.some((track) => track.slug === fallback.slug)) {
    return fallback;
  }

  return matchingTracks[0] ?? fallback;
}

function matchesSearch(
  concept: ConceptSummary,
  trackMemberships: ConceptTrackMembership[],
  search: string,
  searchableTerms: string[] = [],
) {
  const value = search.trim().toLowerCase();

  if (!value) {
    return true;
  }

  return [
    concept.title,
    concept.shortTitle ?? "",
    concept.subject,
    concept.topic,
    concept.subtopic ?? "",
    concept.difficulty,
    concept.summary,
    concept.slug,
    ...concept.highlights,
    ...(concept.tags ?? []),
    ...trackMemberships.map((membership) => membership.trackTitle),
    ...searchableTerms,
  ].some((field) => field.toLowerCase().includes(value));
}

function getProgressCounts(
  entries: Array<{
    progress: ReturnType<typeof getConceptProgressSummary>;
  }>,
) {
  return {
    all: entries.length,
    "not-started": entries.filter((entry) => entry.progress.status === "not-started").length,
    "in-progress": entries.filter((entry) => isInProgressStatus(entry.progress.status)).length,
    completed: entries.filter((entry) => entry.progress.status === "completed").length,
  };
}

function getNextRecommendedConcept(
  currentConcept: ConceptSummary | null,
  conceptsBySlug: Map<string, ConceptSummary>,
  progressSnapshot: ProgressSnapshot,
  locale: AppLocale,
  t: ReturnType<typeof useTranslations<"ConceptLibrary">>,
) {
  if (!currentConcept?.recommendedNext?.length) {
    return null;
  }

  for (const recommendation of currentConcept.recommendedNext) {
    const recommendedConcept = conceptsBySlug.get(recommendation.slug);

    if (!recommendedConcept) {
      continue;
    }

    const progress = getConceptProgressSummary(progressSnapshot, recommendedConcept);

    if (progress.status === "completed") {
      continue;
    }

    return {
      concept: recommendedConcept,
      note: recommendation.reasonLabel
        ? t("recommendations.notes.nextFromReason", {
            reason:
              getConceptDisplayRecommendedNextReasonLabel(
                currentConcept,
                recommendation,
                locale,
              ) ?? recommendation.reasonLabel,
            current: getConceptDisplayTitle(currentConcept, locale),
          })
        : t("recommendations.notes.nextAuthoredRecommendation", {
            recommended: getConceptDisplayTitle(recommendedConcept, locale),
            current: getConceptDisplayTitle(currentConcept, locale),
          }),
    };
  }

  return null;
}

export function ConceptLibraryBrowser({
  concepts,
  starterTracks,
  subjects,
  topics,
  quickStartConcept = null,
  guidedTrack = null,
  initialSyncedSnapshot = null,
}: ConceptLibraryBrowserProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptLibrary");
  const tProgress = useTranslations("ProgressCopy");
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const subjectByTitle = useMemo(
    () => new Map(subjects.map((item) => [item.title, item] as const)),
    [subjects],
  );
  const subjectBySlug = useMemo(
    () => new Map(subjects.map((item) => [item.slug, item] as const)),
    [subjects],
  );
  const topicByTitle = useMemo(
    () => new Map(topics.map((item) => [item.title, item] as const)),
    [topics],
  );
  const topicBySlug = useMemo(
    () => new Map(topics.map((item) => [item.slug, item] as const)),
    [topics],
  );
  const resolveSubjectSlug = useCallback(
    (title: string) => subjectByTitle.get(title)?.slug ?? null,
    [subjectByTitle],
  );
  const resolveTopicSlug = useCallback(
    (title: string) => topicByTitle.get(title)?.slug ?? null,
    [topicByTitle],
  );
  const subjectFilterOptions = useMemo(
    () => [
      {
        value: DEFAULT_SUBJECT,
        count: concepts.length,
      },
      ...subjects.map((subject) => ({
        value: subject.slug,
        count: concepts.filter((concept) => concept.subject === subject.title).length,
      })),
    ],
    [concepts, subjects],
  );
  const subjectFilters = useMemo(
    () => subjectFilterOptions.map((item) => item.value),
    [subjectFilterOptions],
  );
  const availableTrackSlugs = useMemo(
    () => new Set(starterTracks.map((track) => track.slug)),
    [starterTracks],
  );
  const allTopicFilterOptions = useMemo(() => {
    return [
      {
        value: DEFAULT_TOPIC,
        count: concepts.length,
      },
      ...topics.map((topic) => ({
        value: topic.slug,
        count: concepts.filter((concept) => concept.topic === topic.title).length,
      })),
    ];
  }, [concepts, topics]);
  const allTopicFilters = useMemo(() => allTopicFilterOptions.map((item) => item.value), [
    allTopicFilterOptions,
  ]);
  const normalizedQueryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const normalizedSearch = params.get("q")?.trim() ?? "";
    const requestedSubject = params.get("subject");
    const normalizedSubject =
      requestedSubject && subjectFilters.includes(requestedSubject)
        ? requestedSubject
        : DEFAULT_SUBJECT;
    const activeSubject = subjectBySlug.get(normalizedSubject);
    const availableTopics = [
      DEFAULT_TOPIC,
      ...topics
        .filter((topic) => (activeSubject ? topic.subject === activeSubject.title : true))
        .map((topic) => topic.slug),
    ];
    const requestedTopic = params.get("topic");
    const normalizedTopic =
      requestedTopic && availableTopics.includes(requestedTopic)
        ? requestedTopic
        : DEFAULT_TOPIC;
    const requestedTrack = params.get("track");
    const normalizedTrack =
      requestedTrack && availableTrackSlugs.has(requestedTrack)
        ? requestedTrack
        : DEFAULT_TRACK;
    const requestedProgress = params.get("progress");
    const normalizedProgress = isProgressFilter(requestedProgress)
      ? requestedProgress
      : DEFAULT_PROGRESS_FILTER;
    const requestedSort = params.get("sort");
    const normalizedSort = isSortFilter(requestedSort)
      ? requestedSort
      : DEFAULT_SORT_FILTER;

    return {
      search: normalizedSearch,
      subject: normalizedSubject,
      topic: normalizedTopic,
      track: normalizedTrack,
      progressFilter: normalizedProgress,
      sortFilter: normalizedSort,
    };
  }, [availableTrackSlugs, searchParamsString, subjectBySlug, subjectFilters, topics]);
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSnapshot = progressDisplay.snapshot;
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const [search, setSearch] = useState(normalizedQueryState.search);
  const [subject, setSubject] = useState<string>(normalizedQueryState.subject);
  const topicFilterOptions = useMemo(() => {
    const activeSubject = subjectBySlug.get(subject);
    const scopedConcepts = concepts.filter((concept) =>
      activeSubject ? concept.subject === activeSubject.title : true,
    );

    return [
      {
        value: DEFAULT_TOPIC,
        count: scopedConcepts.length,
      },
      ...topics
        .filter((topic) => (activeSubject ? topic.subject === activeSubject.title : true))
        .map((topic) => ({
          value: topic.slug,
          count: scopedConcepts.filter((concept) => concept.topic === topic.title).length,
        })),
    ];
  }, [concepts, subject, subjectBySlug, topics]);
  const [topic, setTopic] = useState<string>(normalizedQueryState.topic);
  const [track, setTrack] = useState<TrackFilter>(normalizedQueryState.track);
  const [showMoreFilters, setShowMoreFilters] = useState(
    normalizedQueryState.track !== DEFAULT_TRACK,
  );
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>(
    normalizedQueryState.progressFilter,
  );
  const [sortFilter, setSortFilter] = useState<SortFilter>(normalizedQueryState.sortFilter);
  const activeSubjectSummary =
    subject !== DEFAULT_SUBJECT ? subjectBySlug.get(subject) ?? null : null;
  const activeTopicSummary =
    topic !== DEFAULT_TOPIC ? topicBySlug.get(topic) ?? null : null;
  const activeSubjectDisplayTitle = activeSubjectSummary
    ? getSubjectDisplayTitle(activeSubjectSummary, locale)
    : null;
  const activeTopicDisplayTitle = activeTopicSummary
    ? getTopicDisplayTitle(activeTopicSummary, locale)
    : null;

  useEffect(() => {
    // The search params are external navigation state, so the local filter controls
    // need one synchronous hydration pass whenever the canonical URL changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(normalizedQueryState.search);
    setSubject(normalizedQueryState.subject);
    setTopic(normalizedQueryState.topic);
    setTrack(normalizedQueryState.track);
    setProgressFilter(normalizedQueryState.progressFilter);
    setSortFilter(normalizedQueryState.sortFilter);

    if (normalizedQueryState.track !== DEFAULT_TRACK) {
      setShowMoreFilters(true);
    }
  }, [normalizedQueryState]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParamsString);
    const normalizedSearch = search.trim();

    if (normalizedSearch) {
      nextParams.set("q", normalizedSearch);
    } else {
      nextParams.delete("q");
    }

    if (subject !== DEFAULT_SUBJECT) {
      nextParams.set("subject", subject);
    } else {
      nextParams.delete("subject");
    }

    if (topic !== DEFAULT_TOPIC) {
      nextParams.set("topic", topic);
    } else {
      nextParams.delete("topic");
    }

    if (track !== DEFAULT_TRACK) {
      nextParams.set("track", track);
    } else {
      nextParams.delete("track");
    }

    if (progressFilter !== DEFAULT_PROGRESS_FILTER) {
      nextParams.set("progress", progressFilter);
    } else {
      nextParams.delete("progress");
    }

    if (sortFilter !== DEFAULT_SORT_FILTER) {
      nextParams.set("sort", sortFilter);
    } else {
      nextParams.delete("sort");
    }

    const nextQuery = nextParams.toString();

    if (nextQuery === searchParamsString) {
      return;
    }

    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }, [
    pathname,
    progressFilter,
    router,
    search,
    searchParamsString,
    sortFilter,
    subject,
    topic,
    track,
  ]);

  const trackMembershipsBySlug = useMemo(
    () => buildTrackMemberships(starterTracks),
    [starterTracks],
  );
  const conceptEntries = useMemo(
    () =>
      concepts.map((concept) => ({
        concept,
        progress: getConceptProgressSummary(progressSnapshot, concept),
        trackMemberships: trackMembershipsBySlug.get(concept.slug) ?? [],
      })),
    [concepts, progressSnapshot, trackMembershipsBySlug],
  );
  const conceptsBySlug = useMemo(
    () => new Map(concepts.map((concept) => [concept.slug, concept])),
    [concepts],
  );
  const progressCounts = useMemo(() => getProgressCounts(conceptEntries), [conceptEntries]);
  const continueLearning = useMemo(
    () => selectContinueLearning(progressSnapshot, concepts, 3),
    [concepts, progressSnapshot],
  );
  const reviewQueue = useMemo(
    () => selectAdaptiveReviewQueue(progressSnapshot, concepts, starterTracks, 2, { locale }),
    [concepts, locale, progressSnapshot, starterTracks],
  );
  const currentConcept =
    conceptsBySlug.get(continueLearning.primary?.concept.slug ?? "") ?? null;
  const nextRecommendation = useMemo(
    () =>
      getNextRecommendedConcept(
        currentConcept,
        conceptsBySlug,
        progressSnapshot,
        locale,
        t,
      ),
    [conceptsBySlug, currentConcept, locale, progressSnapshot, t],
  );
  const hasRecordedProgress = conceptEntries.some(
    (entry) => entry.progress.status !== "not-started",
  );
  const contextualQuickStartConcept = useMemo(
    () =>
      getContextualQuickStartConcept(
        concepts,
        quickStartConcept,
        subject,
        topic,
        resolveSubjectSlug,
        resolveTopicSlug,
      ),
    [concepts, quickStartConcept, resolveSubjectSlug, resolveTopicSlug, subject, topic],
  );
  const contextualGuidedTrack = useMemo(
    () =>
      getContextualGuidedTrack(
        starterTracks,
        guidedTrack,
        subject,
        topic,
        resolveSubjectSlug,
        resolveTopicSlug,
      ),
    [guidedTrack, resolveSubjectSlug, resolveTopicSlug, starterTracks, subject, topic],
  );
  const primaryResurfacingCue = continueLearning.primary
    ? getConceptResurfacingCue(continueLearning.primary)
    : null;

  const recommendationCards = useMemo(() => {
    const cards: RecommendationCard[] = [];

    if (continueLearning.primary) {
      const lastActiveLabel = formatProgressMonthDay(
        continueLearning.primary.lastActivityAt,
        progressSource,
        locale,
      );
      const progressScopeLabel = usingSyncedSnapshot
        ? t("recommendations.progressScopes.saved")
        : t("recommendations.progressScopes.browser");

      cards.push({
        eyebrow: t("recommendations.eyebrows.continue"),
        title:
          (currentConcept ? getConceptDisplayTitle(currentConcept, locale) : null) ??
          continueLearning.primary.concept.title ??
          continueLearning.primary.concept.slug,
        note: lastActiveLabel
          ? t("recommendations.notes.continueWithDate", {
              reason:
                !useGenericProgressCopy && primaryResurfacingCue?.reason
                  ? `${primaryResurfacingCue.reason} `
                  : "",
              scope: progressScopeLabel,
              date: lastActiveLabel,
            })
          : (!useGenericProgressCopy ? primaryResurfacingCue?.reason : null) ??
            t("recommendations.notes.continue", {
              scope: progressScopeLabel,
            }),
        href: `/concepts/${continueLearning.primary.concept.slug}`,
        actionLabel: t("recommendations.actions.continueConcept"),
        targetSlug: continueLearning.primary.concept.slug,
      });
    }

    const weakAreaCandidate = reviewQueue.find(
      (item) => item.concept.slug !== continueLearning.primary?.concept.slug,
    );

    if (weakAreaCandidate) {
      const weakAreaCue = getWeakAreaCueLabel(weakAreaCandidate, t);
      cards.push({
        eyebrow: weakAreaCue.label,
        title: getConceptDisplayTitle(weakAreaCandidate.concept, locale),
        note: useGenericProgressCopy
          ? tProgress(getProgressReasonKey(weakAreaCandidate.reasonKind))
          : weakAreaCandidate.reason,
        href: weakAreaCandidate.primaryAction.href,
        actionLabel: useGenericProgressCopy
          ? tProgress(
              getProgressActionKey(weakAreaCandidate.primaryAction.kind, {
                conceptStatus: weakAreaCandidate.progress.status,
              }),
            )
          : weakAreaCandidate.primaryAction.label,
        targetSlug: weakAreaCandidate.concept.slug,
      });
    }

    if (
      nextRecommendation &&
      nextRecommendation.concept.slug !== continueLearning.primary?.concept.slug &&
      nextRecommendation.concept.slug !== weakAreaCandidate?.concept.slug
    ) {
      cards.push({
        eyebrow: t("recommendations.eyebrows.nextRecommended"),
        title: getConceptDisplayTitle(nextRecommendation.concept, locale),
        note: useGenericProgressCopy
          ? tProgress("descriptions.nextRecommendation")
          : nextRecommendation.note,
        href: `/concepts/${nextRecommendation.concept.slug}`,
        actionLabel: t("recommendations.actions.openNextConcept"),
        targetSlug: nextRecommendation.concept.slug,
      });
    }

    if (!hasRecordedProgress && contextualQuickStartConcept) {
      cards.push({
        eyebrow: t("recommendations.eyebrows.goodFirstConcept"),
        title: getConceptDisplayTitle(contextualQuickStartConcept, locale),
        note: t("recommendations.notes.goodFirstConcept"),
        href: `/concepts/${contextualQuickStartConcept.slug}`,
        actionLabel: t("recommendations.actions.startTitle", {
          title: getConceptDisplayShortTitle(contextualQuickStartConcept, locale),
        }),
        targetSlug: contextualQuickStartConcept.slug,
      });
    }

    return cards.slice(0, hasRecordedProgress ? 3 : 2);
  }, [
    continueLearning.primary,
    currentConcept,
    contextualQuickStartConcept,
    hasRecordedProgress,
    nextRecommendation,
    primaryResurfacingCue,
    progressSource,
    reviewQueue,
    locale,
    t,
    tProgress,
    useGenericProgressCopy,
    usingSyncedSnapshot,
  ]);

  const conceptCues = useMemo(() => {
    const cues = new Map<string, { label: string; note?: string; tone?: "teal" | "amber" | "coral" | "sky" }>();

    if (continueLearning.primary) {
      cues.set(continueLearning.primary.concept.slug, {
        label: t("cueLabels.continueHere"),
        tone: "teal",
        note: primaryResurfacingCue && !useGenericProgressCopy
          ? t("cueNotes.continueHereWithReason", {
              reason: primaryResurfacingCue.reason,
              scope: usingSyncedSnapshot
                ? t("recommendations.progressScopes.saved")
                : t("cueNotes.localProgressScope"),
            })
          : t("cueNotes.continueHere", {
              scope: usingSyncedSnapshot
                ? t("recommendations.progressScopes.saved")
                : t("cueNotes.localProgressScope"),
            }),
      });
    }

    for (const item of reviewQueue) {
      if (cues.has(item.concept.slug)) {
        continue;
      }

      const localizedWeakAreaCue = getWeakAreaCueLabel(item, t);
      cues.set(item.concept.slug, {
        label: localizedWeakAreaCue.label,
        tone: localizedWeakAreaCue.tone,
        note: useGenericProgressCopy
          ? tProgress(getProgressReasonKey(item.reasonKind))
          : item.reason,
      });
    }

    if (
      nextRecommendation &&
      nextRecommendation.concept.slug !== continueLearning.primary?.concept.slug &&
      !cues.has(nextRecommendation.concept.slug)
    ) {
      cues.set(nextRecommendation.concept.slug, {
        label: t("cueLabels.nextRecommended"),
        tone: "sky",
        note: useGenericProgressCopy
          ? tProgress("descriptions.nextRecommendation")
          : nextRecommendation.note,
      });
    }

    return cues;
  }, [
    continueLearning.primary,
    nextRecommendation,
    primaryResurfacingCue,
    reviewQueue,
    t,
    tProgress,
    useGenericProgressCopy,
    usingSyncedSnapshot,
  ]);

  const filtered = conceptEntries.filter(({ concept, progress, trackMemberships }) => {
    const matchesSubject =
      subject === DEFAULT_SUBJECT ? true : resolveSubjectSlug(concept.subject) === subject;
    const matchesTopic = topic === DEFAULT_TOPIC ? true : resolveTopicSlug(concept.topic) === topic;
    const matchesTrack =
      track === DEFAULT_TRACK
        ? true
        : trackMemberships.some((membership) => membership.trackSlug === track);
    const matchesProgress =
      progressFilter === DEFAULT_PROGRESS_FILTER
        ? true
        : progressFilter === "in-progress"
          ? isInProgressStatus(progress.status)
          : progress.status === progressFilter;

    return (
      matchesSubject &&
      matchesTopic &&
      matchesTrack &&
      matchesProgress &&
      matchesSearch(concept, trackMemberships, search, [
        getConceptDisplayTitle(concept, locale),
        getConceptDisplayShortTitle(concept, locale),
        getConceptDisplaySummary(concept, locale),
        getConceptDisplaySubtopic(concept, locale) ?? "",
        ...getConceptDisplayHighlights(concept, locale),
        concept.subject && subjectByTitle.get(concept.subject)
          ? getSubjectDisplayTitle(subjectByTitle.get(concept.subject)!, locale)
          : concept.subject,
        concept.topic && topicByTitle.get(concept.topic)
          ? getTopicDisplayTitle(topicByTitle.get(concept.topic)!, locale)
          : concept.topic,
      ])
    );
  });

  const sorted = useMemo(() => {
    const entries = [...filtered];
    const subjectOrder = new Map(
      subjectFilters
        .filter((item): item is string => item !== DEFAULT_SUBJECT)
        .map((item, index) => [item, index]),
    );
    const topicOrder = new Map(
      allTopicFilters
        .filter((item): item is string => item !== DEFAULT_TOPIC)
        .map((item, index) => [item, index]),
    );

    entries.sort((left, right) => {
      if (sortFilter === "title") {
        return left.concept.title.localeCompare(right.concept.title);
      }

      if (sortFilter === "study-time") {
        const leftStudyMinutes = left.concept.estimatedStudyMinutes ?? Number.MAX_SAFE_INTEGER;
        const rightStudyMinutes = right.concept.estimatedStudyMinutes ?? Number.MAX_SAFE_INTEGER;

        if (leftStudyMinutes !== rightStudyMinutes) {
          return leftStudyMinutes - rightStudyMinutes;
        }

        return left.concept.title.localeCompare(right.concept.title);
      }

      if (sortFilter === "subject-topic") {
        const subjectComparison =
          (subjectOrder.get(resolveSubjectSlug(left.concept.subject) ?? "") ??
            Number.MAX_SAFE_INTEGER) -
          (subjectOrder.get(resolveSubjectSlug(right.concept.subject) ?? "") ??
            Number.MAX_SAFE_INTEGER);

        if (subjectComparison !== 0) {
          return subjectComparison;
        }

        const topicComparison =
          (topicOrder.get(resolveTopicSlug(left.concept.topic) ?? "") ??
            Number.MAX_SAFE_INTEGER) -
          (topicOrder.get(resolveTopicSlug(right.concept.topic) ?? "") ??
            Number.MAX_SAFE_INTEGER);

        if (topicComparison !== 0) {
          return topicComparison;
        }
      }

      const leftSequence = left.concept.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.concept.sequence ?? Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.concept.title.localeCompare(right.concept.title);
    });

    return entries;
  }, [allTopicFilters, filtered, resolveSubjectSlug, resolveTopicSlug, sortFilter, subjectFilters]);

  const groupedBySubjectAndTopic = useMemo(() => {
    if (sortFilter !== "subject-topic") {
      return [];
    }

    const groups = new Map<
      string,
      {
        subject: string;
        topics: Array<{
          topic: string;
          entries: typeof sorted;
        }>;
      }
    >();

    for (const entry of sorted) {
      const subjectKey = resolveSubjectSlug(entry.concept.subject) ?? entry.concept.subject;
      const subjectGroup =
        groups.get(subjectKey) ??
        {
          subject: subjectKey,
          topics: [],
        };

      let topicGroup = subjectGroup.topics.find(
        (currentTopic) =>
          currentTopic.topic === (resolveTopicSlug(entry.concept.topic) ?? entry.concept.topic),
      );

      if (!topicGroup) {
        topicGroup = {
          topic: resolveTopicSlug(entry.concept.topic) ?? entry.concept.topic,
          entries: [],
        };
        subjectGroup.topics.push(topicGroup);
      }

      topicGroup.entries.push(entry);
      groups.set(subjectKey, subjectGroup);
    }

    return [...groups.values()];
  }, [resolveSubjectSlug, resolveTopicSlug, sortFilter, sorted]);

  const progressFilters: Array<{
    id: ProgressFilter;
    label: string;
    count: number;
  }> = [
    { id: DEFAULT_PROGRESS_FILTER, label: t("filters.progress.all"), count: progressCounts.all },
    {
      id: "not-started",
      label: t("filters.progress.notStarted"),
      count: progressCounts["not-started"],
    },
    {
      id: "in-progress",
      label: t("filters.progress.inProgress"),
      count: progressCounts["in-progress"],
    },
    {
      id: "completed",
      label: t("filters.progress.completed"),
      count: progressCounts.completed,
    },
  ];
  const trackFilters = [
    { id: DEFAULT_TRACK, label: t("filters.track.all"), count: concepts.length },
    ...starterTracks.map((starterTrack) => ({
      id: starterTrack.slug,
      label: getStarterTrackDisplayTitle(starterTrack, locale),
      count: starterTrack.concepts.length,
    })),
  ];
  const activeTrackLabel =
    track === DEFAULT_TRACK
      ? null
      : trackFilters.find((item) => item.id === track)?.label ?? null;
  const resetAllFilters = useCallback(() => {
    setSearch("");
    setSubject(DEFAULT_SUBJECT);
    setTopic(DEFAULT_TOPIC);
    setTrack(DEFAULT_TRACK);
    setProgressFilter(DEFAULT_PROGRESS_FILTER);
    setSortFilter(DEFAULT_SORT_FILTER);
    setShowMoreFilters(false);
  }, []);
  const resetSubjectAndTopicFilters = useCallback(() => {
    setSubject(DEFAULT_SUBJECT);
    setTopic(DEFAULT_TOPIC);
  }, []);
  const resetExtraFilters = useCallback(() => {
    setTrack(DEFAULT_TRACK);
    setProgressFilter(DEFAULT_PROGRESS_FILTER);
    setSortFilter(DEFAULT_SORT_FILTER);
    setShowMoreFilters(false);
  }, []);
  const sortFilterOptions = [
    { value: "subject-topic", label: t("filters.sort.subjectTopic") },
    { value: "catalog", label: t("filters.sort.catalog") },
    { value: "title", label: t("filters.sort.title") },
    { value: "study-time", label: t("filters.sort.studyTime") },
  ] as const;
  const hasSearchFilter = search.trim().length > 0;
  const hasSubjectTopicFilters =
    subject !== DEFAULT_SUBJECT || topic !== DEFAULT_TOPIC;
  const hasExtraFilters =
    track !== DEFAULT_TRACK ||
    progressFilter !== DEFAULT_PROGRESS_FILTER ||
    sortFilter !== DEFAULT_SORT_FILTER;
  const hasActiveFilters =
    hasSearchFilter || hasSubjectTopicFilters || hasExtraFilters;
  const showSubjectJumpLinks =
    sorted.length > 0 &&
    sortFilter === "subject-topic" &&
    groupedBySubjectAndTopic.length > 1;
  const filterSummary = [
    subject !== DEFAULT_SUBJECT ? activeSubjectDisplayTitle ?? subject : null,
    topic !== DEFAULT_TOPIC ? activeTopicDisplayTitle ?? topic : null,
    activeTrackLabel,
    progressFilter !== DEFAULT_PROGRESS_FILTER
      ? t(`filters.progress.${getProgressFilterLabel(progressFilter)}`)
      : null,
    sortFilter !== DEFAULT_SORT_FILTER
      ? t(`filters.sort.${getSortFilterLabel(sortFilter)}`)
      : null,
    search.trim() ? `"${search.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const emptyStateTitle = hasActiveFilters
    ? t("empty.titleFiltered", {
        summary: filterSummary || t("empty.thisView"),
      })
    : t("empty.title");
  const emptyStateNote =
    search.trim().length > 0
      ? t("empty.noteSearch")
      : subject !== DEFAULT_SUBJECT || topic !== DEFAULT_TOPIC
        ? t("empty.noteSubjectTopic")
        : t("empty.noteExtraFilters");
  const [primaryRecommendation, ...secondaryRecommendations] = recommendationCards;
  const primaryRecommendationConcept = primaryRecommendation
    ? conceptsBySlug.get(primaryRecommendation.targetSlug)
    : null;
  const primaryRecommendationVisual = primaryRecommendationConcept
    ? getConceptVisualDescriptor(primaryRecommendationConcept)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(19rem,0.86fr)] xl:items-start">
        <section id="concept-library" className="motion-enter motion-card filter-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="lab-label">{t("hero.eyebrow")}</p>
              <h1 className="text-[2rem] font-semibold text-ink-950">
                {t("hero.title")}
              </h1>
              <p className="text-base leading-7 text-ink-700">
                {hasActiveFilters
                  ? t("hero.filteredView", { summary: filterSummary })
                  : t("hero.defaultView")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-500">
                {t("hero.resultsCount", { count: sorted.length, total: concepts.length })}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="cta-secondary min-h-11 px-4 py-2"
                >
                  {t("actions.resetAll")}
                </button>
              ) : null}
            </div>
          </div>

          {primaryRecommendation ? (
            <article className="motion-enter motion-card mt-4 grid gap-4 rounded-[26px] border border-line bg-ink-950 p-4 text-paper-strong shadow-surface sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center">
              <LearningVisual
                kind={primaryRecommendationVisual?.kind ?? "simulation"}
                motif={primaryRecommendationVisual?.motif}
                isFallback={primaryRecommendationVisual?.isFallback ?? false}
                tone={primaryRecommendationVisual?.tone ?? "teal"}
                compact
                className="h-24 border-white/15 bg-white/10 text-white"
              />
              <div className="min-w-0">
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/65">
                  {primaryRecommendation.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold sm:text-xl">
                  {primaryRecommendation.title}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-white/80 sm:leading-6">
                  {primaryRecommendation.note}
                </p>
                <Link
                  href={primaryRecommendation.href}
                  data-testid="library-primary-cta"
                  className="motion-button-solid mt-4 inline-flex items-center justify-center rounded-full bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950"
                  style={{ color: "var(--ink-950)" }}
                >
                  <span className="text-ink-950">
                    {primaryRecommendation.actionLabel.trim() || t("recommendations.actions.continueConcept")}
                  </span>
                </Link>
              </div>
            </article>
          ) : null}

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.24fr)_minmax(0,0.76fr)]">
            <label className="block">
              <span className="sr-only">{t("hero.searchAria")}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeSubjectDisplayTitle
                    ? t("hero.searchInsideSubject", { subject: activeSubjectDisplayTitle })
                    : t("hero.searchPlaceholder")
                }
                aria-describedby="concept-library-help"
                className="w-full rounded-[22px] border border-line bg-paper-strong px-4 py-3 text-base text-ink-950 outline-none transition-colors placeholder:text-ink-500 focus:border-teal-500"
              />
            </label>

            <div className="rounded-[22px] border border-line bg-paper px-4 py-3 text-base text-ink-700">
              <p className="lab-label">
                {t("hero.workspaceCues")}
              </p>
              <p className="mt-1.5 leading-7">
                {t("hero.workspaceCuesDescription")}
              </p>
            </div>
          </div>
          <p id="concept-library-help" className="sr-only">
            {t("hero.searchHelp")}
          </p>

          <div className="mt-4 space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <DiscoveryFilterSelect
                label={t("filters.subject.label")}
                value={subject}
                options={subjectFilterOptions.map((option) => ({
                  value: option.value,
                  label:
                    option.value === DEFAULT_SUBJECT
                      ? t("filters.subject.all")
                      : subjectBySlug.get(option.value)
                        ? getSubjectDisplayTitle(subjectBySlug.get(option.value)!, locale)
                        : option.value,
                  count: option.count,
                }))}
                onChange={(nextValue) => {
                  setSubject(nextValue);
                  setTopic(DEFAULT_TOPIC);
                }}
              />
              <DiscoveryFilterSelect
                label={t("filters.topic.label")}
                value={topic}
                options={topicFilterOptions.map((option) => ({
                  value: option.value,
                  label:
                    option.value === DEFAULT_TOPIC
                      ? t("filters.topic.all")
                      : topicBySlug.get(option.value)
                        ? getTopicDisplayTitle(topicBySlug.get(option.value)!, locale)
                        : option.value,
                  count: option.count,
                }))}
                onChange={setTopic}
              />
              <DiscoveryFilterSelect
                label={t("filters.progress.label")}
                value={progressFilter}
                options={progressFilters.map((item) => ({
                  value: item.id,
                  label: item.label,
                  count: item.count,
                }))}
                onChange={(nextValue) => setProgressFilter(nextValue as ProgressFilter)}
              />
              <DiscoveryFilterSelect
                label={t("filters.sort.label")}
                value={sortFilter}
                options={sortFilterOptions.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                onChange={(nextValue) => setSortFilter(nextValue as SortFilter)}
              />
            </div>

            <div className="rounded-[22px] border border-line bg-paper px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="lab-label">
                    {t("hero.resultsCount", { count: sorted.length, total: concepts.length })}
                  </p>
                  <p aria-live="polite" className="text-sm leading-6 text-ink-700">
                    {hasActiveFilters
                      ? t("hero.filteredView", { summary: filterSummary })
                      : t("hero.defaultView")}
                  </p>
                </div>
                {hasActiveFilters ? (
                  <div className="flex flex-wrap gap-3">
                    {hasSearchFilter ? (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.clearSearch")}
                      </button>
                    ) : null}
                    {hasSubjectTopicFilters ? (
                      <button
                        type="button"
                        onClick={resetSubjectAndTopicFilters}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.resetSubjectTopic")}
                      </button>
                    ) : null}
                    {hasExtraFilters ? (
                      <button
                        type="button"
                        onClick={resetExtraFilters}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.clearExtraFilters")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="cta-secondary min-h-11 px-4 py-2"
                    >
                      {t("actions.resetAll")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <details
              open={showMoreFilters}
              onToggle={(event) => setShowMoreFilters(event.currentTarget.open)}
              className="rounded-[22px] border border-line bg-paper-strong px-4 py-3"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-ink-950">
                {t("filters.more.title")}
                <span className="ml-2 font-normal text-ink-600">
                  {activeTrackLabel ?? t("filters.more.description")}
                </span>
              </summary>
              <div className="mt-3">
                <DiscoveryFilterSelect
                  label={t("filters.more.title")}
                  value={track}
                  options={trackFilters.map((item) => ({
                    value: item.id,
                    label: item.label,
                    count: item.count,
                  }))}
                  onChange={(nextValue) => {
                    setTrack(nextValue as TrackFilter);
                    setShowMoreFilters(true);
                  }}
                />
              </div>
            </details>
          </div>
        </section>

        {secondaryRecommendations.length || (!hasRecordedProgress && contextualGuidedTrack) ? (
          <MotionStaggerGroup className="grid gap-3 xl:self-start" baseDelay={120}>
            {secondaryRecommendations.map((card) => (
              <article
                key={card.targetSlug}
                className="motion-enter motion-card rounded-[24px] border border-line bg-paper-elevated/92 p-4 shadow-surface"
              >
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {card.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {card.note}
                </p>
                <Link
                  href={card.href}
                  className="motion-button-outline mt-4 inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950"
                >
                  <span>{card.actionLabel.trim() || t("recommendations.actions.openConcept")}</span>
                </Link>
              </article>
            ))}

            {!hasRecordedProgress && contextualGuidedTrack ? (
              <article className="motion-enter motion-card lab-panel-compact p-4">
                <p className="lab-label">{t("guidedPath.eyebrow")}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink-950">
                  {getStarterTrackDisplayTitle(contextualGuidedTrack, locale)}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {getStarterTrackDisplaySummary(contextualGuidedTrack, locale)}
                </p>
                <StarterTrackEntryLink
                  track={contextualGuidedTrack}
                  labelVariant="named"
                  className="motion-button-outline mt-4 inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20 hover:bg-white"
                />
              </article>
            ) : null}
          </MotionStaggerGroup>
        ) : null}
      </div>

      {sorted.length ? (
        sortFilter === "subject-topic" ? (
          <div className="space-y-5">
            {showSubjectJumpLinks ? (
              <section className="rounded-[22px] border border-line bg-paper px-4 py-4 sm:px-5">
                <p className="lab-label">{t("jump.label")}</p>
                <h2 className="mt-1 text-lg font-semibold text-ink-950">
                  {t("jump.title")}
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
                  {t("jump.summary")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {groupedBySubjectAndTopic.map((subjectGroup) => {
                    const subjectTitle = subjectBySlug.get(subjectGroup.subject)
                      ? getSubjectDisplayTitle(subjectBySlug.get(subjectGroup.subject)!, locale)
                      : subjectGroup.subject;
                    const conceptCount = subjectGroup.topics.reduce(
                      (sum, currentTopic) => sum + currentTopic.entries.length,
                      0,
                    );

                    return (
                      <a
                        key={subjectGroup.subject}
                        href={`#${getConceptLibrarySubjectSectionId(subjectGroup.subject)}`}
                        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-ink-950/20 hover:text-ink-950"
                      >
                        <span>{subjectTitle}</span>
                        <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-600">
                          {t("counts.concepts", { count: conceptCount })}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {groupedBySubjectAndTopic.map((subjectGroup) => (
              <section
                key={subjectGroup.subject}
                id={getConceptLibrarySubjectSectionId(subjectGroup.subject)}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lab-label">
                    {subjectBySlug.get(subjectGroup.subject)
                      ? getSubjectDisplayTitle(subjectBySlug.get(subjectGroup.subject)!, locale)
                      : subjectGroup.subject}
                  </span>
                  <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                    {t("counts.concepts", {
                      count: subjectGroup.topics.reduce(
                        (sum, currentTopic) => sum + currentTopic.entries.length,
                        0,
                      ),
                    })}
                  </span>
                </div>
                <div className="space-y-4">
                  {subjectGroup.topics.map((topicGroup) => (
                    <section
                      key={`${subjectGroup.subject}-${topicGroup.topic}`}
                      className="space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-ink-950">
                          {topicBySlug.get(topicGroup.topic)
                            ? getTopicDisplayTitle(topicBySlug.get(topicGroup.topic)!, locale)
                            : getTopicDisplayTitleFromValue(topicGroup.topic, locale)}
                        </h3>
                        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                          {t("counts.concepts", { count: topicGroup.entries.length })}
                        </span>
                      </div>
                      <MotionStaggerGroup
                        className="grid gap-3 xl:grid-cols-2"
                        baseDelay={140}
                      >
                        {topicGroup.entries.map(({ concept, progress, trackMemberships }) => (
                          <ConceptTile
                            key={concept.slug}
                            concept={concept}
                            layout="list"
                            trackMemberships={trackMemberships}
                            libraryCue={conceptCues.get(concept.slug) ?? null}
                            progressSummary={progress}
                            progressSource={progressSource}
                          />
                        ))}
                      </MotionStaggerGroup>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <MotionStaggerGroup className="grid gap-3 xl:grid-cols-2" baseDelay={140}>
            {sorted.map(({ concept, progress, trackMemberships }) => (
              <ConceptTile
                key={concept.slug}
                concept={concept}
                layout="list"
                trackMemberships={trackMemberships}
                libraryCue={conceptCues.get(concept.slug) ?? null}
                progressSummary={progress}
                progressSource={progressSource}
              />
            ))}
          </MotionStaggerGroup>
        )
      ) : (
        <div className="motion-enter motion-card lab-panel p-8">
          <p className="text-lg font-semibold text-ink-950">{emptyStateTitle}</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{emptyStateNote}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {search.trim() ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/25"
              >
                {t("actions.clearSearch")}
              </button>
            ) : null}
            {subject !== DEFAULT_SUBJECT || topic !== DEFAULT_TOPIC ? (
              <button
                type="button"
                onClick={resetSubjectAndTopicFilters}
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/25"
              >
                {t("actions.resetSubjectTopic")}
              </button>
            ) : null}
            {track !== DEFAULT_TRACK || progressFilter !== DEFAULT_PROGRESS_FILTER || sortFilter !== DEFAULT_SORT_FILTER ? (
              <button
                type="button"
                onClick={resetExtraFilters}
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/25"
              >
                {t("actions.clearExtraFilters")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={resetAllFilters}
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/25"
            >
              {t("actions.resetAll")}
            </button>
            <Link
              href="/concepts/topics"
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/25"
            >
              {t("actions.openTopicDirectory")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
