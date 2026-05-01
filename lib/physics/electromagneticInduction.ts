import { clamp, formatMeasurement, formatNumber, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type ElectromagneticInductionParams = {
  magnetStrength?: ControlValue;
  coilTurns?: ControlValue;
  coilArea?: ControlValue;
  speed?: ControlValue;
  startOffset?: ControlValue;
  northFacingCoil?: ControlValue;
};

type ResolvedElectromagneticInductionParams = {
  magnetStrength: number;
  coilTurns: number;
  coilArea: number;
  speed: number;
  startOffset: number;
  northFacingCoil: boolean;
};

export type ElectromagneticInductionSnapshot = {
  time: number;
  magnetStrength: number;
  coilTurns: number;
  coilArea: number;
  speed: number;
  startOffset: number;
  northFacingCoil: boolean;
  poleFacingLabel: "north faces coil" | "south faces coil";
  travelDirection: "left-to-right" | "right-to-left" | "stationary";
  magnetPhase: "approaching" | "crossing" | "leaving" | "stationary";
  positionX: number;
  velocityX: number;
  fieldStrength: number;
  fluxLinkage: number;
  fluxChangeRate: number;
  emf: number;
  current: number;
  currentDirection: "clockwise" | "counterclockwise" | "none";
  fluxTrend: "increasing" | "decreasing" | "steady";
  meterNeedle: number;
};

export const ELECTROMAGNETIC_INDUCTION_MIN_MAGNET_STRENGTH = 0.6;
export const ELECTROMAGNETIC_INDUCTION_MAX_MAGNET_STRENGTH = 2.4;
export const ELECTROMAGNETIC_INDUCTION_MIN_COIL_TURNS = 40;
export const ELECTROMAGNETIC_INDUCTION_MAX_COIL_TURNS = 240;
export const ELECTROMAGNETIC_INDUCTION_MIN_COIL_AREA = 0.6;
export const ELECTROMAGNETIC_INDUCTION_MAX_COIL_AREA = 1.8;
export const ELECTROMAGNETIC_INDUCTION_MIN_SPEED = -1.6;
export const ELECTROMAGNETIC_INDUCTION_MAX_SPEED = 1.6;
export const ELECTROMAGNETIC_INDUCTION_MIN_START_OFFSET = 0;
export const ELECTROMAGNETIC_INDUCTION_MAX_START_OFFSET = 3;
export const ELECTROMAGNETIC_INDUCTION_TOTAL_TIME = 4.5;
export const ELECTROMAGNETIC_INDUCTION_STAGE_MIN_X = -3.6;
export const ELECTROMAGNETIC_INDUCTION_STAGE_MAX_X = 3.6;
export const ELECTROMAGNETIC_INDUCTION_LOOP_RESISTANCE = 2.4;

const FIELD_COUPLING_LENGTH = 1.15;
const FIELD_SCALE = 1.05;
const FLUX_LINKAGE_SCALE = 0.018;
const GRAPH_SAMPLES = 221;

function resolveBoundedValue(
  value: ControlValue | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  return clamp(safeNumber(value, fallback), min, max);
}

function resolveIntegerValue(
  value: ControlValue | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.round(resolveBoundedValue(value, fallback, min, max));
}

function resolveTime(value: number | undefined) {
  return clamp(safeNumber(value, 0), 0, ELECTROMAGNETIC_INDUCTION_TOTAL_TIME);
}

function resolveTravelDirection(
  speed: number,
): ElectromagneticInductionSnapshot["travelDirection"] {
  if (speed > 0.03) {
    return "left-to-right";
  }

  if (speed < -0.03) {
    return "right-to-left";
  }

  return "stationary";
}

function resolveMagnetPhase(
  positionX: number,
  speed: number,
): ElectromagneticInductionSnapshot["magnetPhase"] {
  if (Math.abs(speed) <= 0.03) {
    return "stationary";
  }

  if (Math.abs(positionX) <= 0.18) {
    return "crossing";
  }

  return positionX * speed < 0 ? "approaching" : "leaving";
}

function resolveCurrentDirection(
  current: number,
): ElectromagneticInductionSnapshot["currentDirection"] {
  if (current > 0.03) {
    return "counterclockwise";
  }

  if (current < -0.03) {
    return "clockwise";
  }

  return "none";
}

function resolveFluxTrend(
  fluxChangeRate: number,
): ElectromagneticInductionSnapshot["fluxTrend"] {
  if (fluxChangeRate > 0.03) {
    return "increasing";
  }

  if (fluxChangeRate < -0.03) {
    return "decreasing";
  }

  return "steady";
}

export function resolveElectromagneticInductionParams(
  source:
    | Partial<ElectromagneticInductionParams>
    | Record<string, number | boolean | string>,
): ResolvedElectromagneticInductionParams {
  return {
    magnetStrength: resolveBoundedValue(
      source.magnetStrength,
      1.4,
      ELECTROMAGNETIC_INDUCTION_MIN_MAGNET_STRENGTH,
      ELECTROMAGNETIC_INDUCTION_MAX_MAGNET_STRENGTH,
    ),
    coilTurns: resolveIntegerValue(
      source.coilTurns,
      120,
      ELECTROMAGNETIC_INDUCTION_MIN_COIL_TURNS,
      ELECTROMAGNETIC_INDUCTION_MAX_COIL_TURNS,
    ),
    coilArea: resolveBoundedValue(
      source.coilArea,
      1,
      ELECTROMAGNETIC_INDUCTION_MIN_COIL_AREA,
      ELECTROMAGNETIC_INDUCTION_MAX_COIL_AREA,
    ),
    speed: resolveBoundedValue(
      source.speed,
      1.2,
      ELECTROMAGNETIC_INDUCTION_MIN_SPEED,
      ELECTROMAGNETIC_INDUCTION_MAX_SPEED,
    ),
    startOffset: resolveBoundedValue(
      source.startOffset,
      2.6,
      ELECTROMAGNETIC_INDUCTION_MIN_START_OFFSET,
      ELECTROMAGNETIC_INDUCTION_MAX_START_OFFSET,
    ),
    northFacingCoil: source.northFacingCoil !== false,
  };
}

export function sampleElectromagneticInductionState(
  source:
    | Partial<ElectromagneticInductionParams>
    | Record<string, number | boolean | string>,
  time: number,
): ElectromagneticInductionSnapshot {
  const resolved = resolveElectromagneticInductionParams(source);
  const displayTime = resolveTime(time);
  const poleSign = resolved.northFacingCoil ? 1 : -1;
  const startPosition = resolved.speed < -0.03 ? resolved.startOffset : -resolved.startOffset;
  const positionX = startPosition + resolved.speed * displayTime;
  const normalizedDistance = positionX / FIELD_COUPLING_LENGTH;
  const denominator = 1 + normalizedDistance * normalizedDistance;
  const fieldStrength =
    (poleSign * FIELD_SCALE * resolved.magnetStrength) / denominator;
  const fieldSlopeAtPosition =
    (poleSign *
      FIELD_SCALE *
      resolved.magnetStrength *
      (-2 * positionX / (FIELD_COUPLING_LENGTH * FIELD_COUPLING_LENGTH))) /
    (denominator * denominator);
  const fluxLinkage =
    resolved.coilTurns * resolved.coilArea * FLUX_LINKAGE_SCALE * fieldStrength;
  const fluxChangeRate =
    resolved.coilTurns *
    resolved.coilArea *
    FLUX_LINKAGE_SCALE *
    fieldSlopeAtPosition *
    resolved.speed;
  const emf = -fluxChangeRate;
  const current = emf / ELECTROMAGNETIC_INDUCTION_LOOP_RESISTANCE;

  return {
    time: displayTime,
    magnetStrength: resolved.magnetStrength,
    coilTurns: resolved.coilTurns,
    coilArea: resolved.coilArea,
    speed: resolved.speed,
    startOffset: resolved.startOffset,
    northFacingCoil: resolved.northFacingCoil,
    poleFacingLabel: resolved.northFacingCoil ? "north faces coil" : "south faces coil",
    travelDirection: resolveTravelDirection(resolved.speed),
    magnetPhase: resolveMagnetPhase(positionX, resolved.speed),
    positionX,
    velocityX: resolved.speed,
    fieldStrength,
    fluxLinkage,
    fluxChangeRate,
    emf,
    current,
    currentDirection: resolveCurrentDirection(current),
    fluxTrend: resolveFluxTrend(fluxChangeRate),
    meterNeedle: clamp(current / 0.9, -1, 1),
  };
}

export function buildElectromagneticInductionSeries(
  source:
    | Partial<ElectromagneticInductionParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveElectromagneticInductionParams(source);

  return {
    "field-flux": [
      sampleTimeSeries(
        "coil-field",
        "Field through coil",
        0,
        ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
        GRAPH_SAMPLES,
        (time) => sampleElectromagneticInductionState(resolved, time).fieldStrength,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "flux-linkage",
        "Flux linkage",
        0,
        ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
        GRAPH_SAMPLES,
        (time) => sampleElectromagneticInductionState(resolved, time).fluxLinkage,
        "#1ea6a2",
      ),
    ],
    "induced-response": [
      sampleTimeSeries(
        "induced-emf",
        "Induced emf",
        0,
        ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
        GRAPH_SAMPLES,
        (time) => sampleElectromagneticInductionState(resolved, time).emf,
        "#f16659",
      ),
      sampleTimeSeries(
        "induced-current",
        "Loop current",
        0,
        ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
        GRAPH_SAMPLES,
        (time) => sampleElectromagneticInductionState(resolved, time).current,
        "#f0ab3c",
      ),
    ],
  };
}

export function describeElectromagneticInductionState(
  source:
    | Partial<ElectromagneticInductionParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleElectromagneticInductionState(source, time);
  const trendText =
    snapshot.fluxTrend === "steady"
      ? "Flux linkage is not changing right now, so the induced response collapses toward zero."
      : snapshot.fluxTrend === "increasing"
        ? "Flux linkage is increasing, so the coil responds with an induced emf that opposes that increase."
        : "Flux linkage is decreasing, so the coil responds with an induced emf that tries to keep the magnetic story from dropping as quickly.";
  const directionText =
    snapshot.currentDirection === "none"
      ? "The galvanometer needle is centered."
      : `The loop current is ${snapshot.currentDirection} in the stage convention.`;

  return `At t = ${formatMeasurement(snapshot.time, "s")}, a ${formatMeasurement(snapshot.magnetStrength, "T")} magnet with ${snapshot.poleFacingLabel} sits at x = ${formatMeasurement(snapshot.positionX, "m")} and moves ${snapshot.travelDirection} at ${formatMeasurement(snapshot.speed, "m/s")}. The coil links ${formatNumber(snapshot.fluxLinkage)} Wb-turn of flux, so the induced emf is ${formatMeasurement(snapshot.emf, "V")} and the current is ${formatMeasurement(snapshot.current, "A")}. ${trendText} ${directionText}`;
}
