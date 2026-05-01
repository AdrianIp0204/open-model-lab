import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IdealGasLawKineticTheorySimulation } from "@/components/simulations/IdealGasLawKineticTheorySimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("ideal-gas-law-and-kinetic-theory");
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

describe("IdealGasLawKineticTheorySimulation", () => {
  it("renders compare badges for two different ways to reach the same pressure", () => {
    const source = buildSimulationSource();

    render(
      <IdealGasLawKineticTheorySimulation
        concept={source}
        params={{
          particleCount: 36,
          temperature: 3.2,
          volume: 1.6,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "b",
          setupA: {
            particleCount: 24,
            temperature: 4.8,
            volume: 1.6,
          },
          setupB: {
            particleCount: 36,
            temperature: 3.2,
            volume: 1.6,
          },
          labelA: "Hotter",
          labelB: "Crowded",
        }}
      />,
    );

    expect(screen.getByText("Hotter: P = 15.83, V = 1.6, T = 4.8")).toBeInTheDocument();
    expect(screen.getByText("Crowded: P = 15.83, V = 1.6, T = 3.2")).toBeInTheDocument();
  });

  it("calls out compression as a pressure increase from more frequent wall hits", () => {
    const source = buildSimulationSource();

    render(
      <IdealGasLawKineticTheorySimulation
        concept={source}
        params={{
          particleCount: 24,
          temperature: 3.2,
          volume: 0.8,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          speedCue: true,
          densityCue: true,
          wallHitCue: true,
          pressureGauge: true,
        }}
      />,
    );

    expect(
      screen.getByText(/smaller volume keeps the same particles closer to the walls/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/P = 21.1/i).length).toBeGreaterThan(0);
  });
});
