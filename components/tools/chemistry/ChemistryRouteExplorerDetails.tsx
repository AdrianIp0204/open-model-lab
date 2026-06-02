"use client";

import { useTranslations } from "next-intl";
import type {
  ChemistryEdge,
  ChemistryNode,
  ChemistryRoute,
} from "@/lib/tools/chemistry-reaction-mind-map";

type ChemistryRouteQuery = {
  startNodeId: ChemistryNode["id"];
  targetNodeId: ChemistryNode["id"];
};

type ChemistryRouteExplorerDetailsProps = {
  nodes: readonly ChemistryNode[];
  edges: readonly ChemistryEdge[];
  query: ChemistryRouteQuery;
  routes: readonly ChemistryRoute[];
  selectedRouteId: string | null;
  maxEdges: number;
  maxRoutes: number;
  onSelectRoute: (routeId: string) => void;
  onSelectEdge: (edgeId: ChemistryEdge["id"]) => void;
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
  onClearRoute: () => void;
};

function RouteFlag({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.16em] text-ink-600">
      {label}
    </span>
  );
}

export function ChemistryRouteExplorerDetails({
  nodes,
  edges,
  query,
  routes,
  selectedRouteId,
  maxEdges,
  maxRoutes,
  onSelectRoute,
  onSelectEdge,
  onSelectNode,
  onClearRoute,
}: ChemistryRouteExplorerDetailsProps) {
  const t = useTranslations("ChemistryReactionMindMapPage");
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const startNode = nodeById.get(query.startNodeId);
  const targetNode = nodeById.get(query.targetNodeId);
  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null;

  if (!startNode || !targetNode) {
    return null;
  }

  return (
    <section
      id="chemistry-route-results"
      className="lab-panel min-w-0 max-w-full scroll-mt-24 overflow-hidden"
      data-testid="chemistry-route-panel"
      data-chem-route-results-mode="workflow"
    >
      <div
        data-testid="chem-route-workflow-bar"
        className="sticky top-0 z-20 min-w-0 max-w-full border-b border-line bg-paper/95 px-3 py-2 backdrop-blur sm:p-3 min-[1100px]:static min-[1100px]:rounded-t-[22px] min-[1100px]:bg-paper min-[1100px]:p-5 min-[1100px]:backdrop-blur-0"
      >
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="lab-label">{t("routeExplorer.eyebrow")}</p>
            <h2 className="text-[1.08rem] font-semibold leading-snug text-ink-950 sm:text-2xl">
              {t("routeExplorer.title", { start: startNode.name, target: targetNode.name })}
            </h2>
            <p className="text-sm leading-6 text-ink-700">
              {selectedRoute
                ? t("routeExplorer.stepCount", { count: selectedRoute.stepCount })
                : query.startNodeId === query.targetNodeId
                  ? t("routeExplorer.states.sameFamilyTitle", { name: startNode.name })
                  : t("routeExplorer.routeCount", { count: routes.length })}
            </p>
          </div>
          <div className="flex gap-2 sm:flex-wrap sm:justify-end">
            <a
              href="#chemistry-route-map"
              data-testid="chem-route-back-to-map"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-paper-strong px-3 py-2 text-center text-sm font-medium leading-5 text-ink-900 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:flex-none"
            >
              {t("routeExplorer.actions.backToMap")}
            </a>
            <button
              type="button"
              data-testid="chem-route-panel-clear"
              onClick={onClearRoute}
              className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium leading-5 text-ink-900 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:flex-none"
            >
              {t("routeExplorer.actions.clearRoutes")}
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 max-w-full space-y-3 px-4 py-3 sm:space-y-5 sm:p-6">
      <p
        data-chem-learning-copy="route-note"
        className="text-sm leading-6 text-ink-700 sm:leading-7"
      >
        {t("routeExplorer.note", { maxEdges, maxRoutes })}
      </p>

      <div className="hidden grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          className="min-h-11 rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={() => onSelectNode(startNode.id)}
        >
          {t("routeExplorer.actions.openNode", { name: startNode.name })}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={() => onSelectNode(targetNode.id)}
        >
          {t("routeExplorer.actions.openNode", { name: targetNode.name })}
        </button>
      </div>

      {query.startNodeId === query.targetNodeId ? (
        <section
          data-testid="chem-route-same-family"
          className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-7 text-ink-700"
        >
          <p className="font-semibold text-ink-900">
            {t("routeExplorer.states.sameFamilyTitle", { name: startNode.name })}
          </p>
          <p className="mt-2">{t("routeExplorer.states.sameFamilyBody")}</p>
        </section>
      ) : routes.length === 0 ? (
        <section
          data-testid="chem-route-no-results"
          className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-7 text-ink-700"
        >
          <p className="font-semibold text-ink-900">
            {t("routeExplorer.states.noRouteTitle", {
              start: startNode.name,
              target: targetNode.name,
            })}
          </p>
          <p className="mt-2">
            {t("routeExplorer.states.noRouteBody", { maxEdges })}
          </p>
        </section>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <p className="text-sm leading-6 text-ink-700 sm:leading-7">
            {t("routeExplorer.routeCount", { count: routes.length })}
          </p>
          {routes.map((route, routeIndex) => {
            const isSelected = route.id === selectedRoute?.id;
            return (
              <article
                key={route.id}
                data-testid={`chem-route-card-${route.id}`}
                className={[
                  "min-w-0 max-w-full overflow-hidden rounded-[22px] border p-3 transition sm:p-4",
                  isSelected
                    ? "border-teal-600 bg-teal-500/10"
                    : "border-line bg-paper-strong",
                ].join(" ")}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
                    <button
                      type="button"
                      data-testid={`chem-route-select-${route.id}`}
                      className="block rounded-[12px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [@media(any-pointer:coarse)]:!min-h-11 [@media(any-pointer:coarse)]:min-w-11 [@media(any-pointer:coarse)]:px-2 [@media(any-pointer:coarse)]:py-2"
                      onClick={() => onSelectRoute(route.id)}
                    >
                      <p className="text-base font-semibold text-ink-950">
                        {t("routeExplorer.routeLabel", { index: routeIndex + 1 })}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {t("routeExplorer.stepCount", { count: route.stepCount })}
                      </p>
                    </button>
                    <div
                      data-testid={`chem-route-sequence-${route.id}`}
                      className="-mx-1 flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 text-sm [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
                    >
                      {route.nodeIds.map((nodeId, nodeIndex) => {
                        const node = nodeById.get(nodeId);
                        if (!node) {
                          return null;
                        }

                        return (
                          <div
                            key={`${route.id}-${nodeId}`}
                            className="flex shrink-0 items-center gap-2 sm:shrink"
                          >
                            <button
                              type="button"
                              data-testid={`chem-route-node-${route.id}-${nodeId}`}
                              className="min-h-11 min-w-11 max-w-[13rem] rounded-full border border-line bg-paper px-3 py-2 text-left font-medium leading-5 text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:max-w-none"
                              onClick={() => onSelectNode(nodeId)}
                            >
                              {node.name}
                            </button>
                            {nodeIndex < route.nodeIds.length - 1 ? (
                              <span aria-hidden="true" className="text-ink-500">
                                →
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex min-w-0 max-w-full flex-wrap gap-2">
                    {route.includesSubgroupSpecificStep ? (
                      <RouteFlag label={t("routeExplorer.flags.subgroup")} />
                    ) : null}
                    {route.includesAdditionalOrganicReactant ? (
                      <RouteFlag label={t("routeExplorer.flags.coReactant")} />
                    ) : null}
                    {route.includesRepresentativeOnlyStep ? (
                      <RouteFlag label={t("routeExplorer.flags.representativeOnly")} />
                    ) : null}
                  </div>
                </div>

                {isSelected ? (
                  <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                    {route.steps.map((step, stepIndex) => {
                      const edge = edgeById.get(step.edgeId);
                      const fromNode = nodeById.get(step.from);
                      const toNode = nodeById.get(step.to);
                      if (!edge || !fromNode || !toNode) {
                        return null;
                      }

                      return (
                        <article
                          key={`${route.id}-${edge.id}`}
                          data-testid={`chem-route-step-${route.id}-${edge.id}`}
                          className="min-w-0 max-w-full overflow-hidden rounded-[18px] border border-line bg-paper p-3"
                        >
                          <button
                            type="button"
                            className="min-w-0 w-full rounded-[12px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper [@media(any-pointer:coarse)]:!min-h-11 [@media(any-pointer:coarse)]:px-2 [@media(any-pointer:coarse)]:py-2"
                            onClick={() => onSelectEdge(edge.id)}
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <p className="min-w-0 text-sm font-semibold text-ink-950">
                                {t("routeExplorer.stepLabel", { index: stepIndex + 1 })}: {edge.label}
                              </p>
                              <span className="min-w-0 max-w-[9.5rem] whitespace-normal break-words rounded-full border border-line bg-paper-strong px-2.5 py-1 text-left text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.16em] text-ink-600 sm:max-w-full">
                                {edge.reactionType}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-ink-700">
                              {fromNode.name} → {toNode.name}
                            </p>
                            {step.isSubgroupSpecific ? (
                              <>
                                <p className="mt-2 hidden text-sm leading-6 text-ink-700 sm:block">
                                  {edge.applicability.summary}
                                </p>
                              </>
                            ) : null}
                            {step.hasAdditionalOrganicReactant &&
                            "additionalOrganicReactants" in edge &&
                            edge.additionalOrganicReactants?.length ? (
                              <p className="mt-2 hidden text-sm leading-6 text-ink-700 sm:block">
                                {t("detail.relationships.alsoNeeds", {
                                  items: edge.additionalOrganicReactants.join(", "),
                                })}
                              </p>
                            ) : null}
                            {step.isRepresentativeOnly ? (
                              <p className="mt-2 hidden text-sm leading-6 text-ink-700 sm:block">
                                {t("routeExplorer.flags.representativeOnlyNote")}
                              </p>
                            ) : null}
                          </button>
                          {step.isSubgroupSpecific ||
                          (step.hasAdditionalOrganicReactant &&
                            "additionalOrganicReactants" in edge &&
                            edge.additionalOrganicReactants?.length) ||
                          step.isRepresentativeOnly ? (
                            <details
                              data-testid={`chem-route-step-notes-${route.id}-${edge.id}`}
                              className="mt-2 rounded-[14px] border border-line bg-paper-strong px-3 py-2 text-sm text-ink-700 sm:hidden"
                            >
                              <summary className="min-h-11 cursor-pointer list-none rounded-[10px] py-2 font-medium text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
                                {t("routeExplorer.actions.showStepNotes")}
                              </summary>
                              <div className="space-y-2 pb-2 leading-6">
                                {step.isSubgroupSpecific ? (
                                  <p>{edge.applicability.summary}</p>
                                ) : null}
                                {step.hasAdditionalOrganicReactant &&
                                "additionalOrganicReactants" in edge &&
                                edge.additionalOrganicReactants?.length ? (
                                  <p>
                                    {t("detail.relationships.alsoNeeds", {
                                      items: edge.additionalOrganicReactants.join(", "),
                                    })}
                                  </p>
                                ) : null}
                                {step.isRepresentativeOnly ? (
                                  <p>{t("routeExplorer.flags.representativeOnlyNote")}</p>
                                ) : null}
                              </div>
                            </details>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
}
