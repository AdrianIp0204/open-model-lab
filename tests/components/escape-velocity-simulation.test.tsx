import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EscapeVelocitySimulation } from "@/components/simulations/EscapeVelocitySimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("escape-velocity");
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

describe("EscapeVelocitySimulation", () => {
  it("renders compare badges for both launch setups", () => {
    const source = buildSimulationSource();

    render(
      <EscapeVelocitySimulation
        concept={source}
        params={{
          sourceMass: 4,
          launchRadius: 1.6,
          speedFactor: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceMass: 4,
            launchRadius: 1.6,
            speedFactor: 1,
          },
          setupB: {
            sourceMass: 5.6,
            launchRadius: 1.6,
            speedFactor: 1,
          },
          labelA: "Baseline",
          labelB: "Heavier source",
        }}
      />,
    );

    expect(screen.getByText("Baseline: M 4 kg / r0 1.6 m")).toBeInTheDocument();
    expect(screen.getByText("Heavier source: M 5.6 kg / r0 1.6 m")).toBeInTheDocument();
  });

  it("calls out the high-but-bound case in the live readout", () => {
    const source = buildSimulationSource();

    render(
      <EscapeVelocitySimulation
        concept={source}
        params={{
          sourceMass: 4,
          launchRadius: 1.6,
          speedFactor: 0.92,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          launchMarker: true,
          turnaroundMarker: true,
          velocityVector: true,
          gravityVector: true,
          trail: true,
        }}
      />,
    );

    expect(screen.getByText(/High but bound/i)).toBeInTheDocument();
    expect(screen.getByText(/v_esc = sqrt\(2\) v_c/i)).toBeInTheDocument();
    expect(screen.getByText(/Predicted turnaround: 10.42 m/i)).toBeInTheDocument();
  });
});
