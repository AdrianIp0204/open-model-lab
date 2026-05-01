type SymbolicFactorInput = {
  numerator: number;
  denominator?: number;
  symbol: string;
};

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a || 1;
}

export function simplifyFraction(input: {
  numerator: number;
  denominator: number;
}) {
  const normalizedDenominator =
    input.denominator < 0 ? -input.denominator : input.denominator;
  const normalizedNumerator =
    input.denominator < 0 ? -input.numerator : input.numerator;
  const divisor = gcd(normalizedNumerator, normalizedDenominator);

  return {
    numerator: normalizedNumerator / divisor,
    denominator: normalizedDenominator / divisor,
  };
}

export function formatSymbolicFactor({
  numerator,
  denominator = 1,
  symbol,
}: SymbolicFactorInput) {
  const simplified = simplifyFraction({ numerator, denominator });

  if (simplified.numerator === 0) {
    return "0";
  }

  const sign = simplified.numerator < 0 ? "-" : "";
  const absoluteNumerator = Math.abs(simplified.numerator);

  if (simplified.denominator === 1) {
    if (absoluteNumerator === 1) {
      return `${sign}${symbol}`;
    }

    return `${sign}${absoluteNumerator}${symbol}`;
  }

  if (absoluteNumerator === 1) {
    return `${sign}${symbol}/${simplified.denominator}`;
  }

  return `${sign}${absoluteNumerator}${symbol}/${simplified.denominator}`;
}

export function formatPiRadians(input: {
  numerator: number;
  denominator: number;
}) {
  return formatSymbolicFactor({
    numerator: input.numerator,
    denominator: input.denominator,
    symbol: "π",
  });
}

export const simplePiAnglePool = [
  { degrees: 30, numerator: 1, denominator: 6 },
  { degrees: 45, numerator: 1, denominator: 4 },
  { degrees: 60, numerator: 1, denominator: 3 },
  { degrees: 90, numerator: 1, denominator: 2 },
  { degrees: 120, numerator: 2, denominator: 3 },
  { degrees: 135, numerator: 3, denominator: 4 },
  { degrees: 150, numerator: 5, denominator: 6 },
  { degrees: 180, numerator: 1, denominator: 1 },
  { degrees: 210, numerator: 7, denominator: 6 },
  { degrees: 225, numerator: 5, denominator: 4 },
  { degrees: 240, numerator: 4, denominator: 3 },
  { degrees: 270, numerator: 3, denominator: 2 },
  { degrees: 300, numerator: 5, denominator: 3 },
  { degrees: 315, numerator: 7, denominator: 4 },
  { degrees: 330, numerator: 11, denominator: 6 },
] as const;
