import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CircularOrbitsSimulation } from "@/components/simulations/CircularOrbitsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("circular-orbits-orbital-speed");
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

describe("CircularOrbitsSimulation", () => {
  it("renders compare badges for both orbit setups", () => {
    const source = buildSimulationSource();

    render(
      <CircularOrbitsSimulation
        concept={source}
        params={{
          sourceMass: 4,
          orbitRadius: 1.6,
          speedFactor: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceMass: 4,
            orbitRadius: 1.6,
            speedFactor: 1,
          },
          setupB: {
            sourceMass: 4,
            orbitRadius: 1.1,
            speedFactor: 1,
          },
          labelA: "Baseline",
          labelB: "Inner orbit",
        }}
      />,
    );

    expect(screen.getByText("Baseline: M 4 kg / r 1.6 m / T 6.36 s")).toBeInTheDocument();
    expect(screen.getByText("Inner orbit: M 4 kg / r 1.1 m / T 3.62 s")).toBeInTheDocument();
  });

  it("calls out the too-slow inward case in the live readout", () => {
    const source = buildSimulationSource();

    render(
      <CircularOrbitsSimulation
        concept={source}
        params={{
          sourceMass: 4,
          orbitRadius: 1.6,
          speedFactor: 0.85,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          referenceOrbit: true,
          radiusLine: true,
          velocityVector: true,
          gravityVector: true,
          trail: true,
        }}
      />,
    );

    expect(screen.getByText(/Falls inward/i)).toBeInTheDocument();
    expect(screen.getByText(/Local speed match:/i)).toBeInTheDocument();
    expect(screen.getByText("T^2 / r^3")).toBeInTheDocument();
    expect(screen.getByText(/Displayed units use G = 1/i)).toBeInTheDocument();
  });
});
