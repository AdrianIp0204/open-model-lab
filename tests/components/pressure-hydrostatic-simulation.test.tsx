import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PressureHydrostaticSimulation } from "@/components/simulations/PressureHydrostaticSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("pressure-and-hydrostatic-pressure");
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

describe("PressureHydrostaticSimulation", () => {
  it("renders compare badges for two different ways to build similar total pressure", () => {
    const source = buildSimulationSource();

    render(
      <PressureHydrostaticSimulation
        concept={source}
        params={{
          force: 720,
          area: 0.15,
          density: 1000,
          gravity: 9.8,
          depth: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "b",
          setupA: {
            force: 720,
            area: 0.15,
            density: 1000,
            gravity: 9.8,
            depth: 1,
          },
          setupB: {
            force: 600,
            area: 0.2,
            density: 1200,
            gravity: 9.8,
            depth: 1,
          },
          labelA: "Load-heavy",
          labelB: "Dense fluid",
        }}
      />,
    );

    expect(
      screen.getByText("Load-heavy: total 14.6 kPa, surface 4.8 kPa"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dense fluid: total 14.76 kPa, hydro 11.76 kPa"),
    ).toBeInTheDocument();
  });

  it("calls out the buoyancy bridge once the probe is deep enough", () => {
    const source = buildSimulationSource();

    render(
      <PressureHydrostaticSimulation
        concept={source}
        params={{
          force: 720,
          area: 0.15,
          density: 1000,
          gravity: 9.8,
          depth: 2.5,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          surfaceLoad: true,
          depthGuide: true,
          pressureArrows: true,
          sameDepthLine: true,
        }}
      />,
    );

    expect(screen.getByText(/top-to-bottom pressure difference.*buoyancy/i)).toBeInTheDocument();
    expect(
      screen.getByText(/At the same depth, the pressure arrows stay equal in every direction/i),
    ).toBeInTheDocument();
  });
});
