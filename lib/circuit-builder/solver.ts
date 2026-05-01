import { clamp } from "@/lib/physics/math";
import {
  deriveComponentResistance,
  getAmbientDrivenComponentInput,
  getCircuitComponentModeLabel,
  getCircuitEnvironment,
} from "./model";
import type {
  CircuitComponentInstance,
  CircuitComponentResult,
  CircuitDocument,
  CircuitIssue,
  CircuitNodeResult,
  CircuitSolveResult,
  CircuitTerminalRef,
} from "./types";

const LARGE_OPEN_RESISTANCE = 1_000_000_000;
const DIODE_ON_RESISTANCE = 0.0001;
const SHORT_SOURCE_CURRENT_THRESHOLD = 40;

class UnionFind {
  private readonly parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
    }
  }

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent === id) {
      this.parent.set(id, id);
      return id;
    }
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

type ProcessedNode = {
  id: string;
  terminalRefs: CircuitTerminalRef[];
};

type ComponentStamp =
  | {
      kind: "source";
      voltage: number;
      stateLabel: string;
    }
  | {
      kind: "resistor";
      resistance: number;
      voltageOffset: number;
      stateLabel: string;
    }
  | {
      kind: "open";
      stateLabel: string;
    };

type ProcessedComponent = {
  component: CircuitComponentInstance;
  nodeA: string;
  nodeB: string;
  stamp: ComponentStamp;
  meta: Record<string, boolean | number | string | null>;
};

function normalizeMeta(source: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value ?? null]),
  ) as Record<string, boolean | number | string | null>;
}

type GroupSolution = {
  nodeVoltages: Map<string, number>;
  sourceCurrents: Map<string, number>;
};

function terminalRefKey(ref: CircuitTerminalRef) {
  return `${ref.componentId}:${ref.terminal}`;
}

function buildProcessedNodes(document: CircuitDocument) {
  const unionFind = new UnionFind();

  document.components.forEach((component) => {
    unionFind.add(terminalRefKey({ componentId: component.id, terminal: "a" }));
    unionFind.add(terminalRefKey({ componentId: component.id, terminal: "b" }));
  });

  document.wires.forEach((wire) => {
    unionFind.union(terminalRefKey(wire.from), terminalRefKey(wire.to));
  });

  const nodesByRoot = new Map<string, ProcessedNode>();

  document.components.forEach((component) => {
    (["a", "b"] as const).forEach((terminal) => {
      const ref = { componentId: component.id, terminal };
      const root = unionFind.find(terminalRefKey(ref));
      const existing = nodesByRoot.get(root);

      if (existing) {
        existing.terminalRefs.push(ref);
        return;
      }

      nodesByRoot.set(root, {
        id: `node-${nodesByRoot.size + 1}`,
        terminalRefs: [ref],
      });
    });
  });

  const nodeIdByTerminal = new Map<string, string>();

  Array.from(nodesByRoot.values()).forEach((node) => {
    node.terminalRefs.forEach((ref) => {
      nodeIdByTerminal.set(terminalRefKey(ref), node.id);
    });
  });

  return {
    nodes: Array.from(nodesByRoot.values()),
    nodeIdByTerminal,
  };
}

function resolveComponentStamp(
  component: CircuitComponentInstance,
  diodeOn: boolean,
  environment: CircuitDocument["environment"],
) {
  const properties = component.properties;

  switch (component.type) {
    case "battery":
      return {
        stamp: {
          kind: "source",
          voltage: Math.max(0, Number(properties.voltage ?? 9)),
          stateLabel: "ideal source",
        } satisfies ComponentStamp,
        meta: {},
      };
    case "switch":
      return properties.closed
        ? {
            stamp: {
              kind: "resistor",
              resistance: 0.02,
              voltageOffset: 0,
              stateLabel: "closed",
            } satisfies ComponentStamp,
            meta: { closed: true },
          }
        : {
            stamp: {
              kind: "open",
              stateLabel: "open",
            } satisfies ComponentStamp,
            meta: { closed: false },
          };
    case "capacitor":
      return {
        stamp: {
          kind: "open",
          stateLabel: "steady-state open",
        } satisfies ComponentStamp,
        meta: {
          capacitance: Number(properties.capacitance ?? 0.47),
        },
      };
    case "diode": {
      const forwardDrop = clamp(Number(properties.forwardDrop ?? 0.7), 0.1, 1.2);
      return diodeOn
        ? {
            stamp: {
              kind: "resistor",
              resistance: DIODE_ON_RESISTANCE,
              voltageOffset: forwardDrop,
              stateLabel: "forward-biased",
            } satisfies ComponentStamp,
            meta: {
              diodeState: "forward-biased",
              forwardDrop,
            },
          }
        : {
            stamp: {
              kind: "open",
              stateLabel: "blocking",
            } satisfies ComponentStamp,
            meta: {
              diodeState: "blocking",
              forwardDrop,
            },
          };
    }
    case "fuse":
      return properties.blown
        ? {
            stamp: {
              kind: "open",
              stateLabel: "blown",
            } satisfies ComponentStamp,
            meta: {
              blown: true,
              rating: Number(properties.rating ?? 1.5),
            },
          }
        : {
            stamp: {
              kind: "resistor",
              resistance: 0.02,
              voltageOffset: 0,
              stateLabel: "intact",
            } satisfies ComponentStamp,
            meta: {
              blown: false,
              rating: Number(properties.rating ?? 1.5),
            },
          };
    default:
      return {
        stamp: {
          kind: "resistor",
          resistance: Math.max(
            0.001,
            deriveComponentResistance(component, environment) ?? LARGE_OPEN_RESISTANCE,
          ),
          voltageOffset: 0,
          stateLabel:
            component.type === "ammeter"
              ? "measuring current"
              : component.type === "voltmeter"
                ? "measuring potential difference"
                : "active",
        } satisfies ComponentStamp,
        meta: {},
      };
  }
}

function buildProcessedComponents(
  document: CircuitDocument,
  nodeIdByTerminal: Map<string, string>,
  diodeStates: Map<string, boolean>,
) {
  const environment = getCircuitEnvironment(document);

  return document.components.map((component) => {
    const nodeA = nodeIdByTerminal.get(`${component.id}:a`);
    const nodeB = nodeIdByTerminal.get(`${component.id}:b`);

    if (!nodeA || !nodeB) {
      throw new Error(`Missing node mapping for ${component.id}.`);
    }

    const resolved = resolveComponentStamp(
      component,
      diodeStates.get(component.id) ?? false,
      environment,
    );

    const ambientInput = getAmbientDrivenComponentInput(component, environment);
    const derivedResistance = deriveComponentResistance(component, environment);

    return {
      component,
      nodeA,
      nodeB,
      stamp: resolved.stamp,
      meta: normalizeMeta({
        ...resolved.meta,
        derivedResistance,
        modeLabel: getCircuitComponentModeLabel(component),
        ambientInputKind: ambientInput?.kind ?? null,
        ambientInputValue: ambientInput?.value ?? null,
      }),
    } satisfies ProcessedComponent;
  });
}

function buildConductiveGroups(components: ProcessedComponent[]) {
  const groupUnion = new UnionFind();

  components.forEach((component) => {
    groupUnion.add(component.nodeA);
    groupUnion.add(component.nodeB);
    if (component.stamp.kind !== "open") {
      groupUnion.union(component.nodeA, component.nodeB);
    }
  });

  const groups = new Map<string, Set<string>>();
  components.forEach((component) => {
    [component.nodeA, component.nodeB].forEach((nodeId) => {
      const root = groupUnion.find(nodeId);
      const existing = groups.get(root) ?? new Set<string>();
      existing.add(nodeId);
      groups.set(root, existing);
    });
  });

  const groupIdByNode = new Map<string, string>();
  Array.from(groups.values()).forEach((nodes, index) => {
    const groupId = `group-${index + 1}`;
    nodes.forEach((nodeId) => {
      groupIdByNode.set(nodeId, groupId);
    });
  });

  return {
    groups: Array.from(groups.values()).map((nodes, index) => ({
      id: `group-${index + 1}`,
      nodeIds: Array.from(nodes),
    })),
    groupIdByNode,
  };
}

function createMatrix(size: number) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function solveLinearSystem(matrix: number[][], values: number[]) {
  const size = values.length;
  const a = matrix.map((row) => row.slice());
  const b = values.slice();

  for (let pivot = 0; pivot < size; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(a[row][pivot]) > Math.abs(a[bestRow][pivot])) {
        bestRow = row;
      }
    }

    if (Math.abs(a[bestRow][pivot]) < 1e-9) {
      return null;
    }

    if (bestRow !== pivot) {
      [a[pivot], a[bestRow]] = [a[bestRow], a[pivot]];
      [b[pivot], b[bestRow]] = [b[bestRow], b[pivot]];
    }

    const pivotValue = a[pivot][pivot];
    for (let column = pivot; column < size; column += 1) {
      a[pivot][column] /= pivotValue;
    }
    b[pivot] /= pivotValue;

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }
      const factor = a[row][pivot];
      if (Math.abs(factor) < 1e-12) {
        continue;
      }
      for (let column = pivot; column < size; column += 1) {
        a[row][column] -= factor * a[pivot][column];
      }
      b[row] -= factor * b[pivot];
    }
  }

  return b;
}

function solveGroup(
  groupNodeIds: string[],
  groupComponents: ProcessedComponent[],
) {
  if (groupNodeIds.length === 0) {
    return {
      ok: true,
      solution: {
        nodeVoltages: new Map<string, number>(),
        sourceCurrents: new Map<string, number>(),
      } satisfies GroupSolution,
    } as const;
  }

  const voltageSources = groupComponents.filter(
    (component) => component.stamp.kind === "source",
  );
  const groundId = voltageSources[0]?.nodeB ?? groupNodeIds[0];
  const variableNodeIds = groupNodeIds.filter((nodeId) => nodeId !== groundId);
  const nodeIndex = new Map(variableNodeIds.map((nodeId, index) => [nodeId, index]));
  const sourceIndex = new Map(
    voltageSources.map((component, index) => [
      component.component.id,
      variableNodeIds.length + index,
    ]),
  );
  const size = variableNodeIds.length + voltageSources.length;

  if (size === 0) {
    return {
      ok: true,
      solution: {
        nodeVoltages: new Map([[groundId, 0]]),
        sourceCurrents: new Map<string, number>(),
      } satisfies GroupSolution,
    } as const;
  }

  const matrix = createMatrix(size);
  const rhs = Array.from({ length: size }, () => 0);

  groupComponents.forEach((component) => {
    const aIndex = nodeIndex.get(component.nodeA);
    const bIndex = nodeIndex.get(component.nodeB);

    if (component.stamp.kind === "resistor") {
      const conductance = 1 / Math.max(component.stamp.resistance, 1e-6);
      if (aIndex !== undefined) {
        matrix[aIndex][aIndex] += conductance;
      }
      if (bIndex !== undefined) {
        matrix[bIndex][bIndex] += conductance;
      }
      if (aIndex !== undefined && bIndex !== undefined) {
        matrix[aIndex][bIndex] -= conductance;
        matrix[bIndex][aIndex] -= conductance;
      }
      if (component.stamp.voltageOffset !== 0) {
        if (aIndex !== undefined) {
          rhs[aIndex] += conductance * component.stamp.voltageOffset;
        }
        if (bIndex !== undefined) {
          rhs[bIndex] -= conductance * component.stamp.voltageOffset;
        }
      }
      return;
    }

    if (component.stamp.kind === "source") {
      const currentIndex = sourceIndex.get(component.component.id);
      if (currentIndex === undefined) {
        return;
      }
      if (aIndex !== undefined) {
        matrix[aIndex][currentIndex] += 1;
        matrix[currentIndex][aIndex] += 1;
      }
      if (bIndex !== undefined) {
        matrix[bIndex][currentIndex] -= 1;
        matrix[currentIndex][bIndex] -= 1;
      }
      rhs[currentIndex] += component.stamp.voltage;
    }
  });

  const solved = solveLinearSystem(matrix, rhs);
  if (!solved) {
    return {
      ok: false,
      reason: "The modified nodal solver became singular for one connected group.",
    } as const;
  }

  const nodeVoltages = new Map<string, number>([[groundId, 0]]);
  variableNodeIds.forEach((nodeId, index) => {
    nodeVoltages.set(nodeId, solved[index] ?? 0);
  });
  const sourceCurrents = new Map<string, number>();
  voltageSources.forEach((component, index) => {
    sourceCurrents.set(
      component.component.id,
      solved[variableNodeIds.length + index] ?? 0,
    );
  });

  return {
    ok: true,
    solution: {
      nodeVoltages,
      sourceCurrents,
    } satisfies GroupSolution,
  } as const;
}

function buildComparableVoltageLookup(
  groups: ReturnType<typeof buildConductiveGroups>,
  groupSolutions: Map<string, GroupSolution>,
) {
  const nodeVoltages = new Map<string, number | null>();

  groups.groups.forEach((group) => {
    const solution = groupSolutions.get(group.id);
    group.nodeIds.forEach((nodeId) => {
      nodeVoltages.set(nodeId, solution?.nodeVoltages.get(nodeId) ?? 0);
    });
  });

  return nodeVoltages;
}

function componentSourceConnected(
  nodeA: string,
  nodeB: string,
  sourceConnectedGroups: Set<string>,
  groupIdByNode: Map<string, string>,
) {
  return (
    sourceConnectedGroups.has(groupIdByNode.get(nodeA) ?? "") ||
    sourceConnectedGroups.has(groupIdByNode.get(nodeB) ?? "")
  );
}

function buildNodeResults(
  nodes: ProcessedNode[],
  groupIdByNode: Map<string, string>,
  sourceConnectedGroups: Set<string>,
  comparableVoltages: Map<string, number | null>,
) {
  return nodes.reduce<Record<string, CircuitNodeResult>>((accumulator, node) => {
    const groupId = groupIdByNode.get(node.id) ?? null;
    accumulator[node.id] = {
      id: node.id,
      voltage: groupId ? comparableVoltages.get(node.id) ?? 0 : null,
      comparable: Boolean(groupId),
      sourceConnected: groupId ? sourceConnectedGroups.has(groupId) : false,
      terminalRefs: node.terminalRefs,
    };
    return accumulator;
  }, {});
}

function componentExtra(
  component: CircuitComponentInstance,
  meta: Record<string, boolean | number | string | null>,
  power: number | null,
) {
  switch (component.type) {
    case "lightBulb": {
      const ratedPower = Math.max(0.1, Number(component.properties.ratedPower ?? 3));
      return {
        ...meta,
        brightnessRatio: power === null ? null : Math.max(0, power) / ratedPower,
      };
    }
    case "thermistor":
      return {
        ...meta,
        modeLabel: meta.modeLabel ?? null,
        temperatureC:
          meta.ambientInputKind === "temperature"
            ? Number(meta.ambientInputValue ?? 25)
            : null,
      };
    case "ldr":
      return {
        ...meta,
        modeLabel: meta.modeLabel ?? null,
        lightLevelPercent:
          meta.ambientInputKind === "light"
            ? Number(meta.ambientInputValue ?? 35)
            : null,
      };
    case "capacitor":
      return {
        ...meta,
        capacitance: Number(component.properties.capacitance ?? 0.47),
      };
    default:
      return meta;
  }
}

function buildComponentResults(
  processedComponents: ProcessedComponent[],
  groupIdByNode: Map<string, string>,
  groupSolutions: Map<string, GroupSolution>,
  sourceConnectedGroups: Set<string>,
) {
  return processedComponents.reduce<Record<string, CircuitComponentResult>>(
    (accumulator, processed) => {
      const groupA = groupIdByNode.get(processed.nodeA) ?? null;
      const groupB = groupIdByNode.get(processed.nodeB) ?? null;
      const comparable = Boolean(groupA && groupB && groupA === groupB);
      const solution = comparable && groupA ? groupSolutions.get(groupA) ?? null : null;
      const voltageA = solution?.nodeVoltages.get(processed.nodeA) ?? 0;
      const voltageB = solution?.nodeVoltages.get(processed.nodeB) ?? 0;
      const voltage = comparable ? voltageA - voltageB : null;
      let current: number | null = null;
      let power: number | null = null;

      if (processed.stamp.kind === "source") {
        current =
          groupA ? groupSolutions.get(groupA)?.sourceCurrents.get(processed.component.id) ?? 0 : null;
        power = current !== null && voltage !== null ? voltage * current : null;
      } else if (processed.stamp.kind === "resistor") {
        if (voltage !== null) {
          current = (voltage - processed.stamp.voltageOffset) / processed.stamp.resistance;
          power = voltage * current;
        }
      } else if (processed.stamp.kind === "open") {
        current = comparable ? 0 : null;
        power = comparable && voltage !== null ? 0 : null;
      }

      accumulator[processed.component.id] = {
        componentId: processed.component.id,
        componentType: processed.component.type,
        stateLabel: processed.stamp.stateLabel,
        voltage,
        voltageMagnitude: voltage === null ? null : Math.abs(voltage),
        current,
        currentMagnitude: current === null ? null : Math.abs(current),
        power,
        resistance:
          processed.meta.derivedResistance === undefined
            ? null
            : Number(processed.meta.derivedResistance),
        comparable,
        sourceConnected: componentSourceConnected(
          processed.nodeA,
          processed.nodeB,
          sourceConnectedGroups,
          groupIdByNode,
        ),
        nodeIds: {
          a: processed.nodeA,
          b: processed.nodeB,
        },
        terminalVoltages: {
          a: comparable ? voltageA : null,
          b: comparable ? voltageB : null,
        },
        extra: componentExtra(processed.component, processed.meta, power),
      };
      return accumulator;
    },
    {},
  );
}

function buildIssues(
  document: CircuitDocument,
  componentResults: Record<string, CircuitComponentResult>,
  processedComponents: ProcessedComponent[],
  solverFailureReason: string | null,
) {
  const issues: CircuitIssue[] = [];
  const terminalUsage = new Map<string, number>();

  document.wires.forEach((wire) => {
    terminalUsage.set(terminalRefKey(wire.from), (terminalUsage.get(terminalRefKey(wire.from)) ?? 0) + 1);
    terminalUsage.set(terminalRefKey(wire.to), (terminalUsage.get(terminalRefKey(wire.to)) ?? 0) + 1);
  });

  if (solverFailureReason) {
    issues.push({
      id: "solver-failure",
      severity: "error",
      code: "solver-failure",
      title: "This circuit state could not be solved cleanly.",
      detail: `${solverFailureReason} Try removing conflicting ideal sources or reconnecting the branch graph.`,
    });
  }

  document.components.forEach((component) => {
    (["a", "b"] as const).forEach((terminal) => {
      if ((terminalUsage.get(`${component.id}:${terminal}`) ?? 0) === 0) {
        issues.push({
          id: `${component.id}-${terminal}-unconnected`,
          severity: "warning",
          code: "unconnected-terminal",
          title: `${component.label} has an unconnected terminal.`,
          detail:
            "This terminal is not wired into the circuit, so the component may be floating or inactive.",
          componentId: component.id,
        });
      }
    });
  });

  processedComponents.forEach((processed) => {
    const result = componentResults[processed.component.id];
    if (!result) {
      return;
    }

    if (processed.component.type === "battery" && processed.nodeA === processed.nodeB) {
      issues.push({
        id: `${processed.component.id}-short-source`,
        severity: "error",
        code: "short-source",
        title: `${processed.component.label} is shorted directly across one node.`,
        detail:
          "Its positive and negative terminals were merged by wires, which is an unsupported ideal short.",
        componentId: processed.component.id,
      });
    }

    if (!result.sourceConnected && processed.component.type !== "battery") {
      issues.push({
        id: `${processed.component.id}-floating`,
        severity: "warning",
        code: "floating-component",
        title: `${processed.component.label} is not connected to an active source.`,
        detail:
          "This part belongs to a network with no active battery path, so its readings stay zero or undefined.",
        componentId: processed.component.id,
      });
    }

    if (!result.comparable) {
      issues.push({
        id: `${processed.component.id}-undefined-reading`,
        severity: "warning",
        code: "undefined-reading",
        title: `${processed.component.label} spans disconnected electrical groups.`,
        detail:
          "The solver cannot compare the two terminal voltages reliably because the branch is electrically floating.",
        componentId: processed.component.id,
      });
    }

    if (
      processed.component.type === "battery" &&
      result.currentMagnitude !== null &&
      result.currentMagnitude > SHORT_SOURCE_CURRENT_THRESHOLD
    ) {
      issues.push({
        id: `${processed.component.id}-high-current`,
        severity: "warning",
        code: "short-source",
        title: `${processed.component.label} is driving an extremely high current.`,
        detail:
          "This usually means the source is close to a short circuit or only tiny resistances remain in the loop.",
        componentId: processed.component.id,
      });
    }

    if (processed.component.type === "switch" && processed.stamp.kind === "open") {
      issues.push({
        id: `${processed.component.id}-open-circuit`,
        severity: "warning",
        code: "open-circuit",
        title: `${processed.component.label} is open.`,
        detail:
          "This branch is intentionally disconnected, so downstream current should drop to zero.",
        componentId: processed.component.id,
      });
    }

    if (processed.component.type === "fuse" && processed.component.properties.blown) {
      issues.push({
        id: `${processed.component.id}-blown`,
        severity: "warning",
        code: "fuse-blown",
        title: `${processed.component.label} is blown.`,
        detail:
          "Reset or replace the fuse to close the branch again after the overload condition is removed.",
        componentId: processed.component.id,
      });
    }
  });

  return issues;
}

export function solveCircuitDocument(document: CircuitDocument): CircuitSolveResult {
  const notes = [
    "Wires collapse connected terminals into one node.",
    "Meters use very small or very large internal resistances rather than ideal probes.",
    "Capacitors are treated as open circuits in DC steady state.",
  ];
  const { nodes, nodeIdByTerminal } = buildProcessedNodes(document);
  const diodeStates = new Map<string, boolean>();
  let processedComponents = buildProcessedComponents(document, nodeIdByTerminal, diodeStates);
  let groups = buildConductiveGroups(processedComponents);
  let groupSolutions = new Map<string, GroupSolution>();
  let solverFailureReason: string | null = null;

  for (let pass = 0; pass < 4; pass += 1) {
    groups = buildConductiveGroups(processedComponents);
    groupSolutions = new Map<string, GroupSolution>();
    solverFailureReason = null;

    for (const group of groups.groups) {
      const groupComponents = processedComponents.filter(
        (component) =>
          groups.groupIdByNode.get(component.nodeA) === group.id ||
          groups.groupIdByNode.get(component.nodeB) === group.id,
      );
      const solved = solveGroup(group.nodeIds, groupComponents);
      if (!solved.ok) {
        solverFailureReason = solved.reason;
        break;
      }
      groupSolutions.set(group.id, solved.solution);
    }

    if (solverFailureReason) {
      break;
    }

    let changed = false;
    processedComponents.forEach((component) => {
      if (component.component.type !== "diode") {
        return;
      }
      const groupIdA = groups.groupIdByNode.get(component.nodeA);
      const groupIdB = groups.groupIdByNode.get(component.nodeB);
      if (!groupIdA || !groupIdB || groupIdA !== groupIdB) {
        return;
      }
      const solution = groupSolutions.get(groupIdA);
      const voltageA = solution?.nodeVoltages.get(component.nodeA) ?? 0;
      const voltageB = solution?.nodeVoltages.get(component.nodeB) ?? 0;
      const forwardDrop = Number(component.component.properties.forwardDrop ?? 0.7);
      const shouldConduct = voltageA - voltageB >= forwardDrop;
      if ((diodeStates.get(component.component.id) ?? false) !== shouldConduct) {
        diodeStates.set(component.component.id, shouldConduct);
        changed = true;
      }
    });

    if (!changed) {
      break;
    }

    processedComponents = buildProcessedComponents(document, nodeIdByTerminal, diodeStates);
  }

  const sourceConnectedGroups = new Set(
    processedComponents
      .filter((component) => component.component.type === "battery")
      .map((component) => groups.groupIdByNode.get(component.nodeA) ?? "")
      .filter(Boolean),
  );
  const comparableVoltages = buildComparableVoltageLookup(groups, groupSolutions);
  const componentResults = buildComponentResults(
    processedComponents,
    groups.groupIdByNode,
    groupSolutions,
    sourceConnectedGroups,
  );
  const nodeResults = buildNodeResults(
    nodes,
    groups.groupIdByNode,
    sourceConnectedGroups,
    comparableVoltages,
  );
  const autoBlownFuseIds = processedComponents
    .filter((component) => component.component.type === "fuse")
    .map((component) => {
      const result = componentResults[component.component.id];
      const rating = Number(component.component.properties.rating ?? 1.5);
      return !component.component.properties.blown &&
        result.currentMagnitude !== null &&
        result.currentMagnitude > rating
        ? component.component.id
        : null;
    })
    .filter(Boolean) as string[];
  const issues = buildIssues(
    document,
    componentResults,
    processedComponents,
    solverFailureReason,
  );

  return {
    ok: !solverFailureReason,
    componentResults,
    nodeResults,
    issues,
    autoBlownFuseIds,
    notes,
  };
}
