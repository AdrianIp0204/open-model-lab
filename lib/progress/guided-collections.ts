import type {
  GuidedCollectionChallengeStepSummary,
  GuidedCollectionConceptStepSummary,
  GuidedCollectionStepSummary,
  GuidedCollectionSummary,
  GuidedCollectionSurfaceStepSummary,
  GuidedCollectionTrackStepSummary,
} from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import type { ResolvedGuidedCollectionAssignment } from "@/lib/guided/assignments";
import type { ResolvedGuidedCollectionConceptBundle } from "@/lib/guided/concept-bundles";
import {
  buildTrackCompletionHref,
  localizeShareHref,
} from "@/lib/share-links";
import {
  getChallengeProgressState,
  getConceptProgressLastActivityAt,
  getConceptProgressRecord,
  getConceptProgressSummary,
  type ChallengeProgressState,
  type ConceptProgressSummary,
  type ProgressSnapshot,
} from "./model";
import { getStarterTrackPrimaryAction, getStarterTrackProgressSummary } from "./tracks";

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export type GuidedCollectionProgressStatus = "not-started" | "in-progress" | "completed";

export type GuidedCollectionStepAction = {
  href: string;
  label: string;
};

export type GuidedCollectionStepProgress = {
  step: GuidedCollectionStepSummary;
  status: GuidedCollectionProgressStatus;
  note: string;
  primaryAction: GuidedCollectionStepAction;
  secondaryAction: GuidedCollectionStepAction | null;
  lastActivityAt: string | null;
  completedRelatedConceptCount: number;
  startedRelatedConceptCount: number;
  totalRelatedConceptCount: number;
  conceptProgress: ConceptProgressSummary | null;
  challengeState: ChallengeProgressState | null;
  trackProgress: ReturnType<typeof getStarterTrackProgressSummary> | null;
};

type GuidedSequenceProgressSummary = {
  status: GuidedCollectionProgressStatus;
  stepProgress: GuidedCollectionStepProgress[];
  nextStep: GuidedCollectionStepProgress | null;
  completedStepCount: number;
  startedStepCount: number;
  totalSteps: number;
  completedConceptCount: number;
  totalConcepts: number;
  lastActivityAt: string | null;
};

type GuidedSequenceProgressSource = {
  steps: GuidedCollectionStepSummary[];
  concepts: GuidedCollectionSummary["concepts"];
};

export type GuidedCollectionProgressSummary = GuidedSequenceProgressSummary & {
  collection: GuidedCollectionSummary;
};

export type GuidedConceptBundleProgressSummary = GuidedSequenceProgressSummary & {
  bundle: ResolvedGuidedCollectionConceptBundle;
};

export type GuidedCollectionAssignmentProgressSummary = GuidedSequenceProgressSummary & {
  assignment: ResolvedGuidedCollectionAssignment;
};

function toProgressStatus(
  value: "not-started" | "started" | "practiced" | "completed",
): GuidedCollectionProgressStatus {
  if (value === "completed") {
    return "completed";
  }

  if (value === "not-started") {
    return "not-started";
  }

  return "in-progress";
}

function getLatestTimestamp(values: Array<string | null>) {
  const timestamps = values.filter((value): value is string => Boolean(value));

  if (!timestamps.length) {
    return null;
  }

  return timestamps.reduce((latest, value) => (value > latest ? value : latest), timestamps[0]);
}

function buildAggregateConceptStats(
  snapshot: ProgressSnapshot,
  step: GuidedCollectionStepSummary,
) {
  const progressEntries = step.relatedConcepts.map((concept) =>
    getConceptProgressSummary(snapshot, concept),
  );
  const completedRelatedConceptCount = progressEntries.filter(
    (entry) => entry.status === "completed",
  ).length;
  const startedRelatedConceptCount = progressEntries.filter(
    (entry) => entry.status !== "not-started",
  ).length;

  return {
    progressEntries,
    completedRelatedConceptCount,
    startedRelatedConceptCount,
    totalRelatedConceptCount: progressEntries.length,
    lastActivityAt: getLatestTimestamp(progressEntries.map((entry) => entry.lastActivityAt)),
  };
}

function getSurfaceStatus(
  step: GuidedCollectionSurfaceStepSummary,
  counts: Pick<
    GuidedCollectionStepProgress,
    "completedRelatedConceptCount" | "startedRelatedConceptCount" | "totalRelatedConceptCount"
  >,
): GuidedCollectionProgressStatus {
  if (step.completionMode === "any-progress") {
    return counts.startedRelatedConceptCount > 0 ? "completed" : "not-started";
  }

  if (counts.completedRelatedConceptCount === counts.totalRelatedConceptCount) {
    return "completed";
  }

  if (counts.startedRelatedConceptCount > 0) {
    return "in-progress";
  }

  return "not-started";
}

function buildSurfaceNote(
  step: GuidedCollectionSurfaceStepSummary,
  counts: Pick<
    GuidedCollectionStepProgress,
    "completedRelatedConceptCount" | "startedRelatedConceptCount" | "totalRelatedConceptCount"
  >,
  status: GuidedCollectionProgressStatus,
  locale: AppLocale,
) {
  if (step.completionMode === "any-progress") {
    return status === "completed"
      ? copyText(
          locale,
          `Related progress already exists in ${counts.startedRelatedConceptCount} of ${counts.totalRelatedConceptCount} linked concepts.`,
          `${counts.totalRelatedConceptCount} 個相關概念之中，已有 ${counts.startedRelatedConceptCount} 個出現相關進度。`,
        )
      : step.surfaceKind === "topic"
        ? copyText(
            locale,
            "Open this topic page before the linked concepts start accumulating saved progress.",
            "先打開這個主題頁，再讓相關概念開始累積已保存進度。",
          )
        : step.surfaceKind === "challenge-hub"
          ? copyText(
              locale,
              "Open challenges here before the linked concepts start accumulating saved progress.",
              "先在這裡打開挑戰，再讓相關概念開始累積已保存進度。",
            )
          : copyText(
              locale,
              "Open this reference surface before the linked concepts start accumulating saved progress.",
              "先打開這個參考頁面，再讓相關概念開始累積已保存進度。",
            );
  }

  if (status === "completed") {
    return copyText(
      locale,
      `All ${counts.totalRelatedConceptCount} linked concepts are already completed.`,
      `${counts.totalRelatedConceptCount} 個相關概念都已完成。`,
    );
  }

  if (status === "in-progress") {
    return copyText(
      locale,
      `${counts.completedRelatedConceptCount} of ${counts.totalRelatedConceptCount} linked concepts are completed so far.`,
      `${counts.totalRelatedConceptCount} 個相關概念之中，目前已有 ${counts.completedRelatedConceptCount} 個完成。`,
    );
  }

  return copyText(
    locale,
    `No saved progress yet in the ${counts.totalRelatedConceptCount} linked concepts.`,
    `${counts.totalRelatedConceptCount} 個相關概念中仍未有任何已保存進度。`,
  );
}

function buildConceptStepProgress(
  snapshot: ProgressSnapshot,
  step: GuidedCollectionConceptStepSummary,
  locale: AppLocale,
): GuidedCollectionStepProgress {
  const conceptProgress = getConceptProgressSummary(snapshot, step.concept);
  const status = toProgressStatus(conceptProgress.status);
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
    completedRelatedConceptCount: conceptProgress.status === "completed" ? 1 : 0,
    startedRelatedConceptCount: conceptProgress.status === "not-started" ? 0 : 1,
    totalRelatedConceptCount: 1,
    conceptProgress,
    challengeState: null,
    trackProgress: null,
  };
}

function buildTrackStepProgress(
  snapshot: ProgressSnapshot,
  step: GuidedCollectionTrackStepSummary,
  locale: AppLocale,
): GuidedCollectionStepProgress {
  const trackProgress = getStarterTrackProgressSummary(snapshot, step.track, locale);
  const trackPrimaryAction = getStarterTrackPrimaryAction(step.track, trackProgress, locale);
  const trackTitle = getStarterTrackDisplayTitle(step.track, locale);
  const targetConceptTitle = trackPrimaryAction.targetConcept
    ? getConceptDisplayTitle(trackPrimaryAction.targetConcept, locale)
    : null;
  const status: GuidedCollectionProgressStatus =
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
              "All concepts and checkpoints in this track are complete.",
              "這條路徑中的所有概念與檢查點都已完成。",
            )
          : copyText(
              locale,
              "All concepts in this track are complete.",
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
            href: trackPrimaryAction.href,
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
      trackPrimaryAction.href === localizeShareHref(step.href, locale)
        ? null
        : {
            href: localizeShareHref(step.href, locale),
            label: copyText(locale, "Open track page", "打開路徑頁"),
          },
    lastActivityAt: trackProgress.lastActivityAt,
    completedRelatedConceptCount: trackProgress.completedCount,
    startedRelatedConceptCount: trackProgress.startedCount,
    totalRelatedConceptCount: trackProgress.totalConcepts,
    conceptProgress: null,
    challengeState: null,
    trackProgress,
  };
}

function buildChallengeStepProgress(
  snapshot: ProgressSnapshot,
  step: GuidedCollectionChallengeStepSummary,
  locale: AppLocale,
): GuidedCollectionStepProgress {
  const record = getConceptProgressRecord(snapshot, step.concept);
  const challengeState = getChallengeProgressState(record, step.challengeId);
  const status: GuidedCollectionProgressStatus =
    challengeState === "solved"
      ? "completed"
      : challengeState === "started"
        ? "in-progress"
        : "not-started";
  const solvedAt = record?.completedChallenges?.[step.challengeId] ?? null;
  const startedAt = record?.startedChallenges?.[step.challengeId] ?? null;
  const lastActivityAt =
    solvedAt ??
    startedAt ??
    getConceptProgressLastActivityAt(record);

  return {
    step,
    status,
    note:
      challengeState === "solved"
        ? copyText(
            locale,
            "This challenge is already solved in saved progress.",
            "這個挑戰已在已保存進度中解開。",
          )
        : challengeState === "started"
          ? copyText(
              locale,
              "Challenge mode has already been opened for this step.",
              "這個步驟的挑戰模式已經打開過。",
            )
          : copyText(
              locale,
              "No saved challenge activity yet for this step.",
              "這個步驟仍未有任何已保存的挑戰活動。",
            ),
    primaryAction: {
      href: localizeShareHref(step.href, locale),
      label:
        challengeState === "solved"
          ? copyText(locale, "Review challenge", "重溫挑戰")
          : challengeState === "started"
            ? copyText(locale, "Continue challenge", "繼續挑戰")
            : copyText(locale, "Open challenge", "打開挑戰"),
    },
    secondaryAction: {
      href: localizeShareHref(`/concepts/${step.concept.slug}`, locale),
      label: copyText(locale, "Open concept", "打開概念"),
    },
    lastActivityAt,
    completedRelatedConceptCount: challengeState === "solved" ? 1 : 0,
    startedRelatedConceptCount: challengeState === "to-try" ? 0 : 1,
    totalRelatedConceptCount: 1,
    conceptProgress: null,
    challengeState,
    trackProgress: null,
  };
}

function buildSurfaceStepProgress(
  snapshot: ProgressSnapshot,
  step: GuidedCollectionSurfaceStepSummary,
  locale: AppLocale,
): GuidedCollectionStepProgress {
  const aggregate = buildAggregateConceptStats(snapshot, step);
  const status = getSurfaceStatus(step, aggregate);

  return {
    step,
    status,
    note: buildSurfaceNote(step, aggregate, status, locale),
    primaryAction: {
      href: localizeShareHref(step.href, locale),
      label: step.actionLabel,
    },
    secondaryAction: null,
    lastActivityAt: aggregate.lastActivityAt,
    completedRelatedConceptCount: aggregate.completedRelatedConceptCount,
    startedRelatedConceptCount: aggregate.startedRelatedConceptCount,
    totalRelatedConceptCount: aggregate.totalRelatedConceptCount,
    conceptProgress: null,
    challengeState: null,
    trackProgress: null,
  };
}

function buildStepProgress(
  snapshot: ProgressSnapshot,
  step: GuidedCollectionStepSummary,
  locale: AppLocale,
): GuidedCollectionStepProgress {
  switch (step.kind) {
    case "concept":
      return buildConceptStepProgress(snapshot, step, locale);
    case "track":
      return buildTrackStepProgress(snapshot, step, locale);
    case "challenge":
      return buildChallengeStepProgress(snapshot, step, locale);
    case "surface":
      return buildSurfaceStepProgress(snapshot, step, locale);
    default:
      throw new Error(`Unsupported guided collection step kind: ${(step as { kind: string }).kind}`);
  }
}

export function getGuidedCollectionProgressSummary(
  snapshot: ProgressSnapshot,
  collection: GuidedCollectionSummary,
  locale: AppLocale = "en",
): GuidedCollectionProgressSummary {
  return {
    collection,
    ...buildGuidedSequenceProgressSummary(snapshot, collection, locale),
  };
}

function buildGuidedSequenceProgressSummary(
  snapshot: ProgressSnapshot,
  source: GuidedSequenceProgressSource,
  locale: AppLocale,
): GuidedSequenceProgressSummary {
  const stepProgress = source.steps.map((step) =>
    buildStepProgress(snapshot, step, locale),
  );
  const completedStepCount = stepProgress.filter((step) => step.status === "completed").length;
  const startedStepCount = stepProgress.filter((step) => step.status !== "not-started").length;
  const totalSteps = stepProgress.length;
  const conceptProgress = source.concepts.map((concept) =>
    getConceptProgressSummary(snapshot, concept),
  );
  const completedConceptCount = conceptProgress.filter(
    (entry) => entry.status === "completed",
  ).length;
  const lastActivityAt = getLatestTimestamp(stepProgress.map((step) => step.lastActivityAt));
  const status: GuidedCollectionProgressStatus =
    completedStepCount === totalSteps
      ? "completed"
      : startedStepCount > 0
        ? "in-progress"
        : "not-started";

  return {
    status,
    stepProgress,
    nextStep:
      status === "completed"
        ? stepProgress[0] ?? null
        : stepProgress.find((step) => step.status !== "completed") ?? stepProgress[0] ?? null,
    completedStepCount,
    startedStepCount,
    totalSteps,
    completedConceptCount,
    totalConcepts: source.concepts.length,
    lastActivityAt,
  };
}

export function getGuidedConceptBundleProgressSummary(
  snapshot: ProgressSnapshot,
  bundle: ResolvedGuidedCollectionConceptBundle,
  locale: AppLocale = "en",
): GuidedConceptBundleProgressSummary {
  return {
    bundle,
    ...buildGuidedSequenceProgressSummary(snapshot, bundle, locale),
  };
}

export function getGuidedCollectionAssignmentProgressSummary(
  snapshot: ProgressSnapshot,
  assignment: ResolvedGuidedCollectionAssignment,
  locale: AppLocale = "en",
): GuidedCollectionAssignmentProgressSummary {
  return {
    assignment,
    ...buildGuidedSequenceProgressSummary(snapshot, assignment, locale),
  };
}
