import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";
import type { AppLocale } from "@/i18n/routing";

export type EquivalentResistanceParams = {
  voltage?: ControlValue;
  resistance1?: ControlValue;
  resistance2?: ControlValue;
  resistance3?: ControlValue;
  groupParallel?: ControlValue;
};

export type EquivalentResistanceLoadSnapshot = {
  resistance: number;
  current: number;
  voltage: number;
  power: number;
  charge: number;
  powerRatio: number;
  brightnessLabel: "dim" | "warm" | "bright" | "very bright";
};

export type EquivalentResistanceSnapshot = {
  time: number;
  voltage: number;
  resistance1: number;
  resistance2: number;
  resistance3: number;
  groupParallel: boolean;
  groupMode: "series" | "parallel";
  groupEquivalentResistance: number;
  equivalentResistance: number;
  totalCurrent: number;
  totalPower: number;
  totalCharge: number;
  groupVoltage: number;
  groupPower: number;
  resistor1: EquivalentResistanceLoadSnapshot;
  resistor2: EquivalentResistanceLoadSnapshot;
  resistor3: EquivalentResistanceLoadSnapshot;
  currentSplit2: number;
  currentSplit3: number;
  voltageShare1: number;
  voltageShareGroup: number;
  dominantGroupLoad: "2" | "3" | "balanced";
};

export const EQUIVALENT_RESISTANCE_MIN_VOLTAGE = 4;
export const EQUIVALENT_RESISTANCE_MAX_VOLTAGE = 18;
export const EQUIVALENT_RESISTANCE_MIN_RESISTANCE = 2;
export const EQUIVALENT_RESISTANCE_MAX_RESISTANCE = 18;
export const EQUIVALENT_RESISTANCE_MAX_TIME = 12;

const GRAPH_SAMPLES = 121;
const MAX_LOAD_POWER =
  (EQUIVALENT_RESISTANCE_MAX_VOLTAGE * EQUIVALENT_RESISTANCE_MAX_VOLTAGE) /
  EQUIVALENT_RESISTANCE_MIN_RESISTANCE;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function resolveVoltage(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    EQUIVALENT_RESISTANCE_MIN_VOLTAGE,
    EQUIVALENT_RESISTANCE_MAX_VOLTAGE,
  );
}

function resolveResistance(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
    EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
  );
}

function resolveGroupParallel(value: ControlValue | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, EQUIVALENT_RESISTANCE_MAX_TIME);
}

function classifyBrightness(
  power: number,
): EquivalentResistanceLoadSnapshot["brightnessLabel"] {
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

function buildLoadSnapshot(
  resistance: number,
  current: number,
  voltage: number,
  time: number,
): EquivalentResistanceLoadSnapshot {
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
  params: Required<EquivalentResistanceParams>,
  sampleY: (snapshot: EquivalentResistanceSnapshot) => number,
  color: string,
) {
  const resistanceSamples = sampleRange(
    EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
    EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
    GRAPH_SAMPLES,
  );

  return buildSeries(
    id,
    label,
    resistanceSamples.map((resistance3) => ({
      x: resistance3,
      y: sampleY(sampleEquivalentResistanceState(params, 0, { resistance3 })),
    })),
    color,
  );
}

export function resolveEquivalentResistanceParams(
  params: EquivalentResistanceParams,
) {
  return {
    voltage: resolveVoltage(params.voltage, 12),
    resistance1: resolveResistance(params.resistance1, 4),
    resistance2: resolveResistance(params.resistance2, 6),
    resistance3: resolveResistance(params.resistance3, 6),
    groupParallel: resolveGroupParallel(params.groupParallel, false),
  };
}

export function sampleEquivalentResistanceState(
  params: EquivalentResistanceParams,
  time = 0,
  override?: Partial<EquivalentResistanceParams>,
): EquivalentResistanceSnapshot {
  const resolved = resolveEquivalentResistanceParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  const groupMode = resolved.groupParallel ? "parallel" : "series";
  const groupEquivalentResistance = resolved.groupParallel
    ? (resolved.resistance2 * resolved.resistance3) /
      (resolved.resistance2 + resolved.resistance3)
    : resolved.resistance2 + resolved.resistance3;
  const equivalentResistance = resolved.resistance1 + groupEquivalentResistance;
  const totalCurrent = resolved.voltage / Math.max(equivalentResistance, Number.EPSILON);
  const groupVoltage = totalCurrent * groupEquivalentResistance;
  const resistor1 = buildLoadSnapshot(
    resolved.resistance1,
    totalCurrent,
    totalCurrent * resolved.resistance1,
    displayTime,
  );
  const resistor2 = resolved.groupParallel
    ? buildLoadSnapshot(
        resolved.resistance2,
        groupVoltage / Math.max(resolved.resistance2, Number.EPSILON),
        groupVoltage,
        displayTime,
      )
    : buildLoadSnapshot(
        resolved.resistance2,
        totalCurrent,
        totalCurrent * resolved.resistance2,
        displayTime,
      );
  const resistor3 = resolved.groupParallel
    ? buildLoadSnapshot(
        resolved.resistance3,
        groupVoltage / Math.max(resolved.resistance3, Number.EPSILON),
        groupVoltage,
        displayTime,
      )
    : buildLoadSnapshot(
        resolved.resistance3,
        totalCurrent,
        totalCurrent * resolved.resistance3,
        displayTime,
      );
  const totalPower = resistor1.power + resistor2.power + resistor3.power;
  const groupPower = resistor2.power + resistor3.power;
  const totalCharge = totalCurrent * displayTime;
  const currentSplit2 =
    totalCurrent > Number.EPSILON ? resistor2.current / totalCurrent : 0;
  const currentSplit3 =
    totalCurrent > Number.EPSILON ? resistor3.current / totalCurrent : 0;
  const voltageShare1 =
    resolved.voltage > Number.EPSILON ? resistor1.voltage / resolved.voltage : 0;
  const voltageShareGroup =
    resolved.voltage > Number.EPSILON ? groupVoltage / resolved.voltage : 0;
  const powerDifference = Math.abs(resistor2.power - resistor3.power);

  return {
    time: displayTime,
    voltage: resolved.voltage,
    resistance1: resolved.resistance1,
    resistance2: resolved.resistance2,
    resistance3: resolved.resistance3,
    groupParallel: resolved.groupParallel,
    groupMode,
    groupEquivalentResistance,
    equivalentResistance,
    totalCurrent,
    totalPower,
    totalCharge,
    groupVoltage,
    groupPower,
    resistor1,
    resistor2,
    resistor3,
    currentSplit2,
    currentSplit3,
    voltageShare1,
    voltageShareGroup,
    dominantGroupLoad:
      powerDifference <= 0.08
        ? "balanced"
        : resistor2.power > resistor3.power
          ? "2"
          : "3",
  };
}

export function buildEquivalentResistanceSeries(
  params: EquivalentResistanceParams,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const normalized = resolveEquivalentResistanceParams(params);

  return {
    "equivalent-map": [
      buildResistanceResponseSeries(
        "group-equivalent",
        copyText(locale, "Grouped pair equivalent", "分組支路等效電阻"),
        normalized,
        (snapshot) => snapshot.groupEquivalentResistance,
        "#4ea6df",
      ),
      buildResistanceResponseSeries(
        "total-equivalent",
        copyText(locale, "Total equivalent", "總等效電阻"),
        normalized,
        (snapshot) => snapshot.equivalentResistance,
        "#1ea6a2",
      ),
    ],
    "current-map": [
      buildResistanceResponseSeries(
        "total-current",
        copyText(locale, "Total current", "總電流"),
        normalized,
        (snapshot) => snapshot.totalCurrent,
        "#1ea6a2",
      ),
      buildResistanceResponseSeries(
        "r2-current",
        copyText(locale, "R2 current", "R2 電流"),
        normalized,
        (snapshot) => snapshot.resistor2.current,
        "#f0ab3c",
      ),
      buildResistanceResponseSeries(
        "r3-current",
        copyText(locale, "R3 current", "R3 電流"),
        normalized,
        (snapshot) => snapshot.resistor3.current,
        "#4ea6df",
      ),
    ],
    "voltage-share": [
      buildResistanceResponseSeries(
        "r1-voltage",
        copyText(locale, "R1 voltage", "R1 電壓"),
        normalized,
        (snapshot) => snapshot.resistor1.voltage,
        "#f16659",
      ),
      buildResistanceResponseSeries(
        "group-voltage",
        copyText(locale, "Grouped block voltage", "分組區塊電壓"),
        normalized,
        (snapshot) => snapshot.groupVoltage,
        "#1ea6a2",
      ),
      buildResistanceResponseSeries(
        "r3-voltage",
        copyText(locale, "R3 voltage", "R3 電壓"),
        normalized,
        (snapshot) => snapshot.resistor3.voltage,
        "#4ea6df",
      ),
    ],
  };
}

export function describeEquivalentResistanceState(
  params: EquivalentResistanceParams,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleEquivalentResistanceState(params, time);
  const groupText =
    snapshot.groupMode === "parallel"
      ? copyText(
          locale,
          "The highlighted group is in parallel, so both grouped resistors share the same group voltage while their currents split and recombine.",
          "高亮的分組採並聯，因此兩個分組電阻共用同一組電壓，而電流會先分流再重新合併。",
        )
      : copyText(
          locale,
          "The highlighted group is in series, so the same current crosses both grouped resistors before you add that reduced block to R1.",
          "高亮的分組採串聯，因此同一股電流會先流過兩個分組電阻，再把這個化簡後的區塊與 R1 串接。",
        );
  const dominantLoadText =
    snapshot.dominantGroupLoad === "balanced"
      ? copyText(locale, "The grouped resistors are dissipating nearly the same power right now.", "目前分組中的兩個電阻耗散的功率幾乎相同。")
      : snapshot.dominantGroupLoad === "2"
        ? copyText(locale, "R2 is dissipating more power right now.", "目前 R2 耗散的功率較大。")
        : copyText(locale, "R3 is dissipating more power right now.", "目前 R3 耗散的功率較大。");

  return copyText(
    locale,
    `At t = ${formatMeasurement(snapshot.time, "s")}, a ${formatMeasurement(snapshot.voltage, "V")} source drives R1 = ${formatMeasurement(snapshot.resistance1, "ohm")} in series with a grouped pair of R2 = ${formatMeasurement(snapshot.resistance2, "ohm")} and R3 = ${formatMeasurement(snapshot.resistance3, "ohm")}. The grouped pair reduces to ${formatMeasurement(snapshot.groupEquivalentResistance, "ohm")}, so the total equivalent resistance is ${formatMeasurement(snapshot.equivalentResistance, "ohm")} and the total current is ${formatMeasurement(snapshot.totalCurrent, "A")}. ${groupText} The grouped block has ${formatMeasurement(snapshot.groupVoltage, "V")} across it. R2 carries ${formatMeasurement(snapshot.resistor2.current, "A")} and R3 carries ${formatMeasurement(snapshot.resistor3.current, "A")}. ${dominantLoadText}`,
    `在 t = ${formatMeasurement(snapshot.time, "s")} 時，${formatMeasurement(snapshot.voltage, "V")} 的電源會驅動 R1 = ${formatMeasurement(snapshot.resistance1, "ohm")}，並與由 R2 = ${formatMeasurement(snapshot.resistance2, "ohm")} 和 R3 = ${formatMeasurement(snapshot.resistance3, "ohm")} 組成的分組支路串聯。該分組可化簡為 ${formatMeasurement(snapshot.groupEquivalentResistance, "ohm")}，因此總等效電阻是 ${formatMeasurement(snapshot.equivalentResistance, "ohm")}，總電流是 ${formatMeasurement(snapshot.totalCurrent, "A")}。${groupText}該分組區塊兩端的電壓是 ${formatMeasurement(snapshot.groupVoltage, "V")}。R2 承載 ${formatMeasurement(snapshot.resistor2.current, "A")}，R3 承載 ${formatMeasurement(snapshot.resistor3.current, "A")}。${dominantLoadText}`,
  );
}
