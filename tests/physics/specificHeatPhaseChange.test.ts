import { describe, expect, it } from "vitest";
import {
  buildSpecificHeatPhaseChangeSeries,
  describeSpecificHeatPhaseChangeState,
  sampleSpecificHeatPhaseChangeState,
} from "@/lib/physics";

describe("specific-heat-phase-change helpers", () => {
  it("gives a much smaller temperature rise when specific heat is larger under the same pulse", () => {
    const lowC = sampleSpecificHeatPhaseChangeState(
      {
        mass: 1.4,
        specificHeat: 0.9,
        heaterPower: 12,
        startingTemperature: 25,
        latentHeat: 260,
        initialPhaseFraction: 1,
        phaseChangeTemperature: 0,
      },
      4,
    );
    const highC = sampleSpecificHeatPhaseChangeState(
      {
        mass: 1.4,
        specificHeat: 4,
        heaterPower: 12,
        startingTemperature: 25,
        latentHeat: 260,
        initialPhaseFraction: 1,
        phaseChangeTemperature: 0,
      },
      4,
    );

    expect(lowC.totalAddedEnergy).toBeCloseTo(highC.totalAddedEnergy, 6);
    expect(lowC.temperatureChange).toBeCloseTo(38.1, 1);
    expect(highC.temperatureChange).toBeCloseTo(8.57, 2);
    expect(lowC.temperatureChange).toBeGreaterThan(highC.temperatureChange * 4);
  });

  it("holds temperature on the shelf while latent energy and phase fraction still change", () => {
    const shelf = sampleSpecificHeatPhaseChangeState(
      {
        mass: 1.4,
        specificHeat: 2.1,
        heaterPower: 18,
        startingTemperature: -15,
        latentHeat: 260,
        initialPhaseFraction: 0,
        phaseChangeTemperature: 0,
      },
      6,
    );

    expect(shelf.temperature).toBeCloseTo(0, 6);
    expect(shelf.phaseFraction).toBeGreaterThan(0.17);
    expect(shelf.phaseFraction).toBeLessThan(0.18);
    expect(shelf.temperatureRate).toBe(0);
    expect(shelf.latentEnergyChange).toBeGreaterThan(60);
    expect(shelf.sensibleEnergyChange).toBeCloseTo(44.1, 1);
  });

  it("builds the expected heating, bookkeeping, and response graph groups", () => {
    const series = buildSpecificHeatPhaseChangeSeries({
      mass: 1.4,
      specificHeat: 2.1,
      heaterPower: 18,
      startingTemperature: -15,
      latentHeat: 260,
      initialPhaseFraction: 0,
      phaseChangeTemperature: 0,
    });

    expect(series["heating-curve"]).toHaveLength(2);
    expect(series["energy-allocation"]).toHaveLength(3);
    expect(series["specific-heat-response"]).toHaveLength(1);
    expect(series["latent-response"]).toHaveLength(1);
    expect(series["heating-curve"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes specific heat and shelf behavior honestly", () => {
    const description = describeSpecificHeatPhaseChangeState(
      {
        mass: 1.4,
        specificHeat: 2.1,
        heaterPower: 18,
        startingTemperature: 0,
        latentHeat: 260,
        initialPhaseFraction: 0.35,
        phaseChangeTemperature: 0,
      },
      2,
    );

    expect(description).toContain("specific heat");
    expect(description).toContain("phase fraction");
    expect(description).toMatch(/phase-change shelf|changing phase fraction/i);
  });
});
