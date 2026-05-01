import type {
  ConceptSummary,
  StarterTrackCheckpointSummary,
  StarterTrackConceptMembership,
  StarterTrackSummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayShortTitle,
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
  getTopicDisplayTitle,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import type {
  StarterTrackCompletionContentContext,
  StarterTrackCompletionRelatedTopic,
} from "@/lib/content/track-completion";
import {
  buildChallengeEntryHref,
  buildRelativeShareUrl,
  buildTrackCompletionHref,
  conceptShareAnchorIds,
  localizeShareHref,
} from "@/lib/share-links";
import {
  getCompletedChallengeCount,
  getConceptProgressLastActivityAt,
  getConceptResurfacingCue,
  getConceptProgressSummary,
  type ConceptResurfacingCue,
  type ConceptProgressSummary,
  type ProgressSnapshot,
} from "./model";

export type StarterTrackProgressStatus = "not-started" | "in-progress" | "completed";
export type StarterTrackCheckpointProgressStatus = "locked" | "ready" | "completed";

export type StarterTrackCheckpointAction = {
  href: string;
  label: string;
};

export type StarterTrackCheckpointProgress = {
  checkpoint: StarterTrackCheckpointSummary;
  status: StarterTrackCheckpointProgressStatus;
  completedAt: string | null;
  note: string;
  action: StarterTrackCheckpointAction;
  isNextGuidedStep: boolean;
};

export type StarterTrackProgressSummary = {
  track: StarterTrackSummary;
  status: StarterTrackProgressStatus;
  conceptProgress: ConceptProgressSummary[];
  checkpointProgress: StarterTrackCheckpointProgress[];
  completedCount: number;
  startedCount: number;
  totalConcepts: number;
  completedCheckpointCount: number;
  totalCheckpoints: number;
  completedFlowCount: number;
  totalFlowCount: number;
  allConceptsComplete: boolean;
  lastActivityAt: string | null;
  nextConcept: ConceptSummary | null;
  nextCheckpoint: StarterTrackCheckpointProgress | null;
  resumeConcept: ConceptSummary | null;
};

export type StarterTrackPrimaryAction = {
  href: string;
  label: string;
  note: string;
  targetConcept: ConceptSummary | null;
  targetCheckpoint: StarterTrackCheckpointSummary | null;
  kind: "start" | "continue" | "review" | "checkpoint";
};

export type StarterTrackRecapFocusKind =
  | "priority"
  | "next"
  | "active"
  | "solid"
  | "ahead";

export type StarterTrackRecapActionKind =
  | "concept"
  | "quick-test"
  | "challenge"
  | "worked-examples";

export type StarterTrackRecapAction = {
  href: string;
  label: string;
  kind: StarterTrackRecapActionKind;
};

export type StarterTrackRecapStep = {
  concept: ConceptSummary;
  progress: ConceptProgressSummary;
  focusKind: StarterTrackRecapFocusKind;
  focusLabel: string;
  note: string;
  supportReasons: string[];
  action: StarterTrackRecapAction;
  resurfacingCue: ConceptResurfacingCue | null;
  isNextGuidedStep: boolean;
};

export type StarterTrackRecapSummary = {
  track: StarterTrackSummary;
  progress: StarterTrackProgressSummary;
  steps: StarterTrackRecapStep[];
  primaryStep: StarterTrackRecapStep | null;
  intro: string;
  priorityCount: number;
  solidCount: number;
  activeCount: number;
  aheadCount: number;
};

export type StarterTrackCompletionConcept = {
  concept: ConceptSummary;
  progress: ConceptProgressSummary;
  lastActivityAt: string | null;
};

export type StarterTrackCompletionGuidanceKind =
  | "track"
  | "topic"
  | "review"
  | "challenge";

export type StarterTrackCompletionGuidance = {
  kind: StarterTrackCompletionGuidanceKind;
  eyebrow: string;
  title: string;
  note: string;
  href: string;
  actionLabel: string;
};

export type StarterTrackCompletionSummary = {
  track: StarterTrackSummary;
  progress: StarterTrackProgressSummary;
  recap: StarterTrackRecapSummary;
  completedConcepts: StarterTrackCompletionConcept[];
  completionDate: string | null;
  completedCheckpointCount: number;
  totalCheckpoints: number;
  quickTestCompletedCount: number;
  completedChallengeCount: number;
  strongCheckConceptCount: number;
  coverageSummary: string;
  guidance: StarterTrackCompletionGuidance[];
  relatedTopic: StarterTrackCompletionRelatedTopic | null;
  relatedTopicSharedConceptCount: number;
  suggestedNextTrack: StarterTrackSummary | null;
};

export function getStarterTrackStatusPriority(status: StarterTrackProgressStatus) {
  if (status === "in-progress") {
    return 2;
  }

  if (status === "completed") {
    return 1;
  }

  return 0;
}

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function getStarterTrackFlowCoverage(summary: StarterTrackProgressSummary) {
  if (summary.totalFlowCount <= 0) {
    return 0;
  }

  return summary.completedFlowCount / summary.totalFlowCount;
}

export function compareStarterTrackProgressSummaries(
  leftTrack: StarterTrackSummary,
  leftProgress: StarterTrackProgressSummary,
  rightTrack: StarterTrackSummary,
  rightProgress: StarterTrackProgressSummary,
) {
  const leftSequence = leftTrack.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = rightTrack.sequence ?? Number.MAX_SAFE_INTEGER;
  const statusDelta =
    getStarterTrackStatusPriority(rightProgress.status) -
    getStarterTrackStatusPriority(leftProgress.status);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const leftActivity = leftProgress.lastActivityAt ?? "";
  const rightActivity = rightProgress.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return rightActivity.localeCompare(leftActivity);
  }

  const leftCoverage = getStarterTrackFlowCoverage(leftProgress);
  const rightCoverage = getStarterTrackFlowCoverage(rightProgress);

  if (leftCoverage !== rightCoverage) {
    return rightCoverage - leftCoverage;
  }

  if (leftProgress.completedFlowCount !== rightProgress.completedFlowCount) {
    return rightProgress.completedFlowCount - leftProgress.completedFlowCount;
  }

  if (leftProgress.startedCount !== rightProgress.startedCount) {
    return rightProgress.startedCount - leftProgress.startedCount;
  }

  if (leftProgress.totalFlowCount !== rightProgress.totalFlowCount) {
    return leftProgress.totalFlowCount - rightProgress.totalFlowCount;
  }

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return leftTrack.title.localeCompare(rightTrack.title);
}

function getLatestTrackActivity(
  conceptProgress: ConceptProgressSummary[],
  checkpointProgress: StarterTrackCheckpointProgress[] = [],
) {
  return [
    ...conceptProgress
      .map((item) => getConceptProgressLastActivityAt(item.record))
      .filter((value): value is string => Boolean(value)),
    ...checkpointProgress
      .map((item) => item.completedAt)
      .filter((value): value is string => Boolean(value)),
  ].sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function sortByMostRecent(left: ConceptProgressSummary, right: ConceptProgressSummary) {
  const leftActivity = left.lastActivityAt ?? "";
  const rightActivity = right.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return rightActivity.localeCompare(leftActivity);
  }

  return left.concept.title?.localeCompare(right.concept.title ?? "") ?? 0;
}

export function getStarterTrackProgressSummary(
  snapshot: ProgressSnapshot,
  track: StarterTrackSummary,
  locale: AppLocale = "en",
): StarterTrackProgressSummary {
  const conceptProgress = track.concepts.map((concept) => getConceptProgressSummary(snapshot, concept));
  const completedCount = conceptProgress.filter((item) => item.status === "completed").length;
  const startedCount = conceptProgress.filter((item) => item.status !== "not-started").length;
  const allConceptsComplete = completedCount === conceptProgress.length;
  const unfinished = conceptProgress
    .map((item, index) => ({ item, concept: track.concepts[index] }))
    .filter((entry) => entry.item.isUnfinished)
    .sort((left, right) => sortByMostRecent(left.item, right.item));
  const nextConcept =
    track.concepts.find((_, index) => conceptProgress[index].status !== "completed") ?? null;
  const checkpointProgress = track.checkpoints.map((checkpoint) => {
    const completedAt =
      conceptProgress
        .find((item) => item.concept.slug === checkpoint.challenge.concept.slug)
        ?.record?.completedChallenges?.[checkpoint.challenge.challengeId] ?? null;
    const unlocked = conceptProgress
      .slice(0, checkpoint.stepIndex + 1)
      .every((item) => item.status === "completed");
    const status: StarterTrackCheckpointProgressStatus = completedAt
      ? "completed"
      : unlocked
        ? "ready"
        : "locked";

    return {
      checkpoint,
      status,
      completedAt,
      note: getTrackCheckpointNote(track, checkpoint, status, allConceptsComplete, locale),
      action: {
        href: buildTrackCheckpointHref(checkpoint, locale),
        label:
          status === "completed"
            ? copyText(locale, "Review checkpoint", "重溫檢查點")
            : copyText(locale, "Open checkpoint", "打開檢查點"),
      },
      isNextGuidedStep: false,
    } satisfies StarterTrackCheckpointProgress;
  });
  const nextCheckpointIndex = checkpointProgress.findIndex((item) => item.status === "ready");
  const normalizedCheckpointProgress = checkpointProgress.map((item, index) => ({
    ...item,
    isNextGuidedStep: index === nextCheckpointIndex,
  }));
  const completedCheckpointCount = normalizedCheckpointProgress.filter(
    (item) => item.status === "completed",
  ).length;
  const totalCheckpoints = normalizedCheckpointProgress.length;
  const nextCheckpoint =
    nextCheckpointIndex >= 0 ? normalizedCheckpointProgress[nextCheckpointIndex] : null;
  const status: StarterTrackProgressStatus =
    allConceptsComplete && completedCheckpointCount === totalCheckpoints
      ? "completed"
      : startedCount > 0 || completedCheckpointCount > 0
        ? "in-progress"
        : "not-started";

  return {
    track,
    status,
    conceptProgress,
    checkpointProgress: normalizedCheckpointProgress,
    completedCount,
    startedCount,
    totalConcepts: conceptProgress.length,
    completedCheckpointCount,
    totalCheckpoints,
    completedFlowCount: completedCount + completedCheckpointCount,
    totalFlowCount: conceptProgress.length + totalCheckpoints,
    allConceptsComplete,
    lastActivityAt: getLatestTrackActivity(conceptProgress, normalizedCheckpointProgress),
    nextConcept,
    nextCheckpoint,
    resumeConcept: unfinished[0]?.concept ?? nextConcept,
  };
}

function getTrackActionConcept(
  track: StarterTrackSummary,
  summary: StarterTrackProgressSummary,
) {
  return summary.status === "completed"
    ? track.concepts[0]
    : summary.nextConcept ?? track.concepts[0];
}

function getConceptLabel(concept: ConceptSummary, locale: AppLocale = "en") {
  return getConceptDisplayShortTitle(concept, locale);
}

function buildTrackCheckpointHref(
  checkpoint: StarterTrackCheckpointSummary,
  locale?: AppLocale,
) {
  return buildChallengeEntryHref(
    checkpoint.challenge.concept.slug,
    checkpoint.challenge.challengeId,
    locale,
  );
}

function joinLabels(labels: string[], locale: AppLocale = "en") {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return locale === "zh-HK"
      ? `${labels[0]} 與 ${labels[1]}`
      : `${labels[0]} and ${labels[1]}`;
  }

  return locale === "zh-HK"
    ? `${labels.slice(0, -1).join("、")}及${labels.at(-1)}`
    : `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function buildTrackCoverageSummary(track: StarterTrackSummary, locale: AppLocale = "en") {
  const labels = track.concepts.map((concept) => getConceptLabel(concept, locale));
  const conceptSummary =
    labels.length === 2
      ? copyText(
          locale,
          `You completed ${labels[0]} and ${labels[1]} in the authored order for this track.`,
          `你已按照這條路徑的作者編排順序完成 ${labels[0]} 與 ${labels[1]}。`,
        )
      : copyText(
          locale,
          `You completed ${joinLabels(labels, locale)} in the authored order for this track.`,
          `你已按照這條路徑的作者編排順序完成 ${joinLabels(labels, locale)}。`,
        );

  if (!track.checkpoints.length) {
    return conceptSummary;
  }

  return `${conceptSummary} ${copyText(
    locale,
    `You also cleared ${track.checkpoints.length} track checkpoint${track.checkpoints.length === 1 ? "" : "s"}.`,
    `你亦完成了 ${track.checkpoints.length} 個路徑檢查點。`,
  )}`;
}

function buildConceptHref(slug: string, hash?: string, locale?: AppLocale) {
  return localizeShareHref(buildRelativeShareUrl(`/concepts/${slug}`, { hash }), locale);
}

function getTrackCheckpointNote(
  track: StarterTrackSummary,
  checkpoint: StarterTrackCheckpointSummary,
  status: StarterTrackCheckpointProgressStatus,
  allConceptsComplete: boolean,
  locale: AppLocale = "en",
) {
  const conceptLabels = joinLabels(
    checkpoint.concepts.map((concept) => getConceptLabel(concept, locale)),
    locale,
  );

  if (status === "completed") {
    return copyText(
      locale,
      `${checkpoint.title} is already cleared on this browser. Reopen ${checkpoint.challenge.title} when you want a compact track reset.`,
      `${checkpoint.title} 已在這個瀏覽器中完成。想做一次精簡的路徑重整時，可重新打開 ${checkpoint.challenge.title}。`,
    );
  }

  if (status === "locked") {
    return copyText(
      locale,
      `Finish ${checkpoint.afterConcept.title} first. This checkpoint ties together ${conceptLabels} through ${checkpoint.challenge.title}.`,
      `請先完成 ${checkpoint.afterConcept.title}。這個檢查點會透過 ${checkpoint.challenge.title} 把 ${conceptLabels} 串連起來。`,
    );
  }

  if (allConceptsComplete) {
    return copyText(
      locale,
      `${checkpoint.title} is the remaining checkpoint that closes ${track.title}. ${checkpoint.summary}`,
      `${checkpoint.title} 是完成 ${track.title} 前最後剩下的檢查點。${checkpoint.summary}`,
    );
  }

  return copyText(
    locale,
    `${checkpoint.title} comes right after ${checkpoint.afterConcept.title}. ${checkpoint.summary}`,
    `${checkpoint.title} 緊接在 ${checkpoint.afterConcept.title} 之後。${checkpoint.summary}`,
  );
}

function getSuggestedNextTrack(
  snapshot: ProgressSnapshot,
  orderedNextTracks: StarterTrackSummary[],
) {
  const orderedCandidates = orderedNextTracks
    .map((track) => ({
      track,
      progress: getStarterTrackProgressSummary(snapshot, track),
    }))
    .filter((entry) => entry.progress.status !== "completed");

  return orderedCandidates[0] ?? null;
}

function buildSuggestedTrackNote(
  currentTrack: StarterTrackSummary,
  nextTrack: StarterTrackSummary,
  locale: AppLocale = "en",
) {
  const currentTrackTitle = getStarterTrackDisplayTitle(currentTrack, locale);
  const nextTrackTitle = getStarterTrackDisplayTitle(nextTrack, locale);

  if (nextTrack.prerequisiteTrackSlugs?.includes(currentTrack.slug)) {
    return copyText(
      locale,
      `${nextTrackTitle} is authored to build directly on ${currentTrackTitle}, so the track you just finished is already the intended setup for the next branch.`,
      `${nextTrackTitle} 的作者編排本來就直接承接 ${currentTrackTitle}，所以你剛完成的路徑已經是進入下一個分支的預備。`,
    );
  }

  const currentConcepts = new Set(currentTrack.concepts.map((concept) => concept.slug));
  const sharedConcepts = nextTrack.concepts.filter((concept) => currentConcepts.has(concept.slug));

  if (sharedConcepts.length) {
    return copyText(
      locale,
      `${nextTrackTitle} reuses ${joinLabels(sharedConcepts.map((concept) => getConceptDisplayTitle(concept, locale)), locale)} while extending the story into the next starter track.`,
      `${nextTrackTitle} 會延續 ${joinLabels(sharedConcepts.map((concept) => getConceptDisplayTitle(concept, locale)), locale)}，再把內容推進到下一條入門路徑。`,
    );
  }

  const currentTopics = new Set(currentTrack.concepts.map((concept) => concept.topic));
  const sharedTopics = nextTrack.concepts
    .map((concept) => concept.topic)
    .filter((topic, index, allTopics) => currentTopics.has(topic) && allTopics.indexOf(topic) === index)
    .map((topic) => getTopicDisplayTitleFromValue(topic, locale));

  if (sharedTopics.length) {
    return copyText(
      locale,
      `${nextTrackTitle} stays close to ${joinLabels(sharedTopics, locale)} while giving you the next bounded starter track in the catalog order.`,
      `${nextTrackTitle} 會延續 ${joinLabels(sharedTopics, locale)} 這些主題，同時帶你進入目錄排序中的下一條入門路徑。`,
    );
  }

  return copyText(
    locale,
    `${nextTrackTitle} is the next starter track in the current catalog order.`,
    `${nextTrackTitle} 是目前目錄排序中的下一條入門路徑。`,
  );
}

function buildChallengeHubTrackNote(track: StarterTrackSummary, locale: AppLocale = "en") {
  const trackTitle = getStarterTrackDisplayTitle(track, locale);

  return copyText(
    locale,
    `Open challenges already group the challenge-ready prompts from ${trackTitle} under one guided-path filter, so you can keep testing the same branch without reopening each concept by hand.`,
    `公開挑戰已把 ${trackTitle} 中準備好可嘗試的題目集中在同一個引導路徑篩選器下，讓你不用逐一重開概念頁也能持續練習這條分支。`,
  );
}

function getRecapFocusLabel(
  focusKind: StarterTrackRecapFocusKind,
  resurfacingCue: ConceptResurfacingCue | null,
  locale: AppLocale = "en",
) {
  if (focusKind === "priority") {
    switch (resurfacingCue?.reasonKind) {
      case "missed-checks":
        return copyText(locale, "Retry checks", "重做檢查");
      case "confidence":
        return copyText(locale, "Needs confidence", "需要更有把握");
      case "unfinished":
        return copyText(locale, "Return to finish", "回來完成");
      default:
        return copyText(locale, "Refresh", "重溫");
    }
  }

  if (focusKind === "next") {
    return copyText(locale, "Next guided step", "下一個引導步驟");
  }

  if (focusKind === "active") {
    return copyText(locale, "Active progress", "目前進度");
  }

  if (focusKind === "solid") {
    return copyText(locale, "Solid", "穩固");
  }

  return copyText(locale, "Ahead", "稍後再學");
}

function getRecapAction(
  concept: ConceptSummary,
  progress: ConceptProgressSummary,
  resurfacingCue: ConceptResurfacingCue | null,
  isNextGuidedStep: boolean,
  trackStatus: StarterTrackProgressStatus,
  locale: AppLocale = "en",
): StarterTrackRecapAction {
  const completedChallengeCount = getCompletedChallengeCount(progress.record);
  const lastIncorrectCount = progress.record?.quickTestLastIncorrectCount ?? 0;
  const hasUnsatisfiedChallenge =
    Boolean(progress.record?.usedChallengeModeAt) && completedChallengeCount === 0;
  const hasWorkedExampleOnly =
    Boolean(progress.record?.engagedWorkedExampleAt) &&
    !progress.record?.completedQuickTestAt &&
    completedChallengeCount === 0;

  if (resurfacingCue?.actionLabel === "Retry challenge" || hasUnsatisfiedChallenge) {
    return {
      href: buildConceptHref(concept.slug, conceptShareAnchorIds.challengeMode, locale),
      label: resurfacingCue?.actionLabel ?? copyText(locale, "Retry challenge", "重試挑戰"),
      kind: "challenge",
    };
  }

  if (resurfacingCue?.reasonKind === "missed-checks" || lastIncorrectCount > 0) {
    return {
      href: buildConceptHref(concept.slug, conceptShareAnchorIds.quickTest, locale),
      label: resurfacingCue?.actionLabel ?? copyText(locale, "Retry quick test", "重做快速測試"),
      kind: "quick-test",
    };
  }

  if (hasWorkedExampleOnly) {
    return {
      href: buildConceptHref(concept.slug, conceptShareAnchorIds.workedExamples, locale),
      label: copyText(locale, "Replay worked example", "重看示範例題"),
      kind: "worked-examples",
    };
  }

  if (trackStatus !== "completed" && isNextGuidedStep) {
    return {
      href: buildConceptHref(concept.slug, undefined, locale),
      label:
        progress.status === "not-started"
          ? copyText(locale, "Open next step", "打開下一步")
          : copyText(locale, "Continue concept", "繼續概念"),
      kind: "concept",
    };
  }

  if (progress.status === "completed" && progress.mastery.state === "solid") {
    return {
      href: buildConceptHref(concept.slug, undefined, locale),
      label: copyText(locale, "Skim concept", "快速重溫概念"),
      kind: "concept",
    };
  }

  if (progress.status === "completed") {
    return {
      href: buildConceptHref(concept.slug, undefined, locale),
      label: copyText(locale, "Review concept", "重溫概念"),
      kind: "concept",
    };
  }

  if (progress.status === "not-started") {
    return {
      href: buildConceptHref(concept.slug, undefined, locale),
      label: copyText(locale, "Preview concept", "預覽概念"),
      kind: "concept",
    };
  }

  return {
    href: buildConceptHref(concept.slug, undefined, locale),
    label: copyText(locale, "Open concept", "打開概念"),
    kind: "concept",
  };
}

function getRecapNote(
  progress: ConceptProgressSummary,
  resurfacingCue: ConceptResurfacingCue | null,
  isNextGuidedStep: boolean,
  trackStatus: StarterTrackProgressStatus,
  locale: AppLocale = "en",
) {
  if (resurfacingCue) {
    if (resurfacingCue.reasonKind === "confidence") {
      return resurfacingCue.reason;
    }

    return `${resurfacingCue.reason} ${progress.mastery.note}`;
  }

  if (trackStatus !== "completed" && isNextGuidedStep) {
    return copyText(
      locale,
      `${progress.concept.title} is still the next guided step in this authored order. ${progress.mastery.note}`,
      `${progress.concept.title} 仍然是這個作者編排順序中的下一個引導步驟。${progress.mastery.note}`,
    );
  }

  if (progress.status === "completed" && progress.mastery.state === "solid") {
    return copyText(
      locale,
      "Stronger checks are already saved here, so this step is ready for a quick skim instead of a full replay.",
      "這裡已經保存了較強的檢查結果，所以這一步適合快速重溫，不必整段重做。",
    );
  }

  if (progress.status !== "not-started") {
    return copyText(
      locale,
      `Local progress is already saved here. ${progress.mastery.note}`,
      `這裡已經保存了本機進度。${progress.mastery.note}`,
    );
  }

  return copyText(
    locale,
    "This concept stays in the recap because it completes the authored track story, even if you have not reached it on this browser yet.",
    "這個概念仍保留在重溫清單中，因為它完成了作者編排的整條路徑，即使你在這個瀏覽器中還未走到這一步。",
  );
}

export function getStarterTrackRecapSummary(
  track: StarterTrackSummary,
  progress: StarterTrackProgressSummary,
  locale: AppLocale = "en",
): StarterTrackRecapSummary {
  const steps = track.concepts.map((concept, index) => {
    const conceptProgress = progress.conceptProgress[index];
    const resurfacingCue = getConceptResurfacingCue(conceptProgress);
    const isNextGuidedStep =
      progress.status !== "completed" && concept.slug === progress.nextConcept?.slug;
    const focusKind: StarterTrackRecapFocusKind = resurfacingCue
      ? "priority"
      : isNextGuidedStep
        ? "next"
        : conceptProgress.status === "completed" && conceptProgress.mastery.state === "solid"
          ? "solid"
          : conceptProgress.status === "not-started"
            ? "ahead"
            : "active";

    return {
      concept,
      progress: conceptProgress,
      focusKind,
      focusLabel: getRecapFocusLabel(focusKind, resurfacingCue, locale),
      note: getRecapNote(
        conceptProgress,
        resurfacingCue,
        isNextGuidedStep,
        progress.status,
        locale,
      ),
      supportReasons:
        resurfacingCue?.supportReasons.length
          ? resurfacingCue.supportReasons
          : conceptProgress.mastery.evidence,
      action: getRecapAction(
        concept,
        conceptProgress,
        resurfacingCue,
        isNextGuidedStep,
        progress.status,
        locale,
      ),
      resurfacingCue,
      isNextGuidedStep,
    } satisfies StarterTrackRecapStep;
  });

  return {
    track,
    progress,
    steps,
    primaryStep:
      steps.find((step) => step.focusKind === "priority") ??
      steps.find((step) => step.focusKind === "next") ??
      steps.find((step) => step.focusKind === "active") ??
      steps[0] ??
      null,
    intro:
      progress.status === "completed"
        ? copyText(
            locale,
            "Use this recap to revisit the important ideas in sequence without reopening the whole track from scratch.",
            "使用這份重溫摘要，按順序回看重要觀念，而不用從頭重開整條路徑。",
          )
        : progress.nextCheckpoint
          ? copyText(
              locale,
              "Use this recap to refresh the key ideas quickly, then clear the next track checkpoint.",
              "先用這份重溫快速回顧關鍵觀念，然後完成下一個路徑檢查點。",
            )
        : progress.status === "in-progress"
          ? copyText(
              locale,
              "Use this recap to refresh the key steps quickly, then drop back into the next guided concept.",
              "先用這份重溫快速回顧關鍵步驟，然後再回到下一個引導概念。",
            )
          : copyText(
              locale,
              "Recap mode stays available, but it becomes useful after you save some local progress in the track.",
              "重溫模式一直可用，但當你在這條路徑內先保存一些本機進度後，它才會更有用。",
            ),
    priorityCount: steps.filter((step) => step.focusKind === "priority").length,
    solidCount: steps.filter((step) => step.focusKind === "solid").length,
    activeCount: steps.filter(
      (step) => step.focusKind === "next" || step.focusKind === "active",
    ).length,
    aheadCount: steps.filter((step) => step.focusKind === "ahead").length,
  };
}

export function getStarterTrackCompletionSummary(
  snapshot: ProgressSnapshot,
  track: StarterTrackSummary,
  completionContext: StarterTrackCompletionContentContext,
  locale: AppLocale = "en",
): StarterTrackCompletionSummary {
  const progress = getStarterTrackProgressSummary(snapshot, track, locale);
  const recap = getStarterTrackRecapSummary(track, progress, locale);
  const completedConcepts = track.concepts
    .map((concept, index) => ({
      concept,
      progress: progress.conceptProgress[index],
      lastActivityAt: progress.conceptProgress[index]?.lastActivityAt ?? null,
    }))
    .filter((entry) => entry.progress.status === "completed");
  const relatedTopicCandidate = completionContext.relatedTopic;
  const suggestedNextTrack = getSuggestedNextTrack(
    snapshot,
    completionContext.orderedNextTracks,
  );
  const guidance: StarterTrackCompletionGuidance[] = [];
  const displayTrackTitle = getStarterTrackDisplayTitle(track, locale);
  const displayRelatedTopicTitle = relatedTopicCandidate
    ? getTopicDisplayTitle(relatedTopicCandidate, locale)
    : null;
  const displaySuggestedNextTrackTitle = suggestedNextTrack
    ? getStarterTrackDisplayTitle(suggestedNextTrack.track, locale)
    : null;

  if (recap.primaryStep) {
    guidance.push({
      kind: "review",
      eyebrow: copyText(locale, "Useful review concept", "適合回看的概念"),
      title: getConceptDisplayTitle(recap.primaryStep.concept, locale),
      note: recap.primaryStep.note,
      href: recap.primaryStep.action.href,
      actionLabel: recap.primaryStep.action.label,
    });
  }

  if (!suggestedNextTrack) {
    guidance.push({
      kind: "challenge",
      eyebrow: copyText(locale, "Keep practicing", "繼續練習"),
      title: `${displayTrackTitle} challenges`,
      note: buildChallengeHubTrackNote(track, locale),
      href: buildRelativeShareUrl("/challenges", {
        query: {
          track: track.slug,
        },
      }),
      actionLabel: copyText(
        locale,
        `Open ${displayTrackTitle} challenges`,
        `打開 ${displayTrackTitle} 挑戰`,
      ),
    });
  }

  if (relatedTopicCandidate && displayRelatedTopicTitle) {
    guidance.push({
      kind: "topic",
      eyebrow: copyText(locale, "Related topic page", "相關主題頁"),
      title: displayRelatedTopicTitle,
      note:
        relatedTopicCandidate.sharedConceptCount === 1
          ? copyText(
              locale,
              "This topic page keeps the broader idea around the 1 concept from this track.",
              "這個主題頁會把這條路徑中的 1 個概念放回更完整的脈絡中。",
            )
          : copyText(
              locale,
              `This topic page keeps the broader idea around the ${relatedTopicCandidate.sharedConceptCount} concepts from this track.`,
              `這個主題頁會把這條路徑中的 ${relatedTopicCandidate.sharedConceptCount} 個概念放回更完整的脈絡中。`,
            ),
      href: relatedTopicCandidate.path,
      actionLabel: copyText(
        locale,
        `Open ${displayRelatedTopicTitle}`,
        `打開 ${displayRelatedTopicTitle}`,
      ),
    });
  }

  if (suggestedNextTrack && displaySuggestedNextTrackTitle) {
    guidance.push({
      kind: "track",
      eyebrow: copyText(locale, "Suggested next track", "建議下一條路徑"),
      title: displaySuggestedNextTrackTitle,
      note: buildSuggestedTrackNote(track, suggestedNextTrack.track, locale),
      href: localizeShareHref(`/tracks/${suggestedNextTrack.track.slug}`, locale),
      actionLabel:
        suggestedNextTrack.progress.status === "in-progress"
          ? copyText(
              locale,
              `Continue ${displaySuggestedNextTrackTitle}`,
              `繼續 ${displaySuggestedNextTrackTitle}`,
            )
          : copyText(
              locale,
              `Start ${displaySuggestedNextTrackTitle}`,
              `開始 ${displaySuggestedNextTrackTitle}`,
            ),
    });
  }

  return {
    track,
    progress,
    recap,
    completedConcepts,
    completionDate: progress.status === "completed" ? progress.lastActivityAt : null,
    completedCheckpointCount: progress.completedCheckpointCount,
    totalCheckpoints: progress.totalCheckpoints,
    quickTestCompletedCount: completedConcepts.filter(
      (entry) => Boolean(entry.progress.record?.completedQuickTestAt),
    ).length,
    completedChallengeCount: completedConcepts.reduce(
      (sum, entry) => sum + getCompletedChallengeCount(entry.progress.record),
      0,
    ),
    strongCheckConceptCount: completedConcepts.filter(
      (entry) =>
        entry.progress.mastery.state === "shaky" || entry.progress.mastery.state === "solid",
    ).length,
    coverageSummary: buildTrackCoverageSummary(track, locale),
    guidance,
    relatedTopic: relatedTopicCandidate ?? null,
    relatedTopicSharedConceptCount: relatedTopicCandidate?.sharedConceptCount ?? 0,
    suggestedNextTrack: suggestedNextTrack?.track ?? null,
  };
}

export function getStarterTrackPrimaryAction(
  track: StarterTrackSummary,
  summary: StarterTrackProgressSummary,
  locale: AppLocale = "en",
): StarterTrackPrimaryAction {
  const targetConcept = getTrackActionConcept(track, summary);
  const targetConceptHref = localizeShareHref(`/concepts/${targetConcept.slug}`, locale);
  const targetConceptLabel = getConceptLabel(targetConcept, locale);
  const targetConceptTitle = getConceptDisplayTitle(targetConcept, locale);
  const resumeConceptTitle = summary.resumeConcept
    ? getConceptDisplayTitle(summary.resumeConcept, locale)
    : null;
  const hasOutOfOrderProgress =
    summary.resumeConcept &&
    summary.nextConcept &&
    summary.resumeConcept.slug !== summary.nextConcept.slug;

  if (summary.status === "completed") {
    return {
      href: targetConceptHref,
      label: copyText(
        locale,
        `Review from ${targetConceptLabel}`,
        `從 ${targetConceptLabel} 開始重溫`,
      ),
      note: track.checkpoints.length
        ? copyText(
            locale,
            "You have completed every concept and cleared every checkpoint in this track on this browser.",
            "你已在這個瀏覽器中完成這條路徑的所有概念和所有檢查點。",
          )
        : copyText(
            locale,
            "You have completed every concept in this track on this browser.",
            "你已在這個瀏覽器中完成這條路徑的所有概念。",
          ),
      targetConcept,
      targetCheckpoint: null,
      kind: "review",
    };
  }

  if (summary.nextCheckpoint) {
    return {
      href: summary.nextCheckpoint.action.href,
      label: summary.nextCheckpoint.action.label,
      note: summary.nextCheckpoint.note,
      targetConcept: summary.nextCheckpoint.checkpoint.challenge.concept,
      targetCheckpoint: summary.nextCheckpoint.checkpoint,
      kind: "checkpoint",
    };
  }

  if (summary.status === "in-progress") {
    return {
      href: targetConceptHref,
      label: copyText(
        locale,
        `Continue with ${targetConceptLabel}`,
        `繼續 ${targetConceptLabel}`,
      ),
      note: hasOutOfOrderProgress
        ? copyText(
            locale,
            `${resumeConceptTitle} already has progress, but ${targetConceptTitle} is still the next guided step.`,
            `${resumeConceptTitle} 已經有進度，但 ${targetConceptTitle} 仍然是下一個引導步驟。`,
          )
        : copyText(
            locale,
            `${targetConceptTitle} is the next concept in the current track order.`,
            `${targetConceptTitle} 是目前路徑順序中的下一個概念。`,
          ),
      targetConcept,
      targetCheckpoint: null,
      kind: "continue",
    };
  }

  return {
    href: targetConceptHref,
    label: copyText(
      locale,
      `Start with ${targetConceptLabel}`,
      `從 ${targetConceptLabel} 開始`,
    ),
    note: copyText(
      locale,
      `${targetConceptTitle} opens this track and sets up the rest of the path.`,
      `${targetConceptTitle} 會打開這條路徑，並為後面的內容做好鋪墊。`,
    ),
    targetConcept,
    targetCheckpoint: null,
    kind: "start",
  };
}

export function getStarterTrackMembershipAction(
  membership: StarterTrackConceptMembership,
  summary: StarterTrackProgressSummary,
  locale: AppLocale = "en",
) {
  const currentConceptTitle = getConceptDisplayTitle(membership.currentConcept, locale);
  const nextConceptTitle = membership.nextConcept
    ? getConceptDisplayTitle(membership.nextConcept, locale)
    : null;
  const firstTrackConceptHref = localizeShareHref(
    `/concepts/${membership.track.concepts[0].slug}`,
    locale,
  );
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
      href: firstTrackConceptHref,
      label: copyText(locale, "Start from track beginning", "從路徑開頭開始"),
      note: copyText(
        locale,
        `Earlier steps still set up ${currentConceptTitle}.`,
        `較前面的步驟仍然在為 ${currentConceptTitle} 做準備。`,
      ),
    };
  }

  if (currentStep?.status === "completed" && checkpointAfterCurrent) {
    return {
      href: checkpointAfterCurrent.action.href,
      label: checkpointAfterCurrent.action.label,
      note: checkpointAfterCurrent.note,
    };
  }

  if (membership.nextConcept) {
    return {
      href: localizeShareHref(`/concepts/${membership.nextConcept.slug}`, locale),
      label:
        currentStep?.status === "completed"
          ? copyText(locale, "Open next concept", "打開下一個概念")
          : copyText(locale, "See next concept", "查看下一個概念"),
      note:
        currentStep?.status === "completed"
          ? copyText(
              locale,
              `Up next: ${nextConceptTitle}.`,
              `下一步：${nextConceptTitle}。`,
            )
          : copyText(
              locale,
              `Next after this: ${nextConceptTitle}.`,
              `完成這一步後就是：${nextConceptTitle}。`,
            ),
    };
  }

  return {
    href:
      summary.status === "completed"
        ? buildTrackCompletionHref(membership.track.slug, locale)
        : firstTrackConceptHref,
    label:
      summary.status === "completed"
        ? copyText(locale, "Track completion page", "路徑完成頁")
        : copyText(locale, "Review track start", "重溫路徑起點"),
    note:
      summary.status === "completed"
        ? copyText(
            locale,
            "You have completed the full track journey on this browser. Use the completion page for a compact reflection and next-step guidance.",
            "你已在這個瀏覽器中完成整條路徑。可使用完成頁查看精簡回顧與下一步建議。",
          )
        : copyText(
            locale,
            "This is the last concept in the current track order.",
            "這是目前路徑順序中的最後一個概念。",
          ),
  };
}
