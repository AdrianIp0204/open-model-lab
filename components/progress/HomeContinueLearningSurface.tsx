"use client";

import { useLocale, useTranslations } from "next-intl";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import { useAccountSession } from "@/lib/account/client";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type {
  GuidedCollectionSummary,
  StarterTrackSummary,
  TopicDiscoverySummary,
} from "@/lib/content";
import {
  buildTrackCompletionHref,
  buildTrackRecapHref,
} from "@/lib/share-links";
import {
  buildSavedContinueLearningState,
  buildPrerequisiteTrackRecommendations,
  buildTopicStarterTrackRecommendations,
  getNextRecommendedConcept,
  getConceptResurfacingCue,
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  resolveAccountProgressSnapshot,
  selectAdaptiveReviewQueue,
  selectContinueLearning,
  selectCurrentTrack,
  useProgressSnapshot,
  useProgressSnapshotReady,
  type ProgressSnapshot,
  type SavedContinueLearningState,
  type StarterTrackRecommendationSummary,
} from "@/lib/progress";
import type { ConceptSummary } from "@/components/concepts/concept-catalog";
import {
  getConceptDisplayHighlights,
  getConceptDisplayShortTitle,
  getConceptDisplayTitle,
  getStarterTrackDisplayHighlights,
  getStarterTrackDisplayTitle,
  getStarterTrackDisplaySummary,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  getProgressActionKey,
  getProgressFocusLabelKey,
  getProgressReasonKey,
  getTrackPrimaryActionKey,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import { StarterTrackRecommendationList } from "@/components/tracks/StarterTrackRecommendationList";
import { ConceptLearningSurfaceTestCta } from "@/components/tests/ConceptLearningSurfaceTestCta";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { MasteryStateBadge } from "./MasteryStateBadge";
import { ProgressStatusBadge } from "./ProgressStatusBadge";
import { AccountAwareReviewRemediationList } from "./AccountAwareReviewRemediationList";
import { formatProgressMonthDay } from "./dateFormatting";

type HomeContinueLearningSurfaceProps = {
  concepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  topicSummaries: TopicDiscoverySummary[];
  quickStartConcept: ConceptSummary | null;
  initialSyncedContinueLearningState?: SavedContinueLearningState | null;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  className?: string;
};

type ContextualTrackRecommendationSection = {
  title: string;
  note: string;
  recommendations: StarterTrackRecommendationSummary[];
};

function getTrackStatusLabel(
  status: ReturnType<typeof getStarterTrackProgressSummary>["status"],
  t: ReturnType<typeof useTranslations<"HomeContinueLearning">>,
) {
  if (status === "completed") {
    return t("track.status.completed");
  }

  if (status === "in-progress") {
    return t("track.status.inProgress");
  }

  return t("track.status.notStarted");
}

function getFollowUpLabel(
  candidate: {
    reasonKind: ReturnType<typeof selectAdaptiveReviewQueue>[number]["reasonKind"];
    primaryAction: Pick<
      ReturnType<typeof selectAdaptiveReviewQueue>[number]["primaryAction"],
      "kind"
    >;
  },
  t: ReturnType<typeof useTranslations<"HomeContinueLearning">>,
) {
  if (candidate.reasonKind === "checkpoint") {
    return t("followUp.labels.checkpoint");
  }

  if (candidate.reasonKind === "diagnostic") {
    return t("followUp.labels.diagnostic");
  }

  return candidate.primaryAction.kind === "quick-test"
    ? t("followUp.labels.quickTest")
    : candidate.primaryAction.kind === "challenge"
      ? t("followUp.labels.challenge")
      : candidate.primaryAction.kind === "track-recap" || candidate.primaryAction.kind === "checkpoint"
        ? t("followUp.labels.trackRecap")
        : t("followUp.labels.revisit");
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

function buildTopicSummaryByConceptSlug(topics: TopicDiscoverySummary[]) {
  const topicByConceptSlug = new Map<string, TopicDiscoverySummary>();

  for (const topic of topics) {
    for (const concept of topic.concepts) {
      topicByConceptSlug.set(concept.slug, topic);
    }
  }

  return topicByConceptSlug;
}

function buildHomeTrackRecommendationSection(
  snapshot: ProgressSnapshot,
  topicByConceptSlug: Map<string, TopicDiscoverySummary>,
  starterTracks: StarterTrackSummary[],
  currentTrack: ReturnType<typeof selectCurrentTrack>,
  currentConcept: ConceptSummary | null,
  locale: AppLocale,
  t: ReturnType<typeof useTranslations<"HomeContinueLearning">>,
) {
  const prerequisiteTracks = currentTrack
    ? starterTracks.filter((track) =>
        currentTrack.track.prerequisiteTrackSlugs?.includes(track.slug),
      )
    : [];
  const prerequisiteRecommendations = currentTrack
    ? buildPrerequisiteTrackRecommendations(
        snapshot,
        currentTrack.track,
        prerequisiteTracks,
        locale,
      ).filter(
        (recommendation) => recommendation.progress.status !== "completed",
      )
    : [];

  if (prerequisiteRecommendations.length) {
    return {
      title: t("recommendedPrep.prerequisiteTitle", {
        title: currentTrack
          ? getStarterTrackDisplayTitle(currentTrack.track, locale)
          : t("recommendedPrep.thisBranch"),
      }),
      note: t("recommendedPrep.prerequisiteNote"),
      recommendations: prerequisiteRecommendations,
    } satisfies ContextualTrackRecommendationSection;
  }

  if (!currentConcept) {
    return null;
  }

  const topic = topicByConceptSlug.get(currentConcept.slug);

  if (!topic) {
    return null;
  }

  const topicRecommendations = buildTopicStarterTrackRecommendations(snapshot, topic, {
    actionableOnly: true,
    excludeTrackSlugs: currentTrack ? [currentTrack.track.slug] : [],
  }, locale);

  if (!topicRecommendations.length) {
    return null;
  }

  return {
    title: t("recommendedPrep.topicTitle", {
      title: getTopicDisplayTitle(topic, locale),
    }),
    note: t("recommendedPrep.topicNote"),
    recommendations: topicRecommendations,
  } satisfies ContextualTrackRecommendationSection;
}

function getLocalizedReviewActionLabel(
  action: {
    kind: ReturnType<typeof selectAdaptiveReviewQueue>[number]["primaryAction"]["kind"];
    label: string;
  },
  locale: AppLocale,
  tProgress: ReturnType<typeof useTranslations<"ProgressCopy">>,
  conceptStatus?: ReturnType<typeof selectAdaptiveReviewQueue>[number]["progress"]["status"],
) {
  if (!shouldUseGenericProgressCopy(locale)) {
    return action.label;
  }

  return tProgress(
    getProgressActionKey(action.kind, {
      conceptStatus,
    }),
  );
}

function getLocalizedTrackPrimaryLabel(
  kind: ReturnType<typeof getStarterTrackPrimaryAction>["kind"],
  label: string,
  locale: AppLocale,
  tProgress: ReturnType<typeof useTranslations<"ProgressCopy">>,
) {
  if (!shouldUseGenericProgressCopy(locale)) {
    return label;
  }

  return tProgress(getTrackPrimaryActionKey(kind));
}

export function HomeContinueLearningSurface({
  concepts,
  starterTracks,
  topicSummaries,
  quickStartConcept,
  initialSyncedContinueLearningState = null,
  initialSyncedSnapshot = null,
  guidedCollections = [],
  className,
}: HomeContinueLearningSurfaceProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("HomeContinueLearning");
  const tProgress = useTranslations("ProgressCopy");
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);
  const session = useAccountSession();
  const showPremiumReviewNotice =
    session.initialized && !session.entitlement.capabilities.canUseAdvancedStudyTools;
  const localSnapshot = useProgressSnapshot();
  const progressReady = useProgressSnapshotReady();
  const progressDisplay = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  );
  const snapshot = progressDisplay.snapshot;
  const conceptsBySlug = new Map(concepts.map((concept) => [concept.slug, concept]));
  const starterTracksBySlug = new Map(starterTracks.map((track) => [track.slug, track]));
  const topicByConceptSlug = buildTopicSummaryByConceptSlug(topicSummaries);
  const continueLearning = selectContinueLearning(snapshot, concepts, 2);
  const reviewQueue = selectAdaptiveReviewQueue(snapshot, concepts, starterTracks, 3, {
    allConcepts: concepts,
    guidedCollections,
    locale,
  });
  const currentTrack = selectCurrentTrack(snapshot, starterTracks, locale);
  const currentTrackAction = currentTrack
    ? getStarterTrackPrimaryAction(currentTrack.track, currentTrack.progress, locale)
    : null;
  const currentConcept =
    conceptsBySlug.get(continueLearning.primary?.concept.slug ?? "") ?? null;
  const nextRecommendation = getNextRecommendedConcept(
    currentConcept,
    conceptsBySlug,
    snapshot,
    locale,
  );
  const followUpCandidate =
    reviewQueue.find((item) => item.concept.slug !== continueLearning.primary?.concept.slug) ??
    null;
  const primaryResurfacingCue = continueLearning.primary
    ? getConceptResurfacingCue(continueLearning.primary)
    : null;
  const { hasLocalRecordedProgress, hasSyncedRecordedProgress } = progressDisplay;
  const syncedContinueLearningState =
    !hasLocalRecordedProgress
      ? initialSyncedContinueLearningState?.hasRecordedProgress
        ? initialSyncedContinueLearningState
        : hasSyncedRecordedProgress
          ? buildSavedContinueLearningState(snapshot, {
              concepts,
              starterTracks,
              computedAt: new Date().toISOString(),
            }, locale)
          : null
      : null;
  const syncedReviewQueue =
    !hasLocalRecordedProgress && hasSyncedRecordedProgress
      ? selectAdaptiveReviewQueue(snapshot, concepts, starterTracks, 3, {
          allConcepts: concepts,
          guidedCollections,
          locale,
        })
      : [];
  const syncedPrimaryConceptSlug =
    syncedContinueLearningState?.primaryConcept?.slug ?? null;
  const syncedFollowUpCandidate =
    syncedReviewQueue.find((item) => item.concept.slug !== syncedPrimaryConceptSlug) ??
    (syncedPrimaryConceptSlug ? null : syncedReviewQueue[0] ?? null);
  const displayPrimaryConcept =
    syncedContinueLearningState?.primaryConcept
      ? {
          slug: syncedContinueLearningState.primaryConcept.slug,
          title: conceptsBySlug.get(syncedContinueLearningState.primaryConcept.slug)
            ? getConceptDisplayTitle(
                conceptsBySlug.get(syncedContinueLearningState.primaryConcept.slug)!,
                locale,
              )
            : syncedContinueLearningState.primaryConcept.title,
          status: syncedContinueLearningState.primaryConcept.status,
          masteryState: syncedContinueLearningState.primaryConcept.masteryState,
          lastActivityAt: syncedContinueLearningState.primaryConcept.lastActivityAt,
          resumeReason: syncedContinueLearningState.primaryConcept.resumeReason,
          masteryNote: syncedContinueLearningState.primaryConcept.masteryNote,
          isSynced: true,
        }
      : continueLearning.primary
        ? {
            slug: continueLearning.primary.concept.slug,
            title: getConceptDisplayTitle(
              {
                slug: continueLearning.primary.concept.slug,
                title:
                  continueLearning.primary.concept.title ??
                  continueLearning.primary.concept.slug,
              },
              locale,
            ),
            status: continueLearning.primary.status,
            masteryState: continueLearning.primary.mastery.state,
            lastActivityAt: continueLearning.primary.lastActivityAt,
            resumeReason: primaryResurfacingCue?.reason ?? null,
            masteryNote: continueLearning.primary.mastery.note,
            isSynced: false,
          }
        : null;
  const displayCurrentTrack =
    syncedContinueLearningState?.currentTrack
      ? {
          slug: syncedContinueLearningState.currentTrack.slug,
          title: starterTracksBySlug.get(syncedContinueLearningState.currentTrack.slug)
            ? getStarterTrackDisplayTitle(
                starterTracksBySlug.get(syncedContinueLearningState.currentTrack.slug)!,
                locale,
              )
            : syncedContinueLearningState.currentTrack.title,
          status: syncedContinueLearningState.currentTrack.status,
          completedFlowCount: syncedContinueLearningState.currentTrack.completedFlowCount,
          totalFlowCount: syncedContinueLearningState.currentTrack.totalFlowCount,
          completedCount: syncedContinueLearningState.currentTrack.completedCount,
          totalConcepts: syncedContinueLearningState.currentTrack.totalConcepts,
          completedCheckpointCount:
            syncedContinueLearningState.currentTrack.completedCheckpointCount,
          totalCheckpoints: syncedContinueLearningState.currentTrack.totalCheckpoints,
          lastActivityAt: syncedContinueLearningState.currentTrack.lastActivityAt,
          highlights: starterTracksBySlug.get(syncedContinueLearningState.currentTrack.slug)
            ? getStarterTrackDisplayHighlights(
                starterTracksBySlug.get(syncedContinueLearningState.currentTrack.slug)!,
                locale,
              )
            : [],
          primaryHref:
            syncedContinueLearningState.currentTrack.status === "completed"
              ? buildTrackCompletionHref(syncedContinueLearningState.currentTrack.slug)
              : syncedContinueLearningState.currentTrack.primaryAction?.href ??
                `/tracks/${syncedContinueLearningState.currentTrack.slug}`,
          primaryLabel:
            syncedContinueLearningState.currentTrack.status === "completed"
              ? t("track.actions.openCompletionPage")
              : syncedContinueLearningState.currentTrack.primaryAction?.label ??
                t("track.actions.openTrack"),
          primaryKind: syncedContinueLearningState.currentTrack.primaryAction?.kind ?? null,
          primaryNote:
            syncedContinueLearningState.currentTrack.status === "completed"
              ? t("track.notes.completionPage")
              : syncedContinueLearningState.currentTrack.primaryAction?.note ?? null,
          secondaryHref:
            syncedContinueLearningState.currentTrack.status === "completed"
              ? buildTrackRecapHref(syncedContinueLearningState.currentTrack.slug)
              : `/tracks/${syncedContinueLearningState.currentTrack.slug}`,
          secondaryLabel:
            syncedContinueLearningState.currentTrack.status === "completed"
              ? t("track.actions.openRecap")
              : syncedContinueLearningState.currentTrack.status === "in-progress"
                ? t("track.actions.continueTrack")
                : t("track.actions.startTrack"),
          isSynced: true,
        }
      : currentTrack
        ? {
            slug: currentTrack.track.slug,
            title: getStarterTrackDisplayTitle(currentTrack.track, locale),
            status: currentTrack.progress.status,
            completedFlowCount: currentTrack.progress.completedFlowCount,
            totalFlowCount: currentTrack.progress.totalFlowCount,
            completedCount: currentTrack.progress.completedCount,
            totalConcepts: currentTrack.progress.totalConcepts,
            completedCheckpointCount: currentTrack.progress.completedCheckpointCount,
            totalCheckpoints: currentTrack.progress.totalCheckpoints,
            lastActivityAt: currentTrack.progress.lastActivityAt,
            highlights: getStarterTrackDisplayHighlights(currentTrack.track, locale),
            primaryHref:
              currentTrack.progress.status === "completed"
                ? buildTrackCompletionHref(currentTrack.track.slug)
                : currentTrackAction?.href ?? `/tracks/${currentTrack.track.slug}`,
            primaryLabel:
              currentTrack.progress.status === "completed"
                ? t("track.actions.openCompletionPage")
                : currentTrackAction?.label ?? t("track.actions.openTrack"),
            primaryKind: currentTrackAction?.kind ?? null,
            primaryNote:
              currentTrack.progress.status === "completed"
                ? t("track.notes.completionPage")
                : currentTrackAction?.note ?? null,
            secondaryHref:
              currentTrack.progress.status === "completed"
                ? buildTrackRecapHref(currentTrack.track.slug)
                : `/tracks/${currentTrack.track.slug}`,
            secondaryLabel:
              currentTrack.progress.status === "completed"
                ? t("track.actions.openRecap")
                : currentTrack.progress.status === "in-progress"
                  ? t("track.actions.continueTrack")
                  : t("track.actions.startTrack"),
            isSynced: false,
          }
        : null;
  const displayFollowUpCandidate =
    syncedFollowUpCandidate
      ? {
          conceptSlug: syncedFollowUpCandidate.concept.slug,
          title: getConceptDisplayTitle(
            {
              slug: syncedFollowUpCandidate.concept.slug,
              title:
                syncedFollowUpCandidate.concept.title ??
                syncedFollowUpCandidate.concept.slug,
            },
            locale,
          ),
          reasonKind: syncedFollowUpCandidate.reasonKind,
          reason: syncedFollowUpCandidate.reason,
          supportReasons: syncedFollowUpCandidate.supportReasons,
          primaryAction: syncedFollowUpCandidate.primaryAction,
          secondaryAction: syncedFollowUpCandidate.secondaryAction,
          progressStatus: syncedFollowUpCandidate.progress.status,
          masteryState: syncedFollowUpCandidate.progress.mastery.state,
          trackCue: syncedFollowUpCandidate.trackContext
            ? {
                trackSlug: syncedFollowUpCandidate.trackContext.trackSlug,
                title: starterTracksBySlug.get(syncedFollowUpCandidate.trackContext.trackSlug)
                  ? getStarterTrackDisplayTitle(
                      starterTracksBySlug.get(syncedFollowUpCandidate.trackContext.trackSlug)!,
                      locale,
                    )
                  : syncedFollowUpCandidate.trackContext.trackTitle,
                focusKind: syncedFollowUpCandidate.trackContext.focusKind,
                focusLabel: syncedFollowUpCandidate.trackContext.focusLabel,
                note: syncedFollowUpCandidate.trackContext.note,
                action: syncedFollowUpCandidate.trackContext.action,
                isPrimary: syncedFollowUpCandidate.trackContext.isPrimary,
              }
            : null,
          remediationSuggestions: syncedFollowUpCandidate.remediationSuggestions,
          isSynced: true,
        }
      : syncedContinueLearningState?.followUp
      ? {
          conceptSlug: syncedContinueLearningState.followUp.conceptSlug,
          title: conceptsBySlug.get(syncedContinueLearningState.followUp.conceptSlug)
            ? getConceptDisplayTitle(
                conceptsBySlug.get(syncedContinueLearningState.followUp.conceptSlug)!,
                locale,
              )
            : syncedContinueLearningState.followUp.title,
          reasonKind: syncedContinueLearningState.followUp.reasonKind,
          reason: syncedContinueLearningState.followUp.reason,
          supportReasons: syncedContinueLearningState.followUp.supportReasons,
          primaryAction: syncedContinueLearningState.followUp.primaryAction,
          secondaryAction: syncedContinueLearningState.followUp.secondaryAction,
          progressStatus: syncedContinueLearningState.followUp.progressStatus,
          masteryState: syncedContinueLearningState.followUp.masteryState,
          trackCue: syncedContinueLearningState.followUp.trackCue
            ? {
                ...syncedContinueLearningState.followUp.trackCue,
                title: starterTracksBySlug.get(syncedContinueLearningState.followUp.trackCue.trackSlug)
                  ? getStarterTrackDisplayTitle(
                      starterTracksBySlug.get(syncedContinueLearningState.followUp.trackCue.trackSlug)!,
                      locale,
                    )
                  : syncedContinueLearningState.followUp.trackCue.title,
              }
            : null,
          remediationSuggestions: [],
          isSynced: true,
        }
      : followUpCandidate
        ? {
            conceptSlug: followUpCandidate.concept.slug,
            title: getConceptDisplayTitle(
              {
                slug: followUpCandidate.concept.slug,
                title:
                  followUpCandidate.concept.title ?? followUpCandidate.concept.slug,
              },
              locale,
            ),
            reasonKind: followUpCandidate.reasonKind,
            reason: followUpCandidate.reason,
            supportReasons: followUpCandidate.supportReasons,
            primaryAction: followUpCandidate.primaryAction,
            secondaryAction: followUpCandidate.secondaryAction,
            progressStatus: followUpCandidate.progress.status,
            masteryState: followUpCandidate.progress.mastery.state,
            trackCue: followUpCandidate.trackContext
              ? {
                  trackSlug: followUpCandidate.trackContext.trackSlug,
                  title: starterTracksBySlug.get(followUpCandidate.trackContext.trackSlug)
                    ? getStarterTrackDisplayTitle(
                        starterTracksBySlug.get(followUpCandidate.trackContext.trackSlug)!,
                        locale,
                      )
                    : followUpCandidate.trackContext.trackTitle,
                  focusKind: followUpCandidate.trackContext.focusKind,
                  focusLabel: followUpCandidate.trackContext.focusLabel,
                  note: followUpCandidate.trackContext.note,
                  action: followUpCandidate.trackContext.action,
                  isPrimary: followUpCandidate.trackContext.isPrimary,
                }
              : null,
            remediationSuggestions: followUpCandidate.remediationSuggestions,
            isSynced: false,
          }
        : null;
  const displayNextRecommendation =
    !displayFollowUpCandidate && syncedContinueLearningState?.nextRecommendation
      ? {
          conceptSlug: syncedContinueLearningState.nextRecommendation.conceptSlug,
          title: conceptsBySlug.get(syncedContinueLearningState.nextRecommendation.conceptSlug)
            ? getConceptDisplayTitle(
                conceptsBySlug.get(syncedContinueLearningState.nextRecommendation.conceptSlug)!,
                locale,
              )
            : syncedContinueLearningState.nextRecommendation.title,
          note: syncedContinueLearningState.nextRecommendation.note,
          highlights: conceptsBySlug.get(
            syncedContinueLearningState.nextRecommendation.conceptSlug,
          )
            ? getConceptDisplayHighlights(
                conceptsBySlug.get(
                  syncedContinueLearningState.nextRecommendation.conceptSlug,
                )!,
                locale,
              )
            : [],
        }
      : !displayFollowUpCandidate && nextRecommendation
        ? {
            conceptSlug: nextRecommendation.concept.slug,
            title: getConceptDisplayTitle(
              {
                slug: nextRecommendation.concept.slug,
                title:
                  nextRecommendation.concept.title ?? nextRecommendation.concept.slug,
              },
              locale,
            ),
            note: nextRecommendation.note,
            highlights: getConceptDisplayHighlights(nextRecommendation.concept, locale),
          }
        : null;
  const hasRecordedProgress =
    hasLocalRecordedProgress || syncedContinueLearningState?.hasRecordedProgress === true;
  const contextualConcept = syncedContinueLearningState
    ? null
    : conceptsBySlug.get(
        continueLearning.primary?.concept.slug ?? followUpCandidate?.concept.slug ?? "",
      ) ?? null;
  const primaryLastActiveLabel = formatProgressMonthDay(
    displayPrimaryConcept?.lastActivityAt ?? null,
    displayPrimaryConcept?.isSynced ? "synced" : "local",
    locale,
  );
  const trackLastActiveLabel = formatProgressMonthDay(
    displayCurrentTrack?.lastActivityAt ?? null,
    displayCurrentTrack?.isSynced ? "synced" : "local",
    locale,
  );
  const fallbackTrack = starterTracks.find((track) => track.heroTrack) ?? starterTracks[0] ?? null;
  const trackRecommendationSection = syncedContinueLearningState
    ? null
    : buildHomeTrackRecommendationSection(
        snapshot,
        topicByConceptSlug,
        starterTracks,
        currentTrack,
        contextualConcept,
        locale,
        t,
      );
  const displayPrimaryDescription = displayPrimaryConcept
    ? useGenericProgressCopy
      ? tProgress(
          displayPrimaryConcept.resumeReason
            ? displayPrimaryConcept.isSynced
              ? "descriptions.primaryReviewSynced"
              : "descriptions.primaryReviewLocal"
            : displayPrimaryConcept.isSynced
              ? "descriptions.primaryMomentumSynced"
              : "descriptions.primaryMomentumLocal",
        )
      : [displayPrimaryConcept.resumeReason, displayPrimaryConcept.masteryNote]
          .filter(Boolean)
          .join(" ")
    : null;
  const displayCurrentTrackPrimaryNote =
    displayCurrentTrack && useGenericProgressCopy && displayCurrentTrack.status !== "completed"
      ? displayCurrentTrack.primaryKind === "start"
        ? tProgress("descriptions.trackStart")
        : displayCurrentTrack.primaryKind === "checkpoint"
          ? tProgress("descriptions.trackCheckpoint")
          : tProgress("descriptions.trackContinue")
      : displayCurrentTrack?.primaryNote ?? null;
  const displayFollowUpReason = displayFollowUpCandidate
    ? useGenericProgressCopy
      ? tProgress(getProgressReasonKey(displayFollowUpCandidate.reasonKind))
      : displayFollowUpCandidate.reason
    : null;
  const displayFollowUpTrackCueLabel =
    displayFollowUpCandidate?.trackCue && useGenericProgressCopy
      ? tProgress(getProgressFocusLabelKey(displayFollowUpCandidate.trackCue.focusKind))
      : displayFollowUpCandidate?.trackCue?.focusLabel ?? null;
  const displayFollowUpTrackCueNote =
    displayFollowUpCandidate?.trackCue && useGenericProgressCopy
      ? tProgress("descriptions.trackCue", {
          title: displayFollowUpCandidate.trackCue.title,
        })
      : displayFollowUpCandidate?.trackCue?.note ?? null;
  const displayFollowUpSupportReasons =
    displayFollowUpCandidate && !useGenericProgressCopy
      ? displayFollowUpCandidate.supportReasons
      : [];
  const displayNextRecommendationNote =
    displayNextRecommendation && useGenericProgressCopy
      ? tProgress("descriptions.nextRecommendation")
      : displayNextRecommendation?.note ?? null;
  const fallbackTrackTitle = fallbackTrack
    ? getStarterTrackDisplayTitle(fallbackTrack, locale)
    : null;
  const fallbackTrackSummary = fallbackTrack
    ? getStarterTrackDisplaySummary(fallbackTrack, locale)
    : null;
  const fallbackTrackHighlights = fallbackTrack
    ? getStarterTrackDisplayHighlights(fallbackTrack, locale)
    : [];
  const primaryVisualHref = displayPrimaryConcept
    ? `/concepts/${displayPrimaryConcept.slug}`
    : quickStartConcept
      ? `/concepts/${quickStartConcept.slug}`
      : "/concepts";
  const primaryVisualLabel = displayPrimaryConcept
    ? displayPrimaryConcept.title
    : quickStartConcept
      ? getConceptDisplayTitle(quickStartConcept, locale)
      : t("actions.startConcept");

  return (
    <section className={["space-y-5", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <p className="lab-label">{t("heading.label")}</p>
          <h2 className="max-w-3xl text-2xl font-semibold text-ink-950 sm:text-3xl">
            {t("heading.title")}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-ink-700">
            {t("heading.description")}
          </p>
        </div>
        <p className="text-sm text-ink-600">{t("heading.badge")}</p>
      </div>

      {showPremiumReviewNotice ? (
        <PremiumFeatureNotice
          title={t("premiumNotice.title")}
          freeDescription={t("premiumNotice.freeDescription")}
          description={t("premiumNotice.description")}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(20rem,0.86fr)] xl:items-start">
        <article className="lab-panel grid gap-4 p-4 sm:p-5 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
          <Link
            href={primaryVisualHref}
            aria-label={primaryVisualLabel}
            className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LearningVisual kind="progress" tone="teal" compact className="h-28 md:h-full" />
          </Link>
          <div className="min-w-0">
          {displayPrimaryConcept ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {displayPrimaryConcept.isSynced ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {t("primary.syncedBadge")}
                  </span>
                ) : null}
                <ProgressStatusBadge status={displayPrimaryConcept.status} />
                <MasteryStateBadge state={displayPrimaryConcept.masteryState} />
                {primaryLastActiveLabel ? (
                  <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                    {t("primary.lastActive", { date: primaryLastActiveLabel })}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm font-semibold text-ink-500">
                {t("primary.resumeLabel")}
              </p>
              <h3 className="mt-2 text-[1.7rem] font-semibold text-ink-950 sm:text-2xl">
                {displayPrimaryConcept.title}
              </h3>
              {displayPrimaryDescription ? (
                <p className="mt-3 max-w-3xl text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {displayPrimaryDescription}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/concepts/${displayPrimaryConcept.slug}`}
                  data-testid={`home-primary-concept-cta-${displayPrimaryConcept.slug}`}
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {t("actions.continueConcept")}
                </Link>
                <ConceptLearningSurfaceTestCta
                  conceptSlug={displayPrimaryConcept.slug}
                  snapshot={snapshot}
                  progressReady={progressReady}
                  className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                  testId={`home-primary-test-cta-${displayPrimaryConcept.slug}`}
                />
                <Link
                  href="/concepts"
                  className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                >
                  {t("actions.browseLibrary")}
                </Link>
              </div>
            </>
          ) : hasRecordedProgress ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                    syncedContinueLearningState
                      ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
                  ].join(" ")}
                >
                  {syncedContinueLearningState
                    ? t("primary.syncedBadge")
                    : t("primary.localBadge")}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-ink-500">
                {t("primary.caughtUp.label")}
              </p>
              <h3 className="mt-2 text-[1.7rem] font-semibold text-ink-950 sm:text-2xl">
                {syncedContinueLearningState
                  ? t("primary.caughtUp.syncedTitle")
                  : t("primary.caughtUp.localTitle")}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-5.5 text-ink-700 sm:leading-6">
                {syncedContinueLearningState
                  ? t("primary.caughtUp.syncedDescription")
                  : t("primary.caughtUp.localDescription")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/concepts"
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {t("actions.browseLibrary")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                  {t("primary.firstVisit.badge")}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-ink-500">
                {t("primary.firstVisit.label")}
              </p>
              <h3 className="mt-2 text-[1.7rem] font-semibold text-ink-950 sm:text-2xl">
                {t("primary.firstVisit.title")}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-5.5 text-ink-700 sm:leading-6">
                {t("primary.firstVisit.description")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={quickStartConcept ? `/concepts/${quickStartConcept.slug}` : "/concepts"}
                  data-testid={
                    quickStartConcept
                      ? `home-first-visit-concept-cta-${quickStartConcept.slug}`
                      : "home-first-visit-concept-cta"
                  }
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {quickStartConcept
                    ? t("actions.startTitle", {
                        title:
                          getConceptDisplayShortTitle(quickStartConcept, locale) ??
                          getConceptDisplayTitle(quickStartConcept, locale),
                      })
                    : t("actions.startConcept")}
                </Link>
                <Link
                  href="#starter-tracks"
                  className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                >
                  {t("actions.viewStarterTracks")}
                </Link>
              </div>
            </>
          )}
          </div>
        </article>

        <div className="grid gap-4 xl:self-start">
          <article className="lab-panel p-4">
            {displayCurrentTrack ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lab-label">{t("track.label")}</span>
                  {displayCurrentTrack.isSynced ? (
                    <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                      {t("track.synced")}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {getTrackStatusLabel(displayCurrentTrack.status, t)}
                  </span>
                  {trackLastActiveLabel ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("track.lastActive", { date: trackLastActiveLabel })}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-950 sm:text-xl">
                  {displayCurrentTrack.title}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {t("track.progressSummary", {
                    completed: displayCurrentTrack.completedFlowCount,
                    total: displayCurrentTrack.totalFlowCount,
                  })}{" "}
                  {displayCurrentTrack.totalCheckpoints > 0
                    ? t("track.checkpointSummary", {
                        completedConcepts: displayCurrentTrack.completedCount,
                        completedCheckpoints: displayCurrentTrack.completedCheckpointCount,
                      })
                    : null}
                  {displayCurrentTrackPrimaryNote}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayCurrentTrack.highlights.slice(0, 2).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={displayCurrentTrack.primaryHref}
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {displayCurrentTrack.status === "completed"
                      ? displayCurrentTrack.primaryLabel
                      : getLocalizedTrackPrimaryLabel(
                          displayCurrentTrack.primaryKind ?? "review",
                          displayCurrentTrack.primaryLabel,
                          locale,
                          tProgress,
                        )}
                  </Link>
                  <Link
                    href={displayCurrentTrack.secondaryHref}
                    className="inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                  >
                    {displayCurrentTrack.secondaryLabel}
                  </Link>
                </div>
              </>
            ) : fallbackTrack ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lab-label">{t("track.fallbackLabel")}</span>
                  <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {t("track.conceptsCount", { count: fallbackTrack.concepts.length })}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-950 sm:text-xl">
                  {fallbackTrackTitle}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {fallbackTrackSummary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {fallbackTrackHighlights.slice(0, 2).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/tracks/${fallbackTrack.slug}`}
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.startTitle", { title: fallbackTrackTitle ?? fallbackTrack.title })}
                  </Link>
                  <Link
                    href={`/tracks/${fallbackTrack.slug}`}
                    className="inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                  >
                    {t("actions.openTrack")}
                  </Link>
                </div>
              </>
            ) : null}
          </article>

          <article className="lab-panel p-4">
            {displayFollowUpCandidate ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lab-label">{getFollowUpLabel(displayFollowUpCandidate, t)}</span>
                  <ProgressStatusBadge status={displayFollowUpCandidate.progressStatus} compact />
                  <MasteryStateBadge state={displayFollowUpCandidate.masteryState} compact />
                  {displayFollowUpCandidate.trackCue ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {displayFollowUpTrackCueLabel}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-950 sm:text-xl">
                  {displayFollowUpCandidate.title}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {displayFollowUpReason}
                </p>
                {displayFollowUpCandidate.trackCue ? (
                  <p className="mt-2 text-sm leading-5.5 text-ink-600 sm:leading-6">
                    {useGenericProgressCopy
                      ? displayFollowUpTrackCueNote
                      : `${displayFollowUpCandidate.trackCue.title}: ${displayFollowUpTrackCueNote ?? ""}`}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayFollowUpSupportReasons
                    .filter((reason) =>
                      shouldDisplaySupportReason(
                        reason,
                        displayFollowUpReason ?? "",
                        displayFollowUpTrackCueNote,
                      ),
                    )
                    .slice(0, 2)
                    .map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-ink-700"
                      >
                        {reason}
                      </span>
                    ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={displayFollowUpCandidate.primaryAction.href}
                    data-testid={`home-follow-up-primary-action-${displayFollowUpCandidate.conceptSlug}`}
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {getLocalizedReviewActionLabel(
                      displayFollowUpCandidate.primaryAction,
                      locale,
                      tProgress,
                      displayFollowUpCandidate.progressStatus,
                    )}
                  </Link>
                  {displayFollowUpCandidate.secondaryAction ? (
                    <Link
                      href={displayFollowUpCandidate.secondaryAction.href}
                      className="inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                    >
                      {getLocalizedReviewActionLabel(
                        displayFollowUpCandidate.secondaryAction,
                        locale,
                        tProgress,
                        displayFollowUpCandidate.progressStatus,
                      )}
                    </Link>
                  ) : null}
                </div>
                <AccountAwareReviewRemediationList
                  concept={{
                    slug: displayFollowUpCandidate.conceptSlug,
                    title: displayFollowUpCandidate.title,
                  }}
                  reasonKind={displayFollowUpCandidate.reasonKind}
                  primaryAction={displayFollowUpCandidate.primaryAction}
                  secondaryAction={displayFollowUpCandidate.secondaryAction}
                  suggestions={displayFollowUpCandidate.remediationSuggestions}
                  className="mt-5"
                />
              </>
            ) : displayNextRecommendation ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lab-label">{t("nextRecommendation.label")}</span>
                  <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {t("nextRecommendation.badge")}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-950 sm:text-xl">
                  {displayNextRecommendation.title}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {displayNextRecommendationNote}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayNextRecommendation.highlights.slice(0, 2).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/concepts/${displayNextRecommendation.conceptSlug}`}
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.openNextConcept")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lab-label">{t("exploreNext.label")}</span>
                  <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {t("exploreNext.badge")}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-950 sm:text-xl">
                  {hasRecordedProgress
                    ? t("exploreNext.withProgressTitle")
                    : t("exploreNext.firstVisitTitle")}
                </h3>
                <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
                  {hasRecordedProgress
                    ? t("exploreNext.withProgressDescription")
                    : t("exploreNext.firstVisitDescription")}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/concepts"
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {t("actions.browseLibrary")}
                  </Link>
                  <Link
                    href="/concepts/topics"
                    className="inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/25"
                  >
                    {t("actions.viewTopics")}
                  </Link>
                </div>
              </>
            )}
          </article>
        </div>
      </div>

      {trackRecommendationSection ? (
        <article className="lab-panel p-5 sm:p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="lab-label">{t("recommendedPrep.label")}</p>
              <h3 className="max-w-3xl text-2xl font-semibold text-ink-950">
                {trackRecommendationSection.title}
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {trackRecommendationSection.note}
              </p>
            </div>

            <StarterTrackRecommendationList
              recommendations={trackRecommendationSection.recommendations}
            />
          </div>
        </article>
      ) : null}
    </section>
  );
}
