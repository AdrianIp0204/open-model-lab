import { describe, expect, it } from "vitest";
import type { CircuitComponentInstance, CircuitDocument, CircuitWire } from "@/lib/circuit-builder";
import {
  createDefaultCircuitEnvironment,
  solveCircuitDocument,
} from "@/lib/circuit-builder";

const baseView = { zoom: 0.78, offsetX: 120, offsetY: 82 } as const;

function createDocument(
  components: CircuitComponentInstance[],
  wires: CircuitWire[],
  environmentOverrides: Partial<CircuitDocument["environment"]> = {},
): CircuitDocument {
  return {
    version: 1,
    view: baseView,
    environment: {
      ...createDefaultCircuitEnvironment(),
      ...environmentOverrides,
    },
    components,
    wires,
  };
}

describe("circuit builder solver", () => {
  it("solves 9V across 3 ohm as 3A", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 240,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: { resistance: 3 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.componentResults["resistor-1"]?.currentMagnitude).toBeCloseTo(3, 6);
    expect(result.componentResults["resistor-1"]?.voltageMagnitude).toBeCloseTo(9, 6);
    expect(result.issues).toHaveLength(0);
  });

  it("splits current correctly in 12V parallel 6 ohm and 3 ohm branches", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 12 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 520,
            y: 192,
            rotation: 0,
            properties: { resistance: 6 },
          },
          {
            id: "resistor-2",
            label: "Resistor 2",
            type: "resistor",
            x: 520,
            y: 384,
            rotation: 0,
            properties: { resistance: 3 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-2", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
          {
            id: "w4",
            from: { componentId: "resistor-2", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.componentResults["resistor-1"]?.currentMagnitude).toBeCloseTo(2, 6);
    expect(result.componentResults["resistor-2"]?.currentMagnitude).toBeCloseTo(4, 6);
    expect(result.componentResults["battery-1"]?.currentMagnitude).toBeCloseTo(6, 6);
  });

  it("solves 10V across 2 ohm and 3 ohm series as 2A with 4V and 6V drops", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 10 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: { resistance: 2 },
          },
          {
            id: "resistor-2",
            label: "Resistor 2",
            type: "resistor",
            x: 820,
            y: 224,
            rotation: 0,
            properties: { resistance: 3 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "resistor-2", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-2", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.componentResults["resistor-1"]?.currentMagnitude).toBeCloseTo(2, 6);
    expect(result.componentResults["resistor-2"]?.currentMagnitude).toBeCloseTo(2, 6);
    expect(result.componentResults["resistor-1"]?.voltageMagnitude).toBeCloseTo(4, 6);
    expect(result.componentResults["resistor-2"]?.voltageMagnitude).toBeCloseTo(6, 6);
  });

  it("forces zero current through an open-switch branch", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 12 },
          },
          {
            id: "switch-1",
            label: "Switch 1",
            type: "switch",
            x: 420,
            y: 192,
            rotation: 0,
            properties: { closed: false },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 700,
            y: 192,
            rotation: 0,
            properties: { resistance: 3 },
          },
          {
            id: "resistor-2",
            label: "Resistor 2",
            type: "resistor",
            x: 700,
            y: 384,
            rotation: 0,
            properties: { resistance: 6 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "switch-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "switch-1", terminal: "b" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
          {
            id: "w4",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-2", terminal: "a" },
          },
          {
            id: "w5",
            from: { componentId: "resistor-2", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.componentResults["switch-1"]?.currentMagnitude).toBeCloseTo(0, 8);
    expect(result.componentResults["resistor-1"]?.currentMagnitude).toBeCloseTo(0, 8);
    expect(result.componentResults["resistor-2"]?.currentMagnitude).toBeCloseTo(2, 6);
  });

  it("reports an ammeter in series with minimal distortion", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "ammeter-1",
            label: "Ammeter 1",
            type: "ammeter",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {},
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 820,
            y: 224,
            rotation: 0,
            properties: { resistance: 3 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "ammeter-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "ammeter-1", terminal: "b" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.componentResults["ammeter-1"]?.currentMagnitude).toBeCloseTo(3, 2);
    expect(result.componentResults["ammeter-1"]?.voltageMagnitude ?? 0).toBeLessThan(0.01);
  });

  it("reports a voltmeter across a 3 ohm resistor in a 2+3 ohm series loop as 6V", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 10 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: { resistance: 2 },
          },
          {
            id: "resistor-2",
            label: "Resistor 2",
            type: "resistor",
            x: 820,
            y: 224,
            rotation: 0,
            properties: { resistance: 3 },
          },
          {
            id: "voltmeter-1",
            label: "Voltmeter 1",
            type: "voltmeter",
            x: 1080,
            y: 224,
            rotation: 90,
            properties: {},
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "resistor-2", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-2", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
          {
            id: "w4",
            from: { componentId: "voltmeter-1", terminal: "a" },
            to: { componentId: "resistor-2", terminal: "a" },
          },
          {
            id: "w5",
            from: { componentId: "voltmeter-1", terminal: "b" },
            to: { componentId: "resistor-2", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.componentResults["voltmeter-1"]?.voltageMagnitude).toBeCloseTo(6, 5);
    expect(result.componentResults["voltmeter-1"]?.currentMagnitude ?? 0).toBeLessThan(0.000001);
  });

  it("blocks reverse-biased diode conduction and allows forward-biased conduction", () => {
    const reverseBiased = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "diode-1",
            label: "Diode 1",
            type: "diode",
            x: 520,
            y: 224,
            rotation: 180,
            properties: { forwardDrop: 0.7 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 820,
            y: 224,
            rotation: 0,
            properties: { resistance: 3 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "diode-1", terminal: "b" },
          },
          {
            id: "w2",
            from: { componentId: "diode-1", terminal: "a" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    const forwardBiased = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "diode-1",
            label: "Diode 1",
            type: "diode",
            x: 520,
            y: 224,
            rotation: 0,
            properties: { forwardDrop: 0.7 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 820,
            y: 224,
            rotation: 0,
            properties: { resistance: 3 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "diode-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "diode-1", terminal: "b" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(reverseBiased.componentResults["diode-1"]?.stateLabel).toBe("blocking");
    expect(reverseBiased.componentResults["diode-1"]?.currentMagnitude).toBeCloseTo(0, 8);
    expect(forwardBiased.componentResults["diode-1"]?.stateLabel).toBe("forward-biased");
    expect(forwardBiased.componentResults["diode-1"]?.currentMagnitude ?? 0).toBeGreaterThan(2.5);
  });

  it("trips a fuse when steady-state current exceeds its rating", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 12 },
          },
          {
            id: "fuse-1",
            label: "Fuse 1",
            type: "fuse",
            x: 520,
            y: 224,
            rotation: 0,
            properties: { rating: 1, blown: false },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "fuse-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "fuse-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.autoBlownFuseIds).toContain("fuse-1");
  });

  it("uses ambient temperature to lower thermistor resistance and raise branch current", () => {
    const cold = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "thermistor-1",
            label: "Thermistor 1",
            type: "thermistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 220,
              manualResistance: 220,
              useAmbientTemperature: true,
            },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "thermistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "thermistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
        { temperatureC: 0 },
      ),
    );
    const hot = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "thermistor-1",
            label: "Thermistor 1",
            type: "thermistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 220,
              manualResistance: 220,
              useAmbientTemperature: true,
            },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "thermistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "thermistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
        { temperatureC: 100 },
      ),
    );

    expect(cold.componentResults["thermistor-1"]?.resistance).toBeCloseTo(527.75, 2);
    expect(hot.componentResults["thermistor-1"]?.resistance).toBeCloseTo(15.94, 2);
    expect(cold.componentResults["thermistor-1"]?.currentMagnitude ?? 0).toBeLessThan(
      hot.componentResults["thermistor-1"]?.currentMagnitude ?? 0,
    );
  });

  it("uses ambient light to lower LDR resistance and raise branch current", () => {
    const dark = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "ldr-1",
            label: "Light-dependent resistor 1",
            type: "ldr",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 900,
              manualResistance: 420,
              useAmbientLight: true,
            },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "ldr-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "ldr-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
        { lightLevelPercent: 0 },
      ),
    );
    const bright = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "ldr-1",
            label: "Light-dependent resistor 1",
            type: "ldr",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 900,
              manualResistance: 420,
              useAmbientLight: true,
            },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "ldr-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "ldr-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
        { lightLevelPercent: 100 },
      ),
    );

    expect(dark.componentResults["ldr-1"]?.resistance).toBeCloseTo(900, 6);
    expect(bright.componentResults["ldr-1"]?.resistance).toBeCloseTo(110.21, 2);
    expect(dark.componentResults["ldr-1"]?.currentMagnitude ?? 0).toBeLessThan(
      bright.componentResults["ldr-1"]?.currentMagnitude ?? 0,
    );
  });

  it("keeps manual thermistor and LDR resistances stable when ambient controls change", () => {
    const cool = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "thermistor-1",
            label: "Thermistor 1",
            type: "thermistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 220,
              manualResistance: 330,
              useAmbientTemperature: false,
            },
          },
          {
            id: "ldr-1",
            label: "Light-dependent resistor 1",
            type: "ldr",
            x: 820,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 900,
              manualResistance: 480,
              useAmbientLight: false,
            },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "thermistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "thermistor-1", terminal: "b" },
            to: { componentId: "ldr-1", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "ldr-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
        { temperatureC: 0, lightLevelPercent: 0 },
      ),
    );
    const hotBright = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "thermistor-1",
            label: "Thermistor 1",
            type: "thermistor",
            x: 520,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 220,
              manualResistance: 330,
              useAmbientTemperature: false,
            },
          },
          {
            id: "ldr-1",
            label: "Light-dependent resistor 1",
            type: "ldr",
            x: 820,
            y: 224,
            rotation: 0,
            properties: {
              baseResistance: 900,
              manualResistance: 480,
              useAmbientLight: false,
            },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "thermistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "thermistor-1", terminal: "b" },
            to: { componentId: "ldr-1", terminal: "a" },
          },
          {
            id: "w3",
            from: { componentId: "ldr-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
        { temperatureC: 100, lightLevelPercent: 100 },
      ),
    );

    expect(cool.componentResults["thermistor-1"]?.resistance).toBeCloseTo(330, 6);
    expect(hotBright.componentResults["thermistor-1"]?.resistance).toBeCloseTo(330, 6);
    expect(cool.componentResults["ldr-1"]?.resistance).toBeCloseTo(480, 6);
    expect(hotBright.componentResults["ldr-1"]?.resistance).toBeCloseTo(480, 6);
    expect(cool.componentResults["ldr-1"]?.currentMagnitude).toBeCloseTo(
      hotBright.componentResults["ldr-1"]?.currentMagnitude ?? 0,
      8,
    );
  });

  it("treats a capacitor branch as open in DC steady state", () => {
    const result = solveCircuitDocument(
      createDocument(
        [
          {
            id: "battery-1",
            label: "Battery 1",
            type: "battery",
            x: 220,
            y: 320,
            rotation: 90,
            properties: { voltage: 9 },
          },
          {
            id: "resistor-1",
            label: "Resistor 1",
            type: "resistor",
            x: 520,
            y: 192,
            rotation: 0,
            properties: { resistance: 3 },
          },
          {
            id: "capacitor-1",
            label: "Capacitor 1",
            type: "capacitor",
            x: 520,
            y: 384,
            rotation: 90,
            properties: { capacitance: 0.47 },
          },
        ],
        [
          {
            id: "w1",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "resistor-1", terminal: "a" },
          },
          {
            id: "w2",
            from: { componentId: "resistor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
          {
            id: "w3",
            from: { componentId: "battery-1", terminal: "a" },
            to: { componentId: "capacitor-1", terminal: "a" },
          },
          {
            id: "w4",
            from: { componentId: "capacitor-1", terminal: "b" },
            to: { componentId: "battery-1", terminal: "b" },
          },
        ],
      ),
    );

    expect(result.componentResults["capacitor-1"]?.currentMagnitude).toBeCloseTo(0, 8);
    expect(result.componentResults["capacitor-1"]?.stateLabel).toBe("steady-state open");
    expect(result.componentResults["resistor-1"]?.currentMagnitude).toBeCloseTo(3, 6);
  });
});
