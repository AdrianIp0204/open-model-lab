import { formatMeasurement } from "@/lib/physics/math";
import { getCircuitComponentDefinition } from "./registry";
import {
  circuitBuilderCopyEn,
  formatCircuitStateLabel,
  type CircuitBuilderCopy,
} from "./copy";
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
  copy: CircuitBuilderCopy = circuitBuilderCopyEn,
) {
  const component = getCircuitComponentById(document, componentId);
  if (!component) {
    return copy.locale === "zh-HK"
      ? "選取元件，以連結其符號、設定和計算行為。"
      : "Select a component to connect its symbol, settings, and computed behavior.";
  }
  const environment = getCircuitEnvironment(document);

  const result = solveResult.componentResults[component.id];
  if (!result) {
    return copy.locale === "zh-HK"
      ? "此元件尚未有計算結果。"
      : "This component does not have a computed result yet.";
  }

  if (!result.sourceConnected && component.type !== "battery") {
    return copy.locale === "zh-HK"
      ? "此元件尚未位於有效電源路徑上，因此建構器未能顯示有意義的即時讀數。"
      : "This part is not on an active source path yet, so the builder cannot show a meaningful live reading.";
  }

  if (!result.comparable) {
    return copy.locale === "zh-HK"
      ? "兩個端子目前不在可比較的已求解群組中，因此電壓和電流讀數並不可靠。"
      : "The two terminals are not in a comparable solved group right now, so voltage and current readings are not reliable.";
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
        return copy.locale === "zh-HK"
          ? "目前沒有電流流過此電阻，因此它沒有產生電壓降或耗散功率。"
          : "No current is flowing through this resistor right now, so it is not dropping voltage or dissipating power.";
      }
      if (
        averageSiblingResistance !== null &&
        (result.resistance ?? 0) > averageSiblingResistance &&
        (result.voltageMagnitude ?? 0) > 0
      ) {
        return copy.locale === "zh-HK"
          ? `此電阻是有效路徑中阻值較高的元件之一；有 ${measurement(result.currentMagnitude, "A")} 流過時，它承受較大比例的電壓降，約為 ${measurement(result.voltageMagnitude, "V")}。`
          : `This resistor is one of the higher-resistance elements in the active path, so with ${measurement(
              result.currentMagnitude,
              "A",
            )} through it, it is taking a larger share of the voltage drop at ${measurement(
              result.voltageMagnitude,
              "V",
            )}.`;
      }
      return copy.locale === "zh-HK"
        ? `有 ${measurement(result.currentMagnitude, "A")} 流過時，此電阻產生 ${measurement(result.voltageMagnitude, "V")} 電壓降，並耗散 ${measurement(result.power, "W")}。`
        : `With ${measurement(
            result.currentMagnitude,
            "A",
          )} through it, this resistor is dropping ${measurement(
            result.voltageMagnitude,
            "V",
          )} and dissipating ${measurement(result.power, "W")}.`;
    case "battery":
      if (copy.locale === "zh-HK") {
        return result.currentMagnitude && result.currentMagnitude > 0
          ? `電源正推動 ${measurement(result.currentMagnitude, "A")} 流過已連接網絡，因此每個有效分支都在回應此電壓差。`
          : "電源設定電位差，但目前沒有閉合負載路徑汲取電流。";
      }
      return result.currentMagnitude && result.currentMagnitude > 0
        ? `The source is driving ${measurement(result.currentMagnitude, "A")} through the connected network, so every active branch is responding to this voltage difference.`
        : "The source sets the potential difference, but no closed load path is drawing current right now.";
    case "switch":
      if (copy.locale === "zh-HK") {
        return component.properties.closed
          ? "開關已閉合，因此此路徑近似直接連接，電流可繼續流動。"
          : "此開關已打開，因此分支被刻意斷開，電流應在此後停止。";
      }
      return component.properties.closed
        ? "The switch is closed, so this path behaves almost like a direct connection and current can keep flowing."
        : "This switch is open, so the branch is intentionally broken and current should stop past this point.";
    case "ammeter":
      return copy.locale === "zh-HK"
        ? `電流錶正直接回報分支電流：${measurement(result.current, "A")}。同一串聯分支中的元件讀數應該接近。`
        : `The ammeter is reporting the branch current directly: ${measurement(
            result.current,
            "A",
          )}. Components in the same series branch should match this reading closely.`;
    case "voltmeter":
      return copy.locale === "zh-HK"
        ? `電壓錶正在讀取兩個探針之間的電位差：${measurement(result.voltage, "V")}。`
        : `The voltmeter is reading the potential difference between its two probes: ${measurement(
            result.voltage,
            "V",
          )}.`;
    case "thermistor":
      if (copy.locale === "zh-HK") {
        return thermistorUsesAmbientTemperature(component)
          ? `目前環境溫度為 ${measurement(environment.temperatureC, "C")}，此 NTC 熱敏電阻使用 ${measurement(result.resistance, "ohm")} 的有效阻值；溫度越高通常會降低阻值並提高分支電流。`
          : `此熱敏電阻固定在 ${measurement(Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 220), "ohm")} 的手動阻值，因此頁面溫度控制目前不會改變此分支。`;
      }
      return thermistorUsesAmbientTemperature(component)
        ? `At the current ambient temperature of ${measurement(environment.temperatureC, "C")}, this NTC thermistor is using an effective resistance of ${measurement(result.resistance, "ohm")}, so warmer conditions reduce its resistance and usually raise branch current.`
        : `This thermistor is pinned to a manual resistance of ${measurement(Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 220), "ohm")}, so the page temperature control is not changing this branch right now.`;
    case "ldr":
      if (copy.locale === "zh-HK") {
        return ldrUsesAmbientLight(component)
          ? `目前光度為 ${Math.round(environment.lightLevelPercent)}%，光敏電阻使用 ${measurement(result.resistance, "ohm")}；光越強會降低阻值，通常令分支電流上升。`
          : `此光敏電阻使用 ${measurement(Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 900), "ohm")} 的手動阻值，因此頁面光度控制目前不會改變此分支。`;
      }
      return ldrUsesAmbientLight(component)
        ? `At the current light intensity of ${Math.round(environment.lightLevelPercent)}%, the LDR is using ${measurement(result.resistance, "ohm")}, so brighter light lowers its resistance and usually pushes branch current upward.`
        : `This LDR is using a manual resistance of ${measurement(Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 900), "ohm")}, so the page light control is not changing this branch right now.`;
    case "capacitor":
      return copy.locale === "zh-HK"
        ? `在直流穩態求解中，此電容像開路，因此電流為 ${measurement(result.current, "A")}，但兩板之間仍可保持 ${measurement(result.voltage, "V")}。`
        : `In the DC steady-state solve this capacitor behaves like an open circuit, so the current is ${measurement(
            result.current,
            "A",
          )} while it can still hold ${measurement(result.voltage, "V")} across its plates.`;
    case "diode":
      if (copy.locale === "zh-HK") {
        return result.stateLabel === "forward-biased"
          ? `二極管處於順向偏壓，因此正導通，約有 ${measurement(Number(component.properties.forwardDrop ?? 0.7), "V")} 壓降。`
          : "二極管正阻擋此方向，因此分支表現為開路。";
      }
      return result.stateLabel === "forward-biased"
        ? `The diode is forward-biased, so it is conducting with an approximate drop of ${measurement(Number(component.properties.forwardDrop ?? 0.7), "V")}.`
        : "The diode is blocking this direction, so the branch behaves like an open path.";
    case "fuse":
      if (copy.locale === "zh-HK") {
        return component.properties.blown
          ? "保險絲已熔斷，因此分支會保持開路直到你重設。"
          : `保險絲完好，目前承載 ${measurement(result.currentMagnitude, "A")}；但若穩態電流高於 ${measurement(Number(component.properties.rating ?? 1.5), "A")}，它會跳開。`;
      }
      return component.properties.blown
        ? "The fuse has blown, so the branch is open until you reset it."
        : `The fuse is intact and currently carrying ${measurement(result.currentMagnitude, "A")}, but it will trip if the steady-state current rises above ${measurement(Number(component.properties.rating ?? 1.5), "A")}.`;
    case "lightBulb": {
      const brightnessRatio = Number(result.extra.brightnessRatio ?? 0);
      if (copy.locale === "zh-HK") {
        return brightnessRatio >= 1
          ? "在此簡化模型中，燈泡耗散至少達到額定功率，因此會明顯發光。"
          : "在此簡化模型中，燈泡低於額定功率，因此會比標稱亮度暗。";
      }
      return brightnessRatio >= 1
        ? "The bulb is dissipating at least its rated power in this simplified model, so it would be glowing strongly."
        : "The bulb is below its rated power in this simplified model, so it would glow more dimly than its nominal rating.";
    }
    default:
      return copy.locale === "zh-HK"
        ? "此元件正在參與目前求解。"
        : "This component is participating in the current solve.";
  }
}

export function buildCircuitInspectorReadouts(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
  componentId: string,
  copy: CircuitBuilderCopy = circuitBuilderCopyEn,
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
    { label: copy.readouts.voltage, value: measurement(result.voltage, "V", copy.readouts.unavailable) },
    { label: copy.readouts.current, value: measurement(result.current, "A", copy.readouts.unavailable) },
    { label: copy.readouts.power, value: measurement(result.power, "W", copy.readouts.unavailable) },
  ];

  switch (component.type) {
    case "battery":
      return [
        { label: copy.readouts.setVoltage, value: measurement(Number(component.properties.voltage ?? 9), "V", copy.readouts.unavailable) },
        { label: copy.readouts.sourceCurrent, value: measurement(result.current, "A", copy.readouts.unavailable) },
        { label: copy.readouts.sourcePower, value: measurement(result.power, "W", copy.readouts.unavailable) },
      ];
    case "resistor":
      return [
        { label: copy.readouts.resistance, value: measurement(result.resistance, "ohm", copy.readouts.unavailable) },
        ...baseReadouts,
      ];
    case "switch":
      return [
        { label: copy.readouts.state, value: component.properties.closed ? copy.readouts.closed : copy.readouts.open },
        ...baseReadouts,
      ];
    case "ammeter":
      return [
        { label: copy.readouts.meterReading, value: measurement(result.current, "A", copy.readouts.unavailable) },
        { label: copy.readouts.voltageDrop, value: measurement(result.voltage, "V", copy.readouts.unavailable) },
      ];
    case "voltmeter":
      return [
        { label: copy.readouts.meterReading, value: measurement(result.voltage, "V", copy.readouts.unavailable) },
        { label: copy.readouts.probeCurrent, value: measurement(result.current, "A", copy.readouts.unavailable) },
      ];
    case "capacitor":
      return [
        { label: copy.readouts.capacitance, value: measurement(Number(component.properties.capacitance ?? 0.47), "F", copy.readouts.unavailable) },
        { label: copy.readouts.steadyStateVoltage, value: measurement(result.voltage, "V", copy.readouts.unavailable) },
        { label: copy.readouts.steadyStateCurrent, value: measurement(result.current, "A", copy.readouts.unavailable) },
      ];
    case "thermistor":
      return [
        { label: copy.readouts.mode, value: (getCircuitComponentModeLabel(component) === "Manual" ? copy.readouts.manual : copy.readouts.ambientLinked) },
        thermistorUsesAmbientTemperature(component)
          ? { label: copy.readouts.ambientTemperature, value: measurement(environment.temperatureC, "C", copy.readouts.unavailable) }
          : {
              label: copy.readouts.manualResistance,
              value: measurement(
                Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 220),
                "ohm",
                copy.readouts.unavailable,
              ),
            },
        { label: copy.readouts.effectiveResistance, value: measurement(result.resistance, "ohm", copy.readouts.unavailable) },
        ...baseReadouts,
      ];
    case "ldr":
      return [
        { label: copy.readouts.mode, value: (getCircuitComponentModeLabel(component) === "Manual" ? copy.readouts.manual : copy.readouts.ambientLinked) },
        ldrUsesAmbientLight(component)
          ? { label: copy.readouts.ambientLightIntensity, value: `${Math.round(environment.lightLevelPercent)}%` }
          : {
              label: copy.readouts.manualResistance,
              value: measurement(
                Number(component.properties.manualResistance ?? component.properties.baseResistance ?? 900),
                "ohm",
                copy.readouts.unavailable,
              ),
            },
        { label: copy.readouts.effectiveResistance, value: measurement(result.resistance, "ohm", copy.readouts.unavailable) },
        ...baseReadouts,
      ];
    case "fuse":
      return [
        { label: copy.readouts.rating, value: measurement(Number(component.properties.rating ?? 1.5), "A", copy.readouts.unavailable) },
        { label: copy.readouts.state, value: component.properties.blown ? copy.readouts.blown : copy.readouts.intact },
        ...baseReadouts,
      ];
    case "diode":
      return [
        { label: copy.readouts.state, value: formatCircuitStateLabel(result.stateLabel, copy) },
        { label: copy.readouts.forwardDrop, value: measurement(Number(component.properties.forwardDrop ?? 0.7), "V", copy.readouts.unavailable) },
        ...baseReadouts,
      ];
    case "lightBulb":
      return [
        { label: copy.readouts.ratedVoltage, value: measurement(Number(component.properties.ratedVoltage ?? 6), "V", copy.readouts.unavailable) },
        { label: copy.readouts.ratedPower, value: measurement(Number(component.properties.ratedPower ?? 3), "W", copy.readouts.unavailable) },
        { label: copy.readouts.equivalentResistance, value: measurement(result.resistance, "ohm", copy.readouts.unavailable) },
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
