"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import { useAccountSession } from "@/lib/account/client";
import type { AccountSavedCircuitRecord } from "@/lib/account/circuit-saves";
import {
  deleteAccountCircuitSave,
  listAccountCircuitSaves,
  renameAccountCircuitSave,
  saveAccountCircuitSave,
} from "@/lib/circuit-builder/account-saves-client";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  buildCircuitJsonExport,
  buildCircuitSvgExport,
  clampComponentPoint,
  clearCircuitDraftFromStorage,
  circuitBuilderPresets,
  convertViewPointToWorld,
  createComponentInstance,
  createEmptyCircuitDocument,
  downloadTextFile,
  formatCircuitDraftSavedAt,
  getCircuitComponentById,
  getCircuitComponentDefinition,
  getVisibleWorldCenter,
  getCircuitWireDisplayLabel,
  getSavedCircuitsDiscardedCount,
  normalizeCircuitDocument,
  parseCircuitDocumentJson,
  readCircuitDraftFromStorage,
  renameSavedCircuit,
  saveSavedCircuit,
  serializeCircuitDocument,
  snapPointToGrid,
  solveCircuitDocument,
  useSavedCircuits,
  deleteSavedCircuit,
  writeCircuitDraftToStorage,
  type CircuitComponentType,
  type CircuitDocument,
  type CircuitPoint,
  type CircuitScalar,
  type CircuitDraftSnapshot,
  type CircuitTerminalRef,
} from "@/lib/circuit-builder";
import { CircuitInspector } from "./CircuitInspector";
import { CircuitEnvironmentControl } from "./CircuitEnvironmentControl";
import { CircuitPalette } from "./CircuitPalette";
import { CircuitToolbarMenu } from "./CircuitToolbarMenu";
import { CircuitWorkspace } from "./CircuitWorkspace";

type BuilderSelection =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;

type ActiveSavedCircuitRef =
  | { kind: "local"; id: string }
  | { kind: "account"; id: string }
  | null;

type HistoryEntry = {
  document: CircuitDocument;
  label: string;
  activeSavedCircuitRef: ActiveSavedCircuitRef;
};

type BuilderState = {
  document: CircuitDocument;
  activeSavedCircuitRef: ActiveSavedCircuitRef;
  selection: BuilderSelection;
  activeTool: "select" | "wire";
  pendingWireStart: CircuitTerminalRef | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  historySession: HistoryEntry | null;
};

type BuilderAction =
  | {
      type: "load-document";
      document: CircuitDocument;
      label: string;
      activeSavedCircuitRef?: ActiveSavedCircuitRef;
    }
  | { type: "set-active-saved-circuit-ref"; savedCircuitRef: ActiveSavedCircuitRef }
  | { type: "set-tool"; tool: "select" | "wire" }
  | { type: "begin-history-session"; label: string }
  | { type: "commit-history-session" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "update-environment"; key: "temperatureC" | "lightLevelPercent"; value: number }
  | { type: "select-component"; componentId: string | null }
  | { type: "select-wire"; wireId: string | null }
  | { type: "start-wire"; ref: CircuitTerminalRef }
  | { type: "cancel-wire" }
  | { type: "add-wire"; ref: CircuitTerminalRef }
  | { type: "add-component"; componentType: CircuitComponentType; point: CircuitPoint }
  | {
      type: "move-component";
      componentId: string;
      point: CircuitPoint;
      historyLabel?: string;
    }
  | { type: "update-view"; view: CircuitDocument["view"] }
  | { type: "update-property"; componentId: string; key: string; value: CircuitScalar }
  | { type: "rotate-component"; componentId: string }
  | { type: "delete-component"; componentId: string }
  | { type: "delete-wire"; wireId: string }
  | { type: "apply-auto-blown-fuses"; componentIds: string[] }
  | { type: "reset-fuse"; componentId: string };

const positionOffsets: CircuitPoint[] = [
  { x: 0, y: 0 },
  { x: 96, y: 0 },
  { x: 0, y: 96 },
  { x: 96, y: 96 },
];
const MAX_HISTORY_ENTRIES = 80;
const toolbarButtonClass =
  "rounded-full border border-line bg-paper px-3 py-1.5 text-[0.92rem] font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-paper-strong disabled:cursor-not-allowed disabled:opacity-50";
const toolbarGroupClass =
  "flex items-center gap-2 rounded-[20px] border border-line bg-paper-strong/90 px-2.5 py-2";
const defaultCircuitView = {
  zoom: 0.78,
  offsetX: 120,
  offsetY: 82,
} satisfies CircuitDocument["view"];
const minimumWorkspaceZoom = 0.45;
const maximumWorkspaceZoom = 2.4;
const maximumFitWorkspaceZoom = 1.65;
const circuitCanvasCenter = {
  x: CIRCUIT_CANVAS_WIDTH / 2,
  y: CIRCUIT_CANVAS_HEIGHT / 2,
};
const fitViewPadding = 144;
const componentFitRadius = {
  x: 128,
  y: 112,
};
const circuitViewEqualityEpsilon = 0.0001;

function circuitViewsEqual(a: CircuitDocument["view"], b: CircuitDocument["view"]) {
  return (
    Math.abs(a.zoom - b.zoom) < circuitViewEqualityEpsilon &&
    Math.abs(a.offsetX - b.offsetX) < circuitViewEqualityEpsilon &&
    Math.abs(a.offsetY - b.offsetY) < circuitViewEqualityEpsilon
  );
}

function buildFittedCircuitView(document: CircuitDocument) {
  if (document.components.length === 0) {
    return defaultCircuitView;
  }

  const bounds = document.components.reduce(
    (current, component) => ({
      minX: Math.min(current.minX, component.x - componentFitRadius.x),
      maxX: Math.max(current.maxX, component.x + componentFitRadius.x),
      minY: Math.min(current.minY, component.y - componentFitRadius.y),
      maxY: Math.max(current.maxY, component.y + componentFitRadius.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  const boundsWidth = Math.max(bounds.maxX - bounds.minX, componentFitRadius.x * 2);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, componentFitRadius.y * 2);
  const zoom = Math.max(
    minimumWorkspaceZoom,
    Math.min(
      maximumFitWorkspaceZoom,
      Math.min(
        (CIRCUIT_CANVAS_WIDTH - fitViewPadding * 2) / boundsWidth,
        (CIRCUIT_CANVAS_HEIGHT - fitViewPadding * 2) / boundsHeight,
      ),
    ),
  );
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  return {
    zoom,
    offsetX: circuitCanvasCenter.x - center.x * zoom,
    offsetY: circuitCanvasCenter.y - center.y * zoom,
  } satisfies CircuitDocument["view"];
}

function sameTerminal(a: CircuitTerminalRef | null, b: CircuitTerminalRef | null) {
  return Boolean(
    a &&
      b &&
      a.componentId === b.componentId &&
      a.terminal === b.terminal,
  );
}

function formatSavedCircuitTimestamp(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function cloneDocument(document: CircuitDocument) {
  return JSON.parse(serializeCircuitDocument(document)) as CircuitDocument;
}

function documentsEqual(a: CircuitDocument, b: CircuitDocument) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pushHistoryEntry(entries: HistoryEntry[], entry: HistoryEntry) {
  return [
    ...entries.slice(-(MAX_HISTORY_ENTRIES - 1)),
    {
      label: entry.label,
      document: cloneDocument(entry.document),
      activeSavedCircuitRef: entry.activeSavedCircuitRef,
    },
  ];
}

function applyImmediateDocumentChange(
  state: BuilderState,
  nextDocument: CircuitDocument,
  label: string,
) {
  const normalized = normalizeCircuitDocument(nextDocument);
  if (documentsEqual(state.document, normalized)) {
    return state;
  }

  return {
    ...state,
    document: normalized,
    past: pushHistoryEntry(state.past, {
      document: state.document,
      label,
      activeSavedCircuitRef: state.activeSavedCircuitRef,
    }),
    future: [],
    historySession: null,
  };
}

function updateDocumentWithoutHistory(
  state: BuilderState,
  nextDocument: CircuitDocument,
) {
  const normalized = normalizeCircuitDocument(nextDocument);
  if (documentsEqual(state.document, normalized)) {
    return state;
  }

  return {
    ...state,
    document: normalized,
  };
}

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "load-document":
      return {
        ...applyImmediateDocumentChange(
          state,
          action.document,
          action.label,
        ),
        selection: null,
        activeSavedCircuitRef: action.activeSavedCircuitRef ?? null,
        activeTool: "select",
        pendingWireStart: null,
      };
    case "set-active-saved-circuit-ref":
      return {
        ...state,
        activeSavedCircuitRef: action.savedCircuitRef,
      };
    case "set-tool":
      return {
        ...state,
        activeTool: action.tool,
        pendingWireStart: action.tool === "wire" ? state.pendingWireStart : null,
      };
    case "begin-history-session":
      return state.historySession
        ? state
        : {
            ...state,
            historySession: {
              label: action.label,
              document: cloneDocument(state.document),
              activeSavedCircuitRef: state.activeSavedCircuitRef,
            },
          };
    case "commit-history-session":
      if (!state.historySession) {
        return state;
      }
      if (documentsEqual(state.historySession.document, state.document)) {
        return {
          ...state,
          historySession: null,
        };
      }
      return {
        ...state,
        past: pushHistoryEntry(state.past, state.historySession),
        future: [],
        historySession: null,
      };
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) {
        return state;
      }
      return {
        ...state,
        document: cloneDocument(previous.document),
        activeSavedCircuitRef: previous.activeSavedCircuitRef,
        past: state.past.slice(0, -1),
        future: [
          {
            label: previous.label,
            document: cloneDocument(state.document),
            activeSavedCircuitRef: state.activeSavedCircuitRef,
          },
          ...state.future,
        ],
        selection: null,
        activeTool: "select",
        pendingWireStart: null,
        historySession: null,
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) {
        return state;
      }
      return {
        ...state,
        document: cloneDocument(next.document),
        activeSavedCircuitRef: next.activeSavedCircuitRef,
        past: pushHistoryEntry(state.past, {
          label: next.label,
          document: state.document,
          activeSavedCircuitRef: state.activeSavedCircuitRef,
        }),
        future: state.future.slice(1),
        selection: null,
        activeTool: "select",
        pendingWireStart: null,
        historySession: null,
      };
    }
    case "update-environment":
      return updateDocumentWithoutHistory(state, {
        ...state.document,
        environment: {
          ...state.document.environment,
          [action.key]: action.value,
        },
      });
    case "select-component":
      return {
        ...state,
        selection: action.componentId
          ? { kind: "component", id: action.componentId }
          : null,
      };
    case "select-wire":
      return {
        ...state,
        selection: action.wireId ? { kind: "wire", id: action.wireId } : null,
      };
    case "start-wire":
      return {
        ...state,
        activeTool: "wire",
        pendingWireStart: action.ref,
      };
    case "cancel-wire":
      return {
        ...state,
        pendingWireStart: null,
      };
    case "add-wire": {
      if (!state.pendingWireStart || sameTerminal(state.pendingWireStart, action.ref)) {
        return {
          ...state,
          pendingWireStart: null,
        };
      }

      const alreadyExists = state.document.wires.some((wire) => {
        const forward =
          wire.from.componentId === state.pendingWireStart?.componentId &&
          wire.from.terminal === state.pendingWireStart?.terminal &&
          wire.to.componentId === action.ref.componentId &&
          wire.to.terminal === action.ref.terminal;
        const reverse =
          wire.to.componentId === state.pendingWireStart?.componentId &&
          wire.to.terminal === state.pendingWireStart?.terminal &&
          wire.from.componentId === action.ref.componentId &&
          wire.from.terminal === action.ref.terminal;
        return forward || reverse;
      });

      if (alreadyExists) {
        return {
          ...state,
          pendingWireStart: null,
        };
      }

      const nextState = applyImmediateDocumentChange(
        state,
        {
          ...state.document,
          wires: [
            ...state.document.wires,
            {
              id: `wire-${Math.random().toString(36).slice(2, 10)}`,
              from: state.pendingWireStart,
              to: action.ref,
            },
          ],
        },
        "connect wire",
      );

      return {
        ...nextState,
        activeTool: "select",
        pendingWireStart: null,
        selection:
          state.selection?.kind === "component"
            ? state.selection
            : { kind: "component", id: action.ref.componentId },
      };
    }
    case "add-component": {
      const instance = createComponentInstance(
        action.componentType,
        state.document.components,
        action.point,
      );
      const nextState = applyImmediateDocumentChange(
        state,
        {
          ...state.document,
          components: [...state.document.components, instance],
        },
        `add ${instance.label}`,
      );
      return {
        ...nextState,
        selection: { kind: "component", id: instance.id },
        activeTool: "select",
        pendingWireStart: null,
      };
    }
    case "move-component":
      return action.historyLabel
        ? {
            ...applyImmediateDocumentChange(
              state,
              {
                ...state.document,
                components: state.document.components.map((component) =>
                  component.id === action.componentId
                    ? { ...component, x: action.point.x, y: action.point.y }
                    : component,
                ),
              },
              action.historyLabel,
            ),
            selection: state.selection,
          }
        : updateDocumentWithoutHistory(state, {
          ...state.document,
          components: state.document.components.map((component) =>
            component.id === action.componentId
              ? { ...component, x: action.point.x, y: action.point.y }
              : component,
          ),
        });
    case "update-view":
      return {
        ...state,
        document: {
          ...state.document,
          view: action.view,
        },
      };
    case "update-property":
      return applyImmediateDocumentChange(
        state,
        {
          ...state.document,
          components: state.document.components.map((component) =>
            component.id === action.componentId
              ? {
                  ...component,
                  properties: {
                    ...component.properties,
                    [action.key]: action.value,
                  },
                }
              : component,
          ),
        },
        "edit component",
      );
    case "rotate-component":
      return applyImmediateDocumentChange(
        state,
        {
          ...state.document,
          components: state.document.components.map((component) =>
            component.id === action.componentId
              ? {
                  ...component,
                  rotation: (((component.rotation + 90) % 360) as 0 | 90 | 180 | 270),
                }
              : component,
          ),
        },
        "rotate component",
      );
    case "delete-component":
      {
        const removedWireIds = new Set(
          state.document.wires
            .filter(
              (wire) =>
                wire.from.componentId === action.componentId ||
                wire.to.componentId === action.componentId,
            )
            .map((wire) => wire.id),
        );
      const nextState = applyImmediateDocumentChange(
        state,
        {
          ...state.document,
          components: state.document.components.filter(
            (component) => component.id !== action.componentId,
          ),
          wires: state.document.wires.filter(
            (wire) =>
              wire.from.componentId !== action.componentId &&
              wire.to.componentId !== action.componentId,
          ),
        },
        "delete component",
      );
      return {
        ...nextState,
        selection:
          (state.selection?.kind === "component" &&
            state.selection.id === action.componentId) ||
          (state.selection?.kind === "wire" &&
            removedWireIds.has(state.selection.id))
            ? null
            : state.selection,
        pendingWireStart:
          state.pendingWireStart?.componentId === action.componentId
            ? null
            : state.pendingWireStart,
      };
      }
    case "delete-wire":
      return {
        ...applyImmediateDocumentChange(
          state,
          {
          ...state.document,
          wires: state.document.wires.filter((wire) => wire.id !== action.wireId),
        },
          "delete wire",
        ),
        selection:
          state.selection?.kind === "wire" && state.selection.id === action.wireId
            ? null
            : state.selection,
      };
    case "apply-auto-blown-fuses":
      return updateDocumentWithoutHistory(state, {
          ...state.document,
          components: state.document.components.map((component) =>
            action.componentIds.includes(component.id)
              ? {
                  ...component,
                  properties: {
                    ...component.properties,
                    blown: true,
                  },
                }
              : component,
          ),
        });
    case "reset-fuse":
      return applyImmediateDocumentChange(
        state,
        {
          ...state.document,
          components: state.document.components.map((component) =>
            component.id === action.componentId
              ? {
                  ...component,
                  properties: {
                    ...component.properties,
                    blown: false,
                  },
                }
              : component,
          ),
        },
        "reset fuse",
      );
    default:
      return state;
  }
}

function createInitialState(): BuilderState {
  return {
    document: createEmptyCircuitDocument(),
    activeSavedCircuitRef: null,
    selection: null,
    activeTool: "select",
    pendingWireStart: null,
    past: [],
    future: [],
    historySession: null,
  };
}

export function CircuitBuilderPage() {
  const initialDocumentRef = useRef(createEmptyCircuitDocument());
  const workspaceRegionRef = useRef<HTMLElement | null>(null);
  const loadJsonInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveHasWrittenRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [draftRecoveryState, setDraftRecoveryState] = useState<"checking" | "pending" | "dismissed" | "ready">("checking");
  const [pendingDraft, setPendingDraft] = useState<CircuitDraftSnapshot | null>(null);
  const [accountSavedCircuits, setAccountSavedCircuits] = useState<AccountSavedCircuitRecord[]>([]);
  const [accountSavedCircuitsLoading, setAccountSavedCircuitsLoading] = useState(false);
  const [accountSavePanelOpen, setAccountSavePanelOpen] = useState(false);
  const [accountSaveNameDraft, setAccountSaveNameDraft] = useState("");
  const [editingAccountSavedCircuitId, setEditingAccountSavedCircuitId] = useState<string | null>(null);
  const [accountRenameDraft, setAccountRenameDraft] = useState("");
  const [activeAccountSavedCircuitId, setActiveAccountSavedCircuitId] = useState<string | null>(null);
  const [saveNameDraft, setSaveNameDraft] = useState("");
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [editingSavedCircuitId, setEditingSavedCircuitId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [clearWorkspaceArmed, setClearWorkspaceArmed] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const savedCircuits = useSavedCircuits();
  const accountSession = useAccountSession();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const solveResult = useMemo(
    () => solveCircuitDocument(state.document),
    [state.document],
  );
  const canExportDiagram = state.document.components.length > 0;
  const canSaveCurrentCircuit = state.document.components.length > 0;
  const selectedComponentId =
    state.selection?.kind === "component" ? state.selection.id : null;
  const selectedWireId =
    state.selection?.kind === "wire" ? state.selection.id : null;
  const selectedComponent =
    selectedComponentId
      ? state.document.components.find((component) => component.id === selectedComponentId) ??
        null
      : null;
  const selectedWire =
    selectedWireId
      ? state.document.wires.find((wire) => wire.id === selectedWireId) ?? null
      : null;
  const activeLocalSavedCircuit =
    state.activeSavedCircuitRef?.kind === "local"
      ? savedCircuits.find((item) => item.id === state.activeSavedCircuitRef?.id) ?? null
      : null;
  const activeAccountSavedCircuit =
    activeAccountSavedCircuitId
      ? accountSavedCircuits.find((item) => item.id === activeAccountSavedCircuitId) ?? null
      : null;
  const activeSavedCircuitTitle =
    activeLocalSavedCircuit?.title ?? activeAccountSavedCircuit?.title ?? null;
  const activeSavedCircuitKind = activeLocalSavedCircuit
    ? "local"
    : activeAccountSavedCircuit
      ? "account"
      : null;
  const activeSavedCircuitDocument =
    activeLocalSavedCircuit?.document ?? activeAccountSavedCircuit?.document ?? null;
  const hasSavedCircuitChanges = activeSavedCircuitDocument
    ? !documentsEqual(state.document, activeSavedCircuitDocument)
    : false;
  const saveStateSummary = activeSavedCircuitTitle
    ? hasSavedCircuitChanges
      ? `Unsaved changes to ${activeSavedCircuitTitle}`
      : `${activeSavedCircuitTitle} is up to date`
    : canSaveCurrentCircuit
      ? "Unsaved new circuit"
      : "Empty workspace";
  const saveStateDetail = activeSavedCircuitTitle
    ? hasSavedCircuitChanges
      ? `Use Update ${activeSavedCircuitKind === "account" ? "account save" : "saved"} when you are ready to keep these edits.`
      : `Current ${activeSavedCircuitKind === "account" ? "account" : "local"} save is up to date.`
    : canSaveCurrentCircuit
      ? "Use Save locally or Save to account to name this circuit. Autosave still protects recovery separately."
      : "Add a component to enable named saves. Autosave recovery stays idle for an empty workspace.";
  const hasPendingHistoryChange = state.historySession
    ? !documentsEqual(state.historySession.document, state.document)
    : false;
  const canUndo = hasPendingHistoryChange || state.past.length > 0;
  const canRedo = !hasPendingHistoryChange && state.future.length > 0;
  const undoHistoryLabel = hasPendingHistoryChange
    ? state.historySession?.label ?? "current adjustment"
    : state.past[state.past.length - 1]?.label ?? null;
  const redoHistoryLabel = !hasPendingHistoryChange ? state.future[0]?.label ?? null : null;
  const historyStateSummary = undoHistoryLabel
    ? redoHistoryLabel
      ? `Undo ${undoHistoryLabel} · Redo ${redoHistoryLabel}`
      : `Undo ${undoHistoryLabel}`
    : redoHistoryLabel
      ? `Redo ${redoHistoryLabel}`
      : "No history yet";
  const historyStateDetail = hasPendingHistoryChange
    ? `A ${undoHistoryLabel} adjustment is in progress. Finish it before redoing another step.`
    : undoHistoryLabel || redoHistoryLabel
      ? [
          undoHistoryLabel ? `Next undo: ${undoHistoryLabel}.` : null,
          redoHistoryLabel ? `Next redo: ${redoHistoryLabel}.` : null,
        ].filter(Boolean).join(" ")
      : "Make a circuit change to enable undo history.";
  const canUseAccountSaves =
    accountSession.status === "signed-in" &&
    accountSession.entitlement.capabilities.canSaveCompareSetups;
  const selectionActionsLocked = state.activeTool === "wire" || Boolean(state.pendingWireStart);

  useEffect(() => {
    const result = readCircuitDraftFromStorage();

    if (result.kind === "ready") {
      setPendingDraft(result.draft);
      setDraftRecoveryState("pending");
      return;
    }

    if (result.kind === "invalid") {
      clearCircuitDraftFromStorage();
      setExportStatus(result.reason);
    }

    setDraftRecoveryState("ready");
  }, []);

  useEffect(() => {
    const discardedCount = getSavedCircuitsDiscardedCount();
    if (discardedCount > 0) {
      setExportStatus(
        `Removed ${discardedCount} unreadable saved circuit${discardedCount === 1 ? "" : "s"} from local storage.`,
      );
    }
  }, []);

  const refreshAccountSavedCircuits = useCallback(async () => {
    if (!canUseAccountSaves) {
      setAccountSavedCircuits([]);
      return;
    }

    setAccountSavedCircuitsLoading(true);
    try {
      const payload = await listAccountCircuitSaves();
      setAccountSavedCircuits(payload.items);
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "Account-saved circuits could not be loaded right now.",
      );
    } finally {
      setAccountSavedCircuitsLoading(false);
    }
  }, [canUseAccountSaves]);

  useEffect(() => {
    if (!canUseAccountSaves) {
      setAccountSavedCircuits([]);
      setActiveAccountSavedCircuitId(null);
      return;
    }

    void refreshAccountSavedCircuits();
  }, [canUseAccountSaves, refreshAccountSavedCircuits]);

  useEffect(() => {
    if (solveResult.autoBlownFuseIds.length === 0) {
      return;
    }
    dispatch({
      type: "apply-auto-blown-fuses",
      componentIds: solveResult.autoBlownFuseIds,
    });
  }, [solveResult.autoBlownFuseIds]);

  useEffect(() => {
    setClearWorkspaceArmed((wasArmed) => {
      if (wasArmed) {
        setExportStatus((current) =>
          current?.startsWith("Clear workspace ready:")
            ? "Clear workspace confirmation reset because the workspace changed."
            : current,
        );
      }

      return false;
    });
  }, [state.document]);

  useEffect(() => {
    if (draftRecoveryState === "checking" || draftRecoveryState === "pending") {
      return;
    }

    const isPristineInitialDocument =
      !autosaveHasWrittenRef.current &&
      state.past.length === 0 &&
      state.future.length === 0 &&
      !hasPendingHistoryChange &&
      documentsEqual(state.document, initialDocumentRef.current);

    if (isPristineInitialDocument) {
      return;
    }

    const timeout = window.setTimeout(() => {
      writeCircuitDraftToStorage(state.document);
      autosaveHasWrittenRef.current = true;
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    draftRecoveryState,
    hasPendingHistoryChange,
    state.document,
    state.future.length,
    state.past.length,
  ]);

  function addComponent(componentType: CircuitComponentType, point?: CircuitPoint) {
    const visibleCenter = getVisibleWorldCenter(state.document.view);
    const offset = positionOffsets[state.document.components.length % positionOffsets.length];
    const wasWiring = state.activeTool === "wire" || Boolean(state.pendingWireStart);
    const nextPoint = snapPointToGrid(
      point ?? {
        x: visibleCenter.x + offset.x,
        y: visibleCenter.y + offset.y,
      },
    );
    const componentDefinition = getCircuitComponentDefinition(componentType);
    const nextOrdinal = state.document.components.filter(
      (component) => component.type === componentType,
    ).length + 1;
    const nextLabel = `${componentDefinition.label} ${nextOrdinal}`;

    dispatch({
      type: "add-component",
      componentType,
      point: nextPoint,
    });
    if (wasWiring) {
      setExportStatus(
        `${componentDefinition.label} added. Wire mode cleared so the loose wire was not connected accidentally.`,
      );
    } else if (point) {
      setExportStatus(
        `${nextLabel} dropped at ${nextPoint.x}, ${nextPoint.y} and selected. Drag it or use arrow keys to refine the placement.`,
      );
    }
    if (point) {
      focusWorkspaceRegion();
    }
  }

  const appendClearWorkspaceCancellation = useCallback((
    message: string,
    cancellationDetail = "Clear workspace confirmation was cancelled; nothing was removed.",
  ) => {
    if (!clearWorkspaceArmed) {
      return message;
    }

    setClearWorkspaceArmed(false);
    return `${message} ${cancellationDetail}`;
  }, [clearWorkspaceArmed]);

  function setCircuitTool(tool: "select" | "wire") {
    if (tool === state.activeTool) {
      return;
    }

    dispatch({ type: "set-tool", tool });
    setExportStatus(
      appendClearWorkspaceCancellation(
        tool === "wire"
          ? "Wire tool active. Click a terminal to start a connection."
          : "Wire tool turned off. Empty canvas returned to select mode.",
      ),
    );
    focusWorkspaceRegion();
  }

  function beginHistorySession(label: string) {
    dispatch({ type: "begin-history-session", label });
  }

  function commitHistorySession() {
    dispatch({ type: "commit-history-session" });
  }

  function updateAmbientTemperature(value: number) {
    dispatch({
      type: "update-environment",
      key: "temperatureC",
      value,
    });
  }

  function updateAmbientLight(value: number) {
    dispatch({
      type: "update-environment",
      key: "lightLevelPercent",
      value,
    });
  }

  function previewMoveComponent(componentId: string, x: number, y: number) {
    dispatch({
      type: "move-component",
      componentId,
      point: snapPointToGrid(clampComponentPoint({ x, y })),
    });
  }

  function moveComponent(componentId: string, x: number, y: number) {
    const component =
      state.document.components.find((entry) => entry.id === componentId) ?? null;
    if (!component) {
      return;
    }
    if (selectionActionsLocked) {
      setExportStatus("Finish or cancel wiring before moving the selected component.");
      focusWorkspaceRegion();
      return;
    }
    dispatch({
      type: "move-component",
      componentId,
      point: snapPointToGrid(clampComponentPoint({ x, y })),
      historyLabel: `move ${component.label}`,
    });
    setExportStatus(
      appendClearWorkspaceCancellation(
        `${component.label} moved.`,
        "Clear workspace confirmation was cancelled before this edit.",
      ),
    );
  }

  async function copyJsonState() {
    try {
      await navigator.clipboard.writeText(serializeCircuitDocument(state.document));
      setExportStatus("Circuit JSON copied.");
    } catch {
      setExportStatus("Clipboard export was unavailable in this browser context.");
    }
  }

  function downloadJsonDocument() {
    const exportPayload = buildCircuitJsonExport(state.document);
    downloadTextFile(exportPayload.filename, exportPayload.json, "application/json");
    setExportStatus("Circuit JSON downloaded.");
  }

  function downloadSvgDiagram() {
    if (!canExportDiagram) {
      setExportStatus("Add at least one component before exporting a diagram.");
      return;
    }

    const exportPayload = buildCircuitSvgExport(state.document, solveResult);
    downloadTextFile(exportPayload.filename, exportPayload.svg, "image/svg+xml");
    setExportStatus(
      solveResult.issues.length > 0
        ? "SVG diagram downloaded. Warning banners are intentionally excluded from the schematic."
        : "SVG diagram downloaded.",
    );
  }

  const focusWorkspaceRegion = useCallback(() => {
    requestAnimationFrame(() => {
      workspaceRegionRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const announceWorkspaceViewChange = useCallback((message: string) => {
    setExportStatus(
      appendClearWorkspaceCancellation(
        message,
        "Clear workspace confirmation was cancelled before changing the view.",
      ),
    );
  }, [appendClearWorkspaceCancellation]);

  const zoomWorkspaceViewBy = useCallback((delta: number) => {
    const nextZoom = Math.max(
      minimumWorkspaceZoom,
      Math.min(maximumWorkspaceZoom, state.document.view.zoom + delta),
    );

    if (nextZoom === state.document.view.zoom) {
      const direction = delta > 0 ? "in" : "out";
      const recoveryHint = delta > 0
        ? "Zoom out or reset the view to see more context."
        : "Zoom in or fit the circuit when you need more detail.";
      announceWorkspaceViewChange(
        `Workspace already at ${Math.round(nextZoom * 100)}% zoom; cannot zoom ${direction} further. ${recoveryHint}`,
      );
      focusWorkspaceRegion();
      return;
    }

    const worldCenter = convertViewPointToWorld(circuitCanvasCenter, state.document.view);

    dispatch({
      type: "update-view",
      view: {
        zoom: nextZoom,
        offsetX: circuitCanvasCenter.x - worldCenter.x * nextZoom,
        offsetY: circuitCanvasCenter.y - worldCenter.y * nextZoom,
      },
    });
    announceWorkspaceViewChange(
      `Workspace zoom ${Math.round(nextZoom * 100)}%. Press 0 to reset the view.`,
    );
    focusWorkspaceRegion();
  }, [announceWorkspaceViewChange, focusWorkspaceRegion, state.document.view]);

  const canResetWorkspaceView = !circuitViewsEqual(state.document.view, defaultCircuitView);
  const resetWorkspaceView = useCallback(() => {
    if (circuitViewsEqual(state.document.view, defaultCircuitView)) {
      announceWorkspaceViewChange("Workspace view is already at the default zoom and pan.");
      focusWorkspaceRegion();
      return;
    }

    dispatch({ type: "update-view", view: defaultCircuitView });
    announceWorkspaceViewChange("Workspace view reset.");
    focusWorkspaceRegion();
  }, [announceWorkspaceViewChange, focusWorkspaceRegion, state.document.view]);

  const fitWorkspaceView = useCallback(() => {
    if (state.document.components.length === 0) {
      announceWorkspaceViewChange("Add a component before fitting the workspace view.");
      focusWorkspaceRegion();
      return;
    }

    const nextView = buildFittedCircuitView(state.document);
    dispatch({ type: "update-view", view: nextView });
    announceWorkspaceViewChange(
      `Fitted view to ${state.document.components.length} part${state.document.components.length === 1 ? "" : "s"} at ${Math.round(nextView.zoom * 100)}% zoom.`,
    );
    focusWorkspaceRegion();
  }, [announceWorkspaceViewChange, focusWorkspaceRegion, state.document]);

  function openJsonDialog() {
    loadJsonInputRef.current?.click();
  }

  async function handleJsonFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const wiringStatusPrefix = getWiringResetStatusPrefix();

    try {
      const document = parseCircuitDocumentJson(await file.text());
      dispatch({ type: "load-document", document, label: "load JSON" });
      setActiveAccountSavedCircuitId(null);
      setExportStatus(`${wiringStatusPrefix}Loaded ${file.name}.`);
      focusWorkspaceRegion();
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "The selected file could not be loaded as a circuit JSON document.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function rotateSelectedComponent() {
    if (!selectedComponent) {
      return;
    }
    rotateComponentById(selectedComponent.id);
  }

  function rotateComponentById(componentId: string) {
    const component =
      state.document.components.find((entry) => entry.id === componentId) ?? null;
    if (!component) {
      return;
    }
    if (selectionActionsLocked) {
      setExportStatus("Finish or cancel wiring before rotating the selected component.");
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "rotate-component", componentId });
    setExportStatus(
      appendClearWorkspaceCancellation(
        `${component.label} rotated.`,
        "Clear workspace confirmation was cancelled before this edit.",
      ),
    );
  }

  function deleteComponentById(componentId: string) {
    const component =
      state.document.components.find((entry) => entry.id === componentId) ?? null;
    if (!component) {
      return;
    }
    if (selectionActionsLocked) {
      setExportStatus("Finish or cancel wiring before deleting the selected item.");
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "delete-component", componentId });
    setExportStatus(
      appendClearWorkspaceCancellation(
        `${component.label} deleted.`,
        "Clear workspace confirmation was cancelled before deleting the selected part.",
      ),
    );
    focusWorkspaceRegion();
  }

  function deleteWireById(wireId: string) {
    const wire =
      state.document.wires.find((entry) => entry.id === wireId) ?? null;
    if (!wire) {
      return;
    }
    if (selectionActionsLocked) {
      setExportStatus("Finish or cancel wiring before deleting the selected item.");
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "delete-wire", wireId });
    setExportStatus(
      appendClearWorkspaceCancellation(
        "Selected wire deleted.",
        "Clear workspace confirmation was cancelled before deleting the selected connection.",
      ),
    );
    focusWorkspaceRegion();
  }

  function selectComponentById(componentId: string | null) {
    const hadClearConfirmation = clearWorkspaceArmed;
    if (hadClearConfirmation) {
      setClearWorkspaceArmed(false);
    }

    dispatch({ type: "select-component", componentId });
    if (hadClearConfirmation) {
      setExportStatus(
        componentId
          ? "Clear workspace confirmation cancelled because a component was selected. Nothing was removed."
          : "Clear workspace confirmation cancelled. Nothing was removed.",
      );
      focusWorkspaceRegion();
    }
  }

  function selectWireById(wireId: string | null) {
    if (!wireId) {
      const hadClearConfirmation = clearWorkspaceArmed;
      if (hadClearConfirmation) {
        setClearWorkspaceArmed(false);
      }
      dispatch({ type: "select-wire", wireId: null });
      if (hadClearConfirmation) {
        setExportStatus("Clear workspace confirmation cancelled. Nothing was removed.");
        focusWorkspaceRegion();
      }
      return;
    }

    const wire =
      state.document.wires.find((entry) => entry.id === wireId) ?? null;
    if (!wire) {
      return;
    }

    const wireLabel = getCircuitWireDisplayLabel(state.document, wire);
    const wasCompletingWire = Boolean(state.pendingWireStart);
    const wasWireToolActive = state.activeTool === "wire";

    if (wasWireToolActive || wasCompletingWire) {
      dispatch({ type: "set-tool", tool: "select" });
    }
    dispatch({ type: "select-wire", wireId });
    setExportStatus(
      appendClearWorkspaceCancellation(
        `${wasCompletingWire ? "Loose wire cancelled. " : wasWireToolActive ? "Wire tool turned off. " : ""}${wireLabel} selected. Use Delete to remove it, or pick another connection.`,
      ),
    );
    focusWorkspaceRegion();
  }

  function clearWorkspaceSelection() {
    if (!state.selection) {
      if (clearWorkspaceArmed) {
        setClearWorkspaceArmed(false);
        setExportStatus("Clear workspace confirmation cancelled. Nothing was removed.");
        focusWorkspaceRegion();
      }
      return;
    }

    dispatch({ type: "select-component", componentId: null });
    setExportStatus(
      appendClearWorkspaceCancellation("Selection cleared."),
    );
    focusWorkspaceRegion();
  }

  function deleteSelectedItem() {
    if (selectedComponent) {
      deleteComponentById(selectedComponent.id);
      return;
    }

    if (selectedWire) {
      deleteWireById(selectedWire.id);
    }
  }

  function getTerminalStatusLabel(ref: CircuitTerminalRef) {
    const component = getCircuitComponentById(state.document, ref.componentId);
    if (!component) {
      return "selected terminal";
    }

    const definition = getCircuitComponentDefinition(component.type);
    return `${component.label} ${definition.terminalLabels[ref.terminal]}`;
  }

  function getWiringResetStatusPrefix() {
    if (state.pendingWireStart) {
      return "Loose wire cancelled. ";
    }

    if (state.activeTool === "wire") {
      return "Wire tool turned off. ";
    }

    return "";
  }

  function findWireBetween(
    from: CircuitTerminalRef,
    to: CircuitTerminalRef,
  ) {
    return state.document.wires.find((wire) => {
      const forward = sameTerminal(wire.from, from) && sameTerminal(wire.to, to);
      const reverse = sameTerminal(wire.from, to) && sameTerminal(wire.to, from);
      return forward || reverse;
    }) ?? null;
  }

  function startWireFromTerminal(ref: CircuitTerminalRef) {
    dispatch({ type: "start-wire", ref });
    setExportStatus(
      `${getTerminalStatusLabel(ref)} selected. Choose a second terminal to finish the wire.`,
    );
  }

  function completeWireAtTerminal(ref: CircuitTerminalRef) {
    if (!state.pendingWireStart) {
      startWireFromTerminal(ref);
      return;
    }

    if (sameTerminal(state.pendingWireStart, ref)) {
      dispatch({ type: "cancel-wire" });
      setExportStatus(
        "Starting terminal cleared. Choose any terminal to start again, or press Esc to leave wire mode.",
      );
      focusWorkspaceRegion();
      return;
    }

    const existingWire = findWireBetween(state.pendingWireStart, ref);
    if (existingWire) {
      dispatch({ type: "cancel-wire" });
      dispatch({ type: "set-tool", tool: "select" });
      dispatch({ type: "select-wire", wireId: existingWire.id });
      setExportStatus(
        `A wire already connects ${getTerminalStatusLabel(state.pendingWireStart)} and ${getTerminalStatusLabel(ref)}. The existing wire is selected instead.`,
      );
      focusWorkspaceRegion();
      return;
    }

    dispatch({ type: "add-wire", ref });
    setExportStatus(
      `Connected ${getTerminalStatusLabel(state.pendingWireStart)} to ${getTerminalStatusLabel(ref)}.`,
    );
    focusWorkspaceRegion();
  }

  function cancelPendingWire() {
    dispatch({ type: "cancel-wire" });
    setExportStatus(
      "Wire cancelled. Choose any terminal to start again, or press Esc to leave wire mode.",
    );
    focusWorkspaceRegion();
  }

  function clearWorkspace() {
    if (!canSaveCurrentCircuit) {
      return;
    }

    if (!clearWorkspaceArmed) {
      const partCount = state.document.components.length;
      const wireCount = state.document.wires.length;
      const wasCompletingWire = Boolean(state.pendingWireStart);
      const wasWireToolActive = state.activeTool === "wire";
      if (wasCompletingWire || wasWireToolActive) {
        dispatch({ type: "set-tool", tool: "select" });
      }
      const wiringStatusPrefix = wasCompletingWire
        ? "Loose wire cancelled. "
        : wasWireToolActive
          ? "Wire tool turned off. "
          : "";
      setClearWorkspaceArmed(true);
      setExportStatus(
        `${wiringStatusPrefix}Clear workspace ready: ${partCount} part${partCount === 1 ? "" : "s"} and ${wireCount} wire${wireCount === 1 ? "" : "s"} will be removed. Choose Confirm clear to continue; Undo can restore it.`,
      );
      focusWorkspaceRegion();
      return;
    }

    setClearWorkspaceArmed(false);
    setActiveAccountSavedCircuitId(null);
    dispatch({
      type: "load-document",
      document: createEmptyCircuitDocument(),
      label: "clear workspace",
    });
    setExportStatus("Workspace cleared. Press Undo to restore the cleared circuit.");
    focusWorkspaceRegion();
  }

  function loadPresetCircuit(preset: (typeof circuitBuilderPresets)[number]) {
    const document = preset.buildDocument();
    const partCount = document.components.length;
    const wiringStatusPrefix = getWiringResetStatusPrefix();

    setActiveAccountSavedCircuitId(null);
    dispatch({
      type: "load-document",
      document,
      label: `load ${preset.label}`,
    });
    setExportStatus(
      `${wiringStatusPrefix}${preset.label} loaded with ${partCount} part${partCount === 1 ? "" : "s"}. Press Undo to restore the previous workspace.`,
    );
    focusWorkspaceRegion();
  }

  function restorePendingDraft() {
    if (!pendingDraft) {
      return;
    }

    const wiringStatusPrefix = getWiringResetStatusPrefix();

    dispatch({
      type: "load-document",
      document: pendingDraft.document,
      label: "restore local draft",
    });
    setDraftRecoveryState("ready");
    setPendingDraft(null);
    setActiveAccountSavedCircuitId(null);
    setExportStatus(
      pendingDraft.savedAt
        ? `${wiringStatusPrefix}Restored local draft saved ${formatCircuitDraftSavedAt(pendingDraft.savedAt)}.`
        : `${wiringStatusPrefix}Restored local draft.`,
    );
    focusWorkspaceRegion();
  }

  function dismissPendingDraft() {
    setDraftRecoveryState("dismissed");
    setPendingDraft(null);
  }

  function discardPendingDraft() {
    clearCircuitDraftFromStorage();
    autosaveHasWrittenRef.current = false;
    setDraftRecoveryState("ready");
    setPendingDraft(null);
    setExportStatus("Saved local draft discarded.");
  }

  function buildDefaultSavedCircuitTitle() {
    const firstComponent = state.document.components[0];
    if (firstComponent) {
      return `${firstComponent.label} circuit`;
    }
    return `Circuit ${savedCircuits.length + 1}`;
  }

  function openSavePanel() {
    setSavePanelOpen(true);
    setSaveNameDraft(buildDefaultSavedCircuitTitle());
  }

  function cancelSavePanel() {
    setSavePanelOpen(false);
    setSaveNameDraft("");
  }

  function confirmSaveLocally() {
    const result = saveSavedCircuit({
      title: saveNameDraft,
      document: state.document,
    });
    dispatch({
      type: "set-active-saved-circuit-ref",
      savedCircuitRef: { kind: "local", id: result.savedCircuit.id },
    });
    setActiveAccountSavedCircuitId(null);
    setSavePanelOpen(false);
    setSaveNameDraft("");
    setExportStatus(`Saved locally as ${result.savedCircuit.title}.`);
  }

  function updateCurrentSavedCircuit() {
    if (!activeLocalSavedCircuit) {
      return;
    }
    const result = saveSavedCircuit({
      title: activeLocalSavedCircuit.title,
      document: state.document,
      existingId: activeLocalSavedCircuit.id,
    });
    setExportStatus(`Updated ${result.savedCircuit.title}.`);
  }

  function openSavedCircuit(savedCircuitId: string) {
    const savedCircuit =
      savedCircuits.find((item) => item.id === savedCircuitId) ?? null;
    if (!savedCircuit) {
      return;
    }
    const wiringStatusPrefix = getWiringResetStatusPrefix();
    dispatch({
      type: "load-document",
      document: savedCircuit.document,
      label: "open saved circuit",
      activeSavedCircuitRef: { kind: "local", id: savedCircuit.id },
    });
    setActiveAccountSavedCircuitId(null);
    setEditingSavedCircuitId(null);
    setRenameDraft("");
    setExportStatus(`${wiringStatusPrefix}Opened ${savedCircuit.title}.`);
    focusWorkspaceRegion();
  }

  function startRenameSavedCircuit(savedCircuitId: string, title: string) {
    setEditingSavedCircuitId(savedCircuitId);
    setRenameDraft(title);
  }

  function cancelRenameSavedCircuit() {
    setEditingSavedCircuitId(null);
    setRenameDraft("");
  }

  function confirmRenameSavedCircuit(savedCircuitId: string) {
    const renamed = renameSavedCircuit(savedCircuitId, renameDraft);
    if (!renamed) {
      setExportStatus("Saved circuit rename failed.");
      return;
    }
    setEditingSavedCircuitId(null);
    setRenameDraft("");
    setExportStatus(`Renamed saved circuit to ${renamed.title}.`);
  }

  function removeSavedCircuit(savedCircuitId: string) {
    const deleted = deleteSavedCircuit(savedCircuitId);
    if (!deleted) {
      return;
    }
    if (
      state.activeSavedCircuitRef?.kind === "local" &&
      state.activeSavedCircuitRef.id === savedCircuitId
    ) {
      dispatch({ type: "set-active-saved-circuit-ref", savedCircuitRef: null });
    }
    if (editingSavedCircuitId === savedCircuitId) {
      setEditingSavedCircuitId(null);
      setRenameDraft("");
    }
    setExportStatus(`Deleted saved circuit ${deleted.title}.`);
  }

  function openAccountSavePanel() {
    setAccountSavePanelOpen(true);
    setAccountSaveNameDraft(buildDefaultSavedCircuitTitle());
  }

  function cancelAccountSavePanel() {
    setAccountSavePanelOpen(false);
    setAccountSaveNameDraft("");
  }

  async function confirmSaveToAccount() {
    try {
      const result = await saveAccountCircuitSave({
        title: accountSaveNameDraft,
        document: state.document,
      });
      setAccountSavedCircuits(result.items);
      setActiveAccountSavedCircuitId(result.savedCircuit.id);
      setAccountSavePanelOpen(false);
      setAccountSaveNameDraft("");
      setExportStatus(`Saved to account as ${result.savedCircuit.title}.`);
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "Account-backed save could not be created right now.",
      );
    }
  }

  async function updateCurrentAccountSave() {
    if (!activeAccountSavedCircuit) {
      return;
    }

    try {
      const result = await saveAccountCircuitSave({
        id: activeAccountSavedCircuit.id,
        title: activeAccountSavedCircuit.title,
        document: state.document,
      });
      setAccountSavedCircuits(result.items);
      setExportStatus(`Updated account save ${result.savedCircuit.title}.`);
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "Account-backed save could not be updated right now.",
      );
    }
  }

  function openAccountSavedCircuit(savedCircuit: AccountSavedCircuitRecord) {
    const wiringStatusPrefix = getWiringResetStatusPrefix();
    dispatch({
      type: "load-document",
      document: savedCircuit.document,
      label: "open account saved circuit",
      activeSavedCircuitRef: null,
    });
    setActiveAccountSavedCircuitId(savedCircuit.id);
    setEditingAccountSavedCircuitId(null);
    setAccountRenameDraft("");
    setExportStatus(`${wiringStatusPrefix}Opened account save ${savedCircuit.title}.`);
    focusWorkspaceRegion();
  }

  function startRenameAccountSavedCircuit(savedCircuit: AccountSavedCircuitRecord) {
    setEditingAccountSavedCircuitId(savedCircuit.id);
    setAccountRenameDraft(savedCircuit.title);
  }

  function cancelRenameAccountSavedCircuit() {
    setEditingAccountSavedCircuitId(null);
    setAccountRenameDraft("");
  }

  async function confirmRenameAccountSavedCircuit(savedCircuitId: string) {
    try {
      const result = await renameAccountCircuitSave({
        id: savedCircuitId,
        title: accountRenameDraft,
      });
      setAccountSavedCircuits(result.items);
      setEditingAccountSavedCircuitId(null);
      setAccountRenameDraft("");
      setExportStatus(`Renamed account save to ${result.savedCircuit.title}.`);
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "Account save rename failed.",
      );
    }
  }

  async function removeAccountSavedCircuit(savedCircuitId: string) {
    try {
      const result = await deleteAccountCircuitSave({ id: savedCircuitId });
      setAccountSavedCircuits(result.items);
      if (activeAccountSavedCircuitId === savedCircuitId) {
        setActiveAccountSavedCircuitId(null);
      }
      if (editingAccountSavedCircuitId === savedCircuitId) {
        setEditingAccountSavedCircuitId(null);
        setAccountRenameDraft("");
      }
      setExportStatus("Deleted account-saved circuit.");
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "Account save deletion failed.",
      );
    }
  }

  const undoHistory = useCallback(() => {
    if (!undoHistoryLabel) {
      setExportStatus("Nothing to undo yet. Make a circuit change first.");
      focusWorkspaceRegion();
      return;
    }
    if (state.historySession) {
      dispatch({ type: "commit-history-session" });
    }
    dispatch({ type: "undo" });
    setActiveAccountSavedCircuitId(null);
    setExportStatus(`Undid ${undoHistoryLabel}.`);
    focusWorkspaceRegion();
  }, [focusWorkspaceRegion, state.historySession, undoHistoryLabel]);

  const redoHistory = useCallback(() => {
    if (hasPendingHistoryChange) {
      setExportStatus("Finish the current adjustment before redoing another change.");
      focusWorkspaceRegion();
      return;
    }
    if (!redoHistoryLabel) {
      setExportStatus("Nothing to redo yet. Undo a change before using redo.");
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "redo" });
    setActiveAccountSavedCircuitId(null);
    setExportStatus(`Redid ${redoHistoryLabel}.`);
    focusWorkspaceRegion();
  }, [focusWorkspaceRegion, hasPendingHistoryChange, redoHistoryLabel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (event.altKey) {
        return;
      }

      if (modifier) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            redoHistory();
            return;
          }
          undoHistory();
          return;
        }

        if (key === "y") {
          event.preventDefault();
          redoHistory();
        }

        return;
      }

      if (key === "escape") {
        if (state.pendingWireStart) {
          event.preventDefault();
          dispatch({ type: "cancel-wire" });
          setExportStatus("Wire cancelled. Choose a terminal when you are ready to try again.");
          focusWorkspaceRegion();
          return;
        }

        if (state.activeTool === "wire") {
          event.preventDefault();
          dispatch({ type: "set-tool", tool: "select" });
          setExportStatus("Wire tool turned off.");
          focusWorkspaceRegion();
          return;
        }

        if (clearWorkspaceArmed) {
          event.preventDefault();
          setClearWorkspaceArmed(false);
          setExportStatus("Clear workspace cancelled. Nothing was removed.");
          focusWorkspaceRegion();
          return;
        }

        if (state.selection) {
          event.preventDefault();
          dispatch({ type: "select-component", componentId: null });
          setExportStatus("Selection cleared.");
          focusWorkspaceRegion();
        }
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (selectionActionsLocked && state.selection) {
          event.preventDefault();
          setExportStatus("Finish or cancel wiring before deleting the selected item.");
          focusWorkspaceRegion();
          return;
        }

        if (selectedComponent) {
          event.preventDefault();
          dispatch({ type: "delete-component", componentId: selectedComponent.id });
          setExportStatus(
            appendClearWorkspaceCancellation(
              `${selectedComponent.label} deleted.`,
              "Clear workspace confirmation was cancelled before deleting the selected part.",
            ),
          );
          focusWorkspaceRegion();
          return;
        }

        if (selectedWire) {
          event.preventDefault();
          dispatch({ type: "delete-wire", wireId: selectedWire.id });
          setExportStatus(
            appendClearWorkspaceCancellation(
              "Selected wire deleted.",
              "Clear workspace confirmation was cancelled before deleting the selected connection.",
            ),
          );
          focusWorkspaceRegion();
        }
        return;
      }

      if (key === "r" && selectedComponent) {
        event.preventDefault();
        if (selectionActionsLocked) {
          setExportStatus("Finish or cancel wiring before rotating the selected component.");
          focusWorkspaceRegion();
          return;
        }
        dispatch({ type: "rotate-component", componentId: selectedComponent.id });
        setExportStatus(
          appendClearWorkspaceCancellation(
            `${selectedComponent.label} rotated.`,
            "Clear workspace confirmation was cancelled before this edit.",
          ),
        );
        focusWorkspaceRegion();
        return;
      }

      const arrowDelta =
        key === "arrowdown"
          ? { x: 0, y: 1 }
          : key === "arrowleft"
            ? { x: -1, y: 0 }
            : key === "arrowright"
              ? { x: 1, y: 0 }
              : key === "arrowup"
                ? { x: 0, y: -1 }
                : null;
      if (selectedComponent && arrowDelta) {
        event.preventDefault();
        if (selectionActionsLocked) {
          setExportStatus("Finish or cancel wiring before moving the selected component.");
          focusWorkspaceRegion();
          return;
        }
        const step = event.shiftKey ? 96 : 32;
        const nextPoint = snapPointToGrid(
          clampComponentPoint({
            x: selectedComponent.x + arrowDelta.x * step,
            y: selectedComponent.y + arrowDelta.y * step,
          }),
        );

        if (nextPoint.x === selectedComponent.x && nextPoint.y === selectedComponent.y) {
          setExportStatus(`${selectedComponent.label} is already at the workspace edge.`);
          focusWorkspaceRegion();
          return;
        }

        dispatch({
          type: "move-component",
          componentId: selectedComponent.id,
          point: nextPoint,
          historyLabel: `move ${selectedComponent.label}`,
        });
        setExportStatus(
          appendClearWorkspaceCancellation(
            `${selectedComponent.label} moved to ${nextPoint.x}, ${nextPoint.y}. Use Shift+arrow for larger steps.`,
            "Clear workspace confirmation was cancelled before this edit.",
          ),
        );
        focusWorkspaceRegion();
        return;
      }

      if (key === "+" || key === "=") {
        event.preventDefault();
        zoomWorkspaceViewBy(0.12);
        return;
      }

      if (key === "-" || key === "_") {
        event.preventDefault();
        zoomWorkspaceViewBy(-0.12);
        return;
      }

      if (key === "0") {
        event.preventDefault();
        resetWorkspaceView();
        return;
      }

      if (key === "f") {
        event.preventDefault();
        fitWorkspaceView();
        return;
      }

      if (key === "w") {
        event.preventDefault();
        const clearWorkspaceCancellation = clearWorkspaceArmed
          ? " Clear workspace confirmation was cancelled; nothing was removed."
          : "";
        if (clearWorkspaceArmed) {
          setClearWorkspaceArmed(false);
        }
        if (state.pendingWireStart) {
          dispatch({ type: "set-tool", tool: "select" });
          setExportStatus(
            `Wire cancelled and wire tool turned off.${clearWorkspaceCancellation}`,
          );
          focusWorkspaceRegion();
          return;
        }

        if (state.activeTool === "wire") {
          dispatch({ type: "set-tool", tool: "select" });
          setExportStatus(`Wire tool turned off.${clearWorkspaceCancellation}`);
        } else {
          dispatch({ type: "set-tool", tool: "wire" });
          setExportStatus(
            `Wire tool active. Click a terminal to start a connection.${clearWorkspaceCancellation}`,
          );
        }
        focusWorkspaceRegion();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    appendClearWorkspaceCancellation,
    clearWorkspaceArmed,
    fitWorkspaceView,
    focusWorkspaceRegion,
    redoHistory,
    resetWorkspaceView,
    selectedComponent,
    selectedWire,
    selectionActionsLocked,
    state.activeTool,
    state.pendingWireStart,
    state.selection,
    undoHistory,
    zoomWorkspaceViewBy,
  ]);

  const selectedWireLabel = selectedWire
    ? getCircuitWireDisplayLabel(state.document, selectedWire)
    : null;
  const selectionSummary =
    state.selection?.kind === "component"
      ? state.document.components.find((component) => component.id === state.selection?.id)?.label
      : state.selection?.kind === "wire"
        ? selectedWireLabel ?? "Wire selected"
        : "Nothing selected";
  const wireSelectionHint =
    state.selection?.kind === "wire"
      ? selectedWireLabel
        ? `${selectedWireLabel} selected. Delete removes this connection; rotate only applies to components.`
        : "A wire is selected. Delete removes this connection; rotate only applies to components."
      : null;
  const issueSummary =
    solveResult.issues.length > 0
      ? `${solveResult.issues.length} issue${solveResult.issues.length === 1 ? "" : "s"}`
      : "Solver ready";
  const activeToolSummary = state.pendingWireStart
    ? "Wire: choose end"
    : state.activeTool === "wire"
      ? "Wire mode"
      : "Select mode";
  const activeToolDetail = state.pendingWireStart
    ? "One terminal is selected; choose a second terminal, use the empty canvas to cancel, or press Esc."
    : state.activeTool === "wire"
      ? "Wire mode is active. Click any terminal to start a connection, or press W/Esc to leave."
      : "Select mode is active. Click parts or wires to inspect, move, rotate, or delete them.";
  const keyboardShortcutSummary = state.pendingWireStart
    ? "Shortcuts: Esc or empty canvas cancels the current wire, +/- zooms, F fits, Ctrl/⌘+Z undoes the last edit."
    : state.activeTool === "wire"
      ? "Shortcuts: W or Esc leaves the wire tool, +/- zooms, F fits, 0 resets view."
      : clearWorkspaceArmed
        ? "Shortcuts: Esc cancels the clear confirmation, +/- zooms, F fits, 0 resets view."
        : state.selection?.kind === "component"
        ? "Shortcuts: R rotates the selected part, Arrow keys move it, Shift+arrow jumps farther, Delete removes it, Esc clears it, F fits view."
        : state.selection?.kind === "wire"
          ? "Shortcuts: Delete removes the selected wire, Esc clears it, W starts wiring, +/- zooms, F fits view."
        : "Shortcuts: W starts wiring, +/- zooms, F fits, 0 resets view, Ctrl/⌘+Z undoes, Ctrl/⌘+Y redoes.";
  const toolbarNotice = exportStatus ?? wireSelectionHint ?? (
    !canExportDiagram
      ? "Diagram export stays disabled until the workspace contains at least one component. JSON state export still works for an empty workspace."
      : solveResult.issues.length > 0
        ? "SVG export uses the current schematic layout even when the circuit still has warnings."
        : activeToolDetail
  );
  const desktopEnvironmentControl = (
    <div className="hidden xl:block">
      <CircuitEnvironmentControl
        mode="desktop"
        temperatureC={state.document.environment.temperatureC}
        lightLevelPercent={state.document.environment.lightLevelPercent}
        onTemperatureChange={updateAmbientTemperature}
        onLightChange={updateAmbientLight}
        onTemperatureBegin={() => beginHistorySession("adjust ambient temperature")}
        onLightBegin={() => beginHistorySession("adjust light intensity")}
        onCommit={commitHistorySession}
      />
    </div>
  );
  const builderGridColumnClass = isLibraryCollapsed
    ? isInspectorCollapsed
      ? "xl:grid-cols-[3.25rem_minmax(0,1fr)_3.25rem]"
      : "xl:grid-cols-[3.25rem_minmax(0,1fr)_18rem]"
    : isInspectorCollapsed
      ? "xl:grid-cols-[14rem_minmax(0,1fr)_3.25rem]"
      : "xl:grid-cols-[14rem_minmax(0,1fr)_18rem]";
  const inspectorCollapsedLabel = solveResult.issues.length > 0
    ? `Expand inspector; ${solveResult.issues.length} circuit ${solveResult.issues.length === 1 ? "issue" : "issues"}`
    : "Expand inspector";
  const mobileEnvironmentControl = (
    <div className="xl:hidden">
      <CircuitEnvironmentControl
        mode="mobile"
        temperatureC={state.document.environment.temperatureC}
        lightLevelPercent={state.document.environment.lightLevelPercent}
        onTemperatureChange={updateAmbientTemperature}
        onLightChange={updateAmbientLight}
        onTemperatureBegin={() => beginHistorySession("adjust ambient temperature")}
        onLightBegin={() => beginHistorySession("adjust light intensity")}
        onCommit={commitHistorySession}
      />
    </div>
  );
  const savedCircuitsPanel = (
    <DisclosurePanel
      title="Saved circuits"
      summary="Named local saves live here. Autosave draft recovery stays separate and only protects against accidental loss."
      defaultOpen={
        savedCircuits.length > 0 ||
        savePanelOpen ||
        accountSavedCircuits.length > 0 ||
        accountSavePanelOpen
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm leading-6 text-ink-700">
            Save locally keeps reusable browser-only circuits here. Account saves stay in the account section below, and autosave draft recovery stays reserved for accidental refresh loss.
          </p>
          <span className="rounded-full border border-line bg-paper px-3 py-1 text-sm font-medium text-ink-700">
            {savedCircuits.length} local
          </span>
        </div>

        {savePanelOpen ? (
          <div className="rounded-[22px] border border-line bg-paper p-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                Saved circuit name
              </span>
              <input
                type="text"
                aria-label="Saved circuit name"
                value={saveNameDraft}
                onChange={(event) => setSaveNameDraft(event.target.value)}
                maxLength={80}
                className="mt-2 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saveNameDraft.trim().length === 0}
                className="rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
                onClick={confirmSaveLocally}
              >
                Save circuit
              </button>
              <button
                type="button"
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950"
                onClick={cancelSavePanel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {savedCircuits.length === 0 ? (
          <div className="rounded-[22px] border border-line bg-paper p-4 text-sm leading-6 text-ink-700">
            No named saved circuits yet. Use <span className="font-semibold text-ink-950">Save locally</span> to keep a reusable circuit here. Autosave drafts stay separate and are only for recovery after accidental loss.
          </div>
        ) : (
          <div className="grid gap-3">
            {savedCircuits.map((savedCircuit) => {
              const updatedAtLabel = formatSavedCircuitTimestamp(savedCircuit.updatedAt);
              const isCurrent =
                state.activeSavedCircuitRef?.kind === "local" &&
                state.activeSavedCircuitRef.id === savedCircuit.id;
              const isEditing = editingSavedCircuitId === savedCircuit.id;

              return (
                <article
                  key={savedCircuit.id}
                  className="rounded-[22px] border border-line bg-paper p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {isCurrent ? (
                          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                            Current
                          </span>
                        ) : null}
                        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                          {savedCircuit.document.components.length} parts
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-950">{savedCircuit.title}</p>
                        <p className="mt-1 text-xs leading-5 text-ink-600">
                          {updatedAtLabel ? `Updated ${updatedAtLabel}` : "Saved locally"}
                        </p>
                      </div>
                    </div>
                    {!isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-label={`Open saved circuit ${savedCircuit.title}`}
                          title={`Open saved circuit ${savedCircuit.title}`}
                          className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                          onClick={() => openSavedCircuit(savedCircuit.id)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          aria-label={`Rename saved circuit ${savedCircuit.title}`}
                          title={`Rename saved circuit ${savedCircuit.title}`}
                          className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                          onClick={() => startRenameSavedCircuit(savedCircuit.id, savedCircuit.title)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete saved circuit ${savedCircuit.title}`}
                          title={`Delete saved circuit ${savedCircuit.title}`}
                          className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700"
                          onClick={() => removeSavedCircuit(savedCircuit.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <label className="block">
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                          Rename saved circuit
                        </span>
                        <input
                          type="text"
                          aria-label="Rename saved circuit"
                          value={renameDraft}
                          onChange={(event) => setRenameDraft(event.target.value)}
                          maxLength={80}
                          className="mt-1.5 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={renameDraft.trim().length === 0}
                          className="rounded-full border border-teal-500/25 bg-teal-500 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
                          onClick={() => confirmRenameSavedCircuit(savedCircuit.id)}
                        >
                          Save name
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700"
                          onClick={cancelRenameSavedCircuit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <div className="rounded-[22px] border border-line bg-paper p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="lab-label">Account saved circuits</p>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                Account saves are cross-device named circuits for eligible signed-in users. They stay separate from local browser saves and the autosave recovery draft.
              </p>
            </div>
            {canUseAccountSaves ? (
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-sm font-medium text-ink-700">
                {accountSavedCircuits.length} account saves
              </span>
            ) : null}
          </div>

          {!canUseAccountSaves ? (
            <div className="mt-4">
              <PremiumFeatureNotice
                title="Account-saved circuits"
                description="Account-backed saved circuits reopen your custom builds across devices while local saves and autosave recovery remain available in this browser."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {accountSavePanelOpen ? (
                <div className="rounded-[20px] border border-line bg-paper-strong p-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                      Account save name
                    </span>
                    <input
                      type="text"
                      aria-label="Account save name"
                      value={accountSaveNameDraft}
                      onChange={(event) => setAccountSaveNameDraft(event.target.value)}
                      maxLength={80}
                      className="mt-2 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={accountSaveNameDraft.trim().length === 0}
                      className="rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
                      onClick={() => void confirmSaveToAccount()}
                    >
                      Save to account
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950"
                      onClick={cancelAccountSavePanel}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {accountSavedCircuitsLoading ? (
                <div className="rounded-[20px] border border-line bg-paper-strong p-4 text-sm text-ink-700">
                  Loading account-saved circuits...
                </div>
              ) : accountSavedCircuits.length === 0 ? (
                <div className="rounded-[20px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  No account-saved circuits yet. Use <span className="font-semibold text-ink-950">Save to account</span> to keep a cross-device named save here.
                </div>
              ) : (
                <div className="grid gap-3">
                  {accountSavedCircuits.map((savedCircuit) => {
                    const updatedAtLabel = formatSavedCircuitTimestamp(savedCircuit.updatedAt);
                    const isCurrent = activeAccountSavedCircuitId === savedCircuit.id;
                    const isEditing = editingAccountSavedCircuitId === savedCircuit.id;

                    return (
                      <article
                        key={savedCircuit.id}
                        className="rounded-[20px] border border-line bg-paper-strong p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {isCurrent ? (
                                <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                                  Current
                                </span>
                              ) : null}
                              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                                {savedCircuit.document.components.length} parts
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink-950">{savedCircuit.title}</p>
                              <p className="mt-1 text-xs leading-5 text-ink-600">
                                {updatedAtLabel ? `Updated ${updatedAtLabel}` : "Saved to account"}
                              </p>
                            </div>
                          </div>
                          {!isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                aria-label={`Open account save ${savedCircuit.title}`}
                                title={`Open account save ${savedCircuit.title}`}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                                onClick={() => openAccountSavedCircuit(savedCircuit)}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                aria-label={`Rename account save ${savedCircuit.title}`}
                                title={`Rename account save ${savedCircuit.title}`}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                                onClick={() => startRenameAccountSavedCircuit(savedCircuit)}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete account save ${savedCircuit.title}`}
                                title={`Delete account save ${savedCircuit.title}`}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700"
                                onClick={() => void removeAccountSavedCircuit(savedCircuit.id)}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                            <label className="block">
                              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                                Rename account save
                              </span>
                              <input
                                type="text"
                                aria-label="Rename account save"
                                value={accountRenameDraft}
                                onChange={(event) => setAccountRenameDraft(event.target.value)}
                                maxLength={80}
                                className="mt-1.5 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={accountRenameDraft.trim().length === 0}
                                className="rounded-full border border-teal-500/25 bg-teal-500 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
                                onClick={() => void confirmRenameAccountSavedCircuit(savedCircuit.id)}
                              >
                                Save name
                              </button>
                              <button
                                type="button"
                                className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700"
                                onClick={cancelRenameAccountSavedCircuit}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </DisclosurePanel>
  );
  const presetStrip = (
    <div className="page-band p-3" data-testid="circuit-builder-preset-strip">
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <p className="lab-label">Suggested starting points</p>
          <div className="flex flex-wrap gap-2">
            {circuitBuilderPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950"
                onClick={() => loadPresetCircuit(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section
      className="space-y-4 sm:space-y-5"
      data-circuit-builder-ready={hasHydrated ? "" : undefined}
    >
      <div className="motion-enter motion-enter-tight grid gap-4 page-band p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-center">
        <div className="space-y-1.5">
          <p className="lab-label">Circuit Builder</p>
          <h1 className="max-w-4xl text-[1.65rem] font-semibold leading-tight text-ink-950 sm:text-[1.95rem]">
            Build a live circuit and explain what it is doing.
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-700 sm:text-[0.95rem]">
            Free-build on the canvas, inspect live values, and keep the builder bench in view while you work through bounded DC assumptions.
          </p>
        </div>
        <LearningVisual
          kind="circuit"
          motif="circuit"
          tone="sky"
          compact
          className="h-28"
        />
      </div>

      {draftRecoveryState === "pending" && pendingDraft ? (
        <section className="lab-panel p-4 sm:p-5" aria-label="Local draft recovery">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <p className="lab-label">Local draft available</p>
              <p className="text-sm leading-6 text-ink-700">
                A local Circuit Builder draft was found {formatCircuitDraftSavedAt(pendingDraft.savedAt)}.
                Restore it to recover work after a refresh, or keep the current blank session for now.
              </p>
              <p className="text-xs leading-5 text-ink-600">
                Local draft recovery is a convenience feature. JSON export and import remain the portable save/open path.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950"
                onClick={restorePendingDraft}
              >
                Restore draft
              </button>
              <button
                type="button"
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950"
                onClick={dismissPendingDraft}
              >
                Dismiss for now
              </button>
              <button
                type="button"
                className="rounded-full border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm font-semibold text-coral-700"
                onClick={discardPendingDraft}
              >
                Discard saved draft
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {presetStrip}

      <div
        className={[
          "grid gap-3 xl:items-stretch xl:h-[min(82svh,58rem)] xl:min-h-[40rem]",
          builderGridColumnClass,
        ].join(" ")}
        data-circuit-builder-row=""
      >
        {isLibraryCollapsed ? (
          <aside
            className="hidden h-full min-h-0 flex-col items-center justify-between rounded-[26px] border border-line bg-paper-strong p-2 xl:flex"
            aria-label="Collapsed component library"
            data-circuit-palette-collapsed=""
          >
            <button
              type="button"
              aria-label="Expand component library"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-lg font-semibold text-ink-950 shadow-sm transition hover:border-teal-500/35"
              onClick={() => setIsLibraryCollapsed(false)}
            >
              →
            </button>
            <span className="rotate-180 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600 [writing-mode:vertical-rl]">
              Parts
            </span>
            <span className="rounded-full border border-line bg-paper px-2 py-1 text-xs font-semibold text-ink-700">
              {state.document.components.length}
            </span>
          </aside>
        ) : (
          <div className="hidden xl:block xl:min-h-0">
            <div className="relative h-full min-h-0">
              <button
                type="button"
                aria-label="Collapse component library"
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold text-ink-950 shadow-sm transition hover:border-teal-500/35"
                onClick={() => setIsLibraryCollapsed(true)}
              >
                ←
              </button>
              <CircuitPalette
                panelKind="desktop"
                className="h-full min-h-0"
                activeTool={state.activeTool}
                onAddComponent={addComponent}
                onSetTool={setCircuitTool}
              />
            </div>
          </div>
        )}

        <div className="min-w-0 space-y-3 xl:flex xl:min-h-0 xl:flex-col">
          <CircuitWorkspace
            regionRef={workspaceRegionRef}
            className="xl:flex-1 xl:min-h-0"
            headerSlot={desktopEnvironmentControl}
            document={state.document}
            solveResult={solveResult}
            selection={state.selection}
            activeTool={state.activeTool}
            pendingWireStart={state.pendingWireStart}
            onSelectComponent={selectComponentById}
            onSelectWire={selectWireById}
            onClearSelection={clearWorkspaceSelection}
            onSetTool={setCircuitTool}
            onStartWire={startWireFromTerminal}
            onCompleteWire={completeWireAtTerminal}
            onCancelWire={cancelPendingWire}
            onMoveComponent={(componentId, point) => previewMoveComponent(componentId, point.x, point.y)}
            onBeginMoveComponent={(componentId) => {
              const component =
                state.document.components.find((entry) => entry.id === componentId) ?? null;
              beginHistorySession(component ? `move ${component.label}` : "move component");
            }}
            onCommitMoveComponent={commitHistorySession}
            onUpdateView={(view) => dispatch({ type: "update-view", view })}
            onAnnounceViewChange={announceWorkspaceViewChange}
            onZoomIn={() => zoomWorkspaceViewBy(0.12)}
            onZoomOut={() => zoomWorkspaceViewBy(-0.12)}
            onResetView={resetWorkspaceView}
            canResetView={canResetWorkspaceView}
            onFitView={fitWorkspaceView}
            onDropComponent={addComponent}
            onClearWorkspace={clearWorkspace}
            canClearWorkspace={canSaveCurrentCircuit}
            clearWorkspaceArmed={clearWorkspaceArmed}
            canFitView={state.document.components.length > 0}
          />
          {mobileEnvironmentControl}

          {state.document.wires.length ? (
            <section
              className="lab-panel p-3.5 xl:max-h-44 xl:min-h-0 xl:overflow-y-auto"
              aria-label="Connections"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="lab-label">Connections</p>
                  <p className="mt-1 text-sm leading-6 text-ink-700">
                    Select a wire here if it is hard to target on the canvas, especially on smaller screens.
                  </p>
                </div>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-sm font-medium text-ink-700">
                  {state.document.wires.length} wire{state.document.wires.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {state.document.wires.map((wire) => {
                  const selected =
                    state.selection?.kind === "wire" && state.selection.id === wire.id;
                  return (
                    <button
                      key={wire.id}
                      type="button"
                      aria-pressed={selected}
                      className={[
                        "rounded-[18px] border px-4 py-3 text-left text-sm transition",
                        selected
                          ? "border-teal-500 bg-teal-500/10 text-ink-950"
                          : "border-line bg-paper text-ink-800 hover:border-ink-950/20",
                      ].join(" ")}
                      onClick={() => selectWireById(wire.id)}
                    >
                      {getCircuitWireDisplayLabel(state.document, wire)}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        {isInspectorCollapsed ? (
          <aside
            className="hidden h-full min-h-0 flex-col items-center justify-between rounded-[26px] border border-line bg-paper-strong p-2 xl:flex"
            aria-label="Collapsed circuit inspector"
            data-circuit-inspector-collapsed=""
          >
            <button
              type="button"
              aria-label={inspectorCollapsedLabel}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-lg font-semibold text-ink-950 shadow-sm transition hover:border-teal-500/35"
              onClick={() => setIsInspectorCollapsed(false)}
            >
              ←
            </button>
            <span className="rotate-180 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600 [writing-mode:vertical-rl]">
              Inspector
            </span>
            <span
              className={[
                "rounded-full border px-2 py-1 text-xs font-semibold",
                solveResult.issues.length > 0
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
                  : "border-teal-500/25 bg-teal-500/10 text-teal-700",
              ].join(" ")}
            >
              {solveResult.issues.length > 0 ? solveResult.issues.length : "✓"}
            </span>
          </aside>
        ) : (
          <div className="hidden xl:block xl:min-h-0">
            <div className="relative h-full min-h-0">
              <button
                type="button"
                aria-label="Collapse inspector"
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold text-ink-950 shadow-sm transition hover:border-teal-500/35"
                onClick={() => setIsInspectorCollapsed(true)}
              >
                →
              </button>
              <CircuitInspector
                className="h-full min-h-0"
                document={state.document}
                solveResult={solveResult}
                selection={state.selection}
                activeTool={state.activeTool}
                pendingWireStart={state.pendingWireStart}
                onUpdateProperty={(componentId, key, value) =>
                  dispatch({ type: "update-property", componentId, key, value })
                }
                onRotateComponent={rotateComponentById}
                onDeleteComponent={deleteComponentById}
                onDeleteWire={deleteWireById}
                onResetFuse={(componentId) => dispatch({ type: "reset-fuse", componentId })}
                onCancelWire={cancelPendingWire}
                onMoveComponent={moveComponent}
              />
            </div>
          </div>
        )}
      </div>

      <div className="page-band p-3">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-end">
          <div className="space-y-2 xl:max-w-[54rem] xl:text-right">
            <p className="lab-label">Status and tools</p>
            <div
              className="flex flex-wrap gap-2 xl:justify-end"
              data-circuit-toolbar-status=""
            >
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  state.selection
                    ? "border-ink-950/15 bg-paper text-ink-950"
                    : "border-line bg-paper-strong text-ink-600",
                ].join(" ")}
              >
                {selectionSummary}
              </span>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  solveResult.issues.length > 0
                    ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
                    : "border-teal-500/25 bg-teal-500/10 text-teal-700",
                ].join(" ")}
              >
                {issueSummary}
              </span>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  state.activeTool === "wire" || state.pendingWireStart
                    ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                    : "border-line bg-paper-strong text-ink-600",
                ].join(" ")}
                title={activeToolDetail}
                data-circuit-tool-state=""
              >
                {activeToolSummary}
              </span>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  canUndo || canRedo
                    ? "border-sky-500/25 bg-sky-500/10 text-sky-800"
                    : "border-line bg-paper-strong text-ink-600",
                ].join(" ")}
                title={historyStateDetail}
                data-circuit-history-state=""
              >
                {historyStateSummary}
              </span>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  hasSavedCircuitChanges
                    ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
                    : activeSavedCircuitTitle
                      ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                      : "border-line bg-paper-strong text-ink-600",
                ].join(" ")}
                data-circuit-save-state=""
              >
                {saveStateSummary}
              </span>
            </div>
            <div
              className="flex flex-wrap items-start gap-2 xl:justify-end"
              data-circuit-toolbar=""
            >
              <div
                role="group"
                aria-label="History actions"
                data-circuit-toolbar-group="history"
                className={toolbarGroupClass}
              >
                <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 lg:inline">
                  History
                </span>
                <span id="circuit-undo-description" className="sr-only">
                  {undoHistoryLabel
                    ? `Undo ${undoHistoryLabel}. Shortcut: Ctrl or Command plus Z.`
                    : "No undo step is available yet. Shortcut: Ctrl or Command plus Z."}
                </span>
                <span id="circuit-redo-description" className="sr-only">
                  {hasPendingHistoryChange
                    ? "Finish the current adjustment before redoing another step. Shortcut: Ctrl or Command plus Y, or Ctrl or Command plus Shift plus Z."
                    : redoHistoryLabel
                      ? `Redo ${redoHistoryLabel}. Shortcut: Ctrl or Command plus Y, or Ctrl or Command plus Shift plus Z.`
                      : "No redo step is available yet. Shortcut: Ctrl or Command plus Y, or Ctrl or Command plus Shift plus Z."}
                </span>
                <button
                  type="button"
                  disabled={!canUndo}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-undo-description"
                  aria-keyshortcuts="Control+Z Meta+Z"
                  title="Undo (shortcut: Ctrl/⌘+Z)"
                  onClick={undoHistory}
                >
                  Undo
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-redo-description"
                  aria-keyshortcuts="Control+Y Meta+Y Control+Shift+Z Meta+Shift+Z"
                  title="Redo (shortcut: Ctrl/⌘+Y or Ctrl/⌘+Shift+Z)"
                  onClick={redoHistory}
                >
                  Redo
                </button>
              </div>

              <div
                role="group"
                aria-label="Selection actions"
                data-circuit-toolbar-group="selection"
                className={[
                  toolbarGroupClass,
                  state.selection ? "border-teal-500/25 bg-teal-500/6" : "",
                ].join(" ")}
              >
                <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 lg:inline">
                  Selection
                </span>
                <span id="circuit-rotate-selection-description" className="sr-only">
                  {selectedComponent
                    ? selectionActionsLocked
                      ? "Finish or cancel wiring before rotating the selected component. Shortcut: R."
                      : "Rotate the selected component. Shortcut: R."
                    : "Select a component before rotating. Shortcut: R."}
                </span>
                <span id="circuit-delete-selection-description" className="sr-only">
                  {state.selection
                    ? selectionActionsLocked
                      ? "Finish or cancel wiring before deleting the selected component or wire. Shortcut: Delete or Backspace."
                      : "Delete the selected component or wire. Shortcut: Delete or Backspace."
                    : "Select a component or wire before deleting. Shortcut: Delete or Backspace."}
                </span>
                <button
                  type="button"
                  disabled={!selectedComponent || selectionActionsLocked}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-rotate-selection-description"
                  aria-keyshortcuts="R"
                  title="Rotate selected component (shortcut: R)"
                  onClick={rotateSelectedComponent}
                >
                  Rotate selected
                </button>
                <button
                  type="button"
                  disabled={!state.selection || selectionActionsLocked}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-delete-selection-description"
                  aria-keyshortcuts="Delete Backspace"
                  title="Delete selected item (shortcut: Delete/Backspace)"
                  onClick={deleteSelectedItem}
                >
                  Delete selected
                </button>
              </div>

              <CircuitToolbarMenu
                menuId="saves"
                label="Saves"
                ariaLabel="Saves"
                panelTitle="Save and reopen circuits"
                panelDescription="Local saves stay in this browser. Account saves reopen across devices for eligible users."
              >
                {({ closeMenu }) => (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div>
                        <p className="lab-label">Local saves</p>
                        <p className="mt-1 text-xs leading-5 text-ink-600">
                          Browser-local named saves. Autosave recovery stays separate.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!canSaveCurrentCircuit}
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            openSavePanel();
                          }}
                        >
                          Save locally
                        </button>
                        <button
                          type="button"
                          disabled={!activeLocalSavedCircuit || !canSaveCurrentCircuit}
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            updateCurrentSavedCircuit();
                          }}
                        >
                          Update saved
                        </button>
                      </div>
                      <p className="text-xs leading-5 text-ink-600">
                        {activeLocalSavedCircuit
                          ? `Current local save: ${activeLocalSavedCircuit.title}.`
                          : "No local named save is currently loaded."}
                      </p>
                      <p className="rounded-2xl border border-line bg-paper-strong px-3 py-2 text-xs leading-5 text-ink-700">
                        {saveStateDetail}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-line pt-3">
                      <div>
                        <p className="lab-label">Account saves</p>
                        <p className="mt-1 text-xs leading-5 text-ink-600">
                          Cross-device saves remain separate from local saves and autosave recovery.
                        </p>
                      </div>
                      {canUseAccountSaves ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!canSaveCurrentCircuit}
                              className={toolbarButtonClass}
                              onClick={() => {
                                closeMenu();
                                openAccountSavePanel();
                              }}
                            >
                              Save to account
                            </button>
                            <button
                              type="button"
                              disabled={!activeAccountSavedCircuit || !canSaveCurrentCircuit}
                              className={toolbarButtonClass}
                              onClick={() => {
                                closeMenu();
                                void updateCurrentAccountSave();
                              }}
                            >
                              Update account save
                            </button>
                          </div>
                          <p className="text-xs leading-5 text-ink-600">
                            {activeAccountSavedCircuit
                              ? `Current account save: ${activeAccountSavedCircuit.title}.`
                              : "No account-backed save is currently loaded."}
                          </p>
                          <p className="rounded-2xl border border-line bg-paper-strong px-3 py-2 text-xs leading-5 text-ink-700">
                            {saveStateDetail}
                          </p>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled
                              className={toolbarButtonClass}
                            >
                              Save to account
                            </button>
                            <button
                              type="button"
                              disabled
                              className={toolbarButtonClass}
                            >
                              Update account save
                            </button>
                          </div>
                          <PremiumFeatureNotice
                            title="Account saves"
                            description="Keep named circuits in your account and reopen them across devices."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CircuitToolbarMenu>

              <div
                role="group"
                aria-label="File and export actions"
                data-circuit-toolbar-group="file"
                className={toolbarGroupClass}
              >
                <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 lg:inline">
                  File
                </span>
                <button
                  type="button"
                  disabled={!canExportDiagram}
                  className={toolbarButtonClass}
                  onClick={downloadSvgDiagram}
                >
                  Download SVG
                </button>
                <CircuitToolbarMenu
                  menuId="file"
                  label="File"
                  ariaLabel="File"
                  panelTitle="File and export actions"
                  panelDescription="Use JSON tools for portable save/open while keeping workspace reset beside the canvas controls."
                >
                  {({ closeMenu }) => (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            downloadJsonDocument();
                          }}
                        >
                          Download JSON
                        </button>
                        <button
                          type="button"
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            openJsonDialog();
                          }}
                        >
                          Load JSON
                        </button>
                        <button
                          type="button"
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            copyJsonState();
                          }}
                        >
                          Copy JSON state
                        </button>
                      </div>
                      <p className="text-xs leading-5 text-ink-600">
                        JSON export and import preserve the same circuit document used by autosave, saved circuits, and SVG export.
                      </p>
                    </div>
                  )}
                </CircuitToolbarMenu>
              </div>

              <input
                ref={loadJsonInputRef}
                type="file"
                accept=".json,application/json"
                aria-label="Load circuit JSON file"
                className="sr-only"
                onChange={handleJsonFileChange}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 min-h-[5.5rem] space-y-1.5" data-circuit-toolbar-stable-status="">
          <p role="status" className="text-sm leading-6 text-ink-700">
            {toolbarNotice}
          </p>
          {toolbarNotice !== activeToolDetail ? (
            <p className="text-sm leading-6 text-ink-700">{activeToolDetail}</p>
          ) : null}
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500"
            data-circuit-keyboard-hints=""
          >
            {keyboardShortcutSummary}
          </p>
        </div>
      </div>

      {savedCircuitsPanel}

      <div className="xl:hidden">
        <DisclosurePanel
          title="Component library"
          summary="Add parts, switch to the wire tool, then return to the workspace without losing the current circuit."
          defaultOpen={state.document.components.length === 0}
        >
          <CircuitPalette
            panelKind="mobile"
            activeTool={state.activeTool}
            onAddComponent={addComponent}
            onSetTool={setCircuitTool}
          />
        </DisclosurePanel>
      </div>

      <div className="xl:hidden">
        <DisclosurePanel
          title="Inspector"
          summary="Component details, live readouts, warnings, and graph panels move here on smaller screens."
          defaultOpen={Boolean(state.selection)}
        >
          <CircuitInspector
            document={state.document}
            solveResult={solveResult}
            selection={state.selection}
            activeTool={state.activeTool}
            pendingWireStart={state.pendingWireStart}
            onUpdateProperty={(componentId, key, value) =>
              dispatch({ type: "update-property", componentId, key, value })
            }
            onRotateComponent={rotateComponentById}
            onDeleteComponent={deleteComponentById}
            onDeleteWire={deleteWireById}
            onResetFuse={(componentId) => dispatch({ type: "reset-fuse", componentId })}
            onCancelWire={cancelPendingWire}
            onMoveComponent={moveComponent}
          />
        </DisclosurePanel>
      </div>

      <DisclosurePanel
        title="Solver notes and model assumptions"
        summary="This v1 builder prefers an explicit, teachable DC steady-state model over perfect electronics fidelity."
      >
        <div className="grid gap-3 text-sm leading-6 text-ink-700 sm:grid-cols-2">
          <div className="rounded-[22px] border border-line bg-paper px-4 py-3">
            Batteries are ideal voltage sources. Resistors, bulbs, thermistors, LDRs, meters,
            closed switches, and intact fuses are linear or near-linear elements in the steady-state solve.
          </div>
          <div className="rounded-[22px] border border-line bg-paper px-4 py-3">
            Capacitors are treated as open circuits after settling. Diodes use a simplified
            threshold model, bulbs are resistive loads, and fuses trip instantly once the steady-state current exceeds their rating.
          </div>
          <div className="rounded-[22px] border border-line bg-paper px-4 py-3">
            Wires collapse terminals into shared nodes, so branch currents and voltage drops come
            from the same graph-based circuit solve instead of separate per-widget math.
          </div>
          <div className="rounded-[22px] border border-line bg-paper px-4 py-3">
            SVG and JSON export both use the same document model, so future formats can reuse
            this pipeline without changing the builder state shape.
          </div>
        </div>
      </DisclosurePanel>
    </section>
  );
}
