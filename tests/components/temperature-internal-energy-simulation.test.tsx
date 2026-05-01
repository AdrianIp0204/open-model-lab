import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemperatureInternalEnergySimulation } from "@/components/simulations/TemperatureInternalEnergySimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("temperature-and-internal-energy");
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

describe("TemperatureInternalEnergySimulation", () => {
  it("renders compare badges for the same-temperature small and large samples", () => {
    const source = buildSimulationSource();

    render(
      <TemperatureInternalEnergySimulation
        concept={source}
        params={{
          particleCount: 12,
          heaterPower: 2.4,
          startingTemperature: 2.8,
          phasePlateauTemperature: 3.6,
          latentEnergyPerParticle: 0,
          initialPhaseProgress: 1,
          bondEnergyPerParticle: 0.9,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            particleCount: 12,
            heaterPower: 2.4,
            startingTemperature: 2.8,
            phasePlateauTemperature: 3.6,
            latentEnergyPerParticle: 0,
            initialPhaseProgress: 1,
            bondEnergyPerParticle: 0.9,
          },
          setupB: {
            particleCount: 36,
            heaterPower: 2.4,
            startingTemperature: 2.8,
            phasePlateauTemperature: 3.6,
            latentEnergyPerParticle: 0,
            initialPhaseProgress: 1,
            bondEnergyPerParticle: 0.9,
          },
          labelA: "Small",
          labelB: "Large",
        }}
      />,
    );

    expect(screen.getByText("Small: T = 2.8, U = 36 u")).toBeInTheDocument();
    expect(screen.getByText("Large: T = 2.8, U = 108 u")).toBeInTheDocument();
  });

  it("calls out shelf progress while temperature stays near the shelf", () => {
    const source = buildSimulationSource();

    render(
      <TemperatureInternalEnergySimulation
        concept={source}
        params={{
          particleCount: 18,
          heaterPower: 2.6,
          startingTemperature: 3.6,
          phasePlateauTemperature: 3.6,
          latentEnergyPerParticle: 3.2,
          initialPhaseProgress: 0.35,
          bondEnergyPerParticle: 0.9,
        }}
        time={2}
        setParam={vi.fn()}
        overlayValues={{
          motionVectors: true,
          energySplit: true,
          phaseShelf: true,
          particleCounter: true,
        }}
      />,
    );

    expect(screen.getByText(/Internal energy is still rising while temperature stays near the shelf/i)).toBeInTheDocument();
    expect(screen.getAllByText(/44% through shelf/i).length).toBeGreaterThan(0);
  });
});
