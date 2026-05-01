import { formatMeasurement } from "@/lib/physics/math";
import { getCircuitComponentDefinition } from "./registry";
import {
  getCircuitComponentById,
  getCircuitEnvironment,
  getCircuitComponentModeLabel,
  ldrUsesAmbientLight,
  thermistorUsesAmbientTemperature,
} from "./model";
import type {
  CircuitComponentInstance,
  CircuitDocument,
  CircuitInspectorReadout,
  CircuitSolveResult,
} from "./types";

function measurement(value: number | null, unit?: string, fallback = "Unavailable") {
  if (value === null || !Number.isFinite(value)) {
    return fallback;
  }
  return formatMeasurement(value, unit);
}

function sameGroupComponents(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
  component: CircuitComponentInstance,
) {
  const selected = solveResult.componentResults[component.id];
  if (!selected) {
    return [];
  }

  return document.components.filter((candidate) => {
    if (candidate.id === component.id) {
      return false;
    }
    const result = solveResult.componentResults[candidate.id];
    return (
      Boolean(result) &&
      result.nodeIds.a === selected.nodeIds.a &&
      result.nodeIds.b === selected.nodeIds.b
    );
  });
}

export function buildCircuitContextNote(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
  componentId: string,
) {
  const component = getCircuitComponentById(document, componentId);
  if (!component) {
    return "Select a component to connect its symbol, settings, and computed behavior.";
  }
  const environment = getCircuitEnvironment(document);

  const result = solveResult.componentResults[component.id];
  if (!result) {
    return "This component does not have a computed result yet.";
  }

  if (!result.sourceConnected && component.type !== "battery") {
    return "This part is not on an active source path yet, so the builder cannot show a meaningful live reading.";
  }

  if (!result.comparable) {
    return "The two terminals are not in a comparable solved group right now, so voltage and current readings are not reliable.";
  }

  const siblingComponents = sameGroupComponents(document, solveResult, component);
  const averageSiblingResistance =
    siblingComponents.length === 0
      ? null
      : siblingComponents.reduce((sum, sibling) => {
          const resistance = solveResult.componentResults[sibling.id]?.resistance ?? 0;
          return sum + resistance;
        }, 0) / siblingComponents.length;

  switch (component.type) {
    case "resistor":
      if ((result.currentMagnitude ?? 0) <= 0) {
        return "No current is flowing through this resistor right now, so it is not dropping voltage or dissipating power.";
      }
      if (
        averageSiblingResistance !== null &&
        (result.resistance ?? 0) > averageSiblingResistance &&
        (result.voltageMagnitude ?? 0) > 0
      ) {
        return `This resistor is one of the higher-resistance elements in the active path, so with ${measurement(
          result.currentMagnitude,
          "A",
        )} through it, it is taking a larger share of the voltage drop at ${measurement(
          result.voltageMagnitude,
          "V",
        )}.`;
      }
      return `With ${measurement(
        result.currentMagnitude,
        "A",
      )} through it, this resistor is dropping ${measurement(
        result.voltageMagnitude,
        "V",
      )} and dissipating ${measurement(result.power, "W")}.`;
    case "battery":
      return result.currentMagnitude && result.currentMagnitude > 0
        ? `The source is driving ${measurement(
            result.currentMagnitude,
            "A",
          )} through the connected network, so every active branch is responding to this voltage difference.`
        : "The source sets the potential difference, but no closed load path is drawing current right now.";
    case "switch":
      return component.properties.closed
        ? "The switch is closed, so this path behaves almost like a direct connection and current can keep flowing."
        : "This switch is open, so the branch is intentionally broken and current should stop past this point.";
    case "ammeter":
      return `The ammeter is reporting the branch current directly: ${measurement(
        result.current,
        "A",
      )}. Components in the same series branch should match this reading closely.`;
    case "voltmeter":
      return `The voltmeter is reading the potential difference between its two probes: ${measurement(
        result.voltage,
        "V",
      )}.`;
    case "thermistor":
      return thermistorUsesAmbientTemperature(component)
        ? `At the current ambient temperature of ${measurement(
            environment.temperatureC,
            "C",
          )}, this NTC thermistor is using an effective resistance of ${measurement(
            result.resistance,
            "ohm",
          )}, so warmer conditions reduce its resistance and usually raise branch current.`
        : `This thermistor is pinned to a manual resistance of ${measurement(
            Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 220),
            "ohm",
          )}, so the page temperature control is not changing this branch right now.`;
    case "ldr":
      return ldrUsesAmbientLight(component)
        ? `At the current light intensity of ${Math.round(environment.lightLevelPercent)}%, the LDR is using ${measurement(
            result.resistance,
            "ohm",
          )}, so brighter light lowers its resistance and usually pushes branch current upward.`
        : `This LDR is using a manual resistance of ${measurement(
            Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 900),
            "ohm",
          )}, so the page light control is not changing this branch right now.`;
    case "capacitor":
      return `In the DC steady-state solve this capacitor behaves like an open circuit, so the current is ${measurement(
        result.current,
        "A",
      )} while it can still hold ${measurement(result.voltage, "V")} across its plates.`;
    case "diode":
      return result.stateLabel === "forward-biased"
        ? `The diode is forward-biased, so it is conducting with an approximate drop of ${measurement(
            Number(component.properties.forwardDrop ?? 0.7),
            "V",
          )}.`
        : "The diode is blocking this direction, so the branch behaves like an open path.";
    case "fuse":
      return component.properties.blown
        ? "The fuse has blown, so the branch is open until you reset it."
        : `The fuse is intact and currently carrying ${measurement(
            result.currentMagnitude,
            "A",
          )}, but it will trip if the steady-state current rises above ${measurement(
            Number(component.properties.rating ?? 1.5),
            "A",
          )}.`;
    case "lightBulb": {
      const brightnessRatio = Number(result.extra.brightnessRatio ?? 0);
      return brightnessRatio >= 1
        ? "The bulb is dissipating at least its rated power in this simplified model, so it would be glowing strongly."
        : "The bulb is below its rated power in this simplified model, so it would glow more dimly than its nominal rating.";
    }
    default:
      return "This component is participating in the current solve.";
  }
}

export function buildCircuitInspectorReadouts(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
  componentId: string,
) {
  const component = getCircuitComponentById(document, componentId);
  if (!component) {
    return [] as CircuitInspectorReadout[];
  }
  const environment = getCircuitEnvironment(document);
  const result = solveResult.componentResults[component.id];
  if (!result) {
    return [] as CircuitInspectorReadout[];
  }

  const baseReadouts: CircuitInspectorReadout[] = [
    { label: "Voltage", value: measurement(result.voltage, "V") },
    { label: "Current", value: measurement(result.current, "A") },
    { label: "Power", value: measurement(result.power, "W") },
  ];

  switch (component.type) {
    case "battery":
      return [
        { label: "Set voltage", value: measurement(Number(component.properties.voltage ?? 9), "V") },
        { label: "Source current", value: measurement(result.current, "A") },
        { label: "Source power", value: measurement(result.power, "W") },
      ];
    case "resistor":
      return [
        { label: "Resistance", value: measurement(result.resistance, "ohm") },
        ...baseReadouts,
      ];
    case "switch":
      return [
        { label: "State", value: component.properties.closed ? "Closed" : "Open" },
        ...baseReadouts,
      ];
    case "ammeter":
      return [
        { label: "Meter reading", value: measurement(result.current, "A") },
        { label: "Voltage drop", value: measurement(result.voltage, "V") },
      ];
    case "voltmeter":
      return [
        { label: "Meter reading", value: measurement(result.voltage, "V") },
        { label: "Probe current", value: measurement(result.current, "A") },
      ];
    case "capacitor":
      return [
        { label: "Capacitance", value: measurement(Number(component.properties.capacitance ?? 0.47), "F") },
        { label: "Steady-state voltage", value: measurement(result.voltage, "V") },
        { label: "Steady-state current", value: measurement(result.current, "A") },
      ];
    case "thermistor":
      return [
        { label: "Mode", value: getCircuitComponentModeLabel(component) ?? "Ambient-linked" },
        thermistorUsesAmbientTemperature(component)
          ? { label: "Ambient temperature", value: measurement(environment.temperatureC, "C") }
          : {
              label: "Manual resistance",
              value: measurement(
                Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 220),
                "ohm",
              ),
            },
        { label: "Effective resistance", value: measurement(result.resistance, "ohm") },
        ...baseReadouts,
      ];
    case "ldr":
      return [
        { label: "Mode", value: getCircuitComponentModeLabel(component) ?? "Ambient-linked" },
        ldrUsesAmbientLight(component)
          ? { label: "Ambient light intensity", value: `${Math.round(environment.lightLevelPercent)}%` }
          : {
              label: "Manual resistance",
              value: measurement(
                Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 900),
                "ohm",
              ),
            },
        { label: "Effective resistance", value: measurement(result.resistance, "ohm") },
        ...baseReadouts,
      ];
    case "fuse":
      return [
        { label: "Rating", value: measurement(Number(component.properties.rating ?? 1.5), "A") },
        { label: "State", value: component.properties.blown ? "Blown" : "Intact" },
        ...baseReadouts,
      ];
    case "diode":
      return [
        { label: "State", value: result.stateLabel },
        { label: "Forward drop", value: measurement(Number(component.properties.forwardDrop ?? 0.7), "V") },
        ...baseReadouts,
      ];
    case "lightBulb":
      return [
        { label: "Rated voltage", value: measurement(Number(component.properties.ratedVoltage ?? 6), "V") },
        { label: "Rated power", value: measurement(Number(component.properties.ratedPower ?? 3), "W") },
        { label: "Equivalent resistance", value: measurement(result.resistance, "ohm") },
        ...baseReadouts,
      ];
    default:
      return baseReadouts;
  }
}

export function buildCircuitStaticEducation(componentId: string, document: CircuitDocument) {
  const component = getCircuitComponentById(document, componentId);
  if (!component) {
    return null;
  }
  return getCircuitComponentDefinition(component.type);
}
