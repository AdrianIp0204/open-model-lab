import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DerivativeSlopeSimulation } from "@/components/simulations/DerivativeSlopeSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("derivative-as-slope-local-rate-of-change");
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

describe("DerivativeSlopeSimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <DerivativeSlopeSimulation
        concept={source}
        params={{
          pointX: -1.2,
          deltaX: 0.8,
          showSecant: true,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            pointX: -1.2,
            deltaX: 0.8,
            showSecant: true,
          },
          setupB: {
            pointX: 2.3,
            deltaX: 0.3,
            showSecant: true,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(source.title)).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("shows the local-rate guidance when the secant comparison is visible", () => {
    const source = buildSimulationSource();

    render(
      <DerivativeSlopeSimulation
        concept={source}
        params={{
          pointX: 1.35,
          deltaX: 0.25,
          showSecant: true,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("Local rate")).toBeInTheDocument();
    expect(
      screen.getByText(/The secant gives the average rate over this interval/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/average slope/i)).toBeInTheDocument();
  });
});
