"use client";

import { useTranslations } from "next-intl";
import type {
  GraphTabSpec,
  SimulationControlSpec,
  SimulationOverlay,
  SimulationVariableLink,
} from "@/lib/physics";
import { InlineFormula } from "./MathFormula";
import { getVariableTone } from "./variable-tones";

type GuidedOverlayPanelProps = {
  title?: string;
  intro?: string;
  overlays: SimulationOverlay[];
  values: Record<string, boolean>;
  focusedOverlayId: string | null;
  highlightedOverlayIds?: string[];
  controls: SimulationControlSpec[];
  graphs: GraphTabSpec[];
  variableLinks: SimulationVariableLink[];
  activeGraphId?: string | null;
  className?: string;
  onFocusOverlay: (overlayId: string) => void;
  onToggleOverlay: (overlayId: string, value: boolean) => void;
};

type RelatedTag =
  | {
      id: string;
      kind: "control" | "graph";
      label: string;
      active?: boolean;
    }
  | {
      id: string;
      kind: "equation";
      label: string;
      symbol: string;
      tone: SimulationVariableLink["tone"];
    };

function chipTone(enabled: boolean, focused: boolean, highlighted: boolean) {
  if (focused && enabled) {
    return "border-teal-500 bg-teal-500/12 text-teal-950 shadow-[0_8px_18px_rgba(30,166,162,0.12)]";
  }

  if (focused) {
    return "border-coral-500 bg-coral-500/10 text-ink-900";
  }

  if (highlighted) {
    return "border-coral-500/40 bg-coral-500/10 text-ink-900";
  }

  if (enabled) {
    return "border-line bg-paper-strong text-ink-800 hover:border-teal-500/35";
  }

  return "border-line bg-paper text-ink-600 hover:border-coral-500/35";
}

function buildRelatedTags(
  overlay: SimulationOverlay,
  controls: SimulationControlSpec[],
  graphs: GraphTabSpec[],
  variableLinks: SimulationVariableLink[],
  activeGraphId?: string | null,
) {
  const controlMap = new Map(controls.map((control) => [control.param, control]));
  const graphMap = new Map(graphs.map((graph) => [graph.id, graph]));
  const variableMap = new Map(variableLinks.map((variable) => [variable.id, variable]));
  const related: RelatedTag[] = [];

  for (const controlParam of overlay.relatedControls ?? []) {
    const control = controlMap.get(controlParam);
    if (control) {
      related.push({
        id: `control-${control.param}`,
        kind: "control",
        label: control.label,
      });
    }
  }

  for (const graphId of overlay.relatedGraphTabs ?? []) {
    const graph = graphMap.get(graphId);
    if (graph) {
      related.push({
        id: `graph-${graph.id}`,
        kind: "graph",
        label: graph.label,
        active: activeGraphId === graph.id,
      });
    }
  }

  for (const variableId of overlay.relatedEquationVariables ?? []) {
    const variable = variableMap.get(variableId);
    if (variable) {
      related.push({
        id: `equation-${variable.id}`,
        kind: "equation",
        label: variable.label,
        symbol: variable.symbol,
        tone: variable.tone,
      });
    }
  }

  return related;
}

export function GuidedOverlayPanel({
  title,
  intro,
  overlays,
  values,
  focusedOverlayId,
  highlightedOverlayIds,
  controls,
  graphs,
  variableLinks,
  activeGraphId,
  className,
  onFocusOverlay,
  onToggleOverlay,
}: GuidedOverlayPanelProps) {
  const t = useTranslations("GuidedOverlayPanel");
  const focusedOverlay =
    overlays.find((overlay) => overlay.id === focusedOverlayId) ?? overlays[0] ?? null;

  if (!focusedOverlay) {
    return null;
  }

  const highlightedOverlaySet = new Set(highlightedOverlayIds ?? []);
  const visibleCount = overlays.filter((overlay) => values[overlay.id]).length;
  const focusedEnabled = Boolean(values[focusedOverlay.id]);
  const resolvedTitle = title ?? t("title");
  const resolvedIntro = intro ?? t("intro");
  const relatedTags = buildRelatedTags(
    focusedOverlay,
    controls,
    graphs,
    variableLinks,
    activeGraphId,
  );

  return (
    <section className={["lab-panel p-3.5 md:p-4", className ?? ""].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div className="max-w-lg">
          <p className="lab-label">{resolvedTitle}</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">{resolvedIntro}</p>
        </div>
        <div className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("visibleCount", { visible: visibleCount, total: overlays.length })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {overlays.map((overlay) => {
          const enabled = Boolean(values[overlay.id]);
          const focused = overlay.id === focusedOverlay.id;
          const highlighted = highlightedOverlaySet.has(overlay.id);

          return (
            <button
              key={overlay.id}
              type="button"
              aria-pressed={focused}
              onClick={() => onFocusOverlay(overlay.id)}
              className={[
                "rounded-full border px-3 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                chipTone(enabled, focused, highlighted),
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex h-2.5 w-2.5 rounded-full",
                    enabled ? "bg-current" : "border border-current/55 bg-transparent",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <span>{overlay.label}</span>
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]",
                    enabled
                      ? "border-current/20 bg-white/55 text-current"
                      : "border-current/15 bg-transparent text-current/75",
                  ].join(" ")}
                >
                  {enabled ? t("states.visible") : t("states.hidden")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-line bg-paper-strong p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="lab-label">{t("sections.overlayFocus")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-ink-950">{focusedOverlay.label}</h3>
              <span
                className={[
                  "rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em]",
                  focusedEnabled
                    ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                    : "border-line bg-paper text-ink-600",
                ].join(" ")}
              >
                {focusedEnabled ? t("states.visible") : t("states.hidden")}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={focusedEnabled}
            onClick={() => onToggleOverlay(focusedOverlay.id, !focusedEnabled)}
            className={[
              "rounded-full border px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
              focusedEnabled
                ? "border-teal-500/25 bg-teal-500/12 text-teal-800 hover:bg-teal-500/18"
                : "border-line bg-paper text-ink-700 hover:border-coral-500/35 hover:bg-white",
            ].join(" ")}
          >
            {focusedEnabled ? t("actions.hideOverlay") : t("actions.showOverlay")}
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-ink-700">{focusedOverlay.shortDescription}</p>

        <div className="mt-4 rounded-[18px] border border-line bg-white/70 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("sections.whatToNotice")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink-700">
            {focusedOverlay.whatToNotice.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {focusedOverlay.whyItMatters ? (
          <div className="mt-3 rounded-[18px] border border-line bg-white/70 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("sections.whyItMatters")}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              {focusedOverlay.whyItMatters}
            </p>
          </div>
        ) : null}

        {relatedTags.length ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("related.ariaLabel")}>
            {relatedTags.map((tag) => {
              if (tag.kind === "equation") {
                const tone = getVariableTone(tag.tone);
                return (
                  <li
                    key={tag.id}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]",
                      tone.badge,
                      tone.softText,
                    ].join(" ")}
                  >
                    <span>{t("related.equation")}</span>
                    <InlineFormula expression={tag.symbol} />
                  </li>
                );
              }

              return (
                <li
                  key={tag.id}
                  className={[
                    "rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]",
                    tag.kind === "graph" && tag.active
                      ? "border-teal-500/30 bg-teal-500/10 text-teal-700"
                      : "border-line bg-paper px-2.5 py-1 text-ink-600",
                  ].join(" ")}
                >
                  {tag.kind === "control"
                    ? t("related.control", { label: tag.label })
                    : t("related.graph", { label: tag.label })}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
