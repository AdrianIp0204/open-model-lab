import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CapacitanceElectricEnergySimulation } from "@/components/simulations/CapacitanceElectricEnergySimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("capacitance-and-stored-electric-energy");
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

describe("CapacitanceElectricEnergySimulation", () => {
  it("renders compare badges for both capacitor setups", () => {
    const source = buildSimulationSource();

    render(
      <CapacitanceElectricEnergySimulation
        concept={source}
        params={{
          plateArea: 2,
          plateSeparation: 2,
          batteryVoltage: 4,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            plateArea: 2,
            plateSeparation: 2,
            batteryVoltage: 4,
          },
          setupB: {
            plateArea: 4,
            plateSeparation: 2,
            batteryVoltage: 4,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: C 1, U 8/i)).toBeInTheDocument();
    expect(screen.getByText(/Variant: C 2, U 16/i)).toBeInTheDocument();
  });

  it("calls out that stored energy rises faster than stored charge at higher voltage", () => {
    const source = buildSimulationSource();

    render(
      <CapacitanceElectricEnergySimulation
        concept={source}
        params={{
          plateArea: 2.4,
          plateSeparation: 1.4,
          batteryVoltage: 9,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          fieldRegion: true,
          chargeDensityCue: true,
          geometryGuide: true,
          energyStore: true,
        }}
      />,
    );

    expect(
      screen.getByText(/voltage is squared/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^U$/i).length).toBeGreaterThan(0);
  });
});
