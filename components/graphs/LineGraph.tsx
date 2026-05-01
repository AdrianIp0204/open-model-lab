"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState, type PointerEvent } from "react";
import {
  extendGraphBounds,
  formatDisplayText,
  formatNumber,
  mapRange,
  normaliseGraphBounds,
} from "@/lib/physics";
import type { GraphPreviewSample, GraphSeries, GraphSeriesSetupId } from "@/lib/physics";
import { RichMathText } from "@/components/concepts/MathFormula";

type LineGraphPreviewSeries = {
  seriesId: string;
  label: string;
  color: string;
  dashed?: boolean;
  pointIndex: number;
  pointCount: number;
  point: {
    x: number;
    y: number;
  };
};

type LineGraphPreviewState = {
  graphTitle: string;
  xLabel: string;
  yLabel: string;
  interaction: "hover" | "scrub";
  activeSeriesId: string;
  activeSeriesLabel: string;
  activeSeriesColor: string;
  activeSeriesDashed?: boolean;
  activeSeriesIndex: number;
  pointIndex: number;
  pointCount: number;
  xValue: number;
  yValue: number;
  sample: GraphPreviewSample;
  series: LineGraphPreviewSeries[];
};

export type LineGraphLinkedMarkerSample = {
  seriesId: string;
  label: string;
  color?: string;
  dashed?: boolean;
  setup?: GraphSeriesSetupId;
  pointIndex: number;
  pointCount: number;
  point: {
    x: number;
    y: number;
  };
};

export type LineGraphLinkedMarker = {
  mode: "inspect";
  label: string;
  xValue?: number | null;
  activeSeriesId?: string | null;
  samples: LineGraphLinkedMarkerSample[];
};

type LineGraphProps = {
  title: string;
  xLabel: string;
  yLabel: string;
  series: GraphSeries[];
  summary: string;
  description?: string;
  className?: string;
  previewEnabled?: boolean;
  linkedMarker?: LineGraphLinkedMarker | null;
  boundsOverride?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  tickCountX?: number;
  tickCountY?: number;
  onPreviewChange?: (sample: GraphPreviewSample | null) => void;
};

const WIDTH = 720;
const HEIGHT = 360;
const MARGIN = { top: 26, right: 22, bottom: 44, left: 56 };
const PLOT_BOUNDS = {
  left: MARGIN.left,
  right: WIDTH - MARGIN.right,
  top: MARGIN.top,
  bottom: HEIGHT - MARGIN.bottom,
};

const palette = ["#1ea6a2", "#f0ab3c", "#f16659", "#4ea6df", "#315063"];

function resolveSeriesDisplayLabel(label: string, title: string, seriesCount: number) {
  return formatDisplayText(seriesCount === 1 ? title : label);
}

function LegendGlyph({
  color,
  dashed,
}: {
  color: string;
  dashed?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 12"
      className="h-3 w-7 shrink-0"
      focusable="false"
    >
      <line
        x1="1"
        x2="27"
        y1="6"
        y2="6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <circle cx="14" cy="6" r="2.2" fill={color} opacity={dashed ? 0.65 : 0.9} />
    </svg>
  );
}

function buildPath(points: GraphSeries["points"], bounds: ReturnType<typeof normaliseGraphBounds>) {
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;

  return points
    .map((point, index) => {
      const x = mapRange(point.x, bounds.minX, bounds.maxX, MARGIN.left, MARGIN.left + innerWidth);
      const y = mapRange(point.y, bounds.minY, bounds.maxY, HEIGHT - MARGIN.bottom, MARGIN.top);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function makeTicks(min: number, max: number, count: number) {
  if (count <= 1) {
    return [min];
  }

  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

function clampToPlot(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toSvgCoordinates(clientX: number, clientY: number, bounds: DOMRect) {
  return {
    x: ((clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH,
    y: ((clientY - bounds.top) / Math.max(bounds.height, 1)) * HEIGHT,
  };
}

function findClosestSeriesPoint(
  pointerX: number,
  pointerY: number,
  series: GraphSeries[],
  bounds: ReturnType<typeof normaliseGraphBounds>,
) {
  let bestSeriesIndex = -1;
  let bestPointIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  series.forEach((item, seriesIndex) => {
    item.points.forEach((point, pointIndex) => {
      const svgX = mapRange(point.x, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right);
      const svgY = mapRange(point.y, bounds.minY, bounds.maxY, PLOT_BOUNDS.bottom, PLOT_BOUNDS.top);
      const distance = Math.hypot(pointerX - svgX, pointerY - svgY);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestSeriesIndex = seriesIndex;
        bestPointIndex = pointIndex;
      }
    });
  });

  return bestSeriesIndex >= 0 && bestPointIndex >= 0
    ? {
        seriesIndex: bestSeriesIndex,
        pointIndex: bestPointIndex,
      }
    : null;
}

function interpolateSeriesAtX(
  points: GraphSeries["points"],
  x: number,
) {
  if (!points.length) {
    return null;
  }

  if (points.length === 1) {
    return {
      pointIndex: 0,
      pointCount: 1,
      x: points[0].x,
      y: points[0].y,
    };
  }

  if (x <= points[0].x) {
    return {
      pointIndex: 0,
      pointCount: points.length,
      x: points[0].x,
      y: points[0].y,
    };
  }

  const lastIndex = points.length - 1;
  if (x >= points[lastIndex].x) {
    return {
      pointIndex: lastIndex,
      pointCount: points.length,
      x: points[lastIndex].x,
      y: points[lastIndex].y,
    };
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];

    if (x >= start.x && x <= end.x) {
      const span = Math.max(end.x - start.x, Number.EPSILON);
      const t = (x - start.x) / span;
      return {
        pointIndex: t < 0.5 ? index : index + 1,
        pointCount: points.length,
        x,
        y: start.y + (end.y - start.y) * t,
      };
    }
  }

  return {
    pointIndex: lastIndex,
    pointCount: points.length,
    x: points[lastIndex].x,
    y: points[lastIndex].y,
  };
}

function buildPreviewState({
  clientX,
  clientY,
  svg,
  series,
  bounds,
  title,
  xLabel,
  yLabel,
  interaction,
}: {
  clientX: number;
  clientY: number;
  svg: SVGSVGElement;
  series: GraphSeries[];
  bounds: ReturnType<typeof normaliseGraphBounds>;
  title: string;
  xLabel: string;
  yLabel: string;
  interaction: "hover" | "scrub";
}) {
  const svgBounds = svg.getBoundingClientRect();
  const rawPoint = toSvgCoordinates(clientX, clientY, svgBounds);
  const clampedX = clampToPlot(rawPoint.x, PLOT_BOUNDS.left, PLOT_BOUNDS.right);
  const clampedY = clampToPlot(rawPoint.y, PLOT_BOUNDS.top, PLOT_BOUNDS.bottom);
  const xValue = mapRange(clampedX, PLOT_BOUNDS.left, PLOT_BOUNDS.right, bounds.minX, bounds.maxX);

  const activePoint = findClosestSeriesPoint(clampedX, clampedY, series, bounds);
  if (!activePoint) {
    return null;
  }

  const activeSeries = series[activePoint.seriesIndex];
  const activePointData = activeSeries.points[activePoint.pointIndex];
  const activeColor = activeSeries.color ?? palette[activePoint.seriesIndex % palette.length];
  const sample: GraphPreviewSample = {
    seriesId: activeSeries.id,
    seriesLabel: series.length === 1 ? title : activeSeries.label,
    point: activePointData,
    pointIndex: activePoint.pointIndex,
    pointCount: activeSeries.points.length,
    color: activeSeries.color,
    dashed: activeSeries.dashed,
    setup: activeSeries.meta?.setup,
  };

  const markers = series
    .map((item, index) => {
      const interpolated = interpolateSeriesAtX(item.points, xValue);
      if (!interpolated) {
        return null;
      }

      const color = item.color ?? palette[index % palette.length];
      const svgX = mapRange(interpolated.x, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right);
      const svgY = mapRange(interpolated.y, bounds.minY, bounds.maxY, PLOT_BOUNDS.bottom, PLOT_BOUNDS.top);

      return {
        seriesId: item.id,
        label: series.length === 1 ? title : item.label,
        color,
        dashed: item.dashed,
        pointIndex: interpolated.pointIndex,
        pointCount: interpolated.pointCount,
        point: {
          x: svgX,
          y: svgY,
        },
      } satisfies LineGraphPreviewSeries;
    })
    .filter(Boolean) as LineGraphPreviewSeries[];

  return {
    graphTitle: title,
    xLabel,
    yLabel,
    interaction,
    activeSeriesId: activeSeries.id,
    activeSeriesLabel: activeSeries.label,
    activeSeriesColor: activeColor,
    activeSeriesDashed: activeSeries.dashed,
    activeSeriesIndex: activePoint.seriesIndex,
    pointIndex: activePoint.pointIndex,
    pointCount: activeSeries.points.length,
    xValue: activePointData.x,
    yValue: activePointData.y,
    sample,
    series: markers,
  } satisfies LineGraphPreviewState;
}

export function LineGraph({
  title,
  xLabel,
  yLabel,
  series,
  summary,
  description,
  className,
  previewEnabled = true,
  linkedMarker,
  boundsOverride,
  tickCountX = 5,
  tickCountY = 5,
  onPreviewChange,
}: LineGraphProps) {
  const t = useTranslations("LineGraph");
  const baseId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [preview, setPreview] = useState<LineGraphPreviewState | null>(null);
  const points = series.flatMap((item) => item.points);
  const bounds = boundsOverride ?? extendGraphBounds(normaliseGraphBounds(points));
  const xTicks = makeTicks(bounds.minX, bounds.maxX, tickCountX);
  const yTicks = makeTicks(bounds.minY, bounds.maxY, tickCountY);
  const zeroX =
    bounds.minX <= 0 && bounds.maxX >= 0
      ? mapRange(0, bounds.minX, bounds.maxX, MARGIN.left, WIDTH - MARGIN.right)
      : null;
  const zeroY =
    bounds.minY <= 0 && bounds.maxY >= 0
      ? mapRange(0, bounds.minY, bounds.maxY, HEIGHT - MARGIN.bottom, MARGIN.top)
      : null;
  const activePreview = preview ?? null;
  const activeLinkedSample =
    linkedMarker?.samples.find((item) => item.seriesId === linkedMarker.activeSeriesId) ??
    linkedMarker?.samples[0] ??
    null;
  const displayXLabel = formatDisplayText(xLabel);
  const displayYLabel = formatDisplayText(yLabel);
  const interactionHint = previewEnabled
    ? t("hints.hoverOrScrub")
    : t("hints.pausedMarkers");
  const linkedMarkerSeries = linkedMarker
    ? linkedMarker.samples.map((item, index) => ({
        ...item,
        color: item.color ?? palette[index % palette.length],
        svgX: mapRange(item.point.x, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right),
        svgY: mapRange(item.point.y, bounds.minY, bounds.maxY, PLOT_BOUNDS.bottom, PLOT_BOUNDS.top),
      }))
    : [];
  const activeMarkerX =
    activePreview?.xValue ??
    (linkedMarker?.xValue !== undefined && linkedMarker?.xValue !== null ? linkedMarker.xValue : null);

  function commitPreview(nextPreview: LineGraphPreviewState | null) {
    setPreview(nextPreview);
    onPreviewChange?.(nextPreview?.sample ?? null);
  }

  function updatePreviewFromEvent(event: PointerEvent<SVGSVGElement>, interaction: "hover" | "scrub") {
    if (!previewEnabled) {
      return;
    }

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const nextPreview = buildPreviewState({
      clientX: event.clientX,
      clientY: event.clientY,
      svg,
      series,
      bounds,
      title,
      xLabel,
      yLabel,
      interaction,
    });
    commitPreview(nextPreview);
  }

  function clearPreview() {
    pointerIdRef.current = null;
    commitPreview(null);
  }

  return (
    <figure className={["lab-panel p-3 md:p-3.5", className ?? ""].join(" ")}>
      <div className="mb-3 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="lab-label">
            <RichMathText as="span" content={title} />
          </p>
          <RichMathText as="p" content={description ?? summary} className="mt-1 text-sm text-ink-700" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.18em] text-ink-600">
              {t("range", {
                label: displayXLabel,
                min: formatNumber(bounds.minX),
                max: formatNumber(bounds.maxX),
              })}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.18em] text-ink-600">
              {t("range", {
                label: displayYLabel,
                min: formatNumber(bounds.minY),
                max: formatNumber(bounds.maxY),
              })}
            </span>
          </div>
          {activePreview ? (
            <p
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-1 text-xs font-medium text-ink-700"
              aria-live="polite"
            >
              <span className="rounded-full px-2 py-0.5 font-semibold tracking-[0.18em] text-paper-strong" style={{ background: activePreview.activeSeriesColor }}>
                {resolveSeriesDisplayLabel(activePreview.activeSeriesLabel, title, series.length)}
              </span>
              <span className="font-mono text-[0.72rem] tracking-[0.18em] text-ink-500">
                {t("preview", {
                  x: formatNumber(activePreview.xValue),
                  y: formatNumber(activePreview.yValue),
                })}
              </span>
            </p>
          ) : linkedMarker && activeLinkedSample ? (
            <p
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-1 text-xs font-medium text-ink-700"
              aria-live="polite"
            >
              <span
                className="rounded-full px-2 py-0.5 font-semibold tracking-[0.18em] text-paper-strong"
                style={{ background: activeLinkedSample.color ?? palette[0] }}
              >
                {resolveSeriesDisplayLabel(activeLinkedSample.label, title, series.length)}
              </span>
              <span className="font-mono text-[0.72rem] tracking-[0.18em] text-ink-500">
                {linkedMarker.label}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 xl:justify-end">
          {series.map((item, index) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.72rem] text-ink-700"
              aria-label={t(item.dashed ? "legend.dashed" : "legend.solid", {
                label: resolveSeriesDisplayLabel(item.label, title, series.length),
              })}
            >
              <LegendGlyph color={item.color ?? palette[index % palette.length]} dashed={item.dashed} />
              {resolveSeriesDisplayLabel(item.label, title, series.length)}
            </span>
          ))}
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-labelledby={`${baseId}-title ${baseId}-desc`}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerMove={(event) => {
          if (!previewEnabled) {
            return;
          }
          const isHover = event.pointerType === "mouse" || pointerIdRef.current === event.pointerId;
          if (!isHover && pointerIdRef.current !== event.pointerId) {
            return;
          }
          updatePreviewFromEvent(event, pointerIdRef.current === event.pointerId ? "scrub" : "hover");
        }}
        onPointerDown={(event) => {
          if (!previewEnabled) {
            return;
          }
          pointerIdRef.current = event.pointerId;
          svgRef.current?.setPointerCapture?.(event.pointerId);
          updatePreviewFromEvent(event, "scrub");
        }}
        onPointerUp={(event) => {
          if (pointerIdRef.current === event.pointerId) {
            svgRef.current?.releasePointerCapture?.(event.pointerId);
            clearPreview();
          }
        }}
        onPointerCancel={(event) => {
          if (pointerIdRef.current === event.pointerId) {
            svgRef.current?.releasePointerCapture?.(event.pointerId);
            clearPreview();
          }
        }}
        onPointerLeave={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            clearPreview();
          }
        }}
        onLostPointerCapture={() => clearPreview()}
      >
        <title id={`${baseId}-title`}>{title}</title>
        <desc id={`${baseId}-desc`}>{summary}</desc>
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="22" fill="rgba(255,255,255,0.55)" />
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={WIDTH - MARGIN.left - MARGIN.right}
          height={HEIGHT - MARGIN.top - MARGIN.bottom}
          rx="16"
          fill="rgba(255,255,255,0.28)"
          stroke="rgba(15,28,36,0.12)"
          strokeWidth="1.5"
        />
        {xTicks.map((tick) => {
          const x = mapRange(tick, bounds.minX, bounds.maxX, MARGIN.left, WIDTH - MARGIN.right);
          return (
            <g key={`x-${tick}`}>
              <line x1={x} x2={x} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke="rgba(15,28,36,0.08)" />
              <line x1={x} x2={x} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom + 8} stroke="rgba(15,28,36,0.28)" strokeWidth="1.5" />
              <text x={x} y={HEIGHT - 16} textAnchor="middle" className="fill-ink-500 text-[13px]">
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}
        {yTicks.map((tick) => {
          const y = mapRange(tick, bounds.minY, bounds.maxY, HEIGHT - MARGIN.bottom, MARGIN.top);
          return (
            <g key={`y-${tick}`}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} stroke="rgba(15,28,36,0.08)" />
              <line x1={MARGIN.left - 8} x2={MARGIN.left} y1={y} y2={y} stroke="rgba(15,28,36,0.28)" strokeWidth="1.5" />
              <text x={18} y={y + 4} className="fill-ink-500 text-[13px]">
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}
        <text x={WIDTH - MARGIN.right} y={HEIGHT - 26} textAnchor="end" className="fill-ink-500 text-[12px] font-semibold tracking-[0.16em]">
          {displayXLabel}
        </text>
        <text x={MARGIN.left + 8} y={MARGIN.top + 16} className="fill-ink-500 text-[12px] font-semibold tracking-[0.16em]">
          {displayYLabel}
        </text>
        {zeroX !== null ? (
          <line
            x1={zeroX}
            x2={zeroX}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            stroke="rgba(15,28,36,0.35)"
            strokeWidth="1.5"
          />
        ) : null}
        {zeroY !== null ? (
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(15,28,36,0.35)"
            strokeWidth="1.5"
          />
        ) : null}
        {series.map((item, index) => {
          const path = buildPath(item.points, bounds);
          const color = item.color ?? palette[index % palette.length];
          return (
            <path
              key={item.id}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={item.dashed ? "10 8" : undefined}
              aria-label={t(item.dashed ? "legend.dashedSeries" : "legend.solidSeries", {
                label: item.label,
              })}
            />
          );
        })}
        {activePreview ? (
          <>
            <line
              x1={mapRange(activePreview.xValue, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right)}
              x2={mapRange(activePreview.xValue, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right)}
              y1={PLOT_BOUNDS.top}
              y2={PLOT_BOUNDS.bottom}
              stroke="rgba(15,28,36,0.28)"
              strokeDasharray="6 6"
              strokeWidth="2"
            />
            {activePreview.series.map((item) => (
              <g key={item.seriesId} pointerEvents="none">
                <circle
                  cx={item.point.x}
                  cy={item.point.y}
                  r={item.seriesId === activePreview.activeSeriesId ? 8 : 5}
                  fill={item.color}
                  opacity={item.seriesId === activePreview.activeSeriesId ? 0.95 : 0.7}
                  stroke={item.dashed ? "rgba(15,28,36,0.55)" : "rgba(255,255,255,0.9)"}
                  strokeWidth="2"
                />
              </g>
            ))}
          </>
        ) : linkedMarker ? (
          <>
            {activeMarkerX !== null ? (
              <line
                x1={mapRange(activeMarkerX, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right)}
                x2={mapRange(activeMarkerX, bounds.minX, bounds.maxX, PLOT_BOUNDS.left, PLOT_BOUNDS.right)}
                y1={PLOT_BOUNDS.top}
                y2={PLOT_BOUNDS.bottom}
                stroke="rgba(15,28,36,0.2)"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
            ) : null}
            {linkedMarkerSeries.map((item) => (
              <g key={item.seriesId} pointerEvents="none">
                <circle
                  cx={item.svgX}
                  cy={item.svgY}
                  r={item.seriesId === linkedMarker.activeSeriesId ? 8 : 5}
                  fill={item.color}
                  opacity={item.seriesId === linkedMarker.activeSeriesId ? 0.95 : 0.72}
                  stroke={item.dashed ? "rgba(15,28,36,0.55)" : "rgba(255,255,255,0.9)"}
                  strokeWidth="2"
                />
              </g>
            ))}
          </>
        ) : null}
      </svg>
      <figcaption className="mt-2 grid gap-1.5 text-xs text-ink-600 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
        <span className="max-w-2xl">{interactionHint}</span>
        <span className="font-mono text-[0.72rem] tracking-[0.22em] text-ink-500">
          {displayXLabel} / {displayYLabel}
        </span>
      </figcaption>
    </figure>
  );
}
