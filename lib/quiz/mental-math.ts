const EPSILON = 1e-6;

function almostEqual(left: number, right: number) {
  return Math.abs(left - right) <= EPSILON;
}

function normalizeNumber(value: number) {
  return Number(value.toFixed(6));
}

function isQuarterStep(value: number) {
  return almostEqual(value * 4, Math.round(value * 4));
}

function isHalfStep(value: number) {
  return almostEqual(value * 2, Math.round(value * 2));
}

function scoreFriendlyNumber(value: number) {
  if (!Number.isFinite(value)) {
    return -1;
  }

  if (Number.isInteger(value)) {
    return 5;
  }

  if (isHalfStep(value)) {
    return 4;
  }

  if (isQuarterStep(value)) {
    return 3;
  }

  const scaledByTen = value * 10;

  if (almostEqual(scaledByTen, Math.round(scaledByTen))) {
    return 2;
  }

  return 1;
}

function uniqueNumbers(values: number[]) {
  const seen = new Set<string>();
  const unique: number[] = [];

  for (const value of values) {
    const normalized = normalizeNumber(value);
    const key = normalized.toString();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(normalized);
  }

  return unique;
}

export function isMentalMathFriendlyNumber(value: number) {
  return scoreFriendlyNumber(value) >= 3;
}

export function collectFriendlyNumericCandidates(input: {
  min: number;
  max: number;
  step?: number;
  current?: number;
  presetValues?: number[];
}) {
  const { min, max, step, current, presetValues = [] } = input;
  const values: number[] = [];

  const addIfValid = (value: number | undefined) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return;
    }

    if (value < min - EPSILON || value > max + EPSILON) {
      return;
    }

    values.push(normalizeNumber(value));
  };

  for (const presetValue of presetValues) {
    addIfValid(presetValue);
  }

  if (typeof current === "number") {
    addIfValid(current);
  }

  addIfValid(min);
  addIfValid(max);

  if (typeof step === "number" && Number.isFinite(step) && step > 0) {
    const multipliers = [1, 2, 3, 4, 5];

    if (typeof current === "number") {
      for (const multiplier of multipliers) {
        addIfValid(current + step * multiplier);
        addIfValid(current - step * multiplier);
      }
    }

    const steppedCount = Math.min(20, Math.ceil((max - min) / step));

    for (let index = 0; index <= steppedCount; index += 1) {
      addIfValid(min + step * index);
    }
  }

  const integerStart = Math.ceil(min);
  const integerEnd = Math.floor(max);

  for (let value = integerStart; value <= integerEnd; value += 1) {
    addIfValid(value);
  }

  const unique = uniqueNumbers(values);

  return unique
    .sort((left, right) => {
      const scoreDelta = scoreFriendlyNumber(right) - scoreFriendlyNumber(left);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      if (typeof current === "number") {
        const currentDistanceDelta =
          Math.abs(left - current) - Math.abs(right - current);

        if (!almostEqual(currentDistanceDelta, 0)) {
          return currentDistanceDelta;
        }
      }

      return left - right;
    });
}

export function chooseAlternativeFriendlyValue(input: {
  min: number;
  max: number;
  step?: number;
  current: number;
  presetValues?: number[];
  offset?: number;
}) {
  const candidates = collectFriendlyNumericCandidates(input).filter(
    (candidate) => !almostEqual(candidate, input.current),
  );

  if (!candidates.length) {
    return null;
  }

  const offset = input.offset ?? 0;
  return candidates[offset % candidates.length] ?? null;
}

export function buildFriendlyTimeCandidates(current = 0) {
  const candidates = uniqueNumbers([
    0.25,
    0.5,
    0.75,
    1,
    1.25,
    1.5,
    2,
    2.5,
    3,
    current,
  ]);

  return candidates.sort((left, right) => {
    const scoreDelta = scoreFriendlyNumber(right) - scoreFriendlyNumber(left);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return Math.abs(left - current) - Math.abs(right - current);
  });
}
