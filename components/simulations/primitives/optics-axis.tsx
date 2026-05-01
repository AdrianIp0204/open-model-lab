"use client";

import type { ReactNode } from "react";
import { clamp, formatMeasurement, formatNumber } from "@/lib/physics";

export type AxisStageLayout = {
  width: number;
  height: number;
  axisLeft: number;
  axisRight: number;
  axisY: number;
  worldLeft: number;
  worldRight: number;
  heightScale: number;
};

export function projectAxisX(layout: AxisStageLayout, position: number) {
  return (
    layout.axisLeft +
    (position - layout.worldLeft) *
      ((layout.axisRight - layout.axisLeft) / (layout.worldRight - layout.worldLeft))
  );
}

export function projectAxisY(layout: AxisStageLayout, value: number) {
  return layout.axisY - value * layout.heightScale;
}

export function stageXToObjectDistance(
  layout: AxisStageLayout,
  stageX: number,
  minDistance: number,
  maxDistance: number,
) {
  const worldX =
    layout.worldLeft +
    ((stageX - layout.axisLeft) / (layout.axisRight - layout.axisLeft)) *
      (layout.worldRight - layout.worldLeft);

  return clamp(-worldX, minDistance, maxDistance);
}

export function formatInfinity(value: number) {
  return value < 0 ? "-\u221e" : "\u221e";
}

export function formatOpticsMagnification(value: number) {
  return Number.isFinite(value) ? formatNumber(value) : formatInfinity(value);
}

export function formatOpticsImageDistance(value: number) {
  return Number.isFinite(value) ? formatMeasurement(value, "m") : formatInfinity(value);
}

type OpticsArrowProps = {
  x: number;
  height: number;
  axisY: number;
  projectY: (value: number) => number;
  label: string;
  stroke: string;
  fill: string;
  labelOffsetY?: number;
  dashed?: boolean;
  opacity?: number;
  labelPosition?: "above" | "below";
};

export function OpticsArrow({
  x,
  height,
  axisY,
  projectY,
  label,
  stroke,
  fill,
  labelOffsetY = 14,
  dashed,
  opacity,
  labelPosition,
}: OpticsArrowProps) {
  const topY = projectY(height);
  const arrowDirection = height >= 0 ? -1 : 1;
  const headY = topY + arrowDirection * 12;
  const resolvedLabelY =
    labelPosition === "below"
      ? Math.max(topY, axisY) + labelOffsetY
      : Math.min(topY, axisY) - labelOffsetY;

  return (
    <g opacity={opacity ?? 1}>
      <line
        x1={x}
        x2={x}
        y1={axisY}
        y2={topY}
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <line
        x1={x}
        x2={x - 9}
        y1={topY}
        y2={headY}
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <line
        x1={x}
        x2={x + 9}
        y1={topY}
        y2={headY}
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      <circle cx={x} cy={axisY} r="4" fill={fill} opacity={dashed ? 0.65 : 0.95} />
      <text
        x={x}
        y={resolvedLabelY}
        textAnchor="middle"
        className="fill-ink-700 text-[11px] font-semibold"
      >
        {label}
      </text>
    </g>
  );
}

type OpticsAxisStageProps = {
  layout: AxisStageLayout;
  children: ReactNode;
};

export function OpticsAxisStage({ layout, children }: OpticsAxisStageProps) {
  return (
    <>
      <rect width={layout.width} height={layout.height} fill="rgba(255,255,255,0.48)" />
      <rect
        x="28"
        y="24"
        width={layout.width - 56}
        height={layout.height - 48}
        rx="24"
        fill="rgba(255,253,247,0.72)"
        stroke="rgba(15,28,36,0.08)"
        strokeWidth="1.5"
      />
      <line
        x1={layout.axisLeft}
        x2={layout.axisRight}
        y1={layout.axisY}
        y2={layout.axisY}
        stroke="rgba(15,28,36,0.24)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <text
        x={layout.axisRight}
        y={layout.axisY + 32}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        principal axis
      </text>
      {children}
    </>
  );
}
