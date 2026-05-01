import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaxwellEquationsSynthesisSimulation } from "@/components/simulations/MaxwellEquationsSynthesisSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("maxwells-equations-synthesis");
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

describe("MaxwellEquationsSynthesisSimulation", () => {
  it("renders the synthesis cards and live readout", () => {
    const source = buildSimulationSource();

    render(
      <MaxwellEquationsSynthesisSimulation
        concept={source}
        params={{
          chargeSource: 1.1,
          conductionCurrent: 0.7,
          electricChangeRate: 0.9,
          magneticChangeRate: 0.9,
          cycleRate: 0.85,
        }}
        time={0.25}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText(/Charge makes electric flux/i)).toBeInTheDocument();
    expect(screen.getByText(/Current and changing E make circulating B/i)).toBeInTheDocument();
    expect(screen.getByText(/Live readout/i)).toBeInTheDocument();
  });

  it("renders compare summary chips for both setups", () => {
    const source = buildSimulationSource();

    render(
      <MaxwellEquationsSynthesisSimulation
        concept={source}
        params={{
          chargeSource: 1.1,
          conductionCurrent: 0.7,
          electricChangeRate: 0.9,
          magneticChangeRate: 0.9,
          cycleRate: 0.85,
        }}
        time={0.25}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            chargeSource: 1.1,
            conductionCurrent: 0.7,
            electricChangeRate: 0.9,
            magneticChangeRate: 0.9,
            cycleRate: 0.85,
          },
          setupB: {
            chargeSource: 0.4,
            conductionCurrent: 0.4,
            electricChangeRate: 1.2,
            magneticChangeRate: -1.2,
            cycleRate: 1.1,
          },
          labelA: "Baseline",
          labelB: "Misaligned",
        }}
      />,
    );

    expect(screen.getByText(/Compare summary/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Baseline:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Misaligned:/i).length).toBeGreaterThan(0);
  });

  it("calls out the misaligned bridge cue honestly", () => {
    const source = buildSimulationSource();

    render(
      <MaxwellEquationsSynthesisSimulation
        concept={source}
        params={{
          chargeSource: 0.4,
          conductionCurrent: 0.4,
          electricChangeRate: 1.2,
          magneticChangeRate: -1.2,
          cycleRate: 1.1,
        }}
        time={0.25}
        setParam={vi.fn()}
        overlayValues={{
          chargeSurface: true,
          noMonopoles: true,
          faradayLoop: true,
          ampereMaxwell: true,
          lightBridge: true,
        }}
      />,
    );

    expect(screen.getAllByText(/misaligned field cue/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not reinforcing/i)).toBeInTheDocument();
  });
});
