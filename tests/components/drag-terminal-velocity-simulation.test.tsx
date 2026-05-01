import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DragTerminalVelocitySimulation } from "@/components/simulations/DragTerminalVelocitySimulation";
import { getConceptBySlug } from "@/lib/content";
import {
  sampleDragTerminalVelocityState,
  type ConceptSimulationSource,
} from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("drag-and-terminal-velocity");
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

describe("DragTerminalVelocitySimulation", () => {
  it("moves the falling object with live playback time", () => {
    const source = buildSimulationSource();
    const params = {
      mass: 1.2,
      area: 0.12,
      dragStrength: 18,
    } as const;
    const { rerender } = render(
      <DragTerminalVelocitySimulation
        concept={source}
        params={params}
        time={0}
        setParam={vi.fn()}
      />,
    );

    const object = screen.getByTestId("drag-terminal-velocity-object");
    const initialY = Number(object.getAttribute("y"));

    rerender(
      <DragTerminalVelocitySimulation
        concept={source}
        params={params}
        time={4}
        setParam={vi.fn()}
      />,
    );

    const advancedObject = screen.getByTestId("drag-terminal-velocity-object");
    const advancedY = Number(advancedObject.getAttribute("y"));

    expect(sampleDragTerminalVelocityState(params, 4).position).toBeGreaterThan(
      sampleDragTerminalVelocityState(params, 0).position,
    );
    expect(advancedY).toBeGreaterThan(initialY);
  });

  it("renders compare badges for two setups with the same terminal-speed ratio", () => {
    const source = buildSimulationSource();

    render(
      <DragTerminalVelocitySimulation
        concept={source}
        params={{
          mass: 4,
          area: 0.1,
          dragStrength: 12,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "b",
          setupA: {
            mass: 2,
            area: 0.05,
            dragStrength: 12,
          },
          setupB: {
            mass: 4,
            area: 0.1,
            dragStrength: 12,
          },
          labelA: "Baseline",
          labelB: "Matched ratio",
        }}
      />,
    );

    expect(
      screen.getByText("Baseline: v_t 5.72 m/s, drag ratio 0"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Matched ratio: v_t 5.72 m/s, gap 5.72 m/s"),
    ).toBeInTheDocument();
  });

  it("calls out the near-terminal state without pretending the object has stopped", () => {
    const source = buildSimulationSource();

    render(
      <DragTerminalVelocitySimulation
        concept={source}
        params={{
          mass: 1.2,
          area: 0.12,
          dragStrength: 18,
        }}
        time={4}
        setParam={vi.fn()}
        overlayValues={{
          forceBalance: true,
          terminalBand: true,
          distanceGuide: true,
        }}
      />,
    );

    expect(screen.getByText(/Drag is now nearly balancing weight/i)).toBeInTheDocument();
    expect(
      screen.getByText(/acceleration has almost collapsed/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/v = 2\.33 m\/s/i)).toBeInTheDocument();
  });
});
