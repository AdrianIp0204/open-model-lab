import { clamp } from "@/lib/physics/math";
import { z } from "zod";
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  CIRCUIT_GRID_SIZE,
  type CircuitComponentInstance,
  type CircuitEnvironmentState,
  type CircuitComponentProperties,
  type CircuitComponentType,
  type CircuitDocument,
  type CircuitPoint,
  type CircuitRotation,
  type CircuitTerminalKey,
  type CircuitTerminalRef,
  type CircuitViewState,
} from "./types";
import { getCircuitComponentDefinition } from "./registry";

const COMPONENT_HALF_SPAN = 64;
const WIRE_STUB = 22;
const WIRE_ROUTE_COMPONENT_INFLATE = 20;
const WIRE_ROUTE_LANE_OFFSET = CIRCUIT_GRID_SIZE;
const NEAR_ZERO_RESISTANCE = 0.0001;
const VERY_HIGH_RESISTANCE = 100_000_000;
export const CIRCUIT_DOCUMENT_VERSION = 1 as const;
const DEFAULT_CIRCUIT_ENVIRONMENT: CircuitEnvironmentState = {
  temperatureC: 25,
  lightLevelPercent: 35,
};
const circuitComponentTypeValues = [
  "ammeter",
  "battery",
  "capacitor",
  "diode",
  "fuse",
  "ldr",
  "lightBulb",
  "resistor",
  "switch",
  "thermistor",
  "voltmeter",
] as const satisfies readonly CircuitComponentType[];
const circuitTerminalSchema = z.union([z.literal("a"), z.literal("b")]);
const circuitRotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);
const circuitScalarSchema = z.union([z.boolean(), z.number().finite(), z.string()]);
const rawCircuitDocumentSchema = z.object({
  version: z.number().int().optional(),
  components: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().optional(),
      type: z.enum(circuitComponentTypeValues),
      x: z.number().finite(),
      y: z.number().finite(),
      rotation: circuitRotationSchema.optional(),
      properties: z.record(z.string(), circuitScalarSchema).optional(),
    }),
  ),
  wires: z
    .array(
      z.object({
        id: z.string().min(1),
        from: z.object({
          componentId: z.string().min(1),
          terminal: circuitTerminalSchema,
        }),
        to: z.object({
          componentId: z.string().min(1),
          terminal: circuitTerminalSchema,
        }),
      }),
    )
    .optional(),
  view: z
    .object({
      zoom: z.number().finite().optional(),
      offsetX: z.number().finite().optional(),
      offsetY: z.number().finite().optional(),
    })
    .optional(),
  environment: z
    .object({
      temperatureC: z.number().finite().optional(),
      lightLevelPercent: z.number().finite().optional(),
    })
    .optional(),
});

export function createDefaultCircuitView(): CircuitViewState {
  return {
    zoom: 0.78,
    offsetX: 120,
    offsetY: 82,
  };
}

export function createDefaultCircuitEnvironment(): CircuitEnvironmentState {
  return {
    ...DEFAULT_CIRCUIT_ENVIRONMENT,
  };
}

export function createEmptyCircuitDocument(): CircuitDocument {
  return {
    version: CIRCUIT_DOCUMENT_VERSION,
    components: [],
    wires: [],
    view: createDefaultCircuitView(),
    environment: createDefaultCircuitEnvironment(),
  };
}

export function getCircuitEnvironment(
  document: Pick<CircuitDocument, "environment"> | null | undefined,
): CircuitEnvironmentState {
  return {
    ...DEFAULT_CIRCUIT_ENVIRONMENT,
    ...(document?.environment ?? {}),
  };
}

export function createCircuitId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function snapToGrid(value: number) {
  return Math.round(value / CIRCUIT_GRID_SIZE) * CIRCUIT_GRID_SIZE;
}

export function snapPointToGrid(point: CircuitPoint): CircuitPoint {
  return {
    x: snapToGrid(point.x),
    y: snapToGrid(point.y),
  };
}

function nextComponentOrdinal(
  components: CircuitComponentInstance[],
  type: CircuitComponentType,
) {
  return components.filter((component) => component.type === type).length + 1;
}

export function createComponentInstance(
  type: CircuitComponentType,
  components: CircuitComponentInstance[],
  point: CircuitPoint,
): CircuitComponentInstance {
  const definition = getCircuitComponentDefinition(type);
  const ordinal = nextComponentOrdinal(components, type);

  return {
    id: createCircuitId(type),
    label: `${definition.label} ${ordinal}`,
    type,
    x: point.x,
    y: point.y,
    rotation: 0,
    properties: { ...definition.defaults },
  };
}

export function getCircuitComponentById(
  document: CircuitDocument,
  componentId: string,
) {
  return document.components.find((component) => component.id === componentId) ?? null;
}

export function getCircuitWireById(document: CircuitDocument, wireId: string) {
  return document.wires.find((wire) => wire.id === wireId) ?? null;
}

export function getCircuitTerminalDisplayLabel(
  document: CircuitDocument,
  ref: CircuitTerminalRef,
) {
  const component = getCircuitComponentById(document, ref.componentId);
  if (!component) {
    return `${ref.componentId} ${ref.terminal}`;
  }
  const definition = getCircuitComponentDefinition(component.type);
  return `${component.label} ${definition.terminalLabels[ref.terminal]}`;
}

export function getCircuitWireDisplayLabel(
  document: CircuitDocument,
  wire: { from: CircuitTerminalRef; to: CircuitTerminalRef },
) {
  return `Wire linking ${getCircuitTerminalDisplayLabel(document, wire.from)} to ${getCircuitTerminalDisplayLabel(document, wire.to)}`;
}

export function getTerminalLocalPoint(terminal: CircuitTerminalKey): CircuitPoint {
  return {
    x: terminal === "a" ? -COMPONENT_HALF_SPAN : COMPONENT_HALF_SPAN,
    y: 0,
  };
}

export function rotatePoint(point: CircuitPoint, rotation: CircuitRotation): CircuitPoint {
  switch (rotation) {
    case 90:
      return { x: -point.y, y: point.x };
    case 180:
      return { x: -point.x, y: -point.y };
    case 270:
      return { x: point.y, y: -point.x };
    default:
      return point;
  }
}

export function getComponentTerminalPoint(
  component: CircuitComponentInstance,
  terminal: CircuitTerminalKey,
): CircuitPoint {
  const rotated = rotatePoint(getTerminalLocalPoint(terminal), component.rotation);
  return {
    x: component.x + rotated.x,
    y: component.y + rotated.y,
  };
}

export function getComponentTerminalDirection(
  component: CircuitComponentInstance,
  terminal: CircuitTerminalKey,
): CircuitPoint {
  const local = terminal === "a" ? { x: -1, y: 0 } : { x: 1, y: 0 };
  return rotatePoint(local, component.rotation);
}

export function getComponentBoundingBox(component: CircuitComponentInstance) {
  const isVertical = component.rotation === 90 || component.rotation === 270;

  return {
    left: component.x - (isVertical ? 44 : 68),
    right: component.x + (isVertical ? 44 : 68),
    top: component.y - (isVertical ? 68 : 44),
    bottom: component.y + (isVertical ? 68 : 44),
  };
}

export function clampComponentPoint(point: CircuitPoint): CircuitPoint {
  return {
    x: clamp(point.x, CIRCUIT_GRID_SIZE * 2, CIRCUIT_CANVAS_WIDTH - CIRCUIT_GRID_SIZE * 2),
    y: clamp(
      point.y,
      CIRCUIT_GRID_SIZE * 2,
      CIRCUIT_CANVAS_HEIGHT - CIRCUIT_GRID_SIZE * 2,
    ),
  };
}

export function getVisibleWorldCenter(view: CircuitViewState): CircuitPoint {
  return {
    x: (CIRCUIT_CANVAS_WIDTH / 2 - view.offsetX) / Math.max(view.zoom, 0.2),
    y: (CIRCUIT_CANVAS_HEIGHT / 2 - view.offsetY) / Math.max(view.zoom, 0.2),
  };
}

export function convertViewPointToWorld(point: CircuitPoint, view: CircuitViewState) {
  return {
    x: (point.x - view.offsetX) / Math.max(view.zoom, 0.2),
    y: (point.y - view.offsetY) / Math.max(view.zoom, 0.2),
  };
}

function buildCircuitJsonBaseFilename(document: CircuitDocument) {
  const count = document.components.length;
  return count === 0
    ? "open-model-lab-circuit-state-empty"
    : `open-model-lab-circuit-state-${count}-parts`;
}

export function normalizeCircuitDocument(input: unknown): CircuitDocument {
  let parsed: z.infer<typeof rawCircuitDocumentSchema>;
  try {
    parsed = rawCircuitDocumentSchema.parse(input);
  } catch {
    throw new Error(
      "The selected JSON does not match the circuit-builder document format.",
    );
  }
  if (parsed.version !== undefined && parsed.version !== CIRCUIT_DOCUMENT_VERSION) {
    throw new Error(
      `Unsupported circuit document version ${parsed.version}. This builder currently supports version ${CIRCUIT_DOCUMENT_VERSION}.`,
    );
  }

  const viewDefaults = createDefaultCircuitView();
  const environmentDefaults = createDefaultCircuitEnvironment();
  const componentCounts = new Map<CircuitComponentType, number>();
  const componentIds = new Set<string>();
  const wireIds = new Set<string>();

  const components = parsed.components.map((component) => {
    if (componentIds.has(component.id)) {
      throw new Error(`Duplicate component id "${component.id}" was found in the imported JSON.`);
    }
    componentIds.add(component.id);

    const definition = getCircuitComponentDefinition(component.type);
    const nextOrdinal = (componentCounts.get(component.type) ?? 0) + 1;
    componentCounts.set(component.type, nextOrdinal);

    return {
      id: component.id,
      label: component.label?.trim() ? component.label : `${definition.label} ${nextOrdinal}`,
      type: component.type,
      x: component.x,
      y: component.y,
      rotation: component.rotation ?? 0,
      properties: {
        ...definition.defaults,
        ...(component.properties ?? {}),
      },
    } satisfies CircuitComponentInstance;
  });

  const wires = (parsed.wires ?? []).map((wire) => {
    if (wireIds.has(wire.id)) {
      throw new Error(`Duplicate wire id "${wire.id}" was found in the imported JSON.`);
    }
    wireIds.add(wire.id);

    if (!componentIds.has(wire.from.componentId) || !componentIds.has(wire.to.componentId)) {
      throw new Error(
        `Wire "${wire.id}" references a component that does not exist in the imported JSON.`,
      );
    }
    if (
      wire.from.componentId === wire.to.componentId &&
      wire.from.terminal === wire.to.terminal
    ) {
      throw new Error(`Wire "${wire.id}" connects a terminal to itself, which is not supported.`);
    }

    return wire;
  });

  return {
    version: CIRCUIT_DOCUMENT_VERSION,
    components,
    wires,
    view: {
      zoom: clamp(parsed.view?.zoom ?? viewDefaults.zoom, 0.45, 1.5),
      offsetX: parsed.view?.offsetX ?? viewDefaults.offsetX,
      offsetY: parsed.view?.offsetY ?? viewDefaults.offsetY,
    },
    environment: {
      temperatureC: clamp(
        parsed.environment?.temperatureC ?? environmentDefaults.temperatureC,
        0,
        100,
      ),
      lightLevelPercent: clamp(
        parsed.environment?.lightLevelPercent ?? environmentDefaults.lightLevelPercent,
        0,
        100,
      ),
    },
  };
}

export function parseCircuitDocumentJson(text: string): CircuitDocument {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  return normalizeCircuitDocument(parsedJson);
}

export function serializeCircuitDocument(document: CircuitDocument) {
  return JSON.stringify(normalizeCircuitDocument(document), null, 2);
}

export function buildCircuitJsonExport(document: CircuitDocument) {
  const normalized = normalizeCircuitDocument(document);
  return {
    filename: `${buildCircuitJsonBaseFilename(normalized)}.json`,
    json: JSON.stringify(normalized, null, 2),
  };
}

type CircuitBounds = ReturnType<typeof getComponentBoundingBox>;

type WirePointEntry = {
  point: CircuitPoint;
  protected?: boolean;
};

function hasDirection(direction: CircuitPoint) {
  return direction.x !== 0 || direction.y !== 0;
}

function pointsEqual(a: CircuitPoint, b: CircuitPoint) {
  return a.x === b.x && a.y === b.y;
}

function inflateBounds(bounds: CircuitBounds, padding: number): CircuitBounds {
  return {
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
    bottom: bounds.bottom + padding,
  };
}

function clampWireLane(value: number, max: number) {
  return clamp(
    snapToGrid(value),
    CIRCUIT_GRID_SIZE,
    max - CIRCUIT_GRID_SIZE,
  );
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter(Number.isFinite)));
}

function directionBetween(a: CircuitPoint, b: CircuitPoint) {
  return {
    x: Math.sign(b.x - a.x),
    y: Math.sign(b.y - a.y),
  };
}

function isCollinear(a: CircuitPoint, b: CircuitPoint, c: CircuitPoint) {
  return (
    (a.x === b.x && b.x === c.x) ||
    (a.y === b.y && b.y === c.y)
  );
}

function cleanWirePointEntries(entries: WirePointEntry[]) {
  const deduped: WirePointEntry[] = [];
  for (const entry of entries) {
    const previous = deduped[deduped.length - 1];
    if (previous && pointsEqual(previous.point, entry.point)) {
      if (entry.protected && !previous.protected) {
        deduped[deduped.length - 1] = entry;
      }
      continue;
    }
    deduped.push(entry);
  }

  const cleaned: WirePointEntry[] = [];
  for (const entry of deduped) {
    cleaned.push(entry);
    while (cleaned.length >= 3) {
      const a = cleaned[cleaned.length - 3]!;
      const b = cleaned[cleaned.length - 2]!;
      const c = cleaned[cleaned.length - 1]!;
      if (b.protected || !isCollinear(a.point, b.point, c.point)) {
        break;
      }
      cleaned.splice(cleaned.length - 2, 1);
    }
  }

  return cleaned.map((entry) => entry.point);
}

function cleanWirePoints(points: CircuitPoint[]) {
  return cleanWirePointEntries(points.map((point) => ({ point })));
}

function segmentIntersectsBounds(
  start: CircuitPoint,
  end: CircuitPoint,
  bounds: CircuitBounds,
) {
  if (start.x === end.x) {
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return (
      start.x >= bounds.left &&
      start.x <= bounds.right &&
      maxY >= bounds.top &&
      minY <= bounds.bottom
    );
  }

  if (start.y === end.y) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return (
      start.y >= bounds.top &&
      start.y <= bounds.bottom &&
      maxX >= bounds.left &&
      minX <= bounds.right
    );
  }

  return false;
}

function countObstacleHits(points: CircuitPoint[], obstacles: CircuitBounds[]) {
  let hits = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    hits += obstacles.filter((bounds) => segmentIntersectsBounds(start, end, bounds)).length;
  }
  return hits;
}

function countWireBends(points: CircuitPoint[]) {
  let bends = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = directionBetween(points[index - 1]!, points[index]!);
    const next = directionBetween(points[index]!, points[index + 1]!);
    if (previous.x !== next.x || previous.y !== next.y) {
      bends += 1;
    }
  }
  return bends;
}

function wirePathLength(points: CircuitPoint[]) {
  return points.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }
    const previous = points[index - 1]!;
    return total + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
  }, 0);
}

function buildWireRouteCandidates(
  start: CircuitPoint,
  end: CircuitPoint,
  laneBounds: CircuitBounds[],
) {
  const candidates: CircuitPoint[][] = [];
  const addCandidate = (points: CircuitPoint[]) => {
    candidates.push(cleanWirePoints(points));
  };
  const laneXValues = uniqueNumbers([
    start.x,
    end.x,
    clampWireLane((start.x + end.x) / 2, CIRCUIT_CANVAS_WIDTH),
    ...laneBounds.flatMap((bounds) => [
      clampWireLane(bounds.left - WIRE_ROUTE_LANE_OFFSET, CIRCUIT_CANVAS_WIDTH),
      clampWireLane(bounds.right + WIRE_ROUTE_LANE_OFFSET, CIRCUIT_CANVAS_WIDTH),
    ]),
  ]);
  const laneYValues = uniqueNumbers([
    start.y,
    end.y,
    clampWireLane((start.y + end.y) / 2, CIRCUIT_CANVAS_HEIGHT),
    ...laneBounds.flatMap((bounds) => [
      clampWireLane(bounds.top - WIRE_ROUTE_LANE_OFFSET, CIRCUIT_CANVAS_HEIGHT),
      clampWireLane(bounds.bottom + WIRE_ROUTE_LANE_OFFSET, CIRCUIT_CANVAS_HEIGHT),
    ]),
  ]);

  if (start.x === end.x || start.y === end.y) {
    addCandidate([start, end]);
  }

  addCandidate([start, { x: end.x, y: start.y }, end]);
  addCandidate([start, { x: start.x, y: end.y }, end]);

  for (const x of laneXValues) {
    addCandidate([start, { x, y: start.y }, { x, y: end.y }, end]);
  }

  for (const y of laneYValues) {
    addCandidate([start, { x: start.x, y }, { x: end.x, y }, end]);
  }

  return candidates;
}

function scoreWireRoute(points: CircuitPoint[], obstacleBounds: CircuitBounds[]) {
  return (
    countObstacleHits(points, obstacleBounds) * 1_000_000 +
    countWireBends(points) * 1_000 +
    wirePathLength(points)
  );
}

function chooseBestWireRoute(
  start: CircuitPoint,
  end: CircuitPoint,
  laneBounds: CircuitBounds[],
  obstacleBounds: CircuitBounds[],
) {
  return buildWireRouteCandidates(start, end, laneBounds).reduce(
    (best, candidate) => {
      const candidateScore = scoreWireRoute(candidate, obstacleBounds);
      if (!best || candidateScore < best.score) {
        return { points: candidate, score: candidateScore };
      }
      return best;
    },
    null as { points: CircuitPoint[]; score: number } | null,
  )?.points ?? [start, end];
}

export function buildWirePreviewPoints(
  from: CircuitPoint,
  fromDirection: CircuitPoint,
  to: CircuitPoint,
  toDirection: CircuitPoint,
  options: {
    components?: CircuitComponentInstance[];
    ignoredComponentIds?: string[];
  } = {},
) {
  const startStub = {
    x: from.x + fromDirection.x * WIRE_STUB,
    y: from.y + fromDirection.y * WIRE_STUB,
  };
  const endStub = {
    x: to.x + toDirection.x * WIRE_STUB,
    y: to.y + toDirection.y * WIRE_STUB,
  };
  const obstacleBounds = (options.components ?? [])
    .filter((component) => !(options.ignoredComponentIds ?? []).includes(component.id))
    .map((component) =>
      inflateBounds(getComponentBoundingBox(component), WIRE_ROUTE_COMPONENT_INFLATE),
    );
  const laneBounds = (options.components ?? []).map((component) =>
    inflateBounds(getComponentBoundingBox(component), WIRE_ROUTE_COMPONENT_INFLATE),
  );
  const routedCore = chooseBestWireRoute(startStub, endStub, laneBounds, obstacleBounds);

  return cleanWirePointEntries([
    { point: from },
    { point: startStub, protected: hasDirection(fromDirection) },
    ...routedCore.slice(1, -1).map((point) => ({ point })),
    { point: endStub, protected: hasDirection(toDirection) },
    { point: to },
  ]);
}

export function buildWirePathData(points: CircuitPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function buildWirePathFromRefs(
  document: CircuitDocument,
  wire: { from: CircuitTerminalRef; to: CircuitTerminalRef },
) {
  const fromComponent = getCircuitComponentById(document, wire.from.componentId);
  const toComponent = getCircuitComponentById(document, wire.to.componentId);

  if (!fromComponent || !toComponent) {
    return null;
  }

  const fromPoint = getComponentTerminalPoint(fromComponent, wire.from.terminal);
  const toPoint = getComponentTerminalPoint(toComponent, wire.to.terminal);
  const points = buildWirePreviewPoints(
    fromPoint,
    getComponentTerminalDirection(fromComponent, wire.from.terminal),
    toPoint,
    getComponentTerminalDirection(toComponent, wire.to.terminal),
    {
      components: document.components,
      ignoredComponentIds: [fromComponent.id, toComponent.id],
    },
  );

  return {
    points,
    path: buildWirePathData(points),
  };
}

export function componentSupportsReset(component: CircuitComponentInstance) {
  return component.type === "fuse";
}

export function thermistorUsesAmbientTemperature(component: CircuitComponentInstance) {
  return component.type === "thermistor"
    ? Boolean(component.properties.useAmbientTemperature ?? true)
    : false;
}

export function ldrUsesAmbientLight(component: CircuitComponentInstance) {
  return component.type === "ldr"
    ? Boolean(component.properties.useAmbientLight ?? true)
    : false;
}

export function getCircuitComponentModeLabel(component: CircuitComponentInstance) {
  if (component.type === "thermistor") {
    return thermistorUsesAmbientTemperature(component) ? "Ambient-linked" : "Manual";
  }
  if (component.type === "ldr") {
    return ldrUsesAmbientLight(component) ? "Ambient-linked" : "Manual";
  }
  return null;
}

export function deriveThermistorResistance(baseResistance: number, temperatureC: number) {
  return clamp(
    Math.max(0.1, baseResistance) * Math.exp(-0.035 * (temperatureC - 25)),
    0.2,
    100000,
  );
}

export function deriveLdrResistance(
  baseResistance: number,
  lightLevelPercent: number,
) {
  const lightLevel = clamp(lightLevelPercent, 0, 100) / 100;
  return clamp(Math.max(1, baseResistance) * Math.exp(-2.1 * lightLevel), 5, 100000);
}

export function getAmbientDrivenComponentInput(
  component: CircuitComponentInstance,
  environment: CircuitEnvironmentState,
) {
  if (component.type === "thermistor") {
    return thermistorUsesAmbientTemperature(component)
      ? { kind: "temperature" as const, value: environment.temperatureC }
      : null;
  }
  if (component.type === "ldr") {
    return ldrUsesAmbientLight(component)
      ? { kind: "light" as const, value: environment.lightLevelPercent }
      : null;
  }
  return null;
}

export function updateComponentProperties(
  component: CircuitComponentInstance,
  updates: CircuitComponentProperties,
): CircuitComponentInstance {
  return {
    ...component,
    properties: {
      ...component.properties,
      ...updates,
    },
  };
}

export function deriveComponentResistance(
  component: CircuitComponentInstance,
  environment: CircuitEnvironmentState = DEFAULT_CIRCUIT_ENVIRONMENT,
) {
  const properties = component.properties;

  switch (component.type) {
    case "ammeter":
      return NEAR_ZERO_RESISTANCE;
    case "resistor":
      return Math.max(0.1, Number(properties.resistance ?? 12));
    case "switch":
      return properties.closed ? NEAR_ZERO_RESISTANCE : Number.POSITIVE_INFINITY;
    case "lightBulb": {
      const ratedVoltage = Math.max(0.1, Number(properties.ratedVoltage ?? 6));
      const ratedPower = Math.max(0.1, Number(properties.ratedPower ?? 3));
      return (ratedVoltage * ratedVoltage) / ratedPower;
    }
    case "capacitor":
      return Number.POSITIVE_INFINITY;
    case "thermistor": {
      if (thermistorUsesAmbientTemperature(component)) {
        return deriveThermistorResistance(
          Number(properties.baseResistance ?? 220),
          environment.temperatureC,
        );
      }
      return clamp(Number(properties.manualResistance ?? properties.baseResistance ?? 220), 0.2, 100000);
    }
    case "ldr": {
      if (ldrUsesAmbientLight(component)) {
        return deriveLdrResistance(
          Number(properties.baseResistance ?? 900),
          environment.lightLevelPercent,
        );
      }
      return clamp(Number(properties.manualResistance ?? properties.baseResistance ?? 900), 5, 100000);
    }
    case "fuse":
      return properties.blown ? Number.POSITIVE_INFINITY : NEAR_ZERO_RESISTANCE;
    case "voltmeter":
      return VERY_HIGH_RESISTANCE;
    case "diode":
      return NEAR_ZERO_RESISTANCE;
    default:
      return null;
  }
}
