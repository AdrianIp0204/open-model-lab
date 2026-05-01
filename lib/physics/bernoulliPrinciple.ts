import { clamp, formatMeasurement, sampleRange, safeNumber } from "./math";
import { buildSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type BernoulliPrincipleParams = {
  entryPressure?: ControlValue;
  flowRate?: ControlValue;
  entryArea?: ControlValue;
  throatArea?: ControlValue;
  throatHeight?: ControlValue;
};

export type BernoulliPrincipleSnapshot = {
  entryPressure: number;
  flowRate: number;
  entryArea: number;
  throatArea: number;
  throatHeight: number;
  time: number;
  entrySpeed: number;
  throatSpeed: number;
  speedRatio: number;
  areaRatio: number;
  entryDynamicPressure: number;
  throatDynamicPressure: number;
  throatHeightPressure: number;
  throatPressure: number;
  pressureDrop: number;
  dynamicPressureDrop: number;
  heightPressureDrop: number;
  totalEnergyLike: number;
  throatTotalEnergyLike: number;
  entryVolumeFlow: number;
  throatVolumeFlow: number;
  entrySliceLength: number;
  throatSliceLength: number;
  cycleDuration: number;
  geometryLabel: "narrow-rising" | "narrow-level" | "wide-rising" | "wide-level" | "matched";
  pressureTrend: "lower" | "same" | "higher";
  throatSpeedTrend: "faster" | "same" | "slower";
  dominantPressureShift: "speed" | "height" | "shared";
};

export type BernoulliTravelProfilePoint = {
  x: number;
  time: number;
  area: number;
  height: number;
  speed: number;
  pressure: number;
};

export type BernoulliTravelProfile = {
  points: BernoulliTravelProfilePoint[];
  totalTime: number;
};

export const BERNOULLI_PRINCIPLE_STAGE_LENGTH = 3.2;
export const BERNOULLI_PRINCIPLE_MAX_TIME = 6;
export const BERNOULLI_PRINCIPLE_MIN_ENTRY_PRESSURE = 24;
export const BERNOULLI_PRINCIPLE_MAX_ENTRY_PRESSURE = 40;
export const BERNOULLI_PRINCIPLE_MIN_FLOW_RATE = 0.12;
export const BERNOULLI_PRINCIPLE_MAX_FLOW_RATE = 0.22;
export const BERNOULLI_PRINCIPLE_MIN_ENTRY_AREA = 0.08;
export const BERNOULLI_PRINCIPLE_MAX_ENTRY_AREA = 0.14;
export const BERNOULLI_PRINCIPLE_MIN_THROAT_AREA = 0.04;
export const BERNOULLI_PRINCIPLE_MAX_THROAT_AREA = 0.12;
export const BERNOULLI_PRINCIPLE_MIN_THROAT_HEIGHT = 0;
export const BERNOULLI_PRINCIPLE_MAX_THROAT_HEIGHT = 0.45;
export const BERNOULLI_PRINCIPLE_SLICE_DURATION = 0.18;
export const BERNOULLI_PRINCIPLE_FLUID_DENSITY = 1000;
export const BERNOULLI_PRINCIPLE_GRAVITY = 9.8;

const RESPONSE_SAMPLES = 91;
const PROFILE_SAMPLES = 181;
const THROAT_SAMPLE_X = 1.58;
const LEFT_SECTION_END = 0.78;
const CONTRACTION_END = 1.14;
const THROAT_SECTION_END = 1.96;
const EXPANSION_END = 2.32;
const HEIGHT_RISE_START = 0.78;
const HEIGHT_PEAK_START = 1.24;
const HEIGHT_PEAK_END = 1.92;
const HEIGHT_FALL_END = 2.38;

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

function dynamicPressureFromSpeed(speed: number) {
  return (0.5 * BERNOULLI_PRINCIPLE_FLUID_DENSITY * speed * speed) / 1000;
}

function heightPressureFromHeight(height: number) {
  return (
    (BERNOULLI_PRINCIPLE_FLUID_DENSITY * BERNOULLI_PRINCIPLE_GRAVITY * height) /
    1000
  );
}

function classifyGeometry(
  entryArea: number,
  throatArea: number,
  throatHeight: number,
): BernoulliPrincipleSnapshot["geometryLabel"] {
  const narrowed = throatArea < entryArea * 0.97;
  const widened = throatArea > entryArea * 1.03;
  const raised = throatHeight > 0.05;

  if (narrowed) {
    return raised ? "narrow-rising" : "narrow-level";
  }

  if (widened) {
    return raised ? "wide-rising" : "wide-level";
  }

  return "matched";
}

function classifyPressureTrend(
  entryPressure: number,
  throatPressure: number,
): BernoulliPrincipleSnapshot["pressureTrend"] {
  if (throatPressure < entryPressure - 0.3) {
    return "lower";
  }

  if (throatPressure > entryPressure + 0.3) {
    return "higher";
  }

  return "same";
}

function classifySpeedTrend(
  entrySpeed: number,
  throatSpeed: number,
): BernoulliPrincipleSnapshot["throatSpeedTrend"] {
  if (throatSpeed > entrySpeed * 1.03) {
    return "faster";
  }

  if (throatSpeed < entrySpeed * 0.97) {
    return "slower";
  }

  return "same";
}

function classifyDominantShift(
  dynamicPressureDrop: number,
  heightPressureDrop: number,
): BernoulliPrincipleSnapshot["dominantPressureShift"] {
  if (dynamicPressureDrop > heightPressureDrop * 1.2) {
    return "speed";
  }

  if (heightPressureDrop > dynamicPressureDrop * 1.2) {
    return "height";
  }

  return "shared";
}

export function resolveBernoulliPrincipleParams(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
) {
  const entryArea = clamp(
    safeNumber(params.entryArea, 0.1),
    BERNOULLI_PRINCIPLE_MIN_ENTRY_AREA,
    BERNOULLI_PRINCIPLE_MAX_ENTRY_AREA,
  );
  const throatAreaRaw = clamp(
    safeNumber(params.throatArea, 0.05),
    BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
    BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
  );

  return {
    entryPressure: clamp(
      safeNumber(params.entryPressure, 32),
      BERNOULLI_PRINCIPLE_MIN_ENTRY_PRESSURE,
      BERNOULLI_PRINCIPLE_MAX_ENTRY_PRESSURE,
    ),
    flowRate: clamp(
      safeNumber(params.flowRate, 0.18),
      BERNOULLI_PRINCIPLE_MIN_FLOW_RATE,
      BERNOULLI_PRINCIPLE_MAX_FLOW_RATE,
    ),
    entryArea,
    throatArea: throatAreaRaw,
    throatHeight: clamp(
      safeNumber(params.throatHeight, 0.25),
      BERNOULLI_PRINCIPLE_MIN_THROAT_HEIGHT,
      BERNOULLI_PRINCIPLE_MAX_THROAT_HEIGHT,
    ),
  };
}

export function sampleBernoulliAreaAtPosition(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
  position: number,
) {
  const resolved = resolveBernoulliPrincipleParams(params);
  const x = clamp(position, 0, BERNOULLI_PRINCIPLE_STAGE_LENGTH);

  if (x <= LEFT_SECTION_END) {
    return resolved.entryArea;
  }

  if (x <= CONTRACTION_END) {
    const amount = easeCosine((x - LEFT_SECTION_END) / (CONTRACTION_END - LEFT_SECTION_END));
    return mix(resolved.entryArea, resolved.throatArea, amount);
  }

  if (x <= THROAT_SECTION_END) {
    return resolved.throatArea;
  }

  if (x <= EXPANSION_END) {
    const amount = easeCosine((x - THROAT_SECTION_END) / (EXPANSION_END - THROAT_SECTION_END));
    return mix(resolved.throatArea, resolved.entryArea, amount);
  }

  return resolved.entryArea;
}

export function sampleBernoulliHeightAtPosition(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
  position: number,
) {
  const resolved = resolveBernoulliPrincipleParams(params);
  const x = clamp(position, 0, BERNOULLI_PRINCIPLE_STAGE_LENGTH);

  if (x <= HEIGHT_RISE_START) {
    return 0;
  }

  if (x <= HEIGHT_PEAK_START) {
    const amount = easeCosine((x - HEIGHT_RISE_START) / (HEIGHT_PEAK_START - HEIGHT_RISE_START));
    return mix(0, resolved.throatHeight, amount);
  }

  if (x <= HEIGHT_PEAK_END) {
    return resolved.throatHeight;
  }

  if (x <= HEIGHT_FALL_END) {
    const amount = easeCosine((x - HEIGHT_PEAK_END) / (HEIGHT_FALL_END - HEIGHT_PEAK_END));
    return mix(resolved.throatHeight, 0, amount);
  }

  return 0;
}

export function sampleBernoulliSpeedAtPosition(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
  position: number,
) {
  const resolved = resolveBernoulliPrincipleParams(params);
  return resolved.flowRate / Math.max(sampleBernoulliAreaAtPosition(resolved, position), 1e-6);
}

export function sampleBernoulliPressureAtPosition(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
  position: number,
) {
  const resolved = resolveBernoulliPrincipleParams(params);
  const entrySpeed = resolved.flowRate / Math.max(resolved.entryArea, 1e-6);
  const localSpeed = sampleBernoulliSpeedAtPosition(resolved, position);
  const localHeight = sampleBernoulliHeightAtPosition(resolved, position);

  return (
    resolved.entryPressure +
    dynamicPressureFromSpeed(entrySpeed) -
    dynamicPressureFromSpeed(localSpeed) -
    heightPressureFromHeight(localHeight)
  );
}

export function buildBernoulliTravelProfile(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
): BernoulliTravelProfile {
  const resolved = resolveBernoulliPrincipleParams(params);
  const positions = sampleRange(0, BERNOULLI_PRINCIPLE_STAGE_LENGTH, PROFILE_SAMPLES);
  const points: BernoulliTravelProfilePoint[] = [];
  let cumulativeTime = 0;

  positions.forEach((position, index) => {
    if (index > 0) {
      const previous = positions[index - 1] ?? 0;
      const midpoint = (previous + position) / 2;
      const localSpeed = sampleBernoulliSpeedAtPosition(resolved, midpoint);
      cumulativeTime += (position - previous) / Math.max(localSpeed, 1e-6);
    }

    points.push({
      x: position,
      time: cumulativeTime,
      area: sampleBernoulliAreaAtPosition(resolved, position),
      height: sampleBernoulliHeightAtPosition(resolved, position),
      speed: sampleBernoulliSpeedAtPosition(resolved, position),
      pressure: sampleBernoulliPressureAtPosition(resolved, position),
    });
  });

  return {
    points,
    totalTime: cumulativeTime,
  };
}

export function sampleBernoulliPositionFromProfile(
  profile: BernoulliTravelProfile,
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

  return profile.points[profile.points.length - 1]?.x ?? BERNOULLI_PRINCIPLE_STAGE_LENGTH;
}

export function sampleBernoulliPrincipleState(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
  time = 0,
): BernoulliPrincipleSnapshot {
  const resolved = resolveBernoulliPrincipleParams(params);
  const entrySpeed = resolved.flowRate / Math.max(resolved.entryArea, 1e-6);
  const throatSpeed = resolved.flowRate / Math.max(resolved.throatArea, 1e-6);
  const entryDynamicPressure = dynamicPressureFromSpeed(entrySpeed);
  const throatDynamicPressure = dynamicPressureFromSpeed(throatSpeed);
  const throatHeightPressure = heightPressureFromHeight(resolved.throatHeight);
  const throatPressure =
    resolved.entryPressure + entryDynamicPressure - throatDynamicPressure - throatHeightPressure;
  const totalEnergyLike = resolved.entryPressure + entryDynamicPressure;
  const profile = buildBernoulliTravelProfile(resolved);

  return {
    entryPressure: resolved.entryPressure,
    flowRate: resolved.flowRate,
    entryArea: resolved.entryArea,
    throatArea: resolved.throatArea,
    throatHeight: resolved.throatHeight,
    time: normalizeLoopTime(time, profile.totalTime || BERNOULLI_PRINCIPLE_MAX_TIME),
    entrySpeed,
    throatSpeed,
    speedRatio: throatSpeed / Math.max(entrySpeed, 1e-6),
    areaRatio: resolved.throatArea / Math.max(resolved.entryArea, 1e-6),
    entryDynamicPressure,
    throatDynamicPressure,
    throatHeightPressure,
    throatPressure,
    pressureDrop: resolved.entryPressure - throatPressure,
    dynamicPressureDrop: Math.max(0, throatDynamicPressure - entryDynamicPressure),
    heightPressureDrop: throatHeightPressure,
    totalEnergyLike,
    throatTotalEnergyLike: throatPressure + throatDynamicPressure + throatHeightPressure,
    entryVolumeFlow: resolved.entryArea * entrySpeed,
    throatVolumeFlow: resolved.throatArea * throatSpeed,
    entrySliceLength: entrySpeed * BERNOULLI_PRINCIPLE_SLICE_DURATION,
    throatSliceLength: throatSpeed * BERNOULLI_PRINCIPLE_SLICE_DURATION,
    cycleDuration: profile.totalTime,
    geometryLabel: classifyGeometry(
      resolved.entryArea,
      resolved.throatArea,
      resolved.throatHeight,
    ),
    pressureTrend: classifyPressureTrend(resolved.entryPressure, throatPressure),
    throatSpeedTrend: classifySpeedTrend(entrySpeed, throatSpeed),
    dominantPressureShift: classifyDominantShift(
      Math.max(0, throatDynamicPressure - entryDynamicPressure),
      throatHeightPressure,
    ),
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

export function buildBernoulliPrincipleSeries(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
): GraphSeriesMap {
  const resolved = resolveBernoulliPrincipleParams(params);

  return {
    "speed-throat-area": [
      buildResponseSeries(
        "entry-speed",
        "Section A speed",
        "#1ea6a2",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
          BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
          RESPONSE_SAMPLES,
        ).map((throatArea) => ({
          x: throatArea,
          y: resolved.flowRate / resolved.entryArea,
        })),
      ),
      buildResponseSeries(
        "throat-speed",
        "Throat speed",
        "#f16659",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
          BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
          RESPONSE_SAMPLES,
        ).map((throatArea) => ({
          x: throatArea,
          y: resolved.flowRate / throatArea,
        })),
      ),
    ],
    "pressure-throat-area": [
      buildResponseSeries(
        "entry-pressure",
        "Section A pressure",
        "#4ea6df",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
          BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
          RESPONSE_SAMPLES,
        ).map((throatArea) => ({
          x: throatArea,
          y: resolved.entryPressure,
        })),
      ),
      buildResponseSeries(
        "throat-pressure",
        "Throat pressure",
        "#f16659",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
          BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
          RESPONSE_SAMPLES,
        ).map((throatArea) => {
          const entrySpeed = resolved.flowRate / resolved.entryArea;
          const throatSpeed = resolved.flowRate / throatArea;

          return {
            x: throatArea,
            y:
              resolved.entryPressure +
              dynamicPressureFromSpeed(entrySpeed) -
              dynamicPressureFromSpeed(throatSpeed) -
              heightPressureFromHeight(resolved.throatHeight),
          };
        }),
      ),
    ],
    "pressure-flow-rate": [
      buildResponseSeries(
        "throat-pressure",
        "Throat pressure",
        "#f16659",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_FLOW_RATE,
          BERNOULLI_PRINCIPLE_MAX_FLOW_RATE,
          RESPONSE_SAMPLES,
        ).map((flowRate) => {
          const entrySpeed = flowRate / resolved.entryArea;
          const throatSpeed = flowRate / resolved.throatArea;
          const throatPressure =
            resolved.entryPressure +
            dynamicPressureFromSpeed(entrySpeed) -
            dynamicPressureFromSpeed(throatSpeed) -
            heightPressureFromHeight(resolved.throatHeight);

          return {
            x: flowRate,
            y: throatPressure,
          };
        }),
      ),
      buildResponseSeries(
        "pressure-drop",
        "Pressure drop",
        "#f0ab3c",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_FLOW_RATE,
          BERNOULLI_PRINCIPLE_MAX_FLOW_RATE,
          RESPONSE_SAMPLES,
        ).map((flowRate) => {
          const entrySpeed = flowRate / resolved.entryArea;
          const throatSpeed = flowRate / resolved.throatArea;
          const throatPressure =
            resolved.entryPressure +
            dynamicPressureFromSpeed(entrySpeed) -
            dynamicPressureFromSpeed(throatSpeed) -
            heightPressureFromHeight(resolved.throatHeight);

          return {
            x: flowRate,
            y: resolved.entryPressure - throatPressure,
          };
        }),
      ),
    ],
    "pressure-throat-height": [
      buildResponseSeries(
        "throat-pressure",
        "Throat pressure",
        "#f16659",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_THROAT_HEIGHT,
          BERNOULLI_PRINCIPLE_MAX_THROAT_HEIGHT,
          RESPONSE_SAMPLES,
        ).map((throatHeight) => {
          const entrySpeed = resolved.flowRate / resolved.entryArea;
          const throatSpeed = resolved.flowRate / resolved.throatArea;

          return {
            x: throatHeight,
            y:
              resolved.entryPressure +
              dynamicPressureFromSpeed(entrySpeed) -
              dynamicPressureFromSpeed(throatSpeed) -
              heightPressureFromHeight(throatHeight),
          };
        }),
      ),
      buildResponseSeries(
        "height-drop",
        "Height contribution",
        "#f0ab3c",
        sampleRange(
          BERNOULLI_PRINCIPLE_MIN_THROAT_HEIGHT,
          BERNOULLI_PRINCIPLE_MAX_THROAT_HEIGHT,
          RESPONSE_SAMPLES,
        ).map((throatHeight) => ({
          x: throatHeight,
          y: heightPressureFromHeight(throatHeight),
        })),
      ),
    ],
  };
}

export function describeBernoulliPrincipleState(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
  time = 0,
) {
  const snapshot = sampleBernoulliPrincipleState(params, time);
  const pressureText =
    snapshot.pressureTrend === "lower"
      ? "The throat pressure is lower because more of the same total Bernoulli budget now sits in speed and height terms."
      : snapshot.pressureTrend === "higher"
        ? "The throat pressure is higher because the throat is slower and not paying as much of the energy budget into kinetic or height terms."
        : "The throat pressure stays close to the entry pressure because the speed and height terms have not changed much.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the stream carries Q = ${formatMeasurement(snapshot.flowRate, "m^3/s")} from section A with area ${formatMeasurement(snapshot.entryArea, "m^2")} and speed ${formatMeasurement(snapshot.entrySpeed, "m/s")} into a throat with area ${formatMeasurement(snapshot.throatArea, "m^2")}, height rise ${formatMeasurement(snapshot.throatHeight, "m")}, speed ${formatMeasurement(snapshot.throatSpeed, "m/s")}, and static pressure ${formatMeasurement(snapshot.throatPressure, "kPa")}. ${pressureText} Continuity sets the speed change; Bernoulli tells you how the pressure changes with it in this bounded ideal-flow bench.`;
}

export function sampleBernoulliThroatPressure(
  params: Partial<BernoulliPrincipleParams> | Record<string, ControlValue>,
) {
  return sampleBernoulliPressureAtPosition(params, THROAT_SAMPLE_X);
}
