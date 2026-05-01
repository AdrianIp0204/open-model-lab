import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeriesParallelCircuitsSimulation } from "@/components/simulations/SeriesParallelCircuitsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function textContentContains(fragment: string) {
  return (_content: string, element: Element | null) =>
    Boolean(element?.textContent?.includes(fragment));
}

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("series-parallel-circuits");
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

describe("SeriesParallelCircuitsSimulation", () => {
  it("renders compare badges for series and parallel topology snapshots", () => {
    const source = buildSimulationSource();

    render(
      <SeriesParallelCircuitsSimulation
        concept={source}
        params={{
          voltage: 12,
          resistanceA: 6,
          resistanceB: 6,
          parallelMode: false,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            voltage: 12,
            resistanceA: 6,
            resistanceB: 6,
            parallelMode: false,
          },
          setupB: {
            voltage: 12,
            resistanceA: 6,
            resistanceB: 6,
            parallelMode: true,
          },
          labelA: "Series",
          labelB: "Parallel",
        }}
      />,
    );

    expect(screen.getByText("Series: series, I_total = 1 A")).toBeInTheDocument();
    expect(screen.getByText("Parallel: parallel, I_total = 4 A")).toBeInTheDocument();
  });

  it("shows current, voltage, charge, and power overlays on the live stage", () => {
    const source = buildSimulationSource();

    render(
      <SeriesParallelCircuitsSimulation
        concept={source}
        params={{
          voltage: 12,
          resistanceA: 4,
          resistanceB: 12,
          parallelMode: true,
        }}
        time={4}
        setParam={vi.fn()}
        overlayValues={{
          currentFlow: true,
          voltageLabels: true,
          nodeGuide: true,
          brightnessGuide: true,
        }}
      />,
    );

    expect(screen.getAllByText(textContentContains("I_B = 1 A")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("Q_B = 4 C")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("P_A = 36 W")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("V_B = 12 V")).length).toBeGreaterThan(0);
  });
});
