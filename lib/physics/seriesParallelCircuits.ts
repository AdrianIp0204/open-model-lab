import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type SeriesParallelCircuitsParams = {
  voltage?: ControlValue;
  resistanceA?: ControlValue;
  resistanceB?: ControlValue;
  parallelMode?: ControlValue;
};

export type SeriesParallelBranchSnapshot = {
  resistance: number;
  current: number;
  voltage: number;
  power: number;
  charge: number;
  powerRatio: number;
  brightnessLabel: "dim" | "warm" | "bright" | "very bright";
};

export type SeriesParallelCircuitsSnapshot = {
  time: number;
  voltage: number;
  resistanceA: number;
  resistanceB: number;
  parallelMode: boolean;
  topology: "series" | "parallel";
  equivalentResistance: number;
  totalCurrent: number;
  totalPower: number;
  totalCharge: number;
  branchA: SeriesParallelBranchSnapshot;
  branchB: SeriesParallelBranchSnapshot;
  currentSplitA: number;
  currentSplitB: number;
  voltageShareA: number;
  voltageShareB: number;
  brighterLoad: "a" | "b" | "balanced";
};

export const SERIES_PARALLEL_CIRCUITS_MIN_VOLTAGE = 4;
export const SERIES_PARALLEL_CIRCUITS_MAX_VOLTAGE = 18;
export const SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE = 2;
export const SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE = 18;
export const SERIES_PARALLEL_CIRCUITS_MAX_TIME = 12;

const GRAPH_SAMPLES = 121;
const MAX_LOAD_POWER =
  (SERIES_PARALLEL_CIRCUITS_MAX_VOLTAGE * SERIES_PARALLEL_CIRCUITS_MAX_VOLTAGE) /
  SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function resolveVoltage(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SERIES_PARALLEL_CIRCUITS_MIN_VOLTAGE,
    SERIES_PARALLEL_CIRCUITS_MAX_VOLTAGE,
  );
}

function resolveResistance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
    SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
  );
}

function resolveParallelMode(value: ControlValue | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, SERIES_PARALLEL_CIRCUITS_MAX_TIME);
}

function classifyBrightness(power: number): SeriesParallelBranchSnapshot["brightnessLabel"] {
  if (power < 6) {
    return "dim";
  }

  if (power < 15) {
    return "warm";
  }

  if (power < 28) {
    return "bright";
  }

  return "very bright";
}

function buildBranchSnapshot(
  resistance: number,
  current: number,
  voltage: number,
  time: number,
): SeriesParallelBranchSnapshot {
  const power = current * voltage;

  return {
    resistance,
    current,
    voltage,
    power,
    charge: current * time,
    powerRatio: clamp(power / MAX_LOAD_POWER, 0, 1),
    brightnessLabel: classifyBrightness(power),
  };
}

function buildResistanceResponseSeries(
  id: string,
  label: string,
  params: Required<SeriesParallelCircuitsParams>,
  sampleY: (snapshot: SeriesParallelCircuitsSnapshot) => number,
  color: string,
) {
  const resistanceSamples = sampleRange(
    SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
    SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
    GRAPH_SAMPLES,
  );

  return buildSeries(
    id,
    label,
    resistanceSamples.map((resistanceB) => ({
      x: resistanceB,
      y: sampleY(sampleSeriesParallelCircuitsState(params, 0, { resistanceB })),
    })),
    color,
  );
}

export function resolveSeriesParallelCircuitsParams(
  params: SeriesParallelCircuitsParams,
) {
  return {
    voltage: resolveVoltage(params.voltage, 12),
    resistanceA: resolveResistance(params.resistanceA, 6),
    resistanceB: resolveResistance(params.resistanceB, 6),
    parallelMode: resolveParallelMode(params.parallelMode, false),
  };
}

export function sampleSeriesParallelCircuitsState(
  params: SeriesParallelCircuitsParams,
  time = 0,
  override?: Partial<SeriesParallelCircuitsParams>,
): SeriesParallelCircuitsSnapshot {
  const resolved = resolveSeriesParallelCircuitsParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  const topology = resolved.parallelMode ? "parallel" : "series";
  const equivalentResistance = resolved.parallelMode
    ? (resolved.resistanceA * resolved.resistanceB) / (resolved.resistanceA + resolved.resistanceB)
    : resolved.resistanceA + resolved.resistanceB;
  const totalCurrent = resolved.voltage / Math.max(equivalentResistance, Number.EPSILON);
  const branchA = resolved.parallelMode
    ? buildBranchSnapshot(
        resolved.resistanceA,
        resolved.voltage / Math.max(resolved.resistanceA, Number.EPSILON),
        resolved.voltage,
        displayTime,
      )
    : buildBranchSnapshot(
        resolved.resistanceA,
        totalCurrent,
        totalCurrent * resolved.resistanceA,
        displayTime,
      );
  const branchB = resolved.parallelMode
    ? buildBranchSnapshot(
        resolved.resistanceB,
        resolved.voltage / Math.max(resolved.resistanceB, Number.EPSILON),
        resolved.voltage,
        displayTime,
      )
    : buildBranchSnapshot(
        resolved.resistanceB,
        totalCurrent,
        totalCurrent * resolved.resistanceB,
        displayTime,
      );
  const totalPower = branchA.power + branchB.power;
  const totalCharge = totalCurrent * displayTime;
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
    time: displayTime,
    voltage: resolved.voltage,
    resistanceA: resolved.resistanceA,
    resistanceB: resolved.resistanceB,
    parallelMode: resolved.parallelMode,
    topology,
    equivalentResistance,
    totalCurrent,
    totalPower,
    totalCharge,
    branchA,
    branchB,
    currentSplitA,
    currentSplitB,
    voltageShareA,
    voltageShareB,
    brighterLoad:
      powerDifference <= 0.08
        ? "balanced"
        : branchA.power > branchB.power
          ? "a"
          : "b",
  };
}

export function buildSeriesParallelCircuitsSeries(
  params: SeriesParallelCircuitsParams,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const normalized = resolveSeriesParallelCircuitsParams(params);

  return {
    "branch-current": [
      buildResistanceResponseSeries(
        "total-current",
        copyText(locale, "Total current", "總電流"),
        normalized,
        (snapshot) => snapshot.totalCurrent,
        "#1ea6a2",
      ),
      buildResistanceResponseSeries(
        "load-a-current",
        copyText(locale, "Load A current", "負載 A 電流"),
        normalized,
        (snapshot) => snapshot.branchA.current,
        "#f0ab3c",
      ),
      buildResistanceResponseSeries(
        "load-b-current",
        copyText(locale, "Load B current", "負載 B 電流"),
        normalized,
        (snapshot) => snapshot.branchB.current,
        "#4ea6df",
      ),
    ],
    "branch-voltage": [
      buildResistanceResponseSeries(
        "load-a-voltage",
        copyText(locale, "Load A voltage", "負載 A 電壓"),
        normalized,
        (snapshot) => snapshot.branchA.voltage,
        "#f0ab3c",
      ),
      buildResistanceResponseSeries(
        "load-b-voltage",
        copyText(locale, "Load B voltage", "負載 B 電壓"),
        normalized,
        (snapshot) => snapshot.branchB.voltage,
        "#4ea6df",
      ),
    ],
    "load-power": [
      buildResistanceResponseSeries(
        "load-a-power",
        copyText(locale, "Load A power", "負載 A 功率"),
        normalized,
        (snapshot) => snapshot.branchA.power,
        "#f16659",
      ),
      buildResistanceResponseSeries(
        "load-b-power",
        copyText(locale, "Load B power", "負載 B 功率"),
        normalized,
        (snapshot) => snapshot.branchB.power,
        "#1d6f9f",
      ),
    ],
  };
}

export function describeSeriesParallelCircuitsState(
  params: SeriesParallelCircuitsParams,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleSeriesParallelCircuitsState(params, time);
  const topologyText =
    snapshot.topology === "series"
      ? copyText(
          locale,
          "Series keeps the same current through both loads, so resistance changes redistribute voltage rather than splitting current.",
          "串聯會讓兩個負載流過相同的電流，因此電阻的改變會重新分配電壓，而不是分流電流。",
        )
      : copyText(
          locale,
          "Parallel keeps the same battery voltage across both loads, so each branch current follows its own resistance before recombining.",
          "並聯會讓兩個負載共用相同的電池電壓，因此每條支路會先依各自的電阻決定電流，再重新合流。",
        );
  const brightnessText =
    snapshot.brighterLoad === "balanced"
      ? copyText(locale, "Both loads are dissipating nearly the same power right now.", "目前兩個負載耗散的功率幾乎相同。")
      : snapshot.brighterLoad === "a"
        ? copyText(locale, "Load A is brighter because it is dissipating more power right now.", "負載 A 目前更亮，因為它耗散的功率較大。")
        : copyText(locale, "Load B is brighter because it is dissipating more power right now.", "負載 B 目前更亮，因為它耗散的功率較大。");

  return copyText(
    locale,
    `At t = ${formatMeasurement(snapshot.time, "s")}, a ${formatMeasurement(snapshot.voltage, "V")} source drives load A = ${formatMeasurement(snapshot.resistanceA, "ohm")} and load B = ${formatMeasurement(snapshot.resistanceB, "ohm")} in ${snapshot.topology} mode. The equivalent resistance is ${formatMeasurement(snapshot.equivalentResistance, "ohm")}, so the total current is ${formatMeasurement(snapshot.totalCurrent, "A")}. ${topologyText} Load A has ${formatMeasurement(snapshot.branchA.voltage, "V")} and ${formatMeasurement(snapshot.branchA.current, "A")}, while Load B has ${formatMeasurement(snapshot.branchB.voltage, "V")} and ${formatMeasurement(snapshot.branchB.current, "A")}. ${brightnessText}`,
    `在 t = ${formatMeasurement(snapshot.time, "s")} 時，${formatMeasurement(snapshot.voltage, "V")} 的電源會以 ${snapshot.topology === "series" ? "串聯" : "並聯"} 模式驅動負載 A = ${formatMeasurement(snapshot.resistanceA, "ohm")} 和負載 B = ${formatMeasurement(snapshot.resistanceB, "ohm")}。等效電阻是 ${formatMeasurement(snapshot.equivalentResistance, "ohm")}，因此總電流是 ${formatMeasurement(snapshot.totalCurrent, "A")}。${topologyText}負載 A 的電壓為 ${formatMeasurement(snapshot.branchA.voltage, "V")}、電流為 ${formatMeasurement(snapshot.branchA.current, "A")}；負載 B 的電壓為 ${formatMeasurement(snapshot.branchB.voltage, "V")}、電流為 ${formatMeasurement(snapshot.branchB.current, "A")}。${brightnessText}`,
  );
}
