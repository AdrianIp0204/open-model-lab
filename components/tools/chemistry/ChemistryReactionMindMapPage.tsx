"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  type ChemistryEdge,
  type ChemistryNode,
  type ChemistryRoute,
  getChemistryAdjacentPathways,
  getChemistryDirectConversionsBetween,
  getChemistryReactionMindMapContent,
  getChemistryRoutesBetween,
  getChemistryNodeById,
  chemistryReactionGraphLayout,
} from "@/lib/tools/chemistry-reaction-mind-map";
import { ChemistryReactionGraph } from "./ChemistryReactionGraph";
import { ChemistryNodeDetails } from "./ChemistryNodeDetails";
import { ChemistryEdgeDetails } from "./ChemistryEdgeDetails";
import { ChemistryComparisonDetails } from "./ChemistryComparisonDetails";
import { ChemistryRouteExplorerDetails } from "./ChemistryRouteExplorerDetails";
import { LearningVisual } from "@/components/visuals/LearningVisual";

type ChemistrySelection =
  | { kind: "node"; id: ChemistryNode["id"] }
  | { kind: "edge"; id: ChemistryEdge["id"] }
  | null;

type ChemistryComparison =
  | {
      leftNodeId: ChemistryNode["id"];
      rightNodeId: ChemistryNode["id"];
    }
  | null;

type ChemistryRouteQuery = {
  startNodeId: ChemistryNode["id"];
  targetNodeId: ChemistryNode["id"];
};

type ChemistryRouteExplorerState =
  | {
      query: ChemistryRouteQuery;
      routes: readonly ChemistryRoute[];
      selectedRouteId: string | null;
      inspectorMode: "results" | "selection";
    }
  | null;

const CHEMISTRY_ROUTE_MAX_EDGES = 3;
const CHEMISTRY_ROUTE_MAX_RESULTS = 5;

export function ChemistryReactionMindMapPage() {
  const t = useTranslations("ChemistryReactionMindMapPage");
  const locale = useLocale() as AppLocale;
  const { nodes, edges } = getChemistryReactionMindMapContent(locale);
  const [selection, setSelection] = useState<ChemistrySelection>(null);
  const [comparison, setComparison] = useState<ChemistryComparison>(null);
  const defaultRouteStartNodeId =
    nodes.find((node) => node.id === "alkene")?.id ?? nodes[0]?.id ?? "alkene";
  const defaultRouteTargetNodeId =
    nodes.find((node) => node.id === "carboxylic-acid")?.id ??
    nodes[1]?.id ??
    defaultRouteStartNodeId;
  const [routeQuery, setRouteQuery] = useState<ChemistryRouteQuery>(() => ({
    startNodeId: defaultRouteStartNodeId,
    targetNodeId: defaultRouteTargetNodeId,
  }));
  const [routeExplorer, setRouteExplorer] = useState<ChemistryRouteExplorerState>(null);
  const handleSelectNode = (nodeId: ChemistryNode["id"]) => {
    setComparison(null);
    setSelection({ kind: "node", id: nodeId });
    setRouteExplorer((current) =>
      current
        ? {
            ...current,
            inspectorMode: "selection",
          }
        : current,
    );
  };
  const handleSelectEdge = (edgeId: ChemistryEdge["id"]) => {
    setComparison(null);
    setSelection({ kind: "edge", id: edgeId });
    setRouteExplorer((current) =>
      current
        ? {
            ...current,
            inspectorMode: "selection",
          }
        : current,
    );
  };
  const selectedNode =
    selection?.kind === "node"
      ? nodes.find((node) => node.id === selection.id) ?? null
      : null;
  const selectedEdge =
    selection?.kind === "edge"
      ? edges.find((edge) => edge.id === selection.id) ?? null
      : null;
  const sourceNode =
    selectedEdge
      ? nodes.find((node) => node.id === selectedEdge.from) ?? null
      : null;
  const targetNode =
    selectedEdge
      ? nodes.find((node) => node.id === selectedEdge.to) ?? null
      : null;
  const comparedLeftNode = comparison
    ? getChemistryNodeById(comparison.leftNodeId, { nodes })
    : null;
  const comparedRightNode = comparison
    ? getChemistryNodeById(comparison.rightNodeId, { nodes })
    : null;
  const adjacency = selectedNode
    ? getChemistryAdjacentPathways(selectedNode.id, { nodes, edges })
    : { incoming: [], outgoing: [] };
  const directConversions =
    comparedLeftNode && comparedRightNode
      ? getChemistryDirectConversionsBetween(comparedLeftNode.id, comparedRightNode.id, { edges })
      : [];
  const routeSummaryStartNode = routeExplorer
    ? getChemistryNodeById(routeExplorer.query.startNodeId, { nodes })
    : null;
  const routeSummaryTargetNode = routeExplorer
    ? getChemistryNodeById(routeExplorer.query.targetNodeId, { nodes })
    : null;
  const selectedRoute =
    routeExplorer?.routes.find((route) => route.id === routeExplorer.selectedRouteId) ??
    routeExplorer?.routes[0] ??
    null;
  const highlightedNodeIds = comparison
    ? [comparison.leftNodeId, comparison.rightNodeId]
    : selectedNode
      ? [
          ...new Set([
            ...adjacency.incoming.map((item) => item.neighborNode.id),
            ...adjacency.outgoing.map((item) => item.neighborNode.id),
          ]),
        ]
      : selectedEdge
        ? [selectedEdge.from, selectedEdge.to]
        : [];
  const highlightedEdgeIds = comparison
    ? directConversions.map((item) => item.edge.id)
    : selectedNode
      ? [
          ...adjacency.incoming.map((item) => item.edge.id),
          ...adjacency.outgoing.map((item) => item.edge.id),
        ]
      : [];
  const highlightedRouteNodeIds = selectedRoute?.nodeIds ?? [];
  const highlightedRouteEdgeIds = selectedRoute?.edgeIds ?? [];
  const highlightedRouteEndpointIds = selectedRoute
    ? [selectedRoute.nodeIds[0], selectedRoute.nodeIds[selectedRoute.nodeIds.length - 1]]
    : [];

  const openRouteExplorer = (query: ChemistryRouteQuery) => {
    const routes = getChemistryRoutesBetween(query.startNodeId, query.targetNodeId, {
      edges,
      maxEdges: CHEMISTRY_ROUTE_MAX_EDGES,
      maxRoutes: CHEMISTRY_ROUTE_MAX_RESULTS,
    });

    setComparison(null);
    setSelection(null);
    setRouteQuery(query);
    setRouteExplorer({
      query,
      routes,
      selectedRouteId: routes[0]?.id ?? null,
      inspectorMode: "results",
    });
  };

  const selectionSummary =
    comparison && comparedLeftNode && comparedRightNode
      ? t("selection.compare", { left: comparedLeftNode.name, right: comparedRightNode.name })
      : routeExplorer?.inspectorMode === "results" && routeSummaryStartNode && routeSummaryTargetNode
        ? selectedRoute
          ? t("selection.route", {
              start: routeSummaryStartNode.name,
              target: routeSummaryTargetNode.name,
              steps: selectedRoute.stepCount,
            })
          : routeExplorer.query.startNodeId === routeExplorer.query.targetNodeId
            ? t("selection.routeSame", { name: routeSummaryStartNode.name })
            : t("selection.routeNone", {
                start: routeSummaryStartNode.name,
                target: routeSummaryTargetNode.name,
              })
      : selectedNode
        ? t("selection.node", { name: selectedNode.name })
        : selectedEdge
          ? t("selection.edge", { name: selectedEdge.label })
          : t("selection.none");

  return (
    <section className="space-y-6 sm:space-y-7">
      <article className="page-band grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("hero.eyebrow")}</span>
            <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.familyCount", { count: nodes.length })}
            </span>
            <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.pathwayCount", { count: edges.length })}
            </span>
          </div>
          <h1 className="max-w-4xl text-[2.1rem] font-semibold leading-[0.98] text-ink-950 sm:text-[2.85rem]">
            {t("hero.title")}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-ink-700 sm:text-lg sm:leading-8">
            {t("hero.description")}
          </p>
        </div>
        <LearningVisual kind="chemistry" tone="teal" />
      </article>

      <div
        data-testid="chemistry-worksurface"
        data-chemistry-layout="split-panel"
        className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_25rem] min-[1100px]:items-stretch min-[1100px]:h-[min(100svh,70rem)] min-[1100px]:min-h-[58rem] min-[1100px]:overflow-hidden"
      >
        <article
          data-onboarding-target="chemistry-graph"
          className="lab-panel space-y-5 p-5 sm:p-6 min-[1100px]:grid min-[1100px]:min-h-0 min-[1100px]:grid-rows-[auto_auto_auto_1fr] min-[1100px]:gap-3 min-[1100px]:space-y-0 min-[1100px]:overflow-hidden"
        >
          <div className="space-y-3">
            <p className="lab-label">{t("graph.eyebrow")}</p>
            <h2 className="text-2xl font-semibold text-ink-950">{t("graph.title")}</h2>
            <p className="max-w-3xl text-sm leading-7 text-ink-700">{t("graph.description")}</p>
          </div>

          <div className="grid gap-3 min-[1100px]:grid-cols-[minmax(0,1fr)_auto] min-[1100px]:items-start">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [&>span]:shrink-0">
              <span
                id="chemistry-interaction-guidance"
                className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-ink-700"
              >
                {t("helpers.node")}
              </span>
              <span className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-ink-700">
                {t("helpers.edge")}
              </span>
              <span className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-ink-700">
                {t("helpers.context")}
              </span>
              <span className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-ink-700">
                {t("helpers.route")}
              </span>
            </div>
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] min-[1100px]:justify-end [&>*]:shrink-0">
              <span
                aria-live="polite"
                data-testid="chemistry-selection-summary"
                className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-sm text-teal-900"
              >
                {selectionSummary}
              </span>
              {comparison ? (
                <button
                  type="button"
                  onClick={() => setComparison(null)}
                  className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  {t("compare.actions.exit")}
                </button>
              ) : selection ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelection(null);
                    setRouteExplorer((current) =>
                      current
                        ? {
                            ...current,
                            inspectorMode: "results",
                          }
                        : current,
                    );
                  }}
                  className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  {t("selection.clear")}
                </button>
              ) : null}
              {routeExplorer && routeExplorer.inspectorMode === "selection" ? (
                <button
                  type="button"
                  data-testid="chem-route-view-results"
                  onClick={() =>
                    setRouteExplorer((current) =>
                      current
                        ? {
                            ...current,
                            inspectorMode: "results",
                          }
                        : current,
                    )
                  }
                  className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  {t("routeExplorer.actions.viewResults")}
                </button>
              ) : null}
              {routeExplorer ? (
              <button
                type="button"
                data-testid="chem-route-clear"
                onClick={() => {
                  setSelection(null);
                  setComparison(null);
                  setRouteExplorer(null);
                }}
                className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {t("routeExplorer.actions.clearRoutes")}
              </button>
              ) : null}
            </div>
          </div>

          <section
            data-testid="chemistry-route-controls"
            data-onboarding-target="chemistry-route-controls"
            className="rounded-[22px] border border-line bg-paper p-4 min-[1100px]:p-3"
          >
            <div className="grid gap-3 md:grid-cols-2 min-[1100px]:grid-cols-[10.5rem_10.5rem_auto] min-[1100px]:items-end min-[1400px]:grid-cols-[12rem_12rem_auto_1fr]">
              <label className="grid gap-1 text-sm text-ink-700">
                <span className="font-medium text-ink-900">{t("routeExplorer.fields.start")}</span>
                <select
                  data-testid="chem-route-start"
                  value={routeQuery.startNodeId}
                  onChange={(event) =>
                    setRouteQuery((current) => ({
                      ...current,
                      startNodeId: event.target.value as ChemistryNode["id"],
                    }))
                  }
                  className="rounded-[16px] border border-line bg-paper-strong px-3 py-2 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-ink-700">
                <span className="font-medium text-ink-900">{t("routeExplorer.fields.target")}</span>
                <select
                  data-testid="chem-route-target"
                  value={routeQuery.targetNodeId}
                  onChange={(event) =>
                    setRouteQuery((current) => ({
                      ...current,
                      targetNodeId: event.target.value as ChemistryNode["id"],
                    }))
                  }
                  className="rounded-[16px] border border-line bg-paper-strong px-3 py-2 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                data-testid="chem-route-search"
                onClick={() => openRouteExplorer(routeQuery)}
                className="rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-900 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:self-end min-[1100px]:whitespace-nowrap"
              >
                {t("routeExplorer.actions.showRoutes")}
              </button>
              <p className="text-sm leading-6 text-ink-700 md:col-span-2 min-[1100px]:col-span-3 min-[1400px]:col-span-1 min-[1400px]:pb-2">
                {t("routeExplorer.helper", {
                  maxEdges: CHEMISTRY_ROUTE_MAX_EDGES,
                  maxRoutes: CHEMISTRY_ROUTE_MAX_RESULTS,
                })}
              </p>
            </div>
          </section>

          <div className="min-[1100px]:row-start-4 min-[1100px]:min-h-0 min-[1100px]:overflow-hidden">
            <ChemistryReactionGraph
              className="h-full"
              nodes={nodes}
              edges={edges}
              layout={chemistryReactionGraphLayout}
              selection={selection}
              comparedNodeIds={
                comparison ? [comparison.leftNodeId, comparison.rightNodeId] : []
              }
              comparedEdgeIds={comparison ? directConversions.map((item) => item.edge.id) : []}
              highlightedNodeIds={highlightedNodeIds}
              highlightedEdgeIds={highlightedEdgeIds}
              routeNodeIds={highlightedRouteNodeIds}
              routeEdgeIds={highlightedRouteEdgeIds}
              routeEndpointIds={highlightedRouteEndpointIds}
              dimUnrelated={selection !== null || comparison !== null || routeExplorer !== null}
              onSelectNode={handleSelectNode}
              onSelectEdge={handleSelectEdge}
            />
          </div>
        </article>

        <div className="min-[1100px]:min-h-0">
          <div
            data-testid="chemistry-inspector-scroll"
            data-onboarding-target="chemistry-inspector"
            data-scroll-mode="self"
            className="min-[1100px]:h-full min-[1100px]:min-h-0 min-[1100px]:overflow-y-auto min-[1100px]:pr-1"
          >
            {routeExplorer?.inspectorMode === "results" ? (
              <ChemistryRouteExplorerDetails
                nodes={nodes}
                edges={edges}
                query={routeExplorer.query}
                routes={routeExplorer.routes}
                selectedRouteId={routeExplorer.selectedRouteId}
                maxEdges={CHEMISTRY_ROUTE_MAX_EDGES}
                onSelectRoute={(routeId) =>
                  setRouteExplorer((current) =>
                    current
                      ? {
                          ...current,
                          selectedRouteId: routeId,
                          inspectorMode: "results",
                        }
                      : current,
                  )
                }
                onSelectEdge={handleSelectEdge}
                onSelectNode={handleSelectNode}
              />
            ) : comparison && comparedLeftNode && comparedRightNode ? (
              <ChemistryComparisonDetails
                leftNode={comparedLeftNode}
                rightNode={comparedRightNode}
                directConversions={directConversions}
                onSelectNode={handleSelectNode}
                onSelectEdge={handleSelectEdge}
                onShowRoutesBetweenGroups={() =>
                  openRouteExplorer({
                    startNodeId: comparedLeftNode.id,
                    targetNodeId: comparedRightNode.id,
                  })
                }
                onSwap={() =>
                  setComparison({
                    leftNodeId: comparedRightNode.id,
                    rightNodeId: comparedLeftNode.id,
                  })
                }
                onClose={() => setComparison(null)}
              />
            ) : selectedNode ? (
              <ChemistryNodeDetails
                node={selectedNode}
                incomingPathways={adjacency.incoming}
                outgoingPathways={adjacency.outgoing}
                onSelectEdge={handleSelectEdge}
                onSelectNode={handleSelectNode}
                onCompareWithNode={(neighborNodeId) =>
                  {
                    setRouteExplorer(null);
                    setComparison({
                      leftNodeId: selectedNode.id,
                      rightNodeId: neighborNodeId,
                    });
                  }
                }
              />
            ) : selectedEdge && sourceNode && targetNode ? (
              <ChemistryEdgeDetails
                edge={selectedEdge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                onSelectNode={handleSelectNode}
                onCompareConnectedGroups={() => {
                  setRouteExplorer(null);
                  setComparison({
                    leftNodeId: sourceNode.id,
                    rightNodeId: targetNode.id,
                  });
                }}
              />
            ) : (
              <section
                className="lab-panel space-y-3 p-5 sm:p-6"
                data-testid="chemistry-default-state"
              >
                <p className="lab-label">{t("detail.emptyEyebrow")}</p>
                <h2 className="text-2xl font-semibold text-ink-950">{t("detail.emptyTitle")}</h2>
                <p className="text-sm leading-7 text-ink-700">{t("detail.emptyDescription")}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
