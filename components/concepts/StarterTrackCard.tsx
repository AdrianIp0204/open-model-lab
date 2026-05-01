"use client";

import { useLocale, useTranslations } from "next-intl";
import type { StarterTrackSummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getStarterTrackDisplayHighlights,
  getConceptDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import {
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { buildTrackCompletionHref, buildTrackRecapHref } from "@/lib/share-links";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";

type StarterTrackCardProps = {
  track: StarterTrackSummary;
  variant?: "default" | "compact";
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

const accentPanelClasses: Record<StarterTrackSummary["accent"], string> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

const accentTopClasses: Record<StarterTrackSummary["accent"], string> = {
  teal: "from-teal-500/65 via-teal-500/20 to-transparent",
  amber: "from-amber-500/65 via-amber-500/20 to-transparent",
  coral: "from-coral-500/65 via-coral-500/20 to-transparent",
  sky: "from-sky-500/65 via-sky-500/20 to-transparent",
  ink: "from-ink-950/65 via-ink-950/20 to-transparent",
};

function getTrackStatusLabel(
  status: ReturnType<typeof getStarterTrackProgressSummary>["status"],
  t: ReturnType<typeof useTranslations<"StarterTrackCard">>,
) {
  if (status === "completed") {
    return t("status.completed");
  }

  if (status === "in-progress") {
    return t("status.inProgress");
  }

  return t("status.notStarted");
}

export function StarterTrackCard({
  track,
  variant = "default",
  initialSyncedSnapshot = null,
}: StarterTrackCardProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("StarterTrackCard");
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const snapshot = progressDisplay.snapshot;
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const compact = variant === "compact";
  const progress = getStarterTrackProgressSummary(snapshot, track, locale);
  const displayTitle = getStarterTrackDisplayTitle(track, locale);
  const displaySummary = getStarterTrackDisplaySummary(track, locale);
  const displayHighlights = getStarterTrackDisplayHighlights(track, locale);
  const lastActiveLabel = formatProgressMonthDay(
    progress.lastActivityAt,
    progressSource,
    locale,
  );
  const primaryAction = getStarterTrackPrimaryAction(track, progress, locale);
  const recapHref = buildTrackRecapHref(track.slug);
  const completionHref = buildTrackCompletionHref(track.slug);
  const visibleHighlights = displayHighlights.slice(
    0,
    compact ? 2 : displayHighlights.length,
  );
  const visibleConcepts = track.concepts.slice(
    0,
    compact ? 2 : track.concepts.length,
  );
  const actionLabel =
    progress.status === "completed"
      ? t("actions.trackCompletion")
      : progress.status === "in-progress"
        ? t("actions.continueTrack")
        : t("actions.startTrack");
  const checkpointTargetAfterSlug = primaryAction.targetCheckpoint?.afterConcept.slug ?? null;
  const secondaryHref =
    primaryAction.kind === "checkpoint"
      ? primaryAction.href
      : progress.status === "completed"
        ? recapHref
        : progress.startedCount > 0
          ? recapHref
          : primaryAction.href;
  const secondaryLabel =
    primaryAction.kind === "checkpoint"
      ? primaryAction.label
      : progress.startedCount > 0
        ? t("actions.openRecap")
        : t("actions.jumpTo", {
            title:
              primaryAction.targetConcept?.shortTitle ??
              primaryAction.targetConcept?.title ??
              t("labels.trackStart"),
          });
  const compactMeta = [
    t("meta.concepts", { count: track.concepts.length }),
    progress.status === "not-started"
      ? t("meta.minutes", { count: track.estimatedStudyMinutes })
      : getTrackStatusLabel(progress.status, t),
  ];

  if (compact) {
    return (
      <article className="motion-enter motion-card lab-panel relative overflow-hidden p-4">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[track.accent]}`}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("labels.starterTrack")}</span>
            {compactMeta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-ink-950 sm:text-xl">
              <Link
                href={`/tracks/${track.slug}`}
                className="motion-link transition-colors hover:text-teal-700"
              >
                {displayTitle}
              </Link>
            </h3>
            <p className="text-sm leading-6 text-ink-700">{displaySummary}</p>
            <p className="text-sm leading-5.5 text-ink-600">
              {progress.status === "not-started"
                ? t("compact.startsWith", {
                    title: track.concepts[0]
                      ? getConceptDisplayTitle(track.concepts[0], locale)
                      : t("labels.firstConcept"),
                    count: track.concepts.length,
                  })
                : t("compact.momentsComplete", {
                    completed: progress.completedFlowCount,
                    total: progress.totalFlowCount,
                    date: lastActiveLabel ?? "",
                  })}
            </p>
          </div>

          <div>
            <Link
              href={progress.status === "completed" ? completionHref : `/tracks/${track.slug}`}
              className="motion-button-solid inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
              style={{ color: "var(--paper-strong)" }}
            >
              {actionLabel}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="motion-enter motion-card lab-panel relative overflow-hidden p-5 sm:p-6">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[track.accent]}`}
      />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="lab-label">{t("labels.starterTrack")}</span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.concepts", { count: track.concepts.length })}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.minutes", { count: track.estimatedStudyMinutes })}
          </span>
          {track.checkpoints.length ? (
            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("meta.checkpoints", { count: track.checkpoints.length })}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-ink-950">
              <Link
                href={`/tracks/${track.slug}`}
                className="motion-link transition-colors hover:text-teal-700"
              >
                {displayTitle}
              </Link>
            </h3>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
              {getTrackStatusLabel(progress.status, t)}
            </span>
            {lastActiveLabel ? (
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                {t("labels.lastActive", { date: lastActiveLabel })}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-5.5 text-ink-700 sm:leading-6">{displaySummary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleHighlights.map((item) => (
            <span
              key={item}
              className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
            >
              {item}
            </span>
          ))}
        </div>

        <div className={`rounded-[24px] border p-4 ${accentPanelClasses[track.accent]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink-950">{t("sections.trackProgress")}</p>
            <p className="text-sm text-ink-600">
              {t("sections.momentsComplete", {
                completed: progress.completedFlowCount,
                total: progress.totalFlowCount,
              })}
            </p>
          </div>

          {track.checkpoints.length ? (
            <p className="mt-3 text-xs leading-5 text-ink-600">
              {t("sections.checkpointProgress", {
                completedConcepts: progress.completedCount,
                totalConcepts: progress.totalConcepts,
                completedCheckpoints: progress.completedCheckpointCount,
                totalCheckpoints: progress.totalCheckpoints,
              })}
            </p>
          ) : null}

          <div className="mt-3 space-y-2.5">
            {visibleConcepts.map((concept, index) => {
              const conceptProgress = progress.conceptProgress[index];
              const isCompleted = conceptProgress.status === "completed";
              const isCurrentTarget =
                primaryAction.kind === "checkpoint"
                  ? concept.slug === checkpointTargetAfterSlug
                  : concept.slug === primaryAction.targetConcept?.slug;

              return (
                <div
                  key={concept.slug}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm",
                    isCurrentTarget
                      ? "border-ink-950/15 bg-paper-strong"
                      : "border-line/80 bg-white/75",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={[
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isCompleted
                          ? "bg-teal-500 text-white"
                          : isCurrentTarget
                            ? "bg-ink-950 text-white"
                            : "border border-line bg-paper-strong text-ink-600",
                      ].join(" ")}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium leading-5 text-ink-900">
                      {getConceptDisplayTitle(concept, locale)}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-ink-500">
                    {isCompleted
                      ? t("stepState.complete")
                      : isCurrentTarget
                        ? primaryAction.kind === "checkpoint"
                          ? t("stepState.checkpointNext")
                          : progress.status === "not-started"
                            ? t("stepState.startHere")
                            : t("stepState.continue")
                        : t("stepState.ahead")}
                  </span>
                </div>
              );
            })}
            {compact && track.concepts.length > visibleConcepts.length ? (
              <div className="rounded-2xl border border-dashed border-line/80 bg-white/75 px-3 py-2 text-sm text-ink-600">
                {t("sections.moreSteps", {
                  count: track.concepts.length - visibleConcepts.length,
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-5.5 text-ink-700 sm:leading-6">
            {primaryAction.note}
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href={progress.status === "completed" ? completionHref : `/tracks/${track.slug}`}
              className="motion-button-solid inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
              style={{ color: "var(--paper-strong)" }}
            >
              {actionLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
