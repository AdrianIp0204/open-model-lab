import type {
  ConceptProgressRecord,
  PackTestProgressRecord,
  ProgressSnapshot,
  TopicTestProgressRecord,
} from "./model";
import { createEmptyProgressSnapshot, getConceptProgressLastActivityAt } from "./model";

export type ProgressMergeSummary = {
  localConceptCount: number;
  remoteConceptCount: number;
  mergedConceptCount: number;
  importedLocalConceptCount: number;
  importedRemoteConceptCount: number;
};

function maxTimestamp(left?: string, right?: string) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left >= right ? left : right;
}

function minTimestamp(left?: string, right?: string) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left <= right ? left : right;
}

function maxInteger(left?: number, right?: number) {
  if (typeof left !== "number") {
    return right;
  }

  if (typeof right !== "number") {
    return left;
  }

  return Math.max(left, right);
}

function mergeTimestampMaps(
  left?: Record<string, string>,
  right?: Record<string, string>,
  mode: "earliest" | "latest" = "latest",
) {
  const entries = new Map<string, string>();

  for (const [key, value] of Object.entries(left ?? {})) {
    if (key && value) {
      entries.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(right ?? {})) {
    if (!key || !value) {
      continue;
    }

    const current = entries.get(key);
    const nextValue =
      mode === "earliest" ? minTimestamp(current, value) : maxTimestamp(current, value);

    if (nextValue) {
      entries.set(key, nextValue);
    }
  }

  if (!entries.size) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function getQuickTestSignalTimestamp(record?: ConceptProgressRecord | null) {
  if (!record) {
    return "";
  }

  return maxTimestamp(record.completedQuickTestAt, record.quickTestLastMissedAt) ?? "";
}

function pickPreferredRecord(
  localRecord?: ConceptProgressRecord | null,
  remoteRecord?: ConceptProgressRecord | null,
) {
  if (!localRecord) {
    return remoteRecord ?? null;
  }

  if (!remoteRecord) {
    return localRecord;
  }

  const localActivity = getConceptProgressLastActivityAt(localRecord) ?? "";
  const remoteActivity = getConceptProgressLastActivityAt(remoteRecord) ?? "";

  if (localActivity !== remoteActivity) {
    return localActivity >= remoteActivity ? localRecord : remoteRecord;
  }

  return localRecord;
}

function buildConceptKey(record: ConceptProgressRecord, fallbackSlug: string) {
  if (record.conceptId) {
    return `id:${record.conceptId}`;
  }

  return `slug:${record.slug || fallbackSlug}`;
}

function collectConceptRecords(snapshot: ProgressSnapshot) {
  const conceptRecords = new Map<string, ConceptProgressRecord>();

  for (const [slug, record] of Object.entries(snapshot.concepts)) {
    const normalizedRecord = {
      ...record,
      slug: record.slug || slug,
    };

    conceptRecords.set(buildConceptKey(normalizedRecord, slug), normalizedRecord);
  }

  return conceptRecords;
}

function collectTopicTestRecords(snapshot: ProgressSnapshot) {
  const topicTestRecords = new Map<string, TopicTestProgressRecord>();

  for (const [slug, record] of Object.entries(snapshot.topicTests ?? {})) {
    topicTestRecords.set(slug, {
      ...record,
      slug: record.slug || slug,
    });
  }

  return topicTestRecords;
}

function collectPackTestRecords(snapshot: ProgressSnapshot) {
  const packTestRecords = new Map<string, PackTestProgressRecord>();

  for (const [slug, record] of Object.entries(snapshot.packTests ?? {})) {
    packTestRecords.set(slug, {
      ...record,
      slug: record.slug || slug,
    });
  }

  return packTestRecords;
}

export function mergeConceptProgressRecords(
  remoteRecord?: ConceptProgressRecord | null,
  localRecord?: ConceptProgressRecord | null,
): ConceptProgressRecord | null {
  if (!remoteRecord && !localRecord) {
    return null;
  }

  const preferredRecord = pickPreferredRecord(localRecord, remoteRecord);
  const preferredQuickTestRecord =
    getQuickTestSignalTimestamp(localRecord) >= getQuickTestSignalTimestamp(remoteRecord)
      ? localRecord
      : remoteRecord;

  return {
    conceptId: localRecord?.conceptId ?? remoteRecord?.conceptId,
    slug:
      preferredRecord?.slug ??
      localRecord?.slug ??
      remoteRecord?.slug ??
      "",
    firstVisitedAt: minTimestamp(remoteRecord?.firstVisitedAt, localRecord?.firstVisitedAt),
    lastVisitedAt: maxTimestamp(remoteRecord?.lastVisitedAt, localRecord?.lastVisitedAt),
    hasInteracted: remoteRecord?.hasInteracted === true || localRecord?.hasInteracted === true,
    lastInteractedAt: maxTimestamp(
      remoteRecord?.lastInteractedAt,
      localRecord?.lastInteractedAt,
    ),
    usedChallengeModeAt: maxTimestamp(
      remoteRecord?.usedChallengeModeAt,
      localRecord?.usedChallengeModeAt,
    ),
    startedChallenges: mergeTimestampMaps(
      remoteRecord?.startedChallenges,
      localRecord?.startedChallenges,
      "earliest",
    ),
    completedChallenges: mergeTimestampMaps(
      remoteRecord?.completedChallenges,
      localRecord?.completedChallenges,
      "latest",
    ),
    quickTestStartedAt: maxTimestamp(
      remoteRecord?.quickTestStartedAt,
      localRecord?.quickTestStartedAt,
    ),
    completedQuickTestAt: maxTimestamp(
      remoteRecord?.completedQuickTestAt,
      localRecord?.completedQuickTestAt,
    ),
    quickTestAttemptCount: maxInteger(
      remoteRecord?.quickTestAttemptCount,
      localRecord?.quickTestAttemptCount,
    ),
    quickTestLastIncorrectCount: preferredQuickTestRecord?.quickTestLastIncorrectCount,
    quickTestMissStreak: preferredQuickTestRecord?.quickTestMissStreak,
    quickTestLastMissedAt: preferredQuickTestRecord?.quickTestLastMissedAt,
    usedPredictionModeAt: maxTimestamp(
      remoteRecord?.usedPredictionModeAt,
      localRecord?.usedPredictionModeAt,
    ),
    usedCompareModeAt: maxTimestamp(
      remoteRecord?.usedCompareModeAt,
      localRecord?.usedCompareModeAt,
    ),
    engagedWorkedExampleAt: maxTimestamp(
      remoteRecord?.engagedWorkedExampleAt,
      localRecord?.engagedWorkedExampleAt,
    ),
    manualCompletedAt: maxTimestamp(
      remoteRecord?.manualCompletedAt,
      localRecord?.manualCompletedAt,
    ),
  };
}

export function mergeTopicTestProgressRecords(
  remoteRecord?: TopicTestProgressRecord | null,
  localRecord?: TopicTestProgressRecord | null,
): TopicTestProgressRecord | null {
  if (!remoteRecord && !localRecord) {
    return null;
  }

  const latestCompletedAt = maxTimestamp(remoteRecord?.completedAt, localRecord?.completedAt);
  const preferredRecord =
    latestCompletedAt === localRecord?.completedAt ? localRecord : remoteRecord;

  return {
    slug: localRecord?.slug ?? remoteRecord?.slug ?? "",
    startedAt: maxTimestamp(remoteRecord?.startedAt, localRecord?.startedAt),
    completedAt: latestCompletedAt,
    attemptCount: maxInteger(remoteRecord?.attemptCount, localRecord?.attemptCount),
    lastIncorrectCount: preferredRecord?.lastIncorrectCount,
    lastQuestionCount: preferredRecord?.lastQuestionCount,
  };
}

export function mergePackTestProgressRecords(
  remoteRecord?: PackTestProgressRecord | null,
  localRecord?: PackTestProgressRecord | null,
): PackTestProgressRecord | null {
  if (!remoteRecord && !localRecord) {
    return null;
  }

  const latestCompletedAt = maxTimestamp(remoteRecord?.completedAt, localRecord?.completedAt);
  const preferredRecord =
    latestCompletedAt === localRecord?.completedAt ? localRecord : remoteRecord;

  return {
    slug: localRecord?.slug ?? remoteRecord?.slug ?? "",
    startedAt: maxTimestamp(remoteRecord?.startedAt, localRecord?.startedAt),
    completedAt: latestCompletedAt,
    attemptCount: maxInteger(remoteRecord?.attemptCount, localRecord?.attemptCount),
    lastIncorrectCount: preferredRecord?.lastIncorrectCount,
    lastQuestionCount: preferredRecord?.lastQuestionCount,
  };
}

export function mergeProgressSnapshots(
  remoteSnapshot: ProgressSnapshot | null | undefined,
  localSnapshot: ProgressSnapshot | null | undefined,
) {
  const safeRemoteSnapshot = remoteSnapshot ?? createEmptyProgressSnapshot();
  const safeLocalSnapshot = localSnapshot ?? createEmptyProgressSnapshot();
  const remoteRecords = collectConceptRecords(safeRemoteSnapshot);
  const localRecords = collectConceptRecords(safeLocalSnapshot);
  const remoteTopicTestRecords = collectTopicTestRecords(safeRemoteSnapshot);
  const localTopicTestRecords = collectTopicTestRecords(safeLocalSnapshot);
  const remotePackTestRecords = collectPackTestRecords(safeRemoteSnapshot);
  const localPackTestRecords = collectPackTestRecords(safeLocalSnapshot);
  const conceptKeys = new Set([...remoteRecords.keys(), ...localRecords.keys()]);
  const topicTestKeys = new Set([
    ...remoteTopicTestRecords.keys(),
    ...localTopicTestRecords.keys(),
  ]);
  const packTestKeys = new Set([
    ...remotePackTestRecords.keys(),
    ...localPackTestRecords.keys(),
  ]);
  const concepts: ProgressSnapshot["concepts"] = {};
  const topicTests: NonNullable<ProgressSnapshot["topicTests"]> = {};
  const packTests: NonNullable<ProgressSnapshot["packTests"]> = {};

  for (const conceptKey of conceptKeys) {
    const mergedRecord = mergeConceptProgressRecords(
      remoteRecords.get(conceptKey),
      localRecords.get(conceptKey),
    );

    if (!mergedRecord?.slug) {
      continue;
    }

    concepts[mergedRecord.slug] = mergedRecord;
  }

  for (const topicTestKey of topicTestKeys) {
    const mergedRecord = mergeTopicTestProgressRecords(
      remoteTopicTestRecords.get(topicTestKey),
      localTopicTestRecords.get(topicTestKey),
    );

    if (!mergedRecord?.slug) {
      continue;
    }

    topicTests[mergedRecord.slug] = mergedRecord;
  }

  for (const packTestKey of packTestKeys) {
    const mergedRecord = mergePackTestProgressRecords(
      remotePackTestRecords.get(packTestKey),
      localPackTestRecords.get(packTestKey),
    );

    if (!mergedRecord?.slug) {
      continue;
    }

    packTests[mergedRecord.slug] = mergedRecord;
  }

  return {
    version: safeLocalSnapshot.version,
    concepts,
    topicTests,
    packTests,
  } satisfies ProgressSnapshot;
}

export function summarizeProgressMerge(
  remoteSnapshot: ProgressSnapshot | null | undefined,
  localSnapshot: ProgressSnapshot | null | undefined,
  mergedSnapshot: ProgressSnapshot | null | undefined,
): ProgressMergeSummary {
  const safeRemoteSnapshot = remoteSnapshot ?? createEmptyProgressSnapshot();
  const safeLocalSnapshot = localSnapshot ?? createEmptyProgressSnapshot();
  const safeMergedSnapshot = mergedSnapshot ?? createEmptyProgressSnapshot();
  const remoteKeys = new Set(collectConceptRecords(safeRemoteSnapshot).keys());
  const localKeys = new Set(collectConceptRecords(safeLocalSnapshot).keys());
  const mergedKeys = new Set(collectConceptRecords(safeMergedSnapshot).keys());

  let importedLocalConceptCount = 0;
  let importedRemoteConceptCount = 0;

  for (const conceptKey of mergedKeys) {
    if (!remoteKeys.has(conceptKey) && localKeys.has(conceptKey)) {
      importedLocalConceptCount += 1;
    }

    if (!localKeys.has(conceptKey) && remoteKeys.has(conceptKey)) {
      importedRemoteConceptCount += 1;
    }
  }

  return {
    localConceptCount: localKeys.size,
    remoteConceptCount: remoteKeys.size,
    mergedConceptCount: mergedKeys.size,
    importedLocalConceptCount,
    importedRemoteConceptCount,
  };
}
