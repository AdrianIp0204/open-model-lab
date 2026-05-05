import type {
  CircuitComponentInstance,
  CircuitComponentResult,
  CircuitDocument,
  CircuitRenderMode,
  CircuitSolveResult,
  CircuitTerminalKey,
  CircuitWire,
} from "./types";

export const CIRCUIT_RENDER_MODE_STORAGE_KEY =
  "open-model-lab:circuit-builder-render-mode:v1";

const ELECTRON_FLOW_CURRENT_THRESHOLD = 1e-6;

export type CircuitLightBulbGlow = {
  active: boolean;
  intensity: number;
};

export type CircuitWireElectronFlow = {
  active: boolean;
  direction: "from-to" | "to-from" | null;
  speed: number;
  durationSeconds: number;
  intensity: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeCircuitRenderMode(value: unknown): CircuitRenderMode {
  return value === "modern" ? "modern" : "schematic";
}

export function deriveLightBulbGlow(
  component: CircuitComponentInstance,
  result: CircuitComponentResult | null | undefined,
): CircuitLightBulbGlow {
  const off = { active: false, intensity: 0 };

  if (component.type !== "lightBulb" || !result) {
    return off;
  }

  if (!result.comparable || !result.sourceConnected) {
    return off;
  }

  const power = result.power;
  if (power === null || !Number.isFinite(power) || power <= 0) {
    return off;
  }

  const ratedPower = Math.max(0.1, Number(component.properties.ratedPower ?? 3));
  const intensity = clamp(Math.sqrt(Math.abs(power) / ratedPower), 0, 1);

  return intensity > 0 ? { active: true, intensity } : off;
}

type TerminalCurrentFlow = "into-component" | "out-of-component";

function getComponentById(document: CircuitDocument, componentId: string) {
  return document.components.find((component) => component.id === componentId) ?? null;
}

function getTerminalCurrentFlow(
  result: CircuitComponentResult | null | undefined,
  terminal: CircuitTerminalKey,
): TerminalCurrentFlow | null {
  if (!result || !result.comparable || !result.sourceConnected) {
    return null;
  }

  const current = result.current;
  if (
    current === null ||
    !Number.isFinite(current) ||
    Math.abs(current) <= ELECTRON_FLOW_CURRENT_THRESHOLD
  ) {
    return null;
  }

  const conventionalCurrentFlowsFromAToB = current > 0;
  if (terminal === "a") {
    return conventionalCurrentFlowsFromAToB ? "into-component" : "out-of-component";
  }

  return conventionalCurrentFlowsFromAToB ? "out-of-component" : "into-component";
}

function inactiveElectronFlow(): CircuitWireElectronFlow {
  return {
    active: false,
    direction: null,
    speed: 0,
    durationSeconds: 0,
    intensity: 0,
  };
}

function averageCurrentMagnitude(
  first: CircuitComponentResult,
  second: CircuitComponentResult,
) {
  const values = [first.currentMagnitude, second.currentMagnitude].filter(
    (value): value is number =>
      value !== null &&
      Number.isFinite(value) &&
      value > ELECTRON_FLOW_CURRENT_THRESHOLD,
  );

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function deriveWireElectronFlow(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
  wire: CircuitWire,
): CircuitWireElectronFlow {
  const fromComponent = getComponentById(document, wire.from.componentId);
  const toComponent = getComponentById(document, wire.to.componentId);
  if (!fromComponent || !toComponent) {
    return inactiveElectronFlow();
  }

  const fromResult = solveResult.componentResults[fromComponent.id];
  const toResult = solveResult.componentResults[toComponent.id];
  if (!fromResult || !toResult) {
    return inactiveElectronFlow();
  }

  const fromTerminalFlow = getTerminalCurrentFlow(fromResult, wire.from.terminal);
  const toTerminalFlow = getTerminalCurrentFlow(toResult, wire.to.terminal);
  if (!fromTerminalFlow || !toTerminalFlow) {
    return inactiveElectronFlow();
  }

  let conventionalDirection: "from-to" | "to-from" | null = null;
  if (fromTerminalFlow === "out-of-component" && toTerminalFlow === "into-component") {
    conventionalDirection = "from-to";
  } else if (
    fromTerminalFlow === "into-component" &&
    toTerminalFlow === "out-of-component"
  ) {
    conventionalDirection = "to-from";
  }

  if (!conventionalDirection) {
    return inactiveElectronFlow();
  }

  const currentMagnitude = averageCurrentMagnitude(fromResult, toResult);
  if (currentMagnitude === null) {
    return inactiveElectronFlow();
  }

  const speed = clamp(0.35 + Math.sqrt(currentMagnitude), 0.35, 3.4);
  const intensity = clamp(Math.sqrt(currentMagnitude / 0.5), 0.18, 1);
  const durationSeconds = clamp(6 / speed, 1.4, 6);

  return {
    active: true,
    direction: conventionalDirection === "from-to" ? "to-from" : "from-to",
    speed,
    durationSeconds,
    intensity,
  };
}
