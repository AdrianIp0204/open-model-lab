import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaticEquilibriumCentreOfMassSimulation } from "@/components/simulations/StaticEquilibriumCentreOfMassSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("static-equilibrium-centre-of-mass");
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

describe("StaticEquilibriumCentreOfMassSimulation", () => {
  it("renders compare badges for both balance setups", () => {
    const source = buildSimulationSource();

    render(
      <StaticEquilibriumCentreOfMassSimulation
        concept={source}
        params={{
          cargoMass: 4,
          cargoPosition: 1.2,
          supportCenter: 0.6,
          supportWidth: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            cargoMass: 4,
            cargoPosition: 1.2,
            supportCenter: 0.6,
            supportWidth: 1,
          },
          setupB: {
            cargoMass: 5,
            cargoPosition: 1.08,
            supportCenter: 0.6,
            supportWidth: 1,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText(/Baseline: x_CM/i)).toBeInTheDocument();
    expect(screen.getByText(/Variant: x_CM/i)).toBeInTheDocument();
  });

  it("keeps the cargo and support handles keyboard-addressable", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <StaticEquilibriumCentreOfMassSimulation
        concept={source}
        params={{
          cargoMass: 4,
          cargoPosition: 0.8,
          supportCenter: 0,
          supportWidth: 1,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move cargo/i }), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: /move support region/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenNthCalledWith(1, "cargoPosition", 0.75);
    expect(setParam).toHaveBeenNthCalledWith(2, "supportCenter", 0.05);
  });

  it("calls out when the combined centre of mass has crossed the support edge", () => {
    const source = buildSimulationSource();

    const { container } = render(
      <StaticEquilibriumCentreOfMassSimulation
        concept={source}
        params={{
          cargoMass: 4,
          cargoPosition: 1.2,
          supportCenter: 0,
          supportWidth: 1,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          weightLines: true,
          combinedCenterOfMass: true,
          supportRegion: true,
          supportReactions: true,
          torqueArms: true,
        }}
      />,
    );

    expect(container.querySelector("svg")?.textContent).toContain("would tip right");
    expect(container.querySelector("svg")?.textContent).toContain(
      "One required reaction would go negative",
    );
  });

  it("separates crowded stage annotations into readable callout positions", () => {
    const source = buildSimulationSource();

    render(
      <StaticEquilibriumCentreOfMassSimulation
        concept={source}
        params={{
          cargoMass: 4,
          cargoPosition: 0.1,
          supportCenter: 0,
          supportWidth: 0.8,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          weightLines: true,
          combinedCenterOfMass: true,
          supportRegion: true,
          supportReactions: true,
          torqueArms: true,
        }}
      />,
    );

    const topXs = [
      Number(screen.getByTestId("static-equilibrium-callout-cargo").getAttribute("data-callout-x")),
      Number(screen.getByTestId("static-equilibrium-callout-xcm").getAttribute("data-callout-x")),
      Number(
        screen.getByTestId("static-equilibrium-callout-plank-weight").getAttribute("data-callout-x"),
      ),
    ].sort((left, right) => left - right);

    expect(topXs[1] - topXs[0]).toBeGreaterThan(24);
    expect(topXs[2] - topXs[1]).toBeGreaterThan(24);
  });

  it("keeps compare geometry without duplicating the secondary stage callouts", () => {
    const source = buildSimulationSource();

    render(
      <StaticEquilibriumCentreOfMassSimulation
        concept={source}
        params={{
          cargoMass: 4,
          cargoPosition: 0.8,
          supportCenter: 0,
          supportWidth: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            cargoMass: 4,
            cargoPosition: 0.8,
            supportCenter: 0,
            supportWidth: 1,
          },
          setupB: {
            cargoMass: 5,
            cargoPosition: 1.1,
            supportCenter: 0.4,
            supportWidth: 0.8,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
        overlayValues={{
          weightLines: true,
          combinedCenterOfMass: true,
          supportRegion: true,
          supportReactions: true,
          torqueArms: true,
        }}
      />,
    );

    expect(screen.getAllByTestId("static-equilibrium-callout-support-center")).toHaveLength(1);
    expect(screen.getByText(/Variant: x_CM/i)).toBeInTheDocument();
  });
});
