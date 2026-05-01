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
  onSelectRoute: (routeId: string) => void;
  onSelectEdge: (edgeId: ChemistryEdge["id"]) => void;
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
};

function RouteFlag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
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
  onSelectRoute,
  onSelectEdge,
  onSelectNode,
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
    <section className="lab-panel space-y-5 p-5 sm:p-6" data-testid="chemistry-route-panel">
      <div className="space-y-2">
        <p className="lab-label">{t("routeExplorer.eyebrow")}</p>
        <h2 className="text-2xl font-semibold text-ink-950">
          {t("routeExplorer.title", { start: startNode.name, target: targetNode.name })}
        </h2>
        <p className="text-sm leading-7 text-ink-700">
          {t("routeExplorer.note", { maxEdges })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={() => onSelectNode(startNode.id)}
        >
          {t("routeExplorer.actions.openNode", { name: startNode.name })}
        </button>
        <button
          type="button"
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
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
        <div className="space-y-4">
          <p className="text-sm leading-7 text-ink-700">
            {t("routeExplorer.routeCount", { count: routes.length })}
          </p>
          {routes.map((route, routeIndex) => {
            const isSelected = route.id === selectedRoute?.id;
            return (
              <article
                key={route.id}
                data-testid={`chem-route-card-${route.id}`}
                className={[
                  "rounded-[22px] border p-4 transition",
                  isSelected
                    ? "border-teal-600 bg-teal-500/10"
                    : "border-line bg-paper-strong",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-3">
                    <button
                      type="button"
                      data-testid={`chem-route-select-${route.id}`}
                      className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
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
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      {route.nodeIds.map((nodeId, nodeIndex) => {
                        const node = nodeById.get(nodeId);
                        if (!node) {
                          return null;
                        }

                        return (
                          <div key={`${route.id}-${nodeId}`} className="flex items-center gap-2">
                            <button
                              type="button"
                              data-testid={`chem-route-node-${route.id}-${nodeId}`}
                              className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
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

                  <div className="flex flex-wrap gap-2">
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
                  <div className="mt-4 space-y-3">
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
                          className="rounded-[18px] border border-line bg-paper p-3"
                        >
                          <button
                            type="button"
                            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                            onClick={() => onSelectEdge(edge.id)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ink-950">
                                {t("routeExplorer.stepLabel", { index: stepIndex + 1 })}: {edge.label}
                              </p>
                              <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
                                {edge.reactionType}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-ink-700">
                              {fromNode.name} → {toNode.name}
                            </p>
                            {step.isSubgroupSpecific ? (
                              <p className="mt-2 text-sm leading-6 text-ink-700">
                                {edge.applicability.summary}
                              </p>
                            ) : null}
                            {step.hasAdditionalOrganicReactant &&
                            "additionalOrganicReactants" in edge &&
                            edge.additionalOrganicReactants?.length ? (
                              <p className="mt-2 text-sm leading-6 text-ink-700">
                                {t("detail.relationships.alsoNeeds", {
                                  items: edge.additionalOrganicReactants.join(", "),
                                })}
                              </p>
                            ) : null}
                            {step.isRepresentativeOnly ? (
                              <p className="mt-2 text-sm leading-6 text-ink-700">
                                {t("routeExplorer.flags.representativeOnlyNote")}
                              </p>
                            ) : null}
                          </button>
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
    </section>
  );
}
