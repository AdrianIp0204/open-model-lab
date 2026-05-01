import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollisionsSimulation } from "@/components/simulations/CollisionsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";
import { localizeConceptContent } from "@/lib/i18n/concept-content";

function buildSimulationSource(
  locale: "en" | "zh-HK" = "en",
): ConceptSimulationSource {
  const baseConcept = getConceptBySlug("collisions");
  const concept =
    locale === "zh-HK" ? localizeConceptContent(baseConcept, locale) : baseConcept;
  const simulationDescription =
    concept.accessibility.simulationDescription.paragraphs.join(" ");
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

describe("CollisionsSimulation", () => {
  it("shows compare badges when momentum stays the same but energy retention changes", () => {
    const source = buildSimulationSource();

    render(
      <CollisionsSimulation
        concept={source}
        params={{
          massA: 1.5,
          massB: 1.5,
          speedA: 1.6,
          speedB: 0,
          elasticity: 1,
        }}
        time={4}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            massA: 1.5,
            massB: 1.5,
            speedA: 1.6,
            speedB: 0,
            elasticity: 1,
          },
          setupB: {
            massA: 1.5,
            massB: 1.5,
            speedA: 1.6,
            speedB: 0,
            elasticity: 0,
          },
          labelA: "Elastic",
          labelB: "Sticky",
        }}
      />,
    );

    expect(
      screen.getByText("Elastic: p_tot = 2.4 kg m/s, K_f = 1.92 J"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sticky: p_tot = 2.4 kg m/s, K_f = 0.96 J"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Same total momentum can still lead to different rebound speeds/i),
    ).toBeInTheDocument();
  });

  it("calls out the shared post-collision motion in a sticky collision", () => {
    const source = buildSimulationSource();

    render(
      <CollisionsSimulation
        concept={source}
        params={{
          massA: 1.5,
          massB: 1.5,
          speedA: 1.6,
          speedB: 0,
          elasticity: 0,
        }}
        time={4}
        setParam={vi.fn()}
        overlayValues={{
          collisionZone: true,
          centerOfMass: true,
          relativeSpeed: true,
          momentumBars: true,
        }}
      />,
    );

    expect(
      screen.getByText(/After a perfectly inelastic collision, the carts keep one shared velocity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compare the flat total-momentum line with the energy graph/i),
    ).toBeInTheDocument();
  });

  it("renders zh-HK stage chrome without leaking the main English helper copy", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const source = buildSimulationSource("zh-HK");

    render(
      <CollisionsSimulation
        concept={source}
        params={{
          massA: 1.5,
          massB: 1.5,
          speedA: 1.6,
          speedB: 0,
          elasticity: 0,
        }}
        time={4}
        setParam={vi.fn()}
        overlayValues={{
          collisionZone: true,
          centerOfMass: true,
          relativeSpeed: true,
          momentumBars: true,
        }}
      />,
    );

    expect(screen.getByText(/碰撞狀態/)).toBeInTheDocument();
    expect(screen.getByText(/軌道位置/)).toBeInTheDocument();
    expect(screen.queryByText(/Collision state/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Track position/)).not.toBeInTheDocument();
  });
});
