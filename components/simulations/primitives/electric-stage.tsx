"use client";

import type { ReactNode } from "react";
import { clamp, formatNumber } from "@/lib/physics";

export type CartesianStageLayout = {
  width: number;
  height: number;
  plotLeft: number;
  plotTop: number;
  plotRight: number;
  plotBottom: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function projectCartesianX(layout: CartesianStageLayout, x: number) {
  return (
    layout.plotLeft +
    ((x - layout.minX) / (layout.maxX - layout.minX)) *
      (layout.plotRight - layout.plotLeft)
  );
}

export function projectCartesianY(layout: CartesianStageLayout, y: number) {
  return (
    layout.plotBottom -
    ((y - layout.minY) / (layout.maxY - layout.minY)) *
      (layout.plotBottom - layout.plotTop)
  );
}

export function invertCartesianPoint(
  layout: CartesianStageLayout,
  svgX: number,
  svgY: number,
) {
  return {
    x: clamp(
      layout.minX +
        ((svgX - layout.plotLeft) / Math.max(layout.plotRight - layout.plotLeft, 1)) *
          (layout.maxX - layout.minX),
      layout.minX,
      layout.maxX,
    ),
    y: clamp(
      layout.minY +
        ((layout.plotBottom - svgY) / Math.max(layout.plotBottom - layout.plotTop, 1)) *
          (layout.maxY - layout.minY),
      layout.minY,
      layout.maxY,
    ),
  };
}

export function clientPointToSvg(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
  width: number,
  height: number,
) {
  return {
    svgX: ((clientX - bounds.left) / Math.max(bounds.width, 1)) * width,
    svgY: ((clientY - bounds.top) / Math.max(bounds.height, 1)) * height,
  };
}

export function formatSignedCharge(value: number) {
  if (Math.abs(value) < 0.005) {
    return "0 q";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)} q`;
}

export function chargeColors(value: number) {
  if (value > 0.05) {
    return {
      fill: "rgba(240,171,60,0.22)",
      stroke: "#f0ab3c",
      text: "#b87000",
    };
  }

  if (value < -0.05) {
    return {
      fill: "rgba(78,166,223,0.22)",
      stroke: "#4ea6df",
      text: "#1d6f9f",
    };
  }

  return {
    fill: "rgba(15,28,36,0.12)",
    stroke: "rgba(15,28,36,0.42)",
    text: "#55636b",
  };
}

export function directionLabel(x: number, y: number) {
  const horizontal = Math.abs(x) < 0.08 ? "" : x > 0 ? "right" : "left";
  const vertical = Math.abs(y) < 0.08 ? "" : y > 0 ? "up" : "down";

  if (horizontal && vertical) {
    return `${vertical}-${horizontal}`;
  }

  return horizontal || vertical || "neutral";
}

type SvgArrowProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
  dashed?: boolean;
  opacity?: number;
};

export function SvgArrow({
  x1,
  y1,
  x2,
  y2,
  stroke,
  strokeWidth = 3,
  dashed,
  opacity = 1,
}: SvgArrowProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length <= 0.01) {
    return null;
  }

  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(10, Math.max(6, length * 0.28));
  const leftX = x2 - ux * head - uy * head * 0.55;
  const leftY = y2 - uy * head + ux * head * 0.55;
  const rightX = x2 - ux * head + uy * head * 0.55;
  const rightY = y2 - uy * head - ux * head * 0.55;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <polygon points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`} fill={stroke} />
    </g>
  );
}

type ChargeMarkerProps = {
  x: number;
  y: number;
  charge: number;
  label: string;
  radius: number;
  dashed?: boolean;
  muted?: boolean;
};

export function ChargeMarker({
  x,
  y,
  charge,
  label,
  radius,
  dashed,
  muted,
}: ChargeMarkerProps) {
  const colors = chargeColors(charge);

  return (
    <g opacity={muted ? 0.56 : 1}>
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "7 5" : undefined}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        className="text-[13px] font-semibold"
        fill={colors.text}
      >
        {charge > 0.05 ? "+" : charge < -0.05 ? "-" : "0"}
      </text>
      <text
        x={x}
        y={y - 28}
        textAnchor="middle"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 34}
        textAnchor="middle"
        className="fill-ink-600 text-[10px] font-semibold"
      >
        {formatSignedCharge(charge)}
      </text>
    </g>
  );
}

type CartesianStageFrameProps = {
  layout: CartesianStageLayout;
  xTicks: number[];
  yTicks: number[];
  children: ReactNode;
};

export function CartesianStageFrame({
  layout,
  xTicks,
  yTicks,
  children,
}: CartesianStageFrameProps) {
  const originX = projectCartesianX(layout, 0);
  const originY = projectCartesianY(layout, 0);
  const stageWidth = layout.plotRight - layout.plotLeft;
  const stageHeight = layout.plotBottom - layout.plotTop;

  return (
    <>
      <rect width={layout.width} height={layout.height} fill="rgba(255,255,255,0.58)" />
      <rect
        x={layout.plotLeft}
        y={layout.plotTop}
        width={stageWidth}
        height={stageHeight}
        rx="22"
        fill="rgba(255,253,247,0.88)"
      />
      {xTicks.map((tick) => {
        const x = projectCartesianX(layout, tick);

        return (
          <g key={`grid-x-${tick}`}>
            <line
              x1={x}
              x2={x}
              y1={layout.plotTop}
              y2={layout.plotBottom}
              stroke="rgba(15,28,36,0.08)"
            />
            <text
              x={x}
              y={layout.plotBottom + 16}
              textAnchor="middle"
              className="fill-ink-500 text-[11px]"
            >
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}
      {yTicks.map((tick) => {
        const y = projectCartesianY(layout, tick);

        return (
          <g key={`grid-y-${tick}`}>
            <line
              x1={layout.plotLeft}
              x2={layout.plotRight}
              y1={y}
              y2={y}
              stroke="rgba(15,28,36,0.08)"
            />
            {Math.abs(tick) > 0.001 ? (
              <text
                x={layout.plotLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-ink-500 text-[11px]"
              >
                {formatNumber(tick)}
              </text>
            ) : null}
          </g>
        );
      })}
      <line
        x1={projectCartesianX(layout, layout.minX)}
        x2={projectCartesianX(layout, layout.maxX)}
        y1={originY}
        y2={originY}
        stroke="rgba(15,28,36,0.36)"
        strokeWidth="2.4"
      />
      <line
        x1={originX}
        x2={originX}
        y1={layout.plotTop}
        y2={layout.plotBottom}
        stroke="rgba(15,28,36,0.36)"
        strokeWidth="2.4"
      />
      <text
        x={layout.plotRight - 8}
        y={originY - 8}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        x
      </text>
      <text
        x={originX + 8}
        y={layout.plotTop + 14}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        y
      </text>
      {children}
    </>
  );
}
