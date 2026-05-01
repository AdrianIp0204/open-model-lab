import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphPoint, GraphSeriesMap } from "./types";

export type GraphTransformationsParams = {
  horizontalShift?: number;
  verticalShift?: number;
  verticalScale?: number;
  mirrorY?: boolean;
};

export type GraphTransformationsSnapshot = {
  horizontalShift: number;
  verticalShift: number;
  verticalScale: number;
  mirrorY: boolean;
  baseVertexX: number;
  baseVertexY: number;
  vertexX: number;
  vertexY: number;
  yIntercept: number;
  transformedLandmarks: GraphPoint[];
};

export const GRAPH_TRANSFORMATIONS_DOMAIN_MIN = -4;
export const GRAPH_TRANSFORMATIONS_DOMAIN_MAX = 4;
export const GRAPH_TRANSFORMATIONS_MIN_SHIFT = -3.5;
export const GRAPH_TRANSFORMATIONS_MAX_SHIFT = 3.5;
export const GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SHIFT = -4;
export const GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SHIFT = 4;
export const GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SCALE = -2;
export const GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SCALE = 2;
export const GRAPH_TRANSFORMATIONS_MIN_X = GRAPH_TRANSFORMATIONS_DOMAIN_MIN;
export const GRAPH_TRANSFORMATIONS_MAX_X = GRAPH_TRANSFORMATIONS_DOMAIN_MAX;

const SERIES_SAMPLES = 201;
const BASE_VERTEX_X = 1;
const BASE_VERTEX_Y = -2;
const LANDMARK_XS = [0, 1, 2];

function parentFunction(x: number) {
  return (x - BASE_VERTEX_X) ** 2 + BASE_VERTEX_Y;
}

export function resolveGraphTransformationsParams(
  source: Partial<GraphTransformationsParams> | Record<string, number | boolean | string>,
) {
  return {
    horizontalShift: clamp(
      safeNumber(source.horizontalShift, 0),
      GRAPH_TRANSFORMATIONS_MIN_SHIFT,
      GRAPH_TRANSFORMATIONS_MAX_SHIFT,
    ),
    verticalShift: clamp(
      safeNumber(source.verticalShift, 0),
      GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SHIFT,
      GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SHIFT,
    ),
    verticalScale: clamp(
      safeNumber(source.verticalScale, 1),
      GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SCALE,
      GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SCALE,
    ),
    mirrorY: source.mirrorY === true,
  } satisfies Required<GraphTransformationsParams>;
}

export function evaluateGraphTransformation(
  source: Partial<GraphTransformationsParams> | Record<string, number | boolean | string>,
  x: number,
) {
  const params = resolveGraphTransformationsParams(source);
  const reflectedInput = params.mirrorY
    ? -(x - params.horizontalShift)
    : x - params.horizontalShift;

  return params.verticalScale * parentFunction(reflectedInput) + params.verticalShift;
}

export function sampleGraphTransformationsState(
  source: Partial<GraphTransformationsParams> | Record<string, number | boolean | string>,
): GraphTransformationsSnapshot {
  const params = resolveGraphTransformationsParams(source);
  const reflectedBaseVertexX = params.mirrorY ? -BASE_VERTEX_X : BASE_VERTEX_X;
  const vertexX = params.horizontalShift + reflectedBaseVertexX;
  const vertexY = params.verticalScale * BASE_VERTEX_Y + params.verticalShift;
  const yInterceptInput = params.mirrorY ? params.horizontalShift : -params.horizontalShift;

  return {
    horizontalShift: params.horizontalShift,
    verticalShift: params.verticalShift,
    verticalScale: params.verticalScale,
    mirrorY: params.mirrorY,
    baseVertexX: BASE_VERTEX_X,
    baseVertexY: BASE_VERTEX_Y,
    vertexX,
    vertexY,
    yIntercept: params.verticalScale * parentFunction(yInterceptInput) + params.verticalShift,
    transformedLandmarks: LANDMARK_XS.map((x) => ({
      x: params.horizontalShift + (params.mirrorY ? -x : x),
      y: params.verticalScale * parentFunction(x) + params.verticalShift,
    })),
  };
}

export function buildGraphTransformationsSeries(
  source: Partial<GraphTransformationsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const params = resolveGraphTransformationsParams(source);
  const xs = sampleRange(
    GRAPH_TRANSFORMATIONS_DOMAIN_MIN,
    GRAPH_TRANSFORMATIONS_DOMAIN_MAX,
    SERIES_SAMPLES,
  );
  const verticalScaleSamples = sampleRange(
    GRAPH_TRANSFORMATIONS_MIN_VERTICAL_SCALE,
    GRAPH_TRANSFORMATIONS_MAX_VERTICAL_SCALE,
    SERIES_SAMPLES,
  );

  return {
    "function-graph": [
      buildSeries(
        "base-curve",
        "Base curve",
        xs.map((x) => ({ x, y: parentFunction(x) })),
        "#94a3b8",
        true,
      ),
      buildSeries(
        "transformed-curve",
        "Transformed curve",
        xs.map((x) => ({ x, y: evaluateGraphTransformation(params, x) })),
        "#1ea6a2",
      ),
    ],
    "vertex-height-map": [
      buildSeries(
        "vertex-height",
        "Vertex height",
        verticalScaleSamples.map((verticalScale) => ({
          x: verticalScale,
          y: verticalScale * BASE_VERTEX_Y + params.verticalShift,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describeGraphTransformationsState(
  source: Partial<GraphTransformationsParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleGraphTransformationsState(source);
  const horizontalSummary =
    Math.abs(snapshot.horizontalShift) < 0.05
      ? "stays centered horizontally"
      : snapshot.horizontalShift > 0
        ? `shifts right ${formatNumber(snapshot.horizontalShift)}`
        : `shifts left ${formatNumber(Math.abs(snapshot.horizontalShift))}`;
  const verticalSummary =
    Math.abs(snapshot.verticalShift) < 0.05
      ? "stays centered vertically"
      : snapshot.verticalShift > 0
        ? `shifts up ${formatNumber(snapshot.verticalShift)}`
        : `shifts down ${formatNumber(Math.abs(snapshot.verticalShift))}`;
  const verticalScaleSummary =
    snapshot.verticalScale < 0
      ? `reflects across the x-axis with scale ${formatNumber(Math.abs(snapshot.verticalScale))}`
      : Math.abs(snapshot.verticalScale) < 1
        ? `is vertically compressed by ${formatNumber(snapshot.verticalScale)}`
        : Math.abs(snapshot.verticalScale) > 1
          ? `is vertically stretched by ${formatNumber(snapshot.verticalScale)}`
          : "keeps the original vertical scale";
  const mirrorSummary = snapshot.mirrorY
    ? "The inside input is reflected across the y-axis before the horizontal shift."
    : "The inside input keeps its left-right orientation.";

  return `The transformed curve ${horizontalSummary}, ${verticalSummary}, and ${verticalScaleSummary}. ${mirrorSummary} The transformed vertex sits near (${formatNumber(snapshot.vertexX)}, ${formatNumber(snapshot.vertexY)}).`;
}
