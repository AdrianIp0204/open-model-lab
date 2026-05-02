"use client";

import { useLocale, useTranslations } from "next-intl";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import { getConceptDisplayTitle, getStarterTrackDisplayTitle } from "@/lib/i18n/content";
import {
  getProgressActionKey,
  getProgressFocusLabelKey,
  getProgressReasonKey,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import type { GuidedCollectionSummary, StarterTrackSummary } from "@/lib/content";
import {
  resolveAccountProgressSnapshot,
  selectAdaptiveReviewQueue,
  useProgressSnapshot,
  type ProgressSnapshot,
  type ReviewQueueReasonKind,
  type SavedContinueLearningReviewItem,
  type SavedContinueLearningState,
} from "@/lib/progress";
import type { ConceptSummary } from "@/components/concepts/concept-catalog";
import { MasteryStateBadge } from "./MasteryStateBadge";
import { ProgressStatusBadge } from "./ProgressStatusBadge";
import { AccountAwareReviewRemediationList } from "./AccountAwareReviewRemediationList";
import { formatProgressMonthDay } from "./dateFormatting";

type ReviewQueueSectionProps = {
  concepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  initialSyncedContinueLearningState?: SavedContinueLearningState | null;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  className?: string;
  limit?: number;
};

type ReviewQueueDisplayItem = {
  slug: string;
  title: string;
  reasonKind: ReviewQueueReasonKind;
  reason: string;
  staleDays: number | null;
  supportReasons: string[];
  progressStatus: SavedContinueLearningReviewItem["progressStatus"];
  masteryState: SavedContinueLearningReviewItem["masteryState"];
  lastActivityAt: string | null;
  primaryAction: SavedContinueLearningReviewItem["primaryAction"];
  secondaryAction: SavedContinueLearningReviewItem["secondaryAction"];
  trackCue: SavedContinueLearningReviewItem["trackCue"];
  remediationSuggestions: ReturnType<typeof selectAdaptiveReviewQueue>[number]["remediationSuggestions"];
};

const reviewToneClasses: Record<ReviewQueueReasonKind, string> = {
  "missed-checks": "border-coral-500/25 bg-coral-500/10",
  challenge: "border-amber-500/30 bg-amber-500/10",
  checkpoint: "border-amber-500/30 bg-amber-500/10",
  diagnostic: "border-sky-500/25 bg-sky-500/10",
  confidence: "border-amber-500/30 bg-amber-500/10",
  unfinished: "border-coral-500/25 bg-coral-500/10",
  stale: "border-sky-500/25 bg-sky-500/10",
};

function getReasonLabel(
  reasonKind: ReviewQueueReasonKind,
  t: ReturnType<typeof useTranslations<"ReviewQueueSection">>,
) {
  switch (reasonKind) {
    case "missed-checks":
      return t("reasonLabels.missedChecks");
    case "challenge":
      return t("reasonLabels.challenge");
    case "checkpoint":
      return t("reasonLabels.checkpoint");
    case "diagnostic":
      return t("reasonLabels.diagnostic");
    case "confidence":
      return t("reasonLabels.confidence");
    case "unfinished":
      return t("reasonLabels.unfinished");
    default:
      return t("reasonLabels.stale");
  }
}

function shouldDisplaySupportReason(
  reason: string,
  primaryReason: string,
  trackNote: string | null,
) {
  const normalizedReason = reason.trim().toLowerCase();
  const relatedReasons = [primaryReason, trackNote]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  return !relatedReasons.some(
    (candidate) =>
      normalizedReason === candidate ||
      normalizedReason.includes(candidate) ||
      candidate.includes(normalizedReason),
  );
}

function toDisplayItem(item: SavedContinueLearningReviewItem): ReviewQueueDisplayItem {
  return {
    slug: item.conceptSlug,
    title: item.title,
    reasonKind: item.reasonKind,
    reason: item.reason,
    staleDays: item.staleDays,
    supportReasons: item.supportReasons,
    progressStatus: item.progressStatus,
    masteryState: item.masteryState,
    lastActivityAt: item.lastActivityAt,
    primaryAction: item.primaryAction,
    secondaryAction: item.secondaryAction,
    trackCue: item.trackCue,
    remediationSuggestions: [],
  };
}

export function ReviewQueueSection({
  concepts,
  starterTracks,
  guidedCollections = [],
  initialSyncedContinueLearningState = null,
  initialSyncedSnapshot = null,
  className,
  limit = 3,
}: ReviewQueueSectionProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ReviewQueueSection");
  const tProgress = useTranslations("ProgressCopy");
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);
  const session = useAccountSession();
  const showPremiumReviewNotice =
    session.initialized && !session.entitlement.capabilities.canUseAdvancedStudyTools;
  const localSnapshot = useProgressSnapshot();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const conceptsBySlug = new Map(concepts.map((concept) => [concept.slug, concept]));
  const starterTracksBySlug = new Map(starterTracks.map((track) => [track.slug, track]));
  const snapshot = progressDisplay.snapshot;
  const displayReviewQueue = selectAdaptiveReviewQueue(snapshot, concepts, starterTracks, limit, {
    allConcepts: concepts,
    guidedCollections,
    locale,
  });
  const { hasLocalRecordedProgress, hasSyncedRecordedProgress } = progressDisplay;
  const syncedReviewQueue =
    !hasLocalRecordedProgress && hasSyncedRecordedProgress
      ? displayReviewQueue.map((item) => ({
          slug: item.concept.slug,
          title: item.concept.title ?? item.concept.slug,
          reasonKind: item.reasonKind,
          reason: item.reason,
          staleDays: item.staleDays,
          supportReasons: item.supportReasons,
          progressStatus: item.progress.status,
          masteryState: item.progress.mastery.state,
          lastActivityAt: item.progress.lastActivityAt,
          primaryAction: item.primaryAction,
          secondaryAction: item.secondaryAction,
          trackCue: item.trackContext
            ? {
                trackSlug: item.trackContext.trackSlug,
                title: item.trackContext.trackTitle,
                focusKind: item.trackContext.focusKind,
                focusLabel: item.trackContext.focusLabel,
                note: item.trackContext.note,
                action: item.trackContext.action,
                isPrimary: item.trackContext.isPrimary,
              }
            : null,
          remediationSuggestions: item.remediationSuggestions,
        }))
      : !hasLocalRecordedProgress && initialSyncedContinueLearningState?.reviewQueue.length
        ? initialSyncedContinueLearningState.reviewQueue
            .slice(0, limit)
            .map((item) => toDisplayItem(item))
        : [];
  const reviewQueue: ReviewQueueDisplayItem[] = displayReviewQueue.length
    ? displayReviewQueue.map((item) => ({
        slug: item.concept.slug,
        title: item.concept.title,
        reasonKind: item.reasonKind,
        reason: item.reason,
        staleDays: item.staleDays,
        supportReasons: item.supportReasons,
        progressStatus: item.progress.status,
        masteryState: item.progress.mastery.state,
        lastActivityAt: item.progress.lastActivityAt,
        primaryAction: item.primaryAction,
        secondaryAction: item.secondaryAction,
        trackCue: item.trackContext
            ? {
                trackSlug: item.trackContext.trackSlug,
                title: item.trackContext.trackTitle,
              focusKind: item.trackContext.focusKind,
              focusLabel: item.trackContext.focusLabel,
              note: item.trackContext.note,
              action: item.trackContext.action,
              isPrimary: item.trackContext.isPrimary,
            }
            : null,
        remediationSuggestions: item.remediationSuggestions,
      }))
    : syncedReviewQueue;
  const usingSyncedQueue =
    !hasLocalRecordedProgress &&
    (hasSyncedRecordedProgress ||
      (initialSyncedContinueLearningState?.reviewQueue.length ?? 0) > 0) &&
    reviewQueue.length > 0;
  const hasRecordedProgress =
    hasLocalRecordedProgress || initialSyncedContinueLearningState?.hasRecordedProgress === true;

  return (
    <section className={["space-y-3", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <p className="lab-label">{t("heading.label")}</p>
          <h2 className="text-xl font-semibold text-ink-950 sm:text-2xl">
            {t("heading.title")}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-ink-700">
            {t("heading.description")}
          </p>
        </div>
        <p className="text-sm text-ink-600">
          {usingSyncedQueue ? t("heading.syncedBadge") : t("heading.localBadge")}
        </p>
      </div>

      {showPremiumReviewNotice ? (
        <PremiumFeatureNotice
          title={t("premiumNotice.title")}
          freeDescription={t("premiumNotice.freeDescription")}
          description={t("premiumNotice.description")}
        />
      ) : null}

      {reviewQueue.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {reviewQueue.map((item, index) => {
            const reasonLabel = getReasonLabel(item.reasonKind, t);
            const displayTitle = conceptsBySlug.get(item.slug)
              ? getConceptDisplayTitle(conceptsBySlug.get(item.slug)!, locale)
              : item.title;
            const trackCueTitle =
              item.trackCue && starterTracksBySlug.get(item.trackCue.trackSlug)
                ? getStarterTrackDisplayTitle(
                    starterTracksBySlug.get(item.trackCue.trackSlug)!,
                    locale,
                  )
                : item.trackCue?.title ?? null;
            const trackCueActionLabel = item.trackCue
              ? useGenericProgressCopy
                ? tProgress(getProgressFocusLabelKey(item.trackCue.focusKind))
                : item.trackCue.action.kind === "checkpoint"
                  ? t("trackCue.checkpointReady")
                  : item.trackCue.focusLabel
              : null;
            const displayTrackCueActionLabel =
              trackCueActionLabel === reasonLabel ? null : trackCueActionLabel;
            const displayReason = useGenericProgressCopy
              ? tProgress(getProgressReasonKey(item.reasonKind))
              : item.reason;
            const displayTrackCueNote =
              item.trackCue && useGenericProgressCopy
                ? tProgress("descriptions.trackCue", {
                    title: trackCueTitle ?? item.trackCue.title,
                  })
                : item.trackCue?.note ?? null;
            const displaySupportReasons = useGenericProgressCopy ? [] : item.supportReasons;
            const lastActiveLabel = formatProgressMonthDay(
              item.lastActivityAt,
              usingSyncedQueue ? "synced" : "local",
              locale,
            );

            return (
              <article
                key={item.slug}
                className={["lab-panel p-4", index === 0 ? "xl:col-span-2" : ""].join(" ")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ProgressStatusBadge status={item.progressStatus} compact />
                  <MasteryStateBadge state={item.masteryState} compact />
                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      reviewToneClasses[item.reasonKind],
                    ].join(" ")}
                  >
                    {reasonLabel}
                  </span>
                  {displayTrackCueActionLabel ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {displayTrackCueActionLabel}
                    </span>
                  ) : null}
                  {item.staleDays !== null ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("badges.idleDays", { count: item.staleDays })}
                    </span>
                  ) : null}
                  {usingSyncedQueue ? (
                    <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                      {t("badges.synced")}
                    </span>
                  ) : null}
                </div>
                <Link
                  href={item.primaryAction.href}
                  aria-label={
                    useGenericProgressCopy
                      ? tProgress(
                          getProgressActionKey(item.primaryAction.kind, {
                            conceptStatus: item.progressStatus,
                          }),
                        )
                      : item.primaryAction.label
                  }
                  className="mt-4 block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  <LearningVisual
                    kind="progress"
                    tone={index === 0 ? "coral" : "amber"}
                    compact
                    className="h-24"
                  />
                </Link>

                <h3 className="mt-4 text-xl font-semibold text-ink-950">{displayTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-700">{displayReason}</p>
                {item.trackCue ? (
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {useGenericProgressCopy
                      ? displayTrackCueNote
                      : `${trackCueTitle ?? item.trackCue.title}: ${displayTrackCueNote ?? ""}`}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {displaySupportReasons
                    .filter((reason) =>
                      shouldDisplaySupportReason(reason, displayReason, displayTrackCueNote),
                    )
                    .slice(0, 3)
                    .map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-ink-700"
                      >
                        {reason}
                      </span>
                    ))}
                  {lastActiveLabel ? (
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-600">
                      {t("badges.lastActive", { date: lastActiveLabel })}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={item.primaryAction.href}
                    className="inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {useGenericProgressCopy
                      ? tProgress(
                          getProgressActionKey(item.primaryAction.kind, {
                            conceptStatus: item.progressStatus,
                          }),
                        )
                      : item.primaryAction.label}
                  </Link>
                  <Link
                    href={item.secondaryAction?.href ?? `/concepts/${item.slug}`}
                    className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
                  >
                    {item.secondaryAction
                      ? useGenericProgressCopy
                        ? tProgress(
                            getProgressActionKey(item.secondaryAction.kind, {
                              conceptStatus: item.progressStatus,
                            }),
                          )
                        : item.secondaryAction.label
                      : t("actions.openConcept")}
                  </Link>
                </div>
                <AccountAwareReviewRemediationList
                  concept={{
                    slug: item.slug,
                    title: displayTitle,
                  }}
                  reasonKind={item.reasonKind}
                  primaryAction={item.primaryAction}
                  secondaryAction={item.secondaryAction}
                  suggestions={item.remediationSuggestions}
                  variant="compact"
                  className="mt-4"
                />
              </article>
            );
          })}
        </div>
      ) : hasRecordedProgress ? (
        <div className="lab-panel grid gap-4 p-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:p-6">
          <Link
            href="/concepts"
            aria-label={t("heading.title")}
            className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LearningVisual kind="progress" tone="teal" compact className="h-24" />
          </Link>
          <p className="text-sm leading-6 text-ink-700">
            {t("empty.withProgress")}
          </p>
        </div>
      ) : (
        <div className="lab-panel grid gap-4 p-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:p-6">
          <Link
            href="/concepts"
            aria-label={t("heading.title")}
            className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LearningVisual kind="progress" tone="sky" compact className="h-24" />
          </Link>
          <p className="text-sm leading-6 text-ink-700">
            {t("empty.withoutProgress")}
          </p>
        </div>
      )}
    </section>
  );
}
