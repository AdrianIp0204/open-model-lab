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
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  CIRCUIT_RENDER_MODE_STORAGE_KEY,
  buildCircuitJsonExport,
  buildCircuitSvgExport,
  circuitBuilderCopyEn,
  clampComponentPoint,
  clearCircuitLocaleHandoffFromStorage,
  clearCircuitDraftFromStorage,
  consumeCircuitLocaleHandoffFromStorage,
  circuitBuilderPresets,
  convertViewPointToWorld,
  createComponentInstance,
  createDefaultCircuitEnvironment,
  createEmptyCircuitDocument,
  downloadTextFile,
  formatCircuitDraftSavedAt,
  getCircuitComponentById,
  getCircuitComponentDefinition,
  getVisibleWorldCenter,
  formatCircuitComponentDisplayLabel,
  formatCircuitWireDisplayLabel,
  getSavedCircuitsDiscardedCount,
  normalizeCircuitDocument,
  normalizeCircuitRenderMode,
  parseCircuitDocumentJson,
  readCircuitDraftFromStorage,
  renameSavedCircuit,
  saveSavedCircuit,
  serializeCircuitDocument,
  snapPointToGrid,
  solveCircuitDocument,
  useSavedCircuits,
  deleteSavedCircuit,
  writeCircuitLocaleHandoffToStorage,
  writeCircuitDraftToStorage,
  type CircuitComponentType,
  type CircuitBuilderCopy,
  type CircuitDocument,
  type CircuitPoint,
  type CircuitRenderMode,
  type CircuitScalar,
  type CircuitDraftSnapshot,
  type CircuitTerminalRef,
} from "@/lib/circuit-builder";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { CircuitInspector } from "./CircuitInspector";
import { CircuitEnvironmentControl } from "./CircuitEnvironmentControl";
import { CircuitPalette } from "./CircuitPalette";
import { CircuitToolbarMenu } from "./CircuitToolbarMenu";
import { CircuitWorkspace } from "./CircuitWorkspace";

type BuilderSelection =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;

type LocaleHandoffWriteSnapshot = {
  document: CircuitDocument;
  renderMode: CircuitRenderMode;
  selection: BuilderSelection;
};

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
  | {
      type: "restore-locale-handoff";
      document: CircuitDocument;
      selection: BuilderSelection;
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
  "rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-paper-strong disabled:cursor-not-allowed disabled:opacity-50";
const toolbarGroupClass =
  "inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-[18px] border border-line bg-paper-strong/90 px-2 py-1.5";
const defaultCircuitView = {
  zoom: 0.78,
  offsetX: 120,
  offsetY: 82,
} satisfies CircuitDocument["view"];
const defaultCircuitEnvironment = createDefaultCircuitEnvironment();
const minimumWorkspaceZoom = 0.45;
const maximumWorkspaceZoom = 2.4;
const maximumFitWorkspaceZoom = 2.25;
const circuitCanvasCenter = {
  x: CIRCUIT_CANVAS_WIDTH / 2,
  y: CIRCUIT_CANVAS_HEIGHT / 2,
};
const fitViewPadding = 80;
const componentFitRadius = {
  x: 128,
  y: 112,
};
const circuitViewEqualityEpsilon = 0.0001;
const circuitRenderModeOptions: CircuitRenderMode[] = ["schematic", "modern"];

function circuitStatusText(copy: CircuitBuilderCopy, english: string, zhHk: string) {
  return copy.locale === "zh-HK" ? zhHk : english;
}

function CircuitRenderModeSwitch({
  value,
  onChange,
  copy,
}: {
  value: CircuitRenderMode;
  onChange: (mode: CircuitRenderMode) => void;
  copy: CircuitBuilderCopy;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper-strong p-0.5 text-xs font-semibold text-ink-700 shadow-sm"
      aria-label={copy.renderMode.ariaLabel}
      data-circuit-render-mode-switch=""
    >
      <span className="px-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {copy.renderMode.label}
      </span>
      {circuitRenderModeOptions.map((mode) => {
        const selected = value === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={selected}
            className={[
              "rounded-full px-2 py-1 transition",
              selected
                ? "bg-ink-950 text-white"
                : "text-ink-700 hover:bg-paper hover:text-ink-950",
            ].join(" ")}
            data-circuit-render-mode-option={mode}
            onClick={() => onChange(mode)}
          >
            {copy.renderMode.modes[mode]}
          </button>
        );
      })}
    </div>
  );
}

function circuitViewsEqual(a: CircuitDocument["view"], b: CircuitDocument["view"]) {
  return (
    Math.abs(a.zoom - b.zoom) < circuitViewEqualityEpsilon &&
    Math.abs(a.offsetX - b.offsetX) < circuitViewEqualityEpsilon &&
    Math.abs(a.offsetY - b.offsetY) < circuitViewEqualityEpsilon
  );
}

function circuitEnvironmentsEqual(
  a: CircuitDocument["environment"],
  b: CircuitDocument["environment"],
) {
  return (
    Math.abs(a.temperatureC - b.temperatureC) < circuitViewEqualityEpsilon &&
    Math.abs(a.lightLevelPercent - b.lightLevelPercent) <
      circuitViewEqualityEpsilon
  );
}

function isMeaningfulLocaleHandoffSnapshot({
  document,
  selection,
}: LocaleHandoffWriteSnapshot) {
  return (
    document.components.length > 0 ||
    document.wires.length > 0 ||
    selection !== null ||
    !circuitViewsEqual(document.view, defaultCircuitView) ||
    !circuitEnvironmentsEqual(document.environment, defaultCircuitEnvironment)
  );
}

function writeMeaningfulLocaleHandoff(snapshot: LocaleHandoffWriteSnapshot) {
  if (!isMeaningfulLocaleHandoffSnapshot(snapshot)) {
    clearCircuitLocaleHandoffFromStorage();
    return;
  }

  writeCircuitLocaleHandoffToStorage(snapshot);
}

function isDocumentReloadNavigation() {
  if (
    typeof window === "undefined" ||
    typeof window.performance?.getEntriesByType !== "function"
  ) {
    return false;
  }

  const navigationEntry = window.performance.getEntriesByType("navigation")[0];
  return (
    typeof PerformanceNavigationTiming !== "undefined" &&
    navigationEntry instanceof PerformanceNavigationTiming &&
    navigationEntry.type === "reload"
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

function normalizeBuilderSelection(
  document: CircuitDocument,
  selection: BuilderSelection,
): BuilderSelection {
  if (selection?.kind === "component") {
    return document.components.some((component) => component.id === selection.id)
      ? selection
      : null;
  }

  if (selection?.kind === "wire") {
    return document.wires.some((wire) => wire.id === selection.id)
      ? selection
      : null;
  }

  return null;
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
    case "restore-locale-handoff": {
      const normalized = action.document;
      return {
        ...state,
        document: normalized,
        selection: normalizeBuilderSelection(normalized, action.selection),
        activeSavedCircuitRef: null,
        activeTool: "select",
        pendingWireStart: null,
        past: [],
        future: [],
        historySession: null,
      };
    }
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

export function CircuitBuilderPage({
  copy = circuitBuilderCopyEn,
}: {
  copy?: CircuitBuilderCopy;
}) {
  const initialDocumentRef = useRef(createEmptyCircuitDocument());
  const workspaceRegionRef = useRef<HTMLElement | null>(null);
  const loadJsonInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveHasWrittenRef = useRef(false);
  const localeHandoffConsumedRef = useRef(false);
  const latestLocaleHandoffRef = useRef<{
    document: CircuitDocument;
    renderMode: CircuitRenderMode;
    selection: BuilderSelection;
  } | null>(null);
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [localeHandoffReady, setLocaleHandoffReady] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<CircuitRenderMode>("schematic");
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

  useEffect(() => {
    try {
      setRenderMode(
        normalizeCircuitRenderMode(
          window.localStorage.getItem(CIRCUIT_RENDER_MODE_STORAGE_KEY),
        ),
      );
    } catch {
      setRenderMode("schematic");
    }
  }, []);

  useEffect(() => {
    if (isDocumentReloadNavigation()) {
      clearCircuitLocaleHandoffFromStorage();
      setLocaleHandoffReady(true);
      return;
    }

    const result = consumeCircuitLocaleHandoffFromStorage();
    if (
      result.kind === "ready" &&
      isMeaningfulLocaleHandoffSnapshot(result.handoff)
    ) {
      localeHandoffConsumedRef.current = true;
      initialDocumentRef.current = result.handoff.document;
      dispatch({
        type: "restore-locale-handoff",
        document: result.handoff.document,
        selection: result.handoff.selection,
      });
      setRenderMode(result.handoff.renderMode);
      try {
        window.localStorage.setItem(
          CIRCUIT_RENDER_MODE_STORAGE_KEY,
          result.handoff.renderMode,
        );
      } catch {
        // Locale handoff still restores the live page state without storage.
      }
      setDraftRecoveryState("ready");
    }
    setLocaleHandoffReady(true);
  }, []);

  const updateCircuitRenderMode = useCallback((mode: CircuitRenderMode) => {
    setRenderMode(mode);
    try {
      window.localStorage.setItem(CIRCUIT_RENDER_MODE_STORAGE_KEY, mode);
    } catch {
      // Rendering can still switch even when storage is unavailable.
    }
    setExportStatus(copy.renderMode.status[mode] ?? copy.status.renderModeFallback);
  }, [copy]);

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
      ? circuitStatusText(
          copy,
          `Unsaved changes to ${activeSavedCircuitTitle}`,
          `「${activeSavedCircuitTitle}」有未儲存變更`,
        )
      : circuitStatusText(
          copy,
          `${activeSavedCircuitTitle} is up to date`,
          `「${activeSavedCircuitTitle}」已是最新`,
        )
    : canSaveCurrentCircuit
      ? copy.toolbar.unsavedNewCircuit
      : copy.toolbar.emptyWorkspace;
  const saveStateDetail = activeSavedCircuitTitle
    ? hasSavedCircuitChanges
      ? circuitStatusText(
          copy,
          `Use Update ${activeSavedCircuitKind === "account" ? "account save" : "saved"} when you are ready to keep these edits.`,
          `準備保留這些編輯時，請使用「${activeSavedCircuitKind === "account" ? copy.toolbar.updateAccountSave : copy.toolbar.updateSaved}」。`,
        )
      : circuitStatusText(
          copy,
          `Current ${activeSavedCircuitKind === "account" ? "account" : "local"} save is up to date.`,
          `目前${activeSavedCircuitKind === "account" ? "帳戶" : "本機"}儲存已是最新。`,
        )
    : canSaveCurrentCircuit
      ? circuitStatusText(
          copy,
          "Use Save locally or Save to account to name this circuit. Autosave still protects recovery separately.",
          "可用「本機儲存」或「儲存到帳戶」為此電路命名。自動儲存復原仍會獨立保護。",
        )
      : circuitStatusText(
          copy,
          "Add a component to enable named saves. Autosave recovery stays idle for an empty workspace.",
          "加入元件後即可使用命名儲存。空白工作區不會啟動自動復原。",
        );
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
      ? circuitStatusText(
          copy,
          `Undo ${undoHistoryLabel} · Redo ${redoHistoryLabel}`,
          `復原「${undoHistoryLabel}」 · 重做「${redoHistoryLabel}」`,
        )
      : circuitStatusText(copy, `Undo ${undoHistoryLabel}`, `復原「${undoHistoryLabel}」`)
    : redoHistoryLabel
      ? circuitStatusText(copy, `Redo ${redoHistoryLabel}`, `重做「${redoHistoryLabel}」`)
      : copy.toolbar.historyEmpty;
  const historyStateDetail = hasPendingHistoryChange
    ? circuitStatusText(
        copy,
        `A ${undoHistoryLabel} adjustment is in progress. Finish it before redoing another step.`,
        `「${undoHistoryLabel}」調整仍在進行中。完成後才可重做另一個步驟。`,
      )
    : undoHistoryLabel || redoHistoryLabel
      ? [
          undoHistoryLabel
            ? circuitStatusText(copy, `Next undo: ${undoHistoryLabel}.`, `下一個復原：「${undoHistoryLabel}」。`)
            : null,
          redoHistoryLabel
            ? circuitStatusText(copy, `Next redo: ${redoHistoryLabel}.`, `下一個重做：「${redoHistoryLabel}」。`)
            : null,
        ].filter(Boolean).join(" ")
      : circuitStatusText(
          copy,
          "Make a circuit change to enable undo history.",
          "變更電路後即可使用復原歷史。",
        );
  const canUseAccountSaves =
    accountSession.status === "signed-in" &&
    accountSession.entitlement.capabilities.canSaveCompareSetups;
  const selectionActionsLocked = state.activeTool === "wire" || Boolean(state.pendingWireStart);

  useEffect(() => {
    latestLocaleHandoffRef.current = {
      document: state.document,
      renderMode,
      selection: state.selection,
    };

    if (!localeHandoffReady) {
      return;
    }

    writeMeaningfulLocaleHandoff({
      document: state.document,
      renderMode,
      selection: state.selection,
    });
  }, [localeHandoffReady, renderMode, state.document, state.selection]);

  useEffect(() => {
    if (!localeHandoffReady) {
      return;
    }

    function writeLatestHandoff() {
      const snapshot = latestLocaleHandoffRef.current;
      if (!snapshot) {
        return;
      }

      writeMeaningfulLocaleHandoff(snapshot);
    }

    function handleVisibilityChange() {
      if (window.document.visibilityState === "hidden") {
        writeLatestHandoff();
      }
    }

    window.addEventListener("pagehide", writeLatestHandoff);
    window.document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      writeLatestHandoff();
      window.removeEventListener("pagehide", writeLatestHandoff);
      window.document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [localeHandoffReady]);

  useEffect(() => {
    if (!localeHandoffReady) {
      return;
    }

    if (localeHandoffConsumedRef.current) {
      setDraftRecoveryState("ready");
      return;
    }

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
  }, [localeHandoffReady]);

  useEffect(() => {
    const discardedCount = getSavedCircuitsDiscardedCount();
    if (discardedCount > 0) {
      setExportStatus(
        circuitStatusText(
          copy,
          `Removed ${discardedCount} unreadable saved circuit${discardedCount === 1 ? "" : "s"} from local storage.`,
          `已從本機儲存移除 ${discardedCount} 個無法讀取的已儲存電路。`,
        ),
      );
    }
  }, [copy]);

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
          current?.startsWith("Clear workspace ready:") ||
          current?.includes("清空工作區已準備好")
            ? circuitStatusText(
                copy,
                "Clear workspace confirmation reset because the workspace changed.",
                "工作區已改變，清空確認已重設。",
              )
            : current,
        );
      }

      return false;
    });
  }, [copy, state.document]);

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
    const componentDisplayLabel = copy.components[componentType].label;
    const nextOrdinal = state.document.components.filter(
      (component) => component.type === componentType,
    ).length + 1;
    const nextLabel = `${componentDefinition.label} ${nextOrdinal}`;
    const nextDisplayLabel =
      copy.locale === "zh-HK" ? `${componentDisplayLabel} ${nextOrdinal}` : nextLabel;

    dispatch({
      type: "add-component",
      componentType,
      point: nextPoint,
    });
    if (wasWiring) {
      setExportStatus(
        copy.locale === "zh-HK"
          ? `已加入${componentDisplayLabel}。導線模式已清除，避免未完成導線被意外連接。`
          : `${componentDefinition.label} added. Wire mode cleared so the loose wire was not connected accidentally.`,
      );
    } else if (point) {
      setExportStatus(
        copy.locale === "zh-HK"
          ? `${nextDisplayLabel} 已放在 ${nextPoint.x}, ${nextPoint.y} 並選取。可拖曳或用方向鍵微調位置。`
          : `${nextLabel} dropped at ${nextPoint.x}, ${nextPoint.y} and selected. Drag it or use arrow keys to refine the placement.`,
      );
    }
    if (point) {
      focusWorkspaceRegion();
    }
  }

  const appendClearWorkspaceCancellation = useCallback((
    message: string,
    cancellationDetail?: string,
  ) => {
    if (!clearWorkspaceArmed) {
      return message;
    }

    setClearWorkspaceArmed(false);
    const resolvedCancellationDetail = cancellationDetail ?? circuitStatusText(
      copy,
      "Clear workspace confirmation was cancelled; nothing was removed.",
      "清空工作區確認已取消；未移除任何內容。",
    );
    return `${message} ${resolvedCancellationDetail}`;
  }, [clearWorkspaceArmed, copy]);

  function setCircuitTool(tool: "select" | "wire") {
    if (tool === state.activeTool) {
      return;
    }

    dispatch({ type: "set-tool", tool });
    setExportStatus(
      appendClearWorkspaceCancellation(
        tool === "wire"
          ? copy.toolbar.activeToolDetails.wire
          : copy.locale === "zh-HK"
            ? "導線工具已關閉。空白畫布已返回選取模式。"
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
      setExportStatus(
        copy.locale === "zh-HK"
          ? "請先完成或取消接線，才移動已選元件。"
          : "Finish or cancel wiring before moving the selected component.",
      );
      focusWorkspaceRegion();
      return;
    }
    const componentLabel = formatCircuitComponentDisplayLabel(component, copy);
    dispatch({
      type: "move-component",
      componentId,
      point: snapPointToGrid(clampComponentPoint({ x, y })),
      historyLabel: copy.locale === "zh-HK" ? `移動${componentLabel}` : `move ${component.label}`,
    });
    setExportStatus(
      appendClearWorkspaceCancellation(
        copy.locale === "zh-HK" ? `${componentLabel} 已移動。` : `${component.label} moved.`,
        "Clear workspace confirmation was cancelled before this edit.",
      ),
    );
  }

  async function copyJsonState() {
    try {
      await navigator.clipboard.writeText(serializeCircuitDocument(state.document));
      setExportStatus(circuitStatusText(copy, "Circuit JSON copied.", "已複製電路 JSON。"));
    } catch {
      setExportStatus(circuitStatusText(
        copy,
        "Clipboard export was unavailable in this browser context.",
        "此瀏覽器環境無法使用剪貼簿匯出。",
      ));
    }
  }

  function downloadJsonDocument() {
    const exportPayload = buildCircuitJsonExport(state.document);
    downloadTextFile(exportPayload.filename, exportPayload.json, "application/json");
    setExportStatus(circuitStatusText(copy, "Circuit JSON downloaded.", "已下載電路 JSON。"));
  }

  function downloadSvgDiagram() {
    if (!canExportDiagram) {
      setExportStatus(circuitStatusText(
        copy,
        "Add at least one component before exporting a diagram.",
        "請先加入至少一個元件，才可匯出圖像。",
      ));
      return;
    }

    const exportPayload = buildCircuitSvgExport(state.document, solveResult);
    downloadTextFile(exportPayload.filename, exportPayload.svg, "image/svg+xml");
    setExportStatus(
      solveResult.issues.length > 0
        ? circuitStatusText(
            copy,
            "SVG diagram downloaded. Warning banners are intentionally excluded from the schematic.",
            "已下載 SVG 圖像。警告橫幅會刻意排除於電路圖之外。",
          )
        : circuitStatusText(copy, "SVG diagram downloaded.", "已下載 SVG 圖像。"),
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
        circuitStatusText(
          copy,
          "Clear workspace confirmation was cancelled before changing the view.",
          "變更視圖前已取消清空工作區確認。",
        ),
      ),
    );
  }, [appendClearWorkspaceCancellation, copy]);

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
        copy.locale === "zh-HK"
          ? `工作區已在 ${Math.round(nextZoom * 100)}% 縮放，不能再${delta > 0 ? "放大" : "縮小"}。`
          : `Workspace already at ${Math.round(nextZoom * 100)}% zoom; cannot zoom ${direction} further. ${recoveryHint}`,
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
      copy.locale === "zh-HK"
        ? `工作區縮放 ${Math.round(nextZoom * 100)}%。按 0 可重設視圖。`
        : `Workspace zoom ${Math.round(nextZoom * 100)}%. Press 0 to reset the view.`,
    );
    focusWorkspaceRegion();
  }, [announceWorkspaceViewChange, copy.locale, focusWorkspaceRegion, state.document.view]);

  const canResetWorkspaceView = !circuitViewsEqual(state.document.view, defaultCircuitView);
  const resetWorkspaceView = useCallback(() => {
    if (circuitViewsEqual(state.document.view, defaultCircuitView)) {
      announceWorkspaceViewChange(
        copy.locale === "zh-HK"
          ? "工作區視圖已是預設縮放和平移。"
          : "Workspace view is already at the default zoom and pan.",
      );
      focusWorkspaceRegion();
      return;
    }

    dispatch({ type: "update-view", view: defaultCircuitView });
    announceWorkspaceViewChange(copy.locale === "zh-HK" ? "工作區視圖已重設。" : "Workspace view reset.");
    focusWorkspaceRegion();
  }, [announceWorkspaceViewChange, copy.locale, focusWorkspaceRegion, state.document.view]);

  const fitWorkspaceView = useCallback(() => {
    if (state.document.components.length === 0) {
      announceWorkspaceViewChange(
        copy.locale === "zh-HK"
          ? "先加入元件，才可適合工作區視圖。"
          : "Add a component before fitting the workspace view.",
      );
      focusWorkspaceRegion();
      return;
    }

    const nextView = buildFittedCircuitView(state.document);
    dispatch({ type: "update-view", view: nextView });
    announceWorkspaceViewChange(
      copy.locale === "zh-HK"
        ? `視圖已適合 ${state.document.components.length} 個元件，縮放 ${Math.round(nextView.zoom * 100)}%。`
        : `Fitted view to ${state.document.components.length} part${state.document.components.length === 1 ? "" : "s"} at ${Math.round(nextView.zoom * 100)}% zoom.`,
    );
    focusWorkspaceRegion();
  }, [announceWorkspaceViewChange, copy.locale, focusWorkspaceRegion, state.document]);

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
      setExportStatus(
        `${wiringStatusPrefix}${circuitStatusText(
          copy,
          `Loaded ${file.name}.`,
          `已載入 ${file.name}。`,
        )}`,
      );
      focusWorkspaceRegion();
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : circuitStatusText(
              copy,
              "The selected file could not be loaded as a circuit JSON document.",
              "無法把所選檔案載入為電路 JSON 文件。",
            ),
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
      setExportStatus(
        copy.locale === "zh-HK"
          ? "請先完成或取消接線，才旋轉已選元件。"
          : "Finish or cancel wiring before rotating the selected component.",
      );
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "rotate-component", componentId });
    const componentLabel = formatCircuitComponentDisplayLabel(component, copy);
    setExportStatus(
      appendClearWorkspaceCancellation(
        copy.locale === "zh-HK" ? `${componentLabel} 已旋轉。` : `${component.label} rotated.`,
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
      setExportStatus(
        copy.locale === "zh-HK"
          ? "請先完成或取消接線，才刪除已選項目。"
          : "Finish or cancel wiring before deleting the selected item.",
      );
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "delete-component", componentId });
    const componentLabel = formatCircuitComponentDisplayLabel(component, copy);
    setExportStatus(
      appendClearWorkspaceCancellation(
        copy.locale === "zh-HK" ? `${componentLabel} 已刪除。` : `${component.label} deleted.`,
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
      setExportStatus(circuitStatusText(
        copy,
        "Finish or cancel wiring before deleting the selected item.",
        "請先完成或取消接線，才刪除已選項目。",
      ));
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "delete-wire", wireId });
    setExportStatus(
      appendClearWorkspaceCancellation(
        circuitStatusText(copy, "Selected wire deleted.", "已刪除已選導線。"),
        circuitStatusText(
          copy,
          "Clear workspace confirmation was cancelled before deleting the selected connection.",
          "刪除已選連接前已取消清空工作區確認。",
        ),
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
          ? circuitStatusText(
              copy,
              "Clear workspace confirmation cancelled because a component was selected. Nothing was removed.",
              "因為已選取元件，清空工作區確認已取消。未移除任何內容。",
            )
          : circuitStatusText(
              copy,
              "Clear workspace confirmation cancelled. Nothing was removed.",
              "清空工作區確認已取消。未移除任何內容。",
            ),
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
        setExportStatus(circuitStatusText(
          copy,
          "Clear workspace confirmation cancelled. Nothing was removed.",
          "清空工作區確認已取消。未移除任何內容。",
        ));
        focusWorkspaceRegion();
      }
      return;
    }

    const wire =
      state.document.wires.find((entry) => entry.id === wireId) ?? null;
    if (!wire) {
      return;
    }

    const wireLabel = formatCircuitWireDisplayLabel(state.document, wire, copy);
    const wasCompletingWire = Boolean(state.pendingWireStart);
    const wasWireToolActive = state.activeTool === "wire";

    if (wasWireToolActive || wasCompletingWire) {
      dispatch({ type: "set-tool", tool: "select" });
    }
    dispatch({ type: "select-wire", wireId });
    setExportStatus(
      appendClearWorkspaceCancellation(
        circuitStatusText(
          copy,
          `${wasCompletingWire ? "Loose wire cancelled. " : wasWireToolActive ? "Wire tool turned off. " : ""}${wireLabel} selected. Use Delete to remove it, or pick another connection.`,
          `${wasCompletingWire ? "未完成導線已取消。" : wasWireToolActive ? "導線工具已關閉。" : ""}已選取${wireLabel}。可按 Delete 移除，或選另一條連接。`,
        ),
      ),
    );
    focusWorkspaceRegion();
  }

  function clearWorkspaceSelection() {
    if (!state.selection) {
      if (clearWorkspaceArmed) {
        setClearWorkspaceArmed(false);
        setExportStatus(circuitStatusText(
          copy,
          "Clear workspace confirmation cancelled. Nothing was removed.",
          "清空工作區確認已取消。未移除任何內容。",
        ));
        focusWorkspaceRegion();
      }
      return;
    }

    dispatch({ type: "select-component", componentId: null });
    setExportStatus(
      appendClearWorkspaceCancellation(
        circuitStatusText(copy, "Selection cleared.", "已清除選取。"),
      ),
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
      return copy.status.selectedTerminalFallback;
    }

    const terminalLabel = copy.components[component.type].terminalLabels[ref.terminal];
    return `${formatCircuitComponentDisplayLabel(component, copy)} ${terminalLabel}`;
  }

  function getWiringResetStatusPrefix() {
    if (state.pendingWireStart) {
      return circuitStatusText(copy, "Loose wire cancelled. ", "未完成導線已取消。");
    }

    if (state.activeTool === "wire") {
      return circuitStatusText(copy, "Wire tool turned off. ", "導線工具已關閉。");
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
      circuitStatusText(
        copy,
        `${getTerminalStatusLabel(ref)} selected. Choose a second terminal to finish the wire.`,
        `已選取${getTerminalStatusLabel(ref)}。請選第二個端子完成導線。`,
      ),
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
        circuitStatusText(
          copy,
          "Starting terminal cleared. Choose any terminal to start again, or press Esc to leave wire mode.",
          "起始端子已清除。請選任一端子重新開始，或按 Esc 離開導線模式。",
        ),
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
        circuitStatusText(
          copy,
          `A wire already connects ${getTerminalStatusLabel(state.pendingWireStart)} and ${getTerminalStatusLabel(ref)}. The existing wire is selected instead.`,
          `${getTerminalStatusLabel(state.pendingWireStart)}和${getTerminalStatusLabel(ref)}之間已有導線。已改為選取現有導線。`,
        ),
      );
      focusWorkspaceRegion();
      return;
    }

    dispatch({ type: "add-wire", ref });
    setExportStatus(
      circuitStatusText(
        copy,
        `Connected ${getTerminalStatusLabel(state.pendingWireStart)} to ${getTerminalStatusLabel(ref)}.`,
        `已連接${getTerminalStatusLabel(state.pendingWireStart)}至${getTerminalStatusLabel(ref)}。`,
      ),
    );
    focusWorkspaceRegion();
  }

  function cancelPendingWire() {
    dispatch({ type: "cancel-wire" });
    setExportStatus(
      circuitStatusText(
        copy,
        "Wire cancelled. Choose any terminal to start again, or press Esc to leave wire mode.",
        "導線已取消。請選任一端子重新開始，或按 Esc 離開導線模式。",
      ),
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
        copy.locale === "zh-HK"
          ? `${wiringStatusPrefix}清空工作區已準備好：將移除 ${partCount} 個元件和 ${wireCount} 條導線。選擇「${copy.workspace.confirmClear}」繼續；復原可還原。`
          : `${wiringStatusPrefix}Clear workspace ready: ${partCount} part${partCount === 1 ? "" : "s"} and ${wireCount} wire${wireCount === 1 ? "" : "s"} will be removed. Choose Confirm clear to continue; Undo can restore it.`,
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
    setExportStatus(
      copy.locale === "zh-HK"
        ? "工作區已清空。按復原可還原已清空的電路。"
        : "Workspace cleared. Press Undo to restore the cleared circuit.",
    );
    focusWorkspaceRegion();
  }

  function loadPresetCircuit(preset: (typeof circuitBuilderPresets)[number]) {
    const document = preset.buildDocument();
    const partCount = document.components.length;
    const wiringStatusPrefix = getWiringResetStatusPrefix();
    const presetLabel = copy.presets.items[preset.id]?.label ?? preset.label;

    setActiveAccountSavedCircuitId(null);
    dispatch({
      type: "load-document",
      document,
      label: copy.locale === "zh-HK" ? `載入${presetLabel}` : `load ${preset.label}`,
    });
    setExportStatus(
      copy.locale === "zh-HK"
        ? `${wiringStatusPrefix}${presetLabel} 已載入，包含 ${partCount} 個元件。按復原可還原上一個工作區。`
        : `${wiringStatusPrefix}${preset.label} loaded with ${partCount} part${partCount === 1 ? "" : "s"}. Press Undo to restore the previous workspace.`,
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
        ? `${wiringStatusPrefix}${circuitStatusText(
            copy,
            `Restored local draft saved ${formatCircuitDraftSavedAt(pendingDraft.savedAt)}.`,
            `已還原於 ${formatCircuitDraftSavedAt(pendingDraft.savedAt)} 儲存的本機草稿。`,
          )}`
        : `${wiringStatusPrefix}${circuitStatusText(
            copy,
            "Restored local draft.",
            "已還原本機草稿。",
          )}`,
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
    setExportStatus(circuitStatusText(copy, "Saved local draft discarded.", "已丟棄本機草稿。"));
  }

  function buildDefaultSavedCircuitTitle() {
    const firstComponent = state.document.components[0];
    if (firstComponent) {
      return circuitStatusText(
        copy,
        `${firstComponent.label} circuit`,
        `${formatCircuitComponentDisplayLabel(firstComponent, copy)} 電路`,
      );
    }
    return circuitStatusText(copy, `Circuit ${savedCircuits.length + 1}`, `電路 ${savedCircuits.length + 1}`);
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
    setExportStatus(circuitStatusText(
      copy,
      `Saved locally as ${result.savedCircuit.title}.`,
      `已本機儲存為「${result.savedCircuit.title}」。`,
    ));
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
    setExportStatus(circuitStatusText(
      copy,
      `Updated ${result.savedCircuit.title}.`,
      `已更新「${result.savedCircuit.title}」。`,
    ));
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
    setExportStatus(`${wiringStatusPrefix}${circuitStatusText(
      copy,
      `Opened ${savedCircuit.title}.`,
      `已開啟「${savedCircuit.title}」。`,
    )}`);
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
      setExportStatus(circuitStatusText(copy, "Saved circuit rename failed.", "重新命名已儲存電路失敗。"));
      return;
    }
    setEditingSavedCircuitId(null);
    setRenameDraft("");
    setExportStatus(circuitStatusText(
      copy,
      `Renamed saved circuit to ${renamed.title}.`,
      `已將已儲存電路重新命名為「${renamed.title}」。`,
    ));
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
    setExportStatus(circuitStatusText(
      copy,
      `Deleted saved circuit ${deleted.title}.`,
      `已刪除已儲存電路「${deleted.title}」。`,
    ));
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
      setExportStatus(circuitStatusText(
        copy,
        `Saved to account as ${result.savedCircuit.title}.`,
        `已儲存到帳戶為「${result.savedCircuit.title}」。`,
      ));
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : circuitStatusText(
              copy,
              "Account-backed save could not be created right now.",
              "目前無法建立帳戶儲存。",
            ),
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
      setExportStatus(circuitStatusText(
        copy,
        `Updated account save ${result.savedCircuit.title}.`,
        `已更新帳戶儲存「${result.savedCircuit.title}」。`,
      ));
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : circuitStatusText(
              copy,
              "Account-backed save could not be updated right now.",
              "目前無法更新帳戶儲存。",
            ),
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
    setExportStatus(`${wiringStatusPrefix}${circuitStatusText(
      copy,
      `Opened account save ${savedCircuit.title}.`,
      `已開啟帳戶儲存「${savedCircuit.title}」。`,
    )}`);
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
      setExportStatus(circuitStatusText(
        copy,
        `Renamed account save to ${result.savedCircuit.title}.`,
        `已將帳戶儲存重新命名為「${result.savedCircuit.title}」。`,
      ));
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : circuitStatusText(copy, "Account save rename failed.", "重新命名帳戶儲存失敗。"),
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
      setExportStatus(circuitStatusText(copy, "Deleted account-saved circuit.", "已刪除帳戶已儲存電路。"));
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : circuitStatusText(copy, "Account save deletion failed.", "刪除帳戶儲存失敗。"),
      );
    }
  }

  const undoHistory = useCallback(() => {
    if (!undoHistoryLabel) {
      setExportStatus(circuitStatusText(
        copy,
        "Nothing to undo yet. Make a circuit change first.",
        "暫時沒有可復原的步驟。請先變更電路。",
      ));
      focusWorkspaceRegion();
      return;
    }
    if (state.historySession) {
      dispatch({ type: "commit-history-session" });
    }
    dispatch({ type: "undo" });
    setActiveAccountSavedCircuitId(null);
    setExportStatus(circuitStatusText(copy, `Undid ${undoHistoryLabel}.`, `已復原「${undoHistoryLabel}」。`));
    focusWorkspaceRegion();
  }, [copy, focusWorkspaceRegion, state.historySession, undoHistoryLabel]);

  const redoHistory = useCallback(() => {
    if (hasPendingHistoryChange) {
      setExportStatus(circuitStatusText(
        copy,
        "Finish the current adjustment before redoing another change.",
        "請先完成目前調整，才重做另一個變更。",
      ));
      focusWorkspaceRegion();
      return;
    }
    if (!redoHistoryLabel) {
      setExportStatus(circuitStatusText(
        copy,
        "Nothing to redo yet. Undo a change before using redo.",
        "暫時沒有可重做的步驟。請先復原一個變更。",
      ));
      focusWorkspaceRegion();
      return;
    }
    dispatch({ type: "redo" });
    setActiveAccountSavedCircuitId(null);
    setExportStatus(circuitStatusText(copy, `Redid ${redoHistoryLabel}.`, `已重做「${redoHistoryLabel}」。`));
    focusWorkspaceRegion();
  }, [copy, focusWorkspaceRegion, hasPendingHistoryChange, redoHistoryLabel]);

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
          setExportStatus(circuitStatusText(
            copy,
            "Wire cancelled. Choose a terminal when you are ready to try again.",
            "導線已取消。準備好後請選一個端子再試。",
          ));
          focusWorkspaceRegion();
          return;
        }

        if (state.activeTool === "wire") {
          event.preventDefault();
          dispatch({ type: "set-tool", tool: "select" });
          setExportStatus(circuitStatusText(copy, "Wire tool turned off.", "導線工具已關閉。"));
          focusWorkspaceRegion();
          return;
        }

        if (clearWorkspaceArmed) {
          event.preventDefault();
          setClearWorkspaceArmed(false);
          setExportStatus(circuitStatusText(
            copy,
            "Clear workspace cancelled. Nothing was removed.",
            "清空工作區已取消。未移除任何內容。",
          ));
          focusWorkspaceRegion();
          return;
        }

        if (state.selection) {
          event.preventDefault();
          dispatch({ type: "select-component", componentId: null });
          setExportStatus(circuitStatusText(copy, "Selection cleared.", "已清除選取。"));
          focusWorkspaceRegion();
        }
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (selectionActionsLocked && state.selection) {
          event.preventDefault();
          setExportStatus(circuitStatusText(
            copy,
            "Finish or cancel wiring before deleting the selected item.",
            "請先完成或取消接線，才刪除已選項目。",
          ));
          focusWorkspaceRegion();
          return;
        }

        if (selectedComponent) {
          event.preventDefault();
          dispatch({ type: "delete-component", componentId: selectedComponent.id });
          setExportStatus(
            appendClearWorkspaceCancellation(
              circuitStatusText(
                copy,
                `${selectedComponent.label} deleted.`,
                `${formatCircuitComponentDisplayLabel(selectedComponent, copy)}已刪除。`,
              ),
              circuitStatusText(
                copy,
                "Clear workspace confirmation was cancelled before deleting the selected part.",
                "刪除已選元件前已取消清空工作區確認。",
              ),
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
              circuitStatusText(copy, "Selected wire deleted.", "已刪除已選導線。"),
              circuitStatusText(
                copy,
                "Clear workspace confirmation was cancelled before deleting the selected connection.",
                "刪除已選連接前已取消清空工作區確認。",
              ),
            ),
          );
          focusWorkspaceRegion();
        }
        return;
      }

      if (key === "r" && selectedComponent) {
        event.preventDefault();
        if (selectionActionsLocked) {
          setExportStatus(circuitStatusText(
            copy,
            "Finish or cancel wiring before rotating the selected component.",
            "請先完成或取消接線，才旋轉已選元件。",
          ));
          focusWorkspaceRegion();
          return;
        }
        dispatch({ type: "rotate-component", componentId: selectedComponent.id });
        setExportStatus(
          appendClearWorkspaceCancellation(
            circuitStatusText(
              copy,
              `${selectedComponent.label} rotated.`,
              `${formatCircuitComponentDisplayLabel(selectedComponent, copy)}已旋轉。`,
            ),
            circuitStatusText(
              copy,
              "Clear workspace confirmation was cancelled before this edit.",
              "此編輯前已取消清空工作區確認。",
            ),
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
          setExportStatus(circuitStatusText(
            copy,
            "Finish or cancel wiring before moving the selected component.",
            "請先完成或取消接線，才移動已選元件。",
          ));
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
          setExportStatus(circuitStatusText(
            copy,
            `${selectedComponent.label} is already at the workspace edge.`,
            `${formatCircuitComponentDisplayLabel(selectedComponent, copy)}已在工作區邊緣。`,
          ));
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
            circuitStatusText(
              copy,
              `${selectedComponent.label} moved to ${nextPoint.x}, ${nextPoint.y}. Use Shift+arrow for larger steps.`,
              `${formatCircuitComponentDisplayLabel(selectedComponent, copy)}已移至 ${nextPoint.x}, ${nextPoint.y}。用 Shift+方向鍵可大步移動。`,
            ),
            circuitStatusText(
              copy,
              "Clear workspace confirmation was cancelled before this edit.",
              "此編輯前已取消清空工作區確認。",
            ),
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
          ? circuitStatusText(
              copy,
              " Clear workspace confirmation was cancelled; nothing was removed.",
              " 清空工作區確認已取消；未移除任何內容。",
            )
          : "";
        if (clearWorkspaceArmed) {
          setClearWorkspaceArmed(false);
        }
        if (state.pendingWireStart) {
          dispatch({ type: "set-tool", tool: "select" });
          setExportStatus(
            `${circuitStatusText(
              copy,
              "Wire cancelled and wire tool turned off.",
              "導線已取消，導線工具已關閉。",
            )}${clearWorkspaceCancellation}`,
          );
          focusWorkspaceRegion();
          return;
        }

        if (state.activeTool === "wire") {
          dispatch({ type: "set-tool", tool: "select" });
          setExportStatus(`${circuitStatusText(copy, "Wire tool turned off.", "導線工具已關閉。")}${clearWorkspaceCancellation}`);
        } else {
          dispatch({ type: "set-tool", tool: "wire" });
          setExportStatus(
            `${circuitStatusText(
              copy,
              "Wire tool active. Click a terminal to start a connection.",
              "導線工具已啟用。按端子開始連接。",
            )}${clearWorkspaceCancellation}`,
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
    copy,
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
    ? formatCircuitWireDisplayLabel(state.document, selectedWire, copy)
    : null;
  const selectionSummary =
    state.selection?.kind === "component"
      ? (() => {
          const component =
            state.document.components.find((entry) => entry.id === state.selection?.id) ?? null;
          return component ? formatCircuitComponentDisplayLabel(component, copy) : null;
        })()
      : state.selection?.kind === "wire"
        ? selectedWireLabel ?? copy.toolbar.wireSelected
        : copy.toolbar.nothingSelected;
  const wireSelectionHint =
    state.selection?.kind === "wire"
      ? selectedWireLabel
        ? circuitStatusText(
            copy,
            `${selectedWireLabel} selected. Delete removes this connection; rotate only applies to components.`,
            `已選取${selectedWireLabel}。Delete 會移除此連接；旋轉只適用於元件。`,
          )
        : circuitStatusText(
            copy,
            "A wire is selected. Delete removes this connection; rotate only applies to components.",
            "已選取導線。Delete 會移除此連接；旋轉只適用於元件。",
          )
      : null;
  const issueSummary =
    solveResult.issues.length > 0
      ? `${solveResult.issues.length} ${
          solveResult.issues.length === 1 ? copy.toolbar.issueSingular : copy.toolbar.issuePlural
        }`
      : copy.toolbar.solverReady;
  const activeToolSummary = state.pendingWireStart
    ? copy.toolbar.wireChooseEnd
    : state.activeTool === "wire"
      ? copy.toolbar.wireMode
      : copy.toolbar.selectMode;
  const activeToolDetail = state.pendingWireStart
    ? copy.toolbar.activeToolDetails.pending
    : state.activeTool === "wire"
      ? copy.toolbar.activeToolDetails.wire
      : copy.toolbar.activeToolDetails.select;
  const keyboardShortcutSummary = state.pendingWireStart
    ? copy.toolbar.shortcuts.pending
    : state.activeTool === "wire"
      ? copy.toolbar.shortcuts.wire
      : clearWorkspaceArmed
        ? copy.toolbar.shortcuts.clearArmed
        : state.selection?.kind === "component"
        ? copy.toolbar.shortcuts.component
        : state.selection?.kind === "wire"
          ? copy.toolbar.shortcuts.wireSelected
        : copy.toolbar.shortcuts.idle;
  const toolbarNotice = exportStatus ?? wireSelectionHint ?? (
    !canExportDiagram
      ? copy.toolbar.diagramExportDisabled
      : solveResult.issues.length > 0
        ? copy.toolbar.svgWarning
        : activeToolDetail
  );
  const desktopEnvironmentControl = (
    <div className="hidden xl:block">
      <CircuitEnvironmentControl
        mode="desktop"
        copy={copy}
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
  const workspaceControlsSlot = (
    <CircuitRenderModeSwitch value={renderMode} onChange={updateCircuitRenderMode} copy={copy} />
  );
  const builderGridColumnClass = isLibraryCollapsed
    ? isInspectorCollapsed
      ? "xl:grid-cols-[3.25rem_minmax(0,1fr)_3.25rem]"
      : "xl:grid-cols-[3.25rem_minmax(0,1fr)_18rem]"
    : isInspectorCollapsed
      ? "xl:grid-cols-[14rem_minmax(0,1fr)_3.25rem]"
      : "xl:grid-cols-[14rem_minmax(0,1fr)_18rem]";
  const inspectorCollapsedLabel = solveResult.issues.length > 0
    ? `${copy.locale === "zh-HK" ? "展開檢視器" : "Expand inspector"}; ${
        solveResult.issues.length
      } ${
        solveResult.issues.length === 1 ? copy.toolbar.issueSingular : copy.toolbar.issuePlural
      }`
    : copy.locale === "zh-HK" ? "展開檢視器" : "Expand inspector";
  const mobileEnvironmentControl = (
    <div className="xl:hidden">
      <CircuitEnvironmentControl
        mode="mobile"
        copy={copy}
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
      title={copy.saves.panelTitle}
      summary={copy.saves.panelSummary}
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
            {copy.saves.intro}
          </p>
          <span className="rounded-full border border-line bg-paper px-3 py-1 text-sm font-medium text-ink-700">
            {savedCircuits.length} {copy.saves.localCount}
          </span>
        </div>

        {savePanelOpen ? (
          <div className="rounded-[22px] border border-line bg-paper p-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {copy.saves.savedCircuitName}
              </span>
              <input
                type="text"
                aria-label={copy.saves.savedCircuitName}
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
                {copy.saves.saveCircuit}
              </button>
              <button
                type="button"
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950"
                onClick={cancelSavePanel}
              >
                {copy.saves.cancel}
              </button>
            </div>
          </div>
        ) : null}

        {savedCircuits.length === 0 ? (
          <div className="rounded-[22px] border border-line bg-paper p-4 text-sm leading-6 text-ink-700">
            {copy.saves.emptyLocal}
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
                            {copy.saves.current}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                          {savedCircuit.document.components.length} {copy.saves.parts}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-950">{savedCircuit.title}</p>
                        <p className="mt-1 text-xs leading-5 text-ink-600">
                          {updatedAtLabel ? `${copy.saves.updated} ${updatedAtLabel}` : copy.saves.savedLocally}
                        </p>
                      </div>
                    </div>
                    {!isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-label={`${copy.saves.open} ${savedCircuit.title}`}
                          title={`${copy.saves.open} ${savedCircuit.title}`}
                          className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                          onClick={() => openSavedCircuit(savedCircuit.id)}
                        >
                          {copy.saves.open}
                        </button>
                        <button
                          type="button"
                          aria-label={`${copy.saves.rename} ${savedCircuit.title}`}
                          title={`${copy.saves.rename} ${savedCircuit.title}`}
                          className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                          onClick={() => startRenameSavedCircuit(savedCircuit.id, savedCircuit.title)}
                        >
                          {copy.saves.rename}
                        </button>
                        <button
                          type="button"
                          aria-label={`${copy.saves.delete} ${savedCircuit.title}`}
                          title={`${copy.saves.delete} ${savedCircuit.title}`}
                          className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700"
                          onClick={() => removeSavedCircuit(savedCircuit.id)}
                        >
                          {copy.saves.delete}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <label className="block">
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                          {copy.saves.renameSavedCircuit}
                        </span>
                        <input
                          type="text"
                          aria-label={copy.saves.renameSavedCircuit}
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
                          {copy.saves.saveName}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700"
                          onClick={cancelRenameSavedCircuit}
                        >
                          {copy.saves.cancel}
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
              <p className="lab-label">{copy.saves.accountTitle}</p>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                {copy.saves.accountDescription}
              </p>
            </div>
            {canUseAccountSaves ? (
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-sm font-medium text-ink-700">
                {accountSavedCircuits.length} {copy.saves.accountCount}
              </span>
            ) : null}
          </div>

          {!canUseAccountSaves ? (
            <div className="mt-4">
              <PremiumFeatureNotice
                title={copy.saves.accountFeatureTitle}
                description={copy.saves.accountFeatureDescription}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {accountSavePanelOpen ? (
                <div className="rounded-[20px] border border-line bg-paper-strong p-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                      {copy.saves.accountSaveName}
                    </span>
                    <input
                      type="text"
                      aria-label={copy.saves.accountSaveName}
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
                      {copy.toolbar.saveToAccount}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950"
                      onClick={cancelAccountSavePanel}
                    >
                      {copy.saves.cancel}
                    </button>
                  </div>
                </div>
              ) : null}

              {accountSavedCircuitsLoading ? (
                <div className="rounded-[20px] border border-line bg-paper-strong p-4 text-sm text-ink-700">
                  {copy.saves.loadingAccount}
                </div>
              ) : accountSavedCircuits.length === 0 ? (
                <div className="rounded-[20px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {copy.saves.emptyAccount}
                </div>
              ) : (
                <div className="grid gap-3">
                  {accountSavedCircuits.map((savedCircuit) => {
                    const updatedAtLabel = formatSavedCircuitTimestamp(savedCircuit.updatedAt);
                    const isCurrent = activeAccountSavedCircuitId === savedCircuit.id;
                    const isEditing = editingAccountSavedCircuitId === savedCircuit.id;
                    const accountOpenLabel = circuitStatusText(
                      copy,
                      "Open account save",
                      "開啟帳戶儲存",
                    );
                    const accountRenameLabel = circuitStatusText(
                      copy,
                      "Rename account save",
                      "重新命名帳戶儲存",
                    );
                    const accountDeleteLabel = circuitStatusText(
                      copy,
                      "Delete account save",
                      "刪除帳戶儲存",
                    );

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
                                  {copy.saves.current}
                                </span>
                              ) : null}
                              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                                {savedCircuit.document.components.length} {copy.saves.parts}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink-950">{savedCircuit.title}</p>
                              <p className="mt-1 text-xs leading-5 text-ink-600">
                                {updatedAtLabel ? `${copy.saves.updated} ${updatedAtLabel}` : copy.saves.savedToAccount}
                              </p>
                            </div>
                          </div>
                          {!isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                aria-label={`${accountOpenLabel} ${savedCircuit.title}`}
                                title={`${accountOpenLabel} ${savedCircuit.title}`}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                                onClick={() => openAccountSavedCircuit(savedCircuit)}
                              >
                                {accountOpenLabel}
                              </button>
                              <button
                                type="button"
                                aria-label={`${accountRenameLabel} ${savedCircuit.title}`}
                                title={`${accountRenameLabel} ${savedCircuit.title}`}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800"
                                onClick={() => startRenameAccountSavedCircuit(savedCircuit)}
                              >
                                {accountRenameLabel}
                              </button>
                              <button
                                type="button"
                                aria-label={`${accountDeleteLabel} ${savedCircuit.title}`}
                                title={`${accountDeleteLabel} ${savedCircuit.title}`}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700"
                                onClick={() => void removeAccountSavedCircuit(savedCircuit.id)}
                              >
                                {accountDeleteLabel}
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                            <label className="block">
                              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                                {copy.saves.renameAccountSave}
                              </span>
                              <input
                                type="text"
                                aria-label={copy.saves.renameAccountSave}
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
                                {copy.saves.saveName}
                              </button>
                              <button
                                type="button"
                                className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700"
                                onClick={cancelRenameAccountSavedCircuit}
                              >
                                {copy.saves.cancel}
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
  const presetChips = (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      data-testid="circuit-builder-preset-strip"
    >
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
        {copy.presets.label}
      </span>
      {circuitBuilderPresets.map((preset) => {
        const presetCopy = copy.presets.items[preset.id] ?? preset;
        return (
          <button
            key={preset.id}
            type="button"
            title={presetCopy.description}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-paper-strong"
            onClick={() => loadPresetCircuit(preset)}
          >
            {presetCopy.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <section
      id="circuit-builder-workspace"
      className="space-y-3"
      data-circuit-builder-ready={hasHydrated ? "" : undefined}
    >
      <div className="motion-enter motion-enter-tight page-band p-2.5 sm:p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-center">
          <div className="min-w-0 space-y-1">
            <p className="lab-label">{copy.hero.eyebrow}</p>
            <h1 className="max-w-4xl text-[1.2rem] font-semibold leading-tight text-ink-950 sm:text-[1.35rem]">
              {copy.hero.title}
            </h1>
            <p className="max-w-3xl text-xs leading-5 text-ink-700">
              {copy.hero.subtitle}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:items-end">
            <LearningVisual
              kind="tool"
              motif="circuit"
              tone="amber"
              compact
              className="hidden h-20 w-full max-w-sm rounded-[18px] sm:block"
              ariaLabel={copy.hero.title}
            />
            {presetChips}
          </div>
        </div>
      </div>

      {draftRecoveryState === "pending" && pendingDraft ? (
        <section className="lab-panel px-3 py-2.5" aria-label={copy.draft.ariaLabel}>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-950">{copy.draft.title}</p>
              <p className="text-xs leading-5 text-ink-700">
                {copy.draft.savedPrefix} {formatCircuitDraftSavedAt(pendingDraft.savedAt)}. {copy.draft.savedSuffix}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-950"
                onClick={restorePendingDraft}
              >
                {copy.draft.restore}
              </button>
              <button
                type="button"
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-950"
                onClick={dismissPendingDraft}
              >
                {copy.draft.dismiss}
              </button>
              <button
                type="button"
                className="rounded-full border border-coral-500/30 bg-coral-500/10 px-3 py-1.5 text-xs font-semibold text-coral-700"
                onClick={discardPendingDraft}
              >
                {copy.draft.discard}
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
            aria-label={copy.palette.collapsedAria}
            data-circuit-palette-collapsed=""
          >
            <button
              type="button"
              aria-label={copy.palette.expandAria}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-lg font-semibold text-ink-950 shadow-sm transition hover:border-teal-500/35"
              onClick={() => setIsLibraryCollapsed(false)}
            >
              →
            </button>
            <span className="rotate-180 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600 [writing-mode:vertical-rl]">
              {copy.palette.collapsedLabel}
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
                aria-label={copy.palette.collapseAria}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold text-ink-950 shadow-sm transition hover:border-teal-500/35"
                onClick={() => setIsLibraryCollapsed(true)}
              >
                ←
              </button>
              <CircuitPalette
                panelKind="desktop"
                className="h-full min-h-0"
                activeTool={state.activeTool}
                renderMode={renderMode}
                copy={copy}
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
            controlsSlot={workspaceControlsSlot}
            document={state.document}
            solveResult={solveResult}
            renderMode={renderMode}
            copy={copy}
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
              aria-label={copy.connections.ariaLabel}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="lab-label">{copy.connections.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-700">
                    {copy.connections.help}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-sm font-medium text-ink-700">
                  {state.document.wires.length}{" "}
                  {state.document.wires.length === 1
                    ? copy.workspace.wireSingular
                    : copy.workspace.wirePlural}
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
                      {formatCircuitWireDisplayLabel(state.document, wire, copy)}
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
            aria-label={copy.locale === "zh-HK" ? "已收合的電路檢視器" : "Collapsed circuit inspector"}
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
              {copy.inspector.eyebrow}
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
                copy={copy}
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

      <div className="page-band p-2.5">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0 space-y-1.5">
            <p className="lab-label">{copy.toolbar.title}</p>
            <div
              className="flex flex-wrap items-center gap-1.5"
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
              className="flex flex-wrap items-center gap-1.5 xl:justify-end"
              data-circuit-toolbar=""
            >
              <div
                role="group"
                aria-label={copy.toolbar.groupAria.history}
                data-circuit-toolbar-group="history"
                className={toolbarGroupClass}
              >
                <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 lg:inline">
                  {copy.toolbar.history}
                </span>
                <span id="circuit-undo-description" className="sr-only">
                  {undoHistoryLabel
                    ? `Undo ${undoHistoryLabel}. Shortcut: Ctrl or Command plus Z.`
                    : copy.toolbar.descriptions.noUndo}
                </span>
                <span id="circuit-redo-description" className="sr-only">
                  {hasPendingHistoryChange
                    ? "Finish the current adjustment before redoing another step. Shortcut: Ctrl or Command plus Y, or Ctrl or Command plus Shift plus Z."
                    : redoHistoryLabel
                      ? `Redo ${redoHistoryLabel}. Shortcut: Ctrl or Command plus Y, or Ctrl or Command plus Shift plus Z.`
                      : copy.toolbar.descriptions.noRedo}
                </span>
                <button
                  type="button"
                  disabled={!canUndo}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-undo-description"
                  aria-keyshortcuts="Control+Z Meta+Z"
                  title={circuitStatusText(copy, "Undo (shortcut: Ctrl/⌘+Z)", "復原（快捷鍵：Ctrl/⌘+Z）")}
                  onClick={undoHistory}
                >
                  {copy.toolbar.undo}
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-redo-description"
                  aria-keyshortcuts="Control+Y Meta+Y Control+Shift+Z Meta+Shift+Z"
                  title={circuitStatusText(
                    copy,
                    "Redo (shortcut: Ctrl/⌘+Y or Ctrl/⌘+Shift+Z)",
                    "重做（快捷鍵：Ctrl/⌘+Y 或 Ctrl/⌘+Shift+Z）",
                  )}
                  onClick={redoHistory}
                >
                  {copy.toolbar.redo}
                </button>
              </div>

              <div
                role="group"
                aria-label={copy.toolbar.groupAria.selection}
                data-circuit-toolbar-group="selection"
                className={[
                  toolbarGroupClass,
                  state.selection ? "border-teal-500/25 bg-teal-500/6" : "",
                ].join(" ")}
              >
                <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 lg:inline">
                  {copy.toolbar.selection}
                </span>
                <span id="circuit-rotate-selection-description" className="sr-only">
                  {selectedComponent
                    ? selectionActionsLocked
                      ? copy.toolbar.descriptions.rotateLocked
                      : copy.toolbar.descriptions.rotateSelected
                    : copy.toolbar.descriptions.rotateMissing}
                </span>
                <span id="circuit-delete-selection-description" className="sr-only">
                  {state.selection
                    ? selectionActionsLocked
                      ? copy.toolbar.descriptions.deleteLocked
                      : copy.toolbar.descriptions.deleteSelected
                    : copy.toolbar.descriptions.deleteMissing}
                </span>
                <button
                  type="button"
                  disabled={!selectedComponent || selectionActionsLocked}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-rotate-selection-description"
                  aria-keyshortcuts="R"
                  title={circuitStatusText(copy, "Rotate selected component (shortcut: R)", "旋轉已選元件（快捷鍵：R）")}
                  onClick={rotateSelectedComponent}
                >
                  {copy.toolbar.rotateSelected}
                </button>
                <button
                  type="button"
                  disabled={!state.selection || selectionActionsLocked}
                  className={toolbarButtonClass}
                  aria-describedby="circuit-delete-selection-description"
                  aria-keyshortcuts="Delete Backspace"
                  title={circuitStatusText(
                    copy,
                    "Delete selected item (shortcut: Delete/Backspace)",
                    "刪除已選項目（快捷鍵：Delete/Backspace）",
                  )}
                  onClick={deleteSelectedItem}
                >
                  {copy.toolbar.deleteSelected}
                </button>
              </div>

              <CircuitToolbarMenu
                menuId="saves"
                label={copy.toolbar.saves}
                ariaLabel={copy.toolbar.saves}
                panelTitle={copy.saves.panelTitle}
                panelDescription={copy.saves.panelSummary}
              >
                {({ closeMenu }) => (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div>
                        <p className="lab-label">{copy.saves.localSaves}</p>
                        <p className="mt-1 text-xs leading-5 text-ink-600">
                          {copy.saves.localSavesHelp}
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
                          {copy.toolbar.saveLocally}
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
                          {copy.toolbar.updateSaved}
                        </button>
                      </div>
                      <p className="text-xs leading-5 text-ink-600">
                        {activeLocalSavedCircuit
                          ? circuitStatusText(
                              copy,
                              `Current local save: ${activeLocalSavedCircuit.title}.`,
                              `目前本機儲存：「${activeLocalSavedCircuit.title}」。`,
                            )
                          : copy.saves.noLocalLoaded}
                      </p>
                      <p className="rounded-2xl border border-line bg-paper-strong px-3 py-2 text-xs leading-5 text-ink-700">
                        {saveStateDetail}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-line pt-3">
                      <div>
                        <p className="lab-label">{copy.saves.accountSaves}</p>
                        <p className="mt-1 text-xs leading-5 text-ink-600">
                          {copy.saves.accountSavesHelp}
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
                              {copy.toolbar.saveToAccount}
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
                              {copy.toolbar.updateAccountSave}
                            </button>
                          </div>
                          <p className="text-xs leading-5 text-ink-600">
                            {activeAccountSavedCircuit
                              ? circuitStatusText(
                                  copy,
                                  `Current account save: ${activeAccountSavedCircuit.title}.`,
                                  `目前帳戶儲存：「${activeAccountSavedCircuit.title}」。`,
                                )
                              : copy.saves.noAccountLoaded}
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
                              {copy.toolbar.saveToAccount}
                            </button>
                            <button
                              type="button"
                              disabled
                              className={toolbarButtonClass}
                            >
                              {copy.toolbar.updateAccountSave}
                            </button>
                          </div>
                          <PremiumFeatureNotice
                            title={copy.saves.accountFeatureTitle}
                            description={copy.saves.accountFeatureDescription}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CircuitToolbarMenu>

              <div
                role="group"
                aria-label={copy.toolbar.groupAria.file}
                data-circuit-toolbar-group="file"
                className={toolbarGroupClass}
              >
                <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500 lg:inline">
                  {copy.toolbar.file}
                </span>
                <button
                  type="button"
                  disabled={!canExportDiagram}
                  className={toolbarButtonClass}
                  onClick={downloadSvgDiagram}
                >
                  {copy.toolbar.downloadSvg}
                </button>
                <CircuitToolbarMenu
                  menuId="file"
                  label={copy.toolbar.file}
                  ariaLabel={copy.toolbar.file}
                  panelTitle={copy.saves.fileMenuTitle}
                  panelDescription={copy.saves.fileMenuDescription}
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
                          {copy.toolbar.downloadJson}
                        </button>
                        <button
                          type="button"
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            openJsonDialog();
                          }}
                        >
                          {copy.toolbar.loadJson}
                        </button>
                        <button
                          type="button"
                          className={toolbarButtonClass}
                          onClick={() => {
                            closeMenu();
                            copyJsonState();
                          }}
                        >
                          {copy.toolbar.copyJsonState}
                        </button>
                      </div>
                      <p className="text-xs leading-5 text-ink-600">
                        {copy.saves.fileMenuHelp}
                      </p>
                    </div>
                  )}
                </CircuitToolbarMenu>
              </div>

              <input
                ref={loadJsonInputRef}
                type="file"
                accept=".json,application/json"
                aria-label={copy.locale === "zh-HK" ? "載入電路 JSON 檔案" : "Load circuit JSON file"}
                className="sr-only"
                onChange={handleJsonFileChange}
              />
            </div>
          </div>
        </div>
        <div className="mt-2 grid gap-1 border-t border-line/70 pt-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center" data-circuit-toolbar-stable-status="">
          <p role="status" className="text-xs leading-5 text-ink-700">
            {toolbarNotice}
          </p>
          {toolbarNotice !== activeToolDetail ? (
            <p className="text-xs leading-5 text-ink-700 xl:text-right">{activeToolDetail}</p>
          ) : null}
          <p
            className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-500 xl:text-right"
            data-circuit-keyboard-hints=""
          >
            {keyboardShortcutSummary}
          </p>
        </div>
      </div>

      {savedCircuitsPanel}

      <div className="xl:hidden">
        <DisclosurePanel
          title={copy.mobile.paletteTitle}
          summary={copy.mobile.paletteSummary}
          defaultOpen={state.document.components.length === 0}
        >
          <CircuitPalette
            panelKind="mobile"
            activeTool={state.activeTool}
            renderMode={renderMode}
            copy={copy}
            onAddComponent={addComponent}
            onSetTool={setCircuitTool}
          />
        </DisclosurePanel>
      </div>

      <div className="xl:hidden">
        <DisclosurePanel
          title={copy.mobile.inspectorTitle}
          summary={copy.mobile.inspectorSummary}
          defaultOpen={Boolean(state.selection)}
        >
          <CircuitInspector
            document={state.document}
            solveResult={solveResult}
            copy={copy}
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
        title={copy.solverNotes.title}
        summary={copy.solverNotes.summary}
      >
        <div className="grid gap-3 text-sm leading-6 text-ink-700 sm:grid-cols-2">
          {copy.solverNotes.cards.map((card) => (
            <div key={card} className="rounded-[22px] border border-line bg-paper px-4 py-3">
              {card}
            </div>
          ))}
        </div>
      </DisclosurePanel>
    </section>
  );
}
