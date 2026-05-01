import { buildSeries } from "./series";
import { formatMeasurement, formatNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";
import {
  GRAVITATIONAL_FIELDS_MAX_SOURCE_MASS,
  GRAVITATIONAL_FIELDS_MAX_TEST_MASS,
  GRAVITATIONAL_FIELDS_MIN_SAMPLE_DISTANCE,
  GRAVITATIONAL_FIELDS_MIN_SOURCE_MASS,
  GRAVITATIONAL_FIELDS_MIN_TEST_MASS,
  GRAVITATIONAL_FIELDS_STAGE_MAX_X,
  GRAVITATIONAL_FIELDS_STAGE_MAX_Y,
  GRAVITATIONAL_FIELDS_STAGE_MIN_X,
  GRAVITATIONAL_FIELDS_STAGE_MIN_Y,
  resolveGravitationalFieldsParams,
  sampleGravitationalFieldsState,
  type GravitationalFieldsParams,
} from "./gravitationalFields";

export type GravitationalPotentialParams = GravitationalFieldsParams;

export type GravitationalPotentialSnapshot = {
  sourceMass: number;
  testMass: number;
  probeX: number;
  probeY: number;
  distance: number;
  effectiveDistance: number;
  potential: number;
  potentialEnergy: number;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
  fieldAngle: number;
  forceX: number;
  forceY: number;
  forceMagnitude: number;
};

export const GRAVITATIONAL_POTENTIAL_MIN_SOURCE_MASS = GRAVITATIONAL_FIELDS_MIN_SOURCE_MASS;
export const GRAVITATIONAL_POTENTIAL_MAX_SOURCE_MASS = GRAVITATIONAL_FIELDS_MAX_SOURCE_MASS;
export const GRAVITATIONAL_POTENTIAL_MIN_TEST_MASS = GRAVITATIONAL_FIELDS_MIN_TEST_MASS;
export const GRAVITATIONAL_POTENTIAL_MAX_TEST_MASS = GRAVITATIONAL_FIELDS_MAX_TEST_MASS;
export const GRAVITATIONAL_POTENTIAL_STAGE_MIN_X = GRAVITATIONAL_FIELDS_STAGE_MIN_X;
export const GRAVITATIONAL_POTENTIAL_STAGE_MAX_X = GRAVITATIONAL_FIELDS_STAGE_MAX_X;
export const GRAVITATIONAL_POTENTIAL_STAGE_MIN_Y = GRAVITATIONAL_FIELDS_STAGE_MIN_Y;
export const GRAVITATIONAL_POTENTIAL_STAGE_MAX_Y = GRAVITATIONAL_FIELDS_STAGE_MAX_Y;
export const GRAVITATIONAL_POTENTIAL_MIN_SAMPLE_DISTANCE = GRAVITATIONAL_FIELDS_MIN_SAMPLE_DISTANCE;

const GRAVITATIONAL_POTENTIAL_GRAPH_SAMPLES = 181;
const GRAVITATIONAL_POTENTIAL_SLOPE_STEP = 0.04;

function samplePotentialAt(
  source: Required<GravitationalPotentialParams>,
  probeX: number,
) {
  return sampleGravitationalPotentialState(source, {
    probeX,
    probeY: source.probeY,
  });
}

function buildSliceSeries(
  id: string,
  label: string,
  sampleY: (probeX: number) => number,
  color: string,
  dashed = false,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
      GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
      GRAVITATIONAL_POTENTIAL_GRAPH_SAMPLES,
    ).map((probeX) => ({
      x: probeX,
      y: sampleY(probeX),
    })),
    color,
    dashed,
  );
}

function describeFieldDirection(x: number, y: number) {
  const threshold = 0.08;
  const horizontal = Math.abs(x) <= threshold ? "" : x > 0 ? "right" : "left";
  const vertical = Math.abs(y) <= threshold ? "" : y > 0 ? "up" : "down";

  if (horizontal && vertical) {
    return `${vertical}-${horizontal}`;
  }

  return horizontal || vertical || "neutral";
}

export function resolveGravitationalPotentialParams(
  source: Partial<GravitationalPotentialParams> | Record<string, number | boolean | string>,
): Required<GravitationalPotentialParams> {
  return resolveGravitationalFieldsParams(source);
}

export function sampleGravitationalPotentialState(
  source: Partial<GravitationalPotentialParams> | Record<string, number | boolean | string>,
  probeOverride?: Partial<Pick<GravitationalPotentialParams, "probeX" | "probeY">>,
): GravitationalPotentialSnapshot {
  const resolved = resolveGravitationalPotentialParams({
    ...source,
    ...probeOverride,
  });
  const fieldSnapshot = sampleGravitationalFieldsState(resolved);
  const potential = -resolved.sourceMass / fieldSnapshot.effectiveDistance;
  const potentialEnergy = resolved.testMass * potential;

  return {
    sourceMass: resolved.sourceMass,
    testMass: resolved.testMass,
    probeX: resolved.probeX,
    probeY: resolved.probeY,
    distance: fieldSnapshot.distance,
    effectiveDistance: fieldSnapshot.effectiveDistance,
    potential,
    potentialEnergy,
    fieldX: fieldSnapshot.fieldX,
    fieldY: fieldSnapshot.fieldY,
    fieldMagnitude: fieldSnapshot.fieldMagnitude,
    fieldAngle: fieldSnapshot.fieldAngle,
    forceX: fieldSnapshot.forceX,
    forceY: fieldSnapshot.forceY,
    forceMagnitude: fieldSnapshot.forceMagnitude,
  };
}

export function buildGravitationalPotentialSeries(
  source: Partial<GravitationalPotentialParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveGravitationalPotentialParams(source);
  const slopeAt = (probeX: number) => {
    const plus = samplePotentialAt(resolved, probeX + GRAVITATIONAL_POTENTIAL_SLOPE_STEP).potential;
    const minus =
      samplePotentialAt(resolved, probeX - GRAVITATIONAL_POTENTIAL_SLOPE_STEP).potential;

    return -(plus - minus) / (2 * GRAVITATIONAL_POTENTIAL_SLOPE_STEP);
  };

  return {
    "potential-energy-scan": [
      buildSliceSeries(
        "gravitational-potential",
        "phi",
        (probeX) => samplePotentialAt(resolved, probeX).potential,
        "#1d6f9f",
      ),
      buildSliceSeries(
        "gravitational-potential-energy",
        "U on m_test",
        (probeX) => samplePotentialAt(resolved, probeX).potentialEnergy,
        "#f16659",
      ),
    ],
    "field-link": [
      buildSliceSeries(
        "field-gx",
        "g_x",
        (probeX) => samplePotentialAt(resolved, probeX).fieldX,
        "#1ea6a2",
      ),
      buildSliceSeries(
        "negative-dphi-dx",
        "-dphi/dx",
        slopeAt,
        "#0f1c24",
        true,
      ),
    ],
  };
}

export function describeGravitationalPotentialState(
  source: Partial<GravitationalPotentialParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleGravitationalPotentialState(source);
  const fieldDirection = describeFieldDirection(snapshot.fieldX, snapshot.fieldY);
  const potentialDepthText =
    snapshot.effectiveDistance <= 1
      ? "The probe sits deep in the potential well, so phi is strongly negative."
      : snapshot.effectiveDistance >= 2.4
        ? "The probe sits farther from the source, so phi has risen closer to zero while still staying negative."
        : "The probe sits partway up the potential well, so phi is negative but not as deep as it is near the source.";
  const energyText =
    snapshot.testMass <= 0.01
      ? "A zero probe mass removes potential energy without changing the source-set potential."
      : snapshot.testMass >= 2
        ? "A heavier probe mass makes the potential energy more negative in the same potential well."
        : "With a positive probe mass, the potential energy carries the same negative sign as the gravitational potential.";

  return `At the probe (${formatMeasurement(snapshot.probeX, "m")}, ${formatMeasurement(snapshot.probeY, "m")}), a source mass of ${formatNumber(snapshot.sourceMass)} kg gives gravitational potential phi = ${formatNumber(snapshot.potential)} relative to zero at infinity. ${potentialDepthText} The local field magnitude is ${formatNumber(snapshot.fieldMagnitude)} and points ${fieldDirection}, which is the downhill direction on the potential landscape. For m_test = ${formatNumber(snapshot.testMass)} kg, the potential energy is ${formatNumber(snapshot.potentialEnergy)} and the force magnitude is ${formatNumber(snapshot.forceMagnitude)}. ${energyText}`;
}
