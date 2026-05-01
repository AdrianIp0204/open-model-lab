import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type BasicCircuitsParams = {
  voltage?: number;
  resistanceA?: number;
  resistanceB?: number;
  parallelMode?: boolean;
};

export type BasicCircuitBranchSnapshot = {
  resistance: number;
  current: number;
  voltage: number;
  power: number;
};

export type BasicCircuitsSnapshot = {
  voltage: number;
  resistanceA: number;
  resistanceB: number;
  parallelMode: boolean;
  topology: "series" | "parallel";
  equivalentResistance: number;
  totalCurrent: number;
  totalPower: number;
  branchA: BasicCircuitBranchSnapshot;
  branchB: BasicCircuitBranchSnapshot;
  currentSplitA: number;
  currentSplitB: number;
  voltageShareA: number;
  voltageShareB: number;
  brighterBranch: "a" | "b" | "balanced";
};

export const BASIC_CIRCUITS_MIN_VOLTAGE = 3;
export const BASIC_CIRCUITS_MAX_VOLTAGE = 18;
export const BASIC_CIRCUITS_MIN_RESISTANCE = 2;
export const BASIC_CIRCUITS_MAX_RESISTANCE = 20;

const BASIC_CIRCUITS_CURRENT_GRAPH_MIN_VOLTAGE = 0;
const BASIC_CIRCUITS_GRAPH_SAMPLES = 121;

function resolveVoltage(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    BASIC_CIRCUITS_MIN_VOLTAGE,
    BASIC_CIRCUITS_MAX_VOLTAGE,
  );
}

function resolveResistance(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    BASIC_CIRCUITS_MIN_RESISTANCE,
    BASIC_CIRCUITS_MAX_RESISTANCE,
  );
}

function resolveParallelMode(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function buildSeriesData(
  id: string,
  label: string,
  xs: number[],
  sampleY: (value: number) => number,
  color: string,
  dashed = false,
) {
  return buildSeries(
    id,
    label,
    xs.map((x) => ({ x, y: sampleY(x) })),
    color,
    dashed,
  );
}

export function resolveBasicCircuitsParams(
  source: Partial<BasicCircuitsParams> | Record<string, number | boolean | string>,
): Required<BasicCircuitsParams> {
  return {
    voltage: resolveVoltage(source.voltage, 12),
    resistanceA: resolveResistance(source.resistanceA, 6),
    resistanceB: resolveResistance(source.resistanceB, 6),
    parallelMode: resolveParallelMode(source.parallelMode, false),
  };
}

export function sampleBasicCircuitsState(
  source: Partial<BasicCircuitsParams> | Record<string, number | boolean | string>,
  override?: Partial<BasicCircuitsParams>,
): BasicCircuitsSnapshot {
  const resolved = resolveBasicCircuitsParams({
    ...source,
    ...override,
  });

  const topology = resolved.parallelMode ? "parallel" : "series";
  const equivalentResistance = resolved.parallelMode
    ? (resolved.resistanceA * resolved.resistanceB) / (resolved.resistanceA + resolved.resistanceB)
    : resolved.resistanceA + resolved.resistanceB;
  const totalCurrent = resolved.voltage / Math.max(equivalentResistance, Number.EPSILON);
  const branchA: BasicCircuitBranchSnapshot = resolved.parallelMode
    ? {
        resistance: resolved.resistanceA,
        current: resolved.voltage / Math.max(resolved.resistanceA, Number.EPSILON),
        voltage: resolved.voltage,
        power:
          (resolved.voltage * resolved.voltage) /
          Math.max(resolved.resistanceA, Number.EPSILON),
      }
    : {
        resistance: resolved.resistanceA,
        current: totalCurrent,
        voltage: totalCurrent * resolved.resistanceA,
        power: totalCurrent * totalCurrent * resolved.resistanceA,
      };
  const branchB: BasicCircuitBranchSnapshot = resolved.parallelMode
    ? {
        resistance: resolved.resistanceB,
        current: resolved.voltage / Math.max(resolved.resistanceB, Number.EPSILON),
        voltage: resolved.voltage,
        power:
          (resolved.voltage * resolved.voltage) /
          Math.max(resolved.resistanceB, Number.EPSILON),
      }
    : {
        resistance: resolved.resistanceB,
        current: totalCurrent,
        voltage: totalCurrent * resolved.resistanceB,
        power: totalCurrent * totalCurrent * resolved.resistanceB,
      };
  const totalPower = resolved.voltage * totalCurrent;
  const currentSplitA =
    totalCurrent > Number.EPSILON ? branchA.current / totalCurrent : 0;
  const currentSplitB =
    totalCurrent > Number.EPSILON ? branchB.current / totalCurrent : 0;
  const voltageShareA =
    resolved.voltage > Number.EPSILON ? branchA.voltage / resolved.voltage : 0;
  const voltageShareB =
    resolved.voltage > Number.EPSILON ? branchB.voltage / resolved.voltage : 0;
  const powerDifference = Math.abs(branchA.power - branchB.power);

  return {
    voltage: resolved.voltage,
    resistanceA: resolved.resistanceA,
    resistanceB: resolved.resistanceB,
    parallelMode: resolved.parallelMode,
    topology,
    equivalentResistance,
    totalCurrent,
    totalPower,
    branchA,
    branchB,
    currentSplitA,
    currentSplitB,
    voltageShareA,
    voltageShareB,
    brighterBranch:
      powerDifference <= 0.08
        ? "balanced"
        : branchA.power > branchB.power
          ? "a"
          : "b",
  };
}

export function buildBasicCircuitsSeries(
  source: Partial<BasicCircuitsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveBasicCircuitsParams(source);
  const voltageSamples = sampleRange(
    BASIC_CIRCUITS_CURRENT_GRAPH_MIN_VOLTAGE,
    BASIC_CIRCUITS_MAX_VOLTAGE,
    BASIC_CIRCUITS_GRAPH_SAMPLES,
  );
  const resistanceSamples = sampleRange(
    BASIC_CIRCUITS_MIN_RESISTANCE,
    BASIC_CIRCUITS_MAX_RESISTANCE,
    BASIC_CIRCUITS_GRAPH_SAMPLES,
  );

  return {
    "current-map": [
      buildSeriesData(
        "total-current",
        "Total current",
        voltageSamples,
        (voltage) => sampleBasicCircuitsState(resolved, { voltage }).totalCurrent,
        "#1ea6a2",
      ),
      buildSeriesData(
        "branch-a-current",
        "Branch A current",
        voltageSamples,
        (voltage) => sampleBasicCircuitsState(resolved, { voltage }).branchA.current,
        "#f0ab3c",
      ),
      buildSeriesData(
        "branch-b-current",
        "Branch B current",
        voltageSamples,
        (voltage) => sampleBasicCircuitsState(resolved, { voltage }).branchB.current,
        "#4ea6df",
      ),
    ],
    "voltage-share": [
      buildSeriesData(
        "branch-a-voltage",
        "Branch A voltage",
        resistanceSamples,
        (resistanceB) =>
          sampleBasicCircuitsState(resolved, { resistanceB }).branchA.voltage,
        "#f0ab3c",
      ),
      buildSeriesData(
        "branch-b-voltage",
        "Branch B voltage",
        resistanceSamples,
        (resistanceB) =>
          sampleBasicCircuitsState(resolved, { resistanceB }).branchB.voltage,
        "#4ea6df",
      ),
    ],
  };
}

export function describeBasicCircuitsState(
  source: Partial<BasicCircuitsParams> | Record<string, number | boolean | string>,
) {
  const snapshot = sampleBasicCircuitsState(source);
  const topologyText =
    snapshot.topology === "series"
      ? "The circuit is in series, so the same current flows through both resistors."
      : "The circuit is in parallel, so both branches share the full battery voltage while the currents split and recombine.";
  const shareText =
    snapshot.topology === "series"
      ? `Branch A drops ${formatMeasurement(snapshot.branchA.voltage, "V")} and Branch B drops ${formatMeasurement(snapshot.branchB.voltage, "V")}.`
      : `Branch A carries ${formatMeasurement(snapshot.branchA.current, "A")} while Branch B carries ${formatMeasurement(snapshot.branchB.current, "A")}.`;
  const brightnessText =
    snapshot.brighterBranch === "balanced"
      ? "Both resistors dissipate similar power right now."
      : snapshot.brighterBranch === "a"
        ? "Branch A is dissipating more power right now."
        : "Branch B is dissipating more power right now.";

  return `A ${formatMeasurement(snapshot.voltage, "V")} battery drives resistor A = ${formatMeasurement(snapshot.resistanceA, "ohm")} and resistor B = ${formatMeasurement(snapshot.resistanceB, "ohm")}. The equivalent resistance is ${formatMeasurement(snapshot.equivalentResistance, "ohm")}, so the total current is ${formatMeasurement(snapshot.totalCurrent, "A")}. ${topologyText} ${shareText} ${brightnessText}`;
}
