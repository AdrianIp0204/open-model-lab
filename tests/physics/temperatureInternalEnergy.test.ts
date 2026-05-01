import { describe, expect, it } from "vitest";
import {
  buildTemperatureInternalEnergySeries,
  describeTemperatureInternalEnergyState,
  sampleTemperatureInternalEnergyState,
} from "@/lib/physics";

describe("temperature/internal-energy helpers", () => {
  it("keeps the same temperature while a larger sample stores more internal energy", () => {
    const small = sampleTemperatureInternalEnergyState({
      particleCount: 12,
      heaterPower: 2.4,
      startingTemperature: 2.8,
      latentEnergyPerParticle: 0,
      initialPhaseProgress: 1,
      bondEnergyPerParticle: 0.9,
    });
    const large = sampleTemperatureInternalEnergyState({
      particleCount: 36,
      heaterPower: 2.4,
      startingTemperature: 2.8,
      latentEnergyPerParticle: 0,
      initialPhaseProgress: 1,
      bondEnergyPerParticle: 0.9,
    });

    expect(small.temperature).toBeCloseTo(large.temperature, 6);
    expect(small.averageKineticEnergy).toBeCloseTo(large.averageKineticEnergy, 6);
    expect(large.internalEnergy).toBeCloseTo(small.internalEnergy * 3, 6);
  });

  it("holds temperature nearly flat while the phase shelf is filling", () => {
    const shelf = sampleTemperatureInternalEnergyState(
      {
        particleCount: 18,
        heaterPower: 2.6,
        startingTemperature: 2.4,
        phasePlateauTemperature: 3.6,
        latentEnergyPerParticle: 3.2,
        initialPhaseProgress: 0,
        bondEnergyPerParticle: 0.9,
      },
      14,
    );

    expect(shelf.temperature).toBeCloseTo(3.6, 6);
    expect(shelf.phaseProgress).toBeGreaterThan(0.3);
    expect(shelf.phaseProgress).toBeLessThan(0.4);
    expect(shelf.temperatureRate).toBe(0);
    expect(shelf.internalEnergy).toBeGreaterThan(shelf.thermalKineticEnergy);
  });

  it("builds the expected time and amount series groups", () => {
    const series = buildTemperatureInternalEnergySeries({
      particleCount: 18,
      heaterPower: 2.6,
      startingTemperature: 2.4,
      phasePlateauTemperature: 3.6,
      latentEnergyPerParticle: 3.2,
      initialPhaseProgress: 0,
      bondEnergyPerParticle: 0.9,
    });

    expect(series["temperature-history"]).toHaveLength(1);
    expect(series["energy-breakdown"]).toHaveLength(3);
    expect(series["amount-internal-energy"]).toHaveLength(1);
    expect(series["amount-heating-rate"]).toHaveLength(1);
    expect(series["temperature-history"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes amount and shelf behavior honestly", () => {
    const description = describeTemperatureInternalEnergyState(
      {
        particleCount: 18,
        heaterPower: 2.6,
        startingTemperature: 3.6,
        phasePlateauTemperature: 3.6,
        latentEnergyPerParticle: 3.2,
        initialPhaseProgress: 0.35,
        bondEnergyPerParticle: 0.9,
      },
      2,
    );

    expect(description).toContain("18 particles");
    expect(description).toContain("internal energy");
    expect(description).toMatch(/bond and phase changes|average particle kinetic energy/i);
  });
});
