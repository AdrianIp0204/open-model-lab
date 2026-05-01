import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpticalResolutionSimulation } from "@/components/simulations/OpticalResolutionSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("optical-resolution-imaging-limits");
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

describe("OpticalResolutionSimulation", () => {
  it("surfaces compare labels for both resolution setups", () => {
    const source = buildSimulationSource();

    render(
      <OpticalResolutionSimulation
        concept={source}
        params={{
          wavelengthNm: 550,
          apertureMm: 2.4,
          separationMrad: 0.32,
          probeYUm: 0,
        }}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            wavelengthNm: 500,
            apertureMm: 3.6,
            separationMrad: 0.5,
            probeYUm: 0,
          },
          setupB: {
            wavelengthNm: 680,
            apertureMm: 1.8,
            separationMrad: 0.28,
            probeYUm: 0,
          },
          labelA: "Sharper",
          labelB: "Blurrier",
        }}
      />,
    );

    expect(screen.getAllByText(/Sharper/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Blurrier/i).length).toBeGreaterThan(0);
  });

  it("shows a response-preview badge when the detector profile is hovered", () => {
    const source = buildSimulationSource();

    render(
      <OpticalResolutionSimulation
        concept={source}
        params={{
          wavelengthNm: 550,
          apertureMm: 2.4,
          separationMrad: 0.32,
          probeYUm: 0,
        }}
        setParam={vi.fn()}
        graphPreview={{
          kind: "response",
          graphId: "image-profile",
          seriesId: "combined-profile",
          seriesLabel: "Combined exposure",
          point: { x: 40, y: 0.82 },
          pointIndex: 120,
          pointCount: 241,
        }}
      />,
    );

    expect(screen.getByText(/preview image y = 40 um/i)).toBeInTheDocument();
  });

  it("keeps detector dragging keyboard-addressable", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <OpticalResolutionSimulation
        concept={source}
        params={{
          wavelengthNm: 550,
          apertureMm: 2.4,
          separationMrad: 0.32,
          probeYUm: 0,
        }}
        setParam={setParam}
        overlayValues={{
          apertureGuide: true,
          rayleighGuide: true,
          componentProfiles: true,
        }}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move detector height/i }), {
      key: "ArrowUp",
    });

    expect(setParam).toHaveBeenCalledWith("probeYUm", 2);
  });
});
