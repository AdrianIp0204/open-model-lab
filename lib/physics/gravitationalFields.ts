import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type GravitationalFieldsParams = {
  sourceMass?: number;
  probeX?: number;
  probeY?: number;
  testMass?: number;
};

export type GravitationalFieldsSnapshot = {
  sourceMass: number;
  testMass: number;
  probeX: number;
  probeY: number;
  distance: number;
  effectiveDistance: number;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
  fieldAngle: number;
  forceX: number;
  forceY: number;
  forceMagnitude: number;
};

export const GRAVITATIONAL_FIELDS_MIN_SOURCE_MASS = 0.5;
export const GRAVITATIONAL_FIELDS_MAX_SOURCE_MASS = 5;
export const GRAVITATIONAL_FIELDS_MIN_TEST_MASS = 0;
export const GRAVITATIONAL_FIELDS_MAX_TEST_MASS = 4;
export const GRAVITATIONAL_FIELDS_STAGE_MIN_X = -3.2;
export const GRAVITATIONAL_FIELDS_STAGE_MAX_X = 3.2;
export const GRAVITATIONAL_FIELDS_STAGE_MIN_Y = -2.4;
export const GRAVITATIONAL_FIELDS_STAGE_MAX_Y = 2.4;
export const GRAVITATIONAL_FIELDS_MIN_SAMPLE_DISTANCE = 0.45;
export const GRAVITATIONAL_FIELDS_RING_RADII = [1, 2, 3] as const;

const GRAVITATIONAL_FIELDS_GRAPH_SAMPLES = 181;

function resolveSourceMass(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    GRAVITATIONAL_FIELDS_MIN_SOURCE_MASS,
    GRAVITATIONAL_FIELDS_MAX_SOURCE_MASS,
  );
}

function resolveTestMass(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    GRAVITATIONAL_FIELDS_MIN_TEST_MASS,
    GRAVITATIONAL_FIELDS_MAX_TEST_MASS,
  );
}

function resolvePoint(value: unknown, min: number, max: number, fallback: number) {
  return clamp(safeNumber(value, fallback), min, max);
}

function describeVectorDirection(x: number, y: number) {
  const threshold = 0.08;
  const horizontal = Math.abs(x) <= threshold ? "" : x > 0 ? "right" : "left";
  const vertical = Math.abs(y) <= threshold ? "" : y > 0 ? "up" : "down";

  if (horizontal && vertical) {
    return `${vertical}-${horizontal}`;
  }

  return horizontal || vertical || "neutral";
}

export function resolveGravitationalFieldsParams(
  source: Partial<GravitationalFieldsParams> | Record<string, number | boolean | string>,
): Required<GravitationalFieldsParams> {
  return {
    sourceMass: resolveSourceMass(source.sourceMass, 2),
    probeX: resolvePoint(
      source.probeX,
      GRAVITATIONAL_FIELDS_STAGE_MIN_X,
      GRAVITATIONAL_FIELDS_STAGE_MAX_X,
      1.6,
    ),
    probeY: resolvePoint(
      source.probeY,
      GRAVITATIONAL_FIELDS_STAGE_MIN_Y,
      GRAVITATIONAL_FIELDS_STAGE_MAX_Y,
      1.2,
    ),
    testMass: resolveTestMass(source.testMass, 1),
  };
}

export function sampleGravitationalFieldsState(
  source: Partial<GravitationalFieldsParams> | Record<string, number | boolean | string>,
  probeOverride?: Partial<Pick<GravitationalFieldsParams, "probeX" | "probeY">>,
): GravitationalFieldsSnapshot {
  const resolved = resolveGravitationalFieldsParams({
    ...source,
    ...probeOverride,
  });
  let dx = resolved.probeX;
  let dy = resolved.probeY;
  const distance = Math.hypot(dx, dy);

  if (distance < 1e-6) {
    dx = GRAVITATIONAL_FIELDS_MIN_SAMPLE_DISTANCE;
    dy = 0;
  }

  const effectiveDistance = Math.max(
    Math.hypot(dx, dy),
    GRAVITATIONAL_FIELDS_MIN_SAMPLE_DISTANCE,
  );
  const scale = -resolved.sourceMass / Math.pow(effectiveDistance, 3);
  const fieldX = dx * scale;
  const fieldY = dy * scale;
  const fieldMagnitude = Math.hypot(fieldX, fieldY);
  const forceX = resolved.testMass * fieldX;
  const forceY = resolved.testMass * fieldY;
  const forceMagnitude = Math.hypot(forceX, forceY);

  return {
    sourceMass: resolved.sourceMass,
    testMass: resolved.testMass,
    probeX: resolved.probeX,
    probeY: resolved.probeY,
    distance,
    effectiveDistance,
    fieldX,
    fieldY,
    fieldMagnitude,
    fieldAngle: (Math.atan2(fieldY, fieldX) * 180) / Math.PI,
    forceX,
    forceY,
    forceMagnitude,
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
      GRAVITATIONAL_FIELDS_STAGE_MIN_X,
      GRAVITATIONAL_FIELDS_STAGE_MAX_X,
      GRAVITATIONAL_FIELDS_GRAPH_SAMPLES,
    ).map((probeX) => ({
      x: probeX,
      y: sampleY(probeX),
    })),
    color,
  );
}

export function buildGravitationalFieldsSeries(
  source: Partial<GravitationalFieldsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveGravitationalFieldsParams(source);
  const sampleAt = (probeX: number) =>
    sampleGravitationalFieldsState(resolved, {
      probeX,
      probeY: resolved.probeY,
    });

  return {
    "field-components": [
      buildSliceSeries(
        "field-gx",
        "g_x",
        (probeX) => sampleAt(probeX).fieldX,
        "#1ea6a2",
      ),
      buildSliceSeries(
        "field-gy",
        "g_y",
        (probeX) => sampleAt(probeX).fieldY,
        "#4ea6df",
      ),
    ],
    "strength-response": [
      buildSliceSeries(
        "field-strength",
        "|g|",
        (probeX) => sampleAt(probeX).fieldMagnitude,
        "#0f1c24",
      ),
      buildSliceSeries(
        "force-strength",
        "|F| on m_test",
        (probeX) => sampleAt(probeX).forceMagnitude,
        "#f16659",
      ),
    ],
  };
}

export function describeGravitationalFieldsState(
  source: Partial<GravitationalFieldsParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleGravitationalFieldsState(source);
  const direction = describeVectorDirection(snapshot.fieldX, snapshot.fieldY);
  const distanceNote =
    snapshot.distance < GRAVITATIONAL_FIELDS_MIN_SAMPLE_DISTANCE
      ? "The probe is very near the source mass, so the display clamps the sample radius to keep the arrows and graphs finite."
      : "On the same radial line, doubling the distance would reduce the field strength to about one quarter.";

  return `A source mass of ${formatNumber(snapshot.sourceMass)} kg at the origin produces a gravitational field of (${formatNumber(snapshot.fieldX)}, ${formatNumber(snapshot.fieldY)}) at the probe (${formatMeasurement(snapshot.probeX, "m")}, ${formatMeasurement(snapshot.probeY, "m")}). The probe is ${formatMeasurement(snapshot.effectiveDistance, "m")} from the source, so |g| is ${formatNumber(snapshot.fieldMagnitude)} in field units and points ${direction}. A test mass of ${formatNumber(snapshot.testMass)} kg feels a force of ${formatNumber(snapshot.forceMagnitude)} in force units toward the source. ${distanceNote}`;
}
