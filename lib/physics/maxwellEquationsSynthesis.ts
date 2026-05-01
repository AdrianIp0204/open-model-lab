import { TAU, clamp, formatMeasurement, formatNumber, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type MaxwellEquationsSynthesisParams = {
  chargeSource?: ControlValue;
  conductionCurrent?: ControlValue;
  electricChangeRate?: ControlValue;
  magneticChangeRate?: ControlValue;
  cycleRate?: ControlValue;
};

type ResolvedMaxwellEquationsSynthesisParams = {
  chargeSource: number;
  conductionCurrent: number;
  electricChangeRate: number;
  magneticChangeRate: number;
  cycleRate: number;
};

export type MaxwellEquationsSynthesisSnapshot = {
  time: number;
  chargeSource: number;
  conductionCurrent: number;
  electricChangeRate: number;
  magneticChangeRate: number;
  cycleRate: number;
  period: number;
  phase: number;
  electricFlux: number;
  magneticNetFlux: number;
  electricFluxDirection:
    | "outward"
    | "inward"
    | "balanced";
  chargeSignLabel:
    | "positive"
    | "negative"
    | "neutral";
  electricChangeInstant: number;
  magneticFluxChange: number;
  bCurrentContribution: number;
  bDisplacementContribution: number;
  bCirculation: number;
  eCirculation: number;
  bCirculationDirection:
    | "counterclockwise"
    | "clockwise"
    | "none";
  eCirculationDirection:
    | "counterclockwise"
    | "clockwise"
    | "none";
  closedLoopStrength: number;
  alignedFieldPair: boolean;
  waveCueMagnitude: number;
  waveSignedCue: number;
  waveStateLabel:
    | "strong"
    | "partial"
    | "absent"
    | "misaligned";
  ampereBalanceLabel:
    | "current-dominated"
    | "displacement-dominated"
    | "shared";
};

export const MAXWELL_EQUATIONS_SYNTHESIS_MIN_STRENGTH = -1.6;
export const MAXWELL_EQUATIONS_SYNTHESIS_MAX_STRENGTH = 1.6;
export const MAXWELL_EQUATIONS_SYNTHESIS_MIN_CYCLE_RATE = 0.4;
export const MAXWELL_EQUATIONS_SYNTHESIS_MAX_CYCLE_RATE = 1.6;

const GRAPH_SAMPLES = 241;
const MIN_TIME_WINDOW = 4;
const MAX_TIME_WINDOW = 8;

function resolveSignedStrength(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    MAXWELL_EQUATIONS_SYNTHESIS_MIN_STRENGTH,
    MAXWELL_EQUATIONS_SYNTHESIS_MAX_STRENGTH,
  );
}

function resolveCycleRate(value: ControlValue | undefined) {
  return clamp(
    safeNumber(value, 0.85),
    MAXWELL_EQUATIONS_SYNTHESIS_MIN_CYCLE_RATE,
    MAXWELL_EQUATIONS_SYNTHESIS_MAX_CYCLE_RATE,
  );
}

function resolveLoopDirection(
  value: number,
): MaxwellEquationsSynthesisSnapshot["bCirculationDirection"] {
  if (value > 0.06) {
    return "counterclockwise";
  }

  if (value < -0.06) {
    return "clockwise";
  }

  return "none";
}

function resolveChargeDirection(
  value: number,
): MaxwellEquationsSynthesisSnapshot["electricFluxDirection"] {
  if (value > 0.06) {
    return "outward";
  }

  if (value < -0.06) {
    return "inward";
  }

  return "balanced";
}

function resolveChargeSignLabel(
  value: number,
): MaxwellEquationsSynthesisSnapshot["chargeSignLabel"] {
  if (value > 0.06) {
    return "positive";
  }

  if (value < -0.06) {
    return "negative";
  }

  return "neutral";
}

function resolveWaveState(
  magnitude: number,
  alignedFieldPair: boolean,
): MaxwellEquationsSynthesisSnapshot["waveStateLabel"] {
  if (magnitude < 0.08) {
    return "absent";
  }

  if (!alignedFieldPair) {
    return "misaligned";
  }

  if (magnitude >= 0.72) {
    return "strong";
  }

  return "partial";
}

function resolveAmpereBalance(
  currentContribution: number,
  displacementContribution: number,
): MaxwellEquationsSynthesisSnapshot["ampereBalanceLabel"] {
  const currentMagnitude = Math.abs(currentContribution);
  const displacementMagnitude = Math.abs(displacementContribution);

  if (currentMagnitude >= displacementMagnitude * 1.35) {
    return "current-dominated";
  }

  if (displacementMagnitude >= currentMagnitude * 1.35) {
    return "displacement-dominated";
  }

  return "shared";
}

function resolveTimeWindow(period: number) {
  return clamp(period * 3.2, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function resolveMaxwellEquationsSynthesisParams(
  source:
    | Partial<MaxwellEquationsSynthesisParams>
    | Record<string, number | boolean | string>,
): ResolvedMaxwellEquationsSynthesisParams {
  return {
    chargeSource: resolveSignedStrength(source.chargeSource, 1.1),
    conductionCurrent: resolveSignedStrength(source.conductionCurrent, 0.8),
    electricChangeRate: resolveSignedStrength(source.electricChangeRate, 0.9),
    magneticChangeRate: resolveSignedStrength(source.magneticChangeRate, 0.8),
    cycleRate: resolveCycleRate(source.cycleRate),
  };
}

export function sampleMaxwellEquationsSynthesisState(
  source:
    | Partial<MaxwellEquationsSynthesisParams>
    | Record<string, number | boolean | string>,
  time: number,
): MaxwellEquationsSynthesisSnapshot {
  const resolved = resolveMaxwellEquationsSynthesisParams(source);
  const displayTime = Math.max(0, safeNumber(time, 0));
  const period = 1 / Math.max(resolved.cycleRate, 1e-6);
  const phase = TAU * resolved.cycleRate * displayTime;
  const oscillation = Math.sin(phase);
  const electricChangeInstant = resolved.electricChangeRate * oscillation;
  const magneticFluxChange = resolved.magneticChangeRate * oscillation;
  const electricFlux = resolved.chargeSource;
  const magneticNetFlux = 0;
  const bCurrentContribution = resolved.conductionCurrent;
  const bDisplacementContribution = electricChangeInstant;
  const bCirculation = bCurrentContribution + bDisplacementContribution;
  const eCirculation = -magneticFluxChange;
  const closedLoopStrength = Math.max(
    Math.abs(bCirculation),
    Math.abs(magneticFluxChange) * 0.88,
  );
  const waveCueMagnitude = Math.min(
    Math.abs(electricChangeInstant),
    Math.abs(magneticFluxChange),
  );
  const alignedFieldPair =
    waveCueMagnitude >= 0.08 &&
    Math.sign(electricChangeInstant) === Math.sign(magneticFluxChange);
  const waveStateLabel = resolveWaveState(waveCueMagnitude, alignedFieldPair);
  const waveSignedCue =
    waveStateLabel === "absent"
      ? 0
      : alignedFieldPair
        ? waveCueMagnitude
        : -waveCueMagnitude * 0.55;

  return {
    time: displayTime,
    chargeSource: resolved.chargeSource,
    conductionCurrent: resolved.conductionCurrent,
    electricChangeRate: resolved.electricChangeRate,
    magneticChangeRate: resolved.magneticChangeRate,
    cycleRate: resolved.cycleRate,
    period,
    phase,
    electricFlux,
    magneticNetFlux,
    electricFluxDirection: resolveChargeDirection(electricFlux),
    chargeSignLabel: resolveChargeSignLabel(electricFlux),
    electricChangeInstant,
    magneticFluxChange,
    bCurrentContribution,
    bDisplacementContribution,
    bCirculation,
    eCirculation,
    bCirculationDirection: resolveLoopDirection(bCirculation),
    eCirculationDirection: resolveLoopDirection(eCirculation),
    closedLoopStrength,
    alignedFieldPair,
    waveCueMagnitude,
    waveSignedCue,
    waveStateLabel,
    ampereBalanceLabel: resolveAmpereBalance(
      bCurrentContribution,
      bDisplacementContribution,
    ),
  };
}

export function buildMaxwellEquationsSynthesisSeries(
  source:
    | Partial<MaxwellEquationsSynthesisParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveMaxwellEquationsSynthesisParams(source);
  const timeWindow = resolveTimeWindow(
    sampleMaxwellEquationsSynthesisState(resolved, 0).period,
  );

  return {
    "flux-laws": [
      sampleTimeSeries(
        "electric-flux",
        "Net electric flux",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) => sampleMaxwellEquationsSynthesisState(resolved, time).electricFlux,
        "#f16659",
      ),
      sampleTimeSeries(
        "magnetic-net-flux",
        "Net magnetic flux",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        () => 0,
        "#55636b",
      ),
    ],
    "ampere-maxwell-link": [
      sampleTimeSeries(
        "conduction-current",
        "Conduction current term",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) =>
          sampleMaxwellEquationsSynthesisState(resolved, time).bCurrentContribution,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "electric-change-term",
        "Changing-E term",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) =>
          sampleMaxwellEquationsSynthesisState(resolved, time).bDisplacementContribution,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "b-circulation",
        "Total B circulation",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) => sampleMaxwellEquationsSynthesisState(resolved, time).bCirculation,
        "#f0ab3c",
      ),
    ],
    "faraday-wave-link": [
      sampleTimeSeries(
        "magnetic-change",
        "Changing-B drive",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) => sampleMaxwellEquationsSynthesisState(resolved, time).magneticFluxChange,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "e-circulation",
        "Induced E circulation",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) => sampleMaxwellEquationsSynthesisState(resolved, time).eCirculation,
        "#f16659",
      ),
      sampleTimeSeries(
        "light-bridge",
        "Light bridge cue",
        0,
        timeWindow,
        GRAPH_SAMPLES,
        (time) => sampleMaxwellEquationsSynthesisState(resolved, time).waveSignedCue,
        "#1ea6a2",
      ),
    ],
  };
}

export function describeMaxwellEquationsSynthesisState(
  source:
    | Partial<MaxwellEquationsSynthesisParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleMaxwellEquationsSynthesisState(source, time);
  const waveClause =
    snapshot.waveStateLabel === "strong"
      ? "The changing electric and magnetic fields are aligned strongly enough to support a clear light-like field bridge."
      : snapshot.waveStateLabel === "partial"
        ? "The changing electric and magnetic fields support only a partial light-like bridge right now."
        : snapshot.waveStateLabel === "misaligned"
          ? "The changing electric and magnetic fields are present, but their current signs do not reinforce a clean light-like bridge."
          : "Without both changing-field terms present at the same moment, the light-like bridge collapses.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the enclosed charge is ${snapshot.chargeSignLabel}, so the net electric flux points ${snapshot.electricFluxDirection} while the net magnetic flux still stays ${formatNumber(snapshot.magneticNetFlux)}. Ampere-Maxwell gives total B circulation ${formatMeasurement(snapshot.bCirculation, "arb.")} from conduction current ${formatMeasurement(snapshot.bCurrentContribution, "arb.")} plus changing electric flux ${formatMeasurement(snapshot.bDisplacementContribution, "arb.")}, and Faraday gives E circulation ${formatMeasurement(snapshot.eCirculation, "arb.")} from changing magnetic flux ${formatMeasurement(snapshot.magneticFluxChange, "arb.")}. ${waveClause}`;
}
