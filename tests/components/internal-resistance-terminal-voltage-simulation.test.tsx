import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InternalResistanceTerminalVoltageSimulation } from "@/components/simulations/InternalResistanceTerminalVoltageSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("internal-resistance-and-terminal-voltage");
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

describe("InternalResistanceTerminalVoltageSimulation", () => {
  it("renders compare badges for both source setups", () => {
    const source = buildSimulationSource();

    render(
      <InternalResistanceTerminalVoltageSimulation
        concept={source}
        params={{
          emf: 12,
          internalResistance: 0.2,
          loadResistance: 6,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            emf: 12,
            internalResistance: 0.2,
            loadResistance: 6,
          },
          setupB: {
            emf: 12,
            internalResistance: 3,
            loadResistance: 6,
          },
          labelA: "Near-ideal",
          labelB: "Lossy",
        }}
      />,
    );

    expect(screen.getByText(/Near-ideal: V_terminal/i)).toBeInTheDocument();
    expect(screen.getByText(/Lossy: V_terminal/i)).toBeInTheDocument();
  });

  it("shows the ideal-source reference and power split on the live stage", () => {
    const source = buildSimulationSource();

    render(
      <InternalResistanceTerminalVoltageSimulation
        concept={source}
        params={{
          emf: 12,
          internalResistance: 2,
          loadResistance: 2,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          currentFlow: true,
          voltageLabels: true,
          powerSplit: true,
          idealReference: true,
        }}
      />,
    );

    expect(screen.getByText(/ideal-source limit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/internal drop/i).length).toBeGreaterThan(0);
  });
});
