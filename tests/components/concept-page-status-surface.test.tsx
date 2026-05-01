// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackMembershipsForConcept,
  resolveConceptPageSections,
} from "@/lib/content";
import {
  localConceptProgressStore,
  markConceptCompleted,
  recordChallengeModeUsed,
  recordCompareModeUsed,
  recordConceptVisit,
  type ProgressSnapshot,
} from "@/lib/progress";
import { ConceptPageStatusSurface } from "@/components/concepts/ConceptPageStatusSurface";
import zhHkMessages from "@/messages/zh-HK.json";

function renderStatusSurface(
  slug: string,
  options?: {
    variant?: "default" | "compact";
    initialSyncedSnapshot?: ProgressSnapshot | null;
  },
) {
  const concept = getConceptBySlug(slug);
  const readNext = getReadNextRecommendations(concept.slug);

  return render(
    <ConceptPageStatusSurface
      concept={concept}
      sections={resolveConceptPageSections(concept, { readNext, locale: "en" })}
      readNext={readNext}
      starterTrackMemberships={getStarterTrackMembershipsForConcept(concept.slug)}
      variant={options?.variant}
      initialSyncedSnapshot={options?.initialSyncedSnapshot}
    />,
  );
}

describe("ConceptPageStatusSurface", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("shows a fresh concept as not started with a starter CTA", () => {
    renderStatusSurface("graph-transformations");

    const statusSurface = screen.getByRole("region", { name: "Your status" });
    const statusLabel = screen.getByText("Your status");
    const statusNote = screen.getByText(
      "No saved progress yet. Start with the live bench.",
    );
    expect(statusSurface).toHaveAttribute("aria-labelledby", statusLabel.id);
    expect(statusSurface).toHaveAttribute("aria-describedby", statusNote.id);
    expect(statusSurface).toHaveAccessibleDescription(
      "No saved progress yet. Start with the live bench.",
    );
    expect(screen.getByText("Your status")).toHaveClass("text-ink-700");
    expect(screen.getByTestId("concept-page-status-overall")).toHaveTextContent(
      "Not started",
    );
    expect(screen.getByTestId("concept-page-status-overall")).toHaveClass("text-ink-700");
    expect(
      screen.getByTestId("concept-page-status-primary-cta"),
    ).toHaveTextContent("Start this concept");
    expect(screen.getByTestId("concept-page-status-track-position")).toHaveTextContent(
      /\d of \d/,
    );
    expect(screen.getByTestId("concept-page-status-track-position")).toHaveClass(
      "bg-paper-strong",
      "text-ink-700",
    );
    expect(
      screen.getByTestId("concept-page-status-secondary-cta"),
    ).toHaveTextContent("Return to track");
  });

  it("switches to an in-progress continue CTA when saved work exists", () => {
    const identity = {
      id: "concept-simple-harmonic-motion",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    };
    recordConceptVisit(identity);
    recordCompareModeUsed(identity);

    renderStatusSurface("simple-harmonic-motion");

    expect(screen.getByTestId("concept-page-status-overall")).toHaveTextContent(
      "In progress",
    );
    expect(
      screen.getByTestId("concept-page-status-primary-cta"),
    ).toHaveTextContent("Continue at Link the stage and graphs");
  });

  it("promotes the next concept CTA after completion", () => {
    const identity = {
      id: "concept-graph-transformations",
      slug: "graph-transformations",
      title: "Graph Transformations",
    };
    recordConceptVisit(identity);
    markConceptCompleted(identity);

    renderStatusSurface("graph-transformations");

    expect(screen.getByTestId("concept-page-status-overall")).toHaveTextContent(
      "Completed",
    );
    expect(
      screen.getByTestId("concept-page-status-primary-cta"),
    ).toHaveTextContent(/Next concept:/i);
    expect(
      screen.getByTestId("concept-page-status-secondary-cta"),
    ).toHaveTextContent("Review this concept");
  });

  it("points challenged concepts back to Check + Continue", () => {
    const identity = {
      id: "concept-reaction-rate-collision-theory",
      slug: "reaction-rate-collision-theory",
      title: "Reaction Rate / Collision Theory",
    };
    recordConceptVisit(identity);
    recordChallengeModeUsed(identity);

    renderStatusSurface("reaction-rate-collision-theory");

    expect(screen.getByTestId("concept-page-status-overall")).toHaveTextContent(
      "In progress",
    );
    expect(
      screen.getByTestId("concept-page-status-primary-cta"),
    ).toHaveTextContent(/Continue at/i);
  });

  it("hides the compact status panel for fresh learners", () => {
    renderStatusSurface("simple-harmonic-motion", { variant: "compact" });

    expect(screen.queryByTestId("concept-page-status-surface")).not.toBeInTheDocument();
  });

  it("keeps compact status CTAs at the shared tap target floor", () => {
    const identity = {
      id: "concept-simple-harmonic-motion",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    };
    recordConceptVisit(identity);
    recordCompareModeUsed(identity);

    renderStatusSurface("simple-harmonic-motion", { variant: "compact" });

    expect(screen.getByTestId("concept-page-status-primary-cta")).toHaveClass("min-h-11");
  });

  it("shows the progress source badge in compact mode when synced progress is displayed", () => {
    const syncedSnapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: "concept-simple-harmonic-motion",
          slug: "simple-harmonic-motion",
          firstVisitedAt: "2026-04-24T11:00:00.000Z",
          usedCompareModeAt: "2026-04-24T11:05:00.000Z",
        },
      },
    };

    renderStatusSurface("simple-harmonic-motion", {
      variant: "compact",
      initialSyncedSnapshot: syncedSnapshot,
    });

    const statusSurface = screen.getByRole("region", { name: "Your status" });
    const statusNote = screen.getByText(
      "Saved progress suggests resuming in Link the stage and graphs.",
    );
    expect(statusSurface).toHaveAttribute(
      "aria-describedby",
      statusNote.id,
    );
    expect(statusSurface).toHaveAccessibleDescription(
      "Saved progress suggests resuming in Link the stage and graphs.",
    );
    expect(screen.getByText("Your status")).toHaveClass("text-ink-700");
    expect(screen.getByTestId("concept-page-status-source")).toHaveTextContent("Synced");
    expect(screen.getByTestId("concept-page-status-source")).toHaveClass(
      "bg-paper-strong",
      "text-ink-700",
    );
  });

  it("renders localized status copy in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    renderStatusSurface("simple-harmonic-motion");

    expect(screen.getByTestId("concept-page-status-overall")).toHaveTextContent(
      zhHkMessages.ConceptPage.statusSurface.overall["not-started"],
    );
    expect(
      screen.getByTestId("concept-page-status-primary-cta"),
    ).toHaveTextContent(
      zhHkMessages.ConceptPage.statusSurface.actions.startConcept,
    );
  });
});
