import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber } from "./math";
import type { GraphSeriesMap } from "./types";
import {
  buildBinarySearchValues,
  BINARY_SEARCH_ARRAY_SIZE_MAX,
  BINARY_SEARCH_ARRAY_SIZE_MIN,
} from "./algorithmFoundation";

export type BinarySearchHalvingParams = {
  arraySize?: number;
  targetIndex?: number;
  linearContrast?: boolean;
};

export type BinarySearchHalvingTone = "teal" | "amber" | "coral" | "sky" | "ink";

export type BinarySearchHalvingHighlight = {
  index: number;
  tone: BinarySearchHalvingTone;
  outline?: boolean;
};

export type BinarySearchHalvingPointer = {
  index: number;
  label: string;
  tone: BinarySearchHalvingTone;
};

export type BinarySearchHalvingFrame = {
  values: number[];
  highlights: BinarySearchHalvingHighlight[];
  pointers: BinarySearchHalvingPointer[];
  interval: { start: number; end: number } | null;
  visitedBinaryIndices: number[];
  linearVisitedIndices: number[];
  comparisons: number;
  linearComparisons: number;
  found: boolean;
  completed: boolean;
  stepLabel: string;
  statusLine: string;
  lowIndex: number;
  midIndex: number;
  highIndex: number;
};

export type BinarySearchHalvingSnapshot = BinarySearchHalvingFrame & {
  arraySize: number;
  targetIndex: number;
  targetValue: number;
  linearContrast: boolean;
  intervalWidth: number;
  binaryLead: number;
  duration: number;
  stepCount: number;
};

export const BINARY_SEARCH_FRAME_DURATION = 0.72;

function cloneFrame(frame: BinarySearchHalvingFrame): BinarySearchHalvingFrame {
  return {
    ...frame,
    values: [...frame.values],
    highlights: frame.highlights.map((item) => ({ ...item })),
    pointers: frame.pointers.map((item) => ({ ...item })),
    interval: frame.interval ? { ...frame.interval } : null,
    visitedBinaryIndices: [...frame.visitedBinaryIndices],
    linearVisitedIndices: [...frame.linearVisitedIndices],
  };
}

function pushFrame(
  frames: BinarySearchHalvingFrame[],
  values: number[],
  options: Omit<BinarySearchHalvingFrame, "values">,
) {
  frames.push({
    ...options,
    values: [...values],
  });
}

export function resolveBinarySearchHalvingParams(
  source: Partial<BinarySearchHalvingParams> | Record<string, number | boolean | string>,
): Required<BinarySearchHalvingParams> {
  const arraySize = Math.round(
    clamp(safeNumber(source.arraySize, 14), BINARY_SEARCH_ARRAY_SIZE_MIN, BINARY_SEARCH_ARRAY_SIZE_MAX),
  );

  return {
    arraySize,
    targetIndex: Math.round(clamp(safeNumber(source.targetIndex, Math.floor(arraySize / 2)), 0, arraySize - 1)),
    linearContrast: source.linearContrast !== false,
  };
}

function buildBinarySearchFrames(params: Required<BinarySearchHalvingParams>) {
  const values = buildBinarySearchValues(params.arraySize);
  const targetValue = values[params.targetIndex] ?? values[0] ?? 0;
  const frames: BinarySearchHalvingFrame[] = [];
  const visitedBinary = new Set<number>();
  let low = 0;
  let high = values.length - 1;
  let comparisons = 0;

  const resolveLinearVisited = () =>
    Array.from({ length: Math.min(comparisons, params.targetIndex + 1) }, (_, index) => index);

  const buildHighlights = (midIndex: number, found: boolean) => {
    const highlights: BinarySearchHalvingHighlight[] = Array.from(visitedBinary).map((index) => ({
      index,
      tone: "sky",
      outline: true,
    }));

    highlights.push({
      index: params.targetIndex,
      tone: found ? "teal" : "coral",
      outline: !found,
    });
    highlights.push({
      index: midIndex,
      tone: found ? "teal" : "amber",
    });

    return highlights;
  };

  let mid = Math.floor((low + high) / 2);

  pushFrame(frames, values, {
    highlights: buildHighlights(mid, false),
    pointers: [
      { index: low, label: "low", tone: "teal" },
      { index: mid, label: "mid", tone: "amber" },
      { index: high, label: "high", tone: "sky" },
      { index: params.targetIndex, label: "target", tone: "coral" },
    ],
    interval: { start: low, end: high },
    visitedBinaryIndices: [],
    linearVisitedIndices: [],
    comparisons,
    linearComparisons: 0,
    found: false,
    completed: false,
    stepLabel: "Binary search ready",
    statusLine: "Binary search starts with the whole ordered array, then keeps halving the live interval.",
    lowIndex: low,
    midIndex: mid,
    highIndex: high,
  });

  while (low <= high) {
    mid = Math.floor((low + high) / 2);
    visitedBinary.add(mid);
    comparisons += 1;
    const found = values[mid] === targetValue;

    pushFrame(frames, values, {
      highlights: buildHighlights(mid, found),
      pointers: [
        { index: low, label: "low", tone: "teal" },
        { index: mid, label: found ? "found" : "mid", tone: found ? "teal" : "amber" },
        { index: high, label: "high", tone: "sky" },
        { index: params.targetIndex, label: "target", tone: "coral" },
      ],
      interval: { start: low, end: high },
      visitedBinaryIndices: [...visitedBinary].sort((left, right) => left - right),
      linearVisitedIndices: resolveLinearVisited(),
      comparisons,
      linearComparisons: resolveLinearVisited().length,
      found,
      completed: found,
      stepLabel: `Check index ${mid}`,
      statusLine: found
        ? "The midpoint hit the target exactly, so the search is done."
        : values[mid] > targetValue
          ? "The midpoint is too large, so the target can only live in the left half."
          : "The midpoint is too small, so the target can only live in the right half.",
      lowIndex: low,
      midIndex: mid,
      highIndex: high,
    });

    if (found) {
      break;
    }

    if (values[mid] > targetValue) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }

    if (low <= high) {
      const nextMid = Math.floor((low + high) / 2);
      pushFrame(frames, values, {
        highlights: buildHighlights(nextMid, false),
        pointers: [
          { index: low, label: "low", tone: "teal" },
          { index: nextMid, label: "next mid", tone: "amber" },
          { index: high, label: "high", tone: "sky" },
          { index: params.targetIndex, label: "target", tone: "coral" },
        ],
        interval: { start: low, end: high },
        visitedBinaryIndices: [...visitedBinary].sort((left, right) => left - right),
        linearVisitedIndices: resolveLinearVisited(),
        comparisons,
        linearComparisons: resolveLinearVisited().length,
        found: false,
        completed: false,
        stepLabel: "Interval halved",
        statusLine: "Only the surviving half stays active, so the next midpoint check is already far more targeted.",
        lowIndex: low,
        midIndex: nextMid,
        highIndex: high,
      });
    }
  }

  const finalFrame = frames.at(-1);
  if (finalFrame && !finalFrame.completed) {
    pushFrame(frames, values, {
      ...finalFrame,
      completed: true,
      stepLabel: "Binary search stopped",
      statusLine: "The target is no longer inside the active interval, so the search has exhausted the ordered list.",
    });
  }

  return frames;
}

export function buildBinarySearchHalvingFrames(
  source: Partial<BinarySearchHalvingParams> | Record<string, number | boolean | string>,
) {
  return buildBinarySearchFrames(resolveBinarySearchHalvingParams(source)).map(cloneFrame);
}

export function resolveBinarySearchHalvingDuration(
  source: Partial<BinarySearchHalvingParams> | Record<string, number | boolean | string>,
) {
  const frames = buildBinarySearchFrames(resolveBinarySearchHalvingParams(source));
  return Math.max(0, (frames.length - 1) * BINARY_SEARCH_FRAME_DURATION);
}

export function sampleBinarySearchHalvingState(
  source: Partial<BinarySearchHalvingParams> | Record<string, number | boolean | string>,
  time: number,
): BinarySearchHalvingSnapshot {
  const params = resolveBinarySearchHalvingParams(source);
  const frames = buildBinarySearchFrames(params);
  const values = buildBinarySearchValues(params.arraySize);
  const frameIndex = frames.length
    ? clamp(Math.floor(Math.max(time, 0) / BINARY_SEARCH_FRAME_DURATION), 0, frames.length - 1)
    : 0;
  const frame = frames[frameIndex] ?? frames[0];
  const intervalWidth =
    frame?.interval ? frame.interval.end - frame.interval.start + 1 : 0;
  const linearCost = params.targetIndex + 1;

  return {
    ...(frame ?? {
      values,
      highlights: [],
      pointers: [],
      interval: { start: 0, end: values.length - 1 },
      visitedBinaryIndices: [],
      linearVisitedIndices: [],
      comparisons: 0,
      linearComparisons: 0,
      found: false,
      completed: false,
      stepLabel: "Binary search ready",
      statusLine: "The ordered list is ready for a midpoint search.",
      lowIndex: 0,
      midIndex: Math.floor((values.length - 1) / 2),
      highIndex: values.length - 1,
    }),
    arraySize: params.arraySize,
    targetIndex: params.targetIndex,
    targetValue: values[params.targetIndex] ?? values[0] ?? 0,
    linearContrast: params.linearContrast,
    intervalWidth,
    binaryLead: Math.max(linearCost - (frame?.comparisons ?? 0), 0),
    duration: Math.max(0, (frames.length - 1) * BINARY_SEARCH_FRAME_DURATION),
    stepCount: frames.length,
  };
}

export function buildBinarySearchHalvingSeries(
  source: Partial<BinarySearchHalvingParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const frames = buildBinarySearchFrames(resolveBinarySearchHalvingParams(source));

  return {
    "interval-width-history": [
      buildSeries(
        "interval-width",
        "interval width",
        frames.map((frame, index) => ({
          x: index * BINARY_SEARCH_FRAME_DURATION,
          y: frame.interval ? frame.interval.end - frame.interval.start + 1 : 0,
        })),
        "#1ea6a2",
      ),
    ],
    "pointer-history": [
      buildSeries(
        "low-index",
        "low",
        frames.map((frame, index) => ({
          x: index * BINARY_SEARCH_FRAME_DURATION,
          y: frame.lowIndex,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "mid-index",
        "mid",
        frames.map((frame, index) => ({
          x: index * BINARY_SEARCH_FRAME_DURATION,
          y: frame.midIndex,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "high-index",
        "high",
        frames.map((frame, index) => ({
          x: index * BINARY_SEARCH_FRAME_DURATION,
          y: frame.highIndex,
        })),
        "#f16659",
      ),
    ],
    "checks-history": [
      buildSeries(
        "binary-checks",
        "binary checks",
        frames.map((frame, index) => ({
          x: index * BINARY_SEARCH_FRAME_DURATION,
          y: frame.comparisons,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "linear-checks",
        "linear checks",
        frames.map((frame, index) => ({
          x: index * BINARY_SEARCH_FRAME_DURATION,
          y: frame.linearComparisons,
        })),
        "#0f172a",
      ),
    ],
  };
}

export function describeBinarySearchHalvingState(
  source: Partial<BinarySearchHalvingParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleBinarySearchHalvingState(source, time);
  const intervalSummary = snapshot.interval
    ? `The live interval spans ${snapshot.interval.start} to ${snapshot.interval.end}, so only ${formatNumber(snapshot.intervalWidth, 0)} positions still matter.`
    : "There is no active interval left.";
  const contrastSummary = snapshot.linearContrast
    ? `A left-to-right scan would still need ${formatNumber(snapshot.targetIndex + 1, 0)} checks to guarantee the same target.`
    : "";

  return `Binary search is looking for ${formatNumber(snapshot.targetValue, 0)} inside an ordered list of ${snapshot.arraySize} values. It has used ${formatNumber(snapshot.comparisons, 0)} midpoint checks so far. ${intervalSummary} ${contrastSummary}`.trim();
}
