import { CIRCUIT_DOCUMENT_VERSION, normalizeCircuitDocument } from "./model";
import type { CircuitDocument } from "./types";

export const CIRCUIT_DRAFT_STORAGE_KEY = "open-model-lab.circuit-builder.draft.v1";

export type CircuitDraftSnapshot = {
  savedAt: string | null;
  document: CircuitDocument;
};

export type CircuitDraftReadResult =
  | { kind: "missing" }
  | { kind: "ready"; draft: CircuitDraftSnapshot }
  | { kind: "invalid"; reason: string };

function canUseCircuitDraftStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readCircuitDraftFromStorage(): CircuitDraftReadResult {
  if (!canUseCircuitDraftStorage()) {
    return { kind: "missing" };
  }

  const raw = window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY);
  if (!raw) {
    return { kind: "missing" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      kind: "invalid",
      reason: "The local circuit draft could not be parsed and was discarded.",
    };
  }

  try {
    if (
      parsed &&
      typeof parsed === "object" &&
      "document" in parsed &&
      parsed.document !== undefined
    ) {
      const envelope = parsed as {
        version?: unknown;
        savedAt?: unknown;
        document: unknown;
      };

      if (
        envelope.version !== undefined &&
        envelope.version !== CIRCUIT_DOCUMENT_VERSION
      ) {
        return {
          kind: "invalid",
          reason: "The saved local circuit draft uses an unsupported version and was discarded.",
        };
      }

      return {
        kind: "ready",
        draft: {
          savedAt:
            typeof envelope.savedAt === "string" ? envelope.savedAt : null,
          document: normalizeCircuitDocument(envelope.document),
        },
      };
    }

    return {
      kind: "ready",
      draft: {
        savedAt: null,
        document: normalizeCircuitDocument(parsed),
      },
    };
  } catch (error) {
    return {
      kind: "invalid",
      reason:
        error instanceof Error
          ? error.message
          : "The local circuit draft could not be restored and was discarded.",
    };
  }
}

export function writeCircuitDraftToStorage(document: CircuitDocument) {
  if (!canUseCircuitDraftStorage()) {
    return;
  }

  window.localStorage.setItem(
    CIRCUIT_DRAFT_STORAGE_KEY,
    JSON.stringify({
      version: CIRCUIT_DOCUMENT_VERSION,
      savedAt: new Date().toISOString(),
      document: normalizeCircuitDocument(document),
    }),
  );
}

export function clearCircuitDraftFromStorage() {
  if (!canUseCircuitDraftStorage()) {
    return;
  }

  window.localStorage.removeItem(CIRCUIT_DRAFT_STORAGE_KEY);
}

export function formatCircuitDraftSavedAt(savedAt: string | null) {
  if (!savedAt) {
    return "from an earlier local session";
  }

  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) {
    return "from an earlier local session";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
