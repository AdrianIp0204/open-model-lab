"use client";

import type { ReactNode } from "react";
import type { GraphPoint } from "@/lib/physics";
import { formatNumber } from "@/lib/physics";

export type CartesianPlaneConfig = {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  xTickStep: number;
  yTickStep: number;
};

function buildTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];
  const safeStep = step > 0 ? step : 1;
  const start = Math.ceil(min / safeStep) * safeStep;

  for (let value = start; value <= max + safeStep * 0.25; value += safeStep) {
    ticks.push(Number(value.toFixed(6)));
  }

  return ticks;
}

export function projectCartesianX(config: CartesianPlaneConfig, x: number) {
  const span = config.maxX - config.minX || 1;
  const usableWidth = config.width - config.paddingLeft - config.paddingRight;

  return config.paddingLeft + ((x - config.minX) / span) * usableWidth;
}

export function projectCartesianY(config: CartesianPlaneConfig, y: number) {
  const span = config.maxY - config.minY || 1;
  const usableHeight = config.height - config.paddingTop - config.paddingBottom;

  return config.height - config.paddingBottom - ((y - config.minY) / span) * usableHeight;
}

export function buildCartesianPath(
  config: CartesianPlaneConfig,
  points: GraphPoint[],
) {
  return points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L";
      return `${prefix} ${projectCartesianX(config, point.x)} ${projectCartesianY(config, point.y)}`;
    })
    .join(" ");
}

type CartesianPlaneProps = {
  config: CartesianPlaneConfig;
  xLabel?: string;
  yLabel?: string;
  children?: ReactNode;
  backgroundFill?: string;
};

export function CartesianPlane({
  config,
  xLabel = "x",
  yLabel = "y",
  children,
  backgroundFill = "rgba(255,255,255,0.56)",
}: CartesianPlaneProps) {
  const xTicks = buildTicks(config.minX, config.maxX, config.xTickStep);
  const yTicks = buildTicks(config.minY, config.maxY, config.yTickStep);
  const axisY =
    config.minY <= 0 && config.maxY >= 0 ? projectCartesianY(config, 0) : null;
  const axisX =
    config.minX <= 0 && config.maxX >= 0 ? projectCartesianX(config, 0) : null;

  return (
    <>
      <rect width={config.width} height={config.height} fill={backgroundFill} />
      {xTicks.map((tick) => {
        const x = projectCartesianX(config, tick);
        return (
          <g key={`x-tick-${tick}`}>
            <line
              x1={x}
              x2={x}
              y1={config.paddingTop}
              y2={config.height - config.paddingBottom}
              stroke="rgba(15,28,36,0.08)"
            />
            <text
              x={x}
              y={config.height - config.paddingBottom + 16}
              textAnchor="middle"
              className="fill-ink-500 text-[11px]"
            >
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}
      {yTicks.map((tick) => {
        const y = projectCartesianY(config, tick);
        return (
          <g key={`y-tick-${tick}`}>
            <line
              x1={config.paddingLeft}
              x2={config.width - config.paddingRight}
              y1={y}
              y2={y}
              stroke="rgba(15,28,36,0.08)"
            />
            <text
              x={config.paddingLeft - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-ink-500 text-[11px]"
            >
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}
      {axisY !== null ? (
        <line
          x1={config.paddingLeft}
          x2={config.width - config.paddingRight}
          y1={axisY}
          y2={axisY}
          stroke="rgba(15,28,36,0.36)"
          strokeWidth="2"
        />
      ) : null}
      {axisX !== null ? (
        <line
          x1={axisX}
          x2={axisX}
          y1={config.paddingTop}
          y2={config.height - config.paddingBottom}
          stroke="rgba(15,28,36,0.36)"
          strokeWidth="2"
        />
      ) : null}
      <text
        x={config.width - config.paddingRight - 8}
        y={(axisY ?? config.height - config.paddingBottom) - 10}
        textAnchor="end"
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {xLabel}
      </text>
      <text
        x={(axisX ?? config.paddingLeft) + 10}
        y={config.paddingTop + 14}
        className="fill-ink-500 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        {yLabel}
      </text>
      {children}
    </>
  );
}
