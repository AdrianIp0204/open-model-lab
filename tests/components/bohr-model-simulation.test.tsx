import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BohrModelSimulation } from "@/components/simulations/BohrModelSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("bohr-model");
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

describe("BohrModelSimulation", () => {
  it("renders reverse-excitation labels while keeping the wavelength lock visible", () => {
    const source = buildSimulationSource();

    render(
      <BohrModelSimulation
        concept={source}
        params={{
          upperLevel: 3,
          lowerLevel: 2,
          excitationMode: true,
        }}
        time={0.25}
        setParam={vi.fn()}
        overlayValues={{
          radiusRule: true,
          lineLabels: true,
          seriesFamily: true,
          reverseTransition: true,
        }}
      />,
    );

    expect(screen.getAllByText(/^2 -> 3$/i)).toHaveLength(2);
    expect(screen.getByText(/same wavelength in reverse/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded historical hydrogen model/i)).toBeInTheDocument();
  });

  it("renders compare badges for both Bohr setups", () => {
    const source = buildSimulationSource();

    render(
      <BohrModelSimulation
        concept={source}
        params={{
          upperLevel: 3,
          lowerLevel: 2,
          excitationMode: false,
        }}
        time={0.25}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            upperLevel: 3,
            lowerLevel: 2,
            excitationMode: false,
          },
          setupB: {
            upperLevel: 3,
            lowerLevel: 2,
            excitationMode: true,
          },
          labelA: "Emission case",
          labelB: "Reverse case",
        }}
      />,
    );

    expect(screen.getByText(/Emission case: Balmer/i)).toBeInTheDocument();
    expect(screen.getByText(/Reverse case: Balmer/i)).toBeInTheDocument();
  });
});
