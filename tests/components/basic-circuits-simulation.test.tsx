import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BasicCircuitsSimulation } from "@/components/simulations/BasicCircuitsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("basic-circuits");
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

describe("BasicCircuitsSimulation", () => {
  it("renders compare badges for series and parallel setups", () => {
    const source = buildSimulationSource();

    render(
      <BasicCircuitsSimulation
        concept={source}
        params={{
          voltage: 12,
          resistanceA: 6,
          resistanceB: 6,
          parallelMode: false,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            voltage: 12,
            resistanceA: 6,
            resistanceB: 6,
            parallelMode: false,
          },
          setupB: {
            voltage: 12,
            resistanceA: 6,
            resistanceB: 6,
            parallelMode: true,
          },
          labelA: "Series",
          labelB: "Parallel",
        }}
      />,
    );

    expect(screen.getByText("Series: series, 12 ohm, 1 A")).toBeInTheDocument();
    expect(screen.getByText("Parallel: parallel, 3 ohm, 4 A")).toBeInTheDocument();
  });

  it("shows branch-current, branch-voltage, and node cues in parallel mode", () => {
    const source = buildSimulationSource();

    render(
      <BasicCircuitsSimulation
        concept={source}
        params={{
          voltage: 12,
          resistanceA: 4,
          resistanceB: 12,
          parallelMode: true,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          currentArrows: true,
          voltageDrops: true,
          nodeGuide: true,
        }}
      />,
    );

    expect(screen.getByText(/I_B = 1 A/i)).toBeInTheDocument();
    expect(screen.getByText(/V_B = 12 V/i)).toBeInTheDocument();
    expect(screen.getByText(/12 V shared top node/i)).toBeInTheDocument();
    expect(screen.getByText(/0 V shared return/i)).toBeInTheDocument();
  });
});
