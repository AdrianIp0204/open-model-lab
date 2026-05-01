import { describe, expect, it } from "vitest";
import {
  buildCapacitanceElectricEnergySeries,
  describeCapacitanceElectricEnergyState,
  sampleCapacitanceElectricEnergyState,
} from "@/lib/physics";

describe("capacitance-electric-energy helpers", () => {
  it("raises capacitance, stored charge, and stored energy when plate area increases at fixed gap and voltage", () => {
    const compact = sampleCapacitanceElectricEnergyState({
      plateArea: 2,
      plateSeparation: 2,
      batteryVoltage: 4,
    });
    const wider = sampleCapacitanceElectricEnergyState({
      plateArea: 4,
      plateSeparation: 2,
      batteryVoltage: 4,
    });

    expect(wider.capacitance).toBeCloseTo(compact.capacitance * 2, 6);
    expect(wider.chargeMagnitude).toBeCloseTo(compact.chargeMagnitude * 2, 6);
    expect(wider.storedEnergy).toBeCloseTo(compact.storedEnergy * 2, 6);
  });

  it("doubles stored charge but quadruples stored energy when the same capacitor doubles its voltage", () => {
    const low = sampleCapacitanceElectricEnergyState({
      plateArea: 2.4,
      plateSeparation: 1.2,
      batteryVoltage: 3,
    });
    const high = sampleCapacitanceElectricEnergyState({
      plateArea: 2.4,
      plateSeparation: 1.2,
      batteryVoltage: 6,
    });

    expect(high.chargeMagnitude).toBeCloseTo(low.chargeMagnitude * 2, 6);
    expect(high.storedEnergy).toBeCloseTo(low.storedEnergy * 4, 6);
  });

  it("builds the expected voltage-response series group", () => {
    const series = buildCapacitanceElectricEnergySeries({
      plateArea: 2.4,
      plateSeparation: 1.4,
      batteryVoltage: 6,
    });

    expect(series["voltage-response"]).toHaveLength(2);
    expect(series["voltage-response"]?.[0]?.points.length).toBeGreaterThan(50);
  });

  it("describes the capacitor storage story honestly", () => {
    const description = describeCapacitanceElectricEnergyState({
      plateArea: 2.4,
      plateSeparation: 1.4,
      batteryVoltage: 9,
    });

    expect(description).toContain("capacitance");
    expect(description).toContain("stored charge");
    expect(description).toContain("stores electric energy");
  });
});
