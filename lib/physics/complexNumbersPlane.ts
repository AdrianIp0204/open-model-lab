import type { AppLocale } from "@/i18n/routing";
import { buildSeries } from "./series";
import { clamp, formatNumber, radToDeg, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type ComplexNumbersPlaneParams = {
  realPart?: number;
  imaginaryPart?: number;
  operandReal?: number;
  operandImaginary?: number;
  multiplyMode?: boolean;
};

export type ComplexNumbersPlaneSnapshot = {
  realPart: number;
  imaginaryPart: number;
  operandReal: number;
  operandImaginary: number;
  multiplyMode: boolean;
  magnitude: number;
  argumentDeg: number;
  operandMagnitude: number;
  operandArgumentDeg: number;
  sumReal: number;
  sumImaginary: number;
  sumMagnitude: number;
  sumArgumentDeg: number;
  productReal: number;
  productImaginary: number;
  productMagnitude: number;
  productArgumentDeg: number;
  scaleFactor: number;
  rotationDeg: number;
};

export type ComplexNumbersPlaneViewport = {
  maxAbsCoordinate: number;
};

export const COMPLEX_NUMBERS_PLANE_COMPONENT_MIN = -4.5;
export const COMPLEX_NUMBERS_PLANE_COMPONENT_MAX = 4.5;

const RESPONSE_SAMPLES = 181;
const VIEWPORT_BUCKETS = [2, 4, 6, 8, 10, 12];

function magnitude(real: number, imaginary: number) {
  return Math.hypot(real, imaginary);
}

function normalizeAngleDeg(angle: number) {
  if (!Number.isFinite(angle)) {
    return 0;
  }

  const wrapped = ((angle + 180) % 360 + 360) % 360 - 180;
  return Math.abs(wrapped) < 0.005 ? 0 : wrapped;
}

function argumentDeg(real: number, imaginary: number) {
  if (magnitude(real, imaginary) <= 0.0001) {
    return 0;
  }

  return normalizeAngleDeg(radToDeg(Math.atan2(imaginary, real)));
}

function pickBucket(value: number) {
  const safeValue = Math.max(0, value);
  return (
    VIEWPORT_BUCKETS.find((bucket) => safeValue <= bucket) ??
    VIEWPORT_BUCKETS.at(-1) ??
    safeValue
  );
}

export function resolveComplexNumbersPlaneParams(
  source: Partial<ComplexNumbersPlaneParams> | Record<string, number | boolean | string>,
): Required<ComplexNumbersPlaneParams> {
  return {
    realPart: clamp(
      safeNumber(source.realPart, 2.2),
      COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
      COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
    ),
    imaginaryPart: clamp(
      safeNumber(source.imaginaryPart, 1.6),
      COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
      COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
    ),
    operandReal: clamp(
      safeNumber(source.operandReal, 1.1),
      COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
      COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
    ),
    operandImaginary: clamp(
      safeNumber(source.operandImaginary, 1.8),
      COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
      COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
    ),
    multiplyMode: source.multiplyMode === true,
  };
}

export function sampleComplexNumbersPlaneState(
  source: Partial<ComplexNumbersPlaneParams> | Record<string, number | boolean | string>,
): ComplexNumbersPlaneSnapshot {
  const params = resolveComplexNumbersPlaneParams(source);
  const magnitudeZ = magnitude(params.realPart, params.imaginaryPart);
  const magnitudeW = magnitude(params.operandReal, params.operandImaginary);
  const sumReal = params.realPart + params.operandReal;
  const sumImaginary = params.imaginaryPart + params.operandImaginary;
  const productReal =
    params.realPart * params.operandReal - params.imaginaryPart * params.operandImaginary;
  const productImaginary =
    params.realPart * params.operandImaginary + params.imaginaryPart * params.operandReal;

  return {
    ...params,
    magnitude: magnitudeZ,
    argumentDeg: argumentDeg(params.realPart, params.imaginaryPart),
    operandMagnitude: magnitudeW,
    operandArgumentDeg: argumentDeg(params.operandReal, params.operandImaginary),
    sumReal,
    sumImaginary,
    sumMagnitude: magnitude(sumReal, sumImaginary),
    sumArgumentDeg: argumentDeg(sumReal, sumImaginary),
    productReal,
    productImaginary,
    productMagnitude: magnitude(productReal, productImaginary),
    productArgumentDeg: argumentDeg(productReal, productImaginary),
    scaleFactor: magnitudeW,
    rotationDeg: argumentDeg(params.operandReal, params.operandImaginary),
  };
}

export function resolveComplexNumbersPlaneViewport(
  paramsList: Array<Partial<ComplexNumbersPlaneParams> | Record<string, number | boolean | string>>,
) {
  const maxAbsCoordinate = Math.max(
    ...paramsList.flatMap((params) => {
      const snapshot = sampleComplexNumbersPlaneState(params);
      return [
        Math.abs(snapshot.realPart),
        Math.abs(snapshot.imaginaryPart),
        Math.abs(snapshot.operandReal),
        Math.abs(snapshot.operandImaginary),
        Math.abs(snapshot.sumReal),
        Math.abs(snapshot.sumImaginary),
        Math.abs(snapshot.productReal),
        Math.abs(snapshot.productImaginary),
      ];
    }),
    2,
  );

  return {
    maxAbsCoordinate: pickBucket(maxAbsCoordinate * 1.14),
  } satisfies ComplexNumbersPlaneViewport;
}

export function buildComplexNumbersPlaneSeries(
  source: Partial<ComplexNumbersPlaneParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveComplexNumbersPlaneParams(source);
  const operandRealSamples = sampleRange(
    COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
    COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "addition-sweep": [
      buildSeries(
        "sum-real",
        "Re(z + w)",
        operandRealSamples.map((operandReal) => ({
          x: operandReal,
          y: sampleComplexNumbersPlaneState({ ...resolved, operandReal }).sumReal,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "sum-imaginary",
        "Im(z + w)",
        operandRealSamples.map((operandReal) => ({
          x: operandReal,
          y: sampleComplexNumbersPlaneState({ ...resolved, operandReal }).sumImaginary,
        })),
        "#4ea6df",
      ),
    ],
    "multiplication-sweep": [
      buildSeries(
        "product-real",
        "Re(z · w)",
        operandRealSamples.map((operandReal) => ({
          x: operandReal,
          y: sampleComplexNumbersPlaneState({ ...resolved, operandReal }).productReal,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "product-imaginary",
        "Im(z · w)",
        operandRealSamples.map((operandReal) => ({
          x: operandReal,
          y: sampleComplexNumbersPlaneState({ ...resolved, operandReal }).productImaginary,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describeComplexNumbersPlaneState(
  source: Partial<ComplexNumbersPlaneParams> | Record<string, number | boolean | string>,
  locale?: AppLocale,
) {
  const snapshot = sampleComplexNumbersPlaneState(source);
  if (locale === "zh-HK") {
    const pointSummary = `目前的 z = ${formatComplex(snapshot.realPart, snapshot.imaginaryPart)}，距離原點 ${formatNumber(snapshot.magnitude)}，幅角大約是 ${formatNumber(snapshot.argumentDeg)}°。`;
    const additionSummary = `把 w = ${formatComplex(snapshot.operandReal, snapshot.operandImaginary)} 加上去之後，z + w 會落在 ${formatComplex(snapshot.sumReal, snapshot.sumImaginary)}。`;
    const multiplicationSummary = `乘上 w 之後，z 會大約按 ${formatNumber(snapshot.scaleFactor)} 倍縮放，並旋轉約 ${formatNumber(snapshot.rotationDeg)}°，最後落在 ${formatComplex(snapshot.productReal, snapshot.productImaginary)} 附近。`;

    return `${pointSummary}${snapshot.multiplyMode ? multiplicationSummary : additionSummary}`;
  }
  const pointSummary = `z = ${formatComplex(snapshot.realPart, snapshot.imaginaryPart)} sits ${formatNumber(snapshot.magnitude)} units from the origin at about ${formatNumber(snapshot.argumentDeg)} degrees.`;
  const additionSummary = `Adding w = ${formatComplex(snapshot.operandReal, snapshot.operandImaginary)} lands z + w at ${formatComplex(snapshot.sumReal, snapshot.sumImaginary)}.`;
  const multiplicationSummary = `Multiplying by w scales the point by about ${formatNumber(snapshot.scaleFactor)} and rotates it by about ${formatNumber(snapshot.rotationDeg)} degrees, landing near ${formatComplex(snapshot.productReal, snapshot.productImaginary)}.`;

  return `${pointSummary} ${snapshot.multiplyMode ? multiplicationSummary : additionSummary}`;
}

export function formatComplex(real: number, imaginary: number) {
  const sign = imaginary >= 0 ? "+" : "-";
  return `${formatNumber(real)} ${sign} ${formatNumber(Math.abs(imaginary))}i`;
}
