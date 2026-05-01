"use client";

import { useTranslations } from "next-intl";
import type {
  ChemistryEdge,
  ChemistryDirectConversion,
  ChemistryNode,
} from "@/lib/tools/chemistry-reaction-mind-map";
import { ChemistryBlockNotation, ChemistryInlineNotation } from "./ChemistryNotation";

type ChemistryComparisonDetailsProps = {
  leftNode: ChemistryNode;
  rightNode: ChemistryNode;
  directConversions: readonly ChemistryDirectConversion[];
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
  onSelectEdge: (edgeId: ChemistryEdge["id"]) => void;
  onShowRoutesBetweenGroups: () => void;
  onSwap: () => void;
  onClose: () => void;
};

function ComparisonPropertyBlock({
  title,
  summary,
  details = [],
  representativeExample,
  representativeExampleLabel,
}: {
  title: string;
  summary: string;
  details?: readonly string[];
  representativeExample?: {
    text: string;
  };
  representativeExampleLabel: string;
}) {
  return (
    <section className="rounded-[18px] border border-line bg-paper-strong p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">{title}</h4>
      <p className="mt-3 text-sm leading-6 text-ink-900">{summary}</p>
      {details.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {representativeExample ? (
        <p className="mt-3 rounded-[16px] border border-line bg-paper px-3 py-2 text-sm leading-6 text-ink-700">
          <span className="mr-2 font-semibold text-ink-900">{representativeExampleLabel}</span>
          {representativeExample.text}
        </p>
      ) : null}
    </section>
  );
}

function ComparisonColumn({
  node,
  onOpenNode,
}: {
  node: ChemistryNode;
  onOpenNode: (nodeId: ChemistryNode["id"]) => void;
}) {
  const t = useTranslations("ChemistryReactionMindMapPage");
  const suffix = "suffix" in node.nomenclature ? node.nomenclature.suffix : undefined;
  const prefix = "prefix" in node.nomenclature ? node.nomenclature.prefix : undefined;
  const boilingRepresentative =
    "representativeExample" in node.boilingPoint ? node.boilingPoint.representativeExample : undefined;
  const solubilityRepresentative =
    "representativeExample" in node.solubility ? node.solubility.representativeExample : undefined;
  const acidityRepresentative =
    "representativeExample" in node.acidityBasicity
      ? node.acidityBasicity.representativeExample
      : undefined;

  return (
    <article
      data-testid={`chem-compare-column-${node.id}`}
      className="space-y-4 rounded-[22px] border border-line bg-paper p-4"
    >
      <div className="space-y-2">
        <p className="lab-label">{t("compare.groupEyebrow")}</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-ink-950">{node.name}</h3>
            {node.representativeStructureLabel ? (
              <p className="text-sm leading-6 text-ink-700">{node.representativeStructureLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            onClick={() => onOpenNode(node.id)}
          >
            {t("compare.actions.openNode", { name: node.name })}
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.suffix")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-900">{suffix ?? "-"}</p>
        </div>
        <div className="rounded-[18px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.prefix")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-900">{prefix ?? "-"}</p>
        </div>
        <div className="rounded-[18px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.generalFormula")}
          </p>
          <div className="mt-2 text-sm leading-6 text-ink-900">
            <ChemistryInlineNotation value={node.generalFormula} />
          </div>
        </div>
        <div className="rounded-[18px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.functionalGroup")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-900">{node.functionalGroup}</p>
        </div>
      </section>

      <ComparisonPropertyBlock
        title={t("detail.propertyCards.boilingPoint")}
        summary={node.boilingPoint.summary}
        details={node.boilingPoint.details}
        representativeExample={boilingRepresentative}
        representativeExampleLabel={t("detail.fields.representativeExample")}
      />

      <ComparisonPropertyBlock
        title={t("detail.propertyCards.solubility")}
        summary={node.solubility.summary}
        details={node.solubility.details}
        representativeExample={solubilityRepresentative}
        representativeExampleLabel={t("detail.fields.representativeExample")}
      />

      <ComparisonPropertyBlock
        title={t("detail.propertyCards.acidityBasicity")}
        summary={node.acidityBasicity.summary}
        details={node.acidityBasicity.details}
        representativeExample={acidityRepresentative}
        representativeExampleLabel={t("detail.fields.representativeExample")}
      />

      <section className="rounded-[18px] border border-line bg-paper-strong p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
          {t("detail.propertyCards.notableProperties")}
        </h4>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
          {node.notableProperties.map((property) => (
            <li key={property}>{property}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export function ChemistryComparisonDetails({
  leftNode,
  rightNode,
  directConversions,
  onSelectNode,
  onSelectEdge,
  onShowRoutesBetweenGroups,
  onSwap,
  onClose,
}: ChemistryComparisonDetailsProps) {
  const t = useTranslations("ChemistryReactionMindMapPage");

  return (
    <section className="lab-panel space-y-5 p-5 sm:p-6" data-testid="chemistry-compare-panel">
      <div className="space-y-2">
        <p className="lab-label">{t("compare.eyebrow")}</p>
        <h2 className="text-2xl font-semibold text-ink-950">
          {t("compare.title", { left: leftNode.name, right: rightNode.name })}
        </h2>
        <p className="text-sm leading-7 text-ink-700">{t("compare.description")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="chem-compare-exit"
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={onClose}
        >
          {t("compare.actions.exit")}
        </button>
        <button
          type="button"
          data-testid="chem-compare-swap"
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={onSwap}
        >
          {t("compare.actions.swap")}
        </button>
        <button
          type="button"
          data-testid="chem-compare-show-routes"
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={onShowRoutesBetweenGroups}
        >
          {t("routeExplorer.actions.showRoutesForPair")}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ComparisonColumn node={leftNode} onOpenNode={onSelectNode} />
        <ComparisonColumn node={rightNode} onOpenNode={onSelectNode} />
      </div>

      <section className="rounded-[22px] border border-line bg-paper-strong p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
          {t("compare.directConversionsTitle")}
        </h3>
        {directConversions.length ? (
          <div className="mt-3 space-y-3">
            {directConversions.map(({ direction, edge }) => (
              <article
                key={edge.id}
                data-testid={`chem-compare-direct-${edge.id}`}
                className="rounded-[18px] border border-line bg-paper p-3"
              >
                <button
                  type="button"
                  className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  onClick={() => onSelectEdge(edge.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink-950">{edge.label}</p>
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                      {direction === "left-to-right"
                        ? t("compare.direction.leftToRight", {
                            left: leftNode.name,
                            right: rightNode.name,
                          })
                        : t("compare.direction.rightToLeft", {
                            left: leftNode.name,
                            right: rightNode.name,
                          })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-700">{edge.reactionType}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">{edge.applicability.summary}</p>
                  {"additionalOrganicReactants" in edge && edge.additionalOrganicReactants?.length ? (
                    <p className="mt-2 text-sm leading-6 text-ink-700">
                      {t("detail.relationships.alsoNeeds", {
                        items: edge.additionalOrganicReactants.join(", "),
                      })}
                    </p>
                  ) : null}
                  {"representativeExample" in edge.equation ? (
                    <div className="mt-3">
                      <ChemistryBlockNotation
                        value={edge.equation.representativeExample.text}
                        label={t("detail.fields.representativeExample")}
                      />
                    </div>
                  ) : null}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-ink-700">{t("compare.directConversionsEmpty")}</p>
        )}
      </section>
    </section>
  );
}
