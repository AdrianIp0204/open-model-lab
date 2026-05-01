import type {
  GuidedCollectionSummary,
  RecommendedGoalPathSummary,
  ResolvedLearningPathEntryDiagnosticChallengeProbe,
  ResolvedLearningPathEntryDiagnosticProbe,
  ResolvedLearningPathEntryDiagnosticQuickTestProbe,
  StarterTrackSummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  buildConceptLabHref,
  buildTrackRecapHref,
  localizeShareHref,
} from "@/lib/share-links";
import {
  getChallengeProgressState,
  getConceptProgressRecord,
  getConceptProgressSummary,
  type ProgressSnapshot,
} from "./model";
import { buildPrerequisiteTrackRecommendations } from "./track-recommendations";
import { getGuidedCollectionProgressSummary } from "./guided-collections";
import {
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  getStarterTrackRecapSummary,
} from "./tracks";

export type LearningPathEntryDiagnosticRecommendationKind =
  | "start-at-beginning"
  | "skip-ahead"
  | "review-prerequisite"
  | "take-recap";

export type LearningPathEntryDiagnosticAction = {
  href: string;
  label: string;
};

export type LearningPathEntryDiagnosticProbeStatus =
  | "ready"
  | "review"
  | "in-progress"
  | "not-started";

type LearningPathEntryDiagnosticProbeBase = {
  status: LearningPathEntryDiagnosticProbeStatus;
  statusLabel: string;
  note: string;
  primaryAction: LearningPathEntryDiagnosticAction;
};

export type LearningPathEntryDiagnosticQuickTestProbeProgress =
  ResolvedLearningPathEntryDiagnosticQuickTestProbe &
    LearningPathEntryDiagnosticProbeBase;

export type LearningPathEntryDiagnosticChallengeProbeProgress =
  ResolvedLearningPathEntryDiagnosticChallengeProbe &
    LearningPathEntryDiagnosticProbeBase;

export type LearningPathEntryDiagnosticProbeProgress =
  | LearningPathEntryDiagnosticQuickTestProbeProgress
  | LearningPathEntryDiagnosticChallengeProbeProgress;

export type LearningPathEntryDiagnosticSummary = {
  title: string;
  summary: string;
  recommendationKind: LearningPathEntryDiagnosticRecommendationKind;
  recommendationLabel: string;
  note: string;
  primaryAction: LearningPathEntryDiagnosticAction;
  secondaryAction: LearningPathEntryDiagnosticAction | null;
  probes: LearningPathEntryDiagnosticProbeProgress[];
  readyProbeCount: number;
  reviewProbeCount: number;
  inProgressProbeCount: number;
};

export type RecommendedGoalPathEntryDiagnosticTeaser = {
  sourceKind: "starter-track" | "guided-collection";
  sourceTitle: string;
  sourceHref: string;
  diagnostic: LearningPathEntryDiagnosticSummary;
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function getProbeStatusLabel(
  status: LearningPathEntryDiagnosticProbeStatus,
  locale: AppLocale,
) {
  switch (status) {
    case "ready":
      return copyText(locale, "Ready", "已就緒");
    case "review":
      return copyText(locale, "Needs review", "需要重溫");
    case "in-progress":
      return copyText(locale, "In progress", "進行中");
    default:
      return copyText(locale, "Not started", "未開始");
  }
}

function getConceptActionLabel(
  concept: Pick<StarterTrackSummary["concepts"][number], "title">,
) {
  return concept.title;
}

function buildQuickTestProbeProgress(
  snapshot: ProgressSnapshot,
  probe: ResolvedLearningPathEntryDiagnosticQuickTestProbe,
  locale: AppLocale,
): LearningPathEntryDiagnosticQuickTestProbeProgress {
  const conceptProgress = getConceptProgressSummary(snapshot, probe.concept);
  const lastIncorrectCount = conceptProgress.record?.quickTestLastIncorrectCount ?? 0;
  const hasFinishedQuickTest = Boolean(conceptProgress.record?.completedQuickTestAt);
  const status: LearningPathEntryDiagnosticProbeStatus = hasFinishedQuickTest
    ? lastIncorrectCount === 0 || conceptProgress.mastery.state === "solid"
      ? "ready"
      : "review"
    : conceptProgress.status === "not-started"
      ? "not-started"
      : "in-progress";
  const note =
    status === "ready"
      ? hasFinishedQuickTest
        ? lastIncorrectCount === 0
          ? copyText(locale, "Latest saved quick-test run finished cleanly.", "最近一次已保存的快速測驗已順利完成。")
          : copyText(locale, "A later stronger check already firms up this concept.", "後續較強的檢查結果已經鞏固了這個概念。")
        : copyText(locale, "A stronger saved check already covers this concept.", "已保存的較強檢查結果已經覆蓋這個概念。")
      : status === "review"
        ? copyText(
            locale,
            `Latest saved quick-test run still missed ${lastIncorrectCount} question${
              lastIncorrectCount === 1 ? "" : "s"
            }.`,
            `最近一次已保存的快速測驗仍然答錯 ${lastIncorrectCount} 題。`,
          )
        : status === "in-progress"
          ? copyText(locale, "Concept progress exists here, but the quick test is not cleanly finished yet.", "這裡已經有概念進度，但快速測驗仍未完整完成。")
          : copyText(locale, "No saved quick-test result yet.", "尚未保存任何快速測驗結果。");

  return {
    ...probe,
    status,
    statusLabel: getProbeStatusLabel(status, locale),
    note,
    primaryAction: {
      href: localizeShareHref(probe.href, locale),
      label:
        status === "ready"
          ? copyText(locale, `Review ${probe.title}`, `重溫 ${probe.title}`)
          : status === "review"
            ? copyText(locale, `Retry ${probe.title}`, `重新作答 ${probe.title}`)
            : copyText(locale, `Open ${probe.title}`, `打開 ${probe.title}`),
    },
  };
}

function buildChallengeProbeProgress(
  snapshot: ProgressSnapshot,
  probe: ResolvedLearningPathEntryDiagnosticChallengeProbe,
  locale: AppLocale,
): LearningPathEntryDiagnosticChallengeProbeProgress {
  const conceptProgress = getConceptProgressSummary(snapshot, probe.concept);
  const challengeState = getChallengeProgressState(
    getConceptProgressRecord(snapshot, probe.concept),
    probe.challengeId,
  );
  const status: LearningPathEntryDiagnosticProbeStatus =
    challengeState === "solved"
      ? "ready"
      : challengeState === "started"
        ? "in-progress"
        : conceptProgress.status === "not-started"
          ? "not-started"
          : "review";
  const note =
    status === "ready"
      ? copyText(locale, "This checkpoint challenge is already solved.", "這個檢查點挑戰已經解開。")
      : status === "in-progress"
        ? copyText(locale, "Challenge mode has already been opened for this checkpoint.", "這個檢查點的挑戰模式已經打開過。")
        : status === "review"
          ? copyText(locale, "Concept progress exists here, but this checkpoint is still unsolved.", "這裡已經有概念進度，但這個檢查點仍未解開。")
          : copyText(locale, "No saved checkpoint attempt yet.", "尚未保存任何檢查點嘗試。");

  return {
    ...probe,
    status,
    statusLabel: getProbeStatusLabel(status, locale),
    note,
    primaryAction: {
      href: localizeShareHref(probe.href, locale),
      label:
        status === "ready"
          ? copyText(locale, `Review ${probe.title}`, `重溫 ${probe.title}`)
          : status === "in-progress"
            ? copyText(locale, `Resume ${probe.title}`, `繼續 ${probe.title}`)
            : copyText(locale, `Open ${probe.title}`, `打開 ${probe.title}`),
    },
  };
}

function buildProbeProgress(
  snapshot: ProgressSnapshot,
  probe: ResolvedLearningPathEntryDiagnosticProbe,
  locale: AppLocale,
): LearningPathEntryDiagnosticProbeProgress {
  if (probe.kind === "quick-test") {
    return buildQuickTestProbeProgress(snapshot, probe, locale);
  }

  return buildChallengeProbeProgress(snapshot, probe, locale);
}

function buildTrackStartAction(track: StarterTrackSummary, locale: AppLocale): LearningPathEntryDiagnosticAction {
  const firstConcept = track.concepts[0];

  return {
    href: buildConceptLabHref(firstConcept.slug, { locale }),
    label: copyText(locale, `Begin with ${getConceptActionLabel(firstConcept)}`, `從 ${getConceptActionLabel(firstConcept)} 開始`),
  };
}

function buildTrackRestartAction(track: StarterTrackSummary, locale: AppLocale): LearningPathEntryDiagnosticAction {
  const firstConcept = track.concepts[0];

  return {
    href: buildConceptLabHref(firstConcept.slug, { locale }),
    label: copyText(locale, `Restart from ${getConceptActionLabel(firstConcept)}`, `從 ${getConceptActionLabel(firstConcept)} 重新開始`),
  };
}

function buildTrackProgressAction(
  trackAction: ReturnType<typeof getStarterTrackPrimaryAction>,
  locale: AppLocale,
): LearningPathEntryDiagnosticAction {
  if (trackAction.kind === "checkpoint" && trackAction.targetCheckpoint) {
    return {
      href: localizeShareHref(trackAction.href, locale),
      label: copyText(locale, `Open ${trackAction.targetCheckpoint.title}`, `打開 ${trackAction.targetCheckpoint.title}`),
    };
  }

  if (trackAction.kind === "review" && trackAction.targetConcept) {
    return {
      href: localizeShareHref(trackAction.href, locale),
      label: copyText(locale, `Review from ${trackAction.targetConcept.title}`, `從 ${trackAction.targetConcept.title} 開始重溫`),
    };
  }

  if (trackAction.targetConcept) {
    return {
      href: localizeShareHref(trackAction.href, locale),
      label:
        trackAction.kind === "continue"
          ? copyText(locale, `Resume at ${trackAction.targetConcept.title}`, `從 ${trackAction.targetConcept.title} 繼續`)
          : copyText(locale, `Open ${trackAction.targetConcept.title}`, `打開 ${trackAction.targetConcept.title}`),
    };
  }

  return {
    href: localizeShareHref(trackAction.href, locale),
    label: trackAction.label,
  };
}

function buildTrackRecommendationLabel(
  kind: LearningPathEntryDiagnosticRecommendationKind,
  locale: AppLocale,
) {
  switch (kind) {
    case "review-prerequisite":
      return copyText(locale, "Review prerequisite first", "先重溫前置路徑");
    case "take-recap":
      return copyText(locale, "Use recap mode", "使用重溫模式");
    case "skip-ahead":
      return copyText(locale, "Skip ahead", "直接前往後段");
    default:
      return copyText(locale, "Start from beginning", "從開頭開始");
  }
}

function buildTrackStartNote(
  probes: LearningPathEntryDiagnosticProbeProgress[],
  locale: AppLocale,
) {
  const reviewCount = probes.filter((probe) => probe.status === "review").length;
  const inProgressCount = probes.filter((probe) => probe.status === "in-progress").length;

  if (reviewCount > 0) {
    return copyText(
      locale,
      `${reviewCount} diagnostic check${reviewCount === 1 ? "" : "s"} still need review, so the opening concept is the clearest honest start.`,
      `仍有 ${reviewCount} 個入口診斷檢查需要重溫，所以從起始概念開始是最清楚、最誠實的做法。`,
    );
  }

  if (inProgressCount > 0) {
    return copyText(locale, "A few diagnostic checks already have activity, but the opening concept still sets the cleanest baseline for the track.", "有些入口診斷檢查已經開始，但起始概念仍然是這條路徑最清楚的基線。");
  }

  return copyText(locale, "No saved diagnostic checks are available yet, so the opening concept is still the best place to start.", "目前還沒有任何已保存的入口診斷檢查，因此起始概念仍然是最好的開始位置。");
}

export function buildStarterTrackEntryDiagnostic(
  snapshot: ProgressSnapshot,
  track: StarterTrackSummary,
  prerequisiteTracks: StarterTrackSummary[] = [],
  locale: AppLocale = "en",
): LearningPathEntryDiagnosticSummary | null {
  if (!track.entryDiagnostic) {
    return null;
  }

  const probes = track.entryDiagnostic.probes.map((probe) =>
    buildProbeProgress(snapshot, probe, locale),
  );
  const readyProbeCount = probes.filter((probe) => probe.status === "ready").length;
  const reviewProbeCount = probes.filter((probe) => probe.status === "review").length;
  const inProgressProbeCount = probes.filter((probe) => probe.status === "in-progress").length;
  const trackProgress = getStarterTrackProgressSummary(snapshot, track, locale);
  const recap = getStarterTrackRecapSummary(track, trackProgress, locale);
  const primaryTrackAction = getStarterTrackPrimaryAction(track, trackProgress, locale);
  const prerequisiteRecommendations = buildPrerequisiteTrackRecommendations(
    snapshot,
    track,
    prerequisiteTracks,
    locale,
  ).filter((recommendation) => recommendation.progress.status !== "completed");
  const allProbesReady = readyProbeCount === probes.length;
  let recommendationKind: LearningPathEntryDiagnosticRecommendationKind = "start-at-beginning";
  let note = buildTrackStartNote(probes, locale);
  let primaryAction = buildTrackStartAction(track, locale);
  let secondaryAction: LearningPathEntryDiagnosticAction | null = null;

  if (trackProgress.status === "not-started" && prerequisiteRecommendations.length) {
    const recommendation = prerequisiteRecommendations[0];

    recommendationKind = "review-prerequisite";
    note = copyText(
      locale,
      `${recommendation.note} Nothing is hard-gated here; this is simply the clearest setup before the track opens.`,
      `${recommendation.note} 這裡沒有硬性鎖定；這只是進入這條路徑前最清楚的準備方式。`,
    );
    primaryAction = {
      href: recommendation.href,
      label: recommendation.progress.status === "in-progress"
        ? copyText(locale, `Continue ${recommendation.track.title} prerequisite track`, `繼續 ${recommendation.track.title} 前置路徑`)
        : copyText(locale, `Start ${recommendation.track.title} prerequisite track`, `開始 ${recommendation.track.title} 前置路徑`),
    };
    secondaryAction = buildTrackStartAction(track, locale);
  } else if (
    trackProgress.status !== "not-started" &&
    (trackProgress.status === "completed" || recap.priorityCount > 0)
  ) {
    recommendationKind = "take-recap";
    note =
      trackProgress.status === "completed"
        ? copyText(locale, "Saved progress already covers this track. Recap mode reuses the same quick-test misses, challenge solves, and last-activity cues for a faster return pass.", "已保存的進度已經覆蓋這條路徑。重溫模式會重用同一套快速測驗失分、挑戰完成和最近活動提示，讓你更快回來複習。")
        : `${recap.intro} ${recap.primaryStep?.note ?? ""}`.trim();
    primaryAction = {
      href: buildTrackRecapHref(track.slug, locale),
      label: copyText(locale, "Use recap mode", "使用重溫模式"),
    };
    secondaryAction =
      primaryTrackAction.href === primaryAction.href
        ? null
        : buildTrackProgressAction(primaryTrackAction, locale);
  } else if (allProbesReady && track.entryDiagnostic.skipToConcept) {
    recommendationKind = "skip-ahead";
    note = copyText(
      locale,
      `All ${probes.length} diagnostic check${probes.length === 1 ? "" : "s"} are already ready, so you can jump straight to ${track.entryDiagnostic.skipToConcept.title}.`,
      `${probes.length} 個入口診斷檢查都已準備好，所以你可以直接跳到 ${track.entryDiagnostic.skipToConcept.title}。`,
    );
    primaryAction = {
      href: buildConceptLabHref(track.entryDiagnostic.skipToConcept.slug, { locale }),
      label: copyText(locale, `Skip to ${getConceptActionLabel(track.entryDiagnostic.skipToConcept)}`, `跳到 ${getConceptActionLabel(track.entryDiagnostic.skipToConcept)}`),
    };
    secondaryAction = buildTrackStartAction(track, locale);
  } else if (trackProgress.status !== "not-started") {
    recommendationKind = "skip-ahead";
    note = copyText(
      locale,
      `Saved progress already places you past the opening diagnostic segment. ${primaryTrackAction.note}`,
      `已保存的進度顯示你已經越過起始診斷區段。${primaryTrackAction.note}`,
    );
    primaryAction = buildTrackProgressAction(primaryTrackAction, locale);
    secondaryAction = buildTrackRestartAction(track, locale);
  }

  return {
    title: track.entryDiagnostic.title,
    summary: track.entryDiagnostic.summary,
    recommendationKind,
    recommendationLabel: buildTrackRecommendationLabel(recommendationKind, locale),
    note,
    primaryAction,
    secondaryAction,
    probes,
    readyProbeCount,
    reviewProbeCount,
    inProgressProbeCount,
  };
}

function getCollectionRecapStep(collection: GuidedCollectionSummary) {
  return (
    collection.steps.find(
      (step) =>
        step.kind === "surface" &&
        step.surfaceKind === "reference" &&
        step.href.includes("mode=recap"),
    ) ?? null
  );
}

function buildCollectionStartAction(
  collection: GuidedCollectionSummary,
  locale: AppLocale,
) {
  const firstStep = collection.steps[0];

  return {
    href: localizeShareHref(firstStep.href, locale),
    label: copyText(locale, `Begin with ${firstStep.title}`, `從 ${firstStep.title} 開始`),
  } satisfies LearningPathEntryDiagnosticAction;
}

function buildCollectionRestartAction(
  collection: GuidedCollectionSummary,
  locale: AppLocale,
) {
  const firstStep = collection.steps[0];

  return {
    href: localizeShareHref(firstStep.href, locale),
    label: copyText(locale, `Restart from ${firstStep.title}`, `從 ${firstStep.title} 重新開始`),
  } satisfies LearningPathEntryDiagnosticAction;
}

function buildCollectionProgressAction(
  stepProgress: NonNullable<ReturnType<typeof getGuidedCollectionProgressSummary>["nextStep"]>,
  locale: AppLocale,
) {
  return {
    href: localizeShareHref(stepProgress.primaryAction.href, locale),
    label:
      stepProgress.status === "completed"
        ? copyText(locale, `Review ${stepProgress.step.title}`, `重溫 ${stepProgress.step.title}`)
        : stepProgress.status === "in-progress"
          ? copyText(locale, `Resume ${stepProgress.step.title}`, `繼續 ${stepProgress.step.title}`)
          : copyText(locale, `Open ${stepProgress.step.title}`, `打開 ${stepProgress.step.title}`),
  } satisfies LearningPathEntryDiagnosticAction;
}

function buildCollectionRecommendationLabel(
  kind: LearningPathEntryDiagnosticRecommendationKind,
  locale: AppLocale,
) {
  switch (kind) {
    case "take-recap":
      return copyText(locale, "Use recap route", "使用重溫路線");
    case "skip-ahead":
      return copyText(locale, "Skip ahead", "直接前往後段");
    default:
      return copyText(locale, "Start from the opening step", "從起始步驟開始");
  }
}

function buildCollectionStartNote(
  probes: LearningPathEntryDiagnosticProbeProgress[],
  locale: AppLocale,
) {
  const reviewCount = probes.filter((probe) => probe.status === "review").length;
  const inProgressCount = probes.filter((probe) => probe.status === "in-progress").length;

  if (reviewCount > 0) {
    return copyText(
      locale,
      `${reviewCount} diagnostic check${reviewCount === 1 ? "" : "s"} still need review, so the opening step is the honest place to start this collection.`,
      `仍有 ${reviewCount} 個入口診斷檢查需要重溫，因此從起始步驟開始是這個合集最誠實的起點。`,
    );
  }

  if (inProgressCount > 0) {
    return copyText(locale, "Some diagnostic checks already have activity, but the opening step is still the clearest entry into the collection order.", "有些入口診斷檢查已經開始，但起始步驟仍然是進入這個合集順序最清楚的入口。");
  }

  return copyText(locale, "No saved diagnostic checks are available yet, so the opening step is still the best entry into the collection.", "目前還沒有任何已保存的入口診斷檢查，因此起始步驟仍然是進入這個合集的最佳入口。");
}

export function buildGuidedCollectionEntryDiagnostic(
  snapshot: ProgressSnapshot,
  collection: GuidedCollectionSummary,
  locale: AppLocale = "en",
): LearningPathEntryDiagnosticSummary | null {
  if (!collection.entryDiagnostic) {
    return null;
  }

  const probes = collection.entryDiagnostic.probes.map((probe) =>
    buildProbeProgress(snapshot, probe, locale),
  );
  const readyProbeCount = probes.filter((probe) => probe.status === "ready").length;
  const reviewProbeCount = probes.filter((probe) => probe.status === "review").length;
  const inProgressProbeCount = probes.filter((probe) => probe.status === "in-progress").length;
  const collectionProgress = getGuidedCollectionProgressSummary(
    snapshot,
    collection,
    locale,
  );
  const recapStep = getCollectionRecapStep(collection);
  const allProbesReady = readyProbeCount === probes.length;
  let recommendationKind: LearningPathEntryDiagnosticRecommendationKind = "start-at-beginning";
  let note = buildCollectionStartNote(probes, locale);
  let primaryAction = buildCollectionStartAction(collection, locale);
  let secondaryAction: LearningPathEntryDiagnosticAction | null = null;

  if (
    recapStep &&
    collectionProgress.status !== "not-started" &&
    (collectionProgress.status === "completed" || reviewProbeCount > 0)
  ) {
    recommendationKind = "take-recap";
    note =
      collectionProgress.status === "completed"
        ? copyText(locale, "Saved progress already covers this collection. The recap route is the fastest honest way to reactivate the bridge before you widen back into later steps.", "已保存的進度已經覆蓋這個合集。重溫路線是在重新擴展到後續步驟前，最快而且最誠實的方式去重新啟動這個橋接。")
        : copyText(locale, "Saved activity already exists here, and the recap route is the shortest honest way to refresh the bridge before continuing.", "這裡已經有保存的活動紀錄，而重溫路線是在繼續前重新整理這段橋接的最短、最誠實方式。");
    primaryAction = {
      href: localizeShareHref(recapStep.href, locale),
      label: copyText(locale, `Use ${recapStep.title}`, `使用 ${recapStep.title}`),
    };
    secondaryAction =
      collectionProgress.nextStep?.primaryAction.href === primaryAction.href
        ? null
        : (collectionProgress.nextStep
            ? buildCollectionProgressAction(collectionProgress.nextStep, locale)
            : null);
  } else if (allProbesReady && collection.entryDiagnostic.skipToStep) {
    recommendationKind = "skip-ahead";
    note = copyText(
      locale,
      `All ${probes.length} diagnostic check${probes.length === 1 ? "" : "s"} are already ready, so you can jump straight to ${collection.entryDiagnostic.skipToStep.title}.`,
      `${probes.length} 個入口診斷檢查都已準備好，所以你可以直接跳到 ${collection.entryDiagnostic.skipToStep.title}。`,
    );
    primaryAction = {
      href: localizeShareHref(collection.entryDiagnostic.skipToStep.href, locale),
      label: copyText(locale, `Skip to ${collection.entryDiagnostic.skipToStep.title}`, `跳到 ${collection.entryDiagnostic.skipToStep.title}`),
    };
    secondaryAction = buildCollectionStartAction(collection, locale);
  } else if (collectionProgress.status !== "not-started" && collectionProgress.nextStep) {
    recommendationKind = "skip-ahead";
    note = copyText(
      locale,
      `Saved progress already places you past the opening diagnostic segment. ${collectionProgress.nextStep.note}`,
      `已保存的進度顯示你已經越過起始診斷區段。${collectionProgress.nextStep.note}`,
    );
    primaryAction = buildCollectionProgressAction(collectionProgress.nextStep, locale);
    secondaryAction = buildCollectionRestartAction(collection, locale);
  }

  return {
    title: collection.entryDiagnostic.title,
    summary: collection.entryDiagnostic.summary,
    recommendationKind,
    recommendationLabel: buildCollectionRecommendationLabel(recommendationKind, locale),
    note,
    primaryAction,
    secondaryAction,
    probes,
    readyProbeCount,
    reviewProbeCount,
    inProgressProbeCount,
  };
}

export function buildRecommendedGoalPathEntryDiagnosticTeaser(
  snapshot: ProgressSnapshot,
  goalPath: RecommendedGoalPathSummary,
  locale: AppLocale = "en",
): RecommendedGoalPathEntryDiagnosticTeaser | null {
  for (const step of goalPath.steps) {
    if (step.kind === "guided-collection" && step.collection.entryDiagnostic) {
      const diagnostic = buildGuidedCollectionEntryDiagnostic(snapshot, step.collection, locale);

      if (!diagnostic) {
        continue;
      }

      return {
        sourceKind: "guided-collection",
        sourceTitle: step.collection.title,
        sourceHref: localizeShareHref(step.collection.path, locale),
        diagnostic,
      };
    }

    if (step.kind === "track" && step.track.entryDiagnostic) {
      const diagnostic = buildStarterTrackEntryDiagnostic(
        snapshot,
        step.track,
        step.prerequisiteTracks,
        locale,
      );

      if (!diagnostic) {
        continue;
      }

      return {
        sourceKind: "starter-track",
        sourceTitle: step.track.title,
        sourceHref: localizeShareHref(`/tracks/${step.track.slug}`, locale),
        diagnostic,
      };
    }
  }

  return null;
}
