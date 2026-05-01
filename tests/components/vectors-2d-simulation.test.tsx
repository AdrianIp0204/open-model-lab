import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Vectors2DSimulation } from "@/components/simulations/Vectors2DSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("vectors-in-2d");
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

describe("Vectors2DSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <Vectors2DSimulation
        concept={source}
        params={{
          ax: 3,
          ay: 2,
          bx: 1.5,
          by: 3,
          scalar: 1,
          subtractMode: false,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            ax: 3,
            ay: 2,
            bx: 1.5,
            by: 3,
            scalar: 1,
            subtractMode: false,
          },
          setupB: {
            ax: 2.8,
            ay: 1.8,
            bx: 1,
            by: 2.6,
            scalar: -1.4,
            subtractMode: true,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Vectors in 2D")).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("shows the scalar-flip and subtraction guidance in the readout note", () => {
    const source = buildSimulationSource();

    render(
      <Vectors2DSimulation
        concept={source}
        params={{
          ax: 2.8,
          ay: 1.8,
          bx: 1,
          by: 2.6,
          scalar: -1.4,
          subtractMode: true,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Negative scalar flips A through the origin before it combines/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Subtraction works by adding the opposite vector -B tip-to-tail/i),
    ).toBeInTheDocument();
  });
});
