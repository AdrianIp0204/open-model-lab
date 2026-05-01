"use client";

import { useId, type MouseEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type {
  ConceptContent,
  ReadNextRecommendation,
  ResolvedConceptPageSection,
  StarterTrackConceptMembership,
} from "@/lib/content";
import { getConceptPageV2StepHashId } from "@/lib/content";
import { resolveAccountProgressSnapshot, useProgressSnapshot, useProgressSnapshotReady, type ProgressSnapshot } from "@/lib/progress";
import { resolveConceptPageStatusModel } from "@/lib/progress/concept-page-status";
import type { AppLocale } from "@/i18n/routing";

type ConceptPageStatusSurfaceProps = {
  concept: ConceptContent;
  sections: ResolvedConceptPageSection[];
  readNext: ReadNextRecommendation[];
  starterTrackMemberships: StarterTrackConceptMembership[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  variant?: "default" | "compact";
};

function getOverallStatusClasses(overallStatus: "not-started" | "in-progress" | "completed") {
  switch (overallStatus) {
    case "completed":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
    case "in-progress":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    default:
      return "border-line bg-paper-strong text-ink-700";
  }
}

const statusMetadataBadgeClassName =
  "rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-700";

export function ConceptPageStatusSurface({
  concept,
  sections,
  readNext,
  starterTrackMemberships,
  initialSyncedSnapshot = null,
  variant = "default",
}: ConceptPageStatusSurfaceProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptPage");
  const progressReady = useProgressSnapshotReady();
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const statusModel = resolveConceptPageStatusModel({
    concept,
    sections,
    snapshot: progressDisplay.snapshot,
    readNext,
    starterTrackMemberships,
    locale,
  });
  const isReady = progressReady || progressDisplay.source !== "local";

  const primaryActionLabel = (() => {
    switch (statusModel.primaryAction.kind) {
      case "start-concept":
        return t("statusSurface.actions.startConcept");
      case "continue-phase":
        return t("statusSurface.actions.continueAt", {
          phase: statusModel.primaryAction.stepLabel,
        });
      case "next-track-step":
      case "next-read-next":
        return t("statusSurface.actions.nextConcept", {
          title: statusModel.primaryAction.title,
        });
      case "checkpoint":
        return statusModel.primaryAction.label;
      case "return-track":
        return t("statusSurface.actions.returnTrack");
      case "review-concept":
      default:
        return t("statusSurface.actions.reviewConcept");
    }
  })();

  const secondaryActionLabel =
    statusModel.secondaryAction?.kind === "return-track"
      ? t("statusSurface.actions.returnTrack")
      : statusModel.secondaryAction?.kind === "review-concept"
        ? t("statusSurface.actions.reviewConcept")
        : null;

  const handleStepActionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    stepId: string | null,
  ) => {
    if (!stepId || typeof window === "undefined") {
      return;
    }

    event.preventDefault();
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = getConceptPageV2StepHashId(stepId);
    window.location.assign(nextUrl.toString());
  };

  const statusNote = (() => {
    if (!isReady) {
      return t("statusSurface.notes.loading");
    }

    if (statusModel.overallStatus === "not-started") {
      return t("statusSurface.notes.notStarted");
    }

    if (statusModel.overallStatus === "completed") {
      if (
        statusModel.primaryAction.kind === "next-track-step" ||
        statusModel.primaryAction.kind === "next-read-next"
      ) {
        return t("statusSurface.notes.completedNext", {
          title: statusModel.primaryAction.title,
        });
      }

      if (statusModel.primaryAction.kind === "checkpoint") {
        return statusModel.primaryAction.note ?? t("statusSurface.notes.completed");
      }

      if (statusModel.primaryAction.kind === "return-track") {
        return t("statusSurface.notes.completedTrack");
      }

      return t("statusSurface.notes.completed");
    }

    return t("statusSurface.notes.continueAt", {
      phase: statusModel.recommendedStepLabel,
    });
  })();

  const helperPhases = [statusModel.recommendedStepLabel];
  const compact = variant === "compact";
  const statusLabelId = useId();
  const statusNoteId = useId();

  if (compact) {
    if (!isReady || statusModel.overallStatus === "not-started") {
      return null;
    }

    return (
      <section
        data-testid="concept-page-status-surface"
        aria-labelledby={statusLabelId}
        aria-describedby={statusNoteId}
        className="rounded-[20px] border border-line/80 bg-white/88 px-3.5 py-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p id={statusLabelId} className="lab-label text-ink-700">
            {t("statusSurface.label")}
          </p>
          <span
            data-testid="concept-page-status-overall"
            className={[
              "rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]",
              getOverallStatusClasses(statusModel.overallStatus),
            ].join(" ")}
          >
            {t(`statusSurface.overall.${statusModel.overallStatus}`)}
          </span>
          {statusModel.trackPosition ? (
            <span
              data-testid="concept-page-status-track-position"
              className={statusMetadataBadgeClassName}
            >
              {t("statusSurface.trackPosition", {
                current: statusModel.trackPosition.current,
                total: statusModel.trackPosition.total,
              })}
            </span>
          ) : null}
          {isReady && progressDisplay.source !== "local" ? (
            <span
              data-testid="concept-page-status-source"
              className={statusMetadataBadgeClassName}
            >
              {t(`statusSurface.source.${progressDisplay.source}`)}
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink-950">
              {isReady
                ? statusModel.overallStatus === "completed"
                  ? t("statusSurface.heading.completed")
                  : statusModel.overallStatus === "in-progress"
                    ? t("statusSurface.heading.inProgress")
                    : t("statusSurface.heading.notStarted")
                : t("statusSurface.heading.loading")}
            </p>
            <p id={statusNoteId} className="max-w-[32rem] text-sm leading-5.5 text-ink-700">
              {statusNote}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={statusModel.primaryAction.href}
              onClick={(event) =>
                handleStepActionClick(event, statusModel.primaryAction.stepId)
              }
              data-testid="concept-page-status-primary-cta"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ink-950 bg-ink-950 px-3.5 py-2 text-center text-sm font-semibold text-paper-strong transition hover:bg-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto"
            >
              {primaryActionLabel}
            </Link>
            {statusModel.secondaryAction && secondaryActionLabel ? (
              <Link
                href={statusModel.secondaryAction.href}
                onClick={(event) =>
                  handleStepActionClick(event, statusModel.secondaryAction?.stepId ?? null)
                }
                data-testid="concept-page-status-secondary-cta"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-center text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto"
              >
                {secondaryActionLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="concept-page-status-surface"
      aria-labelledby={statusLabelId}
      aria-describedby={statusNoteId}
      className="max-w-4xl rounded-[22px] border border-line/80 bg-white/86 px-4 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p id={statusLabelId} className="lab-label text-ink-700">
          {t("statusSurface.label")}
        </p>
        <span
          data-testid="concept-page-status-overall"
          className={[
            "rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]",
            getOverallStatusClasses(statusModel.overallStatus),
          ].join(" ")}
        >
          {t(`statusSurface.overall.${statusModel.overallStatus}`)}
        </span>
        {statusModel.trackPosition ? (
          <span
            data-testid="concept-page-status-track-position"
            className={statusMetadataBadgeClassName}
          >
            {t("statusSurface.trackPosition", {
              current: statusModel.trackPosition.current,
              total: statusModel.trackPosition.total,
            })}
          </span>
        ) : null}
        {isReady && progressDisplay.source !== "local" ? (
          <span
            data-testid="concept-page-status-source"
            className={statusMetadataBadgeClassName}
          >
            {t(`statusSurface.source.${progressDisplay.source}`)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-xl font-semibold text-ink-950 sm:text-2xl">
          {isReady
            ? statusModel.overallStatus === "completed"
              ? t("statusSurface.heading.completed")
              : statusModel.overallStatus === "in-progress"
                ? t("statusSurface.heading.inProgress")
                : t("statusSurface.heading.notStarted")
            : t("statusSurface.heading.loading")}
        </p>
        <p id={statusNoteId} className="max-w-3xl text-sm leading-6 text-ink-700">
          {statusNote}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {helperPhases.map((helper) => (
          <span
            key={helper}
            className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
          >
            {helper}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={statusModel.primaryAction.href}
          onClick={(event) =>
            handleStepActionClick(event, statusModel.primaryAction.stepId)
          }
          data-testid="concept-page-status-primary-cta"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-950 bg-ink-950 px-4 py-2.5 text-sm font-semibold text-paper-strong transition hover:bg-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {primaryActionLabel}
        </Link>
        {statusModel.secondaryAction && secondaryActionLabel ? (
          <Link
            href={statusModel.secondaryAction.href}
            onClick={(event) =>
              handleStepActionClick(event, statusModel.secondaryAction?.stepId ?? null)
            }
            data-testid="concept-page-status-secondary-cta"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
