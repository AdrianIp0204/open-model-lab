import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber } from "./math";
import type { GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";

export type GraphTraversalParams = {
  graphIndex?: number;
  startNodeIndex?: number;
  targetNodeIndex?: number;
  traversalMode?: number;
};

export type GraphTraversalNode = {
  index: number;
  label: string;
  x: number;
  y: number;
};

export type GraphTraversalEdge = {
  from: number;
  to: number;
};

export type GraphTraversalNeighborSummary = {
  index: number;
  label: string;
  status: "current" | "frontier" | "visited" | "target" | "new" | "repeat" | "unseen";
  depth: number | null;
};

export type GraphTraversalFrontierEntry = {
  index: number;
  label: string;
  depth: number;
  next: boolean;
};

export type GraphTraversalTreeEdge = {
  from: number;
  to: number;
};

export type GraphTraversalFrame = {
  currentNodeIndex: number | null;
  inspectedNeighborIndex: number | null;
  inspectedNeighborStatus: "new" | "repeat" | null;
  frontierNodes: number[];
  visitedNodes: number[];
  seenNodes: number[];
  treeEdges: GraphTraversalTreeEdge[];
  repeatSkips: number;
  newDiscoveries: number;
  foundTarget: boolean;
  completed: boolean;
  stepLabel: string;
  statusLine: string;
};

export type GraphTraversalSnapshot = GraphTraversalFrame & {
  graphIndex: number;
  graphId: string;
  graphLabel: string;
  graphSummary: string;
  traversalMode: number;
  traversalLabel: string;
  frontierLabel: string;
  startNodeIndex: number;
  targetNodeIndex: number;
  targetLabel: string;
  currentLabel: string | null;
  currentDepth: number;
  maxDepthReached: number;
  visitedCount: number;
  frontierSize: number;
  seenCount: number;
  duration: number;
  stepCount: number;
  neighborChecks: number;
  nodes: GraphTraversalNode[];
  edges: GraphTraversalEdge[];
  adjacencyLabels: string[];
  frontierEntries: GraphTraversalFrontierEntry[];
  currentNeighbors: GraphTraversalNeighborSummary[];
  visitOrderLabels: string[];
  depthByNode: Record<number, number>;
};

type GraphTraversalPreset = {
  id: string;
  label: string;
  summary: string;
  nodes: GraphTraversalNode[];
  adjacency: number[][];
};

export const GRAPH_TRAVERSAL_GRAPH_MIN = 0;
export const GRAPH_TRAVERSAL_GRAPH_MAX = 2;
export const GRAPH_TRAVERSAL_NODE_MIN = 0;
export const GRAPH_TRAVERSAL_NODE_MAX = 7;
export const GRAPH_TRAVERSAL_MODE_MIN = 0;
export const GRAPH_TRAVERSAL_MODE_MAX = 1;
export const GRAPH_TRAVERSAL_FRAME_DURATION = 0.78;

const graphPresets: GraphTraversalPreset[] = [
  {
    id: "layered-campus",
    label: "Layered campus",
    summary: "A layered walkway graph where breadth-first layers stay easy to see.",
    nodes: [
      { index: 0, label: "A", x: 84, y: 118 },
      { index: 1, label: "B", x: 184, y: 54 },
      { index: 2, label: "C", x: 184, y: 182 },
      { index: 3, label: "D", x: 314, y: 40 },
      { index: 4, label: "E", x: 314, y: 118 },
      { index: 5, label: "F", x: 314, y: 206 },
      { index: 6, label: "G", x: 454, y: 76 },
      { index: 7, label: "H", x: 454, y: 180 },
    ],
    adjacency: [
      [1, 2],
      [0, 3, 4],
      [0, 4, 5],
      [1, 6],
      [1, 2, 6, 7],
      [2, 7],
      [3, 4],
      [4, 5],
    ],
  },
  {
    id: "bridge-cycle",
    label: "Bridge cycle",
    summary: "Two small diamond cycles joined by a bridge so repeat work becomes obvious.",
    nodes: [
      { index: 0, label: "A", x: 86, y: 118 },
      { index: 1, label: "B", x: 166, y: 58 },
      { index: 2, label: "C", x: 166, y: 178 },
      { index: 3, label: "D", x: 250, y: 118 },
      { index: 4, label: "E", x: 350, y: 118 },
      { index: 5, label: "F", x: 432, y: 58 },
      { index: 6, label: "G", x: 432, y: 178 },
      { index: 7, label: "H", x: 516, y: 118 },
    ],
    adjacency: [
      [1, 2],
      [0, 3],
      [0, 3],
      [1, 2, 4],
      [3, 5, 6],
      [4, 7],
      [4, 7],
      [5, 6],
    ],
  },
  {
    id: "hub-detours",
    label: "Hub and detours",
    summary: "A hub graph with two detours, useful for watching the frontier widen or stay narrow.",
    nodes: [
      { index: 0, label: "A", x: 88, y: 118 },
      { index: 1, label: "B", x: 176, y: 118 },
      { index: 2, label: "C", x: 264, y: 78 },
      { index: 3, label: "D", x: 352, y: 118 },
      { index: 4, label: "E", x: 442, y: 118 },
      { index: 5, label: "F", x: 264, y: 188 },
      { index: 6, label: "G", x: 352, y: 206 },
      { index: 7, label: "H", x: 442, y: 190 },
    ],
    adjacency: [
      [1],
      [0, 2],
      [1, 3, 5],
      [2, 4, 7],
      [3],
      [2, 6],
      [5, 7],
      [3, 6],
    ],
  },
];

function resolveDiscreteIndex(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(clamp(safeNumber(value, fallback), min, max));
}

function getGraphPreset(index: number) {
  return graphPresets[
    resolveDiscreteIndex(index, 0, GRAPH_TRAVERSAL_GRAPH_MIN, GRAPH_TRAVERSAL_GRAPH_MAX)
  ];
}

function getLocalizedTraversalLabel(mode: number, locale: AppLocale) {
  return resolveDiscreteIndex(mode, 0, GRAPH_TRAVERSAL_MODE_MIN, GRAPH_TRAVERSAL_MODE_MAX) === 0
    ? copyText(locale, "Breadth-first search", "廣度優先搜尋")
    : copyText(locale, "Depth-first search", "深度優先搜尋");
}

function getLocalizedFrontierLabel(mode: number, locale: AppLocale) {
  return resolveDiscreteIndex(mode, 0, GRAPH_TRAVERSAL_MODE_MIN, GRAPH_TRAVERSAL_MODE_MAX) === 0
    ? copyText(locale, "Queue frontier", "佇列前沿")
    : copyText(locale, "Stack frontier", "堆疊前沿");
}

function getLocalizedGraphPresetLabel(preset: GraphTraversalPreset, locale: AppLocale) {
  switch (preset.id) {
    case "layered-campus":
      return copyText(locale, preset.label, "分層校園");
    case "bridge-cycle":
      return copyText(locale, preset.label, "橋接循環");
    case "hub-detours":
      return copyText(locale, preset.label, "樞紐與繞道");
    default:
      return preset.label;
  }
}

function getLocalizedGraphPresetSummary(preset: GraphTraversalPreset, locale: AppLocale) {
  switch (preset.id) {
    case "layered-campus":
      return copyText(locale, preset.summary, "一個分層步道圖，讓廣度優先的層級結構更容易看見。");
    case "bridge-cycle":
      return copyText(locale, preset.summary, "兩個小菱形循環以一條橋相連，讓重複探索特別明顯。");
    case "hub-detours":
      return copyText(locale, preset.summary, "一個帶有兩條繞道的樞紐圖，適合觀察前沿如何擴張或保持狹窄。");
    default:
      return preset.summary;
  }
}

function toDepthRecord(depthByNode: Map<number, number>) {
  return Object.fromEntries(depthByNode.entries()) as Record<number, number>;
}

function buildEdges(adjacency: number[][]) {
  const edgeKeys = new Set<string>();
  const edges: GraphTraversalEdge[] = [];

  for (const [from, neighbors] of adjacency.entries()) {
    for (const to of neighbors) {
      const left = Math.min(from, to);
      const right = Math.max(from, to);
      const key = `${left}-${right}`;

      if (edgeKeys.has(key)) {
        continue;
      }

      edgeKeys.add(key);
      edges.push({ from: left, to: right });
    }
  }

  return edges;
}

export function resolveGraphTraversalParams(
  source: Partial<GraphTraversalParams> | Record<string, number | boolean | string>,
): Required<GraphTraversalParams> {
  return {
    graphIndex: resolveDiscreteIndex(
      source.graphIndex,
      0,
      GRAPH_TRAVERSAL_GRAPH_MIN,
      GRAPH_TRAVERSAL_GRAPH_MAX,
    ),
    startNodeIndex: resolveDiscreteIndex(
      source.startNodeIndex,
      0,
      GRAPH_TRAVERSAL_NODE_MIN,
      GRAPH_TRAVERSAL_NODE_MAX,
    ),
    targetNodeIndex: resolveDiscreteIndex(
      source.targetNodeIndex,
      7,
      GRAPH_TRAVERSAL_NODE_MIN,
      GRAPH_TRAVERSAL_NODE_MAX,
    ),
    traversalMode: resolveDiscreteIndex(
      source.traversalMode,
      0,
      GRAPH_TRAVERSAL_MODE_MIN,
      GRAPH_TRAVERSAL_MODE_MAX,
    ),
  };
}

function cloneFrame(frame: GraphTraversalFrame): GraphTraversalFrame {
  return {
    ...frame,
    frontierNodes: [...frame.frontierNodes],
    visitedNodes: [...frame.visitedNodes],
    seenNodes: [...frame.seenNodes],
    treeEdges: frame.treeEdges.map((edge) => ({ ...edge })),
  };
}

function buildTraversal(params: Required<GraphTraversalParams>, locale: AppLocale = "en") {
  const preset = getGraphPreset(params.graphIndex);
  const startNodeIndex = resolveDiscreteIndex(
    params.startNodeIndex,
    0,
    GRAPH_TRAVERSAL_NODE_MIN,
    preset.nodes.length - 1,
  );
  const targetNodeIndex = resolveDiscreteIndex(
    params.targetNodeIndex,
    preset.nodes.length - 1,
    GRAPH_TRAVERSAL_NODE_MIN,
    preset.nodes.length - 1,
  );
  const traversalMode = resolveDiscreteIndex(
    params.traversalMode,
    0,
    GRAPH_TRAVERSAL_MODE_MIN,
    GRAPH_TRAVERSAL_MODE_MAX,
  );
  const frames: GraphTraversalFrame[] = [];
  const frontier = [startNodeIndex];
  const visitedOrder: number[] = [];
  const seenSet = new Set<number>([startNodeIndex]);
  const depthByNode = new Map<number, number>([[startNodeIndex, 0]]);
  const parentByNode = new Map<number, number>();
  let repeatSkips = 0;
  let newDiscoveries = 1;
  let foundTarget = false;

  const snapshotFrame = (
    options: Omit<
      GraphTraversalFrame,
      "frontierNodes" | "visitedNodes" | "seenNodes" | "treeEdges" | "repeatSkips" | "newDiscoveries"
    >,
  ): GraphTraversalFrame => ({
    ...options,
    frontierNodes: [...frontier],
    visitedNodes: [...visitedOrder],
    seenNodes: [...seenSet].sort((left, right) => left - right),
    treeEdges: Array.from(parentByNode.entries()).map(([to, from]) => ({ from, to })),
    repeatSkips,
    newDiscoveries,
  });

  frames.push(
    snapshotFrame({
      currentNodeIndex: null,
      inspectedNeighborIndex: null,
      inspectedNeighborStatus: null,
      foundTarget: false,
      completed: false,
      stepLabel: copyText(locale, "Traversal ready", "遍歷已就緒"),
      statusLine:
        traversalMode === 0
          ? copyText(locale, "The queue frontier starts with the start node, then expands outward layer by layer.", "佇列前沿從起始節點開始，然後一層一層向外擴張。")
          : copyText(locale, "The stack frontier starts with the start node, then keeps the newest branch on top.", "堆疊前沿從起始節點開始，並把最新發現的分支保留在最上方。"),
    }),
  );

  while (frontier.length > 0) {
    const currentNodeIndex =
      traversalMode === 0 ? frontier.shift() ?? null : frontier.pop() ?? null;

    if (currentNodeIndex === null) {
      break;
    }

    visitedOrder.push(currentNodeIndex);
    foundTarget = currentNodeIndex === targetNodeIndex;

    frames.push(
      snapshotFrame({
        currentNodeIndex,
        inspectedNeighborIndex: null,
        inspectedNeighborStatus: null,
        foundTarget,
        completed: foundTarget,
        stepLabel:
          locale === "zh-HK"
            ? `探訪 ${preset.nodes[currentNodeIndex]?.label ?? "節點"}`
            : `Visit ${preset.nodes[currentNodeIndex]?.label ?? "node"}`,
        statusLine: foundTarget
          ? locale === "zh-HK"
            ? `搜尋已到達目標 ${preset.nodes[targetNodeIndex]?.label ?? "?"}，因此可以在這裡停止。`
            : `The search reached target ${preset.nodes[targetNodeIndex]?.label ?? "?"}, so the run can stop here.`
          : traversalMode === 0
            ? copyText(locale, "This node leaves the queue frontier now, and its neighbors will be claimed in layer order.", "這個節點現在會離開佇列前沿，而它的鄰居會按層級順序被納入。")
            : copyText(locale, "This node leaves the stack frontier now, and the newest discovered branch will stay on top.", "這個節點現在會離開堆疊前沿，而最新發現的分支會保留在最上方。"),
      }),
    );

    if (foundTarget) {
      break;
    }

    const currentDepth = depthByNode.get(currentNodeIndex) ?? 0;
    const neighbors = preset.adjacency[currentNodeIndex] ?? [];

    for (const neighborIndex of neighbors) {
      const repeated = seenSet.has(neighborIndex);

      if (repeated) {
        repeatSkips += 1;
      } else {
        seenSet.add(neighborIndex);
        frontier.push(neighborIndex);
        depthByNode.set(neighborIndex, currentDepth + 1);
        parentByNode.set(neighborIndex, currentNodeIndex);
        newDiscoveries += 1;
      }

      frames.push(
        snapshotFrame({
          currentNodeIndex,
          inspectedNeighborIndex: neighborIndex,
          inspectedNeighborStatus: repeated ? "repeat" : "new",
          foundTarget,
          completed: false,
          stepLabel: repeated
            ? locale === "zh-HK"
              ? `略過通往 ${preset.nodes[neighborIndex]?.label ?? "節點"} 的重複邊`
              : `Skip repeat edge to ${preset.nodes[neighborIndex]?.label ?? "node"}`
            : locale === "zh-HK"
              ? `把 ${preset.nodes[neighborIndex]?.label ?? "節點"} 加入${traversalMode === 0 ? "佇列" : "堆疊"}`
              : `Add ${preset.nodes[neighborIndex]?.label ?? "node"} to the ${traversalMode === 0 ? "queue" : "stack"}`,
          statusLine: repeated
            ? copyText(locale, "This neighbor was already claimed, so visited state prevents the search from looping back over old work.", "這個鄰居已經被納入，因此已探訪狀態會阻止搜尋回頭重複做舊工作。")
            : traversalMode === 0
              ? copyText(locale, "A new neighbor joins the back of the queue frontier, ready for a later layer.", "新鄰居會加入佇列前沿尾端，等待之後的層級處理。")
              : copyText(locale, "A new neighbor joins the top of the stack frontier, ready for a deeper branch next.", "新鄰居會加入堆疊前沿頂端，準備下一步走向更深的分支。"),
        }),
      );
    }
  }

  const finalFrame = frames.at(-1);
  if (finalFrame && !finalFrame.completed) {
    frames.push(
      snapshotFrame({
        currentNodeIndex: finalFrame.currentNodeIndex,
        inspectedNeighborIndex: null,
        inspectedNeighborStatus: null,
        foundTarget,
        completed: true,
        stepLabel: foundTarget
          ? copyText(locale, "Traversal complete", "遍歷完成")
          : copyText(locale, "Traversal exhausted", "前沿已耗盡"),
        statusLine: foundTarget
          ? locale === "zh-HK"
            ? `搜尋在前沿耗盡前已找到 ${preset.nodes[targetNodeIndex]?.label ?? "目標"}。`
            : `The search found ${preset.nodes[targetNodeIndex]?.label ?? "the target"} before the frontier emptied.`
          : copyText(locale, "The frontier is empty, so every reachable node has already been inspected.", "前沿已經清空，所以所有可達節點都已檢查過。"),
      }),
    );
  }

  return {
    frames: frames.map(cloneFrame),
    preset,
    startNodeIndex,
    targetNodeIndex,
    traversalMode,
    depthByNode: toDepthRecord(depthByNode),
  };
}

function buildNeighborSummaries(
  snapshot: GraphTraversalFrame,
  preset: GraphTraversalPreset,
  targetNodeIndex: number,
  depthByNode: Record<number, number>,
) {
  if (snapshot.currentNodeIndex === null) {
    return [] as GraphTraversalNeighborSummary[];
  }

  const frontierSet = new Set(snapshot.frontierNodes);
  const visitedSet = new Set(snapshot.visitedNodes);

  return (preset.adjacency[snapshot.currentNodeIndex] ?? []).map((neighborIndex) => {
    let status: GraphTraversalNeighborSummary["status"] = "unseen";

    if (snapshot.inspectedNeighborIndex === neighborIndex) {
      status = snapshot.inspectedNeighborStatus === "repeat" ? "repeat" : "new";
    } else if (neighborIndex === snapshot.currentNodeIndex) {
      status = "current";
    } else if (visitedSet.has(neighborIndex)) {
      status = "visited";
    } else if (frontierSet.has(neighborIndex)) {
      status = "frontier";
    } else if (neighborIndex === targetNodeIndex) {
      status = "target";
    }

    return {
      index: neighborIndex,
      label: preset.nodes[neighborIndex]?.label ?? `N${neighborIndex}`,
      status,
      depth: depthByNode[neighborIndex] ?? null,
    };
  });
}

export function buildGraphTraversalFrames(
  source: Partial<GraphTraversalParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
) {
  return buildTraversal(resolveGraphTraversalParams(source), locale).frames;
}

export function resolveGraphTraversalDuration(
  source: Partial<GraphTraversalParams> | Record<string, number | boolean | string>,
) {
  const { frames } = buildTraversal(resolveGraphTraversalParams(source));
  return Math.max(0, (frames.length - 1) * GRAPH_TRAVERSAL_FRAME_DURATION);
}

export function sampleGraphTraversalState(
  source: Partial<GraphTraversalParams> | Record<string, number | boolean | string>,
  time: number,
  locale: AppLocale = "en",
): GraphTraversalSnapshot {
  const resolved = resolveGraphTraversalParams(source);
  const {
    frames,
    preset,
    startNodeIndex,
    targetNodeIndex,
    traversalMode,
    depthByNode,
  } = buildTraversal(resolved, locale);
  const frameIndex = frames.length
    ? clamp(Math.floor(Math.max(time, 0) / GRAPH_TRAVERSAL_FRAME_DURATION), 0, frames.length - 1)
    : 0;
  const snapshot = frames[frameIndex] ?? frames[0];
  const visitedCount = snapshot?.visitedNodes.length ?? 0;
  const frontierSize = snapshot?.frontierNodes.length ?? 0;
  const currentNodeIndex = snapshot?.currentNodeIndex ?? null;
  const currentDepth = currentNodeIndex === null ? 0 : depthByNode[currentNodeIndex] ?? 0;
  const maxDepthReached = Math.max(0, ...Object.values(depthByNode));

  return {
    ...(snapshot ?? {
      currentNodeIndex: null,
      inspectedNeighborIndex: null,
      inspectedNeighborStatus: null,
      frontierNodes: [startNodeIndex],
      visitedNodes: [],
      seenNodes: [startNodeIndex],
      treeEdges: [],
      repeatSkips: 0,
      newDiscoveries: 1,
      foundTarget: false,
      completed: false,
      stepLabel: copyText(locale, "Traversal ready", "遍歷已就緒"),
      statusLine: copyText(locale, "The graph is ready for traversal.", "圖結構已準備好開始遍歷。"),
    }),
    graphIndex: resolved.graphIndex,
    graphId: preset.id,
    graphLabel: getLocalizedGraphPresetLabel(preset, locale),
    graphSummary: getLocalizedGraphPresetSummary(preset, locale),
    traversalMode,
    traversalLabel: getLocalizedTraversalLabel(traversalMode, locale),
    frontierLabel: getLocalizedFrontierLabel(traversalMode, locale),
    startNodeIndex,
    targetNodeIndex,
    targetLabel: preset.nodes[targetNodeIndex]?.label ?? "A",
    currentLabel: currentNodeIndex === null ? null : preset.nodes[currentNodeIndex]?.label ?? null,
    currentDepth,
    maxDepthReached,
    visitedCount,
    frontierSize,
    seenCount: snapshot?.seenNodes.length ?? 1,
    duration: Math.max(0, (frames.length - 1) * GRAPH_TRAVERSAL_FRAME_DURATION),
    stepCount: frames.length,
    neighborChecks: (snapshot?.newDiscoveries ?? 1) + (snapshot?.repeatSkips ?? 0) - 1,
    nodes: preset.nodes,
    edges: buildEdges(preset.adjacency),
    adjacencyLabels: preset.adjacency.map((neighbors) =>
      neighbors.map((neighborIndex) => preset.nodes[neighborIndex]?.label ?? "").join(", "),
    ),
    frontierEntries: (snapshot?.frontierNodes ?? []).map((nodeIndex, index, frontierNodes) => ({
      index: nodeIndex,
      label: preset.nodes[nodeIndex]?.label ?? `N${nodeIndex}`,
      depth: depthByNode[nodeIndex] ?? 0,
      next:
        traversalMode === 0
          ? index === 0
          : index === frontierNodes.length - 1,
    })),
    currentNeighbors: buildNeighborSummaries(
      snapshot ?? {
        currentNodeIndex: null,
        inspectedNeighborIndex: null,
        inspectedNeighborStatus: null,
        frontierNodes: [startNodeIndex],
        visitedNodes: [],
        seenNodes: [startNodeIndex],
        treeEdges: [],
        repeatSkips: 0,
        newDiscoveries: 1,
        foundTarget: false,
        completed: false,
        stepLabel: copyText(locale, "Traversal ready", "遍歷已就緒"),
        statusLine: copyText(locale, "The graph is ready for traversal.", "圖結構已準備好開始遍歷。"),
      },
      preset,
      targetNodeIndex,
      depthByNode,
    ),
    visitOrderLabels: (snapshot?.visitedNodes ?? []).map(
      (nodeIndex) => preset.nodes[nodeIndex]?.label ?? `N${nodeIndex}`,
    ),
    depthByNode,
  };
}

export function buildGraphTraversalSeries(
  source: Partial<GraphTraversalParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const { frames, depthByNode } = buildTraversal(resolveGraphTraversalParams(source), locale);

  return {
    "visited-frontier-history": [
      buildSeries(
        "visited-count",
        copyText(locale, "visited nodes", "已探訪節點"),
        frames.map((frame, index) => ({
          x: index * GRAPH_TRAVERSAL_FRAME_DURATION,
          y: frame.visitedNodes.length,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "frontier-size",
        copyText(locale, "frontier size", "前沿大小"),
        frames.map((frame, index) => ({
          x: index * GRAPH_TRAVERSAL_FRAME_DURATION,
          y: frame.frontierNodes.length,
        })),
        "#f0ab3c",
      ),
    ],
    "depth-history": [
      buildSeries(
        "current-depth",
        copyText(locale, "current depth", "目前深度"),
        frames.map((frame, index) => ({
          x: index * GRAPH_TRAVERSAL_FRAME_DURATION,
          y: frame.currentNodeIndex === null ? 0 : depthByNode[frame.currentNodeIndex] ?? 0,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "max-depth",
        copyText(locale, "deepest claimed depth", "已達最深深度"),
        frames.map((frame, index) => ({
          x: index * GRAPH_TRAVERSAL_FRAME_DURATION,
          y: Math.max(0, ...frame.seenNodes.map((nodeIndex) => depthByNode[nodeIndex] ?? 0)),
        })),
        "#0f172a",
        true,
      ),
    ],
    "neighbor-check-history": [
      buildSeries(
        "new-discoveries",
        copyText(locale, "new discoveries", "新發現節點"),
        frames.map((frame, index) => ({
          x: index * GRAPH_TRAVERSAL_FRAME_DURATION,
          y: Math.max(frame.newDiscoveries - 1, 0),
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "repeat-skips",
        copyText(locale, "repeat skips", "重複略過"),
        frames.map((frame, index) => ({
          x: index * GRAPH_TRAVERSAL_FRAME_DURATION,
          y: frame.repeatSkips,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describeGraphTraversalState(
  source: Partial<GraphTraversalParams> | Record<string, number | boolean | string>,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleGraphTraversalState(source, time, locale);
  const currentSummary = snapshot.currentLabel
    ? copyText(
        locale,
        `Current node ${snapshot.currentLabel} is being expanded at depth ${formatNumber(snapshot.currentDepth, 0)}.`,
        `目前正在擴展節點 ${snapshot.currentLabel}，深度為 ${formatNumber(snapshot.currentDepth, 0)}。`,
      )
    : copyText(locale, "The start node is waiting on the frontier.", "起始節點正在前沿中等待。");

  if (locale === "zh-HK") {
    return `${snapshot.traversalLabel} 正在 ${snapshot.graphLabel} 上執行，從 ${snapshot.nodes[snapshot.startNodeIndex]?.label ?? "A"} 走向 ${snapshot.targetLabel}。${currentSummary} 目前前沿共有 ${formatNumber(snapshot.frontierSize, 0)} 個節點，已探訪 ${formatNumber(snapshot.visitedCount, 0)} 個節點。`;
  }

  return `${snapshot.traversalLabel} is running on the ${snapshot.graphLabel.toLowerCase()} graph from ${snapshot.nodes[snapshot.startNodeIndex]?.label ?? "A"} toward ${snapshot.targetLabel}. ${currentSummary} The frontier currently holds ${formatNumber(snapshot.frontierSize, 0)} node${snapshot.frontierSize === 1 ? "" : "s"}, and ${formatNumber(snapshot.visitedCount, 0)} node${snapshot.visitedCount === 1 ? "" : "s"} have already been visited.`;
}
