import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MagneticForceSimulation } from "@/components/simulations/MagneticForceSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("magnetic-force-moving-charges-currents");
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

describe("MagneticForceSimulation", () => {
  it("renders compare badges for both force setups", () => {
    const source = buildSimulationSource();

    render(
      <MagneticForceSimulation
        concept={source}
        params={{
          fieldStrength: 1.6,
          speed: 4.5,
          directionAngle: 0,
          negativeCharge: false,
          current: 2,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            fieldStrength: 1.6,
            speed: 4.5,
            directionAngle: 0,
            negativeCharge: false,
            current: 2,
          },
          setupB: {
            fieldStrength: -0.8,
            speed: 1.5,
            directionAngle: 0,
            negativeCharge: true,
            current: 2,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: +1.6 T, q+")).toBeInTheDocument();
    expect(screen.getByText("Variant: -0.8 T, q-")).toBeInTheDocument();
  });

  it("calls out when the negative charge splits from the wire-force side", () => {
    const source = buildSimulationSource();

    render(
      <MagneticForceSimulation
        concept={source}
        params={{
          fieldStrength: -0.8,
          speed: 1.5,
          directionAngle: 0,
          negativeCharge: true,
          current: 2,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          fieldMarkers: true,
          motionVectors: true,
          orbitGuide: true,
          wireForcePanel: true,
        }}
      />,
    );

    expect(screen.getByText(/Negative charge flips only the charge force\./i)).toBeInTheDocument();
    expect(screen.getByText(/q- flips relative to the wire force\./i)).toBeInTheDocument();
    expect(screen.getByText(/Same direction control, separate I slider/i)).toBeInTheDocument();
  });
});
