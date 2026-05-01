import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContinuityEquationSimulation } from "@/components/simulations/ContinuityEquationSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("continuity-equation");
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

describe("ContinuityEquationSimulation", () => {
  it("renders compare badges for the same flow rate with different middle speeds", () => {
    const source = buildSimulationSource();

    render(
      <ContinuityEquationSimulation
        concept={source}
        params={{
          flowRate: 0.18,
          entryArea: 0.24,
          middleArea: 0.12,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "b",
          setupA: {
            flowRate: 0.18,
            entryArea: 0.24,
            middleArea: 0.12,
          },
          setupB: {
            flowRate: 0.18,
            entryArea: 0.24,
            middleArea: 0.3,
          },
          labelA: "Baseline",
          labelB: "Wide chamber",
        }}
      />,
    );

    expect(
      screen.getByText("Baseline: Q 0.18 m^3/s, v_B 1.5 m/s"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Wide chamber: Q 0.18 m^3/s, v_B 0.6 m/s"),
    ).toBeInTheDocument();
  });

  it("calls out the Bernoulli bridge without losing the continuity readout", () => {
    const source = buildSimulationSource();

    render(
      <ContinuityEquationSimulation
        concept={source}
        params={{
          flowRate: 0.18,
          entryArea: 0.24,
          middleArea: 0.12,
        }}
        time={1.2}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/Smaller middle area, larger middle speed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/flow piece Bernoulli later pairs with pressure changes/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/^v_B \/ v_A$/i)).toBeInTheDocument();
  });
});
