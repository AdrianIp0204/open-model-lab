import { buildChallengeEntryHref, localizeShareHref } from "@/lib/share-links";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitleFromValue,
} from "@/lib/i18n/content";
import type {
  ConceptSummary,
  StarterTrackSummary,
  SubjectDiscoverySummary,
} from "@/lib/content";
import {
  deriveConceptMasteryState,
  getConceptProgressLastActivityAt,
  getConceptProgressSummary,
  type ProgressConceptIdentity,
  type ConceptMasteryState,
  type ProgressSnapshot,
} from "./model";

export const PROGRESS_HISTORY_VERSION = 1;
const MAX_PROGRESS_HISTORY_EVENTS = 120;
const MAX_PROGRESS_HISTORY_TIMELINE_POINTS = 36;

export type ProgressHistoryConceptSummary = Pick<
  ConceptSummary,
  "id" | "slug" | "title" | "subject"
>;

export type ProgressHistorySubjectSummary = Pick<
  SubjectDiscoverySummary,
  "slug" | "title" | "path"
>;

type CheckpointLookupEntry = {
  trackSlug: string;
  trackTitle: string;
  checkpointId: string;
  checkpointTitle: string;
};

export type ProgressHistoryEventKind =
  | "checkpoint-cleared"
  | "challenge-solved"
  | "mastery-updated";

export type ProgressHistoryEvent = {
  id: string;
  kind: ProgressHistoryEventKind;
  occurredAt: string;
  title: string;
  note: string;
  href: string;
  conceptSlug: string;
  conceptTitle: string;
  subjectSlug: string | null;
  subjectTitle: string | null;
  subjectPath: string | null;
  challengeId: string | null;
  checkpointId: string | null;
  trackSlug: string | null;
  trackTitle: string | null;
  masteryFrom: ConceptMasteryState | null;
  masteryTo: ConceptMasteryState | null;
};

export type ProgressHistoryTimelineSubject = {
  subjectSlug: string | null;
  subjectTitle: string;
  subjectPath: string | null;
  touchedConceptCount: number;
  completedConceptCount: number;
  solidConceptCount: number;
  shakyConceptCount: number;
  practicedConceptCount: number;
  checkpointClearCount: number;
  solvedChallengeCount: number;
};

export type ProgressHistoryTimelinePoint = {
  recordedAt: string;
  touchedConceptCount: number;
  completedConceptCount: number;
  solidConceptCount: number;
  shakyConceptCount: number;
  practicedConceptCount: number;
  checkpointClearCount: number;
  solvedChallengeCount: number;
  subjects: ProgressHistoryTimelineSubject[];
};

export type ProgressHistoryStore = {
  version: typeof PROGRESS_HISTORY_VERSION;
  events: ProgressHistoryEvent[];
  masteryTimeline: ProgressHistoryTimelinePoint[];
};

export type PremiumCheckpointHistoryMetric = {
  label: string;
  value: string;
  note: string;
};

export type PremiumCheckpointHistorySubjectTrend = {
  id: string;
  subjectSlug: string | null;
  subjectTitle: string;
  subjectPath: string | null;
  statusLabel: "Stable" | "Strengthening" | "Needs work" | "Building";
  summary: string;
  detail: string;
};

export type PremiumCheckpointHistoryConceptTrend = {
  id: string;
  conceptSlug: string;
  title: string;
  href: string;
  masteryState: ConceptMasteryState;
  statusLabel: "Stable" | "Strengthening" | "Needs work" | "Building";
  summary: string;
  detail: string;
  lastActivityAt: string | null;
};

export type PremiumCheckpointHistoryView = {
  hasRecordedProgress: boolean;
  hasPersistedHistory: boolean;
  metrics: PremiumCheckpointHistoryMetric[];
  recentEvents: ProgressHistoryEvent[];
  timeline: ProgressHistoryTimelinePoint[];
  stableSubjects: PremiumCheckpointHistorySubjectTrend[];
  needsWorkSubjects: PremiumCheckpointHistorySubjectTrend[];
  stableConcepts: PremiumCheckpointHistoryConceptTrend[];
  needsWorkConcepts: PremiumCheckpointHistoryConceptTrend[];
  methodologyNote: string;
};

const DEFAULT_PROGRESS_HISTORY_LOCALE: AppLocale = "en";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function normalizeInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function normalizeMasteryState(value: unknown) {
  return value === "new" ||
    value === "practiced" ||
    value === "shaky" ||
    value === "solid"
    ? value
    : null;
}

function compareTimestampDescending(left: string | null, right: string | null) {
  return (right ?? "").localeCompare(left ?? "");
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatHistoryCount(
  locale: AppLocale,
  count: number,
  singular: string,
  plural: string,
  zhUnit: string,
) {
  return locale === "zh-HK"
    ? `${count}${zhUnit}`
    : pluralize(count, singular, plural);
}

function joinHistoryDetails(locale: AppLocale, details: string[]) {
  return details.join(locale === "zh-HK" ? " · " : " | ");
}

function localizeHistoryConceptTitle(
  concept: Pick<ProgressConceptIdentity, "slug" | "title">,
  locale: AppLocale,
) {
  return getConceptDisplayTitle(
    {
      slug: concept.slug,
      title: concept.title ?? concept.slug,
    },
    locale,
  );
}

function localizeHistorySubjectTitle(subjectTitle: string, locale: AppLocale) {
  return getSubjectDisplayTitleFromValue(subjectTitle, locale);
}

function localizeHistoryTrackTitle(
  track: Pick<StarterTrackSummary, "slug" | "title">,
  locale: AppLocale,
) {
  return getStarterTrackDisplayTitle(track, locale);
}

function localizeMasteryNote(note: string, locale: AppLocale) {
  if (locale !== "zh-HK") {
    return note;
  }

  switch (note.trim()) {
    case "At least two stronger checks are saved on this browser.":
      return "這個概念目前已有至少兩次較強的已儲存檢查。";
    case "One stronger check is saved so far. Another check would firm this up.":
      return "目前已有一次較強檢查，再完成一次會更穩固。";
    case "Practice activity is saved, but no finished checks are stored yet.":
      return "已有練習紀錄，但仍未存下完成的較強檢查。";
    case "No finished quick test, solved challenge, or completion mark is saved yet.":
      return "目前仍未存下已完成的小測、挑戰解答或完成標記。";
    default:
      return note;
  }
}

function getCheckpointLookup(starterTracks: StarterTrackSummary[]) {
  const lookup = new Map<string, CheckpointLookupEntry>();

  for (const track of starterTracks) {
    for (const checkpoint of track.checkpoints) {
      lookup.set(
        `${checkpoint.challenge.concept.slug}:${checkpoint.challenge.challengeId}`,
        {
          trackSlug: track.slug,
          trackTitle: track.title,
          checkpointId: checkpoint.id,
          checkpointTitle: checkpoint.title,
        },
      );
    }
  }

  return lookup;
}

function countCheckpointClears(
  challengeIds: string[],
  conceptSlug: string,
  checkpointLookup: Map<string, CheckpointLookupEntry>,
) {
  return challengeIds.filter((challengeId) =>
    checkpointLookup.has(`${conceptSlug}:${challengeId}`),
  ).length;
}

function createEmptyTimelineSubject(input: {
  subjectSlug: string | null;
  subjectTitle: string;
  subjectPath: string | null;
}): ProgressHistoryTimelineSubject {
  return {
    subjectSlug: input.subjectSlug,
    subjectTitle: input.subjectTitle,
    subjectPath: input.subjectPath,
    touchedConceptCount: 0,
    completedConceptCount: 0,
    solidConceptCount: 0,
    shakyConceptCount: 0,
    practicedConceptCount: 0,
    checkpointClearCount: 0,
    solvedChallengeCount: 0,
  };
}

function buildTimelinePoint(input: {
  snapshot: ProgressSnapshot;
  concepts: ProgressHistoryConceptSummary[];
  subjects: ProgressHistorySubjectSummary[];
  starterTracks: StarterTrackSummary[];
  recordedAt: string;
}): ProgressHistoryTimelinePoint {
  const checkpointLookup = getCheckpointLookup(input.starterTracks);
  const subjectByTitle = new Map(
    input.subjects.map((subject) => [subject.title, subject] as const),
  );
  const subjectTotals = new Map<string, ProgressHistoryTimelineSubject>();

  const point: ProgressHistoryTimelinePoint = {
    recordedAt: input.recordedAt,
    touchedConceptCount: 0,
    completedConceptCount: 0,
    solidConceptCount: 0,
    shakyConceptCount: 0,
    practicedConceptCount: 0,
    checkpointClearCount: 0,
    solvedChallengeCount: 0,
    subjects: [],
  };

  for (const concept of input.concepts) {
    const summary = getConceptProgressSummary(input.snapshot, concept);

    if (summary.status === "not-started" || !summary.record) {
      continue;
    }

    point.touchedConceptCount += 1;

    if (summary.status === "completed") {
      point.completedConceptCount += 1;
    }

    if (summary.mastery.state === "solid") {
      point.solidConceptCount += 1;
    } else if (summary.mastery.state === "shaky") {
      point.shakyConceptCount += 1;
    } else if (summary.mastery.state === "practiced") {
      point.practicedConceptCount += 1;
    }

    const completedChallengeIds = Object.keys(summary.record.completedChallenges ?? {});
    const checkpointClearCount = countCheckpointClears(
      completedChallengeIds,
      concept.slug,
      checkpointLookup,
    );
    const solvedChallengeCount = Math.max(0, completedChallengeIds.length - checkpointClearCount);
    point.checkpointClearCount += checkpointClearCount;
    point.solvedChallengeCount += solvedChallengeCount;

    const subject = subjectByTitle.get(concept.subject);
    const subjectKey = subject?.slug ?? concept.subject;
    const subjectTotalsEntry =
      subjectTotals.get(subjectKey) ??
      createEmptyTimelineSubject({
        subjectSlug: subject?.slug ?? null,
        subjectTitle: concept.subject,
        subjectPath: subject?.path ?? null,
      });

    subjectTotalsEntry.touchedConceptCount += 1;
    subjectTotalsEntry.completedConceptCount += summary.status === "completed" ? 1 : 0;
    subjectTotalsEntry.solidConceptCount += summary.mastery.state === "solid" ? 1 : 0;
    subjectTotalsEntry.shakyConceptCount += summary.mastery.state === "shaky" ? 1 : 0;
    subjectTotalsEntry.practicedConceptCount +=
      summary.mastery.state === "practiced" ? 1 : 0;
    subjectTotalsEntry.checkpointClearCount += checkpointClearCount;
    subjectTotalsEntry.solvedChallengeCount += solvedChallengeCount;

    subjectTotals.set(subjectKey, subjectTotalsEntry);
  }

  point.subjects = [...subjectTotals.values()].sort((left, right) => {
    if (left.solidConceptCount !== right.solidConceptCount) {
      return right.solidConceptCount - left.solidConceptCount;
    }

    if (left.touchedConceptCount !== right.touchedConceptCount) {
      return right.touchedConceptCount - left.touchedConceptCount;
    }

    return left.subjectTitle.localeCompare(right.subjectTitle);
  });

  return point;
}

function areTimelineSubjectsEqual(
  left: ProgressHistoryTimelineSubject,
  right: ProgressHistoryTimelineSubject,
) {
  return (
    left.subjectSlug === right.subjectSlug &&
    left.subjectTitle === right.subjectTitle &&
    left.subjectPath === right.subjectPath &&
    left.touchedConceptCount === right.touchedConceptCount &&
    left.completedConceptCount === right.completedConceptCount &&
    left.solidConceptCount === right.solidConceptCount &&
    left.shakyConceptCount === right.shakyConceptCount &&
    left.practicedConceptCount === right.practicedConceptCount &&
    left.checkpointClearCount === right.checkpointClearCount &&
    left.solvedChallengeCount === right.solvedChallengeCount
  );
}

function areTimelinePointsEqual(
  left: ProgressHistoryTimelinePoint | undefined,
  right: ProgressHistoryTimelinePoint,
) {
  if (!left) {
    return false;
  }

  if (
    left.touchedConceptCount !== right.touchedConceptCount ||
    left.completedConceptCount !== right.completedConceptCount ||
    left.solidConceptCount !== right.solidConceptCount ||
    left.shakyConceptCount !== right.shakyConceptCount ||
    left.practicedConceptCount !== right.practicedConceptCount ||
    left.checkpointClearCount !== right.checkpointClearCount ||
    left.solvedChallengeCount !== right.solvedChallengeCount ||
    left.subjects.length !== right.subjects.length
  ) {
    return false;
  }

  return left.subjects.every((subject, index) => {
    const matching = right.subjects[index];

    if (!matching) {
      return false;
    }

    return areTimelineSubjectsEqual(subject, matching);
  });
}

function normalizeProgressHistoryEvent(value: unknown): ProgressHistoryEvent | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const kind = value.kind;

  if (
    kind !== "checkpoint-cleared" &&
    kind !== "challenge-solved" &&
    kind !== "mastery-updated"
  ) {
    return null;
  }

  const id = normalizeString(value.id);
  const occurredAt = normalizeString(value.occurredAt);
  const title = normalizeString(value.title);
  const note = normalizeString(value.note);
  const href = normalizeString(value.href);
  const conceptSlug = normalizeString(value.conceptSlug);
  const conceptTitle = normalizeString(value.conceptTitle);

  if (!id || !occurredAt || !title || !note || !href || !conceptSlug || !conceptTitle) {
    return null;
  }

  return {
    id,
    kind,
    occurredAt,
    title,
    note,
    href,
    conceptSlug,
    conceptTitle,
    subjectSlug: normalizeString(value.subjectSlug),
    subjectTitle: normalizeString(value.subjectTitle),
    subjectPath: normalizeString(value.subjectPath),
    challengeId: normalizeString(value.challengeId),
    checkpointId: normalizeString(value.checkpointId),
    trackSlug: normalizeString(value.trackSlug),
    trackTitle: normalizeString(value.trackTitle),
    masteryFrom: normalizeMasteryState(value.masteryFrom),
    masteryTo: normalizeMasteryState(value.masteryTo),
  };
}

function normalizeTimelineSubject(value: unknown): ProgressHistoryTimelineSubject | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const subjectTitle = normalizeString(value.subjectTitle);

  if (!subjectTitle) {
    return null;
  }

  return {
    subjectSlug: normalizeString(value.subjectSlug),
    subjectTitle,
    subjectPath: normalizeString(value.subjectPath),
    touchedConceptCount: normalizeInteger(value.touchedConceptCount),
    completedConceptCount: normalizeInteger(value.completedConceptCount),
    solidConceptCount: normalizeInteger(value.solidConceptCount),
    shakyConceptCount: normalizeInteger(value.shakyConceptCount),
    practicedConceptCount: normalizeInteger(value.practicedConceptCount),
    checkpointClearCount: normalizeInteger(value.checkpointClearCount),
    solvedChallengeCount: normalizeInteger(value.solvedChallengeCount),
  };
}

function normalizeTimelinePoint(value: unknown): ProgressHistoryTimelinePoint | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const recordedAt = normalizeString(value.recordedAt);

  if (!recordedAt) {
    return null;
  }

  return {
    recordedAt,
    touchedConceptCount: normalizeInteger(value.touchedConceptCount),
    completedConceptCount: normalizeInteger(value.completedConceptCount),
    solidConceptCount: normalizeInteger(value.solidConceptCount),
    shakyConceptCount: normalizeInteger(value.shakyConceptCount),
    practicedConceptCount: normalizeInteger(value.practicedConceptCount),
    checkpointClearCount: normalizeInteger(value.checkpointClearCount),
    solvedChallengeCount: normalizeInteger(value.solvedChallengeCount),
    subjects: Array.isArray(value.subjects)
      ? value.subjects
          .map((item) => normalizeTimelineSubject(item))
          .filter((item): item is ProgressHistoryTimelineSubject => Boolean(item))
      : [],
  };
}

export function createEmptyProgressHistoryStore(): ProgressHistoryStore {
  return {
    version: PROGRESS_HISTORY_VERSION,
    events: [],
    masteryTimeline: [],
  };
}

export function normalizeProgressHistoryStore(value: unknown): ProgressHistoryStore {
  if (!isPlainObject(value) || value.version !== PROGRESS_HISTORY_VERSION) {
    return createEmptyProgressHistoryStore();
  }

  return {
    version: PROGRESS_HISTORY_VERSION,
    events: Array.isArray(value.events)
      ? value.events
          .map((item) => normalizeProgressHistoryEvent(item))
          .filter((item): item is ProgressHistoryEvent => Boolean(item))
          .sort((left, right) => compareTimestampDescending(left.occurredAt, right.occurredAt))
          .slice(0, MAX_PROGRESS_HISTORY_EVENTS)
      : [],
    masteryTimeline: Array.isArray(value.masteryTimeline)
      ? value.masteryTimeline
          .map((item) => normalizeTimelinePoint(item))
          .filter((item): item is ProgressHistoryTimelinePoint => Boolean(item))
          .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
          .slice(-MAX_PROGRESS_HISTORY_TIMELINE_POINTS)
      : [],
  };
}

function buildEventId(input: {
  kind: ProgressHistoryEventKind;
  conceptSlug: string;
  challengeId?: string | null;
  checkpointId?: string | null;
  masteryTo?: ConceptMasteryState | null;
  occurredAt: string;
}) {
  return [
    input.kind,
    input.conceptSlug,
    input.challengeId ?? "",
    input.checkpointId ?? "",
    input.masteryTo ?? "",
    input.occurredAt,
  ].join(":");
}

function buildCheckpointEvent(input: {
  concept: ProgressHistoryConceptSummary;
  subject: ProgressHistorySubjectSummary | null;
  checkpoint: CheckpointLookupEntry;
  challengeId: string;
  occurredAt: string;
  locale: AppLocale;
}): ProgressHistoryEvent {
  const conceptTitle = localizeHistoryConceptTitle(input.concept, input.locale);
  const subjectTitle = localizeHistorySubjectTitle(
    input.subject?.title ?? input.concept.subject,
    input.locale,
  );
  const trackTitle = localizeHistoryTrackTitle(
    {
      slug: input.checkpoint.trackSlug,
      title: input.checkpoint.trackTitle,
    },
    input.locale,
  );

  return {
    id: buildEventId({
      kind: "checkpoint-cleared",
      conceptSlug: input.concept.slug,
      challengeId: input.challengeId,
      checkpointId: input.checkpoint.checkpointId,
      occurredAt: input.occurredAt,
    }),
    kind: "checkpoint-cleared",
    occurredAt: input.occurredAt,
    title: input.checkpoint.checkpointTitle,
    note:
      input.locale === "zh-HK"
        ? `${trackTitle} 的檢查點完成已記錄到同步學習歷程。`
        : `${trackTitle} checkpoint cleared in saved sync history.`,
    href: buildChallengeEntryHref(input.concept.slug, input.challengeId, input.locale),
    conceptSlug: input.concept.slug,
    conceptTitle,
    subjectSlug: input.subject?.slug ?? null,
    subjectTitle,
    subjectPath: input.subject?.path ?? null,
    challengeId: input.challengeId,
    checkpointId: input.checkpoint.checkpointId,
    trackSlug: input.checkpoint.trackSlug,
    trackTitle,
    masteryFrom: null,
    masteryTo: null,
  };
}

function buildChallengeEvent(input: {
  concept: ProgressHistoryConceptSummary;
  subject: ProgressHistorySubjectSummary | null;
  challengeId: string;
  occurredAt: string;
  locale: AppLocale;
}): ProgressHistoryEvent {
  const conceptTitle = localizeHistoryConceptTitle(input.concept, input.locale);
  const subjectTitle = localizeHistorySubjectTitle(
    input.subject?.title ?? input.concept.subject,
    input.locale,
  );

  return {
    id: buildEventId({
      kind: "challenge-solved",
      conceptSlug: input.concept.slug,
      challengeId: input.challengeId,
      occurredAt: input.occurredAt,
    }),
    kind: "challenge-solved",
    occurredAt: input.occurredAt,
    title: conceptTitle,
    note:
      input.locale === "zh-HK"
        ? "新的挑戰解答已加入已儲存的支持者方案歷程。"
        : "A challenge solve was added to the saved Supporter history.",
    href: buildChallengeEntryHref(input.concept.slug, input.challengeId, input.locale),
    conceptSlug: input.concept.slug,
    conceptTitle,
    subjectSlug: input.subject?.slug ?? null,
    subjectTitle,
    subjectPath: input.subject?.path ?? null,
    challengeId: input.challengeId,
    checkpointId: null,
    trackSlug: null,
    trackTitle: null,
    masteryFrom: null,
    masteryTo: null,
  };
}

function getMasteryEventNote(
  fromState: ConceptMasteryState,
  toState: ConceptMasteryState,
  locale: AppLocale,
) {
  if (toState === "solid") {
    if (locale === "zh-HK") {
      return fromState === "new"
        ? "這個概念已直接進入穩固的已儲存掌握狀態。"
        : "目前儲存下來的證據已在較強檢查中顯得穩定。";
    }

    return fromState === "new"
      ? "This concept moved straight into a solid saved state."
      : "Saved evidence now looks stable across stronger checks.";
  }

  if (toState === "shaky") {
    return locale === "zh-HK"
      ? "已經存下一次較強檢查，但再做一次會更穩固。"
      : "One stronger saved check landed, but another check would firm this up.";
  }

  if (toState === "practiced") {
    return locale === "zh-HK"
      ? "這裡已有練習紀錄，但仍未累積到較強檢查。"
      : "Practice is saved here now, but no stronger check has landed yet.";
  }

  return locale === "zh-HK"
    ? "這個概念的已儲存掌握狀態已改變。"
    : "Saved mastery changed on this concept.";
}

function buildMasteryEvent(input: {
  concept: ProgressHistoryConceptSummary;
  subject: ProgressHistorySubjectSummary | null;
  masteryFrom: ConceptMasteryState;
  masteryTo: ConceptMasteryState;
  occurredAt: string;
  locale: AppLocale;
}): ProgressHistoryEvent {
  const conceptTitle = localizeHistoryConceptTitle(input.concept, input.locale);
  const subjectTitle = localizeHistorySubjectTitle(
    input.subject?.title ?? input.concept.subject,
    input.locale,
  );

  return {
    id: buildEventId({
      kind: "mastery-updated",
      conceptSlug: input.concept.slug,
      masteryTo: input.masteryTo,
      occurredAt: input.occurredAt,
    }),
    kind: "mastery-updated",
    occurredAt: input.occurredAt,
    title: conceptTitle,
    note: getMasteryEventNote(input.masteryFrom, input.masteryTo, input.locale),
    href: localizeShareHref(`/concepts/${input.concept.slug}`, input.locale),
    conceptSlug: input.concept.slug,
    conceptTitle,
    subjectSlug: input.subject?.slug ?? null,
    subjectTitle,
    subjectPath: input.subject?.path ?? null,
    challengeId: null,
    checkpointId: null,
    trackSlug: null,
    trackTitle: null,
    masteryFrom: input.masteryFrom,
    masteryTo: input.masteryTo,
  };
}

function buildProgressHistoryEvents(input: {
  previousSnapshot: ProgressSnapshot;
  nextSnapshot: ProgressSnapshot;
  concepts: ProgressHistoryConceptSummary[];
  subjects: ProgressHistorySubjectSummary[];
  starterTracks: StarterTrackSummary[];
  recordedAt: string;
  locale: AppLocale;
}) {
  const conceptBySlug = new Map(input.concepts.map((concept) => [concept.slug, concept] as const));
  const subjectByTitle = new Map(
    input.subjects.map((subject) => [subject.title, subject] as const),
  );
  const checkpointLookup = getCheckpointLookup(input.starterTracks);
  const events: ProgressHistoryEvent[] = [];

  for (const nextRecord of Object.values(input.nextSnapshot.concepts)) {
    const concept = conceptBySlug.get(nextRecord.slug);

    if (!concept) {
      continue;
    }

    const subject = subjectByTitle.get(concept.subject) ?? null;
    const previousRecord = input.previousSnapshot.concepts[concept.slug] ?? null;
    const previousCompletedChallenges = new Set(
      Object.keys(previousRecord?.completedChallenges ?? {}),
    );

    for (const [challengeId, occurredAt] of Object.entries(
      nextRecord.completedChallenges ?? {},
    )) {
      if (previousCompletedChallenges.has(challengeId)) {
        continue;
      }

      const checkpoint = checkpointLookup.get(`${concept.slug}:${challengeId}`);

      events.push(
        checkpoint
          ? buildCheckpointEvent({
              concept,
              subject,
              checkpoint,
              challengeId,
              occurredAt,
              locale: input.locale,
            })
          : buildChallengeEvent({
              concept,
              subject,
              challengeId,
              occurredAt,
              locale: input.locale,
            }),
      );
    }

    const previousMastery = deriveConceptMasteryState(previousRecord);
    const nextMastery = deriveConceptMasteryState(nextRecord);

    if (previousMastery !== nextMastery && nextMastery !== "new") {
      events.push(
        buildMasteryEvent({
          concept,
          subject,
          masteryFrom: previousMastery,
          masteryTo: nextMastery,
          occurredAt: getConceptProgressLastActivityAt(nextRecord) ?? input.recordedAt,
          locale: input.locale,
        }),
      );
    }
  }

  return events.sort((left, right) => compareTimestampDescending(left.occurredAt, right.occurredAt));
}

export function updateProgressHistoryStore(input: {
  previousSnapshot: ProgressSnapshot;
  nextSnapshot: ProgressSnapshot;
  previousHistory?: ProgressHistoryStore | null;
  concepts: ProgressHistoryConceptSummary[];
  subjects: ProgressHistorySubjectSummary[];
  starterTracks: StarterTrackSummary[];
  recordedAt: string;
  locale?: AppLocale;
}) {
  const previousHistory = normalizeProgressHistoryStore(input.previousHistory);
  const nextEvents = buildProgressHistoryEvents({
    ...input,
    locale: input.locale ?? DEFAULT_PROGRESS_HISTORY_LOCALE,
  });
  const eventById = new Map<string, ProgressHistoryEvent>();

  for (const event of previousHistory.events) {
    eventById.set(event.id, event);
  }

  for (const event of nextEvents) {
    eventById.set(event.id, event);
  }

  const nextTimelinePoint = buildTimelinePoint({
    snapshot: input.nextSnapshot,
    concepts: input.concepts,
    subjects: input.subjects,
    starterTracks: input.starterTracks,
    recordedAt: input.recordedAt,
  });
  const masteryTimeline = [...previousHistory.masteryTimeline];
  const latestPoint = masteryTimeline[masteryTimeline.length - 1];

  if (!areTimelinePointsEqual(latestPoint, nextTimelinePoint)) {
    masteryTimeline.push(nextTimelinePoint);
  }

  return {
    version: PROGRESS_HISTORY_VERSION,
    events: [...eventById.values()]
      .sort((left, right) => compareTimestampDescending(left.occurredAt, right.occurredAt))
      .slice(0, MAX_PROGRESS_HISTORY_EVENTS),
    masteryTimeline: masteryTimeline.slice(-MAX_PROGRESS_HISTORY_TIMELINE_POINTS),
  } satisfies ProgressHistoryStore;
}

function getLatestTimelinePoint(
  history: ProgressHistoryStore,
  fallback: ProgressHistoryTimelinePoint | null,
) {
  return history.masteryTimeline[history.masteryTimeline.length - 1] ?? fallback;
}

function buildMetricCards(
  point: ProgressHistoryTimelinePoint | null,
  historyPointCount: number,
  locale: AppLocale,
) {
  return [
    {
      label: locale === "zh-HK" ? "檢查點完成" : "Checkpoint clears",
      value: `${point?.checkpointClearCount ?? 0}`,
      note:
        locale === "zh-HK"
          ? "已同步的支持者方案歷程中已儲存的檢查點完成次數。"
          : "Saved checkpoint clears in the synced Supporter history.",
    },
    {
      label: locale === "zh-HK" ? "挑戰解答" : "Challenge solves",
      value: `${point?.solvedChallengeCount ?? 0}`,
      note:
        locale === "zh-HK"
          ? "已同步裝置之間儲存的非檢查點挑戰解答。"
          : "Saved non-checkpoint challenge solves across synced devices.",
    },
    {
      label: locale === "zh-HK" ? "穩固概念" : "Solid concepts",
      value: `${point?.solidConceptCount ?? 0}`,
      note:
        locale === "zh-HK"
          ? "目前至少已有兩次較強已儲存檢查的概念。"
          : "Concepts that currently have at least two stronger saved checks.",
    },
    {
      label: locale === "zh-HK" ? "歷程節點" : "History points",
      value: `${historyPointCount}`,
      note:
        locale === "zh-HK"
          ? "為掌握度視圖保留的有限同步變化節點。"
          : "Bounded synced change points stored for the mastery view.",
    },
  ] satisfies PremiumCheckpointHistoryMetric[];
}

function getSubjectDelta(
  baseline: ProgressHistoryTimelineSubject | null,
  current: ProgressHistoryTimelineSubject,
) {
  return {
    solidDelta: current.solidConceptCount - (baseline?.solidConceptCount ?? 0),
    checkpointDelta: current.checkpointClearCount - (baseline?.checkpointClearCount ?? 0),
    challengeDelta: current.solvedChallengeCount - (baseline?.solvedChallengeCount ?? 0),
  };
}

function buildStableSubjectTrend(
  current: ProgressHistoryTimelineSubject,
  baseline: ProgressHistoryTimelineSubject | null,
  locale: AppLocale,
): PremiumCheckpointHistorySubjectTrend {
  const delta = getSubjectDelta(baseline, current);
  const statusLabel =
    delta.solidDelta > 0 || delta.challengeDelta > 0 || delta.checkpointDelta > 0
      ? "Strengthening"
      : "Stable";
  const subjectTitle = localizeHistorySubjectTitle(current.subjectTitle, locale);
  const summary =
    locale === "zh-HK"
      ? statusLabel === "Strengthening"
        ? delta.solidDelta > 0
          ? `${subjectTitle} 在已同步歷程中新增 ${delta.solidDelta} 個穩固概念。`
          : delta.checkpointDelta > 0
            ? `${subjectTitle} 在已同步歷程中新增 ${delta.checkpointDelta} 次檢查點完成。`
            : `${subjectTitle} 在已同步歷程中新增 ${delta.challengeDelta} 次挑戰解答。`
        : `${subjectTitle} 目前維持穩定的較強已儲存檢查。`
      : statusLabel === "Strengthening"
        ? delta.solidDelta > 0
          ? `${subjectTitle} added ${delta.solidDelta} solid concept${delta.solidDelta === 1 ? "" : "s"} in saved sync history.`
          : delta.checkpointDelta > 0
            ? `${subjectTitle} added ${delta.checkpointDelta} new checkpoint clear${delta.checkpointDelta === 1 ? "" : "s"} in saved sync history.`
            : `${subjectTitle} added ${delta.challengeDelta} new challenge solve${delta.challengeDelta === 1 ? "" : "s"} in saved sync history.`
        : `${subjectTitle} is holding its stronger saved checks.`;
  const detail = joinHistoryDetails(locale, [
    formatHistoryCount(locale, current.solidConceptCount, "solid concept", "solid concepts", " 個穩固概念"),
    formatHistoryCount(
      locale,
      current.checkpointClearCount,
      "checkpoint clear",
      "checkpoint clears",
      " 次檢查點完成",
    ),
    formatHistoryCount(
      locale,
      current.solvedChallengeCount,
      "challenge solve",
      "challenge solves",
      " 次挑戰解答",
    ),
  ]);

  return {
    id: `stable:${current.subjectSlug ?? current.subjectTitle}`,
    subjectSlug: current.subjectSlug,
    subjectTitle,
    subjectPath: current.subjectPath,
    statusLabel,
    summary,
    detail,
  };
}

function buildNeedsWorkSubjectTrend(
  current: ProgressHistoryTimelineSubject,
  baseline: ProgressHistoryTimelineSubject | null,
  locale: AppLocale,
): PremiumCheckpointHistorySubjectTrend {
  const delta = getSubjectDelta(baseline, current);
  const statusLabel =
    current.shakyConceptCount > 0 || current.practicedConceptCount > 0
      ? "Needs work"
      : "Building";
  const subjectTitle = localizeHistorySubjectTitle(current.subjectTitle, locale);
  const summary =
    locale === "zh-HK"
      ? current.shakyConceptCount > 0
        ? `${current.shakyConceptCount} 個概念目前只有一次較強檢查。`
        : current.practicedConceptCount > 0
          ? `${current.practicedConceptCount} 個概念仍只有練習紀錄，未有較強檢查。`
          : "這裡已有已儲存進度，但較強證據仍然偏少。"
      : current.shakyConceptCount > 0
        ? `${pluralize(current.shakyConceptCount, "concept")} only have one stronger saved check so far.`
        : current.practicedConceptCount > 0
          ? `${pluralize(current.practicedConceptCount, "concept")} still only show practice without stronger checks.`
          : "Saved progress exists here, but stronger evidence is still thin.";
  const detail = joinHistoryDetails(locale, [
    delta.solidDelta > 0
      ? locale === "zh-HK"
        ? `自首次同步以來新增 ${delta.solidDelta} 個穩固概念`
        : `+${delta.solidDelta} solid since first sync point`
      : locale === "zh-HK"
        ? "尚未有新的穩固概念"
        : "No solid gain yet",
    formatHistoryCount(
      locale,
      current.checkpointClearCount,
      "checkpoint clear",
      "checkpoint clears",
      " 次檢查點完成",
    ),
    formatHistoryCount(
      locale,
      current.solvedChallengeCount,
      "challenge solve",
      "challenge solves",
      " 次挑戰解答",
    ),
  ]);

  return {
    id: `needs-work:${current.subjectSlug ?? current.subjectTitle}`,
    subjectSlug: current.subjectSlug,
    subjectTitle,
    subjectPath: current.subjectPath,
    statusLabel,
    summary,
    detail,
  };
}

function buildConceptTrendNote(
  summary: ReturnType<typeof getConceptProgressSummary>,
  latestMasteryEvent: ProgressHistoryEvent | null,
  latestProgressEvent: ProgressHistoryEvent | null,
  locale: AppLocale,
) {
  if (latestMasteryEvent) {
    return latestMasteryEvent.note;
  }

  if (latestProgressEvent) {
    return locale === "zh-HK"
      ? `${localizeMasteryNote(summary.mastery.note, locale)} 最近一次已儲存變化：${latestProgressEvent.title}。`
      : `${summary.mastery.note} Last saved move: ${latestProgressEvent.title}.`;
  }

  return localizeMasteryNote(summary.mastery.note, locale);
}

function buildStableConceptTrend(input: {
  summary: ReturnType<typeof getConceptProgressSummary>;
  latestMasteryEvent: ProgressHistoryEvent | null;
  latestProgressEvent: ProgressHistoryEvent | null;
  locale: AppLocale;
}): PremiumCheckpointHistoryConceptTrend {
  const statusLabel = input.latestMasteryEvent ? "Strengthening" : "Stable";
  const title = localizeHistoryConceptTitle(input.summary.concept, input.locale);

  return {
    id: `stable:${input.summary.concept.slug}`,
    conceptSlug: input.summary.concept.slug,
    title,
    href: localizeShareHref(`/concepts/${input.summary.concept.slug}`, input.locale),
    masteryState: input.summary.mastery.state,
    statusLabel,
    summary:
      input.locale === "zh-HK"
        ? statusLabel === "Strengthening"
          ? "這個概念最近在已儲存掌握度上有所提升。"
          : "這個概念目前在已儲存進度中維持穩定。"
        : statusLabel === "Strengthening"
          ? "Saved mastery moved up recently."
          : "This concept is currently stable in saved progress.",
    detail: buildConceptTrendNote(
      input.summary,
      input.latestMasteryEvent,
      input.latestProgressEvent,
      input.locale,
    ),
    lastActivityAt: input.summary.lastActivityAt,
  };
}

function buildNeedsWorkConceptTrend(input: {
  summary: ReturnType<typeof getConceptProgressSummary>;
  latestProgressEvent: ProgressHistoryEvent | null;
  locale: AppLocale;
}): PremiumCheckpointHistoryConceptTrend {
  const statusLabel =
    input.summary.mastery.state === "shaky" ? "Needs work" : "Building";
  const title = localizeHistoryConceptTitle(input.summary.concept, input.locale);

  return {
    id: `needs-work:${input.summary.concept.slug}`,
    conceptSlug: input.summary.concept.slug,
    title,
    href: localizeShareHref(`/concepts/${input.summary.concept.slug}`, input.locale),
    masteryState: input.summary.mastery.state,
    statusLabel,
    summary:
      input.locale === "zh-HK"
        ? input.summary.mastery.state === "shaky"
          ? "已存下一次較強檢查，但這個概念仍需要再過一遍。"
          : "已有練習紀錄，但仍欠缺較強檢查。"
        : input.summary.mastery.state === "shaky"
          ? "One stronger check is saved, but this concept still needs another pass."
          : "Practice is saved, but stronger checks are still missing.",
    detail: buildConceptTrendNote(input.summary, null, input.latestProgressEvent, input.locale),
    lastActivityAt: input.summary.lastActivityAt,
  };
}

export function buildPremiumCheckpointHistoryView(input: {
  snapshot: ProgressSnapshot;
  history?: ProgressHistoryStore | null;
  concepts: ProgressHistoryConceptSummary[];
  subjects: ProgressHistorySubjectSummary[];
  starterTracks: StarterTrackSummary[];
  locale?: AppLocale;
}) {
  const locale = input.locale ?? DEFAULT_PROGRESS_HISTORY_LOCALE;
  const normalizedHistory = normalizeProgressHistoryStore(input.history);
  const latestSnapshotActivityAt =
    input.concepts
      .map((concept) => getConceptProgressLastActivityAt(input.snapshot.concepts[concept.slug]))
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? new Date().toISOString();
  const hasRecordedProgress = input.concepts.some((concept) => {
    return getConceptProgressSummary(input.snapshot, concept).status !== "not-started";
  });
  const fallbackTimelinePoint = hasRecordedProgress
    ? buildTimelinePoint({
        snapshot: input.snapshot,
        concepts: input.concepts,
        subjects: input.subjects,
        starterTracks: input.starterTracks,
        recordedAt: normalizedHistory.events[0]?.occurredAt ?? latestSnapshotActivityAt,
      })
    : null;
  const latestPoint = getLatestTimelinePoint(normalizedHistory, fallbackTimelinePoint);
  const baselinePoint = normalizedHistory.masteryTimeline[0] ?? latestPoint;
  const baselineSubjects = new Map(
    (baselinePoint?.subjects ?? []).map((subject) => [
      subject.subjectSlug ?? subject.subjectTitle,
      subject,
    ] as const),
  );
  const latestMasteryEventByConceptSlug = new Map<string, ProgressHistoryEvent>();
  const latestProgressEventByConceptSlug = new Map<string, ProgressHistoryEvent>();

  for (const event of normalizedHistory.events) {
    if (
      event.kind === "mastery-updated" &&
      !latestMasteryEventByConceptSlug.has(event.conceptSlug)
    ) {
      latestMasteryEventByConceptSlug.set(event.conceptSlug, event);
    }

    if (
      event.kind !== "mastery-updated" &&
      !latestProgressEventByConceptSlug.has(event.conceptSlug)
    ) {
      latestProgressEventByConceptSlug.set(event.conceptSlug, event);
    }
  }

  const currentConceptSummaries = input.concepts
    .map((concept) => getConceptProgressSummary(input.snapshot, concept))
    .filter((summary) => summary.status !== "not-started");

  const stableSubjects = (latestPoint?.subjects ?? [])
    .filter((subject) => subject.solidConceptCount > 0)
    .sort((left, right) => {
      if (left.solidConceptCount !== right.solidConceptCount) {
        return right.solidConceptCount - left.solidConceptCount;
      }

      if (left.checkpointClearCount !== right.checkpointClearCount) {
        return right.checkpointClearCount - left.checkpointClearCount;
      }

      return left.subjectTitle.localeCompare(right.subjectTitle);
    })
    .slice(0, 3)
    .map((subject) =>
      buildStableSubjectTrend(
        subject,
        baselineSubjects.get(subject.subjectSlug ?? subject.subjectTitle) ?? null,
        locale,
      ),
    );
  const needsWorkSubjects = (latestPoint?.subjects ?? [])
    .filter((subject) => subject.shakyConceptCount > 0 || subject.practicedConceptCount > 0)
    .sort((left, right) => {
      const leftPressure = left.shakyConceptCount + left.practicedConceptCount;
      const rightPressure = right.shakyConceptCount + right.practicedConceptCount;

      if (leftPressure !== rightPressure) {
        return rightPressure - leftPressure;
      }

      return left.subjectTitle.localeCompare(right.subjectTitle);
    })
    .slice(0, 3)
    .map((subject) =>
      buildNeedsWorkSubjectTrend(
        subject,
        baselineSubjects.get(subject.subjectSlug ?? subject.subjectTitle) ?? null,
        locale,
      ),
    );
  const stableConcepts = currentConceptSummaries
    .filter((summary) => summary.mastery.state === "solid")
    .sort((left, right) => {
      const leftEvent = latestMasteryEventByConceptSlug.get(left.concept.slug)?.occurredAt ?? "";
      const rightEvent =
        latestMasteryEventByConceptSlug.get(right.concept.slug)?.occurredAt ?? "";

      if (leftEvent !== rightEvent) {
        return rightEvent.localeCompare(leftEvent);
      }

      return compareTimestampDescending(left.lastActivityAt, right.lastActivityAt);
    })
    .slice(0, 3)
    .map((summary) =>
      buildStableConceptTrend({
        summary,
        latestMasteryEvent: latestMasteryEventByConceptSlug.get(summary.concept.slug) ?? null,
        latestProgressEvent: latestProgressEventByConceptSlug.get(summary.concept.slug) ?? null,
        locale,
      }),
    );
  const needsWorkConcepts = currentConceptSummaries
    .filter(
      (summary) =>
        summary.mastery.state === "shaky" || summary.mastery.state === "practiced",
    )
    .sort((left, right) => compareTimestampDescending(left.lastActivityAt, right.lastActivityAt))
    .slice(0, 3)
    .map((summary) =>
      buildNeedsWorkConceptTrend({
        summary,
        latestProgressEvent: latestProgressEventByConceptSlug.get(summary.concept.slug) ?? null,
        locale,
      }),
    );

  return {
    hasRecordedProgress,
    hasPersistedHistory:
      normalizedHistory.events.length > 0 || normalizedHistory.masteryTimeline.length > 1,
    metrics: buildMetricCards(
      latestPoint,
      normalizedHistory.masteryTimeline.length,
      locale,
    ),
    recentEvents: normalizedHistory.events.slice(0, 6),
    timeline:
      normalizedHistory.masteryTimeline.length > 0
        ? normalizedHistory.masteryTimeline.slice(-6)
        : latestPoint
          ? [latestPoint]
          : [],
    stableSubjects,
    needsWorkSubjects,
    stableConcepts,
    needsWorkConcepts,
    methodologyNote:
      locale === "zh-HK"
        ? "這個支持者方案視圖刻意保持有邊界。它會重用已同步的進度快照，並在每次有新的已儲存進度落地時，記錄精簡的跨裝置檢查點、挑戰與掌握度歷程；它不會發明隱藏分數或另一套分析後端。"
        : "This Supporter view stays bounded on purpose. It reuses the synced progress snapshot, then stores a compact cross-device checkpoint, challenge, and mastery history each time new saved progress lands. It does not invent hidden scoring or a separate analytics backend.",
  } satisfies PremiumCheckpointHistoryView;
}
