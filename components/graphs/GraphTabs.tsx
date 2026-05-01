"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { GraphTabSpec } from "@/lib/physics";
import { RichMathText } from "@/components/concepts/MathFormula";

type GraphTabsProps = {
  tabs: GraphTabSpec[];
  activeId: string;
  highlightedTabIds?: string[];
  autoRevealTabIds?: string[];
  primaryTabIds?: string[];
  onChange: (tabId: string) => void;
};

function splitVisibleTabs(
  tabs: GraphTabSpec[],
  preferredIds?: string[],
) {
  if (preferredIds === undefined) {
    return {
      primary: tabs,
      secondary: [] as GraphTabSpec[],
    };
  }

  const primary = preferredIds
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter((tab): tab is GraphTabSpec => Boolean(tab));
  if (primary.length === 0) {
    const fallbackPrimary = tabs[0];
    return {
      primary: fallbackPrimary ? [fallbackPrimary] : [],
      secondary: fallbackPrimary
        ? tabs.filter((tab) => tab.id !== fallbackPrimary.id)
        : [],
    };
  }
  const primaryIds = new Set(primary.map((tab) => tab.id));

  return {
    primary,
    secondary: tabs.filter((tab) => !primaryIds.has(tab.id)),
  };
}

function renderGraphTab({
  tab,
  activeId,
  highlightedTabSet,
  onChange,
}: {
  tab: GraphTabSpec;
  activeId: string;
  highlightedTabSet: Set<string>;
  onChange: (tabId: string) => void;
}) {
  const selected = tab.id === activeId;
  const highlighted = highlightedTabSet.has(tab.id);

  return (
    <button
      key={tab.id}
      id={`graph-tab-${tab.id}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`graph-panel-${tab.id}`}
      style={selected ? { color: "var(--paper-strong)" } : undefined}
      className={[
        "min-w-[7.5rem] shrink-0 rounded-2xl border px-3 py-2 text-left text-sm transition sm:min-w-[8.5rem] sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong",
        selected
          ? "border-teal-500 bg-teal-500 shadow-[0_10px_24px_rgba(30,166,162,0.18)]"
          : highlighted
            ? "border-teal-500/45 bg-teal-500/10 text-ink-700 hover:bg-teal-500/15"
            : "border-line bg-paper-strong text-ink-700 hover:border-teal-500/60 hover:bg-white",
      ].join(" ")}
      onClick={() => onChange(tab.id)}
    >
      <span className="block text-[0.82rem] font-semibold leading-5">
        <RichMathText as="span" content={tab.label} />
      </span>
      <span className="block text-[0.68rem] leading-4 opacity-80">
        <RichMathText as="span" content={tab.xLabel} /> vs{" "}
        <RichMathText as="span" content={tab.yLabel} />
      </span>
    </button>
  );
}

export function GraphTabs({
  tabs,
  activeId,
  highlightedTabIds,
  autoRevealTabIds,
  primaryTabIds,
  onChange,
}: GraphTabsProps) {
  const t = useTranslations("GraphTabs");
  const highlightedTabSet = new Set(highlightedTabIds ?? []);
  const autoRevealTabSet = new Set(autoRevealTabIds ?? []);
  const { primary, secondary } = useMemo(
    () => splitVisibleTabs(tabs, primaryTabIds),
    [primaryTabIds, tabs],
  );
  const [moreGraphsExpanded, setMoreGraphsExpanded] = useState(false);
  const forceExpanded = secondary.some(
    (tab) => tab.id === activeId || autoRevealTabSet.has(tab.id),
  );
  const moreGraphsOpen = moreGraphsExpanded || forceExpanded;

  return (
    <div className="w-full space-y-2">
      <div
        className="flex w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Graph views"
      >
        {primary.map((tab) =>
          renderGraphTab({
            tab,
            activeId,
            highlightedTabSet,
            onChange,
          }),
        )}
      </div>
      {secondary.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-ink-600">
              {t("summary", { count: secondary.length })}
            </p>
            <button
              type="button"
              aria-expanded={moreGraphsOpen}
              aria-controls="graph-tabs-secondary-panel"
              onClick={() => setMoreGraphsExpanded((current) => !current)}
              className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600 transition hover:border-teal-500/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong"
            >
              {moreGraphsOpen ? t("hide") : t("show")}
            </button>
          </div>
          {moreGraphsOpen ? (
            <div
              id="graph-tabs-secondary-panel"
              className="grid gap-2 sm:grid-cols-2"
            >
              {secondary.map((tab) =>
                renderGraphTab({
                  tab,
                  activeId,
                  highlightedTabSet,
                  onChange,
                }),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
