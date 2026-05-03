"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useTranslations } from "next-intl";
import type {
  ChemistryEdge,
  ChemistryGraphLayout,
  ChemistryNode,
} from "@/lib/tools/chemistry-reaction-mind-map";
import { ChemistryInlineNotation } from "./ChemistryNotation";

const NODE_WIDTH = 192;
const NODE_HEIGHT = 98;
const SCENE_PADDING = 72;
const MIN_SCALE = 0.42;
const MAX_SCALE = 2.25;
const MIN_SCALE_PERCENT = Math.round(MIN_SCALE * 100);
const MAX_SCALE_PERCENT = Math.round(MAX_SCALE * 100);
const ZOOM_FACTOR = 1.16;
const KEYBOARD_PAN_STEP = 64;
const FIT_MARGIN = 48;
const CONTEXT_PADDING = 88;
const MIN_VISIBLE_SCENE_EDGE = 96;
const PAN_AFFORDANCE_THRESHOLD = 24;
const EDGE_LABEL_TARGET_VISUAL_SCALE = 0.76;
const EDGE_LABEL_DETAIL_SCALE = 1.05;
const MIN_EDGE_LABEL_COUNTER_SCALE = 0.58;
const MAX_EDGE_LABEL_COUNTER_SCALE = 1.72;
const ZOOM_BOUNDARY_EPSILON = 0.001;
const MINIMAP_NODE_LABEL_MAX_LENGTH = 12;
const INITIAL_VIEW_STATE: GraphViewState = {
  scale: 0.72,
  x: 16,
  y: 16,
};

type ChemistrySelection =
  | { kind: "node"; id: ChemistryNode["id"] }
  | { kind: "edge"; id: ChemistryEdge["id"] }
  | null;

type ChemistryReactionGraphProps = {
  nodes: readonly ChemistryNode[];
  edges: readonly ChemistryEdge[];
  layout: ChemistryGraphLayout;
  selection: ChemistrySelection;
  comparedNodeIds?: readonly ChemistryNode["id"][];
  comparedEdgeIds?: readonly ChemistryEdge["id"][];
  highlightedNodeIds?: readonly ChemistryNode["id"][];
  highlightedEdgeIds?: readonly ChemistryEdge["id"][];
  routeNodeIds?: readonly ChemistryNode["id"][];
  routeEdgeIds?: readonly ChemistryEdge["id"][];
  routeEndpointIds?: readonly ChemistryNode["id"][];
  dimUnrelated?: boolean;
  className?: string;
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
  onSelectEdge: (edgeId: ChemistryEdge["id"]) => void;
};

type GraphViewState = {
  scale: number;
  x: number;
  y: number;
};

type SceneBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type PathwayBias =
  | "incoming-heavy"
  | "outgoing-heavy"
  | "balanced"
  | "isolated";

type GraphFlowBand = {
  id: "entry" | "relay" | "product";
  order: 1 | 2 | 3;
  tone: "source" | "hub" | "sink";
  x: number;
  y: number;
  width: number;
  height: number;
};

type GraphFlowSpine = {
  startX: number;
  endX: number;
  y: number;
  checkpoints: readonly number[];
};

type GraphFlowTransition = {
  source: GraphFlowBand;
  target: GraphFlowBand;
  label: string;
  crossesBand: boolean;
};

type GraphFlowCorridor = {
  id: string;
  source: GraphFlowBand;
  target: GraphFlowBand;
  label: string;
  startX: number;
  endX: number;
  y: number;
};

const GRAPH_EDGE_LABEL_Z_INDEX = {
  dimmed: 8,
  default: 10,
  connected: 24,
  compared: 26,
  route: 32,
  endpoint: 34,
  preview: 36,
  selected: 42,
} as const;

const GRAPH_NODE_Z_INDEX = {
  dimmed: 18,
  default: 20,
  connected: 30,
  compared: 32,
  route: 34,
  endpoint: 36,
  preview: 38,
  selected: 40,
} as const;

type GraphLayerPriority = keyof typeof GRAPH_NODE_Z_INDEX;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function getMinimapNodeLabel(name: string) {
  if (name.length <= MINIMAP_NODE_LABEL_MAX_LENGTH) {
    return name;
  }

  return `${name.slice(0, MINIMAP_NODE_LABEL_MAX_LENGTH - 1).trimEnd()}…`;
}

function getFlowBandDotClasses(tone: GraphFlowBand["tone"]) {
  return tone === "sink"
    ? "border-amber-500/35 bg-amber-500/18 text-amber-950"
    : tone === "source"
      ? "border-teal-500/35 bg-teal-500/14 text-teal-900"
      : "border-line bg-paper-strong text-ink-600";
}

function getNodeCenter(
  layout: ChemistryGraphLayout,
  nodeId: ChemistryNode["id"],
) {
  const position = layout.nodePositions[nodeId];
  return {
    x: position.x + NODE_WIDTH / 2,
    y: position.y + NODE_HEIGHT / 2,
  };
}

function getRectBoundaryPoint(
  center: { x: number; y: number },
  target: { x: number; y: number },
) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const scale =
    1 /
    Math.max(Math.abs(dx) / (NODE_WIDTH / 2), Math.abs(dy) / (NODE_HEIGHT / 2));

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function getEdgeGeometry(edge: ChemistryEdge, layout: ChemistryGraphLayout) {
  const fromCenter = getNodeCenter(layout, edge.from);
  const toCenter = getNodeCenter(layout, edge.to);
  const bend = layout.edgeCurves[edge.id] ?? 0;
  const midpoint = {
    x: (fromCenter.x + toCenter.x) / 2,
    y: (fromCenter.y + toCenter.y) / 2,
  };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = {
    x: -dy / length,
    y: dx / length,
  };
  const control = {
    x: midpoint.x + normal.x * bend,
    y: midpoint.y + normal.y * bend,
  };
  const start = bend
    ? getRectBoundaryPoint(fromCenter, control)
    : getRectBoundaryPoint(fromCenter, toCenter);
  const end = bend
    ? getRectBoundaryPoint(toCenter, control)
    : getRectBoundaryPoint(toCenter, fromCenter);
  const labelPoint = bend
    ? {
        x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
        y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
      }
    : midpoint;
  const directionAnchorT = 0.66;
  const directionPoint = bend
    ? {
        x:
          (1 - directionAnchorT) ** 2 * start.x +
          2 * (1 - directionAnchorT) * directionAnchorT * control.x +
          directionAnchorT ** 2 * end.x,
        y:
          (1 - directionAnchorT) ** 2 * start.y +
          2 * (1 - directionAnchorT) * directionAnchorT * control.y +
          directionAnchorT ** 2 * end.y,
      }
    : {
        x: start.x + (end.x - start.x) * directionAnchorT,
        y: start.y + (end.y - start.y) * directionAnchorT,
      };
  const tangent = bend
    ? {
        x:
          2 * (1 - directionAnchorT) * (control.x - start.x) +
          2 * directionAnchorT * (end.x - control.x),
        y:
          2 * (1 - directionAnchorT) * (control.y - start.y) +
          2 * directionAnchorT * (end.y - control.y),
      }
    : {
        x: end.x - start.x,
        y: end.y - start.y,
      };
  const directionAngle = Math.atan2(tangent.y, tangent.x) * (180 / Math.PI);

  return {
    path: bend
      ? `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
      : `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    labelPoint,
    directionPoint,
    directionAngle,
  };
}

function isNodeAttachedToEdge(
  nodeId: ChemistryNode["id"],
  edge: ChemistryEdge,
) {
  return edge.from === nodeId || edge.to === nodeId;
}

function buildFitView(
  viewportWidth: number,
  viewportHeight: number,
  bounds: SceneBounds,
): GraphViewState {
  const sceneWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const sceneHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const usableWidth = Math.max(viewportWidth - FIT_MARGIN * 2, 240);
  const usableHeight = Math.max(viewportHeight - FIT_MARGIN * 2, 240);
  const scale = clampScale(
    Math.min(usableWidth / sceneWidth, usableHeight / sceneHeight),
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    scale,
    x: Math.round(viewportWidth / 2 - centerX * scale),
    y: Math.round(viewportHeight / 2 - centerY * scale),
  };
}

function zoomAroundPoint(
  view: GraphViewState,
  factor: number,
  point: { x: number; y: number },
) {
  const nextScale = clampScale(view.scale * factor);
  if (nextScale === view.scale) {
    return view;
  }

  const worldX = (point.x - view.x) / view.scale;
  const worldY = (point.y - view.y) / view.scale;

  return {
    scale: nextScale,
    x: Math.round(point.x - worldX * nextScale),
    y: Math.round(point.y - worldY * nextScale),
  };
}

function clampViewToVisibleScene(
  view: GraphViewState,
  viewportWidth: number,
  viewportHeight: number,
  sceneWidth: number,
  sceneHeight: number,
) {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    sceneWidth <= 0 ||
    sceneHeight <= 0
  ) {
    return view;
  }

  const scaledSceneWidth = sceneWidth * view.scale;
  const scaledSceneHeight = sceneHeight * view.scale;
  const visibleSceneX = Math.min(
    MIN_VISIBLE_SCENE_EDGE,
    viewportWidth / 2,
    scaledSceneWidth / 2,
  );
  const visibleSceneY = Math.min(
    MIN_VISIBLE_SCENE_EDGE,
    viewportHeight / 2,
    scaledSceneHeight / 2,
  );
  const minX = visibleSceneX - scaledSceneWidth;
  const maxX = viewportWidth - visibleSceneX;
  const minY = visibleSceneY - scaledSceneHeight;
  const maxY = viewportHeight - visibleSceneY;

  return {
    ...view,
    x: Math.round(Math.min(maxX, Math.max(minX, view.x))),
    y: Math.round(Math.min(maxY, Math.max(minY, view.y))),
  };
}

function getEdgeLabelCounterScale(viewScale: number) {
  return Math.min(
    MAX_EDGE_LABEL_COUNTER_SCALE,
    Math.max(
      MIN_EDGE_LABEL_COUNTER_SCALE,
      EDGE_LABEL_TARGET_VISUAL_SCALE / viewScale,
    ),
  );
}

function getZoomBoundary(scale: number) {
  if (scale <= MIN_SCALE + ZOOM_BOUNDARY_EPSILON) {
    return "min";
  }

  if (scale >= MAX_SCALE - ZOOM_BOUNDARY_EPSILON) {
    return "max";
  }

  return "within";
}

function getPathwayBias(incoming: number, outgoing: number): PathwayBias {
  const total = incoming + outgoing;

  if (total === 0) {
    return "isolated";
  }

  if (incoming === outgoing) {
    return "balanced";
  }

  return incoming > outgoing ? "incoming-heavy" : "outgoing-heavy";
}

function getVisibleSceneBounds(
  view: GraphViewState,
  viewportSize: ViewportSize,
  sceneWidth: number,
  sceneHeight: number,
): SceneBounds {
  if (viewportSize.width <= 0 || viewportSize.height <= 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: sceneWidth,
      maxY: sceneHeight,
    };
  }

  const minX = Math.max(0, Math.min(sceneWidth, -view.x / view.scale));
  const minY = Math.max(0, Math.min(sceneHeight, -view.y / view.scale));
  const maxX = Math.max(
    minX,
    Math.min(sceneWidth, (viewportSize.width - view.x) / view.scale),
  );
  const maxY = Math.max(
    minY,
    Math.min(sceneHeight, (viewportSize.height - view.y) / view.scale),
  );

  return { minX, minY, maxX, maxY };
}

function shouldHandleGraphKeyboardShortcut(
  target: EventTarget,
  currentTarget: EventTarget,
) {
  if (target === currentTarget) {
    return true;
  }

  if (!(target instanceof Element)) {
    return false;
  }

  return !target.closest("input, textarea, select, [contenteditable='true']");
}

function releasePointerCaptureSafely(
  viewport: HTMLDivElement | null,
  pointerId: number,
) {
  if (!viewport?.releasePointerCapture) {
    return;
  }

  if (viewport.hasPointerCapture && !viewport.hasPointerCapture(pointerId)) {
    return;
  }

  try {
    viewport.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture may already be released by the browser before React handles pointerup.
  }
}

export function ChemistryReactionGraph({
  nodes,
  edges,
  layout,
  selection,
  comparedNodeIds = [],
  comparedEdgeIds = [],
  highlightedNodeIds = [],
  highlightedEdgeIds = [],
  routeNodeIds = [],
  routeEdgeIds = [],
  routeEndpointIds = [],
  dimUnrelated = false,
  className,
  onSelectNode,
  onSelectEdge,
}: ChemistryReactionGraphProps) {
  const t = useTranslations("ChemistryReactionMindMapPage");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fitViewRef = useRef<GraphViewState | null>(INITIAL_VIEW_STATE);
  const hasAdjustedViewRef = useRef(false);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [viewState, setViewState] = useState<GraphViewState>(
    () => INITIAL_VIEW_STATE,
  );
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<
    ChemistryNode["id"] | null
  >(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<
    ChemistryEdge["id"] | null
  >(null);
  const nodeNameById = useMemo(
    () =>
      new Map<ChemistryNode["id"], string>(
        nodes.map((node) => [node.id, node.name]),
      ),
    [nodes],
  );
  const selectedEdge =
    selection?.kind === "edge"
      ? (edges.find((edge) => edge.id === selection.id) ?? null)
      : null;
  const hoveredEdge = hoveredEdgeId
    ? (edges.find((edge) => edge.id === hoveredEdgeId) ?? null)
    : null;
  const directionEdge = hoveredEdge ?? selectedEdge;
  const compareActive = comparedNodeIds.length > 0;
  const comparedNodeSet = useMemo(
    () => new Set(comparedNodeIds),
    [comparedNodeIds],
  );
  const comparedEdgeSet = useMemo(
    () => new Set(comparedEdgeIds),
    [comparedEdgeIds],
  );
  const highlightedNodeSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds],
  );
  const highlightedEdgeSet = useMemo(
    () => new Set(highlightedEdgeIds),
    [highlightedEdgeIds],
  );
  const routeNodeSet = useMemo(() => new Set(routeNodeIds), [routeNodeIds]);
  const routeEdgeSet = useMemo(() => new Set(routeEdgeIds), [routeEdgeIds]);
  const nodePathwayStats = useMemo(() => {
    const stats = new Map<
      ChemistryNode["id"],
      { incoming: number; outgoing: number; total: number }
    >();

    nodes.forEach((node) => {
      stats.set(node.id, { incoming: 0, outgoing: 0, total: 0 });
    });

    edges.forEach((edge) => {
      const sourceStats = stats.get(edge.from);
      const targetStats = stats.get(edge.to);

      if (sourceStats) {
        sourceStats.outgoing += 1;
        sourceStats.total += 1;
      }

      if (targetStats) {
        targetStats.incoming += 1;
        targetStats.total += 1;
      }
    });

    return stats;
  }, [edges, nodes]);
  const routeEdgeStepMap = useMemo(
    () => new Map(routeEdgeIds.map((edgeId, index) => [edgeId, index + 1])),
    [routeEdgeIds],
  );
  const routeNodeStepMap = useMemo(
    () => new Map(routeNodeIds.map((nodeId, index) => [nodeId, index + 1])),
    [routeNodeIds],
  );
  const routeProgressSteps = useMemo(
    () =>
      routeEdgeIds.flatMap((edgeId, index) => {
        const edge = edges.find((candidateEdge) => candidateEdge.id === edgeId);
        if (!edge) {
          return [];
        }

        return [
          {
            edge,
            step: index + 1,
            sourceName: nodeNameById.get(edge.from) ?? edge.from,
            targetName: nodeNameById.get(edge.to) ?? edge.to,
          },
        ];
      }),
    [edges, nodeNameById, routeEdgeIds],
  );
  const routeEndpointSet = useMemo(
    () => new Set(routeEndpointIds),
    [routeEndpointIds],
  );
  const hoveredTraceNodeSet = useMemo(() => {
    const tracedNodeIds = new Set<ChemistryNode["id"]>();

    if (hoveredNodeId) {
      tracedNodeIds.add(hoveredNodeId);
      edges.forEach((edge) => {
        if (isNodeAttachedToEdge(hoveredNodeId, edge)) {
          tracedNodeIds.add(edge.from);
          tracedNodeIds.add(edge.to);
        }
      });
    }

    if (hoveredEdge) {
      tracedNodeIds.add(hoveredEdge.from);
      tracedNodeIds.add(hoveredEdge.to);
    }

    return tracedNodeIds;
  }, [edges, hoveredEdge, hoveredNodeId]);
  const hoveredTraceEdgeSet = useMemo(() => {
    const tracedEdgeIds = new Set<ChemistryEdge["id"]>();

    if (hoveredEdgeId) {
      tracedEdgeIds.add(hoveredEdgeId);
    }

    if (hoveredNodeId) {
      edges.forEach((edge) => {
        if (isNodeAttachedToEdge(hoveredNodeId, edge)) {
          tracedEdgeIds.add(edge.id);
        }
      });
    }

    return tracedEdgeIds;
  }, [edges, hoveredEdgeId, hoveredNodeId]);
  const hoverTraceActive =
    hoveredTraceNodeSet.size > 0 || hoveredTraceEdgeSet.size > 0;
  const routeActive = routeNodeIds.length > 0 || routeEdgeIds.length > 0;
  const routeNodeCount = routeNodeIds.length;
  const routeProgressSummary = useMemo(() => {
    if (!routeActive) {
      return null;
    }

    const startNodeId = routeNodeIds[0];
    const targetNodeId = routeNodeIds[routeNodeIds.length - 1];
    const startName = startNodeId
      ? (nodeNameById.get(startNodeId) ?? startNodeId)
      : null;
    const targetName = targetNodeId
      ? (nodeNameById.get(targetNodeId) ?? targetNodeId)
      : null;
    if (startName && targetName) {
      return t("graphStatus.routeSummary", {
        start: startName,
        target: targetName,
        steps: routeEdgeIds.length,
      });
    }

    return t("graphStatus.routeSummaryFallback", {
      steps: routeEdgeIds.length,
    });
  }, [nodeNameById, routeActive, routeEdgeIds.length, routeNodeIds, t]);
  const sceneWidth = layout.width + SCENE_PADDING * 2;
  const sceneHeight = layout.height + SCENE_PADDING * 2;
  const graphFlowBands = useMemo<GraphFlowBand[]>(() => {
    const segmentWidth = layout.width / 3;
    const bandOverlap = 36;
    const bandY = SCENE_PADDING / 2;
    const bandHeight = layout.height + SCENE_PADDING;

    return [
      {
        id: "entry",
        order: 1,
        tone: "source",
        x: SCENE_PADDING - bandOverlap,
        y: bandY,
        width: segmentWidth + bandOverlap * 2,
        height: bandHeight,
      },
      {
        id: "relay",
        order: 2,
        tone: "hub",
        x: SCENE_PADDING + segmentWidth - bandOverlap,
        y: bandY,
        width: segmentWidth + bandOverlap * 2,
        height: bandHeight,
      },
      {
        id: "product",
        order: 3,
        tone: "sink",
        x: SCENE_PADDING + segmentWidth * 2 - bandOverlap,
        y: bandY,
        width: segmentWidth + bandOverlap * 2,
        height: bandHeight,
      },
    ];
  }, [layout.height, layout.width]);
  const graphFlowBandLabels = useMemo<Record<GraphFlowBand["id"], string>>(
    () => ({
      entry: t("graphStatus.flow.entry"),
      relay: t("graphStatus.flow.relay"),
      product: t("graphStatus.flow.product"),
    }),
    [t],
  );
  const graphFlowSpine = useMemo<GraphFlowSpine>(() => {
    const spineStartX = SCENE_PADDING + NODE_WIDTH / 2;
    const spineEndX = SCENE_PADDING + layout.width - NODE_WIDTH / 2;
    const spineY = SCENE_PADDING + layout.height / 2;
    const spineLength = spineEndX - spineStartX;

    return {
      startX: spineStartX,
      endX: spineEndX,
      y: spineY,
      checkpoints: [
        spineStartX + spineLength * 0.24,
        spineStartX + spineLength * 0.5,
        spineStartX + spineLength * 0.76,
      ],
    };
  }, [layout.height, layout.width]);
  const visibleSceneBounds = useMemo(
    () =>
      getVisibleSceneBounds(viewState, viewportSize, sceneWidth, sceneHeight),
    [sceneHeight, sceneWidth, viewState, viewportSize],
  );
  const visibleSceneWindowWidth = Math.max(
    1,
    visibleSceneBounds.maxX - visibleSceneBounds.minX,
  );
  const visibleSceneWindowHeight = Math.max(
    1,
    visibleSceneBounds.maxY - visibleSceneBounds.minY,
  );
  const visibleSceneCoveragePercent = Math.round(
    Math.min(
      100,
      Math.max(
        1,
        ((visibleSceneWindowWidth * visibleSceneWindowHeight) /
          (sceneWidth * sceneHeight)) *
          100,
      ),
    ),
  );
  const showLeftPanAffordance =
    visibleSceneBounds.minX > PAN_AFFORDANCE_THRESHOLD;
  const showRightPanAffordance =
    visibleSceneBounds.maxX < sceneWidth - PAN_AFFORDANCE_THRESHOLD;
  const showTopPanAffordance =
    visibleSceneBounds.minY > PAN_AFFORDANCE_THRESHOLD;
  const showBottomPanAffordance =
    visibleSceneBounds.maxY < sceneHeight - PAN_AFFORDANCE_THRESHOLD;
  const activePanAffordanceEdges = [
    showLeftPanAffordance ? "left" : null,
    showRightPanAffordance ? "right" : null,
    showTopPanAffordance ? "top" : null,
    showBottomPanAffordance ? "bottom" : null,
  ]
    .filter(Boolean)
    .join(" ") || "none";
  const edgeLabelCounterScale = getEdgeLabelCounterScale(viewState.scale);
  const zoomPercent = Math.round(viewState.scale * 100);
  const zoomBoundary = getZoomBoundary(viewState.scale);
  const graphDescriptionIds = joinClasses(
    "chemistry-interaction-guidance",
    "chemistry-graph-keyboard-guidance",
    "chemistry-graph-legend",
    "chemistry-graph-camera-status",
    "chemistry-graph-scope-status",
    "chemistry-graph-flow-status",
    "chemistry-graph-preview-status",
    routeProgressSummary ? "chemistry-graph-route-progress" : undefined,
  );
  const activeCameraSummary = useMemo(() => {
    const getNodeName = (nodeId: ChemistryNode["id"]) =>
      nodeNameById.get(nodeId) ?? nodeId;

    if (compareActive) {
      const comparedNames = comparedNodeIds.map(getNodeName).join(" ↔ ");
      return comparedNames
        ? t("graphStatus.camera.compare", { names: comparedNames })
        : t("graphStatus.camera.compareFallback");
    }

    if (selection?.kind === "node") {
      return t("graphStatus.camera.node", { name: getNodeName(selection.id) });
    }

    if (selection?.kind === "edge" && selectedEdge) {
      return t("graphStatus.camera.edge", {
        source: getNodeName(selectedEdge.from),
        target: getNodeName(selectedEdge.to),
      });
    }

    if (routeActive) {
      const firstRouteNodeId = routeNodeIds[0];
      const lastRouteNodeId = routeNodeIds[routeNodeIds.length - 1];

      if (firstRouteNodeId && lastRouteNodeId) {
        return t("graphStatus.camera.route", {
          start: getNodeName(firstRouteNodeId),
          target: getNodeName(lastRouteNodeId),
        });
      }

      return t("graphStatus.camera.routeFallback");
    }

    return t("graphStatus.camera.graph");
  }, [
    compareActive,
    comparedNodeIds,
    nodeNameById,
    routeActive,
    routeNodeIds,
    selectedEdge,
    selection,
    t,
  ]);
  const shiftedLayout = useMemo<ChemistryGraphLayout>(
    () => ({
      ...layout,
      nodePositions: Object.fromEntries(
        Object.entries(layout.nodePositions).map(([id, position]) => [
          id,
          { x: position.x + SCENE_PADDING, y: position.y + SCENE_PADDING },
        ]),
      ) as ChemistryGraphLayout["nodePositions"],
    }),
    [layout],
  );
  const activeCamera = useMemo(() => {
    if (compareActive) {
      return {
        mode: "compare" as const,
        nodeIds: comparedNodeIds,
      };
    }

    if (selection?.kind === "node") {
      return {
        mode: "node" as const,
        nodeIds: [selection.id],
      };
    }

    if (selection?.kind === "edge" && selectedEdge) {
      return {
        mode: "edge" as const,
        nodeIds: [selectedEdge.from, selectedEdge.to],
      };
    }

    if (routeActive) {
      return {
        mode: "route" as const,
        nodeIds: routeNodeIds,
      };
    }

    return {
      mode: "graph" as const,
      nodeIds: [] as ChemistryNode["id"][],
    };
  }, [
    comparedNodeIds,
    compareActive,
    routeActive,
    routeNodeIds,
    selectedEdge,
    selection,
  ]);
  const activeCameraKey = `${activeCamera.mode}:${activeCamera.nodeIds.join("|")}`;
  const activeGraphFlowBandSet = useMemo<
    ReadonlySet<GraphFlowBand["id"]>
  >(() => {
    if (!activeCamera.nodeIds.length) {
      return new Set();
    }

    const activeBandIds = new Set<GraphFlowBand["id"]>();
    activeCamera.nodeIds.forEach((nodeId) => {
      const position = layout.nodePositions[nodeId];
      if (!position) {
        return;
      }

      const nodeCenterX = position.x + SCENE_PADDING + NODE_WIDTH / 2;
      graphFlowBands.forEach((band) => {
        if (nodeCenterX >= band.x && nodeCenterX <= band.x + band.width) {
          activeBandIds.add(band.id);
        }
      });
    });

    return activeBandIds;
  }, [activeCamera.nodeIds, graphFlowBands, layout.nodePositions]);
  const activeGraphFlowBandIds = useMemo(
    () =>
      graphFlowBands
        .filter((band) => activeGraphFlowBandSet.has(band.id))
        .map((band) => band.id),
    [activeGraphFlowBandSet, graphFlowBands],
  );
  const activeGraphFlowSummary = activeGraphFlowBandIds.length
    ? activeGraphFlowBandIds
        .map((bandId) => graphFlowBandLabels[bandId])
        .join(" → ")
    : t("graphStatus.flow.allStages");
  const graphFlowCorridors = useMemo<GraphFlowCorridor[]>(
    () =>
      graphFlowBands.slice(0, -1).flatMap((source, index) => {
        const target = graphFlowBands[index + 1];
        if (!target) {
          return [];
        }

        return [
          {
            id: `${source.id}-${target.id}`,
            source,
            target,
            label: `${source.order}→${target.order}`,
            startX: source.x + source.width - 64,
            endX: target.x + 64,
            y: graphFlowSpine.y,
          },
        ];
      }),
    [graphFlowBands, graphFlowSpine.y],
  );
  const nodeFlowBandById = useMemo(() => {
    const nodeFlowBands = new Map<ChemistryNode["id"], GraphFlowBand>();
    const segmentWidth = layout.width / graphFlowBands.length;

    nodes.forEach((node) => {
      const position = layout.nodePositions[node.id];
      if (!position) {
        return;
      }

      const nodeCenterX = position.x + NODE_WIDTH / 2;
      const bandIndex = Math.min(
        graphFlowBands.length - 1,
        Math.max(0, Math.floor(nodeCenterX / segmentWidth)),
      );
      const flowBand = graphFlowBands[bandIndex];
      if (flowBand) {
        nodeFlowBands.set(node.id, flowBand);
      }
    });

    return nodeFlowBands;
  }, [graphFlowBands, layout.nodePositions, layout.width, nodes]);
  const edgeFlowTransitionById = useMemo(() => {
    const edgeFlowTransitions = new Map<
      ChemistryEdge["id"],
      GraphFlowTransition
    >();

    edges.forEach((edge) => {
      const sourceBand = nodeFlowBandById.get(edge.from);
      const targetBand = nodeFlowBandById.get(edge.to);
      if (!sourceBand || !targetBand) {
        return;
      }

      edgeFlowTransitions.set(edge.id, {
        source: sourceBand,
        target: targetBand,
        label: `${sourceBand.order}→${targetBand.order}`,
        crossesBand: sourceBand.id !== targetBand.id,
      });
    });

    return edgeFlowTransitions;
  }, [edges, nodeFlowBandById]);
  const activeCameraBounds = useMemo<SceneBounds>(() => {
    if (!activeCamera.nodeIds.length) {
      return {
        minX: 0,
        minY: 0,
        maxX: sceneWidth,
        maxY: sceneHeight,
      };
    }

    const uniqueNodeIds = [...new Set(activeCamera.nodeIds)];
    const nodeBounds = uniqueNodeIds
      .map((nodeId) => layout.nodePositions[nodeId])
      .filter(Boolean)
      .map((position) => ({
        minX: position.x + SCENE_PADDING,
        minY: position.y + SCENE_PADDING,
        maxX: position.x + SCENE_PADDING + NODE_WIDTH,
        maxY: position.y + SCENE_PADDING + NODE_HEIGHT,
      }));

    if (!nodeBounds.length) {
      return {
        minX: 0,
        minY: 0,
        maxX: sceneWidth,
        maxY: sceneHeight,
      };
    }

    return {
      minX: Math.max(
        Math.min(...nodeBounds.map((bounds) => bounds.minX)) - CONTEXT_PADDING,
        0,
      ),
      minY: Math.max(
        Math.min(...nodeBounds.map((bounds) => bounds.minY)) - CONTEXT_PADDING,
        0,
      ),
      maxX: Math.min(
        Math.max(...nodeBounds.map((bounds) => bounds.maxX)) + CONTEXT_PADDING,
        sceneWidth,
      ),
      maxY: Math.min(
        Math.max(...nodeBounds.map((bounds) => bounds.maxY)) + CONTEXT_PADDING,
        sceneHeight,
      ),
    };
  }, [activeCamera, layout.nodePositions, sceneHeight, sceneWidth]);
  const activeScopeMetrics = useMemo(() => {
    const scopedNodeIds = new Set<ChemistryNode["id"]>();
    const scopedEdgeIds = new Set<ChemistryEdge["id"]>();

    const addActiveNodes = (nodeIds: readonly ChemistryNode["id"][]) => {
      nodeIds.forEach((nodeId) => scopedNodeIds.add(nodeId));
    };
    const addEdgesAttachedToActiveNodes = () => {
      edges.forEach((edge) => {
        if (scopedNodeIds.has(edge.from) || scopedNodeIds.has(edge.to)) {
          scopedEdgeIds.add(edge.id);
        }
      });
    };

    if (activeCamera.mode === "graph") {
      addActiveNodes(nodes.map((node) => node.id));
      edges.forEach((edge) => scopedEdgeIds.add(edge.id));
    } else if (activeCamera.mode === "edge" && selectedEdge) {
      addActiveNodes([selectedEdge.from, selectedEdge.to]);
      scopedEdgeIds.add(selectedEdge.id);
    } else if (activeCamera.mode === "compare") {
      addActiveNodes(activeCamera.nodeIds);
      comparedEdgeIds.forEach((edgeId) => scopedEdgeIds.add(edgeId));
    } else if (activeCamera.mode === "route") {
      addActiveNodes(activeCamera.nodeIds);
      routeEdgeIds.forEach((edgeId) => scopedEdgeIds.add(edgeId));
    } else {
      addActiveNodes(activeCamera.nodeIds);
      addEdgesAttachedToActiveNodes();
    }

    return {
      edgeCount: scopedEdgeIds.size,
      nodeCount: scopedNodeIds.size,
    };
  }, [activeCamera, comparedEdgeIds, edges, nodes, routeEdgeIds, selectedEdge]);
  const activeScopeSummary = t("graphStatus.activeView", {
    nodes: activeScopeMetrics.nodeCount,
    pathways: activeScopeMetrics.edgeCount,
  });
  const interactionPreviewSummary = useMemo(() => {
    const getNodeName = (nodeId: ChemistryNode["id"]) =>
      nodeNameById.get(nodeId) ?? nodeId;

    if (hoveredEdge) {
      return t("graphStatus.preview.edge", {
        source: getNodeName(hoveredEdge.from),
        target: getNodeName(hoveredEdge.to),
        label: hoveredEdge.label,
      });
    }

    if (hoveredNodeId) {
      const connectedPathwayCount = edges.filter((edge) =>
        isNodeAttachedToEdge(hoveredNodeId, edge),
      ).length;

      return t("graphStatus.preview.node", {
        name: getNodeName(hoveredNodeId),
        count: connectedPathwayCount,
      });
    }

    return t("graphStatus.preview.idle");
  }, [edges, hoveredEdge, hoveredNodeId, nodeNameById, t]);
  const tracePreview = useMemo(() => {
    const getNodeName = (nodeId: ChemistryNode["id"]) =>
      nodeNameById.get(nodeId) ?? nodeId;

    if (hoveredEdge) {
      return {
        kind: "pathway" as const,
        title: hoveredEdge.label,
        detail: `${getNodeName(hoveredEdge.from)} → ${getNodeName(hoveredEdge.to)}`,
        meta: hoveredEdge.reactionType,
      };
    }

    if (hoveredNodeId) {
      const stats = nodePathwayStats.get(hoveredNodeId) ?? {
        incoming: 0,
        outgoing: 0,
        total: 0,
      };

      return {
        kind: "node" as const,
        title: getNodeName(hoveredNodeId),
        detail: t("graphStatus.trace.nodeDetail", { count: stats.total }),
        meta: t("graphStatus.trace.nodeMeta", {
          incoming: stats.incoming,
          outgoing: stats.outgoing,
        }),
      };
    }

    return null;
  }, [hoveredEdge, hoveredNodeId, nodeNameById, nodePathwayStats, t]);
  const showActiveCameraFrame = activeCamera.nodeIds.length > 0;
  const activeCameraFrameTone =
    activeCamera.mode === "route" ? "route" : "focus";
  const activeCameraModeLabel =
    activeCamera.mode === "graph"
      ? t("graphStatus.cameraModes.full")
      : activeCamera.mode === "route"
        ? t("graphStatus.cameraModes.route")
        : activeCamera.mode === "compare"
          ? t("graphStatus.cameraModes.compare")
          : t("graphStatus.cameraModes.focus");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const updateFitView = () => {
      const nextViewportSize = {
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      };
      const nextFit = buildFitView(
        nextViewportSize.width,
        nextViewportSize.height,
        activeCameraBounds,
      );

      setViewportSize((current) =>
        current.width === nextViewportSize.width &&
        current.height === nextViewportSize.height
          ? current
          : nextViewportSize,
      );
      fitViewRef.current = nextFit;
      if (!hasAdjustedViewRef.current) {
        setViewState(nextFit);
      }
    };

    hasAdjustedViewRef.current = false;
    updateFitView();

    const observer = new ResizeObserver(() => {
      updateFitView();
    });
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [activeCameraBounds, activeCameraKey]);

  const handleZoom = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    hasAdjustedViewRef.current = true;
    setViewState((current) =>
      clampViewToVisibleScene(
        zoomAroundPoint(current, factor, {
          x: viewport.clientWidth / 2,
          y: viewport.clientHeight / 2,
        }),
        viewport.clientWidth,
        viewport.clientHeight,
        sceneWidth,
        sceneHeight,
      ),
    );
  };

  const handleZoomSliderChange = (
    event: ReactChangeEvent<HTMLInputElement>,
  ) => {
    const viewport = viewportRef.current;
    const nextScale = Number(event.currentTarget.value) / 100;
    if (!viewport || !Number.isFinite(nextScale)) {
      return;
    }

    hasAdjustedViewRef.current = true;
    setViewState((current) =>
      clampViewToVisibleScene(
        zoomAroundPoint(current, nextScale / current.scale, {
          x: viewport.clientWidth / 2,
          y: viewport.clientHeight / 2,
        }),
        viewport.clientWidth,
        viewport.clientHeight,
        sceneWidth,
        sceneHeight,
      ),
    );
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    event.preventDefault();
    hasAdjustedViewRef.current = true;

    if (event.ctrlKey || event.metaKey) {
      const viewportBox = viewport.getBoundingClientRect();
      const zoomFactor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      setViewState((current) =>
        clampViewToVisibleScene(
          zoomAroundPoint(current, zoomFactor, {
            x: event.clientX - viewportBox.left,
            y: event.clientY - viewportBox.top,
          }),
          viewport.clientWidth,
          viewport.clientHeight,
          sceneWidth,
          sceneHeight,
        ),
      );
      return;
    }

    setViewState((current) =>
      clampViewToVisibleScene(
        {
          ...current,
          x: Math.round(current.x - event.deltaX),
          y: Math.round(current.y - event.deltaY),
        },
        viewport.clientWidth,
        viewport.clientHeight,
        sceneWidth,
        sceneHeight,
      ),
    );
  };

  const resetView = () => {
    if (!fitViewRef.current) {
      return;
    }
    hasAdjustedViewRef.current = false;
    setViewState(fitViewRef.current);
  };

  const handleKeyboardNavigation = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (!shouldHandleGraphKeyboardShortcut(event.target, event.currentTarget)) {
      return;
    }

    const panBy = (deltaX: number, deltaY: number) => {
      event.preventDefault();
      hasAdjustedViewRef.current = true;
      const viewportWidth = event.currentTarget.clientWidth;
      const viewportHeight = event.currentTarget.clientHeight;
      setViewState((current) =>
        clampViewToVisibleScene(
          {
            ...current,
            x: Math.round(current.x + deltaX),
            y: Math.round(current.y + deltaY),
          },
          viewportWidth,
          viewportHeight,
          sceneWidth,
          sceneHeight,
        ),
      );
    };

    switch (event.key) {
      case "ArrowUp":
        panBy(0, KEYBOARD_PAN_STEP);
        break;
      case "ArrowDown":
        panBy(0, -KEYBOARD_PAN_STEP);
        break;
      case "ArrowLeft":
        panBy(KEYBOARD_PAN_STEP, 0);
        break;
      case "ArrowRight":
        panBy(-KEYBOARD_PAN_STEP, 0);
        break;
      case "+":
      case "=":
        event.preventDefault();
        handleZoom(ZOOM_FACTOR);
        break;
      case "-":
      case "_":
        event.preventDefault();
        handleZoom(1 / ZOOM_FACTOR);
        break;
      case "0":
        event.preventDefault();
        resetView();
        break;
      default:
        break;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | SVGElement;

    if (
      target instanceof Element &&
      target.closest("[data-chem-interactive='true']")
    ) {
      return;
    }

    event.currentTarget.focus({ preventScroll: true });
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewState.x,
      originY: viewState.y,
    };
    viewportRef.current?.setPointerCapture?.(event.pointerId);
    setIsPanning(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !dragRef.current.active ||
      dragRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    hasAdjustedViewRef.current = true;
    const viewportWidth = event.currentTarget.clientWidth;
    const viewportHeight = event.currentTarget.clientHeight;
    setViewState((current) =>
      clampViewToVisibleScene(
        {
          ...current,
          x: Math.round(
            dragRef.current.originX + (event.clientX - dragRef.current.startX),
          ),
          y: Math.round(
            dragRef.current.originY + (event.clientY - dragRef.current.startY),
          ),
        },
        viewportWidth,
        viewportHeight,
        sceneWidth,
        sceneHeight,
      ),
    );
  };

  const endPan = (pointerId: number) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== pointerId) {
      return;
    }

    releasePointerCaptureSafely(viewportRef.current, pointerId);
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    setIsPanning(false);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (viewportRef.current?.hasPointerCapture?.(event.pointerId)) {
      return;
    }

    endPan(event.pointerId);
  };

  return (
    <div
      className={joinClasses(
        "flex h-full min-h-0 flex-col gap-2 overflow-hidden",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 min-[1100px]:flex-nowrap">
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 text-xs text-ink-700 [scrollbar-width:thin] [&>span]:shrink-0">
          <span className="rounded-full border border-line bg-paper px-2.5 py-1.5">
            {t("navigation.dragHint")}
          </span>
          <span
            id="chemistry-graph-zoom-status"
            aria-live="polite"
            data-testid="chem-zoom-status"
            className="rounded-full border border-line bg-paper px-2.5 py-1.5"
          >
            {t("navigation.zoom", { percent: zoomPercent })}
          </span>
          <span
            id="chemistry-graph-camera-status"
            aria-live="polite"
            data-testid="chem-camera-status"
            className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1.5 font-medium text-teal-900"
          >
            {activeCameraSummary}
          </span>
          <span
            id="chemistry-graph-scope-status"
            aria-live="polite"
            data-testid="chem-scope-status"
            data-chem-scope-summary={activeScopeSummary}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 font-medium text-ink-700 max-[1279px]:sr-only"
          >
            {activeScopeSummary}
          </span>
          <span
            id="chemistry-graph-flow-status"
            aria-live="polite"
            data-testid="chem-flow-status"
            data-chem-active-flow-summary={activeGraphFlowSummary}
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 font-medium text-ink-700 max-[1279px]:sr-only"
          >
            {t("graphStatus.flow.active", { stages: activeGraphFlowSummary })}
          </span>
          <span
            id="chemistry-graph-preview-status"
            aria-live="polite"
            data-testid="chem-preview-status"
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 font-medium text-ink-700 max-[1279px]:sr-only"
          >
            {interactionPreviewSummary}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <label
            data-testid="chem-zoom-slider-control"
            className="flex min-w-[8.5rem] items-center gap-2 rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs text-ink-700 shadow-sm"
          >
            <span className="sr-only">
              {t("navigation.zoom", { percent: zoomPercent })}
            </span>
            <input
              type="range"
              data-testid="chem-zoom-slider"
              min={MIN_SCALE_PERCENT}
              max={MAX_SCALE_PERCENT}
              step="1"
              value={zoomPercent}
              aria-labelledby="chemistry-graph-zoom-status"
              aria-valuetext={`${zoomPercent}%`}
              className="h-2 w-24 accent-teal-600 sm:w-28"
              onChange={handleZoomSliderChange}
            />
          </label>
          <button
            type="button"
            data-testid="chem-zoom-out"
            disabled={zoomBoundary === "min"}
            aria-disabled={zoomBoundary === "min"}
            className={joinClasses(
              "rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
              zoomBoundary === "min"
                ? "cursor-not-allowed opacity-50"
                : "hover:border-ink-950/20 hover:bg-paper-strong",
            )}
            onClick={() => handleZoom(1 / ZOOM_FACTOR)}
          >
            {t("navigation.zoomOut")}
          </button>
          <button
            type="button"
            data-testid="chem-zoom-in"
            disabled={zoomBoundary === "max"}
            aria-disabled={zoomBoundary === "max"}
            className={joinClasses(
              "rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
              zoomBoundary === "max"
                ? "cursor-not-allowed opacity-50"
                : "hover:border-ink-950/20 hover:bg-paper-strong",
            )}
            onClick={() => handleZoom(ZOOM_FACTOR)}
          >
            {t("navigation.zoomIn")}
          </button>
          <button
            type="button"
            data-testid="chem-fit-view"
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            onClick={resetView}
          >
            {t("navigation.fitToView")}
          </button>
        </div>
      </div>
      <div
        data-testid="chem-keyboard-shortcuts"
        className="flex flex-wrap items-center gap-2 text-xs text-ink-600 min-[1100px]:sr-only"
      >
        <span className="font-semibold uppercase tracking-[0.16em] text-ink-500">
          {t("navigation.shortcutsLabel")}
        </span>
        <span className="rounded-full border border-line/80 bg-paper/85 px-2.5 py-1">
          {t("navigation.shortcutPan")}
        </span>
        <span className="rounded-full border border-line/80 bg-paper/85 px-2.5 py-1">
          {t("navigation.shortcutZoom")}
        </span>
        <span className="rounded-full border border-line/80 bg-paper/85 px-2.5 py-1">
          {t("navigation.shortcutFit")}
        </span>
      </div>
      <div
        data-testid="chem-graph-flow-rail"
        data-chem-active-flow-bands={activeGraphFlowBandIds.join(" ")}
        data-chem-active-flow-summary={activeGraphFlowSummary}
        className="grid gap-2 rounded-[20px] border border-line/70 bg-paper/82 p-3 text-xs text-ink-600 shadow-sm min-[640px]:grid-cols-[auto_1fr] min-[640px]:items-center min-[1100px]:sr-only"
      >
        <span className="font-semibold uppercase tracking-[0.16em] text-ink-500">
          {t("graphStatus.flow.active", { stages: activeGraphFlowSummary })}
        </span>
        <ol
          aria-label={t("graphStatus.flow.active", {
            stages: activeGraphFlowSummary,
          })}
          className="grid gap-2 min-[640px]:grid-cols-[1fr_auto_1fr_auto_1fr] min-[640px]:items-center"
        >
          {graphFlowBands.map((band, index) => {
            const flowBandActive = activeGraphFlowBandSet.has(band.id);
            const nextBand = graphFlowBands[index + 1];
            const connectorActive = nextBand
              ? activeGraphFlowBandSet.has(band.id) &&
                activeGraphFlowBandSet.has(nextBand.id)
              : false;

            return (
              <li
                key={band.id}
                data-testid={`chem-flow-rail-stage-${band.id}`}
                data-chem-flow-band={band.id}
                data-chem-flow-order={band.order}
                data-chem-flow-tone={band.tone}
                data-chem-flow-active={flowBandActive ? "true" : "false"}
                aria-current={flowBandActive ? "step" : undefined}
                className="contents"
              >
                <span
                  className={joinClasses(
                    "flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 font-semibold transition-colors",
                    flowBandActive
                      ? band.tone === "sink"
                        ? "border-amber-500/45 bg-amber-500/14 text-amber-950"
                        : "border-teal-500/40 bg-teal-500/12 text-teal-900"
                      : band.tone === "hub"
                        ? "border-line/75 bg-paper-strong/75 text-ink-600"
                        : "border-line/75 bg-paper/78 text-ink-600",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={joinClasses(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[0.66rem] font-black leading-none",
                      flowBandActive
                        ? band.tone === "sink"
                          ? "bg-amber-500 text-ink-950"
                          : "bg-teal-500 text-white"
                        : "bg-ink-500/10 text-ink-600",
                    )}
                  >
                    {band.order}
                  </span>
                  <span className="min-w-0 truncate">
                    {graphFlowBandLabels[band.id]}
                  </span>
                </span>
                {nextBand ? (
                  <span
                    aria-hidden="true"
                    data-testid={`chem-flow-rail-connector-${band.id}-${nextBand.id}`}
                    data-chem-flow-source={band.id}
                    data-chem-flow-target={nextBand.id}
                    data-chem-flow-transition={`${band.order}→${nextBand.order}`}
                    data-chem-flow-active={connectorActive ? "true" : "false"}
                    className={joinClasses(
                      "hidden h-0.5 min-w-5 rounded-full min-[640px]:block",
                      connectorActive
                        ? nextBand.tone === "sink"
                          ? "bg-amber-500/70"
                          : "bg-teal-500/70"
                        : "bg-line",
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div
        id="chemistry-graph-legend"
        data-testid="chem-graph-legend"
        data-chem-legend="direction focus route"
        className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line/70 bg-paper/80 px-3 py-2 text-xs text-ink-600 shadow-sm min-[1100px]:sr-only"
      >
        <span className="font-semibold uppercase tracking-[0.16em] text-ink-500">
          {t("graphStatus.legend.label")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-strong px-2.5 py-1">
          <span
            aria-hidden="true"
            className="h-0.5 w-6 rounded-full bg-ink-500"
          />
          {t("graphStatus.legend.direction")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-1 text-teal-900">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-teal-500"
          />
          {t("graphStatus.legend.focus")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-950">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-amber-500"
          />
          {t("graphStatus.legend.route")}
        </span>
      </div>
      <p id="chemistry-graph-keyboard-guidance" className="sr-only">
        {t("navigation.keyboardGuidance")}
      </p>

      <div
        ref={viewportRef}
        data-testid="chemistry-graph-viewport"
        data-chem-scale={viewState.scale.toFixed(3)}
        data-chem-offset-x={viewState.x}
        data-chem-offset-y={viewState.y}
        data-chem-camera-mode={activeCamera.mode}
        data-chem-fit-scope={
          activeCamera.mode === "graph" ? "full-graph" : "active-context"
        }
        data-chem-scope-nodes={activeScopeMetrics.nodeCount}
        data-chem-scope-pathways={activeScopeMetrics.edgeCount}
        data-chem-active-flow-bands={activeGraphFlowBandIds.join(" ")}
        data-chem-active-flow-summary={activeGraphFlowSummary}
        data-chem-visible-coverage={visibleSceneCoveragePercent}
        data-chem-trace-active={hoverTraceActive ? "true" : "false"}
        data-chem-pan-guard="visible-scene"
        data-chem-zoom-boundary={zoomBoundary}
        role="region"
        tabIndex={0}
        aria-label={t("navigation.dragHint")}
        aria-describedby={graphDescriptionIds}
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - 0"
        className={joinClasses(
          "relative min-h-[28rem] flex-1 overflow-hidden rounded-[22px] border border-line bg-paper-strong/70 select-none touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper min-[1100px]:min-h-0",
          isPanning ? "cursor-grabbing" : "cursor-grab",
        )}
        onWheel={handleWheel}
        onKeyDown={handleKeyboardNavigation}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => endPan(event.pointerId)}
        onPointerCancel={(event) => endPan(event.pointerId)}
        onPointerLeave={handlePointerLeave}
        onLostPointerCapture={(event) => endPan(event.pointerId)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,28,36,0.04)_0,transparent_58%)]" />
        <div
          aria-hidden="true"
          data-testid="chem-pan-affordance"
          data-chem-pan-edges={activePanAffordanceEdges}
          data-chem-pan-left={showLeftPanAffordance ? "true" : "false"}
          data-chem-pan-right={showRightPanAffordance ? "true" : "false"}
          data-chem-pan-top={showTopPanAffordance ? "true" : "false"}
          data-chem-pan-bottom={showBottomPanAffordance ? "true" : "false"}
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[24px]"
        >
          <span
            data-testid="chem-pan-affordance-left"
            className={joinClasses(
              "absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-ink-950/14 to-transparent transition-opacity",
              showLeftPanAffordance ? "opacity-100" : "opacity-0",
            )}
          />
          <span
            data-testid="chem-pan-affordance-right"
            className={joinClasses(
              "absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-ink-950/14 to-transparent transition-opacity",
              showRightPanAffordance ? "opacity-100" : "opacity-0",
            )}
          />
          <span
            data-testid="chem-pan-affordance-top"
            className={joinClasses(
              "absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-ink-950/12 to-transparent transition-opacity",
              showTopPanAffordance ? "opacity-100" : "opacity-0",
            )}
          />
          <span
            data-testid="chem-pan-affordance-bottom"
            className={joinClasses(
              "absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink-950/12 to-transparent transition-opacity",
              showBottomPanAffordance ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
        {tracePreview ? (
          <div
            aria-hidden="true"
            data-testid="chem-trace-preview"
            data-chem-trace-kind={tracePreview.kind}
            className="pointer-events-none absolute right-3 top-3 z-30 max-w-[calc(100%-1.5rem)] rounded-[18px] border border-teal-500/25 bg-paper/95 px-3 py-2 text-xs text-ink-700 shadow-sm backdrop-blur sm:right-4 sm:top-4 sm:max-w-[18rem]"
          >
            <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-teal-800">
              <span>{t("graphStatus.trace.label")}</span>
              <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[0.62rem] text-teal-900">
                {tracePreview.kind === "pathway"
                  ? t("graphStatus.trace.pathway")
                  : t("graphStatus.trace.node")}
              </span>
            </div>
            <div className="font-semibold leading-5 text-ink-950">
              {tracePreview.title}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.68rem] font-medium text-ink-600">
              <span>{tracePreview.detail}</span>
              <span aria-hidden="true">·</span>
              <span>{tracePreview.meta}</span>
            </div>
          </div>
        ) : null}
        <div
          aria-hidden="true"
          data-testid="chem-mobile-camera-strip"
          data-chem-camera-mode={activeCamera.mode}
          data-chem-active-flow-bands={activeGraphFlowBandIds.join(" ")}
          data-chem-active-flow-summary={activeGraphFlowSummary}
          data-chem-visible-coverage={visibleSceneCoveragePercent}
          className="pointer-events-none absolute bottom-3 left-3 z-30 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-line/75 bg-paper/94 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-600 shadow-sm backdrop-blur sm:hidden"
        >
          <span>{t("graphStatus.map.label")}</span>
          <span
            data-testid="chem-mobile-camera-mode"
            className={joinClasses(
              "rounded-full px-2 py-0.5",
              activeCameraFrameTone === "route"
                ? "bg-amber-500/12 text-amber-950"
                : "bg-teal-500/10 text-teal-900",
            )}
          >
            {activeCameraModeLabel}
          </span>
          <span data-testid="chem-mobile-camera-coverage">
            {t("graphStatus.map.visible", {
              percent: visibleSceneCoveragePercent,
            })}
          </span>
          <span
            data-testid="chem-mobile-flow-summary"
            className="min-w-0 truncate"
          >
            {activeGraphFlowSummary}
          </span>
        </div>
        {routeProgressSummary ? (
          <div
            id="chemistry-graph-route-progress"
            aria-live="polite"
            data-testid="chem-route-progress"
            data-chem-route-summary={routeProgressSummary}
            data-chem-route-step-count={routeEdgeIds.length}
            className="pointer-events-none absolute left-3 top-3 z-30 max-w-[calc(100%-1.5rem)] rounded-[18px] border border-amber-500/35 bg-paper/95 px-3 py-2 text-xs text-amber-950 shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:max-w-[28rem]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold uppercase tracking-[0.14em] text-amber-800">
                {t("graphStatus.map.routePath")}
              </span>
              <span className="font-semibold leading-5">
                {routeProgressSummary}
              </span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {routeEdgeIds.map((edgeId, index) => (
                  <span
                    key={edgeId}
                    data-testid={`chem-route-progress-step-${index + 1}`}
                    className="grid size-5 place-items-center rounded-full bg-amber-500 text-[0.66rem] font-bold leading-none text-ink-950 shadow-sm"
                  >
                    {index + 1}
                  </span>
                ))}
              </span>
            </div>
            <ol
              aria-label={routeProgressSummary}
              data-testid="chem-route-progress-node-trail"
              data-chem-route-node-count={routeNodeIds.length}
              className="mt-2 flex max-w-full flex-wrap items-center gap-1.5 text-[0.68rem] font-semibold text-amber-950"
            >
              {routeNodeIds.map((nodeId, index) => {
                const routeRole =
                  index === 0
                    ? "start"
                    : index === routeNodeIds.length - 1
                      ? "target"
                      : "step";
                const routeNodeFlowBand = nodeFlowBandById.get(nodeId);

                return (
                  <li
                    key={nodeId}
                    data-testid={`chem-route-progress-node-${nodeId}`}
                    data-chem-route-step={index + 1}
                    data-chem-route-role={routeRole}
                    data-chem-flow-band={routeNodeFlowBand?.id}
                    data-chem-flow-order={routeNodeFlowBand?.order}
                    data-chem-flow-tone={routeNodeFlowBand?.tone}
                    className="contents"
                  >
                    <span
                      className={joinClasses(
                        "inline-flex min-w-0 max-w-[8.5rem] items-center gap-1 rounded-full border px-2 py-1 shadow-sm",
                        routeRole === "target"
                          ? "border-amber-500/45 bg-amber-500/18"
                          : routeRole === "start"
                            ? "border-amber-500/35 bg-amber-500/12"
                            : "border-line/80 bg-paper/80",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-4 shrink-0 place-items-center rounded-full bg-amber-500 text-[0.58rem] font-black leading-none text-ink-950"
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 truncate">
                        {nodeNameById.get(nodeId) ?? nodeId}
                      </span>
                      {routeNodeFlowBand ? (
                        <span
                          aria-hidden="true"
                          title={graphFlowBandLabels[routeNodeFlowBand.id]}
                          data-testid={`chem-route-progress-node-flow-${nodeId}`}
                          data-chem-flow-band={routeNodeFlowBand.id}
                          data-chem-flow-order={routeNodeFlowBand.order}
                          data-chem-flow-tone={routeNodeFlowBand.tone}
                          className={joinClasses(
                            "grid size-4 shrink-0 place-items-center rounded-full border text-[0.55rem] font-black leading-none",
                            getFlowBandDotClasses(routeNodeFlowBand.tone),
                          )}
                        />
                      ) : null}
                    </span>
                    {index < routeNodeIds.length - 1 ? (
                      <span aria-hidden="true" className="text-amber-700/70">
                        →
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {routeProgressSteps.length ? (
              <ol
                aria-label={routeProgressSummary}
                data-testid="chem-route-progress-step-list"
                data-chem-route-edge-count={routeProgressSteps.length}
                className="mt-2 grid gap-1.5 text-[0.68rem] font-semibold text-amber-950 sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]"
              >
                {routeProgressSteps.map(({ edge, step, sourceName, targetName }) => {
                  const sourceFlowBand = nodeFlowBandById.get(edge.from);
                  const targetFlowBand = nodeFlowBandById.get(edge.to);

                  return (
                    <li
                      key={edge.id}
                      data-testid={`chem-route-progress-step-detail-${edge.id}`}
                      data-chem-route-step={step}
                      data-chem-route-source={edge.from}
                      data-chem-route-target={edge.to}
                      data-chem-flow-source={sourceFlowBand?.id}
                      data-chem-flow-target={targetFlowBand?.id}
                      data-chem-flow-transition={
                        sourceFlowBand && targetFlowBand
                          ? `${sourceFlowBand.order}→${targetFlowBand.order}`
                          : undefined
                      }
                      className="flex min-w-0 items-start gap-1.5 rounded-[14px] border border-amber-500/20 bg-amber-500/[0.075] px-2 py-1.5 shadow-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-amber-500 text-[0.56rem] font-black leading-none text-ink-950"
                      >
                        {step}
                      </span>
                      <span className="min-w-0 leading-4">
                        <span className="block truncate">{edge.label}</span>
                        <span
                          aria-hidden="true"
                          data-testid={`chem-route-progress-step-flow-${edge.id}`}
                          className="flex min-w-0 items-center gap-1 truncate text-[0.62rem] font-medium text-amber-900/80"
                        >
                          {sourceFlowBand ? (
                            <span
                              title={graphFlowBandLabels[sourceFlowBand.id]}
                              data-testid={`chem-route-progress-step-flow-source-${edge.id}`}
                              data-chem-flow-band={sourceFlowBand.id}
                              data-chem-flow-order={sourceFlowBand.order}
                              className={joinClasses(
                                "grid size-3.5 shrink-0 place-items-center rounded-full border text-[0.5rem] font-black leading-none",
                                getFlowBandDotClasses(sourceFlowBand.tone),
                              )}
                            />
                          ) : null}
                          <span className="min-w-0 truncate">
                            {sourceName} → {targetName}
                          </span>
                          {targetFlowBand ? (
                            <span
                              title={graphFlowBandLabels[targetFlowBand.id]}
                              data-testid={`chem-route-progress-step-flow-target-${edge.id}`}
                              data-chem-flow-band={targetFlowBand.id}
                              data-chem-flow-order={targetFlowBand.order}
                              className={joinClasses(
                                "grid size-3.5 shrink-0 place-items-center rounded-full border text-[0.5rem] font-black leading-none",
                                getFlowBandDotClasses(targetFlowBand.tone),
                              )}
                            />
                          ) : null}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        ) : null}
        <div
          aria-hidden="true"
          data-testid="chem-graph-minimap"
          data-chem-minimap-camera-mode={activeCamera.mode}
          data-chem-trace-active={hoverTraceActive ? "true" : "false"}
          className="pointer-events-none absolute bottom-3 right-3 z-30 hidden w-40 rounded-[18px] border border-line/75 bg-paper/92 p-2 text-[0.64rem] text-ink-600 shadow-sm backdrop-blur sm:block"
        >
          <div className="mb-1 flex items-center justify-between gap-2 font-bold uppercase tracking-[0.13em] text-ink-500">
            <span>{t("graphStatus.map.label")}</span>
            <span data-testid="chem-minimap-camera-mode-label">
              {activeCameraModeLabel}
            </span>
          </div>
          <svg
            data-testid="chem-graph-minimap-svg"
            className="block h-24 w-full overflow-visible rounded-[12px] bg-paper-strong/80"
            viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              x="0"
              y="0"
              width={sceneWidth}
              height={sceneHeight}
              rx="32"
              fill="var(--paper)"
              stroke="var(--line)"
              strokeWidth="10"
            />
            {graphFlowBands.map((band) => {
              const flowBandActive = activeGraphFlowBandSet.has(band.id);

              return (
                <rect
                  key={band.id}
                  data-testid={`chem-minimap-flow-band-${band.id}`}
                  data-chem-flow-band={band.id}
                  data-chem-flow-order={band.order}
                  data-chem-flow-tone={band.tone}
                  data-chem-flow-active={flowBandActive ? "true" : "false"}
                  x={band.x}
                  y={band.y}
                  width={band.width}
                  height={band.height}
                  rx="42"
                  fill={
                    band.tone === "sink"
                      ? "var(--amber-500)"
                      : "var(--teal-500)"
                  }
                  fillOpacity={
                    flowBandActive ? 0.12 : band.tone === "hub" ? 0.035 : 0.055
                  }
                  stroke={
                    band.tone === "sink"
                      ? "var(--amber-600)"
                      : "var(--teal-600)"
                  }
                  strokeOpacity={
                    flowBandActive ? 0.34 : band.tone === "hub" ? 0.1 : 0.14
                  }
                  strokeWidth={flowBandActive ? "12" : "8"}
                  strokeDasharray="20 18"
                />
              );
            })}
            {graphFlowCorridors.map((corridor) => {
              const corridorActive =
                activeGraphFlowBandSet.has(corridor.source.id) &&
                activeGraphFlowBandSet.has(corridor.target.id);

              return (
                <g
                  key={corridor.id}
                  data-testid={`chem-minimap-flow-corridor-${corridor.id}`}
                  data-chem-flow-source={corridor.source.id}
                  data-chem-flow-target={corridor.target.id}
                  data-chem-flow-transition={corridor.label}
                  data-chem-flow-active={corridorActive ? "true" : "false"}
                >
                  <path
                    d={`M ${corridor.startX} ${corridor.y} L ${corridor.endX} ${corridor.y}`}
                    fill="none"
                    stroke={
                      corridor.target.tone === "sink"
                        ? "var(--amber-600)"
                        : "var(--teal-600)"
                    }
                    strokeWidth={corridorActive ? "18" : "10"}
                    strokeLinecap="round"
                    strokeDasharray="18 12"
                    opacity={corridorActive ? "0.42" : "0.14"}
                  />
                  <circle
                    cx={(corridor.startX + corridor.endX) / 2}
                    cy={corridor.y}
                    r={corridorActive ? "13" : "9"}
                    fill={
                      corridor.target.tone === "sink"
                        ? "var(--amber-500)"
                        : "var(--teal-500)"
                    }
                    opacity={corridorActive ? "0.3" : "0.12"}
                  />
                </g>
              );
            })}
            {graphFlowBands.map((band) => (
              <g key={`${band.id}-marker`}>
                <text
                  data-testid={`chem-minimap-flow-marker-${band.id}`}
                  data-chem-flow-band={band.id}
                  data-chem-flow-order={band.order}
                  x={band.x + 34}
                  y={band.y + 54}
                  fill={
                    band.tone === "sink"
                      ? "var(--amber-600)"
                      : "var(--teal-700)"
                  }
                  fontSize="42"
                  fontWeight="800"
                  opacity="0.48"
                >
                  {band.order}
                </text>
                <text
                  data-testid={`chem-minimap-flow-label-${band.id}`}
                  data-chem-flow-band={band.id}
                  data-chem-flow-order={band.order}
                  x={band.x + 72}
                  y={band.y + 54}
                  fill={
                    band.tone === "sink"
                      ? "var(--amber-600)"
                      : "var(--teal-700)"
                  }
                  fontSize="30"
                  fontWeight="800"
                  opacity="0.42"
                >
                  {graphFlowBandLabels[band.id]}
                </text>
              </g>
            ))}
            <path
              data-testid="chem-minimap-flow-spine"
              d={`M ${graphFlowSpine.startX} ${graphFlowSpine.y} C ${
                graphFlowSpine.startX +
                (graphFlowSpine.endX - graphFlowSpine.startX) * 0.26
              } ${graphFlowSpine.y - 42}, ${
                graphFlowSpine.startX +
                (graphFlowSpine.endX - graphFlowSpine.startX) * 0.74
              } ${graphFlowSpine.y + 42}, ${graphFlowSpine.endX} ${graphFlowSpine.y}`}
              fill="none"
              stroke="var(--ink-500)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="24 18"
              opacity="0.22"
            />
            {edges.map((edge) => {
              const geometry = getEdgeGeometry(edge, shiftedLayout);
              const isRouteEdge = routeEdgeSet.has(edge.id);
              const routeStep = routeEdgeStepMap.get(edge.id);
              const edgeFlowTransition = edgeFlowTransitionById.get(edge.id);
              const tracedByHover = hoveredTraceEdgeSet.has(edge.id);
              const hoveredByEdge = hoveredEdgeId === edge.id;
              const hoveredByNode = hoveredNodeId
                ? isNodeAttachedToEdge(hoveredNodeId, edge)
                : false;
              const hoverContext = hoveredByEdge
                ? "edge"
                : hoveredByNode
                  ? "node"
                  : "default";
              const isConnectedEdge =
                isRouteEdge ||
                highlightedEdgeSet.has(edge.id) ||
                comparedEdgeSet.has(edge.id) ||
                tracedByHover ||
                (selection?.kind === "edge" && selection.id === edge.id);

              return (
                <g
                  key={edge.id}
                  data-testid={`chem-minimap-edge-${edge.id}`}
                  data-chem-route-context={isRouteEdge ? "route" : "default"}
                  data-chem-route-step={routeStep}
                  data-chem-hover-context={hoverContext}
                  data-chem-trace-active={tracedByHover ? "true" : "false"}
                  data-chem-flow-transition={edgeFlowTransition?.label}
                  data-chem-flow-source={edgeFlowTransition?.source.id}
                  data-chem-flow-target={edgeFlowTransition?.target.id}
                  data-chem-crosses-flow-band={
                    edgeFlowTransition
                      ? edgeFlowTransition.crossesBand
                        ? "true"
                        : "false"
                      : undefined
                  }
                >
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={
                      isRouteEdge
                        ? "var(--amber-600)"
                        : isConnectedEdge
                          ? "var(--teal-600)"
                          : "var(--line)"
                    }
                    strokeWidth={isRouteEdge || isConnectedEdge ? 10 : 6}
                    strokeLinecap="round"
                    opacity={isRouteEdge || isConnectedEdge ? 0.85 : 0.42}
                  />
                  {routeStep ? (
                    <g
                      data-testid={`chem-minimap-edge-route-step-${edge.id}`}
                      data-chem-route-step={routeStep}
                      data-chem-flow-transition={edgeFlowTransition?.label}
                      transform={`translate(${geometry.labelPoint.x} ${geometry.labelPoint.y})`}
                    >
                      <circle
                        r="21"
                        fill="var(--amber-500)"
                        stroke="var(--paper)"
                        strokeWidth="8"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--ink-950)"
                        fontSize="26"
                        fontWeight="900"
                      >
                        {routeStep}
                      </text>
                    </g>
                  ) : edgeFlowTransition && isConnectedEdge ? (
                    <g
                      data-testid={`chem-minimap-edge-flow-transition-${edge.id}`}
                      data-chem-flow-transition={edgeFlowTransition.label}
                      data-chem-flow-source={edgeFlowTransition.source.id}
                      data-chem-flow-target={edgeFlowTransition.target.id}
                      data-chem-crosses-flow-band={
                        edgeFlowTransition.crossesBand ? "true" : "false"
                      }
                      transform={`translate(${geometry.labelPoint.x} ${geometry.labelPoint.y})`}
                    >
                      <circle
                        r="16"
                        fill={
                          edgeFlowTransition.target.tone === "sink"
                            ? "var(--amber-500)"
                            : "var(--teal-500)"
                        }
                        fillOpacity="0.82"
                        stroke="var(--paper)"
                        strokeWidth="7"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={
                          edgeFlowTransition.target.tone === "sink"
                            ? "var(--ink-950)"
                            : "white"
                        }
                        fontSize="18"
                        fontWeight="900"
                      >
                        {edgeFlowTransition.label}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
            <rect
              data-testid="chem-minimap-visible-window"
              data-chem-minimap-window="viewport"
              data-chem-window-x={Math.round(visibleSceneBounds.minX)}
              data-chem-window-y={Math.round(visibleSceneBounds.minY)}
              data-chem-window-width={Math.round(visibleSceneWindowWidth)}
              data-chem-window-height={Math.round(visibleSceneWindowHeight)}
              x={visibleSceneBounds.minX}
              y={visibleSceneBounds.minY}
              width={visibleSceneWindowWidth}
              height={visibleSceneWindowHeight}
              rx="30"
              fill="var(--ink-950)"
              fillOpacity="0.035"
              stroke="var(--ink-950)"
              strokeWidth="10"
              strokeDasharray="18 14"
            />
            <line
              data-testid="chem-minimap-window-center-x"
              data-chem-window-center-x={Math.round(
                visibleSceneBounds.minX + visibleSceneWindowWidth / 2,
              )}
              x1={visibleSceneBounds.minX + visibleSceneWindowWidth / 2}
              y1={visibleSceneBounds.minY}
              x2={visibleSceneBounds.minX + visibleSceneWindowWidth / 2}
              y2={visibleSceneBounds.maxY}
              stroke="var(--ink-950)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeOpacity="0.16"
            />
            <line
              data-testid="chem-minimap-window-center-y"
              data-chem-window-center-y={Math.round(
                visibleSceneBounds.minY + visibleSceneWindowHeight / 2,
              )}
              x1={visibleSceneBounds.minX}
              y1={visibleSceneBounds.minY + visibleSceneWindowHeight / 2}
              x2={visibleSceneBounds.maxX}
              y2={visibleSceneBounds.minY + visibleSceneWindowHeight / 2}
              stroke="var(--ink-950)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeOpacity="0.16"
            />
            {showActiveCameraFrame ? (
              <rect
                data-testid="chem-minimap-active-scope"
                data-chem-camera-frame={activeCamera.mode}
                data-chem-camera-frame-tone={activeCameraFrameTone}
                data-chem-active-flow-bands={activeGraphFlowBandIds.join(" ")}
                data-chem-active-flow-summary={activeGraphFlowSummary}
                x={activeCameraBounds.minX}
                y={activeCameraBounds.minY}
                width={activeCameraBounds.maxX - activeCameraBounds.minX}
                height={activeCameraBounds.maxY - activeCameraBounds.minY}
                rx="34"
                fill={
                  activeCameraFrameTone === "route"
                    ? "var(--amber-500)"
                    : "var(--teal-500)"
                }
                fillOpacity="0.12"
                stroke={
                  activeCameraFrameTone === "route"
                    ? "var(--amber-600)"
                    : "var(--teal-600)"
                }
                strokeWidth="12"
                strokeDasharray="24 16"
              />
            ) : null}
            {nodes.map((node) => {
              const position = shiftedLayout.nodePositions[node.id];
              const selected =
                selection?.kind === "node" && selection.id === node.id;
              const routeStep = routeNodeStepMap.get(node.id);
              const routeContext =
                routeNodeSet.has(node.id) || routeEndpointSet.has(node.id);
              const tracedByHover = hoveredTraceNodeSet.has(node.id);
              const hoveredByNode = hoveredNodeId === node.id;
              const hoveredByEdge = Boolean(
                hoveredEdge && isNodeAttachedToEdge(node.id, hoveredEdge),
              );
              const tracedFromNodeHover = Boolean(
                hoveredNodeId && tracedByHover,
              );
              const hoverContext = hoveredByNode || tracedFromNodeHover
                ? "node"
                : hoveredByEdge
                  ? "edge"
                  : "default";
              const activeContext =
                selected ||
                routeContext ||
                highlightedNodeSet.has(node.id) ||
                comparedNodeSet.has(node.id) ||
                tracedByHover;
              const nodeFlowBand = nodeFlowBandById.get(node.id);
              const nodeFlowActive = nodeFlowBand
                ? activeGraphFlowBandSet.has(nodeFlowBand.id)
                : false;

              return (
                <g
                  key={node.id}
                  data-testid={`chem-minimap-node-${node.id}`}
                  data-chem-route-context={routeContext ? "route" : "default"}
                  data-chem-route-step={routeStep}
                  data-chem-hover-context={hoverContext}
                  data-chem-trace-active={tracedByHover ? "true" : "false"}
                  data-chem-flow-band={nodeFlowBand?.id}
                  data-chem-flow-order={nodeFlowBand?.order}
                  data-chem-flow-tone={nodeFlowBand?.tone}
                  data-chem-flow-active={nodeFlowActive ? "true" : "false"}
                >
                  <rect
                    x={position.x}
                    y={position.y}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="24"
                    fill={
                      routeContext
                        ? "var(--amber-500)"
                        : activeContext
                          ? "var(--teal-500)"
                          : "var(--paper)"
                    }
                    stroke={
                      routeContext
                        ? "var(--amber-600)"
                        : activeContext
                          ? "var(--teal-600)"
                          : "var(--ink-500)"
                    }
                    strokeWidth={activeContext ? 10 : 6}
                    opacity={activeContext ? 0.95 : 0.55}
                  />
                  {nodeFlowBand ? (
                    <g
                      data-testid={`chem-minimap-node-flow-stage-${node.id}`}
                      data-chem-flow-band={nodeFlowBand.id}
                      data-chem-flow-order={nodeFlowBand.order}
                      data-chem-flow-tone={nodeFlowBand.tone}
                      data-chem-flow-active={nodeFlowActive ? "true" : "false"}
                      transform={`translate(${position.x + 32} ${position.y + 30})`}
                    >
                      <circle
                        r={nodeFlowActive ? "18" : "14"}
                        fill={
                          nodeFlowBand.tone === "sink"
                            ? "var(--amber-500)"
                            : nodeFlowBand.tone === "source"
                              ? "var(--teal-500)"
                              : "var(--ink-500)"
                        }
                        fillOpacity={nodeFlowActive ? "0.82" : "0.5"}
                        stroke="var(--paper)"
                        strokeWidth="7"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={
                          nodeFlowBand.tone === "sink" ? "var(--ink-950)" : "white"
                        }
                        fontSize="20"
                        fontWeight="900"
                      >
                        {nodeFlowBand.order}
                      </text>
                    </g>
                  ) : null}
                  {activeContext ? (
                    <text
                      data-testid={`chem-minimap-node-label-${node.id}`}
                      data-chem-minimap-label={node.name}
                      data-chem-route-context={
                        routeContext ? "route" : "default"
                      }
                      data-chem-flow-band={nodeFlowBand?.id}
                      x={position.x + NODE_WIDTH / 2}
                      y={position.y + NODE_HEIGHT - 18}
                      textAnchor="middle"
                      fill={routeContext ? "var(--ink-950)" : "white"}
                      stroke={
                        routeContext ? "var(--paper)" : "var(--ink-950)"
                      }
                      strokeWidth="5"
                      paintOrder="stroke fill"
                      fontSize="24"
                      fontWeight="900"
                      opacity="0.92"
                    >
                      {getMinimapNodeLabel(node.name)}
                    </text>
                  ) : null}
                  {routeStep ? (
                    <g
                      data-testid={`chem-minimap-node-route-step-${node.id}`}
                      data-chem-route-step={routeStep}
                      data-chem-flow-band={nodeFlowBand?.id}
                      data-chem-flow-order={nodeFlowBand?.order}
                      transform={`translate(${position.x + NODE_WIDTH - 34} ${position.y + 30})`}
                    >
                      <circle
                        r="24"
                        fill="var(--amber-500)"
                        stroke="var(--paper)"
                        strokeWidth="8"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--ink-950)"
                        fontSize="28"
                        fontWeight="900"
                      >
                        {routeStep}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <div
            data-testid="chem-minimap-status-strip"
            data-chem-minimap-camera-mode={activeCamera.mode}
            data-chem-active-flow-summary={activeGraphFlowSummary}
            data-chem-visible-coverage={visibleSceneCoveragePercent}
            className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-full border border-line/70 bg-paper/86 px-2 py-1 font-semibold uppercase tracking-[0.1em]"
          >
            <span
              className="min-w-0 truncate"
              data-testid="chem-minimap-flow-summary"
            >
              {activeGraphFlowSummary}
            </span>
            <span
              className="shrink-0"
              data-testid="chem-minimap-visible-coverage"
            >
              {t("graphStatus.map.visible", {
                percent: visibleSceneCoveragePercent,
              })}
            </span>
          </div>
        </div>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: sceneWidth,
            height: sceneHeight,
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
          }}
        >
          <div
            aria-hidden="true"
            data-testid="chem-graph-flow-structure"
            className="pointer-events-none absolute inset-0"
          >
            {graphFlowBands.map((band) => {
              const flowBandActive = activeGraphFlowBandSet.has(band.id);

              return (
                <div
                  key={band.id}
                  data-testid={`chem-graph-flow-band-${band.id}`}
                  data-chem-flow-band={band.id}
                  data-chem-flow-order={band.order}
                  data-chem-flow-tone={band.tone}
                  data-chem-flow-active={flowBandActive ? "true" : "false"}
                  className={joinClasses(
                    "absolute rounded-[34px] border border-dashed shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] transition-opacity",
                    flowBandActive ? "opacity-100" : "opacity-70",
                    band.tone === "source"
                      ? flowBandActive
                        ? "border-teal-500/30 bg-teal-500/[0.07]"
                        : "border-teal-500/14 bg-teal-500/[0.035]"
                      : band.tone === "hub"
                        ? flowBandActive
                          ? "border-teal-500/24 bg-teal-500/[0.05]"
                          : "border-ink-500/12 bg-ink-500/[0.025]"
                        : flowBandActive
                          ? "border-amber-500/34 bg-amber-500/[0.075]"
                          : "border-amber-500/16 bg-amber-500/[0.04]",
                  )}
                  style={{
                    left: band.x,
                    top: band.y,
                    width: band.width,
                    height: band.height,
                  }}
                >
                  <span
                    data-testid={`chem-graph-flow-marker-${band.id}`}
                    data-chem-flow-band={band.id}
                    data-chem-flow-order={band.order}
                    className={joinClasses(
                      "absolute left-4 top-4 grid size-8 place-items-center rounded-full border bg-paper/76 text-[0.68rem] font-black leading-none shadow-sm backdrop-blur",
                      band.tone === "sink"
                        ? "border-amber-500/25 text-amber-800"
                        : band.tone === "source"
                          ? "border-teal-500/25 text-teal-800"
                          : "border-line/80 text-ink-500",
                    )}
                  >
                    {band.order}
                  </span>
                  <span
                    data-testid={`chem-graph-flow-label-${band.id}`}
                    className={joinClasses(
                      "absolute left-14 top-4 rounded-full border bg-paper/78 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur",
                      band.tone === "sink"
                        ? "border-amber-500/25 text-amber-800"
                        : band.tone === "source"
                          ? "border-teal-500/25 text-teal-800"
                          : "border-line/80 text-ink-500",
                    )}
                  >
                    {graphFlowBandLabels[band.id]}
                  </span>
                </div>
              );
            })}
            <svg
              data-testid="chem-graph-flow-spine"
              data-chem-flow-spine="reactant-to-product"
              className="absolute left-0 top-0"
              width={sceneWidth}
              height={sceneHeight}
              viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
            >
              {graphFlowCorridors.map((corridor) => {
                const corridorActive =
                  activeGraphFlowBandSet.has(corridor.source.id) &&
                  activeGraphFlowBandSet.has(corridor.target.id);

                return (
                  <g
                    key={corridor.id}
                    data-testid={`chem-graph-flow-corridor-${corridor.id}`}
                    data-chem-flow-source={corridor.source.id}
                    data-chem-flow-target={corridor.target.id}
                    data-chem-flow-transition={corridor.label}
                    data-chem-flow-active={corridorActive ? "true" : "false"}
                  >
                    <path
                      d={`M ${corridor.startX} ${corridor.y} L ${corridor.endX} ${corridor.y}`}
                      fill="none"
                      stroke={
                        corridor.target.tone === "sink"
                          ? "var(--amber-600)"
                          : "var(--teal-600)"
                      }
                      strokeWidth={corridorActive ? "16" : "8"}
                      strokeLinecap="round"
                      strokeDasharray="16 14"
                      opacity={corridorActive ? "0.3" : "0.11"}
                    />
                    <path
                      d={`M -5 -7 L 5 0 L -5 7`}
                      fill="none"
                      stroke={
                        corridor.target.tone === "sink"
                          ? "var(--amber-600)"
                          : "var(--teal-600)"
                      }
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={corridorActive ? "0.62" : "0.24"}
                      transform={`translate(${(corridor.startX + corridor.endX) / 2} ${corridor.y})`}
                    />
                  </g>
                );
              })}
              <path
                data-testid="chem-graph-flow-spine-line"
                d={`M ${graphFlowSpine.startX} ${graphFlowSpine.y} C ${
                  graphFlowSpine.startX +
                  (graphFlowSpine.endX - graphFlowSpine.startX) * 0.26
                } ${graphFlowSpine.y - 42}, ${
                  graphFlowSpine.startX +
                  (graphFlowSpine.endX - graphFlowSpine.startX) * 0.74
                } ${graphFlowSpine.y + 42}, ${graphFlowSpine.endX} ${graphFlowSpine.y}`}
                fill="none"
                stroke="var(--ink-500)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="18 18"
                opacity="0.14"
              />
              {graphFlowSpine.checkpoints.map((checkpointX, index) => {
                const checkpointBand = graphFlowBands[index];
                const checkpointActive = checkpointBand
                  ? activeGraphFlowBandSet.has(checkpointBand.id)
                  : false;

                return (
                  <g
                    key={checkpointX}
                    data-testid={`chem-graph-flow-spine-checkpoint-${index + 1}`}
                    data-chem-flow-band={checkpointBand?.id}
                    data-chem-flow-order={checkpointBand?.order}
                    data-chem-flow-active={checkpointActive ? "true" : "false"}
                    transform={`translate(${checkpointX} ${graphFlowSpine.y})`}
                  >
                    <circle
                      r={checkpointActive ? "16" : "13"}
                      fill={
                        index === graphFlowSpine.checkpoints.length - 1
                          ? "var(--amber-500)"
                          : "var(--teal-500)"
                      }
                      opacity={checkpointActive ? "0.2" : "0.1"}
                    />
                    <path
                      d="M -4 -6 L 4 0 L -4 6"
                      fill="none"
                      stroke={
                        index === graphFlowSpine.checkpoints.length - 1
                          ? "var(--amber-600)"
                          : "var(--teal-600)"
                      }
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={checkpointActive ? "0.6" : "0.28"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          {showActiveCameraFrame ? (
            <div
              aria-hidden="true"
              data-testid="chem-active-camera-frame"
              data-chem-camera-frame={activeCamera.mode}
              data-chem-camera-frame-tone={activeCameraFrameTone}
              data-chem-active-flow-bands={activeGraphFlowBandIds.join(" ")}
              data-chem-active-flow-summary={activeGraphFlowSummary}
              className={joinClasses(
                "pointer-events-none absolute rounded-[28px] border border-dashed shadow-[0_0_0_9999px_rgba(255,255,255,0.22)]",
                activeCameraFrameTone === "route"
                  ? "border-amber-500/45 bg-amber-500/5"
                  : "border-teal-500/40 bg-teal-500/5",
              )}
              style={{
                left: activeCameraBounds.minX,
                top: activeCameraBounds.minY,
                width: activeCameraBounds.maxX - activeCameraBounds.minX,
                height: activeCameraBounds.maxY - activeCameraBounds.minY,
              }}
            >
              <span
                data-testid="chem-active-camera-flow-label"
                data-chem-active-flow-bands={activeGraphFlowBandIds.join(" ")}
                data-chem-active-flow-summary={activeGraphFlowSummary}
                className={joinClasses(
                  "absolute -top-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur",
                  activeCameraFrameTone === "route"
                    ? "border-amber-500/35 bg-paper/92 text-amber-900"
                    : "border-teal-500/30 bg-paper/92 text-teal-900",
                )}
              >
                {activeGraphFlowSummary}
              </span>
            </div>
          ) : null}
          <svg
            aria-hidden="true"
            className="absolute left-0 top-0"
            width={sceneWidth}
            height={sceneHeight}
            viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
          >
            <defs>
              <marker
                id="chemistry-edge-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-500)" />
              </marker>
              <marker
                id="chemistry-edge-arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--teal-700)" />
              </marker>
              <marker
                id="chemistry-edge-arrow-route"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--amber-600)" />
              </marker>
            </defs>

            {edges.map((edge) => {
              const geometry = getEdgeGeometry(edge, shiftedLayout);
              const selected =
                selection?.kind === "edge" && selection.id === edge.id;
              const hoveredByEdge = hoveredEdgeId === edge.id;
              const hoveredByNode = hoveredNodeId
                ? isNodeAttachedToEdge(hoveredNodeId, edge)
                : false;
              const tracedByHover = hoveredTraceEdgeSet.has(edge.id);
              const hoverContext = hoveredByEdge
                ? "edge"
                : hoveredByNode
                  ? "node"
                  : "default";
              const context = compareActive
                ? comparedEdgeSet.has(edge.id)
                  ? "compared"
                  : dimUnrelated
                    ? "dimmed"
                    : "default"
                : selected
                  ? "selected"
                  : routeEdgeSet.has(edge.id) ||
                      highlightedEdgeSet.has(edge.id) ||
                      tracedByHover
                    ? "connected"
                    : dimUnrelated || hoverTraceActive
                      ? "dimmed"
                      : "default";
              const edgeIsHighlighted = compareActive
                ? comparedEdgeSet.has(edge.id)
                : selected ||
                  routeEdgeSet.has(edge.id) ||
                  highlightedEdgeSet.has(edge.id) ||
                  hoveredByEdge ||
                  hoveredByNode;
              const routeContext = routeActive
                ? routeEdgeSet.has(edge.id)
                  ? "route"
                  : dimUnrelated
                    ? "dimmed"
                    : "default"
                : "default";
              const edgeFlowTransition = edgeFlowTransitionById.get(edge.id);

              return (
                <g key={edge.id}>
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="28"
                    pointerEvents="stroke"
                    data-testid={`chem-edge-hitbox-${edge.id}`}
                    data-chem-context={context}
                    data-chem-route-context={routeContext}
                    data-chem-hover-context={hoverContext}
                    data-chem-flow-transition={edgeFlowTransition?.label}
                    data-chem-flow-source={edgeFlowTransition?.source.id}
                    data-chem-flow-target={edgeFlowTransition?.target.id}
                    data-chem-crosses-flow-band={
                      edgeFlowTransition
                        ? edgeFlowTransition.crossesBand
                          ? "true"
                          : "false"
                        : undefined
                    }
                    data-chem-interactive="true"
                    onPointerEnter={() => setHoveredEdgeId(edge.id)}
                    onPointerLeave={() =>
                      setHoveredEdgeId((current) =>
                        current === edge.id ? null : current,
                      )
                    }
                    onClick={() => onSelectEdge(edge.id)}
                  />
                  {context !== "dimmed" &&
                  (edgeIsHighlighted || routeEdgeSet.has(edge.id)) ? (
                    <path
                      d={geometry.path}
                      fill="none"
                      stroke={
                        routeEdgeSet.has(edge.id)
                          ? "var(--amber-500)"
                          : "var(--teal-500)"
                      }
                      strokeWidth={
                        selected || routeEdgeSet.has(edge.id) ? 12 : 10
                      }
                      opacity={
                        selected || routeEdgeSet.has(edge.id) ? 0.16 : 0.1
                      }
                      strokeLinecap="round"
                      pointerEvents="none"
                      data-testid={`chem-edge-halo-${edge.id}`}
                    />
                  ) : null}
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={
                      selected
                        ? "var(--teal-700)"
                        : routeEdgeSet.has(edge.id)
                          ? "var(--amber-600)"
                          : edgeIsHighlighted
                            ? "var(--teal-500)"
                            : "var(--line)"
                    }
                    strokeWidth={
                      selected
                        ? 4
                        : routeEdgeSet.has(edge.id)
                          ? 3.5
                          : edgeIsHighlighted
                            ? 3.25
                            : 2.5
                    }
                    opacity={context === "dimmed" ? 0.35 : 1}
                    strokeLinecap="round"
                    markerEnd={
                      routeEdgeSet.has(edge.id)
                        ? "url(#chemistry-edge-arrow-route)"
                        : edgeIsHighlighted
                          ? "url(#chemistry-edge-arrow-active)"
                          : "url(#chemistry-edge-arrow)"
                    }
                    pointerEvents="none"
                    data-testid={`chem-edge-path-${edge.id}`}
                    data-chem-context={context}
                    data-chem-route-context={routeContext}
                    data-chem-hover-context={hoverContext}
                    data-chem-flow-transition={edgeFlowTransition?.label}
                    data-chem-flow-source={edgeFlowTransition?.source.id}
                    data-chem-flow-target={edgeFlowTransition?.target.id}
                    data-chem-crosses-flow-band={
                      edgeFlowTransition
                        ? edgeFlowTransition.crossesBand
                          ? "true"
                          : "false"
                        : undefined
                    }
                    data-chem-interactive="true"
                  />
                  {context !== "dimmed" && edgeIsHighlighted ? (
                    <g
                      aria-hidden="true"
                      pointerEvents="none"
                      transform={`translate(${geometry.directionPoint.x} ${geometry.directionPoint.y}) rotate(${geometry.directionAngle})`}
                      data-testid={`chem-edge-direction-${edge.id}`}
                      data-chem-context={context}
                      data-chem-route-context={routeContext}
                      data-chem-hover-context={hoverContext}
                    >
                      <circle
                        r="10"
                        fill="var(--paper)"
                        stroke={
                          routeEdgeSet.has(edge.id)
                            ? "var(--amber-500)"
                            : "var(--teal-500)"
                        }
                        strokeWidth="1.5"
                        opacity="0.94"
                      />
                      <path
                        d="M -4 -5 L 3 0 L -4 5"
                        fill="none"
                        stroke={
                          routeEdgeSet.has(edge.id)
                            ? "var(--amber-600)"
                            : "var(--teal-600)"
                        }
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {edges.map((edge) => {
            const { labelPoint } = getEdgeGeometry(edge, shiftedLayout);
            const labelOffset = layout.edgeLabelOffsets[edge.id] ?? {
              x: 0,
              y: 0,
            };
            const sourceName = nodeNameById.get(edge.from) ?? edge.from;
            const targetName = nodeNameById.get(edge.to) ?? edge.to;
            const selected =
              selection?.kind === "edge" && selection.id === edge.id;
            const hoveredByEdge = hoveredEdgeId === edge.id;
            const hoveredByNode = hoveredNodeId
              ? isNodeAttachedToEdge(hoveredNodeId, edge)
              : false;
            const tracedByHover = hoveredTraceEdgeSet.has(edge.id);
            const hoverContext = hoveredByEdge
              ? "edge"
              : hoveredByNode
                ? "node"
                : "default";
            const routeStep = routeEdgeStepMap.get(edge.id);
            const routeEdgeSelected = routeEdgeSet.has(edge.id);
            const context = compareActive
              ? comparedEdgeSet.has(edge.id)
                ? "compared"
                : dimUnrelated
                  ? "dimmed"
                  : "default"
              : selected
                ? "selected"
                : routeEdgeSelected ||
                    highlightedEdgeSet.has(edge.id) ||
                    tracedByHover
                  ? "connected"
                  : dimUnrelated || hoverTraceActive
                    ? "dimmed"
                    : "default";
            const routeContext = routeActive
              ? routeEdgeSelected
                ? "route"
                : dimUnrelated
                  ? "dimmed"
                  : "default"
              : "default";
            const edgeFlowTransition = edgeFlowTransitionById.get(edge.id);
            const showEdgeDetail =
              viewState.scale >= EDGE_LABEL_DETAIL_SCALE ||
              selected ||
              hoveredByEdge ||
              hoveredByNode ||
              routeEdgeSelected;
            const edgeLabelDensity = showEdgeDetail ? "detailed" : "compact";
            const edgeLayerPriority: GraphLayerPriority = selected
              ? "selected"
              : hoveredByEdge || hoveredByNode
                ? "preview"
                : routeEdgeSelected
                  ? "route"
                  : context === "compared"
                    ? "compared"
                    : context === "connected"
                      ? "connected"
                      : context === "dimmed"
                        ? "dimmed"
                        : "default";

            return (
              <button
                key={edge.id}
                type="button"
                aria-pressed={selected}
                aria-label={t("graphStatus.edge.ariaLabel", {
                  label: edge.label,
                  source: sourceName,
                  target: targetName,
                  reactionType: edge.reactionType,
                  routeStep: routeStep
                    ? t("graphStatus.edge.routeStep", { step: routeStep })
                    : "",
                })}
                data-testid={`chem-edge-${edge.id}`}
                data-chem-context={context}
                data-chem-route-context={routeContext}
                data-chem-route-step={routeStep}
                data-chem-reaction-type={edge.reactionType}
                data-chem-label-density={edgeLabelDensity}
                data-chem-hover-context={hoverContext}
                data-chem-flow-transition={edgeFlowTransition?.label}
                data-chem-flow-source={edgeFlowTransition?.source.id}
                data-chem-flow-target={edgeFlowTransition?.target.id}
                data-chem-layer-priority={edgeLayerPriority}
                data-chem-label-role="pathway-secondary"
                data-chem-crosses-flow-band={
                  edgeFlowTransition
                    ? edgeFlowTransition.crossesBand
                      ? "true"
                      : "false"
                    : undefined
                }
                data-chem-interactive="true"
                data-chem-label-scale={edgeLabelCounterScale.toFixed(2)}
                className={[
                  "absolute z-10 inline-flex max-w-[10.5rem] items-center justify-center gap-1.5 rounded-[1rem] border px-2.5 py-1.5 text-center text-[0.68rem] font-medium leading-tight transition shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  selected
                    ? "border-teal-700 bg-teal-500/15 text-teal-900 ring-2 ring-teal-600/40"
                    : routeEdgeSet.has(edge.id)
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-950"
                      : context === "compared"
                        ? "border-teal-500/30 bg-teal-500/10 text-teal-900"
                        : context === "connected"
                          ? "border-teal-500/30 bg-teal-500/10 text-teal-900"
                          : context === "dimmed"
                            ? "border-line bg-paper text-ink-500 opacity-45"
                            : "border-line bg-paper text-ink-700 hover:border-ink-950/20",
                ].join(" ")}
                style={{
                  left: labelPoint.x + labelOffset.x,
                  top: labelPoint.y + labelOffset.y,
                  zIndex: GRAPH_EDGE_LABEL_Z_INDEX[edgeLayerPriority],
                  transform: `translate(-50%, -50%) scale(${edgeLabelCounterScale})`,
                  transformOrigin: "center",
                }}
                onPointerEnter={() => setHoveredEdgeId(edge.id)}
                onPointerLeave={() =>
                  setHoveredEdgeId((current) =>
                    current === edge.id ? null : current,
                  )
                }
                onFocus={() => setHoveredEdgeId(edge.id)}
                onBlur={() =>
                  setHoveredEdgeId((current) =>
                    current === edge.id ? null : current,
                  )
                }
                onClick={() => onSelectEdge(edge.id)}
              >
                {routeStep ? (
                  <span
                    aria-hidden="true"
                    data-testid={`chem-edge-route-step-${edge.id}`}
                    className="grid size-4 shrink-0 place-items-center rounded-full bg-amber-500 text-[0.58rem] font-bold leading-none text-ink-950 shadow-sm"
                  >
                    {routeStep}
                  </span>
                ) : edgeFlowTransition ? (
                  <span
                    aria-hidden="true"
                    data-testid={`chem-edge-flow-transition-${edge.id}`}
                    data-chem-flow-transition={edgeFlowTransition.label}
                    data-chem-flow-source={edgeFlowTransition.source.id}
                    data-chem-flow-target={edgeFlowTransition.target.id}
                    data-chem-crosses-flow-band={
                      edgeFlowTransition.crossesBand ? "true" : "false"
                    }
                    className={joinClasses(
                      "grid size-4 shrink-0 place-items-center rounded-full border text-[0.5rem] font-black leading-none shadow-sm",
                      edgeFlowTransition.crossesBand
                        ? "border-teal-500/30 bg-teal-500/10 text-teal-900"
                        : "border-line bg-paper-strong text-ink-500",
                    )}
                  >
                    {edgeFlowTransition.label}
                  </span>
                ) : null}
                <span className="min-w-0 space-y-0.5">
                  <span className="block">{edge.label}</span>
                  <span
                    aria-hidden="true"
                    data-testid={`chem-edge-endpoints-${edge.id}`}
                    className={joinClasses(
                      "text-[0.64rem] font-medium leading-tight text-current opacity-70",
                      showEdgeDetail ? "block" : "hidden",
                    )}
                  >
                    {sourceName} → {targetName}
                  </span>
                  <span
                    aria-hidden="true"
                    data-testid={`chem-edge-reaction-type-${edge.id}`}
                    className={joinClasses(
                      "mx-auto mt-1 w-fit rounded-full border border-current/15 bg-paper/70 px-1.5 py-0.5 text-[0.54rem] font-bold uppercase tracking-[0.12em] opacity-70",
                      showEdgeDetail ? "block" : "hidden",
                    )}
                  >
                    {edge.reactionType}
                  </span>
                </span>
              </button>
            );
          })}

          {nodes.map((node) => {
            const position = layout.nodePositions[node.id];
            const selected =
              selection?.kind === "node" && selection.id === node.id;
            const hovered = hoveredNodeId === node.id;
            const directionEdgeRole = directionEdge
              ? directionEdge.from === node.id
                ? "source"
                : directionEdge.to === node.id
                  ? "target"
                  : null
              : null;
            const directionEdgeContext = directionEdgeRole
              ? selectedEdge?.id === directionEdge?.id
                ? "selected-pathway"
                : "previewed-pathway"
              : undefined;
            const directionEdgeLabel =
              directionEdgeRole === "source"
                ? t("graphStatus.node.sourceBadge")
                : t("graphStatus.node.targetBadge");
            const directionEdgeAria = directionEdgeRole
              ? t(
                  directionEdgeRole === "source"
                    ? "graphStatus.node.sourceSide"
                    : "graphStatus.node.productSide",
                  { label: directionEdge?.label ?? "" },
                )
              : "";
            const connected =
              highlightedNodeSet.has(node.id) ||
              Boolean(
                selectedEdge && isNodeAttachedToEdge(node.id, selectedEdge),
              ) ||
              Boolean(
                hoveredEdge && isNodeAttachedToEdge(node.id, hoveredEdge),
              ) ||
              hoveredTraceNodeSet.has(node.id);
            const hoverContext = hovered
              ? "node"
              : hoveredEdge && isNodeAttachedToEdge(node.id, hoveredEdge)
                ? "edge"
                : "default";
            const context = compareActive
              ? comparedNodeSet.has(node.id)
                ? "compared"
                : dimUnrelated
                  ? "dimmed"
                  : "default"
              : selected
                ? "selected"
                : routeNodeSet.has(node.id) || hovered || connected
                  ? "connected"
                  : dimUnrelated || hoverTraceActive
                    ? "dimmed"
                    : "default";
            const routeContext = routeActive
              ? routeEndpointSet.has(node.id)
                ? "endpoint"
                : routeNodeSet.has(node.id)
                  ? "route"
                  : dimUnrelated
                    ? "dimmed"
                    : "default"
              : "default";
            const routePosition = routeNodeStepMap.get(node.id);
            const nodeStats = nodePathwayStats.get(node.id) ?? {
              incoming: 0,
              outgoing: 0,
              total: 0,
            };
            const connectedPathwayLabel = t(
              "graphStatus.node.connectedPathways",
              {
                total: nodeStats.total,
                incoming: nodeStats.incoming,
                outgoing: nodeStats.outgoing,
              },
            );
            const incomingPathwayLabel = t("graphStatus.node.incomingShort", {
              count: nodeStats.incoming,
            });
            const outgoingPathwayLabel = t("graphStatus.node.outgoingShort", {
              count: nodeStats.outgoing,
            });
            const pathwayBalanceLabel = t("graphStatus.node.pathwayBalance", {
              incoming: nodeStats.incoming,
              outgoing: nodeStats.outgoing,
            });
            const incomingPathwayShare = nodeStats.total
              ? Math.round((nodeStats.incoming / nodeStats.total) * 100)
              : 0;
            const outgoingPathwayShare = nodeStats.total
              ? 100 - incomingPathwayShare
              : 0;
            const pathwayBias = getPathwayBias(
              nodeStats.incoming,
              nodeStats.outgoing,
            );
            const routeLabel = routePosition
              ? routePosition === 1
                ? ` ${t("graphStatus.node.routeStart")}`
                : routePosition === routeNodeCount
                  ? ` ${t("graphStatus.node.routeTarget")}`
                  : ` ${t("graphStatus.node.routeNode", {
                      position: routePosition,
                      count: routeNodeCount,
                    })}`
              : "";
            const routeStageLabel = routePosition
              ? routePosition === 1
                ? t("graphStatus.node.stageStart")
                : routePosition === routeNodeCount
                  ? t("graphStatus.node.stageTarget")
                  : t("graphStatus.node.stageStep", { position: routePosition })
              : null;
            const nodeFlowBand = nodeFlowBandById.get(node.id);
            const nodeFlowActive = nodeFlowBand
              ? activeGraphFlowBandSet.has(nodeFlowBand.id)
              : false;
            const nodeLayerPriority: GraphLayerPriority = selected
              ? "selected"
              : hovered || directionEdgeRole
                ? "preview"
                : routeEndpointSet.has(node.id)
                  ? "endpoint"
                  : routeNodeSet.has(node.id)
                    ? "route"
                    : context === "compared"
                      ? "compared"
                      : context === "connected"
                        ? "connected"
                        : context === "dimmed"
                          ? "dimmed"
                          : "default";

            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={selected}
                aria-label={t("graphStatus.node.ariaLabel", {
                  name: node.name,
                  route: routeLabel,
                  edgeRole: directionEdgeAria,
                  pathways: connectedPathwayLabel,
                })}
                data-testid={`chem-node-${node.id}`}
                data-chem-pathway-total={nodeStats.total}
                data-chem-pathway-incoming={nodeStats.incoming}
                data-chem-pathway-outgoing={nodeStats.outgoing}
                data-chem-pathway-bias={pathwayBias}
                data-chem-context={context}
                data-chem-route-context={routeContext}
                data-chem-route-step={routePosition}
                data-chem-edge-role={directionEdgeRole ?? undefined}
                data-chem-edge-role-context={directionEdgeContext}
                data-chem-hover-context={hoverContext}
                data-chem-flow-band={nodeFlowBand?.id}
                data-chem-flow-order={nodeFlowBand?.order}
                data-chem-flow-tone={nodeFlowBand?.tone}
                data-chem-layer-priority={nodeLayerPriority}
                data-chem-interactive="true"
                className={[
                  "absolute z-20 flex flex-col items-start justify-between overflow-hidden rounded-[24px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  selected
                    ? "border-teal-700 bg-teal-500/15 shadow-sm ring-2 ring-teal-600/40"
                    : routeEndpointSet.has(node.id)
                      ? "border-amber-600 bg-amber-500/12 shadow-sm ring-2 ring-amber-500/30"
                      : routeNodeSet.has(node.id)
                        ? "border-amber-500/35 bg-amber-500/10"
                        : context === "compared"
                          ? "border-teal-700 bg-teal-500/15 shadow-sm ring-2 ring-teal-600/30"
                          : context === "connected"
                            ? "border-teal-500/30 bg-teal-500/10"
                            : context === "dimmed"
                              ? "border-line bg-paper text-ink-500 opacity-55"
                              : "border-line bg-paper hover:border-ink-950/20 hover:bg-paper-strong",
                ].join(" ")}
                style={{
                  left: position.x + SCENE_PADDING,
                  top: position.y + SCENE_PADDING,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  zIndex: GRAPH_NODE_Z_INDEX[nodeLayerPriority],
                }}
                onPointerEnter={() => setHoveredNodeId(node.id)}
                onPointerLeave={() =>
                  setHoveredNodeId((current) =>
                    current === node.id ? null : current,
                  )
                }
                onFocus={() => setHoveredNodeId(node.id)}
                onBlur={() =>
                  setHoveredNodeId((current) =>
                    current === node.id ? null : current,
                  )
                }
                onClick={() => onSelectNode(node.id)}
              >
                {nodeFlowBand ? (
                  <span
                    aria-hidden="true"
                    data-testid={`chem-node-flow-stage-${node.id}`}
                    data-chem-flow-band={nodeFlowBand.id}
                    data-chem-flow-order={nodeFlowBand.order}
                    data-chem-flow-tone={nodeFlowBand.tone}
                    data-chem-flow-active={nodeFlowActive ? "true" : "false"}
                    className={joinClasses(
                      "absolute inset-x-0 top-0 h-1.5 transition-opacity",
                      nodeFlowActive ? "opacity-100" : "opacity-70",
                      nodeFlowBand.tone === "sink"
                        ? "bg-amber-500/55"
                        : nodeFlowBand.tone === "source"
                          ? "bg-teal-500/55"
                          : "bg-ink-500/20",
                    )}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  title={pathwayBalanceLabel}
                  data-testid={`chem-node-pathway-bias-${node.id}`}
                  data-chem-pathway-bias={pathwayBias}
                  className={joinClasses(
                    "absolute left-0 top-4 h-12 w-1.5 rounded-r-full shadow-sm",
                    pathwayBias === "incoming-heavy"
                      ? "bg-teal-500/75"
                      : pathwayBias === "outgoing-heavy"
                        ? "bg-amber-500/75"
                        : pathwayBias === "balanced"
                          ? "bg-gradient-to-b from-teal-500/70 to-amber-500/70"
                          : "bg-line",
                  )}
                />
                <span
                  aria-hidden="true"
                  title={pathwayBalanceLabel}
                  data-testid={`chem-node-pathway-balance-${node.id}`}
                  data-chem-incoming-share={incomingPathwayShare}
                  data-chem-outgoing-share={outgoingPathwayShare}
                  className="absolute inset-x-0 bottom-0 flex h-1.5 overflow-hidden bg-line/55"
                >
                  <span
                    data-testid={`chem-node-pathway-balance-incoming-${node.id}`}
                    className="h-full bg-teal-500/70"
                    style={{ width: `${incomingPathwayShare}%` }}
                  />
                  <span
                    data-testid={`chem-node-pathway-balance-outgoing-${node.id}`}
                    className="h-full bg-amber-500/70"
                    style={{ width: `${outgoingPathwayShare}%` }}
                  />
                </span>
                {routePosition ? (
                  <span
                    aria-hidden="true"
                    data-testid={`chem-node-route-step-${node.id}`}
                    className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-amber-500 text-[0.7rem] font-bold leading-none text-ink-950 shadow-sm ring-2 ring-paper/80"
                  >
                    {routePosition}
                  </span>
                ) : null}
                {directionEdgeRole ? (
                  <span
                    aria-hidden="true"
                    data-testid={`chem-node-edge-role-${node.id}`}
                    className={joinClasses(
                      "absolute right-3 z-10 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] shadow-sm ring-2 ring-paper/80",
                      routePosition ? "top-10" : "top-3",
                      directionEdgeRole === "source"
                        ? "border-teal-500/40 bg-teal-500/10 text-teal-900"
                        : "border-amber-500/45 bg-amber-500/12 text-amber-950",
                    )}
                  >
                    {directionEdgeLabel}
                  </span>
                ) : null}
                <div
                  className={joinClasses(
                    "space-y-1",
                    routePosition || directionEdgeRole ? "pr-8" : undefined,
                  )}
                >
                  <span className="lab-label inline-flex items-center gap-1.5">
                    {nodeFlowBand ? (
                      <span
                        aria-hidden="true"
                        data-testid={`chem-node-flow-pill-${node.id}`}
                        data-chem-flow-band={nodeFlowBand.id}
                        data-chem-flow-order={nodeFlowBand.order}
                        data-chem-flow-tone={nodeFlowBand.tone}
                        data-chem-flow-active={
                          nodeFlowActive ? "true" : "false"
                        }
                        className={joinClasses(
                          "grid size-5 place-items-center rounded-full border text-[0.58rem] font-black leading-none shadow-sm transition-colors",
                          nodeFlowBand.tone === "sink"
                            ? nodeFlowActive
                              ? "border-amber-500/45 bg-amber-500/20 text-amber-950"
                              : "border-amber-500/25 bg-amber-500/10 text-amber-800"
                            : nodeFlowBand.tone === "source"
                              ? nodeFlowActive
                                ? "border-teal-500/45 bg-teal-500/20 text-teal-900"
                                : "border-teal-500/25 bg-teal-500/10 text-teal-800"
                              : nodeFlowActive
                                ? "border-ink-500/25 bg-ink-500/10 text-ink-800"
                                : "border-line bg-paper-strong text-ink-500",
                        )}
                      >
                        {nodeFlowBand.order}
                      </span>
                    ) : null}
                    {node.functionalGroupVisual ? (
                      <ChemistryInlineNotation
                        value={node.functionalGroupVisual}
                      />
                    ) : null}
                  </span>
                  <span
                    data-chem-label-role="family-primary"
                    className="block text-xl font-bold leading-tight text-ink-950"
                  >
                    {node.name}
                  </span>
                </div>
                <div className="flex w-full items-end justify-between gap-2">
                  <span className="min-w-0 text-[0.72rem] leading-5 text-ink-600">
                    <ChemistryInlineNotation value={node.generalFormula} />
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {routeStageLabel ? (
                      <span
                        aria-hidden="true"
                        data-testid={`chem-node-route-stage-${node.id}`}
                        data-chem-route-stage-label={routeStageLabel}
                        className={joinClasses(
                          "rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] leading-none shadow-sm",
                          routeEndpointSet.has(node.id)
                            ? "border-amber-500/45 bg-amber-500/15 text-amber-950"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-900",
                        )}
                      >
                        {routeStageLabel}
                      </span>
                    ) : null}
                    <span
                      aria-hidden="true"
                      title={pathwayBalanceLabel}
                      data-testid={`chem-node-pathway-count-${node.id}`}
                      data-chem-pathway-count-label={pathwayBalanceLabel}
                      className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-paper-strong/90 px-2 py-0.5 text-[0.62rem] font-semibold leading-none text-ink-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      <span
                        data-testid={`chem-node-pathway-incoming-${node.id}`}
                        className="inline-flex items-center gap-0.5"
                      >
                        {incomingPathwayLabel}
                      </span>
                      <span aria-hidden="true" className="text-ink-400">
                        {" · "}
                      </span>
                      <span
                        data-testid={`chem-node-pathway-outgoing-${node.id}`}
                        className="inline-flex items-center gap-0.5"
                      >
                        {outgoingPathwayLabel}
                      </span>
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
