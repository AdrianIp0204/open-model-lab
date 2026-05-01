import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MirrorsSimulation } from "@/components/simulations/MirrorsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("mirrors");
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

describe("MirrorsSimulation", () => {
  it("surfaces compare cues when the two setups use different mirror families", () => {
    const source = buildSimulationSource();

    render(
      <MirrorsSimulation
        concept={source}
        params={{
          curved: false,
          concave: true,
          focalLength: 0.8,
          objectDistance: 1.4,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            curved: false,
            concave: true,
            focalLength: 0.8,
            objectDistance: 1.4,
            objectHeight: 1,
          },
          setupB: {
            curved: true,
            concave: false,
            focalLength: 0.8,
            objectDistance: 1.8,
            objectHeight: 1,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: plane mirror")).toBeInTheDocument();
    expect(screen.getByText("Variant: convex mirror")).toBeInTheDocument();
  });

  it("shows infinity honestly in the readout when the object sits at the focal point", () => {
    const source = buildSimulationSource();

    render(
      <MirrorsSimulation
        concept={source}
        params={{
          curved: true,
          concave: true,
          focalLength: 0.8,
          objectDistance: 0.8,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("\u221e")).toBeInTheDocument();
  });

  it("labels virtual images explicitly on the stage", () => {
    const source = buildSimulationSource();

    render(
      <MirrorsSimulation
        concept={source}
        params={{
          curved: false,
          concave: true,
          focalLength: 0.8,
          objectDistance: 1.4,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("virtual image")).toBeInTheDocument();
  });
});
