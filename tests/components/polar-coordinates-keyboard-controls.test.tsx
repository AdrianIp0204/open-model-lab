import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PolarCoordinatesSimulation } from "@/components/simulations/PolarCoordinatesSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("polar-coordinates-radius-and-angle");
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

describe("PolarCoordinatesSimulation keyboard controls", () => {
  it("clamps radius decreases at the minimum value", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <PolarCoordinatesSimulation
        concept={source}
        params={{
          radius: 0.5,
          angleDeg: 60,
          coordinateGuides: true,
          angleArc: true,
          radiusSweep: true,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /draggable polar point/i }), {
      key: "ArrowDown",
    });

    expect(setParam).toHaveBeenCalledWith("radius", 0.5);
  });

  it("wraps angle increases back onto the positive x-axis", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <PolarCoordinatesSimulation
        concept={source}
        params={{
          radius: 3,
          angleDeg: 358,
          coordinateGuides: true,
          angleArc: true,
          radiusSweep: true,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /draggable polar point/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenCalledWith("angleDeg", 3);
  });
});
