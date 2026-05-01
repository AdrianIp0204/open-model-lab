import { z } from "zod";

export const SAVED_COMPARE_SETUPS_STORAGE_KEY =
  "open-model-lab.saved-compare-setups.v1";
export const ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE = "__anonymous__";
export const MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT = 12;

const savedCompareSetupTitleSchema = z.string().trim().min(1).max(80);
const savedCompareSetupConceptIdentitySchema = z.string().trim().min(1).max(160);
const savedCompareSetupConceptTitleSchema = z.string().trim().min(1).max(160);
const savedCompareSetupLabelSchema = z.string().trim().min(1).max(48);
const optionalSavedCompareSetupQueryParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(2400)
  .nullable();
const savedCompareSetupFingerprintSchema = z.string().trim().min(1).max(400);

export const savedCompareSetupSourceTypeSchema = z.enum([
  "manual",
  "preset-derived",
  "imported-from-link",
]);

export type SavedCompareSetupSourceType = z.infer<
  typeof savedCompareSetupSourceTypeSchema
>;

export type SavedCompareSetupDraft = {
  conceptId: string;
  conceptSlug: string;
  conceptTitle: string;
  title: string;
  stateParam: string;
  publicExperimentParam: string | null;
  setupALabel: string;
  setupBLabel: string;
  sourceType: SavedCompareSetupSourceType;
};

export type SavedCompareSetupRecord = SavedCompareSetupDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type SavedCompareSetupTombstoneRecord = {
  fingerprint: string;
  deletedAt: string;
};

export type SavedCompareSetupsSnapshot = {
  version: "v1";
  items: SavedCompareSetupRecord[];
  tombstones: SavedCompareSetupTombstoneRecord[];
};

export type SavedCompareSetupsLocalCache = {
  version: "v1";
  scopedSnapshots: Record<string, SavedCompareSetupsSnapshot>;
};

export type SavedCompareSetupsMergeSummary = {
  localSetupCount: number;
  remoteSetupCount: number;
  mergedSetupCount: number;
  importedLocalSetupCount: number;
  importedRemoteSetupCount: number;
  dedupedDuplicateCount: number;
  deletedByTombstoneCount: number;
};

type SavedCompareSetupMutationResult = {
  snapshot: SavedCompareSetupsSnapshot;
  savedSetup: SavedCompareSetupRecord;
  status: "created" | "existing" | "updated";
};

const savedCompareSetupDraftSchema = z.object({
  conceptId: savedCompareSetupConceptIdentitySchema,
  conceptSlug: savedCompareSetupConceptIdentitySchema,
  conceptTitle: savedCompareSetupConceptTitleSchema,
  title: savedCompareSetupTitleSchema,
  stateParam: optionalSavedCompareSetupQueryParamSchema.refine(
    (value): value is string => typeof value === "string" && value.length > 0,
    {
      message: "Compare setup state is required.",
    },
  ),
  publicExperimentParam: optionalSavedCompareSetupQueryParamSchema,
  setupALabel: savedCompareSetupLabelSchema,
  setupBLabel: savedCompareSetupLabelSchema,
  sourceType: savedCompareSetupSourceTypeSchema,
});

const savedCompareSetupRecordSchema = savedCompareSetupDraftSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime().nullable(),
});

const savedCompareSetupTombstoneRecordSchema = z.object({
  fingerprint: savedCompareSetupFingerprintSchema,
  deletedAt: z.string().datetime(),
});

const savedCompareSetupsSnapshotSchema = z.object({
  version: z.literal("v1"),
  items: z.array(savedCompareSetupRecordSchema).default([]),
  tombstones: z.array(savedCompareSetupTombstoneRecordSchema).default([]),
});

const savedCompareSetupsLocalCacheSchema = z.object({
  version: z.literal("v1"),
  scopedSnapshots: z.record(z.string().min(1).max(320), z.unknown()).default({}),
});

const EMPTY_SAVED_COMPARE_SETUPS_SNAPSHOT: SavedCompareSetupsSnapshot = {
  version: "v1",
  items: [],
  tombstones: [],
};

function maxTimestamp(left?: string | null, right?: string | null) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  return left >= right ? left : right;
}

function minTimestamp(left?: string | null, right?: string | null) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  return left <= right ? left : right;
}

function compareSavedCompareSetupMetadataPreference(
  left: SavedCompareSetupRecord,
  right: SavedCompareSetupRecord,
) {
  if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt.localeCompare(right.updatedAt);
  }

  if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return right.id.localeCompare(left.id);
}

function pickPreferredSavedCompareSetupRecord(
  left: SavedCompareSetupRecord,
  right: SavedCompareSetupRecord,
) {
  return compareSavedCompareSetupMetadataPreference(left, right) >= 0 ? left : right;
}

function compareSavedCompareSetupTimestamps(
  left: SavedCompareSetupRecord,
  right: SavedCompareSetupRecord,
) {
  const leftPrimary = left.lastOpenedAt ?? left.updatedAt;
  const rightPrimary = right.lastOpenedAt ?? right.updatedAt;

  if (leftPrimary !== rightPrimary) {
    return rightPrimary.localeCompare(leftPrimary);
  }

  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  return left.title.localeCompare(right.title, undefined, {
    sensitivity: "base",
  });
}

function compareSavedCompareSetupTombstones(
  left: SavedCompareSetupTombstoneRecord,
  right: SavedCompareSetupTombstoneRecord,
) {
  if (left.deletedAt !== right.deletedAt) {
    return right.deletedAt.localeCompare(left.deletedAt);
  }

  return left.fingerprint.localeCompare(right.fingerprint, undefined, {
    sensitivity: "base",
  });
}

function mergeSavedCompareSetupRecords(
  left: SavedCompareSetupRecord,
  right: SavedCompareSetupRecord,
) {
  const preferred = pickPreferredSavedCompareSetupRecord(left, right);

  return {
    ...preferred,
    conceptId: preferred.conceptId || right.conceptId || left.conceptId,
    conceptSlug: preferred.conceptSlug || right.conceptSlug || left.conceptSlug,
    conceptTitle: preferred.conceptTitle || right.conceptTitle || left.conceptTitle,
    title: preferred.title || right.title || left.title,
    stateParam: preferred.stateParam || right.stateParam || left.stateParam,
    publicExperimentParam:
      preferred.publicExperimentParam ??
      right.publicExperimentParam ??
      left.publicExperimentParam ??
      null,
    setupALabel: preferred.setupALabel || right.setupALabel || left.setupALabel,
    setupBLabel: preferred.setupBLabel || right.setupBLabel || left.setupBLabel,
    sourceType: preferred.sourceType ?? right.sourceType ?? left.sourceType,
    createdAt: minTimestamp(left.createdAt, right.createdAt) ?? preferred.createdAt,
    updatedAt: maxTimestamp(left.updatedAt, right.updatedAt) ?? preferred.updatedAt,
    lastOpenedAt: maxTimestamp(left.lastOpenedAt, right.lastOpenedAt),
  } satisfies SavedCompareSetupRecord;
}

function mergeSavedCompareSetupTombstones(
  left: SavedCompareSetupTombstoneRecord,
  right: SavedCompareSetupTombstoneRecord,
) {
  return {
    fingerprint: left.fingerprint,
    deletedAt: maxTimestamp(left.deletedAt, right.deletedAt) ?? left.deletedAt,
  } satisfies SavedCompareSetupTombstoneRecord;
}

function createCanonicalSavedCompareSetupsSnapshot(input: {
  items: SavedCompareSetupRecord[];
  tombstones: SavedCompareSetupTombstoneRecord[];
}) {
  const itemsByFingerprint = new Map<string, SavedCompareSetupRecord>();
  const tombstonesByFingerprint = new Map<string, SavedCompareSetupTombstoneRecord>();
  let dedupedDuplicateCount = 0;
  let deletedByTombstoneCount = 0;

  for (const item of input.items) {
    const fingerprint = buildSavedCompareSetupFingerprint(item);
    const current = itemsByFingerprint.get(fingerprint);

    if (!current) {
      itemsByFingerprint.set(fingerprint, item);
      continue;
    }

    dedupedDuplicateCount += 1;
    itemsByFingerprint.set(
      fingerprint,
      mergeSavedCompareSetupRecords(current, item),
    );
  }

  for (const tombstone of input.tombstones) {
    const current = tombstonesByFingerprint.get(tombstone.fingerprint);

    if (!current) {
      tombstonesByFingerprint.set(tombstone.fingerprint, tombstone);
      continue;
    }

    tombstonesByFingerprint.set(
      tombstone.fingerprint,
      mergeSavedCompareSetupTombstones(current, tombstone),
    );
  }

  const nextItems: SavedCompareSetupRecord[] = [];

  for (const [fingerprint, item] of itemsByFingerprint) {
    const tombstone = tombstonesByFingerprint.get(fingerprint);

    if (tombstone && item.updatedAt <= tombstone.deletedAt) {
      deletedByTombstoneCount += 1;
      continue;
    }

    if (tombstone) {
      tombstonesByFingerprint.delete(fingerprint);
    }

    nextItems.push(item);
  }

  return {
    snapshot: {
      version: "v1",
      items: sortSavedCompareSetups(nextItems),
      tombstones: sortSavedCompareSetupTombstones([
        ...tombstonesByFingerprint.values(),
      ]),
    } satisfies SavedCompareSetupsSnapshot,
    dedupedDuplicateCount,
    deletedByTombstoneCount,
  };
}

export function createEmptySavedCompareSetupsSnapshot(): SavedCompareSetupsSnapshot {
  return {
    version: "v1",
    items: [],
    tombstones: [],
  };
}

export function createEmptySavedCompareSetupsLocalCache(): SavedCompareSetupsLocalCache {
  return {
    version: "v1",
    scopedSnapshots: {},
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
    ...parsed.data,
    publicExperimentParam: parsed.data.publicExperimentParam ?? null,
  };
}

export function normalizeSavedCompareSetupRecord(
  input: unknown,
): SavedCompareSetupRecord | null {
  const parsed = savedCompareSetupRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    publicExperimentParam: parsed.data.publicExperimentParam ?? null,
    lastOpenedAt: parsed.data.lastOpenedAt ?? null,
  };
}

export function normalizeSavedCompareSetupTombstoneRecord(
  input: unknown,
): SavedCompareSetupTombstoneRecord | null {
  const parsed = savedCompareSetupTombstoneRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function sortSavedCompareSetups(items: SavedCompareSetupRecord[]) {
  return [...items].sort(compareSavedCompareSetupTimestamps);
}

export function sortSavedCompareSetupTombstones(
  items: SavedCompareSetupTombstoneRecord[],
) {
  return [...items].sort(compareSavedCompareSetupTombstones);
}

export function normalizeSavedCompareSetupsSnapshot(
  input: unknown,
): SavedCompareSetupsSnapshot {
  const parsed = savedCompareSetupsSnapshotSchema.safeParse(input);

  if (!parsed.success) {
    return createEmptySavedCompareSetupsSnapshot();
  }

  return createCanonicalSavedCompareSetupsSnapshot({
    items: parsed.data.items
      .map((item) => normalizeSavedCompareSetupRecord(item))
      .filter((item): item is SavedCompareSetupRecord => item !== null),
    tombstones: parsed.data.tombstones
      .map((item) => normalizeSavedCompareSetupTombstoneRecord(item))
      .filter((item): item is SavedCompareSetupTombstoneRecord => item !== null),
  }).snapshot;
}

export function normalizeSavedCompareSetupsLocalCache(
  input: unknown,
): SavedCompareSetupsLocalCache {
  const parsed = savedCompareSetupsLocalCacheSchema.safeParse(input);

  if (!parsed.success) {
    return createEmptySavedCompareSetupsLocalCache();
  }

  const scopedSnapshots = Object.fromEntries(
    Object.entries(parsed.data.scopedSnapshots)
      .map(
        ([scopeKey, snapshot]) =>
          [scopeKey, normalizeSavedCompareSetupsSnapshot(snapshot)] as const,
      )
      .filter((entry) => hasSavedCompareSetupsSnapshotData(entry[1])),
  );

  return {
    version: "v1",
    scopedSnapshots,
  };
}

export function getSavedCompareSetupsSnapshotForScope(
  cache: SavedCompareSetupsLocalCache,
  scopeKey: string,
) {
  return cache.scopedSnapshots[scopeKey] ?? EMPTY_SAVED_COMPARE_SETUPS_SNAPSHOT;
}

export function setSavedCompareSetupsSnapshotForScope(
  cache: SavedCompareSetupsLocalCache,
  scopeKey: string,
  snapshot: SavedCompareSetupsSnapshot,
) {
  const nextCache = {
    version: "v1",
    scopedSnapshots: { ...cache.scopedSnapshots },
  } satisfies SavedCompareSetupsLocalCache;

  if (hasSavedCompareSetupsSnapshotData(snapshot)) {
    nextCache.scopedSnapshots[scopeKey] = normalizeSavedCompareSetupsSnapshot(snapshot);
  } else {
    delete nextCache.scopedSnapshots[scopeKey];
  }

  return nextCache;
}

export function hasSavedCompareSetupsSnapshotData(
  snapshot: SavedCompareSetupsSnapshot,
) {
  return snapshot.items.length > 0 || snapshot.tombstones.length > 0;
}

export function buildSavedCompareSetupFingerprint(
  input: Pick<SavedCompareSetupDraft, "conceptSlug" | "stateParam">,
) {
  return `${input.conceptSlug}::${input.stateParam}`;
}

export function buildSavedCompareSetupTombstone(
  input: Pick<SavedCompareSetupRecord, "conceptSlug" | "stateParam">,
  deletedAt: string,
): SavedCompareSetupTombstoneRecord {
  return {
    fingerprint: buildSavedCompareSetupFingerprint(input),
    deletedAt,
  };
}

export function listSavedCompareSetupsForConcept(
  snapshot: SavedCompareSetupsSnapshot,
  conceptSlug: string,
) {
  return snapshot.items.filter((item) => item.conceptSlug === conceptSlug);
}

export function saveSavedCompareSetupToSnapshot(
  snapshot: SavedCompareSetupsSnapshot,
  draft: SavedCompareSetupDraft,
  nowIso = new Date().toISOString(),
): SavedCompareSetupMutationResult {
  const normalizedSnapshot = normalizeSavedCompareSetupsSnapshot(snapshot);
  const fingerprint = buildSavedCompareSetupFingerprint(draft);
  const existing = normalizedSnapshot.items.find(
    (item) => buildSavedCompareSetupFingerprint(item) === fingerprint,
  );
  const conceptItems = listSavedCompareSetupsForConcept(
    normalizedSnapshot,
    draft.conceptSlug,
  );
  const nextTombstones = normalizedSnapshot.tombstones.filter(
    (item) => item.fingerprint !== fingerprint,
  );

  if (existing) {
    const updatedRecord = {
      ...existing,
      conceptTitle: draft.conceptTitle,
      publicExperimentParam:
        existing.publicExperimentParam ?? draft.publicExperimentParam ?? null,
      setupALabel: draft.setupALabel,
      setupBLabel: draft.setupBLabel,
      updatedAt: nowIso,
    } satisfies SavedCompareSetupRecord;

    return {
      snapshot: normalizeSavedCompareSetupsSnapshot({
        version: "v1",
        items: normalizedSnapshot.items.map((item) =>
          item.id === existing.id ? updatedRecord : item,
        ),
        tombstones: nextTombstones,
      }),
      savedSetup: updatedRecord,
      status: "existing",
    };
  }

  if (conceptItems.length >= MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT) {
    throw new Error("compare_setup_limit_reached");
  }

  const nextRecord = {
    id: crypto.randomUUID(),
    createdAt: nowIso,
    updatedAt: nowIso,
    lastOpenedAt: null,
    ...draft,
  } satisfies SavedCompareSetupRecord;

  return {
    snapshot: normalizeSavedCompareSetupsSnapshot({
      version: "v1",
      items: [...normalizedSnapshot.items, nextRecord],
      tombstones: nextTombstones,
    }),
    savedSetup: nextRecord,
    status: "created",
  };
}

export function renameSavedCompareSetupInSnapshot(
  snapshot: SavedCompareSetupsSnapshot,
  id: string,
  title: string,
  nowIso = new Date().toISOString(),
) {
  const normalizedSnapshot = normalizeSavedCompareSetupsSnapshot(snapshot);
  const target = normalizedSnapshot.items.find((item) => item.id === id) ?? null;

  if (!target) {
    return null;
  }

  const renamed = {
    ...target,
    title,
    updatedAt: nowIso,
  } satisfies SavedCompareSetupRecord;

  return {
    snapshot: normalizeSavedCompareSetupsSnapshot({
      version: "v1",
      items: normalizedSnapshot.items.map((item) =>
        item.id === id ? renamed : item,
      ),
      tombstones: normalizedSnapshot.tombstones,
    }),
    savedSetup: renamed,
  };
}

export function deleteSavedCompareSetupFromSnapshot(
  snapshot: SavedCompareSetupsSnapshot,
  id: string,
  deletedAt = new Date().toISOString(),
) {
  const normalizedSnapshot = normalizeSavedCompareSetupsSnapshot(snapshot);
  const existing = normalizedSnapshot.items.find((item) => item.id === id) ?? null;

  if (!existing) {
    return null;
  }

  return {
    snapshot: normalizeSavedCompareSetupsSnapshot({
      version: "v1",
      items: normalizedSnapshot.items.filter((item) => item.id !== id),
      tombstones: [
        ...normalizedSnapshot.tombstones.filter(
          (item) =>
            item.fingerprint !== buildSavedCompareSetupFingerprint(existing),
        ),
        buildSavedCompareSetupTombstone(existing, deletedAt),
      ],
    }),
    savedSetup: existing,
  };
}

export function markSavedCompareSetupOpenedInSnapshot(
  snapshot: SavedCompareSetupsSnapshot,
  id: string,
  nowIso = new Date().toISOString(),
) {
  const normalizedSnapshot = normalizeSavedCompareSetupsSnapshot(snapshot);
  const target = normalizedSnapshot.items.find((item) => item.id === id) ?? null;

  if (!target) {
    return null;
  }

  const opened = {
    ...target,
    lastOpenedAt: nowIso,
  } satisfies SavedCompareSetupRecord;

  return {
    snapshot: normalizeSavedCompareSetupsSnapshot({
      version: "v1",
      items: normalizedSnapshot.items.map((item) =>
        item.id === id ? opened : item,
      ),
      tombstones: normalizedSnapshot.tombstones,
    }),
    savedSetup: opened,
  };
}

export function mergeSavedCompareSetupsSnapshots(
  remoteSnapshot: SavedCompareSetupsSnapshot | null | undefined,
  localSnapshot: SavedCompareSetupsSnapshot | null | undefined,
) {
  const safeRemoteSnapshot = normalizeSavedCompareSetupsSnapshot(
    remoteSnapshot ?? createEmptySavedCompareSetupsSnapshot(),
  );
  const safeLocalSnapshot = normalizeSavedCompareSetupsSnapshot(
    localSnapshot ?? createEmptySavedCompareSetupsSnapshot(),
  );
  const remoteFingerprints = new Set(
    safeRemoteSnapshot.items.map((item) => buildSavedCompareSetupFingerprint(item)),
  );
  const localFingerprints = new Set(
    safeLocalSnapshot.items.map((item) => buildSavedCompareSetupFingerprint(item)),
  );
  const merged = createCanonicalSavedCompareSetupsSnapshot({
    items: [...safeRemoteSnapshot.items, ...safeLocalSnapshot.items],
    tombstones: [...safeRemoteSnapshot.tombstones, ...safeLocalSnapshot.tombstones],
  });
  const mergedFingerprints = new Set(
    merged.snapshot.items.map((item) => buildSavedCompareSetupFingerprint(item)),
  );

  let importedLocalSetupCount = 0;
  let importedRemoteSetupCount = 0;

  for (const fingerprint of mergedFingerprints) {
    if (localFingerprints.has(fingerprint) && !remoteFingerprints.has(fingerprint)) {
      importedLocalSetupCount += 1;
    }

    if (remoteFingerprints.has(fingerprint) && !localFingerprints.has(fingerprint)) {
      importedRemoteSetupCount += 1;
    }
  }

  return {
    snapshot: merged.snapshot,
    summary: {
      localSetupCount: safeLocalSnapshot.items.length,
      remoteSetupCount: safeRemoteSnapshot.items.length,
      mergedSetupCount: merged.snapshot.items.length,
      importedLocalSetupCount,
      importedRemoteSetupCount,
      dedupedDuplicateCount: merged.dedupedDuplicateCount,
      deletedByTombstoneCount: merged.deletedByTombstoneCount,
    } satisfies SavedCompareSetupsMergeSummary,
  };
}

export function getSavedCompareSetupsSnapshotUpdatedAt(
  snapshot: SavedCompareSetupsSnapshot,
) {
  let nextTimestamp: string | null = null;

  for (const item of snapshot.items) {
    nextTimestamp = maxTimestamp(nextTimestamp, item.updatedAt);
    nextTimestamp = maxTimestamp(nextTimestamp, item.lastOpenedAt);
  }

  for (const tombstone of snapshot.tombstones) {
    nextTimestamp = maxTimestamp(nextTimestamp, tombstone.deletedAt);
  }

  return nextTimestamp;
}

export function getSavedCompareSetupSourceLabel(
  sourceType: SavedCompareSetupSourceType,
) {
  switch (sourceType) {
    case "preset-derived":
      return "Preset-derived compare";
    case "imported-from-link":
      return "Imported compare";
    default:
      return "Saved compare";
  }
}
