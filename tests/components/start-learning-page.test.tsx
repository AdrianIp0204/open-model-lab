// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { StartLearningPage } from "@/components/start/StartLearningPage";
import {
  buildExpandedSubjectSpotlights,
  getConceptSummaries,
  getGuidedCollections,
  getRecommendedGoalPaths,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import { localConceptProgressStore, PROGRESS_STORAGE_KEY } from "@/lib/progress";
import zhHkMessages from "@/messages/zh-HK.json";

describe("StartLearningPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  const subjects = getSubjectDiscoverySummaries();
  const concepts = getConceptSummaries();
  const starterTracks = getStarterTracks();
  const guidedCollections = getGuidedCollections();
  const expandedSubjectSpotlights = buildExpandedSubjectSpotlights({
    subjects,
    guidedCollections,
    recommendedGoalPaths: getRecommendedGoalPaths(),
  });

  it("starts with a compact not-sure fallback when no saved progress exists", () => {
    render(
      <StartLearningPage
        locale="en"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /choose a clear first step/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not sure" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Quick start" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("start-primary-cta").getAttribute("href")).toMatch(
      /^\/concepts\//,
    );
    expect(screen.getByRole("link", { name: /adjust filters/i })).toHaveAttribute(
      "href",
      "#start-new",
    );
    expect(
      screen.getByText(/quick start usually picks one concept or topic/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /browse all subjects/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /search concepts and topics/i }).length,
    ).toBeGreaterThan(0);
  });

  it("renders the chooser and shared start chrome in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      <StartLearningPage
        locale="zh-HK"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
        expandedSubjectSpotlights={expandedSubjectSpotlights}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: zhHkMessages.StartLearningPage.chooser.title,
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: zhHkMessages.StartLearningPage.filters.interest.notSure,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", {
        name: zhHkMessages.StartLearningPage.filters.commitment["quick-start"],
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(zhHkMessages.StartLearningPage.spotlights.eyebrow).length,
    ).toBeGreaterThan(0);
  });

  it("keeps newer-subject collections and goal paths visible beneath the chooser", () => {
    render(
      <StartLearningPage
        locale="en"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
        expandedSubjectSpotlights={expandedSubjectSpotlights}
      />,
    );

    expect(
      screen.getByText(/keep the newer subjects easy to find/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /rates and equilibrium lesson set/i }),
    ).toHaveAttribute("href", "/guided/rates-and-equilibrium-lesson-set");
    expect(
      screen.getByRole("link", {
        name: /build computer-science intuition through algorithms and search/i,
      }),
    ).toHaveAttribute("href", "/guided#goal-algorithms-and-search");
  });

  it("can prefill a subject and map the chooser from track start to topic-first browse", async () => {
    const user = userEvent.setup();

    render(
      <StartLearningPage
        locale="en"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
        initialSubjectSlug="math"
      />,
    );

    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen
        .getAllByRole("link", { name: /start functions and change/i })
        .some((link) => link.getAttribute("href") === "/tracks/functions-and-change"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /search concepts and topics/i })
        .some((link) => link.getAttribute("href") === "/search?subject=math"),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Quick start" }));
    await user.click(screen.getByRole("button", { name: "Know some basics" }));

    expect(
      screen
        .getAllByRole("link", { name: /^Open Functions$/i })
        .some((link) => link.getAttribute("href") === "/concepts/topics/functions"),
    ).toBe(true);
  });

  it("supports the computer-science pilot as a first-class subject choice", async () => {
    const user = userEvent.setup();

    render(
      <StartLearningPage
        locale="en"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
        initialSubjectSlug="computer-science"
      />,
    );

    expect(screen.getByRole("button", { name: "Computer Science" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen
        .getAllByRole("link", { name: /start algorithms and search foundations/i })
        .some(
          (link) =>
            link.getAttribute("href") === "/tracks/algorithms-and-search-foundations",
        ),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Quick start" }));
    await user.click(screen.getByRole("button", { name: "Know some basics" }));

    expect(
      screen
        .getAllByRole("link", { name: /^Open Algorithms and Search$/i })
        .some(
          (link) =>
            link.getAttribute("href") === "/concepts/topics/algorithms-and-search",
        ),
    ).toBe(true);
  });

  it("puts the saved resume path ahead of a fresh start when progress already exists", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "graph-transformations": {
            conceptId: "concept-graph-transformations",
            slug: "graph-transformations",
            firstVisitedAt: "2026-04-04T09:00:00.000Z",
            lastVisitedAt: "2026-04-04T09:05:00.000Z",
            lastInteractedAt: "2026-04-04T09:05:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <StartLearningPage
        locale="en"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
      />,
    );

    expect(
      screen
        .getAllByRole("link", { name: /continue concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/graph-transformations"),
    ).toBe(true);
    expect(
      screen.getByRole("link", { name: /continue this subject/i }),
    ).toHaveAttribute("href", "/concepts/subjects/math");
    expect(
      screen.getByRole("button", { name: "Math" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("surfaces recent challenge traction before the chooser when progress already exists", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            firstVisitedAt: "2026-04-04T09:00:00.000Z",
            lastVisitedAt: "2026-04-05T09:05:00.000Z",
            lastInteractedAt: "2026-04-05T09:05:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-04-05T09:10:00.000Z",
            },
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <StartLearningPage
        locale="en"
        subjects={subjects}
        concepts={concepts}
        starterTracks={starterTracks}
        guidedCollections={guidedCollections}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /recent wins and a few good next moves/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/projectile motion checkpoint/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/subject momentum/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /reopen checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );
  });
});
