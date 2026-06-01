import type { AppLocale } from "@/i18n/routing";
import {
  circuitPaletteEntries,
  getCircuitComponentDefinition,
  getCircuitInspectorFields,
} from "./registry";
import type {
  CircuitComponentInstance,
  CircuitComponentType,
  CircuitDocument,
  CircuitEditableField,
  CircuitIssue,
  CircuitPaletteEntry,
  CircuitRenderMode,
  CircuitTerminalRef,
  CircuitWire,
} from "./types";

type CircuitComponentCopy = {
  label: string;
  shortLabel: string;
  symbolLabel: string;
  summary: string;
  symbolMeaning: string;
  behavior: string;
  notice: string;
  simplification: string;
  terminalLabels: {
    a: string;
    b: string;
  };
  searchTerms: string[];
  fields: Record<string, { label: string; help?: string }>;
};

type CircuitToolCopy = {
  label: string;
  shortLabel: string;
  symbolLabel: string;
  summary: string;
  behavior: string;
  searchTerms: string[];
};

export type CircuitBuilderCopy = {
  locale: AppLocale;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  presets: {
    label: string;
    items: Record<string, { label: string; description: string }>;
  };
  draft: {
    ariaLabel: string;
    title: string;
    savedPrefix: string;
    savedSuffix: string;
    restore: string;
    dismiss: string;
    discard: string;
  };
  palette: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    intro: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchHelp: string;
    clearSearch: string;
    clearSearchTitle: string;
    resultSummary: {
      available: string;
      match: string;
      matches: string;
    };
    emptyTitle: string;
    emptyHint: string;
    showAll: string;
    toolBadge: string;
    activateWireTool: string;
    wireToolActiveDescription: string;
    wireToolInactiveDescription: string;
    addComponentAriaPrefix: string;
    addComponentDescriptionPrefix: string;
    addComponentDescriptionSuffix: string;
    collapsedAria: string;
    collapseAria: string;
    expandAria: string;
    collapsedLabel: string;
  };
  renderMode: {
    ariaLabel: string;
    label: string;
    modes: Record<CircuitRenderMode, string>;
    status: Record<CircuitRenderMode, string>;
  };
  workspace: {
    ariaLabel: string;
    eyebrow: string;
    guidanceDefault: string;
    emptyTitle: string;
    emptySubtitle: string;
    emptyExample: string;
    emptyActionLabel: string;
    modernLegend: string;
    zoom: string;
    partSingular: string;
    partPlural: string;
    wireSingular: string;
    wirePlural: string;
    pointerDragging: string;
    panEmpty: string;
    chooseWireEnd: string;
    terminalPickMode: string;
    panningCanvas: string;
    snapGrid: string;
    statusAriaPrefix: string;
    canvasAriaPrefix: string;
    alreadySelectedTerminal: string;
    connectToPrefix: string;
    connectToSuffix: string;
    wiringFromPrefix: string;
    wiringFromSuffix: string;
    selectSecondTerminal: string;
    startWireFromPrefix: string;
    startWireFromSuffix: string;
    wireToolActive: string;
    terminalHoverSuffix: string;
    selectedComponentSuffix: string;
    selectedWireSuffix: string;
    dropPartFallback: string;
    dropPrefix: string;
    dropSuffix: string;
    fitViewDescriptionEnabled: string;
    fitViewDescriptionDisabled: string;
    zoomOutDescriptionEnabled: string;
    zoomOutDescriptionDisabled: string;
    zoomInDescriptionEnabled: string;
    zoomInDescriptionDisabled: string;
    resetViewDescriptionEnabled: string;
    resetViewDescriptionDisabled: string;
    clearDescriptionArmed: string;
    clearDescriptionEnabled: string;
    clearDescriptionDisabled: string;
    zoomOut: string;
    zoomIn: string;
    resetView: string;
    fitCircuit: string;
    clearWorkspace: string;
    confirmClear: string;
    zoomOutTitle: string;
    zoomInTitle: string;
    minimumZoomTitle: string;
    maximumZoomTitle: string;
    resetViewTitle: string;
    defaultViewTitle: string;
    panAnnounced: string;
    panCancelled: string;
    panInterrupted: string;
    zoomAlreadyAtPrefix: string;
    zoomStatusPrefix: string;
    zoomStatusSuffix: string;
    terminalActions: {
      pickAnotherEnd: string;
      connectHere: string;
      startHere: string;
      enterSpaceToWire: string;
    };
    componentDescriptions: {
      pending: string;
      wireMode: string;
      selected: string;
      idle: string;
    };
    terminalDescriptions: {
      pendingSame: string;
      pendingOtherPrefix: string;
      wireModePrefix: string;
      idlePrefix: string;
    };
    issueNeedsAttention: string;
    issueWarnings: string;
    inspectPrefix: string;
    floating: string;
  };
  connections: {
    ariaLabel: string;
    title: string;
    help: string;
  };
  inspector: {
    ariaLabel: string;
    eyebrow: string;
    componentEyebrow: string;
    wireEyebrow: string;
    emptyTitle: string;
    emptyDescription: string;
    emptySteps: string[];
    cleanCircuit: string;
    selectedConnection: string;
    missingWire: string;
    sharedNodeVoltage: string;
    model: string;
    idealConnection: string;
    wireModelDescription: string;
    wireDetails: string;
    whatWireDoes: string;
    wireDoesDescription: string;
    whatToNotice: string;
    wireNotice: string;
    currentCircuitContext: string;
    nodeAttachedTerminalSingular: string;
    nodeAttachedTerminalPlural: string;
    nodeSourceConnected: string;
    nodeSourceDisconnected: string;
    connectionLockedTitle: string;
    connectionLockedPending: string;
    connectionLockedTool: string;
    cancelWire: string;
    deleteWire: string;
    deleteSelectedWireAria: string;
    deleteWireLockedTitle: string;
    wireToolActiveTitle: string;
    wireToolPendingDescription: string;
    wireToolDescription: string;
    warningsAndErrors: string;
    componentWarnings: string;
    editableProperties: string;
    placement: string;
    computedValues: string;
    rotate: string;
    delete: string;
    rotateLockedTitle: string;
    deleteLockedTitle: string;
    editLocked: string;
    positionX: string;
    positionY: string;
    nudgeLeft: string;
    nudgeRight: string;
    nudgeUp: string;
    nudgeDown: string;
    resetFuse: string;
    detailsSummary: string;
    symbolMeaning: string;
    modelAndBehavior: string;
    context: string;
    notice: string;
    floating: string;
  };
  environment: {
    title: string;
    description: string;
    temperature: string;
    temperatureAria: string;
    light: string;
    lightAria: string;
  };
  toolbar: {
    title: string;
    nothingSelected: string;
    wireSelected: string;
    issueSingular: string;
    issuePlural: string;
    solverReady: string;
    selectMode: string;
    wireMode: string;
    wireChooseEnd: string;
    activeToolDetails: {
      pending: string;
      wire: string;
      select: string;
    };
    history: string;
    selection: string;
    undo: string;
    redo: string;
    rotateSelected: string;
    deleteSelected: string;
    saves: string;
    file: string;
    downloadSvg: string;
    saveLocally: string;
    updateSaved: string;
    saveToAccount: string;
    updateAccountSave: string;
    downloadJson: string;
    loadJson: string;
    copyJsonState: string;
    historyEmpty: string;
    unsavedNewCircuit: string;
    emptyWorkspace: string;
    diagramExportDisabled: string;
    svgWarning: string;
    shortcuts: {
      pending: string;
      wire: string;
      clearArmed: string;
      component: string;
      wireSelected: string;
      idle: string;
    };
    groupAria: {
      history: string;
      selection: string;
      file: string;
    };
    descriptions: {
      noUndo: string;
      noRedo: string;
      rotateSelected: string;
      rotateLocked: string;
      rotateMissing: string;
      deleteSelected: string;
      deleteLocked: string;
      deleteMissing: string;
    };
  };
  saves: {
    panelTitle: string;
    panelSummary: string;
    intro: string;
    localCount: string;
    savedCircuitName: string;
    saveCircuit: string;
    cancel: string;
    emptyLocal: string;
    current: string;
    parts: string;
    updated: string;
    savedLocally: string;
    open: string;
    rename: string;
    delete: string;
    renameSavedCircuit: string;
    saveName: string;
    accountTitle: string;
    accountDescription: string;
    accountCount: string;
    accountFeatureTitle: string;
    accountFeatureDescription: string;
    accountSaveName: string;
    loadingAccount: string;
    emptyAccount: string;
    savedToAccount: string;
    renameAccountSave: string;
    fileMenuTitle: string;
    fileMenuDescription: string;
    fileMenuHelp: string;
    localSaves: string;
    localSavesHelp: string;
    accountSaves: string;
    accountSavesHelp: string;
    noLocalLoaded: string;
    noAccountLoaded: string;
  };
  mobile: {
    paletteTitle: string;
    paletteSummary: string;
    inspectorTitle: string;
    inspectorSummary: string;
  };
  solverNotes: {
    title: string;
    summary: string;
    cards: string[];
  };
  status: {
    renderModeFallback: string;
    selectedTerminalFallback: string;
  };
  readouts: Record<string, string>;
  states: Record<string, string>;
  graphs: Record<string, string>;
  wireTool: CircuitToolCopy;
  components: Record<CircuitComponentType, CircuitComponentCopy>;
};

const componentTypes = [
  "ammeter",
  "battery",
  "capacitor",
  "diode",
  "fuse",
  "ldr",
  "lightBulb",
  "resistor",
  "switch",
  "thermistor",
  "voltmeter",
] as const satisfies readonly CircuitComponentType[];

function buildEnglishComponentCopy(type: CircuitComponentType): CircuitComponentCopy {
  const definition = getCircuitComponentDefinition(type);

  return {
    label: definition.label,
    shortLabel: definition.shortLabel,
    symbolLabel: definition.symbolLabel,
    summary: definition.summary,
    symbolMeaning: definition.symbolMeaning,
    behavior: definition.behavior,
    notice: definition.notice,
    simplification: definition.simplification,
    terminalLabels: definition.terminalLabels,
    searchTerms: [],
    fields: Object.fromEntries(
      definition.inspectorFields.map((field) => [
        field.key,
        {
          label: field.label,
          help: field.help,
        },
      ]),
    ),
  };
}

const englishComponents = Object.fromEntries(
  componentTypes.map((type) => [type, buildEnglishComponentCopy(type)]),
) as Record<CircuitComponentType, CircuitComponentCopy>;

const englishWireTool = circuitPaletteEntries.find((entry) => entry.type === "wire")!;

export const circuitBuilderCopyEn: CircuitBuilderCopy = {
  locale: "en",
  hero: {
    eyebrow: "Circuit Builder",
    title: "Build a live circuit and explain what it is doing.",
    subtitle: "Free-build, inspect live values, and keep the three-panel bench in view.",
  },
  presets: {
    label: "Start",
    items: {
      "starter-series": {
        label: "Starter series loop",
        description: "Battery, switch, resistor, bulb, and ammeter in one path.",
      },
      "metered-branch": {
        label: "Metered branch circuit",
        description: "Compare current and voltage across two resistor branches.",
      },
      "rc-explorer": {
        label: "Simple RC explorer",
        description: "A battery, resistor, switch, and capacitor with a charging curve.",
      },
      "thermistor-explorer": {
        label: "Thermistor temperature explorer",
        description: "Ambient temperature changes the thermistor resistance and current.",
      },
      "ldr-explorer": {
        label: "LDR light explorer",
        description: "Light intensity changes the LDR resistance and branch current.",
      },
    },
  },
  draft: {
    ariaLabel: "Local draft recovery",
    title: "Local draft available",
    savedPrefix: "Saved",
    savedSuffix: "Restore it, keep this session, or discard the draft.",
    restore: "Restore draft",
    dismiss: "Dismiss for now",
    discard: "Discard saved draft",
  },
  palette: {
    ariaLabel: "Component library",
    eyebrow: "Component library",
    title: "Add parts",
    intro: "Click to drop a part near the current viewport center, or drag it onto the workspace.",
    searchLabel: "Search components",
    searchPlaceholder: "Search components",
    searchHelp:
      "Search by name or role: try battery, source, bulb, ldr, sensor, fuse, or connect. Press Esc while searching to clear.",
    clearSearch: "Clear component search",
    clearSearchTitle: "Clear component search and keep focus in the search field (Esc)",
    resultSummary: {
      available: "tools and components available.",
      match: "match",
      matches: "matches",
    },
    emptyTitle: "No components match that search.",
    emptyHint: "Try “battery”, “bulb”, “ldr”, or clear the search to browse the full library.",
    showAll: "Show all components",
    toolBadge: "Tool",
    activateWireTool: "Activate wire tool",
    wireToolActiveDescription: "Wire tool is active. Press to return to select mode.",
    wireToolInactiveDescription:
      "Toggle wire mode, then choose two terminals in the workspace to connect parts.",
    addComponentAriaPrefix: "Add",
    addComponentDescriptionPrefix: "Click to add",
    addComponentDescriptionSuffix:
      "near the current workspace center, or drag it directly onto the workspace.",
    collapsedAria: "Collapsed component library",
    collapseAria: "Collapse component library",
    expandAria: "Expand component library",
    collapsedLabel: "Parts",
  },
  renderMode: {
    ariaLabel: "Circuit render mode",
    label: "View",
    modes: {
      schematic: "Schematic",
      modern: "Modern",
    },
    status: {
      schematic: "View switched to Schematic mode.",
      modern: "View switched to Modern mode.",
    },
  },
  workspace: {
    ariaLabel: "Circuit workspace",
    eyebrow: "Workspace",
    guidanceDefault: "Drag parts, rotate them in the inspector, and pan the canvas by dragging empty space.",
    emptyTitle: "Start with a source and one load",
    emptySubtitle: "Click a palette item to add it here, then connect terminals with the wire tool.",
    emptyExample: "Example: battery -> resistor -> back to the battery for a complete loop.",
    emptyActionLabel: "Open parts",
    modernLegend: "Modern: bulb glow follows power; e- dots show electron flow.",
    zoom: "zoom",
    partSingular: "part",
    partPlural: "parts",
    wireSingular: "wire",
    wirePlural: "wires",
    pointerDragging: "Dragging view",
    panEmpty: "Pan by dragging empty space",
    chooseWireEnd: "Choose wire end",
    terminalPickMode: "Terminal pick mode",
    panningCanvas: "Panning canvas",
    snapGrid: "32 px snap grid",
    statusAriaPrefix: "Workspace view status.",
    canvasAriaPrefix: "Interactive circuit workspace.",
    alreadySelectedTerminal:
      "That terminal is already selected. Choose a different terminal, click empty canvas, or press Esc to cancel.",
    connectToPrefix: "Connect to",
    connectToSuffix: "to finish the wire.",
    wiringFromPrefix: "Wiring from",
    wiringFromSuffix: "Select a second terminal, click empty canvas, or press Esc to cancel.",
    selectSecondTerminal: "Select a second terminal to finish the wire, or click empty canvas / press Esc to cancel.",
    startWireFromPrefix: "Start wire from",
    startWireFromSuffix: "",
    wireToolActive: "Wire tool active. Click a terminal to begin, or click empty canvas / press W/Esc to leave.",
    terminalHoverSuffix: "Click or press Enter/Space to start a wire from this terminal.",
    selectedComponentSuffix: "selected. Drag it, use arrow keys to nudge, or edit details in the inspector.",
    selectedWireSuffix: "selected. Use Delete or the inspector to remove it if needed.",
    dropPartFallback: "the part",
    dropPrefix: "Drop",
    dropSuffix: "on the 32 px snap grid",
    fitViewDescriptionEnabled: "Fit the whole circuit into the workspace view. Shortcut: F.",
    fitViewDescriptionDisabled: "Add at least one component before fitting the workspace view.",
    zoomOutDescriptionEnabled:
      "Zoom out from the current centered workspace view. Shortcut: minus. Ctrl/Cmd plus wheel zooms around the pointer.",
    zoomOutDescriptionDisabled: "Workspace is already at the minimum 45% zoom. Shortcut: minus.",
    zoomInDescriptionEnabled:
      "Zoom in on the current centered workspace view. Shortcut: plus. Ctrl/Cmd plus wheel zooms around the pointer.",
    zoomInDescriptionDisabled: "Workspace is already at the maximum 240% zoom. Shortcut: plus.",
    resetViewDescriptionEnabled: "Reset the workspace to the default zoom and pan. Shortcut: 0.",
    resetViewDescriptionDisabled: "Workspace is already at the default zoom and pan. Shortcut: 0.",
    clearDescriptionArmed:
      "Clear workspace is ready. Confirm to remove every component and wire, or press Escape to cancel; Undo can restore the cleared circuit.",
    clearDescriptionEnabled:
      "Clear every component and wire from the workspace. A second click confirms the clear, and Undo can restore it.",
    clearDescriptionDisabled: "Add at least one component before clearing the workspace.",
    zoomOut: "Zoom -",
    zoomIn: "Zoom +",
    resetView: "Reset view",
    fitCircuit: "Fit circuit",
    clearWorkspace: "Clear workspace",
    confirmClear: "Confirm clear",
    zoomOutTitle: "Zoom out (shortcut: -)",
    zoomInTitle: "Zoom in (shortcut: +)",
    minimumZoomTitle: "Minimum zoom reached",
    maximumZoomTitle: "Maximum zoom reached",
    resetViewTitle: "Reset workspace view (shortcut: 0)",
    defaultViewTitle: "Default view already active",
    panAnnounced: "Workspace panned. Drag empty canvas again to keep navigating.",
    panCancelled: "Workspace pan cancelled. View returned to where it started.",
    panInterrupted: "Workspace pan interrupted. View returned to where it started.",
    zoomAlreadyAtPrefix: "Workspace zoom already at",
    zoomStatusPrefix: "Workspace zoom",
    zoomStatusSuffix: "Ctrl/Cmd plus wheel uses the pointer as its anchor.",
    terminalActions: {
      pickAnotherEnd: "Pick another end",
      connectHere: "Connect here",
      startHere: "Start here",
      enterSpaceToWire: "Enter/Space to wire",
    },
    componentDescriptions: {
      pending:
        "body is locked while a wire is pending; use its terminals to finish the wire or press Escape to cancel.",
      wireMode:
        "body is locked while wiring; use its terminals to start a wire or press W/Escape to return to select mode.",
      selected:
        "is selected. Drag it, press arrow keys to nudge it, press R to rotate, or press Delete to remove it.",
      idle: "Press Enter or Space to select it; use its terminals to start wiring.",
    },
    terminalDescriptions: {
      pendingSame:
        "This terminal is already selected. Choose a different terminal, click empty canvas, or press Escape to cancel the wire.",
      pendingOtherPrefix: "Connect the pending wire to",
      wireModePrefix: "Start a wire from",
      idlePrefix: "Press Enter or Space to start a wire from",
    },
    issueNeedsAttention: "Needs attention",
    issueWarnings: "Warnings",
    inspectPrefix: "Inspect",
    floating: "floating",
  },
  connections: {
    ariaLabel: "Connections",
    title: "Connections",
    help: "Select a wire here if it is hard to target on the canvas, especially on smaller screens.",
  },
  inspector: {
    ariaLabel: "Circuit inspector",
    eyebrow: "Inspector",
    componentEyebrow: "Component inspector",
    wireEyebrow: "Wire inspector",
    emptyTitle: "Select a part to inspect it",
    emptyDescription:
      "The inspector explains what each symbol means, which properties you can edit, and how the part is behaving inside the current circuit.",
    emptySteps: [
      "1. Add a source and one load.",
      "2. Use the wire tool to connect terminals.",
      "3. Select a part for edits and live readouts.",
    ],
    cleanCircuit:
      "The current circuit solves cleanly. Select a component to see its local explanation and computed values.",
    selectedConnection: "Selected connection",
    missingWire: "The selected wire no longer exists.",
    sharedNodeVoltage: "Shared node voltage",
    model: "Model",
    idealConnection: "Ideal connection",
    wireModelDescription:
      "Voltage drop is treated as negligible and current is not tracked per individual wire.",
    wireDetails: "Wire details",
    whatWireDoes: "What the wire does",
    wireDoesDescription:
      "In this builder a wire is an ideal conductor that collapses both ends into the same electrical node.",
    whatToNotice: "What to notice",
    wireNotice:
      "Removing this wire can split one shared node into separate nodes, which may create open circuits or change branch currents immediately.",
    currentCircuitContext: "Current circuit context",
    nodeAttachedTerminalSingular: "attached terminal",
    nodeAttachedTerminalPlural: "attached terminals",
    nodeSourceConnected: "is on an active source path.",
    nodeSourceDisconnected: "is not connected to an active source path.",
    connectionLockedTitle: "Connection edits are locked while wiring",
    connectionLockedPending: "Finish this loose wire or cancel it before deleting the selected connection.",
    connectionLockedTool: "Leave the wire tool before deleting the selected connection.",
    cancelWire: "Cancel wire",
    deleteWire: "Delete wire",
    deleteSelectedWireAria: "Delete selected wire",
    deleteWireLockedTitle: "Finish or cancel wiring before deleting this wire.",
    wireToolActiveTitle: "Wire tool active",
    wireToolPendingDescription:
      "One terminal is already selected. Click a second terminal to finish the wire, or cancel the current wire.",
    wireToolDescription:
      "Click any terminal to start a wire, then click a second terminal to complete the connection.",
    warningsAndErrors: "Warnings and errors",
    componentWarnings: "Component warnings",
    editableProperties: "Editable properties",
    placement: "Placement",
    computedValues: "Computed values",
    rotate: "Rotate",
    delete: "Delete",
    rotateLockedTitle: "Finish or cancel wiring before rotating this component.",
    deleteLockedTitle: "Finish or cancel wiring before deleting this component.",
    editLocked: "Finish or cancel wiring before editing, moving, rotating, or deleting this selected part.",
    positionX: "Position X",
    positionY: "Position Y",
    nudgeLeft: "Nudge left",
    nudgeRight: "Nudge right",
    nudgeUp: "Nudge up",
    nudgeDown: "Nudge down",
    resetFuse: "Reset fuse",
    detailsSummary: "Symbol, model, and context",
    symbolMeaning: "What the symbol means",
    modelAndBehavior: "Model and behavior",
    context: "Current circuit context",
    notice: "What to notice",
    floating: "floating",
  },
  environment: {
    title: "Environment",
    description:
      "Ambient-linked thermistors follow temperature and ambient-linked LDRs follow light intensity. Manual mode ignores these sliders.",
    temperature: "Temperature",
    temperatureAria: "Ambient temperature",
    light: "Light intensity",
    lightAria: "Light intensity",
  },
  toolbar: {
    title: "Status and tools",
    nothingSelected: "Nothing selected",
    wireSelected: "Wire selected",
    issueSingular: "issue",
    issuePlural: "issues",
    solverReady: "Solver ready",
    selectMode: "Select mode",
    wireMode: "Wire mode",
    wireChooseEnd: "Wire: choose end",
    activeToolDetails: {
      pending:
        "One terminal is selected; choose a second terminal, use the empty canvas to cancel, or press Esc.",
      wire: "Wire tool active. Click any terminal to start a connection, or press W/Esc to leave.",
      select: "Select mode is active. Click parts or wires to inspect, move, rotate, or delete them.",
    },
    history: "History",
    selection: "Selection",
    undo: "Undo",
    redo: "Redo",
    rotateSelected: "Rotate selected",
    deleteSelected: "Delete selected",
    saves: "Saves",
    file: "File",
    downloadSvg: "Download SVG",
    saveLocally: "Save locally",
    updateSaved: "Update saved",
    saveToAccount: "Save to account",
    updateAccountSave: "Update account save",
    downloadJson: "Download JSON",
    loadJson: "Load JSON",
    copyJsonState: "Copy JSON state",
    historyEmpty: "No history yet",
    unsavedNewCircuit: "Unsaved new circuit",
    emptyWorkspace: "Empty workspace",
    diagramExportDisabled:
      "Diagram export stays disabled until the workspace contains at least one component. JSON state export still works for an empty workspace.",
    svgWarning: "SVG export uses the current schematic layout even when the circuit still has warnings.",
    shortcuts: {
      pending:
        "Shortcuts: Esc or empty canvas cancels the current wire, +/- zooms, Ctrl/Cmd+wheel zooms around pointer, F fits, Ctrl/Cmd+Z undoes.",
      wire:
        "Shortcuts: W or Esc leaves the wire tool, +/- zooms, Ctrl/Cmd+wheel zooms around pointer, F fits, 0 resets view.",
      clearArmed:
        "Shortcuts: Esc cancels the clear confirmation, +/- zooms, Ctrl/Cmd+wheel zooms around pointer, F fits, 0 resets view.",
      component:
        "Shortcuts: R rotates the selected part, Arrow keys move it, Shift+arrow jumps farther, Delete removes it, Esc clears it, Ctrl/Cmd+wheel zooms, F fits view.",
      wireSelected:
        "Shortcuts: Delete removes the selected wire, Esc clears it, W starts wiring, +/- zooms, Ctrl/Cmd+wheel zooms, F fits view.",
      idle:
        "Shortcuts: W starts wiring, +/- zooms, Ctrl/Cmd+wheel zooms around pointer, F fits, 0 resets view, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Y redoes.",
    },
    groupAria: {
      history: "History actions",
      selection: "Selection actions",
      file: "File and export actions",
    },
    descriptions: {
      noUndo: "No undo step is available yet. Shortcut: Ctrl or Command plus Z.",
      noRedo:
        "No redo step is available yet. Shortcut: Ctrl or Command plus Y, or Ctrl or Command plus Shift plus Z.",
      rotateSelected: "Rotate the selected component. Shortcut: R.",
      rotateLocked: "Finish or cancel wiring before rotating the selected component. Shortcut: R.",
      rotateMissing: "Select a component before rotating. Shortcut: R.",
      deleteSelected: "Delete the selected component or wire. Shortcut: Delete or Backspace.",
      deleteLocked:
        "Finish or cancel wiring before deleting the selected component or wire. Shortcut: Delete or Backspace.",
      deleteMissing: "Select a component or wire before deleting. Shortcut: Delete or Backspace.",
    },
  },
  saves: {
    panelTitle: "Save and reopen circuits",
    panelSummary:
      "Named local saves live here. Autosave draft recovery stays separate and only protects against accidental loss.",
    intro:
      "Save locally keeps reusable browser-only circuits here. Account saves stay in the account section below, and autosave draft recovery stays reserved for accidental refresh loss.",
    localCount: "local",
    savedCircuitName: "Saved circuit name",
    saveCircuit: "Save circuit",
    cancel: "Cancel",
    emptyLocal:
      "No named saved circuits yet. Use Save locally to keep a reusable circuit here. Autosave drafts stay separate and are only for recovery after accidental loss.",
    current: "Current",
    parts: "parts",
    updated: "Updated",
    savedLocally: "Saved locally",
    open: "Open saved circuit",
    rename: "Rename saved circuit",
    delete: "Delete saved circuit",
    renameSavedCircuit: "Rename saved circuit",
    saveName: "Save name",
    accountTitle: "Account saved circuits",
    accountDescription:
      "Account saves are cross-device named circuits for eligible signed-in users. They stay separate from local browser saves and the autosave recovery draft.",
    accountCount: "account saves",
    accountFeatureTitle: "Account-saved circuits",
    accountFeatureDescription:
      "Account-backed saved circuits reopen your custom builds across devices while local saves and autosave recovery remain available in this browser.",
    accountSaveName: "Account save name",
    loadingAccount: "Loading account-saved circuits...",
    emptyAccount: "No account-saved circuits yet. Use Save to account to keep a cross-device named save here.",
    savedToAccount: "Saved to account",
    renameAccountSave: "Rename account save",
    fileMenuTitle: "File and export actions",
    fileMenuDescription:
      "Use JSON tools for portable save/open while keeping workspace reset beside the canvas controls.",
    fileMenuHelp:
      "JSON export and import preserve the same circuit document used by autosave, saved circuits, and SVG export.",
    localSaves: "Local saves",
    localSavesHelp: "Browser-local named saves. Autosave recovery stays separate.",
    accountSaves: "Account saves",
    accountSavesHelp: "Cross-device saves remain separate from local saves and autosave recovery.",
    noLocalLoaded: "No local named save is currently loaded.",
    noAccountLoaded: "No account-backed save is currently loaded.",
  },
  mobile: {
    paletteTitle: "Add parts",
    paletteSummary: "Open the component library, add parts, or switch to the wire tool before using save and export tools.",
    inspectorTitle: "Inspector",
    inspectorSummary: "Component details, live readouts, warnings, and graph panels move here on smaller screens.",
  },
  solverNotes: {
    title: "Solver notes and model assumptions",
    summary: "This v1 builder prefers an explicit, teachable DC steady-state model over perfect electronics fidelity.",
    cards: [
      "Batteries are ideal voltage sources. Resistors, bulbs, thermistors, LDRs, meters, closed switches, and intact fuses are linear or near-linear elements in the steady-state solve.",
      "Capacitors are treated as open circuits after settling. Diodes use a simplified threshold model, bulbs are resistive loads, and fuses trip instantly once the steady-state current exceeds their rating.",
      "Wires collapse terminals into shared nodes, so branch currents and voltage drops come from the same graph-based circuit solve instead of separate per-widget math.",
      "SVG and JSON export both use the same document model, so future formats can reuse this pipeline without changing the builder state shape.",
    ],
  },
  status: {
    renderModeFallback: "View switched.",
    selectedTerminalFallback: "selected terminal",
  },
  readouts: {
    voltage: "Voltage",
    current: "Current",
    power: "Power",
    setVoltage: "Set voltage",
    sourceCurrent: "Source current",
    sourcePower: "Source power",
    resistance: "Resistance",
    state: "State",
    meterReading: "Meter reading",
    voltageDrop: "Voltage drop",
    probeCurrent: "Probe current",
    capacitance: "Capacitance",
    steadyStateVoltage: "Steady-state voltage",
    steadyStateCurrent: "Steady-state current",
    mode: "Mode",
    ambientTemperature: "Ambient temperature",
    ambientLightIntensity: "Ambient light intensity",
    manualResistance: "Manual resistance",
    effectiveResistance: "Effective resistance",
    rating: "Rating",
    forwardDrop: "Forward drop",
    ratedVoltage: "Rated voltage",
    ratedPower: "Rated power",
    equivalentResistance: "Equivalent resistance",
    unavailable: "Unavailable",
    ambientLinked: "Ambient-linked",
    manual: "Manual",
    closed: "Closed",
    open: "Open",
    blown: "Blown",
    intact: "Intact",
  },
  states: {
    "ideal source": "ideal source",
    closed: "closed",
    open: "open",
    "steady-state open": "steady-state open",
    "forward-biased": "forward-biased",
    blocking: "blocking",
    blown: "blown",
    intact: "intact",
    "measuring current": "measuring current",
    "measuring potential difference": "measuring potential difference",
    active: "active",
  },
  graphs: {
    effectiveResistance: "Effective resistance",
    thermistorResponse: "Thermistor response",
    temperatureAxis: "Temperature (C)",
    resistanceAxis: "Resistance (ohm)",
    thermistorSummary:
      "This simplified thermistor uses an NTC-style curve, so its resistance falls as temperature rises.",
    thermistorAmbientDescription:
      "The current ambient temperature is {value}, so the highlighted operating point follows the page temperature control.",
    thermistorManualDescription:
      "Manual mode keeps the resistance fixed. Turn on ambient-linked mode to drive this curve from the page temperature control.",
    currentOperatingPoint: "Current operating point",
    ldrResponse: "LDR response",
    lightAxis: "Light level (%)",
    ldrSummary:
      "This simplified LDR uses a falling resistance curve so brighter light makes the branch easier to drive.",
    ldrAmbientDescription:
      "The current ambient light intensity is {value}%, so the highlighted operating point follows the page light intensity control.",
    ldrManualDescription:
      "Manual mode keeps the resistance fixed. Turn on ambient-linked mode to drive this curve from the page light intensity control.",
    rcTitle: "Simple RC charging estimate",
    timeAxis: "Time (s)",
    responseAxis: "Response",
    rcSummary:
      "The graph assumes one source and a single equivalent series resistance around the selected capacitor.",
    rcDescription: "Using R_total = {resistance} and C = {capacitance}, tau = {tau}.",
    capacitorVoltage: "Capacitor voltage",
    currentDecay: "Current decay",
  },
  wireTool: {
    label: englishWireTool.label,
    shortLabel: englishWireTool.shortLabel,
    symbolLabel: englishWireTool.symbolLabel,
    summary: englishWireTool.summary,
    behavior: englishWireTool.behavior,
    searchTerms: [],
  },
  components: englishComponents,
};

export const circuitBuilderCopyZhHk: CircuitBuilderCopy = {
  ...circuitBuilderCopyEn,
  locale: "zh-HK",
  hero: {
    eyebrow: "電路建構器",
    title: "建立即時電路，並解釋它正在做甚麼。",
    subtitle: "自由搭建、檢視即時數值，並保持三欄工作台一眼可見。",
  },
  presets: {
    label: "起步",
    items: {
      "starter-series": {
        label: "入門串聯迴路",
        description: "電池、開關、電阻、燈泡和電流錶組成單一路徑。",
      },
      "metered-branch": {
        label: "分支量度電路",
        description: "比較兩個電阻分支的電流和電壓。",
      },
      "rc-explorer": {
        label: "簡易 RC 探索",
        description: "用電池、電阻、開關和電容觀察充電曲線。",
      },
      "thermistor-explorer": {
        label: "熱敏電阻溫度探索",
        description: "環境溫度會改變熱敏電阻的阻值和電流。",
      },
      "ldr-explorer": {
        label: "光敏電阻光度探索",
        description: "光度會改變光敏電阻的阻值和分支電流。",
      },
    },
  },
  draft: {
    ariaLabel: "本機草稿復原",
    title: "有可用的本機草稿",
    savedPrefix: "已儲存於",
    savedSuffix: "可還原草稿、保留目前工作，或丟棄草稿。",
    restore: "還原草稿",
    dismiss: "暫時略過",
    discard: "丟棄已儲存草稿",
  },
  palette: {
    ...circuitBuilderCopyEn.palette,
    ariaLabel: "元件庫",
    eyebrow: "元件庫",
    title: "加入元件",
    intro: "按一下可在目前視圖中心附近加入元件，也可以拖放到工作區。",
    searchLabel: "搜尋元件",
    searchPlaceholder: "搜尋元件",
    searchHelp:
      "可用名稱或用途搜尋：試試 電池、battery、燈泡、bulb、ldr、感測器、保險絲或連接。搜尋時按 Esc 可清除。",
    clearSearch: "清除",
    clearSearchTitle: "清除元件搜尋 (Esc)",
    resultSummary: {
      available: "個工具和元件可用。",
      match: "個結果",
      matches: "個結果",
    },
    emptyTitle: "沒有元件符合此搜尋。",
    emptyHint: "試試「電池」、「battery」、「燈泡」、「bulb」、「ldr」，或清除搜尋以瀏覽完整元件庫。",
    showAll: "顯示所有元件",
    toolBadge: "工具",
    activateWireTool: "啟用導線工具",
    wireToolActiveDescription: "導線工具已啟用。按下可返回選取模式。",
    wireToolInactiveDescription: "切換到導線模式，然後在工作區選兩個端子連接元件。",
    addComponentAriaPrefix: "加入",
    addComponentDescriptionPrefix: "按一下可加入",
    addComponentDescriptionSuffix: "到目前工作區中心附近，或直接拖放到工作區。",
    collapsedAria: "已收合的元件庫",
    collapseAria: "收合元件庫",
    expandAria: "展開元件庫",
    collapsedLabel: "元件",
  },
  renderMode: {
    ariaLabel: "電路顯示模式",
    label: "顯示",
    modes: {
      schematic: "電路圖",
      modern: "現代視覺",
    },
    status: {
      schematic: "已切換至電路圖模式。",
      modern: "已切換至現代視覺模式。",
    },
  },
  workspace: {
    ...circuitBuilderCopyEn.workspace,
    ariaLabel: "電路工作區",
    eyebrow: "工作區",
    guidanceDefault: "拖曳元件、在檢視器旋轉元件，並拖曳空白畫布來平移。",
    emptyTitle: "先加入一個電源和一個負載",
    emptySubtitle: "按元件庫項目把它加入這裏，再用導線工具連接端子。",
    emptyExample: "例子：電池 -> 電阻 -> 回到電池，形成完整迴路。",
    emptyActionLabel: "開啟元件庫",
    modernLegend: "現代視覺：燈泡亮度跟隨功率；e− 點顯示電子流。",
    zoom: "縮放",
    partSingular: "個元件",
    partPlural: "個元件",
    wireSingular: "條導線",
    wirePlural: "條導線",
    pointerDragging: "正在拖曳視圖",
    panEmpty: "拖曳空白位置可平移",
    chooseWireEnd: "選擇導線終點",
    terminalPickMode: "端子選取模式",
    panningCanvas: "正在平移畫布",
    snapGrid: "32 px 對齊格線",
    statusAriaPrefix: "工作區視圖狀態。",
    canvasAriaPrefix: "互動電路工作區。",
    alreadySelectedTerminal: "該端子已被選取。請選另一個端子、按空白畫布，或按 Esc 取消。",
    connectToPrefix: "連接至",
    connectToSuffix: "以完成導線。",
    wiringFromPrefix: "導線起點：",
    wiringFromSuffix: "選擇第二個端子、按空白畫布，或按 Esc 取消。",
    selectSecondTerminal: "選擇第二個端子完成導線，或按空白畫布 / Esc 取消。",
    startWireFromPrefix: "由",
    startWireFromSuffix: "開始導線。",
    wireToolActive: "導線工具已啟用。按端子開始，或按空白畫布 / W / Esc 離開。",
    terminalHoverSuffix: "按一下或按 Enter/Space 可由此端子開始導線。",
    selectedComponentSuffix: "已選取。可拖曳、用方向鍵微調，或在檢視器編輯。",
    selectedWireSuffix: "已選取。需要時可按 Delete 或在檢視器移除。",
    dropPartFallback: "元件",
    dropPrefix: "將",
    dropSuffix: "放到 32 px 對齊格線上",
    fitViewDescriptionEnabled: "將整個電路放入工作區視圖。快捷鍵：F。",
    fitViewDescriptionDisabled: "先加入至少一個元件，才可適合工作區視圖。",
    zoomOutDescriptionEnabled: "從目前置中的工作區視圖縮小。快捷鍵：減號。Ctrl/Cmd 加滾輪會以指標為錨點縮放。",
    zoomOutDescriptionDisabled: "工作區已在最小 45% 縮放。快捷鍵：減號。",
    zoomInDescriptionEnabled: "從目前置中的工作區視圖放大。快捷鍵：加號。Ctrl/Cmd 加滾輪會以指標為錨點縮放。",
    zoomInDescriptionDisabled: "工作區已在最大 240% 縮放。快捷鍵：加號。",
    resetViewDescriptionEnabled: "把工作區重設為預設縮放和平移。快捷鍵：0。",
    resetViewDescriptionDisabled: "工作區已在預設縮放和平移。快捷鍵：0。",
    clearDescriptionArmed: "清空工作區已準備好。確認會移除所有元件和導線；按 Escape 可取消，Undo 可還原。",
    clearDescriptionEnabled: "清除工作區所有元件和導線。第二次按下會確認清除，Undo 可還原。",
    clearDescriptionDisabled: "先加入至少一個元件，才可清空工作區。",
    zoomOut: "縮小 -",
    zoomIn: "放大 +",
    resetView: "重設視圖",
    fitCircuit: "適合電路",
    clearWorkspace: "清空工作區",
    confirmClear: "確認清空",
    zoomOutTitle: "縮小 (快捷鍵：-)",
    zoomInTitle: "放大 (快捷鍵：+)",
    minimumZoomTitle: "已到最小縮放",
    maximumZoomTitle: "已到最大縮放",
    resetViewTitle: "重設工作區視圖 (快捷鍵：0)",
    defaultViewTitle: "已是預設視圖",
    panAnnounced: "工作區已平移。再次拖曳空白畫布可繼續瀏覽。",
    panCancelled: "已取消平移。視圖已回到開始位置。",
    panInterrupted: "平移被中斷。視圖已回到開始位置。",
    zoomAlreadyAtPrefix: "工作區縮放已是",
    zoomStatusPrefix: "工作區縮放",
    zoomStatusSuffix: "Ctrl/Cmd 加滾輪會以指標為錨點。",
    terminalActions: {
      pickAnotherEnd: "選另一端",
      connectHere: "連接這裏",
      startHere: "由此開始",
      enterSpaceToWire: "Enter/Space 接線",
    },
    componentDescriptions: {
      pending: "本體在導線待完成時會鎖定；用端子完成導線，或按 Escape 取消。",
      wireMode: "本體在接線時會鎖定；用端子開始導線，或按 W/Escape 返回選取模式。",
      selected: "已選取。可拖曳、按方向鍵微調、按 R 旋轉，或按 Delete 移除。",
      idle: "按 Enter 或 Space 可選取；可用端子開始接線。",
    },
    terminalDescriptions: {
      pendingSame: "此端子已被選取。請選另一個端子、按空白畫布，或按 Escape 取消導線。",
      pendingOtherPrefix: "將待完成導線連接至",
      wireModePrefix: "由此端子開始導線：",
      idlePrefix: "按 Enter 或 Space 由此端子開始導線：",
    },
    issueNeedsAttention: "需要處理",
    issueWarnings: "警告",
    inspectPrefix: "檢視",
    floating: "浮接",
  },
  connections: {
    ariaLabel: "連接",
    title: "連接",
    help: "如果畫布上的導線難以點選，可在這裏選取；在較小螢幕尤其有用。",
  },
  inspector: {
    ...circuitBuilderCopyEn.inspector,
    ariaLabel: "電路檢視器",
    eyebrow: "檢視器",
    componentEyebrow: "元件檢視器",
    wireEyebrow: "導線檢視器",
    emptyTitle: "選取元件以檢視",
    emptyDescription: "檢視器會說明每個符號的意思、可編輯屬性，以及元件在目前電路中的行為。",
    emptySteps: [
      "1. 加入一個電源和一個負載。",
      "2. 用導線工具連接端子。",
      "3. 選取元件以編輯和查看即時讀數。",
    ],
    cleanCircuit: "目前電路可正常求解。選取元件即可查看局部說明和計算值。",
    selectedConnection: "已選連接",
    missingWire: "已選導線不再存在。",
    sharedNodeVoltage: "共用節點電壓",
    model: "模型",
    idealConnection: "理想連接",
    wireModelDescription: "電壓降視為可忽略，且不逐條導線追蹤電流。",
    wireDetails: "導線詳情",
    whatWireDoes: "導線的作用",
    wireDoesDescription: "在此建構器中，導線是理想導體，會把兩端合併成同一個電氣節點。",
    whatToNotice: "值得留意",
    wireNotice: "移除此導線可能把一個共用節點分成不同節點，並即時造成開路或改變分支電流。",
    currentCircuitContext: "目前電路情境",
    nodeAttachedTerminalSingular: "個連接端子",
    nodeAttachedTerminalPlural: "個連接端子",
    nodeSourceConnected: "位於有效電源路徑上。",
    nodeSourceDisconnected: "未連接到有效電源路徑。",
    connectionLockedTitle: "接線時會鎖定連接編輯",
    connectionLockedPending: "請先完成或取消這條未完成導線，才刪除已選連接。",
    connectionLockedTool: "請先離開導線工具，才刪除已選連接。",
    cancelWire: "取消導線",
    deleteWire: "刪除導線",
    deleteSelectedWireAria: "刪除已選導線",
    deleteWireLockedTitle: "完成或取消接線後才可刪除此導線。",
    wireToolActiveTitle: "導線工具已啟用",
    wireToolPendingDescription: "已有一個端子被選取。按第二個端子完成導線，或取消目前導線。",
    wireToolDescription: "按任一端子開始導線，再按第二個端子完成連接。",
    warningsAndErrors: "警告和錯誤",
    componentWarnings: "元件警告",
    editableProperties: "可編輯屬性",
    placement: "位置",
    computedValues: "計算值",
    rotate: "旋轉",
    delete: "刪除",
    rotateLockedTitle: "完成或取消接線後才可旋轉此元件。",
    deleteLockedTitle: "完成或取消接線後才可刪除此元件。",
    editLocked: "請先完成或取消接線，才編輯、移動、旋轉或刪除此已選元件。",
    positionX: "位置 X",
    positionY: "位置 Y",
    nudgeLeft: "向左微調",
    nudgeRight: "向右微調",
    nudgeUp: "向上微調",
    nudgeDown: "向下微調",
    resetFuse: "重設保險絲",
    detailsSummary: "符號、模型和情境",
    symbolMeaning: "符號意思",
    modelAndBehavior: "模型和行為",
    context: "目前電路情境",
    notice: "值得留意",
    floating: "浮接",
  },
  environment: {
    title: "環境",
    description: "連動環境的熱敏電阻會跟隨溫度，連動環境的光敏電阻會跟隨光度。手動模式會忽略這些滑桿。",
    temperature: "溫度",
    temperatureAria: "環境溫度",
    light: "光度",
    lightAria: "光度",
  },
  toolbar: {
    ...circuitBuilderCopyEn.toolbar,
    title: "狀態和工具",
    nothingSelected: "未選取任何項目",
    wireSelected: "已選取導線",
    issueSingular: "項問題",
    issuePlural: "項問題",
    solverReady: "求解器就緒",
    selectMode: "選取模式",
    wireMode: "導線模式",
    wireChooseEnd: "導線：選擇終點",
    activeToolDetails: {
      pending: "已選一個端子；請選第二個端子、按空白畫布取消，或按 Esc。",
      wire: "導線模式已啟用。按任一端子開始連接，或按 W/Esc 離開。",
      select: "選取模式已啟用。按元件或導線即可檢視、移動、旋轉或刪除。",
    },
    history: "歷史",
    selection: "選取",
    undo: "復原",
    redo: "重做",
    rotateSelected: "旋轉已選",
    deleteSelected: "刪除已選",
    saves: "儲存",
    file: "檔案",
    downloadSvg: "下載 SVG",
    saveLocally: "本機儲存",
    updateSaved: "更新已儲存",
    saveToAccount: "儲存到帳戶",
    updateAccountSave: "更新帳戶儲存",
    downloadJson: "下載 JSON",
    loadJson: "載入 JSON",
    copyJsonState: "複製 JSON 狀態",
    historyEmpty: "尚未有歷史",
    unsavedNewCircuit: "未儲存的新電路",
    emptyWorkspace: "空白工作區",
    diagramExportDisabled: "工作區至少有一個元件後才可匯出圖像。空白工作區仍可匯出 JSON 狀態。",
    svgWarning: "即使電路仍有警告，SVG 匯出仍使用目前電路圖佈局。",
    shortcuts: {
      pending: "快捷鍵：Esc 或空白畫布取消目前導線，+/- 縮放，Ctrl/Cmd+滾輪以指標為錨點縮放，F 適合，Ctrl/Cmd+Z 復原。",
      wire: "快捷鍵：W 或 Esc 離開導線工具，+/- 縮放，Ctrl/Cmd+滾輪以指標為錨點縮放，F 適合，0 重設視圖。",
      clearArmed: "快捷鍵：Esc 取消清空確認，+/- 縮放，Ctrl/Cmd+滾輪以指標為錨點縮放，F 適合，0 重設視圖。",
      component:
        "快捷鍵：R 旋轉已選元件，方向鍵移動，Shift+方向鍵大步移動，Delete 移除，Esc 清除選取，Ctrl/Cmd+滾輪縮放，F 適合視圖。",
      wireSelected: "快捷鍵：Delete 移除已選導線，Esc 清除選取，W 開始接線，+/- 縮放，Ctrl/Cmd+滾輪縮放，F 適合視圖。",
      idle: "快捷鍵：W 開始接線，+/- 縮放，Ctrl/Cmd+滾輪以指標為錨點縮放，F 適合，0 重設視圖，Ctrl/Cmd+Z 復原，Ctrl/Cmd+Y 重做。",
    },
    groupAria: {
      history: "歷史操作",
      selection: "選取操作",
      file: "檔案和匯出操作",
    },
    descriptions: {
      noUndo: "目前沒有可復原步驟。快捷鍵：Ctrl 或 Command 加 Z。",
      noRedo: "目前沒有可重做步驟。快捷鍵：Ctrl 或 Command 加 Y，或 Ctrl 或 Command 加 Shift 加 Z。",
      rotateSelected: "旋轉已選元件。快捷鍵：R。",
      rotateLocked: "完成或取消接線後才可旋轉已選元件。快捷鍵：R。",
      rotateMissing: "先選取元件才可旋轉。快捷鍵：R。",
      deleteSelected: "刪除已選元件或導線。快捷鍵：Delete 或 Backspace。",
      deleteLocked: "完成或取消接線後才可刪除已選元件或導線。快捷鍵：Delete 或 Backspace。",
      deleteMissing: "先選取元件或導線才可刪除。快捷鍵：Delete 或 Backspace。",
    },
  },
  saves: {
    ...circuitBuilderCopyEn.saves,
    panelTitle: "已儲存電路",
    panelSummary: "命名的本機儲存會放在這裏。自動儲存草稿復原是獨立機制，只用於防止意外遺失。",
    intro:
      "本機儲存會把可重用的瀏覽器內電路保存在這裏。帳戶儲存位於下方帳戶區，自動儲存草稿只用於意外重新整理後復原。",
    localCount: "個本機儲存",
    savedCircuitName: "已儲存電路名稱",
    saveCircuit: "儲存電路",
    cancel: "取消",
    emptyLocal: "尚未有命名電路。使用「本機儲存」把可重用電路保存在這裏。自動儲存草稿是獨立機制，只用於意外遺失後復原。",
    current: "目前",
    parts: "個元件",
    updated: "已更新",
    savedLocally: "已本機儲存",
    open: "開啟",
    rename: "重新命名",
    delete: "刪除",
    renameSavedCircuit: "重新命名已儲存電路",
    saveName: "儲存名稱",
    accountTitle: "帳戶已儲存電路",
    accountDescription: "帳戶儲存是供合資格登入使用者跨裝置使用的命名電路，並會與本機瀏覽器儲存和自動復原草稿分開。",
    accountCount: "個帳戶儲存",
    accountFeatureTitle: "帳戶已儲存電路",
    accountFeatureDescription: "帳戶儲存可跨裝置重新開啟你的自訂電路；本機儲存和自動復原草稿仍會在此瀏覽器可用。",
    accountSaveName: "帳戶儲存名稱",
    loadingAccount: "正在載入帳戶已儲存電路...",
    emptyAccount: "尚未有帳戶已儲存電路。使用「儲存到帳戶」把跨裝置命名儲存放在這裏。",
    savedToAccount: "已儲存到帳戶",
    renameAccountSave: "重新命名帳戶儲存",
    fileMenuTitle: "檔案和匯出操作",
    fileMenuDescription: "使用 JSON 工具作可攜式儲存/開啟；工作區重設仍保留在畫布控制旁。",
    fileMenuHelp: "JSON 匯出和匯入會保留與自動儲存、已儲存電路和 SVG 匯出相同的電路文件。",
    localSaves: "本機儲存",
    localSavesHelp: "瀏覽器本機命名儲存。自動復原草稿是獨立機制。",
    accountSaves: "帳戶儲存",
    accountSavesHelp: "跨裝置儲存會與本機儲存和自動復原草稿分開。",
    noLocalLoaded: "目前未載入本機命名儲存。",
    noAccountLoaded: "目前未載入帳戶儲存。",
  },
  mobile: {
    paletteTitle: "加入元件",
    paletteSummary: "先開啟元件庫、加入元件或切換到導線工具，再使用儲存和匯出工具。",
    inspectorTitle: "檢視器",
    inspectorSummary: "元件詳情、即時讀數、警告和圖表面板會在較小螢幕移到這裏。",
  },
  solverNotes: {
    title: "求解器備註和模型假設",
    summary: "此 v1 建構器採用明確、可教學的直流穩態模型，而不是追求完美電子學精度。",
    cards: [
      "電池是理想電壓源。電阻、燈泡、熱敏電阻、光敏電阻、量度錶、閉合開關和完好的保險絲，在穩態求解中屬線性或近似線性元件。",
      "電容在穩定後視為開路。二極管使用簡化閾值模型，燈泡視為電阻負載，保險絲會在穩態電流超過額定值時即時跳開。",
      "導線會把端子合併成共用節點，因此分支電流和電壓降來自同一個圖形電路求解，而不是每個元件各自計算。",
      "SVG 和 JSON 匯出都使用同一份文件模型，因此未來格式可重用這條管線，而不需改變建構器狀態形狀。",
    ],
  },
  status: {
    renderModeFallback: "顯示模式已切換。",
    selectedTerminalFallback: "已選端子",
  },
  readouts: {
    ...circuitBuilderCopyEn.readouts,
    voltage: "電壓",
    current: "電流",
    power: "功率",
    setVoltage: "設定電壓",
    sourceCurrent: "電源電流",
    sourcePower: "電源功率",
    resistance: "電阻",
    state: "狀態",
    meterReading: "量度讀數",
    voltageDrop: "電壓降",
    probeCurrent: "探針電流",
    capacitance: "電容值",
    steadyStateVoltage: "穩態電壓",
    steadyStateCurrent: "穩態電流",
    mode: "模式",
    ambientTemperature: "環境溫度",
    ambientLightIntensity: "環境光度",
    manualResistance: "手動電阻",
    effectiveResistance: "有效電阻",
    rating: "額定值",
    forwardDrop: "順向壓降",
    ratedVoltage: "額定電壓",
    ratedPower: "額定功率",
    equivalentResistance: "等效電阻",
    unavailable: "不可用",
    ambientLinked: "連動環境",
    manual: "手動",
    closed: "閉合",
    open: "開路",
    blown: "已熔斷",
    intact: "完好",
  },
  states: {
    "ideal source": "理想電源",
    closed: "閉合",
    open: "開路",
    "steady-state open": "穩態開路",
    "forward-biased": "順向偏壓",
    blocking: "阻擋",
    blown: "已熔斷",
    intact: "完好",
    "measuring current": "量度電流",
    "measuring potential difference": "量度電位差",
    active: "啟用",
  },
  graphs: {
    effectiveResistance: "有效電阻",
    thermistorResponse: "熱敏電阻響應",
    temperatureAxis: "溫度 (C)",
    resistanceAxis: "電阻 (ohm)",
    thermistorSummary: "此簡化熱敏電阻使用 NTC 風格曲線，因此溫度上升時阻值下降。",
    thermistorAmbientDescription: "目前環境溫度為 {value}，因此標示的工作點會跟隨頁面溫度控制。",
    thermistorManualDescription: "手動模式會固定電阻。開啟連動環境模式即可由頁面溫度控制驅動此曲線。",
    currentOperatingPoint: "目前工作點",
    ldrResponse: "光敏電阻響應",
    lightAxis: "光度 (%)",
    ldrSummary: "此簡化光敏電阻使用下降阻值曲線，因此光越強，分支越容易導通。",
    ldrAmbientDescription: "目前環境光度為 {value}%，因此標示的工作點會跟隨頁面光度控制。",
    ldrManualDescription: "手動模式會固定電阻。開啟連動環境模式即可由頁面光度控制驅動此曲線。",
    rcTitle: "簡易 RC 充電估算",
    timeAxis: "時間 (s)",
    responseAxis: "響應",
    rcSummary: "此圖假設所選電容周圍只有一個電源和單一等效串聯電阻。",
    rcDescription: "使用 R_total = {resistance}、C = {capacitance}，tau = {tau}。",
    capacitorVoltage: "電容電壓",
    currentDecay: "電流衰減",
  },
  wireTool: {
    label: "導線工具",
    shortLabel: "導線",
    symbolLabel: "導線符號",
    summary: "連接兩個端子，並把它們合併成同一個電氣節點。",
    behavior: "使用導線工具開始連接，再在工作區按兩個端子。",
    searchTerms: ["導線", "導線工具", "連接", "接線", "線"],
  },
  components: {
    ammeter: {
      label: "電流錶",
      shortLabel: "A",
      symbolLabel: "電流錶符號",
      summary: "量度所在分支流過的電流。",
      symbolMeaning: "圓圈中的 A 代表直接串入路徑的電流錶。",
      behavior: "在此建構器中，電流錶使用很小的內阻，因此可回報分支電流而不主導電路。",
      notice: "把電流錶讀數與附近串聯元件比較；同一分支中的讀數應該接近。",
      simplification: "建模為近似零電阻的串聯電流錶，以保持求解穩定。",
      terminalLabels: { a: "入口端子", b: "出口端子" },
      searchTerms: ["電流錶", "安培計", "電流", "ammeter", "current meter"],
      fields: {},
    },
    battery: {
      label: "電池",
      shortLabel: "V",
      symbolLabel: "電池符號",
      summary: "在兩個端子之間提供固定直流電壓差。",
      symbolMeaning: "長短板表示電源的正極和負極端子。",
      behavior: "理想電源會維持電壓；電路其他部分改變時，分支電流會隨之調整。",
      notice: "觀察改變電源電壓如何按比例影響電流、功率和各量度錶讀數。",
      simplification: "建模為理想直流電壓源。",
      terminalLabels: { a: "正極端子", b: "負極端子" },
      searchTerms: ["電池", "電源", "電壓源", "battery", "cell", "source"],
      fields: {
        voltage: {
          label: "電壓",
          help: "正極和負極端子之間的理想電源電壓。",
        },
      },
    },
    capacitor: {
      label: "電容",
      shortLabel: "C",
      symbolLabel: "電容符號",
      summary: "儲存電荷，並在兩塊板之間建立電壓差。",
      symbolMeaning: "兩條平行板表示電荷聚集在分隔的導體上。",
      behavior: "在此 v1 直流求解器中，電容穩定後像開路；檢視器仍可在簡單周邊電路中顯示 RC 充電曲線。",
      notice: "穩態電流會降至零，但電容仍可保持電壓差。",
      simplification: "在直流穩態中建模為開路；RC 圖表支援限於簡單單電源情境。",
      terminalLabels: { a: "板 A", b: "板 B" },
      searchTerms: ["電容", "電容器", "capacitor", "capacitance"],
      fields: {
        capacitance: {
          label: "電容值",
          help: "有簡單 RC 響應圖時使用的電容值。",
        },
      },
    },
    diode: {
      label: "二極管",
      shortLabel: "D",
      symbolLabel: "二極管符號",
      summary: "偏好一個方向的電流，並阻擋相反方向。",
      symbolMeaning: "三角和直線標記顯示偏好的電流方向和阻擋側。",
      behavior: "求解器會以固定閾值壓降，在開路和順向導通狀態之間切換二極管。",
      notice: "反轉極性或旋轉二極管時，分支可能完全停止導通。",
      simplification: "使用分段線性閾值模型，而非完整非線性二極管方程。",
      terminalLabels: { a: "陽極", b: "陰極" },
      searchTerms: ["二極管", "整流", "順向偏壓", "逆向偏壓", "diode"],
      fields: {
        forwardDrop: {
          label: "順向壓降",
          help: "二極管順向導通時約略損失的電壓。",
        },
      },
    },
    fuse: {
      label: "保險絲",
      shortLabel: "F",
      symbolLabel: "保險絲符號",
      summary: "當電流高於額定值時打開分支，保護電路。",
      symbolMeaning: "小型保險絲本體表示分支中的犧牲式保護元件。",
      behavior: "分支電流超過額定值時，保險絲會標記為已熔斷，並打開分支直到重設。",
      notice: "高電流故障可能在一次求解看似正常，下一次重新計算時才熔斷保險絲。",
      simplification: "穩態電流一旦超過額定電流就即時跳開。",
      terminalLabels: { a: "入口端子", b: "出口端子" },
      searchTerms: ["保險絲", "過流", "保護", "fuse"],
      fields: {
        rating: {
          label: "電流額定值",
          help: "高於此值的穩態電流會令保險絲熔斷。",
        },
      },
    },
    ldr: {
      label: "光敏電阻",
      shortLabel: "LDR",
      symbolLabel: "光敏電阻符號",
      summary: "阻值會隨光度改變。",
      symbolMeaning: "帶有入射箭咀的電阻表示阻值取決於照射光線。",
      behavior: "光越強，有效電阻越低，分支電流通常會增加。",
      notice: "在檢視器追蹤推導阻值，並比較分支電流如何隨光度改變。",
      simplification: "建模為由簡化光度曲線驅動的可變電阻。",
      terminalLabels: { a: "端子 A", b: "端子 B" },
      searchTerms: ["光敏電阻", "光感測器", "光度", "ldr", "photoresistor", "light sensor"],
      fields: {
        useAmbientLight: {
          label: "連動環境",
          help: "使用頁面光度控制來驅動簡化 LDR 曲線。",
        },
        baseResistance: {
          label: "參考暗阻值",
          help: "頁面光度接近零時使用的參考阻值。",
        },
        manualResistance: {
          label: "手動電阻",
          help: "關閉連動環境模式時使用的固定阻值。",
        },
      },
    },
    lightBulb: {
      label: "燈泡",
      shortLabel: "燈",
      symbolLabel: "燈泡符號",
      summary: "把電功率轉化為光和熱。",
      symbolMeaning: "帶有燈絲的圓圈表示電路中的可見負載。",
      behavior: "此處燈泡會根據額定電壓和功率推導為電阻負載。",
      notice: "把電功率與額定功率比較，可估計燈泡亮度。",
      simplification: "真實燈泡是非線性的；v1 以額定值把它視為電阻負載。",
      terminalLabels: { a: "端子 A", b: "端子 B" },
      searchTerms: ["燈泡", "燈", "bulb", "lamp", "light"],
      fields: {
        ratedVoltage: {
          label: "額定電壓",
          help: "與額定功率一起用來推導燈泡的等效電阻。",
        },
        ratedPower: {
          label: "額定功率",
          help: "在相同額定電壓下，較高額定功率會降低燈泡等效電阻。",
        },
      },
    },
    resistor: {
      label: "電阻",
      shortLabel: "R",
      symbolLabel: "電阻符號",
      summary: "限制電流，並以可控方式產生電壓降。",
      symbolMeaning: "鋸齒或方塊符號表示主要作用是電阻的元件。",
      behavior: "有電流時，電阻會產生電壓降並以熱形式耗散功率。",
      notice: "有效分支中電阻越高，通常電流越小，並承受較大比例的電壓降。",
      simplification: "建模為理想線性電阻。",
      terminalLabels: { a: "端子 A", b: "端子 B" },
      searchTerms: ["電阻", "阻值", "resistor", "resistance", "ohm"],
      fields: {
        resistance: {
          label: "電阻",
          help: "直流求解器直接使用的阻值。",
        },
      },
    },
    switch: {
      label: "開關",
      shortLabel: "S",
      symbolLabel: "開關符號",
      summary: "讓你刻意打開或閉合路徑。",
      symbolMeaning: "線路中的缺口表示可閉合或保持開路的路徑。",
      behavior: "閉合開關近似很小電阻；開路開關會斷開分支。",
      notice: "開關打開時，分支電流應降至零，下游電壓模式也可能改變。",
      simplification: "閉合開關使用很小電阻，開路開關視為開路。",
      terminalLabels: { a: "輸入端子", b: "輸出端子" },
      searchTerms: ["開關", "打開", "閉合", "切換", "switch", "open", "closed"],
      fields: {
        closed: {
          label: "閉合",
          help: "閉合會連接分支；打開會斷開分支。",
        },
      },
    },
    thermistor: {
      label: "熱敏電阻",
      shortLabel: "TH",
      symbolLabel: "熱敏電阻符號",
      summary: "阻值會隨溫度改變。",
      symbolMeaning: "被溫度標記穿過的電阻表示阻值取決於熱力。",
      behavior: "此 v1 模型是 NTC 熱敏電阻，因此溫度越高，有效阻值越低。",
      notice: "升高溫度通常會降低分支阻值，並提高有效路徑中的電流。",
      simplification: "建模為由簡化 NTC 溫度曲線驅動的可變電阻。",
      terminalLabels: { a: "端子 A", b: "端子 B" },
      searchTerms: ["熱敏電阻", "溫度感測器", "thermistor", "ntc", "ptc"],
      fields: {
        useAmbientTemperature: {
          label: "連動環境",
          help: "使用頁面溫度控制來驅動 NTC 阻值曲線。",
        },
        baseResistance: {
          label: "參考電阻",
          help: "簡化環境曲線在 25 C 時的參考阻值。",
        },
        manualResistance: {
          label: "手動電阻",
          help: "關閉連動環境模式時使用的固定阻值。",
        },
      },
    },
    voltmeter: {
      label: "電壓錶",
      shortLabel: "V",
      symbolLabel: "電壓錶符號",
      summary: "量度兩個節點之間的電位差。",
      symbolMeaning: "圓圈中的 V 表示跨接在一對節點或元件上的電壓錶。",
      behavior: "電壓錶使用很大的內阻，因此能取樣電壓而只吸取極少電流。",
      notice: "把它放在元件或分支兩端，以比較兩側節點電位。",
      simplification: "建模為很高電阻的量度錶，而非理想無限電阻探針。",
      terminalLabels: { a: "正探針", b: "負探針" },
      searchTerms: ["電壓錶", "伏特計", "電壓", "voltmeter", "voltage meter"],
      fields: {},
    },
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getCircuitBuilderCopy(locale: AppLocale): CircuitBuilderCopy {
  return locale === "zh-HK" ? circuitBuilderCopyZhHk : circuitBuilderCopyEn;
}

export function getLocalizedCircuitPaletteEntries(
  copy: CircuitBuilderCopy,
): CircuitPaletteEntry[] {
  return circuitPaletteEntries.map((entry) => {
    const itemCopy =
      entry.type === "wire" ? copy.wireTool : copy.components[entry.type];

    return {
      ...entry,
      label: itemCopy.label,
      shortLabel: itemCopy.shortLabel,
      symbolLabel: itemCopy.symbolLabel,
      summary: itemCopy.summary,
      behavior: itemCopy.behavior,
      searchTerms: Array.from(
        new Set([
          ...entry.searchTerms,
          itemCopy.label,
          itemCopy.shortLabel,
          itemCopy.summary,
          ...itemCopy.searchTerms,
        ]),
      ),
    };
  });
}

export function formatCircuitComponentDisplayLabel(
  component: CircuitComponentInstance,
  copy: CircuitBuilderCopy,
) {
  if (copy.locale === "en") {
    return component.label;
  }

  const definition = getCircuitComponentDefinition(component.type);
  const generatedPattern = new RegExp(`^${escapeRegExp(definition.label)}\\s+(\\d+)$`);
  const match = component.label.match(generatedPattern);

  if (!match) {
    return component.label;
  }

  return `${copy.components[component.type].label} ${match[1]}`;
}

export function formatCircuitTerminalDisplayLabel(
  document: CircuitDocument,
  ref: CircuitTerminalRef,
  copy: CircuitBuilderCopy,
) {
  const component = document.components.find((entry) => entry.id === ref.componentId);
  if (!component) {
    return `${ref.componentId} ${ref.terminal}`;
  }

  return `${formatCircuitComponentDisplayLabel(component, copy)} ${
    copy.components[component.type].terminalLabels[ref.terminal]
  }`;
}

export function formatCircuitWireDisplayLabel(
  document: CircuitDocument,
  wire: Pick<CircuitWire, "from" | "to">,
  copy: CircuitBuilderCopy,
) {
  const from = formatCircuitTerminalDisplayLabel(document, wire.from, copy);
  const to = formatCircuitTerminalDisplayLabel(document, wire.to, copy);

  return copy.locale === "zh-HK"
    ? `連接「${from}」至「${to}」的導線`
    : `Wire linking ${from} to ${to}`;
}

export function getLocalizedCircuitInspectorFields(
  component: CircuitComponentInstance,
  copy: CircuitBuilderCopy,
): CircuitEditableField[] {
  const fields = getCircuitInspectorFields(component);
  const componentCopy = copy.components[component.type];

  return fields.map((field) => {
    const fieldCopy = componentCopy.fields[field.key];
    if (!fieldCopy) {
      return field;
    }

    return {
      ...field,
      label: fieldCopy.label,
      help: fieldCopy.help ?? field.help,
    };
  });
}

export function formatCircuitStateLabel(
  stateLabel: string | null | undefined,
  copy: CircuitBuilderCopy,
) {
  if (!stateLabel) {
    return stateLabel ?? "";
  }

  return copy.states[stateLabel] ?? stateLabel;
}

export function formatCircuitIssue(
  issue: CircuitIssue,
  document: CircuitDocument,
  copy: CircuitBuilderCopy,
): CircuitIssue {
  if (copy.locale === "en") {
    return issue;
  }

  const component = issue.componentId
    ? document.components.find((entry) => entry.id === issue.componentId) ?? null
    : null;
  const componentLabel = component
    ? formatCircuitComponentDisplayLabel(component, copy)
    : null;

  switch (issue.code) {
    case "solver-failure":
      return {
        ...issue,
        title: "此電路狀態未能乾淨求解。",
        detail: "請移除互相衝突的理想電源，或重新連接分支圖。",
      };
    case "unconnected-terminal": {
      const terminal = issue.id.endsWith("-a-unconnected")
        ? "a"
        : issue.id.endsWith("-b-unconnected")
          ? "b"
          : null;
      const terminalLabel = component && terminal
        ? copy.components[component.type].terminalLabels[terminal]
        : "端子";
      return {
        ...issue,
        title: componentLabel
          ? `${componentLabel} 有未連接的${terminalLabel}。`
          : "有未連接端子。",
        detail: "此端子未接入電路，因此元件可能浮接或未啟用。",
      };
    }
    case "short-source":
      if (issue.id.endsWith("-high-current")) {
        return {
          ...issue,
          title: componentLabel
            ? `${componentLabel} 正在輸出極高電流。`
            : "電源正在輸出極高電流。",
          detail: "這通常代表電源接近短路，或迴路中只剩極小電阻。",
        };
      }
      return {
        ...issue,
        title: componentLabel
          ? `${componentLabel} 被直接短接到同一節點。`
          : "電源被直接短接到同一節點。",
        detail: "正極和負極端子被導線合併，這是不支援的理想短路。",
      };
    case "floating-component":
      return {
        ...issue,
        title: componentLabel
          ? `${componentLabel} 未連接到有效電源。`
          : "元件未連接到有效電源。",
        detail: "此元件所在網絡沒有有效電池路徑，因此讀數會保持零或未定義。",
      };
    case "undefined-reading":
      return {
        ...issue,
        title: componentLabel
          ? `${componentLabel} 跨越未連通的電氣群組。`
          : "元件跨越未連通的電氣群組。",
        detail: "由於分支浮接，求解器無法可靠比較兩端電壓。",
      };
    case "open-circuit":
      return {
        ...issue,
        title: componentLabel ? `${componentLabel} 是開路。` : "分支是開路。",
        detail: "此分支被刻意斷開，所以下游電流應降至零。",
      };
    case "fuse-blown":
      return {
        ...issue,
        title: componentLabel ? `${componentLabel} 已熔斷。` : "保險絲已熔斷。",
        detail: "移除過載條件後，重設或更換保險絲以再次閉合分支。",
      };
    case "unsupported-state":
      return {
        ...issue,
        title: componentLabel ? `${componentLabel} 狀態暫不支援。` : "此狀態暫不支援。",
        detail: "請調整連接或元件設定，再重新檢查電路。",
      };
    default:
      return issue;
  }
}
