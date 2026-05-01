"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type {
  RecommendedGoalPathGoalKind,
  RecommendedGoalPathStepSummary,
  RecommendedGoalPathSummary,
} from "@/lib/content";
import {
  getGoalPathDisplayObjective,
  getGoalPathDisplaySummary,
  getGoalPathDisplayTitle,
  getStarterTrackDisplayTitle,
  localizeRecommendedGoalPath,
} from "@/lib/i18n/content";
import {
  buildRecommendedGoalPathEntryDiagnosticTeaser,
  buildRecommendedGoalPathProgressSummary,
  resolveAccountProgressSnapshot,
} from "@/lib/progress";
import { type ProgressSnapshot } from "@/lib/progress/model";
import { useProgressSnapshot } from "@/lib/progress/store";
import { formatGuidedProgressDate } from "./dateFormatting";

type RecommendedGoalPathListProps = {
  goalPaths: RecommendedGoalPathSummary[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  variant?: "default" | "compact" | "guided-hub";
};

const accentTopClasses: Record<RecommendedGoalPathSummary["accent"], string> = {
  teal: "from-teal-500/65 via-teal-500/18 to-transparent",
  amber: "from-amber-500/65 via-amber-500/18 to-transparent",
  coral: "from-coral-500/65 via-coral-500/18 to-transparent",
  sky: "from-sky-500/65 via-sky-500/18 to-transparent",
  ink: "from-ink-950/55 via-ink-950/14 to-transparent",
};

const accentPanelClasses: Record<RecommendedGoalPathSummary["accent"], string> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const statusClasses = {
  completed: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  "in-progress": "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "not-started": "border-line bg-paper-strong text-ink-700",
} as const;

function getGoalKindLabel(
  goalKind: RecommendedGoalPathGoalKind,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  switch (goalKind) {
    case "build-intuition":
      return t("goalKinds.buildIntuition");
    case "prepare-branch":
      return t("goalKinds.prepareBranch");
    default:
      return t("goalKinds.teacherObjective");
  }
}

function getStepKindLabel(
  stepKind: RecommendedGoalPathStepSummary["kind"],
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  switch (stepKind) {
    case "topic":
      return t("stepKinds.topic");
    case "guided-collection":
      return t("stepKinds.guidedCollection");
    case "track":
      return t("stepKinds.track");
    default:
      return t("stepKinds.concept");
  }
}

function getStatusLabel(
  status: keyof typeof statusClasses,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  switch (status) {
    case "completed":
      return t("status.completed");
    case "in-progress":
      return t("status.inProgress");
    default:
      return t("status.notStarted");
  }
}

export function RecommendedGoalPathList({
  goalPaths,
  initialSyncedSnapshot = null,
  variant = "default",
}: RecommendedGoalPathListProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("RecommendedGoalPathList");
  const tLoose = t as unknown as (key: string, values?: Record<string, unknown>) => string;
  const compact = variant === "compact";
  const guidedHub = variant === "guided-hub";
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const usingSyncedSnapshot = progressDisplay.source !== "local";
  const snapshot = progressDisplay.snapshot;
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const summaries = useMemo(
    () =>
      goalPaths.map((goalPath) => {
        const localizedGoalPath = localizeRecommendedGoalPath(goalPath, locale);

        return {
          progress: buildRecommendedGoalPathProgressSummary(
            snapshot,
            localizedGoalPath,
            locale,
          ),
          entryDiagnosticTeaser: buildRecommendedGoalPathEntryDiagnosticTeaser(
            snapshot,
            localizedGoalPath,
            locale,
          ),
        };
      }),
    [goalPaths, locale, snapshot],
  );

  if (!summaries.length) {
    return null;
  }

  return (
    <div className={`grid gap-4 ${compact ? "xl:grid-cols-2" : "xl:grid-cols-2"}`}>
      {summaries.map(({ progress: summary, entryDiagnosticTeaser }) => {
        const displayGoalTitle = getGoalPathDisplayTitle(summary.goalPath, locale);
        const displayGoalSummary = getGoalPathDisplaySummary(summary.goalPath, locale);
        const displayGoalObjective = getGoalPathDisplayObjective(summary.goalPath, locale);
        const primaryPrerequisiteRecommendation =
          summary.prerequisiteRecommendations[0] ?? null;
        const primaryPrerequisiteTrackTitle = primaryPrerequisiteRecommendation
          ? getStarterTrackDisplayTitle(primaryPrerequisiteRecommendation.track, locale)
          : null;
        const collectionAction = summary.goalPath.relatedCollections[0]
          ? {
              href: summary.goalPath.relatedCollections[0].path,
              label: t("actions.openCollection"),
            }
          : null;
        const lastActiveLabel = formatGuidedProgressDate(
          summary.lastActivityAt,
          progressSource,
          locale,
        );

        if (guidedHub) {
          return (
            <article
              key={summary.goalPath.slug}
              id={`goal-${summary.goalPath.slug}`}
              className="motion-enter motion-card list-row-card relative overflow-hidden p-5"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[summary.goalPath.accent]}`}
              />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="lab-label">
                      {getGoalKindLabel(summary.goalPath.goalKind, tLoose)}
                    </span>
                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                        statusClasses[summary.status],
                      ].join(" ")}
                    >
                      {getStatusLabel(summary.status, tLoose)}
                    </span>
                    <span className="progress-pill text-sm">
                      {t("meta.steps", { count: summary.totalSteps })}
                    </span>
                    <span className="progress-pill text-sm">
                      {t("meta.minutes", { count: summary.goalPath.estimatedStudyMinutes })}
                    </span>
                    {lastActiveLabel ? (
                      <span className="progress-pill text-sm">{lastActiveLabel}</span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-ink-950">{displayGoalTitle}</h3>
                    <p className="text-sm leading-6 text-ink-700">{displayGoalSummary}</p>
                    <p className="text-sm leading-6 text-ink-600">{summary.primaryActionNote}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link href={summary.primaryAction.href} className="cta-primary">
                    {summary.primaryAction.label}
                  </Link>
                </div>
              </div>
            </article>
          );
        }

        return (
          <article
            key={summary.goalPath.slug}
            id={`goal-${summary.goalPath.slug}`}
            className={`motion-enter motion-card lab-panel relative overflow-hidden ${
              compact ? "p-4" : "p-5 sm:p-6"
            }`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[summary.goalPath.accent]}`}
            />

            <div className={compact ? "space-y-4" : "space-y-5"}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">
                  {getGoalKindLabel(summary.goalPath.goalKind, tLoose)}
                </span>
                <span
                  className={[
                    "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                    statusClasses[summary.status],
                  ].join(" ")}
                >
                  {getStatusLabel(summary.status, tLoose)}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.steps", { count: summary.totalSteps })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.concepts", { count: summary.goalPath.conceptCount })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.minutes", { count: summary.goalPath.estimatedStudyMinutes })}
                </span>
                {usingSyncedSnapshot ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {progressDisplay.source === "merged"
                      ? t("progressSources.merged")
                      : t("progressSources.syncedFallback")}
                  </span>
                ) : null}
                {lastActiveLabel ? (
                  <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {lastActiveLabel}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3
                  className={
                    compact
                      ? "text-xl font-semibold text-ink-950"
                      : "text-2xl font-semibold text-ink-950"
                  }
                >
                  {displayGoalTitle}
                </h3>
                <p className="text-sm leading-6 text-ink-700">{displayGoalSummary}</p>
                {!compact ? (
                  <p className="text-sm leading-6 text-ink-700">{displayGoalObjective}</p>
                ) : null}
              </div>

              <div className={`rounded-[24px] border p-4 ${accentPanelClasses[summary.goalPath.accent]}`}>
                <p className="lab-label">{t("labels.primaryMove")}</p>
                <p className="mt-3 text-lg font-semibold text-ink-950">
                  {summary.primaryAction.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {summary.primaryActionNote}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={summary.primaryAction.href}
                    className="motion-button-solid inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {summary.primaryAction.label}
                  </Link>
                  {compact ? (
                    <Link
                      href={summary.goalPath.path}
                      className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
                    >
                      {t("actions.viewOnGuidedPage")}
                    </Link>
                  ) : collectionAction && collectionAction.href !== summary.primaryAction.href ? (
                    <Link
                      href={collectionAction.href}
                      className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
                    >
                      {collectionAction.label}
                    </Link>
                  ) : null}
                  {!compact && summary.bundleAction ? (
                    <Link
                      href={summary.bundleAction.href}
                      className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
                    >
                      {summary.bundleAction.label}
                    </Link>
                  ) : null}
                </div>
              </div>

              {entryDiagnosticTeaser ? (
                <div className="rounded-[24px] border border-line bg-paper-strong p-4">
                  <p className="lab-label">{t("labels.entryDiagnostic")}</p>
                  <p className="mt-3 text-sm font-semibold text-ink-950">
                    {entryDiagnosticTeaser.diagnostic.recommendationLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {entryDiagnosticTeaser.diagnostic.note}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-ink-600">
                    {t("entryDiagnostic.note", {
                      sourceKind:
                        entryDiagnosticTeaser.sourceKind === "starter-track"
                          ? t("entryDiagnostic.sourceKinds.starterTrack")
                          : t("entryDiagnostic.sourceKinds.guidedCollection"),
                      sourceTitle: entryDiagnosticTeaser.sourceTitle,
                      readyProbeCount: entryDiagnosticTeaser.diagnostic.readyProbeCount,
                      totalProbeCount: entryDiagnosticTeaser.diagnostic.probes.length,
                    })}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={entryDiagnosticTeaser.sourceHref}
                      className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
                    >
                      {t("actions.openSource", { title: entryDiagnosticTeaser.sourceTitle })}
                    </Link>
                  </div>
                </div>
              ) : null}

              {summary.prerequisiteRecommendations.length ? (
                <div className="rounded-[24px] border border-line bg-paper-strong p-4">
                  <p className="lab-label">{t("labels.recommendedPrep")}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {primaryPrerequisiteRecommendation && primaryPrerequisiteTrackTitle
                      ? t("recommendedPrep.note", {
                          track: primaryPrerequisiteTrackTitle,
                          goalPath: displayGoalTitle,
                        })
                      : null}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {summary.prerequisiteRecommendations.slice(0, 2).map((recommendation) => (
                      <Link
                        key={`${summary.goalPath.slug}-${recommendation.track.slug}`}
                        href={recommendation.href}
                        className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
                      >
                        {recommendation.progress.status === "in-progress"
                          ? t("actions.continueTrack", {
                              title: getStarterTrackDisplayTitle(
                                recommendation.track,
                                locale,
                              ),
                            })
                          : recommendation.progress.status === "completed"
                            ? t("actions.reviewTrack", {
                                title: getStarterTrackDisplayTitle(
                                  recommendation.track,
                                  locale,
                                ),
                              })
                            : t("actions.startTrack", {
                                title: getStarterTrackDisplayTitle(
                                  recommendation.track,
                                  locale,
                                ),
                              })}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <ol className="grid gap-3">
                {summary.stepProgress.map((stepProgress, index) => (
                  <li key={stepProgress.step.id}>
                    <div className="rounded-[24px] border border-line bg-paper-strong p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-950 text-xs font-semibold text-paper-strong">
                          {index + 1}
                        </span>
                        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700">
                          {getStepKindLabel(stepProgress.step.kind, tLoose)}
                        </span>
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                            statusClasses[stepProgress.status],
                          ].join(" ")}
                        >
                          {getStatusLabel(stepProgress.status, tLoose)}
                        </span>
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-ink-950">
                        {stepProgress.step.title}
                      </h4>
                      {!compact ? (
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          {stepProgress.step.summary}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm leading-6 text-ink-600">
                        {stepProgress.note}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={stepProgress.primaryAction.href}
                          className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
                        >
                          {stepProgress.primaryAction.label}
                        </Link>
                        {!compact && stepProgress.secondaryAction ? (
                          <Link
                            href={stepProgress.secondaryAction.href}
                            className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
                          >
                            {stepProgress.secondaryAction.label}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap gap-2">
                {summary.goalPath.highlights.map((item) => (
                  <span
                    key={`${summary.goalPath.slug}-${item}`}
                    className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
