import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BernoulliPrincipleSimulation } from "@/components/simulations/BernoulliPrincipleSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("bernoullis-principle");
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

describe("BernoulliPrincipleSimulation", () => {
  it("renders compare badges for narrow and wide throats at the same entry state", () => {
    const source = buildSimulationSource();

    render(
      <BernoulliPrincipleSimulation
        concept={source}
        params={{
          entryPressure: 32,
          flowRate: 0.18,
          entryArea: 0.1,
          throatArea: 0.05,
          throatHeight: 0.25,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "b",
          setupA: {
            entryPressure: 32,
            flowRate: 0.18,
            entryArea: 0.1,
            throatArea: 0.05,
            throatHeight: 0.25,
          },
          setupB: {
            entryPressure: 32,
            flowRate: 0.18,
            entryArea: 0.1,
            throatArea: 0.09,
            throatHeight: 0.25,
          },
          labelA: "Baseline",
          labelB: "Wide throat",
        }}
      />,
    );

    expect(
      screen.getByText("Baseline: P_B 24.69 kPa, v_B 3.6 m/s"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Wide throat: P_B 29.17 kPa, v_B 2 m/s"),
    ).toBeInTheDocument();
  });

  it("calls out the continuity-to-bernoulli bridge without losing the pressure readout", () => {
    const source = buildSimulationSource();

    render(
      <BernoulliPrincipleSimulation
        concept={source}
        params={{
          entryPressure: 32,
          flowRate: 0.18,
          entryArea: 0.1,
          throatArea: 0.05,
          throatHeight: 0.25,
        }}
        time={1.2}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/Narrower throat, faster flow, lower static pressure/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Continuity sets the faster throat speed; Bernoulli explains the lower static pressure/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/^P_B$/i)).toBeInTheDocument();
  });
});
