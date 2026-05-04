import { describe, expect, it } from "vitest";
import {
  buildWirePathFromRefs,
  buildWirePreviewPoints,
  buildCircuitJsonExport,
  createDefaultCircuitEnvironment,
  getComponentBoundingBox,
  getComponentTerminalDirection,
  getComponentTerminalPoint,
  normalizeCircuitDocument,
  parseCircuitDocumentJson,
  serializeCircuitDocument,
  type CircuitComponentInstance,
  type CircuitDocument,
  type CircuitPoint,
  type CircuitWire,
} from "@/lib/circuit-builder";

const baseView = { zoom: 0.78, offsetX: 120, offsetY: 82 } as const;

function createDocument(
  components: CircuitComponentInstance[],
  wires: CircuitWire[],
): CircuitDocument {
  return {
    version: 1,
    view: baseView,
    environment: createDefaultCircuitEnvironment(),
    components,
    wires,
  };
}

function expectOrthogonalCleanPath(points: CircuitPoint[]) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    expect(current.x === next.x || current.y === next.y).toBe(true);
    expect(current).not.toEqual(next);
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    if (index === 1 || index === points.length - 2) {
      continue;
    }
    const previous = points[index - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    expect(
      (previous.x === current.x && current.x === next.x) ||
        (previous.y === current.y && current.y === next.y),
    ).toBe(false);
  }
}

function segmentIntersectsBox(start: CircuitPoint, end: CircuitPoint, box: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}) {
  if (start.x === end.x) {
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return start.x >= box.left && start.x <= box.right && maxY >= box.top && minY <= box.bottom;
  }
  if (start.y === end.y) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return start.y >= box.top && start.y <= box.bottom && maxX >= box.left && minX <= box.right;
  }
  return false;
}

function inflateBox(box: ReturnType<typeof getComponentBoundingBox>, padding: number) {
  return {
    left: box.left - padding,
    right: box.right + padding,
    top: box.top - padding,
    bottom: box.bottom + padding,
  };
}

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

describe("circuit builder wire routing", () => {
  const battery: CircuitComponentInstance = {
    id: "battery-1",
    label: "Battery 1",
    type: "battery",
    x: 240,
    y: 320,
    rotation: 0,
    properties: { voltage: 9 },
  };
  const resistor: CircuitComponentInstance = {
    id: "resistor-1",
    label: "Resistor 1",
    type: "resistor",
    x: 560,
    y: 320,
    rotation: 0,
    properties: { resistance: 12 },
  };

  it("routes horizontal components facing each other as a short clean path", () => {
    const document = createDocument(
      [battery, resistor],
      [
        {
          id: "wire-1",
          from: { componentId: "battery-1", terminal: "b" },
          to: { componentId: "resistor-1", terminal: "a" },
        },
      ],
    );
    const routed = buildWirePathFromRefs(document, document.wires[0]!);

    expect(routed).not.toBeNull();
    expect(routed!.points).toHaveLength(4);
    expect(new Set(routed!.points.map((point) => point.y))).toEqual(new Set([320]));
    expectOrthogonalCleanPath(routed!.points);
  });

  it("uses the same routed points for persisted and terminal-preview wires", () => {
    const document = createDocument(
      [battery, resistor],
      [
        {
          id: "wire-1",
          from: { componentId: "battery-1", terminal: "b" },
          to: { componentId: "resistor-1", terminal: "a" },
        },
      ],
    );
    const persisted = buildWirePathFromRefs(document, document.wires[0]!);
    const preview = buildWirePreviewPoints(
      getComponentTerminalPoint(battery, "b"),
      getComponentTerminalDirection(battery, "b"),
      getComponentTerminalPoint(resistor, "a"),
      getComponentTerminalDirection(resistor, "a"),
      {
        components: document.components,
        ignoredComponentIds: ["battery-1", "resistor-1"],
      },
    );

    expect(persisted?.points).toEqual(preview);
  });

  it("routes around component bounding boxes when a direct midpoint path is blocked", () => {
    const farResistor: CircuitComponentInstance = {
      ...resistor,
      x: 760,
    };
    const obstacle: CircuitComponentInstance = {
      id: "switch-1",
      label: "Switch 1",
      type: "switch",
      x: 440,
      y: 320,
      rotation: 0,
      properties: { closed: true },
    };
    const document = createDocument(
      [battery, obstacle, farResistor],
      [
        {
          id: "wire-1",
          from: { componentId: "battery-1", terminal: "b" },
          to: { componentId: "resistor-1", terminal: "a" },
        },
      ],
    );
    const routed = buildWirePathFromRefs(document, document.wires[0]!);
    const inflatedObstacle = inflateBox(getComponentBoundingBox(obstacle), 20);

    expect(routed).not.toBeNull();
    expectOrthogonalCleanPath(routed!.points);
    for (let index = 0; index < routed!.points.length - 1; index += 1) {
      expect(
        segmentIntersectsBox(
          routed!.points[index]!,
          routed!.points[index + 1]!,
          inflatedObstacle,
        ),
      ).toBe(false);
    }
  });

  it("keeps moved lower components on a clean dogleg without duplicate points", () => {
    const lowerBulb: CircuitComponentInstance = {
      id: "bulb-1",
      label: "Light bulb 1",
      type: "lightBulb",
      x: 560,
      y: 512,
      rotation: 0,
      properties: { resistance: 24 },
    };
    const document = createDocument(
      [battery, lowerBulb],
      [
        {
          id: "wire-1",
          from: { componentId: "battery-1", terminal: "b" },
          to: { componentId: "bulb-1", terminal: "a" },
        },
      ],
    );
    const routed = buildWirePathFromRefs(document, document.wires[0]!);

    expect(routed).not.toBeNull();
    expect(routed!.points.length).toBeLessThanOrEqual(5);
    expect(routed!.points.some((point) => point.y === 512)).toBe(true);
    expectOrthogonalCleanPath(routed!.points);
  });
});
