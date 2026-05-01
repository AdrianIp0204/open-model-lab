"use client";

import { useLocale } from "next-intl";
import {
  formatNumber,
  sampleGraphTraversalState,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getVariantLabel } from "@/lib/i18n/copy-text";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type GraphTraversalSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

const WIDTH = 920;
const HEIGHT = 430;
const GRAPH_X = 24;
const GRAPH_Y = 46;
const GRAPH_WIDTH = 592;
const CARD_X = 646;
const CARD_Y = 66;
const CARD_WIDTH = 242;

function resolvePreviewTime(time: number, preview: GraphStagePreview | null | undefined) {
  if (!preview || preview.kind !== "time") {
    return time;
  }

  return preview.time;
}

function resolvePreviewLabel(
  preview: GraphStagePreview | null | undefined,
  locale: AppLocale,
) {
  if (!preview || preview.kind !== "time") {
    return null;
  }

  return `${copyText(locale, "preview t =", "預覽 t =")} ${formatNumber(preview.time)}`;
}

function overlayOpacity(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.32;
}

function toneForStatus(status: string) {
  switch (status) {
    case "current":
      return {
        fill: "rgba(241,102,89,0.94)",
        stroke: "rgba(194,65,12,0.88)",
        text: "#ffffff",
      };
    case "frontier":
    case "new":
      return {
        fill: "rgba(240,171,60,0.94)",
        stroke: "rgba(180,83,9,0.88)",
        text: "#0f172a",
      };
    case "repeat":
      return {
        fill: "rgba(15,28,36,0.18)",
        stroke: "rgba(15,28,36,0.4)",
        text: "#0f172a",
      };
    case "visited":
      return {
        fill: "rgba(30,166,162,0.92)",
        stroke: "rgba(13,148,136,0.88)",
        text: "#ffffff",
      };
    default:
      return {
        fill: "rgba(255,255,255,0.95)",
        stroke: "rgba(15,28,36,0.18)",
        text: "#0f172a",
      };
  }
}

function getNeighborStatusLabel(status: string, locale: AppLocale) {
  switch (status) {
    case "new":
      return copyText(locale, "new", "新加入");
    case "repeat":
      return copyText(locale, "seen", "已見過");
    case "frontier":
      return copyText(locale, "queued", "在前沿");
    case "visited":
      return copyText(locale, "done", "已完成");
    case "target":
      return copyText(locale, "target", "目標");
    default:
      return copyText(locale, "open", "未處理");
  }
}

function formatGraphSubtitle(
  traversalLabel: string,
  graphLabel: string,
  locale: AppLocale,
) {
  return locale === "zh-HK"
    ? `${traversalLabel} · ${graphLabel}`
    : `${traversalLabel} on ${graphLabel.toLowerCase()}`;
}

function GraphPanel({
  snapshot,
  title,
  subtitle,
  x,
  y,
  width,
  height,
  compact = false,
  ghost = false,
  overlayValues,
  focusedOverlayId,
  locale,
}: {
  snapshot: ReturnType<typeof sampleGraphTraversalState>;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  compact?: boolean;
  ghost?: boolean;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  locale: AppLocale;
}) {
  const visitedSet = new Set(snapshot.visitedNodes);
  const frontierSet = new Set(snapshot.frontierNodes);
  const treeEdgeKeys = new Set(snapshot.treeEdges.map((edge) => `${edge.from}-${edge.to}`));
  const visitStep = new Map(snapshot.visitedNodes.map((nodeIndex, index) => [nodeIndex, index + 1]));

  return (
    <g opacity={ghost ? 0.62 : 1}>
      <g transform={`translate(${x} ${y})`}>
        <rect
          width={width}
          height={height}
          rx="24"
          fill={ghost ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.92)"}
          stroke="rgba(15,28,36,0.12)"
          strokeDasharray={ghost ? "8 6" : undefined}
        />
        <text
          x="18"
          y="24"
          className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          {title}
        </text>
        <text x="18" y="46" className="fill-ink-950 text-[14px] font-semibold">
          {subtitle}
        </text>
        <text x={width - 18} y="24" textAnchor="end" className="fill-ink-600 text-[10px] font-semibold">
          {snapshot.frontierLabel}
        </text>
      </g>

      {snapshot.edges.map((edge) => {
        const from = snapshot.nodes[edge.from];
        const to = snapshot.nodes[edge.to];
        const key = `${edge.from}-${edge.to}`;
        const treeEdge = treeEdgeKeys.has(key);
        const activeEdge =
          snapshot.currentNodeIndex !== null &&
          snapshot.inspectedNeighborIndex !== null &&
          ((edge.from === snapshot.currentNodeIndex && edge.to === snapshot.inspectedNeighborIndex) ||
            (edge.to === snapshot.currentNodeIndex && edge.from === snapshot.inspectedNeighborIndex));

        return (
          <line
            key={`graph-edge-${key}`}
            x1={x + from.x}
            y1={y + from.y}
            x2={x + to.x}
            y2={y + to.y}
            stroke={
              activeEdge
                ? snapshot.inspectedNeighborStatus === "repeat"
                  ? "rgba(15,28,36,0.52)"
                  : "rgba(240,171,60,0.92)"
                : treeEdge
                  ? "rgba(30,166,162,0.58)"
                  : "rgba(15,28,36,0.12)"
            }
            strokeWidth={activeEdge ? 4 : treeEdge ? 3 : 2}
            strokeDasharray={activeEdge && snapshot.inspectedNeighborStatus === "repeat" ? "6 5" : undefined}
            opacity={
              activeEdge
                ? 1
                : treeEdge && overlayValues?.visitedCue !== false
                  ? overlayOpacity(focusedOverlayId, "visitedCue")
                  : 1
            }
          />
        );
      })}

      {snapshot.nodes.map((node) => {
        const isCurrent = snapshot.currentNodeIndex === node.index;
        const isFrontier = frontierSet.has(node.index);
        const isVisited = visitedSet.has(node.index);
        const isTarget = snapshot.targetNodeIndex === node.index;
        const tone = toneForStatus(
          isCurrent ? "current" : isFrontier ? "frontier" : isVisited ? "visited" : "unseen",
        );
        const visitBadge = visitStep.get(node.index);

        return (
          <g key={`graph-node-${node.index}`}>
            {isTarget ? (
              <circle
                cx={x + node.x}
                cy={y + node.y}
                r="20"
                fill="none"
                stroke="rgba(241,102,89,0.4)"
                strokeWidth="3"
                strokeDasharray="4 4"
              />
            ) : null}
            <circle
              cx={x + node.x}
              cy={y + node.y}
              r="16"
              fill={tone.fill}
              stroke={tone.stroke}
              strokeWidth="2"
            />
            <text
              x={x + node.x}
              y={y + node.y + 4}
              textAnchor="middle"
              className="text-[11px] font-semibold"
              style={{ fill: tone.text }}
            >
              {node.label}
            </text>
            {!compact && overlayValues?.visitedCue !== false && visitBadge ? (
              <g opacity={overlayOpacity(focusedOverlayId, "visitedCue")}>
                <rect
                  x={x + node.x + 12}
                  y={y + node.y - 22}
                  width="22"
                  height="16"
                  rx="8"
                  fill="rgba(255,255,255,0.94)"
                  stroke="rgba(30,166,162,0.28)"
                />
                <text
                  x={x + node.x + 23}
                  y={y + node.y - 11}
                  textAnchor="middle"
                  className="fill-teal-700 text-[9px] font-semibold"
                >
                  {visitBadge}
                </text>
              </g>
            ) : null}
            {!compact && node.index === snapshot.startNodeIndex ? (
              <text
                x={x + node.x}
                y={y + node.y + 30}
                textAnchor="middle"
                className="fill-teal-700 text-[9px] font-semibold uppercase tracking-[0.12em]"
              >
                {copyText(locale, "start", "起點")}
              </text>
            ) : null}
            {!compact && isTarget ? (
              <text
                x={x + node.x}
                y={y + node.y - 28}
                textAnchor="middle"
                className="fill-coral-700 text-[9px] font-semibold uppercase tracking-[0.12em]"
              >
                {copyText(locale, "target", "目標")}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function TraversalInfoPanel({
  x,
  y,
  width,
  snapshot,
  overlayValues,
  focusedOverlayId,
  locale,
}: {
  x: number;
  y: number;
  width: number;
  snapshot: ReturnType<typeof sampleGraphTraversalState>;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  locale: AppLocale;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height="132" rx="22" fill="rgba(255,255,255,0.92)" stroke="rgba(15,28,36,0.12)" />
      <text x="18" y="24" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
        {copyText(locale, "Traversal cues", "遍歷提示")}
      </text>

      {overlayValues?.frontierCue !== false ? (
        <g opacity={overlayOpacity(focusedOverlayId, "frontierCue")}>
          <text x="18" y="46" className="fill-ink-950 text-[13px] font-semibold">
            {snapshot.frontierLabel}
          </text>
          {snapshot.frontierEntries.length ? (
            snapshot.frontierEntries.map((entry, index) => (
              <g key={`frontier-chip-${entry.index}`} transform={`translate(${18 + index * 42} 58)`}>
                <rect
                  width="34"
                  height="22"
                  rx="11"
                  fill={entry.next ? "rgba(240,171,60,0.18)" : "rgba(15,28,36,0.08)"}
                  stroke={entry.next ? "rgba(217,119,6,0.5)" : "rgba(15,28,36,0.16)"}
                />
                <text x="17" y="15" textAnchor="middle" className="fill-ink-900 text-[10px] font-semibold">
                  {entry.label}
                </text>
              </g>
            ))
          ) : (
            <text x="18" y="74" className="fill-ink-600 text-[11px]">
              {copyText(locale, "The frontier is empty.", "前沿已清空。")}
            </text>
          )}
        </g>
      ) : null}

      {overlayValues?.adjacencyCue !== false ? (
        <g opacity={overlayOpacity(focusedOverlayId, "adjacencyCue")}>
          <text x="18" y="98" className="fill-ink-950 text-[13px] font-semibold">
            {snapshot.currentLabel
              ? locale === "zh-HK"
                ? `${snapshot.currentLabel} 的鄰居`
                : `Neighbors from ${snapshot.currentLabel}`
              : copyText(locale, "Start neighborhood", "起點鄰域")}
          </text>
          <text x="18" y="116" className="fill-ink-600 text-[11px]">
            {snapshot.currentNeighbors.length
              ? snapshot.currentNeighbors
                  .map((neighbor) => {
                    return `${neighbor.label} (${getNeighborStatusLabel(neighbor.status, locale)})`;
                  })
                  .join("  ")
              : snapshot.adjacencyLabels[snapshot.startNodeIndex] ||
                copyText(locale, "No neighbors", "沒有鄰居")}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export function GraphTraversalSimulation({
  concept,
  params,
  time,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: GraphTraversalSimulationProps) {
  const locale = useLocale() as AppLocale;
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const previewTime = resolvePreviewTime(time, graphPreview);
  const primaryParams =
    compare && previewedSetup === "b" ? compare.setupB : compare?.setupA ?? params;
  const secondaryParams =
    compare && previewedSetup === "b" ? compare.setupA : compare?.setupB ?? null;
  const primary = sampleGraphTraversalState(primaryParams, previewTime, locale);
  const secondary = secondaryParams
    ? sampleGraphTraversalState(secondaryParams, previewTime, locale)
    : null;
  const primaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelB ?? getVariantLabel(locale, "variant")
      : compare.labelA ?? getVariantLabel(locale, "baseline")
    : getVariantLabel(locale, "live");
  const secondaryLabel = compare
    ? previewedSetup === "b"
      ? compare.labelA ?? getVariantLabel(locale, "baseline")
      : compare.labelB ?? getVariantLabel(locale, "variant")
    : null;
  const previewLabel = resolvePreviewLabel(graphPreview, locale);
  const readoutRows = [
    { label: copyText(locale, "mode", "模式"), value: primary.traversalLabel },
    { label: copyText(locale, "graph", "圖"), value: primary.graphLabel },
    { label: copyText(locale, "current", "目前"), value: primary.currentLabel ?? copyText(locale, "ready", "就緒") },
    { label: copyText(locale, "frontier", "前沿"), value: formatNumber(primary.frontierSize, 0) },
    { label: copyText(locale, "visited", "已探訪"), value: formatNumber(primary.visitedCount, 0) },
    {
      label: copyText(locale, "target", "目標"),
      value: primary.foundTarget
        ? locale === "zh-HK"
          ? `${primary.targetLabel} 已找到`
          : `${primary.targetLabel} found`
        : primary.targetLabel,
    },
  ];
  const noteLines = [
    primary.stepLabel,
    primary.statusLine,
    compare
      ? copyText(
          locale,
          "The same paused step is applied to both saved scenes so queue-like and stack-like behavior can be compared directly.",
          "同一個暫停步驟會同時套用到兩個已保存場景，因此可以直接比較佇列式與堆疊式行為。",
        )
      : locale === "zh-HK"
        ? `${primary.frontierLabel} 會把下一批候選節點維持在可見範圍內，而已探訪狀態則避免重複工作。`
        : `${primary.frontierLabel} keeps the next candidates visible while visited state prevents repeat work.`,
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(15,28,36,0.08),rgba(30,166,162,0.12))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{copyText(locale, "Graph traversal bench", "圖遍歷工作台")}</p>
            <p className="mt-1 max-w-3xl text-xs text-ink-700">
              {copyText(
                locale,
                "Keep one live graph, the current frontier, and the visited state visible together so breadth-first and depth-first search read like different process choices on the same structure.",
                "把即時圖、目前前沿和已探訪狀態一起顯示，讓廣度優先與深度優先搜尋看起來像是在同一個結構上作出不同流程選擇。",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
            {compare ? (
              <>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {primaryLabel}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
                  {secondaryLabel}
                </span>
              </>
            ) : null}
            {previewLabel ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-sky-700">
                {previewLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.58)" />
        <GraphPanel
          snapshot={primary}
          title={secondary ? primaryLabel : copyText(locale, "Live graph", "即時圖")}
          subtitle={formatGraphSubtitle(primary.traversalLabel, primary.graphLabel, locale)}
          x={GRAPH_X}
          y={GRAPH_Y}
          width={GRAPH_WIDTH}
          height={secondary ? 150 : 326}
          compact={Boolean(secondary)}
          overlayValues={overlayValues}
          focusedOverlayId={focusedOverlayId}
          locale={locale}
        />
        {secondary ? (
          <GraphPanel
            snapshot={secondary}
            title={secondaryLabel ?? getVariantLabel(locale, "variant")}
            subtitle={formatGraphSubtitle(secondary.traversalLabel, secondary.graphLabel, locale)}
            x={GRAPH_X}
            y={214}
            width={GRAPH_WIDTH}
            height={150}
            compact
            ghost
            overlayValues={overlayValues}
            focusedOverlayId={focusedOverlayId}
            locale={locale}
          />
        ) : null}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={copyText(locale, "Traversal readout", "遍歷讀數")}
          setupLabel={primaryLabel}
          rows={readoutRows}
          noteLines={noteLines}
        />
        <TraversalInfoPanel
          x={CARD_X}
          y={248}
          width={CARD_WIDTH}
          snapshot={primary}
          overlayValues={overlayValues}
          focusedOverlayId={focusedOverlayId}
          locale={locale}
        />
      </svg>
    </section>
  );
}
