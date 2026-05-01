import type { GuidedCollectionSummary } from "@/lib/content";
import {
  GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH,
  GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH,
  resolveGuidedCollectionConceptBundle,
  type ResolvedGuidedCollectionConceptBundle,
} from "@/lib/guided/concept-bundles";

export const GUIDED_COLLECTION_ASSIGNMENT_NOTE_MAX_LENGTH = 360;
export const MAX_SAVED_ASSIGNMENTS_PER_COLLECTION = 12;

type GuidedCollectionAssignmentBase = {
  collectionSlug: string;
  title: string;
  summary: string;
  stepIds: string[];
  launchStepId?: string | null;
  teacherNote?: string | null;
};

export type GuidedCollectionAssignmentDraft = GuidedCollectionAssignmentBase & {
  id?: string | null;
};

export type GuidedCollectionAssignmentRecord = GuidedCollectionAssignmentBase & {
  id: string;
  teacherNote: string | null;
  creatorDisplayName: string;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedGuidedCollectionAssignment = ResolvedGuidedCollectionConceptBundle & {
  teacherNote: string | null;
  creatorDisplayName: string;
  createdAt: string;
  updatedAt: string;
  collectionAccent: GuidedCollectionSummary["accent"];
  collectionFormat: GuidedCollectionSummary["format"];
};

function normalizeAssignmentNote(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim().slice(
    0,
    GUIDED_COLLECTION_ASSIGNMENT_NOTE_MAX_LENGTH,
  );

  return normalized || null;
}

function normalizeCreatorDisplayName(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "Curator";
  }

  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 80);
  return normalized || "Curator";
}

function normalizeText(value: string, maxLength: number, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return normalized || fallback;
}

export function resolveGuidedCollectionAssignment(
  collection: GuidedCollectionSummary,
  input: Pick<
    GuidedCollectionAssignmentRecord,
    | "id"
    | "title"
    | "summary"
    | "stepIds"
    | "launchStepId"
    | "teacherNote"
    | "creatorDisplayName"
    | "createdAt"
    | "updatedAt"
  >,
): ResolvedGuidedCollectionAssignment | null {
  const bundle = resolveGuidedCollectionConceptBundle(collection, {
    id: input.id,
    title: normalizeText(
      input.title,
      GUIDED_COLLECTION_CONCEPT_BUNDLE_TITLE_MAX_LENGTH,
      collection.title,
    ),
    summary: normalizeText(
      input.summary,
      GUIDED_COLLECTION_CONCEPT_BUNDLE_SUMMARY_MAX_LENGTH,
      collection.summary,
    ),
    stepIds: input.stepIds,
    launchStepId: input.launchStepId ?? null,
  });

  if (!bundle) {
    return null;
  }

  return {
    ...bundle,
    teacherNote: normalizeAssignmentNote(input.teacherNote),
    creatorDisplayName: normalizeCreatorDisplayName(input.creatorDisplayName),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    collectionAccent: collection.accent,
    collectionFormat: collection.format,
  };
}
