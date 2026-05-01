import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RollingMotionSimulation } from "@/components/simulations/RollingMotionSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("rolling-motion");
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

describe("RollingMotionSimulation", () => {
  it("updates the wheel spoke orientation during live playback", () => {
    const source = buildSimulationSource();
    const params = {
      slopeAngle: 12,
      radius: 0.22,
      inertiaFactor: 0.4,
    } as const;
    const { rerender } = render(
      <RollingMotionSimulation
        concept={source}
        params={params}
        time={0.4}
        setParam={vi.fn()}
      />,
    );

    const spoke = screen.getByTestId("rolling-primary-spoke");
    const initialX1 = Number(spoke.getAttribute("x1"));

    rerender(
      <RollingMotionSimulation
        concept={source}
        params={params}
        time={1.4}
        setParam={vi.fn()}
      />,
    );

    const advancedSpoke = screen.getByTestId("rolling-primary-spoke");
    const advancedX1 = Number(advancedSpoke.getAttribute("x1"));

    expect(advancedX1).not.toBeCloseTo(initialX1, 3);
  });

  it("renders compare badges and the shape-driven rolling note", () => {
    const source = buildSimulationSource();

    render(
      <RollingMotionSimulation
        concept={source}
        params={{
          slopeAngle: 12,
          radius: 0.22,
          inertiaFactor: 0.4,
        }}
        time={1.2}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            slopeAngle: 12,
            radius: 0.22,
            inertiaFactor: 0.4,
          },
          setupB: {
            slopeAngle: 12,
            radius: 0.22,
            inertiaFactor: 1,
          },
          labelA: "Sphere",
          labelB: "Hoop",
        }}
      />,
    );

    expect(screen.getByText(/Sphere: a = 1\.46 m\/s²/i)).toHaveTextContent(/t_bottom = 1\.82 s/i);
    expect(screen.getByText(/Hoop: a = 1\.02 m\/s²/i)).toHaveTextContent(/t_bottom = 2\.17 s/i);
    expect(
      screen.getByText(/Same slope and radius can still produce different rolling times/i),
    ).toBeInTheDocument();
  });

  it("shows the no-slip and energy cues for a small sphere", () => {
    const source = buildSimulationSource();

    render(
      <RollingMotionSimulation
        concept={source}
        params={{
          slopeAngle: 12,
          radius: 0.16,
          inertiaFactor: 0.4,
        }}
        time={1.8}
        setParam={vi.fn()}
        overlayValues={{
          noSlipLink: true,
          massLayout: true,
          energySplit: true,
          frictionTorque: true,
        }}
      />,
    );

    expect(screen.getByText(/v = r omega/i)).toBeInTheDocument();
    expect(screen.getByText(/^solid sphere, r = 0\.16 m$/i)).toBeInTheDocument();
    expect(screen.getByText(/energy split/i)).toBeInTheDocument();
    expect(screen.getAllByText(/f_s =/i).length).toBeGreaterThan(0);
  });
});
