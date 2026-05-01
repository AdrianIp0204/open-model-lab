import { describe, expect, it } from "vitest";
import {
  buildCircuitJsonExport,
  createDefaultCircuitEnvironment,
  normalizeCircuitDocument,
  parseCircuitDocumentJson,
  serializeCircuitDocument,
  type CircuitDocument,
} from "@/lib/circuit-builder";

describe("circuit builder model serialization", () => {
  it("preserves ambient environment state and component mode settings in JSON export", () => {
    const document: CircuitDocument = {
      version: 1,
      view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
      environment: {
        ...createDefaultCircuitEnvironment(),
        temperatureC: 60,
        lightLevelPercent: 80,
      },
      components: [
        {
          id: "thermistor-1",
          label: "Thermistor 1",
          type: "thermistor",
          x: 480,
          y: 224,
          rotation: 0,
          properties: {
            baseResistance: 220,
            manualResistance: 330,
            useAmbientTemperature: true,
          },
        },
        {
          id: "ldr-1",
          label: "Light-dependent resistor 1",
          type: "ldr",
          x: 760,
          y: 224,
          rotation: 0,
          properties: {
            baseResistance: 900,
            manualResistance: 480,
            useAmbientLight: false,
          },
        },
      ],
      wires: [],
    };

    const parsed = JSON.parse(serializeCircuitDocument(document)) as CircuitDocument;

    expect(parsed.environment.temperatureC).toBe(60);
    expect(parsed.environment.lightLevelPercent).toBe(80);
    expect(parsed.components[0]?.properties.useAmbientTemperature).toBe(true);
    expect(parsed.components[0]?.properties.manualResistance).toBe(330);
    expect(parsed.components[1]?.properties.useAmbientLight).toBe(false);
    expect(parsed.components[1]?.properties.manualResistance).toBe(480);
  });

  it("round-trips component geometry, rotation, and wires through JSON serialization", () => {
    const document: CircuitDocument = {
      version: 1,
      view: { zoom: 0.92, offsetX: 88, offsetY: 64 },
      environment: {
        ...createDefaultCircuitEnvironment(),
        temperatureC: 55,
        lightLevelPercent: 70,
      },
      components: [
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
          id: "ldr-1",
          label: "Light-dependent resistor 1",
          type: "ldr",
          x: 620,
          y: 224,
          rotation: 270,
          properties: {
            baseResistance: 900,
            manualResistance: 420,
            useAmbientLight: true,
          },
        },
      ],
      wires: [
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
    };

    const parsed = parseCircuitDocumentJson(serializeCircuitDocument(document));

    expect(parsed.view.zoom).toBeCloseTo(0.92, 6);
    expect(parsed.components[1]?.x).toBe(620);
    expect(parsed.components[1]?.y).toBe(224);
    expect(parsed.components[1]?.rotation).toBe(270);
    expect(parsed.wires).toHaveLength(2);
    expect(parsed.wires[0]?.from.componentId).toBe("battery-1");
    expect(parsed.wires[1]?.to.componentId).toBe("battery-1");
  });

  it("normalizes older documents that are missing environment and newer mode flags", () => {
    const normalized = normalizeCircuitDocument({
      components: [
        {
          id: "thermistor-1",
          type: "thermistor",
          x: 480,
          y: 224,
          properties: {
            baseResistance: 220,
          },
        },
        {
          id: "ldr-1",
          type: "ldr",
          x: 760,
          y: 224,
          properties: {
            baseResistance: 900,
          },
        },
      ],
      wires: [],
    });

    expect(normalized.version).toBe(1);
    expect(normalized.environment.temperatureC).toBe(25);
    expect(normalized.environment.lightLevelPercent).toBe(35);
    expect(normalized.components[0]?.properties.useAmbientTemperature).toBe(true);
    expect(normalized.components[0]?.properties.manualResistance).toBe(220);
    expect(normalized.components[1]?.properties.useAmbientLight).toBe(true);
    expect(normalized.components[1]?.properties.manualResistance).toBe(420);
  });

  it("exports a stable json filename and rejects invalid json text", () => {
    const document: CircuitDocument = {
      version: 1,
      view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
      environment: createDefaultCircuitEnvironment(),
      components: [],
      wires: [],
    };

    expect(buildCircuitJsonExport(document).filename).toBe(
      "open-model-lab-circuit-state-empty.json",
    );
    expect(() => parseCircuitDocumentJson("{not valid json")).toThrow(
      "The selected file is not valid JSON.",
    );
  });
});
