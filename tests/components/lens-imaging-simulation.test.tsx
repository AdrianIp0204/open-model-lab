import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LensImagingSimulation } from "@/components/simulations/LensImagingSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("lens-imaging");
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

describe("LensImagingSimulation", () => {
  it("surfaces compare cues when the two setups use different lens families", () => {
    const source = buildSimulationSource();

    render(
      <LensImagingSimulation
        concept={source}
        params={{
          converging: true,
          focalLength: 0.8,
          objectDistance: 2.4,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            converging: true,
            focalLength: 0.8,
            objectDistance: 2.4,
            objectHeight: 1,
          },
          setupB: {
            converging: false,
            focalLength: 0.8,
            objectDistance: 1.8,
            objectHeight: 1,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: converging lens")).toBeInTheDocument();
    expect(screen.getByText("Variant: diverging lens")).toBeInTheDocument();
  });

  it("shows infinity honestly in the readout when the object sits at focus", () => {
    const source = buildSimulationSource();

    render(
      <LensImagingSimulation
        concept={source}
        params={{
          converging: true,
          focalLength: 0.8,
          objectDistance: 0.8,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText("\u221e").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/real image at \u221e/i).length).toBeGreaterThan(0);
  });

  it("labels virtual images explicitly on the stage", () => {
    const source = buildSimulationSource();

    render(
      <LensImagingSimulation
        concept={source}
        params={{
          converging: false,
          focalLength: 0.8,
          objectDistance: 2.4,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("virtual image")).toBeInTheDocument();
  });

  it("marks off-scale real images instead of pinning them to a fake stage position", () => {
    const source = buildSimulationSource();

    render(
      <LensImagingSimulation
        concept={source}
        params={{
          converging: true,
          focalLength: 0.8,
          objectDistance: 0.82,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/real image beyond scale/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^real image$/i)).not.toBeInTheDocument();
  });

  it("adds a compact mobile summary for the lens-state readout", () => {
    const source = buildSimulationSource();

    render(
      <LensImagingSimulation
        concept={source}
        params={{
          converging: true,
          focalLength: 0.8,
          objectDistance: 2.4,
          objectHeight: 1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Lens state").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Real image can land on a screen/i).length).toBeGreaterThan(0);
  });
});
