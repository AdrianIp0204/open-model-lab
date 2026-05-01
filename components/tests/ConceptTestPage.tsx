"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { ConceptContent } from "@/lib/content";
import { buildConceptAssessmentSessionDescriptor } from "@/lib/assessment-sessions";
import {
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getSubjectDisplayTitleFromValue,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  useProgressSnapshotReady,
  type ProgressSnapshot,
} from "@/lib/progress";
import {
  getConceptTestProgressState,
  resolveAssessmentDisplayState,
  type ConceptTestCatalogEntry,
} from "@/lib/test-hub";
import { buildConceptStandaloneFollowUpActions } from "@/lib/test-hub/standalone-follow-up";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { QuickTestSection } from "@/components/concepts/QuickTestSection";
import { useAssessmentSessionMatch, useAssessmentSessionStoreReady } from "@/lib/assessment-sessions";
import {
  ConceptLearningBridgeProvider,
  useConceptLearningBridge,
} from "@/components/concepts/ConceptLearningBridge";

type ConceptTestPageProps = {
  concept: Pick<
    ConceptContent,
    | "id"
    | "slug"
    | "title"
    | "shortTitle"
    | "summary"
    | "subject"
    | "topic"
    | "difficulty"
    | "quickTest"
    | "sections"
    | "simulation"
    | "graphs"
    | "variableLinks"
  >;
  entry: ConceptTestCatalogEntry;
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

function getDifficultyMessageKey(difficulty: string): "intro" | "intermediate" | "advanced" {
  switch (difficulty.trim().toLowerCase()) {
    case "advanced":
      return "advanced";
    case "intermediate":
      return "intermediate";
    case "intro":
    default:
      return "intro";
  }
}

export function ConceptTestPage({
  concept,
  entry,
  initialSyncedSnapshot = null,
}: ConceptTestPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptTestPage");
  const localSnapshot = useProgressSnapshot();
  const progressReady = useProgressSnapshotReady();
  const assessmentSessionReady = useAssessmentSessionStoreReady();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource = progressDisplay.source === "local" ? "local" : "synced";
  const progressState = getConceptTestProgressState(progressDisplay.snapshot, {
    conceptId: concept.id,
    conceptSlug: concept.slug,
    title: concept.title,
  });
  const resumeDescriptor = buildConceptAssessmentSessionDescriptor(
    concept as ConceptContent,
    locale,
  );
  const resumeMatch = useAssessmentSessionMatch(resumeDescriptor);
  const assessmentReady = progressReady && assessmentSessionReady;
  const displayState = resolveAssessmentDisplayState({
    progress: progressState,
    resumeMatch,
    ready: assessmentReady,
  });
  const followUpActions = buildConceptStandaloneFollowUpActions({
    concept,
    entry,
    snapshot: progressDisplay.snapshot,
    locale,
    labels: {
      nextTest: t("actions.nextTest"),
      reviewConcept: t("actions.reviewConcept"),
      backToHub: t("actions.backToHub"),
      relatedConcept: (title) => t("followUp.actions.relatedConcept", { title }),
      topicMilestone: (title) => t("followUp.actions.topicMilestone", { title }),
      packFollowOn: (title) => t("followUp.actions.packFollowOn", { title }),
    },
  });
  const completedAtLabel = progressState.completedAt
    ? formatProgressMonthDay(progressState.completedAt, progressSource, locale)
    : null;

  return (
    <section
      data-testid="standalone-concept-test-page"
      className="space-y-4 sm:space-y-5"
    >
      <article className="page-band p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("hero.eyebrow")}</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {getSubjectDisplayTitleFromValue(concept.subject, locale)}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {getTopicDisplayTitleFromValue(concept.topic, locale)}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.questionCount", { count: entry.questionCount })}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t(`difficulty.${getDifficultyMessageKey(concept.difficulty)}`)}
            </span>
          </div>
          <h1 className="max-w-3xl text-[1.65rem] font-semibold leading-tight text-ink-950 sm:text-[2.35rem]">
            {t("hero.title", { concept: getConceptDisplayTitle(concept, locale) })}
          </h1>
          {concept.shortTitle ? (
            <p className="text-sm font-semibold text-ink-500">
              {getConceptDisplayShortTitle(concept, locale)}
            </p>
          ) : null}
          <p className="hidden max-w-3xl text-sm leading-6 text-ink-700 sm:block sm:text-base">
            {getConceptDisplaySummary(concept, locale)}
          </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={entry.reviewHref}
                className="inline-flex items-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
              >
                {t("actions.reviewConcept")}
              </Link>
              <Link
                href="/tests"
                className="inline-flex items-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
              >
                {t("actions.backToHub")}
              </Link>
            </div>
          </div>

          <div data-testid="concept-test-status-panel" className="lab-panel-compact p-3.5">
            <p className="lab-label">{t("status.label")}</p>
            <p className="mt-1 text-xl font-semibold text-ink-950">
              {displayState === "loading"
                ? t("status.loading")
                : displayState === "completed"
                  ? t("status.completed")
                  : displayState === "resume"
                    ? t("status.resumeAvailable")
                    : displayState === "started"
                      ? t("status.started")
                      : t("status.notStarted")}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              {displayState === "loading"
                ? t("status.loadingDescription")
                : displayState === "completed"
                  ? progressState.attempts > 0
                    ? progressState.latestResult === "clean"
                      ? t("status.latestClean")
                      : progressState.latestResult === "missed"
                        ? t("status.latestMissed", {
                            count: progressState.latestIncorrectCount ?? 0,
                          })
                        : t("status.noFinishedRun")
                    : t("status.noRunsYet")
                  : displayState === "resume"
                    ? t("status.resumeDescription")
                    : displayState === "started"
                      ? t("status.startedDescription")
                      : t("status.noRunsYet")}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-600">
              {displayState === "loading"
                ? t("status.loadingHint")
                : `${progressState.attempts > 0
                    ? t("status.attempts", { count: progressState.attempts })
                    : t("status.zeroAttempts")}${
                    completedAtLabel
                      ? ` ${t("status.lastCompletedAt", { date: completedAtLabel })}`
                      : ""
                  }`}
            </p>
          </div>
        </div>
      </article>

      <ConceptLearningBridgeProvider>
        <ConceptTestBridgeHarness />
        <QuickTestSection
          concept={concept}
          sectionTitle={t("quiz.title", { concept: getConceptDisplayTitle(concept, locale) })}
          supplementaryActionsSection={{
            title: t("followUp.title"),
            description: t("followUp.description"),
            actions: followUpActions,
          }}
          showSimulationActions={false}
        />
      </ConceptLearningBridgeProvider>
    </section>
  );
}

function ConceptTestBridgeHarness() {
  const { registerQuickTestHandler } = useConceptLearningBridge();

  useEffect(() => {
    registerQuickTestHandler({
      applyAction: () => {},
      clearAction: () => {},
    });

    return () => registerQuickTestHandler(null);
  }, [registerQuickTestHandler]);

  return null;
}
