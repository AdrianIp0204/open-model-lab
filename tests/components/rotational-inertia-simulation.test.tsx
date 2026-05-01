import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RotationalInertiaSimulation } from "@/components/simulations/RotationalInertiaSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("rotational-inertia");
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

describe("RotationalInertiaSimulation", () => {
  it("renders compare badges for same-torque setups with different inertia", () => {
    const source = buildSimulationSource();

    render(
      <RotationalInertiaSimulation
        concept={source}
        params={{
          appliedTorque: 4,
          massRadius: 0.24,
        }}
        time={1.2}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            appliedTorque: 4,
            massRadius: 0.24,
          },
          setupB: {
            appliedTorque: 4,
            massRadius: 0.95,
          },
          labelA: "Compact core",
          labelB: "Wide rim",
        }}
      />,
    );

    expect(screen.getByText(/Compact core:/i)).toHaveTextContent(/I = 0\.8/i);
    expect(screen.getByText(/Compact core:/i)).toHaveTextContent(/α = 5\.03 rad\/s/i);
    expect(screen.getByText(/Wide rim:/i)).toHaveTextContent(/I = 5\.86/i);
    expect(screen.getByText(/Wide rim:/i)).toHaveTextContent(/α = 0\.68 rad\/s/i);
    expect(
      screen.getByText(
        /Same torque and same total mass can still produce very different spin-up/i,
      ),
    ).toBeInTheDocument();
  });

  it("calls out that the same mass is spread farther from the axis", () => {
    const source = buildSimulationSource();

    render(
      <RotationalInertiaSimulation
        concept={source}
        params={{
          appliedTorque: 4,
          massRadius: 0.95,
        }}
        time={1.2}
        setParam={vi.fn()}
        overlayValues={{
          radiusGuides: true,
          equalMassMarkers: true,
          referenceCore: true,
        }}
      />,
    );

    expect(screen.getByText(/same six equal masses, same total mass/i)).toBeInTheDocument();
    expect(
      screen.getByText(/same mass sits far from the axis here/i),
    ).toBeInTheDocument();
  });
});
