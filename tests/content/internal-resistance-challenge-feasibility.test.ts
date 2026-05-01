import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { sampleInternalResistanceTerminalVoltageState } from "@/lib/physics";

const concept = getConceptBySlug("internal-resistance-and-terminal-voltage");

function getPreset(id: string) {
  const preset = concept.simulation.presets.find((candidate) => candidate.id === id);
  expect(preset, `missing preset ${id}`).toBeDefined();
  return preset!;
}

describe("internal resistance challenge authoring", () => {
  it("keeps terminal-drop targets reachable from the stated lossy-source setup", () => {
    const setup = getPreset("lossy-source");
    const snapshot = sampleInternalResistanceTerminalVoltageState(setup.values, {
      loadResistance: 3,
    });

    expect(snapshot.current).toBeGreaterThanOrEqual(1.9);
    expect(snapshot.current).toBeLessThanOrEqual(2.1);
    expect(snapshot.terminalVoltage).toBeGreaterThanOrEqual(5.9);
    expect(snapshot.terminalVoltage).toBeLessThanOrEqual(6.1);
  });

  it("keeps near-ideal targets reachable when only internal resistance changes", () => {
    const setup = getPreset("lossy-source");
    const snapshot = sampleInternalResistanceTerminalVoltageState(setup.values, {
      internalResistance: 0.2,
    });

    expect(snapshot.internalPower).toBeLessThanOrEqual(1);
    expect(snapshot.terminalVoltage).toBeGreaterThanOrEqual(10);
  });
});
