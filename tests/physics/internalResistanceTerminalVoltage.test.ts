import { describe, expect, it } from "vitest";
import {
  buildInternalResistanceTerminalVoltageSeries,
  describeInternalResistanceTerminalVoltageState,
  sampleInternalResistanceTerminalVoltageState,
} from "@/lib/physics";

describe("internal-resistance-terminal-voltage helpers", () => {
  it("reduces terminal voltage below emf under load", () => {
    const snapshot = sampleInternalResistanceTerminalVoltageState({
      emf: 12,
      internalResistance: 2,
      loadResistance: 2,
    });

    expect(snapshot.current).toBeCloseTo(3, 6);
    expect(snapshot.internalDrop).toBeCloseTo(6, 6);
    expect(snapshot.terminalVoltage).toBeCloseTo(6, 6);
  });

  it("approaches the ideal-source limit when internal resistance is very small", () => {
    const snapshot = sampleInternalResistanceTerminalVoltageState({
      emf: 12,
      internalResistance: 0.2,
      loadResistance: 6,
    });

    expect(snapshot.terminalVoltage).toBeGreaterThan(11.5);
    expect(snapshot.internalPower).toBeLessThan(1);
  });

  it("builds the expected response graph groups", () => {
    const series = buildInternalResistanceTerminalVoltageSeries({
      emf: 12,
      internalResistance: 1,
      loadResistance: 6,
    });

    expect(series["terminal-response"]).toHaveLength(2);
    expect(series["power-split"]).toHaveLength(2);
    expect(series["terminal-response"]?.[0]?.points.length).toBeGreaterThan(100);
  });

  it("describes emf, terminal voltage, and internal loss honestly", () => {
    const description = describeInternalResistanceTerminalVoltageState({
      emf: 12,
      internalResistance: 2,
      loadResistance: 2,
    });

    expect(description).toContain("terminal voltage");
    expect(description).toContain("internal drop");
    expect(description).toContain("power");
  });
});
