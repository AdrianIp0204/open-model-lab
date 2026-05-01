import type { AppLocale } from "@/i18n/routing";
import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type ElectricFieldsParams = {
  sourceChargeA?: number;
  sourceChargeB?: number;
  sourceSeparation?: number;
  probeX?: number;
  probeY?: number;
  testCharge?: number;
};

export type ElectricFieldContribution = {
  charge: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  distance: number;
  effectiveDistance: number;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
};

export type ElectricFieldsSnapshot = {
  sourceChargeA: number;
  sourceChargeB: number;
  sourceSeparation: number;
  testCharge: number;
  probeX: number;
  probeY: number;
  sourceA: ElectricFieldContribution;
  sourceB: ElectricFieldContribution;
  fieldX: number;
  fieldY: number;
  fieldMagnitude: number;
  fieldAngle: number;
  forceX: number;
  forceY: number;
  forceMagnitude: number;
  dominantSource: "a" | "b" | "balanced" | "none";
  forceAlignment: "aligned" | "opposed" | "none";
};

export const ELECTRIC_FIELDS_MIN_CHARGE = -3;
export const ELECTRIC_FIELDS_MAX_CHARGE = 3;
export const ELECTRIC_FIELDS_MIN_SEPARATION = 1;
export const ELECTRIC_FIELDS_MAX_SEPARATION = 4;
export const ELECTRIC_FIELDS_STAGE_MIN_X = -3.2;
export const ELECTRIC_FIELDS_STAGE_MAX_X = 3.2;
export const ELECTRIC_FIELDS_STAGE_MIN_Y = -2.4;
export const ELECTRIC_FIELDS_STAGE_MAX_Y = 2.4;
export const ELECTRIC_FIELDS_MIN_SAMPLE_DISTANCE = 0.34;

const ELECTRIC_FIELDS_GRAPH_SAMPLES = 181;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function resolveCharge(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    ELECTRIC_FIELDS_MIN_CHARGE,
    ELECTRIC_FIELDS_MAX_CHARGE,
  );
}

function resolvePoint(value: unknown, min: number, max: number, fallback: number) {
  return clamp(safeNumber(value, fallback), min, max);
}

function describeVectorDirection(x: number, y: number, locale: AppLocale = "en") {
  const threshold = 0.08;
  const horizontal =
    Math.abs(x) <= threshold
      ? ""
      : x > 0
        ? copyText(locale, "right", "右")
        : copyText(locale, "left", "左");
  const vertical =
    Math.abs(y) <= threshold
      ? ""
      : y > 0
        ? copyText(locale, "up", "上")
        : copyText(locale, "down", "下");

  if (horizontal && vertical) {
    return locale === "zh-HK" ? `向${vertical}${horizontal}` : `${vertical}-${horizontal}`;
  }

  if (horizontal || vertical) {
    return locale === "zh-HK" ? `向${horizontal || vertical}` : horizontal || vertical;
  }

  return copyText(locale, "neutral", "幾乎為零");
}

function buildContribution(
  charge: number,
  sourceX: number,
  sourceY: number,
  probeX: number,
  probeY: number,
): ElectricFieldContribution {
  let dx = probeX - sourceX;
  let dy = probeY - sourceY;
  const distance = Math.hypot(dx, dy);

  if (distance < 1e-6) {
    dx = ELECTRIC_FIELDS_MIN_SAMPLE_DISTANCE;
    dy = 0;
  }

  const effectiveDistance = Math.max(Math.hypot(dx, dy), ELECTRIC_FIELDS_MIN_SAMPLE_DISTANCE);
  const scale = charge / Math.pow(effectiveDistance, 3);
  const fieldX = dx * scale;
  const fieldY = dy * scale;

  return {
    charge,
    x: sourceX,
    y: sourceY,
    dx,
    dy,
    distance,
    effectiveDistance,
    fieldX,
    fieldY,
    fieldMagnitude: Math.hypot(fieldX, fieldY),
  };
}

function dominantSource(
  sourceA: ElectricFieldContribution,
  sourceB: ElectricFieldContribution,
): ElectricFieldsSnapshot["dominantSource"] {
  if (sourceA.fieldMagnitude <= 0.02 && sourceB.fieldMagnitude <= 0.02) {
    return "none";
  }

  const difference = Math.abs(sourceA.fieldMagnitude - sourceB.fieldMagnitude);
  if (difference <= 0.08) {
    return "balanced";
  }

  return sourceA.fieldMagnitude > sourceB.fieldMagnitude ? "a" : "b";
}

export function resolveElectricFieldsParams(
  source: Partial<ElectricFieldsParams> | Record<string, number | boolean | string>,
): Required<ElectricFieldsParams> {
  return {
    sourceChargeA: resolveCharge(source.sourceChargeA, 2),
    sourceChargeB: resolveCharge(source.sourceChargeB, -2),
    sourceSeparation: resolvePoint(
      source.sourceSeparation,
      ELECTRIC_FIELDS_MIN_SEPARATION,
      ELECTRIC_FIELDS_MAX_SEPARATION,
      2.4,
    ),
    probeX: resolvePoint(
      source.probeX,
      ELECTRIC_FIELDS_STAGE_MIN_X,
      ELECTRIC_FIELDS_STAGE_MAX_X,
      0,
    ),
    probeY: resolvePoint(
      source.probeY,
      ELECTRIC_FIELDS_STAGE_MIN_Y,
      ELECTRIC_FIELDS_STAGE_MAX_Y,
      1,
    ),
    testCharge: resolveCharge(source.testCharge, 1),
  };
}

export function sampleElectricFieldsState(
  source: Partial<ElectricFieldsParams> | Record<string, number | boolean | string>,
  probeOverride?: Partial<Pick<ElectricFieldsParams, "probeX" | "probeY">>,
): ElectricFieldsSnapshot {
  const resolved = resolveElectricFieldsParams({
    ...source,
    ...probeOverride,
  });
  const sourceAX = -resolved.sourceSeparation / 2;
  const sourceBX = resolved.sourceSeparation / 2;
  const sourceA = buildContribution(
    resolved.sourceChargeA,
    sourceAX,
    0,
    resolved.probeX,
    resolved.probeY,
  );
  const sourceB = buildContribution(
    resolved.sourceChargeB,
    sourceBX,
    0,
    resolved.probeX,
    resolved.probeY,
  );
  const fieldX = sourceA.fieldX + sourceB.fieldX;
  const fieldY = sourceA.fieldY + sourceB.fieldY;
  const fieldMagnitude = Math.hypot(fieldX, fieldY);
  const forceX = resolved.testCharge * fieldX;
  const forceY = resolved.testCharge * fieldY;
  const forceMagnitude = Math.hypot(forceX, forceY);

  return {
    sourceChargeA: resolved.sourceChargeA,
    sourceChargeB: resolved.sourceChargeB,
    sourceSeparation: resolved.sourceSeparation,
    testCharge: resolved.testCharge,
    probeX: resolved.probeX,
    probeY: resolved.probeY,
    sourceA,
    sourceB,
    fieldX,
    fieldY,
    fieldMagnitude,
    fieldAngle: (Math.atan2(fieldY, fieldX) * 180) / Math.PI,
    forceX,
    forceY,
    forceMagnitude,
    dominantSource: dominantSource(sourceA, sourceB),
    forceAlignment:
      Math.abs(resolved.testCharge) <= 0.02
        ? "none"
        : resolved.testCharge > 0
          ? "aligned"
          : "opposed",
  };
}

function buildSliceSeries(
  id: string,
  label: string,
  sampleY: (probeX: number) => number,
  color: string,
) {
  return buildSeries(
    id,
    label,
    sampleRange(
      ELECTRIC_FIELDS_STAGE_MIN_X,
      ELECTRIC_FIELDS_STAGE_MAX_X,
      ELECTRIC_FIELDS_GRAPH_SAMPLES,
    ).map((probeX) => ({
      x: probeX,
      y: sampleY(probeX),
    })),
    color,
  );
}

export function buildElectricFieldsSeries(
  source: Partial<ElectricFieldsParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const resolved = resolveElectricFieldsParams(source);
  const sampleAt = (probeX: number) =>
    sampleElectricFieldsState(resolved, {
      probeX,
      probeY: resolved.probeY,
    });

  return {
    "field-scan": [
      buildSliceSeries(
        "source-a-ex",
        copyText(locale, "Source A E_x", "來源 A 的 E_x"),
        (probeX) => sampleAt(probeX).sourceA.fieldX,
        "#f0ab3c",
      ),
      buildSliceSeries(
        "source-b-ex",
        copyText(locale, "Source B E_x", "來源 B 的 E_x"),
        (probeX) => sampleAt(probeX).sourceB.fieldX,
        "#4ea6df",
      ),
      buildSliceSeries(
        "net-ex",
        copyText(locale, "Net E_x", "合成 E_x"),
        (probeX) => sampleAt(probeX).fieldX,
        "#1ea6a2",
      ),
    ],
    "direction-scan": [
      buildSliceSeries(
        "net-ey",
        copyText(locale, "Net E_y", "合成 E_y"),
        (probeX) => sampleAt(probeX).fieldY,
        "#f16659",
      ),
      buildSliceSeries(
        "net-strength",
        "|E|",
        (probeX) => sampleAt(probeX).fieldMagnitude,
        "#0f1c24",
      ),
    ],
  };
}

export function describeElectricFieldsState(
  source: Partial<ElectricFieldsParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
) {
  const snapshot = sampleElectricFieldsState(source);
  const fieldDirection = describeVectorDirection(snapshot.fieldX, snapshot.fieldY, locale);
  const forceDirection = describeVectorDirection(snapshot.forceX, snapshot.forceY, locale);
  const alignmentText =
    snapshot.forceAlignment === "none"
      ? copyText(
          locale,
          "A zero test charge would feel no force even though the field still exists.",
          "即使電場仍然存在，零測試電荷也不會受到任何力。",
        )
      : snapshot.forceAlignment === "aligned"
        ? copyText(
            locale,
            "Because the test charge is positive, the force arrow stays aligned with the field.",
            "因為測試電荷為正，所以受力箭頭會與電場方向一致。",
          )
        : copyText(
            locale,
            "Because the test charge is negative, the force arrow flips opposite the field.",
            "因為測試電荷為負，所以受力箭頭會反向指向電場的相反方向。",
          );

  if (locale === "zh-HK") {
    return `在探針位置 (${formatMeasurement(snapshot.probeX, "m")}, ${formatMeasurement(snapshot.probeY, "m")})，相隔 ${formatMeasurement(snapshot.sourceSeparation, "m")} 的 ${formatNumber(snapshot.sourceChargeA)} q 與 ${formatNumber(snapshot.sourceChargeB)} q 來源會產生 E_x = ${formatNumber(snapshot.fieldX)}、E_y = ${formatNumber(snapshot.fieldY)}，因此合成電場大小為 ${formatNumber(snapshot.fieldMagnitude)}（場單位），方向${fieldDirection}。測試電荷為 ${formatNumber(snapshot.testCharge)} q，所以受力大小為 ${formatNumber(snapshot.forceMagnitude)}（力單位），方向${forceDirection}。${alignmentText}`;
  }

  return `At the probe (${formatMeasurement(snapshot.probeX, "m")}, ${formatMeasurement(snapshot.probeY, "m")}), charges ${formatNumber(snapshot.sourceChargeA)} q and ${formatNumber(snapshot.sourceChargeB)} q separated by ${formatMeasurement(snapshot.sourceSeparation, "m")} produce E_x = ${formatNumber(snapshot.fieldX)} and E_y = ${formatNumber(snapshot.fieldY)}, so the net field is ${formatNumber(snapshot.fieldMagnitude)} in field units and points ${fieldDirection}. The test charge is ${formatNumber(snapshot.testCharge)} q, so the force is ${formatNumber(snapshot.forceMagnitude)} in force units and points ${forceDirection}. ${alignmentText}`;
}
