import { getVisibleColorHex, getVisibleColorLabel, resolveVisibleColorId } from "./lightSpectrumLinkage";
import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, sampleRange, safeNumber } from "./math";
import type { GraphSeriesMap } from "./types";

export type DispersionRefractiveIndexColorParams = {
  wavelengthNm: number;
  referenceIndex: number;
  dispersionStrength: number;
  prismAngle: number;
};

export type DispersionAnchorId = "red" | "green" | "violet";

export type DispersionAnchorSnapshot = {
  id: DispersionAnchorId;
  wavelengthNm: number;
  index: number;
  deviationAngle: number;
  colorLabel: string;
  colorHex: string;
};

export type DispersionRefractiveIndexColorSnapshot = {
  wavelengthNm: number;
  referenceIndex: number;
  dispersionStrength: number;
  prismAngle: number;
  selectedIndex: number;
  selectedDeviationAngle: number;
  speedFractionC: number;
  selectedColorLabel: string;
  selectedColorHex: string;
  red: DispersionAnchorSnapshot;
  green: DispersionAnchorSnapshot;
  violet: DispersionAnchorSnapshot;
  spreadAngle: number;
};

export const DISPERSION_REFERENCE_WAVELENGTH_NM = 550;
export const DISPERSION_MIN_WAVELENGTH_NM = 420;
export const DISPERSION_MAX_WAVELENGTH_NM = 680;
export const DISPERSION_MIN_REFERENCE_INDEX = 1.25;
export const DISPERSION_MAX_REFERENCE_INDEX = 1.8;
export const DISPERSION_MIN_STRENGTH = 0;
export const DISPERSION_MAX_STRENGTH = 0.06;
export const DISPERSION_MIN_PRISM_ANGLE = 8;
export const DISPERSION_MAX_PRISM_ANGLE = 28;
export const DISPERSION_RED_WAVELENGTH_NM = 650;
export const DISPERSION_GREEN_WAVELENGTH_NM = DISPERSION_REFERENCE_WAVELENGTH_NM;
export const DISPERSION_VIOLET_WAVELENGTH_NM = 450;

const DISPERSION_GRAPH_SAMPLES = 131;

function formatWavelength(wavelengthNm: number) {
  return `${formatNumber(wavelengthNm)} nm`;
}

function resolveAnchorColorHex(wavelengthNm: number) {
  return resolveVisibleColorId(wavelengthNm) === null
    ? "#4ea6df"
    : (getVisibleColorHex(resolveVisibleColorId(wavelengthNm)) ?? "#4ea6df");
}

function resolveAnchorLabel(id: DispersionAnchorId) {
  switch (id) {
    case "red":
      return "red";
    case "green":
      return "green";
    case "violet":
      return "violet";
  }
}

export function resolveDispersionRefractiveIndexColorParams(
  source:
    | Partial<DispersionRefractiveIndexColorParams>
    | Record<string, number | boolean | string>,
): DispersionRefractiveIndexColorParams {
  return {
    wavelengthNm: clamp(
      safeNumber(source.wavelengthNm, DISPERSION_REFERENCE_WAVELENGTH_NM),
      DISPERSION_MIN_WAVELENGTH_NM,
      DISPERSION_MAX_WAVELENGTH_NM,
    ),
    referenceIndex: clamp(
      safeNumber(source.referenceIndex, 1.52),
      DISPERSION_MIN_REFERENCE_INDEX,
      DISPERSION_MAX_REFERENCE_INDEX,
    ),
    dispersionStrength: clamp(
      safeNumber(source.dispersionStrength, 0.02),
      DISPERSION_MIN_STRENGTH,
      DISPERSION_MAX_STRENGTH,
    ),
    prismAngle: clamp(
      safeNumber(source.prismAngle, 18),
      DISPERSION_MIN_PRISM_ANGLE,
      DISPERSION_MAX_PRISM_ANGLE,
    ),
  };
}

export function sampleDispersionIndex(
  referenceIndex: number,
  dispersionStrength: number,
  wavelengthNm: number,
) {
  const wavelengthRatio =
    DISPERSION_REFERENCE_WAVELENGTH_NM / Math.max(wavelengthNm, DISPERSION_MIN_WAVELENGTH_NM);

  return referenceIndex + dispersionStrength * (wavelengthRatio ** 2 - 1);
}

export function sampleDispersionDeviationAngle(index: number, prismAngle: number) {
  return Math.max(0, (index - 1) * prismAngle);
}

function buildAnchor(
  id: DispersionAnchorId,
  referenceIndex: number,
  dispersionStrength: number,
  prismAngle: number,
): DispersionAnchorSnapshot {
  const wavelengthNm =
    id === "red"
      ? DISPERSION_RED_WAVELENGTH_NM
      : id === "green"
        ? DISPERSION_GREEN_WAVELENGTH_NM
        : DISPERSION_VIOLET_WAVELENGTH_NM;
  const index = sampleDispersionIndex(referenceIndex, dispersionStrength, wavelengthNm);

  return {
    id,
    wavelengthNm,
    index,
    deviationAngle: sampleDispersionDeviationAngle(index, prismAngle),
    colorLabel: resolveAnchorLabel(id),
    colorHex: resolveAnchorColorHex(wavelengthNm),
  };
}

export function sampleDispersionRefractiveIndexColorState(
  source:
    | Partial<DispersionRefractiveIndexColorParams>
    | Record<string, number | boolean | string>,
  wavelengthOverride?: number,
): DispersionRefractiveIndexColorSnapshot {
  const resolved = resolveDispersionRefractiveIndexColorParams(source);
  const wavelengthNm =
    wavelengthOverride === undefined
      ? resolved.wavelengthNm
      : clamp(wavelengthOverride, DISPERSION_MIN_WAVELENGTH_NM, DISPERSION_MAX_WAVELENGTH_NM);
  const selectedIndex = sampleDispersionIndex(
    resolved.referenceIndex,
    resolved.dispersionStrength,
    wavelengthNm,
  );
  const selectedDeviationAngle = sampleDispersionDeviationAngle(
    selectedIndex,
    resolved.prismAngle,
  );
  const selectedColorId = resolveVisibleColorId(wavelengthNm);
  const red = buildAnchor(
    "red",
    resolved.referenceIndex,
    resolved.dispersionStrength,
    resolved.prismAngle,
  );
  const green = buildAnchor(
    "green",
    resolved.referenceIndex,
    resolved.dispersionStrength,
    resolved.prismAngle,
  );
  const violet = buildAnchor(
    "violet",
    resolved.referenceIndex,
    resolved.dispersionStrength,
    resolved.prismAngle,
  );

  return {
    wavelengthNm,
    referenceIndex: resolved.referenceIndex,
    dispersionStrength: resolved.dispersionStrength,
    prismAngle: resolved.prismAngle,
    selectedIndex,
    selectedDeviationAngle,
    speedFractionC: 1 / Math.max(selectedIndex, 1e-6),
    selectedColorLabel: getVisibleColorLabel(selectedColorId) ?? "selected color",
    selectedColorHex: getVisibleColorHex(selectedColorId) ?? "#4ea6df",
    red,
    green,
    violet,
    spreadAngle: violet.deviationAngle - red.deviationAngle,
  };
}

export function buildDispersionRefractiveIndexColorSeries(
  source:
    | Partial<DispersionRefractiveIndexColorParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveDispersionRefractiveIndexColorParams(source);

  return {
    "index-curve": [
      buildSeries(
        "index-curve",
        "n(lambda)",
        sampleRange(
          DISPERSION_MIN_WAVELENGTH_NM,
          DISPERSION_MAX_WAVELENGTH_NM,
          DISPERSION_GRAPH_SAMPLES,
        ).map((wavelengthNm) => ({
          x: wavelengthNm,
          y: sampleDispersionIndex(
            resolved.referenceIndex,
            resolved.dispersionStrength,
            wavelengthNm,
          ),
        })),
        "#4ea6df",
      ),
    ],
    "deviation-curve": [
      buildSeries(
        "deviation-curve",
        "Thin-prism deviation",
        sampleRange(
          DISPERSION_MIN_WAVELENGTH_NM,
          DISPERSION_MAX_WAVELENGTH_NM,
          DISPERSION_GRAPH_SAMPLES,
        ).map((wavelengthNm) => {
          const index = sampleDispersionIndex(
            resolved.referenceIndex,
            resolved.dispersionStrength,
            wavelengthNm,
          );

          return {
            x: wavelengthNm,
            y: sampleDispersionDeviationAngle(index, resolved.prismAngle),
          };
        }),
        "#f16659",
      ),
    ],
  };
}

export function describeDispersionRefractiveIndexColorState(
  source:
    | Partial<DispersionRefractiveIndexColorParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleDispersionRefractiveIndexColorState(source);

  return `For ${formatWavelength(snapshot.wavelengthNm)}, the bounded thin-prism model gives n(lambda) = ${formatNumber(snapshot.selectedIndex)} and a prism deviation of about ${formatMeasurement(snapshot.selectedDeviationAngle, "deg")}. Shorter visible wavelengths bend more strongly here, so violet leaves about ${formatMeasurement(snapshot.spreadAngle, "deg")} below red across the same prism.`;
}
