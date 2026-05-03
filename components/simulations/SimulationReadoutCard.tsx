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
  const resolvedNoteLines = noteLines?.filter(Boolean) ?? [];
  const headerHeight = compact ? 23 : 32;
  const rowHeight = compact ? 13 : 16;
  const noteLineHeight = compact ? 11 : 12;
  const noteGap = compact ? 10 : 14;
  const height = headerHeight + rows.length * rowHeight + (resolvedNoteLines.length ? noteGap + resolvedNoteLines.length * noteLineHeight : 0);
  const noteStartY = headerHeight + 4 + rows.length * rowHeight + (compact ? 2 : 10);
  const localizedSetupLabel = setupLabel ? localizeKnownCompareText(locale, setupLabel) : null;
  const localizedTitle = localizeKnownSimulationText(locale, title);
  const setupPillWidth = localizedSetupLabel ? Math.max(58, localizedSetupLabel.length * 6 + 18) : 0;

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
        rx={compact ? "11" : "15"}
        fill={compact ? "rgba(255,253,247,0.72)" : "rgba(255,253,247,0.92)"}
        stroke={compact ? "rgba(15,28,36,0.08)" : "rgba(15,28,36,0.12)"}
        strokeWidth={compact ? "1" : "1.5"}
      />
      <text
        x={compact ? "9" : "14"}
        y={compact ? "15" : "19"}
        className={compact ? "fill-ink-600 text-[8px] font-semibold uppercase tracking-[0.08em]" : "fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"}
      >
        {localizedTitle}
      </text>
      {localizedSetupLabel ? (
        <g transform={`translate(${width - (compact ? 9 : 14)} ${compact ? 10 : 14})`}>
          <rect
            x={-setupPillWidth}
            y={compact ? "-8" : "-9"}
            width={setupPillWidth}
            height={compact ? "16" : "18"}
            rx={compact ? "8" : "9"}
            fill="rgba(78,166,223,0.12)"
            stroke="rgba(78,166,223,0.28)"
            strokeWidth="1"
          />
          <text
            x={-(setupPillWidth / 2)}
            y={compact ? "3" : "4"}
            textAnchor="middle"
            className={compact ? "fill-sky-700 text-[8px] font-semibold uppercase tracking-[0.08em]" : "fill-sky-700 text-[9px] font-semibold uppercase tracking-[0.14em]"}
          >
            {localizedSetupLabel}
          </text>
        </g>
      ) : null}
      {rows.map((row, index) => {
        const rowY = headerHeight + 4 + index * rowHeight;
        return (
          <g key={`${row.label}-${index}`}>
            <text
              x={compact ? "9" : "14"}
              y={rowY}
              className={compact ? "fill-ink-600 text-[8px] font-semibold uppercase tracking-[0.05em]" : "fill-ink-500 text-[9px] font-semibold uppercase tracking-[0.12em]"}
            >
              {row.label}
            </text>
            <text
              x={width - (compact ? 9 : 14)}
              y={rowY}
              textAnchor="end"
              className={row.valueClassName ?? (compact ? "fill-ink-950 text-[9px] font-semibold" : "fill-ink-950 text-[11px] font-semibold")}
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
