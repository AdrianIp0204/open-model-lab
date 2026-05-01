import type { AppLocale } from "@/i18n/routing";
import type {
  ConceptContent,
  ReadNextRecommendation,
  ResolvedConceptPageSection,
  StarterTrackConceptMembership,
} from "@/lib/content";
import {
  getConceptPageV2StepHashId,
  resolveConceptPageV2,
  resolveConceptPageV2StepIdFromLegacyPhase,
} from "@/lib/content";
import { buildRelativeShareUrl, localizeShareHref } from "@/lib/share-links";
import {
  getCompletedChallengeCount,
  getConceptProgressSummary,
  getStartedChallengeCount,
  getStarterTrackMembershipAction,
  getStarterTrackProgressSummary,
  type ConceptProgressSummary,
  type ProgressSnapshot,
  type StarterTrackProgressSummary,
} from "@/lib/progress";

export type ConceptPageOverallStatus = "not-started" | "in-progress" | "completed";

export type ConceptPageStatusAction =
  | {
      kind: "start-concept" | "continue-phase" | "review-concept";
      href: string;
      stepId: string;
      stepLabel: string;
      title: null;
      note: string | null;
    }
  | {
      kind: "next-track-step" | "next-read-next";
      href: string;
      stepId: null;
      stepLabel: null;
      title: string;
      note: string | null;
    }
  | {
      kind: "checkpoint";
      href: string;
      stepId: null;
      stepLabel: null;
      title: null;
      note: string | null;
      label: string;
    }
  | {
      kind: "return-track";
      href: string;
      stepId: null;
      stepLabel: null;
      title: string;
      note: string | null;
    };

export type ConceptPageTrackPosition = {
  current: number;
  total: number;
  trackSlug: string;
  trackTitle: string;
  summary: StarterTrackProgressSummary;
};

export type ConceptPageStatusModel = {
  overallStatus: ConceptPageOverallStatus;
  progress: ConceptProgressSummary;
  recommendedStepId: string;
  recommendedStepLabel: string;
  primaryAction: ConceptPageStatusAction;
  secondaryAction: ConceptPageStatusAction | null;
  trackPosition: ConceptPageTrackPosition | null;
};

function buildConceptPhaseHref(
  slug: string,
  stepId: string,
  locale: AppLocale,
) {
  return localizeShareHref(
    buildRelativeShareUrl(`/concepts/${slug}`, {
      hash: getConceptPageV2StepHashId(stepId),
    }),
    locale,
  );
}

function resolveResumePhase(input: {
  concept: ConceptContent;
  locale: AppLocale;
  readNext: ReadNextRecommendation[];
  progress: ConceptProgressSummary;
  sections: ResolvedConceptPageSection[];
}) {
  const { concept, locale, readNext, progress } = input;
  const model = resolveConceptPageV2(concept, {
    locale,
    readNext,
  });
  const record = progress.record;

  if (progress.status === "completed") {
    return (
      resolveConceptPageV2StepIdFromLegacyPhase(model, "check") ??
      model.steps.at(-1)?.id ??
      model.steps[0]?.id ??
      ""
    );
  }

  const hasCheckSignals =
    Boolean(record?.completedQuickTestAt) ||
    getCompletedChallengeCount(record) > 0 ||
    getStartedChallengeCount(record) > 0 ||
    Boolean(record?.usedChallengeModeAt);

  if (hasCheckSignals) {
    return (
      resolveConceptPageV2StepIdFromLegacyPhase(model, "check") ??
      model.steps.at(-1)?.id ??
      model.steps[0]?.id ??
      ""
    );
  }

  const hasUnderstandSignals =
    Boolean(record?.engagedWorkedExampleAt) ||
    Boolean(record?.usedPredictionModeAt) ||
    Boolean(record?.usedCompareModeAt);

  if (hasUnderstandSignals) {
    return (
      resolveConceptPageV2StepIdFromLegacyPhase(model, "understand") ??
      model.steps[1]?.id ??
      model.steps[0]?.id ??
      ""
    );
  }

  return (
    resolveConceptPageV2StepIdFromLegacyPhase(model, "explore") ??
    model.steps[0]?.id ??
    ""
  );
}

function resolveOverallStatus(
  progress: ConceptProgressSummary,
): ConceptPageOverallStatus {
  const record = progress.record;
  const visitOnly =
    progress.status === "started" &&
    Boolean(record?.firstVisitedAt) &&
    !record?.hasInteracted &&
    !record?.lastInteractedAt &&
    !record?.usedChallengeModeAt &&
    !record?.usedPredictionModeAt &&
    !record?.usedCompareModeAt &&
    !record?.engagedWorkedExampleAt &&
    !record?.quickTestStartedAt &&
    !record?.completedQuickTestAt &&
    !record?.manualCompletedAt &&
    Object.keys(record?.startedChallenges ?? {}).length === 0 &&
    Object.keys(record?.completedChallenges ?? {}).length === 0;

  if (visitOnly) {
    return "not-started";
  }

  return progress.status === "completed"
    ? "completed"
    : progress.status === "not-started"
      ? "not-started"
      : "in-progress";
}

function resolveTrackPosition(
  snapshot: ProgressSnapshot,
  memberships: StarterTrackConceptMembership[],
  locale: AppLocale,
) {
  if (memberships.length !== 1) {
    return null;
  }

  const membership = memberships[0];
  const summary = getStarterTrackProgressSummary(snapshot, membership.track, locale);

  return {
    current: membership.stepIndex + 1,
    total: membership.totalSteps,
    trackSlug: membership.track.slug,
    trackTitle: membership.track.title,
    summary,
  } satisfies ConceptPageTrackPosition;
}

function resolveCompletedPrimaryAction(input: {
  concept: ConceptContent;
  locale: AppLocale;
  memberships: StarterTrackConceptMembership[];
  readNext: ReadNextRecommendation[];
  snapshot: ProgressSnapshot;
  sections: ResolvedConceptPageSection[];
}) {
  const { concept, locale, memberships, readNext, snapshot, sections } = input;
  const model = resolveConceptPageV2(concept, { locale, readNext });
  const reviewStepId =
    resolveResumePhase({
      concept,
      locale,
      readNext,
      progress: getConceptProgressSummary(snapshot, concept),
      sections,
    }) ?? model.steps[0]?.id;
  const reviewStepLabel =
    model.steps.find((step) => step.id === reviewStepId)?.label ?? model.steps[0]?.label ?? concept.title;
  const trackPosition = resolveTrackPosition(snapshot, memberships, locale);

  if (trackPosition) {
    const membership = memberships[0];
    const membershipAction = getStarterTrackMembershipAction(
      membership,
      trackPosition.summary,
      locale,
    );
    const nextTrackConcept = membership.nextConcept;
    const nextTrackStepHref = nextTrackConcept
      ? localizeShareHref(`/concepts/${nextTrackConcept.slug}`, locale)
      : null;

    if (nextTrackConcept && nextTrackStepHref && membershipAction.href === nextTrackStepHref) {
      return {
        primaryAction: {
          kind: "next-track-step",
          href: membershipAction.href,
          stepId: null,
          stepLabel: null,
          title: nextTrackConcept.title,
          note: membershipAction.note,
        } satisfies ConceptPageStatusAction,
        secondaryAction: {
          kind: "review-concept",
          href: buildConceptPhaseHref(concept.slug, reviewStepId, locale),
          stepId: reviewStepId,
          stepLabel: reviewStepLabel,
          title: null,
          note: null,
        } satisfies ConceptPageStatusAction,
      };
    }

    if (membershipAction.href.startsWith(localizeShareHref("/tracks/", locale))) {
      return {
        primaryAction: {
          kind: "return-track",
          href: membershipAction.href,
          stepId: null,
          stepLabel: null,
          title: trackPosition.trackTitle,
          note: membershipAction.note,
        } satisfies ConceptPageStatusAction,
        secondaryAction: {
          kind: "review-concept",
          href: buildConceptPhaseHref(concept.slug, reviewStepId, locale),
          stepId: reviewStepId,
          stepLabel: reviewStepLabel,
          title: null,
          note: null,
        } satisfies ConceptPageStatusAction,
      };
    }

    return {
      primaryAction: {
        kind: "checkpoint",
        href: membershipAction.href,
        stepId: null,
        stepLabel: null,
        title: null,
        note: membershipAction.note,
        label: membershipAction.label,
      } satisfies ConceptPageStatusAction,
      secondaryAction: {
        kind: "review-concept",
        href: buildConceptPhaseHref(concept.slug, reviewStepId, locale),
        stepId: reviewStepId,
        stepLabel: reviewStepLabel,
        title: null,
        note: null,
      } satisfies ConceptPageStatusAction,
    };
  }

  const nextRecommendation = readNext[0];

  if (nextRecommendation) {
    return {
      primaryAction: {
        kind: "next-read-next",
        href: localizeShareHref(`/concepts/${nextRecommendation.slug}`, locale),
        stepId: null,
        stepLabel: null,
        title: nextRecommendation.title,
        note: nextRecommendation.reasonLabel,
      } satisfies ConceptPageStatusAction,
      secondaryAction: {
        kind: "review-concept",
        href: buildConceptPhaseHref(concept.slug, reviewStepId, locale),
        stepId: reviewStepId,
        stepLabel: reviewStepLabel,
        title: null,
        note: null,
      } satisfies ConceptPageStatusAction,
    };
  }

  return {
    primaryAction: {
      kind: "review-concept",
      href: buildConceptPhaseHref(concept.slug, reviewStepId, locale),
      stepId: reviewStepId,
      stepLabel: reviewStepLabel,
      title: null,
      note: null,
    } satisfies ConceptPageStatusAction,
    secondaryAction: null,
  };
}

export function resolveConceptPageStatusModel(input: {
  concept: ConceptContent;
  sections: ResolvedConceptPageSection[];
  snapshot: ProgressSnapshot;
  readNext: ReadNextRecommendation[];
  starterTrackMemberships: StarterTrackConceptMembership[];
  locale: AppLocale;
}) {
  const { concept, sections, snapshot, readNext, starterTrackMemberships, locale } = input;
  const progress = getConceptProgressSummary(snapshot, concept);
  const overallStatus = resolveOverallStatus(progress);
  const model = resolveConceptPageV2(concept, { locale, readNext });
  const recommendedStepId = resolveResumePhase({
    concept,
    locale,
    readNext,
    progress,
    sections,
  });
  const recommendedStepLabel =
    model.steps.find((step) => step.id === recommendedStepId)?.label ?? model.steps[0]?.label ?? concept.title;
  const trackPosition = resolveTrackPosition(snapshot, starterTrackMemberships, locale);

  if (overallStatus === "completed") {
    const completedActions = resolveCompletedPrimaryAction({
      concept,
      locale,
      memberships: starterTrackMemberships,
      readNext,
      snapshot,
      sections,
    });

    return {
      overallStatus,
      progress,
      recommendedStepId,
      recommendedStepLabel,
      trackPosition,
      primaryAction: completedActions.primaryAction,
      secondaryAction: completedActions.secondaryAction,
    } satisfies ConceptPageStatusModel;
  }

  return {
    overallStatus,
    progress,
    recommendedStepId,
    recommendedStepLabel,
    trackPosition,
    primaryAction: {
      kind: overallStatus === "not-started" ? "start-concept" : "continue-phase",
      href: buildConceptPhaseHref(concept.slug, recommendedStepId, locale),
      stepId: recommendedStepId,
      stepLabel: recommendedStepLabel,
      title: null,
      note: null,
    },
    secondaryAction: trackPosition
      ? {
          kind: "return-track",
          href: localizeShareHref(`/tracks/${trackPosition.trackSlug}`, locale),
          stepId: null,
          stepLabel: null,
          title: trackPosition.trackTitle,
          note: null,
        }
      : null,
  } satisfies ConceptPageStatusModel;
}
