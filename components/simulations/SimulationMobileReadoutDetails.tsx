"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { getSimulationCopy } from "@/lib/i18n/copy-text";
import { SimulationReadoutSummary } from "./SimulationReadoutSummary";
import type { SimulationReadoutRow } from "./SimulationReadoutCard";
import type { SimulationCopyKey } from "@/lib/i18n/copy-text";

type SimulationMobileReadoutDetailsProps = {
  title: string;
  titleKey?: SimulationCopyKey;
  setupLabel?: string | null;
  setupLabelKey?: SimulationCopyKey;
  rows: SimulationReadoutRow[];
  noteLines?: string[];
  summaryLabel?: string;
  children?: ReactNode;
};

export function SimulationMobileReadoutDetails({
  title,
  titleKey,
  setupLabel,
  setupLabelKey,
  rows,
  noteLines,
  summaryLabel = "Show live readout",
  children,
}: SimulationMobileReadoutDetailsProps) {
  const locale = useLocale();
  const localizedSummaryLabel =
    summaryLabel === "Show live readout"
      ? getSimulationCopy(locale, "simulation.showLiveReadout")
      : summaryLabel;
  const localizedReadoutLabel = getSimulationCopy(locale, "simulation.readout");

  return (
    <details
      className="border-t border-line bg-white/70 px-3 py-2 sm:hidden"
      data-testid="simulation-mobile-readout-panel"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] text-sm font-semibold text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white [&::-webkit-details-marker]:hidden">
        <span>{localizedSummaryLabel}</span>
        <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-ink-600">
          {localizedReadoutLabel}
        </span>
      </summary>
      <SimulationReadoutSummary
        title={title}
        titleKey={titleKey}
        setupLabel={setupLabel}
        setupLabelKey={setupLabelKey}
        rows={rows}
        noteLines={noteLines}
        className="mt-2 rounded-[14px] bg-white/88"
      />
      {children}
    </details>
  );
}
