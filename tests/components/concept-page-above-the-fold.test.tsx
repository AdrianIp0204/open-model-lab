import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConceptPageFramework } from "@/components/concepts/ConceptPageFramework";
import {
  getConceptBySlug,
  getReadNextRecommendations,
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

  it("keeps routed concepts lab-first without a late start/context block", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderConceptFramework(concept);

    const liveLab = screen.getByTestId("concept-live-lab");
    const postLabContext = screen.getByTestId("concept-v2-post-lab-context");

    expect(screen.getByTestId("concept-page-v2-shell")).toBeInTheDocument();
    expect(liveLab).toBeInTheDocument();
    expect(screen.queryByTestId("concept-v2-start-here")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Return to bench" })).not.toBeInTheDocument();
    expect(screen.queryByText("Lesson context")).not.toBeInTheDocument();
    expect(screen.queryByText("Why it matters")).not.toBeInTheDocument();
    expect(
      liveLab.compareDocumentPosition(postLabContext) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps fallback V2 concepts lab-first without a late start-here block", () => {
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.v2 = undefined;

    renderConceptFramework(concept);

    expect(screen.getByTestId("concept-page-v2-shell")).toBeInTheDocument();
    expect(screen.getByTestId("concept-live-lab")).toBeInTheDocument();
    expect(screen.queryByTestId("concept-v2-start-here")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Return to bench" })).not.toBeInTheDocument();
  });

  it("does not front-load authored prerequisites as a second start panel", () => {
    const concept = getConceptBySlug("wave-interference");

    renderConceptFramework(concept);

    expect(screen.getByTestId("concept-page-v2-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("concept-v2-start-here")).not.toBeInTheDocument();
    expect(screen.queryByTestId("concept-v2-prerequisites")).not.toBeInTheDocument();
    expect(screen.queryByText("Start with two equal sources")).not.toBeInTheDocument();
  });

  it("keeps fallback summary copy out of the default current lesson stack", () => {
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.v2 = undefined;
    delete concept.pageIntro;
    const fallbackSummary = concept.summary;

    renderConceptFramework(concept);

    expect(screen.queryByTestId("concept-v2-start-here")).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackSummary)).not.toBeInTheDocument();
    expect(screen.queryByText("Why it matters")).not.toBeInTheDocument();
  });

  it("keeps zh-HK routed concepts from leaking English late start copy", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const concept = localizeConceptContent(
      getConceptBySlug("simple-harmonic-motion"),
      "zh-HK",
    );

    renderConceptFramework(concept);

    expect(screen.queryByTestId("concept-v2-start-here")).not.toBeInTheDocument();
    expect(screen.queryByText("Why it matters")).not.toBeInTheDocument();
    expect(screen.queryByText("Return to bench")).not.toBeInTheDocument();
  });
});
