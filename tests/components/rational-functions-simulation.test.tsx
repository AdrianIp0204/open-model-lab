import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RationalFunctionsSimulation } from "@/components/simulations/RationalFunctionsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("rational-functions-asymptotes-and-behavior");
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

describe("RationalFunctionsSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <RationalFunctionsSimulation
        concept={source}
        params={{
          asymptoteX: 1,
          horizontalAsymptoteY: -1,
          branchScale: 2,
          sampleDistance: 0.6,
          showHole: false,
          holeX: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            asymptoteX: 1,
            horizontalAsymptoteY: -1,
            branchScale: 2,
            sampleDistance: 0.6,
            showHole: false,
            holeX: 1,
          },
          setupB: {
            asymptoteX: -1,
            horizontalAsymptoteY: 0.8,
            branchScale: -1.8,
            sampleDistance: 0.5,
            showHole: false,
            holeX: 1.2,
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

  it("calls out the removable hole as a second domain break instead of another asymptote", () => {
    const source = buildSimulationSource();

    render(
      <RationalFunctionsSimulation
        concept={source}
        params={{
          asymptoteX: -1,
          horizontalAsymptoteY: -0.5,
          branchScale: 3,
          sampleDistance: 0.6,
          showHole: true,
          holeX: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/Domain: x != -1, x != 1/i)).toBeInTheDocument();
    expect(screen.getByText(/The removable hole sits at \(1, 1\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Far left and far right the graph settles toward y = -0.5/i),
    ).toBeInTheDocument();
  });
});
