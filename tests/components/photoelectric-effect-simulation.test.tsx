import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoelectricEffectSimulation } from "@/components/simulations/PhotoelectricEffectSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("photoelectric-effect");
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

describe("PhotoelectricEffectSimulation", () => {
  it("renders compare badges for both photoelectric setups", () => {
    const source = buildSimulationSource();

    render(
      <PhotoelectricEffectSimulation
        concept={source}
        params={{
          frequencyPHz: 1,
          intensity: 1,
          workFunctionEv: 2.3,
          collectorVoltage: 0.4,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            frequencyPHz: 0.38,
            intensity: 1.6,
            workFunctionEv: 2.3,
            collectorVoltage: 0.4,
          },
          setupB: {
            frequencyPHz: 1,
            intensity: 0.45,
            workFunctionEv: 2.3,
            collectorVoltage: 0.4,
          },
          labelA: "Bright red",
          labelB: "Dim violet",
        }}
      />,
    );

    expect(screen.getByText(/Bright red: 0\.38 PHz \/ Icol 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Dim violet: 1 PHz \/ Icol 0\.45/i)).toBeInTheDocument();
  });

  it("keeps frequency dragging keyboard-addressable through the shared surface", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <PhotoelectricEffectSimulation
        concept={source}
        params={{
          frequencyPHz: 0.95,
          intensity: 1,
          workFunctionEv: 2.3,
          collectorVoltage: 0.4,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move light frequency/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenCalledWith("frequencyPHz", 0.97);
  });

  it("keeps the threshold, energy, and stopping cues readable together", () => {
    const source = buildSimulationSource();

    render(
      <PhotoelectricEffectSimulation
        concept={source}
        params={{
          frequencyPHz: 1,
          intensity: 1,
          workFunctionEv: 2.3,
          collectorVoltage: -1.84,
        }}
        time={0.25}
        setParam={vi.fn()}
        overlayValues={{
          thresholdGate: true,
          intensityFlux: true,
          stoppingField: true,
          energyBudget: true,
        }}
      />,
    );

    expect(screen.getByText(/energy budget/i)).toBeInTheDocument();
    expect(screen.getByText(/changes count, not KE/i)).toBeInTheDocument();
    expect(screen.getByText(/Vstop = /i)).toBeInTheDocument();
  });
});
