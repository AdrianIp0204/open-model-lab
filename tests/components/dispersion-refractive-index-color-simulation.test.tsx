import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DispersionRefractiveIndexColorSimulation } from "@/components/simulations/DispersionRefractiveIndexColorSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("dispersion-refractive-index-color");
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

describe("DispersionRefractiveIndexColorSimulation", () => {
  it("surfaces the no-dispersion case without pretending the prism stops bending", () => {
    const source = buildSimulationSource();

    render(
      <DispersionRefractiveIndexColorSimulation
        concept={source}
        params={{
          wavelengthNm: 550,
          referenceIndex: 1.52,
          dispersionStrength: 0,
          prismAngle: 18,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          colorFan: true,
          indexGuide: true,
          thinPrismGuide: true,
        }}
      />,
    );

    expect(screen.getByText(/D is near zero/i)).toBeInTheDocument();
    expect(screen.getByText(/thin-prism sketch/i)).toBeInTheDocument();
  });

  it("renders compare badges for both prism setups", () => {
    const source = buildSimulationSource();

    render(
      <DispersionRefractiveIndexColorSimulation
        concept={source}
        params={{
          wavelengthNm: 550,
          referenceIndex: 1.52,
          dispersionStrength: 0.02,
          prismAngle: 18,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            wavelengthNm: 550,
            referenceIndex: 1.52,
            dispersionStrength: 0.02,
            prismAngle: 18,
          },
          setupB: {
            wavelengthNm: 450,
            referenceIndex: 1.62,
            dispersionStrength: 0.045,
            prismAngle: 22,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(
      screen.getByText((_, node) =>
        Boolean(
          node?.tagName === "SPAN" &&
            node.textContent?.trim() === "Baseline: n_ref 1.52 / D 0.02 / A 18°",
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, node) =>
        Boolean(
          node?.tagName === "SPAN" &&
            node.textContent?.trim() === "Variant: n_ref 1.62 / D 0.04 / A 22°",
        ),
      ),
    ).toBeInTheDocument();
  });
});
