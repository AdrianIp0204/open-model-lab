import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ElectromagneticWavesSimulation } from "@/components/simulations/ElectromagneticWavesSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("electromagnetic-waves");
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

describe("ElectromagneticWavesSimulation", () => {
  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <ElectromagneticWavesSimulation
        concept={source}
        params={{
          electricAmplitude: 1.2,
          waveSpeed: 2.8,
          wavelength: 1.8,
          probeX: 2.7,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            electricAmplitude: 1.2,
            waveSpeed: 2.8,
            wavelength: 1.8,
            probeX: 2.7,
          },
          setupB: {
            electricAmplitude: 1.2,
            waveSpeed: 1.8,
            wavelength: 1.8,
            probeX: 2.7,
          },
          labelA: "Baseline",
          labelB: "Slow",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: v 2.8 m\/s, lambda 1.8 m/i)).toBeInTheDocument();
    expect(screen.getByText(/Slow: v 1.8 m\/s, lambda 1.8 m/i)).toBeInTheDocument();
  });

  it("keeps x-axis probe dragging keyboard-addressable through the shared surface", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <ElectromagneticWavesSimulation
        concept={source}
        params={{
          electricAmplitude: 1.2,
          waveSpeed: 2.8,
          wavelength: 1.8,
          probeX: 1.8,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move probe position/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenCalledWith("probeX", 1.85);
  });

  it("calls out the propagation note and magnetic display scale", () => {
    const source = buildSimulationSource();

    render(
      <ElectromagneticWavesSimulation
        concept={source}
        params={{
          electricAmplitude: 1.2,
          waveSpeed: 2.8,
          wavelength: 1.8,
          probeX: 1.8,
        }}
        time={0.25}
        setParam={vi.fn()}
        overlayValues={{
          wavelengthGuide: true,
          probeGuide: true,
          propagationTriad: true,
        }}
      />,
    );

    expect(screen.getByText(/Phase lag = /i)).toBeInTheDocument();
    expect(screen.getByText(/B curve drawn x3 for readability/i)).toBeInTheDocument();
    expect(screen.getByText(/propagates right/i)).toBeInTheDocument();
  });
});
