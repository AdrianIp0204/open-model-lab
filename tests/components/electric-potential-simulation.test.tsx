import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ElectricPotentialSimulation } from "@/components/simulations/ElectricPotentialSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("electric-potential");
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

describe("ElectricPotentialSimulation", () => {
  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <ElectricPotentialSimulation
        concept={source}
        params={{
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2,
          probeX: 0,
          probeY: 0,
          testCharge: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceChargeA: 2,
            sourceChargeB: 2,
            sourceSeparation: 2,
            probeX: 0,
            probeY: 0,
            testCharge: 1,
          },
          setupB: {
            sourceChargeA: 2,
            sourceChargeB: -2,
            sourceSeparation: 2,
            probeX: 0,
            probeY: 0,
            testCharge: 1,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: V \+4/i)).toBeInTheDocument();
    expect(screen.getByText(/Variant: V 0/i)).toBeInTheDocument();
  });

  it("calls out when a negative test charge changes the energy sign without changing the map", () => {
    const source = buildSimulationSource();

    render(
      <ElectricPotentialSimulation
        concept={source}
        params={{
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2,
          probeX: 0,
          probeY: 1,
          testCharge: -1,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          potentialMap: true,
          equipotentialContours: true,
          fieldArrow: true,
          scanLine: true,
        }}
      />,
    );

    expect(
      screen.getByText(/negative test charge makes the potential energy change sign/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/E downhill/i).length).toBeGreaterThan(0);
  });
});
