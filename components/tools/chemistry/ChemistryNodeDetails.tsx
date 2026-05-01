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
    <section className="rounded-[22px] border border-line bg-paper-strong p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-900">{summary}</p>
      {details.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {representativeExample ? (
        <p className="mt-3 rounded-[18px] border border-line bg-paper px-3 py-2 text-sm leading-6 text-ink-700">
          <span className="mr-2 font-semibold text-ink-900">
            {representativeExampleLabel}
          </span>
          {representativeExample.text}
        </p>
      ) : null}
    </section>
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
      <section className="rounded-[22px] border border-line bg-paper-strong p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-ink-700">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-line bg-paper-strong p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.map(({ direction, edge, neighborNode }) => (
          <article
            key={`${direction}-${edge.id}`}
            data-testid={`chem-node-pathway-${direction}-${edge.id}`}
            className="rounded-[18px] border border-line bg-paper p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                aria-label={`${edge.label} pathway`}
                className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                onClick={() => onSelectEdge(edge.id)}
              >
                <p className="text-sm font-semibold text-ink-950">{edge.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink-700">{directionLabel(neighborNode.name)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-500">{edge.reactionType}</p>
                <p className="mt-2 text-sm leading-6 text-ink-700">{edge.applicability.summary}</p>
                {"additionalOrganicReactants" in edge && edge.additionalOrganicReactants?.length ? (
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {coReactantLabel(edge.additionalOrganicReactants.join(", "))}
                  </p>
                ) : null}
              </button>
              <button
                type="button"
                className="rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                onClick={() => onSelectNode(neighborNode.id)}
              >
                {jumpLabel(neighborNode.name)}
              </button>
              <button
                type="button"
                data-testid={`chem-node-compare-${direction}-${edge.id}`}
                className="rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                onClick={() => onCompareWithNode(neighborNode.id)}
              >
                {compareLabel(neighborNode.name)}
              </button>
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

  return (
    <section className="lab-panel space-y-5 p-5 sm:p-6" data-testid="chem-node-details">
      <div className="space-y-2">
        <p className="lab-label">{t("detail.nodeEyebrow")}</p>
        <h2 className="text-2xl font-semibold text-ink-950">{node.name}</h2>
        {node.representativeStructureLabel ? (
          <p className="text-sm leading-6 text-ink-700">{node.representativeStructureLabel}</p>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.suffix")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-900">{suffix ?? "-"}</p>
        </div>
        <div className="rounded-[22px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.prefix")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-900">{prefix ?? "-"}</p>
        </div>
        <div className="rounded-[22px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.generalFormula")}
          </p>
          <div className="mt-2 text-sm leading-6 text-ink-900">
            <ChemistryInlineNotation value={node.generalFormula} />
          </div>
        </div>
        <div className="rounded-[22px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
            {t("detail.fields.functionalGroup")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-900">{node.functionalGroup}</p>
        </div>
      </section>

      <div className="grid gap-4">
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

      <section className="rounded-[22px] border border-line bg-paper-strong p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
          {t("detail.propertyCards.notableProperties")}
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
          {node.notableProperties.map((property) => (
            <li key={property}>{property}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
