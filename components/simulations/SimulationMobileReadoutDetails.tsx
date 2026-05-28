"use client";

import type { ReactNode } from "react";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";
import type { SimulationReadoutRow } from "./SimulationReadoutCard";

type SimulationMobileReadoutDetailsProps = {
  title: string;
  setupLabel?: string | null;
  rows: SimulationReadoutRow[];
  noteLines?: string[];
  summaryLabel?: string;
  children?: ReactNode;
};

export function SimulationMobileReadoutDetails({
  title,
  setupLabel,
  rows,
  noteLines,
  summaryLabel = "Show live readout",
  children,
}: SimulationMobileReadoutDetailsProps) {
  return (
    <details
      className="border-t border-line bg-white/70 px-3 py-2 sm:hidden"
      data-testid="simulation-mobile-readout-panel"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] text-sm font-semibold text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white [&::-webkit-details-marker]:hidden">
        <span>{summaryLabel}</span>
        <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-ink-600">
          Readout
        </span>
      </summary>
      <SimulationReadoutSummary
        title={title}
        setupLabel={setupLabel}
        rows={rows}
        noteLines={noteLines}
        className="mt-2 rounded-[14px] bg-white/88"
      />
      {children}
    </details>
  );
}
