import { describe, expect, it } from "vitest";
import {
  buildReactionRateCollisionTheorySeries,
  describeReactionRateCollisionTheoryState,
  sampleReactionRateCollisionTheoryState,
} from "@/lib/physics";

describe("reaction rate / collision theory helpers", () => {
  it("separates all collisions from successful collisions and responds to heating", () => {
    const cool = sampleReactionRateCollisionTheoryState({
      temperature: 2.1,
      concentration: 1.2,
      activationEnergy: 3,
      catalyst: false,
    });
    const hot = sampleReactionRateCollisionTheoryState({
      temperature: 4.2,
      concentration: 1.2,
      activationEnergy: 3,
      catalyst: false,
    });

    expect(hot.attemptRate).toBeGreaterThan(cool.attemptRate);
    expect(hot.successFraction).toBeGreaterThan(cool.successFraction);
    expect(hot.successfulCollisionRate).toBeGreaterThan(cool.successfulCollisionRate);
    expect(cool.unsuccessfulCollisionRate).toBeGreaterThan(0);
  });

  it("shows how a catalyst lowers the effective barrier without changing the temperature input", () => {
    const uncatalyzed = sampleReactionRateCollisionTheoryState({
      temperature: 3.1,
      concentration: 1.4,
      activationEnergy: 2.8,
      catalyst: false,
    });
    const catalyzed = sampleReactionRateCollisionTheoryState({
      temperature: 3.1,
      concentration: 1.4,
      activationEnergy: 2.8,
      catalyst: true,
    });

    expect(catalyzed.temperature).toBeCloseTo(uncatalyzed.temperature, 6);
    expect(catalyzed.effectiveActivationEnergy).toBeLessThan(uncatalyzed.effectiveActivationEnergy);
    expect(catalyzed.successFraction).toBeGreaterThan(uncatalyzed.successFraction);
  });

  it("builds the temperature and concentration response graphs from the same setup", () => {
    const series = buildReactionRateCollisionTheorySeries({
      temperature: 3.1,
      concentration: 1.4,
      activationEnergy: 2.8,
      catalyst: false,
    });

    expect(series["rate-temperature"]).toHaveLength(2);
    expect(series["rate-temperature"][0]?.id).toBe("successful-rate");
    expect(series["rate-concentration"]).toHaveLength(2);
    expect(series["success-temperature"]).toHaveLength(1);
  });

  it("describes the successful-collision story honestly", () => {
    const description = describeReactionRateCollisionTheoryState({
      temperature: 3.4,
      concentration: 1,
      activationEnergy: 2.8,
      catalyst: true,
    });

    expect(description).toContain("collisions per second");
    expect(description).toContain("catalyst");
  });
});
