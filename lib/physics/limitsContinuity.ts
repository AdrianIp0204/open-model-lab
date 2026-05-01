import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphPoint, GraphSeriesMap } from "./types";

export const LIMITS_CONTINUITY_DOMAIN_MIN = -3.2;
export const LIMITS_CONTINUITY_DOMAIN_MAX = 3.2;
export const LIMITS_CONTINUITY_DISTANCE_MIN = 0.08;
export const LIMITS_CONTINUITY_DISTANCE_MAX = 1.8;
export const LIMITS_CONTINUITY_TARGET_X = 0;

const FUNCTION_SAMPLES = 241;
const APPROACH_SAMPLES = 181;
const TARGET_GAP = 0.08;

export const limitsContinuityCases = [
  {
    key: "continuous",
    label: "Continuous",
    continuityLabel: "continuous",
    finiteLimitValue: 1.1,
    actualValue: 1.1,
    actualDefined: true,
  },
  {
    key: "removable-hole",
    label: "Removable hole",
    continuityLabel: "removable discontinuity",
    finiteLimitValue: 0.9,
    actualValue: 2.4,
    actualDefined: true,
  },
  {
    key: "jump",
    label: "Jump",
    continuityLabel: "jump discontinuity",
    finiteLimitValue: null,
    actualValue: 0.15,
    actualDefined: true,
  },
  {
    key: "blow-up",
    label: "Blow-up",
    continuityLabel: "infinite blow-up",
    finiteLimitValue: null,
    actualValue: null,
    actualDefined: false,
  },
] as const;

export type LimitsContinuityCase = (typeof limitsContinuityCases)[number];
export type LimitsContinuityCaseKey = LimitsContinuityCase["key"];

export type LimitsContinuityParams = {
  caseIndex?: number;
  approachDistance?: number;
};

export type LimitsContinuitySnapshot = {
  caseIndex: number;
  caseKey: LimitsContinuityCaseKey;
  caseLabel: string;
  continuityLabel: string;
  targetX: number;
  approachDistance: number;
  leftX: number;
  rightX: number;
  leftValue: number;
  rightValue: number;
  leftLimitValue: number | null;
  rightLimitValue: number | null;
  finiteLimitValue: number | null;
  actualValue: number | null;
  actualDefined: boolean;
  oneSidedGap: number;
  limitActualGap: number | null;
};

export type LimitsContinuityCurveSegment = {
  id: string;
  points: GraphPoint[];
};

function clampCaseIndex(raw: number) {
  return clamp(
    Math.round(raw),
    0,
    limitsContinuityCases.length - 1,
  );
}

export function resolveLimitsContinuityCase(caseIndex: number) {
  return limitsContinuityCases[clampCaseIndex(caseIndex)]!;
}

export function resolveLimitsContinuityParams(
  source:
    | Partial<LimitsContinuityParams>
    | Record<string, number | boolean | string>,
): Required<LimitsContinuityParams> {
  return {
    caseIndex: clampCaseIndex(safeNumber(source.caseIndex, 0)),
    approachDistance: clamp(
      safeNumber(source.approachDistance, 0.6),
      LIMITS_CONTINUITY_DISTANCE_MIN,
      LIMITS_CONTINUITY_DISTANCE_MAX,
    ),
  };
}

function continuousValue(x: number) {
  return 1.1 + 0.45 * x;
}

function removableValue(x: number) {
  return 0.9 + 0.35 * x;
}

function jumpValue(x: number) {
  return x < 0 ? -1.1 + 0.25 * x : 1.3 + 0.25 * x;
}

function blowUpValue(x: number) {
  return 0.28 / x;
}

export function sampleLimitsContinuityValue(
  caseKey: LimitsContinuityCaseKey,
  x: number,
) {
  switch (caseKey) {
    case "continuous":
      return continuousValue(x);
    case "removable-hole":
      return removableValue(x);
    case "jump":
      return jumpValue(x);
    case "blow-up":
      return blowUpValue(x);
  }
}

export function sampleLimitsContinuityCurveSegments(
  source:
    | Partial<LimitsContinuityParams>
    | Record<string, number | boolean | string>,
): LimitsContinuityCurveSegment[] {
  const resolved = resolveLimitsContinuityParams(source);
  const activeCase = resolveLimitsContinuityCase(resolved.caseIndex);

  const createSegment = (id: string, start: number, end: number, samples: number) => ({
    id,
    points: sampleRange(start, end, samples).map((x) => ({
      x,
      y: sampleLimitsContinuityValue(activeCase.key, x),
    })),
  });

  if (activeCase.key === "continuous") {
    return [
      createSegment(
        "continuous-curve",
        LIMITS_CONTINUITY_DOMAIN_MIN,
        LIMITS_CONTINUITY_DOMAIN_MAX,
        FUNCTION_SAMPLES,
      ),
    ];
  }

  const leftSegment = createSegment(
    "left-curve",
    LIMITS_CONTINUITY_DOMAIN_MIN,
    -TARGET_GAP,
    Math.floor(FUNCTION_SAMPLES / 2),
  );
  const rightSegment = createSegment(
    "right-curve",
    TARGET_GAP,
    LIMITS_CONTINUITY_DOMAIN_MAX,
    Math.floor(FUNCTION_SAMPLES / 2),
  );

  return [leftSegment, rightSegment];
}

function resolveLeftLimitValue(activeCase: LimitsContinuityCase) {
  switch (activeCase.key) {
    case "continuous":
      return activeCase.finiteLimitValue;
    case "removable-hole":
      return activeCase.finiteLimitValue;
    case "jump":
      return -1.1;
    case "blow-up":
      return null;
  }
}

function resolveRightLimitValue(activeCase: LimitsContinuityCase) {
  switch (activeCase.key) {
    case "continuous":
      return activeCase.finiteLimitValue;
    case "removable-hole":
      return activeCase.finiteLimitValue;
    case "jump":
      return 1.3;
    case "blow-up":
      return null;
  }
}

export function sampleLimitsContinuityState(
  source:
    | Partial<LimitsContinuityParams>
    | Record<string, number | boolean | string>,
): LimitsContinuitySnapshot {
  const resolved = resolveLimitsContinuityParams(source);
  const activeCase = resolveLimitsContinuityCase(resolved.caseIndex);
  const leftX = LIMITS_CONTINUITY_TARGET_X - resolved.approachDistance;
  const rightX = LIMITS_CONTINUITY_TARGET_X + resolved.approachDistance;
  const leftValue = sampleLimitsContinuityValue(activeCase.key, leftX);
  const rightValue = sampleLimitsContinuityValue(activeCase.key, rightX);
  const leftLimitValue = resolveLeftLimitValue(activeCase);
  const rightLimitValue = resolveRightLimitValue(activeCase);

  return {
    caseIndex: resolved.caseIndex,
    caseKey: activeCase.key,
    caseLabel: activeCase.label,
    continuityLabel: activeCase.continuityLabel,
    targetX: LIMITS_CONTINUITY_TARGET_X,
    approachDistance: resolved.approachDistance,
    leftX,
    rightX,
    leftValue,
    rightValue,
    leftLimitValue,
    rightLimitValue,
    finiteLimitValue: activeCase.finiteLimitValue,
    actualValue: activeCase.actualValue,
    actualDefined: activeCase.actualDefined,
    oneSidedGap: Math.abs(rightValue - leftValue),
    limitActualGap:
      activeCase.finiteLimitValue === null || activeCase.actualValue === null
        ? null
        : Math.abs(activeCase.actualValue - activeCase.finiteLimitValue),
  };
}

export function buildLimitsContinuitySeries(
  source:
    | Partial<LimitsContinuityParams>
    | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const resolved = resolveLimitsContinuityParams(source);
  const snapshot = sampleLimitsContinuityState(resolved);
  const hs = sampleRange(
    LIMITS_CONTINUITY_DISTANCE_MIN,
    LIMITS_CONTINUITY_DISTANCE_MAX,
    APPROACH_SAMPLES,
  );
  const oneSidedSeries = [
    buildSeries(
      "left-approach",
      "From the left",
      hs.map((distance) => ({
        x: distance,
        y: sampleLimitsContinuityValue(snapshot.caseKey, -distance),
      })),
      "#f2a43a",
    ),
    buildSeries(
      "right-approach",
      "From the right",
      hs.map((distance) => ({
        x: distance,
        y: sampleLimitsContinuityValue(snapshot.caseKey, distance),
      })),
      "#4ea6df",
    ),
  ];

  if (snapshot.finiteLimitValue !== null) {
    oneSidedSeries.push(
      buildSeries(
        "finite-limit",
        "Finite limit",
        hs.map((distance) => ({ x: distance, y: snapshot.finiteLimitValue! })),
        "#1ea672",
        true,
      ),
    );
  }

  if (snapshot.actualDefined && snapshot.actualValue !== null) {
    oneSidedSeries.push(
      buildSeries(
        "actual-value",
        "Actual f(0)",
        hs.map((distance) => ({ x: distance, y: snapshot.actualValue! })),
        "#f16659",
        true,
      ),
    );
  }

  return {
    "one-sided-approach": oneSidedSeries,
  };
}

export function describeLimitsContinuityState(
  source:
    | Partial<LimitsContinuityParams>
    | Record<string, number | boolean | string>,
) {
  const snapshot = sampleLimitsContinuityState(source);

  if (snapshot.caseKey === "continuous") {
    return `At distance h = ${formatNumber(snapshot.approachDistance)}, the left-hand value is ${formatNumber(snapshot.leftValue)} and the right-hand value is ${formatNumber(snapshot.rightValue)}. Both sides are approaching the same finite height of ${formatNumber(snapshot.finiteLimitValue ?? 0)}, and the actual function value matches it, so the graph is continuous at the target.`;
  }

  if (snapshot.caseKey === "removable-hole") {
    return `At distance h = ${formatNumber(snapshot.approachDistance)}, the left-hand value is ${formatNumber(snapshot.leftValue)} and the right-hand value is ${formatNumber(snapshot.rightValue)}. Both sides are approaching the same finite height of ${formatNumber(snapshot.finiteLimitValue ?? 0)}, but the actual function value at the target is ${formatNumber(snapshot.actualValue ?? 0)}, so the graph has a removable discontinuity.`;
  }

  if (snapshot.caseKey === "jump") {
    return `At distance h = ${formatNumber(snapshot.approachDistance)}, the left-hand value is ${formatNumber(snapshot.leftValue)} and the right-hand value is ${formatNumber(snapshot.rightValue)}. The left and right sides are settling toward different heights, so there is no single two-sided limit at the target.`;
  }

  return `At distance h = ${formatNumber(snapshot.approachDistance)}, the left-hand value is ${formatNumber(snapshot.leftValue)} and the right-hand value is ${formatNumber(snapshot.rightValue)}. The values grow without bound with opposite signs near the target, so there is no finite two-sided limit and no defined function value there.`;
}
