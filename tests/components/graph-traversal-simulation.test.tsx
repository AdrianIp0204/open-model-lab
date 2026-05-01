import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GraphTraversalSimulation } from "@/components/simulations/GraphTraversalSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("breadth-first-search-and-layered-frontiers");
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

describe("GraphTraversalSimulation", () => {
  it("renders compare labels for both setups on the shared graph bench", () => {
    const source = buildSimulationSource();

    render(
      <GraphTraversalSimulation
        concept={source}
        params={{
          graphIndex: 0,
          startNodeIndex: 0,
          targetNodeIndex: 7,
          traversalMode: 0,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            graphIndex: 0,
            startNodeIndex: 0,
            targetNodeIndex: 7,
            traversalMode: 0,
          },
          setupB: {
            graphIndex: 0,
            startNodeIndex: 0,
            targetNodeIndex: 7,
            traversalMode: 1,
          },
          labelA: "Queue run",
          labelB: "Stack run",
        }}
      />,
    );

    expect(screen.getByText("Graph traversal bench")).toBeInTheDocument();
    expect(screen.getAllByText("Queue run").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stack run").length).toBeGreaterThan(0);
  });

  it("calls out queue and stack frontier cues on the same simulation", () => {
    const source = buildSimulationSource();

    const view = render(
      <GraphTraversalSimulation
        concept={source}
        params={{
          graphIndex: 0,
          startNodeIndex: 0,
          targetNodeIndex: 7,
          traversalMode: 0,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Queue frontier").length).toBeGreaterThan(0);
    expect(screen.getByText(/Traversal cues/i)).toBeInTheDocument();

    view.rerender(
      <GraphTraversalSimulation
        concept={source}
        params={{
          graphIndex: 0,
          startNodeIndex: 0,
          targetNodeIndex: 7,
          traversalMode: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Stack frontier").length).toBeGreaterThan(0);
    expect(screen.getByText(/Traversal readout/i)).toBeInTheDocument();
  });
});
