import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatrixTransformationsSimulation } from "@/components/simulations/MatrixTransformationsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("matrix-transformations");
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

describe("MatrixTransformationsSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <MatrixTransformationsSimulation
        concept={source}
        params={{
          m11: 1.2,
          m12: 0.4,
          m21: 0,
          m22: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            m11: 1.2,
            m12: 0.4,
            m21: 0,
            m22: 1,
          },
          setupB: {
            m11: -1,
            m12: 0.8,
            m21: 0,
            m22: 1,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Matrix transformations")).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("calls out reflection and shear in the readout note", () => {
    const source = buildSimulationSource();

    render(
      <MatrixTransformationsSimulation
        concept={source}
        params={{
          m11: -1,
          m12: 0.8,
          m21: 0,
          m22: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/Orientation flipped: this action includes a reflection/i)).toBeInTheDocument();
    expect(screen.getByText(/the action includes shear/i)).toBeInTheDocument();
    expect(screen.getByText(/M = \[\[-1, 0.8\], \[0, 1\]\]/i)).toBeInTheDocument();
  });
});
