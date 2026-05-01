import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntegralAccumulationSimulation } from "@/components/simulations/IntegralAccumulationSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("integral-as-accumulation-area");
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

describe("IntegralAccumulationSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <IntegralAccumulationSimulation
        concept={source}
        params={{
          upperBound: 1.6,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            upperBound: 1.6,
          },
          setupB: {
            upperBound: 2.2,
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

  it("shows the negative-area guidance when the source is below the axis", () => {
    const source = buildSimulationSource();

    render(
      <IntegralAccumulationSimulation
        concept={source}
        params={{
          upperBound: 2.2,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Negative source height means moving right subtracts area/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/The accumulated amount is still net positive/i)).toBeInTheDocument();
  });
});
