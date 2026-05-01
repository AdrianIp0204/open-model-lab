import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuoyancyArchimedesSimulation } from "@/components/simulations/BuoyancyArchimedesSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("buoyancy-and-archimedes-principle");
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

describe("BuoyancyArchimedesSimulation", () => {
  it("renders compare badges for the same block in water and brine", () => {
    const source = buildSimulationSource();

    render(
      <BuoyancyArchimedesSimulation
        concept={source}
        params={{
          objectDensity: 650,
          fluidDensity: 1000,
          gravity: 9.8,
          bottomDepth: 0.65,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "b",
          setupA: {
            objectDensity: 650,
            fluidDensity: 1000,
            gravity: 9.8,
            bottomDepth: 0.65,
          },
          setupB: {
            objectDensity: 650,
            fluidDensity: 1300,
            gravity: 9.8,
            bottomDepth: 0.5,
          },
          labelA: "Water",
          labelB: "Brine",
        }}
      />,
    );

    expect(screen.getByText("Water: Fb 509.6 N, W 509.6 N")).toBeInTheDocument();
    expect(screen.getByText("Brine: Fb 509.6 N, Vdisp 0.04 m^3")).toBeInTheDocument();
  });

  it("calls out the fully submerged deeper case honestly", () => {
    const source = buildSimulationSource();

    render(
      <BuoyancyArchimedesSimulation
        concept={source}
        params={{
          objectDensity: 1000,
          fluidDensity: 1000,
          gravity: 9.8,
          bottomDepth: 1.45,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          forceBalance: true,
          displacedFluid: true,
          equilibriumLine: true,
          pressureDifference: true,
        }}
      />,
    );

    expect(screen.getByText(/going deeper now raises both pressure readings/i)).toBeInTheDocument();
    expect(screen.getByText(/Archimedes' principle: the buoyant force equals the weight of the displaced fluid/i)).toBeInTheDocument();
  });
});
