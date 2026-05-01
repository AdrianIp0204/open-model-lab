import { clamp, safeNumber } from "./math";

export const SORTING_ALGORITHM_MIN = 0;
export const SORTING_ALGORITHM_MAX = 2;
export const SORTING_PATTERN_MIN = 0;
export const SORTING_PATTERN_MAX = 2;
export const SORTING_ARRAY_SIZE_MIN = 6;
export const SORTING_ARRAY_SIZE_MAX = 12;
export const BINARY_SEARCH_ARRAY_SIZE_MIN = 8;
export const BINARY_SEARCH_ARRAY_SIZE_MAX = 20;

const sortingAlgorithmLabels = ["Bubble", "Selection", "Insertion"] as const;
const sortingPatternLabels = [
  "Shuffled",
  "Nearly sorted",
  "Reverse order",
] as const;

export function resolveDiscreteIndex(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.round(clamp(safeNumber(value, fallback), min, max));
}

export function getSortingAlgorithmLabel(index: number) {
  return sortingAlgorithmLabels[
    resolveDiscreteIndex(index, 0, SORTING_ALGORITHM_MIN, SORTING_ALGORITHM_MAX)
  ];
}

export function getSortingPatternLabel(index: number) {
  return sortingPatternLabels[
    resolveDiscreteIndex(index, 0, SORTING_PATTERN_MIN, SORTING_PATTERN_MAX)
  ];
}

export function buildSortingBaseValues(size: number) {
  return Array.from({ length: size }, (_, index) => index + 1);
}

export function buildPatternedArrayValues(size: number, patternIndex: number) {
  const sorted = buildSortingBaseValues(size);

  switch (resolveDiscreteIndex(patternIndex, 0, SORTING_PATTERN_MIN, SORTING_PATTERN_MAX)) {
    case 1: {
      const next = [...sorted];
      if (next.length >= 4) {
        const firstSwapIndex = Math.max(1, Math.floor(next.length / 3));
        const secondSwapIndex = Math.min(next.length - 2, firstSwapIndex + 2);
        [next[firstSwapIndex], next[firstSwapIndex + 1]] = [
          next[firstSwapIndex + 1],
          next[firstSwapIndex],
        ];
        [next[secondSwapIndex - 1], next[secondSwapIndex]] = [
          next[secondSwapIndex],
          next[secondSwapIndex - 1],
        ];
      }
      return next;
    }
    case 2:
      return [...sorted].reverse();
    default: {
      const next: number[] = [];
      let low = 0;
      let high = sorted.length - 1;

      while (low <= high) {
        next.push(sorted[high]);
        if (low < high) {
          next.push(sorted[low]);
        }
        high -= 1;
        low += 1;
      }

      return next;
    }
  }
}

export function buildBinarySearchValues(size: number) {
  return Array.from({ length: size }, (_, index) => 4 + index * 3);
}

export function countInversions(values: number[]) {
  let inversions = 0;

  for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
      if (values[leftIndex] > values[rightIndex]) {
        inversions += 1;
      }
    }
  }

  return inversions;
}

export function getMaximumInversions(length: number) {
  return (length * Math.max(length - 1, 0)) / 2;
}
