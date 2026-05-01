"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { formatMeasurement } from "@/lib/physics/math";
import { useSvgPointerDrag } from "@/components/simulations/primitives/useSvgPointerDrag";
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  buildWirePathData,
  buildWirePathFromRefs,
  buildWirePreviewPoints,
  clampComponentPoint,
  convertViewPointToWorld,
  getCircuitComponentById,
  getCircuitComponentDefinition,
  getCircuitWireDisplayLabel,
  getComponentTerminalDirection,
  getComponentTerminalPoint,
  snapPointToGrid,
  type CircuitComponentType,
  type CircuitDocument,
  type CircuitPoint,
  type CircuitSolveResult,
  type CircuitTerminalRef,
} from "@/lib/circuit-builder";
import { CircuitSymbol } from "./CircuitSymbol";

const draggableComponentTypes = new Set<CircuitComponentType>([
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
]);
const minimumWorkspaceZoom = 0.45;
const maximumWorkspaceZoom = 2.4;

function isDraggableComponentType(value: string): value is CircuitComponentType {
  return draggableComponentTypes.has(value as CircuitComponentType);
}

type CircuitWorkspaceProps = {
  document: CircuitDocument;
  solveResult: CircuitSolveResult;
  selection: { kind: "component" | "wire"; id: string } | null;
  activeTool: "select" | "wire";
  pendingWireStart: CircuitTerminalRef | null;
  onSelectComponent: (componentId: string | null) => void;
  onSelectWire: (wireId: string | null) => void;
  onClearSelection: () => void;
  onSetTool: (tool: "select" | "wire") => void;
  onStartWire: (ref: CircuitTerminalRef) => void;
  onCompleteWire: (ref: CircuitTerminalRef) => void;
  onCancelWire: () => void;
  onBeginMoveComponent: (componentId: string) => void;
  onCommitMoveComponent: () => void;
  onMoveComponent: (componentId: string, point: CircuitPoint) => void;
  onUpdateView: (view: CircuitDocument["view"]) => void;
  onAnnounceViewChange: (message: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  canResetView: boolean;
  onFitView: () => void;
  onDropComponent: (type: CircuitComponentType, point: CircuitPoint) => void;
  onClearWorkspace: () => void;
  canClearWorkspace: boolean;
  clearWorkspaceArmed: boolean;
  canFitView: boolean;
  regionRef?: RefObject<HTMLElement | null>;
  className?: string;
  headerSlot?: ReactNode;
};

type DragTarget = {
  componentId: string;
  offsetX: number;
  offsetY: number;
};

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  hasMoved: boolean;
};

type WorkspaceDragPreview = CircuitComponentType | "unknown";

const nodePalette = ["#178c91", "#f0ab3c", "#4ea6df", "#f16659", "#315063", "#106f73"];

function isSameTerminal(a: CircuitTerminalRef | null, b: CircuitTerminalRef | null) {
  return Boolean(
    a &&
      b &&
      a.componentId === b.componentId &&
      a.terminal === b.terminal,
  );
}

function isPrimaryPointerButton(event: ReactPointerEvent) {
  return event.button === 0;
}

function isPrimaryMouseButton(event: ReactMouseEvent) {
  return event.button === 0;
}

function hasCircuitPartDragPayload(event: ReactDragEvent) {
  return Array.from(event.dataTransfer.types).includes(
    "application/open-model-lab-circuit-part",
  );
}

function getWorkspaceDragPreview(event: ReactDragEvent): WorkspaceDragPreview | null {
  if (!hasCircuitPartDragPayload(event)) {
    return null;
  }

  if (typeof event.dataTransfer.getData !== "function") {
    return "unknown";
  }

  const componentType = event.dataTransfer.getData(
    "application/open-model-lab-circuit-part",
  );

  if (!componentType) {
    return "unknown";
  }

  return isDraggableComponentType(componentType) ? componentType : null;
}

function convertClientDeltaToCanvasDelta(
  deltaX: number,
  deltaY: number,
  bounds: DOMRect,
) {
  return {
    x: deltaX * (bounds.width > 0 ? CIRCUIT_CANVAS_WIDTH / bounds.width : 1),
    y: deltaY * (bounds.height > 0 ? CIRCUIT_CANVAS_HEIGHT / bounds.height : 1),
  };
}

function chip(
  x: number,
  y: number,
  label: string,
  tone: "ink" | "teal" | "amber" | "sky" = "ink",
) {
  const palette = {
    amber: {
      fill: "rgba(240,171,60,0.14)",
      stroke: "rgba(184,112,0,0.28)",
      text: "#8e5800",
    },
    ink: {
      fill: "rgba(255,255,255,0.92)",
      stroke: "rgba(15,28,36,0.16)",
      text: "#0f1c24",
    },
    sky: {
      fill: "rgba(78,166,223,0.12)",
      stroke: "rgba(29,111,159,0.26)",
      text: "#1d6f9f",
    },
    teal: {
      fill: "rgba(23,140,145,0.12)",
      stroke: "rgba(16,111,115,0.28)",
      text: "#106f73",
    },
  }[tone];
  const width = Math.max(48, label.length * 6.9 + 18);

  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect
        x={-width / 2}
        y={-11}
        width={width}
        height="22"
        rx="11"
        fill={palette.fill}
        stroke={palette.stroke}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        className="fill-current text-[10px] font-semibold"
        style={{ color: palette.text }}
      >
        {label}
      </text>
    </g>
  );
}

export function CircuitWorkspace({
  document,
  solveResult,
  selection,
  activeTool,
  pendingWireStart,
  onSelectComponent,
  onSelectWire,
  onClearSelection,
  onSetTool,
  onStartWire,
  onCompleteWire,
  onCancelWire,
  onBeginMoveComponent,
  onCommitMoveComponent,
  onMoveComponent,
  onUpdateView,
  onAnnounceViewChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  canResetView,
  onFitView,
  onDropComponent,
  onClearWorkspace,
  canClearWorkspace,
  clearWorkspaceArmed,
  canFitView,
  regionRef,
  className = "",
  headerSlot = null,
}: CircuitWorkspaceProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [activeTerminalRef, setActiveTerminalRef] = useState<CircuitTerminalRef | null>(null);
  const [pointerWorld, setPointerWorld] = useState<CircuitPoint | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [workspaceDragPreview, setWorkspaceDragPreview] = useState<WorkspaceDragPreview | null>(null);
  const drag = useSvgPointerDrag<DragTarget>({
    svgRef,
    width: CIRCUIT_CANVAS_WIDTH,
    height: CIRCUIT_CANVAS_HEIGHT,
    onDrag: (target, location) => {
      const world = convertViewPointToWorld(
        { x: location.svgX, y: location.svgY },
        document.view,
      );
      onMoveComponent(
        target.componentId,
        snapPointToGrid(
          clampComponentPoint({
            x: world.x - target.offsetX,
            y: world.y - target.offsetY,
          }),
        ),
      );
    },
  });

  const nodeVisuals = useMemo(() => {
    return Object.values(solveResult.nodeResults)
      .map((node, index) => {
        const points = node.terminalRefs
          .map((ref) => {
            const component = getCircuitComponentById(document, ref.componentId);
            return component ? getComponentTerminalPoint(component, ref.terminal) : null;
          })
          .filter(Boolean) as CircuitPoint[];
        const center =
          points.length === 0
            ? { x: 0, y: 0 }
            : {
                x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
                y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
              };

        return {
          ...node,
          center,
          color: nodePalette[index % nodePalette.length],
        };
      })
      .filter((node) => node.terminalRefs.length > 0);
  }, [document, solveResult.nodeResults]);

  const measurementLabels = useMemo(() => {
    return document.components
      .map((component) => {
        const result = solveResult.componentResults[component.id];
        if (!result) {
          return null;
        }
        const shouldShow =
          selection?.kind === "component" && selection.id === component.id
            ? true
            : hoveredComponentId === component.id ||
              component.type === "ammeter" ||
              component.type === "voltmeter";
        if (!shouldShow) {
          return null;
        }

        return {
          component,
          voltageLabel:
            result.voltageMagnitude !== null
              ? formatMeasurement(result.voltageMagnitude, "V")
              : null,
          currentLabel:
            result.currentMagnitude !== null
              ? formatMeasurement(result.currentMagnitude, "A")
              : null,
        };
      })
      .filter(Boolean);
  }, [document.components, hoveredComponentId, selection, solveResult.componentResults]);

  const pendingWirePath = useMemo(() => {
    if (!pendingWireStart) {
      return null;
    }

    const fromComponent = getCircuitComponentById(document, pendingWireStart.componentId);
    if (!fromComponent) {
      return null;
    }

    let targetPoint = pointerWorld;
    if (!targetPoint && activeTerminalRef && !isSameTerminal(pendingWireStart, activeTerminalRef)) {
      const activeComponent = getCircuitComponentById(document, activeTerminalRef.componentId);
      targetPoint = activeComponent
        ? getComponentTerminalPoint(activeComponent, activeTerminalRef.terminal)
        : null;
    }

    if (!targetPoint) {
      return null;
    }

    const fromPoint = getComponentTerminalPoint(fromComponent, pendingWireStart.terminal);
    const points = buildWirePreviewPoints(
      fromPoint,
      getComponentTerminalDirection(fromComponent, pendingWireStart.terminal),
      targetPoint,
      { x: 0, y: 0 },
    );

    return buildWirePathData(points);
  }, [activeTerminalRef, document, pendingWireStart, pointerWorld]);
  const workspaceZoomPercent = Math.round(document.view.zoom * 100);
  const workspacePartLabel = `${document.components.length} part${document.components.length === 1 ? "" : "s"}`;
  const workspaceWireLabel = `${document.wires.length} wire${document.wires.length === 1 ? "" : "s"}`;
  const pointerPositionLabel = panState
    ? "Dragging view"
    : pointerWorld
      ? `Pointer ${Math.round(pointerWorld.x)}, ${Math.round(pointerWorld.y)}`
      : "Pan by dragging empty space";
  const visiblePointerStatusLabel = panState ? "Dragging view" : "Pan by dragging empty space";
  const workspaceModeLabel = pendingWireStart
    ? "Choose wire end"
    : activeTool === "wire"
      ? "Terminal pick mode"
      : panState
        ? "Panning canvas"
        : "32 px snap grid";
  const workspaceCanvasCursorClass = pendingWireStart || activeTool === "wire"
    ? "cursor-crosshair"
    : panState
      ? "cursor-grabbing"
      : "cursor-grab";
  const activeTerminalLabel = useMemo(() => {
    if (!activeTerminalRef) {
      return null;
    }

    const component = getCircuitComponentById(document, activeTerminalRef.componentId);
    if (!component) {
      return null;
    }

    const definition = getCircuitComponentDefinition(component.type);
    return `${component.label} ${definition.terminalLabels[activeTerminalRef.terminal]}`;
  }, [activeTerminalRef, document]);
  const workspaceGuidance = useMemo(() => {
    if (pendingWireStart) {
      const component = getCircuitComponentById(
        document,
        pendingWireStart.componentId,
      );
      if (activeTerminalLabel) {
        return isSameTerminal(pendingWireStart, activeTerminalRef)
          ? "That terminal is already selected. Choose a different terminal, click empty canvas, or press Esc to cancel."
          : `Connect to ${activeTerminalLabel} to finish the wire.`;
      }
      if (component) {
        const definition = getCircuitComponentDefinition(component.type);
        return `Wiring from ${component.label} ${definition.terminalLabels[pendingWireStart.terminal]}. Select a second terminal, click empty canvas, or press Esc to cancel.`;
      }

      return "Select a second terminal to finish the wire, or click empty canvas / press Esc to cancel.";
    }

    if (activeTool === "wire") {
      if (activeTerminalLabel) {
        return `Start wire from ${activeTerminalLabel}.`;
      }

      return "Wire tool active. Click a terminal to begin, or click empty canvas / press W/Esc to leave.";
    }

    if (activeTerminalLabel) {
      return `${activeTerminalLabel}. Click or press Enter/Space to start a wire from this terminal.`;
    }

    if (selection?.kind === "component") {
      const component = getCircuitComponentById(document, selection.id);
      if (component) {
        return `${component.label} selected. Drag it, use arrow keys to nudge, or edit details in the inspector.`;
      }
    }

    if (selection?.kind === "wire") {
      const wire = document.wires.find((entry) => entry.id === selection.id);
      if (wire) {
        return `${getCircuitWireDisplayLabel(document, wire)} selected. Use Delete or the inspector to remove it if needed.`;
      }
    }

    return "Drag parts, rotate them in the inspector, and pan the canvas by dragging empty space.";
  }, [activeTerminalLabel, activeTerminalRef, activeTool, document, pendingWireStart, selection]);
  const workspaceDragLabel = workspaceDragPreview && workspaceDragPreview !== "unknown"
    ? getCircuitComponentDefinition(workspaceDragPreview).label
    : "the part";
  const workspaceDropHint = `${workspaceDragLabel === "the part" ? "Drop the part" : `Drop ${workspaceDragLabel}`} on the 32 px snap grid`;
  const topIssue = solveResult.issues[0] ?? null;
  const issueComponent = topIssue?.componentId
    ? getCircuitComponentById(document, topIssue.componentId)
    : null;
  const issueCountLabel = `${solveResult.issues.length} circuit ${
    solveResult.issues.length === 1 ? "issue" : "issues"
  }`;
  const fitViewDescription = canFitView
    ? "Fit the whole circuit into the workspace view. Shortcut: F."
    : "Add at least one component before fitting the workspace view.";
  const canZoomOut = document.view.zoom > minimumWorkspaceZoom;
  const canZoomIn = document.view.zoom < maximumWorkspaceZoom;
  const zoomOutDescription = canZoomOut
    ? "Zoom out from the current centered workspace view. Shortcut: minus."
    : "Workspace is already at the minimum 45% zoom. Shortcut: minus.";
  const zoomInDescription = canZoomIn
    ? "Zoom in on the current centered workspace view. Shortcut: plus."
    : "Workspace is already at the maximum 240% zoom. Shortcut: plus.";
  const resetViewDescription = canResetView
    ? "Reset the workspace to the default zoom and pan. Shortcut: 0."
    : "Workspace is already at the default zoom and pan. Shortcut: 0.";
  const clearWorkspaceDescription = canClearWorkspace
    ? clearWorkspaceArmed
      ? "Clear workspace is ready. Confirm to remove every component and wire, or press Escape to cancel; Undo can restore the cleared circuit."
      : "Clear every component and wire from the workspace. A second click confirms the clear, and Undo can restore it."
    : "Add at least one component before clearing the workspace.";

  function zoomAround(nextZoom: number, focusPoint: CircuitPoint) {
    const clampedZoom = Math.max(minimumWorkspaceZoom, Math.min(maximumWorkspaceZoom, nextZoom));
    if (clampedZoom === document.view.zoom) {
      onAnnounceViewChange(
        `Workspace zoom already at ${Math.round(clampedZoom * 100)}%.`,
      );
      return;
    }

    const world = convertViewPointToWorld(focusPoint, document.view);

    onUpdateView({
      zoom: clampedZoom,
      offsetX: focusPoint.x - world.x * clampedZoom,
      offsetY: focusPoint.y - world.y * clampedZoom,
    });
    onAnnounceViewChange(
      `Workspace zoom ${Math.round(clampedZoom * 100)}%. Wheel zoom uses the pointer as its anchor.`,
    );
  }

  function handleTerminalActivate(ref: CircuitTerminalRef) {
    if (pendingWireStart) {
      onCompleteWire(ref);
      return;
    }

    onSetTool("wire");
    onStartWire(ref);
  }

  function inspectIssueComponent(componentId: string) {
    if (activeTool === "wire" || pendingWireStart) {
      onSetTool("select");
    }

    onSelectComponent(componentId);
  }

  function startComponentDrag(
    event: ReactPointerEvent<SVGGElement>,
    componentId: string,
  ) {
    if (!isPrimaryPointerButton(event)) {
      return;
    }

    if (activeTool === "wire") {
      return;
    }
    const component = getCircuitComponentById(document, componentId);
    if (!component) {
      return;
    }

    onSelectComponent(componentId);
    onBeginMoveComponent(componentId);

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const viewPoint = {
      x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * CIRCUIT_CANVAS_WIDTH,
      y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * CIRCUIT_CANVAS_HEIGHT,
    };
    const world = convertViewPointToWorld(viewPoint, document.view);

    drag.startDrag(event.pointerId, {
      componentId,
      offsetX: world.x - component.x,
      offsetY: world.y - component.y,
    }, event.clientX, event.clientY);
  }

  function handleWorkspacePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    drag.handlePointerMove(event.pointerId, event.clientX, event.clientY);

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const viewPoint = {
      x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * CIRCUIT_CANVAS_WIDTH,
      y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * CIRCUIT_CANVAS_HEIGHT,
    };
    setPointerWorld(convertViewPointToWorld(viewPoint, document.view));

    if (panState && event.pointerId === panState.pointerId) {
      const deltaX = event.clientX - panState.startX;
      const deltaY = event.clientY - panState.startY;
      const canvasDelta = convertClientDeltaToCanvasDelta(deltaX, deltaY, bounds);
      onUpdateView({
        ...document.view,
        offsetX: panState.offsetX + canvasDelta.x,
        offsetY: panState.offsetY + canvasDelta.y,
      });
      if (!panState.hasMoved && Math.hypot(deltaX, deltaY) > 2) {
        setPanState((current) =>
          current?.pointerId === event.pointerId
            ? { ...current, hasMoved: true }
            : current,
        );
      }
    }
  }

  function handleWorkspacePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const shouldCommitMove = drag.activePointerId === event.pointerId;
    drag.handlePointerUp(event.pointerId);
    if (shouldCommitMove) {
      onCommitMoveComponent();
    }
    if (panState?.pointerId === event.pointerId) {
      const shouldAnnouncePan = panState.hasMoved;
      releasePanPointer(event.pointerId);
      setPanState(null);
      if (shouldAnnouncePan) {
        onAnnounceViewChange("Workspace panned. Drag empty canvas again to keep navigating.");
      }
    }
  }

  function capturePanPointer(pointerId: number) {
    const svg = svgRef.current;
    if (!svg || typeof svg.setPointerCapture !== "function") {
      return;
    }

    svg.setPointerCapture(pointerId);
  }

  function releasePanPointer(pointerId: number) {
    const svg = svgRef.current;
    if (
      !svg ||
      typeof svg.releasePointerCapture !== "function" ||
      typeof svg.hasPointerCapture !== "function" ||
      !svg.hasPointerCapture(pointerId)
    ) {
      return;
    }

    svg.releasePointerCapture(pointerId);
  }

  useEffect(() => {
    if (!panState) {
      return;
    }

    const activePanState = panState;

    function handlePanCancel(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      releasePanPointer(activePanState.pointerId);
      onUpdateView({
        ...document.view,
        offsetX: activePanState.offsetX,
        offsetY: activePanState.offsetY,
      });
      setPanState(null);
      onAnnounceViewChange("Workspace pan cancelled. View returned to where it started.");
    }

    window.addEventListener("keydown", handlePanCancel);
    return () => window.removeEventListener("keydown", handlePanCancel);
  }, [document.view, onAnnounceViewChange, onUpdateView, panState]);

  function handleWorkspaceDragEnter(event: ReactDragEvent<HTMLDivElement>) {
    const dragPreview = getWorkspaceDragPreview(event);
    if (!dragPreview) {
      setWorkspaceDragPreview(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setWorkspaceDragPreview(dragPreview);
  }

  function handleWorkspaceDragOver(event: ReactDragEvent<HTMLDivElement>) {
    const dragPreview = getWorkspaceDragPreview(event);
    if (!dragPreview) {
      setWorkspaceDragPreview(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setWorkspaceDragPreview(dragPreview);
  }

  function handleWorkspaceDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setWorkspaceDragPreview(null);
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<SVGRectElement>) {
    if (!isPrimaryPointerButton(event)) {
      return;
    }

    if (pendingWireStart) {
      event.preventDefault();
      onCancelWire();
      return;
    }

    if (activeTool === "wire") {
      event.preventDefault();
      onSetTool("select");
      onSelectComponent(null);
      onSelectWire(null);
      return;
    }

    if (drag.activePointerId !== null) {
      return;
    }
    capturePanPointer(event.pointerId);
    setPanState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: document.view.offsetX,
      offsetY: document.view.offsetY,
      hasMoved: false,
    });
    if (activeTool === "select") {
      onClearSelection();
    }
  }

  return (
    <section
      ref={regionRef}
      className={[
        "lab-panel flex min-h-0 w-full min-w-0 flex-col overflow-hidden xl:h-full",
        className,
      ].join(" ").trim()}
      aria-label="Circuit workspace"
      tabIndex={-1}
      data-circuit-workspace-panel=""
      data-onboarding-target="circuit-builder-workspace"
    >
      <div className="border-b border-line px-3 py-2 sm:px-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="lab-label">Workspace</p>
            <p className="max-w-3xl text-sm leading-5 text-ink-700 sm:line-clamp-1" aria-live="polite">
              {workspaceGuidance}
            </p>
          </div>
          <div className="shrink-0">{headerSlot}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" data-circuit-workspace-controls="">
          <span id="circuit-zoom-out-description" className="sr-only">
            {zoomOutDescription}
          </span>
          <span id="circuit-zoom-in-description" className="sr-only">
            {zoomInDescription}
          </span>
          <span id="circuit-reset-view-description" className="sr-only">
            {resetViewDescription}
          </span>
          <span id="circuit-fit-view-description" className="sr-only">
            {fitViewDescription}
          </span>
          <span id="circuit-clear-workspace-description" className="sr-only">
            {clearWorkspaceDescription}
          </span>
          <div
            className="flex w-full min-w-0 max-w-full items-center justify-start gap-1.5 overflow-x-auto whitespace-nowrap rounded-full border border-line bg-paper-strong px-3 py-1.5 text-xs font-semibold text-ink-700 sm:w-auto sm:min-w-[15rem] sm:justify-center sm:overflow-visible"
            aria-label={`Workspace view status. ${workspaceZoomPercent}% zoom, ${workspacePartLabel}, ${workspaceWireLabel}, ${pointerPositionLabel}, ${workspaceModeLabel}.`}
            data-circuit-workspace-view-status=""
          >
            <span className="text-ink-950">{workspaceZoomPercent}% zoom</span>
            <span aria-hidden="true">·</span>
            <span>{workspacePartLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{workspaceWireLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{visiblePointerStatusLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{workspaceModeLabel}</span>
          </div>
          <button
            type="button"
            disabled={!canZoomOut}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-zoom-out-description"
            aria-keyshortcuts="-"
            title={canZoomOut ? "Zoom out (shortcut: -)" : "Minimum zoom reached"}
            onClick={onZoomOut}
          >
            Zoom -
          </button>
          <button
            type="button"
            disabled={!canZoomIn}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-zoom-in-description"
            aria-keyshortcuts="+"
            title={canZoomIn ? "Zoom in (shortcut: +)" : "Maximum zoom reached"}
            onClick={onZoomIn}
          >
            Zoom +
          </button>
          <button
            type="button"
            disabled={!canResetView}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-reset-view-description"
            aria-keyshortcuts="0"
            title={canResetView ? "Reset workspace view (shortcut: 0)" : "Default view already active"}
            onClick={onResetView}
          >
            Reset view
          </button>
          <button
            type="button"
            disabled={!canFitView}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-fit-view-description"
            aria-keyshortcuts="F"
            title={fitViewDescription}
            onClick={onFitView}
          >
            Fit circuit
          </button>
          <button
            type="button"
            disabled={!canClearWorkspace}
            className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2.5 py-1.5 text-sm font-semibold text-coral-700 transition hover:bg-coral-500/15 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink-500"
            aria-describedby="circuit-clear-workspace-description"
            aria-pressed={clearWorkspaceArmed ? "true" : undefined}
            title={clearWorkspaceDescription}
            onClick={onClearWorkspace}
          >
            {clearWorkspaceArmed ? "Confirm clear" : "Clear workspace"}
          </button>
        </div>
      </div>

      <div
        className="relative h-[27rem] min-h-[27rem] flex-1 bg-paper/60 sm:h-[34rem] sm:min-h-[34rem] xl:h-auto xl:min-h-0"
        onDragEnter={handleWorkspaceDragEnter}
        onDragOver={handleWorkspaceDragOver}
        onDragLeave={handleWorkspaceDragLeave}
        onDrop={(event) => {
          setWorkspaceDragPreview(null);
          const componentType = event.dataTransfer.getData(
            "application/open-model-lab-circuit-part",
          );
          if (!componentType) {
            return;
          }
          event.preventDefault();
          if (!isDraggableComponentType(componentType)) {
            return;
          }
          const bounds = svgRef.current?.getBoundingClientRect();
          if (!bounds) {
            return;
          }
          const viewPoint = {
            x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * CIRCUIT_CANVAS_WIDTH,
            y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * CIRCUIT_CANVAS_HEIGHT,
          };
          onDropComponent(
            componentType,
            clampComponentPoint(
              snapPointToGrid(convertViewPointToWorld(viewPoint, document.view)),
            ),
          );
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CIRCUIT_CANVAS_WIDTH} ${CIRCUIT_CANVAS_HEIGHT}`}
          className={["h-full w-full touch-none bg-paper/40", workspaceCanvasCursorClass].join(" ")}
          role="img"
          aria-label={`Interactive circuit workspace. ${workspaceModeLabel}. ${pointerPositionLabel}.`}
          data-circuit-workspace-canvas=""
          onPointerMove={handleWorkspacePointerMove}
          onPointerUp={handleWorkspacePointerUp}
          onPointerLeave={() => setPointerWorld(null)}
          onPointerCancel={(event) => {
            const shouldCommitMove = drag.activePointerId === event.pointerId;
            drag.handlePointerCancel(event.pointerId);
            if (shouldCommitMove) {
              onCommitMoveComponent();
            }
            if (panState?.pointerId === event.pointerId) {
              releasePanPointer(event.pointerId);
              onUpdateView({
                ...document.view,
                offsetX: panState.offsetX,
                offsetY: panState.offsetY,
              });
              setPanState(null);
              onAnnounceViewChange(
                "Workspace pan interrupted. View returned to where it started.",
              );
            }
          }}
          onLostPointerCapture={() => {
            if (drag.activePointerId !== null) {
              onCommitMoveComponent();
            }
            drag.handleLostPointerCapture();
            if (panState) {
              onUpdateView({
                ...document.view,
                offsetX: panState.offsetX,
                offsetY: panState.offsetY,
              });
              onAnnounceViewChange(
                "Workspace pan interrupted. View returned to where it started.",
              );
            }
            setPanState(null);
          }}
          onWheel={(event) => {
            if (event.deltaY === 0) {
              return;
            }

            event.preventDefault();
            const bounds = svgRef.current?.getBoundingClientRect();
            if (!bounds) {
              return;
            }
            const focusPoint = {
              x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * CIRCUIT_CANVAS_WIDTH,
              y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * CIRCUIT_CANVAS_HEIGHT,
            };
            zoomAround(document.view.zoom + (event.deltaY > 0 ? -0.08 : 0.08), focusPoint);
          }}
        >
          <defs>
            <pattern
              id="circuit-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="rgba(15,28,36,0.08)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            width={CIRCUIT_CANVAS_WIDTH}
            height={CIRCUIT_CANVAS_HEIGHT}
            fill="url(#circuit-grid)"
            data-circuit-workspace-background=""
            onPointerDown={handleBackgroundPointerDown}
          />

          {document.components.length === 0 ? (
            <g transform="translate(800 460)" pointerEvents="none">
              <rect
                x="-196"
                y="-78"
                width="392"
                height="156"
                rx="28"
                fill="rgba(255,253,248,0.95)"
                stroke="rgba(15,28,36,0.1)"
              />
              <text x="0" y="-20" textAnchor="middle" className="fill-ink-950 text-[22px] font-semibold">
                Start with a source and one load
              </text>
              <text x="0" y="14" textAnchor="middle" className="fill-ink-700 text-[14px]">
                Click a palette item to add it here, then connect terminals with the wire tool.
              </text>
              <text x="0" y="40" textAnchor="middle" className="fill-ink-600 text-[13px]">
                Example: battery -&gt; resistor -&gt; back to the battery for a complete loop.
              </text>
            </g>
          ) : null}

          <g
            transform={`translate(${document.view.offsetX} ${document.view.offsetY}) scale(${document.view.zoom})`}
            data-circuit-workspace-world-layer=""
          >
            {document.wires.map((wire) => {
              const path = buildWirePathFromRefs(document, wire);
              if (!path) {
                return null;
              }
              const selected = selection?.kind === "wire" && selection.id === wire.id;
              const wireLabel = getCircuitWireDisplayLabel(document, wire);
              const selectWire = () => {
                onSelectWire(wire.id);
              };
              const handleWireClick = (event: ReactMouseEvent<SVGElement>) => {
                if (!isPrimaryMouseButton(event)) {
                  return;
                }

                selectWire();
              };
              const handleWirePointerDown = (event: ReactPointerEvent<SVGElement>) => {
                if (!isPrimaryPointerButton(event)) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                selectWire();
              };
              const midpoint = path.points.length >= 3
                ? (() => {
                    const start = path.points[1]!;
                    const end = path.points[2]!;
                    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
                    return {
                      x:
                        start.x +
                        (end.x - start.x) * 0.8 +
                        (horizontal ? 0 : 18),
                      y:
                        start.y +
                        (end.y - start.y) * 0.8 +
                        (horizontal ? -18 : 0),
                    };
                  })()
                : path.points.length
                  ? {
                      x:
                        (path.points[0]!.x +
                          path.points[path.points.length - 1]!.x) / 2,
                      y:
                        (path.points[0]!.y +
                          path.points[path.points.length - 1]!.y) / 2,
                    }
                  : null;

              return (
                <g
                  key={wire.id}
                  onClick={handleWireClick}
                  onPointerDown={handleWirePointerDown}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectWire();
                    }
                  }}
                >
                  <path
                    d={path.path}
                    fill="none"
                    stroke={selected ? "#178c91" : "#315063"}
                    strokeWidth={selected ? 5 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onClick={handleWireClick}
                    onPointerDown={handleWirePointerDown}
                  />
                  <path
                    d={path.path}
                    fill="none"
                    stroke="rgba(255,255,255,0.001)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="stroke"
                    onClick={handleWireClick}
                    onPointerDown={handleWirePointerDown}
                  />
                  {midpoint ? (
                    <circle
                      cx={midpoint.x}
                      cy={midpoint.y}
                      r={selected ? 9 : 7}
                      fill={selected ? "#178c91" : "#fffdf8"}
                      stroke={selected ? "#0f1c24" : "#315063"}
                      strokeWidth={2}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${wireLabel}`}
                      aria-current={selected ? "true" : undefined}
                      onClick={handleWireClick}
                      onPointerDown={handleWirePointerDown}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectWire();
                        }
                      }}
                    />
                  ) : null}
                </g>
              );
            })}

            {pendingWirePath ? (
              <path
                d={pendingWirePath}
                fill="none"
                stroke="#178c91"
                strokeWidth="4"
                strokeDasharray="8 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                data-circuit-pending-wire-preview=""
              />
            ) : null}

            {document.components.map((component) => {
              const definition = getCircuitComponentDefinition(component.type);
              const result = solveResult.componentResults[component.id];
              const selected =
                selection?.kind === "component" && selection.id === component.id;
              const componentDescriptionId = `circuit-component-${component.id}-description`;
              const componentAccessibleDescription = pendingWireStart
                ? `${component.label} body is locked while a wire is pending; use its terminals to finish the wire or press Escape to cancel.`
                : activeTool === "wire"
                  ? `${component.label} body is locked while wiring; use its terminals to start a wire or press W/Escape to return to select mode.`
                  : selected
                    ? `${component.label} is selected. Drag it, press arrow keys to nudge it, press R to rotate, or press Delete to remove it.`
                    : `${component.label}. Press Enter or Space to select it; use its terminals to start wiring.`;

              return (
                <g
                  key={component.id}
                  transform={`translate(${component.x} ${component.y}) rotate(${component.rotation})`}
                  role="button"
                  tabIndex={0}
                  aria-label={component.label}
                  aria-describedby={componentDescriptionId}
                  aria-current={selected ? "true" : undefined}
                  onClick={(event) => {
                    if (!isPrimaryMouseButton(event)) {
                      return;
                    }
                    if (activeTool === "wire" || pendingWireStart) {
                      event.stopPropagation();
                      return;
                    }

                    onSelectComponent(component.id);
                  }}
                  onPointerEnter={() => setHoveredComponentId(component.id)}
                  onPointerLeave={() => setHoveredComponentId((current) => (current === component.id ? null : current))}
                  onPointerDown={(event) => startComponentDrag(event, component.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (activeTool === "wire" || pendingWireStart) {
                        return;
                      }
                      onSelectComponent(component.id);
                    }
                  }}
                >
                  <desc id={componentDescriptionId}>{componentAccessibleDescription}</desc>
                  <rect
                    x="-28"
                    y="-36"
                    width="56"
                    height="72"
                    rx="16"
                    fill="rgba(255,255,255,0.001)"
                    stroke="none"
                  />
                  {selected ? (
                    <rect
                      x="-84"
                      y="-58"
                      width="168"
                      height="116"
                      rx="24"
                      fill="rgba(23,140,145,0.08)"
                      stroke="#178c91"
                      strokeWidth="3"
                      pointerEvents="none"
                    />
                  ) : null}
                  <CircuitSymbol
                    type={component.type}
                    embedded
                    active={selected || hoveredComponentId === component.id}
                    openSwitch={component.type === "switch" && !component.properties.closed}
                  />
                  <text
                    x="0"
                    y="56"
                    textAnchor="middle"
                    className="fill-ink-950 text-[11px] font-semibold"
                  >
                    {component.label}
                  </text>
                  {result?.stateLabel ? (
                    <text
                      x="0"
                      y="72"
                      textAnchor="middle"
                      className="fill-ink-600 text-[10px] font-medium uppercase tracking-[0.12em]"
                    >
                      {result.stateLabel}
                    </text>
                  ) : null}
                  {(["a", "b"] as const).map((terminal) => {
                    const nodeId = result?.nodeIds[terminal];
                    const nodeVisual = nodeVisuals.find((entry) => entry.id === nodeId);
                    const localPoint =
                      terminal === "a" ? { x: -64, y: 0 } : { x: 64, y: 0 };
                    const terminalRef = {
                      componentId: component.id,
                      terminal,
                    } satisfies CircuitTerminalRef;
                    const pending = isSameTerminal(pendingWireStart, terminalRef);
                    const targeted = isSameTerminal(activeTerminalRef, terminalRef);
                    const terminalActionLabel = pendingWireStart
                      ? pending
                        ? "Pick another end"
                        : "Connect here"
                      : activeTool === "wire"
                        ? "Start here"
                        : targeted
                          ? "Enter/Space to wire"
                          : null;
                    const terminalActionLabelWidth = terminalActionLabel
                      ? Math.max(84, terminalActionLabel.length * 6.4 + 20)
                      : 84;
                    const terminalName = `${component.label} ${definition.terminalLabels[terminal]}`;
                    const terminalDescriptionId = `circuit-terminal-${component.id}-${terminal}-description`;
                    const terminalAccessibleDescription = pendingWireStart
                      ? pending
                        ? "This terminal is already selected. Choose a different terminal, click empty canvas, or press Escape to cancel the wire."
                        : `Connect the pending wire to ${terminalName}.`
                      : activeTool === "wire"
                        ? `Start a wire from ${terminalName}.`
                        : `Press Enter or Space to start a wire from ${terminalName}.`;

                    return (
                      <g key={terminal}>
                        <desc id={terminalDescriptionId}>{terminalAccessibleDescription}</desc>
                        <circle
                          cx={localPoint.x}
                          cy={localPoint.y}
                          r={pending ? 9 : 7}
                          fill={nodeVisual?.color ?? "#315063"}
                          stroke={pending ? "#178c91" : "#fffdf8"}
                          strokeWidth={pending ? 4 : 2}
                          role="button"
                          tabIndex={0}
                          aria-describedby={terminalDescriptionId}
                          aria-keyshortcuts="Enter Space"
                          aria-label={terminalName}
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerEnter={() => setActiveTerminalRef(terminalRef)}
                          onPointerLeave={() => {
                            setActiveTerminalRef((current) =>
                              isSameTerminal(current, terminalRef) ? null : current,
                            );
                          }}
                          onFocus={() => setActiveTerminalRef(terminalRef)}
                          onBlur={() => {
                            setActiveTerminalRef((current) =>
                              isSameTerminal(current, terminalRef) ? null : current,
                            );
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isPrimaryMouseButton(event)) {
                              return;
                            }

                            handleTerminalActivate(terminalRef);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              handleTerminalActivate(terminalRef);
                            }
                          }}
                        />
                        {targeted && terminalActionLabel ? (
                          <g transform={`translate(${localPoint.x} ${localPoint.y - 28})`} pointerEvents="none">
                            <rect
                              x={-terminalActionLabelWidth / 2}
                              y="-12"
                              width={terminalActionLabelWidth}
                              height="24"
                              rx="12"
                              fill={pending ? "rgba(240,171,60,0.16)" : "rgba(23,140,145,0.14)"}
                              stroke={pending ? "rgba(184,112,0,0.34)" : "rgba(16,111,115,0.32)"}
                            />
                            <text
                              x="0"
                              y="4"
                              textAnchor="middle"
                              className="fill-ink-950 text-[10px] font-semibold"
                            >
                              {terminalActionLabel}
                            </text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {nodeVisuals
              .filter((node) => node.terminalRefs.length > 1)
              .map((node) => (
                <g key={node.id} pointerEvents="none">
                  {chip(
                    node.center.x,
                    node.center.y - 18,
                    node.voltage !== null ? formatMeasurement(node.voltage, "V") : "floating",
                    node.sourceConnected ? "teal" : "sky",
                  )}
                </g>
              ))}

            {measurementLabels.map((entry) => {
              if (!entry) {
                return null;
              }
              return (
                <g key={`measure-${entry.component.id}`} pointerEvents="none">
                  {entry.currentLabel
                    ? chip(entry.component.x, entry.component.y - 74, `I ${entry.currentLabel}`, "teal")
                    : null}
                  {entry.voltageLabel
                    ? chip(entry.component.x, entry.component.y + 90, `V ${entry.voltageLabel}`, "amber")
                    : null}
                </g>
              );
            })}
          </g>
        </svg>

        {workspaceDragPreview ? (
          <div
            className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-[28px] border-2 border-dashed border-teal-500/70 bg-teal-500/12 text-center text-sm font-semibold text-teal-800 shadow-[inset_0_0_0_1px_rgba(255,253,248,0.72)]"
            aria-live="polite"
            role="status"
            data-circuit-workspace-drop-hint=""
          >
            {workspaceDropHint}
          </div>
        ) : null}

        {topIssue ? (
          <div className="border-t border-line bg-coral-500/6 px-4 py-3" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
                  {solveResult.issues.filter((issue) => issue.severity === "error").length > 0
                    ? "Needs attention"
                    : "Warnings"}
                </span>
                <span className="text-sm font-semibold text-ink-950">{issueCountLabel}</span>
                <span className="text-sm text-ink-700">
                  {topIssue.title}: {topIssue.detail}
                </span>
              </div>
              {issueComponent ? (
                <button
                  type="button"
                  className="rounded-full border border-coral-500/25 bg-paper px-3 py-1.5 text-xs font-semibold text-coral-700 transition hover:border-coral-500/40 hover:bg-coral-500/10"
                  onClick={() => inspectIssueComponent(issueComponent.id)}
                >
                  Inspect {issueComponent.label}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
