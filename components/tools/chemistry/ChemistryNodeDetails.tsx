"use client";

import { useTranslations } from "next-intl";
import type {
  ChemistryAdjacentPathway,
  ChemistryEdge,
  ChemistryNode,
} from "@/lib/tools/chemistry-reaction-mind-map";
import { ChemistryInlineNotation } from "./ChemistryNotation";

type ChemistryNodeDetailsProps = {
  node: ChemistryNode;
  incomingPathways: readonly ChemistryAdjacentPathway[];
  outgoingPathways: readonly ChemistryAdjacentPathway[];
  onSelectEdge: (edgeId: ChemistryEdge["id"]) => void;
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
  onCompareWithNode: (nodeId: ChemistryNode["id"]) => void;
};

function DetailSection({
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
    <details className="group rounded-[18px] border border-line bg-paper-strong p-3">
      <summary className="grid cursor-pointer list-none gap-1 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
        <span className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
            {title}
          </span>
          <span
            aria-hidden="true"
            className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-500 transition group-open:rotate-180"
          >
            v
          </span>
        </span>
        <span className="line-clamp-2 text-sm leading-6 text-ink-900">{summary}</span>
      </summary>
      {details.length ? (
        <ul className="mt-3 space-y-2 border-t border-line/70 pt-3 text-sm leading-6 text-ink-700">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {representativeExample ? (
        <p className="mt-3 rounded-[14px] border border-line bg-paper px-3 py-2 text-sm leading-6 text-ink-700">
          <span className="mr-2 font-semibold text-ink-900">
            {representativeExampleLabel}
          </span>
          {representativeExample.text}
        </p>
      ) : null}
    </details>
  );
}

type PathwaySectionProps = {
  title: string;
  emptyText: string;
  directionLabel: (name: string) => string;
  coReactantLabel: (items: string) => string;
  items: readonly ChemistryAdjacentPathway[];
  onSelectEdge: (edgeId: ChemistryEdge["id"]) => void;
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
  onCompareWithNode: (nodeId: ChemistryNode["id"]) => void;
  jumpLabel: (name: string) => string;
  compareLabel: (name: string) => string;
};

function PathwaySection({
  title,
  emptyText,
  directionLabel,
  coReactantLabel,
  items,
  onSelectEdge,
  onSelectNode,
  onCompareWithNode,
  jumpLabel,
  compareLabel,
}: PathwaySectionProps) {
  if (!items.length) {
    return (
      <section className="rounded-[18px] border border-line bg-paper-strong p-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-700">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[18px] border border-line bg-paper-strong p-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.map(({ direction, edge, neighborNode }) => (
          <article
            key={`${direction}-${edge.id}`}
            data-testid={`chem-node-pathway-${direction}-${edge.id}`}
            className="rounded-[14px] border border-line bg-paper p-2.5"
          >
            <div className="grid gap-2">
              <button
                type="button"
                aria-label={`${edge.label} pathway`}
                className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                onClick={() => onSelectEdge(edge.id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-950">{edge.label}</p>
                  <span className="rounded-full border border-line bg-paper-strong px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    {edge.reactionType}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 text-ink-700">{directionLabel(neighborNode.name)}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-600">{edge.applicability.summary}</p>
                {"additionalOrganicReactants" in edge && edge.additionalOrganicReactants?.length ? (
                  <p className="mt-1 text-xs leading-5 text-ink-600">
                    {coReactantLabel(edge.additionalOrganicReactants.join(", "))}
                  </p>
                ) : null}
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-line bg-paper-strong px-2.5 py-1.5 text-xs font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  onClick={() => onSelectNode(neighborNode.id)}
                >
                  {jumpLabel(neighborNode.name)}
                </button>
                <button
                  type="button"
                  data-testid={`chem-node-compare-${direction}-${edge.id}`}
                  className="rounded-full border border-line bg-paper-strong px-2.5 py-1.5 text-xs font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  onClick={() => onCompareWithNode(neighborNode.id)}
                >
                  {compareLabel(neighborNode.name)}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ChemistryNodeDetails({
  node,
  incomingPathways,
  outgoingPathways,
  onSelectEdge,
  onSelectNode,
  onCompareWithNode,
}: ChemistryNodeDetailsProps) {
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
  const incomingCount = incomingPathways.length;
  const outgoingCount = outgoingPathways.length;

  return (
    <section
      className="lab-panel space-y-4 p-4 sm:p-5"
      data-testid="chem-node-details"
      data-chem-inspector-density="compact"
    >
      <div className="space-y-2">
        <p className="lab-label">{t("detail.nodeEyebrow")}</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold text-ink-950">{node.name}</h2>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">
            {t("graphStatus.node.pathwayBalance", {
              incoming: incomingCount,
              outgoing: outgoingCount,
            })}
          </span>
        </div>
        {node.representativeStructureLabel ? (
          <p className="line-clamp-2 text-sm leading-6 text-ink-700">{node.representativeStructureLabel}</p>
        ) : null}
      </div>

      <section className="grid gap-2 sm:grid-cols-2">
        {[
          [t("detail.fields.generalFormula"), <ChemistryInlineNotation key="formula" value={node.generalFormula} />],
          [t("detail.fields.functionalGroup"), node.functionalGroup],
          [t("detail.fields.suffix"), suffix ?? "-"],
          [t("detail.fields.prefix"), prefix ?? "-"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[16px] border border-line bg-paper-strong px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-ink-600">
              {label}
            </p>
            <div className="mt-1 text-sm leading-5 text-ink-900">{value}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-3">
        <PathwaySection
          title={t("detail.sections.canBeMadeFrom")}
          emptyText={t("detail.sections.canBeMadeFromEmpty")}
          directionLabel={(name) => t("detail.relationships.from", { name })}
          coReactantLabel={(items) => t("detail.relationships.alsoNeeds", { items })}
          items={incomingPathways}
          onSelectEdge={onSelectEdge}
          onSelectNode={onSelectNode}
          onCompareWithNode={onCompareWithNode}
          jumpLabel={(name) => t("detail.relationships.openGroup", { name })}
          compareLabel={(name) => t("compare.actions.compareWith", { name })}
        />
        <PathwaySection
          title={t("detail.sections.canConvertTo")}
          emptyText={t("detail.sections.canConvertToEmpty")}
          directionLabel={(name) => t("detail.relationships.to", { name })}
          coReactantLabel={(items) => t("detail.relationships.alsoNeeds", { items })}
          items={outgoingPathways}
          onSelectEdge={onSelectEdge}
          onSelectNode={onSelectNode}
          onCompareWithNode={onCompareWithNode}
          jumpLabel={(name) => t("detail.relationships.openGroup", { name })}
          compareLabel={(name) => t("compare.actions.compareWith", { name })}
        />
      </div>

      <DetailSection
        title={t("detail.propertyCards.boilingPoint")}
        summary={node.boilingPoint.summary}
        details={node.boilingPoint.details}
        representativeExample={boilingRepresentative}
        representativeExampleLabel={t("detail.fields.representativeExample")}
      />

      <DetailSection
        title={t("detail.propertyCards.solubility")}
        summary={node.solubility.summary}
        details={node.solubility.details}
        representativeExample={solubilityRepresentative}
        representativeExampleLabel={t("detail.fields.representativeExample")}
      />

      <DetailSection
        title={t("detail.propertyCards.acidityBasicity")}
        summary={node.acidityBasicity.summary}
        details={node.acidityBasicity.details}
        representativeExample={acidityRepresentative}
        representativeExampleLabel={t("detail.fields.representativeExample")}
      />

      <details className="group rounded-[18px] border border-line bg-paper-strong p-3">
        <summary className="grid cursor-pointer list-none gap-1 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
          {t("detail.propertyCards.notableProperties")}
            </span>
            <span
              aria-hidden="true"
              className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-500 transition group-open:rotate-180"
            >
              v
            </span>
          </span>
          <span className="line-clamp-2 text-sm leading-6 text-ink-900">
            {node.notableProperties[0]}
          </span>
        </summary>
        <ul className="mt-3 space-y-2 border-t border-line/70 pt-3 text-sm leading-6 text-ink-700">
          {node.notableProperties.map((property) => (
            <li key={property}>{property}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
