import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeatTransferSimulation } from "@/components/simulations/HeatTransferSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("heat-transfer");
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

describe("HeatTransferSimulation", () => {
  it("renders compare badges for matched contrast with different total rates", () => {
    const source = buildSimulationSource();

    render(
      <HeatTransferSimulation
        concept={source}
        params={{
          hotTemperature: 150,
          ambientTemperature: 25,
          materialConductivity: 1.8,
          contactQuality: 0.9,
          surfaceArea: 1.2,
          airflow: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            hotTemperature: 150,
            ambientTemperature: 25,
            materialConductivity: 1.8,
            contactQuality: 0.9,
            surfaceArea: 1.2,
            airflow: 1,
          },
          setupB: {
            hotTemperature: 150,
            ambientTemperature: 25,
            materialConductivity: 0.9,
            contactQuality: 0.15,
            surfaceArea: 1.2,
            airflow: 1,
          },
          labelA: "Baseline",
          labelB: "Loose",
        }}
      />,
    );

    expect(
      screen.getByText("Baseline: delta T = 125 degC, q = 63.9 u/s"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loose: delta T = 125 degC, q = 23.8 u/s")).toBeInTheDocument();
  });

  it("calls out radiation-dominant cases in the readout notes", () => {
    const source = buildSimulationSource();

    render(
      <HeatTransferSimulation
        concept={source}
        params={{
          hotTemperature: 175,
          ambientTemperature: 20,
          materialConductivity: 0.5,
          contactQuality: 0.05,
          surfaceArea: 1.4,
          airflow: 0.3,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          deltaBridge: true,
          pathwaySplit: true,
          areaCue: true,
          environmentCue: true,
        }}
      />,
    );

    expect(screen.getByText(/Radiation dominates because the temperature contrast is large/i)).toBeInTheDocument();
    expect(screen.getByText(/Heat-flow state/i)).toBeInTheDocument();
  });
});
