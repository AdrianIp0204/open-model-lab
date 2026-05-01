import { z } from "zod";
import { normalizeCircuitDocument, type CircuitDocument } from "@/lib/circuit-builder";

export const MAX_ACCOUNT_SAVED_CIRCUITS_PER_USER = 24;
export const ACCOUNT_SAVED_CIRCUIT_TITLE_MAX_LENGTH = 80;

const savedCircuitTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(ACCOUNT_SAVED_CIRCUIT_TITLE_MAX_LENGTH);

export const accountSavedCircuitDraftSchema = z.object({
  id: z.string().uuid().optional(),
  title: savedCircuitTitleSchema,
  document: z.unknown(),
});

const accountSavedCircuitRecordSchema = accountSavedCircuitDraftSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const accountSavedCircuitDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const accountSavedCircuitRenameSchema = z.object({
  id: z.string().uuid(),
  title: savedCircuitTitleSchema,
});

export type AccountSavedCircuitDraft = {
  id?: string | null;
  title: string;
  document: CircuitDocument;
};

export type AccountSavedCircuitRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  document: CircuitDocument;
};

function sortAccountSavedCircuits(items: AccountSavedCircuitRecord[]) {
  return [...items].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function normalizeAccountSavedCircuitDraft(
  input: unknown,
): AccountSavedCircuitDraft | null {
  const parsed = accountSavedCircuitDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  try {
    return {
      id: parsed.data.id ?? null,
      title: parsed.data.title,
      document: normalizeCircuitDocument(parsed.data.document),
    };
  } catch {
    return null;
  }
}

export function normalizeAccountSavedCircuitRecord(
  input: unknown,
): AccountSavedCircuitRecord | null {
  const parsed = accountSavedCircuitRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  try {
    return {
      id: parsed.data.id,
      title: parsed.data.title,
      createdAt: parsed.data.createdAt,
      updatedAt: parsed.data.updatedAt,
      document: normalizeCircuitDocument(parsed.data.document),
    };
  } catch {
    return null;
  }
}

export function normalizeAccountSavedCircuitCollection(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as AccountSavedCircuitRecord[];
  }

  return sortAccountSavedCircuits(
    input
      .map((item) => normalizeAccountSavedCircuitRecord(item))
      .filter((item): item is AccountSavedCircuitRecord => item !== null),
  );
}
