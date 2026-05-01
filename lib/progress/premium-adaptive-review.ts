import type { ConceptSummary, GuidedCollectionSummary, StarterTrackSummary } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptProgressSummary,
  type ConceptMasteryState,
  type ConceptProgressStatus,
  type ProgressSnapshot,
  type ReviewQueueReasonKind,
} from "./model";
import type { ReviewRemediationSuggestion } from "./remediation";
import {
  selectAdaptiveReviewQueue,
  type AdaptiveReviewQueueItem,
  type ReviewQueueAction,
  type ReviewQueueTrackContext,
} from "./review-queue";

type PremiumAdaptiveReviewConcept = Pick<ConceptSummary, "id" | "slug" | "title"> &
  Partial<Pick<ConceptSummary, "shortTitle">> & {
    prerequisites?: string[];
  };

export type PremiumAdaptiveReviewOutcomeKind =
  | "checkpoint"
  | "challenge"
  | "diagnostic"
  | "quick-test"
  | "concept";

export type PremiumAdaptiveReviewItem = {
  id: string;
  concept: {
    slug: string;
    title: string;
  };
  reasonKind: ReviewQueueReasonKind;
  reasonLabel: string;
  outcomeKind: PremiumAdaptiveReviewOutcomeKind;
  outcomeLabel: string;
  whyChosen: string;
  supportReasons: string[];
  progressStatus: ConceptProgressStatus;
  masteryState: ConceptMasteryState;
  lastActivityAt: string | null;
  primaryAction: ReviewQueueAction;
  secondaryAction: ReviewQueueAction | null;
  trackContext: ReviewQueueTrackContext | null;
  remediationSuggestions: ReviewRemediationSuggestion[];
};

export type PremiumAdaptiveReviewSummary = {
  hasRecordedProgress: boolean;
  methodologyNote: string;
  items: PremiumAdaptiveReviewItem[];
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return values.filter((value, index, allValues): value is string => {
    return Boolean(value) && allValues.indexOf(value) === index;
  });
}

function getReasonLabel(reasonKind: ReviewQueueReasonKind) {
  switch (reasonKind) {
    case "missed-checks":
      return "Missed checks";
    case "challenge":
      return "Challenge follow-up";
    case "checkpoint":
      return "Checkpoint recovery";
    case "diagnostic":
      return "Entry diagnostic";
    case "confidence":
      return "Needs confidence";
    case "unfinished":
      return "Return to finish";
    default:
      return "Stale review";
  }
}

function getOutcomeKind(item: AdaptiveReviewQueueItem): PremiumAdaptiveReviewOutcomeKind {
  if (item.reasonKind === "checkpoint" || item.primaryAction.kind === "checkpoint") {
    return "checkpoint";
  }

  if (item.reasonKind === "challenge" || item.primaryAction.kind === "challenge") {
    return "challenge";
  }

  if (item.reasonKind === "diagnostic") {
    return "diagnostic";
  }

  if (item.reasonKind === "missed-checks" || item.primaryAction.kind === "quick-test") {
    return "quick-test";
  }

  return "concept";
}

function getOutcomeLabel(outcomeKind: PremiumAdaptiveReviewOutcomeKind) {
  switch (outcomeKind) {
    case "checkpoint":
      return "Checkpoint outcome";
    case "challenge":
      return "Challenge outcome";
    case "diagnostic":
      return "Entry diagnostic";
    case "quick-test":
      return "Quick-test outcome";
    default:
      return "Review pressure";
  }
}

function getOutcomePriorityBoost(item: AdaptiveReviewQueueItem) {
  switch (getOutcomeKind(item)) {
    case "checkpoint":
      return 90;
    case "challenge":
      return 78;
    case "diagnostic":
      return 66;
    case "quick-test":
      return 30;
    default:
      return item.reasonKind === "confidence" ? 14 : item.reasonKind === "unfinished" ? 10 : 0;
  }
}

function shouldDisplaySupportReason(
  reason: string,
  primaryReason: string,
  trackNote: string | null,
) {
  const normalizeReasonSignature = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");
  const normalizedReason = reason.trim().toLowerCase();
  const normalizedSignature = normalizeReasonSignature(reason);
  const relatedReasons = [primaryReason, trackNote]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());
  const relatedSignatures = relatedReasons.map((value) => normalizeReasonSignature(value));

  if (relatedSignatures.includes(normalizedSignature)) {
    return false;
  }

  return !relatedReasons.some(
    (candidate) =>
      normalizedReason === candidate ||
      normalizedReason.includes(candidate) ||
      candidate.includes(normalizedReason),
  );
}

function buildWhyChosen(item: AdaptiveReviewQueueItem) {
  const supportingReason =
    item.supportReasons.find((reason) =>
      shouldDisplaySupportReason(reason, item.reason, item.trackContext?.note ?? null),
    ) ?? null;

  return supportingReason ? `${item.reason} ${supportingReason}` : item.reason;
}

function compareAdaptiveReviewItems(
  left: AdaptiveReviewQueueItem,
  right: AdaptiveReviewQueueItem,
) {
  const leftPriority = left.priority + getOutcomePriorityBoost(left);
  const rightPriority = right.priority + getOutcomePriorityBoost(right);

  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }

  const leftActivity = left.progress.lastActivityAt ?? "";
  const rightActivity = right.progress.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return rightActivity.localeCompare(leftActivity);
  }

  return left.concept.title.localeCompare(right.concept.title);
}

export function buildPremiumAdaptiveReviewSummary(input: {
  snapshot: ProgressSnapshot;
  concepts: PremiumAdaptiveReviewConcept[];
  starterTracks: StarterTrackSummary[];
  guidedCollections?: GuidedCollectionSummary[];
  limit?: number;
  now?: Date;
  locale?: AppLocale;
}): PremiumAdaptiveReviewSummary {
  const reviewConcepts = input.concepts.filter((concept) => {
    return getConceptProgressSummary(input.snapshot, concept).status !== "not-started";
  });
  const hasRecordedProgress = reviewConcepts.length > 0;

  if (!hasRecordedProgress) {
    return {
      hasRecordedProgress,
      methodologyNote:
        "Supporter keeps this review layer higher-resolution on purpose: recent checkpoint, challenge, and entry-diagnostic outcomes are ranked first, then the existing review queue fills any remaining slots from the same canonical progress snapshot.",
      items: [],
    };
  }

  const queue = selectAdaptiveReviewQueue(
    input.snapshot,
    reviewConcepts,
    input.starterTracks,
    Math.max(input.limit ?? 3, reviewConcepts.length),
    {
      allConcepts: input.concepts,
      guidedCollections: input.guidedCollections ?? [],
      now: input.now,
      locale: input.locale,
    },
  ).sort(compareAdaptiveReviewItems);
  const prioritizedItems = queue.filter((item) => {
    const outcomeKind = getOutcomeKind(item);

    return (
      (outcomeKind === "checkpoint" ||
        outcomeKind === "challenge" ||
        outcomeKind === "diagnostic") &&
      Boolean(item.progress.lastActivityAt)
    );
  });
  const prioritizedKeys = new Set(
    prioritizedItems.map((item) => `${item.concept.slug}:${item.reasonKind}:${item.primaryAction.kind}`),
  );
  const orderedItems = [
    ...prioritizedItems,
    ...queue.filter(
      (item) =>
        !prioritizedKeys.has(
          `${item.concept.slug}:${item.reasonKind}:${item.primaryAction.kind}`,
        ),
    ),
  ].slice(0, Math.max(0, input.limit ?? 3));
  return {
    hasRecordedProgress,
    methodologyNote:
      "Supporter keeps this review layer higher-resolution on purpose: recent checkpoint, challenge, and entry-diagnostic outcomes are ranked first, then the existing review queue fills any remaining slots from the same canonical progress snapshot.",
    items: orderedItems.map((item) => ({
      id: `${item.concept.slug}:${item.reasonKind}:${item.primaryAction.kind}`,
      concept: {
        slug: item.concept.slug,
        title: item.concept.title,
      },
      reasonKind: item.reasonKind,
      reasonLabel: getReasonLabel(item.reasonKind),
      outcomeKind: getOutcomeKind(item),
      outcomeLabel: getOutcomeLabel(getOutcomeKind(item)),
      whyChosen: buildWhyChosen(item),
      supportReasons: uniqueStrings(
        item.supportReasons.filter((reason) =>
          shouldDisplaySupportReason(reason, item.reason, item.trackContext?.note ?? null),
        ),
      ).slice(0, 3),
      progressStatus: item.progress.status,
      masteryState: item.progress.mastery.state,
      lastActivityAt: item.progress.lastActivityAt,
      primaryAction: item.primaryAction,
      secondaryAction: item.secondaryAction,
      trackContext: item.trackContext,
      remediationSuggestions: item.remediationSuggestions,
    })),
  };
}
