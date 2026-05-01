import { formatMeasurement } from "@/lib/physics/math";
import {
  buildWirePathFromRefs,
  getCircuitEnvironment,
  getCircuitComponentById,
  getComponentBoundingBox,
  getComponentTerminalPoint,
  ldrUsesAmbientLight,
  thermistorUsesAmbientTemperature,
} from "./model";
import { getCircuitSymbolShapes, type CircuitSymbolShape } from "./symbol-geometry";
import type {
  CircuitComponentInstance,
  CircuitDocument,
  CircuitPoint,
  CircuitSolveResult,
} from "./types";

const EXPORT_BACKGROUND = "#fffdf8";
const EXPORT_STROKE = "#0f1c24";
const EXPORT_TEXT = "#0f1c24";
const EXPORT_MUTED_TEXT = "#496576";
const EXPORT_PADDING = 56;
const DOT_RADIUS = 6;

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type CircuitSvgExport = {
  svg: string;
  filename: string;
  width: number;
  height: number;
  viewBox: string;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function emptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function addPoint(bounds: Bounds, point: CircuitPoint) {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
}

function addBox(bounds: Bounds, box: { left: number; top: number; right: number; bottom: number }) {
  bounds.minX = Math.min(bounds.minX, box.left);
  bounds.minY = Math.min(bounds.minY, box.top);
  bounds.maxX = Math.max(bounds.maxX, box.right);
  bounds.maxY = Math.max(bounds.maxY, box.bottom);
}

function addTextBounds(bounds: Bounds, x: number, y: number, text: string) {
  const width = Math.max(24, text.length * 7.2);
  addBox(bounds, {
    left: x - width / 2,
    right: x + width / 2,
    top: y - 14,
    bottom: y + 6,
  });
}

function serializeShape(shape: CircuitSymbolShape) {
  const stroke = shape.stroke ?? "currentColor";
  const fill = shape.fill ?? "none";
  const strokeWidth = shape.strokeWidth ?? 3;
  const strokeLinecap = shape.strokeLinecap ?? "round";
  const strokeLinejoin = shape.strokeLinejoin ?? "round";

  switch (shape.kind) {
    case "circle":
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" />`;
    case "line":
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" />`;
    case "path":
      return `<path d="${shape.d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" />`;
    case "rect":
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx ?? 0}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" />`;
    default:
      return "";
  }
}

function buildComponentValueLabel(
  document: CircuitDocument,
  component: CircuitComponentInstance,
  solveResult: CircuitSolveResult,
) {
  const result = solveResult.componentResults[component.id];
  const environment = getCircuitEnvironment(document);
  switch (component.type) {
    case "ammeter":
      return result?.currentMagnitude !== null && result?.currentMagnitude !== undefined
        ? formatMeasurement(result.currentMagnitude, "A")
        : "meter";
    case "battery":
      return formatMeasurement(Number(component.properties.voltage ?? 9), "V");
    case "capacitor":
      return formatMeasurement(Number(component.properties.capacitance ?? 0.47), "F");
    case "diode":
      return result?.stateLabel === "blocking"
        ? "blocking"
        : `${formatMeasurement(Number(component.properties.forwardDrop ?? 0.7), "V")} drop`;
    case "fuse":
      return component.properties.blown
        ? `blown - ${formatMeasurement(Number(component.properties.rating ?? 1.5), "A")}`
        : formatMeasurement(Number(component.properties.rating ?? 1.5), "A");
    case "ldr":
      return result?.resistance !== null && result?.resistance !== undefined
        ? ldrUsesAmbientLight(component)
          ? `${formatMeasurement(result.resistance, "ohm")} @ ${Math.round(
              environment.lightLevelPercent,
            )}% light`
          : `${formatMeasurement(result.resistance, "ohm")} manual`
        : `${Math.round(environment.lightLevelPercent)}% light`;
    case "lightBulb":
      return `${formatMeasurement(Number(component.properties.ratedVoltage ?? 6), "V")} / ${formatMeasurement(Number(component.properties.ratedPower ?? 3), "W")}`;
    case "resistor":
      return formatMeasurement(Number(component.properties.resistance ?? 12), "ohm");
    case "switch":
      return component.properties.closed ? "closed" : "open";
    case "thermistor":
      return result?.resistance !== null && result?.resistance !== undefined
        ? thermistorUsesAmbientTemperature(component)
          ? `${formatMeasurement(result.resistance, "ohm")} @ ${formatMeasurement(
              environment.temperatureC,
              "C",
            )}`
          : `${formatMeasurement(result.resistance, "ohm")} manual`
        : formatMeasurement(environment.temperatureC, "C");
    case "voltmeter":
      return result?.voltageMagnitude !== null && result?.voltageMagnitude !== undefined
        ? formatMeasurement(result.voltageMagnitude, "V")
        : "meter";
    default:
      return null;
  }
}

function buildNodeDots(document: CircuitDocument, solveResult: CircuitSolveResult) {
  return Object.values(solveResult.nodeResults)
    .filter((node) => node.terminalRefs.length >= 3)
    .map((node) => {
      const points = node.terminalRefs
        .map((ref) => {
          const component = getCircuitComponentById(document, ref.componentId);
          return component ? getComponentTerminalPoint(component, ref.terminal) : null;
        })
        .filter(Boolean) as CircuitPoint[];
      const center = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      };
      return {
        id: node.id,
        center,
      };
    });
}

function createBaseFilename(document: CircuitDocument) {
  const count = document.components.length;
  return count === 0
    ? "open-model-lab-circuit-diagram-empty"
    : `open-model-lab-circuit-diagram-${count}-parts`;
}

export function buildCircuitSvgExport(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
): CircuitSvgExport {
  const bounds = emptyBounds();
  const componentMarkup = document.components.map((component) => {
    const shapes = getCircuitSymbolShapes(component.type, {
      openSwitch: component.type === "switch" && !component.properties.closed,
    });
    const symbolMarkup = shapes.map((shape) => serializeShape(shape)).join("");
    const box = getComponentBoundingBox(component);
    addBox(bounds, box);

    const labelY = box.top - 16;
    const valueLabel = buildComponentValueLabel(document, component, solveResult);
    addTextBounds(bounds, component.x, labelY, component.label);
    if (valueLabel) {
      addTextBounds(bounds, component.x, box.bottom + 18, valueLabel);
    }

    return `
      <g class="circuit-component" data-component-id="${escapeXml(component.id)}" transform="translate(${component.x} ${component.y}) rotate(${component.rotation})" color="${EXPORT_STROKE}" stroke="${EXPORT_STROKE}" fill="none">
        ${symbolMarkup}
      </g>
      <text class="circuit-component-label" x="${component.x}" y="${labelY}" fill="${EXPORT_TEXT}" font-size="13" font-family="Bahnschrift, 'Segoe UI', Arial, sans-serif" font-weight="600" text-anchor="middle">${escapeXml(component.label)}</text>
      ${
        valueLabel
          ? `<text class="circuit-component-value" x="${component.x}" y="${box.bottom + 18}" fill="${EXPORT_MUTED_TEXT}" font-size="12" font-family="Bahnschrift, 'Segoe UI', Arial, sans-serif" font-weight="500" text-anchor="middle">${escapeXml(valueLabel)}</text>`
          : ""
      }
    `;
  });

  const wireMarkup = document.wires.map((wire) => {
    const wirePath = buildWirePathFromRefs(document, wire);
    if (!wirePath) {
      return "";
    }
    wirePath.points.forEach((point) => addPoint(bounds, point));
    return `<path class="circuit-wire" d="${wirePath.path}" fill="none" stroke="${EXPORT_STROKE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`;
  });

  const junctionDots = buildNodeDots(document, solveResult).map((node) => {
    addBox(bounds, {
      left: node.center.x - DOT_RADIUS,
      top: node.center.y - DOT_RADIUS,
      right: node.center.x + DOT_RADIUS,
      bottom: node.center.y + DOT_RADIUS,
    });
    return `<circle class="circuit-junction-dot" cx="${node.center.x}" cy="${node.center.y}" r="${DOT_RADIUS}" fill="${EXPORT_STROKE}" />`;
  });

  if (!Number.isFinite(bounds.minX)) {
    bounds.minX = 0;
    bounds.minY = 0;
    bounds.maxX = 320;
    bounds.maxY = 240;
  }

  const paddedBounds = {
    minX: bounds.minX - EXPORT_PADDING,
    minY: bounds.minY - EXPORT_PADDING,
    maxX: bounds.maxX + EXPORT_PADDING,
    maxY: bounds.maxY + EXPORT_PADDING,
  };
  const width = Math.max(240, Math.ceil(paddedBounds.maxX - paddedBounds.minX));
  const height = Math.max(180, Math.ceil(paddedBounds.maxY - paddedBounds.minY));
  const viewBox = `${paddedBounds.minX} ${paddedBounds.minY} ${width} ${height}`;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-label="Open Model Lab circuit diagram export">`,
    `<rect x="${paddedBounds.minX}" y="${paddedBounds.minY}" width="${width}" height="${height}" fill="${EXPORT_BACKGROUND}" />`,
    `<g class="circuit-diagram">`,
    wireMarkup.join(""),
    junctionDots.join(""),
    componentMarkup.join(""),
    `</g>`,
    `</svg>`,
  ].join("");

  return {
    svg,
    filename: `${createBaseFilename(document)}.svg`,
    width,
    height,
    viewBox,
  };
}
