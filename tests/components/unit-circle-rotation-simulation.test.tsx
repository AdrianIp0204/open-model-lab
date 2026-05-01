import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnitCircleRotationSimulation } from "@/components/simulations/UnitCircleRotationSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("unit-circle-sine-cosine-from-rotation");
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

describe("UnitCircleRotationSimulation", () => {
  it("updates the live region as time advances around the circle", () => {
    const source = buildSimulationSource();
    const { rerender } = render(
      <UnitCircleRotationSimulation
        concept={source}
        params={{
          angularSpeed: 1,
          phase: 0,
          projectionGuides: true,
          angleMarker: true,
          quadrantSigns: true,
          rotationTrail: true,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("Positive x-axis")).toBeInTheDocument();
    expect(screen.getByText(/cosine stays on x, sine stays on y/i)).toBeInTheDocument();

    rerender(
      <UnitCircleRotationSimulation
        concept={source}
        params={{
          angularSpeed: 1,
          phase: 0,
          projectionGuides: true,
          angleMarker: true,
          quadrantSigns: true,
          rotationTrail: true,
        }}
        time={Math.PI / 2}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("Positive y-axis")).toBeInTheDocument();
    expect(
      screen.getByText(/Current point is on an axis, so one projection is exactly zero./i),
    ).toBeInTheDocument();
  });

  it("nudges the phase from the draggable point with keyboard controls", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <UnitCircleRotationSimulation
        concept={source}
        params={{
          angularSpeed: 1,
          phase: 0,
          projectionGuides: true,
          angleMarker: true,
          quadrantSigns: true,
          rotationTrail: true,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /draggable unit circle point/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenCalledWith("phase", 0.12);
  });
});
