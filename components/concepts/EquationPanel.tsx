"use client";

import { useTranslations } from "next-intl";
import type {
  ControlValue,
  GraphTabSpec,
  SimulationControlSpec,
  SimulationEquation,
  SimulationOverlay,
  SimulationVariableLink,
} from "@/lib/physics";
import { formatDisplayText, formatDisplayUnit, formatMeasurement } from "@/lib/physics";
import { BlockFormula, InlineFormula } from "./MathFormula";
import { getVariableTone } from "./variable-tones";

type EquationPanelProps = {
  equations: SimulationEquation[];
  variableLinks: SimulationVariableLink[];
  controls: SimulationControlSpec[];
  graphs: GraphTabSpec[];
  overlays?: SimulationOverlay[];
  values: Record<string, ControlValue>;
  activeVariableId?: string | null;
  onActiveVariableChange?: (variableId: string) => void;
};

type TranslateFn = (key: string, values?: Record<string, unknown>) => string;

export function EquationBenchStrip({
  equations,
}: {
  equations: SimulationEquation[];
}) {
  const t = useTranslations("EquationPanel");

  if (!equations.length) {
    return null;
  }

  return (
    <section
      data-testid="bench-equation-strip"
      aria-label={t("bench.title")}
      className="rounded-[14px] border border-teal-500/20 bg-teal-500/8 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="lab-label text-teal-700">{t("bench.label")}</p>
        <p className="text-[0.7rem] leading-4 text-ink-600">{t("bench.title")}</p>
      </div>
      <div className="mt-1.5 grid gap-1.5 md:grid-cols-2">
        {equations.map((equation) => (
          <article
            key={equation.id}
            data-testid={`bench-equation-${equation.id}`}
            className="min-w-0 rounded-[12px] border border-teal-500/15 bg-paper/86 px-2.5 py-1.5"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink-950">{equation.label}</p>
                <p className="mt-0.5 line-clamp-1 text-[0.7rem] leading-4 text-ink-600">
                  {equation.meaning}
                </p>
              </div>
              <div className="shrink-0 rounded-[12px] border border-line bg-white/82 px-2 py-1 text-ink-950">
                <InlineFormula expression={equation.latex} className="text-[0.76rem]" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatValue(
  value: ControlValue,
  unit: string | undefined,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  if (typeof value === "number") {
    return formatMeasurement(value, unit, value >= 10 || Number.isInteger(value) ? 1 : 2);
  }
  if (typeof value === "boolean") {
    return value ? t("values.on") : t("values.off");
  }
  const displayUnit = formatDisplayUnit(unit);
  return displayUnit ? `${value} ${displayUnit}` : `${value}`;
}

export function EquationPanel({
  equations,
  variableLinks,
  controls,
  graphs,
  overlays,
  values,
  activeVariableId,
  onActiveVariableChange,
}: EquationPanelProps) {
  const controlMap = new Map(controls.map((control) => [control.param, control]));
  const graphMap = new Map(graphs.map((graph) => [graph.id, graph]));
  const overlayMap = new Map((overlays ?? []).map((overlay) => [overlay.id, overlay]));
  const t = useTranslations("EquationPanel");
  const translate = t as unknown as TranslateFn;
  const activeVariable =
    variableLinks.find((variableLink) => variableLink.id === activeVariableId) ??
    variableLinks[0];
  const activeTone = getVariableTone(activeVariable.tone);
  const activeControl = controlMap.get(activeVariable.param);

  return (
    <section className="rounded-[24px] border border-line bg-paper-strong/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] md:p-3.5">
      <div className="border-b border-line pb-2.5">
        <div className="grid gap-1.5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-baseline lg:gap-4">
          <div>
            <p className="lab-label">{t("map.label")}</p>
            <h3 className="mt-1 text-[0.98rem] font-semibold text-ink-950">
              {t("map.title")}
            </h3>
          </div>
          <p className="text-sm leading-5 text-ink-700 lg:text-right">
            {t("map.description")}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <div
          className={[
            "rounded-[22px] border px-3 py-3 transition-colors",
            activeTone.badge,
            activeTone.border,
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
                  activeTone.badge,
                  activeTone.strongText,
                ].join(" ")}
              >
                <InlineFormula expression={activeVariable.symbol} />
              </span>
              <span className="text-sm font-semibold text-ink-950">{activeVariable.label}</span>
            </div>
            {activeControl ? (
              <span className="rounded-full border border-line bg-white/85 px-3 py-1 font-mono text-xs text-ink-700">
                {formatValue(values[activeVariable.param], activeControl.unit, translate)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-5 text-ink-700">{activeVariable.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-700">
            {(activeVariable.graphIds ?? []).map((graphId) => {
              const graph = graphMap.get(graphId);
              return graph ? (
                <span key={graphId} className="rounded-full border border-line bg-white/85 px-3 py-1">
                  {t("chips.graph", { label: formatDisplayText(graph.label) })}
                </span>
              ) : null;
            })}
            {(activeVariable.overlayIds ?? []).map((overlayId) => {
              const overlay = overlayMap.get(overlayId);
              return overlay ? (
                <span key={overlayId} className="rounded-full border border-line bg-white/85 px-3 py-1">
                  {t("chips.overlay", { label: formatDisplayText(overlay.label) })}
                </span>
              ) : null;
            })}
          </div>
        </div>

        <div className="min-w-0">
          <p className="lab-label">{t("equations.label")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {equations.map((equation) => {
              const relatedVariables = variableLinks.filter((variableLink) =>
                variableLink.equationIds.includes(equation.id),
              );

              return (
                <button
                  key={equation.id}
                  type="button"
                  onClick={() => onActiveVariableChange?.(relatedVariables[0]?.id ?? activeVariable.id)}
                  className="w-full min-w-0 rounded-[20px] border border-line bg-white/70 px-3 py-2.5 text-left transition hover:border-teal-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong"
                >
                  <div className="min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-950">{equation.label}</p>
                      <p className="mt-1 text-xs leading-4 text-ink-600">{equation.meaning}</p>
                    </div>
                    <div className="mt-2 rounded-[16px] border border-line bg-paper px-3 py-2 text-ink-950">
                      <BlockFormula expression={equation.latex} className="overflow-x-auto text-[0.84rem]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-4 text-ink-500">
            {t("equations.note")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function EquationDetails({
  equations,
  variableLinks,
  controls,
  values,
}: {
  equations: SimulationEquation[];
  variableLinks: SimulationVariableLink[];
  controls: SimulationControlSpec[];
  values: Record<string, ControlValue>;
}) {
  const t = useTranslations("EquationPanel.details");
  const tPanel = useTranslations("EquationPanel");
  const translate = tPanel as unknown as TranslateFn;
  const controlMap = new Map(controls.map((control) => [control.param, control]));

  return (
    <details className="lab-panel p-4">
      <summary className="cursor-pointer list-none rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm font-semibold text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong">
        {t("title")}
        <span className="ml-3 font-normal text-ink-700">
          {t("summary")}
        </span>
      </summary>
      <div className="mt-4 grid gap-3">
        {equations.map((equation) => {
          const relatedVariables = variableLinks.filter((variableLink) =>
            variableLink.equationIds.includes(equation.id),
          );

          return (
            <article key={equation.id} className="rounded-[22px] border border-line bg-white/70 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-sm font-semibold text-ink-950">{equation.label}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">{equation.meaning}</p>
                </div>
                <div className="rounded-[20px] border border-line bg-paper px-4 py-3 text-ink-950">
                  <BlockFormula expression={equation.latex} className="overflow-x-auto text-[1.05rem]" />
                </div>
              </div>
              {equation.notes?.length ? (
                <div className="mt-4 grid gap-2 text-sm leading-6 text-ink-700">
                  {equation.notes.map((note) => (
                    <div key={note} className="rounded-2xl border border-line bg-paper px-3 py-2">
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
              {relatedVariables.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {relatedVariables.map((variableLink) => {
                    const control = controlMap.get(variableLink.param);
                    return (
                      <span key={variableLink.id} className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700">
                        <InlineFormula expression={variableLink.symbol} /> {formatDisplayText(variableLink.label)}
                        {control
                          ? ` ${formatValue(values[variableLink.param], control.unit, translate)}`
                          : ""}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </details>
  );
}
