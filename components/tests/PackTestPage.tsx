"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { SubjectDiscoverySummary, TopicDiscoverySummary } from "@/lib/content";
import {
  buildPackAssessmentSessionDescriptor,
  useAssessmentSessionMatch,
  useAssessmentSessionStoreReady,
} from "@/lib/assessment-sessions";
import {
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  recordPackTestStarted,
  recordPackTestCompleted,
  resolveAccountProgressSnapshot,
  useProgressSnapshotReady,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import {
  buildPackTestSession,
  getPackTestProgressState,
  type PackTestCatalogEntry,
} from "@/lib/test-hub";
import { buildPackStandaloneFollowUpActions } from "@/lib/test-hub/standalone-follow-up";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { PageSection } from "@/components/layout/PageSection";
import { QuizRunnerSection } from "@/components/quizzes/QuizRunnerSection";

type PackTestPageProps = {
  entry: PackTestCatalogEntry;
  subject: SubjectDiscoverySummary;
  includedTopics: TopicDiscoverySummary[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

function buildCompletionDescription(
  t: ReturnType<typeof useTranslations<"PackTestPage">>,
  input: {
    finalIncorrectCount: number;
    initialMissedCount: number;
  },
) {
  if (input.initialMissedCount === 0) {
    return `${t("completion.intro")} ${t("completion.cleanNote")}`;
  }

  if (input.finalIncorrectCount === 0) {
    return `${t("completion.intro")} ${t("completion.tryAgainResolved", {
      count: input.initialMissedCount,
    })}`;
  }

  return `${t("completion.intro")} ${t("completion.tryAgainStillMissed", {
    count: input.finalIncorrectCount,
  })}`;
}

export function PackTestPage({
  entry,
  subject,
  includedTopics,
  initialSyncedSnapshot = null,
}: PackTestPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("PackTestPage");
  const localSnapshot = useProgressSnapshot();
  const progressReady = useProgressSnapshotReady();
  const assessmentSessionReady = useAssessmentSessionStoreReady();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource = progressDisplay.source === "local" ? "local" : "synced";
  const progressState = getPackTestProgressState(progressDisplay.snapshot, entry);
  const resumeDescriptor = buildPackAssessmentSessionDescriptor(entry, locale);
  const resumeMatch = useAssessmentSessionMatch(resumeDescriptor);
  const assessmentReady = progressReady && assessmentSessionReady;
  const hasResume = assessmentReady && resumeMatch.status === "resume";
  const hasStarted = assessmentReady && (hasResume || progressState.hasStartedAssessmentWithoutCompletion);
  const subjectTitle = getSubjectDisplayTitle(subject, locale);
  const followUpActions = buildPackStandaloneFollowUpActions({
    entry,
    snapshot: progressDisplay.snapshot,
    locale,
    labels: {
      reviewSubject: t("actions.reviewSubject"),
      reviewIncludedTopics: t("actions.reviewIncludedTopics"),
      backToHub: t("actions.backToHub"),
      nextPack: t("actions.nextPack"),
    },
  });
  const completedAtLabel = progressState.completedAt
    ? formatProgressMonthDay(progressState.completedAt, progressSource, locale)
    : null;

  return (
    <section className="space-y-4 sm:space-y-5">
      <article className="page-band space-y-3 p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("hero.eyebrow")}</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {subjectTitle}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.questionCount", { count: entry.questionCount })}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.topicCount", { count: entry.includedTopicCount })}
            </span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.bridgeCount", { count: entry.bridgeQuestionCount })}
            </span>
          </div>
          <h1 className="max-w-3xl text-[1.65rem] font-semibold leading-tight text-ink-950 sm:text-[2.35rem]">
            {entry.title}
          </h1>
          <p className="hidden max-w-3xl text-sm leading-6 text-ink-700 sm:block sm:text-base">
            {entry.summary}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-[20px] border border-line bg-paper-strong p-3.5">
            <p className="lab-label">{t("hero.assessmentLabel")}</p>
            <p className="mt-2 hidden text-sm leading-6 text-ink-700 sm:block">
              {t("hero.assessmentDescription", {
                topicCount: entry.includedTopicCount,
                bridgeCount: entry.bridgeQuestionCount,
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={entry.reviewHref}
                className="inline-flex items-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
              >
                {t("actions.reviewSubject")}
              </Link>
              <Link
                href="/tests"
                className="inline-flex items-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
              >
                {t("actions.backToHub")}
              </Link>
            </div>
          </div>

          <div data-testid="pack-test-status-panel" className="lab-panel-compact p-3.5">
            <p className="lab-label">{t("status.label")}</p>
            <p className="mt-1 text-xl font-semibold text-ink-950">
              {assessmentReady
                ? progressState.status === "completed"
                  ? t("status.completed")
                  : hasResume
                    ? t("status.resumeAvailable")
                    : hasStarted
                      ? t("status.started")
                      : t("status.notStarted")
                : t("status.loading")}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              {assessmentReady
                ? progressState.status === "completed"
                  ? progressState.attempts > 0
                  ? progressState.latestResult === "clean"
                    ? t("status.latestClean")
                    : progressState.latestResult === "missed"
                      ? t("status.latestMissed", {
                          count: progressState.latestIncorrectCount ?? 0,
                        })
                      : t("status.noFinishedRun")
                  : t("status.noRunsYet")
                : hasResume
                  ? t("status.resumeDescription")
                  : hasStarted
                    ? t("status.startedDescription")
                  : t("status.noRunsYet")
                : t("status.loadingDescription")}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-600">
              {assessmentReady
                ? `${progressState.attempts > 0
                    ? t("status.attempts", { count: progressState.attempts })
                    : t("status.zeroAttempts")}${
                    completedAtLabel
                      ? ` ${t("status.lastCompletedAt", { date: completedAtLabel })}`
                      : ""
                  }`
                : t("status.loadingHint")}
            </p>
          </div>
        </div>
      </article>

      <QuizRunnerSection
        title={t("quiz.title", { title: entry.title })}
        intro={t("quiz.intro", {
          questionCount: entry.questionCount,
          topicCount: entry.includedTopicCount,
        })}
        seedBase={`pack-test:${entry.packSlug}`}
        resumeDescriptor={resumeDescriptor}
        buildSession={({ locale: questionLocale, seed }) =>
          buildPackTestSession(entry.packSlug, {
            locale: questionLocale,
            seed,
          })
        }
        buildRoundSummaryDescription={({ missedCount }) =>
          t("quiz.tryAgainDescription", { count: missedCount })
        }
        buildCompletionDescription={(input) => buildCompletionDescription(t, input)}
        supplementaryActionsSection={{
          title: t("followUp.title"),
          description: t("followUp.description"),
          actions: followUpActions,
        }}
        onAttemptStarted={() => {
          recordPackTestStarted(entry.packSlug);
        }}
        onAttemptCompleted={({ finalIncorrectCount, questionCount }) => {
          recordPackTestCompleted(entry.packSlug, {
            incorrectAnswers: finalIncorrectCount,
            totalQuestions: questionCount,
          });
        }}
      />

      <PageSection id="pack-test-included-topics" as="section" className="space-y-4">
        <div className="space-y-2">
          <p className="lab-label">{t("includedTopics.eyebrow")}</p>
          <h2 className="text-2xl font-semibold text-ink-950">
            {t("includedTopics.title")}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-ink-700">
            {t("includedTopics.description")}
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {includedTopics.map((topic) => (
            <article
              key={topic.slug}
              className="lab-panel flex h-full flex-col gap-3 p-5"
            >
              <div className="space-y-2">
                <p className="lab-label">{subjectTitle}</p>
                <h3 className="text-xl font-semibold text-ink-950">
                  {getTopicDisplayTitle(topic, locale)}
                </h3>
                <p className="text-sm leading-6 text-ink-700">
                  {getTopicDisplayDescription(topic, locale)}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("includedTopics.conceptCount", { count: topic.conceptCount })}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-3">
                <Link
                  href={`/concepts/topics/${topic.slug}`}
                  className="inline-flex items-center rounded-full bg-ink-950 px-3.5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {t("actions.openTopic", {
                    title: getTopicDisplayTitle(topic, locale),
                  })}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </PageSection>
    </section>
  );
}
