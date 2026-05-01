import {
  clamp,
  formatMeasurement,
  safeNumber,
  sampleRange,
} from "./math";
import type { AppLocale } from "@/i18n/routing";
import { buildSeries } from "./series";
import {
  getVisibleColorHex,
  getVisibleColorLabel,
  LIGHT_SPECTRUM_VISIBLE_MAX_NM,
  LIGHT_SPECTRUM_VISIBLE_MIN_NM,
  resolveVisibleColorId,
} from "./lightSpectrumLinkage";
import type { GraphSeriesMap } from "./types";

export type BohrModelParams = {
  upperLevel: number;
  lowerLevel: number;
  excitationMode: boolean;
};

export type BohrModelBandId = "ultraviolet" | "visible" | "infrared";
export type BohrModelSeriesId = "lyman" | "balmer" | "paschen";

export type BohrModelTransition = {
  id: string;
  fromLevel: number;
  toLevel: number;
  emissionLabel: string;
  excitationLabel: string;
  energyEv: number;
  wavelengthNm: number;
  lineWeight: number;
  bandId: BohrModelBandId;
  bandLabel: string;
  inVisibleBand: boolean;
  visibleColorLabel: string | null;
  lineColorHex: string;
};

export type BohrModelLevel = {
  n: number;
  energyEv: number;
  radiusA0: number;
};

export type BohrModelSnapshot = {
  upperLevel: number;
  lowerLevel: number;
  excitationMode: boolean;
  modeLabel: "Emission" | "Excitation";
  seriesId: BohrModelSeriesId;
  seriesName: string;
  levels: BohrModelLevel[];
  seriesTransitions: BohrModelTransition[];
  activeTransitionIndex: number;
  activeTransition: BohrModelTransition;
  visibleLineCount: number;
  upperEnergyEv: number;
  lowerEnergyEv: number;
  upperRadiusA0: number;
  lowerRadiusA0: number;
  radiusRatio: number;
  seriesLimitWavelengthNm: number;
  photonTravelFraction: number;
  time: number;
};

export const BOHR_MODEL_MIN_LOWER_LEVEL = 1;
export const BOHR_MODEL_MAX_LOWER_LEVEL = 3;
export const BOHR_MODEL_MIN_UPPER_LEVEL = 2;
export const BOHR_MODEL_MAX_UPPER_LEVEL = 6;
export const BOHR_MODEL_SPECTRUM_MIN_NM = 90;
export const BOHR_MODEL_SPECTRUM_MAX_NM = 1900;
export const BOHR_MODEL_TIME_WINDOW = 5.4;
export const BOHR_MODEL_HC_EV_NM = 1239.841984;
export const BOHR_MODEL_GROUND_ENERGY_EV = 13.6;

const BOHR_MODEL_GRAPH_SAMPLES = 361;
const BOHR_MODEL_LINE_WIDTH_NM = 8;

function getLevelEnergyEv(n: number) {
  return -BOHR_MODEL_GROUND_ENERGY_EV / (n * n);
}

function getLevelRadiusA0(n: number) {
  return n * n;
}

function classifyBand(wavelengthNm: number): BohrModelBandId {
  if (wavelengthNm < LIGHT_SPECTRUM_VISIBLE_MIN_NM) {
    return "ultraviolet";
  }

  if (wavelengthNm > LIGHT_SPECTRUM_VISIBLE_MAX_NM) {
    return "infrared";
  }

  return "visible";
}

function getBandLabel(bandId: BohrModelBandId) {
  switch (bandId) {
    case "ultraviolet":
      return "Ultraviolet";
    case "visible":
      return "Visible";
    case "infrared":
      return "Infrared";
  }
}

function getBandFallbackColor(bandId: BohrModelBandId) {
  switch (bandId) {
    case "ultraviolet":
      return "#6366f1";
    case "visible":
      return "#f59e0b";
    case "infrared":
      return "#ea580c";
  }
}

function resolveLineColorHex(wavelengthNm: number) {
  const visibleColorId = resolveVisibleColorId(wavelengthNm);
  const visibleColorHex = getVisibleColorHex(visibleColorId);

  return visibleColorHex ?? getBandFallbackColor(classifyBand(wavelengthNm));
}

function getSeriesId(lowerLevel: number): BohrModelSeriesId {
  if (lowerLevel === 1) {
    return "lyman";
  }

  if (lowerLevel === 2) {
    return "balmer";
  }

  return "paschen";
}

function getSeriesName(lowerLevel: number) {
  if (lowerLevel === 1) {
    return "Lyman";
  }

  if (lowerLevel === 2) {
    return "Balmer";
  }

  return "Paschen";
}

function energyToWavelengthNm(energyEv: number) {
  return BOHR_MODEL_HC_EV_NM / Math.max(energyEv, 1e-6);
}

function getSeriesLimitWavelengthNm(lowerLevel: number) {
  const limitEnergyEv = BOHR_MODEL_GROUND_ENERGY_EV / (lowerLevel * lowerLevel);
  return energyToWavelengthNm(limitEnergyEv);
}

function resolveLineWeight(upperLevel: number, lowerLevel: number) {
  const span = upperLevel - lowerLevel;
  return 1 / (0.9 + (span - 1) * 0.28 + (upperLevel - (lowerLevel + 1)) * 0.14);
}

function buildSeriesTransitions(lowerLevel: number) {
  const rawTransitions = [];

  for (let upperLevel = lowerLevel + 1; upperLevel <= BOHR_MODEL_MAX_UPPER_LEVEL; upperLevel += 1) {
    const energyEv = BOHR_MODEL_GROUND_ENERGY_EV * (
      1 / (lowerLevel * lowerLevel) - 1 / (upperLevel * upperLevel)
    );

    rawTransitions.push({
      fromLevel: upperLevel,
      toLevel: lowerLevel,
      energyEv,
      lineWeight: resolveLineWeight(upperLevel, lowerLevel),
    });
  }

  const normalizedScale = Math.max(
    ...rawTransitions.map((transition) => transition.lineWeight),
    1,
  );

  return rawTransitions
    .map<BohrModelTransition>((transition) => {
      const wavelengthNm = energyToWavelengthNm(transition.energyEv);
      const bandId = classifyBand(wavelengthNm);
      const visibleColorId = resolveVisibleColorId(wavelengthNm);

      return {
        id: `${transition.fromLevel}-${transition.toLevel}`,
        fromLevel: transition.fromLevel,
        toLevel: transition.toLevel,
        emissionLabel: `${transition.fromLevel} -> ${transition.toLevel}`,
        excitationLabel: `${transition.toLevel} -> ${transition.fromLevel}`,
        energyEv: transition.energyEv,
        wavelengthNm,
        lineWeight: transition.lineWeight / normalizedScale,
        bandId,
        bandLabel: getBandLabel(bandId),
        inVisibleBand: bandId === "visible",
        visibleColorLabel: getVisibleColorLabel(visibleColorId),
        lineColorHex: resolveLineColorHex(wavelengthNm),
      };
    })
    .sort((left, right) => left.wavelengthNm - right.wavelengthNm);
}

function findNearestTransitionIndex(
  transitions: BohrModelTransition[],
  wavelengthNm: number,
) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  transitions.forEach((transition, index) => {
    const distance = Math.abs(transition.wavelengthNm - wavelengthNm);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getVisibleTransitions(transitions: BohrModelTransition[]) {
  return transitions.filter((transition) => transition.inVisibleBand);
}

function sampleSeriesSpectrumValue(snapshot: BohrModelSnapshot, wavelengthNm: number) {
  return Math.min(
    1.08,
    snapshot.seriesTransitions.reduce((total, transition) => {
      const delta = (wavelengthNm - transition.wavelengthNm) / BOHR_MODEL_LINE_WIDTH_NM;
      return total + transition.lineWeight * Math.exp(-(delta * delta));
    }, 0),
  );
}

export function resolveBohrModelParams(
  params:
    | Partial<BohrModelParams>
    | Record<string, number | boolean | string>,
): BohrModelParams {
  const upperLevel = Math.round(
    clamp(
      safeNumber(params.upperLevel, 3),
      BOHR_MODEL_MIN_UPPER_LEVEL,
      BOHR_MODEL_MAX_UPPER_LEVEL,
    ),
  );
  const clampedLowerLevel = Math.round(
    clamp(
      safeNumber(params.lowerLevel, 2),
      BOHR_MODEL_MIN_LOWER_LEVEL,
      BOHR_MODEL_MAX_LOWER_LEVEL,
    ),
  );

  return {
    upperLevel,
    lowerLevel: Math.min(clampedLowerLevel, upperLevel - 1),
    excitationMode: params.excitationMode === true,
  };
}

export function sampleBohrModelState(
  params:
    | Partial<BohrModelParams>
    | Record<string, number | boolean | string>,
  time = 0,
  previewWavelengthNm?: number,
): BohrModelSnapshot {
  const resolved = resolveBohrModelParams(params);
  const levels = Array.from({ length: BOHR_MODEL_MAX_UPPER_LEVEL }, (_, index) => {
    const n = index + 1;

    return {
      n,
      energyEv: getLevelEnergyEv(n),
      radiusA0: getLevelRadiusA0(n),
    };
  });
  const seriesTransitions = buildSeriesTransitions(resolved.lowerLevel);
  const activeTransitionIndex =
    previewWavelengthNm !== undefined
      ? findNearestTransitionIndex(seriesTransitions, previewWavelengthNm)
      : seriesTransitions.findIndex(
          (transition) =>
            transition.fromLevel === resolved.upperLevel &&
            transition.toLevel === resolved.lowerLevel,
        );
  const activeTransition =
    seriesTransitions[Math.max(activeTransitionIndex, 0)] ?? seriesTransitions[0]!;
  const wrappedTime =
    ((time % BOHR_MODEL_TIME_WINDOW) + BOHR_MODEL_TIME_WINDOW) % BOHR_MODEL_TIME_WINDOW;
  const photonTravelFraction =
    previewWavelengthNm !== undefined
      ? 0.5
      : 0.18 + 0.64 * (0.5 - 0.5 * Math.cos((2 * Math.PI * wrappedTime) / BOHR_MODEL_TIME_WINDOW));
  const visibleTransitions = getVisibleTransitions(seriesTransitions);
  const upperLevel = activeTransition?.fromLevel ?? resolved.upperLevel;
  const lowerLevel = activeTransition?.toLevel ?? resolved.lowerLevel;

  return {
    upperLevel,
    lowerLevel,
    excitationMode: resolved.excitationMode,
    modeLabel: resolved.excitationMode ? "Excitation" : "Emission",
    seriesId: getSeriesId(lowerLevel),
    seriesName: getSeriesName(lowerLevel),
    levels,
    seriesTransitions,
    activeTransitionIndex: Math.max(activeTransitionIndex, 0),
    activeTransition,
    visibleLineCount: visibleTransitions.length,
    upperEnergyEv: getLevelEnergyEv(upperLevel),
    lowerEnergyEv: getLevelEnergyEv(lowerLevel),
    upperRadiusA0: getLevelRadiusA0(upperLevel),
    lowerRadiusA0: getLevelRadiusA0(lowerLevel),
    radiusRatio: getLevelRadiusA0(upperLevel) / Math.max(getLevelRadiusA0(lowerLevel), 1e-6),
    seriesLimitWavelengthNm: getSeriesLimitWavelengthNm(lowerLevel),
    photonTravelFraction,
    time,
  };
}

export function buildBohrModelSeries(
  params:
    | Partial<BohrModelParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const snapshot = sampleBohrModelState(params, 0);
  const wavelengths = sampleRange(
    BOHR_MODEL_SPECTRUM_MIN_NM,
    BOHR_MODEL_SPECTRUM_MAX_NM,
    BOHR_MODEL_GRAPH_SAMPLES,
  );

  return {
    "series-spectrum": [
      buildSeries(
        "series-lines",
        `${snapshot.seriesName} line map`,
        wavelengths.map((wavelengthNm) => ({
          x: wavelengthNm,
          y: sampleSeriesSpectrumValue(snapshot, wavelengthNm),
        })),
        "#1ea6a2",
      ),
    ],
  };
}

export function describeBohrModelState(
  params:
    | Partial<BohrModelParams>
    | Record<string, number | boolean | string>,
  time: number,
  locale?: AppLocale,
) {
  const snapshot = sampleBohrModelState(params, time);
  const activeLabel = snapshot.excitationMode
    ? snapshot.activeTransition.excitationLabel
    : snapshot.activeTransition.emissionLabel;
  if (locale === "zh-HK") {
    const modeLabel = snapshot.modeLabel === "Excitation" ? "激發" : "發射";
    const bandLabel = (() => {
      switch (snapshot.activeTransition.bandId) {
        case "ultraviolet":
          return "紫外線";
        case "infrared":
          return "紅外線";
        default:
          return "可見光";
      }
    })();

    return `在畫面時間 t = ${formatMeasurement(time, "s")} 時，波耳模型正以 ${modeLabel} 模式顯示 ${activeLabel}。這個氫原子能隙是 ${formatMeasurement(snapshot.activeTransition.energyEv, "eV")}，因此對應的波長是位於 ${bandLabel} 的 ${formatMeasurement(snapshot.activeTransition.wavelengthNm, "nm")}。目前選取的 ${snapshot.seriesName} 系列會向 ${formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm")} 的極限擠近，因為較高允許能級在接近零能量時會愈來愈密集。這裡仍然只是用一個有界的歷史波耳模型來理解氫譜線，而不是最終的量子描述。`;
  }

  return `At display t = ${formatMeasurement(time, "s")}, the Bohr model is showing ${snapshot.modeLabel.toLowerCase()} for ${activeLabel}. The hydrogen energy gap is ${formatMeasurement(snapshot.activeTransition.energyEv, "eV")}, so the matching wavelength is ${formatMeasurement(snapshot.activeTransition.wavelengthNm, "nm")} in the ${snapshot.activeTransition.bandLabel.toLowerCase()}. The selected ${snapshot.seriesName} family crowds toward ${formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm")} because the higher allowed energies bunch up near zero. This remains a bounded historical hydrogen model rather than the final quantum description.`;
}
