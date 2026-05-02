"use client";

import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import type {
  ChallengeDepth,
  ChallengeDiscoveryEntry,
  ChallengeDiscoveryIndex,
} from "@/lib/content";
import {
  buildChallengeTrackBrowserHref,
  resolveChallengeTrackCtaTargets,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { buildChallengeEntryHref } from "@/lib/share-links";
import {
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  getChallengeProgressState,
  getChallengeStartedAt,
  getConceptProgressLastActivityAt,
  getConceptProgressRecord,
  resolveAccountProgressSnapshot,
  type ChallengeProgressState,
  type ProgressSnapshot,
  useProgressSnapshot,
} from "@/lib/progress";
import { PageSection } from "@/components/layout/PageSection";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MotionStaggerGroup } from "@/components/motion";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { getChallengeVisualDescriptor } from "@/components/visuals/learningVisualDescriptors";
import { translateChallengeCueLabel } from "@/lib/i18n/challenge-ui";
import { formatDisplayText } from "@/lib/physics/math";

export type ChallengeDiscoveryHubInitialFilters = {
  search?: string;
  topic?: string;
  track?: string;
  depth?: "all" | ChallengeDepth;
  progress?: "all" | ChallengeProgressState;
};

type ChallengeProgressEntry = {
  entry: ChallengeDiscoveryEntry;
  state: ChallengeProgressState;
  solvedAt: string | null;
  startedAt: string | null;
  conceptLastActivityAt: string | null;
  searchText: string;
};

type ChallengeTrackProgress = ChallengeDiscoveryIndex["tracks"][number] & {
  solvedCount: number;
  startedCount: number;
  toTryCount: number;
  nextEntry: ChallengeProgressEntry | null;
  browserHref: string;
  firstChallengeHref: string | null;
};

type ChallengeProgressSource = "local" | "synced";
type FeaturedEntryLabelKey =
  | "continueNow"
  | "bestFirst"
  | "compareHeavy"
  | "featured";

const accentTopClasses: Record<ChallengeDiscoveryEntry["concept"]["accent"], string> = {
  teal: "from-teal-500/60 via-teal-500/12 to-transparent",
  amber: "from-amber-500/60 via-amber-500/12 to-transparent",
  coral: "from-coral-500/60 via-coral-500/12 to-transparent",
  sky: "from-sky-500/60 via-sky-500/12 to-transparent",
  ink: "from-ink-950/45 via-ink-950/8 to-transparent",
};

const challengeStateClasses: Record<ChallengeProgressState, string> = {
  solved: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  started: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "to-try": "border-line bg-paper-strong text-ink-700",
};

const challengeDepthClasses: Record<ChallengeDepth, string> = {
  "warm-up": "border-line bg-paper-strong text-ink-600",
  core: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  stretch: "border-coral-500/20 bg-coral-500/10 text-coral-700",
};

function formatSavedDate(value: string | null, locale?: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatChallengeCardText(value: string) {
  return formatDisplayText(value)
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function getCanonicalChallengeDepthTerms(depth: ChallengeDepth) {
  switch (depth) {
    case "warm-up":
      return ["warm-up", "warm up"];
    case "core":
      return ["core"];
    default:
      return ["stretch"];
  }
}

function buildSearchText(
  entry: ChallengeDiscoveryEntry,
  input: {
    locale: AppLocale;
    challengeDepthLabel: string;
  },
) {
  return normalizeSearchText(
    [
      entry.title,
      entry.prompt,
      formatChallengeCardText(entry.prompt),
      entry.concept.title,
      getConceptDisplayTitle(entry.concept, input.locale),
      entry.concept.shortTitle,
      entry.concept.summary,
      getConceptDisplaySummary(entry.concept, input.locale),
      entry.topic.title,
      getTopicDisplayTitle(entry.topic, input.locale),
      entry.concept.topic,
      entry.concept.subtopic,
      ...entry.concept.highlights,
      ...entry.targetMetrics,
      ...entry.targetParams,
      ...entry.cueLabels,
      ...entry.requirementLabels,
      ...entry.targetLabels,
      input.challengeDepthLabel,
      ...getCanonicalChallengeDepthTerms(entry.depth),
      ...entry.starterTracks.map((track) =>
        getStarterTrackDisplayTitle(track, input.locale),
      ),
      ...entry.starterTracks.map((track) => track.title),
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  );
}

function resolveInitialTopicFilter(
  index: ChallengeDiscoveryIndex,
  value: string | undefined,
) {
  return value && index.topics.some((topic) => topic.slug === value) ? value : "all";
}

function resolveInitialTrackFilter(
  index: ChallengeDiscoveryIndex,
  value: string | undefined,
) {
  return value && index.tracks.some((track) => track.slug === value) ? value : "all";
}

function resolveInitialDepthFilter(value: string | undefined): "all" | ChallengeDepth {
  return value === "warm-up" || value === "core" || value === "stretch" ? value : "all";
}

function resolveInitialProgressFilter(
  value: string | undefined,
): "all" | ChallengeProgressState {
  return value === "to-try" || value === "started" || value === "solved" ? value : "all";
}

function buildChallengeProgressEntry(
  entry: ChallengeDiscoveryEntry,
  snapshot: ReturnType<typeof useProgressSnapshot>,
  locale: AppLocale,
  challengeDepthLabel: string,
): ChallengeProgressEntry {
  const record = getConceptProgressRecord(snapshot, entry.concept);
  const solvedAt = record?.completedChallenges?.[entry.id] ?? null;
  const startedAt = getChallengeStartedAt(record, entry.id);

  return {
    entry,
    state: getChallengeProgressState(record, entry.id),
    solvedAt,
    startedAt,
    conceptLastActivityAt: getConceptProgressLastActivityAt(record),
    searchText: buildSearchText(entry, { locale, challengeDepthLabel }),
  };
}

function getProgressNote(
  item: ChallengeProgressEntry,
  progressSource: ChallengeProgressSource,
  locale: string,
  t: ReturnType<typeof useTranslations<"ChallengeHub">>,
  conceptTitle: string,
) {
  if (item.state === "solved") {
    const savedLabel = formatSavedDate(item.solvedAt, locale);
    if (progressSource === "synced") {
      return savedLabel
        ? t("progress.solvedSyncedWithDate", { date: savedLabel })
        : t("progress.solvedSynced");
    }

    return savedLabel
      ? t("progress.solvedLocalWithDate", { date: savedLabel })
      : t("progress.solvedLocal");
  }

  if (item.state === "started") {
    const savedLabel = formatSavedDate(item.startedAt, locale);
    if (progressSource === "synced") {
      return savedLabel
        ? t("progress.startedSyncedWithDate", { date: savedLabel })
        : t("progress.startedSyncedForConcept", { title: conceptTitle });
    }

    return savedLabel
      ? t("progress.startedLocalWithDate", { date: savedLabel })
      : t("progress.startedLocalForConcept", { title: conceptTitle });
  }

  return progressSource === "synced"
    ? t("progress.noneSynced")
    : t("progress.noneLocal");
}

function getTrackOpenLabel(
  trackTitle: string,
  t: ReturnType<typeof useTranslations<"ChallengeHub">>,
) {
  return t("actions.openTrackTitle", { title: trackTitle });
}

function pickFeaturedEntries(
  entries: ChallengeProgressEntry[],
  quickStartEntryId: string | null,
) {
  const picks: Array<{ item: ChallengeProgressEntry; labelKey: FeaturedEntryLabelKey }> =
    [];
  const seenIds = new Set<string>();

  const startedItem = [...entries]
    .filter((item) => item.state === "started")
    .sort((left, right) => {
      const leftActivity = left.startedAt ?? left.conceptLastActivityAt ?? "";
      const rightActivity = right.startedAt ?? right.conceptLastActivityAt ?? "";

      if (leftActivity !== rightActivity) {
        return rightActivity.localeCompare(leftActivity);
      }

      return left.entry.order - right.entry.order;
    })[0];

  if (startedItem) {
    picks.push({ item: startedItem, labelKey: "continueNow" });
    seenIds.add(startedItem.entry.id);
  }

  const quickStartItem = quickStartEntryId
    ? entries.find((item) => item.entry.id === quickStartEntryId)
    : null;

  if (quickStartItem && !seenIds.has(quickStartItem.entry.id)) {
    picks.push({ item: quickStartItem, labelKey: "bestFirst" });
    seenIds.add(quickStartItem.entry.id);
  }

  const compareEntry = entries.find(
    (item) => item.entry.usesCompare && !seenIds.has(item.entry.id),
  );

  if (compareEntry && picks.length < 2) {
    picks.push({ item: compareEntry, labelKey: "compareHeavy" });
    seenIds.add(compareEntry.entry.id);
  }

  for (const item of entries) {
    if (picks.length >= 2) {
      break;
    }

    if (seenIds.has(item.entry.id)) {
      continue;
    }

    picks.push({ item, labelKey: "featured" });
    seenIds.add(item.entry.id);
  }

  return picks;
}

export function ChallengeDiscoveryHub({
  index,
  initialFilters,
  initialSyncedSnapshot = null,
}: {
  index: ChallengeDiscoveryIndex;
  initialFilters?: ChallengeDiscoveryHubInitialFilters;
  initialSyncedSnapshot?: ProgressSnapshot | null;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ChallengeHub");
  const challengeUi = useTranslations("ChallengeUi");
  const challengeStateLabels: Record<ChallengeProgressState, string> = {
    solved: t("states.solved"),
    started: t("states.started"),
    "to-try": t("states.toTry"),
  };
  const challengeStyleLabels: Record<ChallengeDiscoveryEntry["style"], string> = {
    "target-setting": t("styles.target"),
    "parameter-match": t("styles.match"),
    maximize: t("styles.maximize"),
    minimize: t("styles.minimize"),
    "visible-condition": t("styles.condition"),
  };
  const challengeDepthLabels: Record<ChallengeDepth, string> = {
    "warm-up": t("depth.warmUp"),
    core: t("depth.core"),
    stretch: t("depth.stretch"),
  };
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource: ChallengeProgressSource =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const [search, setSearch] = useState(() => initialFilters?.search?.trim() ?? "");
  const [topicFilter, setTopicFilter] = useState(() =>
    resolveInitialTopicFilter(index, initialFilters?.topic),
  );
  const [trackFilter, setTrackFilter] = useState(() =>
    resolveInitialTrackFilter(index, initialFilters?.track),
  );
  const [depthFilter, setDepthFilter] = useState<"all" | ChallengeDepth>(() =>
    resolveInitialDepthFilter(initialFilters?.depth),
  );
  const [progressFilter, setProgressFilter] = useState<"all" | ChallengeProgressState>(() =>
    resolveInitialProgressFilter(initialFilters?.progress),
  );
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = normalizeSearchText(deferredSearch);

  const progressEntries = index.entries.map((entry) =>
    buildChallengeProgressEntry(
      entry,
      snapshot,
      locale,
      challengeDepthLabels[entry.depth],
    ),
  );
  const solvedCount = progressEntries.filter((item) => item.state === "solved").length;
  const startedCount = progressEntries.filter((item) => item.state === "started").length;
  const toTryCount = progressEntries.length - solvedCount - startedCount;
  const featuredEntries = pickFeaturedEntries(
    progressEntries,
    index.quickStartEntry?.id ?? null,
  );
  const continueEntry =
    featuredEntries.find((item) => item.labelKey === "continueNow")?.item ?? null;
  const primaryEntry =
    continueEntry ??
    progressEntries.find((item) => item.state === "to-try") ??
    progressEntries[0] ??
    null;
  const getEntryHref = (entry: ChallengeDiscoveryEntry) =>
    buildChallengeEntryHref(entry.concept.slug, entry.id, locale);

  const trackProgress = index.tracks.map((track) => {
    const trackEntries = progressEntries.filter((item) =>
      item.entry.starterTracks.some((membership) => membership.slug === track.slug),
    );
    const ctaTargets = resolveChallengeTrackCtaTargets(index, track.slug, locale);
    const solved = trackEntries.filter((item) => item.state === "solved").length;
    const started = trackEntries.filter((item) => item.state === "started").length;
    const nextEntry =
      trackEntries.find((item) => item.state === "started") ??
      trackEntries.find((item) => item.state === "to-try") ??
      trackEntries[0] ??
      null;

    return {
      ...track,
      solvedCount: solved,
      startedCount: started,
      toTryCount: trackEntries.length - solved - started,
      nextEntry,
      browserHref: ctaTargets?.browserHref ?? buildChallengeTrackBrowserHref(track.slug, locale),
      firstChallengeHref: ctaTargets?.firstChallengeHref ?? null,
    } satisfies ChallengeTrackProgress;
  });

  const guidedTrack =
    trackProgress.find((track) => track.startedCount > 0) ??
    trackProgress[0] ??
    null;

  const filteredEntries = progressEntries.filter((item) => {
    const matchesSearch = !normalizedSearch || item.searchText.includes(normalizedSearch);
    const matchesTopic = topicFilter === "all" || item.entry.topic.slug === topicFilter;
    const matchesTrack =
      trackFilter === "all" ||
      item.entry.starterTracks.some((track) => track.slug === trackFilter);
    const matchesDepth = depthFilter === "all" || item.entry.depth === depthFilter;
    const matchesProgress = progressFilter === "all" || item.state === progressFilter;

    return matchesSearch && matchesTopic && matchesTrack && matchesDepth && matchesProgress;
  });

  const hasActiveFilters =
    normalizedSearch.length > 0 ||
    topicFilter !== "all" ||
    trackFilter !== "all" ||
    depthFilter !== "all" ||
    progressFilter !== "all";
  const activeFilterLabels = [
    normalizedSearch ? t("filters.active.search", { query: deferredSearch.trim() }) : null,
    topicFilter !== "all"
      ? getTopicDisplayTitle(
          index.topics.find((topic) => topic.slug === topicFilter)!,
          locale,
        )
      : null,
    trackFilter !== "all"
      ? getStarterTrackDisplayTitle(
          index.tracks.find((track) => track.slug === trackFilter)!,
          locale,
        )
      : null,
    depthFilter !== "all" ? challengeDepthLabels[depthFilter] : null,
    progressFilter !== "all" ? challengeStateLabels[progressFilter] : null,
  ].filter((label): label is string => Boolean(label));
  const featuredEntry = featuredEntries[0]?.item ?? primaryEntry;
  const featuredVisual = featuredEntry
    ? getChallengeVisualDescriptor({
        ...featuredEntry.entry,
        prompt: featuredEntry.entry.prompt,
        accent: featuredEntry.entry.concept.accent,
      })
    : null;
  const featuredPrompt = featuredEntry
    ? formatChallengeCardText(featuredEntry.entry.prompt)
    : null;
  const solvedPercent = progressEntries.length
    ? Math.round((solvedCount / progressEntries.length) * 100)
    : 0;
  const depthGroups = (["warm-up", "core", "stretch"] as const)
    .map((depth) => ({
      depth,
      label: challengeDepthLabels[depth],
      entries: filteredEntries.filter((item) => item.entry.depth === depth),
    }))
    .filter((group) => group.entries.length > 0);

  const renderChallengeCard = (item: ChallengeProgressEntry) => {
    const visibleTracks = item.entry.starterTracks.slice(0, 2);
    const hiddenTrackCount = Math.max(0, item.entry.starterTracks.length - visibleTracks.length);
    const visual = getChallengeVisualDescriptor({
      ...item.entry,
      prompt: item.entry.prompt,
      accent: item.entry.concept.accent,
    });
    const displayPrompt = formatChallengeCardText(item.entry.prompt);

    return (
      <article
        key={item.entry.id}
        className="motion-enter motion-card list-row-card relative overflow-hidden p-5"
      >
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[item.entry.concept.accent]}`}
        />
        <div className="space-y-4">
          <LearningVisual
            kind={visual.kind}
            motif={visual.motif}
            overlay={visual.overlay}
            isFallback={visual.isFallback}
            fallbackKind={visual.fallbackKind}
            tone={visual.tone ?? item.entry.concept.accent}
            compact
            className="h-24 sm:h-28"
            ariaLabel={`${item.entry.title} visual cue`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{getTopicDisplayTitle(item.entry.topic, locale)}</span>
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                challengeStateClasses[item.state],
              ].join(" ")}
            >
              {challengeStateLabels[item.state]}
            </span>
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                challengeDepthClasses[item.entry.depth],
              ].join(" ")}
            >
              {challengeDepthLabels[item.entry.depth]}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-ink-950">{item.entry.title}</h3>
            <p className="text-sm leading-6 text-ink-700">{displayPrompt}</p>
            <p className="text-sm font-semibold text-ink-950">
              {getConceptDisplayTitle(item.entry.concept, locale)}
            </p>
            <p className="text-sm leading-6 text-ink-600">
              {getProgressNote(
                item,
                progressSource,
                locale,
                t,
                getConceptDisplayTitle(item.entry.concept, locale),
              )}
            </p>
          </div>

          {item.entry.starterTracks.length ? (
            <p className="text-sm leading-6 text-ink-600">
              {copyText(locale, "Appears in ", "出現在")}
              {visibleTracks
                .map((track) => getStarterTrackDisplayTitle(track, locale))
                .join(", ")}
              {hiddenTrackCount
                ? copyText(
                    locale,
                    ` and ${hiddenTrackCount} more path${hiddenTrackCount === 1 ? "" : "s"}.`,
                    ` 以及另外 ${hiddenTrackCount} 條路徑。`,
                  )
                : "."}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <span className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
              {challengeStyleLabels[item.entry.style]}
            </span>
            <span className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
              {t("card.checks", { count: item.entry.checkCount })}
            </span>
            {item.entry.usesCompare ? (
              <span className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                {translateChallengeCueLabel("Compare mode", challengeUi)}
              </span>
            ) : null}
            {!item.entry.usesCompare && item.entry.usesInspect ? (
              <span className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                {translateChallengeCueLabel("Inspect time", challengeUi)}
              </span>
            ) : null}
          </div>

          <div>
            <Link
              href={getEntryHref(item.entry)}
              className="cta-primary"
            >
              {item.state === "started"
                ? t("actions.continueChallenge")
                : t("actions.openChallenge")}
            </Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-6 sm:space-y-7">
      <PageSection
        id="challenge-overview"
        as="section"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
      >
        <article className="motion-enter motion-card page-hero-surface relative overflow-hidden p-5 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(78,166,223,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(30,166,162,0.12),transparent_28%)]" />
          <div className="relative space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">{t("hero.eyebrow")}</span>
              <span className="progress-pill text-sm">
                {copyText(
                  locale,
                  `Solved ${solvedCount} of ${progressEntries.length} challenges`,
                  `已解決 ${solvedCount} / ${progressEntries.length} 個挑戰`,
                )}
              </span>
              {progressSource === "synced" ? (
                <span className="progress-pill text-sm">{t("progressSummary.syncedBadge")}</span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl text-[2.35rem] font-semibold leading-[0.98] text-ink-950 sm:text-[2.85rem]">
                {t("hero.title")}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-ink-700">
                {t("hero.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {primaryEntry ? (
                <Link
                  href={getEntryHref(primaryEntry.entry)}
                  className="cta-primary"
                  data-testid="challenge-primary-cta"
                >
                  {primaryEntry.state === "started"
                    ? t("actions.continueChallenge")
                    : t("actions.startWithTitle", { title: primaryEntry.entry.title })}
                </Link>
              ) : null}
              <Link href="#challenge-guided-paths" className="cta-secondary">
                {copyText(locale, "Browse starter paths", "瀏覽入門路徑")}
              </Link>
            </div>

            {featuredEntry ? (
              <article className="motion-enter motion-card list-row-card relative overflow-hidden p-5">
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[featuredEntry.entry.concept.accent]}`}
                />
                <div className="space-y-3">
                  {featuredVisual ? (
                    <LearningVisual
                      kind={featuredVisual.kind}
                      motif={featuredVisual.motif}
                      overlay={featuredVisual.overlay}
                      isFallback={featuredVisual.isFallback}
                      fallbackKind={featuredVisual.fallbackKind}
                      tone={featuredVisual.tone ?? featuredEntry.entry.concept.accent}
                      compact
                      className="h-24 sm:h-28"
                      ariaLabel={`${featuredEntry.entry.title} visual cue`}
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="lab-label">
                      {featuredEntry.state === "started"
                        ? t("featuredLabels.continueNow")
                        : t("featuredLabels.bestFirst")}
                    </span>
                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                        challengeStateClasses[featuredEntry.state],
                      ].join(" ")}
                    >
                      {challengeStateLabels[featuredEntry.state]}
                    </span>
                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                        challengeDepthClasses[featuredEntry.entry.depth],
                      ].join(" ")}
                    >
                      {challengeDepthLabels[featuredEntry.entry.depth]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-ink-950">{featuredEntry.entry.title}</h2>
                    <p className="text-sm leading-6 text-ink-700">{featuredPrompt}</p>
                    <p className="text-sm font-semibold text-ink-950">
                      {getConceptDisplayTitle(featuredEntry.entry.concept, locale)}
                    </p>
                    <p className="text-sm leading-6 text-ink-600">
                      {getProgressNote(
                        featuredEntry,
                        progressSource,
                        locale,
                        t,
                        getConceptDisplayTitle(featuredEntry.entry.concept, locale),
                      )}
                    </p>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </article>

        <aside className="page-band p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="lab-label">
                {progressSource === "synced"
                  ? t("progressSummary.syncedEyebrow")
                  : t("progressSummary.localEyebrow")}
              </p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {copyText(
                  locale,
                  "Keep progress visible without turning the hub into a dashboard.",
                  "讓進度保持可見，但不要把這個頁面變成另一個儀表板。",
                )}
              </h2>
              <p className="text-sm leading-6 text-ink-700">
                {copyText(
                  locale,
                  `Solved ${solvedCount} of ${progressEntries.length} challenges. ${startedCount} are already in motion and ${toTryCount} remain untouched.`,
                  `已解決 ${solvedCount} / ${progressEntries.length} 個挑戰，另有 ${startedCount} 個正在進行，還有 ${toTryCount} 個尚未開始。`,
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="progress-track">
                <div className="progress-value" style={{ width: `${solvedPercent}%` }} />
              </div>
              <p className="text-sm text-ink-600">
                {copyText(locale, `${solvedPercent}% fully solved`, `已完整解決 ${solvedPercent}%`)}
              </p>
            </div>

            {guidedTrack ? (
              <div className="rounded-[24px] border border-line bg-paper-strong p-4">
                <p className="lab-label">{t("guidedPath.eyebrow")}</p>
                <h3 className="mt-3 text-xl font-semibold text-ink-950">
                  {getStarterTrackDisplayTitle(guidedTrack, locale)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {copyText(
                    locale,
                    `Solved ${guidedTrack.solvedCount} of ${guidedTrack.challengeCount} path challenges.`,
                    `已解決這條路徑中的 ${guidedTrack.solvedCount} / ${guidedTrack.challengeCount} 個挑戰。`,
                  )}
                </p>
                {guidedTrack.nextEntry ? (
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {t("guidedPaths.bestEntryNote", {
                      challenge: guidedTrack.nextEntry.entry.title,
                      concept: getConceptDisplayTitle(guidedTrack.nextEntry.entry.concept, locale),
                    })}
                  </p>
                ) : null}
                <div className="mt-4">
                  <Link href={guidedTrack.firstChallengeHref ?? guidedTrack.path} className="cta-primary">
                    {guidedTrack.firstChallengeHref
                      ? guidedTrack.nextEntry?.state === "started"
                        ? t("actions.continueChallenge")
                        : t("actions.openFirstChallenge")
                      : getTrackOpenLabel(getStarterTrackDisplayTitle(guidedTrack, locale), t)}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </PageSection>

      <PageSection id="challenge-guided-paths" as="section">
        <DisclosurePanel
          title={copyText(locale, "Starter challenge paths", "入門挑戰路徑")}
          summary={copyText(
            locale,
            "Open these only when you want the next few challenge moves narrowed into one authored path.",
            "當你想把接下來幾個挑戰收窄成一條作者編排好的路徑時，再展開這些入門路徑。",
          )}
        >
          <div className="space-y-4">
            <MotionStaggerGroup className="grid gap-4 xl:grid-cols-3" baseDelay={140}>
              {trackProgress.slice(0, 3).map((track) => (
                <article key={track.slug} className="motion-enter motion-card list-row-card p-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="lab-label">{t("guidedPaths.starterTrackLabel")}</span>
                      <span className="progress-pill text-sm">
                        {copyText(
                          locale,
                          `${track.solvedCount}/${track.challengeCount} solved`,
                          `已解決 ${track.solvedCount}/${track.challengeCount}`,
                        )}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-ink-950">
                      {getStarterTrackDisplayTitle(track, locale)}
                    </h3>
                    <p className="text-sm leading-6 text-ink-700">
                      {getStarterTrackDisplaySummary(track, locale)}
                    </p>
                    {track.nextEntry ? (
                      <p className="text-sm leading-6 text-ink-600">
                        {t("guidedPaths.bestEntryNote", {
                          challenge: track.nextEntry.entry.title,
                          concept: getConceptDisplayTitle(track.nextEntry.entry.concept, locale),
                        })}
                      </p>
                    ) : null}
                    <div>
                      <Link href={track.firstChallengeHref ?? track.path} className="cta-primary">
                        {track.firstChallengeHref
                          ? track.nextEntry?.state === "started"
                            ? t("actions.continueChallenge")
                            : t("actions.openFirstChallenge")
                          : getTrackOpenLabel(getStarterTrackDisplayTitle(track, locale), t)}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </MotionStaggerGroup>

            {trackProgress.length > 3 ? (
              <details className="rounded-[22px] border border-line bg-paper px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
                  {copyText(
                    locale,
                    `Show ${trackProgress.length - 3} more starter paths`,
                    `顯示另外 ${trackProgress.length - 3} 條入門路徑`,
                  )}
                </summary>
                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {trackProgress.slice(3).map((track) => (
                    <article key={track.slug} className="list-row-card p-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="lab-label">{t("guidedPaths.starterTrackLabel")}</span>
                          <span className="progress-pill text-sm">
                            {copyText(
                              locale,
                              `${track.solvedCount}/${track.challengeCount} solved`,
                              `已解決 ${track.solvedCount}/${track.challengeCount}`,
                            )}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-ink-950">
                          {getStarterTrackDisplayTitle(track, locale)}
                        </h3>
                        <p className="text-sm leading-6 text-ink-700">
                          {getStarterTrackDisplaySummary(track, locale)}
                        </p>
                        <div>
                          <Link href={track.firstChallengeHref ?? track.path} className="cta-primary">
                            {track.firstChallengeHref
                              ? t("actions.openFirstChallenge")
                              : getTrackOpenLabel(getStarterTrackDisplayTitle(track, locale), t)}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </DisclosurePanel>
      </PageSection>

      <PageSection id="challenge-browser" as="section" className="space-y-5">
        <SectionHeading
          density="dense"
          eyebrow={t("browser.eyebrow")}
          title={copyText(
            locale,
            "Browse all open challenges only when you need a wider scan.",
            "只有當你真的想擴大掃描範圍時，才瀏覽全部開放挑戰。",
          )}
          description={copyText(
            locale,
            "Search, topic, path, depth, and progress filters still stay available, but the results now group by depth instead of dumping one giant flat list.",
            "搜尋、主題、路徑、深度與進度篩選仍然都在，但結果現在會先按深度分組，而不再一次丟出一整張扁平清單。",
          )}
          action={
            hasActiveFilters ? (
              <button
                type="button"
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/20"
                onClick={() => {
                    setSearch("");
                    setTopicFilter("all");
                    setTrackFilter("all");
                    setDepthFilter("all");
                    setProgressFilter("all");
                  }}
              >
                {t("actions.resetAll")}
              </button>
            ) : null
          }
        />

        <div className="motion-enter motion-card filter-panel p-5">
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="challenge-search" className="lab-label">
                {t("filters.search.label")}
              </label>
              <input
                id="challenge-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("filters.search.placeholder")}
                className="w-full rounded-[22px] border border-line bg-paper-strong px-4 py-3 text-base text-ink-950 placeholder:text-ink-500"
              />
            </div>

            <div className="filter-group">
              <p className="lab-label">{t("filters.topics.label")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-active={topicFilter === "all" ? "true" : "false"}
                  className={[
                    "motion-nav-pill filter-option",
                    topicFilter === "all"
                      ? "border-ink-950 bg-ink-950 text-paper-strong"
                      : "hover:border-ink-950/20 hover:text-ink-950",
                  ].join(" ")}
                  onClick={() => setTopicFilter("all")}
                >
                  {t("filters.topics.all", { count: index.totalChallenges })}
                </button>
                {index.topics.map((topic) => (
                  <button
                    key={topic.slug}
                    type="button"
                    data-active={topicFilter === topic.slug ? "true" : "false"}
                    className={[
                      "motion-nav-pill filter-option",
                      topicFilter === topic.slug
                        ? "border-ink-950 bg-ink-950 text-paper-strong"
                        : "hover:border-ink-950/20 hover:text-ink-950",
                    ].join(" ")}
                    onClick={() => setTopicFilter(topic.slug)}
                  >
                    {getTopicDisplayTitle(topic, locale)} ({topic.challengeCount})
                  </button>
                ))}
              </div>
            </div>

            <details
              className="rounded-[22px] border border-line bg-paper px-4 py-3"
              open={trackFilter !== "all" || depthFilter !== "all" || progressFilter !== "all"}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <p className="lab-label">{t("filters.more.label")}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-700">
                    {t("filters.more.description")}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
                  {trackFilter !== "all" || depthFilter !== "all" || progressFilter !== "all"
                    ? t("filters.more.active")
                    : t("filters.more.optional")}
                </span>
              </summary>

              <div className="mt-3 space-y-4 border-t border-line pt-3">
                <div className="space-y-3">
                  <p className="lab-label">{t("filters.paths.label")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-active={trackFilter === "all" ? "true" : "false"}
                      className={[
                        "motion-nav-pill filter-option",
                        trackFilter === "all"
                          ? "border-ink-950 bg-ink-950 text-paper-strong"
                          : "hover:border-ink-950/20 hover:text-ink-950",
                      ].join(" ")}
                      onClick={() => setTrackFilter("all")}
                    >
                      {t("filters.paths.all")}
                    </button>
                    {index.tracks.map((track) => (
                      <button
                        key={track.slug}
                        type="button"
                        data-active={trackFilter === track.slug ? "true" : "false"}
                        className={[
                          "motion-nav-pill filter-option",
                          trackFilter === track.slug
                            ? "border-ink-950 bg-ink-950 text-paper-strong"
                            : "hover:border-ink-950/20 hover:text-ink-950",
                        ].join(" ")}
                        onClick={() => setTrackFilter(track.slug)}
                      >
                        {getStarterTrackDisplayTitle(track, locale)} ({track.challengeCount})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="lab-label">{t("filters.depth.label")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-active={depthFilter === "all" ? "true" : "false"}
                      className={[
                        "motion-nav-pill filter-option",
                        depthFilter === "all"
                          ? "border-ink-950 bg-ink-950 text-paper-strong"
                          : "hover:border-ink-950/20 hover:text-ink-950",
                      ].join(" ")}
                      onClick={() => setDepthFilter("all")}
                    >
                      {t("filters.depth.all")}
                    </button>
                    {(
                      [
                        { id: "warm-up", count: index.entries.filter((entry) => entry.depth === "warm-up").length },
                        { id: "core", count: index.entries.filter((entry) => entry.depth === "core").length },
                        { id: "stretch", count: index.entries.filter((entry) => entry.depth === "stretch").length },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-active={depthFilter === item.id ? "true" : "false"}
                        className={[
                          "motion-nav-pill filter-option",
                          depthFilter === item.id
                            ? "border-ink-950 bg-ink-950 text-paper-strong"
                            : "hover:border-ink-950/20 hover:text-ink-950",
                        ].join(" ")}
                        onClick={() => setDepthFilter(item.id)}
                      >
                        {challengeDepthLabels[item.id]} ({item.count})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="lab-label">{t("filters.progress.label")}</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "all", label: t("filters.progress.all", { count: progressEntries.length }) },
                        { id: "to-try", label: t("filters.progress.toTry", { count: toTryCount }) },
                        { id: "started", label: t("filters.progress.started", { count: startedCount }) },
                        { id: "solved", label: t("filters.progress.solved", { count: solvedCount }) },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-active={progressFilter === item.id ? "true" : "false"}
                        className={[
                          "filter-option",
                          progressFilter === item.id
                            ? "border-ink-950 bg-ink-950 text-paper-strong"
                            : "hover:border-ink-950/20 hover:text-ink-950",
                        ].join(" ")}
                        onClick={() => setProgressFilter(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
              {filteredEntries.length
                ? t("browser.showing", {
                    shown: filteredEntries.length,
                    total: progressEntries.length,
                  })
                : t("browser.none")}{" "}
              {activeFilterLabels.length
                ? t("browser.activeFilters", {
                    labels: activeFilterLabels.join(", "),
                  })
                : null}
            </div>
          </div>
        </div>

        {filteredEntries.length ? (
          <div className="space-y-6">
            {depthGroups.map((group) => (
              <section key={group.depth} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="space-y-1">
                    <p className="lab-label">{copyText(locale, "Challenge depth", "挑戰深度")}</p>
                    <h3 className="text-xl font-semibold text-ink-950">{group.label}</h3>
                  </div>
                  <p className="text-sm text-ink-600">
                    {copyText(
                      locale,
                      `${group.entries.length} prompt${group.entries.length === 1 ? "" : "s"} in this depth`,
                      `這個深度共有 ${group.entries.length} 個挑戰提示`,
                    )}
                  </p>
                </div>

                <MotionStaggerGroup className="grid gap-4 xl:grid-cols-2" baseDelay={160}>
                  {group.entries.slice(0, 4).map((item) => renderChallengeCard(item))}
                </MotionStaggerGroup>

                {group.entries.length > 4 ? (
                  <details className="rounded-[22px] border border-line bg-paper px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">
                      {copyText(
                        locale,
                        `Show ${group.entries.length - 4} more ${group.label.toLowerCase()} challenges`,
                        `顯示另外 ${group.entries.length - 4} 個${group.label}挑戰`,
                      )}
                    </summary>
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      {group.entries.slice(4).map((item) => renderChallengeCard(item))}
                    </div>
                  </details>
                ) : null}
              </section>
            ))}
          </div>
        ) : (
          <div className="motion-enter motion-card lab-panel p-6">
            <p className="text-lg font-semibold text-ink-950">{t("empty.title")}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
              {t("empty.description")}
            </p>
          </div>
        )}
      </PageSection>
    </section>
  );
}
