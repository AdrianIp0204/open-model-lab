import type { GraphSeries } from "@/lib/physics/types";
import { formatMeasurement, sampleRange } from "@/lib/physics/math";
import {
  circuitBuilderCopyEn,
  type CircuitBuilderCopy,
} from "./copy";
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
  copy: CircuitBuilderCopy,
): CircuitGraphDescriptor {
  const baseResistance = Math.max(0.1, Number(component.properties.baseResistance ?? 220));
  const environment = getCircuitEnvironment(document);
  const temperatures = sampleRange(0, 100, 51);
  const series = makeSeries(
    "thermistor-resistance",
    copy.graphs.effectiveResistance,
    "#f0ab3c",
    temperatures.map((temperatureC) => ({
      x: temperatureC,
      y: deriveThermistorResistance(baseResistance, temperatureC),
    })),
  );
  const ambientLinked = thermistorUsesAmbientTemperature(component);

  return {
    title: copy.graphs.thermistorResponse,
    xLabel: copy.graphs.temperatureAxis,
    yLabel: copy.graphs.resistanceAxis,
    summary: copy.graphs.thermistorSummary,
    description: ambientLinked
      ? copy.graphs.thermistorAmbientDescription.replace(
          "{value}",
          formatMeasurement(environment.temperatureC, "C"),
        )
      : copy.graphs.thermistorManualDescription,
    series: [series],
    marker: ambientLinked
      ? {
          label: copy.graphs.currentOperatingPoint,
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
  copy: CircuitBuilderCopy,
): CircuitGraphDescriptor {
  const baseResistance = Math.max(1, Number(component.properties.baseResistance ?? 900));
  const environment = getCircuitEnvironment(document);
  const samples = sampleRange(0, 100, 51);
  const series = makeSeries(
    "ldr-resistance",
    copy.graphs.effectiveResistance,
    "#4ea6df",
    samples.map((lightLevelPercent) => ({
      x: lightLevelPercent,
      y: deriveLdrResistance(baseResistance, lightLevelPercent),
    })),
  );
  const ambientLinked = ldrUsesAmbientLight(component);

  return {
    title: copy.graphs.ldrResponse,
    xLabel: copy.graphs.lightAxis,
    yLabel: copy.graphs.resistanceAxis,
    summary: copy.graphs.ldrSummary,
    description: ambientLinked
      ? copy.graphs.ldrAmbientDescription.replace(
          "{value}",
          String(Math.round(environment.lightLevelPercent)),
        )
      : copy.graphs.ldrManualDescription,
    series: [series],
    marker: ambientLinked
      ? {
          label: copy.graphs.currentOperatingPoint,
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
  copy: CircuitBuilderCopy,
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
    title: copy.graphs.rcTitle,
    xLabel: copy.graphs.timeAxis,
    yLabel: copy.graphs.responseAxis,
    summary: copy.graphs.rcSummary,
    description: copy.graphs.rcDescription
      .replace("{resistance}", formatMeasurement(resistiveTotal, "ohm"))
      .replace("{capacitance}", formatMeasurement(capacitance, "F"))
      .replace("{tau}", formatMeasurement(tau, "s")),
    series: [
      makeSeries(
        "capacitor-voltage",
        copy.graphs.capacitorVoltage,
        "#4ea6df",
        samples.map((time) => ({
          x: time,
          y: sourceVoltage * (1 - Math.exp(-time / tau)),
        })),
      ),
      makeSeries(
        "current-decay",
        copy.graphs.currentDecay,
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
  copy?: CircuitBuilderCopy;
}): CircuitGraphDescriptor | null {
  const component = getCircuitComponentById(input.document, input.componentId);
  if (!component) {
    return null;
  }

  const copy = input.copy ?? circuitBuilderCopyEn;

  switch (component.type) {
    case "thermistor":
      return buildThermistorGraph(input.document, component, copy);
    case "ldr":
      return buildLdrGraph(input.document, component, copy);
    case "capacitor":
      return simpleRcGraph(input.document, component, input.solveResult, copy);
    default:
      return null;
  }
}
