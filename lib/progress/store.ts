"use client";

import { useSyncExternalStore } from "react";
import type { AccountUserSummary } from "@/lib/account/model";
import type { ConceptSummary } from "@/lib/content/schema";
import type { SavedContinueLearningState } from "./continue-learning-state";
import type { ProgressHistoryStore } from "./history";
import {
  type ConceptProgressRecord,
  type PackTestProgressRecord,
  type TopicTestProgressRecord,
  createEmptyProgressSnapshot,
  getConceptProgressSummary,
  type ProgressConceptIdentity,
  normalizeProgressSnapshot,
  PROGRESS_STORAGE_KEY,
  type ProgressSnapshot,
} from "./model";
import { type ProgressMergeSummary } from "./sync";

type ConceptProgressUpdater = (
  current: ConceptProgressRecord,
  now: string,
) => ConceptProgressRecord | null;

type QuickTestCompletionStats = {
  incorrectAnswers?: number;
  totalQuestions?: number;
};

type TopicTestCompletionStats = {
  incorrectAnswers?: number;
  totalQuestions?: number;
};

type PackTestCompletionStats = {
  incorrectAnswers?: number;
  totalQuestions?: number;
};

export type ProgressSyncMode = "local" | "syncing" | "synced" | "error";

export type ProgressSyncState = {
  mode: ProgressSyncMode;
  accountUser: AccountUserSummary | null;
  lastSyncedAt: string | null;
  lastMergeSummary: ProgressMergeSummary | null;
  savedContinueLearningState: SavedContinueLearningState | null;
  savedProgressHistory: ProgressHistoryStore | null;
  errorMessage: string | null;
};

const serverSnapshot = createEmptyProgressSnapshot();
const serverProgressReady = false;

const defaultSyncState: ProgressSyncState = {
  mode: "local",
  accountUser: null,
  lastSyncedAt: null,
  lastMergeSummary: null,
  savedContinueLearningState: null,
  savedProgressHistory: null,
  errorMessage: null,
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readProgressSnapshotFromStorage() {
  if (!canUseLocalStorage()) {
    return createEmptyProgressSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);

    if (!raw) {
      return createEmptyProgressSnapshot();
    }

    return normalizeProgressSnapshot(JSON.parse(raw));
  } catch {
    return createEmptyProgressSnapshot();
  }
}

function writeProgressSnapshotToStorage(snapshot: ProgressSnapshot) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures so the learning UI still works in-memory.
  }
}

function createProgressRecord(identity: ProgressConceptIdentity) {
  return {
    conceptId: identity.id,
    slug: identity.slug,
  };
}

function createTopicTestProgressRecord(slug: string) {
  return {
    slug,
  } satisfies TopicTestProgressRecord;
}

function createPackTestProgressRecord(slug: string) {
  return {
    slug,
  } satisfies PackTestProgressRecord;
}

class LocalConceptProgressStore {
  private snapshot: ProgressSnapshot = createEmptyProgressSnapshot();
  private syncState: ProgressSyncState = defaultSyncState;
  private initialized = false;
  private listeners = new Set<() => void>();
  private storageListenerAttached = false;
  private handleStorageEvent?: (event: StorageEvent) => void;
  private syncTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private syncListenersAttached = false;
  private handleWindowFocus?: () => void;
  private handleVisibilityChange?: () => void;
  private syncGeneration = 0;

  private attachStorageListener() {
    if (!canUseLocalStorage() || this.storageListenerAttached) {
      return;
    }

    this.handleStorageEvent = (event) => {
      if (event.key !== PROGRESS_STORAGE_KEY) {
        return;
      }

      try {
        this.snapshot = normalizeProgressSnapshot(
          event.newValue ? JSON.parse(event.newValue) : createEmptyProgressSnapshot(),
        );
      } catch {
        this.snapshot = createEmptyProgressSnapshot();
      }
      this.emit();

      if (this.syncState.accountUser) {
        this.scheduleSync();
      }
    };

    window.addEventListener("storage", this.handleStorageEvent);

    this.storageListenerAttached = true;
  }

  private ensureLoaded() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.snapshot = readProgressSnapshotFromStorage();
    this.attachStorageListener();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private clearPendingSync() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private attachSyncListeners() {
    if (!canUseLocalStorage() || this.syncListenersAttached) {
      return;
    }

    this.handleWindowFocus = () => {
      void this.syncNow();
    };
    this.handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void this.syncNow();
      }
    };

    window.addEventListener("focus", this.handleWindowFocus);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.syncListenersAttached = true;
  }

  private detachSyncListeners() {
    if (!this.syncListenersAttached) {
      return;
    }

    if (this.handleWindowFocus) {
      window.removeEventListener("focus", this.handleWindowFocus);
    }

    if (this.handleVisibilityChange) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.syncListenersAttached = false;
    this.handleWindowFocus = undefined;
    this.handleVisibilityChange = undefined;
  }

  private setSyncState(nextState: ProgressSyncState) {
    this.syncState = nextState;
    this.emit();
  }

  private scheduleSync(delayMs = 700) {
    if (!this.syncState.accountUser || !canUseLocalStorage()) {
      return;
    }

    this.clearPendingSync();
    this.syncTimer = setTimeout(() => {
      void this.syncNow();
    }, delayMs);
  }

  private findConceptKey(identity: ProgressConceptIdentity) {
    if (this.snapshot.concepts[identity.slug]) {
      return identity.slug;
    }

    if (!identity.id) {
      return null;
    }

    return (
      Object.entries(this.snapshot.concepts).find(
        ([, record]) => record.conceptId === identity.id,
      )?.[0] ?? null
    );
  }

  private findTopicTestKey(slug: string) {
    if (this.snapshot.topicTests?.[slug]) {
      return slug;
    }

    return null;
  }

  private findPackTestKey(slug: string) {
    if (this.snapshot.packTests?.[slug]) {
      return slug;
    }

    return null;
  }

  getSnapshot = () => {
    this.ensureLoaded();
    return this.snapshot;
  };

  isReady = () => {
    this.ensureLoaded();
    return true;
  };

  getSyncState = () => {
    this.ensureLoaded();
    return this.syncState;
  };

  subscribe = (listener: () => void) => {
    this.ensureLoaded();
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  updateConcept(identity: ProgressConceptIdentity, updater: ConceptProgressUpdater) {
    this.ensureLoaded();
    const currentKey = this.findConceptKey(identity);
    const currentRecord =
      (currentKey ? this.snapshot.concepts[currentKey] : null) ?? createProgressRecord(identity);
    const nextRecord = updater(
      {
        ...currentRecord,
        conceptId: identity.id ?? currentRecord.conceptId,
        slug: identity.slug,
      },
      new Date().toISOString(),
    );

    const nextConcepts = { ...this.snapshot.concepts };

    if (!nextRecord) {
      if (currentKey) {
        delete nextConcepts[currentKey];
      } else {
        delete nextConcepts[identity.slug];
      }
    } else {
      if (currentKey && currentKey !== identity.slug) {
        delete nextConcepts[currentKey];
      }
      nextConcepts[identity.slug] = nextRecord;
    }

    this.snapshot = {
      ...this.snapshot,
      concepts: nextConcepts,
    };
    writeProgressSnapshotToStorage(this.snapshot);
    this.emit();

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }
  }

  updateTopicTest(
    slug: string,
    updater: (
      current: TopicTestProgressRecord,
      now: string,
    ) => TopicTestProgressRecord | null,
  ) {
    this.ensureLoaded();
    const currentKey = this.findTopicTestKey(slug);
    const currentRecord =
      (currentKey ? this.snapshot.topicTests?.[currentKey] : null) ??
      createTopicTestProgressRecord(slug);
    const nextRecord = updater(
      {
        ...currentRecord,
        slug,
      },
      new Date().toISOString(),
    );

    const nextTopicTests = { ...(this.snapshot.topicTests ?? {}) };

    if (!nextRecord) {
      delete nextTopicTests[slug];
    } else {
      nextTopicTests[slug] = nextRecord;
    }

    this.snapshot = {
      ...this.snapshot,
      topicTests: nextTopicTests,
    };
    writeProgressSnapshotToStorage(this.snapshot);
    this.emit();

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }
  }

  updatePackTest(
    slug: string,
    updater: (
      current: PackTestProgressRecord,
      now: string,
    ) => PackTestProgressRecord | null,
  ) {
    this.ensureLoaded();
    const currentKey = this.findPackTestKey(slug);
    const currentRecord =
      (currentKey ? this.snapshot.packTests?.[currentKey] : null) ??
      createPackTestProgressRecord(slug);
    const nextRecord = updater(
      {
        ...currentRecord,
        slug,
      },
      new Date().toISOString(),
    );

    const nextPackTests = { ...(this.snapshot.packTests ?? {}) };

    if (!nextRecord) {
      delete nextPackTests[slug];
    } else {
      nextPackTests[slug] = nextRecord;
    }

    this.snapshot = {
      ...this.snapshot,
      packTests: nextPackTests,
    };
    writeProgressSnapshotToStorage(this.snapshot);
    this.emit();

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }
  }

  async syncNow() {
    this.ensureLoaded();

    if (!this.syncState.accountUser) {
      return null;
    }

    this.clearPendingSync();

    const activeGeneration = this.syncGeneration;
    const accountUser = this.syncState.accountUser;

    this.setSyncState({
      ...this.syncState,
      mode: "syncing",
      errorMessage: null,
    });

    try {
      const response = await fetch("/api/account/progress", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          snapshot: this.snapshot,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        mergeSummary?: ProgressMergeSummary;
        snapshot?: ProgressSnapshot;
        continueLearningState?: SavedContinueLearningState | null;
        history?: ProgressHistoryStore | null;
        updatedAt?: string;
      };

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error ?? "Progress sync failed.");
      }

      if (
        activeGeneration !== this.syncGeneration ||
        this.syncState.accountUser?.id !== accountUser.id
      ) {
        return null;
      }

      this.snapshot = normalizeProgressSnapshot(payload.snapshot);
      writeProgressSnapshotToStorage(this.snapshot);
      this.setSyncState({
        mode: "synced",
        accountUser,
        lastSyncedAt: payload.updatedAt ?? new Date().toISOString(),
        lastMergeSummary: payload.mergeSummary ?? null,
        savedContinueLearningState: payload.continueLearningState ?? null,
        savedProgressHistory: payload.history ?? null,
        errorMessage: null,
      });

      return this.snapshot;
    } catch (error) {
      if (
        activeGeneration !== this.syncGeneration ||
        this.syncState.accountUser?.id !== accountUser.id
      ) {
        return null;
      }

      this.setSyncState({
        ...this.syncState,
        mode: "error",
        errorMessage:
          error instanceof Error ? error.message : "Progress sync failed.",
      });

      return null;
    }
  }

  enableRemoteSync(accountUser: AccountUserSummary) {
    this.ensureLoaded();

    if (this.syncState.accountUser?.id === accountUser.id) {
      this.attachSyncListeners();

      if (this.syncState.mode === "error") {
        void this.syncNow();
      }

      return;
    }

    this.syncGeneration += 1;
    this.attachSyncListeners();
    this.setSyncState({
      mode: "syncing",
      accountUser,
      lastSyncedAt: null,
      lastMergeSummary: null,
      savedContinueLearningState: null,
      savedProgressHistory: null,
      errorMessage: null,
    });
    void this.syncNow();
  }

  disableRemoteSync() {
    this.ensureLoaded();
    this.syncGeneration += 1;
    this.clearPendingSync();
    this.detachSyncListeners();

    if (this.syncState.mode === "local" && !this.syncState.accountUser) {
      return;
    }

    this.setSyncState(defaultSyncState);
  }

  resetForTests() {
    if (canUseLocalStorage() && this.handleStorageEvent) {
      window.removeEventListener("storage", this.handleStorageEvent);
    }

    this.initialized = false;
    this.snapshot = createEmptyProgressSnapshot();
    this.syncState = defaultSyncState;
    this.storageListenerAttached = false;
    this.handleStorageEvent = undefined;
    this.clearPendingSync();
    this.detachSyncListeners();
    this.syncGeneration = 0;
    this.listeners.clear();
  }
}

export const localConceptProgressStore = new LocalConceptProgressStore();

function touchVisit(
  record: ConceptProgressRecord,
  now: string,
) {
  return {
    ...record,
    firstVisitedAt:
      typeof record.firstVisitedAt === "string" && record.firstVisitedAt
        ? record.firstVisitedAt
        : now,
    lastVisitedAt: now,
  };
}

export function useProgressSnapshot() {
  return useSyncExternalStore(
    localConceptProgressStore.subscribe,
    localConceptProgressStore.getSnapshot,
    () => serverSnapshot,
  );
}

export function useProgressSnapshotReady() {
  return useSyncExternalStore(
    localConceptProgressStore.subscribe,
    localConceptProgressStore.isReady,
    () => serverProgressReady,
  );
}

export function useProgressSyncState() {
  return useSyncExternalStore(
    localConceptProgressStore.subscribe,
    localConceptProgressStore.getSyncState,
    () => defaultSyncState,
  );
}

export function recordConceptVisit(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => touchVisit(current, now));
}

export function recordConceptInteraction(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    hasInteracted: true,
    lastInteractedAt: now,
  }));
}

export function recordChallengeModeUsed(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    usedChallengeModeAt: now,
  }));
}

export function recordChallengeStarted(
  identity: ProgressConceptIdentity,
  challengeId: string,
) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    usedChallengeModeAt: now,
    startedChallenges: {
      ...(current.startedChallenges ?? {}),
      [challengeId]: now,
    },
  }));
}

export function recordChallengeCompleted(
  identity: ProgressConceptIdentity,
  challengeId: string,
) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    usedChallengeModeAt: now,
    startedChallenges: {
      ...(current.startedChallenges ?? {}),
      [challengeId]: current.startedChallenges?.[challengeId] ?? now,
    },
    completedChallenges: {
      ...(current.completedChallenges ?? {}),
      [challengeId]: now,
    },
  }));
}

export function recordQuickTestCompleted(
  identity: ProgressConceptIdentity,
  stats: QuickTestCompletionStats = {},
) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    quickTestStartedAt: current.quickTestStartedAt ?? now,
    completedQuickTestAt: now,
    quickTestAttemptCount: (current.quickTestAttemptCount ?? 0) + 1,
    quickTestLastIncorrectCount: Math.max(0, stats.incorrectAnswers ?? 0),
    quickTestMissStreak:
      (stats.incorrectAnswers ?? 0) > 0 ? (current.quickTestMissStreak ?? 0) + 1 : 0,
    quickTestLastMissedAt: (stats.incorrectAnswers ?? 0) > 0 ? now : undefined,
  }));
}

export function recordQuickTestStarted(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    quickTestStartedAt: now,
  }));
}

export function recordTopicTestCompleted(
  topicSlug: string,
  stats: TopicTestCompletionStats = {},
) {
  localConceptProgressStore.updateTopicTest(topicSlug, (current, now) => ({
    ...current,
    slug: topicSlug,
    startedAt: current.startedAt ?? now,
    completedAt: now,
    attemptCount: (current.attemptCount ?? 0) + 1,
    lastIncorrectCount: Math.max(0, stats.incorrectAnswers ?? 0),
    lastQuestionCount: Math.max(0, stats.totalQuestions ?? 0),
  }));
}

export function recordTopicTestStarted(topicSlug: string) {
  localConceptProgressStore.updateTopicTest(topicSlug, (current, now) => ({
    ...current,
    slug: topicSlug,
    startedAt: now,
  }));
}

export function recordPackTestCompleted(
  packSlug: string,
  stats: PackTestCompletionStats = {},
) {
  localConceptProgressStore.updatePackTest(packSlug, (current, now) => ({
    ...current,
    slug: packSlug,
    startedAt: current.startedAt ?? now,
    completedAt: now,
    attemptCount: (current.attemptCount ?? 0) + 1,
    lastIncorrectCount: Math.max(0, stats.incorrectAnswers ?? 0),
    lastQuestionCount: Math.max(0, stats.totalQuestions ?? 0),
  }));
}

export function recordPackTestStarted(packSlug: string) {
  localConceptProgressStore.updatePackTest(packSlug, (current, now) => ({
    ...current,
    slug: packSlug,
    startedAt: now,
  }));
}

export function recordPredictionModeUsed(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    usedPredictionModeAt: now,
  }));
}

export function recordCompareModeUsed(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    usedCompareModeAt: now,
  }));
}

export function recordWorkedExampleEngaged(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    engagedWorkedExampleAt: now,
  }));
}

export function markConceptCompleted(identity: ProgressConceptIdentity) {
  localConceptProgressStore.updateConcept(identity, (current, now) => ({
    ...touchVisit(current, now),
    manualCompletedAt: now,
  }));
}

export function resetConceptProgress(identity: Pick<ProgressConceptIdentity, "slug" | "id">) {
  localConceptProgressStore.updateConcept(identity, () => null);
}

export function useConceptProgressSummary(concept: Pick<ConceptSummary, "id" | "slug" | "title">) {
  const snapshot = useProgressSnapshot();
  return getConceptProgressSummary(snapshot, concept);
}

export function forceProgressSync() {
  return localConceptProgressStore.syncNow();
}
