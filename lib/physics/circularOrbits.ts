import type { AppLocale } from "@/i18n/routing";
import { copyText } from "@/lib/i18n/copy-text";
import { buildSeries } from "./series";
import { clamp, formatMeasurement, formatNumber, safeNumber, TAU } from "./math";
import type { GraphSeriesMap } from "./types";

export type CircularOrbitsParams = {
  sourceMass?: number;
  orbitRadius?: number;
  speedFactor?: number;
};

export type CircularOrbitsState = {
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  gravityAcceleration: number;
  requiredCentripetalAcceleration: number;
  localCircularSpeed: number;
  referenceCircularSpeed: number;
  referenceAngularSpeed: number;
  referencePeriod: number;
  radiusDeviation: number;
  balanceGap: number;
};

export type CircularOrbitTrajectory = {
  params: Required<CircularOrbitsParams>;
  duration: number;
  timeStep: number;
  samples: CircularOrbitsState[];
};

export const CIRCULAR_ORBITS_MIN_SOURCE_MASS = 2;
export const CIRCULAR_ORBITS_MAX_SOURCE_MASS = 6;
export const CIRCULAR_ORBITS_MIN_ORBIT_RADIUS = 0.9;
export const CIRCULAR_ORBITS_MAX_ORBIT_RADIUS = 2.2;
export const CIRCULAR_ORBITS_MIN_SPEED_FACTOR = 0.8;
export const CIRCULAR_ORBITS_MAX_SPEED_FACTOR = 1.1;
export const CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS = 0.45;
export const CIRCULAR_ORBITS_STAGE_MAX_RADIUS = 3.5;
export const CIRCULAR_ORBITS_RING_RADII = [1, 2, 3] as const;

const CIRCULAR_ORBITS_SAMPLE_COUNT = 280;
const CIRCULAR_ORBITS_MIN_DURATION = 5.5;
const CIRCULAR_ORBITS_MAX_DURATION = 12;

type OrbitVectorState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function resolveSourceMass(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    CIRCULAR_ORBITS_MIN_SOURCE_MASS,
    CIRCULAR_ORBITS_MAX_SOURCE_MASS,
  );
}

function resolveOrbitRadius(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    CIRCULAR_ORBITS_MIN_ORBIT_RADIUS,
    CIRCULAR_ORBITS_MAX_ORBIT_RADIUS,
  );
}

function resolveSpeedFactor(value: unknown, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    CIRCULAR_ORBITS_MIN_SPEED_FACTOR,
    CIRCULAR_ORBITS_MAX_SPEED_FACTOR,
  );
}

export function resolveCircularOrbitSpeed(sourceMass: number, orbitRadius: number) {
  return Math.sqrt(sourceMass / Math.max(orbitRadius, CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS));
}

export function resolveCircularOrbitAngularSpeed(sourceMass: number, orbitRadius: number) {
  return Math.sqrt(
    sourceMass / Math.pow(Math.max(orbitRadius, CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS), 3),
  );
}

export function resolveCircularOrbitPeriod(sourceMass: number, orbitRadius: number) {
  return TAU / Math.max(resolveCircularOrbitAngularSpeed(sourceMass, orbitRadius), 1e-6);
}

export function resolveCircularOrbitKeplerRatio(sourceMass: number, orbitRadius: number) {
  const period = resolveCircularOrbitPeriod(sourceMass, orbitRadius);
  return (period * period) / Math.pow(Math.max(orbitRadius, CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS), 3);
}

function buildSample(
  state: OrbitVectorState,
  time: number,
  params: Required<CircularOrbitsParams>,
) {
  const radius = Math.hypot(state.x, state.y);
  const effectiveRadius = Math.max(radius, CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS);
  const speed = Math.hypot(state.vx, state.vy);
  const gravityAcceleration = params.sourceMass / (effectiveRadius * effectiveRadius);
  const requiredCentripetalAcceleration = (speed * speed) / effectiveRadius;
  const localCircularSpeed = resolveCircularOrbitSpeed(params.sourceMass, effectiveRadius);
  const referenceCircularSpeed = resolveCircularOrbitSpeed(params.sourceMass, params.orbitRadius);
  const referenceAngularSpeed = resolveCircularOrbitAngularSpeed(
    params.sourceMass,
    params.orbitRadius,
  );
  const referencePeriod = resolveCircularOrbitPeriod(params.sourceMass, params.orbitRadius);

  return {
    time,
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
    radius,
    speed,
    gravityAcceleration,
    requiredCentripetalAcceleration,
    localCircularSpeed,
    referenceCircularSpeed,
    referenceAngularSpeed,
    referencePeriod,
    radiusDeviation: radius - params.orbitRadius,
    balanceGap: gravityAcceleration - requiredCentripetalAcceleration,
  } satisfies CircularOrbitsState;
}

function resolveAcceleration(sourceMass: number, x: number, y: number) {
  const radius = Math.hypot(x, y);

  if (radius < 1e-9) {
    return { ax: -sourceMass / Math.pow(CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS, 2), ay: 0 };
  }

  const effectiveRadius = Math.max(radius, CIRCULAR_ORBITS_MIN_SAMPLE_RADIUS);
  const scale = -sourceMass / Math.pow(effectiveRadius, 3);

  return {
    ax: x * scale,
    ay: y * scale,
  };
}

function advanceOrbitState(
  state: OrbitVectorState,
  sourceMass: number,
  timeStep: number,
): OrbitVectorState {
  const k1 = resolveAcceleration(sourceMass, state.x, state.y);
  const x2 = state.x + state.vx * (timeStep / 2);
  const y2 = state.y + state.vy * (timeStep / 2);
  const vx2 = state.vx + k1.ax * (timeStep / 2);
  const vy2 = state.vy + k1.ay * (timeStep / 2);
  const k2 = resolveAcceleration(sourceMass, x2, y2);
  const x3 = state.x + vx2 * (timeStep / 2);
  const y3 = state.y + vy2 * (timeStep / 2);
  const vx3 = state.vx + k2.ax * (timeStep / 2);
  const vy3 = state.vy + k2.ay * (timeStep / 2);
  const k3 = resolveAcceleration(sourceMass, x3, y3);
  const x4 = state.x + vx3 * timeStep;
  const y4 = state.y + vy3 * timeStep;
  const vx4 = state.vx + k3.ax * timeStep;
  const vy4 = state.vy + k3.ay * timeStep;
  const k4 = resolveAcceleration(sourceMass, x4, y4);

  return {
    x:
      state.x +
      (timeStep / 6) * (state.vx + 2 * vx2 + 2 * vx3 + vx4),
    y:
      state.y +
      (timeStep / 6) * (state.vy + 2 * vy2 + 2 * vy3 + vy4),
    vx:
      state.vx +
      (timeStep / 6) * (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax),
    vy:
      state.vy +
      (timeStep / 6) * (k1.ay + 2 * k2.ay + 2 * k3.ay + k4.ay),
  };
}

function interpolateSample(
  first: CircularOrbitsState,
  second: CircularOrbitsState,
  time: number,
) {
  const span = second.time - first.time;
  const amount = span <= 0 ? 0 : (time - first.time) / span;

  const x = first.x + (second.x - first.x) * amount;
  const y = first.y + (second.y - first.y) * amount;
  const vx = first.vx + (second.vx - first.vx) * amount;
  const vy = first.vy + (second.vy - first.vy) * amount;
  const radius = first.radius + (second.radius - first.radius) * amount;
  const speed = first.speed + (second.speed - first.speed) * amount;
  const gravityAcceleration =
    first.gravityAcceleration +
    (second.gravityAcceleration - first.gravityAcceleration) * amount;
  const requiredCentripetalAcceleration =
    first.requiredCentripetalAcceleration +
    (second.requiredCentripetalAcceleration - first.requiredCentripetalAcceleration) * amount;
  const localCircularSpeed =
    first.localCircularSpeed + (second.localCircularSpeed - first.localCircularSpeed) * amount;
  const radiusDeviation =
    first.radiusDeviation + (second.radiusDeviation - first.radiusDeviation) * amount;
  const balanceGap = first.balanceGap + (second.balanceGap - first.balanceGap) * amount;

  return {
    ...first,
    time,
    x,
    y,
    vx,
    vy,
    radius,
    speed,
    gravityAcceleration,
    requiredCentripetalAcceleration,
    localCircularSpeed,
    radiusDeviation,
    balanceGap,
  } satisfies CircularOrbitsState;
}

function buildDuration(sourceMass: number, orbitRadius: number) {
  const referencePeriod = resolveCircularOrbitPeriod(sourceMass, orbitRadius);
  return clamp(
    referencePeriod * 1.2,
    CIRCULAR_ORBITS_MIN_DURATION,
    CIRCULAR_ORBITS_MAX_DURATION,
  );
}

export function resolveCircularOrbitsParams(
  source: Partial<CircularOrbitsParams> | Record<string, number | boolean | string>,
): Required<CircularOrbitsParams> {
  return {
    sourceMass: resolveSourceMass(source.sourceMass, 4),
    orbitRadius: resolveOrbitRadius(source.orbitRadius, 1.6),
    speedFactor: resolveSpeedFactor(source.speedFactor, 1),
  };
}

export function buildCircularOrbitTrajectory(
  source: Partial<CircularOrbitsParams> | Record<string, number | boolean | string>,
): CircularOrbitTrajectory {
  const params = resolveCircularOrbitsParams(source);
  const duration = buildDuration(params.sourceMass, params.orbitRadius);
  const timeStep = duration / (CIRCULAR_ORBITS_SAMPLE_COUNT - 1);
  const initialSpeed =
    resolveCircularOrbitSpeed(params.sourceMass, params.orbitRadius) * params.speedFactor;
  let state: OrbitVectorState = {
    x: params.orbitRadius,
    y: 0,
    vx: 0,
    vy: initialSpeed,
  };

  const samples: CircularOrbitsState[] = [];

  for (let index = 0; index < CIRCULAR_ORBITS_SAMPLE_COUNT; index += 1) {
    const time = index * timeStep;
    samples.push(buildSample(state, time, params));

    if (index < CIRCULAR_ORBITS_SAMPLE_COUNT - 1) {
      state = advanceOrbitState(state, params.sourceMass, timeStep);
    }
  }

  return {
    params,
    duration,
    timeStep,
    samples,
  };
}

export function sampleCircularOrbitsState(
  source: Partial<CircularOrbitsParams> | Record<string, number | boolean | string>,
  time: number,
  trajectory?: CircularOrbitTrajectory,
) {
  const resolvedTrajectory = trajectory ?? buildCircularOrbitTrajectory(source);
  const clampedTime = clamp(time, 0, resolvedTrajectory.duration);
  const lastIndex = resolvedTrajectory.samples.length - 1;
  const rawIndex = clampedTime / Math.max(resolvedTrajectory.timeStep, 1e-6);
  const baseIndex = Math.min(lastIndex, Math.max(0, Math.floor(rawIndex)));
  const nextIndex = Math.min(lastIndex, baseIndex + 1);
  const first = resolvedTrajectory.samples[baseIndex] ?? resolvedTrajectory.samples[0];
  const second = resolvedTrajectory.samples[nextIndex] ?? first;

  if (!first || !second) {
    return buildSample(
      {
        x: resolvedTrajectory.params.orbitRadius,
        y: 0,
        vx: 0,
        vy:
          resolvedTrajectory.params.speedFactor *
          resolveCircularOrbitSpeed(
            resolvedTrajectory.params.sourceMass,
            resolvedTrajectory.params.orbitRadius,
          ),
      },
      0,
      resolvedTrajectory.params,
    );
  }

  if (baseIndex === nextIndex) {
    return first;
  }

  return interpolateSample(first, second, clampedTime);
}

export function buildCircularOrbitsSeries(
  source: Partial<CircularOrbitsParams> | Record<string, number | boolean | string>,
  locale: AppLocale = "en",
): GraphSeriesMap {
  const trajectory = buildCircularOrbitTrajectory(source);

  return {
    "radius-history": [
      buildSeries(
        "radius",
        copyText(locale, "r(t)", "r(t)"),
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.radius,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "reference-radius",
        copyText(locale, "r_ref", "r_ref"),
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: trajectory.params.orbitRadius,
        })),
        "#f16659",
      ),
    ],
    "speed-history": [
      buildSeries(
        "actual-speed",
        copyText(locale, "v(t)", "v(t)"),
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.speed,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "circular-speed",
        copyText(locale, "v_c(r)", "v_c(r)"),
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.localCircularSpeed,
        })),
        "#f0ab3c",
      ),
    ],
    "acceleration-balance": [
      buildSeries(
        "gravity-available",
        copyText(locale, "g(r)", "g(r)"),
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.gravityAcceleration,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "centripetal-required",
        copyText(locale, "v^2/r", "v^2/r"),
        trajectory.samples.map((sample) => ({
          x: sample.time,
          y: sample.requiredCentripetalAcceleration,
        })),
        "#f16659",
      ),
    ],
  };
}

function classifyOrbitState(
  snapshot: CircularOrbitsState,
  speedFactor: number,
  locale: AppLocale = "en",
) {
  if (Math.abs(speedFactor - 1) <= 0.015 && Math.abs(snapshot.radiusDeviation) <= 0.04) {
    return copyText(
      locale,
      "The chosen speed matches the circular-orbit condition closely, so gravity keeps turning the path without pulling it inward or letting it drift outward.",
      "所選速度與圓軌道條件十分接近，因此重力能持續把軌跡拉成轉彎，而不會明顯向內墜落或向外飄離。",
    );
  }

  if (snapshot.balanceGap > 0.05) {
    return copyText(
      locale,
      "Gravity is stronger than the turning requirement set by the chosen speed, so the path bends inward from the reference circle.",
      "重力比這個速度所需的轉彎需求更強，因此軌跡會從參考圓向內彎曲。",
    );
  }

  if (snapshot.balanceGap < -0.05) {
    return copyText(
      locale,
      "The chosen speed asks for more turning than gravity can provide at that radius, so the path opens outward from the reference circle.",
      "所選速度要求的轉彎程度超過該半徑下重力能提供的範圍，因此軌跡會從參考圓向外張開。",
    );
  }

  return copyText(
    locale,
    "The speed is close to the circular condition, so the path only drifts gently away from the reference circle over this short window.",
    "速度仍接近圓軌道條件，所以在這段短時間內，軌跡只會輕微偏離參考圓。",
  );
}

export function describeCircularOrbitsState(
  source: Partial<CircularOrbitsParams> | Record<string, number | boolean | string>,
  time: number,
  locale: AppLocale = "en",
) {
  const trajectory = buildCircularOrbitTrajectory(source);
  const snapshot = sampleCircularOrbitsState(source, time, trajectory);

  if (locale === "zh-HK") {
    return `在 t = ${formatMeasurement(snapshot.time, "s")} 時，衛星與中心質量的距離為 ${formatMeasurement(snapshot.radius, "m")}。其速度為 ${formatMeasurement(snapshot.speed, "m/s")}，而當地圓軌道速度為 ${formatMeasurement(snapshot.localCircularSpeed, "m/s")}。重力提供 ${formatMeasurement(snapshot.gravityAcceleration, "m/s^2")} 的向心加速度，而目前轉彎需要 ${formatMeasurement(snapshot.requiredCentripetalAcceleration, "m/s^2")}。${classifyOrbitState(snapshot, trajectory.params.speedFactor, locale)}`;
  }

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the satellite is ${formatMeasurement(snapshot.radius, "m")} from the source mass. Its speed is ${formatMeasurement(snapshot.speed, "m/s")}, while the local circular speed is ${formatMeasurement(snapshot.localCircularSpeed, "m/s")}. Gravity supplies ${formatMeasurement(snapshot.gravityAcceleration, "m/s^2")} inward and the current turn would need ${formatMeasurement(snapshot.requiredCentripetalAcceleration, "m/s^2")}. ${classifyOrbitState(snapshot, trajectory.params.speedFactor)}`;
}

export function formatCircularOrbitStatus(
  snapshot: CircularOrbitsState,
  speedFactor: number,
  locale: AppLocale = "en",
) {
  if (Math.abs(speedFactor - 1) <= 0.015 && Math.abs(snapshot.radiusDeviation) <= 0.04) {
    return copyText(locale, "Circular balance", "圓軌道平衡");
  }

  return snapshot.balanceGap > 0
    ? copyText(locale, "Falls inward", "向內墜落")
    : copyText(locale, "Opens outward", "向外張開");
}

export function formatCircularOrbitTrend(
  snapshot: CircularOrbitsState,
  speedFactor: number,
  locale: AppLocale = "en",
) {
  if (Math.abs(speedFactor - 1) <= 0.015 && Math.abs(snapshot.radiusDeviation) <= 0.04) {
    return copyText(locale, "Gravity and v^2/r stay closely matched.", "重力與 v^2/r 仍然十分接近。");
  }

  if (snapshot.balanceGap > 0) {
    return copyText(locale, "Gravity exceeds the turning need, so the path tightens inward.", "重力大於所需的轉彎需求，因此軌跡會向內收緊。");
  }

  return copyText(locale, "The turning need exceeds gravity, so the path drifts outward.", "所需的轉彎需求大於重力，因此軌跡會向外偏離。");
}

export function formatCircularOrbitBalance(snapshot: CircularOrbitsState) {
  return `${formatNumber(snapshot.gravityAcceleration)} vs ${formatNumber(snapshot.requiredCentripetalAcceleration)}`;
}
