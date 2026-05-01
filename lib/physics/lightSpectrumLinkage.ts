import { TAU, clamp, formatMeasurement, formatNumber, mapRange, sampleRange, safeNumber } from "./math";
import { sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type LightSpectrumBandId =
  | "gamma"
  | "x-ray"
  | "ultraviolet"
  | "visible"
  | "infrared"
  | "microwave"
  | "radio";

export type LightSpectrumVisibleColorId =
  | "violet"
  | "blue"
  | "cyan"
  | "green"
  | "yellow"
  | "orange"
  | "red";

export type LightSpectrumLinkageParams = {
  fieldAmplitude: number;
  logWavelength: number;
  mediumIndex: number;
  probeCycles: number;
};

export type LightSpectrumBand = {
  id: LightSpectrumBandId;
  label: string;
  shortLabel: string;
  minLogWavelength: number;
  maxLogWavelength: number;
  railColor: string;
  accentColor: string;
};

export type LightSpectrumLinkageSnapshot = {
  fieldAmplitude: number;
  logWavelength: number;
  vacuumWavelengthMeters: number;
  vacuumWavelengthNm: number;
  mediumIndex: number;
  phaseVelocityMetersPerSecond: number;
  phaseVelocityFractionC: number;
  mediumWavelengthMeters: number;
  mediumWavelengthNm: number;
  frequencyHz: number;
  periodSeconds: number;
  probeCycles: number;
  probeDistanceMeters: number;
  probeDistanceNm: number;
  travelDelaySeconds: number;
  phaseLagCycles: number;
  time: number;
  displayFrequency: number;
  displayPeriod: number;
  displayVacuumWavelength: number;
  displayMediumWavelength: number;
  sourceElectricField: number;
  sourceMagneticField: number;
  electricField: number;
  magneticField: number;
  bandId: LightSpectrumBandId;
  bandLabel: string;
  visibleColorId: LightSpectrumVisibleColorId | null;
  visibleColorLabel: string | null;
  visibleColorHex: string | null;
  isVisible: boolean;
  phaseAlignmentLabel: "in-phase" | "opposite-phase" | "offset";
  electricDirectionLabel: "up" | "down" | "near zero";
  magneticDirectionLabel: "out of page" | "into page" | "near zero";
};

export const SPEED_OF_LIGHT_METERS_PER_SECOND = 299_792_458;
export const LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN = -12;
export const LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX = 3;
export const LIGHT_SPECTRUM_VISIBLE_MIN_NM = 380;
export const LIGHT_SPECTRUM_VISIBLE_MAX_NM = 750;
export const LIGHT_SPECTRUM_STAGE_WINDOW = 1900;
export const LIGHT_SPECTRUM_DISPLAY_WAVELENGTH_MIN = 150;
export const LIGHT_SPECTRUM_DISPLAY_WAVELENGTH_MAX = 780;
export const LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE = 0.58;
export const LIGHT_SPECTRUM_TIME_WINDOW = 5.6;

const LIGHT_SPECTRUM_MIN_FIELD_AMPLITUDE = 0.7;
const LIGHT_SPECTRUM_MAX_FIELD_AMPLITUDE = 1.5;
const LIGHT_SPECTRUM_MIN_MEDIUM_INDEX = 1;
const LIGHT_SPECTRUM_MAX_MEDIUM_INDEX = 1.8;
const LIGHT_SPECTRUM_MIN_PROBE_CYCLES = 0.25;
const LIGHT_SPECTRUM_MAX_PROBE_CYCLES = 2;
const LIGHT_SPECTRUM_DISPLAY_FREQUENCY_MIN = 0.45;
const LIGHT_SPECTRUM_DISPLAY_FREQUENCY_MAX = 2.35;
const TIME_SAMPLE_COUNT = 241;
const POSITION_SAMPLE_COUNT = 241;

function log10(value: number) {
  return Math.log(value) / Math.log(10);
}

function visibleBoundaryLog(wavelengthNm: number) {
  return log10((wavelengthNm * 1e-9));
}

export const lightSpectrumBands: LightSpectrumBand[] = [
  {
    id: "gamma",
    label: "Gamma rays",
    shortLabel: "Gamma",
    minLogWavelength: LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
    maxLogWavelength: -11,
    railColor: "#6c3eb5",
    accentColor: "#8d5be7",
  },
  {
    id: "x-ray",
    label: "X-rays",
    shortLabel: "X-ray",
    minLogWavelength: -11,
    maxLogWavelength: -8,
    railColor: "#2e6fd4",
    accentColor: "#5e92e8",
  },
  {
    id: "ultraviolet",
    label: "Ultraviolet",
    shortLabel: "UV",
    minLogWavelength: -8,
    maxLogWavelength: visibleBoundaryLog(LIGHT_SPECTRUM_VISIBLE_MIN_NM),
    railColor: "#3e9fd1",
    accentColor: "#7dc3e8",
  },
  {
    id: "visible",
    label: "Visible light",
    shortLabel: "Visible",
    minLogWavelength: visibleBoundaryLog(LIGHT_SPECTRUM_VISIBLE_MIN_NM),
    maxLogWavelength: visibleBoundaryLog(LIGHT_SPECTRUM_VISIBLE_MAX_NM),
    railColor: "#f59e0b",
    accentColor: "#f97316",
  },
  {
    id: "infrared",
    label: "Infrared",
    shortLabel: "IR",
    minLogWavelength: visibleBoundaryLog(LIGHT_SPECTRUM_VISIBLE_MAX_NM),
    maxLogWavelength: -3,
    railColor: "#ef7c52",
    accentColor: "#f59f86",
  },
  {
    id: "microwave",
    label: "Microwave",
    shortLabel: "Microwave",
    minLogWavelength: -3,
    maxLogWavelength: -1,
    railColor: "#9a7448",
    accentColor: "#c39a67",
  },
  {
    id: "radio",
    label: "Radio",
    shortLabel: "Radio",
    minLogWavelength: -1,
    maxLogWavelength: LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    railColor: "#4b5563",
    accentColor: "#8f9aa8",
  },
];

function classifyPhaseAlignment(phaseLagCycles: number) {
  const wrapped = phaseLagCycles % 1;
  const normalized = wrapped < 0 ? wrapped + 1 : wrapped;

  if (normalized <= 0.08 || normalized >= 0.92) {
    return "in-phase" as const;
  }

  if (Math.abs(normalized - 0.5) <= 0.08) {
    return "opposite-phase" as const;
  }

  return "offset" as const;
}

function classifyElectricDirection(value: number) {
  if (value > 0.03) {
    return "up" as const;
  }

  if (value < -0.03) {
    return "down" as const;
  }

  return "near zero" as const;
}

function classifyMagneticDirection(value: number) {
  if (value > 0.03) {
    return "out of page" as const;
  }

  if (value < -0.03) {
    return "into page" as const;
  }

  return "near zero" as const;
}

export function resolveLightSpectrumBandId(logWavelength: number): LightSpectrumBandId {
  for (const band of lightSpectrumBands) {
    if (logWavelength < band.maxLogWavelength || band.id === "radio") {
      return band.id;
    }
  }

  return "radio";
}

export function getLightSpectrumBand(id: LightSpectrumBandId) {
  return lightSpectrumBands.find((band) => band.id === id) ?? lightSpectrumBands[0];
}

export function resolveVisibleColorId(
  vacuumWavelengthNm: number,
): LightSpectrumVisibleColorId | null {
  if (vacuumWavelengthNm < LIGHT_SPECTRUM_VISIBLE_MIN_NM || vacuumWavelengthNm > LIGHT_SPECTRUM_VISIBLE_MAX_NM) {
    return null;
  }

  if (vacuumWavelengthNm < 450) {
    return "violet";
  }

  if (vacuumWavelengthNm < 490) {
    return "blue";
  }

  if (vacuumWavelengthNm < 520) {
    return "cyan";
  }

  if (vacuumWavelengthNm < 570) {
    return "green";
  }

  if (vacuumWavelengthNm < 590) {
    return "yellow";
  }

  if (vacuumWavelengthNm < 620) {
    return "orange";
  }

  return "red";
}

export function getVisibleColorLabel(colorId: LightSpectrumVisibleColorId | null) {
  switch (colorId) {
    case "violet":
      return "violet";
    case "blue":
      return "blue";
    case "cyan":
      return "cyan";
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "orange":
      return "orange";
    case "red":
      return "red";
    default:
      return null;
  }
}

export function getVisibleColorHex(colorId: LightSpectrumVisibleColorId | null) {
  switch (colorId) {
    case "violet":
      return "#7c3aed";
    case "blue":
      return "#2563eb";
    case "cyan":
      return "#0891b2";
    case "green":
      return "#16a34a";
    case "yellow":
      return "#d97706";
    case "orange":
      return "#ea580c";
    case "red":
      return "#dc2626";
    default:
      return null;
  }
}

export function formatSpectrumWavelength(wavelengthMeters: number) {
  const abs = Math.abs(wavelengthMeters);

  if (abs >= 1_000) {
    return `${formatNumber(wavelengthMeters / 1_000)} km`;
  }

  if (abs >= 1) {
    return `${formatNumber(wavelengthMeters)} m`;
  }

  if (abs >= 1e-2) {
    return `${formatNumber(wavelengthMeters * 100)} cm`;
  }

  if (abs >= 1e-3) {
    return `${formatNumber(wavelengthMeters * 1e3)} mm`;
  }

  if (abs >= 1e-6) {
    return `${formatNumber(wavelengthMeters * 1e6)} um`;
  }

  if (abs >= 1e-9) {
    return `${formatNumber(wavelengthMeters * 1e9)} nm`;
  }

  if (abs >= 1e-12) {
    return `${formatNumber(wavelengthMeters * 1e12)} pm`;
  }

  return `${formatNumber(wavelengthMeters * 1e15)} fm`;
}

export function formatSpectrumFrequency(frequencyHz: number) {
  const abs = Math.abs(frequencyHz);

  if (abs >= 1e18) {
    return `${formatNumber(frequencyHz / 1e18)} EHz`;
  }

  if (abs >= 1e15) {
    return `${formatNumber(frequencyHz / 1e15)} PHz`;
  }

  if (abs >= 1e12) {
    return `${formatNumber(frequencyHz / 1e12)} THz`;
  }

  if (abs >= 1e9) {
    return `${formatNumber(frequencyHz / 1e9)} GHz`;
  }

  if (abs >= 1e6) {
    return `${formatNumber(frequencyHz / 1e6)} MHz`;
  }

  if (abs >= 1e3) {
    return `${formatNumber(frequencyHz / 1e3)} kHz`;
  }

  return `${formatNumber(frequencyHz)} Hz`;
}

export function formatSpeedFractionOfC(value: number) {
  return `${formatNumber(value)} c`;
}

export function resolveLightSpectrumLinkageParams(
  params:
    | Partial<LightSpectrumLinkageParams>
    | Record<string, number | boolean | string>,
): LightSpectrumLinkageParams {
  return {
    fieldAmplitude: clamp(
      safeNumber(params.fieldAmplitude, 1.05),
      LIGHT_SPECTRUM_MIN_FIELD_AMPLITUDE,
      LIGHT_SPECTRUM_MAX_FIELD_AMPLITUDE,
    ),
    logWavelength: clamp(
      safeNumber(params.logWavelength, visibleBoundaryLog(540)),
      LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
      LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    ),
    mediumIndex: clamp(
      safeNumber(params.mediumIndex, 1),
      LIGHT_SPECTRUM_MIN_MEDIUM_INDEX,
      LIGHT_SPECTRUM_MAX_MEDIUM_INDEX,
    ),
    probeCycles: clamp(
      safeNumber(params.probeCycles, 1),
      LIGHT_SPECTRUM_MIN_PROBE_CYCLES,
      LIGHT_SPECTRUM_MAX_PROBE_CYCLES,
    ),
  };
}

export function resolveLightSpectrumRailPosition(logWavelength: number) {
  return mapRange(
    clamp(logWavelength, LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN, LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX),
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    0,
    1,
  );
}

export function sampleLightSpectrumDisplayElectricField(
  params:
    | Partial<LightSpectrumLinkageParams>
    | Record<string, number | boolean | string>,
  displayPosition: number,
  time: number,
) {
  const resolved = resolveLightSpectrumLinkageParams(params);
  const displayWavelength = mapRange(
    resolved.logWavelength,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    LIGHT_SPECTRUM_DISPLAY_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_DISPLAY_WAVELENGTH_MAX,
  );
  const displayMediumWavelength = displayWavelength / resolved.mediumIndex;
  const displayFrequency = mapRange(
    resolved.logWavelength,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    LIGHT_SPECTRUM_DISPLAY_FREQUENCY_MAX,
    LIGHT_SPECTRUM_DISPLAY_FREQUENCY_MIN,
  );

  return resolved.fieldAmplitude * Math.sin(
    TAU * (displayPosition / Math.max(displayMediumWavelength, 1e-6) - displayFrequency * time),
  );
}

export function sampleLightSpectrumLinkageState(
  params:
    | Partial<LightSpectrumLinkageParams>
    | Record<string, number | boolean | string>,
  time: number,
  probeCyclesOverride?: number,
): LightSpectrumLinkageSnapshot {
  const resolved = resolveLightSpectrumLinkageParams(params);
  const probeCycles = clamp(
    probeCyclesOverride ?? resolved.probeCycles,
    LIGHT_SPECTRUM_MIN_PROBE_CYCLES,
    LIGHT_SPECTRUM_MAX_PROBE_CYCLES,
  );
  const vacuumWavelengthMeters = 10 ** resolved.logWavelength;
  const vacuumWavelengthNm = vacuumWavelengthMeters * 1e9;
  const frequencyHz = SPEED_OF_LIGHT_METERS_PER_SECOND / Math.max(vacuumWavelengthMeters, 1e-18);
  const periodSeconds = 1 / Math.max(frequencyHz, 1e-18);
  const phaseVelocityMetersPerSecond =
    SPEED_OF_LIGHT_METERS_PER_SECOND / Math.max(resolved.mediumIndex, 1e-6);
  const phaseVelocityFractionC = 1 / Math.max(resolved.mediumIndex, 1e-6);
  const mediumWavelengthMeters = vacuumWavelengthMeters / Math.max(resolved.mediumIndex, 1e-6);
  const mediumWavelengthNm = mediumWavelengthMeters * 1e9;
  const probeDistanceMeters = probeCycles * mediumWavelengthMeters;
  const probeDistanceNm = probeDistanceMeters * 1e9;
  const travelDelaySeconds = probeDistanceMeters / Math.max(phaseVelocityMetersPerSecond, 1e-12);
  const displayFrequency = mapRange(
    resolved.logWavelength,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    LIGHT_SPECTRUM_DISPLAY_FREQUENCY_MAX,
    LIGHT_SPECTRUM_DISPLAY_FREQUENCY_MIN,
  );
  const displayPeriod = 1 / Math.max(displayFrequency, 1e-6);
  const displayVacuumWavelength = mapRange(
    resolved.logWavelength,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_LOG_WAVELENGTH_MAX,
    LIGHT_SPECTRUM_DISPLAY_WAVELENGTH_MIN,
    LIGHT_SPECTRUM_DISPLAY_WAVELENGTH_MAX,
  );
  const displayMediumWavelength = displayVacuumWavelength / Math.max(resolved.mediumIndex, 1e-6);
  const sourceElectricField = resolved.fieldAmplitude * Math.sin(-TAU * displayFrequency * time);
  const sourceMagneticField =
    sourceElectricField * resolved.mediumIndex * LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE;
  const electricField = resolved.fieldAmplitude * Math.sin(
    TAU * (probeCycles - displayFrequency * time),
  );
  const magneticField =
    electricField * resolved.mediumIndex * LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE;
  const bandId = resolveLightSpectrumBandId(resolved.logWavelength);
  const band = getLightSpectrumBand(bandId);
  const visibleColorId = resolveVisibleColorId(vacuumWavelengthNm);

  return {
    fieldAmplitude: resolved.fieldAmplitude,
    logWavelength: resolved.logWavelength,
    vacuumWavelengthMeters,
    vacuumWavelengthNm,
    mediumIndex: resolved.mediumIndex,
    phaseVelocityMetersPerSecond,
    phaseVelocityFractionC,
    mediumWavelengthMeters,
    mediumWavelengthNm,
    frequencyHz,
    periodSeconds,
    probeCycles,
    probeDistanceMeters,
    probeDistanceNm,
    travelDelaySeconds,
    phaseLagCycles: probeCycles,
    time,
    displayFrequency,
    displayPeriod,
    displayVacuumWavelength,
    displayMediumWavelength,
    sourceElectricField,
    sourceMagneticField,
    electricField,
    magneticField,
    bandId,
    bandLabel: band.label,
    visibleColorId,
    visibleColorLabel: getVisibleColorLabel(visibleColorId),
    visibleColorHex: getVisibleColorHex(visibleColorId),
    isVisible: bandId === "visible",
    phaseAlignmentLabel: classifyPhaseAlignment(probeCycles),
    electricDirectionLabel: classifyElectricDirection(electricField),
    magneticDirectionLabel: classifyMagneticDirection(magneticField),
  };
}

export function buildLightSpectrumLinkageSeries(
  params:
    | Partial<LightSpectrumLinkageParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveLightSpectrumLinkageParams(params);

  return {
    "probe-fields": [
      sampleTimeSeries(
        "electric-probe",
        "E at probe",
        0,
        LIGHT_SPECTRUM_TIME_WINDOW,
        TIME_SAMPLE_COUNT,
        (time) => sampleLightSpectrumLinkageState(resolved, time).electricField,
        "#19a59c",
      ),
      sampleTimeSeries(
        "magnetic-probe",
        "B at probe (display)",
        0,
        LIGHT_SPECTRUM_TIME_WINDOW,
        TIME_SAMPLE_COUNT,
        (time) => sampleLightSpectrumLinkageState(resolved, time).magneticField,
        "#f59e0b",
      ),
    ],
    "source-probe": [
      sampleTimeSeries(
        "electric-source",
        "E at source",
        0,
        LIGHT_SPECTRUM_TIME_WINDOW,
        TIME_SAMPLE_COUNT,
        (time) => sampleLightSpectrumLinkageState(resolved, time).sourceElectricField,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "electric-probe",
        "E at probe",
        0,
        LIGHT_SPECTRUM_TIME_WINDOW,
        TIME_SAMPLE_COUNT,
        (time) => sampleLightSpectrumLinkageState(resolved, time).electricField,
        "#19a59c",
      ),
    ],
    "space-profile": [
      {
        id: "electric-profile",
        label: "E along display window",
        color: "#19a59c",
        points: sampleRange(0, LIGHT_SPECTRUM_STAGE_WINDOW, POSITION_SAMPLE_COUNT).map(
          (position) => ({
            x: position,
            y: sampleLightSpectrumDisplayElectricField(resolved, position, 0),
          }),
        ),
      },
      {
        id: "magnetic-profile",
        label: "B along display window",
        color: "#f59e0b",
        points: sampleRange(0, LIGHT_SPECTRUM_STAGE_WINDOW, POSITION_SAMPLE_COUNT).map(
          (position) => ({
            x: position,
            y:
              sampleLightSpectrumDisplayElectricField(resolved, position, 0) *
              resolved.mediumIndex *
              LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE,
          }),
        ),
      },
    ],
  };
}

export function describeLightSpectrumLinkageState(
  params:
    | Partial<LightSpectrumLinkageParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleLightSpectrumLinkageState(params, time);
  const visibilityText = snapshot.isVisible
    ? `${snapshot.visibleColorLabel} visible light`
    : snapshot.bandLabel.toLowerCase();

  return `At display t = ${formatMeasurement(time, "s")}, the current marker sits in ${visibilityText} with vacuum wavelength ${formatSpectrumWavelength(snapshot.vacuumWavelengthMeters)} and actual frequency ${formatSpectrumFrequency(snapshot.frequencyHz)}. In the selected medium n = ${formatNumber(snapshot.mediumIndex)}, the wave travels at ${formatSpeedFractionOfC(snapshot.phaseVelocityFractionC)} and the in-medium wavelength becomes ${formatSpectrumWavelength(snapshot.mediumWavelengthMeters)}. The probe is ${formatNumber(snapshot.probeCycles)} wavelengths downstream, so the field pair repeats there after ${formatMeasurement(snapshot.travelDelaySeconds, "s")}.`;
}
