import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ElectromagneticInductionSimulation } from "@/components/simulations/ElectromagneticInductionSimulation";
import { getConceptBySlug } from "@/lib/content";
import {
  sampleElectromagneticInductionState,
  type ConceptSimulationSource,
} from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("electromagnetic-induction");
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

describe("ElectromagneticInductionSimulation", () => {
  it("moves the magnet with live playback time", () => {
    const source = buildSimulationSource();
    const params = {
      magnetStrength: 1.4,
      coilTurns: 120,
      coilArea: 1,
      speed: 1.2,
      startOffset: 2.6,
      northFacingCoil: true,
    } as const;
    const { rerender } = render(
      <ElectromagneticInductionSimulation
        concept={source}
        params={params}
        time={0}
        setParam={vi.fn()}
      />,
    );

    const magnet = screen.getByTestId("electromagnetic-induction-magnet");
    const initialX = Number(magnet.getAttribute("x"));

    rerender(
      <ElectromagneticInductionSimulation
        concept={source}
        params={params}
        time={1.4}
        setParam={vi.fn()}
      />,
    );

    const advancedMagnet = screen.getByTestId("electromagnetic-induction-magnet");
    const advancedX = Number(advancedMagnet.getAttribute("x"));

    expect(sampleElectromagneticInductionState(params, 1.4).positionX).not.toBeCloseTo(
      sampleElectromagneticInductionState(params, 0).positionX,
      3,
    );
    expect(advancedX).not.toBeCloseTo(initialX, 3);
  });

  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <ElectromagneticInductionSimulation
        concept={source}
        params={{
          magnetStrength: 1.4,
          coilTurns: 120,
          coilArea: 1,
          speed: 1.2,
          startOffset: 2.6,
          northFacingCoil: true,
        }}
        time={1.4}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            magnetStrength: 1.4,
            coilTurns: 120,
            coilArea: 1,
            speed: 1.2,
            startOffset: 2.6,
            northFacingCoil: true,
          },
          setupB: {
            magnetStrength: 1.4,
            coilTurns: 200,
            coilArea: 1,
            speed: 1.2,
            startOffset: 2.6,
            northFacingCoil: true,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: emf/i)).toBeInTheDocument();
    expect(screen.getByText(/Variant: emf/i)).toBeInTheDocument();
  });

  it("calls out the zero-response centered case honestly", () => {
    const source = buildSimulationSource();

    render(
      <ElectromagneticInductionSimulation
        concept={source}
        params={{
          magnetStrength: 1.4,
          coilTurns: 120,
          coilArea: 1,
          speed: 0,
          startOffset: 0,
          northFacingCoil: true,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          fieldBand: true,
          coilArea: true,
          motionCue: true,
          currentLoop: true,
        }}
      />,
    );

    expect(screen.getAllByText(/Galvanometer/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no induced current/i)).toBeInTheDocument();
    expect(screen.getByText(/B through coil/i)).toBeInTheDocument();
  });
});
