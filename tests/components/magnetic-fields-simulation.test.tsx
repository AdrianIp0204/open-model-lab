import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MagneticFieldsSimulation } from "@/components/simulations/MagneticFieldsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("magnetic-fields");
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

describe("MagneticFieldsSimulation", () => {
  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <MagneticFieldsSimulation
        concept={source}
        params={{
          currentA: 2,
          currentB: -2,
          sourceSeparation: 2.4,
          probeX: 0,
          probeY: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            currentA: 2,
            currentB: -2,
            sourceSeparation: 2.4,
            probeX: 0,
            probeY: 1,
          },
          setupB: {
            currentA: 3,
            currentB: -1.5,
            sourceSeparation: 2.4,
            probeX: 0.2,
            probeY: 0.9,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: +2 A / -2 A")).toBeInTheDocument();
    expect(screen.getByText("Variant: +3 A / -1.5 A")).toBeInTheDocument();
  });

  it("calls out the wire senses and net field label", () => {
    const source = buildSimulationSource();

    render(
      <MagneticFieldsSimulation
        concept={source}
        params={{
          currentA: 2,
          currentB: -2,
          sourceSeparation: 2.4,
          probeX: 0,
          probeY: 1,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          fieldLoops: true,
          fieldGrid: true,
          fieldVectors: true,
          scanLine: true,
        }}
      />,
    );

    expect(screen.getByText(/A: out of page\. B: into page\./i)).toBeInTheDocument();
    expect(screen.getByText(/B net/i)).toBeInTheDocument();
    expect(screen.getByText(/Wire A/i)).toBeInTheDocument();
    expect(screen.getByText(/Wire B/i)).toBeInTheDocument();
  });
});
