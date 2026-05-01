import type { ConceptId, ConceptSlug, ConceptSummary } from "@/lib/content/schema";

export const PROGRESS_STORAGE_KEY = "physica.local-progress.v1";
export const PROGRESS_STORAGE_VERSION = 1;

export type ProgressConceptIdentity = {
  id?: ConceptId;
  slug: ConceptSlug | string;
  title?: string;
};

export type ConceptProgressStatus =
  | "not-started"
  | "started"
  | "practiced"
  | "completed";

export type ConceptMasteryState = "new" | "practiced" | "shaky" | "solid";
export type ChallengeProgressState = "solved" | "started" | "to-try";

export type ConceptProgressRecord = {
  conceptId?: ConceptId;
  slug: ConceptSlug | string;
  firstVisitedAt?: string;
  lastVisitedAt?: string;
  hasInteracted?: boolean;
  lastInteractedAt?: string;
  usedChallengeModeAt?: string;
  startedChallenges?: Record<string, string>;
  completedChallenges?: Record<string, string>;
  quickTestStartedAt?: string;
  completedQuickTestAt?: string;
  quickTestAttemptCount?: number;
  quickTestLastIncorrectCount?: number;
  quickTestMissStreak?: number;
  quickTestLastMissedAt?: string;
  usedPredictionModeAt?: string;
  usedCompareModeAt?: string;
  engagedWorkedExampleAt?: string;
  manualCompletedAt?: string;
};

export type TopicTestProgressRecord = {
  slug: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount?: number;
  lastIncorrectCount?: number;
  lastQuestionCount?: number;
};

export type PackTestProgressRecord = {
  slug: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount?: number;
  lastIncorrectCount?: number;
  lastQuestionCount?: number;
};

export type ProgressSnapshot = {
  version: typeof PROGRESS_STORAGE_VERSION;
  concepts: Record<string, ConceptProgressRecord>;
  topicTests?: Record<string, TopicTestProgressRecord>;
  packTests?: Record<string, PackTestProgressRecord>;
};

export type ConceptMasterySummary = {
  state: ConceptMasteryState;
  note: string;
  evidence: string[];
};

export type ConceptProgressSummary = {
  concept: ProgressConceptIdentity;
  record: ConceptProgressRecord | null;
  status: ConceptProgressStatus;
  mastery: ConceptMasterySummary;
  lastActivityAt: string | null;
  practicedFeatures: string[];
  isUnfinished: boolean;
};

export type ReviewQueueReasonKind =
  | "missed-checks"
  | "challenge"
  | "checkpoint"
  | "diagnostic"
  | "confidence"
  | "unfinished"
  | "stale";

export type ConceptResurfacingCue = {
  reasonKind: ReviewQueueReasonKind;
  reason: string;
  actionLabel: string;
  staleDays: number | null;
  priority: number;
  supportReasons: string[];
};

export type ReviewQueueItem = {
  concept: Pick<ConceptSummary, "id" | "slug" | "title">;
  progress: ConceptProgressSummary;
  reasonKind: ReviewQueueReasonKind;
  reason: string;
  actionLabel: string;
  staleDays: number | null;
  priority: number;
  supportReasons: string[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function normalizeNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function normalizeConceptId(value: unknown) {
  return typeof value === "string" && value ? (value as ConceptId) : undefined;
}

function normalizeSlug(value: unknown, fallbackSlug: string) {
  return typeof value === "string" && value ? value : fallbackSlug;
}

function normalizeTimestampMap(value: unknown) {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] =>
      typeof entry[0] === "string" &&
      Boolean(entry[0]) &&
      typeof entry[1] === "string" &&
      Boolean(entry[1]),
  );

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export function createEmptyProgressSnapshot(): ProgressSnapshot {
  return {
    version: PROGRESS_STORAGE_VERSION,
    concepts: {},
    topicTests: {},
    packTests: {},
  };
}

export function normalizeConceptProgressRecord(
  value: unknown,
  fallbackSlug: string,
): ConceptProgressRecord | null {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    conceptId: normalizeConceptId(value.conceptId),
    slug: normalizeSlug(value.slug, fallbackSlug),
    firstVisitedAt: normalizeTimestamp(value.firstVisitedAt),
    lastVisitedAt: normalizeTimestamp(value.lastVisitedAt),
    hasInteracted: value.hasInteracted === true,
    lastInteractedAt: normalizeTimestamp(value.lastInteractedAt),
    usedChallengeModeAt: normalizeTimestamp(value.usedChallengeModeAt),
    startedChallenges: normalizeTimestampMap(value.startedChallenges),
    completedChallenges: normalizeTimestampMap(value.completedChallenges),
    quickTestStartedAt: normalizeTimestamp(value.quickTestStartedAt),
    completedQuickTestAt: normalizeTimestamp(value.completedQuickTestAt),
    quickTestAttemptCount: normalizeNonNegativeInteger(value.quickTestAttemptCount),
    quickTestLastIncorrectCount: normalizeNonNegativeInteger(value.quickTestLastIncorrectCount),
    quickTestMissStreak: normalizeNonNegativeInteger(value.quickTestMissStreak),
    quickTestLastMissedAt: normalizeTimestamp(value.quickTestLastMissedAt),
    usedPredictionModeAt: normalizeTimestamp(value.usedPredictionModeAt),
    usedCompareModeAt: normalizeTimestamp(value.usedCompareModeAt),
    engagedWorkedExampleAt: normalizeTimestamp(value.engagedWorkedExampleAt),
    manualCompletedAt: normalizeTimestamp(value.manualCompletedAt),
  };
}

export function normalizeTopicTestProgressRecord(
  value: unknown,
  fallbackSlug: string,
): TopicTestProgressRecord | null {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    slug: normalizeSlug(value.slug, fallbackSlug),
    startedAt: normalizeTimestamp(value.startedAt),
    completedAt: normalizeTimestamp(value.completedAt),
    attemptCount: normalizeNonNegativeInteger(value.attemptCount),
    lastIncorrectCount: normalizeNonNegativeInteger(value.lastIncorrectCount),
    lastQuestionCount: normalizeNonNegativeInteger(value.lastQuestionCount),
  };
}

export function normalizePackTestProgressRecord(
  value: unknown,
  fallbackSlug: string,
): PackTestProgressRecord | null {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    slug: normalizeSlug(value.slug, fallbackSlug),
    startedAt: normalizeTimestamp(value.startedAt),
    completedAt: normalizeTimestamp(value.completedAt),
    attemptCount: normalizeNonNegativeInteger(value.attemptCount),
    lastIncorrectCount: normalizeNonNegativeInteger(value.lastIncorrectCount),
    lastQuestionCount: normalizeNonNegativeInteger(value.lastQuestionCount),
  };
}

export function normalizeProgressSnapshot(value: unknown): ProgressSnapshot {
  if (!isPlainObject(value)) {
    return createEmptyProgressSnapshot();
  }

  if (value.version !== PROGRESS_STORAGE_VERSION || !isPlainObject(value.concepts)) {
    return createEmptyProgressSnapshot();
  }

  const concepts = Object.fromEntries(
    Object.entries(value.concepts)
      .map(([slug, record]) => [slug, normalizeConceptProgressRecord(record, slug)])
      .filter((entry): entry is [string, ConceptProgressRecord] => Boolean(entry[1])),
  );
  const topicTests = isPlainObject(value.topicTests)
    ? Object.fromEntries(
        Object.entries(value.topicTests)
          .map(([slug, record]) => [slug, normalizeTopicTestProgressRecord(record, slug)])
          .filter((entry): entry is [string, TopicTestProgressRecord] => Boolean(entry[1])),
      )
    : {};
  const packTests = isPlainObject(value.packTests)
    ? Object.fromEntries(
        Object.entries(value.packTests)
          .map(([slug, record]) => [slug, normalizePackTestProgressRecord(record, slug)])
          .filter((entry): entry is [string, PackTestProgressRecord] => Boolean(entry[1])),
      )
    : {};

  return {
    version: PROGRESS_STORAGE_VERSION,
    concepts,
    topicTests,
    packTests,
  };
}

export function deriveConceptProgressStatus(
  record: ConceptProgressRecord | null | undefined,
): ConceptProgressStatus {
  if (!record) {
    return "not-started";
  }

  if (record.manualCompletedAt) {
    return "completed";
  }

  if (
    record.usedChallengeModeAt ||
    Object.keys(record.startedChallenges ?? {}).length > 0 ||
    Object.keys(record.completedChallenges ?? {}).length > 0 ||
    record.completedQuickTestAt ||
    record.usedPredictionModeAt ||
    record.usedCompareModeAt ||
    record.engagedWorkedExampleAt
  ) {
    return "practiced";
  }

  if (record.firstVisitedAt || record.hasInteracted) {
    return "started";
  }

  return "not-started";
}

function getPracticeOnlyEvidence(
  record: ConceptProgressRecord | null | undefined,
) {
  if (!record) {
    return [];
  }

  const evidence: string[] = [];

  if (record.usedPredictionModeAt) {
    evidence.push("Prediction used");
  }

  if (record.usedCompareModeAt) {
    evidence.push("Compare used");
  }

  if (record.engagedWorkedExampleAt) {
    evidence.push("Worked example used");
  }

  if (record.usedChallengeModeAt) {
    evidence.push("Challenge mode opened");
  }

  const startedChallengeCount = getStartedChallengeCount(record);
  if (startedChallengeCount > 0) {
    evidence.push(
      startedChallengeCount === 1
        ? "1 challenge started"
        : `${startedChallengeCount} challenges started`,
    );
  }

  return evidence;
}

function getMasteryEvidence(
  record: ConceptProgressRecord | null | undefined,
) {
  if (!record) {
    return [];
  }

  const evidence: string[] = [];
  const completedChallengeCount = getCompletedChallengeCount(record);

  if (completedChallengeCount > 0) {
    evidence.push(
      completedChallengeCount === 1
        ? "1 challenge solved"
        : `${completedChallengeCount} challenges solved`,
    );
  }

  if (record.completedQuickTestAt) {
    evidence.push("Quick test finished");
  }

  if (record.manualCompletedAt) {
    evidence.push("Marked complete");
  }

  return [...evidence, ...getPracticeOnlyEvidence(record)];
}

function getMasterySignalScore(
  record: ConceptProgressRecord | null | undefined,
) {
  if (!record) {
    return 0;
  }

  const completedChallengeCount = getCompletedChallengeCount(record);

  return (
    (completedChallengeCount >= 2 ? 2 : completedChallengeCount === 1 ? 1 : 0) +
    (record.completedQuickTestAt ? 1 : 0) +
    (record.manualCompletedAt ? 1 : 0)
  );
}

export function deriveConceptMasteryState(
  record: ConceptProgressRecord | null | undefined,
): ConceptMasteryState {
  const masterySignalScore = getMasterySignalScore(record);

  if (masterySignalScore >= 2) {
    return "solid";
  }

  if (masterySignalScore === 1) {
    return "shaky";
  }

  if (getPracticeOnlyEvidence(record).length > 0) {
    return "practiced";
  }

  return "new";
}

export function deriveConceptMasterySummary(
  record: ConceptProgressRecord | null | undefined,
): ConceptMasterySummary {
  const state = deriveConceptMasteryState(record);

  if (state === "solid") {
    return {
      state,
      note: "At least two stronger checks are saved on this browser.",
      evidence: getMasteryEvidence(record),
    };
  }

  if (state === "shaky") {
    return {
      state,
      note: "One stronger check is saved so far. Another check would firm this up.",
      evidence: getMasteryEvidence(record),
    };
  }

  if (state === "practiced") {
    return {
      state,
      note: "Practice activity is saved, but no finished checks are stored yet.",
      evidence: getMasteryEvidence(record),
    };
  }

  return {
    state,
    note: "No finished quick test, solved challenge, or completion mark is saved yet.",
    evidence: getMasteryEvidence(record),
  };
}

export function getConceptProgressRecord(
  snapshot: ProgressSnapshot,
  concept: Pick<ProgressConceptIdentity, "slug" | "id">,
): ConceptProgressRecord | null {
  const directMatch = snapshot.concepts[concept.slug];
  if (directMatch) {
    return directMatch;
  }

  if (!concept.id) {
    return null;
  }

  return (
    Object.values(snapshot.concepts).find((record) => record.conceptId === concept.id) ?? null
  );
}

export function getConceptProgressLastActivityAt(
  record: ConceptProgressRecord | null | undefined,
) {
  if (!record) {
    return null;
  }

  const timestamps = [
    record.lastVisitedAt,
    record.lastInteractedAt,
    record.usedChallengeModeAt,
    ...Object.values(record.startedChallenges ?? {}),
    ...Object.values(record.completedChallenges ?? {}),
    record.quickTestStartedAt,
    record.completedQuickTestAt,
    record.quickTestLastMissedAt,
    record.usedPredictionModeAt,
    record.usedCompareModeAt,
    record.engagedWorkedExampleAt,
    record.manualCompletedAt,
  ].filter(Boolean) as string[];

  if (!timestamps.length) {
    return null;
  }

  return timestamps.reduce((latest, value) => (value > latest ? value : latest), timestamps[0]);
}

export function getConceptPracticedFeatures(
  record: ConceptProgressRecord | null | undefined,
) {
  if (!record) {
    return [];
  }

  const features: string[] = [];

  if (
    record.usedChallengeModeAt ||
    Object.keys(record.startedChallenges ?? {}).length > 0 ||
    Object.keys(record.completedChallenges ?? {}).length > 0
  ) {
    features.push("Challenge");
  }

  if (record.completedQuickTestAt) {
    features.push("Quick test");
  }

  if (record.usedPredictionModeAt) {
    features.push("Prediction");
  }

  if (record.usedCompareModeAt) {
    features.push("Compare");
  }

  if (record.engagedWorkedExampleAt) {
    features.push("Worked example");
  }

  return features;
}

export function getCompletedChallengeIds(
  record: ConceptProgressRecord | null | undefined,
): string[] {
  return Object.keys(record?.completedChallenges ?? {});
}

export function getStartedChallengeIds(
  record: ConceptProgressRecord | null | undefined,
  challengeIds?: string[],
) {
  const completedChallengeSet = new Set(getCompletedChallengeIds(record));
  const started = Object.keys(record?.startedChallenges ?? {}).filter(
    (challengeId) => !completedChallengeSet.has(challengeId),
  );

  if (!challengeIds?.length) {
    return started;
  }

  const challengeSet = new Set(challengeIds);
  return started.filter((challengeId) => challengeSet.has(challengeId));
}

export function getStartedChallengeCount(
  record: ConceptProgressRecord | null | undefined,
  challengeIds?: string[],
) {
  return getStartedChallengeIds(record, challengeIds).length;
}

export function getChallengeStartedAt(
  record: ConceptProgressRecord | null | undefined,
  challengeId: string,
) {
  return record?.startedChallenges?.[challengeId] ?? null;
}

export function getChallengeProgressState(
  record: ConceptProgressRecord | null | undefined,
  challengeId: string,
): ChallengeProgressState {
  if (record?.completedChallenges?.[challengeId]) {
    return "solved";
  }

  if (record?.startedChallenges?.[challengeId]) {
    return "started";
  }

  if (!Object.keys(record?.startedChallenges ?? {}).length && record?.usedChallengeModeAt) {
    return "started";
  }

  return "to-try";
}

export function getCompletedChallengeCount(
  record: ConceptProgressRecord | null | undefined,
  challengeIds?: string[],
) {
  const completed = getCompletedChallengeIds(record);

  if (!challengeIds?.length) {
    return completed.length;
  }

  const challengeSet = new Set(challengeIds);
  return completed.filter((challengeId) => challengeSet.has(challengeId)).length;
}

export function getConceptProgressSummary(
  snapshot: ProgressSnapshot,
  concept: Pick<ConceptSummary, "id" | "slug" | "title">,
): ConceptProgressSummary {
  const record = getConceptProgressRecord(snapshot, concept);
  const status = deriveConceptProgressStatus(record);
  const mastery = deriveConceptMasterySummary(record);

  return {
    concept,
    record,
    status,
    mastery,
    lastActivityAt: getConceptProgressLastActivityAt(record),
    practicedFeatures: getConceptPracticedFeatures(record),
    isUnfinished: status === "started" || status === "practiced",
  };
}

function sortProgressSummaries(left: ConceptProgressSummary, right: ConceptProgressSummary) {
  const leftActivity = left.lastActivityAt ?? "";
  const rightActivity = right.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return rightActivity.localeCompare(leftActivity);
  }

  const leftTitle = left.concept.title ?? left.concept.slug;
  const rightTitle = right.concept.title ?? right.concept.slug;
  return leftTitle.localeCompare(rightTitle);
}

export function selectContinueLearning(
  snapshot: ProgressSnapshot,
  concepts: Array<Pick<ConceptSummary, "id" | "slug" | "title">>,
  limit = 3,
) {
  const summaries = concepts
    .map((concept) => getConceptProgressSummary(snapshot, concept))
    .filter((item) => item.status !== "not-started")
    .sort(sortProgressSummaries);

  const unfinished = summaries.filter((item) => item.isUnfinished);
  const primary = unfinished[0] ?? null;
  const recent = summaries
    .filter((item) => item.concept.slug !== primary?.concept.slug)
    .slice(0, Math.max(0, limit - (primary ? 1 : 0)));

  return {
    primary,
    recent,
  };
}

const REVIEW_STALE_THRESHOLD_DAYS = {
  started: 5,
  practiced: 7,
  solidCompleted: 21,
} as const;

function getElapsedDays(value: string | null, now: Date) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diff = now.getTime() - timestamp;

  if (diff <= 0) {
    return 0;
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDayCountLabel(staleDays: number) {
  return `${staleDays} day${staleDays === 1 ? "" : "s"}`;
}

function getCompletedReviewPriority(summary: ConceptProgressSummary, staleDays: number | null) {
  const ageScore = Math.min(staleDays ?? 0, 30);

  switch (summary.mastery.state) {
    case "new":
      return 120 + ageScore;
    case "practiced":
      return 114 + ageScore;
    case "shaky":
      return 108 + ageScore;
    default:
      return 82 + ageScore;
  }
}

function getQuickTestResurfacingCue(
  summary: ConceptProgressSummary,
  staleDays: number | null,
): ConceptResurfacingCue | null {
  const lastIncorrectCount = summary.record?.quickTestLastIncorrectCount ?? 0;
  const missStreak = summary.record?.quickTestMissStreak ?? 0;

  if (!lastIncorrectCount) {
    return null;
  }

  const supportReasons = [
    missStreak >= 2
      ? `Quick test has ended with missed questions ${missStreak} runs in a row.`
      : null,
    summary.record?.usedChallengeModeAt &&
    getCompletedChallengeCount(summary.record) === 0 &&
    summary.mastery.state !== "solid"
      ? "Challenge mode was opened, but no solved challenge is saved yet."
      : null,
  ].filter((item): item is string => Boolean(item));

  if (missStreak >= 2) {
    return {
      reasonKind: "missed-checks",
      reason: `Quick test has ended with missed questions ${missStreak} times in a row.`,
      actionLabel: "Retry quick test",
      staleDays,
      priority: 132 + Math.min(lastIncorrectCount, 4) + Math.min(staleDays ?? 0, 14),
      supportReasons,
    };
  }

  if (lastIncorrectCount >= 2 && summary.mastery.state !== "solid") {
    return {
      reasonKind: "missed-checks",
      reason: `Latest quick test still missed ${lastIncorrectCount} question${lastIncorrectCount === 1 ? "" : "s"}.`,
      actionLabel: "Retry quick test",
      staleDays,
      priority: 122 + Math.min(lastIncorrectCount, 4) + Math.min(staleDays ?? 0, 14),
      supportReasons,
    };
  }

  return null;
}

function getChallengeResurfacingCue(
  summary: ConceptProgressSummary,
  staleDays: number | null,
): ConceptResurfacingCue | null {
  const startedChallengeCount = getStartedChallengeCount(summary.record);
  const completedChallengeCount = getCompletedChallengeCount(summary.record);
  const unsolvedChallengeCount = startedChallengeCount;
  const openedWithoutSolve =
    Boolean(summary.record?.usedChallengeModeAt) && completedChallengeCount === 0;

  if (!unsolvedChallengeCount && !openedWithoutSolve) {
    return null;
  }

  const supportReasons = [
    summary.record?.quickTestLastIncorrectCount
      ? `Latest quick test still missed ${summary.record.quickTestLastIncorrectCount} question${
          summary.record.quickTestLastIncorrectCount === 1 ? "" : "s"
        }.`
      : null,
    !summary.record?.completedQuickTestAt ? "No finished quick test is saved yet." : null,
    unsolvedChallengeCount > 1
      ? `${unsolvedChallengeCount} challenge starts are still open without a saved solve.`
      : unsolvedChallengeCount === 1
        ? "1 challenge start is still open without a saved solve."
        : null,
  ].filter((item): item is string => Boolean(item));

  if (unsolvedChallengeCount > 1) {
    return {
      reasonKind: "challenge",
      reason: `${unsolvedChallengeCount} challenge starts are still open without a saved solve.`,
      actionLabel: "Continue challenge",
      staleDays,
      priority: 128 + Math.min(unsolvedChallengeCount, 4) + Math.min(staleDays ?? 0, 12),
      supportReasons,
    };
  }

  if (unsolvedChallengeCount === 1) {
    return {
      reasonKind: "challenge",
      reason: "A challenge run is already started here, but no solve is saved yet.",
      actionLabel: "Continue challenge",
      staleDays,
      priority: 124 + Math.min(staleDays ?? 0, 12),
      supportReasons,
    };
  }

  return {
    reasonKind: "challenge",
    reason: "Challenge mode was opened here, but no solved challenge is saved yet.",
    actionLabel: "Retry challenge",
    staleDays,
    priority: 112 + Math.min(staleDays ?? 0, 10),
    supportReasons,
  };
}

function getConfidenceResurfacingCue(
  summary: ConceptProgressSummary,
  staleDays: number | null,
): ConceptResurfacingCue | null {
  if (summary.status === "completed" && summary.mastery.state !== "solid") {
    const completedChallengeCount = getCompletedChallengeCount(summary.record);
    const supportReasons = [
      !summary.record?.completedQuickTestAt
        ? "No finished quick test is saved yet."
        : null,
      completedChallengeCount === 0 ? "No solved challenge is saved yet." : null,
      summary.record?.usedChallengeModeAt && completedChallengeCount === 0
        ? "Challenge mode was opened, but no solved challenge is stored yet."
        : null,
    ].filter((item): item is string => Boolean(item));

    return {
      reasonKind: "confidence",
      reason:
        summary.mastery.state === "new"
          ? "Marked complete here, but no finished quick test or solved challenge is saved yet."
          : summary.mastery.state === "practiced"
            ? "Practice is saved, but the concept was completed without a stronger check."
            : "Completed here, but only one stronger check is saved so far.",
      actionLabel: "Review concept",
      staleDays,
      priority: getCompletedReviewPriority(summary, staleDays),
      supportReasons,
    };
  }

  return null;
}

function getUnfinishedResurfacingCue(
  summary: ConceptProgressSummary,
  staleDays: number | null,
): ConceptResurfacingCue | null {
  if (summary.status === "started" && (staleDays ?? 0) >= REVIEW_STALE_THRESHOLD_DAYS.started) {
    const touchedLab =
      Boolean(summary.record?.hasInteracted) ||
      Boolean(summary.record?.lastInteractedAt);
    const supportReasons = [
      touchedLab
        ? "The live lab was already touched here, but no stronger check is saved yet."
        : "Only an opening visit is saved here so far.",
    ];

    return {
      reasonKind: "unfinished",
      reason: touchedLab
        ? `The live lab was started here, then left idle for ${formatDayCountLabel(staleDays ?? 0)}.`
        : `Last active ${formatDayCountLabel(staleDays ?? 0)} ago and still unfinished.`,
      actionLabel: "Resume concept",
      staleDays,
      priority: 100 + Math.min(staleDays ?? 0, 30),
      supportReasons,
    };
  }

  if (
    summary.status === "practiced" &&
    (staleDays ?? 0) >= REVIEW_STALE_THRESHOLD_DAYS.practiced
  ) {
    const completedChallengeCount = getCompletedChallengeCount(summary.record);
    const usedWorkedExampleOnly =
      Boolean(summary.record?.engagedWorkedExampleAt) &&
      !summary.record?.completedQuickTestAt &&
      completedChallengeCount === 0 &&
      !summary.record?.usedChallengeModeAt;
    const usedPredictionOrCompareOnly =
      (Boolean(summary.record?.usedPredictionModeAt) ||
        Boolean(summary.record?.usedCompareModeAt)) &&
      !summary.record?.completedQuickTestAt &&
      completedChallengeCount === 0 &&
      !summary.record?.usedChallengeModeAt;
    const supportReasons = [
      summary.record?.usedChallengeModeAt && completedChallengeCount === 0
        ? "Challenge mode is open in local progress, but no solve is saved yet."
        : null,
      !summary.record?.completedQuickTestAt
        ? "No finished quick test is saved yet."
        : null,
      usedWorkedExampleOnly
        ? "A worked example was used here, but no stronger check followed."
        : null,
      usedPredictionOrCompareOnly
        ? "Prediction or compare work is saved here, but no stronger check followed."
        : null,
    ].filter((item): item is string => Boolean(item));

    return {
      reasonKind: "unfinished",
      reason: usedWorkedExampleOnly
        ? `A worked example was opened here, but the concept has been idle for ${formatDayCountLabel(staleDays ?? 0)} before any stronger check.`
        : usedPredictionOrCompareOnly
          ? `Prediction or compare work is saved here, but the concept has been idle for ${formatDayCountLabel(staleDays ?? 0)} before any stronger check.`
          : `Practice is saved, but the concept has been idle for ${formatDayCountLabel(staleDays ?? 0)}.`,
      actionLabel:
        summary.record?.usedChallengeModeAt && completedChallengeCount === 0
          ? "Retry challenge"
          : usedWorkedExampleOnly
            ? "Replay worked example"
          : summary.record?.quickTestLastIncorrectCount
            ? "Retry quick test"
            : "Resume concept",
      staleDays,
      priority:
        (usedWorkedExampleOnly || usedPredictionOrCompareOnly ? 102 : 96) +
        Math.min(staleDays ?? 0, 30),
      supportReasons,
    };
  }

  return null;
}

function getStaleResurfacingCue(
  summary: ConceptProgressSummary,
  staleDays: number | null,
): ConceptResurfacingCue | null {
  if (
    summary.status === "completed" &&
    summary.mastery.state === "solid" &&
    (staleDays ?? 0) >= REVIEW_STALE_THRESHOLD_DAYS.solidCompleted
  ) {
    return {
      reasonKind: "stale",
      reason: `Completed confidently before, but it has been ${formatDayCountLabel(staleDays ?? 0)} since the last saved activity.`,
      actionLabel: "Review concept",
      staleDays,
      priority: 82 + Math.min(staleDays ?? 0, 30),
      supportReasons: [],
    };
  }

  return null;
}

export function getConceptResurfacingCue(
  summary: ConceptProgressSummary,
  options: {
    now?: Date;
  } = {},
) {
  const staleDays = getElapsedDays(summary.lastActivityAt, options.now ?? new Date());
  const candidates = [
    getQuickTestResurfacingCue(summary, staleDays),
    getChallengeResurfacingCue(summary, staleDays),
    getConfidenceResurfacingCue(summary, staleDays),
    getUnfinishedResurfacingCue(summary, staleDays),
    getStaleResurfacingCue(summary, staleDays),
  ]
    .filter((item): item is ConceptResurfacingCue => Boolean(item))
    .sort((left, right) => right.priority - left.priority);

  return candidates[0] ?? null;
}

function sortReviewQueueItems(left: ReviewQueueItem, right: ReviewQueueItem) {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  const leftActivity = left.progress.lastActivityAt ?? "";
  const rightActivity = right.progress.lastActivityAt ?? "";

  if (leftActivity !== rightActivity) {
    return leftActivity.localeCompare(rightActivity);
  }

  const leftTitle = left.concept.title ?? left.concept.slug;
  const rightTitle = right.concept.title ?? right.concept.slug;
  return leftTitle.localeCompare(rightTitle);
}

export function selectReviewQueue(
  snapshot: ProgressSnapshot,
  concepts: Array<Pick<ConceptSummary, "id" | "slug" | "title">>,
  limit = 3,
  options: {
    now?: Date;
  } = {},
) {
  const now = options.now ?? new Date();
  const continueLearning = selectContinueLearning(snapshot, concepts, 1);
  const continueSlug = continueLearning.primary?.concept.slug ?? null;

  return concepts
    .map((concept) => {
      const progress = getConceptProgressSummary(snapshot, concept);

      if (progress.status === "not-started" || concept.slug === continueSlug) {
        return null;
      }

      const candidate = getConceptResurfacingCue(progress, { now });

      if (!candidate) {
        return null;
      }

      return {
        concept,
        progress,
        ...candidate,
      };
    })
    .filter((item): item is ReviewQueueItem => Boolean(item))
    .sort(sortReviewQueueItems)
    .slice(0, Math.max(0, limit));
}
