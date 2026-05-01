import { describe, expect, it } from "vitest";
import type { CircuitComponentInstance, CircuitDocument, CircuitWire } from "@/lib/circuit-builder";
import {
  buildCircuitSvgExport,
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

describe("circuit svg export", () => {
  it("builds a deterministic schematic svg with symbols, wires, labels, and junction dots", () => {
    const document = createDocument(
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
          rotation: 90,
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
        {
          id: "voltmeter-1",
          label: "Voltmeter 1",
          type: "voltmeter",
          x: 820,
          y: 384,
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
        {
          id: "w5",
          from: { componentId: "voltmeter-1", terminal: "a" },
          to: { componentId: "resistor-2", terminal: "a" },
        },
        {
          id: "w6",
          from: { componentId: "voltmeter-1", terminal: "b" },
          to: { componentId: "resistor-2", terminal: "b" },
        },
      ],
    );
    const solveResult = solveCircuitDocument(document);

    const first = buildCircuitSvgExport(document, solveResult);
    const second = buildCircuitSvgExport(document, solveResult);

    expect(first.svg.startsWith("<svg")).toBe(true);
    expect(first.svg).toContain('class="circuit-wire"');
    expect(first.svg).toContain('data-component-id="resistor-1"');
    expect(first.svg).toContain("translate(520 192) rotate(90)");
    expect(first.svg).toContain(">Resistor 1<");
    expect(first.svg).toContain(">6 ohm<");
    expect(first.svg).toContain(">12 V<");
    expect((first.svg.match(/class="circuit-junction-dot"/g) ?? []).length).toBeGreaterThan(0);
    expect(first.svg).toBe(second.svg);
    expect(first.filename).toBe("open-model-lab-circuit-diagram-4-parts.svg");
  });

  it("uses updated component positions in the exported layout", () => {
    const document = createDocument(
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
          x: 940,
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
    );

    const exportPayload = buildCircuitSvgExport(document, solveCircuitDocument(document));

    expect(exportPayload.svg).toContain("translate(940 224) rotate(0)");
  });

  it("keeps ambient-linked thermistor and LDR labels coherent in the exported svg", () => {
    const document = createDocument(
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
        {
          id: "ldr-1",
          label: "Light-dependent resistor 1",
          type: "ldr",
          x: 820,
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
      { temperatureC: 60, lightLevelPercent: 80 },
    );

    const exportPayload = buildCircuitSvgExport(document, solveCircuitDocument(document));

    expect(exportPayload.svg.startsWith("<svg")).toBe(true);
    expect(exportPayload.svg).toContain("@ 60 C");
    expect(exportPayload.svg).toContain("@ 80% light");
    expect(exportPayload.svg).toContain("Thermistor 1");
    expect(exportPayload.svg).toContain("Light-dependent resistor 1");
  });
});
