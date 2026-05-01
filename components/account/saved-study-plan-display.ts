import type {
  ResolvedSavedStudyPlan,
  SavedStudyPlanEntryRecord,
} from "@/lib/account/study-plans";
import type {
  ConceptSummary,
  GuidedCollectionSummary,
  RecommendedGoalPathSummary,
  StarterTrackSummary,
} from "@/lib/content";
import {
  getConceptDisplayTitle,
  getGoalPathDisplayTitle,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitleFromValue,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/i18n/routing";
import { buildSavedStudyPlanProgressSummary } from "@/lib/progress";

export type StudyPlanCatalogOption = {
  key: string;
  kind: SavedStudyPlanEntryRecord["kind"];
  slug: string;
  label: string;
  detail: string;
};

export type StudyPlansTranslate = (
  key: string,
  values?: Record<string, unknown>,
) => string;

export function formatStudyPlanTimestamp(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function getStudyPlanEntryKindLabel(
  kind: SavedStudyPlanEntryRecord["kind"],
  t: StudyPlansTranslate,
) {
  switch (kind) {
    case "guided-collection":
      return t("entryKinds.guidedCollection");
    case "goal-path":
      return t("entryKinds.goalPath");
    case "track":
      return t("entryKinds.track");
    default:
      return t("entryKinds.concept");
  }
}

export function getStudyPlanStatusLabel(
  status: ReturnType<typeof buildSavedStudyPlanProgressSummary>["status"],
  t: StudyPlansTranslate,
) {
  switch (status) {
    case "completed":
      return t("status.completed");
    case "in-progress":
      return t("status.inProgress");
    default:
      return t("status.notStarted");
  }
}

export function getStudyPlanStatusTone(
  status: ReturnType<typeof buildSavedStudyPlanProgressSummary>["status"],
) {
  switch (status) {
    case "completed":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "in-progress":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

export function buildStudyPlanEntryKey(entry: SavedStudyPlanEntryRecord) {
  return `${entry.kind}:${entry.slug}`;
}

export async function readStudyPlansJsonResponse<T>(
  response: Response,
  fallbackError: string,
) {
  const payload = (await response.json().catch(() => ({}))) as
    | (T & {
        error?: string;
      })
    | {
        error?: string;
      };

  if (!response.ok) {
    throw new Error(payload.error || fallbackError);
  }

  return payload as T;
}

export function getStudyPlanEntryDisplayTitle(
  entry: ResolvedSavedStudyPlan["entries"][number],
  locale: AppLocale,
) {
  switch (entry.kind) {
    case "concept":
      return getConceptDisplayTitle(entry.concept, locale);
    case "track":
      return getStarterTrackDisplayTitle(entry.track, locale);
    case "guided-collection":
      return getGuidedCollectionDisplayTitle(entry.collection, locale);
    case "goal-path":
      return getGoalPathDisplayTitle(entry.goalPath, locale);
  }
}

export function getStudyPlanProgressNote(
  progress: ReturnType<typeof buildSavedStudyPlanProgressSummary>,
  locale: AppLocale,
  t: StudyPlansTranslate,
) {
  const nextEntry = progress.nextEntry;

  if (!nextEntry) {
    return t("notes.completed");
  }

  const entryTitle = getStudyPlanEntryDisplayTitle(nextEntry.entry, locale);

  switch (nextEntry.entry.kind) {
    case "concept":
      return t("notes.concept", { title: entryTitle });
    case "track":
      return t("notes.track", { title: entryTitle });
    case "guided-collection":
      return t("notes.guidedCollection", { title: entryTitle });
    case "goal-path":
      return t("notes.goalPath", { title: entryTitle });
    default:
      return t("notes.default");
  }
}

export function getStudyPlanPrimaryActionLabel(
  progress: ReturnType<typeof buildSavedStudyPlanProgressSummary>,
  t: StudyPlansTranslate,
) {
  const nextEntry = progress.nextEntry;

  if (!nextEntry) {
    return t("actions.reviewPlan");
  }

  switch (nextEntry.entry.kind) {
    case "concept":
      return t("actions.openConcept");
    case "track":
      return t("actions.openTrack");
    case "guided-collection":
      return t("actions.openGuidedCollection");
    case "goal-path":
      return t("actions.openGoalPath");
    default:
      return t("actions.openPlan");
  }
}

export function buildStudyPlanCatalogOptions(input: {
  concepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections: GuidedCollectionSummary[];
  recommendedGoalPaths: RecommendedGoalPathSummary[];
  locale: AppLocale;
  t: StudyPlansTranslate;
}): StudyPlanCatalogOption[] {
  const { concepts, starterTracks, guidedCollections, recommendedGoalPaths, locale, t } =
    input;

  return [
    ...concepts.map((concept) => ({
      key: `concept:${concept.slug}`,
      kind: "concept" as const,
      slug: concept.slug,
      label: getConceptDisplayTitle(concept, locale),
      detail: t("catalog.details.concept", {
        subject: getSubjectDisplayTitleFromValue(concept.subject, locale),
        topic: getTopicDisplayTitleFromValue(concept.topic, locale),
      }),
    })),
    ...starterTracks.map((track) => ({
      key: `track:${track.slug}`,
      kind: "track" as const,
      slug: track.slug,
      label: getStarterTrackDisplayTitle(track, locale),
      detail: t("catalog.details.track", {
        count: track.concepts.length,
        minutes: track.estimatedStudyMinutes,
      }),
    })),
    ...guidedCollections.map((collection) => ({
      key: `guided-collection:${collection.slug}`,
      kind: "guided-collection" as const,
      slug: collection.slug,
      label: getGuidedCollectionDisplayTitle(collection, locale),
      detail: t("catalog.details.guidedCollection", {
        count: collection.conceptCount,
        minutes: collection.estimatedStudyMinutes,
      }),
    })),
    ...recommendedGoalPaths.map((goalPath) => ({
      key: `goal-path:${goalPath.slug}`,
      kind: "goal-path" as const,
      slug: goalPath.slug,
      label: getGoalPathDisplayTitle(goalPath, locale),
      detail: t("catalog.details.goalPath", {
        count: goalPath.conceptCount,
        minutes: goalPath.estimatedStudyMinutes,
      }),
    })),
  ];
}
