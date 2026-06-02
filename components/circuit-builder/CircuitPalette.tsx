"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  circuitBuilderCopyEn,
  circuitPaletteCategoryOrder,
  getLocalizedCircuitPaletteEntries,
  type CircuitBuilderCopy,
  type CircuitComponentType,
  type CircuitPaletteCategory,
  type CircuitPaletteItemType,
  type CircuitRenderMode,
} from "@/lib/circuit-builder";
import { CircuitPartVisual } from "./CircuitPartVisual";
import { CircuitSymbol } from "./CircuitSymbol";

type CircuitPaletteProps = {
  activeTool: "select" | "wire";
  onAddComponent: (type: CircuitComponentType) => void;
  onSetTool: (tool: "select" | "wire") => void;
  renderMode: CircuitRenderMode;
  copy?: CircuitBuilderCopy;
  className?: string;
  panelKind?: "desktop" | "mobile";
};

export function CircuitPalette({
  activeTool,
  onAddComponent,
  onSetTool,
  renderMode,
  copy = circuitBuilderCopyEn,
  className = "",
  panelKind = "desktop",
}: CircuitPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CircuitPaletteCategory | "all">("all");
  const [previewType, setPreviewType] = useState<CircuitPaletteItemType | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  const searchHelpId = `circuit-palette-search-help-${panelKind}`;
  const searchResultId = `circuit-palette-search-result-${panelKind}`;
  const clearSearchDescriptionId = `circuit-palette-clear-search-description-${panelKind}`;
  const paletteEntries = useMemo(() => getLocalizedCircuitPaletteEntries(copy), [copy]);
  const searchMatchedEntries = useMemo(() => {
    if (!normalizedQuery) {
      return paletteEntries;
    }

    const queryTokens = normalizedQuery.split(" ");

    return paletteEntries.filter((entry) => {
      const normalizedSearchTerms = entry.searchTerms.map((term) => term.toLowerCase());
      const hasPhraseMatch = normalizedSearchTerms.some((term) => term.includes(normalizedQuery));
      const hasTokenMatch = queryTokens.every((token) =>
        normalizedSearchTerms.some((term) => term.includes(token)),
      );

      return hasPhraseMatch || hasTokenMatch;
    });
  }, [normalizedQuery, paletteEntries]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<CircuitPaletteCategory, number>();

    for (const category of circuitPaletteCategoryOrder) {
      counts.set(category, 0);
    }

    for (const entry of searchMatchedEntries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }

    return counts;
  }, [searchMatchedEntries]);
  const visibleEntries = useMemo(() => {
    if (activeCategory === "all") {
      return searchMatchedEntries;
    }

    return searchMatchedEntries.filter((entry) => entry.category === activeCategory);
  }, [activeCategory, searchMatchedEntries]);
  const groupedEntries = useMemo(() => {
    const categories =
      activeCategory === "all" ? circuitPaletteCategoryOrder : [activeCategory];

    return categories
      .map((category) => ({
        category,
        entries: visibleEntries.filter((entry) => entry.category === category),
      }))
      .filter((group) => group.entries.length > 0);
  }, [activeCategory, visibleEntries]);
  const orderedVisibleEntries = useMemo(
    () => groupedEntries.flatMap((group) => group.entries),
    [groupedEntries],
  );
  const previewEntry =
    orderedVisibleEntries.find((entry) => entry.type === previewType) ??
    orderedVisibleEntries[0] ??
    null;
  const categoryButtonBaseClass =
    panelKind === "mobile"
      ? "min-h-11 shrink-0 rounded-full border px-3 py-2.5 text-[11px] font-semibold transition"
      : "shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition";
  const resultSummary = normalizedQuery
    ? copy.locale === "zh-HK"
      ? `${visibleEntries.length} ${
          visibleEntries.length === 1
            ? copy.palette.resultSummary.match
            : copy.palette.resultSummary.matches
        }：「${query.trim()}」。`
      : `${visibleEntries.length} ${
          visibleEntries.length === 1
            ? copy.palette.resultSummary.match
            : copy.palette.resultSummary.matches
        } for “${query.trim()}”.`
    : `${visibleEntries.length} ${copy.palette.resultSummary.available}`;

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = 0;
  }, [activeCategory, normalizedQuery]);

  function handleDragStart(
    event: React.DragEvent<HTMLButtonElement>,
    type: CircuitPaletteItemType,
  ) {
    if (type === "wire") {
      return;
    }

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/open-model-lab-circuit-part", type);
    event.dataTransfer.setData("text/plain", type);
  }

  function clearSearchAndRefocus() {
    setQuery("");
    searchInputRef.current?.focus();
  }

  function getPreviewTerminalSummary(entry: typeof previewEntry) {
    if (!entry) {
      return "";
    }

    if (entry.type === "wire") {
      return copy.palette.wireToolTerminalSummary;
    }

    if (!entry.terminalLabels) {
      return "";
    }

    return `${entry.terminalLabels.a} ${copy.palette.previewTerminalConnector} ${entry.terminalLabels.b}`;
  }

  return (
    <aside
      className={[
        "lab-panel flex h-full min-h-0 flex-col p-3 sm:p-3.5",
        className,
      ].join(" ").trim()}
      aria-label={copy.palette.ariaLabel}
      data-circuit-palette-panel={panelKind}
      data-circuit-render-mode={renderMode}
      data-onboarding-target="circuit-component-library"
    >
      <div className="space-y-1">
        <p className="lab-label">{copy.palette.eyebrow}</p>
        <h2 className="text-lg font-semibold text-ink-950">{copy.palette.title}</h2>
        <p className="text-xs leading-5 text-ink-700 sm:line-clamp-2">
          {copy.palette.intro}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={searchInputRef}
          type="search"
          aria-label={copy.palette.searchLabel}
          aria-describedby={`${searchHelpId} ${searchResultId}`}
          placeholder={copy.palette.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.preventDefault();
              clearSearchAndRefocus();
            }
          }}
          aria-keyshortcuts="Escape"
          className="w-full rounded-2xl border border-line bg-white px-3 py-1.5 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
          data-circuit-palette-search={panelKind}
        />
        {query ? (
          <>
            <span id={clearSearchDescriptionId} className="sr-only">
              {copy.palette.clearSearchTitle}
            </span>
            <button
              type="button"
              aria-label={copy.palette.clearSearch}
              aria-describedby={clearSearchDescriptionId}
              aria-keyshortcuts="Escape"
              title={copy.palette.clearSearchTitle}
              className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700"
              onClick={clearSearchAndRefocus}
            >
              {copy.palette.clearSearch}
            </button>
          </>
        ) : null}
      </div>
      <p id={searchHelpId} className="mt-2 text-[11px] leading-4 text-ink-600">
        {copy.palette.searchHelp}
      </p>
      <p
        id={searchResultId}
        className="mt-1 text-[11px] font-semibold text-ink-700"
        aria-live="polite"
        data-circuit-palette-result-summary={panelKind}
      >
        {resultSummary}
      </p>

      <div
        className="mt-3 flex gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label={copy.palette.categoryFilterLabel}
        data-circuit-palette-categories={panelKind}
      >
        <button
          type="button"
          aria-label={copy.palette.allCategoriesLabel}
          aria-pressed={activeCategory === "all"}
          data-circuit-palette-category="all"
          onClick={() => setActiveCategory("all")}
          className={[
            categoryButtonBaseClass,
            activeCategory === "all"
              ? "border-teal-600 bg-teal-500/10 text-teal-900"
              : "border-line bg-paper text-ink-700 hover:border-ink-950/20",
          ].join(" ")}
        >
          <span>{copy.palette.allCategoriesLabel}</span>
          <span className="ml-1 text-ink-500" aria-hidden="true">
            {searchMatchedEntries.length}
          </span>
        </button>
        {circuitPaletteCategoryOrder.map((category) => (
          <button
            key={category}
            type="button"
            aria-label={copy.palette.categoryLabels[category]}
            aria-pressed={activeCategory === category}
            data-circuit-palette-category={category}
            onClick={() => setActiveCategory(category)}
            className={[
              categoryButtonBaseClass,
              activeCategory === category
                ? "border-teal-600 bg-teal-500/10 text-teal-900"
                : "border-line bg-paper text-ink-700 hover:border-ink-950/20",
            ].join(" ")}
          >
            <span>{copy.palette.categoryLabels[category]}</span>
            <span className="ml-1 text-ink-500" aria-hidden="true">
              {categoryCounts.get(category) ?? 0}
            </span>
          </button>
        ))}
      </div>

      <section
        aria-label={copy.palette.previewLabel}
        className={[
          "mt-2 rounded-[18px] border border-line bg-white p-3 shadow-sm",
          normalizedQuery ? "order-last" : "",
        ].join(" ")}
        data-circuit-palette-preview={panelKind}
        data-circuit-palette-preview-type={previewEntry?.type ?? "none"}
      >
        {previewEntry ? (
          <div className="grid gap-3 sm:grid-cols-[4.75rem_minmax(0,1fr)]">
            <div className="flex h-20 items-center justify-center rounded-[16px] border border-line bg-paper">
              {renderMode === "modern" ? (
                <CircuitPartVisual
                  type={previewEntry.type}
                  className="h-16 w-20"
                  active={previewEntry.type === "wire" && activeTool === "wire"}
                  openSwitch={previewEntry.type === "switch" && activeTool !== "wire"}
                />
              ) : (
                <CircuitSymbol
                  type={previewEntry.type}
                  className="h-14 w-20"
                  active={previewEntry.type === "wire" && activeTool === "wire"}
                  openSwitch={previewEntry.type === "switch" && activeTool !== "wire"}
                />
              )}
            </div>
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-ink-950">{previewEntry.label}</h3>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                  {copy.palette.categoryLabels[previewEntry.category]}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-700">{previewEntry.summary}</p>
              <dl className="mt-2 grid gap-1.5 text-[11px] leading-4 text-ink-700">
                <div>
                  <dt className="font-semibold uppercase tracking-[0.14em] text-ink-500">
                    {copy.palette.previewTerminalsLabel}
                  </dt>
                  <dd data-circuit-palette-preview-terminals={panelKind}>
                    {getPreviewTerminalSummary(previewEntry)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.14em] text-ink-500">
                    {copy.palette.previewBehaviorLabel}
                  </dt>
                  <dd data-circuit-palette-preview-behavior={panelKind}>
                    {previewEntry.behavior}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-6 text-ink-700">
            <p className="font-semibold text-ink-950">{copy.palette.previewFallbackTitle}</p>
            <p className="mt-1">{copy.palette.previewFallbackBody}</p>
          </div>
        )}
      </section>

      <div
        ref={scrollRef}
        className={[
          "mt-3 grid min-h-0 gap-2 overflow-y-auto pr-1",
          normalizedQuery ? "min-h-[8rem]" : "",
        ].join(" ")}
        data-circuit-palette-scroll={panelKind}
      >
        {visibleEntries.length === 0 ? (
          <div
            className="rounded-[22px] border border-dashed border-line bg-paper px-4 py-4 text-sm leading-6 text-ink-700"
            data-circuit-palette-empty={panelKind}
          >
            <p className="font-semibold text-ink-950">{copy.palette.emptyTitle}</p>
            <p className="mt-1">{copy.palette.emptyHint}</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700"
              onClick={clearSearchAndRefocus}
            >
              {copy.palette.showAll}
            </button>
          </div>
        ) : null}
        {groupedEntries.map((group) => (
          <section
            key={group.category}
            className="grid gap-2"
            data-circuit-palette-group={group.category}
          >
            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
              {copy.palette.categoryLabels[group.category]}
            </h3>
            {group.entries.map((entry) => {
              const isWireTool = entry.type === "wire";
              const isActive = isWireTool ? activeTool === "wire" : false;
              const itemDescriptionId = `circuit-palette-${panelKind}-${entry.type}-description`;
              const itemAccessibleDescription = isWireTool
                ? isActive
                  ? copy.palette.wireToolActiveDescription
                  : copy.palette.wireToolInactiveDescription
                : `${copy.palette.addComponentDescriptionPrefix} ${entry.label} ${copy.palette.addComponentDescriptionSuffix}`;

              return (
                <button
                  key={entry.type}
                  type="button"
                  draggable={!isWireTool}
                  aria-label={
                    isWireTool
                      ? copy.palette.activateWireTool
                      : `${copy.palette.addComponentAriaPrefix} ${entry.label}`
                  }
                  aria-describedby={itemDescriptionId}
                  aria-pressed={isWireTool ? isActive : undefined}
                  onFocus={() => setPreviewType(entry.type)}
                  onPointerEnter={() => setPreviewType(entry.type)}
                  onDragStart={(event) => handleDragStart(event, entry.type)}
                  onClick={() => {
                    if (isWireTool) {
                      onSetTool(activeTool === "wire" ? "select" : "wire");
                      return;
                    }

                    onAddComponent(entry.type as CircuitComponentType);
                  }}
                  data-circuit-palette-item={entry.type}
                  className={[
                    "motion-card flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left shadow-sm transition",
                    isActive
                      ? "border-teal-500 bg-teal-500/10 text-ink-950"
                      : "border-line bg-paper-strong text-ink-950 hover:border-ink-950/20",
                  ].join(" ")}
                >
                  <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-[14px] border border-line bg-paper">
                    {renderMode === "modern" ? (
                      <CircuitPartVisual
                        type={entry.type}
                        className="h-9 w-12"
                        active={isActive}
                        openSwitch={entry.type === "switch" && !isActive}
                      />
                    ) : (
                      <CircuitSymbol
                        type={entry.type}
                        className="h-8 w-11"
                        active={isActive}
                        openSwitch={entry.type === "switch" && !isActive}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{entry.label}</span>
                      {isWireTool ? (
                        <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
                          {copy.palette.toolBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-4 text-ink-600">
                      {entry.summary}
                    </p>
                    <span id={itemDescriptionId} className="sr-only">
                      {itemAccessibleDescription}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </aside>
  );
}
