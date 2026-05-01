import { clamp, formatMeasurement, mapRange, sampleRange, safeNumber, TAU } from "./math";
import { buildSeries } from "./series";
import {
  getVisibleColorHex,
  getVisibleColorLabel,
  resolveVisibleColorId,
} from "./lightSpectrumLinkage";
import type { GraphSeriesMap } from "./types";

export type PhotoelectricEffectParams = {
  frequencyPHz: number;
  intensity: number;
  workFunctionEv: number;
  collectorVoltage: number;
};

export type PhotoelectricEffectBandId = "infrared" | "visible" | "ultraviolet";

export type PhotoelectricEffectBand = {
  id: PhotoelectricEffectBandId;
  label: string;
  minFrequencyPHz: number;
  maxFrequencyPHz: number;
  railColor: string;
  accentColor: string;
};

export type PhotoelectricEffectSnapshot = {
  frequencyPHz: number;
  intensity: number;
  workFunctionEv: number;
  collectorVoltage: number;
  wavelengthNm: number;
  photonEnergyEv: number;
  thresholdFrequencyPHz: number;
  thresholdWavelengthNm: number;
  thresholdMarginEv: number;
  maxKineticEnergyEv: number;
  stoppingPotential: number;
  saturationCurrent: number;
  collectorCurrent: number;
  currentFraction: number;
  time: number;
  bandId: PhotoelectricEffectBandId;
  bandLabel: string;
  visibleColorLabel: string | null;
  beamColorHex: string;
  aboveThreshold: boolean;
  intensityFraction: number;
  packetSpeedFactor: number;
  emissionPulse: number;
  collectorAssistLabel:
    | "no emitted electrons"
    | "collector aids collection"
    | "retarding field trims the current"
    | "retarding field reaches the stopping point";
  currentRegimeLabel: "no emission" | "partial collection" | "saturation";
};

export const PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz = 0.3;
export const PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz = 1.8;
export const PHOTOELECTRIC_EFFECT_MIN_INTENSITY = 0.2;
export const PHOTOELECTRIC_EFFECT_MAX_INTENSITY = 1.8;
export const PHOTOELECTRIC_EFFECT_MIN_WORK_FUNCTION_EV = 1.8;
export const PHOTOELECTRIC_EFFECT_MAX_WORK_FUNCTION_EV = 4.6;
export const PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE = -4.5;
export const PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE = 1.5;
export const PHOTOELECTRIC_EFFECT_TIME_WINDOW = 4.8;

export const PHOTOELECTRIC_EV_PER_PHOTON_PHZ = 4.135667696;
export const PHOTOELECTRIC_LIGHT_SPEED_NM_PHZ = 299.792458;

const PHOTOELECTRIC_GRAPH_SAMPLES = 181;

export const photoelectricEffectBands: PhotoelectricEffectBand[] = [
  {
    id: "infrared",
    label: "Infrared",
    minFrequencyPHz: PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
    maxFrequencyPHz: 0.4,
    railColor: "#ef7c52",
    accentColor: "#f59e86",
  },
  {
    id: "visible",
    label: "Visible light",
    minFrequencyPHz: 0.4,
    maxFrequencyPHz: 0.79,
    railColor: "#f59e0b",
    accentColor: "#f97316",
  },
  {
    id: "ultraviolet",
    label: "Ultraviolet",
    minFrequencyPHz: 0.79,
    maxFrequencyPHz: PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
    railColor: "#5867ea",
    accentColor: "#7c8dff",
  },
];

function getPhotoelectricBandId(frequencyPHz: number): PhotoelectricEffectBandId {
  if (frequencyPHz < 0.4) {
    return "infrared";
  }

  if (frequencyPHz <= 0.79) {
    return "visible";
  }

  return "ultraviolet";
}

export function getPhotoelectricBand(id: PhotoelectricEffectBandId) {
  return (
    photoelectricEffectBands.find((band) => band.id === id) ?? photoelectricEffectBands[0]
  );
}

function resolveBeamColorHex(wavelengthNm: number, bandId: PhotoelectricEffectBandId) {
  const visibleColorId = resolveVisibleColorId(wavelengthNm);
  const visibleColorHex = getVisibleColorHex(visibleColorId);

  if (visibleColorHex) {
    return visibleColorHex;
  }

  if (bandId === "ultraviolet") {
    return "#6366f1";
  }

  return "#ea580c";
}

function resolveCollectorCurrentFraction(
  aboveThreshold: boolean,
  maxKineticEnergyEv: number,
  collectorVoltage: number,
) {
  if (!aboveThreshold) {
    return 0;
  }

  if (collectorVoltage >= 0) {
    return 1;
  }

  if (maxKineticEnergyEv <= 1e-6) {
    return 0;
  }

  return clamp(1 + collectorVoltage / maxKineticEnergyEv, 0, 1);
}

function resolveCollectorAssistLabel(
  aboveThreshold: boolean,
  collectorVoltage: number,
  currentFraction: number,
) {
  if (!aboveThreshold) {
    return "no emitted electrons" as const;
  }

  if (collectorVoltage >= 0.05) {
    return "collector aids collection" as const;
  }

  if (currentFraction <= 0.02) {
    return "retarding field reaches the stopping point" as const;
  }

  if (collectorVoltage <= -0.05) {
    return "retarding field trims the current" as const;
  }

  return "collector aids collection" as const;
}

function resolveCurrentRegimeLabel(
  aboveThreshold: boolean,
  currentFraction: number,
) {
  if (!aboveThreshold) {
    return "no emission" as const;
  }

  if (currentFraction < 0.98) {
    return "partial collection" as const;
  }

  return "saturation" as const;
}

export function resolvePhotoelectricFrequencyRailPosition(frequencyPHz: number) {
  return mapRange(
    clamp(
      frequencyPHz,
      PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
      PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
    ),
    PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
    PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
    0,
    1,
  );
}

export function resolvePhotoelectricEffectParams(
  params:
    | Partial<PhotoelectricEffectParams>
    | Record<string, number | boolean | string>,
): PhotoelectricEffectParams {
  return {
    frequencyPHz: clamp(
      safeNumber(params.frequencyPHz, 0.95),
      PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
      PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
    ),
    intensity: clamp(
      safeNumber(params.intensity, 1),
      PHOTOELECTRIC_EFFECT_MIN_INTENSITY,
      PHOTOELECTRIC_EFFECT_MAX_INTENSITY,
    ),
    workFunctionEv: clamp(
      safeNumber(params.workFunctionEv, 2.3),
      PHOTOELECTRIC_EFFECT_MIN_WORK_FUNCTION_EV,
      PHOTOELECTRIC_EFFECT_MAX_WORK_FUNCTION_EV,
    ),
    collectorVoltage: clamp(
      safeNumber(params.collectorVoltage, 0.4),
      PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
      PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
    ),
  };
}

export function samplePhotoelectricEffectState(
  params:
    | Partial<PhotoelectricEffectParams>
    | Record<string, number | boolean | string>,
  time = 0,
): PhotoelectricEffectSnapshot {
  const resolved = resolvePhotoelectricEffectParams(params);
  const wavelengthNm =
    PHOTOELECTRIC_LIGHT_SPEED_NM_PHZ / Math.max(resolved.frequencyPHz, 1e-6);
  const photonEnergyEv = resolved.frequencyPHz * PHOTOELECTRIC_EV_PER_PHOTON_PHZ;
  const thresholdFrequencyPHz =
    resolved.workFunctionEv / PHOTOELECTRIC_EV_PER_PHOTON_PHZ;
  const thresholdWavelengthNm =
    PHOTOELECTRIC_LIGHT_SPEED_NM_PHZ / Math.max(thresholdFrequencyPHz, 1e-6);
  const thresholdMarginEv = photonEnergyEv - resolved.workFunctionEv;
  const maxKineticEnergyEv = Math.max(0, thresholdMarginEv);
  const stoppingPotential = maxKineticEnergyEv;
  const aboveThreshold = thresholdMarginEv > 1e-6;
  const saturationCurrent = aboveThreshold ? resolved.intensity : 0;
  const currentFraction = resolveCollectorCurrentFraction(
    aboveThreshold,
    maxKineticEnergyEv,
    resolved.collectorVoltage,
  );
  const collectorCurrent = saturationCurrent * currentFraction;
  const bandId = getPhotoelectricBandId(resolved.frequencyPHz);
  const band = getPhotoelectricBand(bandId);
  const visibleColorId = resolveVisibleColorId(wavelengthNm);
  const intensityFraction = mapRange(
    resolved.intensity,
    PHOTOELECTRIC_EFFECT_MIN_INTENSITY,
    PHOTOELECTRIC_EFFECT_MAX_INTENSITY,
    0,
    1,
  );
  const kineticFraction = clamp(maxKineticEnergyEv / 3.2, 0, 1);

  return {
    frequencyPHz: resolved.frequencyPHz,
    intensity: resolved.intensity,
    workFunctionEv: resolved.workFunctionEv,
    collectorVoltage: resolved.collectorVoltage,
    wavelengthNm,
    photonEnergyEv,
    thresholdFrequencyPHz,
    thresholdWavelengthNm,
    thresholdMarginEv,
    maxKineticEnergyEv,
    stoppingPotential,
    saturationCurrent,
    collectorCurrent,
    currentFraction,
    time,
    bandId,
    bandLabel: band.label,
    visibleColorLabel: getVisibleColorLabel(visibleColorId),
    beamColorHex: resolveBeamColorHex(wavelengthNm, bandId),
    aboveThreshold,
    intensityFraction,
    packetSpeedFactor: 0.45 + kineticFraction * 0.95,
    emissionPulse:
      aboveThreshold
        ? 0.45 +
          0.55 * Math.sin(TAU * (0.6 + intensityFraction * 0.75) * time + intensityFraction)
        : 0,
    collectorAssistLabel: resolveCollectorAssistLabel(
      aboveThreshold,
      resolved.collectorVoltage,
      currentFraction,
    ),
    currentRegimeLabel: resolveCurrentRegimeLabel(aboveThreshold, currentFraction),
  };
}

export function buildPhotoelectricEffectSeries(
  params:
    | Partial<PhotoelectricEffectParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolvePhotoelectricEffectParams(params);
  const frequencySamples = sampleRange(
    PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
    PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
    PHOTOELECTRIC_GRAPH_SAMPLES,
  );
  const intensitySamples = sampleRange(
    PHOTOELECTRIC_EFFECT_MIN_INTENSITY,
    PHOTOELECTRIC_EFFECT_MAX_INTENSITY,
    PHOTOELECTRIC_GRAPH_SAMPLES,
  );
  const voltageSamples = sampleRange(
    PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
    PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
    PHOTOELECTRIC_GRAPH_SAMPLES,
  );

  return {
    "energy-balance": [
      buildSeries(
        "photon-energy",
        "Photon energy hf",
        frequencySamples.map((frequencyPHz) => ({
          x: frequencyPHz,
          y: samplePhotoelectricEffectState({ ...resolved, frequencyPHz }).photonEnergyEv,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "work-function",
        "Work function phi",
        frequencySamples.map((frequencyPHz) => ({
          x: frequencyPHz,
          y: samplePhotoelectricEffectState({ ...resolved, frequencyPHz }).workFunctionEv,
        })),
        "#f16659",
        true,
      ),
      buildSeries(
        "max-kinetic-energy",
        "Max KE",
        frequencySamples.map((frequencyPHz) => ({
          x: frequencyPHz,
          y: samplePhotoelectricEffectState({ ...resolved, frequencyPHz }).maxKineticEnergyEv,
        })),
        "#1ea6a2",
      ),
    ],
    "collector-sweep": [
      buildSeries(
        "collector-current",
        "Collected current",
        voltageSamples.map((collectorVoltage) => ({
          x: collectorVoltage,
          y: samplePhotoelectricEffectState({ ...resolved, collectorVoltage }).collectorCurrent,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "saturation-current",
        "Available current",
        voltageSamples.map((collectorVoltage) => ({
          x: collectorVoltage,
          y: samplePhotoelectricEffectState({ ...resolved, collectorVoltage }).saturationCurrent,
        })),
        "#1ea6a2",
        true,
      ),
    ],
    "intensity-sweep": [
      buildSeries(
        "emitted-rate",
        "Available current",
        intensitySamples.map((intensity) => ({
          x: intensity,
          y: samplePhotoelectricEffectState({ ...resolved, intensity }).saturationCurrent,
        })),
        "#f59e0b",
        true,
      ),
      buildSeries(
        "collected-rate",
        "Collected current",
        intensitySamples.map((intensity) => ({
          x: intensity,
          y: samplePhotoelectricEffectState({ ...resolved, intensity }).collectorCurrent,
        })),
        "#6366f1",
      ),
    ],
  };
}

export function describePhotoelectricEffectState(
  params:
    | Partial<PhotoelectricEffectParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = samplePhotoelectricEffectState(params, time);

  if (!snapshot.aboveThreshold) {
    return `At display t = ${formatMeasurement(time, "s")}, ${formatMeasurement(snapshot.frequencyPHz, "PHz")} light gives photon energy ${formatMeasurement(snapshot.photonEnergyEv, "eV")}, which is still below the work function ${formatMeasurement(snapshot.workFunctionEv, "eV")}. No electrons leave the metal, so the stopping potential and collected current both stay at zero even if the intensity is ${formatMeasurement(snapshot.intensity, "arb.")}.`;
  }

  return `At display t = ${formatMeasurement(time, "s")}, ${formatMeasurement(snapshot.frequencyPHz, "PHz")} light gives photon energy ${formatMeasurement(snapshot.photonEnergyEv, "eV")} against work function ${formatMeasurement(snapshot.workFunctionEv, "eV")}, so emitted electrons can leave with max kinetic energy ${formatMeasurement(snapshot.maxKineticEnergyEv, "eV")} and stopping potential ${formatMeasurement(snapshot.stoppingPotential, "V")}. The intensity sets an available current of ${formatMeasurement(snapshot.saturationCurrent, "arb.")}, while collector bias ${formatMeasurement(snapshot.collectorVoltage, "V")} leaves ${formatMeasurement(snapshot.collectorCurrent, "arb.")} reaching the collector.`;
}
