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
  setupLabel?: string | null;
  rows: SimulationReadoutRow[];
  noteLines?: string[];
};

export function SimulationReadoutCard({
  x,
  y,
  width,
  title,
  setupLabel,
  rows,
  noteLines,
}: SimulationReadoutCardProps) {
  const locale = useLocale();
  const resolvedNoteLines = noteLines?.filter(Boolean) ?? [];
  const height = 38 + rows.length * 18 + (resolvedNoteLines.length ? 18 + resolvedNoteLines.length * 14 : 0);
  const noteStartY = 42 + rows.length * 18 + 10;
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
        rx="18"
        fill="rgba(255,253,247,0.92)"
        stroke="rgba(15,28,36,0.12)"
        strokeWidth="1.5"
      />
      <text x="14" y="22" className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.18em]">
        {localizedTitle}
      </text>
      {localizedSetupLabel ? (
        <g transform={`translate(${width - 14} 14)`}>
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
        const rowY = 42 + index * 18;
        return (
          <g key={`${row.label}-${index}`}>
            <text x="14" y={rowY} className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]">
              {row.label}
            </text>
            <text
              x={width - 14}
              y={rowY}
              textAnchor="end"
              className={row.valueClassName ?? "fill-ink-950 text-[12px] font-semibold"}
            >
              {row.value}
            </text>
          </g>
        );
      })}
      {resolvedNoteLines.length ? (
        <>
          <line
            x1="14"
            x2={width - 14}
            y1={noteStartY - 10}
            y2={noteStartY - 10}
            stroke="rgba(15,28,36,0.1)"
          />
          {resolvedNoteLines.map((noteLine, index) => (
            <text
              key={noteLine}
              x="14"
              y={noteStartY + index * 14}
              className="fill-ink-500 text-[10px]"
            >
              {noteLine}
            </text>
          ))}
        </>
      ) : null}
    </g>
  );
}
