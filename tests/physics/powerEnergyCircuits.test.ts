import { describe, expect, it } from "vitest";
import {
  buildPowerEnergyCircuitsSeries,
  describePowerEnergyCircuitsState,
  samplePowerEnergyCircuitsState,
} from "@/lib/physics";

describe("power-energy-circuits helpers", () => {
  it("keeps current, power, and energy consistent for one fixed source-load setup", () => {
    const snapshot = samplePowerEnergyCircuitsState(
      {
        voltage: 12,
        loadResistance: 8,
      },
      3,
    );

    expect(snapshot.current).toBeCloseTo(1.5, 6);
    expect(snapshot.power).toBeCloseTo(18, 6);
    expect(snapshot.energy).toBeCloseTo(54, 6);
  });

  it("lowers current and power when the same source sees a larger load resistance", () => {
    const lowResistance = samplePowerEnergyCircuitsState(
      {
        voltage: 12,
        loadResistance: 4,
      },
      2,
    );
    const highResistance = samplePowerEnergyCircuitsState(
      {
        voltage: 12,
        loadResistance: 16,
      },
      2,
    );

    expect(lowResistance.current).toBeGreaterThan(highResistance.current);
    expect(lowResistance.power).toBeGreaterThan(highResistance.power);
    expect(lowResistance.energy).toBeGreaterThan(highResistance.energy);
  });

  it("builds the expected time and response graph groups", () => {
    const series = buildPowerEnergyCircuitsSeries({
      voltage: 12,
      loadResistance: 8,
    });

    expect(series["energy-transfer"]).toHaveLength(1);
    expect(series["current-voltage"]).toHaveLength(1);
    expect(series["power-voltage"]).toHaveLength(1);
    expect(series["power-resistance"]).toHaveLength(1);
    expect(series["energy-transfer"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the current rate and accumulated energy honestly", () => {
    const description = describePowerEnergyCircuitsState(
      {
        voltage: 12,
        loadResistance: 8,
      },
      3,
    );

    expect(description).toContain("current is");
    expect(description).toContain("load power");
    expect(description).toContain("delivered energy");
  });
});
