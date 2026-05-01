import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ElectricFieldsSimulation } from "@/components/simulations/ElectricFieldsSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("electric-fields");
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

describe("ElectricFieldsSimulation", () => {
  it("renders compare badges for both setups", () => {
    const source = buildSimulationSource();

    render(
      <ElectricFieldsSimulation
        concept={source}
        params={{
          sourceChargeA: 2,
          sourceChargeB: -2,
          sourceSeparation: 2.4,
          probeX: 0,
          probeY: 1,
          testCharge: 1,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceChargeA: 2,
            sourceChargeB: -2,
            sourceSeparation: 2.4,
            probeX: 0,
            probeY: 1,
            testCharge: 1,
          },
          setupB: {
            sourceChargeA: 3,
            sourceChargeB: 1,
            sourceSeparation: 2.4,
            probeX: 0.4,
            probeY: 0.8,
            testCharge: 1,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getByText("Baseline: +2 q / -2 q")).toBeInTheDocument();
    expect(screen.getByText("Variant: +3 q / +1 q")).toBeInTheDocument();
  });

  it("calls out when a negative test charge reverses the force", () => {
    const source = buildSimulationSource();

    render(
      <ElectricFieldsSimulation
        concept={source}
        params={{
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2,
          probeX: 0,
          probeY: 1,
          testCharge: -1,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          fieldGrid: true,
          fieldVectors: true,
          forceVector: true,
          scanLine: true,
        }}
      />,
    );

    expect(screen.getByText(/negative test charge flips the force opposite the field/i)).toBeInTheDocument();
    expect(screen.getByText(/q_test -1 q/i)).toBeInTheDocument();
    expect(screen.getByText(/F on q_test/i)).toBeInTheDocument();
  });

  it("keeps probe and source-separation handles keyboard-addressable", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <ElectricFieldsSimulation
        concept={source}
        params={{
          sourceChargeA: 2,
          sourceChargeB: 2,
          sourceSeparation: 2.4,
          probeX: 0,
          probeY: 1,
          testCharge: 1,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /move probe/i }), {
      key: "ArrowRight",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: /move probe/i }), {
      key: "ArrowUp",
    });
    fireEvent.keyDown(
      screen.getByRole("button", { name: /adjust source separation from source a/i }),
      {
        key: "ArrowRight",
      },
    );
    fireEvent.keyDown(
      screen.getByRole("button", { name: /adjust source separation from source a/i }),
      {
        key: "Home",
      },
    );
    fireEvent.keyDown(
      screen.getByRole("button", { name: /adjust source separation from source a/i }),
      {
        key: "End",
      },
    );

    expect(setParam).toHaveBeenNthCalledWith(1, "probeX", 0.05);
    expect(setParam).toHaveBeenNthCalledWith(2, "probeY", 1.05);
    expect(setParam).toHaveBeenNthCalledWith(3, "sourceSeparation", 2.45);
    expect(setParam).toHaveBeenNthCalledWith(4, "sourceSeparation", 1);
    expect(setParam).toHaveBeenNthCalledWith(5, "sourceSeparation", 4);
  });
});
