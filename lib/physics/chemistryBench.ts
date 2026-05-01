import { clamp } from "./math";

export type ChemistryParticleSpecies = "reactant" | "product";

export type ChemistryParticle = {
  id: string;
  species: ChemistryParticleSpecies;
  x: number;
  y: number;
  radius: number;
  streakX: number;
  streakY: number;
};

export type ChemistryBondedPair = {
  id: string;
  memberIds: [string, string];
  x: number;
  y: number;
  angle: number;
  separation: number;
  radius: number;
  streakX: number;
  streakY: number;
  progress: number;
};

export type ChemistryPulse = {
  id: string;
  tone: "success" | "attempt";
  x: number;
  y: number;
  strength: number;
};

export type ChemistryParticleFieldOptions = {
  reactantCount: number;
  productCount?: number;
  time: number;
  agitation: number;
  width: number;
  height: number;
};

export type ChemistryPulseFieldOptions = {
  pulseCount: number;
  time: number;
  width: number;
  height: number;
  tone: "success" | "attempt";
};

type ChemistryParticleSeed = {
  id: string;
  species: ChemistryParticleSpecies;
  radius: number;
  preferredSpeed: number;
  trailScale: number;
  driftFreqX: number;
  driftFreqY: number;
  driftPhaseX: number;
  driftPhaseY: number;
  wanderWeight: number;
  bounceBias: number;
};

type ChemistryParticleState = ChemistryParticleSeed & {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type ChemistryParticleSnapshot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type ChemistryTrajectory = {
  particles: ChemistryParticleSeed[];
  frames: ChemistryParticleSnapshot[][];
  dt: number;
};

const CHEMISTRY_PADDING = 14;
const CHEMISTRY_SIMULATION_DT = 0.1;
const CHEMISTRY_SIMULATION_MAX_TIME = 24;
const CHEMISTRY_TRAJECTORY_CACHE_LIMIT = 16;
const chemistryTrajectoryCache = new Map<string, ChemistryTrajectory>();

function seededValue(index: number, offset: number) {
  let seed =
    (Math.imul(index + 1, 0x45d9f3b) ^
      Math.imul(Math.round(offset * 1_000_000) + 1, 0x27d4eb2d)) >>>
    0;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x7feb352d) >>> 0;
  seed ^= seed >>> 15;
  seed = Math.imul(seed, 0x846ca68b) >>> 0;
  seed ^= seed >>> 16;

  return seed / 0x1_0000_0000;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0 || 1;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 0x1_0000_0000;
  };
}

function makeSeed(...values: number[]) {
  let seed = 2166136261;

  for (const value of values) {
    seed ^= Math.round(value * 1000);
    seed = Math.imul(seed, 16777619) >>> 0;
  }

  return seed >>> 0;
}

function buildTrajectoryKey({
  reactantCount,
  productCount,
  agitation,
  width,
  height,
}: Omit<ChemistryParticleFieldOptions, "time">) {
  return [
    Math.max(0, Math.round(reactantCount)),
    Math.max(0, Math.round(productCount ?? 0)),
    Math.round(clamp(agitation, 0.1, 2.2) * 100),
    Math.round(width),
    Math.round(height),
  ].join(":");
}

function cloneState(state: ChemistryParticleState): ChemistryParticleState {
  return { ...state };
}

function snapshotState(state: ChemistryParticleState): ChemistryParticleSnapshot {
  return {
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
  };
}

function chooseSpawnPosition(
  existing: ChemistryParticleState[],
  radius: number,
  width: number,
  height: number,
  seed: number,
) {
  const minX = CHEMISTRY_PADDING + radius;
  const maxX = Math.max(minX, width - CHEMISTRY_PADDING - radius);
  const minY = CHEMISTRY_PADDING + radius;
  const maxY = Math.max(minY, height - CHEMISTRY_PADDING - radius);

  if (maxX <= minX || maxY <= minY) {
    return {
      x: width * 0.5,
      y: height * 0.5,
    };
  }

  const rng = createSeededRandom(seed);
  const candidateCount = existing.length < 8 ? 18 : 12;
  let bestX = minX + rng() * (maxX - minX);
  let bestY = minY + rng() * (maxY - minY);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
    const candidateX = minX + rng() * (maxX - minX);
    const candidateY = minY + rng() * (maxY - minY);
    let nearestGap = Number.POSITIVE_INFINITY;

    for (const particle of existing) {
      const gap =
        Math.hypot(candidateX - particle.x, candidateY - particle.y) -
        particle.radius -
        radius;
      nearestGap = Math.min(nearestGap, gap);
    }

    const edgeGap = Math.min(
      candidateX - minX,
      maxX - candidateX,
      candidateY - minY,
      maxY - candidateY,
    );
    const score = nearestGap + edgeGap * 0.2 + rng() * 0.25;

    if (score > bestScore) {
      bestScore = score;
      bestX = candidateX;
      bestY = candidateY;
    }
  }

  return { x: bestX, y: bestY };
}

function buildInitialParticleStates({
  reactantCount,
  productCount,
  agitation,
  width,
  height,
}: Omit<ChemistryParticleFieldOptions, "time">) {
  const states: ChemistryParticleState[] = [];
  const safeAgitation = clamp(agitation, 0.1, 2.2);
  const safeWidth = Math.max(width, 56);
  const safeHeight = Math.max(height, 56);
  const totalCount =
    Math.max(0, Math.round(reactantCount)) + Math.max(0, Math.round(productCount ?? 0));
  const densityScale = clamp(
    Math.sqrt((safeWidth * safeHeight) / Math.max(totalCount, 1) / 2200),
    0.72,
    1.08,
  );

  function addSpecies(total: number, species: ChemistryParticleSpecies, offset: number) {
    for (let index = 0; index < total; index += 1) {
      const seedIndex = index + offset * 101;
      const radiusBase = species === "product" ? 4.5 : 5.1;
      const radiusRange = species === "product" ? 0.9 : 1.15;
      const radius = clamp(
        (radiusBase + seededValue(seedIndex, 1.7) * radiusRange) * densityScale,
        species === "product" ? 3.6 : 4.1,
        species === "product" ? 6.1 : 6.8,
      );
      const preferredSpeed =
        (species === "product" ? 20 : 18) +
        (8 + safeAgitation * 11) * (0.58 + seededValue(seedIndex, 2.5) * 0.72);
      const direction = seededValue(seedIndex, 3.2) * Math.PI * 2;
      const spawn = chooseSpawnPosition(
        states,
        radius,
        safeWidth,
        safeHeight,
        makeSeed(seedIndex, radius, safeWidth, safeHeight, safeAgitation),
      );
      const speed = preferredSpeed * (0.72 + seededValue(seedIndex, 4.1) * 0.4);

      states.push({
        id: `${species}-${index}`,
        species,
        radius,
        x: spawn.x,
        y: spawn.y,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        preferredSpeed,
        trailScale: 0.72 + seededValue(seedIndex, 4.8) * 0.5,
        driftFreqX: 0.7 + seededValue(seedIndex, 5.6) * 1.25,
        driftFreqY: 0.85 + seededValue(seedIndex, 6.2) * 1.15,
        driftPhaseX: seededValue(seedIndex, 7.1) * Math.PI * 2,
        driftPhaseY: seededValue(seedIndex, 7.8) * Math.PI * 2,
        wanderWeight: 0.75 + seededValue(seedIndex, 8.6) * 0.8,
        bounceBias: seededValue(seedIndex, 9.4) - 0.5,
      });
    }
  }

  addSpecies(Math.max(0, Math.round(reactantCount)), "reactant", 1);
  addSpecies(Math.max(0, Math.round(productCount ?? 0)), "product", 2);

  return states;
}

function clampParticleToBounds(
  particle: ChemistryParticleState,
  width: number,
  height: number,
  agitation: number,
) {
  const minX = CHEMISTRY_PADDING + particle.radius;
  const maxX = Math.max(minX, width - CHEMISTRY_PADDING - particle.radius);
  const minY = CHEMISTRY_PADDING + particle.radius;
  const maxY = Math.max(minY, height - CHEMISTRY_PADDING - particle.radius);

  if (particle.x < minX) {
    particle.x = minX;
    particle.vx = Math.abs(particle.vx) * 0.92;
    particle.vy += (0.8 + agitation * 0.35) * particle.bounceBias;
  } else if (particle.x > maxX) {
    particle.x = maxX;
    particle.vx = -Math.abs(particle.vx) * 0.92;
    particle.vy -= (0.8 + agitation * 0.35) * particle.bounceBias;
  }

  if (particle.y < minY) {
    particle.y = minY;
    particle.vy = Math.abs(particle.vy) * 0.92;
    particle.vx -= (0.7 + agitation * 0.3) * particle.bounceBias;
  } else if (particle.y > maxY) {
    particle.y = maxY;
    particle.vy = -Math.abs(particle.vy) * 0.92;
    particle.vx += (0.7 + agitation * 0.3) * particle.bounceBias;
  }

  const centerPullX = (width * 0.5 - particle.x) * 0.0018;
  const centerPullY = (height * 0.5 - particle.y) * 0.0018;
  particle.vx += centerPullX;
  particle.vy += centerPullY;
}

function stepParticleStates(
  sourceStates: ChemistryParticleState[],
  time: number,
  dt: number,
  width: number,
  height: number,
  agitation: number,
) {
  const safeAgitation = clamp(agitation, 0.1, 2.2);
  const states = sourceStates.map(cloneState);

  for (const state of states) {
    const driftX =
      Math.sin(time * state.driftFreqX + state.driftPhaseX) +
      0.55 * Math.cos(time * (state.driftFreqY + 0.12) + state.driftPhaseY);
    const driftY =
      Math.cos(time * state.driftFreqY + state.driftPhaseY) -
      0.5 * Math.sin(time * (state.driftFreqX + 0.18) + state.driftPhaseX);
    const agitationForce = (6.4 + safeAgitation * 5.2) * state.wanderWeight;

    state.vx += driftX * agitationForce * dt;
    state.vy += driftY * agitationForce * dt;

    const currentSpeed = Math.hypot(state.vx, state.vy) || 1;
    const targetSpeed = state.preferredSpeed * (0.82 + safeAgitation * 0.24);
    const steer = clamp(dt * 1.8, 0, 0.26);
    state.vx += ((state.vx / currentSpeed) * targetSpeed - state.vx) * steer;
    state.vy += ((state.vy / currentSpeed) * targetSpeed - state.vy) * steer;

    state.x += state.vx * dt;
    state.y += state.vy * dt;
  }

  for (let index = 0; index < states.length; index += 1) {
    const a = states[index];

    for (let otherIndex = index + 1; otherIndex < states.length; otherIndex += 1) {
      const b = states[otherIndex];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.0001;
      const nx = dx / distance;
      const ny = dy / distance;
      const combinedRadius = a.radius + b.radius;
      const personalSpace = combinedRadius + Math.max(3, combinedRadius * 0.45);

      if (distance < personalSpace) {
        const repulsion =
          (1 - distance / personalSpace) * (3.2 + safeAgitation * 2.4) * dt;
        a.vx -= nx * repulsion;
        a.vy -= ny * repulsion;
        b.vx += nx * repulsion;
        b.vy += ny * repulsion;
      }

      if (distance < combinedRadius) {
        const overlap = combinedRadius - distance + 0.02;
        const correction = overlap * 0.5;
        a.x -= nx * correction;
        a.y -= ny * correction;
        b.x += nx * correction;
        b.y += ny * correction;

        const relativeAlongNormal = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const bounce = Math.max(0, -relativeAlongNormal) + overlap * (1.6 + safeAgitation * 0.6);
        a.vx -= nx * bounce * 0.38;
        a.vy -= ny * bounce * 0.38;
        b.vx += nx * bounce * 0.38;
        b.vy += ny * bounce * 0.38;

        const tangentialKick = ((index + otherIndex) % 2 === 0 ? 1 : -1) * 0.12;
        a.vx -= ny * tangentialKick;
        a.vy += nx * tangentialKick;
        b.vx += ny * tangentialKick;
        b.vy -= nx * tangentialKick;
      }
    }
  }

  for (const state of states) {
    clampParticleToBounds(state, width, height, safeAgitation);

    const maxSpeed = state.preferredSpeed * (1.42 + safeAgitation * 0.08);
    const speed = Math.hypot(state.vx, state.vy) || 1;

    if (speed > maxSpeed) {
      state.vx = (state.vx / speed) * maxSpeed;
      state.vy = (state.vy / speed) * maxSpeed;
    }

    state.vx *= 0.996;
    state.vy *= 0.996;
  }

  return states;
}

function buildTrajectory(options: Omit<ChemistryParticleFieldOptions, "time">): ChemistryTrajectory {
  const particles = buildInitialParticleStates(options);
  const frameCount = Math.ceil(CHEMISTRY_SIMULATION_MAX_TIME / CHEMISTRY_SIMULATION_DT);
  const frames: ChemistryParticleSnapshot[][] = [];
  let states = particles.map(cloneState);

  for (let frameIndex = 0; frameIndex <= frameCount; frameIndex += 1) {
    frames.push(states.map(snapshotState));

    if (frameIndex === frameCount) {
      continue;
    }

    states = stepParticleStates(
      states,
      frameIndex * CHEMISTRY_SIMULATION_DT,
      CHEMISTRY_SIMULATION_DT,
      Math.max(options.width, 56),
      Math.max(options.height, 56),
      options.agitation,
    );
  }

  return {
    particles: particles.map((particle) => ({
      id: particle.id,
      species: particle.species,
      radius: particle.radius,
      preferredSpeed: particle.preferredSpeed,
      trailScale: particle.trailScale,
      driftFreqX: particle.driftFreqX,
      driftFreqY: particle.driftFreqY,
      driftPhaseX: particle.driftPhaseX,
      driftPhaseY: particle.driftPhaseY,
      wanderWeight: particle.wanderWeight,
      bounceBias: particle.bounceBias,
    })),
    frames,
    dt: CHEMISTRY_SIMULATION_DT,
  };
}

function getTrajectory(options: Omit<ChemistryParticleFieldOptions, "time">) {
  const key = buildTrajectoryKey(options);
  const existing = chemistryTrajectoryCache.get(key);

  if (existing) {
    return existing;
  }

  const trajectory = buildTrajectory(options);

  if (chemistryTrajectoryCache.size >= CHEMISTRY_TRAJECTORY_CACHE_LIMIT) {
    const firstKey = chemistryTrajectoryCache.keys().next().value;

    if (firstKey) {
      chemistryTrajectoryCache.delete(firstKey);
    }
  }

  chemistryTrajectoryCache.set(key, trajectory);

  return trajectory;
}

export function buildChemistryParticles({
  reactantCount,
  productCount = 0,
  time,
  agitation,
  width,
  height,
}: ChemistryParticleFieldOptions): ChemistryParticle[] {
  const trajectory = getTrajectory({
    reactantCount,
    productCount,
    agitation,
    width,
    height,
  });
  const safeTime = clamp(Number.isFinite(time) ? time : 0, 0, CHEMISTRY_SIMULATION_MAX_TIME);
  const frameIndex = Math.min(
    Math.floor(safeTime / trajectory.dt),
    trajectory.frames.length - 1,
  );
  const nextFrameIndex = Math.min(frameIndex + 1, trajectory.frames.length - 1);
  const frameBlend = Math.min((safeTime - frameIndex * trajectory.dt) / trajectory.dt, 1);
  const frame = trajectory.frames[frameIndex];
  const nextFrame = trajectory.frames[nextFrameIndex];

  return trajectory.particles.map((particle, index) => {
    const snapshot = frame[index];
    const nextSnapshot = nextFrame[index];
    const x = snapshot.x + (nextSnapshot.x - snapshot.x) * frameBlend;
    const y = snapshot.y + (nextSnapshot.y - snapshot.y) * frameBlend;
    const vx = snapshot.vx + (nextSnapshot.vx - snapshot.vx) * frameBlend;
    const vy = snapshot.vy + (nextSnapshot.vy - snapshot.vy) * frameBlend;
    const streakLength =
      (particle.species === "product" ? 4.8 : 6) +
      clamp(agitation, 0.1, 2.2) * (particle.species === "product" ? 2.7 : 3.6) * particle.trailScale;
    const speed = Math.hypot(vx, vy) || 1;

    return {
      id: particle.id,
      species: particle.species,
      x,
      y,
      radius: particle.radius,
      streakX: (vx / speed) * streakLength,
      streakY: (vy / speed) * streakLength,
    };
  });
}

export function buildChemistryPulses({
  pulseCount,
  time,
  width,
  height,
  tone,
}: ChemistryPulseFieldOptions): ChemistryPulse[] {
  const total = Math.max(0, Math.round(pulseCount));
  const safeTime = Number.isFinite(time) ? time : 0;
  const innerWidth = Math.max(width - 40, 30);
  const innerHeight = Math.max(height - 40, 30);

  return Array.from({ length: total }, (_, index) => {
    const seedA = seededValue(index + (tone === "success" ? 43 : 19), 0.9);
    const seedB = seededValue(index + (tone === "success" ? 71 : 31), 1.4);
    const phase = safeTime * (tone === "success" ? 1.6 : 1.2) + index * 0.9;
    const strength = 0.35 + 0.65 * Math.abs(Math.sin(phase));

    return {
      id: `${tone}-${index}`,
      tone,
      x:
        20 +
        ((((seedA * innerWidth + safeTime * 18 * (seedA > 0.5 ? 1 : -1)) % innerWidth) +
          innerWidth) %
          innerWidth),
      y:
        20 +
        ((((seedB * innerHeight + safeTime * 14 * (seedB > 0.45 ? 1 : -1)) % innerHeight) +
          innerHeight) %
          innerHeight),
      strength,
    } satisfies ChemistryPulse;
  });
}
