import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DotProductProjectionSimulation } from "@/components/simulations/DotProductProjectionSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("dot-product-angle-and-projection");
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

describe("DotProductProjectionSimulation", () => {
  it("calls out the orthogonal case without collapsing either vector", () => {
    const source = buildSimulationSource();

    render(
      <DotProductProjectionSimulation
        concept={source}
        params={{
          ax: 4,
          ay: 2,
          bx: -1,
          by: 2,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(source.title)).toBeInTheDocument();
    expect(screen.getByText("A dot B")).toBeInTheDocument();
    expect(screen.getByText(/nearly orthogonal/i)).toBeInTheDocument();
    expect(screen.getByText(/along-A projection has almost collapsed/i)).toBeInTheDocument();
  });

  it("describes the negative projection case in the readout note", () => {
    const source = buildSimulationSource();

    render(
      <DotProductProjectionSimulation
        concept={source}
        params={{
          ax: 4,
          ay: 1,
          bx: -2.5,
          by: 2.5,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("comp_A(B)")).toBeInTheDocument();
    expect(screen.getByText(/Negative dot: B points partly against A/i)).toBeInTheDocument();
    expect(screen.getByText(/A dot B = \|A\| \* comp_A\(B\)/i)).toBeInTheDocument();
  });
});
