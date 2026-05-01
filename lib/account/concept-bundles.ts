import { z } from "zod";
import {
  GUIDED_COLLECTION_CONCEPT_BUNDLE_MAX_STEP_COUNT,
  GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH,
  GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH,
  MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION,
  type GuidedCollectionConceptBundleDraft,
  type GuidedCollectionConceptBundleRecord,
} from "@/lib/guided/concept-bundles";

const collectionSlugSchema = z.string().trim().min(1).max(160);
const bundleTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH);
const bundleSummarySchema = z
  .string()
  .trim()
  .min(1)
  .max(GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH);
const stepIdSchema = z.string().trim().min(1).max(160);
const launchStepIdSchema = z.string().trim().min(1).max(160).nullable();

const bundleStepIdsSchema = z
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

export const savedConceptBundleDraftSchema = z.object({
  collectionSlug: collectionSlugSchema,
  title: bundleTitleSchema,
  summary: bundleSummarySchema,
  stepIds: bundleStepIdsSchema,
  launchStepId: launchStepIdSchema.optional(),
});

const savedConceptBundleRecordSchema = savedConceptBundleDraftSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const savedConceptBundleDeleteSchema = z.object({
  collectionSlug: collectionSlugSchema,
  id: z.string().uuid(),
});

export function normalizeSavedConceptBundleDraft(
  input: unknown,
): GuidedCollectionConceptBundleDraft | null {
  const parsed = savedConceptBundleDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    collectionSlug: parsed.data.collectionSlug,
    title: parsed.data.title,
    summary: parsed.data.summary,
    stepIds: parsed.data.stepIds,
    launchStepId: parsed.data.launchStepId ?? null,
  };
}

export function normalizeSavedConceptBundleRecord(
  input: unknown,
): GuidedCollectionConceptBundleRecord | null {
  const parsed = savedConceptBundleRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    launchStepId: parsed.data.launchStepId ?? null,
  };
}

export function sortSavedConceptBundles(items: GuidedCollectionConceptBundleRecord[]) {
  return [...items].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function normalizeSavedConceptBundleCollection(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as GuidedCollectionConceptBundleRecord[];
  }

  return sortSavedConceptBundles(
    input
      .map((item) => normalizeSavedConceptBundleRecord(item))
      .filter((item): item is GuidedCollectionConceptBundleRecord => item !== null),
  );
}

export function normalizeSavedConceptBundleTitleKey(title: string) {
  return title.trim().toLowerCase();
}

export function matchesSavedConceptBundleCollection(
  item: Pick<GuidedCollectionConceptBundleRecord, "collectionSlug">,
  collectionSlug: string,
) {
  return item.collectionSlug === collectionSlug;
}

export { MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION };
export type { GuidedCollectionConceptBundleDraft, GuidedCollectionConceptBundleRecord };
