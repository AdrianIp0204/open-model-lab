export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

export function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value === 0) {
    return "0";
  }

  const abs = Math.abs(value);

  if (abs >= 1000 || abs < 0.01) {
    return value
      .toExponential(2)
      .replace("+", "")
      .replace(/\.0+e/, "e");
  }

  const rounded = value.toFixed(digits);
  return rounded.replace(/\.?0+$/, "");
}

const displayMathSymbolMap: Record<string, string> = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\theta": "θ",
  "\\Theta": "Θ",
  "\\phi": "φ",
  "\\omega": "ω",
  "\\tau": "τ",
  "\\lambda": "λ",
  "\\Delta": "Δ",
  "\\sum": "Σ",
  "\\pi": "π",
  "\\cdot": "·",
  "\\times": "×",
  "\\to": "→",
  "\\approx": "≈",
  "\\le": "≤",
  "\\ge": "≥",
  "\\neq": "≠",
};

function normalizeInlineLatexForDisplay(value: string) {
  let next = value
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\(?:frac|tfrac)\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\ /g, " ");

  for (const [token, replacement] of Object.entries(displayMathSymbolMap)) {
    next = next.replaceAll(token, replacement);
  }

  next = next
    .replace(/([A-Za-zΑ-Ωα-ω0-9)])\^\{?2\}?/g, "$1²")
    .replace(/([A-Za-zΑ-Ωα-ω0-9)])\^\{?3\}?/g, "$1³")
    .replace(/[{}]/g, "");

  return next;
}

export function formatDisplayText(value: string) {
  return normalizeInlineLatexForDisplay(value)
    .replace(/\bTheta\b/g, "\u0398")
    .replace(/\btheta\b/g, "\u03b8")
    .replace(/m\/s\^2/g, "m/s\u00b2")
    .replace(/kg\s*m\^2/g, "kg m\u00b2")
    .replace(/\bdeg\b/g, "\u00b0")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDisplayUnit(unit?: string) {
  return unit ? formatDisplayText(unit) : "";
}

export function formatMeasurement(value: number, unit?: string, digits = 2) {
  const displayUnit = formatDisplayUnit(unit);
  const separator = displayUnit && displayUnit !== "\u00b0" ? " " : "";
  return `${formatNumber(value, digits)}${separator}${displayUnit}`;
}

export function sampleRange(start: number, end: number, samples: number) {
  if (samples <= 1) {
    return [start];
  }

  const step = (end - start) / (samples - 1);
  return Array.from({ length: samples }, (_, index) => start + index * step);
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
