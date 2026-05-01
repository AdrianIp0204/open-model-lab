"use client";

import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  buildConceptEntryAssessmentSessionDescriptor,
  buildPackAssessmentSessionDescriptor,
  buildTopicAssessmentSessionDescriptor,
  getPersistedAssessmentSessionMatch,
  useAssessmentSessionStoreReady,
  useAssessmentSessionStoreSnapshot,
  type AssessmentSessionMatch,
} from "@/lib/assessment-sessions";
import {
  getConceptMetadataBySlug,
  getTopicDiscoverySummaryBySlug,
  type SubjectDiscoverySummary,
  type TopicDiscoverySummary,
} from "@/lib/content";
import {
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getSubjectDisplayTitle,
  getSubjectDisplayTitleFromValue,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  resolveAccountProgressSnapshot,
  useProgressSnapshotReady,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { DiscoveryFilterSelect } from "@/components/layout/DiscoveryFilterSelect";
import { PageSection } from "@/components/layout/PageSection";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import {
  buildTestHubSummary,
  getConceptTestProgressState,
  getPackTestProgressState,
  getTopicTestProgressState,
  type ConceptTestCatalogEntry,
  type PackTestCatalogEntry,
  type TestHubProgressState,
  type TopicTestCatalogEntry,
} from "@/lib/test-hub";
import {
  buildGuidedTestTracks,
  buildPersonalizedTestSuggestions,
  resolveAssessmentDisplayState,
  resolveTestHubAssessmentActionKind,
  sortSuggestionsForResumePriority,
  type AssessmentDisplayStateKind,
  type TestHubAssessmentActionKind,
  type GuidedTestTrack,
  type GuidedTestTrackStep,
  type TestHubSuggestion,
} from "@/lib/test-hub";

type TestHubPageProps = {
  packEntries: PackTestCatalogEntry[];
  conceptEntries: ConceptTestCatalogEntry[];
  topicEntries: TopicTestCatalogEntry[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

type LocalizedConceptEntry = ConceptTestCatalogEntry & {
  displayTitle: string;
  displayShortTitle: string;
  displaySummary: string;
  displaySubject: string;
  displayTopic: string;
  searchValue: string;
};

type LocalizedTopicEntry = TopicTestCatalogEntry & {
  displayTitle: string;
  displaySummary: string;
  displaySubject: string;
  searchValue: string;
};

type LocalizedPackEntry = PackTestCatalogEntry & {
  displayTitle: string;
  displaySummary: string;
  displaySubject: string;
  displayTopicList: string;
  searchValue: string;
};

function getProgressSource(
  source: ReturnType<typeof resolveAccountProgressSnapshot>["source"],
) {
  return source === "local" ? "local" : "synced";
}

function getProgressTone(state: TestHubProgressState) {
  if (state.status === "completed" && state.latestResult === "clean") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-800";
  }

  if (state.status === "completed") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-800";
  }

  return "border-line bg-paper text-ink-700";
}

function getProgressSummaryLabel(
  state: TestHubProgressState,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  if (state.latestResult === "clean") {
    return t("progress.latestClean");
  }

  if (state.latestResult === "missed") {
    return t("progress.latestMissed", {
      count: state.latestIncorrectCount ?? 0,
    });
  }

  if (state.hasConceptActivityWithoutFinishedTest) {
    return t("progress.noFinishedRun");
  }

  return t("progress.noRunsYet");
}

function getActivityProgressTone(state: TestHubProgressState) {
  if (state.hasStartedAssessmentWithoutCompletion) {
    return "border-sky-500/25 bg-sky-500/10 text-sky-800";
  }

  return getProgressTone(state);
}

function getActivityStatusLabel(
  displayState: AssessmentDisplayStateKind,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  if (displayState === "resume") {
    return t("progress.resumeAvailable");
  }

  if (displayState === "started") {
    return t("progress.started");
  }

  if (displayState === "completed") {
    return t("progress.completed");
  }

  return t("progress.notStarted");
}

function getStartedProgressSummaryLabel(
  displayState: AssessmentDisplayStateKind,
  state: TestHubProgressState,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  if (displayState === "resume") {
    return t("progress.resumeDescription");
  }

  if (displayState === "started") {
    return t("progress.startedDescription");
  }

  return getProgressSummaryLabel(state, t);
}

function getSuggestionReasonLabel(
  suggestion: TestHubSuggestion,
  locale: AppLocale,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  switch (suggestion.reasonKind) {
    case "recent-test-activity":
      return t("suggestions.reasons.recentTestActivity");
    case "recent-study":
      return t("suggestions.reasons.recentStudy");
    case "next-in-topic":
      return t("suggestions.reasons.nextInTopic", {
        topic: suggestion.sourceTopicSlug
          ? getTopicDisplayTitle(
              getTopicDiscoverySummaryBySlug(suggestion.sourceTopicSlug),
              locale,
            )
          : t("suggestions.fallbackTopic"),
      });
    case "related-concept":
      return t("suggestions.reasons.relatedConcept", {
        concept: suggestion.sourceConceptSlug
          ? getConceptDisplayTitle(
              getConceptMetadataBySlug(suggestion.sourceConceptSlug),
              locale,
            )
          : t("suggestions.fallbackConcept"),
      });
    case "topic-milestone":
      return t("suggestions.reasons.topicMilestone", {
        topic: suggestion.sourceTopicSlug
          ? getTopicDisplayTitle(
              getTopicDiscoverySummaryBySlug(suggestion.sourceTopicSlug),
              locale,
            )
          : t("suggestions.fallbackTopic"),
      });
    case "pack-follow-on":
      return t("suggestions.reasons.packFollowOn", {
        topic: suggestion.sourceTopicSlug
          ? getTopicDisplayTitle(
              getTopicDiscoverySummaryBySlug(suggestion.sourceTopicSlug),
              locale,
            )
          : t("suggestions.fallbackTopic"),
      });
    case "starter":
      return t("suggestions.reasons.starter");
    default:
      return t("suggestions.reasons.starter");
  }
}

function getConceptEntryDisplayTitle(
  entry: ConceptTestCatalogEntry,
  locale: AppLocale,
) {
  return getConceptDisplayTitle(
    {
      slug: entry.conceptSlug,
      title: entry.title,
    },
    locale,
  );
}

function getConceptEntryDisplayShortTitle(
  entry: ConceptTestCatalogEntry,
  locale: AppLocale,
) {
  return getConceptDisplayShortTitle(
    {
      slug: entry.conceptSlug,
      title: entry.title,
      shortTitle: entry.shortTitle,
    },
    locale,
  );
}

function getConceptEntryDisplaySummary(
  entry: ConceptTestCatalogEntry,
  locale: AppLocale,
) {
  return getConceptDisplaySummary(
    {
      slug: entry.conceptSlug,
      summary: entry.summary,
    },
    locale,
  );
}

function getEntryDisplayTitle(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
  locale: AppLocale,
) {
  if (entry.kind === "concept") {
    return getConceptEntryDisplayTitle(entry, locale);
  }

  if (entry.kind === "topic") {
    return getTopicDisplayTitle(
      { slug: entry.topicSlug, title: entry.title },
      locale,
    );
  }

  return entry.title;
}

function getEntryDisplaySummary(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
  locale: AppLocale,
) {
  if (entry.kind === "concept") {
    return getConceptEntryDisplaySummary(entry, locale);
  }

  if (entry.kind === "topic") {
    return getTopicDisplayDescription(
      {
        slug: entry.topicSlug,
        description: entry.summary,
      } as TopicDiscoverySummary,
      locale,
    );
  }

  return entry.summary;
}

function getEntryDisplaySubject(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
  locale: AppLocale,
) {
  if (entry.kind === "pack") {
    return getSubjectDisplayTitle(
      {
        slug: entry.subjectSlug,
        title: entry.subjectTitle,
      } as SubjectDiscoverySummary,
      locale,
    );
  }

  return getSubjectDisplayTitleFromValue(entry.subject, locale);
}

function getEntryTestHref(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
) {
  return entry.testHref;
}

function getEntryReviewHref(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
) {
  return entry.reviewHref;
}

function getEntryResumeMatch(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
  matches: {
    concept: Map<string, AssessmentSessionMatch | null>;
    topic: Map<string, AssessmentSessionMatch | null>;
    pack: Map<string, AssessmentSessionMatch | null>;
  },
) {
  switch (entry.kind) {
    case "concept":
      return matches.concept.get(entry.conceptSlug) ?? null;
    case "topic":
      return matches.topic.get(entry.topicSlug) ?? null;
    case "pack":
      return matches.pack.get(entry.packSlug) ?? null;
  }
}

function getEntryTestIdSuffix(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
) {
  switch (entry.kind) {
    case "concept":
      return entry.conceptSlug;
    case "topic":
      return entry.topicSlug;
    case "pack":
      return entry.packSlug;
  }
}

function getSuggestionActionLabel(
  suggestion: TestHubSuggestion,
  actionKind: TestHubAssessmentActionKind,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  switch (suggestion.kind) {
    case "concept":
      if (actionKind === "resume") return t("actions.resumeConceptTest");
      if (actionKind === "continue") return t("actions.continueConceptTestPath");
      if (actionKind === "retake") return t("actions.retakeConceptTest");
      if (actionKind === "start") return t("actions.startConceptTest");
      return t("actions.openConceptTest");
    case "topic":
      if (actionKind === "resume") return t("actions.resumeTopicTest");
      if (actionKind === "continue") return t("actions.continueTopicTestPath");
      if (actionKind === "retake") return t("actions.retakeTopicTest");
      if (actionKind === "start") return t("actions.startTopicTest");
      return t("actions.openTopicTest");
    case "pack":
      if (actionKind === "resume") return t("actions.resumePack");
      if (actionKind === "continue") return t("actions.continuePackPath");
      if (actionKind === "retake") return t("actions.retakePack");
      if (actionKind === "start") return t("actions.startPack");
      return t("actions.openPack");
  }
}

function getCardActionLabel(
  entry: TestHubSuggestion["entry"] | GuidedTestTrackStep["entry"],
  actionKind: TestHubAssessmentActionKind,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  if (entry.kind === "concept") {
    if (actionKind === "resume") return t("actions.resumeConceptTest");
    if (actionKind === "continue") return t("actions.continueConceptTestPath");
    if (actionKind === "retake") return t("actions.retakeConceptTest");
    if (actionKind === "start") return t("actions.startConceptTest");
    return t("actions.openConceptTest");
  }

  if (entry.kind === "topic") {
    if (actionKind === "resume") return t("actions.resumeTopicTest");
    if (actionKind === "continue") return t("actions.continueTopicTestPath");
    if (actionKind === "retake") return t("actions.retakeTopicTest");
    if (actionKind === "start") return t("actions.startTopicTest");
    return t("actions.openTopicTest");
  }

  if (actionKind === "resume") return t("actions.resumePack");
  if (actionKind === "continue") return t("actions.continuePackPath");
  if (actionKind === "retake") return t("actions.retakePack");
  if (actionKind === "start") return t("actions.startPack");
  return t("actions.openPack");
}

function getGuidedTrackActionLabel(
  track: GuidedTestTrack,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  const nextStep = track.nextStep;

  if (!nextStep) {
    return t("guidedTracks.actions.reviewTrack");
  }

  if (nextStep.progress.hasStartedAssessmentWithoutCompletion) {
    return t("guidedTracks.actions.continueTrack");
  }

  switch (nextStep.kind) {
    case "concept":
      return t("guidedTracks.actions.startConcept");
    case "topic":
      return t("guidedTracks.actions.takeMilestone");
    case "pack":
      return t("guidedTracks.actions.openPackFollowOn");
  }
}

function getGuidedTrackStepLabel(
  step: GuidedTestTrackStep,
  t: ReturnType<typeof useTranslations<"TestHubPage">>,
) {
  switch (step.kind) {
    case "concept":
      return t("guidedTracks.stepKinds.concept");
    case "topic":
      return t("guidedTracks.stepKinds.topic");
    case "pack":
      return t("guidedTracks.stepKinds.pack");
  }
}

function buildConceptSearchValue(entry: ConceptTestCatalogEntry, locale: AppLocale) {
  return [
    getConceptEntryDisplayTitle(entry, locale),
    getConceptEntryDisplayShortTitle(entry, locale),
    getConceptEntryDisplaySummary(entry, locale),
    getSubjectDisplayTitleFromValue(entry.subject, locale),
    getTopicDisplayTitleFromValue(entry.topic, locale),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildTopicSearchValue(entry: TopicTestCatalogEntry, locale: AppLocale) {
  return [
    getTopicDisplayTitle({ slug: entry.topicSlug, title: entry.title }, locale),
    getTopicDisplayDescription(
      {
        slug: entry.topicSlug,
        description: entry.summary,
      } as TopicDiscoverySummary,
      locale,
    ),
    getSubjectDisplayTitleFromValue(entry.subject, locale),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildPackSearchValue(entry: PackTestCatalogEntry, locale: AppLocale) {
  return [
    entry.title,
    entry.summary,
    getSubjectDisplayTitle(
      {
        slug: entry.subjectSlug,
        title: entry.subjectTitle,
      } as SubjectDiscoverySummary,
      locale,
    ),
    ...entry.includedTopicTitles,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function groupEntriesBySubject<T extends { displaySubject: string }>(entries: T[]) {
  const groups = new Map<
    string,
    {
      subject: string;
      entries: T[];
    }
  >();

  for (const entry of entries) {
    const current = groups.get(entry.displaySubject) ?? {
      subject: entry.displaySubject,
      entries: [],
    };
    current.entries.push(entry);
    groups.set(entry.displaySubject, current);
  }

  return [...groups.values()];
}

function countGroupedEntries<T>(groups: Array<{ entries: T[] }>) {
  return groups.reduce((total, group) => total + group.entries.length, 0);
}

function ConceptTestCard({
  entry,
  progress,
  progressSource,
  assessmentReady,
  resumeMatch,
}: {
  entry: LocalizedConceptEntry;
  progress: TestHubProgressState;
  progressSource: "local" | "synced";
  assessmentReady: boolean;
  resumeMatch: AssessmentSessionMatch | null;
}) {
  const titleId = useId();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");
  const completedAtLabel = progress.completedAt
    ? formatProgressMonthDay(progress.completedAt, progressSource, locale)
    : null;
  const displayState = resolveAssessmentDisplayState({
    progress,
    resumeMatch,
    ready: assessmentReady,
  });
  const actionKind = resolveTestHubAssessmentActionKind({
    progress,
    resumeMatch,
    ready: assessmentReady,
  });

  return (
    <article
      className="lab-panel flex h-full flex-col gap-3 p-4"
      data-testid={`test-hub-card-concept-${entry.conceptSlug}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
            displayState === "resume" || displayState === "started"
              ? getActivityProgressTone(progress)
              : getProgressTone(progress),
          ].join(" ")}
        >
          {displayState === "loading"
            ? t("progress.loading")
            : getActivityStatusLabel(displayState, t)}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("labels.conceptTest")}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("meta.questions", { count: entry.questionCount })}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {entry.displayTopic}
        </span>
      </div>

      <LearningVisual kind="test" tone="teal" compact className="h-24" />

      <div className="space-y-2">
        <p className="lab-label">{entry.displaySubject}</p>
        <h3 id={titleId} className="text-lg font-semibold text-ink-950">{entry.displayTitle}</h3>
        {entry.displayShortTitle !== entry.displayTitle ? (
          <p className="text-sm font-semibold text-ink-500">{entry.displayShortTitle}</p>
        ) : null}
        <p className="text-sm leading-6 text-ink-700 sm:line-clamp-2">{entry.displaySummary}</p>
      </div>

      <div className="rounded-[18px] border border-line bg-paper-strong px-3 py-2">
        <p className="text-sm font-semibold text-ink-950">
          {displayState === "loading"
            ? t("progress.loadingDescription")
            : getStartedProgressSummaryLabel(displayState, progress, t)}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          {displayState !== "loading"
            ? `${progress.attempts > 0
                ? t("progress.finishedRuns", { count: progress.attempts })
                : t("progress.zeroAttempts")}${
                completedAtLabel ? ` ${t("progress.lastCompletedAt", { date: completedAtLabel })}` : ""
              }`
            : t("progress.loadingHint")}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={entry.testHref}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{ color: "var(--paper-strong)" }}
        >
          {getCardActionLabel(entry, actionKind, t)}
        </Link>
        <Link
          href={entry.reviewHref}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
        >
          {t("actions.reviewConcept")}
        </Link>
      </div>
    </article>
  );
}

function TopicTestCard({
  entry,
  progress,
  progressSource,
  assessmentReady,
  resumeMatch,
}: {
  entry: LocalizedTopicEntry;
  progress: TestHubProgressState;
  progressSource: "local" | "synced";
  assessmentReady: boolean;
  resumeMatch: AssessmentSessionMatch | null;
}) {
  const titleId = useId();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");
  const completedAtLabel = progress.completedAt
    ? formatProgressMonthDay(progress.completedAt, progressSource, locale)
    : null;
  const displayState = resolveAssessmentDisplayState({
    progress,
    resumeMatch,
    ready: assessmentReady,
  });
  const actionKind = resolveTestHubAssessmentActionKind({
    progress,
    resumeMatch,
    ready: assessmentReady,
  });

  return (
    <article
      className="lab-panel flex h-full flex-col gap-3 p-4"
      data-testid={`test-hub-card-topic-${entry.topicSlug}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
            displayState === "resume" || displayState === "started"
              ? getActivityProgressTone(progress)
              : getProgressTone(progress),
          ].join(" ")}
        >
          {displayState === "loading"
            ? t("progress.loading")
            : getActivityStatusLabel(displayState, t)}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("labels.topicTest")}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("meta.questions", { count: entry.questionCount })}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("meta.includedConcepts", { count: entry.includedConceptCount })}
        </span>
      </div>

      <LearningVisual kind="test" tone="sky" compact className="h-24" />

      <div className="space-y-2">
        <p className="lab-label">{entry.displaySubject}</p>
        <h3 id={titleId} className="text-lg font-semibold text-ink-950">{entry.displayTitle}</h3>
        <p className="text-sm leading-6 text-ink-700 sm:line-clamp-2">{entry.displaySummary}</p>
      </div>

      <div className="rounded-[18px] border border-line bg-paper-strong px-3 py-2">
        <p className="text-sm font-semibold text-ink-950">
          {displayState === "loading"
            ? t("progress.loadingDescription")
            : getStartedProgressSummaryLabel(displayState, progress, t)}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          {displayState !== "loading"
            ? `${progress.attempts > 0
                ? t("progress.finishedRuns", { count: progress.attempts })
                : t("progress.zeroAttempts")}${
                completedAtLabel ? ` ${t("progress.lastCompletedAt", { date: completedAtLabel })}` : ""
              }`
            : t("progress.loadingHint")}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={entry.testHref}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{ color: "var(--paper-strong)" }}
        >
          {getCardActionLabel(entry, actionKind, t)}
        </Link>
        <Link
          href={entry.reviewHref}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
        >
          {t("actions.reviewTopic")}
        </Link>
      </div>
    </article>
  );
}

function PackTestCard({
  entry,
  progress,
  progressSource,
  assessmentReady,
  resumeMatch,
}: {
  entry: LocalizedPackEntry;
  progress: TestHubProgressState;
  progressSource: "local" | "synced";
  assessmentReady: boolean;
  resumeMatch: AssessmentSessionMatch | null;
}) {
  const titleId = useId();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");
  const completedAtLabel = progress.completedAt
    ? formatProgressMonthDay(progress.completedAt, progressSource, locale)
    : null;
  const displayState = resolveAssessmentDisplayState({
    progress,
    resumeMatch,
    ready: assessmentReady,
  });
  const actionKind = resolveTestHubAssessmentActionKind({
    progress,
    resumeMatch,
    ready: assessmentReady,
  });

  return (
    <article
      className="lab-panel flex h-full flex-col gap-3 p-4"
      data-testid={`test-hub-card-pack-${entry.packSlug}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
            displayState === "resume" || displayState === "started"
              ? getActivityProgressTone(progress)
              : getProgressTone(progress),
          ].join(" ")}
        >
          {displayState === "loading"
            ? t("progress.loading")
            : getActivityStatusLabel(displayState, t)}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("labels.pack")}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("meta.questions", { count: entry.questionCount })}
        </span>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("meta.includedTopics", { count: entry.includedTopicCount })}
        </span>
      </div>

      <LearningVisual kind="test" tone="amber" compact className="h-24" />

      <div className="space-y-2">
        <p className="lab-label">{entry.displaySubject}</p>
        <h3 id={titleId} className="text-lg font-semibold text-ink-950">{entry.displayTitle}</h3>
        <p className="text-sm leading-6 text-ink-700 sm:line-clamp-2">{entry.displaySummary}</p>
        <p className="text-sm leading-6 text-ink-600 sm:line-clamp-1">{entry.displayTopicList}</p>
      </div>

      <div className="rounded-[18px] border border-line bg-paper-strong px-3 py-2">
        <p className="text-sm font-semibold text-ink-950">
          {displayState === "loading"
            ? t("progress.loadingDescription")
            : getStartedProgressSummaryLabel(displayState, progress, t)}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          {displayState !== "loading"
            ? `${progress.attempts > 0
                ? t("progress.finishedRuns", { count: progress.attempts })
                : t("progress.zeroAttempts")}${
                completedAtLabel ? ` ${t("progress.lastCompletedAt", { date: completedAtLabel })}` : ""
              }`
            : t("progress.loadingHint")}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={entry.testHref}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{ color: "var(--paper-strong)" }}
        >
          {getCardActionLabel(entry, actionKind, t)}
        </Link>
        <Link
          href={entry.reviewHref}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
        >
          {t("actions.reviewSubject")}
        </Link>
      </div>
    </article>
  );
}

function SuggestedTestCard({
  suggestion,
  progressSource,
  assessmentReady,
  resumeMatch,
}: {
  suggestion: TestHubSuggestion;
  progressSource: "local" | "synced";
  assessmentReady: boolean;
  resumeMatch: AssessmentSessionMatch | null;
}) {
  const titleId = useId();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");
  const displayTitle = getEntryDisplayTitle(suggestion.entry, locale);
  const displaySummary = getEntryDisplaySummary(suggestion.entry, locale);
  const displaySubject = getEntryDisplaySubject(suggestion.entry, locale);
  const reasonLabel = getSuggestionReasonLabel(suggestion, locale, t);
  const completedAtLabel = suggestion.progress.completedAt
    ? formatProgressMonthDay(suggestion.progress.completedAt, progressSource, locale)
    : null;
  const displayState = resolveAssessmentDisplayState({
    progress: suggestion.progress,
    resumeMatch,
    ready: assessmentReady,
  });
  const actionKind = resolveTestHubAssessmentActionKind({
    progress: suggestion.progress,
    resumeMatch,
    ready: assessmentReady,
  });

  return (
    <article
      className="lab-panel flex h-full flex-col gap-3 p-4"
      data-testid={`test-hub-suggestion-${suggestion.kind}-${getEntryTestIdSuffix(
        suggestion.entry,
      )}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
          {reasonLabel}
        </span>
        <span
          className={[
            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
            getActivityProgressTone(suggestion.progress),
          ].join(" ")}
        >
          {displayState === "loading"
            ? t("progress.loading")
            : getActivityStatusLabel(displayState, t)}
        </span>
      </div>

      <LearningVisual kind="test" tone="coral" compact className="h-24" />

      <div className="space-y-2">
        <p className="lab-label">{displaySubject}</p>
        <h3 id={titleId} className="text-lg font-semibold text-ink-950">{displayTitle}</h3>
        <p className="text-sm leading-6 text-ink-700 sm:line-clamp-2">{displaySummary}</p>
      </div>

      <div className="rounded-[18px] border border-line bg-paper-strong px-3 py-2">
        <p className="text-sm font-semibold text-ink-950">
          {displayState === "loading"
            ? t("progress.loadingDescription")
            : getStartedProgressSummaryLabel(displayState, suggestion.progress, t)}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          {displayState !== "loading"
            ? `${suggestion.progress.attempts > 0
                ? t("progress.finishedRuns", { count: suggestion.progress.attempts })
                : t("progress.zeroAttempts")}${
                completedAtLabel ? ` ${t("progress.lastCompletedAt", { date: completedAtLabel })}` : ""
              }`
            : t("progress.loadingHint")}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={getEntryTestHref(suggestion.entry)}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{ color: "var(--paper-strong)" }}
        >
          {getSuggestionActionLabel(suggestion, actionKind, t)}
        </Link>
        <Link
          href={getEntryReviewHref(suggestion.entry)}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
        >
          {suggestion.kind === "concept"
            ? t("actions.reviewConcept")
            : suggestion.kind === "topic"
              ? t("actions.reviewTopic")
              : t("actions.reviewSubject")}
        </Link>
      </div>
    </article>
  );
}

function QuickStartPanel({
  suggestion,
  progressSource,
  assessmentReady,
  resumeMatch,
  allStarterSuggestions,
  catalogCounts,
}: {
  suggestion: TestHubSuggestion | null;
  progressSource: "local" | "synced";
  assessmentReady: boolean;
  resumeMatch: AssessmentSessionMatch | null;
  allStarterSuggestions: boolean;
  catalogCounts: {
    packCount: number;
    topicCount: number;
    conceptCount: number;
  };
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");

  if (!assessmentReady || !suggestion) {
    const previewTitle = suggestion ? getEntryDisplayTitle(suggestion.entry, locale) : null;

    return (
      <section
        data-testid="test-hub-quick-start"
        className="rounded-[22px] border border-teal-500/20 bg-teal-500/8 p-3.5 shadow-sm sm:p-4"
        aria-labelledby="test-hub-quick-start-title"
      >
        <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
          <LearningVisual kind="test" tone="teal" compact className="h-24" />
          <div className="space-y-1.5">
            <p className="lab-label">{t("quickStart.eyebrow")}</p>
            <h2 id="test-hub-quick-start-title" className="text-xl font-semibold text-ink-950 sm:text-2xl">
              {suggestion ? t("quickStart.fallbackTitle") : t("quickStart.emptyTitle")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-ink-700">
              {suggestion && previewTitle
                ? t("quickStart.fallbackDescription", { title: previewTitle })
                : t("quickStart.emptyDescription")}
            </p>
          </div>
          {suggestion ? (
            <Link
              href={getEntryTestHref(suggestion.entry)}
              data-testid="test-hub-quick-start-action"
              className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("quickStart.fallbackAction")}
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const displayTitle = getEntryDisplayTitle(suggestion.entry, locale);
  const displaySummary = getEntryDisplaySummary(suggestion.entry, locale);
  const displaySubject = getEntryDisplaySubject(suggestion.entry, locale);
  const reasonLabel = getSuggestionReasonLabel(suggestion, locale, t);
  const completedAtLabel = suggestion.progress.completedAt
    ? formatProgressMonthDay(suggestion.progress.completedAt, progressSource, locale)
    : null;
  const displayState = resolveAssessmentDisplayState({
    progress: suggestion.progress,
    resumeMatch,
    ready: assessmentReady,
  });
  const actionKind = resolveTestHubAssessmentActionKind({
    progress: suggestion.progress,
    resumeMatch,
    ready: assessmentReady,
  });
  const statusLabel =
    displayState === "resume"
      ? t("quickStart.resumeLabel")
      : displayState === "started"
        ? t("quickStart.inProgressLabel")
        : getActivityStatusLabel(displayState, t);
  const runSummaryLabel = suggestion.progress.attempts > 0
    ? t("progress.finishedRuns", { count: suggestion.progress.attempts })
    : t("progress.zeroAttempts");
  const lastCompletedLabel = completedAtLabel
    ? t("progress.lastCompletedAt", { date: completedAtLabel })
    : null;

  return (
    <section
      data-testid="test-hub-quick-start"
      className="rounded-[22px] border border-teal-500/20 bg-teal-500/8 p-3.5 shadow-sm sm:p-4"
      aria-labelledby="test-hub-quick-start-title"
    >
      <div className="grid gap-3 lg:grid-cols-[7rem_minmax(0,1fr)_auto] lg:items-center">
        <LearningVisual kind="test" tone="teal" compact className="h-24" />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("quickStart.eyebrow")}</span>
            <span className="rounded-full border border-teal-500/25 bg-white/70 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-800">
              {displayState === "resume" ? t("quickStart.resumeLabel") : reasonLabel}
            </span>
            <span
              className={[
                "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                getActivityProgressTone(suggestion.progress),
              ].join(" ")}
            >
              {statusLabel}
            </span>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink-600">{displaySubject}</p>
            <h2 id="test-hub-quick-start-title" className="text-xl font-semibold text-ink-950 sm:text-2xl">
              {displayState === "resume" ? t("quickStart.resumeTitle") : t("quickStart.title")}
            </h2>
            <h3 className="text-lg font-semibold text-ink-950">{displayTitle}</h3>
            <p className="max-w-3xl text-sm leading-6 text-ink-700 sm:line-clamp-2">{displaySummary}</p>
          </div>
          <p className="hidden max-w-3xl text-sm leading-6 text-ink-700 sm:block">
            {allStarterSuggestions
              ? t("quickStart.starterDescription")
              : t("quickStart.description")}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
            {t("quickStart.catalogSummary", catalogCounts)}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-[20px] border border-line bg-paper-strong p-3 lg:min-w-[17rem]">
          <p className="text-sm font-semibold text-ink-950">
            {getStartedProgressSummaryLabel(displayState, suggestion.progress, t)}
          </p>
          <p className="text-xs leading-5 text-ink-600">
            {lastCompletedLabel ? `${runSummaryLabel} ${lastCompletedLabel}` : runSummaryLabel}
          </p>
          <Link
            href={getEntryTestHref(suggestion.entry)}
            data-testid="test-hub-quick-start-action"
            className="inline-flex items-center justify-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
            style={{ color: "var(--paper-strong)" }}
          >
            {getSuggestionActionLabel(suggestion, actionKind, t)}
          </Link>
          <Link
            href={getEntryReviewHref(suggestion.entry)}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
          >
            {suggestion.kind === "concept"
              ? t("actions.reviewConcept")
              : suggestion.kind === "topic"
                ? t("actions.reviewTopic")
                : t("actions.reviewSubject")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function GuidedTrackCard({
  track,
  assessmentReady,
  resumeMatch,
}: {
  track: GuidedTestTrack;
  assessmentReady: boolean;
  resumeMatch: AssessmentSessionMatch | null;
}) {
  const titleId = useId();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");
  const nextStep = track.nextStep;
  const currentStepHref = assessmentReady
    ? nextStep?.entry.testHref ?? `/concepts/topics/${track.topicSlug}`
    : `/concepts/topics/${track.topicSlug}`;
  const displayState = resolveAssessmentDisplayState({
    progress: nextStep?.progress ?? {
      status: "not-started",
      latestResult: null,
      latestIncorrectCount: null,
      attempts: 0,
      startedAt: null,
      completedAt: null,
      hasConceptActivityWithoutFinishedTest: false,
      hasStartedAssessmentWithoutCompletion: false,
    },
    resumeMatch,
    ready: assessmentReady,
  });
  const nextActionKind = nextStep
    ? resolveTestHubAssessmentActionKind({
        progress: nextStep.progress,
        resumeMatch,
        ready: assessmentReady,
      })
    : "open";

  return (
    <article
      className="lab-panel flex h-full flex-col gap-3 p-4"
      data-testid={`test-hub-guided-track-${track.topicSlug}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("guidedTracks.cardLabel")}
        </span>
        <span
          className={[
            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
            nextStep
              ? displayState === "resume" || displayState === "started"
                ? getActivityProgressTone(nextStep.progress)
                : getProgressTone(nextStep.progress)
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800",
          ].join(" ")}
        >
          {assessmentReady
            ? nextStep
              ? getActivityStatusLabel(displayState, t)
              : t("guidedTracks.completedLabel")
            : t("progress.loading")}
        </span>
      </div>

      <LearningVisual kind="guided" tone="sky" compact className="h-24" />

      <div className="space-y-2">
        <p className="lab-label">{getSubjectDisplayTitleFromValue(track.subject, locale)}</p>
        <h3 id={titleId} className="text-lg font-semibold text-ink-950">
          {t("guidedTracks.trackTitle", { topic: getTopicDisplayTitle(getTopicDiscoverySummaryBySlug(track.topicSlug), locale) })}
        </h3>
        <p className="text-sm leading-6 text-ink-700 sm:line-clamp-2">
          {t("guidedTracks.trackDescription", {
            conceptCount: track.conceptCount,
            hasPack: track.packStep ? t("guidedTracks.withPack") : t("guidedTracks.withoutPack"),
          })}
        </p>
      </div>

      <div className="rounded-[18px] border border-line bg-paper-strong px-3 py-2">
        <p className="text-sm font-semibold text-ink-950">
          {assessmentReady
            ? nextStep
              ? t("guidedTracks.nextStepDescription", {
                  stepKind: getGuidedTrackStepLabel(nextStep, t),
                  title: getEntryDisplayTitle(nextStep.entry, locale),
                })
              : t("guidedTracks.completedDescription")
            : t("guidedTracks.loadingDescription")}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          {assessmentReady
            ? t("guidedTracks.progressSummary", {
                completed: track.completedStepCount,
                total: track.totalSteps,
              })
            : t("progress.loadingHint")}
        </p>
      </div>

      {nextStep ? (
        <div
          className="rounded-[16px] border border-line bg-paper-strong px-3 py-2 text-sm leading-6 text-ink-800"
          data-testid={`test-hub-guided-track-steps-${track.topicSlug}`}
        >
          <span className="font-semibold text-ink-950">
            {t("guidedTracks.nextStepShort", {
              stepKind: getGuidedTrackStepLabel(nextStep, t),
              title: getEntryDisplayTitle(nextStep.entry, locale),
            })}
          </span>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={currentStepHref}
          aria-describedby={titleId}
          data-testid={`test-hub-guided-track-next-${track.topicSlug}`}
          className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{ color: "var(--paper-strong)" }}
        >
          {assessmentReady && nextStep
            ? nextActionKind === "resume"
              ? t("guidedTracks.actions.resumeTrack")
              : getGuidedTrackActionLabel(track, t)
            : t("guidedTracks.actions.openTopic")}
        </Link>
        <Link
          href={`/concepts/topics/${track.topicSlug}`}
          aria-describedby={titleId}
          className="inline-flex items-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
        >
          {t("actions.reviewTopic")}
        </Link>
      </div>
    </article>
  );
}

function SubjectGroupSection<T extends { displaySubject: string }>({
  sectionId,
  eyebrow,
  title,
  groups,
  renderEntry,
}: {
  sectionId: string;
  eyebrow: string;
  title: string;
  groups: Array<{ subject: string; entries: T[] }>;
  renderEntry: (entry: T) => ReactNode;
}) {
  return (
    <PageSection id={sectionId}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="lab-label">{eyebrow}</p>
          <h2 className="text-2xl font-semibold text-ink-950">{title}</h2>
        </div>
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={`${sectionId}-${group.subject}`} className="space-y-4">
              <h3 className="text-lg font-semibold text-ink-950">{group.subject}</h3>
              <div className="grid gap-4 xl:grid-cols-2">
                {group.entries.map((entry) => renderEntry(entry))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageSection>
  );
}

export function TestHubPage({
  packEntries,
  conceptEntries,
  topicEntries,
  initialSyncedSnapshot = null,
}: TestHubPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TestHubPage");
  const localSnapshot = useProgressSnapshot();
  const progressReady = useProgressSnapshotReady();
  const assessmentSessionSnapshot = useAssessmentSessionStoreSnapshot();
  const assessmentSessionReady = useAssessmentSessionStoreReady();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource = getProgressSource(progressDisplay.source);
  const snapshot = progressDisplay.snapshot;
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const showRecommendationPanels = !query.trim() && subjectFilter === "all";
  const assessmentReady = progressReady && assessmentSessionReady;

  const localizedConceptEntries = useMemo(
    () =>
      conceptEntries.map((entry) => ({
        ...entry,
        displayTitle: getConceptEntryDisplayTitle(entry, locale),
        displayShortTitle: getConceptEntryDisplayShortTitle(entry, locale),
        displaySummary: getConceptEntryDisplaySummary(entry, locale),
        displaySubject: getSubjectDisplayTitleFromValue(entry.subject, locale),
        displayTopic: getTopicDisplayTitleFromValue(entry.topic, locale),
        searchValue: buildConceptSearchValue(entry, locale),
      })),
    [conceptEntries, locale],
  );

  const localizedPackEntries = useMemo(
    () =>
      packEntries.map((entry) => ({
        ...entry,
        displayTitle: entry.title,
        displaySummary: entry.summary,
        displaySubject: getSubjectDisplayTitle(
          {
            slug: entry.subjectSlug,
            title: entry.subjectTitle,
          } as SubjectDiscoverySummary,
          locale,
        ),
        displayTopicList: entry.includedTopicTitles.join(" • "),
        searchValue: buildPackSearchValue(entry, locale),
      })),
    [locale, packEntries],
  );

  const localizedTopicEntries = useMemo(
    () =>
      topicEntries.map((entry) => ({
        ...entry,
        displayTitle: getTopicDisplayTitle(
          { slug: entry.topicSlug, title: entry.title },
          locale,
        ),
        displaySummary: getTopicDisplayDescription(
          {
            slug: entry.topicSlug,
            description: entry.summary,
          } as TopicDiscoverySummary,
          locale,
        ),
        displaySubject: getSubjectDisplayTitleFromValue(entry.subject, locale),
        searchValue: buildTopicSearchValue(entry, locale),
      })),
    [locale, topicEntries],
  );

  const summary = useMemo(
    () =>
      progressReady
        ? buildTestHubSummary([...packEntries, ...topicEntries, ...conceptEntries], snapshot)
        : null,
    [conceptEntries, packEntries, progressReady, snapshot, topicEntries],
  );

  const subjectOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of [...localizedPackEntries, ...localizedTopicEntries, ...localizedConceptEntries]) {
      counts.set(entry.displaySubject, (counts.get(entry.displaySubject) ?? 0) + 1);
    }

    return [
      {
        value: "all",
        label: t("filters.allSubjects"),
        count:
          localizedPackEntries.length +
          localizedTopicEntries.length +
          localizedConceptEntries.length,
      },
      ...[...counts.entries()].map(([subject, count]) => ({
        value: subject,
        label: subject,
        count,
      })),
    ];
  }, [localizedConceptEntries, localizedPackEntries, localizedTopicEntries, t]);

  const filteredPackEntries = useMemo(
    () =>
      localizedPackEntries.filter((entry) => {
        const matchesSubject =
          subjectFilter === "all" || entry.displaySubject === subjectFilter;
        const matchesQuery =
          !deferredQuery || entry.searchValue.includes(deferredQuery);

        return matchesSubject && matchesQuery;
      }),
    [deferredQuery, localizedPackEntries, subjectFilter],
  );

  const filteredTopicEntries = useMemo(
    () =>
      localizedTopicEntries.filter((entry) => {
        const matchesSubject =
          subjectFilter === "all" || entry.displaySubject === subjectFilter;
        const matchesQuery =
          !deferredQuery || entry.searchValue.includes(deferredQuery);

        return matchesSubject && matchesQuery;
      }),
    [deferredQuery, localizedTopicEntries, subjectFilter],
  );

  const filteredConceptEntries = useMemo(
    () =>
      localizedConceptEntries.filter((entry) => {
        const matchesSubject =
          subjectFilter === "all" || entry.displaySubject === subjectFilter;
        const matchesQuery =
          !deferredQuery || entry.searchValue.includes(deferredQuery);

        return matchesSubject && matchesQuery;
      }),
    [deferredQuery, localizedConceptEntries, subjectFilter],
  );

  const topicGroups = useMemo(
    () => groupEntriesBySubject(filteredTopicEntries),
    [filteredTopicEntries],
  );
  const packGroups = useMemo(
    () => groupEntriesBySubject(filteredPackEntries),
    [filteredPackEntries],
  );
  const conceptGroups = useMemo(
    () => groupEntriesBySubject(filteredConceptEntries),
    [filteredConceptEntries],
  );
  const conceptResumeMatches = useMemo(
    () =>
      new Map(
        conceptEntries.map((entry) => [
          entry.conceptSlug,
          getPersistedAssessmentSessionMatch(
            assessmentSessionSnapshot,
            buildConceptEntryAssessmentSessionDescriptor(entry, locale),
          ),
        ] as const),
      ),
    [assessmentSessionSnapshot, conceptEntries, locale],
  );
  const topicResumeMatches = useMemo(
    () =>
      new Map(
        topicEntries.map((entry) => [
          entry.topicSlug,
          getPersistedAssessmentSessionMatch(
            assessmentSessionSnapshot,
            buildTopicAssessmentSessionDescriptor(entry, locale),
          ),
        ] as const),
      ),
    [assessmentSessionSnapshot, locale, topicEntries],
  );
  const packResumeMatches = useMemo(
    () =>
      new Map(
        packEntries.map((entry) => [
          entry.packSlug,
          getPersistedAssessmentSessionMatch(
            assessmentSessionSnapshot,
            buildPackAssessmentSessionDescriptor(entry, locale),
          ),
        ] as const),
      ),
    [assessmentSessionSnapshot, locale, packEntries],
  );
  const usesSyncedProgress =
    progressReady && (progressDisplay.source === "synced" || progressDisplay.source === "merged");
  const personalizedSuggestions = useMemo(() => {
    const baseSuggestions = buildPersonalizedTestSuggestions({
        conceptEntries,
        topicEntries,
        packEntries,
        snapshot,
      });

    if (!assessmentReady) {
      return baseSuggestions;
    }

    return sortSuggestionsForResumePriority(baseSuggestions, (suggestion) =>
      getEntryResumeMatch(suggestion.entry, {
        concept: conceptResumeMatches,
        topic: topicResumeMatches,
        pack: packResumeMatches,
      }),
    );
  }, [
    assessmentReady,
    conceptEntries,
    conceptResumeMatches,
    packEntries,
    packResumeMatches,
    snapshot,
    topicEntries,
    topicResumeMatches,
  ]);
  const guidedTracks = useMemo(
    () =>
      buildGuidedTestTracks({
        conceptEntries,
        topicEntries,
        packEntries,
        snapshot,
      }),
    [conceptEntries, packEntries, snapshot, topicEntries],
  );
  const allStarterSuggestions =
    personalizedSuggestions.length > 0 &&
    personalizedSuggestions.every((suggestion) => suggestion.reasonKind === "starter");
  const topSuggestion = personalizedSuggestions[0] ?? null;
  const displayedSuggestions = showRecommendationPanels
    ? personalizedSuggestions.slice(0, 2)
    : personalizedSuggestions;
  const displayedGuidedTracks = showRecommendationPanels
    ? guidedTracks.slice(0, 1)
    : guidedTracks;
  const fullCatalogCount =
    countGroupedEntries(packGroups) +
    countGroupedEntries(topicGroups) +
    countGroupedEntries(conceptGroups);
  const totalCatalogCount = packEntries.length + topicEntries.length + conceptEntries.length;
  const showCompactCatalog = showRecommendationPanels && !catalogExpanded && fullCatalogCount > 10;
  const displayedPackGroups = showCompactCatalog
    ? []
    : packGroups;
  const displayedTopicGroups = showCompactCatalog
    ? []
    : topicGroups;
  const displayedConceptGroups = showCompactCatalog
    ? []
    : conceptGroups;
  const displayedCatalogCount =
    countGroupedEntries(displayedPackGroups) +
    countGroupedEntries(displayedTopicGroups) +
    countGroupedEntries(displayedConceptGroups);
  const hasHiddenCatalogEntries = displayedCatalogCount < fullCatalogCount;
  const topSuggestionResumeMatch = topSuggestion
    ? getEntryResumeMatch(topSuggestion.entry, {
        concept: conceptResumeMatches,
        topic: topicResumeMatches,
        pack: packResumeMatches,
      })
    : null;
  const fallbackStartEntry =
    localizedConceptEntries.find((entry) => entry.conceptSlug === "simple-harmonic-motion") ??
    localizedConceptEntries[0] ??
    localizedTopicEntries[0] ??
    localizedPackEntries[0] ??
    null;
  const catalogSections = (
    <>
      {displayedPackGroups.length ? (
        <SubjectGroupSection
          sectionId="pack-tests"
          eyebrow={t("sections.pack.eyebrow")}
          title={t("sections.pack.title")}
          groups={displayedPackGroups}
          renderEntry={(entry) => (
            <PackTestCard
              key={entry.packSlug}
              entry={entry}
              progress={getPackTestProgressState(snapshot, entry)}
              progressSource={progressSource}
              assessmentReady={assessmentReady}
              resumeMatch={packResumeMatches.get(entry.packSlug) ?? null}
            />
          )}
        />
      ) : null}

      {displayedTopicGroups.length ? (
        <SubjectGroupSection
          sectionId="topic-tests"
          eyebrow={t("sections.topic.eyebrow")}
          title={t("sections.topic.title")}
          groups={displayedTopicGroups}
          renderEntry={(entry) => (
            <TopicTestCard
              key={entry.topicSlug}
              entry={entry}
              progress={getTopicTestProgressState(snapshot, entry)}
              progressSource={progressSource}
              assessmentReady={assessmentReady}
              resumeMatch={topicResumeMatches.get(entry.topicSlug) ?? null}
            />
          )}
        />
      ) : null}

      {displayedConceptGroups.length ? (
        <SubjectGroupSection
          sectionId="concept-tests"
          eyebrow={t("sections.concept.eyebrow")}
          title={t("sections.concept.title")}
          groups={displayedConceptGroups}
          renderEntry={(entry) => (
            <ConceptTestCard
              key={entry.conceptSlug}
              entry={entry}
              progress={getConceptTestProgressState(snapshot, entry)}
              progressSource={progressSource}
              assessmentReady={assessmentReady}
              resumeMatch={conceptResumeMatches.get(entry.conceptSlug) ?? null}
            />
          )}
        />
      ) : null}

      {hasHiddenCatalogEntries && !showCompactCatalog ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setCatalogExpanded(true)}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:border-teal-500/35 hover:bg-white/90"
            data-testid="test-hub-show-full-catalog"
          >
            {t("catalog.showAll", {
              shown: displayedCatalogCount,
              total: fullCatalogCount,
            })}
          </button>
        </div>
      ) : null}

      {!packGroups.length && !topicGroups.length && !conceptGroups.length ? (
        <article className="lab-panel p-5 sm:p-6">
          <p className="lab-label">{t("empty.eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-950">{t("empty.title")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-700">
            {t("empty.description")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSubjectFilter("all");
              }}
              className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("empty.clearFilters")}
            </button>
          </div>
        </article>
      ) : null}
    </>
  );
  const shouldLeadWithCatalog = catalogExpanded || !showRecommendationPanels;

  return (
    <section className="space-y-5 sm:space-y-6" data-onboarding-target="test-hub-results">
      <article className="page-band space-y-4 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("hero.eyebrow")}</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {progressReady
                ? usesSyncedProgress
                  ? t("hero.syncedProgress")
                  : t("hero.localProgress")
                : t("hero.progressLoading")}
            </span>
          </div>
          <h1 className="max-w-3xl text-[1.75rem] font-semibold leading-tight text-ink-950 sm:text-[2.35rem]">
            {t("hero.title")}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-700 sm:text-base">
            {t("hero.description")}
          </p>
        </div>

        {topSuggestion ? (
          <QuickStartPanel
            suggestion={topSuggestion}
            progressSource={progressSource}
            assessmentReady={assessmentReady}
            resumeMatch={topSuggestionResumeMatch}
            allStarterSuggestions={allStarterSuggestions}
            catalogCounts={{
              packCount: packEntries.length,
              topicCount: topicEntries.length,
              conceptCount: conceptEntries.length,
            }}
          />
        ) : fallbackStartEntry ? (
          <section className="rounded-[22px] border border-teal-500/20 bg-teal-500/8 p-3.5 shadow-sm sm:p-4">
            <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
              <LearningVisual kind="test" tone="teal" compact className="h-24" />
              <div className="space-y-1.5">
                <p className="lab-label">{t("quickStart.eyebrow")}</p>
                <h2 className="text-xl font-semibold text-ink-950 sm:text-2xl">
                  {t("quickStart.fallbackTitle")}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-ink-700">
                  {t("quickStart.fallbackDescription", {
                    title: fallbackStartEntry.displayTitle,
                  })}
                </p>
              </div>
              <Link
                href={fallbackStartEntry.testHref}
                data-testid="test-hub-quick-start-action"
                className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                style={{ color: "var(--paper-strong)" }}
              >
                {t("quickStart.fallbackAction")}
              </Link>
            </div>
          </section>
        ) : null}

        <div
          data-testid="test-hub-progress-strip"
          className="rounded-[20px] border border-line bg-paper-strong p-2.5 sm:p-3"
        >
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <div className="rounded-[16px] bg-paper px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {t("summary.totalLabel")}
              </p>
              <p data-testid="test-hub-total-count" className="mt-1 text-xl font-semibold text-ink-950">
                {progressReady && summary ? summary.totalTests : "—"}
              </p>
              <p className="mt-1 hidden text-xs leading-5 text-ink-600 sm:block">
                {progressReady && summary
                  ? t("summary.totalDescription", {
                      conceptCount: conceptEntries.length,
                      topicCount: topicEntries.length,
                      packCount: packEntries.length,
                    })
                  : t("summary.loadingDescription")}
              </p>
            </div>
            <div className="rounded-[16px] bg-paper px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {t("summary.completedLabel")}
              </p>
              <p data-testid="test-hub-completed-count" className="mt-1 text-xl font-semibold text-ink-950">
                {progressReady && summary ? summary.completedTests : "—"}
              </p>
              <p className="mt-1 hidden text-xs leading-5 text-ink-600 sm:block">
                {progressReady ? t("summary.completedDescription") : t("summary.loadingDescription")}
              </p>
            </div>
            <div className="rounded-[16px] bg-paper px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {t("summary.cleanLabel")}
              </p>
              <p data-testid="test-hub-clean-count" className="mt-1 text-xl font-semibold text-ink-950">
                {progressReady && summary ? summary.latestCleanTests : "—"}
              </p>
              <p className="mt-1 hidden text-xs leading-5 text-ink-600 sm:block">
                {progressReady ? t("summary.cleanDescription") : t("summary.loadingDescription")}
              </p>
            </div>
            <div className="rounded-[16px] bg-paper px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {t("summary.remainingLabel")}
              </p>
              <p data-testid="test-hub-remaining-count" className="mt-1 text-xl font-semibold text-ink-950">
                {progressReady && summary ? summary.remainingTests : "—"}
              </p>
              <p className="mt-1 hidden text-xs leading-5 text-ink-600 sm:block">
                {progressReady ? t("summary.remainingDescription") : t("summary.loadingDescription")}
              </p>
            </div>
          </div>
        </div>
        {!progressReady ? (
          <p
            data-testid="test-hub-progress-pending"
            className="text-sm leading-6 text-ink-600 sm:line-clamp-1"
          >
            {t("progress.loadingDescription")}
          </p>
        ) : null}
      </article>

      <article
        className="lab-panel space-y-4 p-4 sm:p-5"
        data-onboarding-target="test-hub-controls"
        data-testid="test-hub-controls"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <label className="space-y-2">
            <span className="lab-label">{t("search.label")}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search.placeholder")}
              className="w-full rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm text-ink-950 outline-none transition-colors focus:border-teal-500"
              aria-label={t("search.label")}
            />
          </label>
          <DiscoveryFilterSelect
            label={t("filters.subjectLabel")}
            value={subjectFilter}
            options={subjectOptions}
            onChange={setSubjectFilter}
            ariaSuffix={t("filters.ariaSuffix")}
          />
        </div>
        <p
          data-testid="test-hub-filter-summary"
          aria-live="polite"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500"
        >
          {t("filters.resultsSummary", {
            shown: fullCatalogCount,
            total: totalCatalogCount,
          })}
        </p>
      </article>

      {showCompactCatalog ? (
        <article className="lab-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="space-y-2">
            <p className="lab-label">{t("catalog.eyebrow")}</p>
            <h2 className="text-xl font-semibold text-ink-950">{t("catalog.title")}</h2>
            <p className="max-w-2xl text-sm leading-6 text-ink-700">
              {t("catalog.description", {
                packCount: packEntries.length,
                topicCount: topicEntries.length,
                conceptCount: conceptEntries.length,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCatalogExpanded(true)}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:border-teal-500/35 hover:bg-white/90"
            data-testid="test-hub-show-full-catalog"
          >
            {t("catalog.showAll", {
              shown: 0,
              total: fullCatalogCount,
            })}
          </button>
        </article>
      ) : null}

      {shouldLeadWithCatalog ? catalogSections : null}

      {showRecommendationPanels ? (
        <PageSection id="suggested-tests">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="lab-label">{t("suggestions.eyebrow")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">{t("suggestions.title")}</h2>
              <p className="max-w-3xl text-sm leading-7 text-ink-700">
                {progressReady
                  ? allStarterSuggestions
                    ? t("suggestions.starterDescription")
                    : t("suggestions.description")
                  : t("suggestions.loadingDescription")}
              </p>
            </div>
            {!assessmentReady ? (
              <p
                data-testid="test-hub-suggestions-pending"
                className="text-sm leading-6 text-ink-600 sm:line-clamp-1"
              >
                {t("suggestions.loadingDescription")}
              </p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {displayedSuggestions.map((suggestion) => (
                  <SuggestedTestCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    progressSource={progressSource}
                    assessmentReady={assessmentReady}
                    resumeMatch={getEntryResumeMatch(suggestion.entry, {
                      concept: conceptResumeMatches,
                      topic: topicResumeMatches,
                      pack: packResumeMatches,
                    })}
                  />
                ))}
              </div>
            )}
          </div>
        </PageSection>
      ) : null}

      {showRecommendationPanels ? (
        <PageSection id="guided-testing-tracks">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="lab-label">{t("guidedTracks.eyebrow")}</p>
              <h2 className="text-2xl font-semibold text-ink-950">{t("guidedTracks.title")}</h2>
              <p className="max-w-3xl text-sm leading-7 text-ink-700">
                {assessmentReady
                  ? t("guidedTracks.description")
                  : t("guidedTracks.loadingDescription")}
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {displayedGuidedTracks.map((track) => (
                <GuidedTrackCard
                  key={track.id}
                  track={track}
                  assessmentReady={assessmentReady}
                  resumeMatch={
                    track.nextStep
                      ? getEntryResumeMatch(track.nextStep.entry, {
                          concept: conceptResumeMatches,
                          topic: topicResumeMatches,
                          pack: packResumeMatches,
                        })
                      : null
                  }
                />
              ))}
            </div>
          </div>
        </PageSection>
      ) : null}

      {!shouldLeadWithCatalog ? catalogSections : null}
    </section>
  );
}
