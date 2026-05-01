import type {
  CircuitComponentDefinition,
  CircuitComponentInstance,
  CircuitEditableField,
  CircuitComponentType,
  CircuitPaletteEntry,
  CircuitPaletteItemType,
} from "./types";

const componentDefinitions: Record<CircuitComponentType, CircuitComponentDefinition> = {
  ammeter: {
    type: "ammeter",
    label: "Ammeter",
    shortLabel: "A",
    symbolLabel: "Ammeter symbol",
    summary: "Measures the current flowing through the branch it sits in.",
    symbolMeaning:
      "The circle with an A marks a current meter inserted directly into a path.",
    behavior:
      "In this builder the ammeter uses a very small internal resistance so it reports branch current without dominating the circuit.",
    notice:
      "Compare the ammeter reading with nearby series components. In one branch they should agree.",
    simplification:
      "Modelled as a near-zero-resistance series meter for solver stability.",
    defaults: {},
    inspectorFields: [],
    terminalLabels: {
      a: "entry terminal",
      b: "exit terminal",
    },
  },
  battery: {
    type: "battery",
    label: "Battery",
    shortLabel: "V",
    symbolLabel: "Battery symbol",
    summary: "Provides a fixed DC voltage difference between its terminals.",
    symbolMeaning:
      "The longer and shorter plates mark the positive and negative terminals of the source.",
    behavior:
      "An ideal source holds its voltage even when the rest of the circuit changes, so branch currents adjust around it.",
    notice:
      "Watch how changing source voltage scales current, power, and meter readings everywhere in the connected network.",
    simplification: "Modelled as an ideal DC voltage source.",
    defaults: {
      voltage: 9,
    },
    inspectorFields: [
      {
        key: "voltage",
        label: "Voltage",
        type: "number",
        min: 1,
        max: 24,
        step: 0.5,
        suffix: "V",
        help: "Ideal source voltage across the positive and negative terminals.",
      },
    ],
    terminalLabels: {
      a: "positive terminal",
      b: "negative terminal",
    },
  },
  capacitor: {
    type: "capacitor",
    label: "Capacitor",
    shortLabel: "C",
    symbolLabel: "Capacitor symbol",
    summary: "Stores charge and builds a voltage difference across two plates.",
    symbolMeaning:
      "The two parallel plates show charge collecting on separated conductors.",
    behavior:
      "For this v1 DC solver the capacitor behaves like an open circuit after it has settled, while the inspector can still show a simple RC charging curve when the surrounding circuit is simple enough.",
    notice:
      "Steady-state current falls to zero, but the capacitor can still hold a voltage difference.",
    simplification:
      "Modelled as an open circuit in DC steady state; RC graph support is limited to simple one-source cases.",
    defaults: {
      capacitance: 0.47,
    },
    inspectorFields: [
      {
        key: "capacitance",
        label: "Capacitance",
        type: "number",
        min: 0.01,
        max: 10,
        step: 0.01,
        suffix: "F",
        help: "Capacitance used when a simple RC response graph is available.",
      },
    ],
    terminalLabels: {
      a: "plate A",
      b: "plate B",
    },
  },
  diode: {
    type: "diode",
    label: "Diode",
    shortLabel: "D",
    symbolLabel: "Diode symbol",
    summary: "Favours current in one direction and blocks it in the other.",
    symbolMeaning:
      "The triangle-and-bar style mark shows the preferred current direction and the blocking side.",
    behavior:
      "The solver flips the diode between an open state and a forward-biased state with a fixed threshold drop.",
    notice:
      "Reverse the polarity or rotate the diode and the branch may stop conducting entirely.",
    simplification:
      "Uses a piecewise linear threshold model instead of a full nonlinear diode equation.",
    defaults: {
      forwardDrop: 0.7,
    },
    inspectorFields: [
      {
        key: "forwardDrop",
        label: "Forward drop",
        type: "number",
        min: 0.1,
        max: 1.2,
        step: 0.05,
        suffix: "V",
        help: "Approximate voltage lost across the diode when forward-biased.",
      },
    ],
    terminalLabels: {
      a: "anode",
      b: "cathode",
    },
  },
  fuse: {
    type: "fuse",
    label: "Fuse",
    shortLabel: "F",
    symbolLabel: "Fuse symbol",
    summary: "Protects a branch by opening when current rises above its rating.",
    symbolMeaning:
      "The small fuse body marks a sacrificial protective element in series with a branch.",
    behavior:
      "When branch current exceeds the rating, the fuse is marked as blown and opens the branch until you reset it.",
    notice:
      "High-current faults can look fine for one solve pass and then trip the fuse on the next recompute.",
    simplification:
      "Trips instantly once the steady-state current exceeds the current rating.",
    defaults: {
      rating: 1.5,
      blown: false,
    },
    inspectorFields: [
      {
        key: "rating",
        label: "Current rating",
        type: "number",
        min: 0.1,
        max: 10,
        step: 0.1,
        suffix: "A",
        help: "Steady-state current above this value will blow the fuse.",
      },
    ],
    terminalLabels: {
      a: "entry terminal",
      b: "exit terminal",
    },
  },
  ldr: {
    type: "ldr",
    label: "Light-dependent resistor",
    shortLabel: "LDR",
    symbolLabel: "LDR symbol",
    summary: "Changes resistance as light intensity changes.",
    symbolMeaning:
      "A resistor with incoming arrows marks a component whose resistance depends on light falling on it.",
    behavior:
      "More light lowers the effective resistance, so the branch current usually increases.",
    notice:
      "Track the derived resistance in the inspector and compare how the branch current changes with light level.",
    simplification:
      "Modelled as a variable resistor driven by a simple light-level curve.",
    defaults: {
      baseResistance: 900,
      manualResistance: 420,
      useAmbientLight: true,
    },
    inspectorFields: [],
    terminalLabels: {
      a: "terminal A",
      b: "terminal B",
    },
  },
  lightBulb: {
    type: "lightBulb",
    label: "Light bulb",
    shortLabel: "Lamp",
    symbolLabel: "Lamp symbol",
    summary: "Turns electrical power into light and heat.",
    symbolMeaning:
      "The circle with a filament marks a lamp used as a visible load in the circuit.",
    behavior:
      "Here the bulb is treated as a resistive load derived from its rated voltage and power.",
    notice:
      "Compare electrical power with the rated power to estimate how brightly the lamp would glow.",
    simplification:
      "Real bulbs are nonlinear; v1 treats them as resistive loads using the rated values.",
    defaults: {
      ratedVoltage: 6,
      ratedPower: 3,
    },
    inspectorFields: [
      {
        key: "ratedVoltage",
        label: "Rated voltage",
        type: "number",
        min: 1,
        max: 24,
        step: 0.5,
        suffix: "V",
        help: "Used with the rated power to derive the bulb's equivalent resistance.",
      },
      {
        key: "ratedPower",
        label: "Rated power",
        type: "number",
        min: 0.1,
        max: 30,
        step: 0.1,
        suffix: "W",
        help: "Higher rated power lowers the bulb's equivalent resistance at the same rated voltage.",
      },
    ],
    terminalLabels: {
      a: "terminal A",
      b: "terminal B",
    },
  },
  resistor: {
    type: "resistor",
    label: "Resistor",
    shortLabel: "R",
    symbolLabel: "Resistor symbol",
    summary: "Limits current and creates voltage drops in a controlled way.",
    symbolMeaning:
      "The zig-zag or block symbol marks a component whose main role is electrical resistance.",
    behavior:
      "With current flowing, the resistor drops voltage and dissipates power as heat.",
    notice:
      "Higher resistance in an active branch usually means less current and a larger share of the voltage drop.",
    simplification: "Modelled as an ideal linear resistor.",
    defaults: {
      resistance: 12,
    },
    inspectorFields: [
      {
        key: "resistance",
        label: "Resistance",
        type: "number",
        min: 0.1,
        max: 5000,
        step: 0.1,
        suffix: "ohm",
        help: "Resistance used directly by the DC solver.",
      },
    ],
    terminalLabels: {
      a: "terminal A",
      b: "terminal B",
    },
  },
  switch: {
    type: "switch",
    label: "Switch",
    shortLabel: "S",
    symbolLabel: "Switch symbol",
    summary: "Lets you open or close a path deliberately.",
    symbolMeaning:
      "The break in the line shows a path that can be closed or left open.",
    behavior:
      "A closed switch behaves like a very small resistance; an open switch disconnects the branch.",
    notice:
      "If the switch is open, the branch current should drop to zero and downstream voltage patterns may change.",
    simplification:
      "Closed switches use a very small resistance and open switches are treated as an open circuit.",
    defaults: {
      closed: true,
    },
    inspectorFields: [
      {
        key: "closed",
        label: "Closed",
        type: "boolean",
        help: "Closed connects the branch. Open disconnects it.",
      },
    ],
    terminalLabels: {
      a: "input terminal",
      b: "output terminal",
    },
  },
  thermistor: {
    type: "thermistor",
    label: "Thermistor",
    shortLabel: "TH",
    symbolLabel: "Thermistor symbol",
    summary: "Changes resistance when temperature changes.",
    symbolMeaning:
      "A resistor crossed by a temperature mark shows a resistance that depends on heat.",
    behavior:
      "This v1 model is an NTC thermistor, so hotter temperatures reduce the effective resistance.",
    notice:
      "Raising the temperature usually lowers branch resistance and raises current in the active path.",
    simplification:
      "Modelled as a variable resistor driven by a simple NTC-style temperature curve.",
    defaults: {
      baseResistance: 220,
      manualResistance: 220,
      useAmbientTemperature: true,
    },
    inspectorFields: [],
    terminalLabels: {
      a: "terminal A",
      b: "terminal B",
    },
  },
  voltmeter: {
    type: "voltmeter",
    label: "Voltmeter",
    shortLabel: "V",
    symbolLabel: "Voltmeter symbol",
    summary: "Measures the potential difference between two nodes.",
    symbolMeaning:
      "The circle with a V marks a voltage meter placed across a pair of nodes or a component.",
    behavior:
      "The voltmeter uses a very large internal resistance so it samples voltage while drawing very little current.",
    notice:
      "Place it across a component or branch to compare the node potentials on each side.",
    simplification:
      "Modelled as a very high resistance meter rather than an ideal infinite-resistance probe.",
    defaults: {},
    inspectorFields: [],
    terminalLabels: {
      a: "positive probe",
      b: "negative probe",
    },
  },
};

export const circuitComponentDefinitions = componentDefinitions;

const paletteSearchKeywords: Record<CircuitPaletteItemType, string[]> = {
  ammeter: ["current meter", "amp meter", "current"],
  battery: ["power supply", "power source", "voltage source", "cell", "source", "power"],
  capacitor: ["capacitance", "cap"],
  diode: ["rectifier", "forward bias", "reverse bias"],
  fuse: ["protection", "overcurrent"],
  ldr: ["ldr", "light dependent resistor", "photoresistor", "light sensor"],
  lightBulb: ["bulb", "lamp", "light"],
  resistor: ["resistance", "ohm"],
  switch: ["open", "closed", "toggle"],
  thermistor: ["temperature sensor", "ntc", "ptc"],
  voltmeter: ["voltage meter", "voltage"],
  wire: ["wire", "wire tool", "connect", "connection", "lead"],
};

export const circuitPaletteEntries: CircuitPaletteEntry[] = [
  {
    type: "wire",
    label: "Wire tool",
    shortLabel: "Wire",
    symbolLabel: "Wire symbol",
    summary: "Connect two terminals and collapse them into the same electrical node.",
    behavior:
      "Use the wire tool to start a connection, then click two terminals in the workspace.",
    searchTerms: [
      "wire tool",
      "wire",
      "connect two terminals and collapse them into the same electrical node",
      ...paletteSearchKeywords.wire,
    ],
    kind: "tool",
  },
  ...(
    [
      "ammeter",
      "voltmeter",
      "resistor",
      "switch",
      "lightBulb",
      "diode",
      "battery",
      "capacitor",
      "thermistor",
      "ldr",
      "fuse",
    ] as const
  ).map((type) => {
    const definition = componentDefinitions[type];
      return {
        type,
        label: definition.label,
        shortLabel: definition.shortLabel,
        symbolLabel: definition.symbolLabel,
        summary: definition.summary,
        behavior: definition.behavior,
        searchTerms: [
          definition.label,
          definition.shortLabel,
          definition.summary,
          ...paletteSearchKeywords[type],
        ],
        kind: "component" as const,
      };
    }),
];

export function getCircuitComponentDefinition(type: CircuitComponentType) {
  return componentDefinitions[type];
}

export function getCircuitInspectorFields(
  component: CircuitComponentInstance,
): CircuitEditableField[] {
  if (component.type === "thermistor") {
    const useAmbient = Boolean(component.properties.useAmbientTemperature ?? true);
    return [
      {
        key: "useAmbientTemperature",
        label: "Ambient-linked",
        type: "boolean",
        help: "Use the page temperature control to drive the NTC resistance curve.",
      },
      useAmbient
        ? {
            key: "baseResistance",
            label: "Reference resistance",
            type: "number",
            min: 1,
            max: 5000,
            step: 1,
            suffix: "ohm",
            help: "Reference resistance at 25 C for the simplified ambient curve.",
          }
        : {
            key: "manualResistance",
            label: "Manual resistance",
            type: "number",
            min: 0.2,
            max: 5000,
            step: 1,
            suffix: "ohm",
            help: "Fixed resistance used while ambient-linked mode is off.",
          },
    ];
  }

  if (component.type === "ldr") {
    const useAmbient = Boolean(component.properties.useAmbientLight ?? true);
    return [
      {
        key: "useAmbientLight",
        label: "Ambient-linked",
        type: "boolean",
        help: "Use the page light intensity control to drive the simplified LDR curve.",
      },
      useAmbient
        ? {
            key: "baseResistance",
            label: "Reference dark resistance",
            type: "number",
            min: 50,
            max: 5000,
            step: 10,
            suffix: "ohm",
            help: "Reference resistance used when the page light level is near zero.",
          }
        : {
            key: "manualResistance",
            label: "Manual resistance",
            type: "number",
            min: 5,
            max: 5000,
            step: 10,
            suffix: "ohm",
            help: "Fixed resistance used while ambient-linked mode is off.",
          },
    ];
  }

  return componentDefinitions[component.type].inspectorFields;
}
