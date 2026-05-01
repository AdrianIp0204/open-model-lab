"use client";

import { useLocale } from "next-intl";
import { localizeKnownCompareText, localizeKnownSimulationText } from "@/lib/i18n/copy-text";
import type { SimulationReadoutRow } from "./SimulationReadoutCard";

type SimulationReadoutSummaryProps = {
  title: string;
  setupLabel?: string | null;
  rows: SimulationReadoutRow[];
  noteLines?: string[];
  className?: string;
};

export function SimulationReadoutSummary({
  title,
  setupLabel,
  rows,
  noteLines,
  className,
}: SimulationReadoutSummaryProps) {
  const locale = useLocale();
  const resolvedNoteLines = noteLines?.filter(Boolean) ?? [];
  const localizedSetupLabel = setupLabel ? localizeKnownCompareText(locale, setupLabel) : null;
  const localizedTitle = localizeKnownSimulationText(locale, title);

  return (
    <section
      className={[
        "rounded-[18px] border border-line bg-white/80 p-3",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="lab-label">{localizedTitle}</p>
        {localizedSetupLabel ? (
          <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sky-700">
            {localizedSetupLabel}
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-line bg-paper-strong px-3 py-2.5"
          >
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
              {row.label}
            </dt>
            <dd className={["mt-1 text-sm font-semibold text-ink-950", row.valueClassName ?? ""].join(" ")}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {resolvedNoteLines.length ? (
        <div className="mt-3 border-t border-line pt-3">
          <ul className="space-y-2 text-sm leading-6 text-ink-600">
            {resolvedNoteLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
