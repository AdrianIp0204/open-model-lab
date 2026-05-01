import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeCircuitDocument } from "@/lib/circuit-builder";
import {
  getConceptBySlug,
  getConceptSummaries,
  getGuidedCollectionBySlug,
} from "@/lib/content";
import {
  MAX_SAVED_ASSIGNMENTS_PER_COLLECTION,
  matchesSavedAssignmentCollection,
  normalizeSavedAssignmentCollection,
  type GuidedCollectionAssignmentDraft,
  type GuidedCollectionAssignmentRecord,
} from "@/lib/account/assignments";
import {
  normalizeLegacySavedCompareSetupDraft,
  type LegacySavedCompareSetupDraft,
  type SavedCompareSetupRenameInput,
} from "@/lib/account/compare-setups";
import {
  MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION,
  matchesSavedConceptBundleCollection,
  normalizeSavedConceptBundleCollection,
  normalizeSavedConceptBundleTitleKey,
  type GuidedCollectionConceptBundleDraft,
  type GuidedCollectionConceptBundleRecord,
} from "@/lib/account/concept-bundles";
import {
  MAX_SAVED_STUDY_PLANS_PER_USER,
  normalizeSavedStudyPlanCollection,
  resolveSavedStudyPlanRecord,
  type ResolvedSavedStudyPlan,
  type SavedStudyPlanDraft,
  type SavedStudyPlanRecord,
} from "@/lib/account/study-plans";
import {
  MAX_ACCOUNT_SAVED_CIRCUITS_PER_USER,
  normalizeAccountSavedCircuitCollection,
  type AccountSavedCircuitDraft,
  type AccountSavedCircuitRecord,
} from "@/lib/account/circuit-saves";
import {
  createEmptySavedSetupsSnapshot,
  getSavedSetupsSnapshotUpdatedAt,
  mergeSavedSetupsSnapshots,
  normalizeSavedSetupsSnapshot,
  type SavedSetupsMergeSummary,
  type SavedSetupsSnapshot,
} from "@/lib/saved-setups";
import {
  createEmptySavedCompareSetupsSnapshot,
  deleteSavedCompareSetupFromSnapshot,
  getSavedCompareSetupsSnapshotUpdatedAt,
  listSavedCompareSetupsForConcept,
  mergeSavedCompareSetupsSnapshots,
  normalizeSavedCompareSetupsSnapshot,
  renameSavedCompareSetupInSnapshot,
  saveSavedCompareSetupToSnapshot,
  type SavedCompareSetupDraft,
  type SavedCompareSetupRecord,
  type SavedCompareSetupsMergeSummary,
  type SavedCompareSetupsSnapshot,
} from "@/lib/saved-compare-setups";
import {
  resolveGuidedCollectionAssignment,
  type ResolvedGuidedCollectionAssignment,
} from "@/lib/guided/assignments";
import { resolveGuidedCollectionConceptBundle } from "@/lib/guided/concept-bundles";
import {
  encodeConceptSimulationState,
  encodePublicExperimentCard,
  type ConceptSimulationStateSource,
} from "@/lib/share-links";
import type { AccountUserSummary } from "./model";
import {
  hasAccountEntitlementCapability,
  type AccountEntitlementCapabilities,
  type ResolvedAccountEntitlement,
} from "@/lib/account/entitlements";
import {
  describeOptionalAccountDependencyFailure,
  getAccountSessionForCookieHeader,
  getStoredProgressForCookieHeader as getSupabaseStoredProgressForCookieHeader,
  mergeStoredProgressForCookieHeader as mergeSupabaseStoredProgressForCookieHeader,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "./supabase";
import type { ProgressSnapshot } from "@/lib/progress";

type StoredAssignment = GuidedCollectionAssignmentRecord;
type StoredLegacyAccountCompareSetup = LegacySavedCompareSetupDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
type StoredConceptBundle = GuidedCollectionConceptBundleRecord;
type StoredStudyPlan = SavedStudyPlanRecord;
type StoredSavedSetupsSnapshot = SavedSetupsSnapshot;
type StoredSavedCompareSetupsSnapshot = SavedCompareSetupsSnapshot;
type StoredAccountSavedCircuits = AccountSavedCircuitRecord[];

const ACCOUNT_STORE_VERSION = 3;

type StoredAccountStore = {
  version: typeof ACCOUNT_STORE_VERSION;
  assignmentsByUserId: Record<string, StoredAssignment[]>;
  compareSetupsByUserId?: Record<string, StoredLegacyAccountCompareSetup[]>;
  conceptBundlesByUserId: Record<string, StoredConceptBundle[]>;
  studyPlansByUserId: Record<string, StoredStudyPlan[]>;
  savedSetupsByUserId: Record<string, StoredSavedSetupsSnapshot>;
  savedCompareSetupsByUserId: Record<string, StoredSavedCompareSetupsSnapshot>;
  savedCircuitsByUserId: Record<string, StoredAccountSavedCircuits>;
};

type SessionResolution = {
  user: AccountUserSummary;
  entitlement: ResolvedAccountEntitlement;
};

export type OptionalStoredProgressLoadResult = {
  storedProgress: Awaited<ReturnType<typeof getSupabaseStoredProgressForCookieHeader>> | null;
  unavailable: boolean;
};

type SavedCompareSetupSaveResult = {
  savedSetup: SavedCompareSetupRecord;
  replacedExisting: boolean;
  items: SavedCompareSetupRecord[];
};

type SavedCompareSetupRenameResult = {
  savedSetup: SavedCompareSetupRecord;
  items: SavedCompareSetupRecord[];
};

type SavedAssignmentSaveResult = {
  savedAssignment: GuidedCollectionAssignmentRecord;
  replacedExisting: boolean;
  items: GuidedCollectionAssignmentRecord[];
};

type SavedConceptBundleSaveResult = {
  savedBundle: GuidedCollectionConceptBundleRecord;
  replacedExisting: boolean;
  items: GuidedCollectionConceptBundleRecord[];
};

type SavedStudyPlanSaveResult = {
  savedPlan: ResolvedSavedStudyPlan;
  replacedExisting: boolean;
  items: ResolvedSavedStudyPlan[];
};
type SavedCircuitSaveResult = {
  savedCircuit: AccountSavedCircuitRecord;
  replacedExisting: boolean;
  items: AccountSavedCircuitRecord[];
};

type StoredSavedSetupsLoadResult = {
  snapshot: SavedSetupsSnapshot;
  updatedAt: string | null;
};

type StoredSavedSetupsMergeResult = {
  snapshot: SavedSetupsSnapshot;
  updatedAt: string;
  mergeSummary: SavedSetupsMergeSummary;
};

type StoredSavedCompareSetupsLoadResult = {
  snapshot: SavedCompareSetupsSnapshot;
  updatedAt: string | null;
};

type StoredSavedCompareSetupsMergeResult = {
  snapshot: SavedCompareSetupsSnapshot;
  updatedAt: string;
  mergeSummary: SavedCompareSetupsMergeSummary;
};

type MutatorResult<T> = {
  store: StoredAccountStore;
  value: T;
  write?: boolean;
};

const defaultStorePath = path.join(os.homedir(), ".open-model-lab", "accounts.json");
let cachedConceptSummaryBySlug:
  | Map<
      string,
      {
        id: string;
        slug: string;
      }
    >
  | null = null;

let storeWriteQueue = Promise.resolve();

function withStoreLock<T>(task: () => Promise<T>) {
  const nextTask = storeWriteQueue.then(task, task);

  storeWriteQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );

  return nextTask;
}

function createEmptyAccountStore(): StoredAccountStore {
  return {
    version: ACCOUNT_STORE_VERSION,
    assignmentsByUserId: {},
    conceptBundlesByUserId: {},
    studyPlansByUserId: {},
    savedSetupsByUserId: {},
    savedCompareSetupsByUserId: {},
    savedCircuitsByUserId: {},
  };
}

function getConceptSummaryBySlug() {
  if (cachedConceptSummaryBySlug) {
    return cachedConceptSummaryBySlug;
  }

  cachedConceptSummaryBySlug = new Map(
    getConceptSummaries().map((concept) => [
      concept.slug,
      {
        id: concept.id,
        slug: concept.slug,
      },
    ]),
  );

  return cachedConceptSummaryBySlug;
}

function resolveCanonicalConceptIdentity(conceptSlug: string, conceptId?: string) {
  const concept = getConceptSummaryBySlug().get(conceptSlug);

  if (!concept) {
    throw new Error("unknown_concept");
  }

  if (conceptId && concept.id !== conceptId) {
    throw new Error("concept_identity_mismatch");
  }

  return concept;
}

function resolveCanonicalGuidedCollection(collectionSlug: string) {
  try {
    return getGuidedCollectionBySlug(collectionSlug);
  } catch {
    throw new Error("unknown_collection");
  }
}

function getAccountStorePath() {
  return process.env.OPEN_MODEL_LAB_ACCOUNT_STORE_PATH?.trim() || defaultStorePath;
}

function buildConceptSimulationStateSource(
  concept: ReturnType<typeof getConceptBySlug>,
): ConceptSimulationStateSource {
  return {
    slug: concept.slug,
    simulation: {
      defaults: concept.simulation.defaults,
      presets: concept.simulation.presets,
      overlays: concept.simulation.overlays,
      graphs: concept.graphs,
    },
  };
}

function migrateLegacyCompareSetupRecord(
  record: StoredLegacyAccountCompareSetup,
): SavedCompareSetupRecord | null {
  try {
    const concept = getConceptBySlug(record.conceptSlug);
    const simulationSource = buildConceptSimulationStateSource(concept);
    const activeSetup =
      record.compare.activeTarget === "a"
        ? record.compare.setupA
        : record.compare.setupB;
    const stateParam = encodeConceptSimulationState(simulationSource, {
      params: { ...activeSetup.params },
      activePresetId: activeSetup.activePresetId,
      activeGraphId:
        record.activeGraphId &&
        concept.graphs.some((graph) => graph.id === record.activeGraphId)
          ? record.activeGraphId
          : (concept.graphs[0]?.id ?? null),
      overlayValues: Object.fromEntries(
        (concept.simulation.overlays ?? []).map((overlay) => [
          overlay.id,
          record.overlayValues[overlay.id] ?? overlay.defaultOn,
        ]),
      ),
      focusedOverlayId:
        (concept.simulation.overlays ?? []).find(
          (overlay) => record.overlayValues[overlay.id] ?? overlay.defaultOn,
        )?.id ??
        concept.simulation.overlays?.[0]?.id ??
        null,
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: record.compare.activeTarget,
        setupA: {
          label: record.compare.setupA.label,
          params: { ...record.compare.setupA.params },
          activePresetId: record.compare.setupA.activePresetId,
        },
        setupB: {
          label: record.compare.setupB.label,
          params: { ...record.compare.setupB.params },
          activePresetId: record.compare.setupB.activePresetId,
        },
      },
    });

    if (!stateParam) {
      return null;
    }

    return {
      id: record.id,
      conceptId: concept.id,
      conceptSlug: concept.slug,
      conceptTitle: concept.title,
      title: record.name,
      stateParam,
      publicExperimentParam: encodePublicExperimentCard({
        conceptSlug: concept.slug,
        title: record.name,
        prompt: `Open this saved compare bench and start testing ${record.compare.setupA.label} against ${record.compare.setupB.label} right away.`,
        kind: "saved-compare",
      }),
      setupALabel: record.compare.setupA.label,
      setupBLabel: record.compare.setupB.label,
      sourceType: "manual",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastOpenedAt: null,
    };
  } catch {
    return null;
  }
}

async function readAccountStore() {
  try {
    const raw = await fs.readFile(getAccountStorePath(), "utf8");
    const parsed = JSON.parse(raw) as {
      version?: number;
      assignmentsByUserId?: unknown;
      compareSetupsByUserId?: unknown;
      conceptBundlesByUserId?: unknown;
      studyPlansByUserId?: unknown;
      savedSetupsByUserId?: unknown;
      savedCompareSetupsByUserId?: unknown;
      savedCircuitsByUserId?: unknown;
    };
    const parsedVersion =
      typeof parsed.version === "number" ? parsed.version : undefined;

    if (
      (parsedVersion !== 1 &&
        parsedVersion !== 2 &&
        parsedVersion !== ACCOUNT_STORE_VERSION) ||
      typeof parsed.assignmentsByUserId !== "object" ||
      parsed.assignmentsByUserId === null ||
      typeof parsed.conceptBundlesByUserId !== "object" ||
      parsed.conceptBundlesByUserId === null ||
      ("studyPlansByUserId" in parsed &&
        (typeof parsed.studyPlansByUserId !== "object" ||
          parsed.studyPlansByUserId === null)) ||
      ("savedSetupsByUserId" in parsed &&
        (typeof parsed.savedSetupsByUserId !== "object" ||
          parsed.savedSetupsByUserId === null)) ||
      ("savedCompareSetupsByUserId" in parsed &&
        (typeof parsed.savedCompareSetupsByUserId !== "object" ||
          parsed.savedCompareSetupsByUserId === null)) ||
      ("savedCircuitsByUserId" in parsed &&
        (typeof parsed.savedCircuitsByUserId !== "object" ||
          parsed.savedCircuitsByUserId === null)) ||
      ("compareSetupsByUserId" in parsed &&
        parsed.compareSetupsByUserId !== undefined &&
        (typeof parsed.compareSetupsByUserId !== "object" ||
          parsed.compareSetupsByUserId === null))
    ) {
      return createEmptyAccountStore();
    }

    const assignmentsByUserId = parsed.assignmentsByUserId as Record<string, unknown>;
    const conceptBundlesByUserId = parsed.conceptBundlesByUserId as Record<string, unknown>;
    const studyPlansByUserId = (parsed.studyPlansByUserId ?? {}) as Record<string, unknown>;
    const savedSetupsByUserId = (parsed.savedSetupsByUserId ?? {}) as Record<
      string,
      unknown
    >;
    const savedCompareSetupsByUserId = (parsed.savedCompareSetupsByUserId ?? {}) as Record<
      string,
      unknown
    >;
    const savedCircuitsByUserId = (parsed.savedCircuitsByUserId ?? {}) as Record<
      string,
      unknown
    >;
    const compareSetupsByUserId = (parsed.compareSetupsByUserId ?? {}) as Record<
      string,
      unknown
    >;

    const migratedSavedCompareSetups = Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(savedCompareSetupsByUserId),
          ...Object.keys(compareSetupsByUserId),
        ]),
      ].map((userId) => {
        const storedSnapshot = savedCompareSetupsByUserId[userId];
        const legacyEntries = compareSetupsByUserId[userId];
        const migratedLegacyItems = Array.isArray(legacyEntries)
          ? legacyEntries
              ?.map((item) => normalizeLegacySavedCompareSetupDraft(item))
              .map((item, index) => {
                const legacyItem = legacyEntries[index];

                if (!item || !legacyItem) {
                  return null;
                }

                const parsedLegacy =
                  typeof legacyItem === "object" && legacyItem !== null
                    ? (legacyItem as StoredLegacyAccountCompareSetup)
                    : null;

                if (!parsedLegacy?.id || !parsedLegacy.createdAt || !parsedLegacy.updatedAt) {
                  return null;
                }

                return migrateLegacyCompareSetupRecord(parsedLegacy);
              })
              .filter((item): item is SavedCompareSetupRecord => item !== null)
          : [];
        const nextSnapshot = normalizeSavedCompareSetupsSnapshot(
          storedSnapshot ?? {
            version: "v1",
            items: migratedLegacyItems,
            tombstones: [],
          },
        );

        return [userId, nextSnapshot] as const;
      }),
    );

    return {
      version: ACCOUNT_STORE_VERSION,
      assignmentsByUserId: Object.fromEntries(
        Object.entries(assignmentsByUserId).map(([userId, entries]) => [
          userId,
          normalizeSavedAssignmentCollection(entries),
        ]),
      ),
      conceptBundlesByUserId: Object.fromEntries(
        Object.entries(conceptBundlesByUserId).map(([userId, entries]) => [
          userId,
          normalizeSavedConceptBundleCollection(entries),
        ]),
      ),
      studyPlansByUserId: Object.fromEntries(
        Object.entries(studyPlansByUserId).map(([userId, entries]) => [
          userId,
          normalizeSavedStudyPlanCollection(entries),
        ]),
      ),
      savedSetupsByUserId: Object.fromEntries(
        Object.entries(savedSetupsByUserId).map(([userId, snapshot]) => [
          userId,
          normalizeSavedSetupsSnapshot(snapshot),
        ]),
      ),
      savedCompareSetupsByUserId: migratedSavedCompareSetups,
      savedCircuitsByUserId: Object.fromEntries(
        Object.entries(savedCircuitsByUserId).map(([userId, entries]) => [
          userId,
          normalizeAccountSavedCircuitCollection(entries),
        ]),
      ),
    } satisfies StoredAccountStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyAccountStore();
    }

    throw error;
  }
}

async function writeAccountStore(store: StoredAccountStore) {
  const storePath = getAccountStorePath();
  const directory = path.dirname(storePath);
  const tempPath = `${storePath}.tmp`;
  const serializedStore = JSON.stringify(store, null, 2);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(tempPath, serializedStore, "utf8");

  try {
    await fs.rename(tempPath, storePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== "EPERM" && code !== "EXDEV") {
      throw error;
    }

    // OneDrive-backed Windows paths can intermittently reject rename; fall back to
    // writing the final path directly so account/session writes still complete.
    await fs.writeFile(storePath, serializedStore, "utf8");
    await fs.rm(tempPath, { force: true });
  }
}

function ensureUserAssignments(store: StoredAccountStore, userId: string) {
  if (!store.assignmentsByUserId[userId]) {
    store.assignmentsByUserId[userId] = [];
  }

  return store.assignmentsByUserId[userId];
}

function ensureUserConceptBundles(store: StoredAccountStore, userId: string) {
  if (!store.conceptBundlesByUserId[userId]) {
    store.conceptBundlesByUserId[userId] = [];
  }

  return store.conceptBundlesByUserId[userId];
}

function ensureUserStudyPlans(store: StoredAccountStore, userId: string) {
  if (!store.studyPlansByUserId[userId]) {
    store.studyPlansByUserId[userId] = [];
  }

  return store.studyPlansByUserId[userId];
}

function ensureUserSavedSetups(store: StoredAccountStore, userId: string) {
  if (!store.savedSetupsByUserId[userId]) {
    store.savedSetupsByUserId[userId] = createEmptySavedSetupsSnapshot();
  }

  return store.savedSetupsByUserId[userId];
}

function ensureUserSavedCompareSetups(store: StoredAccountStore, userId: string) {
  if (!store.savedCompareSetupsByUserId[userId]) {
    store.savedCompareSetupsByUserId[userId] = createEmptySavedCompareSetupsSnapshot();
  }

  return store.savedCompareSetupsByUserId[userId];
}

function ensureUserSavedCircuits(store: StoredAccountStore, userId: string) {
  if (!store.savedCircuitsByUserId[userId]) {
    store.savedCircuitsByUserId[userId] = [];
  }

  return store.savedCircuitsByUserId[userId];
}

async function mutateAccountStore<T>(
  mutator: (store: StoredAccountStore) => Promise<MutatorResult<T>> | MutatorResult<T>,
) {
  return withStoreLock(async () => {
    const store = await readAccountStore();
    const result = await mutator(store);

    if (result.write) {
      await writeAccountStore(result.store);
    }

    return result.value;
  });
}

async function requireAuthenticatedSessionForCookieHeader(cookieHeader: string | null) {
  const session = await getAccountSessionForCookieHeader(cookieHeader);

  if (!session) {
    return null;
  }

  return {
    user: session.user,
    entitlement: session.entitlement,
  } satisfies SessionResolution;
}

function requireAccountEntitlementCapability(
  resolution: SessionResolution,
  capability: keyof AccountEntitlementCapabilities,
) {
  if (!hasAccountEntitlementCapability(resolution.entitlement, capability)) {
    throw new Error("premium_required");
  }
}

function requireSavedSetupsSyncCapabilities(resolution: SessionResolution) {
  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");
  requireAccountEntitlementCapability(resolution, "canSyncProgress");
}

function requireStudyPlansCapability(resolution: SessionResolution) {
  requireAccountEntitlementCapability(resolution, "canUseAdvancedStudyTools");
}

export async function getStoredProgressForSession(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSyncProgress");
  return getSupabaseStoredProgressForCookieHeader(cookieHeader);
}

export async function getStoredProgressForCookieHeader(cookieHeader: string | null) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution || !hasAccountEntitlementCapability(resolution.entitlement, "canSyncProgress")) {
    return null;
  }

  return getSupabaseStoredProgressForCookieHeader(cookieHeader);
}

export async function getOptionalStoredProgressForCookieHeader(input: {
  cookieHeader: string | null;
  routePath: string;
}): Promise<OptionalStoredProgressLoadResult> {
  try {
    const resolution = await requireAuthenticatedSessionForCookieHeader(input.cookieHeader);

    if (
      !resolution ||
      !hasAccountEntitlementCapability(resolution.entitlement, "canSyncProgress")
    ) {
      return {
        storedProgress: null,
        unavailable: false,
      };
    }

    return {
      storedProgress: await getSupabaseStoredProgressForCookieHeader(input.cookieHeader),
      unavailable: false,
    };
  } catch (error) {
    const failure = describeOptionalAccountDependencyFailure(
      error,
      "user_concept_progress_snapshots",
    );
    const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
      ? console.error
      : console.warn;

    log("[public-route] optional synced progress unavailable during render", {
      routePath: input.routePath,
      failureKind: failure.kind,
      relationName: failure.relationName,
      code: failure.code,
      message: failure.message,
      fallback: "local_progress_only",
    });

    return {
      storedProgress: null,
      unavailable: true,
    };
  }
}

export async function mergeStoredProgressForSession(
  request: Request,
  incomingSnapshot: ProgressSnapshot,
) {
  return mergeStoredProgressForCookieHeader(request.headers.get("cookie"), incomingSnapshot);
}

export async function mergeStoredProgressForCookieHeader(
  cookieHeader: string | null,
  incomingSnapshot: ProgressSnapshot,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSyncProgress");
  return mergeSupabaseStoredProgressForCookieHeader(cookieHeader, incomingSnapshot);
}

export async function getStoredSavedSetupsForSession(request: Request) {
  return getStoredSavedSetupsForCookieHeader(request.headers.get("cookie"));
}

export async function getStoredSavedSetupsForCookieHeader(cookieHeader: string | null) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireSavedSetupsSyncCapabilities(resolution);

  return mutateAccountStore<StoredSavedSetupsLoadResult>((store) => {
    const snapshot = ensureUserSavedSetups(store, resolution.user.id);

    return {
      store,
      value: {
        snapshot,
        updatedAt: getSavedSetupsSnapshotUpdatedAt(snapshot),
      },
      write: false,
    };
  });
}

export async function mergeStoredSavedSetupsForSession(
  request: Request,
  incomingSnapshot: SavedSetupsSnapshot,
) {
  return mergeStoredSavedSetupsForCookieHeader(
    request.headers.get("cookie"),
    incomingSnapshot,
  );
}

export async function mergeStoredSavedSetupsForCookieHeader(
  cookieHeader: string | null,
  incomingSnapshot: SavedSetupsSnapshot,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireSavedSetupsSyncCapabilities(resolution);

  return mutateAccountStore<StoredSavedSetupsMergeResult>((store) => {
    const storedSnapshot = ensureUserSavedSetups(store, resolution.user.id);
    const merged = mergeSavedSetupsSnapshots(storedSnapshot, incomingSnapshot);
    const updatedAt = new Date().toISOString();

    store.savedSetupsByUserId[resolution.user.id] = merged.snapshot;

    return {
      store,
      value: {
        snapshot: merged.snapshot,
        updatedAt,
        mergeSummary: merged.summary,
      },
      write: true,
    };
  });
}

export async function getStoredSavedCompareSetupsForSession(request: Request) {
  return getStoredSavedCompareSetupsForCookieHeader(request.headers.get("cookie"));
}

export async function getStoredSavedCompareSetupsForCookieHeader(
  cookieHeader: string | null,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireSavedSetupsSyncCapabilities(resolution);

  return mutateAccountStore<StoredSavedCompareSetupsLoadResult>((store) => {
    const snapshot = ensureUserSavedCompareSetups(store, resolution.user.id);

    return {
      store,
      value: {
        snapshot,
        updatedAt: getSavedCompareSetupsSnapshotUpdatedAt(snapshot),
      },
      write: false,
    };
  });
}

export async function mergeStoredSavedCompareSetupsForSession(
  request: Request,
  incomingSnapshot: SavedCompareSetupsSnapshot,
) {
  return mergeStoredSavedCompareSetupsForCookieHeader(
    request.headers.get("cookie"),
    incomingSnapshot,
  );
}

export async function mergeStoredSavedCompareSetupsForCookieHeader(
  cookieHeader: string | null,
  incomingSnapshot: SavedCompareSetupsSnapshot,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireSavedSetupsSyncCapabilities(resolution);

  return mutateAccountStore<StoredSavedCompareSetupsMergeResult>((store) => {
    const storedSnapshot = ensureUserSavedCompareSetups(store, resolution.user.id);
    const merged = mergeSavedCompareSetupsSnapshots(storedSnapshot, incomingSnapshot);
    const updatedAt = new Date().toISOString();

    store.savedCompareSetupsByUserId[resolution.user.id] = merged.snapshot;

    return {
      store,
      value: {
        snapshot: merged.snapshot,
        updatedAt,
        mergeSummary: merged.summary,
      },
      write: true,
    };
  });
}

export async function getSharedAssignmentById(
  assignmentId: string,
): Promise<ResolvedGuidedCollectionAssignment | null> {
  return mutateAccountStore<ResolvedGuidedCollectionAssignment | null>((store) => {
    const storedAssignment =
      Object.values(store.assignmentsByUserId)
        .flat()
        .find((assignment) => assignment.id === assignmentId) ?? null;

    if (!storedAssignment) {
      return {
        store,
        value: null,
        write: false,
      };
    }

    return {
      store,
      value: resolveStoredAssignment(storedAssignment),
      write: false,
    };
  });
}

export async function getStoredAssignmentsIndexForSession(request: Request) {
  return getStoredAssignmentsIndexForCookieHeader(request.headers.get("cookie"));
}

export async function getStoredAssignmentsIndexForCookieHeader(
  cookieHeader: string | null,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  return mutateAccountStore<ResolvedGuidedCollectionAssignment[]>((store) => {
    const assignments = ensureUserAssignments(store, resolution.user.id);

    return {
      store,
      value: assignments
        .map((assignment) => resolveStoredAssignment(assignment))
        .filter(
          (assignment): assignment is ResolvedGuidedCollectionAssignment =>
            assignment !== null,
        ),
      write: false,
    };
  });
}

export async function getStoredAssignmentsForSession(
  request: Request,
  collectionSlug: string,
) {
  return getStoredAssignmentsForCookieHeader(request.headers.get("cookie"), collectionSlug);
}

export async function getStoredAssignmentsForCookieHeader(
  cookieHeader: string | null,
  collectionSlug: string,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  const collection = resolveCanonicalGuidedCollection(collectionSlug);

  return mutateAccountStore<GuidedCollectionAssignmentRecord[]>((store) => {
    const assignments = ensureUserAssignments(store, resolution.user.id);

    return {
      store,
      value: getCollectionScopedAssignments(assignments, collection.slug),
      write: false,
    };
  });
}

export async function saveStoredAssignmentForSession(
  request: Request,
  draft: GuidedCollectionAssignmentDraft,
) {
  return saveStoredAssignmentForCookieHeader(request.headers.get("cookie"), draft);
}

export async function saveStoredAssignmentForCookieHeader(
  cookieHeader: string | null,
  draft: GuidedCollectionAssignmentDraft,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  const collection = resolveCanonicalGuidedCollection(draft.collectionSlug);

  return mutateAccountStore<SavedAssignmentSaveResult>((store) => {
    const nowIso = new Date().toISOString();
    const assignments = ensureUserAssignments(store, resolution.user.id);
    const collectionItems = getCollectionScopedAssignments(assignments, collection.slug);
    const matchingAssignmentIndex =
      draft.id !== null && draft.id !== undefined
        ? assignments.findIndex(
            (item) =>
              item.id === draft.id &&
              matchesSavedAssignmentCollection(item, collection.slug),
          )
        : -1;
    const replacingExisting = matchingAssignmentIndex >= 0;

    if (!replacingExisting && collectionItems.length >= MAX_SAVED_ASSIGNMENTS_PER_COLLECTION) {
      throw new Error("assignment_limit_reached");
    }

    if (draft.id && !replacingExisting) {
      throw new Error("assignment_not_found");
    }

    const resolvedAssignment = resolveGuidedCollectionAssignment(collection, {
      id:
        replacingExisting && assignments[matchingAssignmentIndex]
          ? assignments[matchingAssignmentIndex].id
          : crypto.randomUUID(),
      title: draft.title,
      summary: draft.summary,
      stepIds: draft.stepIds,
      launchStepId: draft.launchStepId ?? null,
      teacherNote: draft.teacherNote ?? null,
      creatorDisplayName: resolution.user.displayName,
      createdAt:
        replacingExisting && assignments[matchingAssignmentIndex]
          ? assignments[matchingAssignmentIndex].createdAt
          : nowIso,
      updatedAt: nowIso,
    });

    if (!resolvedAssignment) {
      throw new Error("invalid_assignment");
    }

    const nextAssignment: GuidedCollectionAssignmentRecord = replacingExisting
      ? {
          ...assignments[matchingAssignmentIndex],
          collectionSlug: collection.slug,
          title: resolvedAssignment.title,
          summary: resolvedAssignment.summary,
          stepIds: [...resolvedAssignment.stepIds],
          launchStepId: resolvedAssignment.launchStep.id,
          teacherNote: resolvedAssignment.teacherNote,
          creatorDisplayName: resolution.user.displayName,
          updatedAt: nowIso,
        }
      : {
          id: resolvedAssignment.id,
          collectionSlug: collection.slug,
          title: resolvedAssignment.title,
          summary: resolvedAssignment.summary,
          stepIds: [...resolvedAssignment.stepIds],
          launchStepId: resolvedAssignment.launchStep.id,
          teacherNote: resolvedAssignment.teacherNote,
          creatorDisplayName: resolution.user.displayName,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    const nextAssignments = [...assignments];

    if (replacingExisting) {
      nextAssignments.splice(matchingAssignmentIndex, 1, nextAssignment);
    } else {
      nextAssignments.push(nextAssignment);
    }

    store.assignmentsByUserId[resolution.user.id] = normalizeSavedAssignmentCollection(
      nextAssignments,
    );

    return {
      store,
      value: {
        savedAssignment: nextAssignment,
        replacedExisting: replacingExisting,
        items: getCollectionScopedAssignments(
          store.assignmentsByUserId[resolution.user.id],
          collection.slug,
        ),
      },
      write: true,
    };
  });
}

export async function deleteStoredAssignmentForSession(
  request: Request,
  input: {
    collectionSlug: string;
    id: string;
  },
) {
  return deleteStoredAssignmentForCookieHeader(request.headers.get("cookie"), input);
}

export async function deleteStoredAssignmentForCookieHeader(
  cookieHeader: string | null,
  input: {
    collectionSlug: string;
    id: string;
  },
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  const collection = resolveCanonicalGuidedCollection(input.collectionSlug);

  return mutateAccountStore<GuidedCollectionAssignmentRecord[]>((store) => {
    const assignments = ensureUserAssignments(store, resolution.user.id);
    const nextAssignments = assignments.filter(
      (item) => !(item.id === input.id && matchesSavedAssignmentCollection(item, collection.slug)),
    );
    const write = nextAssignments.length !== assignments.length;

    if (write) {
      store.assignmentsByUserId[resolution.user.id] = normalizeSavedAssignmentCollection(
        nextAssignments,
      );
    }

    return {
      store,
      value: getCollectionScopedAssignments(nextAssignments, collection.slug),
      write,
    };
  });
}

function getConceptScopedCompareSetups(
  snapshot: SavedCompareSetupsSnapshot,
  conceptSlug: string,
) {
  return listSavedCompareSetupsForConcept(snapshot, conceptSlug);
}

function getCollectionScopedAssignments(
  items: GuidedCollectionAssignmentRecord[],
  collectionSlug: string,
) {
  return items.filter((item) => matchesSavedAssignmentCollection(item, collectionSlug));
}

function resolveStoredAssignment(
  storedAssignment: GuidedCollectionAssignmentRecord,
): ResolvedGuidedCollectionAssignment | null {
  try {
    const collection = resolveCanonicalGuidedCollection(storedAssignment.collectionSlug);
    return resolveGuidedCollectionAssignment(collection, storedAssignment);
  } catch {
    return null;
  }
}

function getCollectionScopedConceptBundles(
  items: GuidedCollectionConceptBundleRecord[],
  collectionSlug: string,
) {
  return items.filter((item) => matchesSavedConceptBundleCollection(item, collectionSlug));
}

function resolveStoredStudyPlans(items: SavedStudyPlanRecord[]) {
  return items
    .map((item) => resolveSavedStudyPlanRecord(item))
    .filter((item): item is ResolvedSavedStudyPlan => item !== null);
}

export async function getStoredStudyPlansIndexForSession(request: Request) {
  return getStoredStudyPlansIndexForCookieHeader(request.headers.get("cookie"));
}

export async function getStoredStudyPlansIndexForCookieHeader(
  cookieHeader: string | null,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireStudyPlansCapability(resolution);

  return mutateAccountStore<ResolvedSavedStudyPlan[]>((store) => {
    const studyPlans = ensureUserStudyPlans(store, resolution.user.id);

    return {
      store,
      value: resolveStoredStudyPlans(studyPlans),
      write: false,
    };
  });
}

export async function saveStoredStudyPlanForSession(
  request: Request,
  draft: SavedStudyPlanDraft,
) {
  return saveStoredStudyPlanForCookieHeader(request.headers.get("cookie"), draft);
}

export async function saveStoredStudyPlanForCookieHeader(
  cookieHeader: string | null,
  draft: SavedStudyPlanDraft,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireStudyPlansCapability(resolution);
  const canonicalDraft: SavedStudyPlanDraft = {
    id: draft.id ?? null,
    title: draft.title.trim(),
    summary: draft.summary?.trim() ? draft.summary.trim() : null,
    entries: draft.entries.map((entry) => ({
      kind: entry.kind,
      slug: entry.slug,
    })),
  };

  return mutateAccountStore<SavedStudyPlanSaveResult>((store) => {
    const nowIso = new Date().toISOString();
    const studyPlans = ensureUserStudyPlans(store, resolution.user.id);
    const matchingPlanIndex =
      canonicalDraft.id !== null && canonicalDraft.id !== undefined
        ? studyPlans.findIndex((item) => item.id === canonicalDraft.id)
        : -1;
    const replacingExisting = matchingPlanIndex >= 0;

    if (!replacingExisting && studyPlans.length >= MAX_SAVED_STUDY_PLANS_PER_USER) {
      throw new Error("study_plan_limit_reached");
    }

    if (canonicalDraft.id && !replacingExisting) {
      throw new Error("study_plan_not_found");
    }

    const nextPlan: SavedStudyPlanRecord = replacingExisting
      ? {
          ...studyPlans[matchingPlanIndex],
          title: canonicalDraft.title,
          summary: canonicalDraft.summary,
          entries: canonicalDraft.entries.map((entry) => ({
            kind: entry.kind,
            slug: entry.slug,
          })),
          updatedAt: nowIso,
        }
      : {
          id: crypto.randomUUID(),
          title: canonicalDraft.title,
          summary: canonicalDraft.summary,
          entries: canonicalDraft.entries.map((entry) => ({
            kind: entry.kind,
            slug: entry.slug,
          })),
          createdAt: nowIso,
          updatedAt: nowIso,
        };
    const resolvedNextPlan = resolveSavedStudyPlanRecord(nextPlan);

    if (!resolvedNextPlan) {
      throw new Error("invalid_study_plan");
    }

    const nextStudyPlans = [...studyPlans];

    if (replacingExisting) {
      nextStudyPlans.splice(matchingPlanIndex, 1, nextPlan);
    } else {
      nextStudyPlans.push(nextPlan);
    }

    store.studyPlansByUserId[resolution.user.id] = normalizeSavedStudyPlanCollection(
      nextStudyPlans,
    );

    return {
      store,
      value: {
        savedPlan: resolvedNextPlan,
        replacedExisting: replacingExisting,
        items: resolveStoredStudyPlans(store.studyPlansByUserId[resolution.user.id]),
      },
      write: true,
    };
  });
}

export async function deleteStoredStudyPlanForSession(
  request: Request,
  id: string,
) {
  return deleteStoredStudyPlanForCookieHeader(request.headers.get("cookie"), id);
}

export async function deleteStoredStudyPlanForCookieHeader(
  cookieHeader: string | null,
  id: string,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireStudyPlansCapability(resolution);

  return mutateAccountStore<ResolvedSavedStudyPlan[]>((store) => {
    const studyPlans = ensureUserStudyPlans(store, resolution.user.id);
    const nextStudyPlans = studyPlans.filter((item) => item.id !== id);
    const write = nextStudyPlans.length !== studyPlans.length;

    if (!write) {
      throw new Error("study_plan_not_found");
    }

    store.studyPlansByUserId[resolution.user.id] = normalizeSavedStudyPlanCollection(
      nextStudyPlans,
    );

    return {
      store,
      value: resolveStoredStudyPlans(store.studyPlansByUserId[resolution.user.id]),
      write,
    };
  });
}

export async function getStoredCircuitSavesForSession(request: Request) {
  return getStoredCircuitSavesForCookieHeader(request.headers.get("cookie"));
}

export async function getStoredCircuitSavesForCookieHeader(
  cookieHeader: string | null,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");

  return mutateAccountStore<AccountSavedCircuitRecord[]>((store) => {
    const savedCircuits = ensureUserSavedCircuits(store, resolution.user.id);

    return {
      store,
      value: normalizeAccountSavedCircuitCollection(savedCircuits),
      write: false,
    };
  });
}

export async function saveStoredCircuitSaveForSession(
  request: Request,
  draft: AccountSavedCircuitDraft,
) {
  return saveStoredCircuitSaveForCookieHeader(request.headers.get("cookie"), draft);
}

export async function saveStoredCircuitSaveForCookieHeader(
  cookieHeader: string | null,
  draft: AccountSavedCircuitDraft,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");
  const canonicalDraft: AccountSavedCircuitDraft = {
    id: draft.id ?? null,
    title: draft.title.trim(),
    document: normalizeCircuitDocument(draft.document),
  };

  return mutateAccountStore<SavedCircuitSaveResult>((store) => {
    const nowIso = new Date().toISOString();
    const savedCircuits = ensureUserSavedCircuits(store, resolution.user.id);
    const matchingCircuitIndex =
      canonicalDraft.id !== null && canonicalDraft.id !== undefined
        ? savedCircuits.findIndex((item) => item.id === canonicalDraft.id)
        : -1;
    const replacingExisting = matchingCircuitIndex >= 0;

    if (!replacingExisting && savedCircuits.length >= MAX_ACCOUNT_SAVED_CIRCUITS_PER_USER) {
      throw new Error("saved_circuit_limit_reached");
    }

    if (canonicalDraft.id && !replacingExisting) {
      throw new Error("saved_circuit_not_found");
    }

    const nextCircuit: AccountSavedCircuitRecord = replacingExisting
      ? {
          ...savedCircuits[matchingCircuitIndex],
          title: canonicalDraft.title,
          updatedAt: nowIso,
          document: canonicalDraft.document,
        }
      : {
          id: crypto.randomUUID(),
          title: canonicalDraft.title,
          createdAt: nowIso,
          updatedAt: nowIso,
          document: canonicalDraft.document,
        };

    const nextSavedCircuits = [...savedCircuits];
    if (replacingExisting) {
      nextSavedCircuits.splice(matchingCircuitIndex, 1, nextCircuit);
    } else {
      nextSavedCircuits.push(nextCircuit);
    }

    store.savedCircuitsByUserId[resolution.user.id] =
      normalizeAccountSavedCircuitCollection(nextSavedCircuits);

    return {
      store,
      value: {
        savedCircuit: nextCircuit,
        replacedExisting: replacingExisting,
        items: store.savedCircuitsByUserId[resolution.user.id],
      },
      write: true,
    };
  });
}

export async function renameStoredCircuitSaveForSession(
  request: Request,
  input: { id: string; title: string },
) {
  return renameStoredCircuitSaveForCookieHeader(request.headers.get("cookie"), input);
}

export async function renameStoredCircuitSaveForCookieHeader(
  cookieHeader: string | null,
  input: { id: string; title: string },
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");

  return mutateAccountStore<SavedCircuitSaveResult>((store) => {
    const savedCircuits = ensureUserSavedCircuits(store, resolution.user.id);
    const matchingCircuitIndex = savedCircuits.findIndex((item) => item.id === input.id);

    if (matchingCircuitIndex < 0) {
      throw new Error("saved_circuit_not_found");
    }

    const renamed: AccountSavedCircuitRecord = {
      ...savedCircuits[matchingCircuitIndex],
      title: input.title.trim(),
      updatedAt: new Date().toISOString(),
    };

    const nextSavedCircuits = [...savedCircuits];
    nextSavedCircuits.splice(matchingCircuitIndex, 1, renamed);
    store.savedCircuitsByUserId[resolution.user.id] =
      normalizeAccountSavedCircuitCollection(nextSavedCircuits);

    return {
      store,
      value: {
        savedCircuit: renamed,
        replacedExisting: true,
        items: store.savedCircuitsByUserId[resolution.user.id],
      },
      write: true,
    };
  });
}

export async function deleteStoredCircuitSaveForSession(
  request: Request,
  id: string,
) {
  return deleteStoredCircuitSaveForCookieHeader(request.headers.get("cookie"), id);
}

export async function deleteStoredCircuitSaveForCookieHeader(
  cookieHeader: string | null,
  id: string,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");

  return mutateAccountStore<AccountSavedCircuitRecord[]>((store) => {
    const savedCircuits = ensureUserSavedCircuits(store, resolution.user.id);
    const nextSavedCircuits = savedCircuits.filter((item) => item.id !== id);

    if (nextSavedCircuits.length === savedCircuits.length) {
      throw new Error("saved_circuit_not_found");
    }

    store.savedCircuitsByUserId[resolution.user.id] =
      normalizeAccountSavedCircuitCollection(nextSavedCircuits);

    return {
      store,
      value: store.savedCircuitsByUserId[resolution.user.id],
      write: true,
    };
  });
}

export async function getStoredConceptBundlesForSession(
  request: Request,
  collectionSlug: string,
) {
  return getStoredConceptBundlesForCookieHeader(request.headers.get("cookie"), collectionSlug);
}

export async function getStoredConceptBundlesForCookieHeader(
  cookieHeader: string | null,
  collectionSlug: string,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  const collection = resolveCanonicalGuidedCollection(collectionSlug);

  return mutateAccountStore<GuidedCollectionConceptBundleRecord[]>((store) => {
    const conceptBundles = ensureUserConceptBundles(store, resolution.user.id);

    return {
      store,
      value: getCollectionScopedConceptBundles(conceptBundles, collection.slug),
      write: false,
    };
  });
}

export async function saveStoredConceptBundleForSession(
  request: Request,
  draft: GuidedCollectionConceptBundleDraft,
) {
  return saveStoredConceptBundleForCookieHeader(request.headers.get("cookie"), draft);
}

export async function saveStoredConceptBundleForCookieHeader(
  cookieHeader: string | null,
  draft: GuidedCollectionConceptBundleDraft,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  const collection = resolveCanonicalGuidedCollection(draft.collectionSlug);

  return mutateAccountStore<SavedConceptBundleSaveResult>((store) => {
    const nowIso = new Date().toISOString();
    const conceptBundles = ensureUserConceptBundles(store, resolution.user.id);
    const collectionItems = getCollectionScopedConceptBundles(conceptBundles, collection.slug);
    const matchingTitleIndex = conceptBundles.findIndex(
      (item) =>
        matchesSavedConceptBundleCollection(item, collection.slug) &&
        normalizeSavedConceptBundleTitleKey(item.title) ===
          normalizeSavedConceptBundleTitleKey(draft.title),
    );
    const replacingExisting = matchingTitleIndex >= 0;

    if (
      !replacingExisting &&
      collectionItems.length >= MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION
    ) {
      throw new Error("concept_bundle_limit_reached");
    }

    const resolvedBundle = resolveGuidedCollectionConceptBundle(collection, {
      id: replacingExisting ? conceptBundles[matchingTitleIndex].id : crypto.randomUUID(),
      title: draft.title,
      summary: draft.summary,
      stepIds: draft.stepIds,
      launchStepId: draft.launchStepId ?? null,
    });

    if (!resolvedBundle) {
      throw new Error("invalid_concept_bundle");
    }

    const nextBundle: GuidedCollectionConceptBundleRecord = replacingExisting
      ? {
          ...conceptBundles[matchingTitleIndex],
          collectionSlug: collection.slug,
          title: resolvedBundle.title,
          summary: resolvedBundle.summary,
          stepIds: [...resolvedBundle.stepIds],
          launchStepId: resolvedBundle.launchStep.id,
          updatedAt: nowIso,
        }
      : {
          id: resolvedBundle.id,
          collectionSlug: collection.slug,
          title: resolvedBundle.title,
          summary: resolvedBundle.summary,
          stepIds: [...resolvedBundle.stepIds],
          launchStepId: resolvedBundle.launchStep.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    const nextConceptBundles = [...conceptBundles];

    if (replacingExisting) {
      nextConceptBundles.splice(matchingTitleIndex, 1, nextBundle);
    } else {
      nextConceptBundles.push(nextBundle);
    }

    store.conceptBundlesByUserId[resolution.user.id] = normalizeSavedConceptBundleCollection(
      nextConceptBundles,
    );

    return {
      store,
      value: {
        savedBundle: nextBundle,
        replacedExisting: replacingExisting,
        items: getCollectionScopedConceptBundles(
          store.conceptBundlesByUserId[resolution.user.id],
          collection.slug,
        ),
      },
      write: true,
    };
  });
}

export async function deleteStoredConceptBundleForSession(
  request: Request,
  input: {
    collectionSlug: string;
    id: string;
  },
) {
  return deleteStoredConceptBundleForCookieHeader(request.headers.get("cookie"), input);
}

export async function deleteStoredConceptBundleForCookieHeader(
  cookieHeader: string | null,
  input: {
    collectionSlug: string;
    id: string;
  },
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  const collection = resolveCanonicalGuidedCollection(input.collectionSlug);

  return mutateAccountStore<GuidedCollectionConceptBundleRecord[]>((store) => {
    const conceptBundles = ensureUserConceptBundles(store, resolution.user.id);
    const nextConceptBundles = conceptBundles.filter(
      (item) =>
        !(item.id === input.id && matchesSavedConceptBundleCollection(item, collection.slug)),
    );
    const write = nextConceptBundles.length !== conceptBundles.length;

    if (write) {
      store.conceptBundlesByUserId[resolution.user.id] = normalizeSavedConceptBundleCollection(
        nextConceptBundles,
      );
    }

    return {
      store,
      value: getCollectionScopedConceptBundles(nextConceptBundles, collection.slug),
      write,
    };
  });
}

export async function getStoredCompareSetupsForSession(
  request: Request,
  conceptSlug: string,
) {
  return getStoredCompareSetupsForCookieHeader(request.headers.get("cookie"), conceptSlug);
}

export async function getStoredCompareSetupsForCookieHeader(
  cookieHeader: string | null,
  conceptSlug: string,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");
  const concept = resolveCanonicalConceptIdentity(conceptSlug);

  return mutateAccountStore<SavedCompareSetupRecord[]>((store) => {
    const compareSetups = ensureUserSavedCompareSetups(store, resolution.user.id);

    return {
      store,
      value: getConceptScopedCompareSetups(compareSetups, concept.slug),
      write: false,
    };
  });
}

export async function saveStoredCompareSetupForSession(
  request: Request,
  draft: SavedCompareSetupDraft,
) {
  return saveStoredCompareSetupForCookieHeader(request.headers.get("cookie"), draft);
}

export async function saveStoredCompareSetupForCookieHeader(
  cookieHeader: string | null,
  draft: SavedCompareSetupDraft,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");
  const concept = resolveCanonicalConceptIdentity(draft.conceptSlug, draft.conceptId);

  return mutateAccountStore<SavedCompareSetupSaveResult>((store) => {
    const result = saveSavedCompareSetupToSnapshot(
      ensureUserSavedCompareSetups(store, resolution.user.id),
      {
        ...draft,
        conceptId: concept.id,
        conceptSlug: concept.slug,
      },
    );

    store.savedCompareSetupsByUserId[resolution.user.id] = result.snapshot;

    return {
      store,
      value: {
        savedSetup: result.savedSetup,
        replacedExisting: result.status !== "created",
        items: getConceptScopedCompareSetups(result.snapshot, concept.slug),
      },
      write: true,
    };
  });
}

export async function deleteStoredCompareSetupForSession(
  request: Request,
  input: {
    conceptSlug: string;
    id: string;
  },
) {
  return deleteStoredCompareSetupForCookieHeader(request.headers.get("cookie"), input);
}

export async function renameStoredCompareSetupForSession(
  request: Request,
  input: SavedCompareSetupRenameInput,
) {
  return renameStoredCompareSetupForCookieHeader(request.headers.get("cookie"), input);
}

export async function renameStoredCompareSetupForCookieHeader(
  cookieHeader: string | null,
  input: SavedCompareSetupRenameInput,
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");
  const concept = resolveCanonicalConceptIdentity(input.conceptSlug);

  return mutateAccountStore<SavedCompareSetupRenameResult>((store) => {
    const result = renameSavedCompareSetupInSnapshot(
      ensureUserSavedCompareSetups(store, resolution.user.id),
      input.id,
      input.title,
    );

    if (!result) {
      throw new Error("compare_setup_not_found");
    }

    store.savedCompareSetupsByUserId[resolution.user.id] = result.snapshot;

    return {
      store,
      value: {
        savedSetup: result.savedSetup,
        items: getConceptScopedCompareSetups(result.snapshot, concept.slug),
      },
      write: true,
    };
  });
}

export async function deleteStoredCompareSetupForCookieHeader(
  cookieHeader: string | null,
  input: {
    conceptSlug: string;
    id: string;
  },
) {
  const resolution = await requireAuthenticatedSessionForCookieHeader(cookieHeader);

  if (!resolution) {
    return null;
  }

  requireAccountEntitlementCapability(resolution, "canSaveCompareSetups");
  const concept = resolveCanonicalConceptIdentity(input.conceptSlug);

  return mutateAccountStore<SavedCompareSetupRecord[]>((store) => {
    const result = deleteSavedCompareSetupFromSnapshot(
      ensureUserSavedCompareSetups(store, resolution.user.id),
      input.id,
    );
    const write = Boolean(result);

    if (result) {
      store.savedCompareSetupsByUserId[resolution.user.id] = result.snapshot;
    }

    const scopedItems = getConceptScopedCompareSetups(
      result?.snapshot ?? ensureUserSavedCompareSetups(store, resolution.user.id),
      concept.slug,
    );

    return {
      store,
      value: scopedItems,
      write,
    };
  });
}
