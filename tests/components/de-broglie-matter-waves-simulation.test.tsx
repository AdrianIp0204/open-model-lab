import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeBroglieMatterWavesSimulation } from "@/components/simulations/DeBroglieMatterWavesSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("de-broglie-matter-waves");
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

describe("DeBroglieMatterWavesSimulation", () => {
  it("renders the wavelength and whole-number-fit cues together", () => {
    const source = buildSimulationSource();

    render(
      <DeBroglieMatterWavesSimulation
        concept={source}
        params={{
          massMultiple: 2,
          speedMms: 2.2,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          wavelengthGuide: true,
          momentumLink: true,
          wholeNumberFit: true,
        }}
      />,
    );

    expect(screen.getByText(/^whole-number fit$/i)).toBeInTheDocument();
    expect(screen.getByText(/p = mv/i)).toBeInTheDocument();
    expect(screen.getByText(/bounded bridge toward quantum behavior/i)).toBeInTheDocument();
  });

  it("renders compare badges for both matter-wave setups", () => {
    const source = buildSimulationSource();

    render(
      <DeBroglieMatterWavesSimulation
        concept={source}
        params={{
          massMultiple: 1,
          speedMms: 2.2,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            massMultiple: 1,
            speedMms: 2.2,
          },
          setupB: {
            massMultiple: 2,
            speedMms: 1.1,
          },
          labelA: "Reference fit",
          labelB: "Same-p swap",
        }}
      />,
    );

    expect(screen.getByText(/Reference fit: lambda/i)).toBeInTheDocument();
    expect(screen.getByText(/Same-p swap: lambda/i)).toBeInTheDocument();
  });
});
