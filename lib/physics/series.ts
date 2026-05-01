import type { GraphPoint, GraphSeries } from "./types";
import { clamp, sampleRange } from "./math";

export function buildSeries(
  id: string,
  label: string,
  points: GraphPoint[],
  color?: string,
  dashed?: boolean,
): GraphSeries {
  return { id, label, points, color, dashed };
}

export function sampleTimeSeries(
  id: string,
  label: string,
  start: number,
  end: number,
  samples: number,
  sample: (time: number) => number,
  color?: string,
): GraphSeries {
  const times = sampleRange(start, end, samples);
  return buildSeries(
    id,
    label,
    times.map((time) => ({ x: time, y: sample(time) })),
    color,
  );
}

export function sampleFrequencySeries(
  id: string,
  label: string,
  start: number,
  end: number,
  samples: number,
  sample: (frequency: number) => number,
  color?: string,
): GraphSeries {
  const frequencies = sampleRange(start, end, samples);
  return buildSeries(
    id,
    label,
    frequencies.map((frequency) => ({ x: frequency, y: sample(frequency) })),
    color,
  );
}

export function samplePathSeries(
  id: string,
  label: string,
  sample: (t: number) => GraphPoint,
  duration: number,
  samples = 200,
  color?: string,
): GraphSeries {
  const times = sampleRange(0, duration, samples);
  return buildSeries(id, label, times.map(sample), color);
}

export function normaliseGraphBounds(points: GraphPoint[]) {
  if (points.length === 0) {
    return {
      minX: 0,
      maxX: 1,
      minY: -1,
      maxY: 1,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const rawMinX = Math.min(...xs);
  const rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);

  const minX = rawMinX === rawMaxX ? rawMinX - 1 : rawMinX;
  const maxX = rawMinX === rawMaxX ? rawMaxX + 1 : rawMaxX;
  const minY = rawMinY === rawMaxY ? rawMinY - 1 : rawMinY;
  const maxY = rawMinY === rawMaxY ? rawMaxY + 1 : rawMaxY;

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

export function extendGraphBounds(
  bounds: ReturnType<typeof normaliseGraphBounds>,
  padding = 0.08,
) {
  const xPadding = (bounds.maxX - bounds.minX) * padding;
  const yPadding = (bounds.maxY - bounds.minY) * padding;

  return {
    minX: bounds.minX - xPadding,
    maxX: bounds.maxX + xPadding,
    minY: bounds.minY - yPadding,
    maxY: bounds.maxY + yPadding,
  };
}

export function clampPoint(point: GraphPoint, bounds: ReturnType<typeof normaliseGraphBounds>) {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}
