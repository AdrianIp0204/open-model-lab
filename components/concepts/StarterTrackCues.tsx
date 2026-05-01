"use client";

import { useLocale, useTranslations } from "next-intl";
import type { StarterTrackConceptMembership } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import {
  compareStarterTrackProgressSummaries,
  getStarterTrackProgressSummary,
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { buildTrackCompletionHref, buildTrackRecapHref } from "@/lib/share-links";

type StarterTrackCuesProps = {
  memberships: StarterTrackConceptMembership[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  variant?: "default" | "compact";
};

function formatTrackList(titles: string[], locale: AppLocale) {
  return new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  }).format(titles);
}

function buildMembershipAction(args: {
  membership: StarterTrackConceptMembership;
  summary: ReturnType<typeof getStarterTrackProgressSummary>;
  locale: AppLocale;
  t: ReturnType<typeof useTranslations<"StarterTrackCues">>;
}) {
  const { membership, summary, locale, t } = args;
  const currentStep = summary.conceptProgress[membership.stepIndex];
  const earlierSteps = summary.conceptProgress.slice(0, membership.stepIndex);
  const hasIncompleteEarlierStep = earlierSteps.some((item) => item.status !== "completed");
  const checkpointAfterCurrent =
    summary.checkpointProgress.find(
      (item) =>
        item.checkpoint.afterConcept.slug === membership.currentConcept.slug &&
        item.status === "ready",
    ) ?? null;

  if (hasIncompleteEarlierStep) {
    return {
      href: `/concepts/${membership.track.concepts[0].slug}`,
      label: t("actions.startFromTrackBeginning"),
      note: t("notes.earlierSteps", {
        title: getConceptDisplayTitle(membership.currentConcept, locale),
      }),
    };
  }

  if (currentStep?.status === "completed" && checkpointAfterCurrent) {
    return {
      href: checkpointAfterCurrent.action.href,
      label: t("actions.openCheckpoint"),
      note: t("notes.readyCheckpoint", {
        checkpoint: checkpointAfterCurrent.checkpoint.title,
        concept: getConceptDisplayTitle(membership.currentConcept, locale),
      }),
    };
  }

  if (membership.nextConcept) {
    return {
      href: `/concepts/${membership.nextConcept.slug}`,
      label:
        currentStep?.status === "completed"
          ? t("actions.openNextConcept")
          : t("actions.seeNextConcept"),
      note:
        currentStep?.status === "completed"
          ? t("notes.upNext", {
              title: getConceptDisplayTitle(membership.nextConcept, locale),
            })
          : t("notes.nextAfterThis", {
              title: getConceptDisplayTitle(membership.nextConcept, locale),
            }),
    };
  }

  return {
    href:
      summary.status === "completed"
        ? buildTrackCompletionHref(membership.track.slug)
        : `/concepts/${membership.track.concepts[0].slug}`,
    label:
      summary.status === "completed"
        ? t("actions.trackCompletionPage")
        : t("actions.reviewTrackStart"),
    note:
      summary.status === "completed"
        ? t("notes.completedTrack")
        : t("notes.reviewTrackStart"),
  };
}

export function StarterTrackCues({
  memberships,
  initialSyncedSnapshot = null,
  variant = "default",
}: StarterTrackCuesProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("StarterTrackCues");
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const progressSource: "local" | "synced" =
    progressDisplay.source === "local" ? "local" : "synced";
  const snapshot = progressDisplay.snapshot;
  const compact = variant === "compact";

  if (!memberships.length) {
    return null;
  }

  const rankedMemberships = memberships
    .map((membership) => {
      const summary = getStarterTrackProgressSummary(snapshot, membership.track);
      const action = buildMembershipAction({ membership, summary, locale, t });
      const hasIncompleteEarlierStep = summary.conceptProgress
        .slice(0, membership.stepIndex)
        .some((item) => item.status !== "completed");

      return {
        membership,
        summary,
        action,
        hasIncompleteEarlierStep,
      };
    })
    .sort((left, right) => {
      if (left.hasIncompleteEarlierStep !== right.hasIncompleteEarlierStep) {
        return left.hasIncompleteEarlierStep ? 1 : -1;
      }

      const summaryDelta = compareStarterTrackProgressSummaries(
        left.membership.track,
        left.summary,
        right.membership.track,
        right.summary,
      );

      if (summaryDelta !== 0) {
        return summaryDelta;
      }

      if (left.membership.stepIndex !== right.membership.stepIndex) {
        return right.membership.stepIndex - left.membership.stepIndex;
      }

      if (left.membership.totalSteps !== right.membership.totalSteps) {
        return left.membership.totalSteps - right.membership.totalSteps;
      }

      return left.membership.track.title.localeCompare(right.membership.track.title);
    });
  const visibleMemberships = compact ? rankedMemberships.slice(0, 1) : rankedMemberships;
  const secondaryMembershipLabels =
    compact && rankedMemberships.length > 1
      ? rankedMemberships
          .slice(1)
          .map((item) => getStarterTrackDisplayTitle(item.membership.track, locale))
      : [];

  return (
    <section className={compact ? "grid gap-3" : "grid gap-3 lg:grid-cols-2"}>
      {visibleMemberships.map(({ membership, summary, action }, membershipIndex) => {
        const recapHref = buildTrackRecapHref(membership.track.slug);
        const visibleConcepts = compact
          ? membership.track.concepts.slice(0, 4)
          : membership.track.concepts;
        const hiddenConceptCount = Math.max(0, membership.track.concepts.length - visibleConcepts.length);

        return (
          <article
            key={membership.track.slug}
            className={compact ? "rounded-[20px] border border-line bg-paper-strong/90 p-4" : "lab-panel p-4 sm:p-5"}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="lab-label">{t("labels.starterTrack")}</p>
                  {progressSource === "synced" ? (
                    <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                      {t("labels.synced")}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {t("meta.stepOfTotal", {
                      current: membership.stepIndex + 1,
                      total: membership.totalSteps,
                    })}
                  </span>
                  {!compact ? (
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("meta.completeCount", {
                        completed: summary.completedCount,
                        total: summary.totalConcepts,
                      })}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-xl font-semibold text-ink-950">
                  <Link
                    href={`/tracks/${membership.track.slug}`}
                    className="transition-colors hover:text-teal-700"
                  >
                    {getStarterTrackDisplayTitle(membership.track, locale)}
                  </Link>
                </h2>
                <p className="text-sm leading-6 text-ink-700">
                  {action.note}
                </p>
              </div>

              {!compact ? (
                <div className="flex flex-wrap gap-2">
                  {visibleConcepts.map((concept, index) => {
                    const conceptStatus = summary.conceptProgress[index]?.status;
                    const isCurrent = concept.slug === membership.currentConcept.slug;

                    return (
                      <span
                        key={concept.slug}
                        className={[
                          "rounded-full border px-3 py-1 text-xs",
                          conceptStatus === "completed"
                            ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                            : isCurrent
                              ? "border-ink-950/20 bg-ink-950 text-paper-strong"
                              : "border-line bg-paper-strong text-ink-700",
                        ].join(" ")}
                      >
                        {index + 1}. {getConceptDisplayTitle(concept, locale)}
                      </span>
                    );
                  })}
                  {hiddenConceptCount ? (
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700">
                      {t("meta.moreSteps", { count: hiddenConceptCount })}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs leading-5 text-ink-500">
                    {membership.previousConcept
                      ? t("details.previousStep", {
                          title: getConceptDisplayTitle(membership.previousConcept, locale),
                        })
                      : t("details.trackStart")}
                  </p>
                  {secondaryMembershipLabels.length > 0 && membershipIndex === 0 ? (
                    <p className="text-xs leading-5 text-ink-500">
                      {t("details.alsoIn", {
                        tracks: formatTrackList(secondaryMembershipLabels, locale),
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  {summary.startedCount > 0 ? (
                    <Link
                      href={recapHref}
                      className={[
                        compact
                          ? "motion-link inline-flex items-center text-sm font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
                          : "inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-teal-500/35 hover:bg-white/90",
                      ].join(" ")}
                    >
                      {t("actions.trackRecap")}
                    </Link>
                  ) : null}
                  <Link
                    href={action.href}
                    className={
                      compact
                        ? "cta-secondary"
                        : "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    }
                  >
                    {action.label}
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
