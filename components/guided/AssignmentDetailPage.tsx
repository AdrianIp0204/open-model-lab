"use client";

import { useLocale, useTranslations } from "next-intl";
import type { GuidedCollectionChallengeStepSummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { ResolvedGuidedCollectionAssignment } from "@/lib/guided/assignments";
import type { AppLocale } from "@/i18n/routing";
import {
  getGuidedCollectionAssignmentProgressSummary,
  resolveAccountProgressSnapshot,
  type ProgressSnapshot,
  useProgressSnapshot,
} from "@/lib/progress";
import {
  assignmentShareAnchorIds,
  buildGuidedCollectionAssignmentShareTargets,
} from "@/lib/share-links";
import { ShareLinksPanel } from "@/components/share/ShareLinksPanel";
import {
  formatGuidedProgressDate,
  formatGuidedSharedTimestamp,
} from "./dateFormatting";

type AssignmentDetailPageProps = {
  assignment: ResolvedGuidedCollectionAssignment;
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

const accentTopClasses: Record<ResolvedGuidedCollectionAssignment["collectionAccent"], string> = {
  teal: "from-teal-500/70 via-teal-500/18 to-transparent",
  amber: "from-amber-500/70 via-amber-500/18 to-transparent",
  coral: "from-coral-500/70 via-coral-500/18 to-transparent",
  sky: "from-sky-500/70 via-sky-500/18 to-transparent",
  ink: "from-ink-950/70 via-ink-950/14 to-transparent",
};

const accentPanelClasses: Record<
  ResolvedGuidedCollectionAssignment["collectionAccent"],
  string
> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const stepStatusClasses = {
  completed: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  "in-progress": "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "not-started": "border-line bg-paper-strong text-ink-700",
} as const;

const challengeDepthClasses: Record<GuidedCollectionChallengeStepSummary["depth"], string> = {
  "warm-up": "border-line bg-paper text-ink-600",
  core: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  stretch: "border-coral-500/20 bg-coral-500/10 text-coral-700",
};

function localizeGuidedAssignmentShareTargets(
  targets: ReturnType<typeof buildGuidedCollectionAssignmentShareTargets>,
  t: ReturnType<typeof useTranslations<"AssignmentDetailPage">>,
) {
  return targets.map((target) => {
    switch (target.id) {
      case "guided-collection-assignment":
        return {
          ...target,
          label: t("share.assignmentPage"),
          ariaLabel: t("share.copyAssignmentPageLink"),
          buttonLabel: t("share.copyAssignmentLink"),
          shareLabel: t("share.shareAssignment"),
          copiedText: t("share.copiedAssignmentLink"),
          sharedText: t("share.sharedAssignment"),
        };
      case "guided-collection-assignment-steps":
        return {
          ...target,
          label: t("share.assignedSteps"),
          ariaLabel: t("share.copyAssignedStepsLink"),
        };
      case "guided-collection-assignment-launch":
        return {
          ...target,
          label: t("share.launchStep"),
          ariaLabel: t("share.copyAssignmentLaunchStepLink"),
        };
      default:
        return target;
    }
  });
}

function getAssignmentStatusLabel(
  status: ReturnType<typeof getGuidedCollectionAssignmentProgressSummary>["status"],
  t: ReturnType<typeof useTranslations<"AssignmentDetailPage">>,
) {
  if (status === "completed") {
    return t("status.completed");
  }

  if (status === "in-progress") {
    return t("status.inProgress");
  }

  return t("status.notStarted");
}

function getChallengeDepthLabel(
  depth: GuidedCollectionChallengeStepSummary["depth"],
  t: ReturnType<typeof useTranslations<"AssignmentDetailPage">>,
) {
  switch (depth) {
    case "warm-up":
      return t("challengeDepth.warmUp");
    case "core":
      return t("challengeDepth.core");
    default:
      return t("challengeDepth.stretch");
  }
}

function getCollectionFormatLabel(
  format: ResolvedGuidedCollectionAssignment["collectionFormat"],
  t: ReturnType<typeof useTranslations<"AssignmentDetailPage">>,
) {
  return format === "lesson-set" ? t("formats.lessonSet") : t("formats.playlist");
}

function getStepKindLabel(
  step: ResolvedGuidedCollectionAssignment["steps"][number],
  t: ReturnType<typeof useTranslations<"AssignmentDetailPage">>,
) {
  switch (step.kind) {
    case "concept":
      return t("stepKinds.concept");
    case "track":
      return t("stepKinds.track");
    case "challenge":
      return t("stepKinds.challenge");
    case "surface":
      switch (step.surfaceKind) {
        case "topic":
          return t("stepKinds.topicPage");
        case "challenge-hub":
          return t("stepKinds.openChallenges");
        default:
          return t("stepKinds.referenceSurface");
      }
    default:
      return t("stepKinds.step");
  }
}

export function AssignmentDetailPage({
  assignment,
  initialSyncedSnapshot = null,
}: AssignmentDetailPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("AssignmentDetailPage");
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const progress = getGuidedCollectionAssignmentProgressSummary(snapshot, assignment, locale);
  const shareTargets = localizeGuidedAssignmentShareTargets(
    buildGuidedCollectionAssignmentShareTargets(assignment, locale),
    t,
  );
  const progressPercent = progress.totalSteps
    ? Math.round((progress.completedStepCount / progress.totalSteps) * 100)
    : 0;
  const lastActiveLabel = formatGuidedProgressDate(
    progress.lastActivityAt,
    progressSource,
    locale,
  );
  const primaryAction =
    progress.status === "completed"
      ? {
          href: `#${assignmentShareAnchorIds.steps}`,
          label: t("actions.reviewAssignedSteps"),
        }
      : (progress.nextStep?.primaryAction ?? {
          href: assignment.launchStep.href,
          label: t("actions.openAssignment"),
        });

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <Link
          href="/"
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {t("breadcrumbs.home")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/guided"
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {t("breadcrumbs.guidedCollections")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={assignment.collectionPath}
          className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
        >
          {assignment.collectionTitle}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
          {assignment.title}
        </span>
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]">
        <article className="lab-panel relative overflow-hidden p-5 sm:p-6">
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[assignment.collectionAccent]}`}
          />

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">{t("hero.label")}</span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("hero.fromCollectionFormat", {
                  format: getCollectionFormatLabel(assignment.collectionFormat, t).toLowerCase(),
                })}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("hero.stepCount", { count: assignment.steps.length })}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("hero.conceptCount", { count: assignment.conceptCount })}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("hero.estimatedMinutes", { count: assignment.estimatedStudyMinutes })}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="max-w-4xl text-[2.2rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.7rem]">
                  {assignment.title}
                </h1>
                {usingSyncedSnapshot ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {t("hero.syncedAcrossDevices")}
                  </span>
                ) : null}
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                  {getAssignmentStatusLabel(progress.status, t)}
                </span>
                {lastActiveLabel ? (
                  <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                    {t("hero.lastActive", { date: lastActiveLabel })}
                  </span>
                ) : null}
              </div>
              <p className="max-w-3xl text-base leading-6 text-ink-800">{assignment.summary}</p>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {t("hero.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700">
                {t("hero.curatedBy", { name: assignment.creatorDisplayName })}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700">
                {t("hero.updated", {
                  date: formatGuidedSharedTimestamp(assignment.updatedAt, locale),
                })}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700">
                {t("hero.launchStartsOn", { title: assignment.launchStep.title })}
              </span>
            </div>

            {assignment.teacherNote ? (
              <div
                className={`rounded-[24px] border p-4 ${accentPanelClasses[assignment.collectionAccent]}`}
              >
                <p className="lab-label">{t("hero.curatorNote")}</p>
                <p className="mt-3 text-sm leading-6 text-ink-700">{assignment.teacherNote}</p>
              </div>
            ) : null}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="lab-panel p-5">
            <div className="space-y-3">
              <p className="lab-label">
                {usingSyncedSnapshot
                  ? t("progress.syncedLabel")
                  : t("progress.localLabel")}
              </p>
              <h2 className="text-2xl font-semibold text-ink-950">
                {t("progress.title")}
              </h2>
              <p className="text-sm leading-6 text-ink-700">
                {usingSyncedSnapshot
                  ? t("progress.syncedDescription")
                  : t("progress.localDescription")}
              </p>
            </div>

            <div
              className={`mt-4 rounded-[24px] border p-4 ${accentPanelClasses[assignment.collectionAccent]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-950">{t("progress.coverage")}</p>
                <p className="text-sm text-ink-600">
                  {t("progress.stepsComplete", {
                    completed: progress.completedStepCount,
                    total: progress.totalSteps,
                  })}
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-strong">
                <div
                  className="h-full rounded-full bg-ink-950 transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
                  {t("progress.coveredConceptsComplete", {
                    completed: progress.completedConceptCount,
                    total: progress.totalConcepts,
                  })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
                  {t("progress.challengeStepCount", {
                    count: assignment.challengeStepCount,
                  })}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={primaryAction.href}
                className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                style={{ color: "var(--paper-strong)" }}
              >
                {primaryAction.label}
              </Link>
              <Link
                href={assignment.collectionPath}
                className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
              >
                {t("actions.openFullCollection")}
              </Link>
            </div>
          </div>

          <ShareLinksPanel
            items={shareTargets}
            pageTitle={assignment.title}
            title={t("share.title")}
            description={t("share.description")}
            variant="compact"
          />
        </aside>
      </section>

      <section
        id={assignmentShareAnchorIds.steps}
        className="space-y-5 scroll-mt-24"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="lab-label">{t("steps.label")}</p>
            <h2 className="text-2xl font-semibold text-ink-950">
              {t("steps.title")}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-ink-700">
              {t("steps.description")}
            </p>
          </div>
          <p className="text-sm text-ink-600">
            {assignment.trackCount
              ? t("steps.trackReferenceCount", { count: assignment.trackCount })
              : t("steps.noAssignmentPlayer")}
          </p>
        </div>

        <ol className="grid gap-4">
          {progress.stepProgress.map((stepProgress, index) => {
            const step = stepProgress.step;
            const isNextStep =
              progress.status !== "completed" &&
              progress.nextStep?.step.id === step.id;
            const secondaryAction = stepProgress.secondaryAction;

            return (
              <li key={step.id}>
                <article
                  className={[
                    "lab-panel p-5 sm:p-6",
                    isNextStep ? "border-ink-950/20 bg-paper-strong shadow-sm" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-paper-strong">
                          {index + 1}
                        </span>
                        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700">
                          {getStepKindLabel(step, t)}
                        </span>
                        <span
                          className={[
                            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                            stepStatusClasses[stepProgress.status],
                          ].join(" ")}
                        >
                          {getAssignmentStatusLabel(stepProgress.status, t)}
                        </span>
                        {isNextStep ? (
                          <span className="rounded-full border border-ink-950/20 bg-ink-950 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-paper-strong">
                            {t("steps.nextStep")}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold text-ink-950">
                          <Link
                            href={step.href}
                            className="transition-colors hover:text-teal-700"
                          >
                            {step.title}
                          </Link>
                        </h3>
                        <p className="max-w-3xl text-sm leading-6 text-ink-700">{step.summary}</p>
                        <p className="max-w-3xl text-sm leading-6 text-ink-600">{step.purpose}</p>
                        <p className="max-w-3xl text-sm leading-6 text-ink-600">
                          {stepProgress.note}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {step.estimatedMinutes ? (
                          <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                            {t("steps.estimatedMinutes", { count: step.estimatedMinutes })}
                          </span>
                        ) : null}

                        {step.kind === "challenge" ? (
                          <>
                            <span
                              className={[
                                "rounded-full border px-3 py-1 text-xs",
                                challengeDepthClasses[step.depth],
                              ].join(" ")}
                            >
                              {getChallengeDepthLabel(step.depth, t)}
                            </span>
                            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                              {t("steps.checkCount", { count: step.checkCount })}
                            </span>
                          </>
                        ) : null}

                        {step.kind === "track" ? (
                          <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                            {t("steps.conceptCount", { count: step.track.concepts.length })}
                          </span>
                        ) : null}

                        {step.relatedConcepts.slice(0, 3).map((concept) => (
                          <span
                            key={`${step.id}-${concept.slug}`}
                            className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                          >
                            {concept.shortTitle ?? concept.title}
                          </span>
                        ))}
                        {step.relatedConcepts.length > 3 ? (
                          <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                            {t("steps.moreConcepts", {
                              count: step.relatedConcepts.length - 3,
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      <Link
                        href={stepProgress.primaryAction.href}
                        className={[
                          "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                          isNextStep
                            ? "bg-ink-950 text-paper-strong hover:opacity-90"
                            : "border border-line bg-paper-strong text-ink-900 hover:border-ink-950/20 hover:bg-white",
                        ].join(" ")}
                      >
                        {stepProgress.primaryAction.label}
                      </Link>
                      {secondaryAction ? (
                        <Link
                          href={secondaryAction.href}
                          className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
                        >
                          {secondaryAction.label}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </section>
    </section>
  );
}
