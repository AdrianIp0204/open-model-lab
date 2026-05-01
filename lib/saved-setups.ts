import { z } from "zod";

export const SAVED_SETUPS_STORAGE_KEY = "open-model-lab.saved-setups.v1";
export const ANONYMOUS_SAVED_SETUPS_SCOPE = "__anonymous__";

const savedSetupTitleSchema = z.string().trim().min(1).max(80);
const savedSetupConceptIdentitySchema = z.string().trim().min(1).max(160);
const savedSetupConceptTitleSchema = z.string().trim().min(1).max(160);
const optionalSavedSetupQueryParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(2400)
  .nullable();
const savedSetupFingerprintSchema = z.string().trim().min(1).max(400);

export const savedSetupSourceTypeSchema = z.enum([
  "manual",
  "preset-derived",
  "imported-from-link",
]);

export type SavedSetupSourceType = z.infer<typeof savedSetupSourceTypeSchema>;

export type SavedSetupDraft = {
  conceptId: string;
  conceptSlug: string;
  conceptTitle: string;
  title: string;
  stateParam: string | null;
  publicExperimentParam: string | null;
  sourceType: SavedSetupSourceType;
};

export type SavedSetupRecord = SavedSetupDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type SavedSetupTombstoneRecord = {
  fingerprint: string;
  deletedAt: string;
};

export type SavedSetupsSnapshot = {
  version: "v2";
  items: SavedSetupRecord[];
  tombstones: SavedSetupTombstoneRecord[];
};

export type SavedSetupsLocalCache = {
  version: "v2";
  scopedSnapshots: Record<string, SavedSetupsSnapshot>;
};

export type SavedSetupsMergeSummary = {
  localSetupCount: number;
  remoteSetupCount: number;
  mergedSetupCount: number;
  importedLocalSetupCount: number;
  importedRemoteSetupCount: number;
  dedupedDuplicateCount: number;
  deletedByTombstoneCount: number;
};

const savedSetupDraftSchema = z.object({
  conceptId: savedSetupConceptIdentitySchema,
  conceptSlug: savedSetupConceptIdentitySchema,
  conceptTitle: savedSetupConceptTitleSchema,
  title: savedSetupTitleSchema,
  stateParam: optionalSavedSetupQueryParamSchema,
  publicExperimentParam: optionalSavedSetupQueryParamSchema,
  sourceType: savedSetupSourceTypeSchema,
});

const savedSetupRecordSchema = savedSetupDraftSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime().nullable(),
});

const legacySavedSetupsSnapshotSchema = z.object({
  version: z.literal("v1"),
  items: z.array(savedSetupRecordSchema).default([]),
});

const savedSetupTombstoneRecordSchema = z.object({
  fingerprint: savedSetupFingerprintSchema,
  deletedAt: z.string().datetime(),
});

const savedSetupsSnapshotSchema = z.object({
  version: z.literal("v2"),
  items: z.array(savedSetupRecordSchema).default([]),
  tombstones: z.array(savedSetupTombstoneRecordSchema).default([]),
});

const savedSetupsLocalCacheSchema = z.object({
  version: z.literal("v2"),
  scopedSnapshots: z.record(z.string().min(1).max(320), z.unknown()).default({}),
});

const EMPTY_SAVED_SETUPS_SNAPSHOT: SavedSetupsSnapshot = {
  version: "v2",
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

function compareSavedSetupMetadataPreference(
  left: SavedSetupRecord,
  right: SavedSetupRecord,
) {
  if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt.localeCompare(right.updatedAt);
  }

  if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return right.id.localeCompare(left.id);
}

function pickPreferredSavedSetupRecord(
  left: SavedSetupRecord,
  right: SavedSetupRecord,
) {
  return compareSavedSetupMetadataPreference(left, right) >= 0 ? left : right;
}

function compareSavedSetupTimestamps(left: SavedSetupRecord, right: SavedSetupRecord) {
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

function compareSavedSetupTombstones(
  left: SavedSetupTombstoneRecord,
  right: SavedSetupTombstoneRecord,
) {
  if (left.deletedAt !== right.deletedAt) {
    return right.deletedAt.localeCompare(left.deletedAt);
  }

  return left.fingerprint.localeCompare(right.fingerprint, undefined, {
    sensitivity: "base",
  });
}

function mergeSavedSetupRecords(
  left: SavedSetupRecord,
  right: SavedSetupRecord,
): SavedSetupRecord {
  const preferred = pickPreferredSavedSetupRecord(left, right);

  return {
    ...preferred,
    conceptId: preferred.conceptId || right.conceptId || left.conceptId,
    conceptSlug: preferred.conceptSlug || right.conceptSlug || left.conceptSlug,
    conceptTitle: preferred.conceptTitle || right.conceptTitle || left.conceptTitle,
    stateParam: preferred.stateParam ?? right.stateParam ?? left.stateParam ?? null,
    publicExperimentParam:
      preferred.publicExperimentParam ??
      right.publicExperimentParam ??
      left.publicExperimentParam ??
      null,
    createdAt: minTimestamp(left.createdAt, right.createdAt) ?? preferred.createdAt,
    updatedAt: maxTimestamp(left.updatedAt, right.updatedAt) ?? preferred.updatedAt,
    lastOpenedAt: maxTimestamp(left.lastOpenedAt, right.lastOpenedAt),
  };
}

function mergeSavedSetupTombstones(
  left: SavedSetupTombstoneRecord,
  right: SavedSetupTombstoneRecord,
): SavedSetupTombstoneRecord {
  return {
    fingerprint: left.fingerprint,
    deletedAt: maxTimestamp(left.deletedAt, right.deletedAt) ?? left.deletedAt,
  };
}

function createCanonicalSavedSetupsSnapshot(input: {
  items: SavedSetupRecord[];
  tombstones: SavedSetupTombstoneRecord[];
}) {
  const itemsByFingerprint = new Map<string, SavedSetupRecord>();
  const tombstonesByFingerprint = new Map<string, SavedSetupTombstoneRecord>();
  let dedupedDuplicateCount = 0;
  let deletedByTombstoneCount = 0;

  for (const item of input.items) {
    const fingerprint = buildSavedSetupFingerprint(item);
    const current = itemsByFingerprint.get(fingerprint);

    if (!current) {
      itemsByFingerprint.set(fingerprint, item);
      continue;
    }

    dedupedDuplicateCount += 1;
    itemsByFingerprint.set(fingerprint, mergeSavedSetupRecords(current, item));
  }

  for (const tombstone of input.tombstones) {
    const current = tombstonesByFingerprint.get(tombstone.fingerprint);

    if (!current) {
      tombstonesByFingerprint.set(tombstone.fingerprint, tombstone);
      continue;
    }

    tombstonesByFingerprint.set(
      tombstone.fingerprint,
      mergeSavedSetupTombstones(current, tombstone),
    );
  }

  const nextItems: SavedSetupRecord[] = [];

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
      version: "v2",
      items: sortSavedSetups(nextItems),
      tombstones: sortSavedSetupTombstones([...tombstonesByFingerprint.values()]),
    } satisfies SavedSetupsSnapshot,
    dedupedDuplicateCount,
    deletedByTombstoneCount,
  };
}

export function createEmptySavedSetupsSnapshot(): SavedSetupsSnapshot {
  return {
    version: "v2",
    items: [],
    tombstones: [],
  };
}

export function createEmptySavedSetupsLocalCache(): SavedSetupsLocalCache {
  return {
    version: "v2",
    scopedSnapshots: {},
  };
}

export function normalizeSavedSetupDraft(input: unknown): SavedSetupDraft | null {
  const parsed = savedSetupDraftSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    stateParam: parsed.data.stateParam ?? null,
    publicExperimentParam: parsed.data.publicExperimentParam ?? null,
  };
}

export function normalizeSavedSetupRecord(input: unknown): SavedSetupRecord | null {
  const parsed = savedSetupRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    stateParam: parsed.data.stateParam ?? null,
    publicExperimentParam: parsed.data.publicExperimentParam ?? null,
    lastOpenedAt: parsed.data.lastOpenedAt ?? null,
  };
}

export function normalizeSavedSetupTombstoneRecord(
  input: unknown,
): SavedSetupTombstoneRecord | null {
  const parsed = savedSetupTombstoneRecordSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function sortSavedSetups(items: SavedSetupRecord[]) {
  return [...items].sort(compareSavedSetupTimestamps);
}

export function sortSavedSetupTombstones(items: SavedSetupTombstoneRecord[]) {
  return [...items].sort(compareSavedSetupTombstones);
}

export function normalizeSavedSetupsSnapshot(input: unknown): SavedSetupsSnapshot {
  const parsed = savedSetupsSnapshotSchema.safeParse(input);

  if (parsed.success) {
    return createCanonicalSavedSetupsSnapshot({
      items: parsed.data.items
        .map((item) => normalizeSavedSetupRecord(item))
        .filter((item): item is SavedSetupRecord => item !== null),
      tombstones: parsed.data.tombstones
        .map((item) => normalizeSavedSetupTombstoneRecord(item))
        .filter((item): item is SavedSetupTombstoneRecord => item !== null),
    }).snapshot;
  }

  const legacyParsed = legacySavedSetupsSnapshotSchema.safeParse(input);

  if (legacyParsed.success) {
    return createCanonicalSavedSetupsSnapshot({
      items: legacyParsed.data.items
        .map((item) => normalizeSavedSetupRecord(item))
        .filter((item): item is SavedSetupRecord => item !== null),
      tombstones: [],
    }).snapshot;
  }

  return createEmptySavedSetupsSnapshot();
}

export function normalizeSavedSetupsLocalCache(input: unknown): SavedSetupsLocalCache {
  const parsed = savedSetupsLocalCacheSchema.safeParse(input);

  if (parsed.success) {
    const scopedSnapshots = Object.fromEntries(
      Object.entries(parsed.data.scopedSnapshots)
        .map(
          ([scopeKey, snapshot]) =>
            [scopeKey, normalizeSavedSetupsSnapshot(snapshot)] as const,
        )
        .filter((entry) => hasSavedSetupsSnapshotData(entry[1])),
    );

    return {
      version: "v2",
      scopedSnapshots,
    };
  }

  const legacySnapshot = normalizeSavedSetupsSnapshot(input);

  if (!hasSavedSetupsSnapshotData(legacySnapshot)) {
    return createEmptySavedSetupsLocalCache();
  }

  return {
    version: "v2",
    scopedSnapshots: {
      [ANONYMOUS_SAVED_SETUPS_SCOPE]: legacySnapshot,
    },
  };
}

export function getSavedSetupsSnapshotForScope(
  cache: SavedSetupsLocalCache,
  scopeKey: string,
) {
  return cache.scopedSnapshots[scopeKey] ?? EMPTY_SAVED_SETUPS_SNAPSHOT;
}

export function setSavedSetupsSnapshotForScope(
  cache: SavedSetupsLocalCache,
  scopeKey: string,
  snapshot: SavedSetupsSnapshot,
) {
  const nextCache = {
    version: "v2",
    scopedSnapshots: { ...cache.scopedSnapshots },
  } satisfies SavedSetupsLocalCache;

  if (hasSavedSetupsSnapshotData(snapshot)) {
    nextCache.scopedSnapshots[scopeKey] = normalizeSavedSetupsSnapshot(snapshot);
  } else {
    delete nextCache.scopedSnapshots[scopeKey];
  }

  return nextCache;
}

export function hasSavedSetupsSnapshotData(snapshot: SavedSetupsSnapshot) {
  return snapshot.items.length > 0 || snapshot.tombstones.length > 0;
}

export function buildSavedSetupFingerprint(
  input: Pick<SavedSetupDraft, "conceptSlug" | "stateParam">,
) {
  return `${input.conceptSlug}::${input.stateParam ?? "__default__"}`;
}

export function buildSavedSetupTombstone(
  input: Pick<SavedSetupRecord, "conceptSlug" | "stateParam">,
  deletedAt: string,
): SavedSetupTombstoneRecord {
  return {
    fingerprint: buildSavedSetupFingerprint(input),
    deletedAt,
  };
}

export function mergeSavedSetupsSnapshots(
  remoteSnapshot: SavedSetupsSnapshot | null | undefined,
  localSnapshot: SavedSetupsSnapshot | null | undefined,
) {
  const safeRemoteSnapshot = normalizeSavedSetupsSnapshot(
    remoteSnapshot ?? createEmptySavedSetupsSnapshot(),
  );
  const safeLocalSnapshot = normalizeSavedSetupsSnapshot(
    localSnapshot ?? createEmptySavedSetupsSnapshot(),
  );
  const remoteFingerprints = new Set(
    safeRemoteSnapshot.items.map((item) => buildSavedSetupFingerprint(item)),
  );
  const localFingerprints = new Set(
    safeLocalSnapshot.items.map((item) => buildSavedSetupFingerprint(item)),
  );
  const merged = createCanonicalSavedSetupsSnapshot({
    items: [...safeRemoteSnapshot.items, ...safeLocalSnapshot.items],
    tombstones: [...safeRemoteSnapshot.tombstones, ...safeLocalSnapshot.tombstones],
  });
  const mergedFingerprints = new Set(
    merged.snapshot.items.map((item) => buildSavedSetupFingerprint(item)),
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
    } satisfies SavedSetupsMergeSummary,
  };
}

export function getSavedSetupsSnapshotUpdatedAt(snapshot: SavedSetupsSnapshot) {
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

export function getSavedSetupSourceLabel(sourceType: SavedSetupSourceType) {
  switch (sourceType) {
    case "preset-derived":
      return "Preset-derived";
    case "imported-from-link":
      return "Imported from link";
    default:
      return "Saved here";
  }
}
