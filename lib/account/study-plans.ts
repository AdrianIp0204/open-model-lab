import { z } from "zod";
import {
  getConceptBySlug,
  getGuidedCollectionBySlug,
  getRecommendedGoalPathBySlug,
  getStarterTrackBySlug,
  type ConceptSummary,
  type GuidedCollectionSummary,
  type RecommendedGoalPathSummary,
  type StarterTrackSummary,
} from "@/lib/content";

export const MAX_SAVED_STUDY_PLANS_PER_USER = 12;
export const MAX_SAVED_STUDY_PLAN_ENTRIES = 16;
export const SAVED_STUDY_PLAN_TITLE_MAX_LENGTH = 80;
export const SAVED_STUDY_PLAN_SUMMARY_MAX_LENGTH = 240;

const studyPlanTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(SAVED_STUDY_PLAN_TITLE_MAX_LENGTH);
const studyPlanSummarySchema = z
  .string()
  .trim()
  .max(SAVED_STUDY_PLAN_SUMMARY_MAX_LENGTH)
  .nullable();
const studyPlanSlugSchema = z.string().trim().min(1).max(160);

const savedStudyPlanEntrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("concept"),
    slug: studyPlanSlugSchema,
  }),
  z.object({
    kind: z.literal("track"),
    slug: studyPlanSlugSchema,
  }),
  z.object({
    kind: z.literal("guided-collection"),
    slug: studyPlanSlugSchema,
  }),
  z.object({
    kind: z.literal("goal-path"),
    slug: studyPlanSlugSchema,
  }),
]);

const savedStudyPlanEntriesSchema = z
  .array(savedStudyPlanEntrySchema)
  .min(1)
  .max(MAX_SAVED_STUDY_PLAN_ENTRIES)
  .superRefine((entries, ctx) => {
    const seen = new Set<string>();

    for (const [index, entry] of entries.entries()) {
      const key = `${entry.kind}:${entry.slug}`;

      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate study plan entry "${key}".`,
          path: [index],
        });
      }

      seen.add(key);
    }
  });

export const savedStudyPlanDraftSchema = z.object({
  id: z.string().uuid().optional(),
  title: studyPlanTitleSchema,
  summary: studyPlanSummarySchema.optional(),
  entries: savedStudyPlanEntriesSchema,
});

const savedStudyPlanRecordSchema = savedStudyPlanDraftSchema.extend({
  id: z.string().uuid(),
  summary: studyPlanSummarySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const savedStudyPlanDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type SavedStudyPlanEntryRecord = z.infer<typeof savedStudyPlanEntrySchema>;
export type SavedStudyPlanDraft = {
  id?: string | null;
  title: string;
  summary: string | null;
  entries: SavedStudyPlanEntryRecord[];
};
export type SavedStudyPlanRecord = z.infer<typeof savedStudyPlanRecordSchema>;

type ResolvedSavedStudyPlanEntryBase = {
  key: string;
  kind: SavedStudyPlanEntryRecord["kind"];
  slug: string;
  title: string;
  summary: string;
  href: string;
  conceptSlugs: ConceptSummary["slug"][];
  concepts: ConceptSummary[];
  conceptCount: number;
  estimatedStudyMinutes: number;
};

export type ResolvedSavedStudyPlanConceptEntry = ResolvedSavedStudyPlanEntryBase & {
  kind: "concept";
  concept: ConceptSummary;
};

export type ResolvedSavedStudyPlanTrackEntry = ResolvedSavedStudyPlanEntryBase & {
  kind: "track";
  track: StarterTrackSummary;
};

export type ResolvedSavedStudyPlanGuidedCollectionEntry =
  ResolvedSavedStudyPlanEntryBase & {
    kind: "guided-collection";
    collection: GuidedCollectionSummary;
  };

export type ResolvedSavedStudyPlanGoalPathEntry = ResolvedSavedStudyPlanEntryBase & {
  kind: "goal-path";
  goalPath: RecommendedGoalPathSummary;
};

export type ResolvedSavedStudyPlanEntry =
  | ResolvedSavedStudyPlanConceptEntry
  | ResolvedSavedStudyPlanTrackEntry
  | ResolvedSavedStudyPlanGuidedCollectionEntry
  | ResolvedSavedStudyPlanGoalPathEntry;

export type ResolvedSavedStudyPlan = {
  id: string;
  title: string;
  summary: string | null;
  entries: ResolvedSavedStudyPlanEntry[];
  concepts: ConceptSummary[];
  conceptSlugs: ConceptSummary["slug"][];
  conceptCount: number;
  estimatedStudyMinutes: number;
  createdAt: string;
  updatedAt: string;
};

function normalizeStudyPlanSummary(summary: string | null | undefined) {
  const trimmedSummary = summary?.trim() ?? "";

  return trimmedSummary.length ? trimmedSummary : null;
}

function sortSavedStudyPlans(items: SavedStudyPlanRecord[]) {
  return [...items].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function normalizeSavedStudyPlanDraft(input: unknown): SavedStudyPlanDraft | null {
  const parsed = savedStudyPlanDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    id: parsed.data.id ?? null,
    title: parsed.data.title,
    summary: normalizeStudyPlanSummary(parsed.data.summary),
    entries: parsed.data.entries.map((entry) => ({
      kind: entry.kind,
      slug: entry.slug,
    })),
  };
}

export function normalizeSavedStudyPlanRecord(input: unknown): SavedStudyPlanRecord | null {
  const parsed = savedStudyPlanRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    summary: normalizeStudyPlanSummary(parsed.data.summary),
    entries: parsed.data.entries.map((entry) => ({
      kind: entry.kind,
      slug: entry.slug,
    })),
  };
}

export function normalizeSavedStudyPlanCollection(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as SavedStudyPlanRecord[];
  }

  return sortSavedStudyPlans(
    input
      .map((item) => normalizeSavedStudyPlanRecord(item))
      .filter((item): item is SavedStudyPlanRecord => item !== null),
  );
}

function buildEntryKey(entry: SavedStudyPlanEntryRecord) {
  return `${entry.kind}:${entry.slug}`;
}

function resolveSavedStudyPlanEntry(
  entry: SavedStudyPlanEntryRecord,
): ResolvedSavedStudyPlanEntry {
  if (entry.kind === "concept") {
    const concept = getConceptBySlug(entry.slug);

    return {
      key: buildEntryKey(entry),
      kind: "concept",
      slug: concept.slug,
      title: concept.title,
      summary: concept.summary,
      href: `/concepts/${concept.slug}`,
      conceptSlugs: [concept.slug],
      concepts: [concept],
      conceptCount: 1,
      estimatedStudyMinutes: concept.estimatedStudyMinutes ?? 0,
      concept,
    };
  }

  if (entry.kind === "track") {
    const track = getStarterTrackBySlug(entry.slug);

    return {
      key: buildEntryKey(entry),
      kind: "track",
      slug: track.slug,
      title: track.title,
      summary: track.summary,
      href: `/tracks/${track.slug}`,
      conceptSlugs: [...track.conceptSlugs],
      concepts: [...track.concepts],
      conceptCount: track.concepts.length,
      estimatedStudyMinutes: track.estimatedStudyMinutes,
      track,
    };
  }

  if (entry.kind === "guided-collection") {
    const collection = getGuidedCollectionBySlug(entry.slug);

    return {
      key: buildEntryKey(entry),
      kind: "guided-collection",
      slug: collection.slug,
      title: collection.title,
      summary: collection.summary,
      href: collection.path,
      conceptSlugs: [...collection.conceptSlugs],
      concepts: [...collection.concepts],
      conceptCount: collection.conceptCount,
      estimatedStudyMinutes: collection.estimatedStudyMinutes,
      collection,
    };
  }

  const goalPath = getRecommendedGoalPathBySlug(entry.slug);

  return {
    key: buildEntryKey(entry),
    kind: "goal-path",
    slug: goalPath.slug,
    title: goalPath.title,
    summary: goalPath.summary,
    href: goalPath.path,
    conceptSlugs: [...goalPath.conceptSlugs],
    concepts: [...goalPath.concepts],
    conceptCount: goalPath.conceptCount,
    estimatedStudyMinutes: goalPath.estimatedStudyMinutes,
    goalPath,
  };
}

export function resolveSavedStudyPlanRecord(
  record: SavedStudyPlanRecord,
): ResolvedSavedStudyPlan | null {
  try {
    const entries = record.entries.map((entry) => resolveSavedStudyPlanEntry(entry));
    const conceptBySlug = new Map<ConceptSummary["slug"], ConceptSummary>();

    for (const entry of entries) {
      for (const concept of entry.concepts) {
        conceptBySlug.set(concept.slug, concept);
      }
    }

    return {
      id: record.id,
      title: record.title,
      summary: record.summary,
      entries,
      concepts: Array.from(conceptBySlug.values()),
      conceptSlugs: Array.from(conceptBySlug.keys()),
      conceptCount: conceptBySlug.size,
      estimatedStudyMinutes: entries.reduce(
        (sum, entry) => sum + entry.estimatedStudyMinutes,
        0,
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  } catch {
    return null;
  }
}
