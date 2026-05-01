"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { PredictionModeApi, PredictionModeItem } from "@/lib/physics";
import { RichMathText } from "./MathFormula";
import { CompactModeTabs } from "./CompactModeTabs";

export type PredictionModePanelProps = {
  title?: string;
  intro?: string;
  items: PredictionModeItem[];
  api: PredictionModeApi;
  exploreLabel?: string;
  predictLabel?: string;
  className?: string;
  modeTabsNode?: ReactNode;
};

function toneForChoice(
  item: PredictionModeItem,
  selectedChoiceId: string | null,
  choiceId: string,
  answered: boolean,
) {
  if (!answered) {
    return "border-line bg-paper-strong text-ink-800 hover:border-teal-500/35";
  }

  if (choiceId === item.correctChoiceId) {
    return "border-emerald-500/35 bg-emerald-500/10 text-ink-950";
  }

  if (choiceId === selectedChoiceId) {
    return "border-coral-500/35 bg-coral-500/10 text-ink-950";
  }

  return "border-line bg-paper-strong text-ink-600";
}

export function PredictionModePanel({
  title,
  intro,
  items,
  api,
  exploreLabel,
  predictLabel,
  className,
  modeTabsNode,
}: PredictionModePanelProps) {
  const t = useTranslations("PredictionModePanel");
  const resolvedTitle = title ?? t("title");
  const resolvedIntro = intro ?? t("intro");
  const resolvedExploreLabel = exploreLabel ?? t("tabs.explore");
  const resolvedPredictLabel = predictLabel ?? t("tabs.predict");
  if (!items.length) {
    return null;
  }

  const currentItem = api.activeItem ?? items[0] ?? null;
  const itemIndex = currentItem ? Math.max(0, items.findIndex((item) => item.id === currentItem.id)) : 0;
  const isLastItem = itemIndex === items.length - 1;
  const tabItems = [
    { id: "explore", label: resolvedExploreLabel },
    { id: "predict", label: resolvedPredictLabel },
  ];
  const renderedModeTabs =
    modeTabsNode === undefined ? (
      <CompactModeTabs
        items={tabItems}
        activeId={api.mode}
        onChange={(nextMode) => (nextMode === "explore" ? api.exit() : api.setMode("predict"))}
        ariaLabel={t("aria.mode")}
      />
    ) : modeTabsNode;

  if (api.mode === "explore") {
    return (
      <section className={["lab-panel p-3.5 md:p-4", className ?? ""].join(" ")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="lab-label">{resolvedTitle}</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">{resolvedIntro}</p>
          </div>
          {renderedModeTabs}
        </div>
      </section>
    );
  }

  if (api.completed) {
    return (
      <section className={["lab-panel p-3.5 md:p-4", className ?? ""].join(" ")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="lab-label">{resolvedTitle}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">{t("completed.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
              {t("completed.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={api.exit}
            className="rounded-full border border-line bg-paper-strong px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {resolvedExploreLabel}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={api.restart}
            className="rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            {t("actions.restart")}
          </button>
        </div>
      </section>
    );
  }

  if (!currentItem) {
    return null;
  }

  return (
    <section className={["lab-panel p-3.5 md:p-4", className ?? ""].join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="lab-label">{resolvedTitle}</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            {t("description")}
          </p>
        </div>
        {renderedModeTabs}
      </div>

      <div className="pt-4">
        <div className="flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-teal-700">
            {currentItem.scenario.label}
          </span>
          {currentItem.changeLabel ? (
            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-ink-600">
              {currentItem.changeLabel}
            </span>
          ) : null}
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-ink-600">
            {t("progress.counter", { current: itemIndex + 1, total: items.length })}
          </span>
          {api.answered ? (
            <span
              data-testid="prediction-answer-status"
              className={[
                "rounded-full border px-2.5 py-1",
                api.isCorrect
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                  : "border-coral-500/25 bg-coral-500/10 text-coral-700",
              ].join(" ")}
            >
              {api.isCorrect ? t("feedback.correct") : t("feedback.incorrect")}
            </span>
          ) : null}
          {api.tested ? (
            <span
              data-testid="prediction-simulation-status"
              className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-700"
            >
              {t("feedback.applied")}
            </span>
          ) : null}
        </div>

        <RichMathText
          as="h3"
          content={currentItem.prompt}
          className="mt-3 text-xl font-semibold leading-7 text-ink-950"
        />

        <div className="mt-4 grid gap-2">
          {currentItem.choices.map((choice) => {
            const selected = api.selectedChoiceId === choice.id;
            const choiceTone = toneForChoice(
              currentItem,
              api.selectedChoiceId,
              choice.id,
              api.answered,
            );

            return (
              <button
                key={choice.id}
                type="button"
                disabled={api.answered}
                aria-pressed={selected}
                onClick={() => api.selectChoice(choice.id)}
                className={[
                  "rounded-[20px] border px-4 py-3 text-left text-sm leading-6 transition",
                  choiceTone,
                  api.answered ? "cursor-default" : "hover:-translate-y-0.5",
                ].join(" ")}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-white/85 font-mono text-xs text-ink-700">
                    {choice.id.toUpperCase()}
                  </span>
                  <RichMathText as="span" content={choice.label} />
                </span>
              </button>
            );
          })}
        </div>

        {api.answered ? (
          <div
            className={[
              "mt-4 rounded-[22px] border px-4 py-4 text-sm leading-6",
              api.isCorrect
                ? "border-emerald-500/30 bg-emerald-500/10 text-ink-950"
                : "border-coral-500/30 bg-coral-500/10 text-ink-950",
            ].join(" ")}
            aria-live="polite"
          >
            <p className="font-semibold">
              {api.isCorrect ? t("feedback.correct") : t("feedback.incorrect")}
            </p>
            <RichMathText
              as="div"
              content={currentItem.explanation}
              className="mt-2 text-ink-700"
            />
            <RichMathText
              as="div"
              content={currentItem.observationHint}
              className="mt-3 text-ink-700"
            />

            {api.tested ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">
                {t("feedback.applied")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-ink-600">
            {t("feedback.instructions")}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!api.answered}
            onClick={api.testScenario}
            className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {api.tested ? t("actions.tested") : t("actions.test")}
          </button>
          <button
            type="button"
            disabled={!api.answered}
            onClick={api.nextItem}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLastItem ? t("actions.finish") : t("actions.next")}
          </button>
          <button
            type="button"
            onClick={api.restart}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-coral-500/35 hover:bg-white/90"
          >
            {t("actions.restart")}
          </button>
          <button
            type="button"
            onClick={api.exit}
            className="inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-coral-500/35 hover:bg-white/90"
          >
            {t("actions.exit")}
          </button>
        </div>
      </div>
    </section>
  );
}
