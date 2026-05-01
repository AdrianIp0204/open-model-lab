import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { ControlValue, GraphSeriesMap } from "./types";

export type PressureHydrostaticParams = {
  force?: ControlValue;
  area?: ControlValue;
  density?: ControlValue;
  gravity?: ControlValue;
  depth?: ControlValue;
};

export type PressureHydrostaticSnapshot = {
  force: number;
  area: number;
  density: number;
  gravity: number;
  depth: number;
  surfacePressure: number;
  hydrostaticPressure: number;
  totalPressure: number;
  pressureGradient: number;
  surfacePressureRatio: number;
  hydrostaticPressureRatio: number;
  totalPressureRatio: number;
  areaRatio: number;
  densityRatio: number;
  gravityRatio: number;
  depthRatio: number;
  dominantContribution: "surface" | "hydrostatic" | "balanced";
  loadLabel: "light" | "moderate" | "strong";
  depthLabel: "shallow" | "mid-depth" | "deep";
  densityLabel: "light fluid" | "water-like fluid" | "dense fluid";
  gravityLabel: "weak gravity" | "earth-like gravity" | "strong gravity";
};

export const PRESSURE_HYDROSTATIC_MIN_FORCE = 200;
export const PRESSURE_HYDROSTATIC_MAX_FORCE = 1600;
export const PRESSURE_HYDROSTATIC_MIN_AREA = 0.08;
export const PRESSURE_HYDROSTATIC_MAX_AREA = 0.4;
export const PRESSURE_HYDROSTATIC_MIN_DENSITY = 600;
export const PRESSURE_HYDROSTATIC_MAX_DENSITY = 1400;
export const PRESSURE_HYDROSTATIC_MIN_GRAVITY = 5;
export const PRESSURE_HYDROSTATIC_MAX_GRAVITY = 12;
export const PRESSURE_HYDROSTATIC_MIN_DEPTH = 0.2;
export const PRESSURE_HYDROSTATIC_MAX_DEPTH = 4;

const RESPONSE_SAMPLES = 91;
const MAX_SURFACE_PRESSURE =
  PRESSURE_HYDROSTATIC_MAX_FORCE / PRESSURE_HYDROSTATIC_MIN_AREA / 1000;
const MAX_HYDROSTATIC_PRESSURE =
  (PRESSURE_HYDROSTATIC_MAX_DENSITY *
    PRESSURE_HYDROSTATIC_MAX_GRAVITY *
    PRESSURE_HYDROSTATIC_MAX_DEPTH) /
  1000;
const MAX_TOTAL_PRESSURE = MAX_SURFACE_PRESSURE + MAX_HYDROSTATIC_PRESSURE;

function resolveForce(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    PRESSURE_HYDROSTATIC_MIN_FORCE,
    PRESSURE_HYDROSTATIC_MAX_FORCE,
  );
}

function resolveArea(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    PRESSURE_HYDROSTATIC_MIN_AREA,
    PRESSURE_HYDROSTATIC_MAX_AREA,
  );
}

function resolveDensity(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    PRESSURE_HYDROSTATIC_MIN_DENSITY,
    PRESSURE_HYDROSTATIC_MAX_DENSITY,
  );
}

function resolveGravity(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    PRESSURE_HYDROSTATIC_MIN_GRAVITY,
    PRESSURE_HYDROSTATIC_MAX_GRAVITY,
  );
}

function resolveDepth(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    PRESSURE_HYDROSTATIC_MIN_DEPTH,
    PRESSURE_HYDROSTATIC_MAX_DEPTH,
  );
}

function computeSurfacePressure(force: number, area: number) {
  return force / area / 1000;
}

function computeHydrostaticPressure(density: number, gravity: number, depth: number) {
  return (density * gravity * depth) / 1000;
}

function describeDominantContribution(
  surfacePressure: number,
  hydrostaticPressure: number,
): PressureHydrostaticSnapshot["dominantContribution"] {
  if (surfacePressure > hydrostaticPressure * 1.15) {
    return "surface";
  }

  if (hydrostaticPressure > surfacePressure * 1.15) {
    return "hydrostatic";
  }

  return "balanced";
}

function classifyLoad(surfacePressure: number): PressureHydrostaticSnapshot["loadLabel"] {
  if (surfacePressure < 5) {
    return "light";
  }

  if (surfacePressure < 10) {
    return "moderate";
  }

  return "strong";
}

function classifyDepth(depth: number): PressureHydrostaticSnapshot["depthLabel"] {
  if (depth < 1.2) {
    return "shallow";
  }

  if (depth < 2.6) {
    return "mid-depth";
  }

  return "deep";
}

function classifyDensity(density: number): PressureHydrostaticSnapshot["densityLabel"] {
  if (density < 850) {
    return "light fluid";
  }

  if (density < 1100) {
    return "water-like fluid";
  }

  return "dense fluid";
}

function classifyGravity(gravity: number): PressureHydrostaticSnapshot["gravityLabel"] {
  if (gravity < 7) {
    return "weak gravity";
  }

  if (gravity < 10.5) {
    return "earth-like gravity";
  }

  return "strong gravity";
}

export function resolvePressureHydrostaticParams(
  params: PressureHydrostaticParams,
) {
  return {
    force: resolveForce(params.force, 720),
    area: resolveArea(params.area, 0.15),
    density: resolveDensity(params.density, 1000),
    gravity: resolveGravity(params.gravity, 9.8),
    depth: resolveDepth(params.depth, 1),
  };
}

export function samplePressureHydrostaticState(
  params: PressureHydrostaticParams,
  override?: Partial<PressureHydrostaticParams>,
): PressureHydrostaticSnapshot {
  const resolved = resolvePressureHydrostaticParams({
    ...params,
    ...override,
  });
  const surfacePressure = computeSurfacePressure(resolved.force, resolved.area);
  const hydrostaticPressure = computeHydrostaticPressure(
    resolved.density,
    resolved.gravity,
    resolved.depth,
  );
  const totalPressure = surfacePressure + hydrostaticPressure;
  const pressureGradient = (resolved.density * resolved.gravity) / 1000;

  return {
    ...resolved,
    surfacePressure,
    hydrostaticPressure,
    totalPressure,
    pressureGradient,
    surfacePressureRatio: clamp(surfacePressure / MAX_SURFACE_PRESSURE, 0, 1),
    hydrostaticPressureRatio: clamp(hydrostaticPressure / MAX_HYDROSTATIC_PRESSURE, 0, 1),
    totalPressureRatio: clamp(totalPressure / MAX_TOTAL_PRESSURE, 0, 1),
    areaRatio: clamp(
      (resolved.area - PRESSURE_HYDROSTATIC_MIN_AREA) /
        (PRESSURE_HYDROSTATIC_MAX_AREA - PRESSURE_HYDROSTATIC_MIN_AREA),
      0,
      1,
    ),
    densityRatio: clamp(
      (resolved.density - PRESSURE_HYDROSTATIC_MIN_DENSITY) /
        (PRESSURE_HYDROSTATIC_MAX_DENSITY - PRESSURE_HYDROSTATIC_MIN_DENSITY),
      0,
      1,
    ),
    gravityRatio: clamp(
      (resolved.gravity - PRESSURE_HYDROSTATIC_MIN_GRAVITY) /
        (PRESSURE_HYDROSTATIC_MAX_GRAVITY - PRESSURE_HYDROSTATIC_MIN_GRAVITY),
      0,
      1,
    ),
    depthRatio: clamp(
      (resolved.depth - PRESSURE_HYDROSTATIC_MIN_DEPTH) /
        (PRESSURE_HYDROSTATIC_MAX_DEPTH - PRESSURE_HYDROSTATIC_MIN_DEPTH),
      0,
      1,
    ),
    dominantContribution: describeDominantContribution(
      surfacePressure,
      hydrostaticPressure,
    ),
    loadLabel: classifyLoad(surfacePressure),
    depthLabel: classifyDepth(resolved.depth),
    densityLabel: classifyDensity(resolved.density),
    gravityLabel: classifyGravity(resolved.gravity),
  };
}

function buildResponseSeries(
  id: string,
  label: string,
  color: string,
  values: Array<{ x: number; y: number }>,
) {
  return buildSeries(id, label, values, color);
}

export function buildPressureHydrostaticSeries(
  params: PressureHydrostaticParams,
): GraphSeriesMap {
  const resolved = resolvePressureHydrostaticParams(params);

  return {
    "pressure-depth": [
      buildResponseSeries(
        "surface-pressure",
        "Surface pressure",
        "#f16659",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_DEPTH,
          PRESSURE_HYDROSTATIC_MAX_DEPTH,
          RESPONSE_SAMPLES,
        ).map((depth) => ({
          x: depth,
          y: samplePressureHydrostaticState(resolved, { depth }).surfacePressure,
        })),
      ),
      buildResponseSeries(
        "hydrostatic-pressure",
        "Hydrostatic gain",
        "#1ea6a2",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_DEPTH,
          PRESSURE_HYDROSTATIC_MAX_DEPTH,
          RESPONSE_SAMPLES,
        ).map((depth) => ({
          x: depth,
          y: samplePressureHydrostaticState(resolved, { depth }).hydrostaticPressure,
        })),
      ),
      buildResponseSeries(
        "total-pressure",
        "Probe pressure",
        "#0f1c24",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_DEPTH,
          PRESSURE_HYDROSTATIC_MAX_DEPTH,
          RESPONSE_SAMPLES,
        ).map((depth) => ({
          x: depth,
          y: samplePressureHydrostaticState(resolved, { depth }).totalPressure,
        })),
      ),
    ],
    "pressure-density": [
      buildResponseSeries(
        "surface-pressure",
        "Surface pressure",
        "#f16659",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_DENSITY,
          PRESSURE_HYDROSTATIC_MAX_DENSITY,
          RESPONSE_SAMPLES,
        ).map((density) => ({
          x: density,
          y: samplePressureHydrostaticState(resolved, { density }).surfacePressure,
        })),
      ),
      buildResponseSeries(
        "hydrostatic-pressure",
        "Hydrostatic gain",
        "#1ea6a2",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_DENSITY,
          PRESSURE_HYDROSTATIC_MAX_DENSITY,
          RESPONSE_SAMPLES,
        ).map((density) => ({
          x: density,
          y: samplePressureHydrostaticState(resolved, { density }).hydrostaticPressure,
        })),
      ),
      buildResponseSeries(
        "total-pressure",
        "Probe pressure",
        "#0f1c24",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_DENSITY,
          PRESSURE_HYDROSTATIC_MAX_DENSITY,
          RESPONSE_SAMPLES,
        ).map((density) => ({
          x: density,
          y: samplePressureHydrostaticState(resolved, { density }).totalPressure,
        })),
      ),
    ],
    "pressure-force": [
      buildResponseSeries(
        "surface-pressure",
        "Surface pressure",
        "#f16659",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_FORCE,
          PRESSURE_HYDROSTATIC_MAX_FORCE,
          RESPONSE_SAMPLES,
        ).map((force) => ({
          x: force,
          y: samplePressureHydrostaticState(resolved, { force }).surfacePressure,
        })),
      ),
      buildResponseSeries(
        "hydrostatic-pressure",
        "Hydrostatic gain",
        "#1ea6a2",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_FORCE,
          PRESSURE_HYDROSTATIC_MAX_FORCE,
          RESPONSE_SAMPLES,
        ).map((force) => ({
          x: force,
          y: samplePressureHydrostaticState(resolved, { force }).hydrostaticPressure,
        })),
      ),
      buildResponseSeries(
        "total-pressure",
        "Probe pressure",
        "#0f1c24",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_FORCE,
          PRESSURE_HYDROSTATIC_MAX_FORCE,
          RESPONSE_SAMPLES,
        ).map((force) => ({
          x: force,
          y: samplePressureHydrostaticState(resolved, { force }).totalPressure,
        })),
      ),
    ],
    "pressure-area": [
      buildResponseSeries(
        "surface-pressure",
        "Surface pressure",
        "#f16659",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_AREA,
          PRESSURE_HYDROSTATIC_MAX_AREA,
          RESPONSE_SAMPLES,
        ).map((area) => ({
          x: area,
          y: samplePressureHydrostaticState(resolved, { area }).surfacePressure,
        })),
      ),
      buildResponseSeries(
        "hydrostatic-pressure",
        "Hydrostatic gain",
        "#1ea6a2",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_AREA,
          PRESSURE_HYDROSTATIC_MAX_AREA,
          RESPONSE_SAMPLES,
        ).map((area) => ({
          x: area,
          y: samplePressureHydrostaticState(resolved, { area }).hydrostaticPressure,
        })),
      ),
      buildResponseSeries(
        "total-pressure",
        "Probe pressure",
        "#0f1c24",
        sampleRange(
          PRESSURE_HYDROSTATIC_MIN_AREA,
          PRESSURE_HYDROSTATIC_MAX_AREA,
          RESPONSE_SAMPLES,
        ).map((area) => ({
          x: area,
          y: samplePressureHydrostaticState(resolved, { area }).totalPressure,
        })),
      ),
    ],
  };
}

export function describePressureHydrostaticState(
  params: PressureHydrostaticParams,
) {
  const snapshot = samplePressureHydrostaticState(params);
  const contributionText =
    snapshot.dominantContribution === "surface"
      ? "The surface load is setting most of the probe reading, but the fluid still adds more pressure as depth increases."
      : snapshot.dominantContribution === "hydrostatic"
        ? "Most of the probe reading comes from the weight of the fluid above the probe, not from the surface load alone."
        : "The surface load and the fluid column are making comparable contributions to the probe reading.";
  const depthText =
    snapshot.depthLabel === "deep"
      ? "The probe is well below the surface, so pressure differences over an object's height would already be large enough to matter for a later buoyancy story."
      : snapshot.depthLabel === "shallow"
        ? "The probe is still near the surface, so the hydrostatic gain is present but not yet dominant."
        : "The probe is far enough below the surface for the hydrostatic trend to be easy to read without hiding the surface-pressure contribution.";

  return `A surface force of ${formatMeasurement(snapshot.force, "N")} spread over ${formatMeasurement(snapshot.area, "m^2")} creates ${formatMeasurement(snapshot.surfacePressure, "kPa")} of surface pressure. In a ${snapshot.densityLabel} at ${formatMeasurement(snapshot.gravity, "m/s^2")}, moving to depth ${formatMeasurement(snapshot.depth, "m")} adds ${formatMeasurement(snapshot.hydrostaticPressure, "kPa")}, so the probe reads ${formatMeasurement(snapshot.totalPressure, "kPa")}. The pressure gradient is ${formatMeasurement(snapshot.pressureGradient, "kPa/m")}. ${contributionText} ${depthText}`;
}

export function formatPressureHydrostaticContribution(
  snapshot: PressureHydrostaticSnapshot,
) {
  return `${formatMeasurement(snapshot.surfacePressure, "kPa")} + ${formatMeasurement(snapshot.hydrostaticPressure, "kPa")} = ${formatMeasurement(snapshot.totalPressure, "kPa")}`;
}

export function formatPressureHydrostaticSummary(
  snapshot: PressureHydrostaticSnapshot,
) {
  return `F = ${formatNumber(snapshot.force)} N, A = ${formatNumber(snapshot.area)} m^2, rho = ${formatNumber(snapshot.density)} kg/m^3, g = ${formatNumber(snapshot.gravity)} m/s^2, h = ${formatNumber(snapshot.depth)} m`;
}
