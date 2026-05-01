import type { ElementType } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConceptPagePhasedSections } from "@/components/concepts/ConceptPagePhasedSections";
import {
  getAllConcepts,
  getReadNextRecommendations,
  resolveConceptLearningPhases,
  resolveConceptPageSections,
} from "@/lib/content";
import enMessages from "@/messages/en.json";

vi.mock("@/components/ads/AdSlot", () => ({
  InArticleAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>In-article ad</div>
  ),
}));

vi.mock("@/components/concepts/MathFormula", () => ({
  RichMathText: ({
    as: Component = "div",
    className,
    content,
  }: {
    as?: ElementType;
    className?: string;
    content: string;
  }) => <Component className={className}>{content}</Component>,
}));

vi.mock("@/components/concepts/LiveWorkedExampleSection", () => ({
  LiveWorkedExampleSection: ({ sectionTitle }: { sectionTitle?: string }) => (
    <section className="lab-panel p-5">
      <p>{sectionTitle}</p>
      <p>Worked example stub</p>
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
      <p>{concept.quickTest.questions[0]?.prompt ?? "Quick test stub"}</p>
    </section>
  ),
}));

vi.mock("@/components/concepts/ReadNextSection", () => ({
  ReadNextSection: ({
    items,
    sectionTitle,
  }: {
    items: Array<{ title: string }>;
    sectionTitle?: string;
  }) => (
    <section className="lab-panel p-5">
      <p>{sectionTitle}</p>
      <p>{items[0]?.title ?? "Read next stub"}</p>
    </section>
  ),
}));

const concepts = getAllConcepts();
const overrideConcepts = concepts.filter(
  (concept) => (concept.pageFramework?.sections?.length ?? 0) > 0,
);

type RenderFailure = {
  slug: string;
  issue: string;
  details?: unknown;
};

function renderPhaseShell(slug: string) {
  const concept = concepts.find((entry) => entry.slug === slug);

  if (!concept) {
    throw new Error(`Unknown concept slug: ${slug}`);
  }

  const readNext = getReadNextRecommendations(concept.slug);
  const sections = resolveConceptPageSections(concept, { readNext });

  return {
    concept,
    readNext,
    sections,
    ...render(
      <ConceptPagePhasedSections
        concept={concept}
        readNext={readNext}
        sections={sections}
      />,
    ),
  };
}

function renderPhaseShellWithReadNextOverride(
  slug: string,
  readNextOverride: ReturnType<typeof getReadNextRecommendations>,
) {
  const concept = concepts.find((entry) => entry.slug === slug);

  if (!concept) {
    throw new Error(`Unknown concept slug: ${slug}`);
  }

  const sections = resolveConceptPageSections(concept, { readNext: readNextOverride });

  return {
    concept,
    readNext: readNextOverride,
    sections,
    ...render(
      <ConceptPagePhasedSections
        concept={concept}
        readNext={readNextOverride}
        sections={sections}
      />,
    ),
  };
}

describe("concept phase shell catalog smoke", () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    window.history.replaceState(window.history.state, "", "/");
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("mounts the phase shell cleanly across every published concept", { timeout: 20_000 }, () => {
    expect(concepts.length).toBeGreaterThan(0);

    const failures: RenderFailure[] = [];

    for (const concept of concepts) {
      window.history.replaceState(window.history.state, "", `/concepts/${concept.slug}`);

      const { container, unmount } = renderPhaseShell(concept.slug);

      try {
        const tabs = screen.getAllByRole("tab");
        const selectedTabs = tabs.filter(
          (tab) => tab.getAttribute("aria-selected") === "true",
        );
        const visiblePanels = screen.getAllByRole("tabpanel");
        const activeTab = selectedTabs[0] ?? null;
        const activePanelId = activeTab?.getAttribute("aria-controls") ?? "";
        const activePanel = activePanelId
          ? container.querySelector<HTMLElement>(`#${activePanelId}`)
          : null;

        if (selectedTabs.length !== 1) {
          failures.push({
            slug: concept.slug,
            issue: "expected exactly one active phase tab",
            details: tabs.map((tab) => ({
              id: tab.id,
              selected: tab.getAttribute("aria-selected"),
            })),
          });
        }

        if (visiblePanels.length !== 1) {
          failures.push({
            slug: concept.slug,
            issue: "expected exactly one visible phase panel",
            details: visiblePanels.map((panel) => panel.id),
          });
        }

        if (!activeTab || !activePanel) {
          failures.push({
            slug: concept.slug,
            issue: "missing active tab or panel linkage",
            details: {
              activeTabId: activeTab?.id ?? null,
              activePanelId: activePanelId || null,
            },
          });
        } else {
          if (activePanel.getAttribute("aria-labelledby") !== activeTab.id) {
            failures.push({
              slug: concept.slug,
              issue: "active panel aria-labelledby drifted",
              details: {
                expected: activeTab.id,
                received: activePanel.getAttribute("aria-labelledby"),
              },
            });
          }

          if (activePanel.hasAttribute("hidden")) {
            failures.push({
              slug: concept.slug,
              issue: "active panel is hidden",
              details: activePanel.id,
            });
          }
        }
      } catch (error) {
        failures.push({
          slug: concept.slug,
          issue: "phase shell render threw",
          details: error instanceof Error ? error.message : String(error),
        });
      } finally {
        unmount();
        cleanup();
      }
    }

    expect(failures).toEqual([]);
  });

  it("renders authored page-framework override concepts without breaking the phase shell", () => {
    expect(overrideConcepts.length).toBeGreaterThan(0);

    const failures: RenderFailure[] = [];

    for (const concept of overrideConcepts) {
      window.history.replaceState(window.history.state, "", `/concepts/${concept.slug}`);

      const { unmount } = renderPhaseShell(concept.slug);

      try {
        const sections = resolveConceptPageSections(concept, {
          readNext: getReadNextRecommendations(concept.slug),
        });
        const phases = resolveConceptLearningPhases(sections);
        const titledOverride = (concept.pageFramework?.sections ?? []).find(
          (section) =>
            Boolean(section.title) &&
            phases.some((phase) => phase.sections.some((entry) => entry.id === section.id)),
        );
        const selectedTab = screen
          .getAllByRole("tab")
          .find((tab) => tab.getAttribute("aria-selected") === "true");

        if (!selectedTab) {
          failures.push({
            slug: concept.slug,
            issue: "override concept rendered without an active tab",
          });
          continue;
        }

        if (!titledOverride?.title) {
          failures.push({
            slug: concept.slug,
            issue: "override concept did not expose a visible titled override",
          });
          continue;
        }

        const overridePhase = phases.find((phase) =>
          phase.sections.some((section) => section.id === titledOverride.id),
        );

        if (!overridePhase) {
          failures.push({
            slug: concept.slug,
            issue: `override title could not be mapped to a phase: ${titledOverride.id}`,
          });
          continue;
        }

        if (selectedTab.getAttribute("data-testid") !== `concept-learning-phase-${overridePhase.id}`) {
          fireEvent.click(screen.getByTestId(`concept-learning-phase-${overridePhase.id}`));
        }

        if (screen.queryAllByText(titledOverride.title).length === 0) {
          failures.push({
            slug: concept.slug,
            issue: `override title did not render inside the phase shell: ${titledOverride.id}`,
            details: titledOverride.title,
          });
        }
      } catch (error) {
        failures.push({
          slug: concept.slug,
          issue: "override render smoke threw",
          details: error instanceof Error ? error.message : String(error),
        });
      } finally {
        unmount();
        cleanup();
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps final-phase summaries and completion copy safe when read-next is unavailable", () => {
    const failures: RenderFailure[] = [];

    for (const concept of concepts) {
      window.history.replaceState(window.history.state, "", `/concepts/${concept.slug}`);

      const { unmount } = renderPhaseShellWithReadNextOverride(concept.slug, []);

      try {
        fireEvent.click(screen.getByTestId("concept-learning-phase-check"));

        const summary = screen.getByTestId("concept-learning-phase-summary");
        const completion = screen.getByTestId("concept-learning-phase-completion");

        if (within(summary).queryByText(enMessages.ConceptPage.sections.readNext)) {
          failures.push({
            slug: concept.slug,
            issue: "missing read-next still rendered a read-next section label",
          });
        }

        if (
          !within(completion).queryByText(
            enMessages.ConceptPage.phases.completion.default,
          )
        ) {
          failures.push({
            slug: concept.slug,
            issue: "missing read-next did not fall back to the default completion copy",
          });
        }

        if (
          within(completion).queryByText(
            enMessages.ConceptPage.phases.completion.readNext,
          )
        ) {
          failures.push({
            slug: concept.slug,
            issue: "missing read-next still rendered read-next completion copy",
          });
        }
      } catch (error) {
        failures.push({
          slug: concept.slug,
          issue: "missing read-next render smoke threw",
          details: error instanceof Error ? error.message : String(error),
        });
      } finally {
        unmount();
        cleanup();
      }
    }

    expect(failures).toEqual([]);
  });
});
