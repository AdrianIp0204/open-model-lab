"use client";

import { useTranslations } from "next-intl";
import type {
  GraphTabSpec,
  NoticePromptType,
  SimulationControlSpec,
  SimulationOverlay,
  SimulationVariableLink,
} from "@/lib/physics";
import type { ResolvedNoticePrompt } from "@/lib/learning/noticePrompts";
import { InlineFormula, RichMathText } from "./MathFormula";
import { getVariableTone } from "./variable-tones";

type WhatToNoticePanelProps = {
  title?: string;
  intro?: string;
  prompts: ResolvedNoticePrompt[];
  activePrompt: ResolvedNoticePrompt | null;
  activeIndex: number;
  controls: SimulationControlSpec[];
  graphs: GraphTabSpec[];
  overlays: SimulationOverlay[];
  variableLinks: SimulationVariableLink[];
  hidden?: boolean;
  onNext: () => void;
  onDismiss: () => void;
  onShow: () => void;
  onRestart: () => void;
  className?: string;
};

type RelatedTag =
  | {
      id: string;
      kind: "control" | "graph" | "overlay";
      label: string;
    }
  | {
      id: string;
      kind: "equation";
      label: string;
      symbol: string;
      tone: SimulationVariableLink["tone"];
    };

function buildRelatedTags(
  prompt: ResolvedNoticePrompt,
  controls: SimulationControlSpec[],
  graphs: GraphTabSpec[],
  overlays: SimulationOverlay[],
  variableLinks: SimulationVariableLink[],
) {
  const controlMap = new Map(controls.map((control) => [control.param, control]));
  const graphMap = new Map(graphs.map((graph) => [graph.id, graph]));
  const overlayMap = new Map(overlays.map((overlay) => [overlay.id, overlay]));
  const variableMap = new Map(variableLinks.map((variable) => [variable.id, variable]));
  const tags: RelatedTag[] = [];

  for (const controlParam of prompt.relatedControls ?? []) {
    const control = controlMap.get(controlParam);
    if (control) {
      tags.push({
        id: `control-${control.param}`,
        kind: "control",
        label: control.label,
      });
    }
  }

  for (const graphId of prompt.relatedGraphTabs ?? []) {
    const graph = graphMap.get(graphId);
    if (graph) {
      tags.push({
        id: `graph-${graph.id}`,
        kind: "graph",
        label: graph.label,
      });
    }
  }

  for (const overlayId of prompt.relatedOverlays ?? []) {
    const overlay = overlayMap.get(overlayId);
    if (overlay) {
      tags.push({
        id: `overlay-${overlay.id}`,
        kind: "overlay",
        label: overlay.label,
      });
    }
  }

  for (const variableId of prompt.relatedEquationVariables ?? []) {
    const variable = variableMap.get(variableId);
    if (variable) {
      tags.push({
        id: `equation-${variable.id}`,
        kind: "equation",
        label: variable.label,
        symbol: variable.symbol,
        tone: variable.tone,
      });
    }
  }

  return tags;
}

export function WhatToNoticePanel({
  title,
  intro,
  prompts,
  activePrompt,
  activeIndex,
  controls,
  graphs,
  overlays,
  variableLinks,
  hidden = false,
  onNext,
  onDismiss,
  onShow,
  onRestart,
  className,
}: WhatToNoticePanelProps) {
  const t = useTranslations("WhatToNoticePanel");
  if (!prompts.length || !activePrompt) {
    return null;
  }

  const resolvedTitle = title ?? t("title");
  const resolvedIntro = intro ?? t("intro");
  const promptTypeLabels: Record<NoticePromptType, string> = {
    observation: t("types.observation"),
    compare: t("types.compare"),
    "graph-reading": t("types.graphReading"),
    misconception: t("types.misconception"),
    "try-this": t("types.tryThis"),
  };
  const relatedTags = buildRelatedTags(activePrompt, controls, graphs, overlays, variableLinks);

  if (hidden) {
    return (
      <section className={["lab-panel p-3.5 md:p-4", className ?? ""].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-lg">
            <p className="lab-label">{resolvedTitle}</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              {t("hidden.description")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                {promptTypeLabels[activePrompt.type]}
              </span>
              {prompts.length > 1 ? (
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
                  {t("progress.promptCounter", {
                    current: activeIndex + 1,
                    total: prompts.length,
                  })}
                </span>
              ) : null}
              {activePrompt.contextBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-line bg-white/75 px-2.5 py-1 font-mono text-[0.72rem] text-ink-600"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onShow}
            className="rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            {t("actions.showPrompt")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={["lab-panel p-3.5 md:p-4", className ?? ""].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div className="max-w-lg">
          <p className="lab-label">{resolvedTitle}</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">{resolvedIntro}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-teal-700">
            {promptTypeLabels[activePrompt.type]}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-ink-600">
            {t("progress.promptCounter", {
              current: activeIndex + 1,
              total: prompts.length,
            })}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-line bg-paper-strong p-4">
        <div className="flex flex-wrap gap-2">
          {activePrompt.contextBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-line bg-white/75 px-2.5 py-1 font-mono text-[0.72rem] text-ink-600"
            >
              {badge}
            </span>
          ))}
        </div>

        <RichMathText
          as="div"
          content={activePrompt.text}
          className="mt-3 text-base font-semibold leading-7 text-ink-950"
        />

        {activePrompt.tryThis ? (
          <div className="mt-3 rounded-[18px] border border-teal-500/20 bg-white/75 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              {t("sections.tryThis")}
            </p>
            <RichMathText
              as="div"
              content={activePrompt.tryThis}
              className="mt-2 text-sm leading-6 text-ink-700"
            />
          </div>
        ) : null}

        {activePrompt.whyItMatters ? (
          <div className="mt-3 rounded-[18px] border border-line bg-white/70 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("sections.whyItMatters")}
            </p>
            <RichMathText
              as="div"
              content={activePrompt.whyItMatters}
              className="mt-2 text-sm leading-6 text-ink-700"
            />
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
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-600"
                >
                  {tag.kind === "control"
                    ? t("related.control", { label: tag.label })
                    : tag.kind === "graph"
                      ? t("related.graph", { label: tag.label })
                      : t("related.overlay", { label: tag.label })}
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            {prompts.length > 1 ? t("actions.nextPrompt") : t("actions.showAgain")}
          </button>
          {prompts.length > 1 ? (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
            >
              {t("actions.restartPrompts")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-coral-500/35 hover:bg-white/90"
          >
            {t("actions.hide")}
          </button>
        </div>
      </div>
    </section>
  );
}
