import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RadioactivityHalfLifeSimulation } from "@/components/simulations/RadioactivityHalfLifeSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("radioactivity-half-life");
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

describe("RadioactivityHalfLifeSimulation", () => {
  it("renders the single-versus-sample cue without hiding the actual tray", () => {
    const source = buildSimulationSource();

    render(
      <RadioactivityHalfLifeSimulation
        concept={source}
        params={{
          sampleSize: 1,
          halfLifeSeconds: 2.4,
        }}
        time={2.4}
        setParam={vi.fn()}
        overlayValues={{
          recentDecays: true,
          sampleVsExpected: true,
          halfLifeMarkers: true,
          singleVsSample: true,
        }}
      />,
    );

    expect(screen.getByText(/^sample tray$/i)).toBeInTheDocument();
    expect(screen.getByText(/^actual vs expected$/i)).toBeInTheDocument();
    expect(screen.getByText(/^half-life checkpoints$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/One nucleus is still yes\/no\. The smooth curve is the sample expectation\./i),
    ).toBeInTheDocument();
  });

  it("renders compare badges for both decay setups", () => {
    const source = buildSimulationSource();

    render(
      <RadioactivityHalfLifeSimulation
        concept={source}
        params={{
          sampleSize: 12,
          halfLifeSeconds: 2.4,
        }}
        time={2.4}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sampleSize: 12,
            halfLifeSeconds: 2.4,
          },
          setupB: {
            sampleSize: 196,
            halfLifeSeconds: 2.4,
          },
          labelA: "Small sample",
          labelB: "Large sample",
        }}
      />,
    );

    expect(screen.getByText(/Small sample: N0 12 \/ T1\/2 2.4 s/i)).toBeInTheDocument();
    expect(screen.getByText(/Large sample: N0 196 \/ T1\/2 2.4 s/i)).toBeInTheDocument();
  });
});
