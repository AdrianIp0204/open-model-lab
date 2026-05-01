import { clamp, formatMeasurement, sampleRange, safeNumber } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type ContinuityEquationParams = {
  flowRate?: ControlValue;
  entryArea?: ControlValue;
  middleArea?: ControlValue;
};

export type ContinuityEquationSnapshot = {
  flowRate: number;
  entryArea: number;
  middleArea: number;
  time: number;
  entrySpeed: number;
  middleSpeed: number;
  speedRatio: number;
  areaRatio: number;
  entryVolumeFlow: number;
  middleVolumeFlow: number;
  entrySliceLength: number;
  middleSliceLength: number;
  cycleDuration: number;
  geometryLabel: "narrowing" | "uniform" | "widening";
  middleSpeedTrend: "faster" | "same" | "slower";
  flowLabel: "gentle" | "steady" | "strong";
};

export type ContinuityTravelProfilePoint = {
  x: number;
  time: number;
  area: number;
  speed: number;
};

export type ContinuityTravelProfile = {
  points: ContinuityTravelProfilePoint[];
  totalTime: number;
};

export const CONTINUITY_EQUATION_STAGE_LENGTH = 2.8;
export const CONTINUITY_EQUATION_MAX_TIME = 6;
export const CONTINUITY_EQUATION_MIN_FLOW_RATE = 0.12;
export const CONTINUITY_EQUATION_MAX_FLOW_RATE = 0.28;
export const CONTINUITY_EQUATION_MIN_ENTRY_AREA = 0.16;
export const CONTINUITY_EQUATION_MAX_ENTRY_AREA = 0.32;
export const CONTINUITY_EQUATION_MIN_MIDDLE_AREA = 0.08;
export const CONTINUITY_EQUATION_MAX_MIDDLE_AREA = 0.36;
export const CONTINUITY_EQUATION_SLICE_DURATION = 0.2;

const RESPONSE_SAMPLES = 91;
const PROFILE_SAMPLES = 181;
const LEFT_SECTION_END = 0.72;
const CONTRACTION_END = 1.04;
const MIDDLE_SECTION_END = 1.76;
const EXPANSION_END = 2.08;

function easeCosine(value: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp(value, 0, 1));
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function normalizeLoopTime(time: number, duration: number) {
  if (duration <= 0) {
    return 0;
  }

  const wrapped = time % duration;
  return wrapped < 0 ? wrapped + duration : wrapped;
}

function classifyGeometry(
  entryArea: number,
  middleArea: number,
): ContinuityEquationSnapshot["geometryLabel"] {
  if (middleArea < entryArea * 0.97) {
    return "narrowing";
  }

  if (middleArea > entryArea * 1.03) {
    return "widening";
  }

  return "uniform";
}

function classifyTrend(
  entrySpeed: number,
  middleSpeed: number,
): ContinuityEquationSnapshot["middleSpeedTrend"] {
  if (middleSpeed > entrySpeed * 1.03) {
    return "faster";
  }

  if (middleSpeed < entrySpeed * 0.97) {
    return "slower";
  }

  return "same";
}

function classifyFlow(flowRate: number): ContinuityEquationSnapshot["flowLabel"] {
  if (flowRate < 0.16) {
    return "gentle";
  }

  if (flowRate < 0.23) {
    return "steady";
  }

  return "strong";
}

export function resolveContinuityEquationParams(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
) {
  return {
    flowRate: clamp(
      safeNumber(params.flowRate, 0.18),
      CONTINUITY_EQUATION_MIN_FLOW_RATE,
      CONTINUITY_EQUATION_MAX_FLOW_RATE,
    ),
    entryArea: clamp(
      safeNumber(params.entryArea, 0.24),
      CONTINUITY_EQUATION_MIN_ENTRY_AREA,
      CONTINUITY_EQUATION_MAX_ENTRY_AREA,
    ),
    middleArea: clamp(
      safeNumber(params.middleArea, 0.12),
      CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
      CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
    ),
  };
}

export function sampleContinuityAreaAtPosition(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
  position: number,
) {
  const resolved = resolveContinuityEquationParams(params);
  const x = clamp(position, 0, CONTINUITY_EQUATION_STAGE_LENGTH);

  if (x <= LEFT_SECTION_END) {
    return resolved.entryArea;
  }

  if (x <= CONTRACTION_END) {
    const amount = easeCosine((x - LEFT_SECTION_END) / (CONTRACTION_END - LEFT_SECTION_END));
    return mix(resolved.entryArea, resolved.middleArea, amount);
  }

  if (x <= MIDDLE_SECTION_END) {
    return resolved.middleArea;
  }

  if (x <= EXPANSION_END) {
    const amount = easeCosine((x - MIDDLE_SECTION_END) / (EXPANSION_END - MIDDLE_SECTION_END));
    return mix(resolved.middleArea, resolved.entryArea, amount);
  }

  return resolved.entryArea;
}

export function sampleContinuitySpeedAtPosition(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
  position: number,
) {
  const resolved = resolveContinuityEquationParams(params);
  return resolved.flowRate / Math.max(sampleContinuityAreaAtPosition(resolved, position), 1e-6);
}

export function buildContinuityTravelProfile(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
): ContinuityTravelProfile {
  const resolved = resolveContinuityEquationParams(params);
  const positions = sampleRange(0, CONTINUITY_EQUATION_STAGE_LENGTH, PROFILE_SAMPLES);
  const points: ContinuityTravelProfilePoint[] = [];
  let cumulativeTime = 0;

  positions.forEach((position, index) => {
    if (index > 0) {
      const previous = positions[index - 1] ?? 0;
      const midpoint = (previous + position) / 2;
      const localSpeed = sampleContinuitySpeedAtPosition(resolved, midpoint);
      cumulativeTime += (position - previous) / Math.max(localSpeed, 1e-6);
    }

    points.push({
      x: position,
      time: cumulativeTime,
      area: sampleContinuityAreaAtPosition(resolved, position),
      speed: sampleContinuitySpeedAtPosition(resolved, position),
    });
  });

  return {
    points,
    totalTime: cumulativeTime,
  };
}

export function sampleContinuityPositionFromProfile(
  profile: ContinuityTravelProfile,
  time: number,
) {
  if (profile.points.length <= 1 || profile.totalTime <= 0) {
    return 0;
  }

  const wrappedTime = normalizeLoopTime(time, profile.totalTime);

  for (let index = 1; index < profile.points.length; index += 1) {
    const previous = profile.points[index - 1];
    const current = profile.points[index];

    if (!previous || !current) {
      continue;
    }

    if (wrappedTime <= current.time) {
      const duration = Math.max(current.time - previous.time, 1e-6);
      const amount = (wrappedTime - previous.time) / duration;
      return mix(previous.x, current.x, amount);
    }
  }

  return profile.points[profile.points.length - 1]?.x ?? CONTINUITY_EQUATION_STAGE_LENGTH;
}

export function sampleContinuityEquationState(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
  time = 0,
): ContinuityEquationSnapshot {
  const resolved = resolveContinuityEquationParams(params);
  const entrySpeed = resolved.flowRate / resolved.entryArea;
  const middleSpeed = resolved.flowRate / resolved.middleArea;
  const profile = buildContinuityTravelProfile(resolved);

  return {
    flowRate: resolved.flowRate,
    entryArea: resolved.entryArea,
    middleArea: resolved.middleArea,
    time: normalizeLoopTime(time, profile.totalTime || CONTINUITY_EQUATION_MAX_TIME),
    entrySpeed,
    middleSpeed,
    speedRatio: middleSpeed / Math.max(entrySpeed, 1e-6),
    areaRatio: resolved.middleArea / Math.max(resolved.entryArea, 1e-6),
    entryVolumeFlow: resolved.entryArea * entrySpeed,
    middleVolumeFlow: resolved.middleArea * middleSpeed,
    entrySliceLength: entrySpeed * CONTINUITY_EQUATION_SLICE_DURATION,
    middleSliceLength: middleSpeed * CONTINUITY_EQUATION_SLICE_DURATION,
    cycleDuration: profile.totalTime,
    geometryLabel: classifyGeometry(resolved.entryArea, resolved.middleArea),
    middleSpeedTrend: classifyTrend(entrySpeed, middleSpeed),
    flowLabel: classifyFlow(resolved.flowRate),
  };
}

function buildResponseSeries(
  id: string,
  label: string,
  color: string,
  values: Array<{ x: number; y: number }>,
) {
  return buildSeries(id, label, values, color);
}

export function buildContinuityEquationSeries(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
): GraphSeriesMap {
  const resolved = resolveContinuityEquationParams(params);

  return {
    "speed-entry-area": [
      buildResponseSeries(
        "entry-speed",
        "Section A speed",
        "#1ea6a2",
        sampleRange(
          CONTINUITY_EQUATION_MIN_ENTRY_AREA,
          CONTINUITY_EQUATION_MAX_ENTRY_AREA,
          RESPONSE_SAMPLES,
        ).map((entryArea) => ({
          x: entryArea,
          y: resolved.flowRate / entryArea,
        })),
      ),
      buildResponseSeries(
        "middle-speed",
        "Middle speed",
        "#f16659",
        sampleRange(
          CONTINUITY_EQUATION_MIN_ENTRY_AREA,
          CONTINUITY_EQUATION_MAX_ENTRY_AREA,
          RESPONSE_SAMPLES,
        ).map((entryArea) => ({
          x: entryArea,
          y: resolved.flowRate / resolved.middleArea,
        })),
      ),
    ],
    "speed-middle-area": [
      buildResponseSeries(
        "entry-speed",
        "Section A speed",
        "#1ea6a2",
        sampleRange(
          CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
          CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
          RESPONSE_SAMPLES,
        ).map((middleArea) => ({
          x: middleArea,
          y: resolved.flowRate / resolved.entryArea,
        })),
      ),
      buildResponseSeries(
        "middle-speed",
        "Middle speed",
        "#f16659",
        sampleRange(
          CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
          CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
          RESPONSE_SAMPLES,
        ).map((middleArea) => ({
          x: middleArea,
          y: resolved.flowRate / middleArea,
        })),
      ),
    ],
    "speed-flow-rate": [
      buildResponseSeries(
        "entry-speed",
        "Section A speed",
        "#1ea6a2",
        sampleRange(
          CONTINUITY_EQUATION_MIN_FLOW_RATE,
          CONTINUITY_EQUATION_MAX_FLOW_RATE,
          RESPONSE_SAMPLES,
        ).map((flowRate) => ({
          x: flowRate,
          y: flowRate / resolved.entryArea,
        })),
      ),
      buildResponseSeries(
        "middle-speed",
        "Middle speed",
        "#f16659",
        sampleRange(
          CONTINUITY_EQUATION_MIN_FLOW_RATE,
          CONTINUITY_EQUATION_MAX_FLOW_RATE,
          RESPONSE_SAMPLES,
        ).map((flowRate) => ({
          x: flowRate,
          y: flowRate / resolved.middleArea,
        })),
      ),
    ],
    "flow-balance": [
      buildResponseSeries(
        "entry-flow",
        "Q = A_A v_A",
        "#1ea6a2",
        sampleRange(
          CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
          CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
          RESPONSE_SAMPLES,
        ).map((middleArea) => ({
          x: middleArea,
          y: resolved.flowRate,
        })),
      ),
      buildResponseSeries(
        "middle-flow",
        "Q = A_B v_B",
        "#f0ab3c",
        sampleRange(
          CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
          CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
          RESPONSE_SAMPLES,
        ).map((middleArea) => ({
          x: middleArea,
          y: middleArea * (resolved.flowRate / middleArea),
        })),
      ),
    ],
  };
}

export function describeContinuityEquationState(
  params: Partial<ContinuityEquationParams> | Record<string, ControlValue>,
  time = 0,
) {
  const snapshot = sampleContinuityEquationState(params, time);
  const geometryText =
    snapshot.geometryLabel === "narrowing"
      ? "The middle section is narrower than section A, so the flow speeds up there."
      : snapshot.geometryLabel === "widening"
        ? "The middle section is wider than section A, so the flow slows there."
        : "Both sections have nearly the same area, so the speeds stay nearly matched.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the stream carries Q = ${formatMeasurement(snapshot.flowRate, "m^3/s")} through section A with area ${formatMeasurement(snapshot.entryArea, "m^2")} and speed ${formatMeasurement(snapshot.entrySpeed, "m/s")}, then through the middle section with area ${formatMeasurement(snapshot.middleArea, "m^2")} and speed ${formatMeasurement(snapshot.middleSpeed, "m/s")}. ${geometryText} Both sections still carry the same flow rate because Q = Av in this bounded steady-flow model.`;
}
