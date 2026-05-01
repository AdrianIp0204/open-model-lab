"use client";

import { useSyncExternalStore } from "react";
import {
  ASSESSMENT_SESSION_STORAGE_KEY,
  buildAssessmentSessionStorageEntryKey,
  createEmptyAssessmentSessionStoreSnapshot,
  getPersistedAssessmentSessionMatch,
  normalizeAssessmentSessionStoreSnapshot,
  type AssessmentSessionDescriptor,
  type AssessmentSessionMatch,
  type PersistedAssessmentSessionRecord,
  type PersistedAssessmentSessionStoreSnapshot,
  type PersistedQuizRunnerFlowState,
  type PersistedQuizRunnerSession,
} from "./model";

const serverSnapshot = createEmptyAssessmentSessionStoreSnapshot();
const serverReady = false;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAssessmentSessionSnapshotFromStorage() {
  if (!canUseLocalStorage()) {
    return createEmptyAssessmentSessionStoreSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(ASSESSMENT_SESSION_STORAGE_KEY);

    if (!raw) {
      return createEmptyAssessmentSessionStoreSnapshot();
    }

    return normalizeAssessmentSessionStoreSnapshot(JSON.parse(raw));
  } catch {
    return createEmptyAssessmentSessionStoreSnapshot();
  }
}

function writeAssessmentSessionSnapshotToStorage(
  snapshot: PersistedAssessmentSessionStoreSnapshot,
) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(ASSESSMENT_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore local storage failures; resume will simply be unavailable.
  }
}

class LocalAssessmentSessionStore {
  private snapshot: PersistedAssessmentSessionStoreSnapshot =
    createEmptyAssessmentSessionStoreSnapshot();
  private initialized = false;
  private listeners = new Set<() => void>();
  private storageListenerAttached = false;
  private handleStorageEvent?: (event: StorageEvent) => void;

  private attachStorageListener() {
    if (!canUseLocalStorage() || this.storageListenerAttached) {
      return;
    }

    this.handleStorageEvent = (event) => {
      if (event.key !== ASSESSMENT_SESSION_STORAGE_KEY) {
        return;
      }

      try {
        this.snapshot = normalizeAssessmentSessionStoreSnapshot(
          event.newValue ? JSON.parse(event.newValue) : createEmptyAssessmentSessionStoreSnapshot(),
        );
      } catch {
        this.snapshot = createEmptyAssessmentSessionStoreSnapshot();
      }

      this.emit();
    };

    window.addEventListener("storage", this.handleStorageEvent);
    this.storageListenerAttached = true;
  }

  private ensureLoaded() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.snapshot = readAssessmentSessionSnapshotFromStorage();
    this.attachStorageListener();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getSnapshot = () => {
    this.ensureLoaded();
    return this.snapshot;
  };

  isReady = () => {
    this.ensureLoaded();
    return true;
  };

  subscribe = (listener: () => void) => {
    this.ensureLoaded();
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  saveSession(
    descriptor: AssessmentSessionDescriptor,
    input: {
      session: PersistedQuizRunnerSession;
      flow: PersistedQuizRunnerFlowState;
    },
  ) {
    this.ensureLoaded();
    const key = buildAssessmentSessionStorageEntryKey(descriptor);
    const existingRecord = this.snapshot.sessions[key];
    const nextRecord: PersistedAssessmentSessionRecord = {
      version: 1,
      kind: descriptor.kind,
      assessmentId: descriptor.assessmentId,
      locale: descriptor.locale,
      routeHref: descriptor.routeHref,
      definitionKey: descriptor.definitionKey,
      title: descriptor.title,
      createdAt: existingRecord?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      session: input.session,
      flow: input.flow,
    };

    this.snapshot = {
      ...this.snapshot,
      sessions: {
        ...this.snapshot.sessions,
        [key]: nextRecord,
      },
    };
    writeAssessmentSessionSnapshotToStorage(this.snapshot);
    this.emit();
  }

  clearSession(descriptor: AssessmentSessionDescriptor) {
    this.ensureLoaded();
    const key = buildAssessmentSessionStorageEntryKey(descriptor);

    if (!this.snapshot.sessions[key]) {
      return;
    }

    const nextSessions = { ...this.snapshot.sessions };
    delete nextSessions[key];
    this.snapshot = {
      ...this.snapshot,
      sessions: nextSessions,
    };
    writeAssessmentSessionSnapshotToStorage(this.snapshot);
    this.emit();
  }

  resetForTests() {
    if (canUseLocalStorage() && this.handleStorageEvent) {
      window.removeEventListener("storage", this.handleStorageEvent);
    }

    this.initialized = false;
    this.snapshot = createEmptyAssessmentSessionStoreSnapshot();
    this.storageListenerAttached = false;
    this.handleStorageEvent = undefined;
    this.listeners.clear();
  }
}

export const localAssessmentSessionStore = new LocalAssessmentSessionStore();

export function useAssessmentSessionStoreSnapshot() {
  return useSyncExternalStore(
    localAssessmentSessionStore.subscribe,
    localAssessmentSessionStore.getSnapshot,
    () => serverSnapshot,
  );
}

export function useAssessmentSessionStoreReady() {
  return useSyncExternalStore(
    (listener) => {
      const unsubscribe = localAssessmentSessionStore.subscribe(listener);
      listener();

      return unsubscribe;
    },
    localAssessmentSessionStore.isReady,
    () => serverReady,
  );
}

export function useAssessmentSessionMatch(
  descriptor: AssessmentSessionDescriptor | null,
): AssessmentSessionMatch {
  const snapshot = useAssessmentSessionStoreSnapshot();
  const ready = useAssessmentSessionStoreReady();

  if (!ready || !descriptor) {
    return {
      status: "none",
    };
  }

  return getPersistedAssessmentSessionMatch(snapshot, descriptor);
}

export function saveAssessmentSession(
  descriptor: AssessmentSessionDescriptor,
  input: {
    session: PersistedQuizRunnerSession;
    flow: PersistedQuizRunnerFlowState;
  },
) {
  localAssessmentSessionStore.saveSession(descriptor, input);
}

export function clearAssessmentSession(descriptor: AssessmentSessionDescriptor) {
  localAssessmentSessionStore.clearSession(descriptor);
}

export function resetAssessmentSessionStoreForTests() {
  localAssessmentSessionStore.resetForTests();
}
