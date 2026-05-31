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
  subjectFacets: StudyPlanCatalogFacet[];
  topicFacets: StudyPlanCatalogFacet[];
  conceptSlugs: string[];
  conceptCount: number;
  estimatedStudyMinutes: number;
  searchText: string;
};

export type StudyPlanCatalogFacet = {
  key: string;
  label: string;
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

function buildFacetKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCatalogFacets(
  concepts: Array<Pick<ConceptSummary, "subject" | "topic">>,
  locale: AppLocale,
) {
  const subjectFacetByKey = new Map<string, StudyPlanCatalogFacet>();
  const topicFacetByKey = new Map<string, StudyPlanCatalogFacet>();

  for (const concept of concepts) {
    const subjectKey = buildFacetKey(concept.subject);
    const topicKey = buildFacetKey(concept.topic);

    if (subjectKey && !subjectFacetByKey.has(subjectKey)) {
      subjectFacetByKey.set(subjectKey, {
        key: subjectKey,
        label: getSubjectDisplayTitleFromValue(concept.subject, locale),
      });
    }

    if (topicKey && !topicFacetByKey.has(topicKey)) {
      topicFacetByKey.set(topicKey, {
        key: topicKey,
        label: getTopicDisplayTitleFromValue(concept.topic, locale),
      });
    }
  }

  const sortFacets = (facets: StudyPlanCatalogFacet[]) =>
    facets.sort((left, right) =>
      left.label.localeCompare(right.label, locale, { sensitivity: "base" }),
    );

  return {
    subjectFacets: sortFacets(Array.from(subjectFacetByKey.values())),
    topicFacets: sortFacets(Array.from(topicFacetByKey.values())),
  };
}

function buildSearchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function buildCatalogOption(input: {
  kind: SavedStudyPlanEntryRecord["kind"];
  slug: string;
  label: string;
  detail: string;
  concepts: ConceptSummary[];
  conceptCount: number;
  estimatedStudyMinutes: number;
  extraSearchParts?: Array<string | null | undefined>;
  locale: AppLocale;
  t: StudyPlansTranslate;
}): StudyPlanCatalogOption {
  const facets = buildCatalogFacets(input.concepts, input.locale);

  return {
    key: `${input.kind}:${input.slug}`,
    kind: input.kind,
    slug: input.slug,
    label: input.label,
    detail: input.detail,
    subjectFacets: facets.subjectFacets,
    topicFacets: facets.topicFacets,
    conceptSlugs: input.concepts.map((concept) => concept.slug),
    conceptCount: input.conceptCount,
    estimatedStudyMinutes: input.estimatedStudyMinutes,
    searchText: buildSearchText([
      input.label,
      input.detail,
      input.slug,
      getStudyPlanEntryKindLabel(input.kind, input.t),
      ...facets.subjectFacets.map((facet) => facet.label),
      ...facets.topicFacets.map((facet) => facet.label),
      ...(input.extraSearchParts ?? []),
    ]),
  };
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
    ...concepts.map((concept) =>
      buildCatalogOption({
        kind: "concept",
        slug: concept.slug,
        label: getConceptDisplayTitle(concept, locale),
        detail: t("catalog.details.concept", {
          subject: getSubjectDisplayTitleFromValue(concept.subject, locale),
          topic: getTopicDisplayTitleFromValue(concept.topic, locale),
        }),
        concepts: [concept],
        conceptCount: 1,
        estimatedStudyMinutes: concept.estimatedStudyMinutes ?? 0,
        extraSearchParts: [concept.summary, concept.shortTitle, ...concept.highlights],
        locale,
        t,
      }),
    ),
    ...starterTracks.map((track) =>
      buildCatalogOption({
        kind: "track",
        slug: track.slug,
        label: getStarterTrackDisplayTitle(track, locale),
        detail: t("catalog.details.track", {
          count: track.concepts.length,
          minutes: track.estimatedStudyMinutes,
        }),
        concepts: track.concepts,
        conceptCount: track.concepts.length,
        estimatedStudyMinutes: track.estimatedStudyMinutes,
        extraSearchParts: [track.summary, ...track.highlights],
        locale,
        t,
      }),
    ),
    ...guidedCollections.map((collection) =>
      buildCatalogOption({
        kind: "guided-collection",
        slug: collection.slug,
        label: getGuidedCollectionDisplayTitle(collection, locale),
        detail: t("catalog.details.guidedCollection", {
          count: collection.conceptCount,
          minutes: collection.estimatedStudyMinutes,
        }),
        concepts: collection.concepts,
        conceptCount: collection.conceptCount,
        estimatedStudyMinutes: collection.estimatedStudyMinutes,
        extraSearchParts: [
          collection.summary,
          collection.format,
          ...collection.highlights,
          ...collection.topics.map((topic) => topic.title),
        ],
        locale,
        t,
      }),
    ),
    ...recommendedGoalPaths.map((goalPath) =>
      buildCatalogOption({
        kind: "goal-path",
        slug: goalPath.slug,
        label: getGoalPathDisplayTitle(goalPath, locale),
        detail: t("catalog.details.goalPath", {
          count: goalPath.conceptCount,
          minutes: goalPath.estimatedStudyMinutes,
        }),
        concepts: goalPath.concepts,
        conceptCount: goalPath.conceptCount,
        estimatedStudyMinutes: goalPath.estimatedStudyMinutes,
        extraSearchParts: [
          goalPath.summary,
          goalPath.objective,
          goalPath.goalKind,
          ...goalPath.highlights,
          ...goalPath.topics.map((topic) => topic.title),
        ],
        locale,
        t,
      }),
    ),
  ];
}
