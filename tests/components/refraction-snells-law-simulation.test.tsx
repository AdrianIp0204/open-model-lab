import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RefractionSnellsLawSimulation } from "@/components/simulations/RefractionSnellsLawSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("refraction-snells-law");
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

describe("RefractionSnellsLawSimulation", () => {
  it("surfaces the total-internal-reflection state honestly", () => {
    const source = buildSimulationSource();

    render(
      <RefractionSnellsLawSimulation
        concept={source}
        params={{
          incidentAngle: 50,
          n1: 1.52,
          n2: 1,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          normalGuide: true,
          criticalGuide: true,
          reflectionGuide: true,
          speedGuide: true,
        }}
      />,
    );

    expect(screen.getAllByText(/no real transmitted angle/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/total internal reflection/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/theta_r = theta_1/i)).toBeInTheDocument();
  });

  it("renders compare badges for both media pairs", () => {
    const source = buildSimulationSource();

    render(
      <RefractionSnellsLawSimulation
        concept={source}
        params={{
          incidentAngle: 50,
          n1: 1,
          n2: 1.5,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            incidentAngle: 50,
            n1: 1,
            n2: 1.5,
          },
          setupB: {
            incidentAngle: 58,
            n1: 1,
            n2: 1.85,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: n1 1 -> n2 1.5")).toBeInTheDocument();
    expect(screen.getByText("Variant: n1 1 -> n2 1.85")).toBeInTheDocument();
  });
});
