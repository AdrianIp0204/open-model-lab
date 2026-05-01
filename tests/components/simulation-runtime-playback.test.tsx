import { render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConceptLearningBridgeProvider } from "@/components/concepts/ConceptLearningBridge";
import { SHMSimulation } from "@/components/simulations/SHMSimulation";
import { useAnimationClock } from "@/hooks/useAnimationClock";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

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

function parseMassCenterX() {
  const mass = screen.getByRole("button", { name: /draggable oscillator mass/i });
  const massAxis = mass.querySelector("circle");

  if (!massAxis) {
    throw new Error("Expected the oscillator mass to expose a center circle.");
  }

  const cx = massAxis.getAttribute("cx");
  if (!cx) {
    throw new Error("Expected the oscillator mass center to expose a cx coordinate.");
  }

  return Number(cx);
}

function SimulationRuntimeHarness() {
  const concept = buildSimulationSource();
  const { time } = useAnimationClock({
    autoStart: true,
    initialTime: 0,
  });

  return (
    <ConceptLearningBridgeProvider>
      <div data-testid="runtime-time">{time.toFixed(3)}</div>
      <SHMSimulation
        concept={concept}
        params={{
          amplitude: 1.4,
          angularFrequency: 1.8,
          phase: 0,
          damping: 0,
          mass: 1,
          equilibriumShift: 0,
        }}
        time={time}
        setParam={vi.fn()}
      />
    </ConceptLearningBridgeProvider>
  );
}

describe("simulation runtime playback", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("advances the live stage without any pointer or focus interaction", () => {
    vi.useFakeTimers();

    const originalMatchMedia = window.matchMedia;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    try {
      let frameTime = performance.now();
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) =>
        window.setTimeout(() => {
          frameTime += 16;
          callback(frameTime);
        }, 16),
      );
      window.cancelAnimationFrame = vi.fn((handle: number) => window.clearTimeout(handle));

      render(<SimulationRuntimeHarness />);

      const initialTime = Number(screen.getByTestId("runtime-time").textContent);
      const initialMassX = parseMassCenterX();

      act(() => {
        vi.advanceTimersByTime(80);
      });

      const advancedTime = Number(screen.getByTestId("runtime-time").textContent);
      const advancedMassX = parseMassCenterX();

      expect(advancedTime).toBeGreaterThan(initialTime);
      expect(advancedMassX).not.toBeCloseTo(initialMassX, 3);
    } finally {
      window.matchMedia = originalMatchMedia;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
