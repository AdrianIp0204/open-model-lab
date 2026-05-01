import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LimitsContinuitySimulation } from "@/components/simulations/LimitsContinuitySimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("limits-and-continuity-approaching-a-value");
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

describe("LimitsContinuitySimulation", () => {
  it("renders compare labels for both setups", () => {
    const source = buildSimulationSource();

    render(
      <LimitsContinuitySimulation
        concept={source}
        params={{
          caseIndex: 0,
          approachDistance: 0.6,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            caseIndex: 0,
            approachDistance: 0.6,
          },
          setupB: {
            caseIndex: 2,
            approachDistance: 0.18,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(
      screen.getByText("Limits and Continuity / Approaching a Value"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
  });

  it("calls out the removable-hole split between the finite limit and the actual point", () => {
    const source = buildSimulationSource();

    render(
      <LimitsContinuitySimulation
        concept={source}
        params={{
          caseIndex: 1,
          approachDistance: 0.12,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("Removable hole")).toBeInTheDocument();
    expect(screen.getByText("removable discontinuity")).toBeInTheDocument();
    expect(
      screen.getByText(/Both sides are closing in on the same height/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The point at x = 0 sits somewhere else, so continuity breaks/i),
    ).toBeInTheDocument();
  });

  it("keeps the blow-up case explicit about the missing finite limit", () => {
    const source = buildSimulationSource();

    render(
      <LimitsContinuitySimulation
        concept={source}
        params={{
          caseIndex: 3,
          approachDistance: 0.1,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getByText("Blow-up")).toBeInTheDocument();
    expect(screen.getByText("infinite blow-up")).toBeInTheDocument();
    expect(screen.getByText(/No finite two-sided limit/i)).toBeInTheDocument();
    expect(screen.getByText(/f\(0\) undefined/i)).toBeInTheDocument();
  });
});
