import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicEquilibriumSimulation } from "@/components/simulations/DynamicEquilibriumSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("dynamic-equilibrium-le-chateliers-principle");
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

describe("DynamicEquilibriumSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <DynamicEquilibriumSimulation
        concept={source}
        params={{
          reactantAmount: 14,
          productAmount: 4,
          productFavor: 1.12,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            reactantAmount: 14,
            productAmount: 4,
            productFavor: 1.12,
          },
          setupB: {
            reactantAmount: 4,
            productAmount: 14,
            productFavor: 1.34,
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

  it("shows the dynamic-not-stopped guidance near equilibrium", () => {
    const source = buildSimulationSource();

    render(
      <DynamicEquilibriumSimulation
        concept={source}
        params={{
          reactantAmount: 14,
          productAmount: 4,
          productFavor: 1.34,
        }}
        time={12}
        setParam={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/dynamic rather than stopped/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/favor products once the system settles/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/equilibrium readout/i)).toBeInTheDocument();
  });
});
