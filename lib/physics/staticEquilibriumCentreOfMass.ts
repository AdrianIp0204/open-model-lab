import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type StaticEquilibriumCentreOfMassParams = {
  cargoMass?: number;
  cargoPosition?: number;
  supportCenter?: number;
  supportWidth?: number;
};

export type StaticEquilibriumCentreOfMassSnapshot = {
  plankMass: number;
  cargoMass: number;
  totalMass: number;
  gravity: number;
  totalWeight: number;
  cargoPosition: number;
  supportCenter: number;
  supportWidth: number;
  supportLeftEdge: number;
  supportRightEdge: number;
  centerOfMassX: number;
  supportOffset: number;
  torqueAboutSupportCenter: number;
  requiredLeftReaction: number;
  requiredRightReaction: number;
  actualLeftReaction: number;
  actualRightReaction: number;
  stabilityMargin: number;
  tipOverhang: number;
  supportBalanceLabel: "balanced" | "stable" | "tips-left" | "tips-right";
  activeSupportEdgeX: number | null;
  tipTorqueAboutEdge: number;
};

export const STATIC_EQUILIBRIUM_PLANK_HALF_LENGTH = 2;
export const STATIC_EQUILIBRIUM_PLANK_LENGTH = STATIC_EQUILIBRIUM_PLANK_HALF_LENGTH * 2;
export const STATIC_EQUILIBRIUM_PLANK_MASS = 4;
export const STATIC_EQUILIBRIUM_GRAVITY = 9.8;
export const STATIC_EQUILIBRIUM_MIN_CARGO_MASS = 0;
export const STATIC_EQUILIBRIUM_MAX_CARGO_MASS = 6;
export const STATIC_EQUILIBRIUM_MIN_CARGO_POSITION = -1.65;
export const STATIC_EQUILIBRIUM_MAX_CARGO_POSITION = 1.65;
export const STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER = -1.3;
export const STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER = 1.3;
export const STATIC_EQUILIBRIUM_MIN_SUPPORT_WIDTH = 0.6;
export const STATIC_EQUILIBRIUM_MAX_SUPPORT_WIDTH = 2.4;

const GRAPH_SAMPLE_COUNT = 181;

function collapseNearZero(value: number, threshold = 1e-6) {
  return Math.abs(value) <= threshold ? 0 : value;
}

function mergeDefinedParams(
  params:
    | Partial<StaticEquilibriumCentreOfMassParams>
    | Record<string, number | boolean | string>,
  overrides?: Partial<StaticEquilibriumCentreOfMassParams>,
) {
  if (!overrides) {
    return params;
  }

  const merged = { ...params } as Record<string, number | boolean | string | undefined>;

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

export function resolveStaticEquilibriumCentreOfMassParams(
  params:
    | Partial<StaticEquilibriumCentreOfMassParams>
    | Record<string, number | boolean | string>,
) {
  const cargoMass = clamp(
    safeNumber(params.cargoMass, 3),
    STATIC_EQUILIBRIUM_MIN_CARGO_MASS,
    STATIC_EQUILIBRIUM_MAX_CARGO_MASS,
  );
  const cargoPosition = clamp(
    safeNumber(params.cargoPosition, 0.8),
    STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
    STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
  );
  const supportCenter = clamp(
    safeNumber(params.supportCenter, 0),
    STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
    STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
  );
  const supportWidth = clamp(
    safeNumber(params.supportWidth, 1.4),
    STATIC_EQUILIBRIUM_MIN_SUPPORT_WIDTH,
    STATIC_EQUILIBRIUM_MAX_SUPPORT_WIDTH,
  );

  return {
    plankMass: STATIC_EQUILIBRIUM_PLANK_MASS,
    cargoMass,
    cargoPosition,
    supportCenter,
    supportWidth,
    gravity: STATIC_EQUILIBRIUM_GRAVITY,
  };
}

export function sampleStaticEquilibriumCentreOfMassState(
  params:
    | Partial<StaticEquilibriumCentreOfMassParams>
    | Record<string, number | boolean | string>,
  overrides?: Partial<StaticEquilibriumCentreOfMassParams>,
): StaticEquilibriumCentreOfMassSnapshot {
  const resolved = resolveStaticEquilibriumCentreOfMassParams(
    mergeDefinedParams(params, overrides),
  );
  const totalMass = resolved.plankMass + resolved.cargoMass;
  const totalWeight = totalMass * resolved.gravity;
  const centerOfMassX =
    totalMass <= 0
      ? 0
      : (resolved.cargoMass * resolved.cargoPosition) / Math.max(totalMass, 1e-6);
  const supportLeftEdge = resolved.supportCenter - resolved.supportWidth / 2;
  const supportRightEdge = resolved.supportCenter + resolved.supportWidth / 2;
  const supportOffset = collapseNearZero(centerOfMassX - resolved.supportCenter);
  const torqueAboutSupportCenter = collapseNearZero(-totalWeight * supportOffset);
  const requiredRightReaction = collapseNearZero(
    (totalWeight * (centerOfMassX - supportLeftEdge)) / resolved.supportWidth,
  );
  const requiredLeftReaction = collapseNearZero(totalWeight - requiredRightReaction);
  const stabilityMargin = collapseNearZero(
    Math.min(centerOfMassX - supportLeftEdge, supportRightEdge - centerOfMassX),
  );
  const stable = stabilityMargin >= -0.01;
  const supportBalanceLabel =
    stable && Math.abs(torqueAboutSupportCenter) <= 0.24
      ? "balanced"
      : stable
        ? "stable"
        : centerOfMassX < supportLeftEdge
          ? "tips-left"
          : "tips-right";
  const activeSupportEdgeX =
    supportBalanceLabel === "tips-left"
      ? supportLeftEdge
      : supportBalanceLabel === "tips-right"
        ? supportRightEdge
        : null;
  const tipTorqueAboutEdge =
    activeSupportEdgeX === null
      ? 0
      : collapseNearZero(-totalWeight * (centerOfMassX - activeSupportEdgeX));
  const actualLeftReaction = stable
    ? Math.max(0, requiredLeftReaction)
    : supportBalanceLabel === "tips-left"
      ? totalWeight
      : 0;
  const actualRightReaction = stable
    ? Math.max(0, requiredRightReaction)
    : supportBalanceLabel === "tips-right"
      ? totalWeight
      : 0;
  const tipOverhang = stable ? 0 : Math.abs(stabilityMargin);

  return {
    plankMass: resolved.plankMass,
    cargoMass: resolved.cargoMass,
    totalMass,
    gravity: resolved.gravity,
    totalWeight,
    cargoPosition: resolved.cargoPosition,
    supportCenter: resolved.supportCenter,
    supportWidth: resolved.supportWidth,
    supportLeftEdge,
    supportRightEdge,
    centerOfMassX: collapseNearZero(centerOfMassX),
    supportOffset,
    torqueAboutSupportCenter,
    requiredLeftReaction,
    requiredRightReaction,
    actualLeftReaction: collapseNearZero(actualLeftReaction),
    actualRightReaction: collapseNearZero(actualRightReaction),
    stabilityMargin,
    tipOverhang,
    supportBalanceLabel,
    activeSupportEdgeX,
    tipTorqueAboutEdge,
  };
}

function buildSupportCenterSeries(
  id: string,
  label: string,
  sampleY: (supportCenter: number) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
      STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
      GRAPH_SAMPLE_COUNT,
    ).map((supportCenter) => ({
      x: supportCenter,
      y: sampleY(supportCenter),
    })),
    color,
  );
}

function buildCargoPositionSeries(
  id: string,
  label: string,
  sampleY: (cargoPosition: number) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
      STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
      GRAPH_SAMPLE_COUNT,
    ).map((cargoPosition) => ({
      x: cargoPosition,
      y: sampleY(cargoPosition),
    })),
    color,
  );
}

export function buildStaticEquilibriumCentreOfMassSeries(
  params:
    | Partial<StaticEquilibriumCentreOfMassParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveStaticEquilibriumCentreOfMassParams(params);
  const snapshot = sampleStaticEquilibriumCentreOfMassState(resolved);
  const sampleSupportCenter = (supportCenter: number) =>
    sampleStaticEquilibriumCentreOfMassState(resolved, { supportCenter });
  const sampleCargoPosition = (cargoPosition: number) =>
    sampleStaticEquilibriumCentreOfMassState(resolved, { cargoPosition });

  return {
    "support-torque": [
      buildSupportCenterSeries(
        "support-torque-curve",
        "tau_support",
        (supportCenter) => sampleSupportCenter(supportCenter).torqueAboutSupportCenter,
        "#4ea6df",
      ),
      buildSeries(
        "support-torque-marker",
        "current setup",
        [
          {
            x: resolved.supportCenter,
            y: snapshot.torqueAboutSupportCenter,
          },
        ],
        "#f16659",
      ),
    ],
    "support-reactions": [
      buildSupportCenterSeries(
        "required-left-reaction",
        "R_left required",
        (supportCenter) => sampleSupportCenter(supportCenter).requiredLeftReaction,
        "#1ea6a2",
      ),
      buildSupportCenterSeries(
        "required-right-reaction",
        "R_right required",
        (supportCenter) => sampleSupportCenter(supportCenter).requiredRightReaction,
        "#f16659",
      ),
      buildSeries(
        "left-reaction-marker",
        "current left",
        [
          {
            x: resolved.supportCenter,
            y: snapshot.requiredLeftReaction,
          },
        ],
        "#1ea6a2",
      ),
      buildSeries(
        "right-reaction-marker",
        "current right",
        [
          {
            x: resolved.supportCenter,
            y: snapshot.requiredRightReaction,
          },
        ],
        "#f16659",
      ),
    ],
    "cargo-stability": [
      buildCargoPositionSeries(
        "stability-margin-curve",
        "margin to edge",
        (cargoPosition) => sampleCargoPosition(cargoPosition).stabilityMargin,
        "#0f1c24",
      ),
      buildSeries(
        "stability-margin-marker",
        "current setup",
        [
          {
            x: resolved.cargoPosition,
            y: snapshot.stabilityMargin,
          },
        ],
        "#f0ab3c",
      ),
    ],
  };
}

export function describeStaticEquilibriumCentreOfMassState(
  params:
    | Partial<StaticEquilibriumCentreOfMassParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleStaticEquilibriumCentreOfMassState(params);
  const stabilitySummary =
    snapshot.supportBalanceLabel === "balanced"
      ? "The combined centre of mass sits over the support centre, so the support reactions are matched and the torque about the support centre vanishes."
      : snapshot.supportBalanceLabel === "stable"
        ? `The combined centre of mass stays ${formatMeasurement(snapshot.stabilityMargin, "m")} inside the support region, so both support reactions remain positive.`
        : snapshot.supportBalanceLabel === "tips-left"
          ? `The combined centre of mass lies ${formatMeasurement(snapshot.tipOverhang, "m")} beyond the left edge, so the plank would tip left about that edge.`
          : `The combined centre of mass lies ${formatMeasurement(snapshot.tipOverhang, "m")} beyond the right edge, so the plank would tip right about that edge.`;

  return `A ${formatNumber(snapshot.plankMass)} kg plank carries ${formatNumber(snapshot.cargoMass)} kg of cargo at x = ${formatMeasurement(snapshot.cargoPosition, "m")}. The total mass is ${formatMeasurement(snapshot.totalMass, "kg")} and the combined centre of mass is at x_CM = ${formatMeasurement(snapshot.centerOfMassX, "m")}. The support region runs from ${formatMeasurement(snapshot.supportLeftEdge, "m")} to ${formatMeasurement(snapshot.supportRightEdge, "m")}, so the current reactions are R_left = ${formatMeasurement(snapshot.actualLeftReaction, "N")} and R_right = ${formatMeasurement(snapshot.actualRightReaction, "N")}. ${stabilitySummary}`;
}
