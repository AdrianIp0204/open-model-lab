import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConceptPageBenchSupportTargetId,
  useConceptPagePhase,
} from "@/components/concepts/ConceptPagePhaseContext";
import { ConceptPagePhasedSections } from "@/components/concepts/ConceptPagePhasedSections";
import { PageSectionFrame } from "@/components/layout/PageSectionFrame";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  resolveConceptLearningPhases,
  resolveConceptPageSections,
  type ConceptContent,
} from "@/lib/content";
import { conceptShareAnchorIds, getConceptSectionAnchorId } from "@/lib/share-links";

const phaseLabels = {
  explore: "Explore",
  understand: "Understand",
  check: "Check + Continue",
} as const;

vi.mock("@/components/ads/AdSlot", () => ({
  InArticleAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>In-article ad</div>
  ),
}));

vi.mock("@/components/concepts/LiveWorkedExampleSection", () => ({
  LiveWorkedExampleSection: ({ sectionTitle }: { sectionTitle?: string }) => (
    <section className="lab-panel p-5">
      <p>{sectionTitle}</p>
      <p>Live values</p>
    </section>
  ),
}));

vi.mock("@/components/concepts/QuickTestSection", () => ({
  QuickTestSection: ({
    concept,
    sectionTitle,
  }: {
    concept: { quickTest: { questions: Array<{ prompt: string }> } };
    sectionTitle?: string;
  }) => (
    <section className="lab-panel p-5">
      <p>{sectionTitle}</p>
      <p>{concept.quickTest.questions[0]?.prompt}</p>
    </section>
  ),
}));

vi.mock("@/components/concepts/ReadNextSection", () => ({
  ReadNextSection: ({ sectionTitle }: { sectionTitle?: string }) => (
    <section className="lab-panel p-5">
      <p>{sectionTitle}</p>
      <p>Read next body</p>
    </section>
  ),
}));

type RenderHarnessOptions = {
  concept?: ConceptContent;
  readNext?: ReturnType<typeof getReadNextRecommendations>;
  includeSetupReturnProbe?: boolean;
};

function getPhaseBenchNavItem(concept: ConceptContent, phaseId: keyof typeof phaseLabels) {
  switch (phaseId) {
    case "explore":
      return {
        id: getConceptPageBenchSupportTargetId("explore"),
        label: concept.noticePrompts.items.length
          ? "Bench: What to notice"
          : "Bench: Live bench guide",
      };
    case "understand":
      if ((concept.simulation.overlays?.length ?? 0) <= 0) {
        return null;
      }

      return {
        id: getConceptPageBenchSupportTargetId("understand"),
        label: "Bench: Guided overlay",
      };
    case "check":
      if ((concept.challengeMode?.items.length ?? 0) <= 0) {
        return null;
      }

      return {
        id: conceptShareAnchorIds.challengeMode,
        label: "Bench: Challenge mode",
      };
    default:
      return null;
  }
}

function PhaseOwnedBenchSupportProbe() {
  const conceptPagePhase = useConceptPagePhase();

  if (!conceptPagePhase) {
    return null;
  }

  switch (conceptPagePhase.activePhaseId) {
    case "understand":
      return (
        <div
          id={getConceptPageBenchSupportTargetId("understand")}
          data-testid="concept-phase-bench-support"
          data-active-phase="understand"
        >
          Guided overlay focus
        </div>
      );
    case "check":
      return (
        <div
          id={conceptShareAnchorIds.challengeMode}
          data-testid="concept-phase-bench-support"
          data-active-phase="check"
        >
          Challenge mode
        </div>
      );
    case "explore":
    default:
      return (
        <div
          id={getConceptPageBenchSupportTargetId("explore")}
          data-testid="concept-phase-bench-support"
          data-active-phase="explore"
        >
          What to notice
        </div>
      );
  }
}

function PhaseSetupReturnProbe() {
  const conceptPagePhase = useConceptPagePhase();

  if (!conceptPagePhase?.returnToSetupArea) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="concept-phase-return-to-setup"
      onClick={() => conceptPagePhase.returnToSetupArea?.({ phaseId: "explore" })}
    >
      Return to setup
    </button>
  );
}

function renderHarness({
  concept = getConceptBySlug("simple-harmonic-motion"),
  readNext = getReadNextRecommendations(concept.slug),
  includeSetupReturnProbe = false,
}: RenderHarnessOptions = {}) {
  const sections = resolveConceptPageSections(concept, { readNext });
  const phases = resolveConceptLearningPhases(sections);
  const navGroups = phases.flatMap((phase) => {
    const benchNavItem = getPhaseBenchNavItem(concept, phase.id);
    const targetSection = phase.sections.find((section) => getConceptSectionAnchorId(section.id));
    const targetId =
      (targetSection ? getConceptSectionAnchorId(targetSection.id) : null) ??
      benchNavItem?.id ??
      null;

    if (!targetId) {
      return [];
    }

    return [
      {
        id: phase.id,
        label: phaseLabels[phase.id],
        targetId,
      },
    ];
  });
  const phaseIdBySectionId = new Map(
    phases.flatMap((phase) => phase.sections.map((section) => [section.id, phase.id] as const)),
  );
  const navItems = [
    {
      id: conceptShareAnchorIds.interactiveLab,
      label: "Interactive lab",
      compactLabel: "Lab",
    },
    ...phases.flatMap((phase) => {
      const benchNavItem = getPhaseBenchNavItem(concept, phase.id);
      const items: Array<{
        id: string;
        label: string;
        compactLabel: string;
        groupId: string;
      }> = [];

      if (benchNavItem) {
        items.push({
          id: benchNavItem.id,
          label: benchNavItem.label,
          compactLabel: "Bench",
          groupId: phase.id,
        });
      }

      for (const section of phase.sections) {
        const anchorId = getConceptSectionAnchorId(section.id);

        if (!anchorId) {
          continue;
        }

        items.push({
          id: anchorId,
          label: section.title,
          compactLabel: section.title,
          groupId: phaseIdBySectionId.get(section.id) ?? phase.id,
        });
      }

      return items;
    }),
  ];

  return render(
    <PageSectionFrame
      sectionNav={{
        label: "Concept sections",
        title: "Jump within concept",
        mobileLabel: "Concept sections",
        activeGroupParam: "phase",
        groups: navGroups,
        variant: "compact",
        items: navItems,
      }}
    >
      <ConceptPagePhasedSections
        concept={concept}
        readNext={readNext}
        sections={sections}
        phaseOwnedAnchorIds={{
          explore: [getConceptPageBenchSupportTargetId("explore")],
          ...((concept.simulation.overlays?.length ?? 0) > 0
            ? {
                understand: [getConceptPageBenchSupportTargetId("understand")],
              }
            : {}),
          ...((concept.challengeMode?.items.length ?? 0) > 0
            ? {
                check: [conceptShareAnchorIds.challengeMode],
              }
            : {}),
        }}
        liveLabContent={
          <div id={conceptShareAnchorIds.interactiveLab} className="scroll-mt-24">
            <div
              id={conceptShareAnchorIds.liveBench}
              data-testid="concept-live-bench-anchor"
              tabIndex={-1}
            />
            <div data-testid="simulation-renderer">Simple harmonic motion renderer default</div>
            <PhaseOwnedBenchSupportProbe />
            {includeSetupReturnProbe ? <PhaseSetupReturnProbe /> : null}
          </div>
        }
        supportRail={<div data-testid="concept-support-rail">Support rail</div>}
      />
    </PageSectionFrame>,
  );
}

function mockPhaseShellBelowViewport(top = 1400) {
  const shell = screen.getByTestId("concept-learning-phases");

  vi.spyOn(shell, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: top,
    top,
    bottom: top + 420,
    left: 0,
    right: 960,
    width: 960,
    height: 420,
    toJSON: () => "",
  });

  return shell;
}

describe("ConceptPagePhasedSections", () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    window.history.replaceState(window.history.state, "", "/");
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("shows the current phase header with step context and purpose", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const entryRail = screen.getByTestId("concept-learning-phase-entry-rail");
    const tablist = screen.getByRole("tablist", { name: "Lower learning phases" });
    const summary = screen.getByTestId("concept-learning-phase-summary");
    const panel = screen.getByRole("tabpanel", { name: /Explore/i });

    expect(entryRail).toContainElement(tablist);
    expect(within(tablist).getByRole("tab", { name: /Explore/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByRole("tablist", { name: "Lower learning phases" })).toHaveLength(1);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(panel).toBeInTheDocument();
    expect(within(summary).getByText("Step 1 of 3")).toBeInTheDocument();
    expect(within(summary).getByRole("heading", { name: "Explore" })).toBeInTheDocument();
    expect(
      within(summary).getByText("Build the core picture before you start testing the idea."),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Current stage")).toBeInTheDocument();
    expect(within(entryRail).getByText("What to do here")).toBeInTheDocument();
    expect(
      within(entryRail).getByText(
        "Start with the explanation and key ideas so the concept has a stable shape before you push on it.",
      ),
    ).toBeInTheDocument();
    expect(within(summary).getAllByText("2 sections")).toHaveLength(2);
    const handoff = screen.getByTestId("concept-learning-phase-bench-handoff");
    expect(within(handoff).getByText("At the bench now")).toBeInTheDocument();
    expect(within(handoff).getByText("What to notice")).toBeInTheDocument();
    expect(
      within(handoff).getByText(
        "Use the prompt surface to decide what to watch in the live bench before you move on.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("concept-learning-phase-bench-cta")).toHaveTextContent(
      "Open what to notice",
    );
  });

  it("keeps the phase-owned bench support block aligned with the active phase", async () => {
    const user = userEvent.setup();

    renderHarness();

    expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
      "data-active-phase",
      "explore",
    );
    expect(screen.getByTestId("concept-phase-bench-support")).toHaveTextContent(
      "What to notice",
    );

    await user.click(screen.getByTestId("concept-learning-phase-understand"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
        "data-active-phase",
        "understand",
      );
    });
    expect(screen.getByTestId("concept-phase-bench-support")).toHaveTextContent(
      "Guided overlay focus",
    );
    expect(screen.getByTestId("concept-learning-phase-bench-handoff")).toHaveTextContent(
      "Guided overlay",
    );
    expect(screen.getByTestId("concept-learning-phase-bench-handoff")).toHaveAttribute(
      "data-highlighted",
      "true",
    );

    await user.click(screen.getByTestId("concept-learning-phase-check"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
        "data-active-phase",
        "check",
      );
    });
    expect(screen.getAllByText(/^Challenge mode$/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("concept-learning-phase-bench-handoff")).toHaveTextContent(
      "Challenge mode",
    );
  });

  it("lets lower-page learners jump back to the active bench companion tool", async () => {
    const user = userEvent.setup();
    const scrollIntoViewMock = HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>;

    renderHarness();

    expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
      "id",
      getConceptPageBenchSupportTargetId("explore"),
    );
    scrollIntoViewMock.mockClear();

    await user.click(screen.getByTestId("concept-learning-phase-bench-cta"));

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("concept-learning-phase-next"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-understand")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
      "id",
      getConceptPageBenchSupportTargetId("understand"),
    );
    scrollIntoViewMock.mockClear();

    await user.click(screen.getByTestId("concept-learning-phase-bench-cta"));

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  it("returns from Check + Continue to the live setup area with the explore phase path", async () => {
    const user = userEvent.setup();
    const scrollIntoViewMock = HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>;

    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=check#challenge-mode",
    );

    renderHarness({ includeSetupReturnProbe: true });

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-check")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    const liveBenchAnchor = screen.getByTestId("concept-live-bench-anchor");
    const focus = vi.fn();

    Object.defineProperty(liveBenchAnchor, "focus", {
      value: focus,
      configurable: true,
    });
    scrollIntoViewMock.mockClear();

    await user.click(screen.getByTestId("concept-phase-return-to-setup"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-explore")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(window.location.search).toBe("?phase=explore");
    expect(window.location.hash).toBe("#live-bench");
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("links tabs to panels correctly and supports keyboard navigation", async () => {
    const user = userEvent.setup();

    renderHarness();

    const exploreTab = screen.getByTestId("concept-learning-phase-explore");
    const understandTab = screen.getByTestId("concept-learning-phase-understand");
    const checkTab = screen.getByTestId("concept-learning-phase-check");
    const explorePanel = screen.getByTestId("concept-learning-phase-panel-explore");
    const understandPanel = screen.getByTestId("concept-learning-phase-panel-understand");
    const checkPanel = screen.getByTestId("concept-learning-phase-panel-check");

    expect(exploreTab).toHaveAttribute("aria-controls", explorePanel.id);
    expect(understandTab).toHaveAttribute("aria-controls", understandPanel.id);
    expect(checkTab).toHaveAttribute("aria-controls", checkPanel.id);
    expect(explorePanel).toHaveAttribute("aria-labelledby", exploreTab.id);
    expect(understandPanel).toHaveAttribute("aria-labelledby", understandTab.id);
    expect(checkPanel).toHaveAttribute("aria-labelledby", checkTab.id);
    expect(explorePanel).not.toHaveAttribute("hidden");
    expect(understandPanel).toHaveAttribute("hidden");
    expect(checkPanel).toHaveAttribute("hidden");
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);

    exploreTab.focus();
    expect(exploreTab).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    await waitFor(() => {
      expect(understandTab).toHaveAttribute("aria-selected", "true");
    });
    expect(understandTab).toHaveFocus();
    expect(screen.getByTestId("concept-learning-phase-panel-understand")).not.toHaveAttribute(
      "hidden",
    );

    await user.keyboard("{End}");

    await waitFor(() => {
      expect(checkTab).toHaveAttribute("aria-selected", "true");
    });
    expect(checkTab).toHaveFocus();

    await user.keyboard("{Home}");

    await waitFor(() => {
      expect(exploreTab).toHaveAttribute("aria-selected", "true");
    });
    expect(exploreTab).toHaveFocus();
  });

  it("respects a valid phase query when no lower-page hash is present", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=check",
    );
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Check \+ Continue/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText(concept.quickTest.questions[0].prompt)).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=check");
    expect(window.location.hash).toBe("");
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByTestId("concept-learning-phase-bench-handoff")).toHaveTextContent(
      "Challenge mode",
    );
    expect(screen.getByTestId("concept-learning-phase-bench-handoff")).toHaveAttribute(
      "data-highlighted",
      "false",
    );
  });

  it("maps challenge-mode hashes onto the check phase path", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion#challenge-mode",
    );

    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-check")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
      "data-active-phase",
      "check",
    );
    expect(window.location.search).toBe("?phase=check");
    expect(window.location.hash).toBe("#challenge-mode");
  });

  it("prefers a lower-page hash over the phase query", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=explore#quick-test",
    );
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Check \+ Continue/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText(concept.quickTest.questions[0].prompt)).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=check");
    expect(window.location.hash).toBe("#quick-test");
  });

  it("ignores an invalid phase query and falls back cleanly", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=review",
    );
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Explore/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText(concept.sections.keyIdeas[0])).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=explore");
  });

  it("uses explicit top-rail clicks to switch phase state, clean hidden hashes, and scroll toward the lower shell", async () => {
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion#quick-test",
    );
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const renderer = screen.getByTestId("simulation-renderer");
    mockPhaseShellBelowViewport();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Check \+ Continue/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(screen.getByRole("tab", { name: /Explore/i }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Explore/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText(concept.sections.keyIdeas[0])).toBeInTheDocument();
    expect(screen.queryByText(concept.quickTest.questions[0].prompt)).not.toBeInTheDocument();
    expect(window.location.search).toBe("?phase=explore");
    expect(window.location.hash).toBe("#short-explanation");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);
  });

  it("advances and returns through the flow with next and previous controls while keeping the live lab mounted", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const renderer = screen.getByTestId("simulation-renderer");

    fireEvent.click(screen.getByTestId("concept-learning-phase-next"));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tabpanel", { name: /Understand/i })).toBeInTheDocument();
    expect(screen.getByText(concept.sections.commonMisconception.myth)).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=understand");
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);

    fireEvent.click(screen.getByTestId("concept-learning-phase-previous"));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Explore/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tabpanel", { name: /Explore/i })).toBeInTheDocument();
    expect(screen.getByText(concept.sections.keyIdeas[0])).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=explore");
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);
  });

  it("keeps focus sensible when moving with the previous and continue controls", async () => {
    const user = userEvent.setup();

    renderHarness();

    const nextControl = screen.getByTestId("concept-learning-phase-next");
    nextControl.focus();
    expect(nextControl).toHaveFocus();

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-understand")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(
      within(screen.getByTestId("concept-learning-phase-summary")).getByRole("heading", {
        name: "Understand",
      }),
    ).toHaveFocus();

    const previousControl = screen.getByTestId("concept-learning-phase-previous");
    previousControl.focus();
    expect(previousControl).toHaveFocus();

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-explore")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(
      within(screen.getByTestId("concept-learning-phase-summary")).getByRole("heading", {
        name: "Explore",
      }),
    ).toHaveFocus();
  });

  it("shows the completion endcap and final-phase CTA on the last phase", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const nextConcept = getReadNextRecommendations(concept.slug)[0];

    renderHarness({ concept });

    fireEvent.click(screen.getByTestId("concept-learning-phase-next"));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    fireEvent.click(screen.getByTestId("concept-learning-phase-next"));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Check \+ Continue/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    const nextCard = screen.getByTestId("concept-learning-phase-next-concept");
    expect(nextCard).toHaveTextContent("Finish this concept flow");
    expect(nextCard).toHaveTextContent(nextConcept?.reasonLabel ?? "");
    expect(nextCard).toHaveTextContent(nextConcept?.title ?? "");
    expect(nextCard).toHaveTextContent(nextConcept?.summary ?? "");

    const completion = screen.getByTestId("concept-learning-phase-completion");
    expect(within(completion).getByText("Concept flow complete")).toBeInTheDocument();
    expect(
      within(completion).getByText("You have reached the end of this concept flow."),
    ).toBeInTheDocument();
    expect(
      within(completion).getByText(
        "Use Read next above to choose the next concept and keep the momentum going.",
      ),
    ).toBeInTheDocument();
  });

  it("renders authored override section titles cleanly inside the phase-first shell", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("uniform-circular-motion");

    renderHarness({ concept });

    await user.click(screen.getByTestId("concept-learning-phase-understand"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-understand")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    let summary = screen.getByTestId("concept-learning-phase-summary");
    const understandPanel = screen.getByTestId("concept-learning-phase-panel-understand");
    expect(within(summary).getByRole("heading", { name: "Understand" })).toBeInTheDocument();
    expect(within(understandPanel).getAllByText("Live circular-motion examples").length).toBeGreaterThan(0);
    expect(within(understandPanel).getByText("Live values")).toBeInTheDocument();

    await user.click(screen.getByTestId("concept-learning-phase-check"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-check")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    summary = screen.getByTestId("concept-learning-phase-summary");
    const checkPanel = screen.getByTestId("concept-learning-phase-panel-check");
    expect(within(summary).getByRole("heading", { name: "Check + Continue" })).toBeInTheDocument();
    expect(within(checkPanel).getAllByText("Vector checkpoint").length).toBeGreaterThan(0);
    expect(within(checkPanel).getAllByText("Follow this motion next").length).toBeGreaterThan(0);
  });

  it("degrades safely for sparse phases and missing read-next recommendations", async () => {
    const user = userEvent.setup();
    const concept = structuredClone(getConceptBySlug("simple-harmonic-motion"));
    concept.sections.explanation.paragraphs = [];
    concept.sections.keyIdeas = [];
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=explore",
    );

    renderHarness({ concept, readNext: [] });

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-explore")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    let summary = screen.getByTestId("concept-learning-phase-summary");
    expect(within(summary).getAllByText("0 sections")).toHaveLength(2);
    expect(screen.getByTestId("concept-learning-phase-panel-explore")).toHaveTextContent(
      "No lower-page sections are available in this phase yet.",
    );

    await user.click(screen.getByTestId("concept-learning-phase-check"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-learning-phase-check")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    summary = screen.getByTestId("concept-learning-phase-summary");
    expect(within(summary).queryByText("Read next")).not.toBeInTheDocument();
    expect(screen.getByText("You are ready to review or move on from here.")).toBeInTheDocument();
    expect(
      screen.getByText("Jump back to any phase above when you want another pass through the idea."),
    ).toBeInTheDocument();
  });

  it("renders grouped phase-aware navigation in the mobile sheet", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const toggle = screen.getByRole("button", { name: /^Page sections/ });
    fireEvent.click(toggle);

    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByRole("link", { name: "Explore" })).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByRole("link", { name: "Understand" })).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByRole("link", { name: "Check + Continue" })).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByRole("link", { name: "Interactive lab" })).toBeInTheDocument();
    expect(
      within(panel as HTMLElement).getByRole("link", { name: "Bench: What to notice" }),
    ).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByRole("link", { name: "Explanation" })).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByRole("link", { name: "Key ideas" })).toBeInTheDocument();
  });

  it("clicking a phase group heading uses the hardened phase path and keeps the live lab mounted", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const renderer = screen.getByTestId("simulation-renderer");
    const nav = screen.getByRole("navigation", { name: "Concept sections" });
    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(within(nav).getByRole("link", { name: "Understand" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText("Live values")).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=understand");
    expect(window.location.hash).toBe("#worked-examples");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);
  });

  it("keeps the active grouped heading in sync with popstate-driven phase changes", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const nav = screen.getByRole("navigation", { name: "Concept sections" });
    fireEvent.click(within(nav).getByRole("link", { name: "Understand" }));

    await waitFor(() => {
      expect(within(nav).getByRole("link", { name: "Understand" })).toHaveAttribute(
        "aria-current",
        "step",
      );
    });

    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    window.history.pushState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=check#quick-test",
    );
    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Check \+ Continue/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText(concept.quickTest.questions[0].prompt)).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Check + Continue" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(within(nav).getByRole("link", { name: "Understand" })).not.toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("does not auto-scroll on query-only history restores", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    window.history.pushState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=understand",
    );
    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText("Live values")).toBeInTheDocument();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByTestId("concept-learning-phase-bench-handoff")).toHaveAttribute(
      "data-highlighted",
      "false",
    );
  });

  it("lets keyboard users activate grouped phase headings through the same hardened path", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const nav = screen.getByRole("navigation", { name: "Concept sections" });
    const understandHeading = within(nav).getByRole("link", { name: "Understand" });

    understandHeading.focus();
    expect(understandHeading).toHaveFocus();

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText("Live values")).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=understand");
    expect(window.location.hash).toBe("#worked-examples");
  });

  it("clicking a hidden desktop nav target activates the owning phase even when the hash is already current", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const renderer = screen.getByTestId("simulation-renderer");
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=explore#worked-examples",
    );
    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    const nav = screen.getByRole("navigation", { name: "Concept sections" });
    fireEvent.click(within(nav).getByRole("link", { name: "Worked examples" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByText("Live values")).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=understand");
    expect(window.location.hash).toBe("#worked-examples");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);
  });

  it("lets grouped bench companion items activate the right phase and bench target", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const renderer = screen.getByTestId("simulation-renderer");
    const nav = screen.getByRole("navigation", { name: "Concept sections" });
    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(within(nav).getByRole("link", { name: "Bench: Guided overlay" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
      "data-active-phase",
      "understand",
    );
    expect(window.location.search).toBe("?phase=understand");
    expect(window.location.hash).toBe(`#${getConceptPageBenchSupportTargetId("understand")}`);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);

    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(within(nav).getByRole("link", { name: "Bench: Challenge mode" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Check \+ Continue/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByTestId("concept-phase-bench-support")).toHaveAttribute(
      "data-active-phase",
      "check",
    );
    expect(window.location.search).toBe("?phase=check");
    expect(window.location.hash).toBe("#challenge-mode");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("mobile nav uses the same section intent seam for hidden lower-page targets", async () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    renderHarness({ concept });

    const renderer = screen.getByTestId("simulation-renderer");
    window.history.replaceState(
      window.history.state,
      "",
      "/concepts/simple-harmonic-motion?phase=explore#worked-examples",
    );
    (HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    const toggle = screen.getByRole("button", { name: /^Page sections/ });
    fireEvent.click(toggle);

    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();

    fireEvent.click(within(panel as HTMLElement).getByRole("link", { name: "Understand" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Understand/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Live values")).toBeInTheDocument();
    expect(window.location.search).toBe("?phase=understand");
    expect(window.location.hash).toBe("#worked-examples");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId("simulation-renderer")).toBe(renderer);
  });
});
