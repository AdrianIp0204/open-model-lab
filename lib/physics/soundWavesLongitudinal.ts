import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";
import { TAU, clamp, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type SoundWavesLongitudinalParams = {
  amplitude: number;
  waveSpeed: number;
  wavelength: number;
  frequency?: number;
  probeX: number;
};

export type SoundWavesLongitudinalSnapshot = {
  amplitude: number;
  waveSpeed: number;
  wavelength: number;
  probeX: number;
  time: number;
  frequency: number;
  period: number;
  waveNumber: number;
  angularFrequency: number;
  travelDelay: number;
  phaseLagCycles: number;
  phaseLagRadians: number;
  wrappedPhaseLag: number;
  sourceDisplacement: number;
  probeDisplacement: number;
  sourceCompression: number;
  probeCompression: number;
  normalizedProbeDisplacement: number;
  normalizedProbeCompression: number;
  compressionStrength: number;
  intensityCue: number;
  compressionLabel: "compression" | "rarefaction" | "transition";
  particleMotionLabel: "right" | "left" | "centered";
};

export const SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH = 8;
export const SOUND_WAVES_LONGITUDINAL_MIN_SPEED = 1.4;
export const SOUND_WAVES_LONGITUDINAL_MAX_SPEED = 4.2;
export const SOUND_WAVES_LONGITUDINAL_MIN_WAVELENGTH = 1.2;
export const SOUND_WAVES_LONGITUDINAL_MAX_WAVELENGTH = 3.6;
export const SOUND_WAVES_LONGITUDINAL_MIN_AMPLITUDE = 0.05;
export const SOUND_WAVES_LONGITUDINAL_MAX_AMPLITUDE = 0.24;

const POSITION_SAMPLE_COUNT = 241;
const TIME_SAMPLE_COUNT = 241;
const MIN_TIME_WINDOW = 2.4;
const MAX_TIME_WINDOW = 6;
const COMPRESSION_LABEL_THRESHOLD = 0.35;
const MOTION_LABEL_THRESHOLD = 0.08;

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function classifyCompression(normalizedCompression: number) {
  if (normalizedCompression >= COMPRESSION_LABEL_THRESHOLD) {
    return "compression" as const;
  }

  if (normalizedCompression <= -COMPRESSION_LABEL_THRESHOLD) {
    return "rarefaction" as const;
  }

  return "transition" as const;
}

function classifyParticleMotion(normalizedDisplacement: number) {
  if (normalizedDisplacement >= MOTION_LABEL_THRESHOLD) {
    return "right" as const;
  }

  if (normalizedDisplacement <= -MOTION_LABEL_THRESHOLD) {
    return "left" as const;
  }

  return "centered" as const;
}

export function resolveSoundWavesLongitudinalParams(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
): SoundWavesLongitudinalParams {
  const waveSpeed = clamp(
    safeNumber(params.waveSpeed, 2.4),
    SOUND_WAVES_LONGITUDINAL_MIN_SPEED,
    SOUND_WAVES_LONGITUDINAL_MAX_SPEED,
  );
  const rawWavelength = typeof params.wavelength === "number" ? params.wavelength : null;
  const rawFrequency = typeof params.frequency === "number" ? params.frequency : null;
  const derivedWavelength =
    rawWavelength && Number.isFinite(rawWavelength)
      ? rawWavelength
      : rawFrequency && Number.isFinite(rawFrequency) && rawFrequency > 0
        ? waveSpeed / rawFrequency
        : 1.8;
  const wavelength = clamp(
    derivedWavelength,
    SOUND_WAVES_LONGITUDINAL_MIN_WAVELENGTH,
    SOUND_WAVES_LONGITUDINAL_MAX_WAVELENGTH,
  );

  return {
    amplitude: clamp(
      safeNumber(params.amplitude, 0.12),
      SOUND_WAVES_LONGITUDINAL_MIN_AMPLITUDE,
      SOUND_WAVES_LONGITUDINAL_MAX_AMPLITUDE,
    ),
    waveSpeed,
    wavelength,
    probeX: clamp(
      safeNumber(params.probeX, 2.8),
      0,
      SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH,
    ),
  };
}

export function sampleSoundWavesLongitudinalDisplacement(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveSoundWavesLongitudinalParams(params);
  const x = clamp(position, 0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH);
  const phase = (TAU * x) / resolved.wavelength - TAU * (resolved.waveSpeed / resolved.wavelength) * time;

  return resolved.amplitude * Math.sin(phase);
}

export function sampleSoundWavesCompressionCue(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  position: number,
  time: number,
) {
  const resolved = resolveSoundWavesLongitudinalParams(params);
  const x = clamp(position, 0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH);
  const waveNumber = TAU / resolved.wavelength;
  const angularFrequency = TAU * (resolved.waveSpeed / resolved.wavelength);
  const phase = waveNumber * x - angularFrequency * time;

  return -resolved.amplitude * waveNumber * Math.cos(phase);
}

function normalizeCompressionCue(
  compression: number,
  waveNumber: number,
  amplitude: number,
) {
  const maxCompression = Math.max(Math.abs(waveNumber * amplitude), 1e-6);
  return clamp(compression / maxCompression, -1, 1);
}

function buildFeatureCenters(
  phaseOffset: number,
  wavelength: number,
) {
  const centers: number[] = [];
  const minIndex = Math.ceil((0 - phaseOffset) / wavelength);
  const maxIndex = Math.floor(
    (SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH - phaseOffset) / wavelength,
  );

  for (let index = minIndex; index <= maxIndex; index += 1) {
    const position = phaseOffset + index * wavelength;

    if (position >= 0 && position <= SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH) {
      centers.push(position);
    }
  }

  return centers;
}

export function getSoundWaveCompressionCenters(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const resolved = resolveSoundWavesLongitudinalParams(params);
  return buildFeatureCenters(
    resolved.waveSpeed * time + resolved.wavelength / 2,
    resolved.wavelength,
  );
}

export function getSoundWaveRarefactionCenters(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const resolved = resolveSoundWavesLongitudinalParams(params);
  return buildFeatureCenters(resolved.waveSpeed * time, resolved.wavelength);
}

export function sampleSoundWavesLongitudinalState(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  time: number,
  probeXOverride?: number,
): SoundWavesLongitudinalSnapshot {
  const resolved = resolveSoundWavesLongitudinalParams(params);
  const probeX = clamp(
    probeXOverride ?? resolved.probeX,
    0,
    SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH,
  );
  const frequency = resolved.waveSpeed / resolved.wavelength;
  const period = 1 / Math.max(frequency, 1e-6);
  const waveNumber = TAU / resolved.wavelength;
  const angularFrequency = TAU * frequency;
  const travelDelay = probeX / Math.max(resolved.waveSpeed, 1e-6);
  const phaseLagCycles = probeX / resolved.wavelength;
  const phaseLagRadians = TAU * phaseLagCycles;
  const wrappedPhaseLag = wrapAngle(phaseLagRadians);
  const sourceDisplacement = sampleSoundWavesLongitudinalDisplacement(resolved, 0, time);
  const probeDisplacement = sampleSoundWavesLongitudinalDisplacement(resolved, probeX, time);
  const sourceCompression = sampleSoundWavesCompressionCue(resolved, 0, time);
  const probeCompression = sampleSoundWavesCompressionCue(resolved, probeX, time);
  const normalizedProbeDisplacement = clamp(
    probeDisplacement / Math.max(resolved.amplitude, 1e-6),
    -1,
    1,
  );
  const normalizedProbeCompression = normalizeCompressionCue(
    probeCompression,
    waveNumber,
    resolved.amplitude,
  );
  const intensityCue = resolved.amplitude * resolved.amplitude;

  return {
    amplitude: resolved.amplitude,
    waveSpeed: resolved.waveSpeed,
    wavelength: resolved.wavelength,
    probeX,
    time,
    frequency,
    period,
    waveNumber,
    angularFrequency,
    travelDelay,
    phaseLagCycles,
    phaseLagRadians,
    wrappedPhaseLag,
    sourceDisplacement,
    probeDisplacement,
    sourceCompression,
    probeCompression,
    normalizedProbeDisplacement,
    normalizedProbeCompression,
    compressionStrength: Math.abs(resolved.amplitude * waveNumber),
    intensityCue,
    compressionLabel: classifyCompression(normalizedProbeCompression),
    particleMotionLabel: classifyParticleMotion(normalizedProbeDisplacement),
  };
}

function resolveTimeWindow(period: number) {
  return clamp(period * 4, MIN_TIME_WINDOW, MAX_TIME_WINDOW);
}

export function buildSoundWavesLongitudinalSeries(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolveSoundWavesLongitudinalParams(params);
  const snapshot = sampleSoundWavesLongitudinalState(resolved, 0);
  const timeWindow = resolveTimeWindow(snapshot.period);

  return {
    displacement: [
      sampleTimeSeries(
        "source",
        copyText(locale, "Source parcel", "聲源粒子"),
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleSoundWavesLongitudinalState(resolved, time).sourceDisplacement,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "probe",
        copyText(locale, "Probe parcel", "探針粒子"),
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleSoundWavesLongitudinalState(resolved, time).probeDisplacement,
        "#f16659",
      ),
    ],
    "probe-pressure": [
      sampleTimeSeries(
        "probe-shift",
        copyText(locale, "Probe shift / A", "探針位移 / A"),
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleSoundWavesLongitudinalState(resolved, time).normalizedProbeDisplacement,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "compression",
        copyText(locale, "Compression cue", "壓縮提示"),
        0,
        timeWindow,
        TIME_SAMPLE_COUNT,
        (time) => sampleSoundWavesLongitudinalState(resolved, time).normalizedProbeCompression,
        "#f0ab3c",
      ),
    ],
    "intensity-response": [
      buildSeries(
        "intensity-cue",
        copyText(locale, "Intensity cue ~ A^2", "強度提示 ~ A^2"),
        sampleRange(
          SOUND_WAVES_LONGITUDINAL_MIN_AMPLITUDE,
          SOUND_WAVES_LONGITUDINAL_MAX_AMPLITUDE,
          121,
        ).map((amplitude) => ({
          x: amplitude,
          y: amplitude * amplitude,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describeSoundWavesLongitudinalState(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  time: number,
  locale: AppLocale = "en",
) {
  const snapshot = sampleSoundWavesLongitudinalState(params, time);

  if (locale === "zh-HK") {
    return `在 t = ${formatMeasurement(time, "s")} 時，縱波以 ${formatMeasurement(snapshot.waveSpeed, "m/s")} 向右傳播，波長為 ${formatMeasurement(snapshot.wavelength, "m")}；因此訊源頻率為 ${formatMeasurement(snapshot.frequency, "Hz")}，週期為 ${formatMeasurement(snapshot.period, "s")}。位於 x = ${formatMeasurement(snapshot.probeX, "m")} 的追蹤粒子比訊源落後 ${formatNumber(snapshot.phaseLagCycles)} 個週期，對應傳播延遲為 ${formatMeasurement(snapshot.travelDelay, "s")}。該粒子的位移為 ${formatMeasurement(snapshot.probeDisplacement, "m")}，局部介質狀態為 ${copyText(locale, snapshot.compressionLabel, snapshot.compressionLabel === "compression" ? "壓縮" : snapshot.compressionLabel === "rarefaction" ? "疏鬆" : "過渡")}，而有界強度提示為 ${formatNumber(snapshot.intensityCue)}。`;
  }

  return `At t = ${formatMeasurement(time, "s")}, the longitudinal wave moves right at ${formatMeasurement(snapshot.waveSpeed, "m/s")} with wavelength ${formatMeasurement(snapshot.wavelength, "m")}, so the source frequency is ${formatMeasurement(snapshot.frequency, "Hz")} and the period is ${formatMeasurement(snapshot.period, "s")}. The tracked parcel at x = ${formatMeasurement(snapshot.probeX, "m")} is ${formatNumber(snapshot.phaseLagCycles)} cycles behind the source after a travel delay of ${formatMeasurement(snapshot.travelDelay, "s")}. That parcel is displaced ${formatMeasurement(snapshot.probeDisplacement, "m")}, the local medium state is ${snapshot.compressionLabel}, and the bounded intensity cue is ${formatNumber(snapshot.intensityCue)} in amplitude-squared units.`;
}

export function buildSoundWaveProfileSeries(
  params:
    | Partial<SoundWavesLongitudinalParams>
    | Record<string, number | boolean | string>,
  time: number,
  locale: AppLocale = "en",
) {
  const resolved = resolveSoundWavesLongitudinalParams(params);

  return buildSeries(
    "compression-profile",
    copyText(locale, "Compression profile", "壓縮分佈"),
    sampleRange(0, SOUND_WAVES_LONGITUDINAL_STAGE_LENGTH, POSITION_SAMPLE_COUNT).map(
      (position) => ({
        x: position,
        y: sampleSoundWavesCompressionCue(resolved, position, time),
      }),
    ),
    "#f0ab3c",
  );
}
