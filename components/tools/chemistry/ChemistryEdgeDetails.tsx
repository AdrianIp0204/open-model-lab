"use client";

import { useTranslations } from "next-intl";
import type {
  ChemistryDetailItem,
  ChemistryEdge,
  ChemistryNode,
} from "@/lib/tools/chemistry-reaction-mind-map";
import { ChemistryBlockNotation, ChemistryInlineNotation } from "./ChemistryNotation";

type ChemistryEdgeDetailsProps = {
  edge: ChemistryEdge;
  sourceNode: ChemistryNode;
  targetNode: ChemistryNode;
  onSelectNode: (nodeId: ChemistryNode["id"]) => void;
  onCompareConnectedGroups: () => void;
};

function DetailList({
  title,
  items,
}: {
  title: string;
  items: readonly ChemistryDetailItem[];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rounded-[18px] border border-line bg-paper-strong p-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-700">
        {items.map((item) => (
          <li
            key={typeof item === "string" ? item : `${item.name}:${item.formula ?? ""}`}
            className="space-y-1"
          >
            {typeof item === "string" ? (
              item
            ) : (
              <>
                <p>{item.name}</p>
                {item.formula ? (
                  <div className="text-ink-900">
                    <ChemistryInlineNotation value={item.formula} />
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EquationBlock({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  if (!value) {
    return null;
  }

  return <ChemistryBlockNotation value={value} label={title} />;
}

export function ChemistryEdgeDetails({
  edge,
  sourceNode,
  targetNode,
  onSelectNode,
  onCompareConnectedGroups,
}: ChemistryEdgeDetailsProps) {
  const t = useTranslations("ChemistryReactionMindMapPage");
  const genericEquation = "generic" in edge.equation ? edge.equation.generic : undefined;
  const representativeEquation =
    "representativeExample" in edge.equation
      ? edge.equation.representativeExample.text
      : undefined;
  const ionicEquation =
    edge.ionicEquation.applicability === "shown"
      ? edge.ionicEquation.equation
      : undefined;
  const ionicEquationNote =
    edge.ionicEquation.applicability === "not-typically-shown" && "note" in edge.ionicEquation
      ? edge.ionicEquation.note
      : undefined;
  const mechanismSummary =
    edge.mechanism.applicability === "shown"
      ? edge.mechanism.summary
      : "note" in edge.mechanism
        ? edge.mechanism.note
        : undefined;
  const mechanismSteps = edge.mechanism.applicability === "shown" ? edge.mechanism.steps : undefined;
  const catalysts = "catalysts" in edge ? edge.catalysts : undefined;
  const coReactants =
    "additionalOrganicReactants" in edge ? edge.additionalOrganicReactants : undefined;
  const notes = ionicEquationNote ? [...(edge.notes ?? []), ionicEquationNote] : edge.notes ?? [];

  return (
    <section
      className="lab-panel space-y-4 p-4 sm:p-5"
      data-testid="chem-edge-details"
      data-chem-inspector-density="compact"
    >
      <div className="space-y-2">
        <p className="lab-label">{t("detail.edgeEyebrow")}</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-ink-950">{edge.label}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              {sourceNode.name} {"->"} {targetNode.name}
            </p>
          </div>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">
            {edge.reactionType}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="chem-edge-source-node"
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            onClick={() => onSelectNode(sourceNode.id)}
          >
            {t("detail.relationships.openSourceGroup", { name: sourceNode.name })}
          </button>
          <button
            type="button"
            data-testid="chem-edge-target-node"
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            onClick={() => onSelectNode(targetNode.id)}
          >
            {t("detail.relationships.openTargetGroup", { name: targetNode.name })}
          </button>
          <button
            type="button"
            data-testid="chem-edge-compare-groups"
            className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-800 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            onClick={onCompareConnectedGroups}
          >
            {t("compare.actions.compareConnectedGroups")}
          </button>
        </div>
      </div>

      {coReactants?.length ? (
        <section
          className="rounded-[18px] border border-teal-500/25 bg-teal-500/10 p-3"
          data-testid="chem-edge-co-reactants"
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-900">
            {t("detail.fields.additionalOrganicReactants")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-teal-950">
            {coReactants.join(", ")}
          </p>
        </section>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[16px] border border-line bg-paper-strong px-3 py-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-ink-600">
            {t("detail.fields.reactionType")}
          </p>
          <p className="mt-1 text-sm leading-5 text-ink-900">{edge.reactionType}</p>
        </div>
        <div className="rounded-[16px] border border-line bg-paper-strong px-3 py-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-ink-600">
            {t("detail.fields.applicability")}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-900">{edge.applicability.summary}</p>
        </div>
      </section>

      <div className="grid gap-3 min-[720px]:grid-cols-3">
        <DetailList title={t("detail.fields.reagents")} items={edge.reagents ?? []} />
        <DetailList title={t("detail.fields.catalysts")} items={catalysts ?? []} />
        <DetailList title={t("detail.fields.conditions")} items={edge.conditions ?? []} />
      </div>

      <section className="rounded-[18px] border border-line bg-paper-strong p-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
          {t("detail.sections.equations")}
        </h3>
        <div className="mt-3 space-y-3">
          {genericEquation ? (
            <EquationBlock title={t("detail.equations.generic")} value={genericEquation} />
          ) : null}
          {representativeEquation ? (
            <EquationBlock
              title={t("detail.equations.representativeExample")}
              value={representativeEquation}
            />
          ) : null}
          <EquationBlock title={t("detail.equations.ionicEquation")} value={ionicEquation} />
        </div>
      </section>

      <details className="group rounded-[18px] border border-line bg-paper-strong p-3">
        <summary className="grid cursor-pointer list-none gap-1 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
          {t("detail.sections.mechanism")}
            </span>
            <span
              aria-hidden="true"
              className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-500 transition group-open:rotate-180"
            >
              v
            </span>
          </span>
          <span className="line-clamp-2 text-sm leading-6 text-ink-900">{mechanismSummary}</span>
        </summary>
        {mechanismSteps?.length ? (
          <ol className="mt-3 space-y-2 border-t border-line/70 pt-3 text-sm leading-6 text-ink-700">
            {mechanismSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
      </details>

      {notes.length ? (
        <details className="group rounded-[18px] border border-line bg-paper-strong p-3">
          <summary className="grid cursor-pointer list-none gap-1 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
            {t("detail.sections.notes")}
              </span>
              <span
                aria-hidden="true"
                className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-500 transition group-open:rotate-180"
              >
                v
              </span>
            </span>
            <span className="line-clamp-2 text-sm leading-6 text-ink-900">
              {notes[0]}
            </span>
          </summary>
          <ul className="mt-3 space-y-2 border-t border-line/70 pt-3 text-sm leading-6 text-ink-700">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
