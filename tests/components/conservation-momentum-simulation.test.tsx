import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConservationMomentumSimulation } from "@/components/simulations/ConservationMomentumSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("conservation-of-momentum");
  const simulationDescription =
    concept.accessibility.simulationDescription.paragraphs.join(" ");
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

describe("ConservationMomentumSimulation", () => {
  it("renders compare badges for setups with the same total momentum", () => {
    const source = buildSimulationSource();

    render(
      <ConservationMomentumSimulation
        concept={source}
        params={{
          massA: 1.2,
          massB: 2.4,
          systemVelocity: 0,
          interactionForce: 2,
          interactionDuration: 0.4,
        }}
        time={0.7}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            massA: 1.2,
            massB: 2.4,
            systemVelocity: 0,
            interactionForce: 2,
            interactionDuration: 0.4,
          },
          setupB: {
            massA: 1.2,
            massB: 2.4,
            systemVelocity: 0,
            interactionForce: 1,
            interactionDuration: 0.8,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(
      screen.getByText("Baseline: p_tot = 0 kg m/s"),
    ).toBeInTheDocument();
    expect(screen.getByText("Variant: p_tot = 0 kg m/s")).toBeInTheDocument();
    expect(
      screen.getByText(/Matching total momentum lines can hide very different momentum splits/i),
    ).toBeInTheDocument();
  });

  it("calls out the active equal-and-opposite internal force pair", () => {
    const source = buildSimulationSource();

    render(
      <ConservationMomentumSimulation
        concept={source}
        params={{
          massA: 1.2,
          massB: 2.4,
          systemVelocity: 0.5,
          interactionForce: 1.6,
          interactionDuration: 0.5,
        }}
        time={0.7}
        setParam={vi.fn()}
        overlayValues={{
          systemBoundary: true,
          forcePair: true,
          centerOfMass: true,
          momentumBars: true,
        }}
      />,
    );

    expect(
      screen.getByText(/Equal and opposite internal forces are active now/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Track the flat total-momentum line and the steady center-of-mass drift together/i),
    ).toBeInTheDocument();
  });
});
