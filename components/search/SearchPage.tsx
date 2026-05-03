"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import type {
  ExpandedSubjectSpotlight,
  SiteSearchEntry,
  SiteSearchIndex,
  SiteSearchResultKind,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getGoalPathDisplaySummary,
  getGoalPathDisplayTitle,
  getGuidedCollectionDisplaySummary,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
} from "@/lib/i18n/content";
import {
  buildStartLearningResumeSummary,
  getConceptProgressSummary,
  getStarterTrackProgressSummary,
  resolveAccountProgressSnapshot,
  selectContinueLearning,
  selectCurrentTrack,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { searchSiteIndex } from "@/lib/content";
import { DisplayAd } from "@/components/ads/AdSlot";
import { ExpandedSubjectSpotlightGrid } from "@/components/concepts/ExpandedSubjectSpotlightGrid";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { DiscoveryFilterSelect } from "@/components/layout/DiscoveryFilterSelect";
import { PageSection } from "@/components/layout/PageSection";
import { LearningVisual, type LearningVisualDescriptor } from "@/components/visuals/LearningVisual";
import {
  getConceptVisualDescriptor,
  getStarterTrackVisualDescriptor,
  getSubjectVisualDescriptor,
  getTopicVisualDescriptor,
} from "@/components/visuals/learningVisualDescriptors";

type SearchPageProps = {
  index: SiteSearchIndex;
  initialQuery?: string | null;
  initialSubjectSlug?: string | null;
  initialTopic?: string | null;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  expandedSubjectSpotlights?: ExpandedSubjectSpotlight[];
};

const DEFAULT_SUBJECT = "all" as const;
const DEFAULT_TOPIC = "all" as const;
const SEARCH_CONCEPT_BROWSE_DISCLOSURE_ID = "search-concept-browse-disclosure";
const SEARCH_ROUTE_DISCLOSURE_ID = "search-route-disclosure";

const defaultKindOrder: Record<SiteSearchResultKind, number> = {
  subject: 0,
  topic: 1,
  track: 2,
  "guided-collection": 3,
  "goal-path": 4,
  concept: 5,
};

function getSearchResultGroupSectionId(kind: SiteSearchResultKind) {
  return `search-results-${kind}`;
}

function getSearchBrowseSectionId(sectionId: string) {
  return `search-browse-section-${sectionId}`;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

const accentTopClasses: Record<SiteSearchEntry["accent"], string> = {
  teal: "from-teal-500/60 via-teal-500/14 to-transparent",
  amber: "from-amber-500/60 via-amber-500/14 to-transparent",
  coral: "from-coral-500/60 via-coral-500/14 to-transparent",
  sky: "from-sky-500/60 via-sky-500/14 to-transparent",
  ink: "from-ink-950/45 via-ink-950/10 to-transparent",
};

function normalizeQueryValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

type SearchRouteState = {
  query: string;
  subject: string;
  topic: string;
};

type SearchProgressCue =
  | "Continue here"
  | "Current track"
  | "On current track"
  | "Recent subject"
  | "Saved progress";

type DisplaySearchEntry = SiteSearchEntry & {
  displayTitle: string;
  displaySummary: string;
  displayActionLabel: string;
  displayMetadataChips: string[];
  displayPrimarySubjectTitle: string | null;
};

type BrowseConceptCard = {
  entry: DisplaySearchEntry;
  conceptProgress?: ReturnType<typeof getConceptProgressSummary> | null;
  progressCue?: SearchProgressCue | null;
};

type BrowseConceptSection = {
  id: string;
  title: string;
  conceptCards: BrowseConceptCard[];
  links: Array<{ href: string; label: string }>;
};

function getSubjectSummary(index: SiteSearchIndex, subjectSlug: string) {
  if (subjectSlug === DEFAULT_SUBJECT) {
    return null;
  }

  return index.subjects.find((item) => item.slug === subjectSlug) ?? null;
}

function getAvailableTopicValues(index: SiteSearchIndex, subjectSlug: string) {
  const subject = getSubjectSummary(index, subjectSlug);

  return [
    DEFAULT_TOPIC,
    ...index.topics
      .filter((topic) => (subject ? topic.subject === subject.title : true))
      .map((topic) => topic.slug),
  ];
}

function normalizeSearchRouteState(
  index: SiteSearchIndex,
  state: Partial<SearchRouteState>,
): SearchRouteState {
  const query = normalizeQueryValue(state.query);
  const requestedSubject = state.subject ?? DEFAULT_SUBJECT;
  const subject =
    requestedSubject === DEFAULT_SUBJECT ||
    index.subjectOptions.some((option) => option.slug === requestedSubject)
      ? requestedSubject
      : DEFAULT_SUBJECT;
  const requestedTopic = state.topic ?? DEFAULT_TOPIC;
  const availableTopics = getAvailableTopicValues(index, subject);
  const topic = availableTopics.includes(requestedTopic) ? requestedTopic : DEFAULT_TOPIC;

  return {
    query,
    subject,
    topic,
  };
}

function getTrackStatusLabel(
  status: ReturnType<typeof getStarterTrackProgressSummary>["status"],
  t: ReturnType<typeof useTranslations<"SearchPage">>,
) {
  switch (status) {
    case "completed":
      return t("status.trackComplete");
    case "in-progress":
      return t("status.trackInProgress");
    default:
      return t("status.trackNotStarted");
  }
}

function SearchSuggestionChip({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
    >
      {label}
    </Link>
  );
}

function SearchJumpChip({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count: string;
}) {
  const className =
    "inline-flex items-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-ink-950/20 hover:text-ink-950";
  const content = (
    <>
      <span>{label}</span>
      <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-600">
        {count}
      </span>
    </>
  );

  if (href.startsWith("#")) {
    return <a href={href} className={className}>{content}</a>;
  }

  return <Link href={href} className={className}>{content}</Link>;
}

function SearchNavChip({
  href,
  label,
  anchor = false,
}: {
  href: string;
  label: string;
  anchor?: boolean;
}) {
  const className =
    "inline-flex items-center rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-ink-950/20 hover:text-ink-950";

  if (anchor) {
    return <a href={href} className={className}>{label}</a>;
  }

  return <Link href={href} className={className}>{label}</Link>;
}

function getSearchEntryVisualDescriptor(entry: DisplaySearchEntry): LearningVisualDescriptor {
  if (entry.kind === "concept") {
    return getConceptVisualDescriptor({
      slug: entry.slug,
      title: entry.displayTitle,
      subject: entry.displayPrimarySubjectTitle ?? entry.primarySubjectTitle ?? undefined,
      topic: entry.topicTitle ?? undefined,
      accent: entry.accent,
    });
  }

  if (entry.kind === "topic") {
    return getTopicVisualDescriptor({
      slug: entry.slug,
      title: entry.displayTitle,
      subject: entry.displayPrimarySubjectTitle ?? entry.primarySubjectTitle ?? undefined,
      description: entry.displaySummary,
      accent: entry.accent,
    });
  }

  if (entry.kind === "track") {
    return getStarterTrackVisualDescriptor({
      slug: entry.slug,
      title: entry.displayTitle,
      summary: entry.displaySummary,
      accent: entry.accent,
    });
  }

  if (entry.kind === "subject") {
    return getSubjectVisualDescriptor({
      slug: entry.slug,
      title: entry.displayTitle,
      description: entry.displaySummary,
      accent: entry.accent,
    });
  }

  if (entry.topicSlug || entry.topicTitle) {
    return {
      ...getTopicVisualDescriptor({
        slug: entry.topicSlug ?? entry.slug,
        title: entry.topicTitle ?? entry.displayTitle,
        subject: entry.displayPrimarySubjectTitle ?? entry.primarySubjectTitle ?? undefined,
        description: entry.displaySummary,
        accent: entry.accent,
      }),
      kind: "guided",
      label: `${entry.displayTitle} route`,
    };
  }

  return {
    kind: "guided",
    tone: entry.accent,
    isFallback: true,
    fallbackKind: "category-specific",
    label: `${entry.displayTitle} route`,
  };
}

function SearchResultCard({
  entry,
  conceptProgress,
  trackProgress,
  progressSource,
  progressCue,
}: {
  entry: DisplaySearchEntry;
  conceptProgress?: ReturnType<typeof getConceptProgressSummary> | null;
  trackProgress?: ReturnType<typeof getStarterTrackProgressSummary> | null;
  progressSource: "local" | "synced";
  progressCue?: SearchProgressCue | null;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SearchPage");
  const lastProgressDate = conceptProgress
    ? formatProgressMonthDay(conceptProgress.lastActivityAt, progressSource, locale)
    : trackProgress
      ? formatProgressMonthDay(trackProgress.lastActivityAt, progressSource, locale)
      : null;
  const emphasizedCue =
    progressCue === "Continue here"
      ? t("cue.continueHere")
      : progressCue === "Current track"
        ? t("cue.currentTrack")
        : null;
  const visibleMeta = unique([
    entry.displayPrimarySubjectTitle,
    ...entry.displayMetadataChips,
  ]).slice(0, 2);
  const visual = getSearchEntryVisualDescriptor(entry);

  let progressNote: string | null = null;

  if (conceptProgress && conceptProgress.status !== "not-started") {
    if (progressCue === "Continue here") {
      progressNote = lastProgressDate
        ? t("notes.continueSavedProgressWithDate", { date: lastProgressDate })
        : t("notes.continueSavedProgress");
    } else if (progressCue === "On current track") {
      progressNote = lastProgressDate
        ? t("notes.partOfCurrentTrackWithDate", { date: lastProgressDate })
        : t("notes.partOfCurrentTrack");
    } else if (conceptProgress.status === "completed") {
      progressNote = lastProgressDate
        ? t("notes.completedBeforeWithDate", { date: lastProgressDate })
        : t("notes.completedBefore");
    } else {
      progressNote = lastProgressDate
        ? t("notes.inProgressWithDate", { date: lastProgressDate })
        : t("notes.inProgress");
    }
  } else if (trackProgress && trackProgress.status !== "not-started") {
    progressNote = lastProgressDate
      ? t("notes.trackProgressWithDate", {
          status: getTrackStatusLabel(trackProgress.status, t),
          completed: trackProgress.completedFlowCount,
          total: trackProgress.totalFlowCount,
          date: lastProgressDate,
        })
      : t("notes.trackProgress", {
          status: getTrackStatusLabel(trackProgress.status, t),
          completed: trackProgress.completedFlowCount,
          total: trackProgress.totalFlowCount,
        });
  } else if (progressCue === "Recent subject") {
    progressNote = t("notes.matchesRecentSubject");
  }

  return (
    <article className="motion-enter motion-card list-row-card relative overflow-hidden p-5 sm:p-6">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[entry.accent]}`}
      />
      <div className="grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start">
        <LearningVisual
          kind={visual.kind}
          motif={visual.motif}
          overlay={visual.overlay}
          isFallback={visual.isFallback}
          fallbackKind={visual.fallbackKind}
          tone={visual.tone ?? entry.accent}
          ariaLabel={visual.label}
          compact
          className="h-24 rounded-[18px]"
        />
        <div className="min-w-0 space-y-3">
        {emphasizedCue ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
              {emphasizedCue}
            </span>
          </div>
        ) : null}

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-ink-950">{entry.displayTitle}</h2>
          <p className="line-clamp-2 text-sm leading-6 text-ink-700 sm:text-base sm:leading-7">
            {entry.displaySummary}
          </p>
        </div>

        {visibleMeta.length ? (
          <div className="flex flex-wrap gap-2">
            {visibleMeta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {progressNote ? (
          <p className="text-sm leading-5.5 text-ink-600">{progressNote}</p>
        ) : null}

        <Link
          href={entry.href}
          className="cta-secondary"
        >
          {entry.displayActionLabel}
        </Link>
        </div>
      </div>
    </article>
  );
}

function SearchBrowseJumpLinks({
  sections,
  t,
}: {
  sections: BrowseConceptSection[];
  t: ReturnType<typeof useTranslations<"SearchPage">>;
}) {
  if (sections.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-[22px] border border-line bg-paper px-4 py-4 sm:px-5">
      <p className="lab-label">{t("browse.subjectJumpLabel")}</p>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
        {t("browse.subjectJumpSummary")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {sections.map((section) => (
          <SearchJumpChip
            key={`browse-jump:${section.id}`}
            href={`#${getSearchBrowseSectionId(section.id)}`}
            label={section.title}
            count={t("meta.concepts", { count: section.conceptCards.length })}
          />
        ))}
      </div>
    </div>
  );
}

function SearchBrowseSection({
  section,
  progressSource,
  t,
}: {
  section: BrowseConceptSection;
  progressSource: "local" | "synced";
  t: ReturnType<typeof useTranslations<"SearchPage">>;
}) {
  return (
    <section id={getSearchBrowseSectionId(section.id)} className="space-y-3 scroll-mt-24">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="lab-label">{section.title}</p>
          <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
            {t("meta.concepts", { count: section.conceptCards.length })}
          </span>
        </div>
        {section.links.length ? (
          <div className="flex flex-wrap gap-3">
            {section.links.map((item) => (
              <SearchSuggestionChip
                key={`${section.id}:${item.href}:${item.label}`}
                href={item.href}
                label={item.label}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {section.conceptCards.map((card) => (
          <SearchResultCard
            key={card.entry.id}
            entry={card.entry}
            conceptProgress={card.conceptProgress}
            progressSource={progressSource}
            progressCue={card.progressCue}
          />
        ))}
      </div>
    </section>
  );
}

export function SearchPage({
  index,
  initialQuery = null,
  initialSubjectSlug = null,
  initialTopic = null,
  initialSyncedSnapshot = null,
  expandedSubjectSpotlights = [],
}: SearchPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SearchPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const routeState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return normalizeSearchRouteState(index, {
      query: params.get("q") ?? initialQuery ?? "",
      subject: params.get("subject") ?? initialSubjectSlug ?? DEFAULT_SUBJECT,
      topic: params.get("topic") ?? initialTopic ?? DEFAULT_TOPIC,
    });
  }, [
    index,
    initialQuery,
    initialSubjectSlug,
    initialTopic,
    searchParamsString,
  ]);
  const paramsBackedRouteState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return normalizeSearchRouteState(index, {
      query: params.get("q") ?? "",
      subject: params.get("subject") ?? DEFAULT_SUBJECT,
      topic: params.get("topic") ?? DEFAULT_TOPIC,
    });
  }, [index, searchParamsString]);
  const [query, setQuery] = useState(routeState.query);
  const deferredQuery = useDeferredValue(query);

  function buildSearchParamsString(nextState: Partial<SearchRouteState>) {
    const normalizedState = normalizeSearchRouteState(index, nextState);
    const nextParams = new URLSearchParams(searchParamsString);

    if (normalizedState.query) {
      nextParams.set("q", normalizedState.query);
    } else {
      nextParams.delete("q");
    }

    if (normalizedState.subject !== DEFAULT_SUBJECT) {
      nextParams.set("subject", normalizedState.subject);
    } else {
      nextParams.delete("subject");
    }

    if (normalizedState.topic !== DEFAULT_TOPIC) {
      nextParams.set("topic", normalizedState.topic);
    } else {
      nextParams.delete("topic");
    }

    return nextParams.toString();
  }

  function buildSearchHref(nextState: Partial<SearchRouteState>) {
    const nextSearch = buildSearchParamsString({
      query,
      subject: routeState.subject,
      topic: routeState.topic,
      ...nextState,
    });

    return nextSearch ? `${pathname}?${nextSearch}` : pathname;
  }

  const canonicalSearchParamsString = buildSearchParamsString(paramsBackedRouteState);

  useEffect(() => {
    if (canonicalSearchParamsString === searchParamsString) {
      return;
    }

    router.replace(
      canonicalSearchParamsString
        ? `${pathname}?${canonicalSearchParamsString}`
        : pathname,
      {
        scroll: false,
      },
    );
  }, [
    canonicalSearchParamsString,
    pathname,
    router,
    searchParamsString,
  ]);

  function commitRouteState(
    nextState: Partial<SearchRouteState>,
  ) {
    const nextSearch = buildSearchParamsString(nextState);

    if (nextSearch === searchParamsString) {
      return;
    }

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    commitRouteState({
      query: nextQuery,
      subject: routeState.subject,
      topic: routeState.topic,
    });
  }

  function browseSubject(nextSubject: string) {
    if (nextSubject === routeState.subject && routeState.topic === DEFAULT_TOPIC) {
      return;
    }

    commitRouteState({
      query,
      subject: nextSubject,
      topic: DEFAULT_TOPIC,
    });
  }

  function browseTopic(nextTopic: string) {
    commitRouteState({
      query,
      subject: routeState.subject,
      topic: nextTopic,
    });
  }

  function updateSubject(nextSubject: string) {
    if (nextSubject === routeState.subject && routeState.topic === DEFAULT_TOPIC) {
      return;
    }

    commitRouteState({
      query,
      subject: nextSubject,
      topic: DEFAULT_TOPIC,
    });
  }

  const conceptProgressBySlug = useMemo(
    () =>
      new Map(
        index.concepts.map((concept) => [
          concept.slug,
          getConceptProgressSummary(snapshot, concept),
        ]),
      ),
    [index.concepts, snapshot],
  );
  const trackProgressBySlug = useMemo(
    () =>
      new Map(
        index.starterTracks.map((track) => [
          track.slug,
          getStarterTrackProgressSummary(snapshot, track),
        ]),
      ),
    [index.starterTracks, snapshot],
  );
  const continueLearning = useMemo(
    () => selectContinueLearning(snapshot, index.concepts, 2),
    [index.concepts, snapshot],
  );
  const currentTrack = useMemo(
    () => selectCurrentTrack(snapshot, index.starterTracks, locale),
    [index.starterTracks, locale, snapshot],
  );
  const resumeSummary = useMemo(
    () =>
      buildStartLearningResumeSummary(
        snapshot,
        index.concepts,
        index.starterTracks,
        index.subjects,
        locale,
      ),
    [index.concepts, index.starterTracks, index.subjects, locale, snapshot],
  );
  const currentTrackConceptSlugs = useMemo(
    () => new Set(currentTrack?.track.concepts.map((concept) => concept.slug) ?? []),
    [currentTrack],
  );
  const primaryConceptSlug = continueLearning.primary?.concept.slug ?? null;
  const currentTrackSlug = currentTrack?.track.slug ?? null;
  const recentSubjectSlug = resumeSummary.activeSubject?.slug ?? null;
  const subjectBySlug = useMemo(
    () => new Map(index.subjects.map((item) => [item.slug, item] as const)),
    [index.subjects],
  );
  const topicBySlug = useMemo(
    () => new Map(index.topics.map((item) => [item.slug, item] as const)),
    [index.topics],
  );
  const trackBySlug = useMemo(
    () => new Map(index.starterTracks.map((item) => [item.slug, item] as const)),
    [index.starterTracks],
  );
  const guidedCollectionBySlug = useMemo(
    () => new Map(index.guidedCollections.map((item) => [item.slug, item] as const)),
    [index.guidedCollections],
  );
  const goalPathBySlug = useMemo(
    () => new Map(index.recommendedGoalPaths.map((item) => [item.slug, item] as const)),
    [index.recommendedGoalPaths],
  );
  const conceptBySlug = useMemo(
    () => new Map(index.concepts.map((item) => [item.slug, item] as const)),
    [index.concepts],
  );
  const activeSubject = useMemo(
    () => getSubjectSummary(index, routeState.subject),
    [index, routeState.subject],
  );
  const activeSubjectTitle = activeSubject
    ? getSubjectDisplayTitle(activeSubject, locale)
    : null;
  const activeSubjectCanonicalTitle = activeSubject?.title ?? null;
  const kindLabels = useMemo<Record<SiteSearchResultKind, string>>(
    () => ({
      subject: t("groups.subject"),
      topic: t("groups.topic"),
      track: t("groups.track"),
      "guided-collection": t("groups.guidedCollection"),
      "goal-path": t("groups.goalPath"),
      concept: t("groups.concept"),
    }),
    [t],
  );
  const subjectFilterOptions = useMemo(() => {
    return [
      {
        slug: DEFAULT_SUBJECT,
        label: t("filters.allSubjects"),
        count: index.concepts.length,
      },
      ...index.subjectOptions.map((option) => {
        const subject = index.subjects.find((item) => item.slug === option.slug);

        return {
          slug: option.slug,
          label: subject ? getSubjectDisplayTitle(subject, locale) : option.title,
          count: option.count,
        };
      }),
    ];
  }, [index.concepts.length, index.subjectOptions, index.subjects, locale, t]);
  const topicFilterOptions = useMemo(() => {
    const subjectTitle = activeSubjectCanonicalTitle;
    const scopedConcepts = index.concepts.filter((concept) =>
      subjectTitle ? concept.subject === subjectTitle : true,
    );
    const countsByTopicSlug = new Map(
      index.topics.map((topic) => [
        topic.slug,
        scopedConcepts.filter((concept) => concept.topic === topic.title).length,
      ]),
    );

    return [
      {
        value: DEFAULT_TOPIC,
        label: t("filters.allTopics"),
        count: scopedConcepts.length,
      },
      ...index.topics
        .filter((topic) => (subjectTitle ? topic.subject === subjectTitle : true))
        .map((topic) => ({
          value: topic.slug,
          label: getTopicDisplayTitle(topic, locale),
          count: countsByTopicSlug.get(topic.slug) ?? 0,
        })),
    ];
  }, [activeSubjectCanonicalTitle, index.concepts, index.topics, locale, t]);
  const activeTopic = useMemo(
    () =>
      routeState.topic === DEFAULT_TOPIC
        ? null
        : topicFilterOptions.find((item) => item.value === routeState.topic) ?? null,
    [routeState.topic, topicFilterOptions],
  );
  const activeTopicRecord = useMemo(
    () =>
      routeState.topic === DEFAULT_TOPIC ? null : topicBySlug.get(routeState.topic) ?? null,
    [routeState.topic, topicBySlug],
  );
  const topicHelperText = activeSubject
    ? t("filters.topicHelpInsideSubject", {
        subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
      })
    : t("filters.topicHelpNeedsSubject");
  const filterGuideText = activeTopic
    ? t("filters.guideActiveTopic", {
        subject: activeSubjectTitle ?? t("filters.allSubjects"),
        topic: activeTopic.label,
      })
    : activeSubject
      ? t("filters.guideActiveSubject", {
          subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
        })
      : t("filters.guideDefault");
  const filterGuideLinks = activeTopic
    ? [
        {
          href: `/concepts/topics/${routeState.topic}`,
          label: t("actions.openTitle", { title: activeTopic.label }),
        },
        activeSubject
          ? {
              href: `/concepts/subjects/${activeSubject.slug}`,
              label: t("actions.openTitle", {
                title: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
              }),
            }
          : {
              href: "/concepts/subjects",
              label: t("actions.openSubjectDirectory"),
            },
      ]
    : activeSubject
      ? [
          {
            href: `/concepts/subjects/${activeSubject.slug}`,
            label: t("actions.openTitle", {
              title: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
            }),
          },
          {
            href: "/concepts/topics",
            label: t("actions.openTopicDirectory"),
          },
        ]
      : [
          {
            href: "/concepts/subjects",
            label: t("actions.openSubjectDirectory"),
          },
          {
            href: "/concepts/topics",
            label: t("actions.openTopicDirectory"),
          },
        ];
  const searchScopeTitle = activeTopic
    ? activeSubject
      ? t("scope.topicTitle", {
          subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
          topic: activeTopic.label,
        })
      : t("scope.topicOnlyTitle", {
          topic: activeTopic.label,
        })
    : activeSubject
      ? t("scope.subjectTitle", {
          subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
        })
      : t("scope.sitewideTitle");
  const searchScopeSummary = activeTopic
    ? activeSubject
      ? t("scope.topicSummary", {
          subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
          topic: activeTopic.label,
        })
      : t("scope.topicOnlySummary", {
          topic: activeTopic.label,
        })
    : activeSubject
      ? t("scope.subjectSummary", {
          subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
        })
      : t("scope.sitewideSummary");
  const searchScopeLinks = activeTopic
    ? [
        {
          href: `/concepts/topics/${routeState.topic}`,
          label: t("actions.openTitle", { title: activeTopic.label }),
        },
        activeSubject
          ? {
              href: `/concepts/subjects/${activeSubject.slug}`,
              label: t("actions.openTitle", {
                title: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
              }),
            }
          : {
              href: "/concepts/subjects",
              label: t("actions.openSubjectDirectory"),
            },
      ]
    : activeSubject
      ? [
          {
            href: `/concepts/subjects/${activeSubject.slug}`,
            label: t("actions.openTitle", {
              title: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
            }),
          },
          {
            href: "/concepts/topics",
            label: t("actions.openTopicDirectory"),
          },
        ]
      : [
          {
            href: "/concepts/subjects",
            label: t("actions.openSubjectDirectory"),
          },
          {
            href: "/concepts/topics",
            label: t("actions.openTopicDirectory"),
          },
        ];
  const localizedEntries = useMemo(() => {
    return new Map(
      index.entries.map((entry) => {
        const localizedPrimarySubjectTitle =
          entry.primarySubjectSlug && subjectBySlug.get(entry.primarySubjectSlug)
            ? getSubjectDisplayTitle(subjectBySlug.get(entry.primarySubjectSlug)!, locale)
            : entry.primarySubjectTitle;

        if (entry.kind === "subject") {
          const subject = subjectBySlug.get(entry.slug);
          if (subject) {
            return [
              entry.id,
              {
                ...entry,
                displayTitle: getSubjectDisplayTitle(subject, locale),
                displaySummary: getSubjectDisplayDescription(subject, locale),
                displayActionLabel: t("actions.openTitle", {
                  title: getSubjectDisplayTitle(subject, locale),
                }),
                displayMetadataChips: [
                  t("meta.topics", { count: subject.topicCount }),
                  t("meta.concepts", { count: subject.conceptCount }),
                  t("meta.starterTracks", { count: subject.starterTrackCount }),
                ],
                displayPrimarySubjectTitle: getSubjectDisplayTitle(subject, locale),
              } satisfies DisplaySearchEntry,
            ] as const;
          }
        }

        if (entry.kind === "topic") {
          const topic = topicBySlug.get(entry.slug);
          if (topic) {
            const subjectTitle = localizedPrimarySubjectTitle ?? topic.subject;
            return [
              entry.id,
              {
                ...entry,
                displayTitle: getTopicDisplayTitle(topic, locale),
                displaySummary: getTopicDisplayDescription(topic, locale),
                displayActionLabel: t("actions.openTitle", {
                  title: getTopicDisplayTitle(topic, locale),
                }),
                displayMetadataChips: [
                  subjectTitle,
                  t("meta.concepts", { count: topic.conceptCount }),
                  t("meta.starterTracks", { count: topic.starterTracks.length }),
                ],
                displayPrimarySubjectTitle: subjectTitle,
              } satisfies DisplaySearchEntry,
            ] as const;
          }
        }

        if (entry.kind === "track") {
          const track = trackBySlug.get(entry.slug);
          if (track) {
            return [
              entry.id,
              {
                ...entry,
                displayTitle: getStarterTrackDisplayTitle(track, locale),
                displaySummary: getStarterTrackDisplaySummary(track, locale),
                displayActionLabel: t("actions.openTitle", {
                  title: getStarterTrackDisplayTitle(track, locale),
                }),
                displayMetadataChips: [
                  localizedPrimarySubjectTitle ??
                    entry.primarySubjectTitle ??
                    t("labels.starterTrack"),
                  t("meta.concepts", { count: track.concepts.length }),
                  t("meta.minutes", { count: track.estimatedStudyMinutes }),
                ],
                displayPrimarySubjectTitle: localizedPrimarySubjectTitle,
              } satisfies DisplaySearchEntry,
            ] as const;
          }
        }

        if (entry.kind === "guided-collection") {
          const collection = guidedCollectionBySlug.get(entry.slug);
          if (collection) {
            const formatLabel = t(`formats.${collection.format}`);
            return [
              entry.id,
              {
                ...entry,
                displayTitle: getGuidedCollectionDisplayTitle(collection, locale),
                displaySummary: getGuidedCollectionDisplaySummary(collection, locale),
                displayActionLabel: t("actions.openFormat", {
                  format: formatLabel.toLowerCase(),
                }),
                displayMetadataChips: [
                  formatLabel,
                  t("meta.steps", { count: collection.steps.length }),
                  t("meta.concepts", { count: collection.conceptCount }),
                ],
                displayPrimarySubjectTitle: localizedPrimarySubjectTitle,
              } satisfies DisplaySearchEntry,
            ] as const;
          }
        }

        if (entry.kind === "goal-path") {
          const goalPath = goalPathBySlug.get(entry.slug);
          if (goalPath) {
            return [
              entry.id,
              {
                ...entry,
                displayTitle: getGoalPathDisplayTitle(goalPath, locale),
                displaySummary: getGoalPathDisplaySummary(goalPath, locale),
                displayActionLabel: t("actions.openGoalPath"),
                displayMetadataChips: [
                  t(`goalKinds.${goalPath.goalKind}`),
                  t("meta.steps", { count: goalPath.steps.length }),
                  t("meta.concepts", { count: goalPath.conceptCount }),
                ],
                displayPrimarySubjectTitle: localizedPrimarySubjectTitle,
              } satisfies DisplaySearchEntry,
            ] as const;
          }
        }

        if (entry.kind === "concept") {
          const concept = conceptBySlug.get(entry.slug);
          if (concept) {
            const localizedTopicTitle =
              entry.topicSlug && topicBySlug.get(entry.topicSlug)
                ? getTopicDisplayTitle(topicBySlug.get(entry.topicSlug)!, locale)
                : entry.topicTitle;
            return [
              entry.id,
              {
                ...entry,
                displayTitle: getConceptDisplayTitle(concept, locale),
                displaySummary: getConceptDisplaySummary(concept, locale),
                displayActionLabel: t("actions.openTitle", {
                  title: getConceptDisplayShortTitle(concept, locale),
                }),
                displayMetadataChips: [
                  localizedPrimarySubjectTitle ?? entry.primarySubjectTitle ?? concept.subject,
                  localizedTopicTitle ?? concept.topic,
                  concept.difficulty,
                  t("meta.minutes", { count: concept.estimatedStudyMinutes ?? 0 }),
                ],
                displayPrimarySubjectTitle:
                  localizedPrimarySubjectTitle ?? entry.primarySubjectTitle ?? concept.subject,
              } satisfies DisplaySearchEntry,
            ] as const;
          }
        }

        return [
          entry.id,
          {
            ...entry,
            displayTitle: entry.title,
            displaySummary: entry.summary,
            displayActionLabel: entry.actionLabel,
            displayMetadataChips: entry.metadataChips,
            displayPrimarySubjectTitle: localizedPrimarySubjectTitle,
          } satisfies DisplaySearchEntry,
        ] as const;
      }),
    );
  }, [
    conceptBySlug,
    goalPathBySlug,
    guidedCollectionBySlug,
    index.entries,
    locale,
    subjectBySlug,
    t,
    topicBySlug,
    trackBySlug,
  ]);
  const visibleExpandedSubjectSpotlights = useMemo(() => {
    if (!expandedSubjectSpotlights.length) {
      return [];
    }

    if (
      activeSubject &&
      expandedSubjectSpotlights.some(
        (spotlight) => spotlight.subject.slug === activeSubject.slug,
      )
    ) {
      return expandedSubjectSpotlights.filter(
        (spotlight) => spotlight.subject.slug === activeSubject.slug,
      );
    }

    return expandedSubjectSpotlights;
  }, [activeSubject, expandedSubjectSpotlights]);
  const showFocusedSpotlight =
    Boolean(activeSubject) && visibleExpandedSubjectSpotlights.length === 1;
  const matches = useMemo(
    () =>
      searchSiteIndex(index, {
        query: deferredQuery,
        subjectSlug:
          routeState.subject === DEFAULT_SUBJECT ? null : routeState.subject,
        topicSlug: routeState.topic === DEFAULT_TOPIC ? null : routeState.topic,
      }),
    [deferredQuery, index, routeState.subject, routeState.topic],
  );

  const enhancedMatches = useMemo(() => {
    return matches.map((match) => {
      const conceptProgress =
        match.entry.kind === "concept"
          ? conceptProgressBySlug.get(match.entry.slug) ?? null
          : null;
      const trackProgress =
        match.entry.kind === "track"
          ? trackProgressBySlug.get(match.entry.slug) ?? null
          : null;

      let progressBoost = 5;
      let progressCue: SearchProgressCue | null = null;

      if (match.entry.kind === "concept" && match.entry.slug === primaryConceptSlug) {
        progressBoost = 0;
        progressCue = "Continue here";
      } else if (match.entry.kind === "track" && match.entry.slug === currentTrackSlug) {
        progressBoost = 0;
        progressCue = "Current track";
      } else if (
        match.entry.kind === "concept" &&
        currentTrackConceptSlugs.has(match.entry.slug)
      ) {
        progressBoost = 1;
        progressCue = "On current track";
      } else if (
        recentSubjectSlug &&
        match.entry.subjectSlugs.includes(recentSubjectSlug)
      ) {
        progressBoost = 2;
        progressCue = "Recent subject";
      }

      if (conceptProgress && conceptProgress.status !== "not-started") {
        progressBoost = Math.min(progressBoost, 2);
        progressCue = progressCue ?? "Saved progress";
      }

      if (trackProgress && trackProgress.status !== "not-started") {
        progressBoost = Math.min(progressBoost, 2);
        progressCue = progressCue ?? "Saved progress";
      }

      return {
        ...match,
        displayEntry: localizedEntries.get(match.entry.id) ?? {
          ...match.entry,
          displayTitle: match.entry.title,
          displaySummary: match.entry.summary,
          displayActionLabel: match.entry.actionLabel,
          displayMetadataChips: match.entry.metadataChips,
          displayPrimarySubjectTitle: match.entry.primarySubjectTitle,
        },
        conceptProgress,
        trackProgress,
        progressBoost,
        progressCue,
      };
    });
  }, [
    conceptProgressBySlug,
    currentTrackConceptSlugs,
    currentTrackSlug,
    matches,
    localizedEntries,
    primaryConceptSlug,
    recentSubjectSlug,
    trackProgressBySlug,
  ]);

  const browseConceptSections = useMemo<BrowseConceptSection[]>(() => {
    const conceptEntries = index.entries
      .filter(
        (entry) =>
          entry.kind === "concept" &&
          (routeState.subject === DEFAULT_SUBJECT ||
            entry.subjectSlugs.includes(routeState.subject)) &&
          (routeState.topic === DEFAULT_TOPIC ||
            entry.topicSlugs.includes(routeState.topic)),
      )
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }

        return left.title.localeCompare(right.title);
      });
    const conceptCards = conceptEntries.map((entry) => {
      const conceptProgress = conceptProgressBySlug.get(entry.slug) ?? null;
      let progressCue: SearchProgressCue | null = null;

      if (entry.slug === primaryConceptSlug) {
        progressCue = "Continue here";
      } else if (currentTrackConceptSlugs.has(entry.slug)) {
        progressCue = "On current track";
      } else if (conceptProgress && conceptProgress.status !== "not-started") {
        progressCue = "Saved progress";
      }

      return {
        entry:
          localizedEntries.get(entry.id) ??
          ({
            ...entry,
            displayTitle: entry.title,
            displaySummary: entry.summary,
            displayActionLabel: entry.actionLabel,
            displayMetadataChips: entry.metadataChips,
            displayPrimarySubjectTitle: entry.primarySubjectTitle,
          } satisfies DisplaySearchEntry),
        conceptProgress,
        progressCue,
      };
    });

    if (activeSubject) {
      const activeSubjectLink = {
        href: `/concepts/subjects/${activeSubject.slug}`,
        label: t("actions.openTitle", {
          title: getSubjectDisplayTitle(activeSubject, locale),
        }),
      };

      if (activeTopicRecord) {
        return [
          {
            id: activeTopicRecord.slug,
            title: getTopicDisplayTitle(activeTopicRecord, locale),
            conceptCards,
            links: [
              {
                href: `/concepts/topics/${activeTopicRecord.slug}`,
                label: t("actions.openTitle", {
                  title: getTopicDisplayTitle(activeTopicRecord, locale),
                }),
              },
              activeSubjectLink,
            ],
          },
        ];
      }

      const topicSections = index.topics
        .filter((topic) => topic.subject === activeSubject.title)
        .map((topic) => ({
          id: topic.slug,
          title: getTopicDisplayTitle(topic, locale),
          conceptCards: conceptCards.filter((card) => card.entry.topicSlugs.includes(topic.slug)),
          links: [
            {
              href: `/concepts/topics/${topic.slug}`,
              label: t("actions.openTitle", {
                title: getTopicDisplayTitle(topic, locale),
              }),
            },
            activeSubjectLink,
          ],
        }))
        .filter((section) => section.conceptCards.length > 0);

      if (topicSections.length > 0) {
        return topicSections;
      }

      return [
        {
          id: activeSubject.slug,
          title: getSubjectDisplayTitle(activeSubject, locale),
          conceptCards,
          links: [activeSubjectLink],
        },
      ];
    }

    return index.subjects
      .map((item) => ({
        id: item.slug,
        title: getSubjectDisplayTitle(item, locale),
        conceptCards: conceptCards.filter((card) =>
          card.entry.subjectSlugs.includes(item.slug),
        ),
        links: [
          {
            href: `/concepts/subjects/${item.slug}`,
            label: t("actions.openTitle", {
              title: getSubjectDisplayTitle(item, locale),
            }),
          },
        ],
      }))
      .filter((section) => section.conceptCards.length > 0);
  }, [
    activeSubject,
    activeTopicRecord,
    conceptProgressBySlug,
    currentTrackConceptSlugs,
    index.entries,
    index.subjects,
    index.topics,
    locale,
    localizedEntries,
    primaryConceptSlug,
    routeState.subject,
    routeState.topic,
    t,
  ]);

  const groupedMatches = useMemo(() => {
    const buckets = new Map<
      SiteSearchResultKind,
      typeof enhancedMatches
    >();

    for (const match of enhancedMatches) {
      const bucket = buckets.get(match.entry.kind) ?? [];
      bucket.push(match);
      buckets.set(match.entry.kind, bucket);
    }

    return Array.from(buckets.entries())
      .map(([kind, group]) => ({
        kind,
        title: kindLabels[kind],
        matches: group.sort((left, right) => {
          if (left.score !== right.score) {
            return left.score - right.score;
          }

          if (left.progressBoost !== right.progressBoost) {
            return left.progressBoost - right.progressBoost;
          }

          if (left.entry.order !== right.entry.order) {
            return left.entry.order - right.entry.order;
          }

          return left.displayEntry.displayTitle.localeCompare(right.displayEntry.displayTitle);
        }),
      }))
      .sort((left, right) => {
        const leftTop = left.matches[0];
        const rightTop = right.matches[0];

        if (leftTop.score !== rightTop.score) {
          return leftTop.score - rightTop.score;
        }

        if (leftTop.progressBoost !== rightTop.progressBoost) {
          return leftTop.progressBoost - rightTop.progressBoost;
        }

        return defaultKindOrder[left.kind] - defaultKindOrder[right.kind];
      });
  }, [enhancedMatches, kindLabels]);
  const groupedMatchJumpLinks = useMemo(
    () =>
      groupedMatches.map((group) => ({
        href: `#${getSearchResultGroupSectionId(group.kind)}`,
        label: group.title,
        count: t("results.groupCount", { count: group.matches.length }),
      })),
    [groupedMatches, t],
  );
  const resultRefinements = useMemo(() => {
    const trimmedQuery = deferredQuery.trim();

    if (!trimmedQuery || !enhancedMatches.length) {
      return null;
    }

    if (routeState.subject === DEFAULT_SUBJECT) {
      const countsBySubjectSlug = new Map<string, number>();

      for (const match of enhancedMatches) {
        const subjectSlug = match.entry.primarySubjectSlug ?? match.entry.subjectSlugs[0] ?? null;

        if (!subjectSlug) {
          continue;
        }

        countsBySubjectSlug.set(subjectSlug, (countsBySubjectSlug.get(subjectSlug) ?? 0) + 1);
      }

      const options = Array.from(countsBySubjectSlug.entries())
        .map(([slug, count]) => {
          const subject = subjectBySlug.get(slug);

          if (!subject) {
            return null;
          }

          const title = getSubjectDisplayTitle(subject, locale);
          return {
            kind: "subject" as const,
            slug,
            label: t("actions.searchInsideTitle", { title }),
            count,
            sortLabel: title,
          };
        })
        .filter(
          (
            option,
          ): option is {
            kind: "subject";
            slug: string;
            label: string;
            count: number;
            sortLabel: string;
          } => Boolean(option),
        )
        .sort((left, right) => right.count - left.count || left.sortLabel.localeCompare(right.sortLabel))
        .slice(0, 3)
        .map((option) => ({
          kind: option.kind,
          slug: option.slug,
          label: option.label,
          count: t("results.groupCount", { count: option.count }),
        }));

      if (!options.length) {
        return null;
      }

      return {
        title: t("results.refineBySubjectTitle"),
        summary: t("results.refineBySubjectSummary"),
        options,
      };
    }

    if (routeState.topic !== DEFAULT_TOPIC) {
      return null;
    }

    const countsByTopicSlug = new Map<string, number>();

    for (const match of enhancedMatches) {
      const topicSlug = match.entry.topicSlug ?? match.entry.topicSlugs[0] ?? null;
      const topic = topicSlug ? topicBySlug.get(topicSlug) ?? null : null;

      if (!topicSlug || !topic) {
        continue;
      }

      if (activeSubjectCanonicalTitle && topic.subject !== activeSubjectCanonicalTitle) {
        continue;
      }

      countsByTopicSlug.set(topicSlug, (countsByTopicSlug.get(topicSlug) ?? 0) + 1);
    }

    const options = Array.from(countsByTopicSlug.entries())
      .map(([slug, count]) => {
        const topic = topicBySlug.get(slug);

        if (!topic) {
          return null;
        }

        const title = getTopicDisplayTitle(topic, locale);
        return {
          kind: "topic" as const,
          slug,
          label: t("actions.searchInsideTitle", { title }),
          count,
          sortLabel: title,
        };
      })
      .filter(
        (
          option,
        ): option is {
          kind: "topic";
          slug: string;
          label: string;
          count: number;
          sortLabel: string;
        } => Boolean(option),
      )
      .sort((left, right) => right.count - left.count || left.sortLabel.localeCompare(right.sortLabel))
      .slice(0, 3)
      .map((option) => ({
        kind: option.kind,
        slug: option.slug,
        label: option.label,
        count: t("results.groupCount", { count: option.count }),
      }));

    if (!options.length) {
      return null;
    }

    return {
      title: t("results.refineByTopicTitle"),
      summary: t("results.refineByTopicSummary", {
        subject: activeSubjectTitle ?? t("filters.allSubjects"),
      }),
      options,
    };
  }, [
    activeSubjectCanonicalTitle,
    activeSubjectTitle,
    deferredQuery,
    enhancedMatches,
    locale,
    routeState.subject,
    routeState.topic,
    subjectBySlug,
    t,
    topicBySlug,
  ]);

  const noQuerySuggestions = useMemo(() => {
    if (activeSubject) {
      return [
        activeSubject.featuredStarterTracks[0]
          ? {
              query: activeSubject.featuredStarterTracks[0].title,
              label: getStarterTrackDisplayTitle(
                activeSubject.featuredStarterTracks[0],
                locale,
              ),
            }
          : null,
        activeSubject.featuredTopics[0]
          ? {
              query: activeSubject.featuredTopics[0].title,
              label: getTopicDisplayTitle(activeSubject.featuredTopics[0], locale),
            }
          : null,
        activeSubject.featuredConcepts[0]
          ? {
              query:
                activeSubject.featuredConcepts[0].shortTitle ??
                activeSubject.featuredConcepts[0].title,
              label: getConceptDisplayShortTitle(
                activeSubject.featuredConcepts[0],
                locale,
              ),
            }
          : null,
      ].filter((value): value is { query: string; label: string } => Boolean(value));
    }

    return index.subjects
      .flatMap((subject) => [
        subject.featuredConcepts[0]
          ? {
              query:
                subject.featuredConcepts[0].shortTitle ??
                subject.featuredConcepts[0].title,
              label: getConceptDisplayShortTitle(subject.featuredConcepts[0], locale),
            }
          : null,
        subject.featuredStarterTracks[0]
          ? {
              query: subject.featuredStarterTracks[0].title,
              label: getStarterTrackDisplayTitle(
                subject.featuredStarterTracks[0],
                locale,
              ),
            }
          : null,
      ])
      .filter((value): value is { query: string; label: string } => Boolean(value))
      .slice(0, 3);
  }, [activeSubject, index.subjects, locale]);

  const hasQuery = Boolean(deferredQuery.trim());
  const hasActiveBrowseFilters =
    routeState.subject !== DEFAULT_SUBJECT || routeState.topic !== DEFAULT_TOPIC;
  const showBrowseResults = !hasQuery && hasActiveBrowseFilters && browseConceptSections.length > 0;
  const showBrowseDisclosure =
    !hasQuery && !hasActiveBrowseFilters && browseConceptSections.length > 0;
  const showSpotlightsDisclosure =
    !hasQuery && visibleExpandedSubjectSpotlights.length > 0;
  const showBrowseJumpLinks = !hasQuery && (showBrowseDisclosure || showSpotlightsDisclosure);
  const resultsCount = enhancedMatches.length;
  const showGroupedResultJumpLinks = hasQuery && groupedMatches.length > 1 && resultsCount > 0;
  const noResultsTitle = routeState.subject === DEFAULT_SUBJECT
    ? t("empty.noResultsForQuery", { query: query.trim() })
    : t("empty.noResultsForSubjectQuery", {
        subject: activeSubjectTitle ?? t("labels.subject"),
        query: query.trim(),
      });
  const noResultsNote = routeState.subject === DEFAULT_SUBJECT
    ? t("empty.noResultsNote")
    : t("empty.noResultsNoteForSubject", {
        subject: activeSubjectTitle ?? t("labels.subject"),
      });
  const noResultsRecoveryLinks = useMemo(() => {
    const suggestions: Array<{ href: string; label: string }> = [];

    if (activeTopic) {
      suggestions.push({
        href: `/concepts/topics/${routeState.topic}`,
        label: t("actions.openTitle", { title: activeTopic.label }),
      });
    }

    if (activeSubject) {
      suggestions.push({
        href: `/concepts/subjects/${activeSubject.slug}`,
        label: t("actions.openTitle", {
          title: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
        }),
      });
    }

    const scopedConcepts = index.concepts.filter((concept) => {
      if (activeSubjectCanonicalTitle && concept.subject !== activeSubjectCanonicalTitle) {
        return false;
      }

      if (activeTopicRecord && concept.topic !== activeTopicRecord.title) {
        return false;
      }

      return true;
    });

    scopedConcepts.slice(0, 3).forEach((concept) => {
      suggestions.push({
        href: `/concepts/${concept.slug}`,
        label: t("actions.openTitle", {
          title: getConceptDisplayShortTitle(concept, locale),
        }),
      });
    });

    if (!suggestions.length) {
      noQuerySuggestions.forEach((item) => {
        suggestions.push({
          href: `/search?q=${encodeURIComponent(item.query)}`,
          label: item.label,
        });
      });
    }

    return suggestions.filter((item, index, all) => {
      return all.findIndex((candidate) => candidate.href === item.href) === index;
    }).slice(0, 4);
  }, [
    activeSubject,
    activeSubjectCanonicalTitle,
    activeSubjectTitle,
    activeTopic,
    activeTopicRecord,
    index.concepts,
    locale,
    noQuerySuggestions,
    routeState.topic,
    t,
  ]);
  const resumeAction = resumeSummary.primaryConcept
    ? {
        href: `/concepts/${resumeSummary.primaryConcept.slug}`,
        label: t("actions.continueConcept"),
      }
    : resumeSummary.currentTrack
      ? {
          href:
            resumeSummary.currentTrack.primaryAction?.href ??
            `/tracks/${resumeSummary.currentTrack.track.slug}`,
          label:
            resumeSummary.currentTrack.primaryAction?.label ??
            t("actions.continueTitle", {
              title: getStarterTrackDisplayTitle(
                resumeSummary.currentTrack.track,
                locale,
              ),
            }),
        }
      : null;
  const resumeVisual = resumeSummary.primaryConcept
    ? getConceptVisualDescriptor(resumeSummary.primaryConcept)
    : resumeSummary.currentTrack
      ? getStarterTrackVisualDescriptor(resumeSummary.currentTrack.track)
      : activeSubject
        ? getSubjectVisualDescriptor(activeSubject)
        : null;
  return (
      <section className="space-y-5 sm:space-y-6">
        <PageSection id="search-controls" as="section" className="space-y-4">
          <article className="filter-panel p-6 sm:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="section-kicker">{t("labels.search")}</p>
                <h1 className="max-w-4xl text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {t("hero.title")}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-700">
                  {t("hero.description")}
                </p>
              </div>

              <label className="block" data-onboarding-target="site-search">
                <span className="sr-only">{t("hero.searchAria")}</span>
                <input
                  type="search"
                  aria-label={t("hero.searchAria")}
                  placeholder={
                    activeSubject
                      ? t("hero.searchInsideSubject", {
                          subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
                        })
                      : t("hero.searchPlaceholder")
                  }
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  className="w-full rounded-[24px] border border-line bg-paper-strong px-4 py-4 text-base text-ink-950 outline-none transition-colors placeholder:text-ink-500 focus:border-teal-500"
                />
              </label>

              <div
                className="grid gap-3 md:grid-cols-2"
                data-onboarding-target="search-filters"
              >
                <DiscoveryFilterSelect
                  label={t("filters.subject")}
                  value={routeState.subject}
                  options={subjectFilterOptions.map((option) => ({
                    value: option.slug,
                    label: option.label,
                    count: option.count,
                  }))}
                  onChange={browseSubject}
                  helperText={t("filters.subjectHelp")}
                />
                <DiscoveryFilterSelect
                  label={t("filters.topic")}
                  value={routeState.topic}
                  options={topicFilterOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                    count: option.count,
                  }))}
                  onChange={browseTopic}
                  helperText={topicHelperText}
                />
              </div>

              <div className="rounded-[20px] border border-dashed border-line bg-paper px-4 py-3">
                <p className="lab-label">{t("filters.guideLabel")}</p>
                <p className="mt-1 text-sm leading-6 text-ink-700">{filterGuideText}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {filterGuideLinks.map((item) => (
                    <SearchSuggestionChip key={`${item.href}:${item.label}`} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>

              {hasQuery || activeSubject || activeTopic ? (
                <div
                  className="rounded-[22px] border border-line bg-paper px-4 py-4"
                  data-onboarding-target="search-results"
                >
                  <p className="lab-label">{t("labels.scope")}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-950">{searchScopeTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-700">{searchScopeSummary}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {searchScopeLinks.map((item) => (
                      <SearchSuggestionChip
                        key={`${item.href}:${item.label}`}
                        href={item.href}
                        label={item.label}
                      />
                    ))}
                    {routeState.topic !== DEFAULT_TOPIC ? (
                      <button
                        type="button"
                        onClick={() => browseTopic(DEFAULT_TOPIC)}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.clearTopicFilter")}
                      </button>
                    ) : null}
                    {routeState.subject !== DEFAULT_SUBJECT ? (
                      <button
                        type="button"
                        onClick={() => updateSubject(DEFAULT_SUBJECT)}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.clearSubjectFilter")}
                      </button>
                    ) : null}
                    {hasQuery ? (
                      <button
                        type="button"
                        onClick={() => updateQuery("")}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.clearQuery")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!hasQuery ? (
                <div
                  className="rounded-[22px] border border-line bg-paper px-4 py-4"
                  data-onboarding-target="search-results"
                >
                  <div
                    className={
                      resumeVisual
                        ? "grid gap-4 lg:grid-cols-[5.75rem_minmax(0,1fr)_auto] lg:items-center"
                        : "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                    }
                  >
                    {resumeVisual ? (
                      <LearningVisual
                        kind={resumeVisual.kind}
                        motif={resumeVisual.motif}
                        overlay={resumeVisual.overlay}
                        isFallback={resumeVisual.isFallback}
                        fallbackKind={resumeVisual.fallbackKind}
                        tone={resumeVisual.tone ?? activeSubject?.accent ?? "teal"}
                        ariaLabel={resumeVisual.label}
                        compact
                        className="h-20 rounded-[18px] sm:h-24"
                      />
                    ) : null}
                    <div className="space-y-1">
                      <p className="lab-label">
                        {resumeSummary.hasRecordedProgress
                          ? t("empty.savedProgress")
                          : t("empty.noQueryYet")}
                      </p>
                      <p className="text-sm leading-6 text-ink-700">
                        {resumeSummary.primaryConcept
                          ? t("empty.resumePrimaryConcept", {
                              title: getConceptDisplayTitle(
                                resumeSummary.primaryConcept,
                                locale,
                              ),
                            })
                          : resumeSummary.currentTrack
                            ? t("empty.resumeCurrentTrack", {
                                title: getStarterTrackDisplayTitle(
                                  resumeSummary.currentTrack.track,
                                  locale,
                                ),
                              })
                            : hasActiveBrowseFilters
                              ? t("empty.activeFiltersNarrowing")
                              : t("empty.quickSearchPrompt")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:justify-end">
                      {resumeAction ? (
                        <Link
                          href={resumeAction.href}
                          data-testid="search-primary-cta"
                          className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold"
                          style={{ color: "var(--paper-strong)" }}
                        >
                          {resumeAction.label}
                        </Link>
                      ) : null}
                      {hasActiveBrowseFilters ? (
                        <button
                          type="button"
                          onClick={() => updateSubject(DEFAULT_SUBJECT)}
                          className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                        >
                          {t("actions.clearFilters")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {noQuerySuggestions.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {noQuerySuggestions.map((item, index) => (
                        <SearchSuggestionChip
                          key={`${item.query}:${item.label}:${index}`}
                          href={`/search?q=${encodeURIComponent(item.query)}${routeState.subject !== DEFAULT_SUBJECT ? `&subject=${encodeURIComponent(routeState.subject)}` : ""}`}
                          label={item.label}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[22px] border border-line bg-paper px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="lab-label">{t("labels.searchResults")}</p>
                      <p className="text-sm leading-6 text-ink-700">
                        {resultsCount
                          ? t("results.countForQuery", {
                              count: resultsCount,
                              query: deferredQuery.trim(),
                            })
                          : noResultsNote}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuery("")}
                        className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                      >
                        {t("actions.clearQuery")}
                      </button>
                      {routeState.topic !== DEFAULT_TOPIC ? (
                        <button
                          type="button"
                          onClick={() => browseTopic(DEFAULT_TOPIC)}
                          className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                        >
                          {t("actions.clearTopicFilter")}
                        </button>
                      ) : null}
                      {routeState.subject !== DEFAULT_SUBJECT ? (
                        <button
                          type="button"
                          onClick={() => updateSubject(DEFAULT_SUBJECT)}
                          className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                        >
                          {t("actions.clearSubjectFilter")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        </PageSection>

        {showBrowseJumpLinks ? (
          <PageSection id="search-browse-jump-links" as="section" className="space-y-3">
            <div className="rounded-[22px] border border-line bg-paper px-4 py-4 sm:px-5">
              <p className="lab-label">{t("disclosure.jumpLabel")}</p>
              <h2 className="mt-1 text-lg font-semibold text-ink-950">
                {t("disclosure.jumpTitle")}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
                {t("disclosure.jumpSummary")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {showBrowseDisclosure ? (
                  <SearchNavChip
                    href={`#${SEARCH_CONCEPT_BROWSE_DISCLOSURE_ID}`}
                    label={t("actions.jumpToConceptBrowse")}
                    anchor
                  />
                ) : null}
                {showSpotlightsDisclosure ? (
                  <SearchNavChip
                    href={`#${SEARCH_ROUTE_DISCLOSURE_ID}`}
                    label={
                      showFocusedSpotlight && activeSubject
                        ? t("actions.jumpToSubjectRoutes", {
                            subject:
                              activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
                          })
                        : t("actions.jumpToTopicPagesAndPaths")
                    }
                    anchor
                  />
                ) : null}
                <SearchNavChip
                  href="/concepts/subjects"
                  label={t("actions.openSubjectDirectory")}
                />
                <SearchNavChip
                  href="/concepts/topics"
                  label={t("actions.openTopicDirectory")}
                />
              </div>
            </div>
          </PageSection>
        ) : null}

        {showBrowseResults ? (
          <PageSection id="search-browse" as="section" className="space-y-5">
            <div className="space-y-1">
              <p className="lab-label">
                {activeSubject ? t("browse.filteredBrowse") : t("browse.conceptBrowse")}
              </p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {activeTopic
                  ? t("browse.topicConcepts", { topic: activeTopic.label })
                  : activeSubject
                    ? t("browse.subjectConcepts", {
                        subject: activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
                      })
                    : t("browse.browseConceptPages")}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {t("browse.description")}
              </p>
            </div>

            <SearchBrowseJumpLinks sections={browseConceptSections} t={t} />

            {browseConceptSections.map((section) => (
              <SearchBrowseSection
                key={section.id}
                section={section}
                progressSource={progressSource}
                t={t}
              />
            ))}
          </PageSection>
        ) : null}

        {showBrowseDisclosure ? (
          <DisclosurePanel
            id={SEARCH_CONCEPT_BROWSE_DISCLOSURE_ID}
            eyebrow={t("disclosure.browseNoQueryEyebrow")}
            title={t("disclosure.showConceptBrowse")}
            summary={t("disclosure.showConceptBrowseSummary")}
          >
            <div className="space-y-5">
              <SearchBrowseJumpLinks sections={browseConceptSections} t={t} />
              {browseConceptSections.map((section) => (
                <SearchBrowseSection
                  key={section.id}
                  section={section}
                  progressSource={progressSource}
                  t={t}
                />
              ))}
            </div>
          </DisclosurePanel>
        ) : null}

        {showSpotlightsDisclosure ? (
          <DisclosurePanel
            id={SEARCH_ROUTE_DISCLOSURE_ID}
            eyebrow={
              showFocusedSpotlight
                ? t("disclosure.focusedBranchEyebrow")
                : t("disclosure.subjectRoutesEyebrow")
            }
            title={
              showFocusedSpotlight && activeSubject
                ? t("disclosure.showSubjectRouteOptionsTitle", {
                    subject:
                      activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
                  })
                : t("disclosure.showSubjectRouteOptions")
            }
            summary={
              showFocusedSpotlight && activeSubject
                ? t("disclosure.focusedBranchSummary", {
                    subject:
                      activeSubjectTitle ?? getSubjectDisplayTitle(activeSubject, locale),
                  })
                : t("disclosure.subjectRoutesSummary")
            }
          >
            <ExpandedSubjectSpotlightGrid
              spotlights={visibleExpandedSubjectSpotlights}
              variant="compact"
            />
          </DisclosurePanel>
        ) : null}

        {hasQuery ? (
          resultsCount ? (
            <div className="space-y-5">
              {resultRefinements ? (
                <PageSection id="search-results-refine-links" as="section" className="space-y-3">
                  <div className="rounded-[22px] border border-line bg-paper px-4 py-4 sm:px-5">
                    <p className="lab-label">{t("results.refineLabel")}</p>
                    <h2 className="mt-1 text-lg font-semibold text-ink-950">
                      {resultRefinements.title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
                      {resultRefinements.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {resultRefinements.options.map((item) => (
                        <SearchJumpChip
                          key={`${item.kind}:${item.slug}`}
                          href={
                            item.kind === "subject"
                              ? buildSearchHref({ subject: item.slug, topic: DEFAULT_TOPIC })
                              : buildSearchHref({ topic: item.slug })
                          }
                          label={item.label}
                          count={item.count}
                        />
                      ))}
                    </div>
                  </div>
                </PageSection>
              ) : null}
              {showGroupedResultJumpLinks ? (
                <PageSection id="search-results-jump-links" as="section" className="space-y-3">
                  <div className="rounded-[22px] border border-line bg-paper px-4 py-4 sm:px-5">
                    <p className="lab-label">{t("results.jumpLabel")}</p>
                    <h2 className="mt-1 text-lg font-semibold text-ink-950">
                      {t("results.jumpTitle")}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
                      {t("results.jumpSummary")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {groupedMatchJumpLinks.map((item) => (
                        <SearchJumpChip
                          key={`${item.href}:${item.label}`}
                          href={item.href}
                          label={item.label}
                          count={item.count}
                        />
                      ))}
                    </div>
                  </div>
                </PageSection>
              ) : null}
              {groupedMatches.map((group) => (
                <PageSection
                  key={group.kind}
                  id={getSearchResultGroupSectionId(group.kind)}
                  as="section"
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="lab-label">{group.title}</p>
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                      {t("results.groupCount", { count: group.matches.length })}
                    </span>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {group.matches.map((match) => (
                      <SearchResultCard
                        key={match.entry.id}
                        entry={match.displayEntry}
                        conceptProgress={match.conceptProgress}
                        trackProgress={match.trackProgress}
                        progressSource={progressSource}
                        progressCue={match.progressCue}
                      />
                    ))}
                  </div>
                </PageSection>
              ))}
            </div>
          ) : (
            <PageSection id="search-no-results" as="article" className="lab-panel p-8">
              <p className="text-lg font-semibold text-ink-950">{noResultsTitle}</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">{noResultsNote}</p>
              {noResultsRecoveryLinks.length ? (
                <div className="mt-4 space-y-2">
                  <p className="lab-label">{t("empty.recoveryLabel")}</p>
                  <div className="flex flex-wrap gap-3">
                    {noResultsRecoveryLinks.map((item) => (
                      <SearchSuggestionChip
                        key={`${item.href}:${item.label}`}
                        href={item.href}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/20"
                >
                  {t("actions.clearQuery")}
                </button>
                {routeState.topic !== DEFAULT_TOPIC ? (
                  <button
                    type="button"
                    onClick={() => browseTopic(DEFAULT_TOPIC)}
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/20"
                  >
                    {t("actions.clearTopicFilter")}
                  </button>
                ) : null}
                {routeState.subject !== DEFAULT_SUBJECT ? (
                  <button
                    type="button"
                    onClick={() => updateSubject(DEFAULT_SUBJECT)}
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/20"
                  >
                    {t("actions.clearSubjectFilter")}
                  </button>
                ) : null}
              </div>
            </PageSection>
          )
        ) : null}

        <DisplayAd placement="search.resultsDisplay" />
      </section>
  );
}
