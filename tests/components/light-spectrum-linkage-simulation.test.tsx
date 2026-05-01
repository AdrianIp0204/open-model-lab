import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LightSpectrumLinkageSimulation } from "@/components/simulations/LightSpectrumLinkageSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("light-spectrum-linkage");
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

describe("LightSpectrumLinkageSimulation", () => {
  it("renders compare badges for both spectrum setups", () => {
    const source = buildSimulationSource();

    render(
      <LightSpectrumLinkageSimulation
        concept={source}
        params={{
          fieldAmplitude: 1.05,
          logWavelength: -6.27,
          mediumIndex: 1,
          probeCycles: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            fieldAmplitude: 1.05,
            logWavelength: -6.27,
            mediumIndex: 1,
            probeCycles: 1,
          },
          setupB: {
            fieldAmplitude: 1.05,
            logWavelength: -6.27,
            mediumIndex: 1.52,
            probeCycles: 1,
          },
          labelA: "Air",
          labelB: "Glass",
        }}
      />,
    );

    expect(
      screen.getByText((_, node) => node?.textContent === "Air: 537.03 nm / n 1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "Glass: 537.03 nm / n 1.52"),
    ).toBeInTheDocument();
  });

  it("keeps probe-spacing dragging keyboard-addressable through the shared surface", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <LightSpectrumLinkageSimulation
        concept={source}
        params={{
          fieldAmplitude: 1.05,
          logWavelength: -6.27,
          mediumIndex: 1,
          probeCycles: 1,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move probe spacing/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenCalledWith("probeCycles", 1.05);
  });

  it("keeps the visible window, medium link, and field triad readable together", () => {
    const source = buildSimulationSource();

    render(
      <LightSpectrumLinkageSimulation
        concept={source}
        params={{
          fieldAmplitude: 1.05,
          logWavelength: -6.27,
          mediumIndex: 1.52,
          probeCycles: 1,
        }}
        time={0.25}
        setParam={vi.fn()}
        overlayValues={{
          visibleWindow: true,
          mediumCompression: true,
          probeDelay: true,
          fieldTriad: true,
        }}
      />,
    );

    expect(screen.getByText(/visible window/i)).toBeInTheDocument();
    expect(screen.getByText(/lambda_0 =/i)).toBeInTheDocument();
    expect(screen.getByText(/^delay = /i)).toBeInTheDocument();
    expect(screen.getByText(/E x B points right/i)).toBeInTheDocument();
  });
});
