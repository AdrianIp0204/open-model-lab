"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  circuitPaletteEntries,
  type CircuitComponentType,
  type CircuitPaletteItemType,
} from "@/lib/circuit-builder";
import { CircuitSymbol } from "./CircuitSymbol";

type CircuitPaletteProps = {
  activeTool: "select" | "wire";
  onAddComponent: (type: CircuitComponentType) => void;
  onSetTool: (tool: "select" | "wire") => void;
  className?: string;
  panelKind?: "desktop" | "mobile";
};

export function CircuitPalette({
  activeTool,
  onAddComponent,
  onSetTool,
  className = "",
  panelKind = "desktop",
}: CircuitPaletteProps) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  const searchHelpId = `circuit-palette-search-help-${panelKind}`;
  const searchResultId = `circuit-palette-search-result-${panelKind}`;
  const clearSearchDescriptionId = `circuit-palette-clear-search-description-${panelKind}`;
  const visibleEntries = useMemo(() => {
    if (!normalizedQuery) {
      return circuitPaletteEntries;
    }

    const queryTokens = normalizedQuery.split(" ");

    return circuitPaletteEntries.filter((entry) => {
      const normalizedSearchTerms = entry.searchTerms.map((term) => term.toLowerCase());
      const hasPhraseMatch = normalizedSearchTerms.some((term) => term.includes(normalizedQuery));
      const hasTokenMatch = queryTokens.every((token) =>
        normalizedSearchTerms.some((term) => term.includes(token)),
      );

      return hasPhraseMatch || hasTokenMatch;
    });
  }, [normalizedQuery]);
  const resultSummary = normalizedQuery
    ? `${visibleEntries.length} ${visibleEntries.length === 1 ? "match" : "matches"} for “${query.trim()}”.`
    : `${visibleEntries.length} tools and components available.`;

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = 0;
  }, [normalizedQuery]);

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

  return (
    <aside
      className={[
        "lab-panel flex h-full min-h-0 flex-col p-3 sm:p-3.5",
        className,
      ].join(" ").trim()}
      aria-label="Component library"
      data-circuit-palette-panel={panelKind}
      data-onboarding-target="circuit-component-library"
    >
      <div className="space-y-1">
        <p className="lab-label">Component library</p>
        <h2 className="text-lg font-semibold text-ink-950">Add parts</h2>
        <p className="text-xs leading-5 text-ink-700 sm:line-clamp-2">
          Click to drop a part near the current viewport center, or drag it onto the workspace.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={searchInputRef}
          type="search"
          aria-label="Search components"
          aria-describedby={`${searchHelpId} ${searchResultId}`}
          placeholder="Search components"
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
              Clear the current component search and keep focus in the search field. Shortcut: Escape.
            </span>
            <button
              type="button"
              aria-label="Clear component search"
              aria-describedby={clearSearchDescriptionId}
              aria-keyshortcuts="Escape"
              title="Clear component search (Esc)"
              className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700"
              onClick={clearSearchAndRefocus}
            >
              Clear
            </button>
          </>
        ) : null}
      </div>
      <p id={searchHelpId} className="mt-2 text-[11px] leading-4 text-ink-600">
        Search by name or role: try battery, source, bulb, ldr, sensor, fuse, or connect.
        Press Esc while searching to clear.
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
        ref={scrollRef}
        className="mt-3 grid min-h-0 gap-2 overflow-y-auto pr-1"
        data-circuit-palette-scroll={panelKind}
      >
        {visibleEntries.length === 0 ? (
          <div
            className="rounded-[22px] border border-dashed border-line bg-paper px-4 py-4 text-sm leading-6 text-ink-700"
            data-circuit-palette-empty={panelKind}
          >
            <p className="font-semibold text-ink-950">No components match that search.</p>
            <p className="mt-1">Try “battery”, “bulb”, “ldr”, or clear the search to browse the full library.</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700"
              onClick={clearSearchAndRefocus}
            >
              Show all components
            </button>
          </div>
        ) : null}
        {visibleEntries.map((entry) => {
          const isWireTool = entry.type === "wire";
          const isActive = isWireTool ? activeTool === "wire" : false;
          const itemDescriptionId = `circuit-palette-${panelKind}-${entry.type}-description`;
          const itemAccessibleDescription = isWireTool
            ? isActive
              ? "Wire tool is active. Press to return to select mode."
              : "Toggle wire mode, then choose two terminals in the workspace to connect parts."
            : `Click to add ${entry.label} near the current workspace center, or drag it directly onto the workspace.`;

          return (
            <button
              key={entry.type}
              type="button"
              draggable={!isWireTool}
              aria-label={isWireTool ? "Activate wire tool" : `Add ${entry.label}`}
              aria-describedby={itemDescriptionId}
              aria-pressed={isWireTool ? isActive : undefined}
              onDragStart={(event) => handleDragStart(event, entry.type)}
              onClick={() => {
                if (isWireTool) {
                  onSetTool(activeTool === "wire" ? "select" : "wire");
                  return;
                }

                onAddComponent(entry.type as CircuitComponentType);
              }}
              className={[
                "motion-card flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left shadow-sm transition",
                isActive
                  ? "border-teal-500 bg-teal-500/10 text-ink-950"
                  : "border-line bg-paper-strong text-ink-950 hover:border-ink-950/20",
              ].join(" ")}
            >
              <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-[14px] border border-line bg-paper">
                <CircuitSymbol
                  type={entry.type}
                  className="h-8 w-11"
                  active={isActive}
                  openSwitch={entry.type === "switch" && !isActive}
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{entry.label}</span>
                  {isWireTool ? (
                    <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
                      Tool
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-ink-600 sm:line-clamp-2">{entry.summary}</p>
                <span id={itemDescriptionId} className="sr-only">
                  {itemAccessibleDescription}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
