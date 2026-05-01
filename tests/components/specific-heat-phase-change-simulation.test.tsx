import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpecificHeatPhaseChangeSimulation } from "@/components/simulations/SpecificHeatPhaseChangeSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("specific-heat-and-phase-change");
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

describe("SpecificHeatPhaseChangeSimulation", () => {
  it("renders compare badges for the same pulse with low and high specific heat", () => {
    const source = buildSimulationSource();

    render(
      <SpecificHeatPhaseChangeSimulation
        concept={source}
        params={{
          mass: 1.4,
          specificHeat: 0.9,
          heaterPower: 12,
          startingTemperature: 25,
          latentHeat: 260,
          initialPhaseFraction: 1,
          phaseChangeTemperature: 0,
        }}
        time={4}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            mass: 1.4,
            specificHeat: 0.9,
            heaterPower: 12,
            startingTemperature: 25,
            latentHeat: 260,
            initialPhaseFraction: 1,
            phaseChangeTemperature: 0,
          },
          setupB: {
            mass: 1.4,
            specificHeat: 4,
            heaterPower: 12,
            startingTemperature: 25,
            latentHeat: 260,
            initialPhaseFraction: 1,
            phaseChangeTemperature: 0,
          },
          labelA: "Low c",
          labelB: "High c",
        }}
      />,
    );

    expect(screen.getByText("Low c: dT = 38.1 degC, shelf = 100%")).toBeInTheDocument();
    expect(screen.getByText("High c: dT = 8.57 degC, shelf = 100%")).toBeInTheDocument();
  });

  it("calls out a real shelf state in the readout notes", () => {
    const source = buildSimulationSource();

    render(
      <SpecificHeatPhaseChangeSimulation
        concept={source}
        params={{
          mass: 1.4,
          specificHeat: 2.1,
          heaterPower: 18,
          startingTemperature: 0,
          latentHeat: 260,
          initialPhaseFraction: 0.35,
          phaseChangeTemperature: 0,
        }}
        time={2}
        setParam={vi.fn()}
        overlayValues={{
          capacityCue: true,
          shelfCue: true,
          energySplit: true,
          curveGuide: true,
        }}
      />,
    );

    expect(
      screen.getByText(/Temperature is flat because the current energy is changing phase fraction/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/fraction = 45%/i).length).toBeGreaterThan(0);
  });
});
