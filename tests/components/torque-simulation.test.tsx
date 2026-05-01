import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TorqueSimulation } from "@/components/simulations/TorqueSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("torque");
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

describe("TorqueSimulation", () => {
  it("renders compare badges for matched-torque setups", () => {
    const source = buildSimulationSource();

    render(
      <TorqueSimulation
        concept={source}
        params={{
          forceMagnitude: 2,
          forceAngle: 90,
          applicationDistance: 1.6,
        }}
        time={0.8}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            forceMagnitude: 2,
            forceAngle: 90,
            applicationDistance: 1.6,
          },
          setupB: {
            forceMagnitude: 4,
            forceAngle: 30,
            applicationDistance: 1.6,
          },
          labelA: "Handle push",
          labelB: "Shallow push",
        }}
      />,
    );

    expect(
      screen.getByText("Handle push: tau = 3.2 N m, theta_end = 1.32 rad"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Shallow push: tau = 3.2 N m, theta_end = 1.32 rad"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Different geometry can still land on the same torque/i),
    ).toBeInTheDocument();
  });

  it("calls out when the line of action nearly removes the turning effect", () => {
    const source = buildSimulationSource();

    render(
      <TorqueSimulation
        concept={source}
        params={{
          forceMagnitude: 4,
          forceAngle: 180,
          applicationDistance: 1.6,
        }}
        time={0.8}
        setParam={vi.fn()}
        overlayValues={{
          perpendicularComponent: true,
          lineOfAction: true,
          momentArm: true,
        }}
      />,
    );

    expect(screen.getByText(/moment arm ~ 0/i)).toBeInTheDocument();
    expect(
      screen.getByText(/same-sized push has almost no turning effect/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/almost no turning effect/i)).toHaveLength(2);
  });
});
