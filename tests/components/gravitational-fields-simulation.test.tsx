import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GravitationalFieldsSimulation } from "@/components/simulations/GravitationalFieldsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("gravitational-fields");
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

describe("GravitationalFieldsSimulation", () => {
  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <GravitationalFieldsSimulation
        concept={source}
        params={{
          sourceMass: 2,
          probeX: 1.6,
          probeY: 1.2,
          testMass: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceMass: 2,
            probeX: 1.6,
            probeY: 1.2,
            testMass: 1,
          },
          setupB: {
            sourceMass: 4,
            probeX: 1.6,
            probeY: 1.2,
            testMass: 2,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: M 2 kg / m 1 kg")).toBeInTheDocument();
    expect(screen.getByText("Variant: M 4 kg / m 2 kg")).toBeInTheDocument();
  });

  it("calls out when zero probe mass removes force without erasing the field", () => {
    const source = buildSimulationSource();

    render(
      <GravitationalFieldsSimulation
        concept={source}
        params={{
          sourceMass: 2,
          probeX: 1.6,
          probeY: 1.2,
          testMass: 0,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          fieldGrid: true,
          fieldVector: true,
          forceVector: true,
          distanceRings: true,
          scanLine: true,
        }}
      />,
    );

    expect(
      screen.getByText(/Zero probe mass leaves the gravitational field intact while the force drops to zero/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Field direction:/i)).toBeInTheDocument();
  });

  it("keeps the probe handle keyboard-addressable", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <GravitationalFieldsSimulation
        concept={source}
        params={{
          sourceMass: 2,
          probeX: 1.6,
          probeY: 1.2,
          testMass: 1,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move probe/i }), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: /move probe/i }), {
      key: "ArrowDown",
    });

    expect(setParam).toHaveBeenNthCalledWith(1, "probeX", 1.55);
    expect(setParam).toHaveBeenNthCalledWith(2, "probeY", 1.15);
  });
});
