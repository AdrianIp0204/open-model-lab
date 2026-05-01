import type { GraphSeries } from "@/lib/physics/types";

export const CIRCUIT_GRID_SIZE = 32;
export const CIRCUIT_CANVAS_WIDTH = 1600;
export const CIRCUIT_CANVAS_HEIGHT = 960;

export type CircuitTerminalKey = "a" | "b";
export type CircuitRotation = 0 | 90 | 180 | 270;

export type CircuitComponentType =
  | "ammeter"
  | "battery"
  | "capacitor"
  | "diode"
  | "fuse"
  | "ldr"
  | "lightBulb"
  | "resistor"
  | "switch"
  | "thermistor"
  | "voltmeter";

export type CircuitPaletteItemType = CircuitComponentType | "wire";

export type CircuitScalar = boolean | number | string;
export type CircuitComponentProperties = Record<string, CircuitScalar>;

export type CircuitPoint = {
  x: number;
  y: number;
};

export type CircuitTerminalRef = {
  componentId: string;
  terminal: CircuitTerminalKey;
};

export type CircuitComponentInstance = {
  id: string;
  label: string;
  type: CircuitComponentType;
  x: number;
  y: number;
  rotation: CircuitRotation;
  properties: CircuitComponentProperties;
};

export type CircuitWire = {
  id: string;
  from: CircuitTerminalRef;
  to: CircuitTerminalRef;
};

export type CircuitViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type CircuitEnvironmentState = {
  temperatureC: number;
  lightLevelPercent: number;
};

export type CircuitDocument = {
  version: 1;
  components: CircuitComponentInstance[];
  wires: CircuitWire[];
  view: CircuitViewState;
  environment: CircuitEnvironmentState;
};

export type CircuitEditableField =
  | {
      key: string;
      label: string;
      type: "number";
      min?: number;
      max?: number;
      step?: number;
      suffix?: string;
      help?: string;
    }
  | {
      key: string;
      label: string;
      type: "boolean";
      help?: string;
    };

export type CircuitComponentDefinition = {
  type: CircuitComponentType;
  label: string;
  shortLabel: string;
  symbolLabel: string;
  summary: string;
  symbolMeaning: string;
  behavior: string;
  notice: string;
  simplification: string;
  defaults: CircuitComponentProperties;
  inspectorFields: CircuitEditableField[];
  terminalLabels: {
    a: string;
    b: string;
  };
};

export type CircuitPaletteEntry = {
  type: CircuitPaletteItemType;
  label: string;
  shortLabel: string;
  symbolLabel: string;
  summary: string;
  behavior: string;
  searchTerms: string[];
  kind: "component" | "tool";
};

export type CircuitIssueSeverity = "warning" | "error";

export type CircuitIssue = {
  id: string;
  severity: CircuitIssueSeverity;
  code:
    | "floating-component"
    | "fuse-blown"
    | "open-circuit"
    | "short-source"
    | "solver-failure"
    | "unconnected-terminal"
    | "undefined-reading"
    | "unsupported-state";
  title: string;
  detail: string;
  componentId?: string;
};

export type CircuitNodeResult = {
  id: string;
  voltage: number | null;
  comparable: boolean;
  sourceConnected: boolean;
  terminalRefs: CircuitTerminalRef[];
};

export type CircuitComponentResult = {
  componentId: string;
  componentType: CircuitComponentType;
  stateLabel: string;
  voltage: number | null;
  voltageMagnitude: number | null;
  current: number | null;
  currentMagnitude: number | null;
  power: number | null;
  resistance: number | null;
  comparable: boolean;
  sourceConnected: boolean;
  nodeIds: {
    a: string;
    b: string;
  };
  terminalVoltages: {
    a: number | null;
    b: number | null;
  };
  extra: Record<string, CircuitScalar | null>;
};

export type CircuitSolveResult = {
  ok: boolean;
  componentResults: Record<string, CircuitComponentResult>;
  nodeResults: Record<string, CircuitNodeResult>;
  issues: CircuitIssue[];
  autoBlownFuseIds: string[];
  notes: string[];
};

export type CircuitGraphDescriptor = {
  title: string;
  xLabel: string;
  yLabel: string;
  summary: string;
  description?: string;
  series: GraphSeries[];
  marker?: {
    label: string;
    xValue: number;
    seriesId: string;
    point: {
      x: number;
      y: number;
    };
  } | null;
};

export type CircuitInspectorReadout = {
  label: string;
  value: string;
};
