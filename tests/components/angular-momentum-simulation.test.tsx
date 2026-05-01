import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AngularMomentumSimulation } from "@/components/simulations/AngularMomentumSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("angular-momentum");
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

describe("AngularMomentumSimulation", () => {
  it("renders compare badges for same-L compact and wide setups", () => {
    const source = buildSimulationSource();

    render(
      <AngularMomentumSimulation
        concept={source}
        params={{
          massRadius: 0.28,
          angularSpeed: 5.91,
        }}
        time={1.2}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            massRadius: 0.28,
            angularSpeed: 5.91,
          },
          setupB: {
            massRadius: 0.95,
            angularSpeed: 0.93,
          },
          labelA: "Compact same L",
          labelB: "Wide same L",
        }}
      />,
    );

    expect(screen.getByText(/Compact same L:/i)).toHaveTextContent(/L = 5\.4[45]/i);
    expect(screen.getByText(/Compact same L:/i)).toHaveTextContent(/omega = 5\.91 rad\/s/i);
    expect(screen.getByText(/Wide same L:/i)).toHaveTextContent(/L = 5\.4[45]/i);
    expect(screen.getByText(/Wide same L:/i)).toHaveTextContent(/omega = 0\.93 rad\/s/i);
    expect(
      screen.getByText(
        /Same angular momentum can hide behind very different spin rates when the mass layout changes/i,
      ),
    ).toBeInTheDocument();
  });

  it("calls out the wide-layout conservation story with overlays on", () => {
    const source = buildSimulationSource();

    render(
      <AngularMomentumSimulation
        concept={source}
        params={{
          massRadius: 0.95,
          angularSpeed: 0.93,
        }}
        time={1.2}
        setParam={vi.fn()}
        overlayValues={{
          radiusGuide: true,
          tangentialSpeed: true,
          equalMassMarkers: true,
          sameLReference: true,
        }}
      />,
    );

    expect(screen.getByText(/same six equal masses, same total mass/i)).toBeInTheDocument();
    expect(
      screen.getByText(/same angular momentum would show up as a much slower spin/i),
    ).toBeInTheDocument();
  });
});
