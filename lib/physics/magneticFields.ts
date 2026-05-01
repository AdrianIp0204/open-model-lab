import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type MagneticFieldsParams = {
  currentA?: number;
  currentB?: number;
  sourceSeparation?: number;
  probeX?: number;
  probeY?: number;
};

export type MagneticFieldContribution = {
  current: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  distance: number;
  effectiveDistance: number;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
  circulationSense: "counterclockwise" | "clockwise" | "none";
};

export type MagneticFieldsSnapshot = {
  currentA: number;
  currentB: number;
  sourceSeparation: number;
  probeX: number;
  probeY: number;
  sourceA: MagneticFieldContribution;
  sourceB: MagneticFieldContribution;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
  fieldAngle: number;
  dominantSource: "a" | "b" | "balanced" | "none";
  netCirculation: "counterclockwise" | "clockwise" | "balanced";
};

export const MAGNETIC_FIELDS_MIN_CURRENT = -3;
export const MAGNETIC_FIELDS_MAX_CURRENT = 3;
export const MAGNETIC_FIELDS_MIN_SEPARATION = 1;
export const MAGNETIC_FIELDS_MAX_SEPARATION = 4;
export const MAGNETIC_FIELDS_STAGE_MIN_X = -3.2;
export const MAGNETIC_FIELDS_STAGE_MAX_X = 3.2;
export const MAGNETIC_FIELDS_STAGE_MIN_Y = -2.4;
export const MAGNETIC_FIELDS_STAGE_MAX_Y = 2.4;
export const MAGNETIC_FIELDS_MIN_SAMPLE_DISTANCE = 0.34;

const MAGNETIC_FIELDS_GRAPH_SAMPLES = 181;

function resolveCurrent(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    MAGNETIC_FIELDS_MIN_CURRENT,
    MAGNETIC_FIELDS_MAX_CURRENT,
  );
}

function resolvePoint(value: unknown, min: number, max: number, fallback: number) {
  return clamp(safeNumber(value, fallback), min, max);
}

function describeVectorDirection(x: number, y: number) {
  const threshold = 0.08;
  const horizontal =
    Math.abs(x) <= threshold ? "" : x > 0 ? "right" : "left";
  const vertical = Math.abs(y) <= threshold ? "" : y > 0 ? "up" : "down";

  if (horizontal && vertical) {
    return `${vertical}-${horizontal}`;
  }

  return horizontal || vertical || "neutral";
}

function resolveCirculationSense(current: number): MagneticFieldContribution["circulationSense"] {
  if (Math.abs(current) <= 0.02) {
    return "none";
  }

  return current > 0 ? "counterclockwise" : "clockwise";
}

function buildContribution(
  current: number,
  sourceX: number,
  sourceY: number,
  probeX: number,
  probeY: number,
): MagneticFieldContribution {
  let dx = probeX - sourceX;
  let dy = probeY - sourceY;
  const distance = Math.hypot(dx, dy);

  if (distance < 1e-6) {
    dx = MAGNETIC_FIELDS_MIN_SAMPLE_DISTANCE;
    dy = 0;
  }

  const effectiveDistance = Math.max(Math.hypot(dx, dy), MAGNETIC_FIELDS_MIN_SAMPLE_DISTANCE);
  const scale = current / Math.pow(effectiveDistance, 2);
  const fieldX = -dy * scale;
  const fieldY = dx * scale;

  return {
    current,
    x: sourceX,
    y: sourceY,
    dx,
    dy,
    distance,
    effectiveDistance,
    fieldX,
    fieldY,
    fieldMagnitude: Math.hypot(fieldX, fieldY),
    circulationSense: resolveCirculationSense(current),
  };
}

function dominantSource(
  sourceA: MagneticFieldContribution,
  sourceB: MagneticFieldContribution,
): MagneticFieldsSnapshot["dominantSource"] {
  if (sourceA.fieldMagnitude <= 0.02 && sourceB.fieldMagnitude <= 0.02) {
    return "none";
  }

  const difference = Math.abs(sourceA.fieldMagnitude - sourceB.fieldMagnitude);
  if (difference <= 0.08) {
    return "balanced";
  }

  return sourceA.fieldMagnitude > sourceB.fieldMagnitude ? "a" : "b";
}

function netCirculation(
  resolved: Required<MagneticFieldsParams>,
): MagneticFieldsSnapshot["netCirculation"] {
  if (Math.abs(resolved.currentA - resolved.currentB) <= 0.05) {
    if (Math.abs(resolved.currentA) <= 0.02 && Math.abs(resolved.currentB) <= 0.02) {
      return "balanced";
    }

    return resolved.currentA > 0 ? "counterclockwise" : "clockwise";
  }

  return "balanced";
}

export function resolveMagneticFieldsParams(
  source: Partial<MagneticFieldsParams> | Record<string, number | boolean | string>,
): Required<MagneticFieldsParams> {
  return {
    currentA: resolveCurrent(source.currentA, 2),
    currentB: resolveCurrent(source.currentB, -2),
    sourceSeparation: resolvePoint(
      source.sourceSeparation,
      MAGNETIC_FIELDS_MIN_SEPARATION,
      MAGNETIC_FIELDS_MAX_SEPARATION,
      2.4,
    ),
    probeX: resolvePoint(
      source.probeX,
      MAGNETIC_FIELDS_STAGE_MIN_X,
      MAGNETIC_FIELDS_STAGE_MAX_X,
      0,
    ),
    probeY: resolvePoint(
      source.probeY,
      MAGNETIC_FIELDS_STAGE_MIN_Y,
      MAGNETIC_FIELDS_STAGE_MAX_Y,
      1,
    ),
  };
}

export function sampleMagneticFieldsState(
  source: Partial<MagneticFieldsParams> | Record<string, number | boolean | string>,
  probeOverride?: Partial<Pick<MagneticFieldsParams, "probeX" | "probeY">>,
): MagneticFieldsSnapshot {
  const resolved = resolveMagneticFieldsParams({
    ...source,
    ...probeOverride,
  });
  const sourceAX = -resolved.sourceSeparation / 2;
  const sourceBX = resolved.sourceSeparation / 2;
  const sourceA = buildContribution(
    resolved.currentA,
    sourceAX,
    0,
    resolved.probeX,
    resolved.probeY,
  );
  const sourceB = buildContribution(
    resolved.currentB,
    sourceBX,
    0,
    resolved.probeX,
    resolved.probeY,
  );
  const fieldX = sourceA.fieldX + sourceB.fieldX;
  const fieldY = sourceA.fieldY + sourceB.fieldY;
  const fieldMagnitude = Math.hypot(fieldX, fieldY);

  return {
    currentA: resolved.currentA,
    currentB: resolved.currentB,
    sourceSeparation: resolved.sourceSeparation,
    probeX: resolved.probeX,
    probeY: resolved.probeY,
    sourceA,
    sourceB,
    fieldX,
    fieldY,
    fieldMagnitude,
    fieldAngle: (Math.atan2(fieldY, fieldX) * 180) / Math.PI,
    dominantSource: dominantSource(sourceA, sourceB),
    netCirculation: netCirculation(resolved),
  };
}

function buildSliceSeries(
  id: string,
  label: string,
  sampleY: (probeX: number) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      MAGNETIC_FIELDS_STAGE_MIN_X,
      MAGNETIC_FIELDS_STAGE_MAX_X,
      MAGNETIC_FIELDS_GRAPH_SAMPLES,
    ).map((probeX) => ({
      x: probeX,
      y: sampleY(probeX),
    })),
    color,
  );
}

export function buildMagneticFieldsSeries(
  source: Partial<MagneticFieldsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveMagneticFieldsParams(source);
  const sampleAt = (probeX: number) =>
    sampleMagneticFieldsState(resolved, {
      probeX,
      probeY: resolved.probeY,
    });

  return {
    "field-scan": [
      buildSliceSeries(
        "source-a-bx",
        "Wire A B_x",
        (probeX) => sampleAt(probeX).sourceA.fieldX,
        "#f0ab3c",
      ),
      buildSliceSeries(
        "source-b-bx",
        "Wire B B_x",
        (probeX) => sampleAt(probeX).sourceB.fieldX,
        "#4ea6df",
      ),
      buildSliceSeries(
        "net-bx",
        "Net B_x",
        (probeX) => sampleAt(probeX).fieldX,
        "#1ea6a2",
      ),
    ],
    "direction-scan": [
      buildSliceSeries(
        "net-by",
        "Net B_y",
        (probeX) => sampleAt(probeX).fieldY,
        "#f16659",
      ),
      buildSliceSeries(
        "net-strength",
        "|B|",
        (probeX) => sampleAt(probeX).fieldMagnitude,
        "#0f1c24",
      ),
    ],
  };
}

export function describeMagneticFieldsState(
  source: Partial<MagneticFieldsParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleMagneticFieldsState(source);
  const fieldDirection = describeVectorDirection(snapshot.fieldX, snapshot.fieldY);
  const netSenseText =
    snapshot.netCirculation === "counterclockwise"
      ? "Matching out-of-page current would circulate counterclockwise around each wire."
      : snapshot.netCirculation === "clockwise"
        ? "Matching into-page current would circulate clockwise around each wire."
        : "The two wire senses compete, so the local net direction has to be read from vector addition.";

  return `At the probe (${formatMeasurement(snapshot.probeX, "m")}, ${formatMeasurement(snapshot.probeY, "m")}), currents ${formatNumber(snapshot.currentA)} A and ${formatNumber(snapshot.currentB)} A separated by ${formatMeasurement(snapshot.sourceSeparation, "m")} produce B_x = ${formatNumber(snapshot.fieldX)} and B_y = ${formatNumber(snapshot.fieldY)}, so the net magnetic field is ${formatNumber(snapshot.fieldMagnitude)} in field units and points ${fieldDirection}. ${netSenseText}`;
}
