import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type HeatTransferParams = {
  hotTemperature?: ControlValue;
  ambientTemperature?: ControlValue;
  materialConductivity?: ControlValue;
  contactQuality?: ControlValue;
  surfaceArea?: ControlValue;
  airflow?: ControlValue;
};

export type HeatTransferSnapshot = {
  time: number;
  hotTemperature: number;
  ambientTemperature: number;
  materialConductivity: number;
  contactQuality: number;
  surfaceArea: number;
  airflow: number;
  contactPathStrength: number;
  temperatureContrast: number;
  conductionRate: number;
  convectionRate: number;
  radiationRate: number;
  totalRate: number;
  conductionEnergyTransferred: number;
  convectionEnergyTransferred: number;
  radiationEnergyTransferred: number;
  totalEnergyTransferred: number;
  conductionShare: number;
  convectionShare: number;
  radiationShare: number;
  directionLabel: "outward" | "inward" | "balanced";
  dominantPathway: "conduction" | "convection" | "radiation" | "balanced";
  hotTemperatureRatio: number;
  contrastRatio: number;
  rateMagnitudeRatio: number;
};

export const HEAT_TRANSFER_MIN_HOT_TEMPERATURE = 60;
export const HEAT_TRANSFER_MAX_HOT_TEMPERATURE = 180;
export const HEAT_TRANSFER_MIN_AMBIENT_TEMPERATURE = 5;
export const HEAT_TRANSFER_MAX_AMBIENT_TEMPERATURE = 90;
export const HEAT_TRANSFER_MIN_MATERIAL_CONDUCTIVITY = 0.4;
export const HEAT_TRANSFER_MAX_MATERIAL_CONDUCTIVITY = 2.2;
export const HEAT_TRANSFER_MIN_CONTACT_QUALITY = 0;
export const HEAT_TRANSFER_MAX_CONTACT_QUALITY = 1;
export const HEAT_TRANSFER_MIN_SURFACE_AREA = 0.6;
export const HEAT_TRANSFER_MAX_SURFACE_AREA = 1.8;
export const HEAT_TRANSFER_MIN_AIRFLOW = 0.3;
export const HEAT_TRANSFER_MAX_AIRFLOW = 2.1;
export const HEAT_TRANSFER_MAX_TIME = 60;

const GRAPH_SAMPLES = 121;
const RESPONSE_SAMPLES = 91;
const INTEGRATION_STEP = 0.2;
const HEAT_CAPACITY = 40;
const BASE_CONDUCTION = 0.18;
const BASE_CONVECTION = 0.09;
const BASE_RADIATION = 2.8e-10;
const RADIATION_EMISSIVITY = 0.82;
const REFERENCE_MAX_RATE = 180;

function resolveHotTemperature(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    HEAT_TRANSFER_MIN_HOT_TEMPERATURE,
    HEAT_TRANSFER_MAX_HOT_TEMPERATURE,
  );
}

function resolveAmbientTemperature(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    HEAT_TRANSFER_MIN_AMBIENT_TEMPERATURE,
    HEAT_TRANSFER_MAX_AMBIENT_TEMPERATURE,
  );
}

function resolveMaterialConductivity(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    HEAT_TRANSFER_MIN_MATERIAL_CONDUCTIVITY,
    HEAT_TRANSFER_MAX_MATERIAL_CONDUCTIVITY,
  );
}

function resolveContactQuality(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    HEAT_TRANSFER_MIN_CONTACT_QUALITY,
    HEAT_TRANSFER_MAX_CONTACT_QUALITY,
  );
}

function resolveSurfaceArea(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    HEAT_TRANSFER_MIN_SURFACE_AREA,
    HEAT_TRANSFER_MAX_SURFACE_AREA,
  );
}

function resolveAirflow(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    HEAT_TRANSFER_MIN_AIRFLOW,
    HEAT_TRANSFER_MAX_AIRFLOW,
  );
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, HEAT_TRANSFER_MAX_TIME);
}

function resolveDirectionLabel(totalRate: number): HeatTransferSnapshot["directionLabel"] {
  if (totalRate > 0.08) {
    return "outward";
  }

  if (totalRate < -0.08) {
    return "inward";
  }

  return "balanced";
}

function resolveDominantPathway(
  conductionRate: number,
  convectionRate: number,
  radiationRate: number,
): HeatTransferSnapshot["dominantPathway"] {
  const contributions = [
    { id: "conduction", value: Math.abs(conductionRate) },
    { id: "convection", value: Math.abs(convectionRate) },
    { id: "radiation", value: Math.abs(radiationRate) },
  ] as const;
  const totalMagnitude = contributions.reduce((sum, item) => sum + item.value, 0);

  if (totalMagnitude < 0.1) {
    return "balanced";
  }

  const dominant = contributions.reduce((best, current) =>
    current.value > best.value ? current : best,
  );

  if (dominant.value / totalMagnitude < 0.45) {
    return "balanced";
  }

  return dominant.id;
}

function resolveShares(
  conductionRate: number,
  convectionRate: number,
  radiationRate: number,
) {
  const totalMagnitude =
    Math.abs(conductionRate) + Math.abs(convectionRate) + Math.abs(radiationRate);

  if (totalMagnitude < 0.001) {
    return {
      conductionShare: 0,
      convectionShare: 0,
      radiationShare: 0,
    };
  }

  return {
    conductionShare: Math.abs(conductionRate) / totalMagnitude,
    convectionShare: Math.abs(convectionRate) / totalMagnitude,
    radiationShare: Math.abs(radiationRate) / totalMagnitude,
  };
}

function resolvePathRates(
  hotTemperature: number,
  ambientTemperature: number,
  params: ReturnType<typeof resolveHeatTransferParams>,
) {
  const temperatureContrast = hotTemperature - ambientTemperature;
  const contactPathStrength = params.materialConductivity * params.contactQuality;
  const hotKelvin = hotTemperature + 273.15;
  const ambientKelvin = ambientTemperature + 273.15;
  const conductionRate =
    BASE_CONDUCTION *
    params.materialConductivity *
    params.contactQuality *
    params.surfaceArea *
    temperatureContrast;
  const convectionRate =
    BASE_CONVECTION * params.airflow * params.surfaceArea * temperatureContrast;
  const radiationRate =
    BASE_RADIATION *
    RADIATION_EMISSIVITY *
    params.surfaceArea *
    (Math.pow(hotKelvin, 4) - Math.pow(ambientKelvin, 4));

  return {
    temperatureContrast,
    contactPathStrength,
    conductionRate,
    convectionRate,
    radiationRate,
    totalRate: conductionRate + convectionRate + radiationRate,
  };
}

export function resolveHeatTransferParams(params: HeatTransferParams) {
  return {
    hotTemperature: resolveHotTemperature(params.hotTemperature, 145),
    ambientTemperature: resolveAmbientTemperature(params.ambientTemperature, 25),
    materialConductivity: resolveMaterialConductivity(params.materialConductivity, 1.5),
    contactQuality: resolveContactQuality(params.contactQuality, 0.8),
    surfaceArea: resolveSurfaceArea(params.surfaceArea, 1.1),
    airflow: resolveAirflow(params.airflow, 1),
  };
}

export function sampleHeatTransferState(
  params: HeatTransferParams,
  time = 0,
  override?: Partial<HeatTransferParams>,
): HeatTransferSnapshot {
  const resolved = resolveHeatTransferParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  let hotTemperature = resolved.hotTemperature;
  let elapsed = 0;
  let conductionEnergyTransferred = 0;
  let convectionEnergyTransferred = 0;
  let radiationEnergyTransferred = 0;

  while (elapsed < displayTime - 1e-9) {
    const step = Math.min(INTEGRATION_STEP, displayTime - elapsed);
    const currentRates = resolvePathRates(
      hotTemperature,
      resolved.ambientTemperature,
      resolved,
    );

    conductionEnergyTransferred += currentRates.conductionRate * step;
    convectionEnergyTransferred += currentRates.convectionRate * step;
    radiationEnergyTransferred += currentRates.radiationRate * step;
    hotTemperature = clamp(
      hotTemperature - (currentRates.totalRate / HEAT_CAPACITY) * step,
      HEAT_TRANSFER_MIN_AMBIENT_TEMPERATURE,
      HEAT_TRANSFER_MAX_HOT_TEMPERATURE,
    );
    elapsed += step;
  }

  const finalRates = resolvePathRates(hotTemperature, resolved.ambientTemperature, resolved);
  const totalEnergyTransferred =
    conductionEnergyTransferred + convectionEnergyTransferred + radiationEnergyTransferred;
  const shares = resolveShares(
    finalRates.conductionRate,
    finalRates.convectionRate,
    finalRates.radiationRate,
  );

  return {
    time: displayTime,
    hotTemperature,
    ambientTemperature: resolved.ambientTemperature,
    materialConductivity: resolved.materialConductivity,
    contactQuality: resolved.contactQuality,
    surfaceArea: resolved.surfaceArea,
    airflow: resolved.airflow,
    contactPathStrength: finalRates.contactPathStrength,
    temperatureContrast: finalRates.temperatureContrast,
    conductionRate: finalRates.conductionRate,
    convectionRate: finalRates.convectionRate,
    radiationRate: finalRates.radiationRate,
    totalRate: finalRates.totalRate,
    conductionEnergyTransferred,
    convectionEnergyTransferred,
    radiationEnergyTransferred,
    totalEnergyTransferred,
    conductionShare: shares.conductionShare,
    convectionShare: shares.convectionShare,
    radiationShare: shares.radiationShare,
    directionLabel: resolveDirectionLabel(finalRates.totalRate),
    dominantPathway: resolveDominantPathway(
      finalRates.conductionRate,
      finalRates.convectionRate,
      finalRates.radiationRate,
    ),
    hotTemperatureRatio: clamp(
      (hotTemperature - HEAT_TRANSFER_MIN_HOT_TEMPERATURE) /
        (HEAT_TRANSFER_MAX_HOT_TEMPERATURE - HEAT_TRANSFER_MIN_HOT_TEMPERATURE),
      0,
      1,
    ),
    contrastRatio: clamp(
      Math.abs(finalRates.temperatureContrast) /
        (HEAT_TRANSFER_MAX_HOT_TEMPERATURE - HEAT_TRANSFER_MIN_AMBIENT_TEMPERATURE),
      0,
      1,
    ),
    rateMagnitudeRatio: clamp(Math.abs(finalRates.totalRate) / REFERENCE_MAX_RATE, 0, 1),
  };
}

function buildContactResponseSeries(
  id: string,
  label: string,
  params: ReturnType<typeof resolveHeatTransferParams>,
  sampleY: (snapshot: HeatTransferSnapshot) => number,
  color: string,
) {
  const samples = sampleRange(
    HEAT_TRANSFER_MIN_CONTACT_QUALITY,
    HEAT_TRANSFER_MAX_CONTACT_QUALITY,
    RESPONSE_SAMPLES,
  );

  return buildSeries(
    id,
    label,
    samples.map((contactQuality) => ({
      x: contactQuality,
      y: sampleY(
        sampleHeatTransferState(params, 0, {
          contactQuality,
        }),
      ),
    })),
    color,
  );
}

function buildContrastResponseSeries(
  id: string,
  label: string,
  params: ReturnType<typeof resolveHeatTransferParams>,
  sampleY: (snapshot: HeatTransferSnapshot) => number,
  color: string,
) {
  const maxContrast = Math.max(
    0,
    HEAT_TRANSFER_MAX_HOT_TEMPERATURE - params.ambientTemperature,
  );
  const contrastSamples = sampleRange(0, maxContrast, RESPONSE_SAMPLES);

  return buildSeries(
    id,
    label,
    contrastSamples.map((temperatureContrast) => ({
      x: temperatureContrast,
      y: sampleY(
        sampleHeatTransferState(params, 0, {
          hotTemperature: params.ambientTemperature + temperatureContrast,
        }),
      ),
    })),
    color,
  );
}

export function buildHeatTransferSeries(params: HeatTransferParams): GraphSeriesMap {
  const normalized = resolveHeatTransferParams(params);

  return {
    "temperature-history": [
      sampleTimeSeries(
        "hot-temperature",
        "Hot block",
        0,
        HEAT_TRANSFER_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleHeatTransferState(normalized, time).hotTemperature,
        "#f16659",
      ),
      sampleTimeSeries(
        "ambient-temperature",
        "Room and bench",
        0,
        HEAT_TRANSFER_MAX_TIME,
        GRAPH_SAMPLES,
        () => normalized.ambientTemperature,
        "#4ea6df",
      ),
    ],
    "pathway-rates": [
      sampleTimeSeries(
        "conduction-rate",
        "Conduction",
        0,
        HEAT_TRANSFER_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleHeatTransferState(normalized, time).conductionRate,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "convection-rate",
        "Convection",
        0,
        HEAT_TRANSFER_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleHeatTransferState(normalized, time).convectionRate,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "radiation-rate",
        "Radiation",
        0,
        HEAT_TRANSFER_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleHeatTransferState(normalized, time).radiationRate,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "total-rate",
        "Total rate",
        0,
        HEAT_TRANSFER_MAX_TIME,
        GRAPH_SAMPLES,
        (time) => sampleHeatTransferState(normalized, time).totalRate,
        "#f16659",
      ),
    ],
    "contact-response": [
      buildContactResponseSeries(
        "conduction-rate",
        "Conduction",
        normalized,
        (snapshot) => snapshot.conductionRate,
        "#1ea6a2",
      ),
      buildContactResponseSeries(
        "total-rate",
        "Total rate",
        normalized,
        (snapshot) => snapshot.totalRate,
        "#f16659",
      ),
    ],
    "contrast-response": [
      buildContrastResponseSeries(
        "conduction-rate",
        "Conduction",
        normalized,
        (snapshot) => snapshot.conductionRate,
        "#1ea6a2",
      ),
      buildContrastResponseSeries(
        "convection-rate",
        "Convection",
        normalized,
        (snapshot) => snapshot.convectionRate,
        "#4ea6df",
      ),
      buildContrastResponseSeries(
        "radiation-rate",
        "Radiation",
        normalized,
        (snapshot) => snapshot.radiationRate,
        "#f0ab3c",
      ),
      buildContrastResponseSeries(
        "total-rate",
        "Total rate",
        normalized,
        (snapshot) => snapshot.totalRate,
        "#f16659",
      ),
    ],
  };
}

export function describeHeatTransferState(params: HeatTransferParams, time: number) {
  const snapshot = sampleHeatTransferState(params, time);
  const directionNote =
    snapshot.directionLabel === "outward"
      ? "Energy is leaving the hotter block because it is above room temperature."
      : snapshot.directionLabel === "inward"
        ? "Energy is flowing into the block because the room is warmer than the block."
        : "The temperatures are nearly matched, so the net heat-transfer rate is close to zero.";
  const pathwayNote =
    snapshot.dominantPathway === "conduction"
      ? "Conduction is strongest here because the material-contact path is doing most of the transfer."
      : snapshot.dominantPathway === "convection"
        ? "Convection is strongest here because the moving air is carrying energy away faster than the other paths."
        : snapshot.dominantPathway === "radiation"
          ? "Radiation is strongest here because the temperature contrast is large even without a strong contact path."
          : "No single pathway dominates, so conduction, convection, and radiation stay comparatively split.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the block is at ${formatMeasurement(snapshot.hotTemperature, "degC")} while the room is ${formatMeasurement(snapshot.ambientTemperature, "degC")}, so the temperature contrast is ${formatMeasurement(snapshot.temperatureContrast, "degC")}. The pathway rates are ${formatMeasurement(snapshot.conductionRate, "u/s")} by conduction, ${formatMeasurement(snapshot.convectionRate, "u/s")} by convection, and ${formatMeasurement(snapshot.radiationRate, "u/s")} by radiation, for a total of ${formatMeasurement(snapshot.totalRate, "u/s")}. ${directionNote} ${pathwayNote}`;
}
