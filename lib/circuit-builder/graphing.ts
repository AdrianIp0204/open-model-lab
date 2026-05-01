import type { GraphSeries } from "@/lib/physics/types";
import { formatMeasurement, sampleRange } from "@/lib/physics/math";
import {
  deriveLdrResistance,
  deriveThermistorResistance,
  getCircuitComponentById,
  getCircuitEnvironment,
  ldrUsesAmbientLight,
  thermistorUsesAmbientTemperature,
} from "./model";
import type {
  CircuitComponentInstance,
  CircuitDocument,
  CircuitGraphDescriptor,
  CircuitSolveResult,
} from "./types";

function makeSeries(
  id: string,
  label: string,
  color: string,
  points: Array<{ x: number; y: number }>,
): GraphSeries {
  return {
    id,
    label,
    color,
    points,
  };
}

function buildThermistorGraph(
  document: CircuitDocument,
  component: CircuitComponentInstance,
): CircuitGraphDescriptor {
  const baseResistance = Math.max(0.1, Number(component.properties.baseResistance ?? 220));
  const environment = getCircuitEnvironment(document);
  const temperatures = sampleRange(0, 100, 51);
  const series = makeSeries(
    "thermistor-resistance",
    "Effective resistance",
    "#f0ab3c",
    temperatures.map((temperatureC) => ({
      x: temperatureC,
      y: deriveThermistorResistance(baseResistance, temperatureC),
    })),
  );
  const ambientLinked = thermistorUsesAmbientTemperature(component);

  return {
    title: "Thermistor response",
    xLabel: "Temperature (C)",
    yLabel: "Resistance (ohm)",
    summary:
      "This simplified thermistor uses an NTC-style curve, so its resistance falls as temperature rises.",
    description: ambientLinked
      ? `The current ambient temperature is ${formatMeasurement(
          environment.temperatureC,
          "C",
        )}, so the highlighted operating point follows the page temperature control.`
      : "Manual mode keeps the resistance fixed. Turn on ambient-linked mode to drive this curve from the page temperature control.",
    series: [series],
    marker: ambientLinked
      ? {
          label: "Current operating point",
          xValue: environment.temperatureC,
          seriesId: series.id,
          point: {
            x: environment.temperatureC,
            y: deriveThermistorResistance(baseResistance, environment.temperatureC),
          },
        }
      : null,
  };
}

function buildLdrGraph(
  document: CircuitDocument,
  component: CircuitComponentInstance,
): CircuitGraphDescriptor {
  const baseResistance = Math.max(1, Number(component.properties.baseResistance ?? 900));
  const environment = getCircuitEnvironment(document);
  const samples = sampleRange(0, 100, 51);
  const series = makeSeries(
    "ldr-resistance",
    "Effective resistance",
    "#4ea6df",
    samples.map((lightLevelPercent) => ({
      x: lightLevelPercent,
      y: deriveLdrResistance(baseResistance, lightLevelPercent),
    })),
  );
  const ambientLinked = ldrUsesAmbientLight(component);

  return {
    title: "LDR response",
    xLabel: "Light level (%)",
    yLabel: "Resistance (ohm)",
    summary:
      "This simplified LDR uses a falling resistance curve so brighter light makes the branch easier to drive.",
    description: ambientLinked
      ? `The current ambient light intensity is ${Math.round(
          environment.lightLevelPercent,
        )}%, so the highlighted operating point follows the page light intensity control.`
      : "Manual mode keeps the resistance fixed. Turn on ambient-linked mode to drive this curve from the page light intensity control.",
    series: [series],
    marker: ambientLinked
      ? {
          label: "Current operating point",
          xValue: environment.lightLevelPercent,
          seriesId: series.id,
          point: {
            x: environment.lightLevelPercent,
            y: deriveLdrResistance(baseResistance, environment.lightLevelPercent),
          },
        }
      : null,
  };
}

function simpleRcGraph(
  document: CircuitDocument,
  component: CircuitComponentInstance,
  solveResult: CircuitSolveResult,
): CircuitGraphDescriptor | null {
  const batteries = document.components.filter((entry) => entry.type === "battery");
  const capacitors = document.components.filter((entry) => entry.type === "capacitor");

  if (batteries.length !== 1 || capacitors.length !== 1) {
    return null;
  }

  const selectedResult = solveResult.componentResults[component.id];
  if (!selectedResult?.sourceConnected) {
    return null;
  }

  const resistiveTotal = document.components
    .filter((entry) =>
      ["ammeter", "fuse", "lightBulb", "ldr", "resistor", "switch", "thermistor"].includes(
        entry.type,
      ),
    )
    .reduce((sum, entry) => {
      const resistance = solveResult.componentResults[entry.id]?.resistance;
      if (resistance === null || resistance === undefined || !Number.isFinite(resistance)) {
        return sum;
      }
      return sum + resistance;
    }, 0);

  if (resistiveTotal <= 0.05) {
    return null;
  }

  const sourceVoltage = Math.max(0, Number(batteries[0]?.properties.voltage ?? 9));
  const capacitance = Math.max(0.001, Number(component.properties.capacitance ?? 0.47));
  const tau = resistiveTotal * capacitance;
  const duration = Math.max(2, tau * 5);
  const samples = sampleRange(0, duration, 81);

  return {
    title: "Simple RC charging estimate",
    xLabel: "Time (s)",
    yLabel: "Response",
    summary:
      "The graph assumes one source and a single equivalent series resistance around the selected capacitor.",
    description: `Using R_total = ${formatMeasurement(
      resistiveTotal,
      "ohm",
    )} and C = ${formatMeasurement(capacitance, "F")}, tau = ${formatMeasurement(
      tau,
      "s",
    )}.`,
    series: [
      makeSeries(
        "capacitor-voltage",
        "Capacitor voltage",
        "#4ea6df",
        samples.map((time) => ({
          x: time,
          y: sourceVoltage * (1 - Math.exp(-time / tau)),
        })),
      ),
      makeSeries(
        "current-decay",
        "Current decay",
        "#f16659",
        samples.map((time) => ({
          x: time,
          y: (sourceVoltage / resistiveTotal) * Math.exp(-time / tau),
        })),
      ),
    ],
  };
}

export function buildCircuitInspectorGraph(input: {
  document: CircuitDocument;
  componentId: string;
  solveResult: CircuitSolveResult;
}): CircuitGraphDescriptor | null {
  const component = getCircuitComponentById(input.document, input.componentId);
  if (!component) {
    return null;
  }

  switch (component.type) {
    case "thermistor":
      return buildThermistorGraph(input.document, component);
    case "ldr":
      return buildLdrGraph(input.document, component);
    case "capacitor":
      return simpleRcGraph(input.document, component, input.solveResult);
    default:
      return null;
  }
}
