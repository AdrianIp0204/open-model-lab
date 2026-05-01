import {
  getConceptProgressSummary,
  type ProgressSnapshot,
} from "@/lib/progress";
import type { ConceptTestCatalogEntry } from "./catalog";
import type { PackTestCatalogEntry } from "./packs";
import type { TopicTestCatalogEntry } from "./topic-tests";

export type TestHubProgressStatus = "not-started" | "completed";
export type TestHubLatestResult = "clean" | "missed" | null;

export type TestHubProgressState = {
  status: TestHubProgressStatus;
  latestResult: TestHubLatestResult;
  latestIncorrectCount: number | null;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  hasConceptActivityWithoutFinishedTest: boolean;
  hasStartedAssessmentWithoutCompletion: boolean;
};

export type TestHubSummary = {
  totalTests: number;
  completedTests: number;
  latestCleanTests: number;
  remainingTests: number;
};

function getPackTestRecord(
  snapshot: ProgressSnapshot,
  packSlug: string,
) {
  return snapshot.packTests?.[packSlug] ?? null;
}

function getTopicTestRecord(
  snapshot: ProgressSnapshot,
  topicSlug: string,
) {
  return snapshot.topicTests?.[topicSlug] ?? null;
}

export function getConceptTestProgressState(
  snapshot: ProgressSnapshot,
  entry: Pick<ConceptTestCatalogEntry, "conceptId" | "conceptSlug" | "title">,
): TestHubProgressState {
  const progress = getConceptProgressSummary(snapshot, {
    id: entry.conceptId,
    slug: entry.conceptSlug,
    title: entry.title,
  });
  const record = progress.record;
  const completedAt = record?.completedQuickTestAt ?? null;
  const startedAt = record?.quickTestStartedAt ?? null;
  const latestIncorrectCount =
    completedAt && typeof record?.quickTestLastIncorrectCount === "number"
      ? record.quickTestLastIncorrectCount
      : null;
  const hasStartedAssessmentWithoutCompletion = Boolean(
    startedAt && (!completedAt || startedAt > completedAt),
  );

  return {
    status: completedAt ? "completed" : "not-started",
    latestResult:
      latestIncorrectCount === null
        ? null
        : latestIncorrectCount > 0
          ? "missed"
          : "clean",
    latestIncorrectCount,
    attempts: record?.quickTestAttemptCount ?? 0,
    startedAt,
    completedAt,
    hasConceptActivityWithoutFinishedTest:
      Boolean(record) && !completedAt && progress.status !== "not-started",
    hasStartedAssessmentWithoutCompletion,
  };
}

export function getTopicTestProgressState(
  snapshot: ProgressSnapshot,
  entry: Pick<TopicTestCatalogEntry, "topicSlug">,
): TestHubProgressState {
  const record = getTopicTestRecord(snapshot, entry.topicSlug);
  const startedAt = record?.startedAt ?? null;
  const completedAt = record?.completedAt ?? null;
  const latestIncorrectCount =
    completedAt && typeof record?.lastIncorrectCount === "number"
      ? record.lastIncorrectCount
      : null;
  const hasStartedAssessmentWithoutCompletion = Boolean(
    startedAt && (!completedAt || startedAt > completedAt),
  );

  return {
    status: completedAt ? "completed" : "not-started",
    latestResult:
      latestIncorrectCount === null
        ? null
        : latestIncorrectCount > 0
          ? "missed"
          : "clean",
    latestIncorrectCount,
    attempts: record?.attemptCount ?? 0,
    startedAt,
    completedAt,
    hasConceptActivityWithoutFinishedTest: false,
    hasStartedAssessmentWithoutCompletion,
  };
}

export function getPackTestProgressState(
  snapshot: ProgressSnapshot,
  entry: Pick<PackTestCatalogEntry, "packSlug">,
): TestHubProgressState {
  const record = getPackTestRecord(snapshot, entry.packSlug);
  const startedAt = record?.startedAt ?? null;
  const completedAt = record?.completedAt ?? null;
  const latestIncorrectCount =
    completedAt && typeof record?.lastIncorrectCount === "number"
      ? record.lastIncorrectCount
      : null;
  const hasStartedAssessmentWithoutCompletion = Boolean(
    startedAt && (!completedAt || startedAt > completedAt),
  );

  return {
    status: completedAt ? "completed" : "not-started",
    latestResult:
      latestIncorrectCount === null
        ? null
        : latestIncorrectCount > 0
          ? "missed"
          : "clean",
    latestIncorrectCount,
    attempts: record?.attemptCount ?? 0,
    startedAt,
    completedAt,
    hasConceptActivityWithoutFinishedTest: false,
    hasStartedAssessmentWithoutCompletion,
  };
}

export function buildTestHubSummary(
  entries: Array<
    | Pick<PackTestCatalogEntry, "kind" | "packSlug">
    | Pick<ConceptTestCatalogEntry, "kind" | "conceptId" | "conceptSlug" | "title">
    | Pick<TopicTestCatalogEntry, "kind" | "topicSlug">
  >,
  snapshot: ProgressSnapshot,
): TestHubSummary {
  const progressStates = entries.map((entry) =>
    entry.kind === "pack"
      ? getPackTestProgressState(snapshot, entry)
      : entry.kind === "concept"
        ? getConceptTestProgressState(snapshot, entry)
        : getTopicTestProgressState(snapshot, entry),
  );
  const completedTests = progressStates.filter((state) => state.status === "completed").length;
  const latestCleanTests = progressStates.filter((state) => state.latestResult === "clean").length;

  return {
    totalTests: entries.length,
    completedTests,
    latestCleanTests,
    remainingTests: Math.max(0, entries.length - completedTests),
  };
}
