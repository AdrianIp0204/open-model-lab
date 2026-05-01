import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";
import { clamp, formatMeasurement, safeNumber, sampleRange } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type BuoyancyArchimedesParams = {
  objectDensity?: ControlValue;
  fluidDensity?: ControlValue;
  gravity?: ControlValue;
  bottomDepth?: ControlValue;
};

export type BuoyancyArchimedesSnapshot = {
  objectDensity: number;
  fluidDensity: number;
  gravity: number;
  bottomDepth: number;
  objectHeight: number;
  objectVolume: number;
  crossSectionArea: number;
  topDepth: number;
  submergedHeight: number;
  submergedFraction: number;
  displacedVolume: number;
  weight: number;
  buoyantForce: number;
  netForce: number;
  supportForce: number;
  requiredSubmergedFraction: number;
  equilibriumBottomDepth: number;
  equilibriumBottomDepthClamped: number;
  topPressure: number;
  bottomPressure: number;
  pressureDifference: number;
  fullySubmerged: boolean;
  canFloat: boolean;
  floatState: "floats" | "neutral" | "sinks";
  supportState: "balanced" | "upward-support" | "downward-hold";
  immersionLabel: "partly submerged" | "just fully submerged" | "fully submerged";
  densityContrastLabel:
    | "object lighter than fluid"
    | "matched densities"
    | "object denser than fluid";
  objectDensityRatio: number;
  fluidDensityRatio: number;
  depthRatio: number;
  submergedRatio: number;
  buoyantForceRatio: number;
  weightRatio: number;
  netForceRatio: number;
};

export const BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY = 200;
export const BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY = 1600;
export const BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY = 500;
export const BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY = 1400;
export const BUOYANCY_ARCHIMEDES_MIN_GRAVITY = 5;
export const BUOYANCY_ARCHIMEDES_MAX_GRAVITY = 12;
export const BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH = 0.15;
export const BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH = 1.8;
export const BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT = 1;
export const BUOYANCY_ARCHIMEDES_OBJECT_VOLUME = 0.08;
export const BUOYANCY_ARCHIMEDES_CROSS_SECTION_AREA =
  BUOYANCY_ARCHIMEDES_OBJECT_VOLUME / BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT;

const RESPONSE_SAMPLES = 91;
const MAX_WEIGHT_FORCE =
  BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY *
  BUOYANCY_ARCHIMEDES_MAX_GRAVITY *
  BUOYANCY_ARCHIMEDES_OBJECT_VOLUME;
const MAX_BUOYANT_FORCE =
  BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY *
  BUOYANCY_ARCHIMEDES_MAX_GRAVITY *
  BUOYANCY_ARCHIMEDES_OBJECT_VOLUME;
const MAX_NET_FORCE = Math.max(MAX_WEIGHT_FORCE, MAX_BUOYANT_FORCE);

function resolveObjectDensity(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY,
    BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY,
  );
}

function resolveFluidDensity(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY,
    BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY,
  );
}

function resolveGravity(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    BUOYANCY_ARCHIMEDES_MIN_GRAVITY,
    BUOYANCY_ARCHIMEDES_MAX_GRAVITY,
  );
}

function resolveBottomDepth(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
    BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH,
  );
}

function classifyFloatState(
  requiredSubmergedFraction: number,
): BuoyancyArchimedesSnapshot["floatState"] {
  if (requiredSubmergedFraction < 0.98) {
    return "floats";
  }

  if (requiredSubmergedFraction > 1.02) {
    return "sinks";
  }

  return "neutral";
}

function classifySupportState(
  supportForce: number,
): BuoyancyArchimedesSnapshot["supportState"] {
  if (Math.abs(supportForce) <= 8) {
    return "balanced";
  }

  return supportForce > 0 ? "upward-support" : "downward-hold";
}

function classifyImmersion(
  bottomDepth: number,
  submergedHeight: number,
): BuoyancyArchimedesSnapshot["immersionLabel"] {
  if (submergedHeight < BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT - 0.02) {
    return "partly submerged";
  }

  if (bottomDepth <= BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT + 0.05) {
    return "just fully submerged";
  }

  return "fully submerged";
}

function classifyDensityContrast(
  objectDensity: number,
  fluidDensity: number,
): BuoyancyArchimedesSnapshot["densityContrastLabel"] {
  const ratio = objectDensity / fluidDensity;

  if (ratio < 0.98) {
    return "object lighter than fluid";
  }

  if (ratio > 1.02) {
    return "object denser than fluid";
  }

  return "matched densities";
}

export function resolveBuoyancyArchimedesParams(
  params: BuoyancyArchimedesParams,
) {
  return {
    objectDensity: resolveObjectDensity(params.objectDensity, 650),
    fluidDensity: resolveFluidDensity(params.fluidDensity, 1000),
    gravity: resolveGravity(params.gravity, 9.8),
    bottomDepth: resolveBottomDepth(params.bottomDepth, 0.65),
  };
}

export function sampleBuoyancyArchimedesState(
  params: BuoyancyArchimedesParams,
  override?: Partial<BuoyancyArchimedesParams>,
): BuoyancyArchimedesSnapshot {
  const resolved = resolveBuoyancyArchimedesParams({
    ...params,
    ...override,
  });
  const submergedHeight = clamp(
    resolved.bottomDepth,
    0,
    BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT,
  );
  const submergedFraction = submergedHeight / BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT;
  const topDepth = Math.max(resolved.bottomDepth - BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT, 0);
  const displacedVolume = BUOYANCY_ARCHIMEDES_OBJECT_VOLUME * submergedFraction;
  const weight =
    resolved.objectDensity * resolved.gravity * BUOYANCY_ARCHIMEDES_OBJECT_VOLUME;
  const buoyantForce = resolved.fluidDensity * resolved.gravity * displacedVolume;
  const netForce = buoyantForce - weight;
  const supportForce = weight - buoyantForce;
  const requiredSubmergedFraction = resolved.objectDensity / resolved.fluidDensity;
  const equilibriumBottomDepth =
    requiredSubmergedFraction * BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT;
  const topPressure = (resolved.fluidDensity * resolved.gravity * topDepth) / 1000;
  const bottomPressure = (resolved.fluidDensity * resolved.gravity * resolved.bottomDepth) / 1000;
  const pressureDifference = bottomPressure - topPressure;

  return {
    ...resolved,
    objectHeight: BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT,
    objectVolume: BUOYANCY_ARCHIMEDES_OBJECT_VOLUME,
    crossSectionArea: BUOYANCY_ARCHIMEDES_CROSS_SECTION_AREA,
    topDepth,
    submergedHeight,
    submergedFraction,
    displacedVolume,
    weight,
    buoyantForce,
    netForce,
    supportForce,
    requiredSubmergedFraction,
    equilibriumBottomDepth,
    equilibriumBottomDepthClamped: clamp(
      equilibriumBottomDepth,
      BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
      BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT,
    ),
    topPressure,
    bottomPressure,
    pressureDifference,
    fullySubmerged: submergedHeight >= BUOYANCY_ARCHIMEDES_OBJECT_HEIGHT - 1e-6,
    canFloat: requiredSubmergedFraction <= 1,
    floatState: classifyFloatState(requiredSubmergedFraction),
    supportState: classifySupportState(supportForce),
    immersionLabel: classifyImmersion(resolved.bottomDepth, submergedHeight),
    densityContrastLabel: classifyDensityContrast(
      resolved.objectDensity,
      resolved.fluidDensity,
    ),
    objectDensityRatio: clamp(
      (resolved.objectDensity - BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY) /
        (BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY - BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY),
      0,
      1,
    ),
    fluidDensityRatio: clamp(
      (resolved.fluidDensity - BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY) /
        (BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY - BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY),
      0,
      1,
    ),
    depthRatio: clamp(
      (resolved.bottomDepth - BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH) /
        (BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH - BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH),
      0,
      1,
    ),
    submergedRatio: clamp(submergedFraction, 0, 1),
    buoyantForceRatio: clamp(buoyantForce / MAX_BUOYANT_FORCE, 0, 1),
    weightRatio: clamp(weight / MAX_WEIGHT_FORCE, 0, 1),
    netForceRatio: clamp(Math.abs(netForce) / MAX_NET_FORCE, 0, 1),
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

export function buildBuoyancyArchimedesSeries(
  params: BuoyancyArchimedesParams,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolveBuoyancyArchimedesParams(params);

  return {
    "force-depth": [
      buildResponseSeries(
        "weight",
        copyText(locale, "Object weight", "物件重量"),
        "#f16659",
        sampleRange(
          BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
          BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH,
          RESPONSE_SAMPLES,
        ).map((bottomDepth) => ({
          x: bottomDepth,
          y: sampleBuoyancyArchimedesState(resolved, { bottomDepth }).weight,
        })),
      ),
      buildResponseSeries(
        "buoyant-force",
        copyText(locale, "Buoyant force", "浮力"),
        "#1ea6a2",
        sampleRange(
          BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
          BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH,
          RESPONSE_SAMPLES,
        ).map((bottomDepth) => ({
          x: bottomDepth,
          y: sampleBuoyancyArchimedesState(resolved, { bottomDepth }).buoyantForce,
        })),
      ),
    ],
    "force-fluid-density": [
      buildResponseSeries(
        "weight",
        copyText(locale, "Object weight", "物件重量"),
        "#f16659",
        sampleRange(
          BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY,
          BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY,
          RESPONSE_SAMPLES,
        ).map((fluidDensity) => ({
          x: fluidDensity,
          y: sampleBuoyancyArchimedesState(resolved, { fluidDensity }).weight,
        })),
      ),
      buildResponseSeries(
        "buoyant-force",
        copyText(locale, "Buoyant force", "浮力"),
        "#1ea6a2",
        sampleRange(
          BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY,
          BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY,
          RESPONSE_SAMPLES,
        ).map((fluidDensity) => ({
          x: fluidDensity,
          y: sampleBuoyancyArchimedesState(resolved, { fluidDensity }).buoyantForce,
        })),
      ),
    ],
    "required-fraction-object-density": [
      buildResponseSeries(
        "required-submerged-fraction",
        copyText(locale, "Required submerged fraction", "所需浸沒比例"),
        "#1ea6a2",
        sampleRange(
          BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY,
          BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY,
          RESPONSE_SAMPLES,
        ).map((objectDensity) => ({
          x: objectDensity,
          y: sampleBuoyancyArchimedesState(resolved, { objectDensity }).requiredSubmergedFraction,
        })),
      ),
      buildResponseSeries(
        "full-submersion-limit",
        copyText(locale, "Full-submersion limit", "完全浸沒上限"),
        "#0f1c24",
        sampleRange(
          BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY,
          BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY,
          RESPONSE_SAMPLES,
        ).map((objectDensity) => ({
          x: objectDensity,
          y: 1,
        })),
      ),
    ],
  };
}

export function describeBuoyancyArchimedesState(
  params: BuoyancyArchimedesParams,
  locale?: AppLocale,
) {
  const snapshot = sampleBuoyancyArchimedesState(params);
  if (locale === "zh-HK") {
    const balanceText =
      snapshot.supportState === "balanced"
        ? "在這個深度，浮力與重量已經平衡，所以方塊不需要額外支撐也可以停在這裡。"
        : snapshot.supportState === "downward-hold"
          ? "在這個深度，流體向上的推力比方塊重量更大，所以如果要讓它停在這裡，就需要額外向下壓住。"
          : "在這個深度，方塊的重量仍然大於排開流體所提供的浮力，所以若沒有額外向上的支撐，它會繼續下沉。";
    const immersionText = snapshot.fullySubmerged
      ? "方塊現在已經完全浸沒，再往更深的位置移動只會同時提高頂部和底部的壓力，不會改變壓差，也不會改變浮力。"
      : "方塊現在仍然只有部分浸沒，所以再往下壓會排開更多流體，浮力也會跟著增加。";

    return `密度為 ${formatMeasurement(snapshot.objectDensity, "kg/m^3")}、固定體積為 ${formatMeasurement(snapshot.objectVolume, "m^3")} 的方塊，重量是 ${formatMeasurement(snapshot.weight, "N")}。當方塊底部位於水面下 ${formatMeasurement(snapshot.bottomDepth, "m")} 時，方塊有 ${formatMeasurement(snapshot.submergedHeight, "m")} 浸沒，因此排開了 ${formatMeasurement(snapshot.displacedVolume, "m^3")} 的流體。在密度為 ${formatMeasurement(snapshot.fluidDensity, "kg/m^3")}、重力加速度為 ${formatMeasurement(snapshot.gravity, "m/s^2")} 的流體中，阿基米德原理給出的浮力是 ${formatMeasurement(snapshot.buoyantForce, "N")}，也就是所排開流體的重量。方塊頂部和底部之間的壓差是 ${formatMeasurement(snapshot.pressureDifference, "kPa")}。${balanceText}${immersionText}`;
  }
  const balanceText =
    snapshot.supportState === "balanced"
      ? "At this depth the buoyant force and weight are already balanced, so the block could stay here without extra support."
      : snapshot.supportState === "downward-hold"
        ? "At this depth the fluid is pushing up more strongly than the block weighs, so something would have to hold the block down."
        : "At this depth the block still weighs more than the displaced fluid, so something would have to support it upward or it would keep sinking.";
  const immersionText = snapshot.fullySubmerged
    ? "The block is fully submerged, so going deeper would raise the top and bottom pressures together without changing their difference or the buoyant force."
    : "The block is only partly submerged, so pushing it deeper would displace more fluid and raise the buoyant force.";

  return `A block with density ${formatMeasurement(snapshot.objectDensity, "kg/m^3")} and fixed volume ${formatMeasurement(snapshot.objectVolume, "m^3")} weighs ${formatMeasurement(snapshot.weight, "N")}. With its bottom ${formatMeasurement(snapshot.bottomDepth, "m")} below the surface, ${formatMeasurement(snapshot.submergedHeight, "m")} of the block is submerged, so it displaces ${formatMeasurement(snapshot.displacedVolume, "m^3")} of fluid. In a fluid of density ${formatMeasurement(snapshot.fluidDensity, "kg/m^3")} at ${formatMeasurement(snapshot.gravity, "m/s^2")}, Archimedes' principle gives a buoyant force of ${formatMeasurement(snapshot.buoyantForce, "N")}, which matches the weight of the displaced fluid. The pressure difference from top to bottom is ${formatMeasurement(snapshot.pressureDifference, "kPa")}. ${balanceText} ${immersionText}`;
}
