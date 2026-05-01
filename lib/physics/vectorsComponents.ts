import { clamp, degToRad, formatMeasurement, safeNumber } from "./math";
import { samplePathSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type VectorsComponentsParams = {
  magnitude?: number;
  angle?: number;
};

export type VectorsComponentsSnapshot = {
  magnitude: number;
  angle: number;
  angleRad: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
  distance: number;
};

export type VectorsComponentsViewport = {
  duration: number;
  maxAbsPosition: number;
  maxAbsComponent: number;
};

export const VECTORS_COMPONENTS_DURATION = 4;

const POSITION_BUCKETS = [8, 12, 16, 24, 32, 48, 64];
const COMPONENT_BUCKETS = [2, 4, 6, 8, 10, 12, 16];

function pickBucket(value: number, buckets: number[]) {
  const safeValue = Math.max(0, value);
  return buckets.find((bucket) => safeValue <= bucket) ?? buckets[buckets.length - 1] ?? safeValue;
}

export function resolveVectorsComponentsParams(params: VectorsComponentsParams) {
  return {
    magnitude: Math.max(0.05, safeNumber(params.magnitude, 8)),
    angle: safeNumber(params.angle, 35),
  };
}

export function clampVectorsComponentsTime(time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return 0;
  }

  return Math.min(time, VECTORS_COMPONENTS_DURATION);
}

export function sampleVectorsComponentsState(
  params: VectorsComponentsParams,
  time: number,
): VectorsComponentsSnapshot {
  const resolved = resolveVectorsComponentsParams(params);
  const angleRad = degToRad(resolved.angle);
  const displayTime = clampVectorsComponentsTime(time);
  const vx = resolved.magnitude * Math.cos(angleRad);
  const vy = resolved.magnitude * Math.sin(angleRad);
  const x = vx * displayTime;
  const y = vy * displayTime;

  return {
    magnitude: resolved.magnitude,
    angle: resolved.angle,
    angleRad,
    vx,
    vy,
    x,
    y,
    distance: Math.sqrt(x * x + y * y),
  };
}

export function resolveVectorsComponentsViewport(paramsList: VectorsComponentsParams[]) {
  const normalized = paramsList.map(resolveVectorsComponentsParams);
  const maxAbsPosition = Math.max(
    ...normalized.map((params) => params.magnitude * VECTORS_COMPONENTS_DURATION),
    8,
  );
  const maxAbsComponent = Math.max(
    ...normalized.flatMap((params) => {
      const snapshot = sampleVectorsComponentsState(params, 1);
      return [Math.abs(snapshot.vx), Math.abs(snapshot.vy)];
    }),
    2,
  );

  return {
    duration: VECTORS_COMPONENTS_DURATION,
    maxAbsPosition: pickBucket(maxAbsPosition * 1.08, POSITION_BUCKETS),
    maxAbsComponent: pickBucket(maxAbsComponent * 1.08, COMPONENT_BUCKETS),
  } satisfies VectorsComponentsViewport;
}

export function buildVectorsComponentsSeries(params: VectorsComponentsParams): GraphSeriesMap {
  const resolved = resolveVectorsComponentsParams(params);
  const sampleCount = 220;
  const componentState = sampleVectorsComponentsState(resolved, 1);

  return {
    path: [
      samplePathSeries(
        "path",
        "Path",
        (time) => {
          const snapshot = sampleVectorsComponentsState(resolved, time);
          return { x: snapshot.x, y: snapshot.y };
        },
        VECTORS_COMPONENTS_DURATION,
        sampleCount,
        "#1ea6a2",
      ),
    ],
    position: [
      sampleTimeSeries(
        "x-position",
        "x(t)",
        0,
        VECTORS_COMPONENTS_DURATION,
        sampleCount,
        (time) => sampleVectorsComponentsState(resolved, time).x,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "y-position",
        "y(t)",
        0,
        VECTORS_COMPONENTS_DURATION,
        sampleCount,
        (time) => sampleVectorsComponentsState(resolved, time).y,
        "#f16659",
      ),
    ],
    components: [
      sampleTimeSeries(
        "vx",
        "v_x",
        0,
        VECTORS_COMPONENTS_DURATION,
        sampleCount,
        () => componentState.vx,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "vy",
        "v_y",
        0,
        VECTORS_COMPONENTS_DURATION,
        sampleCount,
        () => componentState.vy,
        "#4ea6df",
      ),
    ],
  };
}

export function describeVectorsComponentsState(params: VectorsComponentsParams, time: number) {
  const snapshot = sampleVectorsComponentsState(params, time);
  const horizontalDirection =
    Math.abs(snapshot.vx) < 0.05 ? "no horizontal component" : snapshot.vx > 0 ? "to the right" : "to the left";
  const verticalDirection =
    Math.abs(snapshot.vy) < 0.05 ? "no vertical component" : snapshot.vy > 0 ? "upward" : "downward";

  return `At t = ${formatMeasurement(clampVectorsComponentsTime(time), "s")}, the point is at x = ${formatMeasurement(snapshot.x, "m")} and y = ${formatMeasurement(snapshot.y, "m")}. The vector magnitude is ${formatMeasurement(snapshot.magnitude, "m/s")} at ${formatMeasurement(snapshot.angle, "deg")}, so v_x = ${formatMeasurement(snapshot.vx, "m/s")} points ${horizontalDirection} and v_y = ${formatMeasurement(snapshot.vy, "m/s")} points ${verticalDirection}.`;
}

export function angleFromComponents(dx: number, dy: number) {
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function magnitudeFromComponents(dx: number, dy: number) {
  return Math.sqrt(dx * dx + dy * dy);
}

export function clampVectorsComponentsAngle(angle: number, min: number, max: number) {
  return clamp(angle, min, max);
}
