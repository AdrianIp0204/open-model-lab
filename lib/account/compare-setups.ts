import { z } from "zod";
import type { ControlValue } from "@/lib/physics";
import {
  MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT,
  savedCompareSetupSourceTypeSchema,
  type SavedCompareSetupDraft,
  type SavedCompareSetupRecord,
  type SavedCompareSetupSourceType,
} from "@/lib/saved-compare-setups";

const compareTitleSchema = z.string().trim().min(1).max(80);
const compareLabelSchema = z.string().trim().min(1).max(48);
const conceptIdentitySchema = z.string().trim().min(1).max(160);
const conceptTitleSchema = z.string().trim().min(1).max(160);
const optionalIdSchema = z.string().trim().min(1).max(160).nullable();
const optionalStateParamSchema = z.string().trim().min(1).max(2400).nullable();
const controlValueSchema = z.union([
  z.number().finite(),
  z.boolean(),
  z.string().max(240),
]);
const controlValueRecordSchema = z.record(
  z.string().min(1).max(160),
  controlValueSchema,
);
const overlayValueRecordSchema = z
  .record(z.string().min(1).max(160), z.boolean())
  .default({});

export type SavedCompareSetupState = {
  label: string;
  params: Record<string, ControlValue>;
  activePresetId: string | null;
};

export type SavedCompareSnapshot = {
  activeTarget: "a" | "b";
  setupA: SavedCompareSetupState;
  setupB: SavedCompareSetupState;
};

export type LegacySavedCompareSetupDraft = {
  conceptId: string;
  conceptSlug: string;
  name: string;
  activeGraphId: string | null;
  overlayValues: Record<string, boolean>;
  compare: SavedCompareSnapshot;
};

export type SavedCompareSetupRenameInput = {
  conceptSlug: string;
  id: string;
  title: string;
};

const savedCompareSetupStateSchema = z.object({
  label: compareLabelSchema,
  params: controlValueRecordSchema,
  activePresetId: optionalIdSchema,
});

const savedCompareSnapshotSchema = z.object({
  activeTarget: z.enum(["a", "b"]),
  setupA: savedCompareSetupStateSchema,
  setupB: savedCompareSetupStateSchema,
});

export const savedCompareSetupLegacyDraftSchema = z.object({
  conceptId: conceptIdentitySchema,
  conceptSlug: conceptIdentitySchema,
  name: compareTitleSchema,
  activeGraphId: optionalIdSchema.optional(),
  overlayValues: overlayValueRecordSchema.optional(),
  compare: savedCompareSnapshotSchema,
});

export const savedCompareSetupDraftSchema = z.object({
  conceptId: conceptIdentitySchema,
  conceptSlug: conceptIdentitySchema,
  conceptTitle: conceptTitleSchema,
  title: compareTitleSchema,
  stateParam: optionalStateParamSchema.refine(
    (value): value is string => typeof value === "string" && value.length > 0,
    {
      message: "Compare setup state is required.",
    },
  ),
  publicExperimentParam: optionalStateParamSchema.optional(),
  setupALabel: compareLabelSchema,
  setupBLabel: compareLabelSchema,
  sourceType: savedCompareSetupSourceTypeSchema.default("manual"),
});

export const savedCompareSetupDeleteSchema = z.object({
  conceptSlug: conceptIdentitySchema,
  id: z.string().uuid(),
});

export const savedCompareSetupRenameSchema = z.object({
  conceptSlug: conceptIdentitySchema,
  id: z.string().uuid(),
  title: compareTitleSchema,
});

export function normalizeLegacySavedCompareSetupDraft(
  input: unknown,
): LegacySavedCompareSetupDraft | null {
  const parsed = savedCompareSetupLegacyDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    conceptId: parsed.data.conceptId,
    conceptSlug: parsed.data.conceptSlug,
    name: parsed.data.name,
    activeGraphId: parsed.data.activeGraphId ?? null,
    overlayValues: parsed.data.overlayValues ?? {},
    compare: parsed.data.compare,
  };
}

export function normalizeSavedCompareSetupDraft(
  input: unknown,
): SavedCompareSetupDraft | null {
  const parsed = savedCompareSetupDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    conceptId: parsed.data.conceptId,
    conceptSlug: parsed.data.conceptSlug,
    conceptTitle: parsed.data.conceptTitle,
    title: parsed.data.title,
    stateParam: parsed.data.stateParam,
    publicExperimentParam: parsed.data.publicExperimentParam ?? null,
    setupALabel: parsed.data.setupALabel,
    setupBLabel: parsed.data.setupBLabel,
    sourceType: parsed.data.sourceType as SavedCompareSetupSourceType,
  };
}

export {
  MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT,
  type SavedCompareSetupDraft,
  type SavedCompareSetupRecord,
  type SavedCompareSetupSourceType,
};
