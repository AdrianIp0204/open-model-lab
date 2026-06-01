"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
  circuitBuilderCopyEn,
  clampComponentPoint,
  convertViewPointToWorld,
  deriveLightBulbGlow,
  deriveWireElectronFlow,
  formatCircuitComponentDisplayLabel,
  formatCircuitIssue,
  formatCircuitStateLabel,
  formatCircuitTerminalDisplayLabel,
  formatCircuitWireDisplayLabel,
  getCircuitComponentById,
  getComponentTerminalDirection,
  getComponentTerminalPoint,
  snapPointToGrid,
  type CircuitBuilderCopy,
  type CircuitComponentType,
  type CircuitDocument,
  type CircuitPoint,
  type CircuitRenderMode,
  type CircuitSolveResult,
  type CircuitTerminalRef,
  type CircuitWireElectronFlow,
} from "@/lib/circuit-builder";
import { CircuitPartVisual } from "./CircuitPartVisual";
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
const componentDragThresholdPx = 5;
const compactCanvasMediaQuery = "(max-width: 767px)";
const desktopCanvasFrame = {
  width: CIRCUIT_CANVAS_WIDTH,
  height: CIRCUIT_CANVAS_HEIGHT,
};
const compactCanvasFrame = {
  width: 720,
  height: 640,
};

function isDraggableComponentType(value: string): value is CircuitComponentType {
  return draggableComponentTypes.has(value as CircuitComponentType);
}

type CircuitWorkspaceProps = {
  document: CircuitDocument;
  solveResult: CircuitSolveResult;
  renderMode: CircuitRenderMode;
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
  onOpenComponentLibrary?: () => void;
  canClearWorkspace: boolean;
  clearWorkspaceArmed: boolean;
  canFitView: boolean;
  regionRef?: RefObject<HTMLElement | null>;
  className?: string;
  headerSlot?: ReactNode;
  controlsSlot?: ReactNode;
  copy?: CircuitBuilderCopy;
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
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function formatVisualMetric(value: number) {
  return value.toFixed(2);
}

function sanitizeSvgId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getPathLength(points: CircuitPoint[]) {
  return points.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }

    const previous = points[index - 1]!;
    return total + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
  }, 0);
}

function getPathMidpoint(points: CircuitPoint[]) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  return points[Math.floor(points.length / 2)] ?? points[0]!;
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function subscribeToCompactCanvasFrame(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const query = window.matchMedia(compactCanvasMediaQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getCompactCanvasFrameSnapshot() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(compactCanvasMediaQuery).matches;
}

function getCompactCanvasFrameServerSnapshot() {
  return false;
}

function useCircuitCanvasFrame() {
  const compact = useSyncExternalStore(
    subscribeToCompactCanvasFrame,
    getCompactCanvasFrameSnapshot,
    getCompactCanvasFrameServerSnapshot,
  );

  return compact ? compactCanvasFrame : desktopCanvasFrame;
}

function CircuitElectronFlowLayer({
  wireId,
  path,
  points,
  flow,
  reducedMotion,
}: {
  wireId: string;
  path: string;
  points: CircuitPoint[];
  flow: CircuitWireElectronFlow;
  reducedMotion: boolean;
}) {
  const motionPathId = `circuit-electron-motion-${sanitizeSvgId(wireId)}`;
  const motionPath = flow.direction === "to-from"
    ? buildWirePathData(points.slice().reverse())
    : path;
  const markerCount = Math.max(1, Math.min(5, Math.ceil(getPathLength(points) / 190)));
  const midpoint = getPathMidpoint(points);
  const beadOpacity = 0.72 + flow.intensity * 0.22;
  const haloOpacity = 0.22 + flow.intensity * 0.22;

  return (
    <g
      pointerEvents="none"
      data-circuit-electron-flow-wire-id={wireId}
      data-circuit-electron-flow-active={flow.active ? "true" : "false"}
      data-circuit-electron-flow-direction={flow.direction ?? "none"}
      data-circuit-electron-flow-speed={formatVisualMetric(flow.speed)}
      data-circuit-electron-flow-reduced-motion={reducedMotion ? "true" : "false"}
    >
      {flow.active ? (
        <>
          <path id={motionPathId} d={motionPath} fill="none" stroke="none" />
          {reducedMotion ? (
            <g
              transform={`translate(${midpoint.x} ${midpoint.y})`}
              opacity="0.82"
              data-circuit-electron-flow-static=""
              data-circuit-electron-marker="static"
            >
              <circle r="14" fill="#f0ab3c" opacity={haloOpacity * 0.55} />
              <circle r="7" fill="#f0ab3c" stroke="#fffdf8" strokeWidth="2.2" />
              <g transform="translate(12 -20)" data-circuit-electron-label="">
                <rect x="-10" y="-9" width="30" height="18" rx="9" fill="#fffdf8" stroke="rgba(15,28,36,0.24)" />
                <text x="5" y="4" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#0f1c24">
                  e-
                </text>
              </g>
            </g>
          ) : (
            Array.from({ length: markerCount }).map((_, index) => {
              const stagger = (flow.durationSeconds / markerCount) * index;
              const leading = index === 0;
              return (
                <g
                  key={`${wireId}-electron-${index}`}
                  opacity={leading ? 1 : beadOpacity}
                  data-circuit-electron-marker={leading ? "lead" : "trail"}
                >
                  <circle r={leading ? 14 : 8.5} fill="#f0ab3c" opacity={leading ? haloOpacity : haloOpacity * 0.52} />
                  <circle
                    r={leading ? 7.2 : 5.8}
                    fill={leading ? "#f0ab3c" : "#2fb7b5"}
                    stroke="#fffdf8"
                    strokeWidth={leading ? "2.2" : "2"}
                  />
                  {leading ? (
                    <g transform="translate(12 -20)" data-circuit-electron-label="">
                      <rect x="-10" y="-9" width="30" height="18" rx="9" fill="#fffdf8" stroke="rgba(15,28,36,0.24)" />
                      <text x="5" y="4" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#0f1c24">
                        e-
                      </text>
                    </g>
                  ) : null}
                  <animateMotion
                    dur={`${formatVisualMetric(flow.durationSeconds)}s`}
                    begin={`${formatVisualMetric(-stagger)}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href={`#${motionPathId}`} />
                  </animateMotion>
                </g>
              );
            })
          )}
        </>
      ) : null}
    </g>
  );
}

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
  canvasFrame: { width: number; height: number },
) {
  return {
    x: deltaX * (bounds.width > 0 ? canvasFrame.width / bounds.width : 1),
    y: deltaY * (bounds.height > 0 ? canvasFrame.height / bounds.height : 1),
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
  const width = Math.max(60, label.length * 7.8 + 24);

  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" data-circuit-readout-chip="">
      <rect
        x={-width / 2}
        y={-14}
        width={width}
        height="28"
        rx="14"
        fill={palette.fill}
        stroke={palette.stroke}
      />
      <text
        x="0"
        y="5"
        textAnchor="middle"
        className="fill-current text-[12px] font-semibold"
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
  renderMode,
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
  onOpenComponentLibrary,
  canClearWorkspace,
  clearWorkspaceArmed,
  canFitView,
  regionRef,
  className = "",
  headerSlot = null,
  controlsSlot = null,
  copy = circuitBuilderCopyEn,
}: CircuitWorkspaceProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasFrame = useCircuitCanvasFrame();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [activeTerminalRef, setActiveTerminalRef] = useState<CircuitTerminalRef | null>(null);
  const [pointerWorld, setPointerWorld] = useState<CircuitPoint | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [workspaceDragPreview, setWorkspaceDragPreview] = useState<WorkspaceDragPreview | null>(null);
  const drag = useSvgPointerDrag<DragTarget>({
    svgRef,
    width: canvasFrame.width,
    height: canvasFrame.height,
    dragThreshold: componentDragThresholdPx,
    onDragStart: (target) => {
      onBeginMoveComponent(target.componentId);
    },
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

    let targetPoint: CircuitPoint | null = pointerWorld;
    let targetDirection = { x: 0, y: 0 };
    let targetComponentId: string | undefined;
    if (activeTerminalRef && !isSameTerminal(pendingWireStart, activeTerminalRef)) {
      const activeComponent = getCircuitComponentById(document, activeTerminalRef.componentId);
      if (activeComponent) {
        targetPoint = getComponentTerminalPoint(activeComponent, activeTerminalRef.terminal);
        targetDirection = getComponentTerminalDirection(activeComponent, activeTerminalRef.terminal);
        targetComponentId = activeComponent.id;
      }
    }

    if (!targetPoint) {
      return null;
    }

    const fromPoint = getComponentTerminalPoint(fromComponent, pendingWireStart.terminal);
    const points = buildWirePreviewPoints(
      fromPoint,
      getComponentTerminalDirection(fromComponent, pendingWireStart.terminal),
      targetPoint,
      targetDirection,
      {
        components: document.components,
        fromComponentId: fromComponent.id,
        toComponentId: targetComponentId,
      },
    );

    return buildWirePathData(points);
  }, [activeTerminalRef, document, pendingWireStart, pointerWorld]);
  const workspaceZoomPercent = Math.round(document.view.zoom * 100);
  const workspacePartLabel = `${document.components.length} ${
    document.components.length === 1 ? copy.workspace.partSingular : copy.workspace.partPlural
  }`;
  const workspaceWireLabel = `${document.wires.length} ${
    document.wires.length === 1 ? copy.workspace.wireSingular : copy.workspace.wirePlural
  }`;
  const pointerPositionLabel = panState
    ? copy.workspace.pointerDragging
    : pointerWorld
      ? `Pointer ${Math.round(pointerWorld.x)}, ${Math.round(pointerWorld.y)}`
      : copy.workspace.panEmpty;
  const visiblePointerStatusLabel = panState ? copy.workspace.pointerDragging : copy.workspace.panEmpty;
  const workspaceModeLabel = pendingWireStart
    ? copy.workspace.chooseWireEnd
    : activeTool === "wire"
      ? copy.workspace.terminalPickMode
      : panState
        ? copy.workspace.panningCanvas
        : copy.workspace.snapGrid;
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

    return formatCircuitTerminalDisplayLabel(document, activeTerminalRef, copy);
  }, [activeTerminalRef, copy, document]);
  const workspaceGuidance = useMemo(() => {
    if (pendingWireStart) {
      const component = getCircuitComponentById(
        document,
        pendingWireStart.componentId,
      );
      if (activeTerminalLabel) {
        return isSameTerminal(pendingWireStart, activeTerminalRef)
          ? copy.workspace.alreadySelectedTerminal
          : `${copy.workspace.connectToPrefix} ${activeTerminalLabel} ${copy.workspace.connectToSuffix}`;
      }
      if (component) {
        return `${copy.workspace.wiringFromPrefix} ${formatCircuitTerminalDisplayLabel(
          document,
          pendingWireStart,
          copy,
        )}. ${copy.workspace.wiringFromSuffix}`;
      }

      return copy.workspace.selectSecondTerminal;
    }

    if (activeTool === "wire") {
      if (activeTerminalLabel) {
        return `${copy.workspace.startWireFromPrefix} ${activeTerminalLabel}${copy.locale === "zh-HK" ? "" : "."} ${copy.workspace.startWireFromSuffix}`.trim();
      }

      return copy.workspace.wireToolActive;
    }

    if (activeTerminalLabel) {
      return `${activeTerminalLabel}. ${copy.workspace.terminalHoverSuffix}`;
    }

    if (selection?.kind === "component") {
      const component = getCircuitComponentById(document, selection.id);
      if (component) {
        return `${formatCircuitComponentDisplayLabel(component, copy)} ${copy.workspace.selectedComponentSuffix}`;
      }
    }

    if (selection?.kind === "wire") {
      const wire = document.wires.find((entry) => entry.id === selection.id);
      if (wire) {
        return `${formatCircuitWireDisplayLabel(document, wire, copy)} ${copy.workspace.selectedWireSuffix}`;
      }
    }

    return copy.workspace.guidanceDefault;
  }, [activeTerminalLabel, activeTerminalRef, activeTool, copy, document, pendingWireStart, selection]);
  const workspaceDragLabel = workspaceDragPreview && workspaceDragPreview !== "unknown"
    ? copy.components[workspaceDragPreview].label
    : copy.workspace.dropPartFallback;
  const workspaceDropHint = `${copy.workspace.dropPrefix} ${workspaceDragLabel} ${copy.workspace.dropSuffix}`;
  const topIssue = solveResult.issues[0] ?? null;
  const localizedTopIssue = topIssue ? formatCircuitIssue(topIssue, document, copy) : null;
  const issueComponent = topIssue?.componentId
    ? getCircuitComponentById(document, topIssue.componentId)
    : null;
  const issueCountLabel = `${solveResult.issues.length} ${
    copy.locale === "en"
      ? solveResult.issues.length === 1
        ? "circuit issue"
        : "circuit issues"
      : solveResult.issues.length === 1
        ? copy.toolbar.issueSingular
        : copy.toolbar.issuePlural
  }`;
  const fitViewDescription = canFitView
    ? copy.workspace.fitViewDescriptionEnabled
    : copy.workspace.fitViewDescriptionDisabled;
  const canZoomOut = document.view.zoom > minimumWorkspaceZoom;
  const canZoomIn = document.view.zoom < maximumWorkspaceZoom;
  const zoomOutDescription = canZoomOut
    ? copy.workspace.zoomOutDescriptionEnabled
    : copy.workspace.zoomOutDescriptionDisabled;
  const zoomInDescription = canZoomIn
    ? copy.workspace.zoomInDescriptionEnabled
    : copy.workspace.zoomInDescriptionDisabled;
  const resetViewDescription = canResetView
    ? copy.workspace.resetViewDescriptionEnabled
    : copy.workspace.resetViewDescriptionDisabled;
  const clearWorkspaceDescription = canClearWorkspace
    ? clearWorkspaceArmed
      ? copy.workspace.clearDescriptionArmed
      : copy.workspace.clearDescriptionEnabled
    : copy.workspace.clearDescriptionDisabled;

  function zoomAround(nextZoom: number, focusPoint: CircuitPoint) {
    const clampedZoom = Math.max(minimumWorkspaceZoom, Math.min(maximumWorkspaceZoom, nextZoom));
    if (clampedZoom === document.view.zoom) {
      onAnnounceViewChange(
        `${copy.workspace.zoomAlreadyAtPrefix} ${Math.round(clampedZoom * 100)}%.`,
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
      `${copy.workspace.zoomStatusPrefix} ${Math.round(clampedZoom * 100)}%. ${copy.workspace.zoomStatusSuffix}`,
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

    event.preventDefault();
    event.stopPropagation();

    if (activeTool === "wire") {
      return;
    }
    const component = getCircuitComponentById(document, componentId);
    if (!component) {
      return;
    }

    onSelectComponent(componentId);

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const viewPoint = {
      x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * canvasFrame.width,
      y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * canvasFrame.height,
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
      x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * canvasFrame.width,
      y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * canvasFrame.height,
    };
    setPointerWorld(convertViewPointToWorld(viewPoint, document.view));

    if (panState && event.pointerId === panState.pointerId) {
      const deltaX = event.clientX - panState.startX;
      const deltaY = event.clientY - panState.startY;
      const canvasDelta = convertClientDeltaToCanvasDelta(deltaX, deltaY, bounds, canvasFrame);
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
    const shouldCommitMove = drag.hasExceededThreshold(event.pointerId);
    drag.handlePointerUp(event.pointerId);
    if (shouldCommitMove) {
      onCommitMoveComponent();
    }
    if (panState?.pointerId === event.pointerId) {
      const shouldAnnouncePan = panState.hasMoved;
      releasePanPointer(event.pointerId);
      setPanState(null);
      if (shouldAnnouncePan) {
        onAnnounceViewChange(copy.workspace.panAnnounced);
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
      onAnnounceViewChange(copy.workspace.panCancelled);
    }

    window.addEventListener("keydown", handlePanCancel);
    return () => window.removeEventListener("keydown", handlePanCancel);
  }, [copy.workspace.panCancelled, document.view, onAnnounceViewChange, onUpdateView, panState]);

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
      aria-label={copy.workspace.ariaLabel}
      tabIndex={-1}
      data-circuit-workspace-panel=""
      data-circuit-render-mode={renderMode}
      data-onboarding-target="circuit-builder-workspace"
    >
      <div className="border-b border-line px-3 py-2 sm:px-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="lab-label">{copy.workspace.eyebrow}</p>
            <p className="max-w-3xl text-sm leading-5 text-ink-700 line-clamp-2 sm:line-clamp-1" aria-live="polite">
              {workspaceGuidance}
            </p>
          </div>
          <div className="shrink-0">{headerSlot}</div>
        </div>
        <div
          className="mt-2 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 xl:flex-wrap xl:overflow-visible xl:pb-0"
          data-circuit-workspace-controls=""
        >
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
            className="flex shrink-0 items-center justify-start gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper-strong px-3 py-1.5 text-xs font-semibold text-ink-700 sm:min-w-[15rem] sm:justify-center"
            aria-label={`${copy.workspace.statusAriaPrefix} ${workspaceZoomPercent}% ${copy.workspace.zoom}, ${workspacePartLabel}, ${workspaceWireLabel}, ${pointerPositionLabel}, ${workspaceModeLabel}.`}
            data-circuit-workspace-view-status=""
            data-circuit-workspace-zoom-percent={workspaceZoomPercent}
          >
            <span className="text-ink-950">{workspaceZoomPercent}% {copy.workspace.zoom}</span>
            <span aria-hidden="true">·</span>
            <span>{workspacePartLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{workspaceWireLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{visiblePointerStatusLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{workspaceModeLabel}</span>
          </div>
          {controlsSlot}
          {renderMode === "modern" ? (
            <div
              className="shrink-0 rounded-full border border-teal-500/20 bg-teal-500/8 px-2.5 py-1.5 text-xs font-semibold text-teal-800"
              data-circuit-modern-legend=""
            >
              {copy.workspace.modernLegend}
            </div>
          ) : null}
          <button
            type="button"
            disabled={!canZoomOut}
            className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-zoom-out-description"
            aria-keyshortcuts="-"
            title={canZoomOut ? copy.workspace.zoomOutTitle : copy.workspace.minimumZoomTitle}
            onClick={onZoomOut}
          >
            {copy.workspace.zoomOut}
          </button>
          <button
            type="button"
            disabled={!canZoomIn}
            className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-zoom-in-description"
            aria-keyshortcuts="+"
            title={canZoomIn ? copy.workspace.zoomInTitle : copy.workspace.maximumZoomTitle}
            onClick={onZoomIn}
          >
            {copy.workspace.zoomIn}
          </button>
          <button
            type="button"
            disabled={!canResetView}
            className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-reset-view-description"
            aria-keyshortcuts="0"
            title={canResetView ? copy.workspace.resetViewTitle : copy.workspace.defaultViewTitle}
            onClick={onResetView}
          >
            {copy.workspace.resetView}
          </button>
          <button
            type="button"
            disabled={!canFitView}
            className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="circuit-fit-view-description"
            aria-keyshortcuts="F"
            title={fitViewDescription}
            onClick={onFitView}
          >
            {copy.workspace.fitCircuit}
          </button>
          <button
            type="button"
            disabled={!canClearWorkspace}
            className="shrink-0 rounded-full border border-coral-500/30 bg-coral-500/10 px-2.5 py-1.5 text-sm font-semibold text-coral-700 transition hover:bg-coral-500/15 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink-500"
            aria-describedby="circuit-clear-workspace-description"
            aria-pressed={clearWorkspaceArmed ? "true" : undefined}
            title={clearWorkspaceDescription}
            onClick={onClearWorkspace}
          >
            {clearWorkspaceArmed ? copy.workspace.confirmClear : copy.workspace.clearWorkspace}
          </button>
        </div>
      </div>

      <div
        className="relative h-[19rem] min-h-[19rem] flex-1 bg-paper/60 sm:h-[34rem] sm:min-h-[34rem] xl:h-auto xl:min-h-0"
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
            x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * canvasFrame.width,
            y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * canvasFrame.height,
          };
          onDropComponent(
            componentType,
            clampComponentPoint(
              snapPointToGrid(convertViewPointToWorld(viewPoint, document.view)),
            ),
          );
        }}
      >
        {document.components.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <div
              className="circuit-workspace-empty-card pointer-events-auto w-[min(31rem,calc(100%-1rem))] rounded-[24px] border px-5 py-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-6 sm:py-5"
              data-circuit-workspace-empty-card=""
            >
              <p
                className="text-lg font-semibold leading-snug sm:text-2xl"
                data-circuit-workspace-empty-title=""
              >
                {copy.workspace.emptyTitle}
              </p>
              <p
                className="mx-auto mt-2 max-w-[26rem] text-sm leading-6 sm:text-base"
                data-circuit-workspace-empty-subtitle=""
              >
                {copy.workspace.emptySubtitle}
              </p>
              <p
                className="mx-auto mt-2 max-w-[26rem] text-xs font-medium leading-5 sm:text-sm"
                data-circuit-workspace-empty-example=""
              >
                {copy.workspace.emptyExample}
              </p>
              {onOpenComponentLibrary ? (
                <button
                  type="button"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2"
                  onClick={onOpenComponentLibrary}
                  data-circuit-workspace-empty-action=""
                >
                  {copy.workspace.emptyActionLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasFrame.width} ${canvasFrame.height}`}
          className={["h-full w-full touch-none bg-paper/40", workspaceCanvasCursorClass].join(" ")}
          role="img"
          aria-label={`${copy.workspace.canvasAriaPrefix} ${workspaceModeLabel}. ${pointerPositionLabel}.`}
          data-circuit-workspace-canvas=""
          data-circuit-render-mode={renderMode}
          onPointerMove={handleWorkspacePointerMove}
          onPointerUp={handleWorkspacePointerUp}
          onPointerLeave={() => setPointerWorld(null)}
          onPointerCancel={(event) => {
            const shouldCommitMove = drag.hasExceededThreshold(event.pointerId);
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
                copy.workspace.panInterrupted,
              );
            }
          }}
          onLostPointerCapture={() => {
            if (drag.hasExceededThreshold()) {
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
                copy.workspace.panInterrupted,
              );
            }
            setPanState(null);
          }}
          onWheel={(event) => {
            if (event.deltaY === 0) {
              return;
            }

            if (!event.ctrlKey && !event.metaKey) {
              return;
            }

            event.preventDefault();
            if (drag.activePointerId !== null) {
              return;
            }

            const bounds = svgRef.current?.getBoundingClientRect();
            if (!bounds) {
              return;
            }
            const focusPoint = {
              x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * canvasFrame.width,
              y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * canvasFrame.height,
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
            width={canvasFrame.width}
            height={canvasFrame.height}
            fill="url(#circuit-grid)"
            data-circuit-workspace-background=""
            onPointerDown={handleBackgroundPointerDown}
          />

          <g
            transform={`translate(${document.view.offsetX} ${document.view.offsetY}) scale(${document.view.zoom})`}
            data-circuit-workspace-world-layer=""
            data-circuit-workspace-offset-x={Math.round(document.view.offsetX)}
            data-circuit-workspace-offset-y={Math.round(document.view.offsetY)}
          >
            {document.wires.map((wire) => {
              const path = buildWirePathFromRefs(document, wire);
              if (!path) {
                return null;
              }
              const selected = selection?.kind === "wire" && selection.id === wire.id;
              const wireLabel = formatCircuitWireDisplayLabel(document, wire, copy);
              const electronFlow = renderMode === "modern"
                ? deriveWireElectronFlow(document, solveResult, wire)
                : null;
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
                  data-circuit-modern-powered-wire={
                    electronFlow ? (electronFlow.active ? "true" : "false") : undefined
                  }
                  onClick={handleWireClick}
                  onPointerDown={handleWirePointerDown}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectWire();
                    }
                  }}
                >
                  {electronFlow?.active ? (
                    <path
                      d={path.path}
                      fill="none"
                      stroke="rgba(240,171,60,0.42)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                      data-circuit-modern-wire-highlight="true"
                    />
                  ) : null}
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
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="stroke"
                    onClick={handleWireClick}
                    onPointerDown={handleWirePointerDown}
                  />
                  {electronFlow ? (
                    <CircuitElectronFlowLayer
                      wireId={wire.id}
                      path={path.path}
                      points={path.points}
                      flow={electronFlow}
                      reducedMotion={prefersReducedMotion}
                    />
                  ) : null}
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
              const result = solveResult.componentResults[component.id];
              const selected =
                selection?.kind === "component" && selection.id === component.id;
              const componentDescriptionId = `circuit-component-${component.id}-description`;
              const componentLabel = formatCircuitComponentDisplayLabel(component, copy);
              const componentAccessibleDescription = pendingWireStart
                ? `${componentLabel} ${copy.workspace.componentDescriptions.pending}`
                : activeTool === "wire"
                  ? `${componentLabel} ${copy.workspace.componentDescriptions.wireMode}`
                  : selected
                    ? `${componentLabel} ${copy.workspace.componentDescriptions.selected}`
                    : `${componentLabel}. ${copy.workspace.componentDescriptions.idle}`;

              return (
                <g
                  key={component.id}
                  transform={`translate(${component.x} ${component.y}) rotate(${component.rotation})`}
                  role="button"
                  tabIndex={0}
                  data-circuit-component-id={component.id}
                  data-circuit-component-x={component.x}
                  data-circuit-component-y={component.y}
                  data-circuit-component-label={componentLabel}
                  aria-label={componentLabel}
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
                      x="-92"
                      y="-66"
                      width="184"
                      height="150"
                      rx="24"
                      fill="rgba(23,140,145,0.08)"
                      stroke="#178c91"
                      strokeWidth="3"
                      pointerEvents="none"
                    />
                  ) : null}
                  {renderMode === "modern" ? (
                    <CircuitPartVisual
                      type={component.type}
                      embedded
                      active={selected || hoveredComponentId === component.id}
                      openSwitch={component.type === "switch" && !component.properties.closed}
                      blown={component.type === "fuse" && Boolean(component.properties.blown)}
                      glow={
                        component.type === "lightBulb"
                          ? deriveLightBulbGlow(component, result)
                          : undefined
                      }
                    />
                  ) : (
                    <CircuitSymbol
                      type={component.type}
                      embedded
                      active={selected || hoveredComponentId === component.id}
                      openSwitch={component.type === "switch" && !component.properties.closed}
                    />
                  )}
                  <text
                    x="0"
                    y="62"
                    textAnchor="middle"
                    className="fill-ink-950 text-[14px] font-semibold"
                  >
                    {componentLabel}
                  </text>
                  {result?.stateLabel ? (
                    <text
                      x="0"
                      y="82"
                      textAnchor="middle"
                      className="fill-ink-600 text-[11px] font-medium uppercase tracking-[0.12em]"
                    >
                      {formatCircuitStateLabel(result.stateLabel, copy)}
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
                        ? copy.workspace.terminalActions.pickAnotherEnd
                        : copy.workspace.terminalActions.connectHere
                      : activeTool === "wire"
                        ? copy.workspace.terminalActions.startHere
                        : targeted
                          ? copy.workspace.terminalActions.enterSpaceToWire
                          : null;
                    const terminalActionLabelWidth = terminalActionLabel
                      ? Math.max(96, terminalActionLabel.length * 7.1 + 24)
                      : 84;
                    const terminalName = formatCircuitTerminalDisplayLabel(document, terminalRef, copy);
                    const terminalDescriptionId = `circuit-terminal-${component.id}-${terminal}-description`;
                    const terminalAccessibleDescription = pendingWireStart
                      ? pending
                        ? copy.workspace.terminalDescriptions.pendingSame
                        : `${copy.workspace.terminalDescriptions.pendingOtherPrefix} ${terminalName}.`
                      : activeTool === "wire"
                        ? `${copy.workspace.terminalDescriptions.wireModePrefix} ${terminalName}.`
                        : `${copy.workspace.terminalDescriptions.idlePrefix} ${terminalName}.`;

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
                              y="-13"
                              width={terminalActionLabelWidth}
                              height="26"
                              rx="13"
                              fill={pending ? "rgba(240,171,60,0.16)" : "rgba(23,140,145,0.14)"}
                              stroke={pending ? "rgba(184,112,0,0.34)" : "rgba(16,111,115,0.32)"}
                            />
                            <text
                              x="0"
                              y="4.5"
                              textAnchor="middle"
                              className="fill-ink-950 text-[11px] font-semibold"
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
                    node.center.y - 24,
                    node.voltage !== null ? formatMeasurement(node.voltage, "V") : copy.workspace.floating,
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
                    ? chip(entry.component.x, entry.component.y - 84, `I ${entry.currentLabel}`, "teal")
                    : null}
                  {entry.voltageLabel
                    ? chip(entry.component.x, entry.component.y + 104, `V ${entry.voltageLabel}`, "amber")
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

        {localizedTopIssue ? (
          <div className="border-t border-line bg-coral-500/6 px-4 py-3" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
                  {solveResult.issues.filter((issue) => issue.severity === "error").length > 0
                    ? copy.workspace.issueNeedsAttention
                    : copy.workspace.issueWarnings}
                </span>
                <span className="text-sm font-semibold text-ink-950">{issueCountLabel}</span>
                <span className="text-sm text-ink-700">
                  {localizedTopIssue.title}: {localizedTopIssue.detail}
                </span>
              </div>
              {issueComponent ? (
                <button
                  type="button"
                  className="rounded-full border border-coral-500/25 bg-paper px-3 py-1.5 text-xs font-semibold text-coral-700 transition hover:border-coral-500/40 hover:bg-coral-500/10"
                  onClick={() => inspectIssueComponent(issueComponent.id)}
                >
                  {copy.workspace.inspectPrefix} {formatCircuitComponentDisplayLabel(issueComponent, copy)}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
