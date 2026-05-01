// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecommendedGoalPathList } from "@/components/guided/RecommendedGoalPathList";
import {
  getRecommendedGoalPathBySlug,
  getRecommendedGoalPathsForTopic,
} from "@/lib/content";
import { localConceptProgressStore, PROGRESS_STORAGE_KEY } from "@/lib/progress";

describe("RecommendedGoalPathList", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("surfaces recommended prep when a branch-prep goal needs an authored prerequisite track", () => {
    render(
      <RecommendedGoalPathList
        goalPaths={[getRecommendedGoalPathBySlug("prepare-for-electromagnetism")]}
      />,
    );

    expect(screen.getByText(/entry diagnostic/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /start electricity/i })
        .every((link) => link.getAttribute("href") === "/tracks/electricity"),
    ).toBe(true);
  });

  it("turns local progress into a continue action for the matching goal path", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            firstVisitedAt: "2026-03-28T10:00:00.000Z",
            lastVisitedAt: "2026-03-28T10:05:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <RecommendedGoalPathList
        goalPaths={getRecommendedGoalPathsForTopic("waves")}
        variant="compact"
      />,
    );

    expect(
      screen
        .getAllByRole("link", { name: /continue concept/i })
        .every((link) => link.getAttribute("href") === "/concepts/wave-interference"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: /view on guided page/i })).toHaveAttribute(
      "href",
      "/guided#goal-waves-intuition",
    );
  });

  it("surfaces the guided-collection shortcut when a math goal path owns one", () => {
    render(
      <RecommendedGoalPathList
        goalPaths={[getRecommendedGoalPathBySlug("functions-and-change")]}
      />,
    );

    expect(screen.getByRole("link", { name: /open collection/i })).toHaveAttribute(
      "href",
      "/guided/functions-and-change-lesson-set",
    );
  });

  it("uses deterministic synced date formatting when the server snapshot drives the goal path", () => {
    render(
      <RecommendedGoalPathList
        goalPaths={[getRecommendedGoalPathBySlug("waves-intuition")]}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "simple-harmonic-motion": {
              conceptId: "concept-shm",
              slug: "simple-harmonic-motion",
              firstVisitedAt: "2026-03-27T08:00:00.000Z",
              lastVisitedAt: "2026-03-27T08:00:00.000Z",
            },
          },
        }}
      />,
    );

    expect(screen.getByText("Synced fallback")).toBeInTheDocument();
    expect(screen.getByText("Mar 27")).toBeInTheDocument();
  });

  it("uses a single primary CTA in the guided-hub variant", () => {
    render(
      <RecommendedGoalPathList
        goalPaths={[getRecommendedGoalPathBySlug("functions-and-change")]}
        variant="guided-hub"
      />,
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /open topic page/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open collection/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view on guided page/i })).not.toBeInTheDocument();
  });
});
