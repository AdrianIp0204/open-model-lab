import { CIRCUIT_DOCUMENT_VERSION, normalizeCircuitDocument } from "./model";
import type { CircuitDocument, CircuitRenderMode } from "./types";
import { normalizeCircuitRenderMode } from "./visual-mode";

export const CIRCUIT_DRAFT_STORAGE_KEY = "open-model-lab.circuit-builder.draft.v1";
export const CIRCUIT_LOCALE_HANDOFF_STORAGE_KEY =
  "open-model-lab:circuit-builder-locale-handoff:v1";

const CIRCUIT_LOCALE_HANDOFF_MAX_AGE_MS = 30_000;
const CIRCUIT_LOCALE_HANDOFF_MAX_ZOOM = 2.4;

export type CircuitDraftSnapshot = {
  savedAt: string | null;
  document: CircuitDocument;
};

export type CircuitDraftReadResult =
  | { kind: "missing" }
  | { kind: "ready"; draft: CircuitDraftSnapshot }
  | { kind: "invalid"; reason: string };

export type CircuitLocaleHandoffSelection =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;

export type CircuitLocaleHandoffSnapshot = {
  savedAtMs: number;
  document: CircuitDocument;
  renderMode: CircuitRenderMode;
  selection: CircuitLocaleHandoffSelection;
};

export type CircuitLocaleHandoffReadResult =
  | { kind: "missing" }
  | { kind: "ready"; handoff: CircuitLocaleHandoffSnapshot }
  | { kind: "stale" }
  | { kind: "invalid"; reason: string };

function canUseCircuitDraftStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseCircuitSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHandoffView(rawDocument: unknown, normalized: CircuitDocument) {
  if (!rawDocument || typeof rawDocument !== "object" || !("view" in rawDocument)) {
    return normalized.view;
  }

  const view = (rawDocument as { view?: unknown }).view;
  if (!view || typeof view !== "object") {
    return normalized.view;
  }

  const rawView = view as {
    zoom?: unknown;
    offsetX?: unknown;
    offsetY?: unknown;
  };
  const zoom = typeof rawView.zoom === "number" && Number.isFinite(rawView.zoom)
    ? clamp(rawView.zoom, 0.45, CIRCUIT_LOCALE_HANDOFF_MAX_ZOOM)
    : normalized.view.zoom;
  const offsetX =
    typeof rawView.offsetX === "number" && Number.isFinite(rawView.offsetX)
      ? rawView.offsetX
      : normalized.view.offsetX;
  const offsetY =
    typeof rawView.offsetY === "number" && Number.isFinite(rawView.offsetY)
      ? rawView.offsetY
      : normalized.view.offsetY;

  return { zoom, offsetX, offsetY };
}

function normalizeHandoffSelection(
  document: CircuitDocument,
  selection: unknown,
): CircuitLocaleHandoffSelection {
  if (!selection || typeof selection !== "object") {
    return null;
  }

  const candidate = selection as { kind?: unknown; id?: unknown };
  if (candidate.kind === "component" && typeof candidate.id === "string") {
    return document.components.some((component) => component.id === candidate.id)
      ? { kind: "component", id: candidate.id }
      : null;
  }

  if (candidate.kind === "wire" && typeof candidate.id === "string") {
    return document.wires.some((wire) => wire.id === candidate.id)
      ? { kind: "wire", id: candidate.id }
      : null;
  }

  return null;
}

export function parseCircuitLocaleHandoff(
  raw: string,
  nowMs = Date.now(),
  maxAgeMs = CIRCUIT_LOCALE_HANDOFF_MAX_AGE_MS,
): CircuitLocaleHandoffReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      kind: "invalid",
      reason: "The circuit locale handoff could not be parsed.",
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      kind: "invalid",
      reason: "The circuit locale handoff was not an object.",
    };
  }

  const envelope = parsed as {
    version?: unknown;
    savedAtMs?: unknown;
    document?: unknown;
    renderMode?: unknown;
    selection?: unknown;
  };

  if (envelope.version !== CIRCUIT_DOCUMENT_VERSION) {
    return {
      kind: "invalid",
      reason: "The circuit locale handoff uses an unsupported version.",
    };
  }

  if (
    typeof envelope.savedAtMs !== "number" ||
    !Number.isFinite(envelope.savedAtMs)
  ) {
    return {
      kind: "invalid",
      reason: "The circuit locale handoff did not include a valid timestamp.",
    };
  }

  if (nowMs - envelope.savedAtMs > maxAgeMs) {
    return { kind: "stale" };
  }

  try {
    const normalizedDocument = normalizeCircuitDocument(envelope.document);
    const document = {
      ...normalizedDocument,
      view: normalizeHandoffView(envelope.document, normalizedDocument),
    };

    return {
      kind: "ready",
      handoff: {
        savedAtMs: envelope.savedAtMs,
        document,
        renderMode: normalizeCircuitRenderMode(envelope.renderMode),
        selection: normalizeHandoffSelection(document, envelope.selection),
      },
    };
  } catch (error) {
    return {
      kind: "invalid",
      reason:
        error instanceof Error
          ? error.message
          : "The circuit locale handoff could not be restored.",
    };
  }
}

export function writeCircuitLocaleHandoffToStorage({
  document,
  renderMode,
  selection,
}: {
  document: CircuitDocument;
  renderMode: CircuitRenderMode;
  selection: CircuitLocaleHandoffSelection;
}) {
  if (!canUseCircuitSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      CIRCUIT_LOCALE_HANDOFF_STORAGE_KEY,
      JSON.stringify({
        version: CIRCUIT_DOCUMENT_VERSION,
        savedAtMs: Date.now(),
        document,
        renderMode: normalizeCircuitRenderMode(renderMode),
        selection,
      }),
    );
  } catch {
    // Locale switching can still work through React state when storage is unavailable.
  }
}

export function clearCircuitLocaleHandoffFromStorage() {
  if (!canUseCircuitSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(CIRCUIT_LOCALE_HANDOFF_STORAGE_KEY);
  } catch {
    // A failed cleanup should not block the rest of the builder lifecycle.
  }
}

export function consumeCircuitLocaleHandoffFromStorage(): CircuitLocaleHandoffReadResult {
  if (!canUseCircuitSessionStorage()) {
    return { kind: "missing" };
  }

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(CIRCUIT_LOCALE_HANDOFF_STORAGE_KEY);
  } catch {
    return { kind: "missing" };
  }
  if (!raw) {
    return { kind: "missing" };
  }

  clearCircuitLocaleHandoffFromStorage();
  return parseCircuitLocaleHandoff(raw);
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
