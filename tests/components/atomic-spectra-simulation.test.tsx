import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AtomicSpectraSimulation } from "@/components/simulations/AtomicSpectraSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("atomic-spectra");
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

describe("AtomicSpectraSimulation", () => {
  it("renders absorption labels upward while keeping the wavelength lock visible", () => {
    const source = buildSimulationSource();

    render(
      <AtomicSpectraSimulation
        concept={source}
        params={{
          gap12Ev: 1.9,
          gap23Ev: 2.6,
          gap34Ev: 2.7,
          absorptionMode: true,
        }}
        time={0.25}
        setParam={vi.fn()}
        overlayValues={{
          transitionPairs: true,
          lineLabels: true,
          modeLock: true,
          quantizedSpacing: true,
        }}
      />,
    );

    expect(screen.getByText(/^1 -> 2$/i)).toBeInTheDocument();
    expect(screen.getByText(/same gaps, same wavelengths/i)).toBeInTheDocument();
    expect(screen.getByText(/dark notches/i)).toBeInTheDocument();
  });

  it("renders compare badges for both atomic-spectrum setups", () => {
    const source = buildSimulationSource();

    render(
      <AtomicSpectraSimulation
        concept={source}
        params={{
          gap12Ev: 1.9,
          gap23Ev: 2.6,
          gap34Ev: 2.7,
          absorptionMode: false,
        }}
        time={0.25}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            gap12Ev: 1.9,
            gap23Ev: 2.6,
            gap34Ev: 2.7,
            absorptionMode: false,
          },
          setupB: {
            gap12Ev: 1.9,
            gap23Ev: 2.6,
            gap34Ev: 2.7,
            absorptionMode: true,
          },
          labelA: "Emission case",
          labelB: "Absorption case",
        }}
      />,
    );

    expect(screen.getByText(/Emission case: emission/i)).toBeInTheDocument();
    expect(screen.getByText(/Absorption case: absorption/i)).toBeInTheDocument();
  });
});
