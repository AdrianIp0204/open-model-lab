import { describe, expect, it } from "vitest";
import {
  buildRcChargingDischargingSeries,
  describeRcChargingDischargingState,
  sampleRcChargingDischargingState,
} from "@/lib/physics";

describe("rc-charging-discharging helpers", () => {
  it("hits the expected 1tau charging checkpoint", () => {
    const snapshot = sampleRcChargingDischargingState(
      {
        sourceVoltage: 8,
        resistance: 2,
        capacitance: 1,
        charging: true,
      },
      2,
    );

    expect(snapshot.timeConstant).toBeCloseTo(2, 6);
    expect(snapshot.chargeFraction).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(snapshot.currentFraction).toBeCloseTo(Math.exp(-1), 6);
    expect(snapshot.capacitorVoltage).toBeCloseTo(8 * (1 - Math.exp(-1)), 6);
  });

  it("reverses current and decays the capacitor voltage during discharge", () => {
    const snapshot = sampleRcChargingDischargingState(
      {
        sourceVoltage: 8,
        resistance: 2,
        capacitance: 1,
        charging: false,
      },
      2,
    );

    expect(snapshot.current).toBeLessThan(0);
    expect(snapshot.capacitorVoltage).toBeCloseTo(8 * Math.exp(-1), 6);
    expect(snapshot.energyFraction).toBeCloseTo(Math.exp(-2), 6);
  });

  it("builds the expected time-based graph groups", () => {
    const series = buildRcChargingDischargingSeries({
      sourceVoltage: 8,
      resistance: 2,
      capacitance: 1,
      charging: true,
    });

    expect(series["voltage-time"]).toHaveLength(2);
    expect(series["normalized-response"]).toHaveLength(3);
    expect(series["voltage-time"]?.[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes the mode and time constant honestly", () => {
    const description = describeRcChargingDischargingState(
      {
        sourceVoltage: 8,
        resistance: 2,
        capacitance: 1,
        charging: false,
      },
      2,
    );

    expect(description).toContain("time constant");
    expect(description).toContain("discharging");
    expect(description).toContain("stored energy");
  });
});
