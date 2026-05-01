import type {
  ConceptRecommendation,
  ConceptSummary as BaseConceptSummary,
  StarterTrackSummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getConceptDisplayRecommendedNextReasonLabel,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildRelativeShareUrl,
  conceptShareAnchorIds,
} from "@/lib/share-links";
import {
  getConceptProgressSummary,
  getConceptResurfacingCue,
  selectContinueLearning,
  type ConceptMasteryState,
  type ConceptProgressStatus,
  type ProgressSnapshot,
  type ReviewQueueItem,
  type ReviewQueueReasonKind,
} from "./model";
import {
  selectAdaptiveReviewQueue,
  type AdaptiveReviewQueueItem,
  type ReviewQueueActionKind,
  type ReviewQueueTrackContext,
} from "./review-queue";
import {
  compareStarterTrackProgressSummaries,
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  type StarterTrackPrimaryAction,
  type StarterTrackProgressStatus,
  type StarterTrackProgressSummary,
} from "./tracks";

export type ContinueLearningStateConcept = BaseConceptSummary & {
  recommendedNext?: ConceptRecommendation[];
};

export type CurrentTrackCandidate = {
  track: StarterTrackSummary;
  progress: StarterTrackProgressSummary;
};

export type SavedContinueLearningPrimaryConcept = {
  slug: string;
  title: string;
  status: ConceptProgressStatus;
  masteryState: ConceptMasteryState;
  lastActivityAt: string | null;
  resumeReason: string | null;
  masteryNote: string;
};

export type SavedContinueLearningRecentConcept = {
  slug: string;
  title: string;
  status: ConceptProgressStatus;
  masteryState: ConceptMasteryState;
  lastActivityAt: string | null;
  note: string;
};

export type SavedContinueLearningTrackAction = {
  href: string;
  label: string;
  note: string;
  kind: StarterTrackPrimaryAction["kind"];
  targetConceptSlug: string | null;
  targetCheckpointId: string | null;
};

export type SavedContinueLearningTrack = {
  slug: string;
  title: string;
  status: StarterTrackProgressStatus;
  completedFlowCount: number;
  totalFlowCount: number;
  completedCount: number;
  totalConcepts: number;
  completedCheckpointCount: number;
  totalCheckpoints: number;
  lastActivityAt: string | null;
  primaryAction: SavedContinueLearningTrackAction | null;
};

export type SavedContinueLearningReviewAction = {
  href: string;
  label: string;
  kind: ReviewQueueActionKind;
  note: string | null;
};

export type SavedContinueLearningTrackCue = {
  trackSlug: string;
  title: string;
  focusKind: ReviewQueueTrackContext["focusKind"];
  focusLabel: string;
  note: string;
  action: SavedContinueLearningReviewAction;
  isPrimary: boolean;
};

export type SavedContinueLearningReviewItem = {
  conceptSlug: string;
  title: string;
  reasonKind: ReviewQueueReasonKind;
  reason: string;
  supportReasons: string[];
  primaryAction: SavedContinueLearningReviewAction;
  secondaryAction: SavedContinueLearningReviewAction | null;
  progressStatus: ConceptProgressStatus;
  masteryState: ConceptMasteryState;
  lastActivityAt: string | null;
  staleDays: number | null;
  trackCue: SavedContinueLearningTrackCue | null;
};

export type SavedContinueLearningFollowUp = SavedContinueLearningReviewItem;

export type SavedContinueLearningRecommendation = {
  conceptSlug: string;
  title: string;
  fromConceptSlug: string;
  note: string;
};

export type SavedContinueLearningState = {
  computedAt: string;
  hasRecordedProgress: boolean;
  primaryConcept: SavedContinueLearningPrimaryConcept | null;
  recentConcepts: SavedContinueLearningRecentConcept[];
  currentTrack: SavedContinueLearningTrack | null;
  followUp: SavedContinueLearningFollowUp | null;
  reviewQueue: SavedContinueLearningReviewItem[];
  nextRecommendation: SavedContinueLearningRecommendation | null;
};

type NextRecommendedConcept = {
  concept: ContinueLearningStateConcept;
  note: string;
};

const conceptProgressStatuses = [
  "not-started",
  "started",
  "practiced",
  "completed",
] as const;
const conceptMasteryStates = ["new", "practiced", "shaky", "solid"] as const;
const reviewQueueReasonKinds = [
  "missed-checks",
  "challenge",
  "checkpoint",
  "diagnostic",
  "confidence",
  "unfinished",
  "stale",
] as const;
const reviewQueueActionKinds = [
  "concept",
  "quick-test",
  "challenge",
  "worked-examples",
  "track-recap",
  "checkpoint",
] as const;
const starterTrackProgressStatuses = [
  "not-started",
  "in-progress",
  "completed",
] as const;
const starterTrackPrimaryKinds = [
  "start",
  "continue",
  "review",
  "checkpoint",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && Boolean(item));
}

function normalizeEnumValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
) {
  return typeof value === "string" && allowedValues.includes(value as T[number])
    ? (value as T[number])
    : null;
}

export function selectCurrentTrack(
  snapshot: ProgressSnapshot,
  starterTracks: StarterTrackSummary[],
  locale: AppLocale = "en",
) {
  const candidates = starterTracks
    .map((track) => ({
      track,
      progress: getStarterTrackProgressSummary(snapshot, track, locale),
    }))
    .filter((entry) => entry.progress.startedCount > 0)
    .sort((left, right) =>
      compareStarterTrackProgressSummaries(
        left.track,
        left.progress,
        right.track,
        right.progress,
      ),
    );

  return candidates[0] ?? null;
}

export function buildReviewActionHref(
  item: Pick<ReviewQueueItem, "concept" | "actionLabel" | "reasonKind">,
) {
  const basePath = `/concepts/${item.concept.slug}`;

  if (item.actionLabel === "Retry quick test" || item.reasonKind === "missed-checks") {
    return buildRelativeShareUrl(basePath, {
      hash: conceptShareAnchorIds.quickTest,
    });
  }

  if (
    item.actionLabel === "Retry challenge" ||
    item.actionLabel === "Continue challenge" ||
    item.reasonKind === "challenge"
  ) {
    return buildRelativeShareUrl(basePath, {
      hash: conceptShareAnchorIds.challengeMode,
    });
  }

  return basePath;
}

export function getNextRecommendedConcept(
  currentConcept:
    | (Pick<ContinueLearningStateConcept, "slug" | "title"> & {
        recommendedNext?: ConceptRecommendation[];
      })
    | null,
  conceptsBySlug: Map<string, ContinueLearningStateConcept>,
  snapshot: ProgressSnapshot,
  locale: AppLocale = "en",
) {
  if (!currentConcept?.recommendedNext?.length) {
    return null;
  }

  const currentConceptDisplayTitle = getConceptDisplayTitle(currentConcept, locale);

  for (const recommendation of currentConcept.recommendedNext) {
    const recommendedConcept = conceptsBySlug.get(recommendation.slug);

    if (!recommendedConcept) {
      continue;
    }

    const progress = getConceptProgressSummary(snapshot, recommendedConcept);

    if (progress.status === "completed") {
      continue;
    }

    const recommendedConceptDisplayTitle = getConceptDisplayTitle(recommendedConcept, locale);

    return {
      concept: recommendedConcept,
      note: recommendation.reasonLabel
        ? locale === "zh-HK"
          ? `${getConceptDisplayRecommendedNextReasonLabel(
              currentConcept,
              recommendation,
              locale,
            )}，來自「${currentConceptDisplayTitle}」。`
          : `${getConceptDisplayRecommendedNextReasonLabel(
              currentConcept,
              recommendation,
              locale,
            )} from ${currentConceptDisplayTitle}.`
        : locale === "zh-HK"
          ? `「${recommendedConceptDisplayTitle}」是從「${currentConceptDisplayTitle}」延伸出的下一個作者編排推薦概念。`
          : `${recommendedConceptDisplayTitle} is the next authored recommendation from ${currentConceptDisplayTitle}.`,
    } satisfies NextRecommendedConcept;
  }

  return null;
}

function serializeReviewAction(
  action: AdaptiveReviewQueueItem["primaryAction"] | AdaptiveReviewQueueItem["secondaryAction"],
): SavedContinueLearningReviewAction | null {
  if (!action) {
    return null;
  }

  return {
    href: action.href,
    label: action.label,
    kind: action.kind,
    note: action.note,
  };
}

function serializeTrackCue(
  trackCue: AdaptiveReviewQueueItem["trackContext"],
): SavedContinueLearningTrackCue | null {
  if (!trackCue) {
    return null;
  }

  return {
    trackSlug: trackCue.trackSlug,
    title: trackCue.trackTitle,
    focusKind: trackCue.focusKind,
    focusLabel: trackCue.focusLabel,
    note: trackCue.note,
    action: {
      href: trackCue.action.href,
      label: trackCue.action.label,
      kind: trackCue.action.kind,
      note: trackCue.action.note,
    },
    isPrimary: trackCue.isPrimary,
  };
}

function serializeSavedReviewQueueItem(
  item: AdaptiveReviewQueueItem,
): SavedContinueLearningReviewItem {
  return {
    conceptSlug: item.concept.slug,
    title: item.concept.title ?? item.concept.slug,
    reasonKind: item.reasonKind,
    reason: item.reason,
    supportReasons: [...item.supportReasons],
    primaryAction: serializeReviewAction(item.primaryAction)!,
    secondaryAction: serializeReviewAction(item.secondaryAction),
    progressStatus: item.progress.status,
    masteryState: item.progress.mastery.state,
    lastActivityAt: item.progress.lastActivityAt,
    staleDays: item.staleDays,
    trackCue: serializeTrackCue(item.trackContext),
  };
}

function normalizeSavedReviewAction(
  value: unknown,
): SavedContinueLearningReviewAction | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const href = normalizeString(value.href);
  const label = normalizeString(value.label);
  const kind = normalizeEnumValue(value.kind, reviewQueueActionKinds);

  if (!href || !label || !kind) {
    return null;
  }

  return {
    href,
    label,
    kind,
    note: normalizeString(value.note),
  };
}

function normalizeSavedTrackCue(
  value: unknown,
): SavedContinueLearningTrackCue | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const trackSlug = normalizeString(value.trackSlug);
  const title = normalizeString(value.title);
  const focusKind =
    typeof value.focusKind === "string" &&
    ["priority", "next", "active", "solid", "ahead", "checkpoint"].includes(value.focusKind)
      ? (value.focusKind as SavedContinueLearningTrackCue["focusKind"])
      : null;
  const focusLabel = normalizeString(value.focusLabel);
  const note = normalizeString(value.note);
  const action = normalizeSavedReviewAction(value.action);

  if (!trackSlug || !title || !focusKind || !focusLabel || !note || !action) {
    return null;
  }

  return {
    trackSlug,
    title,
    focusKind,
    focusLabel,
    note,
    action,
    isPrimary: value.isPrimary === true,
  };
}

function inferLegacyReviewActionKind(
  reasonKind: SavedContinueLearningReviewItem["reasonKind"] | null,
  label: string | null,
  href: string | null,
): ReviewQueueActionKind | null {
  if (
    reasonKind === "missed-checks" ||
    label?.toLowerCase().includes("quick test") ||
    href?.includes(`#${conceptShareAnchorIds.quickTest}`)
  ) {
    return "quick-test";
  }

  if (
    reasonKind === "challenge" ||
    label?.toLowerCase().includes("challenge") ||
    href?.includes(`#${conceptShareAnchorIds.challengeMode}`)
  ) {
    return "challenge";
  }

  return "concept";
}

function normalizeSavedReviewQueueItem(
  value: unknown,
): SavedContinueLearningReviewItem | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const conceptSlug = normalizeString(value.conceptSlug);
  const title = normalizeString(value.title);
  const reasonKind = normalizeEnumValue(value.reasonKind, reviewQueueReasonKinds);
  const reason = normalizeString(value.reason);
  const primaryAction =
    normalizeSavedReviewAction(value.primaryAction) ??
    (() => {
      const href = normalizeString(value.href);
      const label = normalizeString(value.actionLabel);
      const kind = inferLegacyReviewActionKind(reasonKind, label, href);

      if (!href || !label || !kind) {
        return null;
      }

      return {
        href,
        label,
        kind,
        note: null,
      } satisfies SavedContinueLearningReviewAction;
    })();
  const progressStatus = normalizeEnumValue(value.progressStatus, conceptProgressStatuses);
  const masteryState = normalizeEnumValue(value.masteryState, conceptMasteryStates);

  if (
    !conceptSlug ||
    !title ||
    !reasonKind ||
    !reason ||
    !primaryAction ||
    !progressStatus ||
    !masteryState
  ) {
    return null;
  }

  return {
    conceptSlug,
    title,
    reasonKind,
    reason,
    supportReasons: normalizeStringArray(value.supportReasons),
    primaryAction,
    secondaryAction: normalizeSavedReviewAction(value.secondaryAction),
    progressStatus,
    masteryState,
    lastActivityAt: normalizeString(value.lastActivityAt),
    staleDays: normalizeNumber(value.staleDays),
    trackCue: normalizeSavedTrackCue(value.trackCue),
  };
}

export function buildSavedContinueLearningState(
  snapshot: ProgressSnapshot,
  options: {
    concepts: ContinueLearningStateConcept[];
    starterTracks: StarterTrackSummary[];
    computedAt?: string;
  },
  locale: AppLocale = "en",
) {
  const computedAt = options.computedAt ?? new Date().toISOString();
  const continueLearning = selectContinueLearning(snapshot, options.concepts, 2);
  const reviewQueue = selectAdaptiveReviewQueue(
    snapshot,
    options.concepts,
    options.starterTracks,
    3,
    {
      locale,
    },
  );
  const currentTrack = selectCurrentTrack(snapshot, options.starterTracks, locale);
  const currentTrackAction = currentTrack
    ? getStarterTrackPrimaryAction(currentTrack.track, currentTrack.progress, locale)
    : null;
  const conceptsBySlug = new Map(
    options.concepts.map((concept) => [concept.slug, concept] as const),
  );
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

  return {
    computedAt,
    hasRecordedProgress: Object.keys(snapshot.concepts).length > 0,
    primaryConcept: continueLearning.primary
      ? {
          slug: continueLearning.primary.concept.slug,
          title:
            continueLearning.primary.concept.title ?? continueLearning.primary.concept.slug,
          status: continueLearning.primary.status,
          masteryState: continueLearning.primary.mastery.state,
          lastActivityAt: continueLearning.primary.lastActivityAt,
          resumeReason: primaryResurfacingCue?.reason ?? null,
          masteryNote: continueLearning.primary.mastery.note,
        }
      : null,
    recentConcepts: continueLearning.recent.map((item) => ({
      slug: item.concept.slug,
      title: item.concept.title ?? item.concept.slug,
      status: item.status,
      masteryState: item.mastery.state,
      lastActivityAt: item.lastActivityAt,
      note: getConceptResurfacingCue(item)?.reason ?? item.mastery.note,
    })),
    currentTrack: currentTrack
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
          primaryAction: currentTrackAction
            ? {
                href: currentTrackAction.href,
                label: currentTrackAction.label,
                note: currentTrackAction.note,
                kind: currentTrackAction.kind,
                targetConceptSlug: currentTrackAction.targetConcept?.slug ?? null,
                targetCheckpointId: currentTrackAction.targetCheckpoint?.id ?? null,
              }
            : null,
        }
      : null,
    followUp: followUpCandidate
      ? serializeSavedReviewQueueItem(followUpCandidate)
      : null,
    reviewQueue: reviewQueue.map((item) => serializeSavedReviewQueueItem(item)),
    nextRecommendation: nextRecommendation
      ? {
          conceptSlug: nextRecommendation.concept.slug,
          title: nextRecommendation.concept.title,
          fromConceptSlug: currentConcept?.slug ?? "",
          note: nextRecommendation.note,
        }
      : null,
  } satisfies SavedContinueLearningState;
}

export function normalizeSavedContinueLearningState(
  value: unknown,
): SavedContinueLearningState | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const primaryConcept = isPlainObject(value.primaryConcept)
    ? {
        slug: normalizeString(value.primaryConcept.slug),
        title: normalizeString(value.primaryConcept.title),
        status: normalizeEnumValue(value.primaryConcept.status, conceptProgressStatuses),
        masteryState: normalizeEnumValue(
          value.primaryConcept.masteryState,
          conceptMasteryStates,
        ),
        lastActivityAt: normalizeString(value.primaryConcept.lastActivityAt),
        resumeReason: normalizeString(value.primaryConcept.resumeReason),
        masteryNote: normalizeString(value.primaryConcept.masteryNote),
      }
    : null;
  const currentTrack = isPlainObject(value.currentTrack)
    ? {
        slug: normalizeString(value.currentTrack.slug),
        title: normalizeString(value.currentTrack.title),
        status: normalizeEnumValue(
          value.currentTrack.status,
          starterTrackProgressStatuses,
        ),
        completedFlowCount: normalizeNumber(value.currentTrack.completedFlowCount),
        totalFlowCount: normalizeNumber(value.currentTrack.totalFlowCount),
        completedCount: normalizeNumber(value.currentTrack.completedCount),
        totalConcepts: normalizeNumber(value.currentTrack.totalConcepts),
        completedCheckpointCount: normalizeNumber(value.currentTrack.completedCheckpointCount),
        totalCheckpoints: normalizeNumber(value.currentTrack.totalCheckpoints),
        lastActivityAt: normalizeString(value.currentTrack.lastActivityAt),
        primaryAction: isPlainObject(value.currentTrack.primaryAction)
          ? {
              href: normalizeString(value.currentTrack.primaryAction.href),
              label: normalizeString(value.currentTrack.primaryAction.label),
              note: normalizeString(value.currentTrack.primaryAction.note),
              kind: normalizeEnumValue(
                value.currentTrack.primaryAction.kind,
                starterTrackPrimaryKinds,
              ),
              targetConceptSlug: normalizeString(
                value.currentTrack.primaryAction.targetConceptSlug,
              ),
              targetCheckpointId: normalizeString(
                value.currentTrack.primaryAction.targetCheckpointId,
              ),
            }
          : null,
      }
    : null;
  const followUp = normalizeSavedReviewQueueItem(value.followUp);
  const nextRecommendation = isPlainObject(value.nextRecommendation)
    ? {
        conceptSlug: normalizeString(value.nextRecommendation.conceptSlug),
        title: normalizeString(value.nextRecommendation.title),
        fromConceptSlug: normalizeString(value.nextRecommendation.fromConceptSlug),
        note: normalizeString(value.nextRecommendation.note),
      }
    : null;
  const recentConcepts = Array.isArray(value.recentConcepts)
    ? value.recentConcepts
        .map((item) =>
          isPlainObject(item)
            ? {
                slug: normalizeString(item.slug),
                title: normalizeString(item.title),
                status: normalizeEnumValue(item.status, conceptProgressStatuses),
                masteryState: normalizeEnumValue(item.masteryState, conceptMasteryStates),
                lastActivityAt: normalizeString(item.lastActivityAt),
                note: normalizeString(item.note),
              }
            : null,
        )
        .filter(
          (
            item,
          ): item is SavedContinueLearningRecentConcept => Boolean(
            item?.slug &&
              item?.title &&
              item?.status &&
              item?.masteryState &&
              item?.note,
          ),
        )
    : [];
  const reviewQueue = Array.isArray(value.reviewQueue)
    ? value.reviewQueue
        .map((item) => normalizeSavedReviewQueueItem(item))
        .filter(
          (
            item,
          ): item is SavedContinueLearningReviewItem => Boolean(item),
        )
    : [];

  return {
    computedAt: normalizeString(value.computedAt) ?? new Date(0).toISOString(),
    hasRecordedProgress: value.hasRecordedProgress === true,
    primaryConcept:
      primaryConcept?.slug &&
      primaryConcept.title &&
      primaryConcept.status &&
      primaryConcept.masteryState &&
      primaryConcept.masteryNote
        ? {
            slug: primaryConcept.slug,
            title: primaryConcept.title,
            status: primaryConcept.status,
            masteryState: primaryConcept.masteryState,
            lastActivityAt: primaryConcept.lastActivityAt,
            resumeReason: primaryConcept.resumeReason,
            masteryNote: primaryConcept.masteryNote,
          }
        : null,
    recentConcepts,
    currentTrack:
      currentTrack?.slug &&
      currentTrack.title &&
      currentTrack.status &&
      currentTrack.completedFlowCount !== null &&
      currentTrack.totalFlowCount !== null &&
      currentTrack.completedCount !== null &&
      currentTrack.totalConcepts !== null &&
      currentTrack.completedCheckpointCount !== null &&
      currentTrack.totalCheckpoints !== null
        ? {
            slug: currentTrack.slug,
            title: currentTrack.title,
            status: currentTrack.status,
            completedFlowCount: currentTrack.completedFlowCount,
            totalFlowCount: currentTrack.totalFlowCount,
            completedCount: currentTrack.completedCount,
            totalConcepts: currentTrack.totalConcepts,
            completedCheckpointCount: currentTrack.completedCheckpointCount,
            totalCheckpoints: currentTrack.totalCheckpoints,
            lastActivityAt: currentTrack.lastActivityAt,
            primaryAction:
              currentTrack.primaryAction?.href &&
              currentTrack.primaryAction.label &&
              currentTrack.primaryAction.note &&
              currentTrack.primaryAction.kind
                ? {
                    href: currentTrack.primaryAction.href,
                    label: currentTrack.primaryAction.label,
                    note: currentTrack.primaryAction.note,
                    kind: currentTrack.primaryAction.kind,
                    targetConceptSlug: currentTrack.primaryAction.targetConceptSlug,
                    targetCheckpointId: currentTrack.primaryAction.targetCheckpointId,
                  }
                : null,
          }
        : null,
    followUp,
    reviewQueue,
    nextRecommendation:
      nextRecommendation?.conceptSlug &&
      nextRecommendation.title &&
      nextRecommendation.fromConceptSlug &&
      nextRecommendation.note
        ? {
            conceptSlug: nextRecommendation.conceptSlug,
            title: nextRecommendation.title,
            fromConceptSlug: nextRecommendation.fromConceptSlug,
            note: nextRecommendation.note,
          }
        : null,
  };
}
