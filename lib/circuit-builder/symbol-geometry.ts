import type { CircuitPaletteItemType } from "./types";

export type CircuitSymbolShape =
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "square" | "butt";
      strokeLinejoin?: "round" | "miter" | "bevel";
    }
  | {
      kind: "path";
      d: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "square" | "butt";
      strokeLinejoin?: "round" | "miter" | "bevel";
    }
  | {
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "square" | "butt";
      strokeLinejoin?: "round" | "miter" | "bevel";
    }
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "square" | "butt";
      strokeLinejoin?: "round" | "miter" | "bevel";
    };

type CircuitSymbolOptions = {
  openSwitch?: boolean;
};

const DEFAULT_STROKE = "currentColor";

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  overrides: Partial<CircuitSymbolShape> = {},
): CircuitSymbolShape {
  return {
    kind: "line",
    x1,
    y1,
    x2,
    y2,
    stroke: DEFAULT_STROKE,
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...overrides,
  } as CircuitSymbolShape;
}

function path(
  d: string,
  overrides: Partial<CircuitSymbolShape> = {},
): CircuitSymbolShape {
  return {
    kind: "path",
    d,
    fill: "none",
    stroke: DEFAULT_STROKE,
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...overrides,
  } as CircuitSymbolShape;
}

function circle(
  cx: number,
  cy: number,
  r: number,
  overrides: Partial<CircuitSymbolShape> = {},
): CircuitSymbolShape {
  return {
    kind: "circle",
    cx,
    cy,
    r,
    fill: "none",
    stroke: DEFAULT_STROKE,
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...overrides,
  } as CircuitSymbolShape;
}

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  overrides: Partial<CircuitSymbolShape> = {},
): CircuitSymbolShape {
  return {
    kind: "rect",
    x,
    y,
    width,
    height,
    rx,
    fill: "none",
    stroke: DEFAULT_STROKE,
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...overrides,
  } as CircuitSymbolShape;
}

function resistorBase() {
  return [
    line(-58, 0, -40, 0),
    path("M -40 0 L -28 -12 L -16 12 L -4 -12 L 8 12 L 20 -12 L 32 12 L 40 0"),
    line(40, 0, 58, 0),
  ];
}

export function getCircuitSymbolShapes(
  type: CircuitPaletteItemType,
  options: CircuitSymbolOptions = {},
) {
  switch (type) {
    case "wire":
      return [
        circle(-44, 0, 5, { fill: DEFAULT_STROKE, stroke: "none" }),
        circle(44, 0, 5, { fill: DEFAULT_STROKE, stroke: "none" }),
        line(-38, 0, 38, 0),
        path("M -4 -12 L 10 0 L -4 12"),
      ];
    case "resistor":
      return resistorBase();
    case "thermistor":
      return [...resistorBase(), path("M -20 20 L 20 -20 M 16 -22 L 22 -22 L 22 -16")];
    case "ldr":
      return [
        ...resistorBase(),
        path("M -26 -28 L -8 -16"),
        path("M -12 -28 L 6 -16"),
        path("M -10 -22 L -8 -16 L -14 -16"),
        path("M 4 -22 L 6 -16 L 0 -16"),
      ];
    case "switch":
      return [
        line(-58, 0, -18, 0),
        line(18, 0, 58, 0),
        circle(-18, 0, 3, { fill: DEFAULT_STROKE, stroke: "none" }),
        circle(18, 0, 3, { fill: DEFAULT_STROKE, stroke: "none" }),
        options.openSwitch ? line(-16, -2, 12, -24) : line(-16, 0, 16, 0),
      ];
    case "battery":
      return [
        line(-58, 0, -18, 0),
        line(18, 0, 58, 0),
        line(-6, -22, -6, 22),
        line(10, -12, 10, 12),
      ];
    case "capacitor":
      return [
        line(-58, 0, -14, 0),
        line(14, 0, 58, 0),
        line(-14, -26, -14, 26),
        line(14, -26, 14, 26),
      ];
    case "diode":
      return [
        line(-58, 0, -18, 0),
        line(18, 0, 58, 0),
        path("M -18 -22 L 14 0 L -18 22 Z"),
        line(18, -24, 18, 24),
      ];
    case "fuse":
      return [
        line(-58, 0, -28, 0),
        line(28, 0, 58, 0),
        rect(-28, -12, 56, 24, 12),
        path("M -14 0 L -4 -8 L 8 8 L 18 0"),
      ];
    case "lightBulb":
      return [
        line(-58, 0, -28, 0),
        line(28, 0, 58, 0),
        circle(0, 0, 28),
        path("M -14 14 L 14 -14 M -14 -14 L 14 14"),
      ];
    case "ammeter":
      return [
        line(-58, 0, -28, 0),
        line(28, 0, 58, 0),
        circle(0, 0, 28),
        path("M -10 10 L 0 -16 L 10 10 M -6 2 L 6 2"),
      ];
    case "voltmeter":
      return [
        line(-58, 0, -28, 0),
        line(28, 0, 58, 0),
        circle(0, 0, 28),
        path("M -12 -12 L 0 14 L 12 -12"),
      ];
    default:
      return [];
  }
}
