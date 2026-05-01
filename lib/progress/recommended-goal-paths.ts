import type {
  RecommendedGoalPathConceptStepSummary,
  RecommendedGoalPathGuidedCollectionStepSummary,
  RecommendedGoalPathStepSummary,
  RecommendedGoalPathSummary,
  RecommendedGoalPathTopicStepSummary,
  RecommendedGoalPathTrackStepSummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildTrackCompletionHref,
  guidedCollectionShareAnchorIds,
  localizeShareHref,
} from "@/lib/share-links";
import {
  buildPrerequisiteTrackRecommendations,
  type StarterTrackRecommendationSummary,
} from "./track-recommendations";
import {
  getGuidedCollectionProgressSummary,
  type GuidedCollectionProgressSummary,
} from "./guided-collections";
import {
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  type StarterTrackProgressSummary,
} from "./tracks";
import {
  getConceptProgressSummary,
  getConceptResurfacingCue,
  selectContinueLearning,
  type ConceptProgressSummary,
  type ProgressSnapshot,
} from "./model";

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export type RecommendedGoalPathProgressStatus =
  | "not-started"
  | "in-progress"
  | "completed";

export type RecommendedGoalPathAction = {
  href: string;
  label: string;
};

export type RecommendedGoalPathStepProgress = {
  step: RecommendedGoalPathStepSummary;
  status: RecommendedGoalPathProgressStatus;
  note: string;
  primaryAction: RecommendedGoalPathAction;
  secondaryAction: RecommendedGoalPathAction | null;
  lastActivityAt: string | null;
  conceptProgress: ConceptProgressSummary | null;
  trackProgress: StarterTrackProgressSummary | null;
  collectionProgress: GuidedCollectionProgressSummary | null;
};

export type RecommendedGoalPathProgressSummary = {
  goalPath: RecommendedGoalPathSummary;
  status: RecommendedGoalPathProgressStatus;
  stepProgress: RecommendedGoalPathStepProgress[];
  nextStep: RecommendedGoalPathStepProgress | null;
  completedStepCount: number;
  startedStepCount: number;
  totalSteps: number;
  lastActivityAt: string | null;
  primaryAction: RecommendedGoalPathAction;
  primaryActionNote: string;
  bundleAction: RecommendedGoalPathAction | null;
  prerequisiteRecommendations: StarterTrackRecommendationSummary[];
};

function getLatestTimestamp(values: Array<string | null>) {
  const timestamps = values.filter((value): value is string => Boolean(value));

  if (!timestamps.length) {
    return null;
  }

  return timestamps.reduce((latest, value) => (value > latest ? value : latest), timestamps[0]);
}

function toGoalPathStatus(
  value: "not-started" | "started" | "practiced" | "completed",
): RecommendedGoalPathProgressStatus {
  if (value === "completed") {
    return "completed";
  }

  if (value === "not-started") {
    return "not-started";
  }

  return "in-progress";
}

function getStepStatusLabel(
  status: RecommendedGoalPathProgressStatus,
  locale: AppLocale,
) {
  if (status === "completed") {
    return copyText(locale, "completed", "已完成");
  }

  if (status === "in-progress") {
    return copyText(locale, "in progress", "進行中");
  }

  return copyText(locale, "not started", "未開始");
}

function buildTopicStepProgress(
  snapshot: ProgressSnapshot,
  step: RecommendedGoalPathTopicStepSummary,
  locale: AppLocale,
): RecommendedGoalPathStepProgress {
  const progressEntries = step.topic.concepts.map((concept) =>
    getConceptProgressSummary(snapshot, concept),
  );
  const completedCount = progressEntries.filter((entry) => entry.status === "completed").length;
  const startedCount = progressEntries.filter((entry) => entry.status !== "not-started").length;
  const topicTitle = getTopicDisplayTitle(step.topic, locale);
  const status: RecommendedGoalPathProgressStatus =
    completedCount === progressEntries.length
      ? "completed"
      : startedCount > 0
        ? "in-progress"
        : "not-started";

  return {
    step,
    status,
    note:
      status === "completed"
        ? copyText(
            locale,
            `All ${progressEntries.length} concepts on this topic page are already complete.`,
            `這個主題頁中的 ${progressEntries.length} 個概念都已完成。`,
          )
        : status === "in-progress"
          ? copyText(
              locale,
              `${completedCount} of ${progressEntries.length} concepts on this topic page are complete so far.`,
              `這個主題頁目前已有 ${completedCount} / ${progressEntries.length} 個概念完成。`,
            )
          : copyText(
              locale,
              `No saved progress yet inside ${topicTitle}.`,
              `${topicTitle} 內仍未有任何已保存進度。`,
            ),
    primaryAction: {
      href: localizeShareHref(step.href, locale),
      label:
        status === "not-started"
          ? copyText(locale, "Open topic page", "打開主題頁")
          : copyText(locale, "Review topic page", "重溫主題頁"),
    },
    secondaryAction: null,
    lastActivityAt: getLatestTimestamp(progressEntries.map((entry) => entry.lastActivityAt)),
    conceptProgress: null,
    trackProgress: null,
    collectionProgress: null,
  };
}

function buildGuidedCollectionStepProgress(
  snapshot: ProgressSnapshot,
  step: RecommendedGoalPathGuidedCollectionStepSummary,
  locale: AppLocale,
): RecommendedGoalPathStepProgress {
  const collectionProgress = getGuidedCollectionProgressSummary(
    snapshot,
    step.collection,
    locale,
  );
  const nextCollectionAction = collectionProgress.nextStep?.primaryAction ?? {
    href: localizeShareHref(step.href, locale),
    label: copyText(locale, "Open collection", "打開合集"),
  };
  const collectionTitle = getGuidedCollectionDisplayTitle(step.collection, locale);

  return {
    step,
    status: collectionProgress.status,
    note:
      collectionProgress.status === "completed"
        ? copyText(
            locale,
            `All ${collectionProgress.totalSteps} steps in ${collectionTitle} are already complete.`,
            `${collectionTitle} 的 ${collectionProgress.totalSteps} 個步驟都已完成。`,
          )
        : collectionProgress.nextStep
          ? copyText(
              locale,
              `${collectionProgress.nextStep.step.title} is the next guided collection step.`,
              `${collectionProgress.nextStep.step.title} 是這個引導式合集的下一步。`,
            )
          : step.summary,
    primaryAction:
      collectionProgress.status === "completed"
        ? {
            href: localizeShareHref(step.collection.path, locale),
            label: copyText(locale, "Review collection", "重溫合集"),
          }
        : {
            href: localizeShareHref(nextCollectionAction.href, locale),
            label: nextCollectionAction.label,
          },
    secondaryAction: {
      href: localizeShareHref(
        `${step.collection.path}#${guidedCollectionShareAnchorIds.bundle}`,
        locale,
      ),
      label: copyText(locale, "Build bundle", "建立組合包"),
    },
    lastActivityAt: collectionProgress.lastActivityAt,
    conceptProgress: null,
    trackProgress: null,
    collectionProgress,
  };
}

function buildTrackStepProgress(
  snapshot: ProgressSnapshot,
  step: RecommendedGoalPathTrackStepSummary,
  locale: AppLocale,
): RecommendedGoalPathStepProgress {
  const trackProgress = getStarterTrackProgressSummary(snapshot, step.track, locale);
  const trackPrimaryAction = getStarterTrackPrimaryAction(step.track, trackProgress, locale);
  const trackTitle = getStarterTrackDisplayTitle(step.track, locale);
  const targetConceptTitle = trackPrimaryAction.targetConcept
    ? getConceptDisplayTitle(trackPrimaryAction.targetConcept, locale)
    : null;
  const status: RecommendedGoalPathProgressStatus =
    trackProgress.status === "completed"
      ? "completed"
      : trackProgress.status === "in-progress"
        ? "in-progress"
        : "not-started";

  return {
    step,
    status,
    note:
      status === "completed"
        ? step.track.checkpoints.length
          ? copyText(
              locale,
              "All concepts and checkpoints in this track are already complete.",
              "這條路徑中的所有概念與檢查點都已完成。",
            )
          : copyText(
              locale,
              "All concepts in this track are already complete.",
              "這條路徑中的所有概念都已完成。",
            )
        : trackPrimaryAction.kind === "checkpoint" && trackPrimaryAction.targetCheckpoint
          ? copyText(
              locale,
              `${trackPrimaryAction.targetCheckpoint.title} is the next checkpoint inside ${trackTitle}.`,
              `${trackPrimaryAction.targetCheckpoint.title} 是 ${trackTitle} 中的下一個檢查點。`,
            )
          : targetConceptTitle
            ? copyText(
                locale,
                `${targetConceptTitle} is the next best step inside ${trackTitle}.`,
                `${targetConceptTitle} 是 ${trackTitle} 之中的下一個最佳步驟。`,
              )
            : trackPrimaryAction.note,
    primaryAction:
      status === "completed"
        ? {
            href: buildTrackCompletionHref(step.track.slug, locale),
            label: copyText(locale, "Open completion page", "打開完成頁"),
          }
        : {
            href: localizeShareHref(trackPrimaryAction.href, locale),
            label:
              trackPrimaryAction.kind === "checkpoint" && trackPrimaryAction.targetCheckpoint
                ? copyText(
                    locale,
                    "Open checkpoint",
                    "打開檢查點",
                  )
                : trackPrimaryAction.kind === "review"
                  ? copyText(
                      locale,
                      `Review from ${targetConceptTitle ?? trackTitle}`,
                      `從 ${targetConceptTitle ?? trackTitle} 開始重溫`,
                    )
                  : trackPrimaryAction.kind === "continue"
                    ? copyText(
                        locale,
                        `Continue with ${targetConceptTitle ?? trackTitle}`,
                        `繼續 ${targetConceptTitle ?? trackTitle}`,
                      )
                    : copyText(
                        locale,
                        `Start with ${targetConceptTitle ?? trackTitle}`,
                        `從 ${targetConceptTitle ?? trackTitle} 開始`,
                      ),
          },
    secondaryAction:
      trackPrimaryAction.href === step.href
        ? null
        : {
            href: localizeShareHref(step.href, locale),
            label: copyText(locale, "Open track page", "打開路徑頁"),
          },
    lastActivityAt: trackProgress.lastActivityAt,
    conceptProgress: null,
    trackProgress,
    collectionProgress: null,
  };
}

function buildConceptStepProgress(
  snapshot: ProgressSnapshot,
  step: RecommendedGoalPathConceptStepSummary,
  locale: AppLocale,
): RecommendedGoalPathStepProgress {
  const conceptProgress = getConceptProgressSummary(snapshot, step.concept);
  const status = toGoalPathStatus(conceptProgress.status);
  const conceptTitle = getConceptDisplayTitle(step.concept, locale);

  return {
    step,
    status,
    note:
      conceptProgress.status === "not-started"
        ? copyText(
            locale,
            `No saved progress yet for ${conceptTitle}.`,
            `${conceptTitle} 仍未有任何已保存進度。`,
          )
        : conceptProgress.mastery.note,
    primaryAction: {
      href: localizeShareHref(step.href, locale),
      label:
        status === "completed"
          ? copyText(locale, "Review concept", "重溫概念")
          : status === "in-progress"
            ? copyText(locale, "Continue concept", "繼續概念")
            : copyText(locale, "Start concept", "開始概念"),
    },
    secondaryAction: null,
    lastActivityAt: conceptProgress.lastActivityAt,
    conceptProgress,
    trackProgress: null,
    collectionProgress: null,
  };
}

function buildStepProgress(
  snapshot: ProgressSnapshot,
  step: RecommendedGoalPathStepSummary,
  locale: AppLocale,
): RecommendedGoalPathStepProgress {
  switch (step.kind) {
    case "topic":
      return buildTopicStepProgress(snapshot, step, locale);
    case "guided-collection":
      return buildGuidedCollectionStepProgress(snapshot, step, locale);
    case "track":
      return buildTrackStepProgress(snapshot, step, locale);
    case "concept":
      return buildConceptStepProgress(snapshot, step, locale);
    default:
      throw new Error(
        `Unsupported recommended goal path step kind: ${(step as { kind: string }).kind}`,
      );
  }
}

function buildGoalPathPrimaryAction(
  snapshot: ProgressSnapshot,
  goalPath: RecommendedGoalPathSummary,
  stepProgress: RecommendedGoalPathStepProgress[],
  status: RecommendedGoalPathProgressStatus,
  prerequisiteRecommendations: StarterTrackRecommendationSummary[],
  locale: AppLocale,
) {
  const continueLearning = selectContinueLearning(snapshot, goalPath.concepts, 1);
  const currentConcept = continueLearning.primary;
  const currentResurfacingCue = currentConcept ? getConceptResurfacingCue(currentConcept) : null;

  if (status === "not-started" && prerequisiteRecommendations.length) {
    const recommendation = prerequisiteRecommendations[0];
    const trackTitle = getStarterTrackDisplayTitle(recommendation.track, locale);
    const actionLabel =
      locale === "zh-HK"
        ? recommendation.progress.status === "not-started"
          ? `開始 ${trackTitle} 前置路徑`
          : `繼續 ${trackTitle} 前置路徑`
        : recommendation.actionLabel;

    return {
      action: {
        href: recommendation.href,
        label: actionLabel,
      },
      note: copyText(
        locale,
        `${recommendation.note} Nothing is hard-gated here; this is simply the authored prep path.`,
        `${trackTitle} 是這條目標路徑建議先走的準備路線。這裡沒有硬性門檻，只是保留作者編排的前置節奏。`,
      ),
    };
  }

  if (currentConcept) {
    const currentConceptTitle =
      typeof currentConcept.concept.title === "string" && currentConcept.concept.title.length
        ? getConceptDisplayTitle(
            {
              slug: currentConcept.concept.slug,
              title: currentConcept.concept.title,
            },
            locale,
          )
        : currentConcept.concept.slug;
    return {
      action: {
        href: localizeShareHref(`/concepts/${currentConcept.concept.slug}`, locale),
        label: copyText(locale, "Continue concept", "繼續概念"),
      },
      note: currentResurfacingCue?.reason
        ? copyText(
            locale,
            currentResurfacingCue.reason,
            `${currentConceptTitle} 仍然是這條目標路徑中最近一次尚未完成的概念。`,
          )
        : copyText(
            locale,
            `${currentConceptTitle} is still the most recent unfinished concept inside this goal path.`,
            `${currentConceptTitle} 仍然是這條目標路徑中最近一次尚未完成的概念。`,
          ),
    };
  }

  const nextStep =
    status === "completed"
      ? stepProgress[0] ?? null
      : stepProgress.find((step) => step.status !== "completed") ?? stepProgress[0] ?? null;

  if (nextStep) {
    return {
      action: nextStep.primaryAction,
      note:
        nextStep.status === "completed"
          ? copyText(
              locale,
              `${nextStep.step.title} is already ${getStepStatusLabel(nextStep.status, locale)}.`,
              `${nextStep.step.title} 已經處於${getStepStatusLabel(nextStep.status, locale)}狀態。`,
            )
          : nextStep.note,
    };
  }

  return {
    action: {
      href: localizeShareHref(goalPath.path, locale),
      label: copyText(locale, "Review goal path", "重溫目標路徑"),
    },
    note: copyText(
      locale,
      "This goal path is fully complete in the current saved progress.",
      "這條目標路徑在目前的已保存進度中已完全完成。",
    ),
  };
}

export function buildRecommendedGoalPathProgressSummary(
  snapshot: ProgressSnapshot,
  goalPath: RecommendedGoalPathSummary,
  locale: AppLocale = "en",
): RecommendedGoalPathProgressSummary {
  const stepProgress = goalPath.steps.map((step) =>
    buildStepProgress(snapshot, step, locale),
  );
  const completedStepCount = stepProgress.filter((step) => step.status === "completed").length;
  const startedStepCount = stepProgress.filter((step) => step.status !== "not-started").length;
  const totalSteps = stepProgress.length;
  const status: RecommendedGoalPathProgressStatus =
    completedStepCount === totalSteps
      ? "completed"
      : startedStepCount > 0
        ? "in-progress"
        : "not-started";
  const actionableTrackStep = stepProgress.find(
    (step) => step.step.kind === "track" && step.status !== "completed",
  );
  const prerequisiteTracks =
    actionableTrackStep?.step.kind === "track"
      ? actionableTrackStep.step.prerequisiteTracks
      : [];
  const prerequisiteRecommendations =
    actionableTrackStep?.step.kind === "track" && prerequisiteTracks.length
      ? buildPrerequisiteTrackRecommendations(
          snapshot,
          actionableTrackStep.step.track,
          prerequisiteTracks,
          locale,
        ).filter((recommendation) => recommendation.progress.status !== "completed")
      : [];
  const { action, note } = buildGoalPathPrimaryAction(
    snapshot,
    goalPath,
    stepProgress,
    status,
    prerequisiteRecommendations,
    locale,
  );
  const bundleCollectionStep = stepProgress.find(
    (step): step is RecommendedGoalPathStepProgress & {
      step: RecommendedGoalPathGuidedCollectionStepSummary;
    } => step.step.kind === "guided-collection",
  );

  return {
    goalPath,
    status,
    stepProgress,
    nextStep:
      status === "completed"
        ? stepProgress[0] ?? null
        : stepProgress.find((step) => step.status !== "completed") ?? stepProgress[0] ?? null,
    completedStepCount,
    startedStepCount,
    totalSteps,
    lastActivityAt: getLatestTimestamp(stepProgress.map((step) => step.lastActivityAt)),
    primaryAction: action,
    primaryActionNote: note,
    bundleAction: bundleCollectionStep?.secondaryAction ?? null,
    prerequisiteRecommendations,
  };
}
