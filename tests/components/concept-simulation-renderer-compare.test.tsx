import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConceptSimulationRenderer } from "@/components/simulations/ConceptSimulationRenderer";
import { ConceptPagePhaseProvider } from "@/components/concepts/ConceptPagePhaseContext";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import { recordPredictionModeUsed } from "@/lib/progress";
import type { ConceptSimulationSource, PredictionModeApi } from "@/lib/physics";
import type { ResolvedConceptSimulationState } from "@/lib/share-links";

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockDynamicSimulation(props: {
      params: Record<string, unknown>;
      compare?: { activeTarget: "a" | "b" };
    }) {
      return (
        <div
          data-testid="mock-compare-scene"
          data-amplitude={String(props.params?.amplitude ?? "")}
          data-compare={props.compare ? "on" : "off"}
          data-target={props.compare?.activeTarget ?? "none"}
        >
          Mock compare scene
        </div>
      );
    }

    MockDynamicSimulation.displayName = "MockDynamicSimulation";

    return MockDynamicSimulation;
  },
}));

vi.mock("@/components/concepts/ChallengeModePanel", () => ({
  ChallengeModePanel: () => <div data-testid="mock-challenge-mode-panel">Challenge mode</div>,
}));

vi.mock("@/components/concepts/GuidedOverlayPanel", () => ({
  GuidedOverlayPanel: () => <div data-testid="mock-guided-overlay-panel">Guided overlay</div>,
}));

vi.mock("@/components/concepts/PredictionModePanel", () => ({
  PredictionModePanel: ({ api }: { api: PredictionModeApi }) => (
    <div
      data-testid="mock-prediction-mode-panel"
      data-mode={api.mode}
      data-active-item={api.activeItemId ?? ""}
    >
      Prediction prompt
      <button type="button" onClick={() => api.setActiveItemId("gt-predict-negative-a")}>
        Use negative scale prediction
      </button>
    </div>
  ),
}));

vi.mock("@/components/concepts/SavedCompareSetupsCard", () => ({
  SavedCompareSetupsCard: () => (
    <div data-testid="saved-compare-setups-card">Saved compare setups</div>
  ),
}));

vi.mock("@/components/concepts/WhatToNoticePanel", () => ({
  WhatToNoticePanel: () => <div data-testid="mock-what-to-notice-panel">What to notice</div>,
}));

vi.mock("@/components/concepts/MathFormula", () => ({
  InlineFormula: ({ expression }: { expression: string }) => <span>{expression}</span>,
  RichMathText: ({
    as: Component = "div",
    className,
    content,
  }: {
    as?: keyof React.JSX.IntrinsicElements;
    className?: string;
    content: string;
  }) => React.createElement(Component, { className }, content),
}));

vi.mock("@/components/concepts/EquationPanel", () => ({
  EquationBenchStrip: () => <div data-testid="mock-bench-equation-strip">Bench equations</div>,
  EquationPanel: () => <div data-testid="mock-equation-panel">Equation panel</div>,
  EquationDetails: () => <div data-testid="mock-equation-details">Equation details</div>,
}));

vi.mock("@/components/concepts/ConceptLearningBridge", () => ({
  useConceptLearningBridge: () => ({
    publishRuntimeSnapshot: vi.fn(),
    publishWorkedExampleSnapshot: vi.fn(),
    registerQuickTestHandler: vi.fn(),
    registerWorkedExampleHandler: vi.fn(),
  }),
}));

vi.mock("@/components/concepts/ConceptAchievementTracker", () => ({
  useConceptAchievementTracker: () => ({
    markMeaningfulInteraction: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAnimationClock", () => ({
  useAnimationClock: () => ({
    time: 0,
    isPlaying: false,
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/lib/progress", async () => {
  const actual = await vi.importActual<typeof import("@/lib/progress")>("@/lib/progress");

  return {
    ...actual,
    recordCompareModeUsed: vi.fn(),
    recordConceptInteraction: vi.fn(),
    recordPredictionModeUsed: vi.fn(),
  };
});

vi.mock("@/components/graphs", async () => {
  const actual = await vi.importActual<typeof import("@/components/graphs")>("@/components/graphs");

  return {
    ...actual,
    LineGraph: ({ title }: { title: string }) => (
      <div data-testid="mock-line-graph">{title}</div>
    ),
  };
});

function buildSimulationSource(slug: string): ConceptSimulationSource {
  const concept = getConceptBySlug(slug);
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

function buildInitialCompareState(
  concept: ConceptContent,
): ResolvedConceptSimulationState {
  return {
    params: { ...concept.simulation.defaults },
    activePresetId: null,
    activeGraphId: "vertex-height-map",
    overlayValues: {
      referenceCurve: true,
      vertexMarkers: true,
      shiftGuide: true,
    },
    focusedOverlayId: "shiftGuide",
    inspectTime: null,
    compare: {
      activeTarget: "b",
      setupA: {
        label: "Baseline",
        params: { ...concept.simulation.defaults },
        activePresetId: null,
      },
      setupB: {
        label: "Variant",
        params: {
          ...concept.simulation.defaults,
          verticalScale: -1.6,
          mirrorY: true,
        },
        activePresetId: null,
      },
    },
  };
}

describe("ConceptSimulationRenderer compare state", () => {
  it("keeps prediction out of the primary bench modes", () => {
    render(<ConceptSimulationRenderer concept={buildSimulationSource("simple-harmonic-motion")} />);

    const interactionTabs = screen.getByRole("tablist", {
      name: "Concept interaction modes",
    });

    expect(within(interactionTabs).getAllByRole("tab")).toHaveLength(2);
    expect(within(interactionTabs).getByRole("tab", { name: "Explore" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(interactionTabs).getByRole("tab", { name: "Compare" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(within(interactionTabs).queryByRole("tab", { name: "Predict" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("concept-runtime-prediction-action")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-prediction-mode-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("concept-secondary-prediction-flow")).toHaveTextContent(
      "Prediction prompt",
    );
  });

  it("keeps authored prediction prompts reachable as secondary content", async () => {
    const user = userEvent.setup();

    render(<ConceptSimulationRenderer concept={buildSimulationSource("simple-harmonic-motion")} />);

    const interactionTabs = screen.getByRole("tablist", {
      name: "Concept interaction modes",
    });
    const predictionFlow = screen.getByTestId("concept-secondary-prediction-flow");

    expect(screen.queryByTestId("mock-prediction-mode-panel")).not.toBeInTheDocument();

    await user.click(within(predictionFlow).getByText("Prediction prompt"));
    await user.click(
      within(predictionFlow).getByRole("button", {
        name: "Open prediction prompt",
      }),
    );

    expect(screen.getByTestId("mock-prediction-mode-panel")).toHaveAttribute(
      "data-mode",
      "predict",
    );
    expect(recordPredictionModeUsed).toHaveBeenCalledTimes(1);
    expect(within(interactionTabs).getByRole("tab", { name: "Explore" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(interactionTabs).queryByRole("tab", { name: "Predict" })).not.toBeInTheDocument();
  });

  it("auto-reveals secondary controls and graphs for the secondary prediction workflow", async () => {
    const user = userEvent.setup();

    render(<ConceptSimulationRenderer concept={buildSimulationSource("graph-transformations")} />);

    const predictionFlow = screen.getByTestId("concept-secondary-prediction-flow");

    await user.click(within(predictionFlow).getByText("Prediction prompt"));
    await user.click(
      within(predictionFlow).getByRole("button", {
        name: "Open prediction prompt",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Use negative scale prediction",
      }),
    );

    const controls = screen.getByTestId("simulation-shell-controls");
    const graphs = screen.getByTestId("simulation-shell-graphs");

    expect(screen.getByTestId("mock-prediction-mode-panel")).toHaveAttribute(
      "data-active-item",
      "gt-predict-negative-a",
    );
    expect(within(controls).getByRole("button", { name: "More tools" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(controls).getByRole("slider", { name: "Vertical scale" })).toBeInTheDocument();
    expect(within(graphs).getByRole("button", { name: "Hide graphs" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      within(graphs).getByRole("tab", { name: /Vertex height vs vertical scale/i }),
    ).toBeInTheDocument();
  });

  it("lets phase support disclosures stay open across bench rerenders", async () => {
    const user = userEvent.setup();
    const renderPhaseBench = () => (
      <ConceptPagePhaseProvider activePhaseId="explore">
        <ConceptSimulationRenderer concept={buildSimulationSource("simple-harmonic-motion")} />
      </ConceptPagePhaseProvider>
    );
    const view = render(renderPhaseBench());
    const supportDisclosure = screen.getByTestId(
      "concept-phase-bench-support-disclosure-explore",
    );

    expect(supportDisclosure).not.toHaveAttribute("open");

    await user.click(within(supportDisclosure).getByText("Extra prompts"));
    expect(supportDisclosure).toHaveAttribute("open");

    view.rerender(renderPhaseBench());
    expect(
      screen.getByTestId("concept-phase-bench-support-disclosure-explore"),
    ).toHaveAttribute("open");
  });

  it("keeps compare enter, target switching, setup edits, and exit on one renderer-owned state seam", async () => {
    const user = userEvent.setup();

    render(<ConceptSimulationRenderer concept={buildSimulationSource("simple-harmonic-motion")} />);

    const interactionTabs = screen.getByRole("tablist", {
      name: "Concept interaction modes",
    });
    const controls = screen.getByTestId("simulation-shell-controls");

    expect(screen.queryByTestId("control-panel-compare-tools")).not.toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: "Compare mode" })).not.toBeInTheDocument();

    await user.click(within(interactionTabs).getByRole("tab", { name: "Compare" }));

    const compareTools = screen.getByTestId("control-panel-compare-tools");
    const amplitudeSlider = within(controls).getByRole("slider", {
      name: "Amplitude",
    }) as HTMLInputElement;
    const initialAmplitude = amplitudeSlider.value;

    expect(screen.getByTestId("mock-compare-scene")).toHaveAttribute("data-compare", "on");
    expect(screen.getByTestId("mock-compare-scene")).toHaveAttribute("data-target", "b");
    expect(within(interactionTabs).getByRole("tab", { name: "Compare" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(compareTools).toHaveTextContent("Editing Setup B");

    fireEvent.change(amplitudeSlider, { target: { value: "2.2" } });
    expect(amplitudeSlider.value).toBe("2.2");

    await user.click(within(compareTools).getByRole("tab", { name: /Setup A/i }));
    expect(screen.getByTestId("mock-compare-scene")).toHaveAttribute("data-target", "a");
    expect(compareTools).toHaveTextContent("Editing Setup A");
    expect(amplitudeSlider.value).toBe(initialAmplitude);

    await user.click(within(compareTools).getByRole("tab", { name: /Setup B/i }));
    expect(screen.getByTestId("mock-compare-scene")).toHaveAttribute("data-target", "b");
    expect(amplitudeSlider.value).toBe("2.2");

    expect(screen.getByTestId("compare-support-panel")).toHaveTextContent("Saved compare setups");
    expect(screen.queryByTestId("compare-observation-panel")).not.toBeInTheDocument();

    await user.click(within(compareTools).getByRole("button", { name: "Exit compare mode" }));

    expect(screen.getByTestId("mock-compare-scene")).toHaveAttribute("data-compare", "off");
    expect(screen.getByTestId("mock-compare-scene")).toHaveAttribute("data-target", "none");
    expect(screen.queryByTestId("compare-support-panel")).not.toBeInTheDocument();
  });

  it("restores compare state with hidden controls and graphs expanded, without reviving a duplicate preview", () => {
    const concept = getConceptBySlug("graph-transformations");

    render(
      <ConceptSimulationRenderer
        concept={buildSimulationSource("graph-transformations")}
        initialSimulationState={buildInitialCompareState(concept)}
      />,
    );

    const controls = screen.getByTestId("simulation-shell-controls");
    const graphs = screen.getByTestId("simulation-shell-graphs");
    const compareTools = screen.getByTestId("control-panel-compare-tools");

    expect(within(controls).getByRole("button", { name: "More tools" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(controls).getByRole("slider", { name: "Vertical scale" })).toBeInTheDocument();
    expect(
      within(controls).getByRole("checkbox", { name: "Reflect across y-axis" }),
    ).toBeInTheDocument();

    expect(within(graphs).getByRole("button", { name: "Hide graphs" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      within(graphs).getByRole("tab", { name: /Vertex height vs vertical scale/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(compareTools).getByRole("tab", { name: /Setup B/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("compare-support-panel")).toHaveTextContent("Saved compare setups");
    expect(screen.queryByTestId("compare-observation-panel")).not.toBeInTheDocument();
  });
});
