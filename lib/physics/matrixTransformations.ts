import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphPoint, GraphSeriesMap } from "./types";

type PlanePoint = {
  x: number;
  y: number;
};

export type MatrixTransformationsParams = {
  m11?: number;
  m12?: number;
  m21?: number;
  m22?: number;
  blend?: number;
};

export type MatrixTransformationsSnapshot = {
  m11: number;
  m12: number;
  m21: number;
  m22: number;
  blend: number;
  basis1X: number;
  basis1Y: number;
  basis2X: number;
  basis2Y: number;
  basis1Length: number;
  basis2Length: number;
  determinant: number;
  orientationFlipped: boolean;
  probeX: number;
  probeY: number;
  unitSquareTopRightX: number;
  unitSquareTopRightY: number;
  transformedUnitSquare: PlanePoint[];
  transformedSampleShape: PlanePoint[];
};

export type MatrixTransformationsViewport = {
  maxAbsCoordinate: number;
};

export const MATRIX_TRANSFORMATIONS_ENTRY_MIN = -2;
export const MATRIX_TRANSFORMATIONS_ENTRY_MAX = 2;
export const MATRIX_TRANSFORMATIONS_BLEND_MIN = 0;
export const MATRIX_TRANSFORMATIONS_BLEND_MAX = 1;
export const MATRIX_TRANSFORMATIONS_GRID_EXTENT = 3;
export const MATRIX_TRANSFORMATIONS_PROBE_POINT = {
  x: 1.6,
  y: 1.1,
} as const;
export const MATRIX_TRANSFORMATIONS_UNIT_SQUARE = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
] as const;
export const MATRIX_TRANSFORMATIONS_SAMPLE_SHAPE = [
  { x: 0.8, y: 0.5 },
  { x: 2.2, y: 0.8 },
  { x: 1.4, y: 2.1 },
] as const;

const RESPONSE_SAMPLES = 121;
const VIEWPORT_BUCKETS = [4, 6, 8, 10, 12];

function magnitude(x: number, y: number) {
  return Math.hypot(x, y);
}

function pickBucket(value: number) {
  const safeValue = Math.max(0, value);
  return (
    VIEWPORT_BUCKETS.find((bucket) => safeValue <= bucket) ??
    VIEWPORT_BUCKETS[VIEWPORT_BUCKETS.length - 1] ??
    safeValue
  );
}

function applyMatrix(
  entries: Pick<Required<MatrixTransformationsParams>, "m11" | "m12" | "m21" | "m22">,
  point: PlanePoint,
) {
  return {
    x: entries.m11 * point.x + entries.m12 * point.y,
    y: entries.m21 * point.x + entries.m22 * point.y,
  } satisfies PlanePoint;
}

function interpolateEntry(identityValue: number, targetValue: number, blend: number) {
  return identityValue + (targetValue - identityValue) * blend;
}

export function resolveMatrixTransformationsParams(
  source: Partial<MatrixTransformationsParams> | Record<string, number | boolean | string>,
): Required<MatrixTransformationsParams> {
  return {
    m11: clamp(safeNumber(source.m11, 1.2), MATRIX_TRANSFORMATIONS_ENTRY_MIN, MATRIX_TRANSFORMATIONS_ENTRY_MAX),
    m12: clamp(safeNumber(source.m12, 0.4), MATRIX_TRANSFORMATIONS_ENTRY_MIN, MATRIX_TRANSFORMATIONS_ENTRY_MAX),
    m21: clamp(safeNumber(source.m21, 0), MATRIX_TRANSFORMATIONS_ENTRY_MIN, MATRIX_TRANSFORMATIONS_ENTRY_MAX),
    m22: clamp(safeNumber(source.m22, 1), MATRIX_TRANSFORMATIONS_ENTRY_MIN, MATRIX_TRANSFORMATIONS_ENTRY_MAX),
    blend: clamp(
      safeNumber(source.blend, 1),
      MATRIX_TRANSFORMATIONS_BLEND_MIN,
      MATRIX_TRANSFORMATIONS_BLEND_MAX,
    ),
  };
}

export function sampleMatrixTransformationsState(
  source: Partial<MatrixTransformationsParams> | Record<string, number | boolean | string>,
): MatrixTransformationsSnapshot {
  const resolved = resolveMatrixTransformationsParams(source);
  const matrix = {
    m11: interpolateEntry(1, resolved.m11, resolved.blend),
    m12: interpolateEntry(0, resolved.m12, resolved.blend),
    m21: interpolateEntry(0, resolved.m21, resolved.blend),
    m22: interpolateEntry(1, resolved.m22, resolved.blend),
  };
  const basis1 = applyMatrix(matrix, { x: 1, y: 0 });
  const basis2 = applyMatrix(matrix, { x: 0, y: 1 });
  const probe = applyMatrix(matrix, MATRIX_TRANSFORMATIONS_PROBE_POINT);
  const unitSquareTopRight = applyMatrix(matrix, { x: 1, y: 1 });

  return {
    ...matrix,
    blend: resolved.blend,
    basis1X: basis1.x,
    basis1Y: basis1.y,
    basis2X: basis2.x,
    basis2Y: basis2.y,
    basis1Length: magnitude(basis1.x, basis1.y),
    basis2Length: magnitude(basis2.x, basis2.y),
    determinant: matrix.m11 * matrix.m22 - matrix.m12 * matrix.m21,
    orientationFlipped: matrix.m11 * matrix.m22 - matrix.m12 * matrix.m21 < 0,
    probeX: probe.x,
    probeY: probe.y,
    unitSquareTopRightX: unitSquareTopRight.x,
    unitSquareTopRightY: unitSquareTopRight.y,
    transformedUnitSquare: MATRIX_TRANSFORMATIONS_UNIT_SQUARE.map((point) => applyMatrix(matrix, point)),
    transformedSampleShape: MATRIX_TRANSFORMATIONS_SAMPLE_SHAPE.map((point) => applyMatrix(matrix, point)),
  };
}

export function resolveMatrixTransformationsViewport(
  paramsList: Array<Partial<MatrixTransformationsParams> | Record<string, number | boolean | string>>,
) {
  const maxAbsCoordinate = Math.max(
    ...paramsList.flatMap((params) => {
      const resolved = resolveMatrixTransformationsParams(params);
      const snapshots = [
        sampleMatrixTransformationsState({ ...resolved, blend: 0 }),
        sampleMatrixTransformationsState({ ...resolved, blend: resolved.blend }),
        sampleMatrixTransformationsState({ ...resolved, blend: 1 }),
      ];

      return snapshots.flatMap((snapshot) => {
        const transformedCorners = [
          applyMatrix(snapshot, {
            x: -MATRIX_TRANSFORMATIONS_GRID_EXTENT,
            y: -MATRIX_TRANSFORMATIONS_GRID_EXTENT,
          }),
          applyMatrix(snapshot, {
            x: MATRIX_TRANSFORMATIONS_GRID_EXTENT,
            y: -MATRIX_TRANSFORMATIONS_GRID_EXTENT,
          }),
          applyMatrix(snapshot, {
            x: MATRIX_TRANSFORMATIONS_GRID_EXTENT,
            y: MATRIX_TRANSFORMATIONS_GRID_EXTENT,
          }),
          applyMatrix(snapshot, {
            x: -MATRIX_TRANSFORMATIONS_GRID_EXTENT,
            y: MATRIX_TRANSFORMATIONS_GRID_EXTENT,
          }),
        ];

        return [
          MATRIX_TRANSFORMATIONS_GRID_EXTENT,
          ...transformedCorners.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
          Math.abs(snapshot.basis1X),
          Math.abs(snapshot.basis1Y),
          Math.abs(snapshot.basis2X),
          Math.abs(snapshot.basis2Y),
          Math.abs(snapshot.probeX),
          Math.abs(snapshot.probeY),
          Math.abs(snapshot.unitSquareTopRightX),
          Math.abs(snapshot.unitSquareTopRightY),
          ...snapshot.transformedSampleShape.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
        ];
      });
    }),
    MATRIX_TRANSFORMATIONS_GRID_EXTENT + 1,
  );

  return {
    maxAbsCoordinate: pickBucket(maxAbsCoordinate * 1.12),
  } satisfies MatrixTransformationsViewport;
}

export function buildMatrixTransformationsSeries(
  source: Partial<MatrixTransformationsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveMatrixTransformationsParams(source);
  const blends = sampleRange(
    MATRIX_TRANSFORMATIONS_BLEND_MIN,
    MATRIX_TRANSFORMATIONS_BLEND_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "probe-image-blend": [
      buildSeries(
        "probe-x",
        "probe x",
        blends.map((blend) => ({
          x: blend,
          y: sampleMatrixTransformationsState({ ...resolved, blend }).probeX,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "probe-y",
        "probe y",
        blends.map((blend) => ({
          x: blend,
          y: sampleMatrixTransformationsState({ ...resolved, blend }).probeY,
        })),
        "#f16659",
      ),
    ],
    "basis-length-blend": [
      buildSeries(
        "basis-1-length",
        "|M_t e1|",
        blends.map((blend) => ({
          x: blend,
          y: sampleMatrixTransformationsState({ ...resolved, blend }).basis1Length,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "basis-2-length",
        "|M_t e2|",
        blends.map((blend) => ({
          x: blend,
          y: sampleMatrixTransformationsState({ ...resolved, blend }).basis2Length,
        })),
        "#f0ab3c",
      ),
    ],
  };
}

export function describeMatrixTransformationsState(
  source: Partial<MatrixTransformationsParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleMatrixTransformationsState(source);
  const shearStrength = Math.max(Math.abs(snapshot.m12), Math.abs(snapshot.m21));
  const reflectionSummary = snapshot.orientationFlipped
    ? "The transformed square has flipped orientation, so the action includes a reflection."
    : "The transformed square keeps its orientation, so the action stays on the non-reflecting side.";
  const shearSummary =
    shearStrength >= 0.18
      ? "Off-axis entries are leaning the basis vectors, so the grid is shearing as well."
      : "The basis vectors stay close to their axes, so the action is mostly stretch or compression.";

  return `M e1 = <${formatNumber(snapshot.basis1X)}, ${formatNumber(snapshot.basis1Y)}>, M e2 = <${formatNumber(snapshot.basis2X)}, ${formatNumber(snapshot.basis2Y)}>, and the tracked probe lands at <${formatNumber(snapshot.probeX)}, ${formatNumber(snapshot.probeY)}>. ${reflectionSummary} ${shearSummary}`;
}

export function buildMatrixGridLine(
  source: Pick<Required<MatrixTransformationsParams>, "m11" | "m12" | "m21" | "m22">,
  start: PlanePoint,
  end: PlanePoint,
) {
  return [
    applyMatrix(source, start),
    applyMatrix(source, end),
  ] satisfies [GraphPoint, GraphPoint];
}
