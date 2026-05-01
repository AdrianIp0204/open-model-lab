import { clamp, formatMeasurement, formatNumber } from "./math";
import { buildSeries } from "./series";
import type { GraphSeriesMap } from "./types";
import {
  ELECTRIC_FIELDS_MAX_CHARGE,
  ELECTRIC_FIELDS_MAX_SEPARATION,
  ELECTRIC_FIELDS_MIN_CHARGE,
  ELECTRIC_FIELDS_MIN_SAMPLE_DISTANCE,
  ELECTRIC_FIELDS_MIN_SEPARATION,
  ELECTRIC_FIELDS_STAGE_MAX_X,
  ELECTRIC_FIELDS_STAGE_MAX_Y,
  ELECTRIC_FIELDS_STAGE_MIN_X,
  ELECTRIC_FIELDS_STAGE_MIN_Y,
  resolveElectricFieldsParams,
  sampleElectricFieldsState,
  type ElectricFieldContribution,
  type ElectricFieldsParams,
} from "./electricFields";

export type ElectricPotentialParams = ElectricFieldsParams;

export type ElectricPotentialContribution = ElectricFieldContribution & {
  potential: number;
};

export type ElectricPotentialSnapshot = {
  sourceChargeA: number;
  sourceChargeB: number;
  sourceSeparation: number;
  testCharge: number;
  probeX: number;
  probeY: number;
  sourceA: ElectricPotentialContribution;
  sourceB: ElectricPotentialContribution;
  potential: number;
  potentialEnergy: number;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
  fieldAngle: number;
  dominantPotentialSource: "a" | "b" | "balanced" | "none";
  potentialSign: "positive" | "negative" | "neutral";
  energySign: "positive" | "negative" | "neutral";
};

export const ELECTRIC_POTENTIAL_MIN_CHARGE = ELECTRIC_FIELDS_MIN_CHARGE;
export const ELECTRIC_POTENTIAL_MAX_CHARGE = ELECTRIC_FIELDS_MAX_CHARGE;
export const ELECTRIC_POTENTIAL_MIN_SEPARATION = ELECTRIC_FIELDS_MIN_SEPARATION;
export const ELECTRIC_POTENTIAL_MAX_SEPARATION = ELECTRIC_FIELDS_MAX_SEPARATION;
export const ELECTRIC_POTENTIAL_STAGE_MIN_X = ELECTRIC_FIELDS_STAGE_MIN_X;
export const ELECTRIC_POTENTIAL_STAGE_MAX_X = ELECTRIC_FIELDS_STAGE_MAX_X;
export const ELECTRIC_POTENTIAL_STAGE_MIN_Y = ELECTRIC_FIELDS_STAGE_MIN_Y;
export const ELECTRIC_POTENTIAL_STAGE_MAX_Y = ELECTRIC_FIELDS_STAGE_MAX_Y;
export const ELECTRIC_POTENTIAL_MIN_SAMPLE_DISTANCE = ELECTRIC_FIELDS_MIN_SAMPLE_DISTANCE;

const ELECTRIC_POTENTIAL_GRAPH_SAMPLES = 181;
const ELECTRIC_POTENTIAL_SLOPE_STEP = 0.04;
const ELECTRIC_POTENTIAL_SIGN_THRESHOLD = 0.08;

function classifySignedValue(value: number): "positive" | "negative" | "neutral" {
  if (value > ELECTRIC_POTENTIAL_SIGN_THRESHOLD) {
    return "positive";
  }

  if (value < -ELECTRIC_POTENTIAL_SIGN_THRESHOLD) {
    return "negative";
  }

  return "neutral";
}

function buildPotentialContribution(
  contribution: ElectricFieldContribution,
): ElectricPotentialContribution {
  return {
    ...contribution,
    potential: contribution.charge / contribution.effectiveDistance,
  };
}

function dominantPotentialSource(
  sourceA: ElectricPotentialContribution,
  sourceB: ElectricPotentialContribution,
): ElectricPotentialSnapshot["dominantPotentialSource"] {
  if (Math.abs(sourceA.potential) <= 0.04 && Math.abs(sourceB.potential) <= 0.04) {
    return "none";
  }

  const difference = Math.abs(Math.abs(sourceA.potential) - Math.abs(sourceB.potential));
  if (difference <= 0.08) {
    return "balanced";
  }

  return Math.abs(sourceA.potential) > Math.abs(sourceB.potential) ? "a" : "b";
}

function samplePotentialAt(
  source: Required<ElectricPotentialParams>,
  probeX: number,
) {
  return sampleElectricPotentialState(source, {
    probeX: clamp(
      probeX,
      ELECTRIC_POTENTIAL_STAGE_MIN_X,
      ELECTRIC_POTENTIAL_STAGE_MAX_X,
    ),
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
  const step =
    (ELECTRIC_POTENTIAL_STAGE_MAX_X - ELECTRIC_POTENTIAL_STAGE_MIN_X) /
    (ELECTRIC_POTENTIAL_GRAPH_SAMPLES - 1);

  return buildSeries(
    id,
    label,
    Array.from({ length: ELECTRIC_POTENTIAL_GRAPH_SAMPLES }, (_, index) => {
      const probeX = ELECTRIC_POTENTIAL_STAGE_MIN_X + step * index;
      return {
        x: probeX,
        y: sampleY(probeX),
      };
    }),
    color,
    dashed,
  );
}

export function resolveElectricPotentialParams(
  source: Partial<ElectricPotentialParams> | Record<string, number | boolean | string>,
): Required<ElectricPotentialParams> {
  return resolveElectricFieldsParams(source);
}

export function sampleElectricPotentialState(
  source: Partial<ElectricPotentialParams> | Record<string, number | boolean | string>,
  probeOverride?: Partial<Pick<ElectricPotentialParams, "probeX" | "probeY">>,
): ElectricPotentialSnapshot {
  const resolved = resolveElectricPotentialParams({
    ...source,
    ...probeOverride,
  });
  const fieldSnapshot = sampleElectricFieldsState(resolved);
  const sourceA = buildPotentialContribution(fieldSnapshot.sourceA);
  const sourceB = buildPotentialContribution(fieldSnapshot.sourceB);
  const potential = sourceA.potential + sourceB.potential;
  const potentialEnergy = resolved.testCharge * potential;

  return {
    sourceChargeA: resolved.sourceChargeA,
    sourceChargeB: resolved.sourceChargeB,
    sourceSeparation: resolved.sourceSeparation,
    testCharge: resolved.testCharge,
    probeX: resolved.probeX,
    probeY: resolved.probeY,
    sourceA,
    sourceB,
    potential,
    potentialEnergy,
    fieldX: fieldSnapshot.fieldX,
    fieldY: fieldSnapshot.fieldY,
    fieldMagnitude: fieldSnapshot.fieldMagnitude,
    fieldAngle: fieldSnapshot.fieldAngle,
    dominantPotentialSource: dominantPotentialSource(sourceA, sourceB),
    potentialSign: classifySignedValue(potential),
    energySign: classifySignedValue(potentialEnergy),
  };
}

export function buildElectricPotentialSeries(
  source: Partial<ElectricPotentialParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveElectricPotentialParams(source);
  const slopeAt = (probeX: number) => {
    const plus = samplePotentialAt(resolved, probeX + ELECTRIC_POTENTIAL_SLOPE_STEP).potential;
    const minus = samplePotentialAt(resolved, probeX - ELECTRIC_POTENTIAL_SLOPE_STEP).potential;

    return -(plus - minus) / (2 * ELECTRIC_POTENTIAL_SLOPE_STEP);
  };

  return {
    "potential-scan": [
      buildSliceSeries(
        "source-a-potential",
        "Source A V",
        (probeX) => samplePotentialAt(resolved, probeX).sourceA.potential,
        "#f0ab3c",
      ),
      buildSliceSeries(
        "source-b-potential",
        "Source B V",
        (probeX) => samplePotentialAt(resolved, probeX).sourceB.potential,
        "#4ea6df",
      ),
      buildSliceSeries(
        "net-potential",
        "Net V",
        (probeX) => samplePotentialAt(resolved, probeX).potential,
        "#1d6f9f",
      ),
    ],
    "field-link": [
      buildSliceSeries(
        "net-ex",
        "Net E_x",
        (probeX) => samplePotentialAt(resolved, probeX).fieldX,
        "#1ea6a2",
      ),
      buildSliceSeries(
        "negative-dv-dx",
        "-dV/dx",
        slopeAt,
        "#f16659",
        true,
      ),
    ],
  };
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

export function describeElectricPotentialState(
  source: Partial<ElectricPotentialParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleElectricPotentialState(source);
  const fieldDirection = describeVectorDirection(snapshot.fieldX, snapshot.fieldY);
  const potentialText =
    snapshot.potentialSign === "positive"
      ? "The probe sits in a positive-potential region."
      : snapshot.potentialSign === "negative"
        ? "The probe sits in a negative-potential region."
        : "The positive and negative contributions nearly cancel, so the net potential is close to zero.";
  const fieldText =
    snapshot.fieldMagnitude <= 0.05
      ? "The local field is nearly zero here, so the potential landscape is locally balanced even though V may still be nonzero."
      : `The field points ${fieldDirection}, which is the downhill direction on the potential map.`;
  const energyText =
    snapshot.energySign === "neutral"
      ? "With this test charge, the potential energy is near zero."
      : snapshot.energySign === "positive"
        ? "The test charge has positive potential energy here."
        : "The test charge has negative potential energy here.";

  return `At the probe (${formatMeasurement(snapshot.probeX, "m")}, ${formatMeasurement(snapshot.probeY, "m")}), charges ${formatNumber(snapshot.sourceChargeA)} q and ${formatNumber(snapshot.sourceChargeB)} q separated by ${formatMeasurement(snapshot.sourceSeparation, "m")} give V_A = ${formatNumber(snapshot.sourceA.potential)} and V_B = ${formatNumber(snapshot.sourceB.potential)}, so the net potential is ${formatNumber(snapshot.potential)}. ${potentialText} The local field magnitude is ${formatNumber(snapshot.fieldMagnitude)} and ${fieldText} For q_test = ${formatNumber(snapshot.testCharge)} q, the potential energy is ${formatNumber(snapshot.potentialEnergy)}. ${energyText}`;
}
