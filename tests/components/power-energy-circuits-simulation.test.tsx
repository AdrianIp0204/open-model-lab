import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PowerEnergyCircuitsSimulation } from "@/components/simulations/PowerEnergyCircuitsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function textContentContains(fragment: string) {
  return (_content: string, element: Element | null) =>
    Boolean(element?.textContent?.includes(fragment));
}

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("power-energy-circuits");
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

describe("PowerEnergyCircuitsSimulation", () => {
  it("renders compare badges for both power and cumulative energy", () => {
    const source = buildSimulationSource();

    render(
      <PowerEnergyCircuitsSimulation
        concept={source}
        params={{
          voltage: 12,
          loadResistance: 8,
        }}
        time={4}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            voltage: 12,
            loadResistance: 8,
          },
          setupB: {
            voltage: 12,
            loadResistance: 4,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: P = 18 W, E = 72 J")).toBeInTheDocument();
    expect(screen.getByText("Variant: P = 36 W, E = 144 J")).toBeInTheDocument();
  });

  it("shows current, voltage, power, and energy overlays on the live stage", () => {
    const source = buildSimulationSource();

    render(
      <PowerEnergyCircuitsSimulation
        concept={source}
        params={{
          voltage: 12,
          loadResistance: 8,
        }}
        time={3}
        setParam={vi.fn()}
        overlayValues={{
          currentArrows: true,
          voltageLabels: true,
          powerGlow: true,
          energyMeter: true,
        }}
      />,
    );

    expect(screen.getAllByText(textContentContains("I = 1.5 A")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("Source = 12 V")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("P = 18 W")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("E = 54 J")).length).toBeGreaterThan(0);
  });
});
