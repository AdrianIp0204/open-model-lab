import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MomentumImpulseSimulation } from "@/components/simulations/MomentumImpulseSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("momentum-impulse");
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

describe("MomentumImpulseSimulation", () => {
  it("renders compare badges for equal-impulse setups", () => {
    const source = buildSimulationSource();

    render(
      <MomentumImpulseSimulation
        concept={source}
        params={{
          mass: 1,
          initialVelocity: 0.5,
          force: 3,
          pulseDuration: 0.4,
        }}
        time={0.6}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            mass: 1,
            initialVelocity: 0.5,
            force: 3,
            pulseDuration: 0.4,
          },
          setupB: {
            mass: 1,
            initialVelocity: 0.5,
            force: 1.5,
            pulseDuration: 0.8,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: J = 1.2 N s, p_f = 1.7 kg m/s")).toBeInTheDocument();
    expect(screen.getByText("Variant: J = 1.2 N s, p_f = 1.7 kg m/s")).toBeInTheDocument();
    expect(
      screen.getByText(/Equal impulse does not require equal force/i),
    ).toBeInTheDocument();
  });

  it("calls out when the pulse is actively changing the cart's momentum", () => {
    const source = buildSimulationSource();

    render(
      <MomentumImpulseSimulation
        concept={source}
        params={{
          mass: 1.4,
          initialVelocity: 1,
          force: -2.4,
          pulseDuration: 0.5,
        }}
        time={0.7}
        setParam={vi.fn()}
        overlayValues={{
          forceArrow: true,
          pulseWindow: true,
          momentumBars: true,
        }}
      />,
    );

    expect(screen.getByText(/Force is on now/i)).toBeInTheDocument();
    expect(screen.getByText(/The accumulated impulse and change in momentum should match/i)).toBeInTheDocument();
  });
});
