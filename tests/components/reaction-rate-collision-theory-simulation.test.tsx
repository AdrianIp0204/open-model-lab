import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReactionRateCollisionTheorySimulation } from "@/components/simulations/ReactionRateCollisionTheorySimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("reaction-rate-collision-theory");
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

describe("ReactionRateCollisionTheorySimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <ReactionRateCollisionTheorySimulation
        concept={source}
        params={{
          temperature: 3.1,
          concentration: 1.4,
          activationEnergy: 2.8,
          catalyst: false,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            temperature: 3.1,
            concentration: 1.4,
            activationEnergy: 2.8,
            catalyst: false,
          },
          setupB: {
            temperature: 4.2,
            concentration: 1,
            activationEnergy: 2.8,
            catalyst: true,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Reaction rate and collision theory")).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("calls out barrier-clearing success when the catalyst is on", () => {
    const source = buildSimulationSource();

    render(
      <ReactionRateCollisionTheorySimulation
        concept={source}
        params={{
          temperature: 3.1,
          concentration: 1.35,
          activationEnergy: 2.8,
          catalyst: true,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/amber attempt rings/i)).toBeInTheDocument();
    expect(screen.getAllByText(/bonded product pairs/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/the catalyst lowers the barrier without making the particles hotter/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/successful hits stay on the bench for a moment as bonded product pairs/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/rate readout/i)).toBeInTheDocument();
  });

  it("renders visible bonded products instead of detached success badges", () => {
    const source = buildSimulationSource();
    const { container } = render(
      <ReactionRateCollisionTheorySimulation
        concept={source}
        params={{
          temperature: 3.8,
          concentration: 1.55,
          activationEnergy: 2.5,
          catalyst: false,
        }}
        time={1.4}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/bonded product pairs/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/coral linked pairs are product dimers formed when a collision clears the activation barrier/i),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-chemistry-bonded-pair="true"]').length,
    ).toBeGreaterThan(0);
  });
});
