"use client";

import { useSyncExternalStore } from "react";
import type { AccountUserSummary } from "@/lib/account/model";
import { encodePublicExperimentCard, resolvePublicExperimentCard } from "@/lib/share-links";
import {
  ANONYMOUS_SAVED_SETUPS_SCOPE,
  buildSavedSetupFingerprint,
  buildSavedSetupTombstone,
  createEmptySavedSetupsLocalCache,
  createEmptySavedSetupsSnapshot,
  getSavedSetupsSnapshotForScope,
  hasSavedSetupsSnapshotData,
  mergeSavedSetupsSnapshots,
  normalizeSavedSetupsLocalCache,
  normalizeSavedSetupsSnapshot,
  SAVED_SETUPS_STORAGE_KEY,
  setSavedSetupsSnapshotForScope,
  type SavedSetupDraft,
  type SavedSetupRecord,
  type SavedSetupsLocalCache,
  type SavedSetupsMergeSummary,
  type SavedSetupsSnapshot,
} from "@/lib/saved-setups";

type SaveSavedSetupResult = {
  savedSetup: SavedSetupRecord;
  status: "created" | "existing";
};

export type SavedSetupsSyncMode = "local" | "syncing" | "synced" | "error";

export type SavedSetupsSyncState = {
  mode: SavedSetupsSyncMode;
  accountUser: AccountUserSummary | null;
  lastSyncedAt: string | null;
  lastMergeSummary: SavedSetupsMergeSummary | null;
  errorMessage: string | null;
};

type SavedSetupsSyncResponse = {
  error?: string;
  mergeSummary?: SavedSetupsMergeSummary;
  snapshot?: SavedSetupsSnapshot;
  updatedAt?: string;
};

const defaultSyncState: SavedSetupsSyncState = {
  mode: "local",
  accountUser: null,
  lastSyncedAt: null,
  lastMergeSummary: null,
  errorMessage: null,
};

const serverSnapshot = createEmptySavedSetupsSnapshot();
const serverSyncState = defaultSyncState;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSavedSetupsLocalCacheFromStorage() {
  if (!canUseLocalStorage()) {
    return createEmptySavedSetupsLocalCache();
  }

  try {
    const raw = window.localStorage.getItem(SAVED_SETUPS_STORAGE_KEY);

    if (!raw) {
      return createEmptySavedSetupsLocalCache();
    }

    return normalizeSavedSetupsLocalCache(JSON.parse(raw));
  } catch {
    return createEmptySavedSetupsLocalCache();
  }
}

function writeSavedSetupsLocalCacheToStorage(cache: SavedSetupsLocalCache) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(SAVED_SETUPS_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Saved setups could not be stored on this browser.",
    );
  }
}

class LocalSavedSetupsStore {
  private cache: SavedSetupsLocalCache = createEmptySavedSetupsLocalCache();
  private currentScopeKey = ANONYMOUS_SAVED_SETUPS_SCOPE;
  private syncState: SavedSetupsSyncState = defaultSyncState;
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
      if (event.key !== SAVED_SETUPS_STORAGE_KEY) {
        return;
      }

      this.cache = readSavedSetupsLocalCacheFromStorage();
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
    this.cache = readSavedSetupsLocalCacheFromStorage();
    this.attachStorageListener();
  }

  private getActiveSnapshot() {
    return getSavedSetupsSnapshotForScope(this.cache, this.currentScopeKey);
  }

  private setActiveSnapshot(snapshot: SavedSetupsSnapshot, kind: "local" | "remote") {
    this.cache = setSavedSetupsSnapshotForScope(this.cache, this.currentScopeKey, snapshot);
    writeSavedSetupsLocalCacheToStorage(this.cache);

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

  private setSyncState(nextState: SavedSetupsSyncState) {
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
    const activeSnapshot = getSavedSetupsSnapshotForScope(this.cache, scopeKey);

    if (hasSavedSetupsSnapshotData(activeSnapshot)) {
      return false;
    }

    const anonymousSnapshot = getSavedSetupsSnapshotForScope(
      this.cache,
      ANONYMOUS_SAVED_SETUPS_SCOPE,
    );

    if (!hasSavedSetupsSnapshotData(anonymousSnapshot)) {
      return false;
    }

    this.cache = setSavedSetupsSnapshotForScope(this.cache, scopeKey, anonymousSnapshot);
    this.cache = setSavedSetupsSnapshotForScope(
      this.cache,
      ANONYMOUS_SAVED_SETUPS_SCOPE,
      createEmptySavedSetupsSnapshot(),
    );
    writeSavedSetupsLocalCacheToStorage(this.cache);

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

  saveSetup(draft: SavedSetupDraft): SaveSavedSetupResult {
    this.ensureLoaded();
    const now = new Date().toISOString();
    const snapshot = this.getActiveSnapshot();
    const fingerprint = buildSavedSetupFingerprint(draft);
    const existing = snapshot.items.find(
      (item) => buildSavedSetupFingerprint(item) === fingerprint,
    );
    const nextTombstones = snapshot.tombstones.filter(
      (item) => item.fingerprint !== fingerprint,
    );

    if (existing) {
      const nextRecord: SavedSetupRecord = {
        ...existing,
        conceptTitle: draft.conceptTitle,
        publicExperimentParam:
          existing.publicExperimentParam ?? draft.publicExperimentParam ?? null,
        updatedAt: now,
      };

      this.setActiveSnapshot(
        normalizeSavedSetupsSnapshot({
          version: "v2",
          items: snapshot.items.map((item) => (item.id === existing.id ? nextRecord : item)),
          tombstones: nextTombstones,
        }),
        "local",
      );

      if (this.syncState.accountUser) {
        this.scheduleSync();
      }

      return {
        savedSetup: nextRecord,
        status: "existing",
      };
    }

    const nextRecord: SavedSetupRecord = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      ...draft,
    };

    this.setActiveSnapshot(
      normalizeSavedSetupsSnapshot({
        version: "v2",
        items: [...snapshot.items, nextRecord],
        tombstones: nextTombstones,
      }),
      "local",
    );

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }

    return {
      savedSetup: nextRecord,
      status: "created",
    };
  }

  renameSetup(id: string, title: string): SavedSetupRecord | null {
    this.ensureLoaded();
    const now = new Date().toISOString();
    const snapshot = this.getActiveSnapshot();
    let renamed: SavedSetupRecord | null = null;

    this.setActiveSnapshot(
      normalizeSavedSetupsSnapshot({
        version: "v2",
        items: snapshot.items.map((item) => {
          if (item.id !== id) {
            return item;
          }

          const resolvedExperimentCard = item.publicExperimentParam
            ? resolvePublicExperimentCard(item.publicExperimentParam, item.conceptSlug)
            : null;

          renamed = {
            ...item,
            title,
            publicExperimentParam: resolvedExperimentCard
              ? encodePublicExperimentCard({
                  conceptSlug: item.conceptSlug,
                  title,
                  prompt: resolvedExperimentCard.prompt,
                  kind: resolvedExperimentCard.kind,
                })
              : item.publicExperimentParam,
            updatedAt: now,
          };

          return renamed;
        }),
        tombstones: snapshot.tombstones,
      }),
      "local",
    );

    if (renamed && this.syncState.accountUser) {
      this.scheduleSync();
    }

    return renamed;
  }

  deleteSetup(id: string): SavedSetupRecord | null {
    this.ensureLoaded();
    const snapshot = this.getActiveSnapshot();
    const existing = snapshot.items.find((item) => item.id === id) ?? null;

    if (!existing) {
      return null;
    }

    this.setActiveSnapshot(
      normalizeSavedSetupsSnapshot({
        version: "v2",
        items: snapshot.items.filter((item) => item.id !== id),
        tombstones: [
          ...snapshot.tombstones.filter(
            (item) => item.fingerprint !== buildSavedSetupFingerprint(existing),
          ),
          buildSavedSetupTombstone(existing, new Date().toISOString()),
        ],
      }),
      "local",
    );

    if (this.syncState.accountUser) {
      this.scheduleSync();
    }

    return existing;
  }

  markSetupOpened(id: string): SavedSetupRecord | null {
    this.ensureLoaded();
    const now = new Date().toISOString();
    const snapshot = this.getActiveSnapshot();
    let opened: SavedSetupRecord | null = null;

    this.setActiveSnapshot(
      normalizeSavedSetupsSnapshot({
        version: "v2",
        items: snapshot.items.map((item) => {
          if (item.id !== id) {
            return item;
          }

          opened = {
            ...item,
            lastOpenedAt: now,
          };

          return opened;
        }),
        tombstones: snapshot.tombstones,
      }),
      "local",
    );

    if (opened && this.syncState.accountUser) {
      this.scheduleSync();
    }

    return opened;
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
      const response = await fetch("/api/account/saved-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          snapshot: snapshotToSync,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as SavedSetupsSyncResponse;

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error ?? "Saved setups sync failed.");
      }

      if (
        activeGeneration !== this.syncGeneration ||
        this.syncState.accountUser?.id !== accountUser.id ||
        this.currentScopeKey !== activeScopeKey
      ) {
        return null;
      }

      const syncedSnapshot = normalizeSavedSetupsSnapshot(payload.snapshot);

      if (revisionAtStart !== this.localRevision) {
        const merged = mergeSavedSetupsSnapshots(syncedSnapshot, this.getActiveSnapshot());
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
          error instanceof Error ? error.message : "Saved setups sync failed.",
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
    const scopeChanged = this.currentScopeKey !== ANONYMOUS_SAVED_SETUPS_SCOPE;
    this.currentScopeKey = ANONYMOUS_SAVED_SETUPS_SCOPE;

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
    this.cache = createEmptySavedSetupsLocalCache();
    this.currentScopeKey = ANONYMOUS_SAVED_SETUPS_SCOPE;
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

export const localSavedSetupsStore = new LocalSavedSetupsStore();

export function useSavedSetupsSnapshot() {
  return useSyncExternalStore(
    localSavedSetupsStore.subscribe,
    localSavedSetupsStore.getSnapshot,
    () => serverSnapshot,
  );
}

export function useSavedSetupsSyncState() {
  return useSyncExternalStore(
    localSavedSetupsStore.subscribe,
    localSavedSetupsStore.getSyncState,
    () => serverSyncState,
  );
}

export function useSavedSetups() {
  return useSavedSetupsSnapshot().items;
}

export function saveSavedSetup(draft: SavedSetupDraft) {
  return localSavedSetupsStore.saveSetup(draft);
}

export function renameSavedSetup(id: string, title: string) {
  return localSavedSetupsStore.renameSetup(id, title);
}

export function deleteSavedSetup(id: string) {
  return localSavedSetupsStore.deleteSetup(id);
}

export function markSavedSetupOpened(id: string) {
  return localSavedSetupsStore.markSetupOpened(id);
}

export function syncSavedSetupsNow() {
  return localSavedSetupsStore.syncNow();
}
