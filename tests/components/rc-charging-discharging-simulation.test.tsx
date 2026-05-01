import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RcChargingDischargingSimulation } from "@/components/simulations/RcChargingDischargingSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("rc-charging-and-discharging");
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

describe("RcChargingDischargingSimulation", () => {
  it("renders compare badges for both RC setups", () => {
    const source = buildSimulationSource();

    render(
      <RcChargingDischargingSimulation
        concept={source}
        params={{
          sourceVoltage: 8,
          resistance: 2,
          capacitance: 1,
          charging: true,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceVoltage: 8,
            resistance: 2,
            capacitance: 1,
            charging: true,
          },
          setupB: {
            sourceVoltage: 8,
            resistance: 4,
            capacitance: 1.5,
            charging: true,
          },
          labelA: "Baseline",
          labelB: "Slower",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: tau = 2 s/i)).toBeInTheDocument();
    expect(screen.getByText(/Slower: tau = 6 s/i)).toBeInTheDocument();
  });

  it("calls out the reversed discharge current", () => {
    const source = buildSimulationSource();

    render(
      <RcChargingDischargingSimulation
        concept={source}
        params={{
          sourceVoltage: 8,
          resistance: 2,
          capacitance: 1,
          charging: false,
        }}
        time={2}
        setParam={vi.fn()}
        overlayValues={{
          currentFlow: true,
          voltageLabels: true,
          tauMarkers: true,
          chargeCue: true,
          energyStore: true,
        }}
      />,
    );

    expect(screen.getByText(/current reverses and fades/i)).toBeInTheDocument();
    expect(screen.getByText(/Larger R or larger C makes the response slower/i)).toBeInTheDocument();
  });
});
