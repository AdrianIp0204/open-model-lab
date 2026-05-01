import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConceptPageFramework } from "@/components/concepts/ConceptPageFramework";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  resolveConceptPageV2,
  type ConceptContent,
} from "@/lib/content";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { localizeConceptContent } from "@/lib/i18n/concept-content";
import type { ConceptSimulationSource } from "@/lib/physics";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/components/simulations/DeferredConceptSimulationRenderer", () => ({
  DeferredConceptSimulationRenderer: ({
    concept,
  }: {
    concept: ConceptSimulationSource;
  }) => (
    <div className="space-y-3">
      <div data-testid="simulation-renderer">{concept.title} renderer</div>
    </div>
  ),
}));

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: () => null,
  InArticleAd: () => null,
  MultiplexAd: () => null,
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
      guidedOverlays: (concept.simulation.overlays?.length ?? 0) > 0,
      noticePrompts: concept.noticePrompts.items.length > 0,
      workedExamples: concept.sections.workedExamples.items.length > 0,
      quickTest: concept.quickTest.questions.length > 0,
    },
    simulation: {
      ...concept.simulation,
      kind: concept.simulation.kind,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription:
          concept.accessibility.simulationDescription.paragraphs.join(" "),
        graphSummary: concept.accessibility.graphSummary.paragraphs.join(" "),
      },
    },
  };
}

function renderConceptFramework(concept: ConceptContent) {
  return render(
    <ConceptPageFramework
      concept={concept}
      simulationSource={buildSimulationSource(concept)}
      readNext={getReadNextRecommendations(concept.slug)}
    />,
  );
}

describe("ConceptPage above-the-fold entry flow", () => {
  useAccountSessionMock.mockReturnValue({
    initialized: true,
    status: "signed-in",
    user: { id: "user-1" },
    entitlement: resolveAccountEntitlement({
      tier: "premium",
      source: "stored",
      updatedAt: "2026-04-16T00:00:00.000Z",
    }),
  });

  it("keeps the authored V2 start-here rail above the live lab", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderConceptFramework(concept);

    const startHere = screen.getByTestId("concept-v2-start-here");
    const liveLab = screen.getByTestId("concept-live-lab");

    expect(screen.getByTestId("concept-page-v2-shell")).toBeInTheDocument();
    expect(startHere).toHaveTextContent("Start here");
    expect(startHere).toHaveTextContent("Why it matters");
    expect(startHere).toHaveTextContent("Key takeaway");
    expect(
      within(screen.getByTestId("concept-v2-start-lesson-preview-first")).queryByText(
        "Start concept",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("concept-v2-start-lesson-preview-connector")).not.toBeInTheDocument();
    expect(screen.getByTestId("concept-v2-start-lesson-preview-list")).toHaveClass(
      "sm:grid-cols-2",
      "2xl:grid-cols-4",
    );
    expect(screen.getByTestId("concept-v2-start-lesson-preview-list")).not.toHaveClass(
      "xl:grid-cols-4",
    );
    expect(screen.getAllByRole("button", { name: "Start concept" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Start concept" })).toHaveClass(
      "w-full",
    );
    expect(screen.queryByTestId("concept-page-status-surface")).not.toBeInTheDocument();
    expect(screen.getByTestId("concept-v2-start-handoff")).toHaveTextContent(
      "Estimated time: 25 min",
    );
    expect(screen.getByTestId("concept-v2-prerequisites")).toHaveTextContent(
      "No prerequisites",
    );
    expect(screen.getByTestId("concept-v2-simulation-preview")).toHaveTextContent(
      "Start by changing Amplitude, then compare the stage with the Displacement over time graph.",
    );
    expect(
      screen.getByTestId("concept-v2-start-handoff").compareDocumentPosition(
        screen.getByTestId("concept-v2-prerequisites"),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      startHere.compareDocumentPosition(liveLab) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses the fallback V2 start-here shell for non-migrated concepts", () => {
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.v2 = undefined;
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    renderConceptFramework(concept);

    const startHere = screen.getByTestId("concept-v2-start-here");
    const liveLab = screen.getByTestId("concept-live-lab");

    expect(model.source).toBe("fallback");
    expect(screen.getByTestId("concept-page-v2-shell")).toBeInTheDocument();
    expect(startHere).toHaveTextContent(model.intuition);
    expect(startHere).toHaveTextContent("Start concept");
    expect(
      startHere.compareDocumentPosition(liveLab) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders authored prerequisite titles calmly near the top", () => {
    const concept = getConceptBySlug("wave-interference");

    renderConceptFramework(concept);

    const startHere = screen.getByTestId("concept-v2-start-here");
    const prerequisites = screen.getByTestId("concept-v2-prerequisites");
    expect(startHere).toHaveTextContent("Start with two equal sources");
    expect(startHere).toHaveTextContent(
      "the probe graph traces the wave's up-and-down motion over time at one selected point",
    );
    expect(prerequisites).toHaveTextContent("Simple Harmonic Motion");
    expect(prerequisites).toHaveTextContent("Wave Speed and Wavelength");
    expect(
      within(prerequisites).getByRole("link", { name: "Simple Harmonic Motion" }),
    ).toHaveAttribute("href", "/concepts/simple-harmonic-motion");
  });

  it("falls back to the concept summary when a fallback concept has no page intro", () => {
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.v2 = undefined;
    delete concept.pageIntro;
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    renderConceptFramework(concept);

    const startHere = screen.getByTestId("concept-v2-start-here");
    expect(model.source).toBe("fallback");
    expect(model.intuition).toBe(concept.summary);
    expect(startHere).toHaveTextContent(concept.summary);
    expect(startHere).not.toHaveTextContent("Why it matters");
    expect(startHere).not.toHaveTextContent("Key takeaway");
  });

  it("renders localized zh-HK start-here copy for authored v2 concepts", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const concept = localizeConceptContent(
      getConceptBySlug("simple-harmonic-motion"),
      "zh-HK",
    );

    renderConceptFramework(concept);

    const startHere = screen.getByTestId("concept-v2-start-here");
    expect(startHere).toHaveTextContent("為甚麼重要");
    expect(startHere.textContent).toMatch(/[\u4e00-\u9fff]/);
    expect(startHere).not.toHaveTextContent("Why it matters");
  });
});
