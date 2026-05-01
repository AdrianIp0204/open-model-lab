import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GraphTransformationsSimulation } from "@/components/simulations/GraphTransformationsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("graph-transformations");
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

describe("GraphTransformationsSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <GraphTransformationsSimulation
        concept={source}
        params={{
          horizontalShift: 0,
          verticalShift: 0,
          verticalScale: 1,
          mirrorY: false,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            horizontalShift: 0,
            verticalShift: 0,
            verticalScale: 1,
            mirrorY: false,
          },
          setupB: {
            horizontalShift: 1.8,
            verticalShift: 0.6,
            verticalScale: -1.2,
            mirrorY: true,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Graph transformations")).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("calls out reflection and y-axis input reflection in the readout note", () => {
    const source = buildSimulationSource();

    render(
      <GraphTransformationsSimulation
        concept={source}
        params={{
          horizontalShift: 1.8,
          verticalShift: 0.6,
          verticalScale: -1.2,
          mirrorY: true,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/Negative a reflects the graph across the x-axis/i)).toBeInTheDocument();
    expect(screen.getByText(/Reflect across y-axis is on/i)).toBeInTheDocument();
    expect(screen.getByText(/horizontal shift =/i)).toBeInTheDocument();
  });
});
