import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExponentialChangeSimulation } from "@/components/simulations/ExponentialChangeSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("exponential-change-growth-decay-logarithms");
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

describe("ExponentialChangeSimulation", () => {
  it("renders the opposite-rate cue and doubling-time readout on a growth bench", () => {
    const source = buildSimulationSource();

    render(
      <ExponentialChangeSimulation
        concept={source}
        params={{
          initialValue: 3,
          rate: 0.25,
          targetValue: 12,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          targetMarker: true,
          pairedRate: true,
          doublingHalfLife: true,
          logGuide: true,
        }}
      />,
    );

    expect(
      screen.getByText("Exponential Change / Growth, Decay, and Logarithms"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Opposite-rate curve/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Doubling time/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/doubling amount = 6/i)).toBeInTheDocument();
    expect(screen.getByText(/Growth hits the target after about/i)).toBeInTheDocument();
  });

  it("calls out unreachable decay targets without pretending the inverse time exists", () => {
    const source = buildSimulationSource();

    render(
      <ExponentialChangeSimulation
        concept={source}
        params={{
          initialValue: 5,
          rate: -0.2,
          targetValue: 12,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Target is unreachable with decay because it sits above the starting value/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/not reached/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Half-life/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/half-life amount = 2.5/i)).toBeInTheDocument();
  });
});
