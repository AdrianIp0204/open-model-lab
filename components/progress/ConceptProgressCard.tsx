"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { AppLocale } from "@/i18n/routing";
import type { ConceptSummary } from "@/lib/content";
import {
  getLocalizedConceptMasteryNote,
  getLocalizedProgressEvidence,
  getLocalizedProgressSupportReason,
  getProgressReasonKey,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import { trackLearningEvent } from "@/lib/analytics";
import {
  getCompletedChallengeCount,
  getConceptProgressSummary,
  getConceptProgressRecord,
  getConceptResurfacingCue,
  getStartedChallengeCount,
  markConceptCompleted,
  resetConceptProgress,
  resolveAccountProgressSnapshot,
  recordConceptVisit,
  useProgressSnapshot,
  useProgressSnapshotReady,
  type ProgressSnapshot,
} from "@/lib/progress";
import { MasteryStateBadge } from "./MasteryStateBadge";
import { ProgressStatusBadge } from "./ProgressStatusBadge";

type ConceptProgressCardProps = {
  concept: Pick<ConceptSummary, "id" | "slug" | "title">;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  challengeIds?: string[];
  onboardingSurfaces?: string[];
  variant?: "default" | "compact";
};

type ProgressTranslateFn = (
  key: string,
  values?: Record<string, unknown>,
) => string;

function formatProgressDate(
  value: string | null,
  progressSource: "local" | "synced",
  locale: AppLocale,
) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = new Date(value);

    if (progressSource === "synced") {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(parsedValue);
    }

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(parsedValue);
  } catch {
    return null;
  }
}

function scopeProgressCopy(
  value: string,
  progressSource: "local" | "synced",
) {
  if (progressSource === "local") {
    return value;
  }

  return value
    .replaceAll("on this browser first", "in your synced account")
    .replaceAll("on this browser", "in your synced account")
    .replaceAll("saved on this browser", "saved in your synced account")
    .replaceAll("stored on this browser", "stored in your synced account")
    .replaceAll("Local-first", "Synced")
    .replaceAll("local-first", "synced");
}

export function ConceptProgressCard({
  concept,
  initialSyncedSnapshot = null,
  challengeIds = [],
  onboardingSurfaces = [],
  variant = "default",
}: ConceptProgressCardProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptProgressCard");
  const tProgress = useTranslations("ProgressCopy");
  const translateProgress = tProgress as unknown as ProgressTranslateFn;
  const progressReady = useProgressSnapshotReady();
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const progress = getConceptProgressSummary(snapshot, concept);
  const progressRecord = getConceptProgressRecord(snapshot, concept);
  const completedChallengeCount = getCompletedChallengeCount(progressRecord, challengeIds);
  const startedChallengeCount = getStartedChallengeCount(progressRecord, challengeIds);
  const { id, slug, title } = concept;
  const trackedConceptStartRef = useRef(false);
  const resurfacingCue = getConceptResurfacingCue(progress);

  useEffect(() => {
    const isFirstVisit = !progressRecord?.firstVisitedAt;

    recordConceptVisit({ id, slug, title });

    if (!trackedConceptStartRef.current && isFirstVisit) {
      trackedConceptStartRef.current = true;
      trackLearningEvent("concept_started", {
        pagePath: `/concepts/${slug}`,
        pageTitle: title,
        pageKind: "concept",
        conceptId: id,
        conceptSlug: slug,
        conceptTitle: title,
        source: "concept-progress-card",
      });
    }
  }, [id, progressRecord?.firstVisitedAt, slug, title]);

  const lastActivity = formatProgressDate(progress.lastActivityAt, progressSource, locale);
  const firstPassSteps = [
    t("firstPass.letModelRun"),
    t("firstPass.changeControl"),
    t("firstPass.openSurface", {
      surface: onboardingSurfaces[0] ?? t("firstPass.graphAndPrompts"),
    }),
  ];
  const compact = variant === "compact";
  const challengeCount = challengeIds.length;
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);
  const localizedMasteryNote = useGenericProgressCopy
    ? (() => {
        const descriptor = getLocalizedConceptMasteryNote(progress.mastery.note);
        return descriptor
          ? translateProgress(descriptor.key, descriptor.values)
          : scopeProgressCopy(progress.mastery.note, progressSource);
      })()
    : scopeProgressCopy(progress.mastery.note, progressSource);
  const localizedRevisitReason =
    resurfacingCue && useGenericProgressCopy
      ? translateProgress(getProgressReasonKey(resurfacingCue.reasonKind))
      : resurfacingCue
        ? scopeProgressCopy(resurfacingCue.reason, progressSource)
        : null;
  const localizedSupportReasons = resurfacingCue
    ? resurfacingCue.supportReasons
        .filter((item) => item !== resurfacingCue.reason)
        .slice(0, 2)
        .map((item) => {
          if (!useGenericProgressCopy) {
            return item;
          }

          const descriptor = getLocalizedProgressSupportReason(item);
          return descriptor ? translateProgress(descriptor.key, descriptor.values) : null;
        })
        .filter((item): item is string => Boolean(item))
    : [];
  const localizedEvidence = progress.mastery.evidence
    .slice(0, 4)
    .map((item) => {
      if (!useGenericProgressCopy) {
        return item;
      }

      const descriptor = getLocalizedProgressEvidence(item);
      return descriptor ? translateProgress(descriptor.key, descriptor.values) : null;
    })
    .filter((item): item is string => Boolean(item));
  const masterySummary = compact
    ? localizedMasteryNote
    : t("summary.mastery", {
        state: t(`masteryState.${progress.mastery.state}`),
        note: localizedMasteryNote,
      });

  return (
    <section
      data-testid="concept-progress-card"
      className={[
        compact
          ? "rounded-[20px] border border-line bg-paper-strong/90 p-4"
          : "lab-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between",
      ].join(" ")}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="lab-label">{t("label")}</p>
          {progressReady ? <ProgressStatusBadge status={progress.status} /> : null}
          {progressReady && !compact ? <MasteryStateBadge state={progress.mastery.state} /> : null}
          {progressReady && resurfacingCue && !compact ? (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              {t("status.worthRevisiting")}
            </span>
          ) : null}
          {!progressReady ? (
            <span
              data-testid="concept-progress-pending"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600"
            >
              {t("loading.label")}
            </span>
          ) : progressSource === "synced" ? (
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
              {t("source.synced")}
            </span>
          ) : !compact ? (
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
              {t("source.localFirst")}
            </span>
          ) : null}
        </div>
        <p className={compact ? "text-sm leading-5 text-ink-700" : "text-sm leading-6 text-ink-700"}>
          {!progressReady
            ? t("loading.description")
            : (
                <>
                  {lastActivity
                    ? t("summary.lastActivity", { date: lastActivity })
                    : progressSource === "synced"
                      ? t("summary.syncedAvailable")
                      : t("summary.localIntro")}{" "}
                  {challengeCount
                    ? completedChallengeCount
                      ? t("challenges.solved", {
                          completed: completedChallengeCount,
                          total: challengeCount,
                        })
                      : startedChallengeCount
                        ? t("challenges.started", {
                            started: startedChallengeCount,
                            total: challengeCount,
                          })
                        : t("challenges.ready", {
                            total: challengeCount,
                          })
                    : ""}
                  {resurfacingCue
                    ? localizedRevisitReason
                      ? t("summary.revisit", {
                          reason: localizedRevisitReason,
                        })
                      : ""
                    : ""}
                  {masterySummary}
                  {!compact
                    ? progress.practicedFeatures.length && !useGenericProgressCopy
                      ? t("summary.practiced", {
                          items: progress.practicedFeatures.join(", "),
                        })
                      : t("summary.practiceFallback")
                    : ""}
                </>
              )}
        </p>
        {!progressReady && !compact ? (
          <p className="text-xs text-ink-600">{t("loading.hint")}</p>
        ) : null}
        {progressReady && localizedSupportReasons.length && !compact ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {localizedSupportReasons.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-ink-700"
                >
                  {item}
                </span>
            ))}
          </div>
        ) : null}
        {progressReady && localizedEvidence.length && !compact ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {localizedEvidence.map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {progressReady && !compact ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {firstPassSteps.map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {progressReady && onboardingSurfaces.length > 1 && !compact ? (
          <div className="flex flex-wrap gap-2">
            {onboardingSurfaces.slice(1, 5).map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-600"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {progressReady ? (
        <div className={compact ? "mt-4 flex flex-wrap items-center gap-3" : "flex flex-wrap items-center gap-3"}>
          <button
            type="button"
            onClick={() => markConceptCompleted(concept)}
            className={
              compact
                ? "inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
                : "inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            }
          >
            {t("actions.markComplete")}
          </button>
          <button
            type="button"
            onClick={() => resetConceptProgress(concept)}
            className={
              compact
                ? "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-coral-500/35 hover:bg-white/90"
                : "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-coral-500/35 hover:bg-white/90"
            }
          >
            {t("actions.resetProgress")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
