import { z } from "zod";
import {
  GUIDED_COLLECTION_ASSIGNMENT_NOTE_MAX_LENGTH,
  MAX_SAVED_ASSIGNMENTS_PER_COLLECTION,
  type GuidedCollectionAssignmentDraft,
  type GuidedCollectionAssignmentRecord,
} from "@/lib/guided/assignments";
import {
  GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_STEP_COUNT,
  GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH,
  GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH,
} from "@/lib/guided/concept-bundles";

const collectionSlugSchema = z.string().trim().min(1).max(160);
const assignmentTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH);
const assignmentSummarySchema = z
  .string()
  .trim()
  .min(1)
  .max(GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH);
const stepIdSchema = z.string().trim().min(1).max(160);
const launchStepIdSchema = z.string().trim().min(1).max(160).nullable();
const teacherNoteSchema = z
  .string()
  .trim()
  .max(GUIDED_COLLECTION_ASSIGNMENT_NOTE_MAX_LENGTH)
  .nullable();
const creatorDisplayNameSchema = z.string().trim().min(1).max(80);

const assignmentStepIdsSchema = z
  .array(stepIdSchema)
  .min(1)
  .max(GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_STEP_COUNT)
  .superRefine((stepIds, ctx) => {
    const seen = new Set<string>();

    for (const [index, stepId] of stepIds.entries()) {
      if (seen.has(stepId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate step id "${stepId}".`,
          path: [index],
        });
      }

      seen.add(stepId);
    }
  });

export const savedAssignmentDraftSchema = z.object({
  id: z.string().uuid().optional(),
  collectionSlug: collectionSlugSchema,
  title: assignmentTitleSchema,
  summary: assignmentSummarySchema,
  stepIds: assignmentStepIdsSchema,
  launchStepId: launchStepIdSchema.optional(),
  teacherNote: teacherNoteSchema.optional(),
});

const savedAssignmentRecordSchema = savedAssignmentDraftSchema.extend({
  id: z.string().uuid(),
  teacherNote: teacherNoteSchema,
  creatorDisplayName: creatorDisplayNameSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const savedAssignmentDeleteSchema = z.object({
  collectionSlug: collectionSlugSchema,
  id: z.string().uuid(),
});

export function normalizeSavedAssignmentDraft(
  input: unknown,
): GuidedCollectionAssignmentDraft | null {
  const parsed = savedAssignmentDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    id: parsed.data.id ?? null,
    collectionSlug: parsed.data.collectionSlug,
    title: parsed.data.title,
    summary: parsed.data.summary,
    stepIds: parsed.data.stepIds,
    launchStepId: parsed.data.launchStepId ?? null,
    teacherNote: parsed.data.teacherNote ?? null,
  };
}

export function normalizeSavedAssignmentRecord(
  input: unknown,
): GuidedCollectionAssignmentRecord | null {
  const parsed = savedAssignmentRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    launchStepId: parsed.data.launchStepId ?? null,
    teacherNote: parsed.data.teacherNote ?? null,
  };
}

export function sortSavedAssignments(items: GuidedCollectionAssignmentRecord[]) {
  return [...items].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function normalizeSavedAssignmentCollection(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as GuidedCollectionAssignmentRecord[];
  }

  return sortSavedAssignments(
    input
      .map((item) => normalizeSavedAssignmentRecord(item))
      .filter((item): item is GuidedCollectionAssignmentRecord => item !== null),
  );
}

export function matchesSavedAssignmentCollection(
  item: Pick<GuidedCollectionAssignmentRecord, "collectionSlug">,
  collectionSlug: string,
) {
  return item.collectionSlug === collectionSlug;
}

export { MAX_SAVED_ASSIGNMENTS_PER_COLLECTION };
export type { GuidedCollectionAssignmentDraft, GuidedCollectionAssignmentRecord };
