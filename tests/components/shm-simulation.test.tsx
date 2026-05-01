import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SHMSimulation } from "@/components/simulations/SHMSimulation";
import { getConceptBySlug } from "@/lib/content";
import {
  clamp,
  phaseFromDisplacement,
  sampleShmState,
  type ConceptSimulationSource,
  type GraphStagePreview,
} from "@/lib/physics";

const WIDTH = 760;
const DISPLACEMENT_SCALE = 58;
const MAX_VISIBLE_DISPLACEMENT = 3.2;

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("simple-harmonic-motion");
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

function displacementToX(displacement: number) {
  return clamp(
    WIDTH / 2 + displacement * DISPLACEMENT_SCALE,
    WIDTH / 2 - MAX_VISIBLE_DISPLACEMENT * DISPLACEMENT_SCALE,
    WIDTH / 2 + MAX_VISIBLE_DISPLACEMENT * DISPLACEMENT_SCALE,
  );
}

function parseMassCenterX(element: HTMLElement) {
  const massAxis = element.querySelector("circle");
  if (!massAxis) {
    throw new Error("Expected the draggable mass group to contain its center marker.");
  }

  const cx = massAxis.getAttribute("cx");
  if (!cx) {
    throw new Error("Expected the draggable mass center marker to expose a cx coordinate.");
  }

  return Number(cx);
}

describe("SHMSimulation", () => {
  it("moves the draggable mass with the live playback displacement", () => {
    const source = buildSimulationSource();
    const params = {
      amplitude: 1.4,
      angularFrequency: 1.8,
      phase: 0,
      damping: 0,
      mass: 1,
      equilibriumShift: 0,
    } as const;
    const { rerender } = render(
      <SHMSimulation
        concept={source}
        params={params}
        time={0}
        setParam={vi.fn()}
      />,
    );

    const mass = screen.getByRole("button", { name: /draggable oscillator mass/i });
    const initialX = parseMassCenterX(mass);
    const initialDisplacement = sampleShmState(params, 0).displacement;

    expect(initialX).toBeCloseTo(displacementToX(initialDisplacement), 3);

    rerender(
      <SHMSimulation
        concept={source}
        params={params}
        time={1}
        setParam={vi.fn()}
      />,
    );

    const advancedX = parseMassCenterX(screen.getByRole("button", { name: /draggable oscillator mass/i }));
    const advancedDisplacement = sampleShmState(params, 1).displacement;

    expect(advancedX).toBeCloseTo(displacementToX(advancedDisplacement), 3);
    expect(advancedX).not.toBeCloseTo(initialX, 3);
  });

  it("repositions the draggable mass from the preview time during scrubbing", () => {
    const source = buildSimulationSource();
    const params = {
      amplitude: 1.4,
      angularFrequency: 1.8,
      phase: 0,
      damping: 0,
      mass: 1,
      equilibriumShift: 0,
    } as const;
    const preview: GraphStagePreview = {
      kind: "time",
      graphId: "displacement",
      time: 1,
      seriesId: "position",
      seriesLabel: "Displacement",
      point: { x: 1, y: sampleShmState(params, 1).displacement },
      pointIndex: 30,
      pointCount: 240,
    };

    render(
      <SHMSimulation
        concept={source}
        params={params}
        time={0}
        setParam={vi.fn()}
        graphPreview={preview}
      />,
    );

    const previewX = parseMassCenterX(screen.getByRole("button", { name: /draggable oscillator mass/i }));
    const previewDisplacement = sampleShmState(params, preview.time).displacement;
    const baseDisplacement = sampleShmState(params, 0).displacement;

    expect(previewX).toBeCloseTo(displacementToX(previewDisplacement), 3);
    expect(previewX).not.toBeCloseTo(displacementToX(baseDisplacement), 3);
  });

  it("keeps the draggable mass wired to the phase setter for direct manipulation", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();

    render(
      <SHMSimulation
        concept={source}
        params={{
          amplitude: 1.4,
          angularFrequency: 1.8,
          phase: 0,
          damping: 0,
          mass: 1,
          equilibriumShift: 0,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /draggable oscillator mass/i }), {
      key: "ArrowRight",
    });

    expect(setParam).toHaveBeenCalledWith("phase", 0.1);
  });

  it("updates the starting displacement from pointer dragging on the mass", () => {
    const source = buildSimulationSource();
    const setParam = vi.fn();
    const params = {
      amplitude: 1.4,
      angularFrequency: 1.8,
      phase: 0,
      damping: 0,
      mass: 1,
      equilibriumShift: 0,
    } as const;

    render(
      <SHMSimulation
        concept={source}
        params={params}
        time={0}
        setParam={setParam}
      />,
    );

    const stage = screen.getByRole("img");
    const mass = screen.getByRole("button", { name: /draggable oscillator mass/i });
    const targetDisplacement = 0.7;
    const targetClientX = WIDTH / 2 + targetDisplacement * DISPLACEMENT_SCALE;
    const expectedPhase = Number(
      phaseFromDisplacement(targetDisplacement, params.amplitude, 0, params.angularFrequency).toFixed(3),
    );

    Object.defineProperty(stage, "getBoundingClientRect", {
      value: () =>
        ({
          left: 0,
          width: WIDTH,
        }) as DOMRect,
    });
    Object.defineProperty(mass, "setPointerCapture", {
      value: vi.fn(),
    });

    fireEvent.pointerDown(mass, {
      pointerId: 1,
      clientX: targetClientX,
    });

    expect(setParam).toHaveBeenCalledWith("phase", expectedPhase);
  });
});
