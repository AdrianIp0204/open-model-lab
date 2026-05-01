import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type OptimizationConstraintsParams = {
  width?: number;
};

export type OptimizationConstraintsSnapshot = {
  perimeter: number;
  halfPerimeter: number;
  width: number;
  height: number;
  area: number;
  areaSlope: number;
  optimumWidth: number;
  optimumHeight: number;
  optimumArea: number;
  widthGap: number;
  heightGap: number;
  areaGap: number;
  areaFraction: number;
};

export const OPTIMIZATION_CONSTRAINTS_PERIMETER = 24;
export const OPTIMIZATION_CONSTRAINTS_HALF_PERIMETER =
  OPTIMIZATION_CONSTRAINTS_PERIMETER / 2;
export const OPTIMIZATION_CONSTRAINTS_WIDTH_MIN = 0.6;
export const OPTIMIZATION_CONSTRAINTS_WIDTH_MAX =
  OPTIMIZATION_CONSTRAINTS_HALF_PERIMETER - OPTIMIZATION_CONSTRAINTS_WIDTH_MIN;

const FUNCTION_SAMPLES = 241;

export function resolveOptimizationConstraintsParams(
  source:
    | Partial<OptimizationConstraintsParams>
    | Record<string, number | boolean | string>,
): Required<OptimizationConstraintsParams> {
  return {
    width: clamp(
      safeNumber(source.width, 3.4),
      OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
      OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
    ),
  };
}

export function optimizationConstraintHeight(width: number) {
  return OPTIMIZATION_CONSTRAINTS_HALF_PERIMETER - width;
}

export function optimizationConstraintArea(width: number) {
  return width * optimizationConstraintHeight(width);
}

export function optimizationConstraintAreaSlope(width: number) {
  return OPTIMIZATION_CONSTRAINTS_HALF_PERIMETER - 2 * width;
}

export function sampleOptimizationConstraintsState(
  source:
    | Partial<OptimizationConstraintsParams>
    | Record<string, number | boolean | string>,
): OptimizationConstraintsSnapshot {
  const resolved = resolveOptimizationConstraintsParams(source);
  const optimumWidth = OPTIMIZATION_CONSTRAINTS_HALF_PERIMETER / 2;
  const optimumHeight = optimizationConstraintHeight(optimumWidth);
  const optimumArea = optimizationConstraintArea(optimumWidth);
  const height = optimizationConstraintHeight(resolved.width);
  const area = optimizationConstraintArea(resolved.width);

  return {
    perimeter: OPTIMIZATION_CONSTRAINTS_PERIMETER,
    halfPerimeter: OPTIMIZATION_CONSTRAINTS_HALF_PERIMETER,
    width: resolved.width,
    height,
    area,
    areaSlope: optimizationConstraintAreaSlope(resolved.width),
    optimumWidth,
    optimumHeight,
    optimumArea,
    widthGap: resolved.width - optimumWidth,
    heightGap: height - optimumHeight,
    areaGap: optimumArea - area,
    areaFraction: area / optimumArea,
  };
}

export function buildOptimizationConstraintsSeries(
  _source:
    | Partial<OptimizationConstraintsParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  void _source;

  return {
    "area-vs-width": [
      buildSeries(
        "area-curve",
        "Area A(w)",
        sampleRange(
          OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
          OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
          FUNCTION_SAMPLES,
        ).map((width) => ({
          x: width,
          y: optimizationConstraintArea(width),
        })),
        "#1ea6a2",
      ),
    ],
    "area-slope": [
      buildSeries(
        "area-slope-line",
        "A'(w)",
        sampleRange(
          OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
          OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
          FUNCTION_SAMPLES,
        ).map((width) => ({
          x: width,
          y: optimizationConstraintAreaSlope(width),
        })),
        "#f16659",
      ),
    ],
    "height-vs-width": [
      buildSeries(
        "constraint-line",
        "h(w)",
        sampleRange(
          OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
          OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
          FUNCTION_SAMPLES,
        ).map((width) => ({
          x: width,
          y: optimizationConstraintHeight(width),
        })),
        "#4ea6df",
      ),
    ],
  };
}

export function describeOptimizationConstraintsState(
  source:
    | Partial<OptimizationConstraintsParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleOptimizationConstraintsState(source);
  const localRateSummary =
    Math.abs(snapshot.areaSlope) <= 0.12
      ? "The area curve is almost flat here, so this width is at or extremely close to the maximum."
      : snapshot.areaSlope > 0
        ? "The area curve is still rising here, so making the rectangle a little wider would increase the area."
        : "The area curve is falling here, so this rectangle is already too wide for the fixed perimeter.";
  const shapeSummary =
    Math.abs(snapshot.widthGap) <= 0.12 && Math.abs(snapshot.heightGap) <= 0.12
      ? "Width and height are nearly equal, so the rectangle is acting like the best-area square."
      : snapshot.width < snapshot.optimumWidth
        ? "The rectangle is narrower than the best-area square, so it still has room to gain area by trading a little height for width."
        : "The rectangle is wider than the best-area square, so the lost height is now costing more area than the extra width adds.";

  return `With perimeter ${formatMeasurement(snapshot.perimeter, "m")}, the rectangle is ${formatMeasurement(snapshot.width, "m")} by ${formatMeasurement(snapshot.height, "m")} for area ${formatMeasurement(snapshot.area, "m^2")}. The local area slope is ${formatNumber(snapshot.areaSlope)}. ${localRateSummary} ${shapeSummary}`;
}
