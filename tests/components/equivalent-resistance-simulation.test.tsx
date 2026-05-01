import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EquivalentResistanceSimulation } from "@/components/simulations/EquivalentResistanceSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function textContentContains(fragment: string) {
  return (_content: string, element: Element | null) =>
    Boolean(element?.textContent?.includes(fragment));
}

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("equivalent-resistance");
  const simulationDescription = concept.accessibility.simulationDescription.paragraphs.join(" ");
  const graphSummary = concept.accessibility.graphSummary.paragraphs.join(" ");

  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    slug: concept.slug,
    topic: concept.topic,
    equations: concept.equations,
    variableLinks: concept.variableLinks,
    accessibility: {
      simulationDescription,
      graphSummary,
    },
    simulation: {
      ...concept.simulation,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription,
        graphSummary,
      },
    },
  };
}

describe("EquivalentResistanceSimulation", () => {
  it("renders compare badges for series-group and parallel-group snapshots", () => {
    const source = buildSimulationSource();

    render(
      <EquivalentResistanceSimulation
        concept={source}
        params={{
          voltage: 18,
          resistance1: 6,
          resistance2: 6,
          resistance3: 6,
          groupParallel: false,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            voltage: 18,
            resistance1: 6,
            resistance2: 6,
            resistance3: 6,
            groupParallel: false,
          },
          setupB: {
            voltage: 18,
            resistance1: 6,
            resistance2: 6,
            resistance3: 6,
            groupParallel: true,
          },
          labelA: "Series group",
          labelB: "Parallel group",
        }}
      />,
    );

    expect(screen.getByText("Series group: series group, R_eq = 18 ohm")).toBeInTheDocument();
    expect(screen.getByText("Parallel group: parallel group, R_eq = 9 ohm")).toBeInTheDocument();
  });

  it("shows grouped reduction, current, voltage, and charge overlays on the live stage", () => {
    const source = buildSimulationSource();

    render(
      <EquivalentResistanceSimulation
        concept={source}
        params={{
          voltage: 18,
          resistance1: 6,
          resistance2: 6,
          resistance3: 6,
          groupParallel: true,
        }}
        time={4}
        setParam={vi.fn()}
        overlayValues={{
          currentFlow: true,
          voltageLabels: true,
          reductionGuide: true,
          nodeGuide: true,
          loopGuide: true,
        }}
      />,
    );

    expect(screen.getAllByText(textContentContains("R_group = 3 ohm")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("I_3 = 1 A")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("Q_3 = 4 C")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("V_group = 6 V")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(textContentContains("I_total = I_2 + I_3")).length,
    ).toBeGreaterThan(0);
  });
});
