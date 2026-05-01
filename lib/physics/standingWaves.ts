import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";
import { TAU, clamp, formatMeasurement, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type StandingWavesParams = {
  amplitude: number;
  length: number;
  modeNumber: number;
  probeX: number;
};

export type StandingWavesSnapshot = {
  amplitude: number;
  length: number;
  modeNumber: number;
  time: number;
  wavelength: number;
  waveNumber: number;
  frequency: number;
  angularFrequency: number;
  period: number;
  nodeSpacing: number;
  nodePositions: number[];
  antinodePositions: number[];
  probeX: number;
  probeShapeValue: number;
  probeEnvelope: number;
  probeDisplacement: number;
  leftTravelDisplacement: number;
  rightTravelDisplacement: number;
  harmonicLabel: string;
  probeRegionLabel: "node" | "antinode" | "between";
};

export const STANDING_WAVES_WAVE_SPEED = 1.2;
export const STANDING_WAVES_MIN_LENGTH = 1.2;
export const STANDING_WAVES_MAX_LENGTH = 2.4;
export const STANDING_WAVES_MIN_MODE = 1;
export const STANDING_WAVES_MAX_MODE = 5;

const MIN_AMPLITUDE = 0.25;
const MAX_AMPLITUDE = 1.8;
const POSITION_SAMPLE_COUNT = 241;
const TIME_SAMPLE_COUNT = 241;
const MIN_TIME_WINDOW = 2.4;
const MAX_TIME_WINDOW = 6;

function clampModeNumber(modeNumber: number) {
  return Math.round(clamp(modeNumber, STANDING_WAVES_MIN_MODE, STANDING_WAVES_MAX_MODE));
}

export function formatStandingWavesHarmonicLabel(
  modeNumber: number,
  locale: AppLocale = "en",
) {
  if (locale === "zh-HK") {
    return modeNumber === 1 ? "基頻" : `第 ${modeNumber} 諧波`;
  }

  if (modeNumber === 1) {
    return "fundamental";
  }

  const remainder10 = modeNumber % 10;
  const remainder100 = modeNumber % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return `${modeNumber}st harmonic`;
  }

  if (remainder10 === 2 && remainder100 !== 12) {
    return `${modeNumber}nd harmonic`;
  }

  if (remainder10 === 3 && remainder100 !== 13) {
    return `${modeNumber}rd harmonic`;
  }

  return `${modeNumber}th harmonic`;
}

function classifyProbeRegion(amplitude: number, envelope: number) {
  if (amplitude <= 0) {
    return "between" as const;
  }

  const nodeThreshold = amplitude * 0.08;
  const antinodeThreshold = amplitude * 0.92;

  if (envelope <= nodeThreshold) {
    return "node" as const;
  }

  if (envelope >= antinodeThreshold) {
    return "antinode" as const;
  }

  return "between" as const;
}

export function resolveStandingWavesParams(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
): StandingWavesParams {
  const length = clamp(
    safeNumber(params.length, 1.6),
    STANDING_WAVES_MIN_LENGTH,
    STANDING_WAVES_MAX_LENGTH,
  );

  return {
    amplitude: clamp(safeNumber(params.amplitude, 1.1), MIN_AMPLITUDE, MAX_AMPLITUDE),
    length,
    modeNumber: clampModeNumber(safeNumber(params.modeNumber, 2)),
    probeX: clamp(safeNumber(params.probeX, length / 2), 0, length),
  };
}

export function sampleStandingWaveModeShape(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
  position: number,
) {
  const resolved = resolveStandingWavesParams(params);
  const x = clamp(position, 0, resolved.length);
  return resolved.amplitude * Math.sin((resolved.modeNumber * Math.PI * x) / resolved.length);
}

export function sampleStandingWaveEnvelope(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
  position: number,
) {
  return Math.abs(sampleStandingWaveModeShape(params, position));
}

export function getStandingWaveNodePositions(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
) {
  const resolved = resolveStandingWavesParams(params);
  const spacing = resolved.length / resolved.modeNumber;

  return Array.from({ length: resolved.modeNumber + 1 }, (_, index) => index * spacing);
}

export function getStandingWaveAntinodePositions(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
) {
  const resolved = resolveStandingWavesParams(params);
  const spacing = resolved.length / resolved.modeNumber;

  return Array.from(
    { length: resolved.modeNumber },
    (_, index) => spacing * (index + 0.5),
  );
}

export function sampleStandingWaveDisplacement(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveStandingWavesParams(params);
  const x = clamp(position, 0, resolved.length);
  const wavelength = (2 * resolved.length) / resolved.modeNumber;
  const frequency = STANDING_WAVES_WAVE_SPEED / wavelength;
  const angularFrequency = TAU * frequency;

  return (
    resolved.amplitude *
    Math.sin((resolved.modeNumber * Math.PI * x) / resolved.length) *
    Math.cos(angularFrequency * time)
  );
}

export function sampleStandingWavesState(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
  time: number,
  probeXOverride?: number,
): StandingWavesSnapshot {
  const resolved = resolveStandingWavesParams(params);
  const wavelength = (2 * resolved.length) / resolved.modeNumber;
  const frequency = STANDING_WAVES_WAVE_SPEED / wavelength;
  const angularFrequency = TAU * frequency;
  const period = 1 / Math.max(frequency, 1e-6);
  const waveNumber = Math.PI * resolved.modeNumber / resolved.length;
  const probeX = clamp(probeXOverride ?? resolved.probeX, 0, resolved.length);
  const probeShapeValue = Math.sin(waveNumber * probeX);
  const probeEnvelope = Math.abs(resolved.amplitude * probeShapeValue);
  const probeDisplacement = resolved.amplitude * probeShapeValue * Math.cos(angularFrequency * time);
  const leftTravelDisplacement =
    0.5 * resolved.amplitude * Math.sin(waveNumber * probeX - angularFrequency * time);
  const rightTravelDisplacement =
    0.5 * resolved.amplitude * Math.sin(waveNumber * probeX + angularFrequency * time);
  const nodePositions = getStandingWaveNodePositions(resolved);
  const antinodePositions = getStandingWaveAntinodePositions(resolved);

  return {
    amplitude: resolved.amplitude,
    length: resolved.length,
    modeNumber: resolved.modeNumber,
    time,
    wavelength,
    waveNumber,
    frequency,
    angularFrequency,
    period,
    nodeSpacing: resolved.length / resolved.modeNumber,
    nodePositions,
    antinodePositions,
    probeX,
    probeShapeValue,
    probeEnvelope,
    probeDisplacement,
    leftTravelDisplacement,
    rightTravelDisplacement,
    harmonicLabel: formatStandingWavesHarmonicLabel(resolved.modeNumber),
    probeRegionLabel: classifyProbeRegion(resolved.amplitude, probeEnvelope),
  };
}

function resolveTimeWindow(period: number) {
  return clamp(period * 3.5, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function buildStandingWavesSeries(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolveStandingWavesParams(params);
  const snapshot = sampleStandingWavesState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);
  const times = sampleRange(0, timeWindow, TIME_SAMPLE_COUNT);

  return {
    shape: [
      buildSeries(
        "mode-shape",
        copyText(locale, "Mode shape", "模態形狀"),
        sampleRange(0, resolved.length, POSITION_SAMPLE_COUNT).map((position) => ({
          x: position,
          y: sampleStandingWaveModeShape(resolved, position),
        })),
        "#1ea6a2",
      ),
    ],
    displacement: [
      sampleTimeSeries(
        "probe",
        copyText(locale, "Probe motion", "探針運動"),
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleStandingWavesState(resolved, time).probeDisplacement,
        "#f16659",
      ),
      buildSeries(
        "upper-envelope",
        copyText(locale, "Probe envelope +", "探針包絡線 +"),
        times.map((time) => ({
          x: time,
          y: snapshot.probeEnvelope,
        })),
        "#f0ab3c",
        true,
      ),
      buildSeries(
        "lower-envelope",
        copyText(locale, "Probe envelope -", "探針包絡線 -"),
        times.map((time) => ({
          x: time,
          y: -snapshot.probeEnvelope,
        })),
        "#f0ab3c",
        true,
      ),
    ],
  };
}

export function describeStandingWavesState(
  params: Partial<StandingWavesParams> | Record<string, number | boolean | string>,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleStandingWavesState(params, time);
  const harmonicLabel = formatStandingWavesHarmonicLabel(snapshot.modeNumber, locale);
  const probeRegionLabel =
    snapshot.probeRegionLabel === "between"
      ? copyText(locale, "an in-between point", "中間位置")
      : snapshot.probeRegionLabel === "node"
        ? copyText(locale, "a node", "一個節點")
        : copyText(locale, "an antinode", "一個腹點");

  if (locale === "zh-HK") {
    return `在 t = ${formatMeasurement(time, "s")} 時，駐波處於${harmonicLabel}，弦長為 ${formatMeasurement(snapshot.length, "m")}。允許的波長是 ${formatMeasurement(snapshot.wavelength, "m")}，而位於 x = ${formatMeasurement(snapshot.probeX, "m")} 的探針正處於${probeRegionLabel}。該處瞬時位移為 ${formatMeasurement(snapshot.probeDisplacement, "m")}，對應的振動包絡線為 ${formatMeasurement(snapshot.probeEnvelope, "m")}。`;
  }

  return `At t = ${formatMeasurement(time, "s")}, the standing wave is in the ${harmonicLabel} on a ${formatMeasurement(snapshot.length, "m")} string. The allowed wavelength is ${formatMeasurement(snapshot.wavelength, "m")} and the probe at x = ${formatMeasurement(snapshot.probeX, "m")} is at ${probeRegionLabel}. Its instantaneous displacement is ${formatMeasurement(snapshot.probeDisplacement, "m")} while its oscillation envelope there is ${formatMeasurement(snapshot.probeEnvelope, "m")}.`;
}
