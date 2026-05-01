import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";
import { buildSeries } from "./series";
import { clamp, degToRad, formatMeasurement, formatNumber, radToDeg, safeNumber, sampleRange } from "./math";
import type { GraphSeries, GraphSeriesMap } from "./types";

export type RefractionSnellsLawParams = {
  n1: number;
  n2: number;
  incidentAngle: number;
};

export type RefractionBendDirection =
  | "toward-normal"
  | "away-from-normal"
  | "no-bend"
  | "total-internal-reflection";

export type RefractionSnellsLawSnapshot = {
  n1: number;
  n2: number;
  incidentAngle: number;
  incidentAngleRadians: number;
  sinIncident: number;
  refractedAngle: number | null;
  reflectedAngle: number | null;
  refractedAngleRadians: number | null;
  sinRefracted: number | null;
  bendAngle: number | null;
  bendDirection: RefractionBendDirection;
  speedInMedium1: number;
  speedInMedium2: number;
  speedRatio: number;
  criticalAngle: number | null;
  criticalOffset: number | null;
  hasCriticalAngle: boolean;
  totalInternalReflection: boolean;
};

export const REFRACTION_MIN_INDEX = 1;
export const REFRACTION_MAX_INDEX = 2.2;
export const REFRACTION_MIN_INCIDENT_ANGLE = 0;
export const REFRACTION_MAX_INCIDENT_ANGLE = 80;
export const REFRACTION_GRAPH_MAX_REFRACTED_ANGLE = 90;

const REFRACTION_GRAPH_SAMPLES = 161;
const TIR_EPSILON = 1e-9;
const NO_BEND_EPSILON = 0.08;

function buildResponseBranch(
  id: string,
  label: string,
  xStart: number,
  xEnd: number,
  samples: number,
  sampleY: (incidentAngle: number) => number,
  color: string,
): GraphSeries | null {
  if (!(xEnd > xStart)) {
    return null;
  }

  return buildSeries(
    id,
    label,
    sampleRange(xStart, xEnd, samples).map((incidentAngle) => ({
      x: incidentAngle,
      y: sampleY(incidentAngle),
    })),
    color,
  );
}

function buildCriticalMarkerSeries(criticalAngle: number | null): GraphSeries | null {
  if (criticalAngle === null || criticalAngle > REFRACTION_MAX_INCIDENT_ANGLE) {
    return null;
  }

  return buildSeries(
    "critical-angle-marker",
    "Critical angle",
    [
      { x: criticalAngle, y: 0 },
      { x: criticalAngle, y: REFRACTION_GRAPH_MAX_REFRACTED_ANGLE },
    ],
    "#0f1c24",
    true,
  );
}

export function resolveRefractionSnellsLawParams(
  source: Partial<RefractionSnellsLawParams> | Record<string, number | boolean | string>,
): RefractionSnellsLawParams {
  return {
    n1: clamp(safeNumber(source.n1, 1), REFRACTION_MIN_INDEX, REFRACTION_MAX_INDEX),
    n2: clamp(safeNumber(source.n2, 1.5), REFRACTION_MIN_INDEX, REFRACTION_MAX_INDEX),
    incidentAngle: clamp(
      safeNumber(source.incidentAngle, 50),
      REFRACTION_MIN_INCIDENT_ANGLE,
      REFRACTION_MAX_INCIDENT_ANGLE,
    ),
  };
}

function resolveCriticalAngle(n1: number, n2: number) {
  if (n1 <= n2) {
    return null;
  }

  return radToDeg(Math.asin(clamp(n2 / n1, 0, 1)));
}

export function sampleRefractionSnellsLawState(
  source: Partial<RefractionSnellsLawParams> | Record<string, number | boolean | string>,
  incidentAngleOverride?: number,
): RefractionSnellsLawSnapshot {
  const base = resolveRefractionSnellsLawParams(source);
  const incidentAngle =
    incidentAngleOverride === undefined
      ? base.incidentAngle
      : clamp(
          incidentAngleOverride,
          REFRACTION_MIN_INCIDENT_ANGLE,
          REFRACTION_MAX_INCIDENT_ANGLE,
        );
  const incidentAngleRadians = degToRad(incidentAngle);
  const sinIncident = Math.sin(incidentAngleRadians);
  const speedRatio = base.n1 / base.n2;
  const speedInMedium1 = 1 / base.n1;
  const speedInMedium2 = 1 / base.n2;
  const criticalAngle = resolveCriticalAngle(base.n1, base.n2);
  const criticalOffset = criticalAngle === null ? null : incidentAngle - criticalAngle;
  const transmittedSineRaw = (base.n1 / base.n2) * sinIncident;
  const totalInternalReflection = transmittedSineRaw > 1 + TIR_EPSILON;

  if (totalInternalReflection) {
    return {
      n1: base.n1,
      n2: base.n2,
      incidentAngle,
      incidentAngleRadians,
      sinIncident,
      refractedAngle: null,
      reflectedAngle: incidentAngle,
      refractedAngleRadians: null,
      sinRefracted: null,
      bendAngle: null,
      bendDirection: "total-internal-reflection",
      speedInMedium1,
      speedInMedium2,
      speedRatio,
      criticalAngle,
      criticalOffset,
      hasCriticalAngle: criticalAngle !== null,
      totalInternalReflection: true,
    };
  }

  const sinRefracted = clamp(transmittedSineRaw, -1, 1);
  const refractedAngleRadians = Math.asin(sinRefracted);
  const refractedAngle = radToDeg(refractedAngleRadians);
  const bendAngle = incidentAngle - refractedAngle;
  const bendDirection =
    Math.abs(bendAngle) <= NO_BEND_EPSILON
      ? "no-bend"
      : bendAngle > 0
        ? "toward-normal"
        : "away-from-normal";

  return {
    n1: base.n1,
    n2: base.n2,
    incidentAngle,
    incidentAngleRadians,
    sinIncident,
    refractedAngle,
    reflectedAngle: null,
    refractedAngleRadians,
    sinRefracted,
    bendAngle,
    bendDirection,
    speedInMedium1,
    speedInMedium2,
    speedRatio,
    criticalAngle,
    criticalOffset,
    hasCriticalAngle: criticalAngle !== null,
    totalInternalReflection: false,
  };
}

function resolveGraphEndAngle(params: RefractionSnellsLawParams) {
  const criticalAngle = resolveCriticalAngle(params.n1, params.n2);

  if (criticalAngle === null) {
    return REFRACTION_MAX_INCIDENT_ANGLE;
  }

  return Math.min(REFRACTION_MAX_INCIDENT_ANGLE, criticalAngle);
}

export function buildRefractionSnellsLawSeries(
  source: Partial<RefractionSnellsLawParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const params = resolveRefractionSnellsLawParams(source);
  const endAngle = resolveGraphEndAngle(params);
  const criticalAngle = resolveCriticalAngle(params.n1, params.n2);
  const samples = Math.max(
    36,
    Math.round((REFRACTION_GRAPH_SAMPLES * endAngle) / REFRACTION_MAX_INCIDENT_ANGLE),
  );
  const refractedAngleAt = (incidentAngle: number) => {
    const snapshot = sampleRefractionSnellsLawState(params, incidentAngle);
    return snapshot.refractedAngle ?? REFRACTION_GRAPH_MAX_REFRACTED_ANGLE;
  };
  const bendAngleAt = (incidentAngle: number) => {
    const snapshot = sampleRefractionSnellsLawState(params, incidentAngle);
    return snapshot.bendAngle ?? 0;
  };

  return {
    "refraction-map": [
      buildResponseBranch(
        "refracted-angle",
        copyText(locale, "Refracted angle", "折射角"),
        REFRACTION_MIN_INCIDENT_ANGLE,
        endAngle,
        samples,
        refractedAngleAt,
        "#f16659",
      ),
    ].filter(Boolean) as GraphSeries[],
    "transition-map": [
      buildResponseBranch(
        "refracted-angle",
        copyText(locale, "Refracted branch", "折射支路"),
        REFRACTION_MIN_INCIDENT_ANGLE,
        endAngle,
        samples,
        refractedAngleAt,
        "#f16659",
      ),
      buildCriticalMarkerSeries(criticalAngle),
      buildResponseBranch(
        "reflected-angle",
        copyText(locale, "Reflected branch", "反射支路"),
        criticalAngle ?? REFRACTION_MAX_INCIDENT_ANGLE,
        REFRACTION_MAX_INCIDENT_ANGLE,
        Math.max(24, REFRACTION_GRAPH_SAMPLES - samples + 1),
        (incidentAngle) => incidentAngle,
        "#f0ab3c",
      ),
    ].filter(Boolean) as GraphSeries[],
    "bend-map": [
      buildResponseBranch(
        "bend-angle",
        copyText(locale, "Bend from the normal", "相對法線的偏折"),
        REFRACTION_MIN_INCIDENT_ANGLE,
        endAngle,
        samples,
        bendAngleAt,
        "#1ea6a2",
      ),
    ].filter(Boolean) as GraphSeries[],
  };
}

export function describeRefractionSnellsLawState(
  source: Partial<RefractionSnellsLawParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
) {
  const snapshot = sampleRefractionSnellsLawState(source);
  const base = `Light crosses from n1 = ${formatNumber(snapshot.n1)} to n2 = ${formatNumber(snapshot.n2)} at ${formatMeasurement(snapshot.incidentAngle, "deg")}.`;

  if (snapshot.totalInternalReflection) {
    const criticalText =
      snapshot.criticalAngle === null
        ? ""
        : ` The critical angle is about ${formatMeasurement(snapshot.criticalAngle, "deg")}.`;

    if (locale === "zh-HK") {
      const zhBase = `光線以 ${formatMeasurement(snapshot.incidentAngle, "deg")} 從 n1 = ${formatNumber(snapshot.n1)} 進入與 n2 = ${formatNumber(snapshot.n2)} 的邊界。`;
      const zhCriticalText =
        snapshot.criticalAngle === null
          ? ""
          : ` 臨界角約為 ${formatMeasurement(snapshot.criticalAngle, "deg")}。`;
      return `${zhBase} 依照史涅耳定律會要求正弦值大於 1，因此不存在實數折射光線，光線會在 ${formatMeasurement(snapshot.reflectedAngle ?? snapshot.incidentAngle, "deg")} 角度下於介質內全反射。${zhCriticalText}`;
    }

    return `${base} Snell's law would require a sine above 1, so there is no real refracted ray and the ray reflects internally at ${formatMeasurement(snapshot.reflectedAngle ?? snapshot.incidentAngle, "deg")}.${criticalText}`;
  }

  const bendText =
    snapshot.bendDirection === "toward-normal"
      ? copyText(locale, "toward the normal", "朝向法線")
      : snapshot.bendDirection === "away-from-normal"
        ? copyText(locale, "away from the normal", "遠離法線")
        : copyText(locale, "without changing direction", "不改變方向");

  if (locale === "zh-HK") {
    const zhBase = `光線以 ${formatMeasurement(snapshot.incidentAngle, "deg")} 從 n1 = ${formatNumber(snapshot.n1)} 進入與 n2 = ${formatNumber(snapshot.n2)} 的邊界。`;
    return `${zhBase} 光線會折射到 ${formatMeasurement(snapshot.refractedAngle ?? 0, "deg")}，並${bendText}，相對速度比為 v2/v1 = ${formatNumber(snapshot.speedRatio)}。`;
  }

  return `${base} The ray refracts to ${formatMeasurement(snapshot.refractedAngle ?? 0, "deg")}, bends ${bendText}, and the relative speed changes by v2/v1 = ${formatNumber(snapshot.speedRatio)}.`;
}
