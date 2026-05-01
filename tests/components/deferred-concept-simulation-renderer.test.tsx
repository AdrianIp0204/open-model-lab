import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredConceptSimulationRenderer } from "@/components/simulations/DeferredConceptSimulationRenderer";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockDeferredRenderer({
      concept,
    }: {
      concept: { title: string };
    }) {
      return <div data-testid="mock-concept-simulation-renderer">{concept.title}</div>;
    };
  },
}));

function buildSimulationSource(concept: ConceptContent): ConceptSimulationSource {
  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    slug: concept.slug,
    topic: concept.topic,
    equations: concept.equations,
    variableLinks: concept.variableLinks,
    simulation: {
      ...concept.simulation,
      kind: concept.simulation.kind,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription: concept.accessibility.simulationDescription.paragraphs.join(" "),
        graphSummary: concept.accessibility.graphSummary.paragraphs.join(" "),
      },
    },
    noticePrompts: concept.noticePrompts,
    predictionMode: {
      title: concept.predictionMode.title,
      intro: concept.predictionMode.intro,
      items: concept.predictionMode.items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        changeLabel: item.changeLabel,
        choices: item.choices,
        correctChoiceId: item.correctChoiceId,
        explanation: item.explanation,
        observationHint: item.observationHint,
        scenario: {
          id: item.id,
          label: item.scenarioLabel,
          presetId: item.apply.presetId ?? item.applyPresetId,
          patch: item.apply.patch ?? item.applyPatch,
          highlightedControlIds: item.highlightedControls,
          highlightedGraphIds: item.highlightedGraphs,
          highlightedOverlayIds: item.highlightedOverlays,
        },
      })),
    },
    challengeMode: concept.challengeMode,
    featureAvailability: {
      prediction: concept.predictionMode.items.length > 0,
      compare: true,
      challenge: (concept.challengeMode?.items.length ?? 0) > 0,
      guidedOverlays: (concept.simulation.overlays ?? []).length > 0,
      noticePrompts: concept.noticePrompts.items.length > 0,
      workedExamples: concept.sections.workedExamples.items.length > 0,
      quickTest: concept.quickTest.questions.length > 0,
    },
  };
}

function setBrowserEnvironment({
  height,
  maxTouchPoints,
  userAgent,
  width,
}: {
  height: number;
  maxTouchPoints: number;
  userAgent: string;
  width: number;
}) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints,
  });
  Object.defineProperty(window.screen, "width", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window.screen, "height", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

describe("DeferredConceptSimulationRenderer", () => {
  const concept = buildSimulationSource(getConceptBySlug("simple-harmonic-motion"));

  beforeEach(() => {
    vi.useFakeTimers();
    setBrowserEnvironment({
      height: 900,
      maxTouchPoints: 0,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      width: 1440,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-loads the live bench outside the mobile WebKit fallback", async () => {
    render(<DeferredConceptSimulationRenderer concept={concept} />);

    expect(screen.getByText(/simulation loading/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(
      screen.getByTestId("mock-concept-simulation-renderer"),
    ).toHaveTextContent(/simple harmonic motion/i);
  });

  it("keeps iPhone WebKit on a manual boot path until the user asks for the lab", async () => {
    setBrowserEnvironment({
      height: 844,
      maxTouchPoints: 5,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      width: 390,
    });
    render(<DeferredConceptSimulationRenderer concept={concept} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: /load live lab/i }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(
      screen.queryByTestId("mock-concept-simulation-renderer"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /load live lab/i }));

    expect(
      screen.getByTestId("mock-concept-simulation-renderer"),
    ).toHaveTextContent(/simple harmonic motion/i);
  });
});
