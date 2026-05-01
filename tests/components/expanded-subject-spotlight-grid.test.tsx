// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExpandedSubjectSpotlightGrid } from "@/components/concepts/ExpandedSubjectSpotlightGrid";
import {
  buildExpandedSubjectSpotlights,
  getGuidedCollections,
  getRecommendedGoalPaths,
  getSubjectDiscoverySummaries,
} from "@/lib/content";

describe("ExpandedSubjectSpotlightGrid", () => {
  const spotlights = buildExpandedSubjectSpotlights({
    subjects: getSubjectDiscoverySummaries(),
    guidedCollections: getGuidedCollections(),
    recommendedGoalPaths: getRecommendedGoalPaths(),
  });
  const chemistrySpotlight = spotlights.find(
    (spotlight) => spotlight.subject.slug === "chemistry",
  );

  it("renders direct links into the newer subject branches without inventing extra routes", () => {
    expect(chemistrySpotlight?.goalPath).toBeTruthy();

    render(<ExpandedSubjectSpotlightGrid spotlights={spotlights} variant="compact" />);

    expect(screen.getByRole("link", { name: /open math/i })).toHaveAttribute(
      "href",
      "/concepts/subjects/math",
    );
    expect(
      screen.getByRole("link", { name: /functions and change lesson set/i }),
    ).toHaveAttribute("href", "/guided/functions-and-change-lesson-set");
    expect(
      screen.getByRole("link", {
        name: chemistrySpotlight?.goalPath?.title ?? "",
      }),
    ).toHaveAttribute("href", chemistrySpotlight?.goalPath?.path ?? "");
    expect(
      screen.getByRole("link", { name: /algorithms and search playlist/i }),
    ).toHaveAttribute("href", "/guided/algorithms-and-search-playlist");
  });
});
