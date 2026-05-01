import {
  buildChemistryParticles,
  type ChemistryBondedPair,
  type ChemistryParticle,
} from "./chemistryBench";
import type { AppLocale } from "@/i18n/routing";
import { buildSeries } from "./series";
import { clamp, formatNumber, safeNumber, sampleRange } from "./math";
import type { GraphSeriesMap } from "./types";

export type ReactionRateCollisionTheoryParams = {
  temperature?: number;
  concentration?: number;
  activationEnergy?: number;
  catalyst?: boolean;
};

export type ReactionRateCollisionTheorySnapshot = {
  temperature: number;
  concentration: number;
  activationEnergy: number;
  catalyst: boolean;
  effectiveActivationEnergy: number;
  averageEnergy: number;
  attemptRate: number;
  successFraction: number;
  successfulCollisionRate: number;
  unsuccessfulCollisionRate: number;
  reactantParticleCount: number;
  bondedProductPairCount: number;
  successfulOutcomeCount: number;
  successPulseCount: number;
  attemptPulseCount: number;
};

export type ReactionRateCollisionBenchState = {
  reactantParticles: ChemistryParticle[];
  bondedPairs: ChemistryBondedPair[];
};

export const REACTION_RATE_TEMPERATURE_MIN = 1.4;
export const REACTION_RATE_TEMPERATURE_MAX = 5.4;
export const REACTION_RATE_CONCENTRATION_MIN = 0.8;
export const REACTION_RATE_CONCENTRATION_MAX = 2.2;
export const REACTION_RATE_ACTIVATION_ENERGY_MIN = 1.6;
export const REACTION_RATE_ACTIVATION_ENERGY_MAX = 4.4;
export const REACTION_RATE_TOTAL_TIME = 24;

const RESPONSE_SAMPLES = 201;
const BOND_PAIR_TRANSITION_IN = 0.55;
const BOND_PAIR_TRANSITION_OUT = 0.65;
const BOND_SCHEDULE_CACHE_LIMIT = 18;

type ReactionRateBondEvent = {
  id: string;
  memberIds: [string, string];
  start: number;
  duration: number;
  anchorAngle: number;
  separation: number;
  radius: number;
  wobblePhase: number;
};

type ReactionRateBondSchedule = {
  totalReactantUnits: number;
  events: ReactionRateBondEvent[];
  transitionIn: number;
  transitionOut: number;
};

const reactionRateBondScheduleCache = new Map<string, ReactionRateBondSchedule>();

function reactionRateNoise(index: number, snapshot: ReactionRateCollisionTheorySnapshot) {
  const raw =
    Math.sin(
      (index + 1) * 12.9898 +
        snapshot.temperature * 4.73 +
        snapshot.concentration * 7.11 +
        snapshot.effectiveActivationEnergy * 2.41 +
        (snapshot.catalyst ? 1.7 : 0),
    ) * 43758.5453;

  return raw - Math.floor(raw);
}

function buildReactionRateBondScheduleKey(
  snapshot: ReactionRateCollisionTheorySnapshot,
  width: number,
  height: number,
) {
  return [
    Math.round(snapshot.temperature * 100),
    Math.round(snapshot.concentration * 100),
    Math.round(snapshot.activationEnergy * 100),
    snapshot.catalyst ? 1 : 0,
    snapshot.reactantParticleCount,
    snapshot.bondedProductPairCount,
    Math.round(width),
    Math.round(height),
  ].join(":");
}

function buildReactionRateBondSchedule(
  snapshot: ReactionRateCollisionTheorySnapshot,
  width: number,
  height: number,
): ReactionRateBondSchedule {
  const bondedProductPairCount = Math.max(1, snapshot.bondedProductPairCount);
  const totalReactantUnits =
    Math.max(8, snapshot.reactantParticleCount) + bondedProductPairCount * 2;
  const agitation = snapshot.temperature / 3.8;
  const bondDuration = clamp(
    3.4 + snapshot.successFraction * 1.9 + (snapshot.catalyst ? 0.35 : 0),
    3.5,
    5.2,
  );
  const eventCount = Math.max(
    bondedProductPairCount + 2,
    Math.round((bondedProductPairCount * (REACTION_RATE_TOTAL_TIME - 0.9)) / bondDuration),
  );
  const lastStart = Math.max(0.3, REACTION_RATE_TOTAL_TIME - bondDuration - 0.25);
  const spacing = eventCount <= 1 ? 0 : lastStart / (eventCount - 1);
  const nextAvailable = new Map<string, number>();
  const events: ReactionRateBondEvent[] = [];

  for (let particleIndex = 0; particleIndex < totalReactantUnits; particleIndex += 1) {
    nextAvailable.set(`reactant-${particleIndex}`, 0);
  }

  for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
    const jitter =
      (reactionRateNoise(eventIndex, snapshot) - 0.5) *
      Math.min(0.46, Math.max(spacing, 0.28) * 0.42);
    const start = clamp(
      0.18 + eventIndex * spacing + jitter,
      0.12,
      lastStart,
    );
    const particlesAtStart = buildChemistryParticles({
      reactantCount: totalReactantUnits,
      time: start,
      agitation,
      width,
      height,
    });
    let bestPair:
      | {
          a: ChemistryParticle;
          b: ChemistryParticle;
          distance: number;
        }
      | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 0; index < particlesAtStart.length; index += 1) {
      const a = particlesAtStart[index];

      if ((nextAvailable.get(a.id) ?? 0) > start) {
        continue;
      }

      for (let otherIndex = index + 1; otherIndex < particlesAtStart.length; otherIndex += 1) {
        const b = particlesAtStart[otherIndex];

        if ((nextAvailable.get(b.id) ?? 0) > start) {
          continue;
        }

        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const centerBias =
          Math.abs(width * 0.5 - (a.x + b.x) * 0.5) * 0.012 +
          Math.abs(height * 0.5 - (a.y + b.y) * 0.5) * 0.009;
        const score =
          distance +
          centerBias +
          reactionRateNoise(index * 17 + otherIndex * 31 + eventIndex * 7, snapshot) * 0.8;

        if (score < bestScore) {
          bestScore = score;
          bestPair = { a, b, distance };
        }
      }
    }

    if (!bestPair) {
      continue;
    }

    const targetSeparation = clamp(
      (bestPair.a.radius + bestPair.b.radius) * 1.08,
      10,
      15.5,
    );
    const id = `bond-${eventIndex}`;

    events.push({
      id,
      memberIds: [bestPair.a.id, bestPair.b.id],
      start,
      duration: bondDuration,
      anchorAngle: Math.atan2(
        bestPair.b.y - bestPair.a.y,
        bestPair.b.x - bestPair.a.x,
      ),
      separation: targetSeparation,
      radius: ((bestPair.a.radius + bestPair.b.radius) * 0.5) * 0.96,
      wobblePhase: reactionRateNoise(eventIndex + 91, snapshot) * Math.PI * 2,
    });

    const nextFreeTime = start + bondDuration - BOND_PAIR_TRANSITION_OUT * 0.35;

    nextAvailable.set(bestPair.a.id, nextFreeTime);
    nextAvailable.set(bestPair.b.id, nextFreeTime);
  }

  return {
    totalReactantUnits,
    events,
    transitionIn: BOND_PAIR_TRANSITION_IN,
    transitionOut: BOND_PAIR_TRANSITION_OUT,
  };
}

function getReactionRateBondSchedule(
  snapshot: ReactionRateCollisionTheorySnapshot,
  width: number,
  height: number,
) {
  const key = buildReactionRateBondScheduleKey(snapshot, width, height);
  const existing = reactionRateBondScheduleCache.get(key);

  if (existing) {
    return existing;
  }

  const schedule = buildReactionRateBondSchedule(snapshot, width, height);

  if (reactionRateBondScheduleCache.size >= BOND_SCHEDULE_CACHE_LIMIT) {
    const oldestKey = reactionRateBondScheduleCache.keys().next().value;

    if (oldestKey) {
      reactionRateBondScheduleCache.delete(oldestKey);
    }
  }

  reactionRateBondScheduleCache.set(key, schedule);

  return schedule;
}

export function resolveReactionRateCollisionTheoryParams(
  source:
    | Partial<ReactionRateCollisionTheoryParams>
    | Record<string, number | boolean | string>,
): Required<ReactionRateCollisionTheoryParams> {
  return {
    temperature: clamp(
      safeNumber(source.temperature, 3.1),
      REACTION_RATE_TEMPERATURE_MIN,
      REACTION_RATE_TEMPERATURE_MAX,
    ),
    concentration: clamp(
      safeNumber(source.concentration, 1.4),
      REACTION_RATE_CONCENTRATION_MIN,
      REACTION_RATE_CONCENTRATION_MAX,
    ),
    activationEnergy: clamp(
      safeNumber(source.activationEnergy, 2.8),
      REACTION_RATE_ACTIVATION_ENERGY_MIN,
      REACTION_RATE_ACTIVATION_ENERGY_MAX,
    ),
    catalyst: source.catalyst === true,
  };
}

export function sampleReactionRateCollisionTheoryState(
  source:
    | Partial<ReactionRateCollisionTheoryParams>
    | Record<string, number | boolean | string>,
): ReactionRateCollisionTheorySnapshot {
  const params = resolveReactionRateCollisionTheoryParams(source);
  const effectiveActivationEnergy = Math.max(
    0.8,
    params.activationEnergy - (params.catalyst ? 0.75 : 0),
  );
  const averageEnergy = 0.55 + params.temperature * 0.96;
  const attemptRate =
    params.concentration * (8.5 + params.temperature * 4.8);
  const successFraction = clamp(
    Math.exp(-effectiveActivationEnergy / Math.max(params.temperature * 0.92, 0.35)),
    0.04,
    0.92,
  );
  const successfulCollisionRate = attemptRate * successFraction;
  const unsuccessfulCollisionRate = Math.max(0, attemptRate - successfulCollisionRate);
  const bondedProductPairCount = Math.max(
    2,
    Math.min(
      Math.max(2, Math.floor(Math.max(8, Math.round(params.concentration * 10)) / 2)),
      Math.round(successfulCollisionRate / 4.2 + successFraction * 2.2),
    ),
  );

  return {
    ...params,
    effectiveActivationEnergy,
    averageEnergy,
    attemptRate,
    successFraction,
    successfulCollisionRate,
    unsuccessfulCollisionRate,
    reactantParticleCount: Math.max(8, Math.round(params.concentration * 10)),
    bondedProductPairCount,
    successfulOutcomeCount: bondedProductPairCount,
    successPulseCount: Math.max(3, Math.round(successfulCollisionRate / 2.8)),
    attemptPulseCount: Math.max(3, Math.round(attemptRate / 5.2)),
  };
}

export function buildReactionRateCollisionBenchState(
  snapshot: ReactionRateCollisionTheorySnapshot,
  time: number,
  width: number,
  height: number,
): ReactionRateCollisionBenchState {
  const safeTime = clamp(time, 0, REACTION_RATE_TOTAL_TIME);
  const schedule = getReactionRateBondSchedule(snapshot, width, height);
  const baseParticles = buildChemistryParticles({
    reactantCount: schedule.totalReactantUnits,
    time: safeTime,
    agitation: snapshot.temperature / 3.8,
    width,
    height,
  });
  const particlesById = new Map(baseParticles.map((particle) => [particle.id, particle]));
  const hiddenIds = new Set<string>();
  const bondedPairs: ChemistryBondedPair[] = [];

  for (const event of schedule.events) {
    const elapsed = safeTime - event.start;

    if (elapsed < 0 || elapsed > event.duration) {
      continue;
    }

    const a = particlesById.get(event.memberIds[0]);
    const b = particlesById.get(event.memberIds[1]);

    if (!a || !b) {
      continue;
    }

    hiddenIds.add(a.id);
    hiddenIds.add(b.id);

    const bondInProgress = clamp(elapsed / schedule.transitionIn, 0, 1);
    const bondOutProgress =
      elapsed >= event.duration - schedule.transitionOut
        ? clamp((event.duration - elapsed) / schedule.transitionOut, 0, 1)
        : 1;
    const bondProgress = Math.min(bondInProgress, bondOutProgress);
    const currentDistance = Math.max(0.001, Math.hypot(a.x - b.x, a.y - b.y));
    const currentAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const separation =
      event.separation + (currentDistance - event.separation) * (1 - bondProgress);
    const centerX = (a.x + b.x) * 0.5;
    const centerY = (a.y + b.y) * 0.5;
    const bondAngle =
      bondProgress >= 0.999
        ? event.anchorAngle + Math.sin(elapsed * 2.3 + event.wobblePhase) * 0.18
        : currentAngle;
    const averageStreakX = (a.streakX + b.streakX) * 0.5;
    const averageStreakY = (a.streakY + b.streakY) * 0.5;

    bondedPairs.push({
      id: event.id,
      memberIds: event.memberIds,
      x: centerX,
      y: centerY,
      angle: bondAngle,
      separation,
      radius: event.radius * (0.92 + bondProgress * 0.1),
      streakX: averageStreakX * (0.9 + bondProgress * 0.12),
      streakY: averageStreakY * (0.9 + bondProgress * 0.12),
      progress: bondProgress,
    });
  }

  return {
    reactantParticles: baseParticles.filter((particle) => !hiddenIds.has(particle.id)),
    bondedPairs,
  };
}

export function buildReactionRateCollisionTheorySeries(
  source:
    | Partial<ReactionRateCollisionTheoryParams>
    | Record<string, number | boolean | string>,
  locale?: AppLocale,
): GraphSeriesMap {
  const resolved = resolveReactionRateCollisionTheoryParams(source);
  const isZhHk = locale === "zh-HK";
  const temperatureSamples = sampleRange(
    REACTION_RATE_TEMPERATURE_MIN,
    REACTION_RATE_TEMPERATURE_MAX,
    RESPONSE_SAMPLES,
  );
  const concentrationSamples = sampleRange(
    REACTION_RATE_CONCENTRATION_MIN,
    REACTION_RATE_CONCENTRATION_MAX,
    RESPONSE_SAMPLES,
  );

  return {
    "rate-temperature": [
      buildSeries(
        "successful-rate",
        isZhHk ? "成功碰撞" : "Successful collisions",
        temperatureSamples.map((temperature) => ({
          x: temperature,
          y: sampleReactionRateCollisionTheoryState({
            ...resolved,
            temperature,
          }).successfulCollisionRate,
        })),
        "#1ea6a2",
      ),
      buildSeries(
        "attempt-rate",
        isZhHk ? "全部碰撞" : "All collisions",
        temperatureSamples.map((temperature) => ({
          x: temperature,
          y: sampleReactionRateCollisionTheoryState({
            ...resolved,
            temperature,
          }).attemptRate,
        })),
        "#f0ab3c",
        true,
      ),
    ],
    "rate-concentration": [
      buildSeries(
        "successful-rate",
        isZhHk ? "成功碰撞" : "Successful collisions",
        concentrationSamples.map((concentration) => ({
          x: concentration,
          y: sampleReactionRateCollisionTheoryState({
            ...resolved,
            concentration,
          }).successfulCollisionRate,
        })),
        "#4ea6df",
      ),
      buildSeries(
        "attempt-rate",
        isZhHk ? "全部碰撞" : "All collisions",
        concentrationSamples.map((concentration) => ({
          x: concentration,
          y: sampleReactionRateCollisionTheoryState({
            ...resolved,
            concentration,
          }).attemptRate,
        })),
        "#f0ab3c",
        true,
      ),
    ],
    "success-temperature": [
      buildSeries(
        "success-fraction",
        isZhHk ? "成功比例" : "Successful fraction",
        temperatureSamples.map((temperature) => ({
          x: temperature,
          y: sampleReactionRateCollisionTheoryState({
            ...resolved,
            temperature,
          }).successFraction,
        })),
        "#f16659",
      ),
    ],
  };
}

export function describeReactionRateCollisionTheoryState(
  source:
    | Partial<ReactionRateCollisionTheoryParams>
    | Record<string, number | boolean | string>,
  locale?: AppLocale,
) {
  const snapshot = sampleReactionRateCollisionTheoryState(source);
  if (locale === "zh-HK") {
    const temperatureSummary =
      snapshot.successFraction >= 0.55
        ? "粒子現在夠常越過活化門檻，因此有相當多碰撞會真正變成反應。"
        : snapshot.successFraction <= 0.22
          ? "大部分碰撞仍然失敗，因為粒子很少能跨過活化門檻。"
          : "有些碰撞已經有足夠能量發生反應，但盒子裡仍然是未成功的碰撞佔大多數。";
    const concentrationSummary =
      snapshot.concentration >= 1.8
        ? "混合物現在相當擁擠，所以碰撞嘗試會很頻繁。"
        : snapshot.concentration <= 1
          ? "混合物比較稀，因此即使成功比例不錯，真正能發揮作用的機會也較少。"
          : "碰撞頻率屬於中等，所以擁擠程度和粒子能量兩者都仍然重要。";
    const catalystSummary = snapshot.catalyst
      ? "催化劑已啟用，所以在不用額外加熱的情況下，反應門檻已經降低。"
      : "目前沒有催化劑，所以要提高成功比例，只能改變粒子的能量尺度或直接降低門檻本身。";

    return `目前這一盒混合物每秒大約會發生 ${formatNumber(snapshot.attemptRate)} 次碰撞，其中約有 ${formatNumber(snapshot.successfulCollisionRate)} 次會成功反應。成功的碰撞會在實驗台上短暫顯示為成鍵後的產物對，而不是單純擦身而過的標記。${temperatureSummary}${concentrationSummary}${catalystSummary}`;
  }
  const temperatureSummary =
    snapshot.successFraction >= 0.55
      ? "The particles now clear the activation threshold often enough that many collisions succeed."
      : snapshot.successFraction <= 0.22
        ? "Most collisions still fail because the particles rarely clear the activation threshold."
        : "Some collisions are energetic enough to react, but unsuccessful hits still dominate the box.";
  const concentrationSummary =
    snapshot.concentration >= 1.8
      ? "The mixture is crowded, so collision attempts happen frequently."
      : snapshot.concentration <= 1
        ? "The mixture is dilute, so even successful fractions have fewer chances to matter."
        : "The collision frequency is moderate, so both crowding and energy still matter.";
  const catalystSummary = snapshot.catalyst
    ? "The catalyst is on, so the barrier is lower without having to heat the mixture further."
    : "With no catalyst, the only way to raise the successful fraction is to change the energy scale or the barrier itself.";

  return `The current mixture makes about ${formatNumber(snapshot.attemptRate)} collisions per second, and about ${formatNumber(snapshot.successfulCollisionRate)} of them succeed. Successful hits show up on the bench as briefly bonded product pairs instead of detached badges. ${temperatureSummary} ${concentrationSummary} ${catalystSummary}`;
}
