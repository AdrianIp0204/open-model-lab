import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphPoint, GraphSeriesMap } from "./types";

export const RATIONAL_FUNCTIONS_DOMAIN_MIN = -6;
export const RATIONAL_FUNCTIONS_DOMAIN_MAX = 6;
export const RATIONAL_FUNCTIONS_Y_MIN = -10;
export const RATIONAL_FUNCTIONS_Y_MAX = 10;
export const RATIONAL_FUNCTIONS_ASYMPTOTE_MIN = -4;
export const RATIONAL_FUNCTIONS_ASYMPTOTE_MAX = 4;
export const RATIONAL_FUNCTIONS_HORIZONTAL_ASYMPTOTE_MIN = -4;
export const RATIONAL_FUNCTIONS_HORIZONTAL_ASYMPTOTE_MAX = 4;
export const RATIONAL_FUNCTIONS_BRANCH_SCALE_MIN = -3;
export const RATIONAL_FUNCTIONS_BRANCH_SCALE_MAX = 3;
export const RATIONAL_FUNCTIONS_BRANCH_SCALE_MIN_MAGNITUDE = 0.4;
export const RATIONAL_FUNCTIONS_DISTANCE_MIN = 0.25;
export const RATIONAL_FUNCTIONS_DISTANCE_MAX = 2.2;
export const RATIONAL_FUNCTIONS_HOLE_MIN = -4.8;
export const RATIONAL_FUNCTIONS_HOLE_MAX = 4.8;

const SERIES_SAMPLES = 241;
const RESPONSE_SAMPLES = 181;
const DOMAIN_GAP = 0.05;
const MIN_BREAK_SEPARATION = 0.6;
const BREAK_TOLERANCE = 1e-6;

export type RationalFunctionsParams = {
  asymptoteX?: number;
  horizontalAsymptoteY?: number;
  branchScale?: number;
  sampleDistance?: number;
  showHole?: boolean;
  holeX?: number;
};

type ResolvedRationalFunctionsParams = {
  asymptoteX: number;
  horizontalAsymptoteY: number;
  branchScale: number;
  sampleDistance: number;
  showHole: boolean;
  holeX: number | null;
};

type RationalFunctionsInput =
  | Partial<RationalFunctionsParams>
  | Record<string, number | boolean | string>
  | ResolvedRationalFunctionsParams;

export type RationalFunctionsSnapshot = {
  asymptoteX: number;
  horizontalAsymptoteY: number;
  branchScale: number;
  sampleDistance: number;
  showHole: boolean;
  holeX: number | null;
  domainBreaks: number[];
  leftProbeX: number;
  rightProbeX: number;
  leftProbeValue: number;
  rightProbeValue: number;
  xIntercept: number | null;
  xInterceptDefined: boolean;
  yIntercept: number | null;
  yInterceptDefined: boolean;
  holeValue: number | null;
  farLeftValue: number;
  farRightValue: number;
};

export type RationalFunctionsCurveSegment = {
  id: string;
  points: GraphPoint[];
};

function resolveBranchScale(raw: number) {
  const clamped = clamp(
    raw,
    RATIONAL_FUNCTIONS_BRANCH_SCALE_MIN,
    RATIONAL_FUNCTIONS_BRANCH_SCALE_MAX,
  );

  if (Math.abs(clamped) < RATIONAL_FUNCTIONS_BRANCH_SCALE_MIN_MAGNITUDE) {
    return clamped < 0
      ? -RATIONAL_FUNCTIONS_BRANCH_SCALE_MIN_MAGNITUDE
      : RATIONAL_FUNCTIONS_BRANCH_SCALE_MIN_MAGNITUDE;
  }

  return clamped;
}

function resolveHoleX(raw: number, asymptoteX: number) {
  const clamped = clamp(raw, RATIONAL_FUNCTIONS_HOLE_MIN, RATIONAL_FUNCTIONS_HOLE_MAX);

  if (Math.abs(clamped - asymptoteX) >= MIN_BREAK_SEPARATION) {
    return clamped;
  }

  const nudged =
    clamped >= asymptoteX
      ? asymptoteX + MIN_BREAK_SEPARATION
      : asymptoteX - MIN_BREAK_SEPARATION;

  return clamp(nudged, RATIONAL_FUNCTIONS_HOLE_MIN, RATIONAL_FUNCTIONS_HOLE_MAX);
}

export function resolveRationalFunctionsParams(
  source: RationalFunctionsInput,
): ResolvedRationalFunctionsParams {
  const asymptoteX = clamp(
    safeNumber(source.asymptoteX, 1),
    RATIONAL_FUNCTIONS_ASYMPTOTE_MIN,
    RATIONAL_FUNCTIONS_ASYMPTOTE_MAX,
  );
  const showHole = source.showHole === true;
  const holeX = showHole
    ? resolveHoleX(safeNumber(source.holeX, -1.2), asymptoteX)
    : null;

  return {
    asymptoteX,
    horizontalAsymptoteY: clamp(
      safeNumber(source.horizontalAsymptoteY, -1),
      RATIONAL_FUNCTIONS_HORIZONTAL_ASYMPTOTE_MIN,
      RATIONAL_FUNCTIONS_HORIZONTAL_ASYMPTOTE_MAX,
    ),
    branchScale: resolveBranchScale(safeNumber(source.branchScale, 2)),
    sampleDistance: clamp(
      safeNumber(source.sampleDistance, 0.65),
      RATIONAL_FUNCTIONS_DISTANCE_MIN,
      RATIONAL_FUNCTIONS_DISTANCE_MAX,
    ),
    showHole,
    holeX,
  };
}

export function evaluateRationalFunction(
  source: RationalFunctionsInput,
  x: number,
) {
  const params = resolveRationalFunctionsParams(source);
  return params.horizontalAsymptoteY + params.branchScale / (x - params.asymptoteX);
}

export function sampleRationalFunctionsState(
  source: RationalFunctionsInput,
): RationalFunctionsSnapshot {
  const params = resolveRationalFunctionsParams(source);
  const domainBreaks = [params.asymptoteX, params.showHole ? params.holeX : null]
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const leftProbeX = params.asymptoteX - params.sampleDistance;
  const rightProbeX = params.asymptoteX + params.sampleDistance;
  const leftProbeValue = evaluateRationalFunction(params, leftProbeX);
  const rightProbeValue = evaluateRationalFunction(params, rightProbeX);
  const yInterceptDefined = !domainBreaks.some((value) => Math.abs(value) <= BREAK_TOLERANCE);
  const yIntercept = yInterceptDefined ? evaluateRationalFunction(params, 0) : null;
  const xInterceptCandidate =
    Math.abs(params.horizontalAsymptoteY) <= BREAK_TOLERANCE
      ? null
      : params.asymptoteX - params.branchScale / params.horizontalAsymptoteY;
  const xInterceptDefined =
    xInterceptCandidate !== null &&
    !domainBreaks.some((value) => Math.abs(value - xInterceptCandidate) <= BREAK_TOLERANCE);

  return {
    asymptoteX: params.asymptoteX,
    horizontalAsymptoteY: params.horizontalAsymptoteY,
    branchScale: params.branchScale,
    sampleDistance: params.sampleDistance,
    showHole: params.showHole,
    holeX: params.holeX,
    domainBreaks,
    leftProbeX,
    rightProbeX,
    leftProbeValue,
    rightProbeValue,
    xIntercept: xInterceptDefined ? xInterceptCandidate : null,
    xInterceptDefined,
    yIntercept,
    yInterceptDefined,
    holeValue:
      params.showHole && params.holeX !== null
        ? evaluateRationalFunction(params, params.holeX)
        : null,
    farLeftValue: evaluateRationalFunction(params, RATIONAL_FUNCTIONS_DOMAIN_MIN),
    farRightValue: evaluateRationalFunction(params, RATIONAL_FUNCTIONS_DOMAIN_MAX),
  };
}

export function sampleRationalFunctionsCurveSegments(
  source: RationalFunctionsInput,
): RationalFunctionsCurveSegment[] {
  const snapshot = sampleRationalFunctionsState(source);
  const breaks = snapshot.domainBreaks.filter(
    (value) =>
      value > RATIONAL_FUNCTIONS_DOMAIN_MIN + DOMAIN_GAP &&
      value < RATIONAL_FUNCTIONS_DOMAIN_MAX - DOMAIN_GAP,
  );
  const bounds = [RATIONAL_FUNCTIONS_DOMAIN_MIN, ...breaks, RATIONAL_FUNCTIONS_DOMAIN_MAX];
  const segments: RationalFunctionsCurveSegment[] = [];

  for (let index = 0; index < bounds.length - 1; index += 1) {
    const rawStart = bounds[index]!;
    const rawEnd = bounds[index + 1]!;
    const start = index === 0 ? rawStart : rawStart + DOMAIN_GAP;
    const end = index === bounds.length - 2 ? rawEnd : rawEnd - DOMAIN_GAP;

    if (end <= start) {
      continue;
    }

    const points = sampleRange(start, end, SERIES_SAMPLES).map((x) => ({
      x,
      y: evaluateRationalFunction(snapshot, x),
    }));

    if (points.length > 1) {
      segments.push({
        id: `segment-${index + 1}`,
        points,
      });
    }
  }

  return segments;
}

export function buildRationalFunctionsSeries(
  source: RationalFunctionsInput,
): GraphSeriesMap {
  const snapshot = sampleRationalFunctionsState(source);
  const distances = sampleRange(
    RATIONAL_FUNCTIONS_DISTANCE_MIN,
    RATIONAL_FUNCTIONS_DISTANCE_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "asymptote-response": [
      buildSeries(
        "left-approach",
        "Left of x = h",
        distances.map((distance) => ({
          x: distance,
          y: evaluateRationalFunction(snapshot, snapshot.asymptoteX - distance),
        })),
        "#f2a43a",
      ),
      buildSeries(
        "right-approach",
        "Right of x = h",
        distances.map((distance) => ({
          x: distance,
          y: evaluateRationalFunction(snapshot, snapshot.asymptoteX + distance),
        })),
        "#4ea6df",
      ),
      buildSeries(
        "horizontal-asymptote",
        "Horizontal asymptote",
        distances.map((distance) => ({
          x: distance,
          y: snapshot.horizontalAsymptoteY,
        })),
        "#1ea672",
        true,
      ),
    ],
  };
}

export function describeRationalFunctionsState(
  source: RationalFunctionsInput,
) {
  const snapshot = sampleRationalFunctionsState(source);
  const branchSummary =
    snapshot.branchScale > 0
      ? "To the right of the vertical asymptote the branch sits above the horizontal asymptote, while the left branch sits below it."
      : "To the right of the vertical asymptote the branch sits below the horizontal asymptote, while the left branch sits above it.";
  const holeSummary =
    snapshot.showHole && snapshot.holeX !== null && snapshot.holeValue !== null
      ? ` A removable hole sits at x = ${formatNumber(snapshot.holeX)}, where the nearby curve is aiming at y = ${formatNumber(snapshot.holeValue)}.`
      : "";
  const interceptSummary = [
    snapshot.xInterceptDefined && snapshot.xIntercept !== null
      ? `x-intercept near ${formatNumber(snapshot.xIntercept)}`
      : "no visible x-intercept",
    snapshot.yInterceptDefined && snapshot.yIntercept !== null
      ? `y-intercept ${formatNumber(snapshot.yIntercept)}`
      : "y-intercept removed",
  ].join(", ");

  return `The reciprocal family has vertical asymptote x = ${formatNumber(snapshot.asymptoteX)} and horizontal asymptote y = ${formatNumber(snapshot.horizontalAsymptoteY)}. At distance d = ${formatNumber(snapshot.sampleDistance)}, the left branch is ${formatNumber(snapshot.leftProbeValue)} and the right branch is ${formatNumber(snapshot.rightProbeValue)}. ${branchSummary} The domain breaks at ${snapshot.domainBreaks.map((value) => formatNumber(value)).join(" and ")}, with ${interceptSummary}.${holeSummary}`;
}

export function formatRationalFunctionsDomain(snapshot: RationalFunctionsSnapshot) {
  return snapshot.domainBreaks.map((value) => `x != ${formatNumber(value)}`).join(", ");
}

export function getRationalFunctionsBranchSummary(snapshot: RationalFunctionsSnapshot) {
  if (snapshot.branchScale > 0) {
    return "Right branch above y = k, left branch below y = k.";
  }

  return "Right branch below y = k, left branch above y = k.";
}

export function getRationalFunctionsEndBehaviorSummary(snapshot: RationalFunctionsSnapshot) {
  const leftDirection =
    snapshot.farLeftValue > snapshot.horizontalAsymptoteY ? "from above" : "from below";
  const rightDirection =
    snapshot.farRightValue > snapshot.horizontalAsymptoteY ? "from above" : "from below";

  return `Far left and far right the graph settles toward y = ${formatNumber(snapshot.horizontalAsymptoteY)} from ${leftDirection} on the left and ${rightDirection} on the right.`;
}
