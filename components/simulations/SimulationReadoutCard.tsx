"use client";

import { useLocale } from "next-intl";
import { localizeKnownCompareText, localizeKnownSimulationText } from "@/lib/i18n/copy-text";

export type SimulationReadoutRow = {
  label: string;
  value: string;
  valueClassName?: string;
};

type SimulationReadoutCardProps = {
  x: number;
  y: number;
  width: number;
  title: string;
  variant?: "card" | "hud";
  setupLabel?: string | null;
  rows: SimulationReadoutRow[];
  noteLines?: string[];
};

export function SimulationReadoutCard({
  x,
  y,
  width,
  title,
  variant = "card",
  setupLabel,
  rows,
  noteLines,
}: SimulationReadoutCardProps) {
  const locale = useLocale();
  const compact = variant === "hud";
  const resolvedNoteLines = compact ? [] : noteLines?.filter(Boolean) ?? [];
  const headerHeight = compact ? 14 : 27;
  const rowHeight = compact ? 10 : 14;
  const noteLineHeight = compact ? 11 : 12;
  const noteGap = compact ? 0 : 12;
  const height = headerHeight + rows.length * rowHeight + (resolvedNoteLines.length ? noteGap + resolvedNoteLines.length * noteLineHeight : 0);
  const noteStartY = headerHeight + 4 + rows.length * rowHeight + (compact ? 0 : 8);
  const localizedSetupLabel = setupLabel ? localizeKnownCompareText(locale, setupLabel) : null;
  const localizedTitle = localizeKnownSimulationText(locale, title);
  const setupPillWidth = localizedSetupLabel ? Math.max(48, localizedSetupLabel.length * 5.5 + 14) : 0;

  return (
    <g
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
      data-testid={compact ? "simulation-readout-hud" : "simulation-readout-card"}
      data-readout-variant={variant}
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx={compact ? "9" : "13"}
        fill={compact ? "rgba(255,253,247,0.56)" : "rgba(255,253,247,0.86)"}
        stroke={compact ? "rgba(15,28,36,0.05)" : "rgba(15,28,36,0.1)"}
        strokeWidth="1"
      />
      <text
        x={compact ? "8" : "12"}
        y={compact ? "10" : "17"}
        className={compact ? "fill-ink-600 text-[7px] font-semibold uppercase tracking-[0.05em]" : "fill-ink-500 text-[9px] font-semibold uppercase tracking-[0.12em]"}
      >
        {localizedTitle}
      </text>
      {localizedSetupLabel ? (
        <g transform={`translate(${width - (compact ? 8 : 12)} ${compact ? 8 : 13})`}>
          <rect
            x={-setupPillWidth}
            y={compact ? "-6" : "-8"}
            width={setupPillWidth}
            height={compact ? "12" : "16"}
            rx={compact ? "6" : "8"}
            fill="rgba(78,166,223,0.12)"
            stroke="rgba(78,166,223,0.28)"
            strokeWidth="1"
          />
          <text
            x={-(setupPillWidth / 2)}
            y={compact ? "2.5" : "3.5"}
            textAnchor="middle"
            className={compact ? "fill-sky-700 text-[7px] font-semibold uppercase tracking-[0.05em]" : "fill-sky-700 text-[8px] font-semibold uppercase tracking-[0.12em]"}
          >
            {localizedSetupLabel}
          </text>
        </g>
      ) : null}
      {rows.map((row, index) => {
        const rowY = headerHeight + 6 + index * rowHeight;
        return (
          <g key={`${row.label}-${index}`}>
            <text
              x={compact ? "8" : "12"}
              y={rowY}
              className={compact ? "fill-ink-600 text-[7px] font-semibold uppercase tracking-[0.03em]" : "fill-ink-500 text-[8px] font-semibold uppercase tracking-[0.1em]"}
            >
              {row.label}
            </text>
            <text
              x={width - (compact ? 8 : 12)}
              y={rowY}
              textAnchor="end"
              className={row.valueClassName ?? (compact ? "fill-ink-950 text-[8px] font-semibold" : "fill-ink-950 text-[10px] font-semibold")}
            >
              {row.value}
            </text>
          </g>
        );
      })}
      {resolvedNoteLines.length ? (
        <>
          <line
            x1={compact ? "12" : "14"}
            x2={width - (compact ? 12 : 14)}
            y1={noteStartY - (compact ? 7 : 10)}
            y2={noteStartY - (compact ? 7 : 10)}
            stroke="rgba(15,28,36,0.1)"
          />
          {resolvedNoteLines.map((noteLine, index) => (
            <text
              key={noteLine}
              x={compact ? "12" : "14"}
              y={noteStartY + index * noteLineHeight}
              className={compact ? "fill-ink-500 text-[9px]" : "fill-ink-500 text-[9px]"}
            >
              {noteLine}
            </text>
          ))}
        </>
      ) : null}
    </g>
  );
}
