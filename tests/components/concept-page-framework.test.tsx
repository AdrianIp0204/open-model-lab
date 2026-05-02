import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConceptPageFramework } from "@/components/concepts/ConceptPageFramework";
import { useConceptPagePhase } from "@/components/concepts/ConceptPagePhaseContext";
import { conceptPageV2CurrentStepHeadingId } from "@/components/concepts/ConceptPageV2Panels";
import {
  getConceptPageV2StepHashId,
  getConceptBySlug,
  getReadNextRecommendations,
  resolveConceptPageV2,
  type ConceptContent,
} from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { localConceptProgressStore } from "@/lib/progress";

const useAccountSessionMock = vi.fn();
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: () => <div data-testid="display-ad" />,
  InArticleAd: () => <div data-testid="in-article-ad" />,
  MultiplexAd: () => <div data-testid="multiplex-ad" />,
}));

function GuidedLabProbe() {
  const context = useConceptPagePhase();

  return (
    <div data-testid="simulation-renderer" className="space-y-3">
      <div id="live-bench" tabIndex={-1}>
        Live bench
      </div>
      <div data-testid="guided-step-slot">{context?.guidedStepCard}</div>
      <div data-testid="guided-step-support-slot">{context?.guidedStepSupport}</div>
      <pre data-testid="guided-reveal-probe">
        {JSON.stringify(context?.guidedReveal ?? null)}
      </pre>
      <div data-testid="phase-probe">{context?.activePhaseId ?? "none"}</div>
    </div>
  );
}

vi.mock("@/components/simulations/DeferredConceptSimulationRenderer", () => ({
  DeferredConceptSimulationRenderer: ({
    concept,
  }: {
    concept: ConceptSimulationSource;
  }) => (
    <div data-testid="deferred-simulation-probe">
      <div>{concept.title}</div>
      <GuidedLabProbe />
    </div>
  ),
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

function renderFramework(slug: string) {
  const concept = getConceptBySlug(slug);

  return renderConceptFramework(concept);
}

function renderConceptFramework(concept: ConceptContent) {

  return render(
    <ConceptPageFramework
      concept={concept}
      simulationSource={buildSimulationSource(concept)}
      readNext={getReadNextRecommendations(concept.slug)}
      subjectPage={{
        title: concept.subject,
        path: "/concepts/subjects/physics",
      }}
      topicPage={{
        title: concept.topic,
        path: "/concepts/topics/oscillations",
      }}
    />,
  );
}

describe("ConceptPageFramework V2", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: { id: "user-1" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-17T00:00:00.000Z",
      }),
    });
  });

  afterEach(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    useAccountSessionMock.mockReset();
    localConceptProgressStore.resetForTests();
    globalThis.__TEST_LOCALE__ = undefined;
    window.localStorage.clear();
    window.history.replaceState(window.history.state, "", "/");
  });

  it("renders Start Here with a primary CTA and equation snapshot", () => {
    renderFramework("simple-harmonic-motion");

    expect(screen.getByTestId("concept-v2-start-here")).toBeInTheDocument();
    const lessonPreview = screen.getByTestId("concept-v2-start-lesson-preview");
    expect(lessonPreview).toHaveTextContent("See one full cycle");
    expect(lessonPreview).toHaveTextContent(
      "Build the first picture on the live bench before you analyse the graphs.",
    );
    expect(
      screen.getAllByTestId("concept-v2-start-lesson-preview-quick-check").length,
    ).toBeGreaterThan(0);
    expect(lessonPreview).toHaveTextContent("Quick check");
    expect(screen.getByRole("button", { name: /start concept/i })).toBeInTheDocument();
    const equationSnapshot = screen.getByTestId("concept-v2-equation-snapshot");
    expect(equationSnapshot).toHaveTextContent(/equation snapshot/i);
    expect(equationSnapshot).toHaveTextContent(/restoring pattern/i);
  });

  it("keeps the title compact and moves Start Here into post-lab context beside status", () => {
    renderFramework("simple-harmonic-motion");

    const heroGrid = screen.getByTestId("concept-v2-hero-grid");
    const heroMain = screen.getByTestId("concept-v2-hero-main");
    const heroTitle = screen.getByTestId("concept-v2-hero-title");
    const postLabContext = screen.getByTestId("concept-v2-post-lab-context");
    const heroStatus = screen.getByTestId("concept-v2-hero-status");
    const heroStart = screen.getByTestId("concept-v2-hero-start");
    const equationSnapshot = screen.getByTestId("concept-v2-equation-snapshot");

    expect(heroGrid).toBeInTheDocument();
    expect(within(heroTitle).getByRole("heading", { name: /simple harmonic motion/i })).toBeInTheDocument();
    expect(within(heroStatus).queryByTestId("concept-page-status-surface")).not.toBeInTheDocument();
    expect(within(heroStart).getByTestId("concept-v2-start-here")).toBeInTheDocument();
    expect(equationSnapshot).toBeInTheDocument();
    expect(heroMain).toContainElement(heroTitle);
    expect(postLabContext).toContainElement(heroStart);
    expect(postLabContext).toContainElement(heroStatus);
    expect(
      heroTitle.compareDocumentPosition(heroStart) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      heroStatus.compareDocumentPosition(equationSnapshot) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("tucks bench utilities into one post-lesson disclosure instead of duplicating share tools", () => {
    renderFramework("simple-harmonic-motion");

    const benchUtilities = screen.getByTestId("concept-bench-utilities");

    expect(benchUtilities).toHaveTextContent("Bench tools and share links");
    expect(within(benchUtilities).getByText("Try this setup")).toBeInTheDocument();
    expect(screen.getAllByText("Try this setup")).toHaveLength(1);
  });

  it("starts the lesson and exposes the first guided step inside the live lab", async () => {
    const user = userEvent.setup();

    renderFramework("simple-harmonic-motion");
    await user.click(screen.getByRole("button", { name: /start concept/i }));

    await waitFor(() => {
      expect(window.location.hash).toContain("guided-step-see-one-full-cycle");
    });
    const guidedLiveLab = screen.getByRole("region", { name: "Lesson path" });
    expect(guidedLiveLab).toHaveAttribute("data-testid", "concept-v2-guided-live-lab");
    expect(screen.getByTestId("guided-step-slot")).toHaveTextContent("See one full cycle");
    expect(screen.getByTestId("guided-reveal-probe")).toHaveTextContent("amplitude");
    expect(screen.getByTestId("phase-probe")).toHaveTextContent("explore");
    expect(document.activeElement).toHaveAttribute("id", "live-bench");
  });

  it("moves through guided steps and updates the reveal contract", async () => {
    const user = userEvent.setup();

    renderFramework("simple-harmonic-motion");
    await user.click(screen.getByRole("button", { name: /start concept/i }));
    await user.click(
      within(screen.getByTestId("concept-v2-next-checkpoint")).getByRole("button", {
        name: /up next/i,
      }),
    );

    expect(screen.getByTestId("guided-step-slot")).toHaveTextContent("Link the stage and graphs");
    expect(screen.getByTestId("guided-step-support-slot")).toHaveTextContent(
      "Read the graph before you answer",
    );
    expect(screen.getByTestId("guided-reveal-probe")).toHaveTextContent("velocity");
    expect(screen.getByTestId("guided-reveal-probe")).toHaveTextContent("acceleration");
    expect(screen.getByTestId("phase-probe")).toHaveTextContent("understand");
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("id", conceptPageV2CurrentStepHeadingId);
    });
    expect(document.activeElement?.tagName).toBe("H2");

    await user.click(
      within(screen.getByTestId("concept-v2-next-checkpoint")).getByRole("button", {
        name: /up next/i,
      }),
    );

    expect(screen.getByTestId("phase-probe")).toHaveTextContent("check");
  });

  it("lets learners jump between guided steps from the lesson map", async () => {
    const user = userEvent.setup();

    renderFramework("simple-harmonic-motion");
    await user.click(screen.getByRole("button", { name: /start concept/i }));

    const stepMap = screen.getByTestId("concept-v2-step-map");
    expect(stepMap).toHaveTextContent("See one full cycle");
    expect(stepMap).toHaveTextContent("Explain the restoring rule");

    await user.click(
      within(stepMap).getByRole("button", {
        name: /explain the restoring rule/i,
      }),
    );

    await waitFor(() => {
      expect(window.location.hash).toContain(
        getConceptPageV2StepHashId("explain-the-restoring-rule"),
      );
    });
    expect(screen.getByTestId("guided-step-slot")).toHaveTextContent(
      "Explain the restoring rule",
    );
    expect(screen.getByTestId("phase-probe")).toHaveTextContent("check");
  });

  it("renders inline quick checks inside the guided step flow", async () => {
    const user = userEvent.setup();

    renderFramework("graph-transformations");
    await user.click(screen.getByRole("button", { name: /start concept/i }));

    expect(screen.getByTestId("guided-step-slot")).toHaveTextContent("Slide the parent curve");
    expect(screen.getByTestId("guided-step-support-slot")).toHaveTextContent(
      "Quick check",
    );
    expect(screen.getAllByTestId("concept-v2-inline-check").length).toBeGreaterThan(0);
  });

  it("keeps next-concept choices separate from same-concept practice actions in the wrap-up", () => {
    renderFramework("simple-harmonic-motion");

    const wrapUp = screen.getByTestId("concept-v2-wrap-up");
    const readNext = screen.getByTestId("concept-v2-read-next");
    const practiceActions = screen.getByTestId("concept-v2-practice-actions");
    const learnedList = screen.getByTestId("concept-v2-learned-list");

    expect(wrapUp).toBeInTheDocument();
    expect(within(learnedList).getAllByRole("listitem")).toHaveLength(3);
    expect(readNext).toHaveTextContent("Read next");
    expect(readNext).toHaveTextContent(
      "Keep the sequence moving with the most relevant follow-up concept.",
    );
    expect(within(readNext).getAllByTestId("concept-v2-read-next-card").length).toBeGreaterThan(0);
    expect(within(readNext).queryByRole("link", { name: "Open concept test" })).not.toBeInTheDocument();
    expect(within(readNext).queryByRole("link", { name: "Free play on the bench" })).not.toBeInTheDocument();

    expect(practiceActions).toHaveTextContent("Stay with this concept");
    expect(practiceActions).toHaveTextContent(
      "Check whether the core ideas are ready without leaving this concept.",
    );
    expect(screen.queryByTestId("concept-v2-practice-path-summary")).not.toBeInTheDocument();
    const primaryPracticeAction = screen.getByTestId("concept-v2-primary-practice-action");
    expect(primaryPracticeAction).toHaveTextContent("Open concept test");
    expect(primaryPracticeAction).toHaveTextContent("Recommended next");
    expect(primaryPracticeAction).toHaveClass("min-h-20");
    expect(within(practiceActions).getByRole("link", { name: /Open concept test/ })).toBeInTheDocument();
    expect(within(practiceActions).getByRole("link", { name: /Free play on the bench/ })).toBeInTheDocument();
    expect(within(practiceActions).getByRole("link", { name: /Challenge mode/ })).toBeInTheDocument();
    expect(practiceActions).toHaveTextContent(
      /challenge mode/i,
    );
    expect(screen.getByTestId("concept-v2-secondary-challenge")).toHaveTextContent(
      /challenge mode/i,
    );
  });

  it("localizes wrap-up navigation links in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    renderFramework("simple-harmonic-motion");

    const readNextHrefs = within(screen.getByTestId("concept-v2-read-next"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(readNextHrefs.length).toBeGreaterThan(0);
    expect(readNextHrefs.every((href) => href.startsWith("/zh-HK"))).toBe(true);

    const practiceActionHrefs = within(screen.getByTestId("concept-v2-practice-actions"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(practiceActionHrefs).toContain("/zh-HK/tests/concepts/simple-harmonic-motion");
    expect(practiceActionHrefs.some((href) => href.includes("#challenge"))).toBe(true);
    expect(
      practiceActionHrefs.every((href) => href.startsWith("/zh-HK") || href.startsWith("#")),
    ).toBe(true);
  });

  it("keeps synthetic non-migrated concepts on a fallback V2 lesson path", async () => {
    const user = userEvent.setup();
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.v2 = undefined;
    const model = resolveConceptPageV2(concept, {
      locale: "en",
      readNext: getReadNextRecommendations(concept.slug),
    });

    renderConceptFramework(concept);
    await user.click(screen.getByRole("button", { name: /start concept/i }));

    expect(model.source).toBe("fallback");
    expect(screen.getByTestId("guided-step-slot")).toHaveTextContent(
      model.steps[0]?.label ?? "",
    );
    expect(screen.getByTestId("concept-v2-reference")).toBeInTheDocument();
  });

  it("maps legacy phase and quick-test deep links to the closest V2 step", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=check#quick-test",
    );

    renderFramework("simple-harmonic-motion");

    await waitFor(() => {
      expect(screen.getByTestId("guided-step-slot")).toHaveTextContent(
        "Explain the restoring rule",
      );
    });
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#quick-test");
  });

  it("lands guided-step deep links on the matching current step heading", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      `/concepts/simple-harmonic-motion#${getConceptPageV2StepHashId("link-stage-and-graphs")}`,
    );

    renderFramework("simple-harmonic-motion");

    await waitFor(() => {
      expect(screen.getByTestId("guided-step-slot")).toHaveTextContent(
        "Link the stage and graphs",
      );
    });
    expect(screen.getByTestId("phase-probe")).toHaveTextContent("understand");
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("id", conceptPageV2CurrentStepHeadingId);
    });
    expect(document.activeElement?.tagName).toBe("H2");
  });
});
