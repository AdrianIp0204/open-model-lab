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
  const headerHeight = compact ? 30 : 38;
  const rowHeight = compact ? 16 : 18;
  const noteLineHeight = compact ? 12 : 14;
  const noteGap = compact ? 14 : 18;
  const height = headerHeight + rows.length * rowHeight + (resolvedNoteLines.length ? noteGap + resolvedNoteLines.length * noteLineHeight : 0);
  const noteStartY = headerHeight + 4 + rows.length * rowHeight + (compact ? 2 : 10);
  const localizedSetupLabel = setupLabel ? localizeKnownCompareText(locale, setupLabel) : null;
  const localizedTitle = localizeKnownSimulationText(locale, title);
  const setupPillWidth = localizedSetupLabel ? Math.max(58, localizedSetupLabel.length * 6 + 18) : 0;

  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx={compact ? "14" : "18"}
        fill={compact ? "rgba(255,253,247,0.84)" : "rgba(255,253,247,0.92)"}
        stroke={compact ? "rgba(15,28,36,0.1)" : "rgba(15,28,36,0.12)"}
        strokeWidth={compact ? "1" : "1.5"}
      />
      <text
        x={compact ? "12" : "14"}
        y={compact ? "19" : "22"}
        className={compact ? "fill-ink-600 text-[10px] font-semibold uppercase tracking-[0.14em]" : "fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]"}
      >
        {localizedTitle}
      </text>
      {localizedSetupLabel ? (
        <g transform={`translate(${width - (compact ? 12 : 14)} ${compact ? 12 : 14})`}>
          <rect
            x={-setupPillWidth}
            y="-9"
            width={setupPillWidth}
            height="18"
            rx="9"
            fill="rgba(78,166,223,0.12)"
            stroke="rgba(78,166,223,0.28)"
            strokeWidth="1"
          />
          <text
            x={-(setupPillWidth / 2)}
            y="4"
            textAnchor="middle"
            className="fill-sky-700 text-[9px] font-semibold uppercase tracking-[0.14em]"
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
              x={compact ? "12" : "14"}
              y={rowY}
              className={compact ? "fill-ink-600 text-[9px] font-semibold uppercase tracking-[0.1em]" : "fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"}
            >
              {row.label}
            </text>
            <text
              x={width - (compact ? 12 : 14)}
              y={rowY}
              textAnchor="end"
              className={row.valueClassName ?? (compact ? "fill-ink-950 text-[11px] font-semibold" : "fill-ink-950 text-[12px] font-semibold")}
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
              className={compact ? "fill-ink-500 text-[9px]" : "fill-ink-500 text-[10px]"}
            >
              {noteLine}
            </text>
          ))}
        </>
      ) : null}
    </g>
  );
}
