"use client";

import { useSyncExternalStore } from "react";
import type { AccountUserSummary } from "@/lib/account/model";
import {
  ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE,
  buildSavedCompareSetupFingerprint,
  createEmptySavedCompareSetupsLocalCache,
  createEmptySavedCompareSetupsSnapshot,
  deleteSavedCompareSetupFromSnapshot,
  getSavedCompareSetupsSnapshotForScope,
  hasSavedCompareSetupsSnapshotData,
  markSavedCompareSetupOpenedInSnapshot,
  mergeSavedCompareSetupsSnapshots,
  normalizeSavedCompareSetupsLocalCache,
  normalizeSavedCompareSetupsSnapshot,
  renameSavedCompareSetupInSnapshot,
  SAVED_COMPARE_SETUPS_STORAGE_KEY,
  saveSavedCompareSetupToSnapshot,
  setSavedCompareSetupsSnapshotForScope,
  type SavedCompareSetupDraft,
  type SavedCompareSetupRecord,
  type SavedCompareSetupsLocalCache,
  type SavedCompareSetupsMergeSummary,
  type SavedCompareSetupsSnapshot,
} from "@/lib/saved-compare-setups";

type SaveSavedCompareSetupResult = {
  savedSetup: SavedCompareSetupRecord;
  status: "created" | "existing" | "updated";
};

export type SavedCompareSetupsSyncMode = "local" | "syncing" | "synced" | "error";

export type SavedCompareSetupsSyncState = {
  mode: SavedCompareSetupsSyncMode;
  accountUser: AccountUserSummary | null;
  lastSyncedAt: string | null;
  lastMergeSummary: SavedCompareSetupsMergeSummary | null;
  errorMessage: string | null;
};

type SavedCompareSetupsSyncResponse = {
  error?: string;
  mergeSummary?: SavedCompareSetupsMergeSummary;
  snapshot?: SavedCompareSetupsSnapshot;
  updatedAt?: string;
};

const defaultSyncState: SavedCompareSetupsSyncState = {
  mode: "local",
  accountUser: null,
  lastSyncedAt: null,
  lastMergeSummary: null,
  errorMessage: null,
};

const serverSnapshot = createEmptySavedCompareSetupsSnapshot();
const serverSyncState = defaultSyncState;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSavedCompareSetupsLocalCacheFromStorage() {
  if (!canUseLocalStorage()) {
    return createEmptySavedCompareSetupsLocalCache();
  }

  try {
    const raw = window.localStorage.getItem(SAVED_COMPARE_SETUPS_STORAGE_KEY);

    if (!raw) {
      return createEmptySavedCompareSetupsLocalCache();
    }

    return normalizeSavedCompareSetupsLocalCache(JSON.parse(raw));
  } catch {
    return createEmptySavedCompareSetupsLocalCache();
  }
}

function writeSavedCompareSetupsLocalCacheToStorage(
  cache: SavedCompareSetupsLocalCache,
) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      SAVED_COMPARE_SETUPS_STORAGE_KEY,
      JSON.stringify(cache),
    );
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Saved compare setups could not be stored on this browser.",
    );
  }
}

class LocalSavedCompareSetupsStore {
  private cache: SavedCompareSetupsLocalCache =
    createEmptySavedCompareSetupsLocalCache();
  private currentScopeKey = ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE;
  private syncState: SavedCompareSetupsSyncState = defaultSyncState;
  private initialized = false;
  private listeners = new Set<() => void>();
  private storageListenerAttached = false;
  private handleStorageEvent?: (event: StorageEvent) => void;
  private syncTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private syncListenersAttached = false;
  private handleWindowFocus?: () => void;
  private handleVisibilityChange?: () => void;
  private syncGeneration = 0;
  private localRevision = 0;

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private attachStorageListener() {
    if (!canUseLocalStorage() || this.storageListenerAttached) {
      return;
    }

    this.handleStorageEvent = (event) => {
      if (event.key !== SAVED_COMPARE_SETUPS_STORAGE_KEY) {
        return;
      }

      this.cache = readSavedCompareSetupsLocalCacheFromStorage();
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
    this.cache = readSavedCompareSetupsLocalCacheFromStorage();
    this.attachStorageListener();
  }

  private getActiveSnapshot() {
    return getSavedCompareSetupsSnapshotForScope(this.cache, this.currentScopeKey);
  }

  private setActiveSnapshot(
    snapshot: SavedCompareSetupsSnapshot,
    kind: "local" | "remote",
  ) {
    this.cache = setSavedCompareSetupsSnapshotForScope(
      this.cache,
      this.currentScopeKey,
      snapshot,
    );
    writeSavedCompareSetupsLocalCacheToStorage(this.cache);

    if (kind === "local") {
      this.localRevision += 1;
    }

    this.emit();
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

  private setSyncState(nextState: SavedCompareSetupsSyncState) {
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

  private moveAnonymousSnapshotToScope(scopeKey: string) {
    const activeSnapshot = getSavedCompareSetupsSnapshotForScope(
      this.cache,
      scopeKey,
    );

    if (hasSavedCompareSetupsSnapshotData(activeSnapshot)) {
      return false;
    }

    const anonymousSnapshot = getSavedCompareSetupsSnapshotForScope(
      this.cache,
      ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE,
    );

    if (!hasSavedCompareSetupsSnapshotData(anonymousSnapshot)) {
      return false;
    }

    this.cache = setSavedCompareSetupsSnapshotForScope(
      this.cache,
      scopeKey,
      anonymousSnapshot,
    );
    this.cache = setSavedCompareSetupsSnapshotForScope(
      this.cache,
      ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE,
      createEmptySavedCompareSetupsSnapshot(),
    );
    writeSavedCompareSetupsLocalCacheToStorage(this.cache);

    return true;
  }

  getSnapshot = () => {
    this.ensureLoaded();
    return this.getActiveSnapshot();
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

  saveCompareSetup(draft: SavedCompareSetupDraft): SaveSavedCompareSetupResult {
    this.ensureLoaded();
    const result = saveSavedCompareSetupToSnapshot(this.getActiveSnapshot(), draft);

    this.setActiveSnapshot(result.snapshot, "local");

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }

    return {
      savedSetup: result.savedSetup,
      status: result.status,
    };
  }

  renameCompareSetup(id: string, title: string): SavedCompareSetupRecord | null {
    this.ensureLoaded();
    const result = renameSavedCompareSetupInSnapshot(
      this.getActiveSnapshot(),
      id,
      title,
    );

    if (!result) {
      return null;
    }

    this.setActiveSnapshot(result.snapshot, "local");

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }

    return result.savedSetup;
  }

  deleteCompareSetup(id: string): SavedCompareSetupRecord | null {
    this.ensureLoaded();
    const result = deleteSavedCompareSetupFromSnapshot(this.getActiveSnapshot(), id);

    if (!result) {
      return null;
    }

    this.setActiveSnapshot(result.snapshot, "local");

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }

    return result.savedSetup;
  }

  markCompareSetupOpened(id: string): SavedCompareSetupRecord | null {
    this.ensureLoaded();
    const result = markSavedCompareSetupOpenedInSnapshot(
      this.getActiveSnapshot(),
      id,
    );

    if (!result) {
      return null;
    }

    this.setActiveSnapshot(result.snapshot, "local");

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }

    return result.savedSetup;
  }

  async syncNow() {
    this.ensureLoaded();

    if (!this.syncState.accountUser) {
      return null;
    }

    this.clearPendingSync();

    const activeGeneration = this.syncGeneration;
    const activeScopeKey = this.currentScopeKey;
    const accountUser = this.syncState.accountUser;
    const revisionAtStart = this.localRevision;
    const snapshotToSync = this.getActiveSnapshot();

    this.setSyncState({
      ...this.syncState,
      mode: "syncing",
      errorMessage: null,
    });

    try {
      const response = await fetch("/api/account/compare-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          snapshot: snapshotToSync,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        SavedCompareSetupsSyncResponse;

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error ?? "Saved compare setups sync failed.");
      }

      if (
        activeGeneration !== this.syncGeneration ||
        this.syncState.accountUser?.id !== accountUser.id ||
        this.currentScopeKey !== activeScopeKey
      ) {
        return null;
      }

      const syncedSnapshot = normalizeSavedCompareSetupsSnapshot(payload.snapshot);

      if (revisionAtStart !== this.localRevision) {
        const merged = mergeSavedCompareSetupsSnapshots(
          syncedSnapshot,
          this.getActiveSnapshot(),
        );

        this.setActiveSnapshot(merged.snapshot, "remote");
        this.setSyncState({
          mode: "syncing",
          accountUser,
          lastSyncedAt: payload.updatedAt ?? new Date().toISOString(),
          lastMergeSummary: payload.mergeSummary ?? merged.summary,
          errorMessage: null,
        });
        this.scheduleSync(120);

        return merged.snapshot;
      }

      this.setActiveSnapshot(syncedSnapshot, "remote");
      this.setSyncState({
        mode: "synced",
        accountUser,
        lastSyncedAt: payload.updatedAt ?? new Date().toISOString(),
        lastMergeSummary: payload.mergeSummary ?? null,
        errorMessage: null,
      });

      return syncedSnapshot;
    } catch (error) {
      if (
        activeGeneration !== this.syncGeneration ||
        this.syncState.accountUser?.id !== accountUser.id ||
        this.currentScopeKey !== activeScopeKey
      ) {
        return null;
      }

      this.setSyncState({
        ...this.syncState,
        mode: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Saved compare setups sync failed.",
      });

      return null;
    }
  }

  enableRemoteSync(accountUser: AccountUserSummary) {
    this.ensureLoaded();

    if (
      this.syncState.accountUser?.id === accountUser.id &&
      this.currentScopeKey === accountUser.id &&
      this.syncState.mode !== "local"
    ) {
      return;
    }

    this.syncGeneration += 1;
    this.currentScopeKey = accountUser.id;
    const migratedLegacyItems = this.moveAnonymousSnapshotToScope(accountUser.id);
    this.attachSyncListeners();
    this.setSyncState({
      mode: "syncing",
      accountUser,
      lastSyncedAt: null,
      lastMergeSummary: null,
      errorMessage: null,
    });

    if (migratedLegacyItems) {
      this.emit();
    }

    void this.syncNow();
  }

  disableRemoteSync() {
    this.ensureLoaded();
    this.syncGeneration += 1;
    this.clearPendingSync();
    this.detachSyncListeners();
    const scopeChanged = this.currentScopeKey !== ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE;
    this.currentScopeKey = ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE;

    if (this.syncState.mode === "local" && !this.syncState.accountUser && !scopeChanged) {
      return;
    }

    this.syncState = defaultSyncState;
    this.emit();
  }

  resetForTests() {
    if (canUseLocalStorage() && this.handleStorageEvent) {
      window.removeEventListener("storage", this.handleStorageEvent);
    }

    this.initialized = false;
    this.cache = createEmptySavedCompareSetupsLocalCache();
    this.currentScopeKey = ANONYMOUS_SAVED_COMPARE_SETUPS_SCOPE;
    this.syncState = defaultSyncState;
    this.storageListenerAttached = false;
    this.handleStorageEvent = undefined;
    this.clearPendingSync();
    this.detachSyncListeners();
    this.syncGeneration = 0;
    this.localRevision = 0;
    this.listeners.clear();
  }
}

export const localSavedCompareSetupsStore = new LocalSavedCompareSetupsStore();

export function useSavedCompareSetupsSnapshot() {
  return useSyncExternalStore(
    localSavedCompareSetupsStore.subscribe,
    localSavedCompareSetupsStore.getSnapshot,
    () => serverSnapshot,
  );
}

export function useSavedCompareSetupsSyncState() {
  return useSyncExternalStore(
    localSavedCompareSetupsStore.subscribe,
    localSavedCompareSetupsStore.getSyncState,
    () => serverSyncState,
  );
}

export function useSavedCompareSetups() {
  return useSavedCompareSetupsSnapshot().items;
}

export function saveSavedCompareSetup(draft: SavedCompareSetupDraft) {
  return localSavedCompareSetupsStore.saveCompareSetup(draft);
}

export function renameSavedCompareSetup(id: string, title: string) {
  return localSavedCompareSetupsStore.renameCompareSetup(id, title);
}

export function deleteSavedCompareSetup(id: string) {
  return localSavedCompareSetupsStore.deleteCompareSetup(id);
}

export function markSavedCompareSetupOpened(id: string) {
  return localSavedCompareSetupsStore.markCompareSetupOpened(id);
}

export function syncSavedCompareSetupsNow() {
  return localSavedCompareSetupsStore.syncNow();
}

export function findSavedCompareSetupByFingerprint(
  items: SavedCompareSetupRecord[],
  fingerprint: string | null,
) {
  if (!fingerprint) {
    return null;
  }

  return (
    items.find((item) => buildSavedCompareSetupFingerprint(item) === fingerprint) ?? null
  );
}
