import { describe, expect, it } from "vitest";
import { buildChemistryParticles } from "@/lib/physics";

function countSevereOverlaps(
  particles: ReturnType<typeof buildChemistryParticles>,
  overlapFactor = 0.86,
) {
  let overlaps = 0;

  for (let index = 0; index < particles.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
      const a = particles[index];
      const b = particles[otherIndex];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < (a.radius + b.radius) * overlapFactor) {
        overlaps += 1;
      }
    }
  }

  return overlaps;
}

function occupiedCells(
  particles: ReturnType<typeof buildChemistryParticles>,
  width: number,
  height: number,
  columns: number,
  rows: number,
) {
  return new Set(
    particles.map((particle) => {
      const column = Math.min(columns - 1, Math.floor((particle.x / width) * columns));
      const row = Math.min(rows - 1, Math.floor((particle.y / height) * rows));

      return `${column}:${row}`;
    }),
  );
}

describe("chemistryBench particle field", () => {
  it("keeps crowded chemistry boxes spread out without severe overlaps", () => {
    const width = 420;
    const height = 168;
    const particles = buildChemistryParticles({
      reactantCount: 28,
      productCount: 8,
      time: 2.4,
      agitation: 1.1,
      width,
      height,
    });

    expect(particles).toHaveLength(36);

    for (const particle of particles) {
      expect(particle.x).toBeGreaterThanOrEqual(particle.radius);
      expect(particle.x).toBeLessThanOrEqual(width - particle.radius);
      expect(particle.y).toBeGreaterThanOrEqual(particle.radius);
      expect(particle.y).toBeLessThanOrEqual(height - particle.radius);
    }

    expect(countSevereOverlaps(particles)).toBe(0);
    expect(occupiedCells(particles, width, height, 6, 4).size).toBeGreaterThanOrEqual(13);
  });

  it("keeps the motion alive over time instead of freezing the same layout", () => {
    const width = 420;
    const height = 168;
    const atStart = buildChemistryParticles({
      reactantCount: 24,
      productCount: 6,
      time: 0.25,
      agitation: 0.95,
      width,
      height,
    });
    const later = buildChemistryParticles({
      reactantCount: 24,
      productCount: 6,
      time: 1.8,
      agitation: 0.95,
      width,
      height,
    });
    const displacements = atStart.map((particle, index) =>
      Math.hypot(later[index].x - particle.x, later[index].y - particle.y),
    );
    const movedParticles = displacements.filter((distance) => distance > 8).length;

    expect(movedParticles).toBeGreaterThanOrEqual(22);
    expect(occupiedCells(later, width, height, 6, 4).size).toBeGreaterThanOrEqual(12);
  });
});
