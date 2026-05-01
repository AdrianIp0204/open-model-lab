import { describe, expect, it } from "vitest";
import {
  buildReactionRateCollisionBenchState,
  sampleReactionRateCollisionTheoryState,
} from "@/lib/physics";

describe("reaction-rate collision bench state", () => {
  it("turns successful collisions into bonded pairs that own specific reactant ids", () => {
    const snapshot = sampleReactionRateCollisionTheoryState({
      temperature: 3.9,
      concentration: 1.6,
      activationEnergy: 2.4,
      catalyst: false,
    });
    const bench = buildReactionRateCollisionBenchState(snapshot, 2.4, 458, 202);
    const visibleReactantIds = new Set(bench.reactantParticles.map((particle) => particle.id));

    expect(bench.bondedPairs.length).toBeGreaterThan(0);

    for (const pair of bench.bondedPairs) {
      expect(pair.memberIds[0]).not.toBe(pair.memberIds[1]);
      expect(visibleReactantIds.has(pair.memberIds[0])).toBe(false);
      expect(visibleReactantIds.has(pair.memberIds[1])).toBe(false);
      expect(pair.progress).toBeGreaterThan(0.6);
      expect(pair.separation).toBeGreaterThan(8);
      expect(pair.x).toBeGreaterThanOrEqual(pair.radius);
      expect(pair.y).toBeGreaterThanOrEqual(pair.radius);
      expect(pair.x).toBeLessThanOrEqual(458 - pair.radius);
      expect(pair.y).toBeLessThanOrEqual(202 - pair.radius);
    }
  });
});
