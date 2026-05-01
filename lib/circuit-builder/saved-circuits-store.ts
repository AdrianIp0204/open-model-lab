"use client";

import { useSyncExternalStore } from "react";
import { normalizeCircuitDocument } from "./model";
import type { CircuitDocument } from "./types";

export const SAVED_CIRCUITS_STORAGE_KEY =
  "open-model-lab.circuit-builder.saved-circuits.v1";

export type SavedCircuitRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  document: CircuitDocument;
};

type SavedCircuitsLibrary = {
  version: "v1";
  items: SavedCircuitRecord[];
};

type SaveSavedCircuitResult = {
  savedCircuit: SavedCircuitRecord;
  status: "created" | "updated";
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createEmptySavedCircuitsLibrary(): SavedCircuitsLibrary {
  return {
    version: "v1",
    items: [],
  };
}

function sortSavedCircuits(items: SavedCircuitRecord[]) {
  return [...items].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    if (left.createdAt !== right.createdAt) {
      return right.createdAt.localeCompare(left.createdAt);
    }
    return left.title.localeCompare(right.title);
  });
}

function createSavedCircuitId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `saved-circuit-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSavedCircuitRecord(input: unknown): SavedCircuitRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  try {
    return {
      id: candidate.id,
      title: candidate.title.trim() || "Saved circuit",
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      document: normalizeCircuitDocument(candidate.document),
    };
  } catch {
    return null;
  }
}

function normalizeSavedCircuitsLibrary(input: unknown) {
  const library =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawItems = Array.isArray(library.items) ? library.items : [];
  const items = rawItems
    .map((item) => normalizeSavedCircuitRecord(item))
    .filter((item): item is SavedCircuitRecord => Boolean(item));

  return {
    library: {
      version: "v1" as const,
      items: sortSavedCircuits(items),
    },
    discardedCount: rawItems.length - items.length,
  };
}

function readSavedCircuitsLibraryFromStorage() {
  if (!canUseLocalStorage()) {
    return {
      library: createEmptySavedCircuitsLibrary(),
      discardedCount: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(SAVED_CIRCUITS_STORAGE_KEY);
    if (!raw) {
      return {
        library: createEmptySavedCircuitsLibrary(),
        discardedCount: 0,
      };
    }

    return normalizeSavedCircuitsLibrary(JSON.parse(raw));
  } catch {
    return {
      library: createEmptySavedCircuitsLibrary(),
      discardedCount: 0,
    };
  }
}

function writeSavedCircuitsLibraryToStorage(library: SavedCircuitsLibrary) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    SAVED_CIRCUITS_STORAGE_KEY,
    JSON.stringify({
      version: "v1",
      items: library.items,
    }),
  );
}

class LocalSavedCircuitsStore {
  private library = createEmptySavedCircuitsLibrary();
  private listeners = new Set<() => void>();
  private initialized = false;
  private storageListenerAttached = false;
  private handleStorageEvent?: (event: StorageEvent) => void;
  private discardedCount = 0;

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private ensureLoaded() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const result = readSavedCircuitsLibraryFromStorage();
    this.library = result.library;
    this.discardedCount = result.discardedCount;

    if (result.discardedCount > 0) {
      writeSavedCircuitsLibraryToStorage(this.library);
    }

    if (!canUseLocalStorage() || this.storageListenerAttached) {
      return;
    }

    this.handleStorageEvent = (event) => {
      if (event.key !== SAVED_CIRCUITS_STORAGE_KEY) {
        return;
      }

      const next = readSavedCircuitsLibraryFromStorage();
      this.library = next.library;
      this.discardedCount = next.discardedCount;
      this.emit();
    };

    window.addEventListener("storage", this.handleStorageEvent);
    this.storageListenerAttached = true;
  }

  getSnapshot = () => {
    this.ensureLoaded();
    return this.library.items;
  };

  getDiscardedCount = () => {
    this.ensureLoaded();
    return this.discardedCount;
  };

  subscribe = (listener: () => void) => {
    this.ensureLoaded();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  resetForTests() {
    this.library = createEmptySavedCircuitsLibrary();
    this.discardedCount = 0;
    this.initialized = false;
  }

  saveCircuit({
    title,
    document,
    existingId,
  }: {
    title: string;
    document: CircuitDocument;
    existingId?: string | null;
  }): SaveSavedCircuitResult {
    this.ensureLoaded();
    const now = new Date().toISOString();

    if (existingId) {
      const existing = this.library.items.find((item) => item.id === existingId);
      if (existing) {
        const updated: SavedCircuitRecord = {
          ...existing,
          updatedAt: now,
          document: normalizeCircuitDocument(document),
        };
        this.library = {
          version: "v1",
          items: sortSavedCircuits(
            this.library.items.map((item) => (item.id === existingId ? updated : item)),
          ),
        };
        writeSavedCircuitsLibraryToStorage(this.library);
        this.emit();
        return {
          savedCircuit: updated,
          status: "updated",
        };
      }
    }

    const savedCircuit: SavedCircuitRecord = {
      id: createSavedCircuitId(),
      title: title.trim() || "Saved circuit",
      createdAt: now,
      updatedAt: now,
      document: normalizeCircuitDocument(document),
    };

    this.library = {
      version: "v1",
      items: sortSavedCircuits([...this.library.items, savedCircuit]),
    };
    writeSavedCircuitsLibraryToStorage(this.library);
    this.emit();
    return {
      savedCircuit,
      status: "created",
    };
  }

  renameCircuit(id: string, title: string) {
    this.ensureLoaded();
    const trimmed = title.trim();
    if (!trimmed) {
      return null;
    }
    const existing = this.library.items.find((item) => item.id === id);
    if (!existing) {
      return null;
    }

    const renamed: SavedCircuitRecord = {
      ...existing,
      title: trimmed,
      updatedAt: new Date().toISOString(),
    };
    this.library = {
      version: "v1",
      items: sortSavedCircuits(
        this.library.items.map((item) => (item.id === id ? renamed : item)),
      ),
    };
    writeSavedCircuitsLibraryToStorage(this.library);
    this.emit();
    return renamed;
  }

  deleteCircuit(id: string) {
    this.ensureLoaded();
    const existing = this.library.items.find((item) => item.id === id) ?? null;
    if (!existing) {
      return null;
    }

    this.library = {
      version: "v1",
      items: this.library.items.filter((item) => item.id !== id),
    };
    writeSavedCircuitsLibraryToStorage(this.library);
    this.emit();
    return existing;
  }

  getById(id: string) {
    this.ensureLoaded();
    return this.library.items.find((item) => item.id === id) ?? null;
  }
}

const localSavedCircuitsStore = new LocalSavedCircuitsStore();
export { localSavedCircuitsStore };

export function useSavedCircuits() {
  return useSyncExternalStore(
    localSavedCircuitsStore.subscribe,
    localSavedCircuitsStore.getSnapshot,
    localSavedCircuitsStore.getSnapshot,
  );
}

export function getSavedCircuitsDiscardedCount() {
  return localSavedCircuitsStore.getDiscardedCount();
}

export function saveSavedCircuit(input: {
  title: string;
  document: CircuitDocument;
  existingId?: string | null;
}) {
  return localSavedCircuitsStore.saveCircuit(input);
}

export function renameSavedCircuit(id: string, title: string) {
  return localSavedCircuitsStore.renameCircuit(id, title);
}

export function deleteSavedCircuit(id: string) {
  return localSavedCircuitsStore.deleteCircuit(id);
}

export function getSavedCircuitById(id: string) {
  return localSavedCircuitsStore.getById(id);
}
