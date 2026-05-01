import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptimizationConstraintsSimulation } from "@/components/simulations/OptimizationConstraintsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("optimization-maxima-minima-and-constraints");
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

describe("OptimizationConstraintsSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <OptimizationConstraintsSimulation
        concept={source}
        params={{
          width: 3.2,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            width: 3.2,
          },
          setupB: {
            width: 8.8,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(source.title)).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("calls out the square as the maximum-area case at the peak", () => {
    const source = buildSimulationSource();

    render(
      <OptimizationConstraintsSimulation
        concept={source}
        params={{
          width: 6,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/maximum-area case/i)).toBeInTheDocument();
    expect(screen.getByText(/Width and height match/i)).toBeInTheDocument();
    expect(screen.getByText("best square")).toBeInTheDocument();
  });

  it("explains when an overly wide rectangle is already on the falling side of the objective", () => {
    const source = buildSimulationSource();

    render(
      <OptimizationConstraintsSimulation
        concept={source}
        params={{
          width: 8.8,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/already too wide/i)).toBeInTheDocument();
    expect(screen.getByText(/costing more height than it gains area/i)).toBeInTheDocument();
  });
});
