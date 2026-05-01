import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber } from "./math";
import type { GraphSeriesMap } from "./types";
import {
  buildPatternedArrayValues,
  countInversions,
  getMaximumInversions,
  getSortingAlgorithmLabel,
  getSortingPatternLabel,
  resolveDiscreteIndex,
  SORTING_ALGORITHM_MAX,
  SORTING_ALGORITHM_MIN,
  SORTING_ARRAY_SIZE_MAX,
  SORTING_ARRAY_SIZE_MIN,
  SORTING_PATTERN_MAX,
  SORTING_PATTERN_MIN,
} from "./algorithmFoundation";

export type SortingTradeoffsParams = {
  algorithmIndex?: number;
  patternIndex?: number;
  arraySize?: number;
};

export type SortingTradeoffsTone = "teal" | "amber" | "coral" | "sky" | "ink";

export type SortingTradeoffsHighlight = {
  index: number;
  tone: SortingTradeoffsTone;
  outline?: boolean;
};

export type SortingTradeoffsPointer = {
  index: number;
  label: string;
  tone: SortingTradeoffsTone;
};

export type SortingTradeoffsFrame = {
  values: number[];
  highlights: SortingTradeoffsHighlight[];
  pointers: SortingTradeoffsPointer[];
  settledIndices: number[];
  interval: { start: number; end: number } | null;
  comparisons: number;
  swapCount: number;
  writeCount: number;
  inversionsRemaining: number;
  completed: boolean;
  stepLabel: string;
  statusLine: string;
};

export type SortingTradeoffsSnapshot = SortingTradeoffsFrame & {
  algorithmIndex: number;
  patternIndex: number;
  arraySize: number;
  algorithmLabel: string;
  patternLabel: string;
  sortedFraction: number;
  disorderFraction: number;
  maxInversions: number;
  duration: number;
  stepCount: number;
};

export const SORTING_FRAME_DURATION = 0.52;

function buildSettledSuffix(values: number[], startIndex: number) {
  if (startIndex >= values.length) {
    return [] as number[];
  }

  return Array.from({ length: values.length - startIndex }, (_, index) => startIndex + index);
}

function buildSettledPrefix(endIndex: number) {
  if (endIndex < 0) {
    return [] as number[];
  }

  return Array.from({ length: endIndex + 1 }, (_, index) => index);
}

function cloneFrame(frame: SortingTradeoffsFrame): SortingTradeoffsFrame {
  return {
    ...frame,
    values: [...frame.values],
    highlights: frame.highlights.map((item) => ({ ...item })),
    pointers: frame.pointers.map((item) => ({ ...item })),
    settledIndices: [...frame.settledIndices],
    interval: frame.interval ? { ...frame.interval } : null,
  };
}

function pushFrame(
  frames: SortingTradeoffsFrame[],
  values: number[],
  options: Omit<SortingTradeoffsFrame, "values" | "inversionsRemaining">,
) {
  frames.push({
    ...options,
    values: [...values],
    inversionsRemaining: countInversions(values),
  });
}

function buildBubbleTrace(values: number[]) {
  const next = [...values];
  const frames: SortingTradeoffsFrame[] = [];
  let comparisons = 0;
  let swapCount = 0;
  let writeCount = 0;

  pushFrame(frames, next, {
    highlights: [],
    pointers: [
      { index: 0, label: "start", tone: "teal" },
      { index: next.length - 1, label: "end", tone: "sky" },
    ],
    settledIndices: [],
    interval: { start: 0, end: next.length - 1 },
    comparisons,
    swapCount,
    writeCount,
    completed: false,
    stepLabel: "Bubble sort ready",
    statusLine: "The largest unsorted value will keep drifting toward the right edge.",
  });

  for (let passEnd = next.length - 1; passEnd > 0; passEnd -= 1) {
    let swappedThisPass = false;

    for (let current = 0; current < passEnd; current += 1) {
      comparisons += 1;
      pushFrame(frames, next, {
        highlights: [
          { index: current, tone: "amber" },
          { index: current + 1, tone: "amber" },
          { index: passEnd, tone: "sky", outline: true },
        ],
        pointers: [
          { index: current, label: "j", tone: "amber" },
          { index: passEnd, label: "pass end", tone: "sky" },
        ],
        settledIndices: buildSettledSuffix(next, passEnd + 1),
        interval: { start: 0, end: passEnd },
        comparisons,
        swapCount,
        writeCount,
        completed: false,
        stepLabel: `Bubble compare ${current} and ${current + 1}`,
        statusLine:
          next[current] > next[current + 1]
            ? "These two bars are out of order, so the larger one needs to move right."
            : "These two bars are already in order, so the scan keeps moving.",
      });

      if (next[current] > next[current + 1]) {
        [next[current], next[current + 1]] = [next[current + 1], next[current]];
        swappedThisPass = true;
        swapCount += 1;
        writeCount += 2;
        pushFrame(frames, next, {
          highlights: [
            { index: current, tone: "coral" },
            { index: current + 1, tone: "coral" },
          ],
          pointers: [
            { index: current + 1, label: "larger value", tone: "coral" },
            { index: passEnd, label: "pass end", tone: "sky" },
          ],
          settledIndices: buildSettledSuffix(next, passEnd + 1),
          interval: { start: 0, end: passEnd },
          comparisons,
          swapCount,
          writeCount,
          completed: false,
          stepLabel: "Bubble swap",
          statusLine: "A swap pushes the larger value one slot closer to its settled place.",
        });
      }
    }

    const settledIndices = buildSettledSuffix(next, passEnd);
    pushFrame(frames, next, {
      highlights: [{ index: passEnd, tone: "teal", outline: true }],
      pointers: [{ index: passEnd, label: "settled", tone: "teal" }],
      settledIndices,
      interval: { start: 0, end: passEnd - 1 },
      comparisons,
      swapCount,
      writeCount,
      completed: passEnd === 1 || !swappedThisPass,
      stepLabel: "Bubble pass finished",
      statusLine: "The largest remaining value has now settled at the right edge.",
    });

    if (!swappedThisPass) {
      pushFrame(frames, next, {
        highlights: [],
        pointers: [{ index: 0, label: "sorted", tone: "teal" }],
        settledIndices: buildSettledPrefix(next.length - 1),
        interval: null,
        comparisons,
        swapCount,
        writeCount,
        completed: true,
        stepLabel: "Bubble sort complete",
        statusLine: "No swap was needed in the last pass, so the whole list is already sorted.",
      });
      return frames;
    }
  }

  pushFrame(frames, next, {
    highlights: [],
    pointers: [{ index: 0, label: "sorted", tone: "teal" }],
    settledIndices: buildSettledPrefix(next.length - 1),
    interval: null,
    comparisons,
    swapCount,
    writeCount,
    completed: true,
    stepLabel: "Bubble sort complete",
    statusLine: "Every pair is now in order, so the full list is sorted.",
  });

  return frames;
}

function buildSelectionTrace(values: number[]) {
  const next = [...values];
  const frames: SortingTradeoffsFrame[] = [];
  let comparisons = 0;
  let swapCount = 0;
  let writeCount = 0;

  pushFrame(frames, next, {
    highlights: [],
    pointers: [
      { index: 0, label: "start", tone: "teal" },
      { index: next.length - 1, label: "scan", tone: "sky" },
    ],
    settledIndices: [],
    interval: { start: 0, end: next.length - 1 },
    comparisons,
    swapCount,
    writeCount,
    completed: false,
    stepLabel: "Selection sort ready",
    statusLine: "Each pass will hunt for the smallest remaining value, then lock it into the next slot.",
  });

  for (let start = 0; start < next.length - 1; start += 1) {
    let minIndex = start;

    for (let scan = start + 1; scan < next.length; scan += 1) {
      comparisons += 1;
      pushFrame(frames, next, {
        highlights: [
          { index: minIndex, tone: "coral", outline: true },
          { index: scan, tone: "amber" },
        ],
        pointers: [
          { index: start, label: "slot", tone: "teal" },
          { index: minIndex, label: "min", tone: "coral" },
          { index: scan, label: "scan", tone: "amber" },
        ],
        settledIndices: buildSettledPrefix(start - 1),
        interval: { start, end: next.length - 1 },
        comparisons,
        swapCount,
        writeCount,
        completed: false,
        stepLabel: `Selection compare ${scan} to current minimum`,
        statusLine:
          next[scan] < next[minIndex]
            ? "This bar is smaller than the current minimum, so it becomes the new candidate."
            : "The current minimum still wins, so the scan keeps moving right.",
      });

      if (next[scan] < next[minIndex]) {
        minIndex = scan;
        pushFrame(frames, next, {
          highlights: [{ index: minIndex, tone: "coral" }],
          pointers: [
            { index: start, label: "slot", tone: "teal" },
            { index: minIndex, label: "new min", tone: "coral" },
          ],
          settledIndices: buildSettledPrefix(start - 1),
          interval: { start, end: next.length - 1 },
          comparisons,
          swapCount,
          writeCount,
          completed: false,
          stepLabel: "Selection updates its minimum",
          statusLine: "Selection sort remembers the best candidate and keeps scanning the rest of the unsorted tail.",
        });
      }
    }

    if (minIndex !== start) {
      [next[start], next[minIndex]] = [next[minIndex], next[start]];
      swapCount += 1;
      writeCount += 2;
      pushFrame(frames, next, {
        highlights: [
          { index: start, tone: "teal" },
          { index: minIndex, tone: "coral", outline: true },
        ],
        pointers: [
          { index: start, label: "placed", tone: "teal" },
          { index: minIndex, label: "swap", tone: "coral" },
        ],
        settledIndices: buildSettledPrefix(start),
        interval: { start: start + 1, end: next.length - 1 },
        comparisons,
        swapCount,
        writeCount,
        completed: false,
        stepLabel: "Selection swap",
        statusLine: "The smallest remaining value moves into the next settled slot.",
      });
    } else {
      pushFrame(frames, next, {
        highlights: [{ index: start, tone: "teal", outline: true }],
        pointers: [{ index: start, label: "already smallest", tone: "teal" }],
        settledIndices: buildSettledPrefix(start),
        interval: { start: start + 1, end: next.length - 1 },
        comparisons,
        swapCount,
        writeCount,
        completed: false,
        stepLabel: "Selection keeps the current slot",
        statusLine: "The smallest remaining value was already in place, so no swap was needed.",
      });
    }
  }

  pushFrame(frames, next, {
    highlights: [],
    pointers: [{ index: next.length - 1, label: "sorted", tone: "teal" }],
    settledIndices: buildSettledPrefix(next.length - 1),
    interval: null,
    comparisons,
    swapCount,
    writeCount,
    completed: true,
    stepLabel: "Selection sort complete",
    statusLine: "Every slot now holds the smallest remaining value from its pass, so the full array is sorted.",
  });

  return frames;
}

function buildInsertionTrace(values: number[]) {
  const next = [...values];
  const frames: SortingTradeoffsFrame[] = [];
  let comparisons = 0;
  const swapCount = 0;
  let writeCount = 0;

  pushFrame(frames, next, {
    highlights: [],
    pointers: [
      { index: 0, label: "sorted prefix", tone: "teal" },
      { index: Math.min(1, next.length - 1), label: "next key", tone: "amber" },
    ],
    settledIndices: buildSettledPrefix(0),
    interval: { start: 0, end: 1 },
    comparisons,
    swapCount,
    writeCount,
    completed: false,
    stepLabel: "Insertion sort ready",
    statusLine: "Insertion sort grows a sorted prefix by sliding the next key into place.",
  });

  for (let index = 1; index < next.length; index += 1) {
    const key = next[index];
    let scan = index - 1;
    let currentInsert = index;

    pushFrame(frames, next, {
      highlights: [{ index, tone: "amber" }],
      pointers: [
        { index, label: "key", tone: "amber" },
        { index: index - 1, label: "scan", tone: "sky" },
      ],
      settledIndices: buildSettledPrefix(index - 1),
      interval: { start: 0, end: index },
      comparisons,
      swapCount,
      writeCount,
      completed: false,
      stepLabel: "Insertion picks up the next key",
      statusLine: "The key now tries to slide left until it fits inside the sorted prefix.",
    });

    while (scan >= 0) {
      comparisons += 1;
      pushFrame(frames, next, {
        highlights: [
          { index: scan, tone: "coral", outline: true },
          { index: currentInsert, tone: "amber" },
        ],
        pointers: [
          { index: currentInsert, label: "key slot", tone: "amber" },
          { index: scan, label: "scan", tone: "coral" },
        ],
        settledIndices: buildSettledPrefix(index - 1),
        interval: { start: 0, end: index },
        comparisons,
        swapCount,
        writeCount,
        completed: false,
        stepLabel: `Insertion compares the key with ${scan}`,
        statusLine:
          next[scan] > key
            ? "The scanned value is too large, so it has to shift right."
            : "The key belongs just to the right of this scanned value.",
      });

      if (next[scan] <= key) {
        break;
      }

      next[scan + 1] = next[scan];
      writeCount += 1;
      currentInsert = scan;

      pushFrame(frames, next, {
        highlights: [
          { index: scan + 1, tone: "coral" },
          { index: currentInsert, tone: "amber", outline: true },
        ],
        pointers: [
          { index: currentInsert, label: "key path", tone: "amber" },
          { index: scan + 1, label: "shift", tone: "coral" },
        ],
        settledIndices: buildSettledPrefix(index - 1),
        interval: { start: 0, end: index },
        comparisons,
        swapCount,
        writeCount,
        completed: false,
        stepLabel: "Insertion shifts one value right",
        statusLine: "A larger value moved right to make room for the key.",
      });

      scan -= 1;
    }

    next[scan + 1] = key;
    writeCount += 1;

    pushFrame(frames, next, {
      highlights: [{ index: scan + 1, tone: "teal" }],
      pointers: [{ index: scan + 1, label: "inserted", tone: "teal" }],
      settledIndices: buildSettledPrefix(index),
      interval: { start: 0, end: index },
      comparisons,
      swapCount,
      writeCount,
      completed: index === next.length - 1,
      stepLabel: "Insertion places the key",
      statusLine: "The key has been inserted into the correct place inside the sorted prefix.",
    });
  }

  pushFrame(frames, next, {
    highlights: [],
    pointers: [{ index: next.length - 1, label: "sorted", tone: "teal" }],
    settledIndices: buildSettledPrefix(next.length - 1),
    interval: null,
    comparisons,
    swapCount,
    writeCount,
    completed: true,
    stepLabel: "Insertion sort complete",
    statusLine: "Each key has already found its place, so the whole array is sorted.",
  });

  return frames;
}

function buildSortingFrames(params: Required<SortingTradeoffsParams>) {
  const baseValues = buildPatternedArrayValues(params.arraySize, params.patternIndex);

  switch (params.algorithmIndex) {
    case 1:
      return buildSelectionTrace(baseValues);
    case 2:
      return buildInsertionTrace(baseValues);
    default:
      return buildBubbleTrace(baseValues);
  }
}

export function resolveSortingTradeoffsParams(
  source: Partial<SortingTradeoffsParams> | Record<string, number | boolean | string>,
): Required<SortingTradeoffsParams> {
  return {
    algorithmIndex: resolveDiscreteIndex(
      source.algorithmIndex,
      0,
      SORTING_ALGORITHM_MIN,
      SORTING_ALGORITHM_MAX,
    ),
    patternIndex: resolveDiscreteIndex(
      source.patternIndex,
      0,
      SORTING_PATTERN_MIN,
      SORTING_PATTERN_MAX,
    ),
    arraySize: Math.round(
      clamp(safeNumber(source.arraySize, 9), SORTING_ARRAY_SIZE_MIN, SORTING_ARRAY_SIZE_MAX),
    ),
  };
}

export function buildSortingTradeoffsFrames(
  source: Partial<SortingTradeoffsParams> | Record<string, number | boolean | string>,
) {
  return buildSortingFrames(resolveSortingTradeoffsParams(source)).map(cloneFrame);
}

export function resolveSortingTradeoffsDuration(
  source: Partial<SortingTradeoffsParams> | Record<string, number | boolean | string>,
) {
  const frames = buildSortingFrames(resolveSortingTradeoffsParams(source));
  return Math.max(0, (frames.length - 1) * SORTING_FRAME_DURATION);
}

export function sampleSortingTradeoffsState(
  source: Partial<SortingTradeoffsParams> | Record<string, number | boolean | string>,
  time: number,
): SortingTradeoffsSnapshot {
  const params = resolveSortingTradeoffsParams(source);
  const frames = buildSortingFrames(params);
  const frameIndex = frames.length
    ? clamp(Math.floor(Math.max(time, 0) / SORTING_FRAME_DURATION), 0, frames.length - 1)
    : 0;
  const frame = frames[frameIndex] ?? frames[0];
  const maxInversions = getMaximumInversions(params.arraySize);
  const sortedFraction = frame?.settledIndices.length
    ? frame.settledIndices.length / Math.max(params.arraySize, 1)
    : 0;

  return {
    ...(frame ?? {
      values: buildPatternedArrayValues(params.arraySize, params.patternIndex),
      highlights: [],
      pointers: [],
      settledIndices: [],
      interval: null,
      comparisons: 0,
      swapCount: 0,
      writeCount: 0,
      inversionsRemaining: 0,
      completed: false,
      stepLabel: "Sorting ready",
      statusLine: "The list is ready to sort.",
    }),
    algorithmIndex: params.algorithmIndex,
    patternIndex: params.patternIndex,
    arraySize: params.arraySize,
    algorithmLabel: getSortingAlgorithmLabel(params.algorithmIndex),
    patternLabel: getSortingPatternLabel(params.patternIndex),
    sortedFraction,
    disorderFraction:
      maxInversions > 0 ? (frame?.inversionsRemaining ?? 0) / maxInversions : 0,
    maxInversions,
    duration: Math.max(0, (frames.length - 1) * SORTING_FRAME_DURATION),
    stepCount: frames.length,
  };
}

export function buildSortingTradeoffsSeries(
  source: Partial<SortingTradeoffsParams> | Record<string, number | boolean | string>,
): GraphSeriesMap {
  const frames = buildSortingFrames(resolveSortingTradeoffsParams(source));
  const maxInversions = getMaximumInversions(frames[0]?.values.length ?? 0);

  return {
    "operations-history": [
      buildSeries(
        "comparisons-history",
        "comparisons",
        frames.map((frame, index) => ({
          x: index * SORTING_FRAME_DURATION,
          y: frame.comparisons,
        })),
        "#f0ab3c",
      ),
      buildSeries(
        "writes-history",
        "writes",
        frames.map((frame, index) => ({
          x: index * SORTING_FRAME_DURATION,
          y: frame.writeCount,
        })),
        "#f16659",
      ),
    ],
    "disorder-history": [
      buildSeries(
        "inversions-remaining",
        "inversions remaining",
        frames.map((frame, index) => ({
          x: index * SORTING_FRAME_DURATION,
          y: frame.inversionsRemaining,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "sorted-items",
        "settled items",
        frames.map((frame, index) => ({
          x: index * SORTING_FRAME_DURATION,
          y: frame.settledIndices.length,
        })),
        "#1ea6a2",
      ),
    ],
    "disorder-share": [
      buildSeries(
        "disorder-share",
        "fraction of disorder",
        frames.map((frame, index) => ({
          x: index * SORTING_FRAME_DURATION,
          y: maxInversions > 0 ? frame.inversionsRemaining / maxInversions : 0,
        })),
        "#0f172a",
      ),
    ],
  };
}

export function describeSortingTradeoffsState(
  source: Partial<SortingTradeoffsParams> | Record<string, number | boolean | string>,
  time: number,
) {
  const snapshot = sampleSortingTradeoffsState(source, time);
  const stage = snapshot.completed
    ? "The array is fully sorted."
    : `The active stage is "${snapshot.stepLabel.toLowerCase()}".`;

  return `${snapshot.algorithmLabel} sort is running on a ${snapshot.patternLabel.toLowerCase()} list of ${snapshot.arraySize} values. Comparisons: ${formatNumber(snapshot.comparisons, 0)}. Writes: ${formatNumber(snapshot.writeCount, 0)}. ${stage} ${snapshot.statusLine}`;
}
