import { createDefaultCircuitEnvironment } from "./model";
import type { CircuitDocument } from "./types";

type CircuitBuilderPreset = {
  id: string;
  label: string;
  description: string;
  buildDocument: () => CircuitDocument;
};

function cloneDocument(document: CircuitDocument): CircuitDocument {
  return JSON.parse(JSON.stringify(document)) as CircuitDocument;
}

const starterSeries: CircuitDocument = {
  version: 1,
  environment: createDefaultCircuitEnvironment(),
  view: {
    zoom: 0.78,
    offsetX: 76,
    offsetY: 92,
  },
  components: [
    {
      id: "battery-series",
      label: "Battery 1",
      type: "battery",
      x: 240,
      y: 320,
      rotation: 90,
      properties: { voltage: 9 },
    },
    {
      id: "switch-series",
      label: "Switch 1",
      type: "switch",
      x: 456,
      y: 224,
      rotation: 0,
      properties: { closed: true },
    },
    {
      id: "resistor-series",
      label: "Resistor 1",
      type: "resistor",
      x: 688,
      y: 224,
      rotation: 0,
      properties: { resistance: 12 },
    },
    {
      id: "ammeter-series",
      label: "Ammeter 1",
      type: "ammeter",
      x: 920,
      y: 224,
      rotation: 0,
      properties: {},
    },
    {
      id: "lamp-series",
      label: "Light bulb 1",
      type: "lightBulb",
      x: 1144,
      y: 224,
      rotation: 0,
      properties: {
        ratedVoltage: 6,
        ratedPower: 3,
      },
    },
  ],
  wires: [
    {
      id: "w1",
      from: { componentId: "battery-series", terminal: "a" },
      to: { componentId: "switch-series", terminal: "a" },
    },
    {
      id: "w2",
      from: { componentId: "switch-series", terminal: "b" },
      to: { componentId: "resistor-series", terminal: "a" },
    },
    {
      id: "w3",
      from: { componentId: "resistor-series", terminal: "b" },
      to: { componentId: "ammeter-series", terminal: "a" },
    },
    {
      id: "w4",
      from: { componentId: "ammeter-series", terminal: "b" },
      to: { componentId: "lamp-series", terminal: "a" },
    },
    {
      id: "w5",
      from: { componentId: "lamp-series", terminal: "b" },
      to: { componentId: "battery-series", terminal: "b" },
    },
  ],
};

const meteredBranch: CircuitDocument = {
  version: 1,
  environment: createDefaultCircuitEnvironment(),
  view: {
    zoom: 0.76,
    offsetX: 46,
    offsetY: 86,
  },
  components: [
    {
      id: "battery-branch",
      label: "Battery 1",
      type: "battery",
      x: 208,
      y: 384,
      rotation: 90,
      properties: { voltage: 12 },
    },
    {
      id: "switch-branch",
      label: "Switch 1",
      type: "switch",
      x: 456,
      y: 240,
      rotation: 0,
      properties: { closed: true },
    },
    {
      id: "resistor-branch",
      label: "Resistor 1",
      type: "resistor",
      x: 760,
      y: 176,
      rotation: 0,
      properties: { resistance: 18 },
    },
    {
      id: "ammeter-branch",
      label: "Ammeter 1",
      type: "ammeter",
      x: 1056,
      y: 176,
      rotation: 0,
      properties: {},
    },
    {
      id: "lamp-branch",
      label: "Light bulb 1",
      type: "lightBulb",
      x: 760,
      y: 368,
      rotation: 0,
      properties: { ratedVoltage: 6, ratedPower: 4 },
    },
    {
      id: "voltmeter-branch",
      label: "Voltmeter 1",
      type: "voltmeter",
      x: 1056,
      y: 368,
      rotation: 90,
      properties: {},
    },
  ],
  wires: [
    {
      id: "w1",
      from: { componentId: "battery-branch", terminal: "a" },
      to: { componentId: "switch-branch", terminal: "a" },
    },
    {
      id: "w2",
      from: { componentId: "switch-branch", terminal: "b" },
      to: { componentId: "resistor-branch", terminal: "a" },
    },
    {
      id: "w3",
      from: { componentId: "switch-branch", terminal: "b" },
      to: { componentId: "lamp-branch", terminal: "a" },
    },
    {
      id: "w4",
      from: { componentId: "resistor-branch", terminal: "b" },
      to: { componentId: "ammeter-branch", terminal: "a" },
    },
    {
      id: "w5",
      from: { componentId: "ammeter-branch", terminal: "b" },
      to: { componentId: "battery-branch", terminal: "b" },
    },
    {
      id: "w6",
      from: { componentId: "lamp-branch", terminal: "b" },
      to: { componentId: "battery-branch", terminal: "b" },
    },
    {
      id: "w7",
      from: { componentId: "voltmeter-branch", terminal: "a" },
      to: { componentId: "lamp-branch", terminal: "a" },
    },
    {
      id: "w8",
      from: { componentId: "voltmeter-branch", terminal: "b" },
      to: { componentId: "lamp-branch", terminal: "b" },
    },
  ],
};

const rcExplorer: CircuitDocument = {
  version: 1,
  environment: createDefaultCircuitEnvironment(),
  view: {
    zoom: 0.8,
    offsetX: 94,
    offsetY: 98,
  },
  components: [
    {
      id: "battery-rc",
      label: "Battery 1",
      type: "battery",
      x: 236,
      y: 352,
      rotation: 90,
      properties: { voltage: 9 },
    },
    {
      id: "switch-rc",
      label: "Switch 1",
      type: "switch",
      x: 456,
      y: 224,
      rotation: 0,
      properties: { closed: true },
    },
    {
      id: "resistor-rc",
      label: "Resistor 1",
      type: "resistor",
      x: 712,
      y: 224,
      rotation: 0,
      properties: { resistance: 22 },
    },
    {
      id: "capacitor-rc",
      label: "Capacitor 1",
      type: "capacitor",
      x: 980,
      y: 224,
      rotation: 90,
      properties: { capacitance: 0.47 },
    },
    {
      id: "voltmeter-rc",
      label: "Voltmeter 1",
      type: "voltmeter",
      x: 1220,
      y: 224,
      rotation: 90,
      properties: {},
    },
  ],
  wires: [
    {
      id: "w1",
      from: { componentId: "battery-rc", terminal: "a" },
      to: { componentId: "switch-rc", terminal: "a" },
    },
    {
      id: "w2",
      from: { componentId: "switch-rc", terminal: "b" },
      to: { componentId: "resistor-rc", terminal: "a" },
    },
    {
      id: "w3",
      from: { componentId: "resistor-rc", terminal: "b" },
      to: { componentId: "capacitor-rc", terminal: "a" },
    },
    {
      id: "w4",
      from: { componentId: "capacitor-rc", terminal: "b" },
      to: { componentId: "battery-rc", terminal: "b" },
    },
    {
      id: "w5",
      from: { componentId: "voltmeter-rc", terminal: "a" },
      to: { componentId: "capacitor-rc", terminal: "a" },
    },
    {
      id: "w6",
      from: { componentId: "voltmeter-rc", terminal: "b" },
      to: { componentId: "capacitor-rc", terminal: "b" },
    },
  ],
};

const thermistorExplorer: CircuitDocument = {
  version: 1,
  environment: {
    ...createDefaultCircuitEnvironment(),
    temperatureC: 20,
  },
  view: {
    zoom: 0.78,
    offsetX: 72,
    offsetY: 94,
  },
  components: [
    {
      id: "battery-therm",
      label: "Battery 1",
      type: "battery",
      x: 220,
      y: 320,
      rotation: 90,
      properties: { voltage: 9 },
    },
    {
      id: "ammeter-therm",
      label: "Ammeter 1",
      type: "ammeter",
      x: 472,
      y: 224,
      rotation: 0,
      properties: {},
    },
    {
      id: "thermistor-therm",
      label: "Thermistor 1",
      type: "thermistor",
      x: 744,
      y: 224,
      rotation: 0,
      properties: {
        baseResistance: 220,
        manualResistance: 220,
        useAmbientTemperature: true,
      },
    },
    {
      id: "lamp-therm",
      label: "Light bulb 1",
      type: "lightBulb",
      x: 1012,
      y: 224,
      rotation: 0,
      properties: {
        ratedVoltage: 6,
        ratedPower: 3,
      },
    },
  ],
  wires: [
    {
      id: "w1",
      from: { componentId: "battery-therm", terminal: "a" },
      to: { componentId: "ammeter-therm", terminal: "a" },
    },
    {
      id: "w2",
      from: { componentId: "ammeter-therm", terminal: "b" },
      to: { componentId: "thermistor-therm", terminal: "a" },
    },
    {
      id: "w3",
      from: { componentId: "thermistor-therm", terminal: "b" },
      to: { componentId: "lamp-therm", terminal: "a" },
    },
    {
      id: "w4",
      from: { componentId: "lamp-therm", terminal: "b" },
      to: { componentId: "battery-therm", terminal: "b" },
    },
  ],
};

const ldrExplorer: CircuitDocument = {
  version: 1,
  environment: {
    ...createDefaultCircuitEnvironment(),
    lightLevelPercent: 20,
  },
  view: {
    zoom: 0.78,
    offsetX: 72,
    offsetY: 94,
  },
  components: [
    {
      id: "battery-ldr",
      label: "Battery 1",
      type: "battery",
      x: 220,
      y: 320,
      rotation: 90,
      properties: { voltage: 9 },
    },
    {
      id: "ammeter-ldr",
      label: "Ammeter 1",
      type: "ammeter",
      x: 472,
      y: 224,
      rotation: 0,
      properties: {},
    },
    {
      id: "ldr-part",
      label: "Light-dependent resistor 1",
      type: "ldr",
      x: 744,
      y: 224,
      rotation: 0,
      properties: {
        baseResistance: 900,
        manualResistance: 420,
        useAmbientLight: true,
      },
    },
    {
      id: "lamp-ldr",
      label: "Light bulb 1",
      type: "lightBulb",
      x: 1012,
      y: 224,
      rotation: 0,
      properties: {
        ratedVoltage: 6,
        ratedPower: 3,
      },
    },
  ],
  wires: [
    {
      id: "w1",
      from: { componentId: "battery-ldr", terminal: "a" },
      to: { componentId: "ammeter-ldr", terminal: "a" },
    },
    {
      id: "w2",
      from: { componentId: "ammeter-ldr", terminal: "b" },
      to: { componentId: "ldr-part", terminal: "a" },
    },
    {
      id: "w3",
      from: { componentId: "ldr-part", terminal: "b" },
      to: { componentId: "lamp-ldr", terminal: "a" },
    },
    {
      id: "w4",
      from: { componentId: "lamp-ldr", terminal: "b" },
      to: { componentId: "battery-ldr", terminal: "b" },
    },
  ],
};

export const circuitBuilderPresets = [
  {
    id: "starter-series",
    label: "Starter series loop",
    description:
      "A single loop with a switch, resistor, ammeter, and lamp for first current and voltage-drop checks.",
    buildDocument() {
      return cloneDocument(starterSeries);
    },
  },
  {
    id: "metered-branch",
    label: "Metered branch circuit",
    description:
      "A branched circuit with a resistor branch, a lamp branch, an ammeter, and a voltmeter across the lamp.",
    buildDocument() {
      return cloneDocument(meteredBranch);
    },
  },
  {
    id: "rc-explorer",
    label: "Simple RC explorer",
    description:
      "A single-source resistor-capacitor loop for steady-state reasoning plus a simple transient graph in the inspector.",
    buildDocument() {
      return cloneDocument(rcExplorer);
    },
  },
  {
    id: "thermistor-explorer",
    label: "Thermistor temperature explorer",
    description:
      "A simple series loop with an ammeter and bulb so temperature-linked thermistor resistance is easy to observe.",
    buildDocument() {
      return cloneDocument(thermistorExplorer);
    },
  },
  {
    id: "ldr-explorer",
    label: "LDR light explorer",
    description:
      "A simple series loop with an ammeter and bulb so light-linked LDR resistance is easy to observe.",
    buildDocument() {
      return cloneDocument(ldrExplorer);
    },
  },
] satisfies CircuitBuilderPreset[];
