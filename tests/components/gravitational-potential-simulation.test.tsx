import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GravitationalPotentialSimulation } from "@/components/simulations/GravitationalPotentialSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("gravitational-potential-energy");
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

describe("GravitationalPotentialSimulation", () => {
  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <GravitationalPotentialSimulation
        concept={source}
        params={{
          sourceMass: 2,
          probeX: 2,
          probeY: 0,
          testMass: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceMass: 2,
            probeX: 2,
            probeY: 0,
            testMass: 1,
          },
          setupB: {
            sourceMass: 2,
            probeX: 2,
            probeY: 0,
            testMass: 2,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: phi -1 \/ U -1/i)).toBeInTheDocument();
    expect(screen.getByText(/Variant: phi -1 \/ U -2/i)).toBeInTheDocument();
  });

  it("calls out when a heavier probe mass changes energy without changing the well", () => {
    const source = buildSimulationSource();

    render(
      <GravitationalPotentialSimulation
        concept={source}
        params={{
          sourceMass: 2,
          probeX: 1.6,
          probeY: 1.2,
          testMass: 2,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          potentialMap: true,
          potentialContours: true,
          distanceRings: true,
          fieldArrow: true,
          forceArrow: true,
          scanLine: true,
        }}
      />,
    );

    expect(
      screen.getByText(/Changing only m_test makes U and F larger in magnitude without changing phi or g/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/g downhill/i).length).toBeGreaterThan(0);
  });

  it("keeps the probe handle keyboard-addressable", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <GravitationalPotentialSimulation
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
