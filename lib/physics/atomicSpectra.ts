import {
  clamp,
  formatMeasurement,
  formatNumber,
  safeNumber,
  sampleRange,
} from "./math";
import { buildSeries } from "./series";
import {
  getVisibleColorHex,
  getVisibleColorLabel,
  LIGHT_SPECTRUM_VISIBLE_MAX_NM,
  LIGHT_SPECTRUM_VISIBLE_MIN_NM,
  resolveVisibleColorId,
} from "./lightSpectrumLinkage";
import type { GraphSeriesMap } from "./types";

export type AtomicSpectraParams = {
  gap12Ev: number;
  gap23Ev: number;
  gap34Ev: number;
  absorptionMode: boolean;
};

export type AtomicSpectraBandId = "ultraviolet" | "visible" | "infrared";

export type AtomicSpectraTransitionId =
  | "2-1"
  | "3-2"
  | "4-3"
  | "3-1"
  | "4-2"
  | "4-1";

export type AtomicSpectraTransition = {
  id: AtomicSpectraTransitionId;
  fromLevel: 2 | 3 | 4;
  toLevel: 1 | 2 | 3;
  label: string;
  absorptionLabel: string;
  energyEv: number;
  wavelengthNm: number;
  intensity: number;
  bandId: AtomicSpectraBandId;
  bandLabel: string;
  inVisibleBand: boolean;
  visibleColorLabel: string | null;
  lineColorHex: string;
};

export type AtomicSpectraSnapshot = {
  gap12Ev: number;
  gap23Ev: number;
  gap34Ev: number;
  absorptionMode: boolean;
  modeLabel: "Emission" | "Absorption";
  levelEnergiesEv: [number, number, number, number];
  transitions: AtomicSpectraTransition[];
  activeTransitionIndex: number;
  activeTransition: AtomicSpectraTransition;
  photonTravelFraction: number;
  strongestTransition: AtomicSpectraTransition;
  strongestVisibleTransition: AtomicSpectraTransition | null;
  visibleLineCount: number;
  shortestWavelengthNm: number;
  longestWavelengthNm: number;
  shortestVisibleWavelengthNm: number | null;
  longestVisibleWavelengthNm: number | null;
  strongestVisibleWavelengthNm: number | null;
  minVisibleSeparationNm: number;
  time: number;
};

export const ATOMIC_SPECTRA_MIN_GAP_EV = 1.1;
export const ATOMIC_SPECTRA_MAX_GAP_EV = 3.6;
export const ATOMIC_SPECTRA_SPECTRUM_MIN_NM = 110;
export const ATOMIC_SPECTRA_SPECTRUM_MAX_NM = 1200;
export const ATOMIC_SPECTRA_TIME_WINDOW = 5.4;
export const ATOMIC_SPECTRA_HC_EV_NM = 1239.841984;

const ATOMIC_SPECTRA_GRAPH_SAMPLES = 361;
const ATOMIC_SPECTRA_LINE_WIDTH_NM = 10;
const ATOMIC_SPECTRA_TRANSITION_CYCLE = ATOMIC_SPECTRA_TIME_WINDOW / 6;

function classifyBand(wavelengthNm: number): AtomicSpectraBandId {
  if (wavelengthNm < LIGHT_SPECTRUM_VISIBLE_MIN_NM) {
    return "ultraviolet";
  }

  if (wavelengthNm > LIGHT_SPECTRUM_VISIBLE_MAX_NM) {
    return "infrared";
  }

  return "visible";
}

function getBandLabel(bandId: AtomicSpectraBandId) {
  switch (bandId) {
    case "ultraviolet":
      return "Ultraviolet";
    case "visible":
      return "Visible";
    case "infrared":
      return "Infrared";
  }
}

function getBandFallbackColor(bandId: AtomicSpectraBandId) {
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

function energyToWavelengthNm(energyEv: number) {
  return ATOMIC_SPECTRA_HC_EV_NM / Math.max(energyEv, 1e-6);
}

function resolveTransitionIntensity(fromLevel: number, toLevel: number) {
  const levelSpan = fromLevel - toLevel;
  const spanWeight = levelSpan === 1 ? 1 : levelSpan === 2 ? 0.64 : 0.42;
  const upperWeight = 0.86 + (fromLevel - 2) * 0.08;

  return spanWeight * upperWeight;
}

function buildTransitions(levelEnergiesEv: [number, number, number, number]) {
  const rawTransitions = [
    {
      id: "2-1" as const,
      fromLevel: 2 as const,
      toLevel: 1 as const,
      energyEv: levelEnergiesEv[1] - levelEnergiesEv[0],
    },
    {
      id: "3-2" as const,
      fromLevel: 3 as const,
      toLevel: 2 as const,
      energyEv: levelEnergiesEv[2] - levelEnergiesEv[1],
    },
    {
      id: "4-3" as const,
      fromLevel: 4 as const,
      toLevel: 3 as const,
      energyEv: levelEnergiesEv[3] - levelEnergiesEv[2],
    },
    {
      id: "3-1" as const,
      fromLevel: 3 as const,
      toLevel: 1 as const,
      energyEv: levelEnergiesEv[2] - levelEnergiesEv[0],
    },
    {
      id: "4-2" as const,
      fromLevel: 4 as const,
      toLevel: 2 as const,
      energyEv: levelEnergiesEv[3] - levelEnergiesEv[1],
    },
    {
      id: "4-1" as const,
      fromLevel: 4 as const,
      toLevel: 1 as const,
      energyEv: levelEnergiesEv[3] - levelEnergiesEv[0],
    },
  ];

  const intensityScale = Math.max(
    ...rawTransitions.map((transition) =>
      resolveTransitionIntensity(transition.fromLevel, transition.toLevel),
    ),
    1,
  );

  return rawTransitions
    .map<AtomicSpectraTransition>((transition) => {
      const wavelengthNm = energyToWavelengthNm(transition.energyEv);
      const bandId = classifyBand(wavelengthNm);
      const visibleColorId = resolveVisibleColorId(wavelengthNm);

      return {
        id: transition.id,
        fromLevel: transition.fromLevel,
        toLevel: transition.toLevel,
        label: `${transition.fromLevel} -> ${transition.toLevel}`,
        absorptionLabel: `${transition.toLevel} -> ${transition.fromLevel}`,
        energyEv: transition.energyEv,
        wavelengthNm,
        intensity:
          resolveTransitionIntensity(transition.fromLevel, transition.toLevel) / intensityScale,
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
  transitions: AtomicSpectraTransition[],
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

function getVisibleTransitions(transitions: AtomicSpectraTransition[]) {
  return transitions.filter((transition) => transition.inVisibleBand);
}

function getMinVisibleSeparationNm(visibleTransitions: AtomicSpectraTransition[]) {
  if (visibleTransitions.length < 2) {
    return 0;
  }

  let best = Number.POSITIVE_INFINITY;

  for (let index = 0; index < visibleTransitions.length - 1; index += 1) {
    best = Math.min(
      best,
      visibleTransitions[index + 1].wavelengthNm - visibleTransitions[index].wavelengthNm,
    );
  }

  return Number.isFinite(best) ? best : 0;
}

function sampleObservedSpectrumValue(
  snapshot: AtomicSpectraSnapshot,
  wavelengthNm: number,
) {
  const lineProfile = snapshot.transitions.reduce((total, transition) => {
    const delta = (wavelengthNm - transition.wavelengthNm) / ATOMIC_SPECTRA_LINE_WIDTH_NM;
    return total + transition.intensity * Math.exp(-(delta * delta));
  }, 0);

  if (snapshot.absorptionMode) {
    return clamp(1 - lineProfile * 0.8, 0.04, 1.02);
  }

  return Math.min(1.08, lineProfile);
}

export function resolveAtomicSpectraParams(
  params:
    | Partial<AtomicSpectraParams>
    | Record<string, number | boolean | string>,
): AtomicSpectraParams {
  return {
    gap12Ev: clamp(
      safeNumber(params.gap12Ev, 1.9),
      ATOMIC_SPECTRA_MIN_GAP_EV,
      ATOMIC_SPECTRA_MAX_GAP_EV,
    ),
    gap23Ev: clamp(
      safeNumber(params.gap23Ev, 2.6),
      ATOMIC_SPECTRA_MIN_GAP_EV,
      ATOMIC_SPECTRA_MAX_GAP_EV,
    ),
    gap34Ev: clamp(
      safeNumber(params.gap34Ev, 2.7),
      ATOMIC_SPECTRA_MIN_GAP_EV,
      ATOMIC_SPECTRA_MAX_GAP_EV,
    ),
    absorptionMode: params.absorptionMode === true,
  };
}

export function sampleAtomicSpectraState(
  params:
    | Partial<AtomicSpectraParams>
    | Record<string, number | boolean | string>,
  time = 0,
  previewWavelengthNm?: number,
): AtomicSpectraSnapshot {
  const resolved = resolveAtomicSpectraParams(params);
  const levelEnergiesEv: [number, number, number, number] = [
    0,
    resolved.gap12Ev,
    resolved.gap12Ev + resolved.gap23Ev,
    resolved.gap12Ev + resolved.gap23Ev + resolved.gap34Ev,
  ];
  const transitions = buildTransitions(levelEnergiesEv);
  const visibleTransitions = getVisibleTransitions(transitions);
  const wrappedTime =
    ((time % ATOMIC_SPECTRA_TIME_WINDOW) + ATOMIC_SPECTRA_TIME_WINDOW) %
    ATOMIC_SPECTRA_TIME_WINDOW;
  const defaultActiveIndex = Math.min(
    transitions.length - 1,
    Math.floor(wrappedTime / ATOMIC_SPECTRA_TRANSITION_CYCLE),
  );
  const activeTransitionIndex =
    previewWavelengthNm !== undefined
      ? findNearestTransitionIndex(transitions, previewWavelengthNm)
      : defaultActiveIndex;
  const phaseWithinTransition =
    previewWavelengthNm !== undefined
      ? 0.5
      : (wrappedTime % ATOMIC_SPECTRA_TRANSITION_CYCLE) / ATOMIC_SPECTRA_TRANSITION_CYCLE;
  const photonTravelFraction = 0.18 + 0.64 * (0.5 - 0.5 * Math.cos(Math.PI * phaseWithinTransition));
  const strongestTransition =
    transitions.reduce((best, transition) =>
      transition.intensity > best.intensity ? transition : best,
    );
  const strongestVisibleTransition =
    visibleTransitions.length > 0
      ? visibleTransitions.reduce((best, transition) =>
          transition.intensity > best.intensity ? transition : best,
        )
      : null;

  return {
    gap12Ev: resolved.gap12Ev,
    gap23Ev: resolved.gap23Ev,
    gap34Ev: resolved.gap34Ev,
    absorptionMode: resolved.absorptionMode,
    modeLabel: resolved.absorptionMode ? "Absorption" : "Emission",
    levelEnergiesEv,
    transitions,
    activeTransitionIndex,
    activeTransition: transitions[activeTransitionIndex] ?? transitions[0],
    photonTravelFraction,
    strongestTransition,
    strongestVisibleTransition,
    visibleLineCount: visibleTransitions.length,
    shortestWavelengthNm: transitions[0]?.wavelengthNm ?? ATOMIC_SPECTRA_SPECTRUM_MIN_NM,
    longestWavelengthNm:
      transitions[transitions.length - 1]?.wavelengthNm ?? ATOMIC_SPECTRA_SPECTRUM_MAX_NM,
    shortestVisibleWavelengthNm: visibleTransitions[0]?.wavelengthNm ?? null,
    longestVisibleWavelengthNm:
      visibleTransitions[visibleTransitions.length - 1]?.wavelengthNm ?? null,
    strongestVisibleWavelengthNm: strongestVisibleTransition?.wavelengthNm ?? null,
    minVisibleSeparationNm: getMinVisibleSeparationNm(visibleTransitions),
    time,
  };
}

export function buildAtomicSpectraSeries(
  params:
    | Partial<AtomicSpectraParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const snapshot = sampleAtomicSpectraState(params, 0);
  const wavelengths = sampleRange(
    ATOMIC_SPECTRA_SPECTRUM_MIN_NM,
    ATOMIC_SPECTRA_SPECTRUM_MAX_NM,
    ATOMIC_SPECTRA_GRAPH_SAMPLES,
  );

  return {
    "spectrum-lines": [
      buildSeries(
        "observed-spectrum",
        snapshot.absorptionMode ? "Observed spectrum" : "Emission spectrum",
        wavelengths.map((wavelengthNm) => ({
          x: wavelengthNm,
          y: sampleObservedSpectrumValue(snapshot, wavelengthNm),
        })),
        snapshot.absorptionMode ? "#f16659" : "#1ea6a2",
      ),
      buildSeries(
        "continuum-reference",
        "Continuum reference",
        wavelengths.map((wavelengthNm) => ({
          x: wavelengthNm,
          y: snapshot.absorptionMode ? 1 : 0,
        })),
        "#8f9aa8",
        true,
      ),
    ],
  };
}

export function describeAtomicSpectraState(
  params:
    | Partial<AtomicSpectraParams>
    | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleAtomicSpectraState(params, time);
  const active = snapshot.activeTransition;
  const appearance = snapshot.absorptionMode
    ? "a dark absorption line carved out of a continuum"
    : "a bright emission line against a dark background";
  const visibleSummary =
    snapshot.visibleLineCount > 0
      ? `${snapshot.visibleLineCount} visible lines`
      : "no visible lines";

  return `At display t = ${formatMeasurement(time, "s")}, the active level pair ${snapshot.absorptionMode ? active.absorptionLabel : active.label} spans ${formatMeasurement(active.energyEv, "eV")}, so it corresponds to the wavelength ${formatMeasurement(active.wavelengthNm, "nm")} as ${appearance}. The current gap pattern produces ${visibleSummary}, and the spectrum stays discrete because only the allowed level differences ${formatNumber(snapshot.gap12Ev)} eV, ${formatNumber(snapshot.gap23Ev)} eV, and ${formatNumber(snapshot.gap34Ev)} eV are available.`;
}
