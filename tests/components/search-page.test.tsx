// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPage } from "@/components/search/SearchPage";
import {
  buildConceptSearchMetadataBySlug,
  buildExpandedSubjectSpotlights,
  buildSiteSearchIndex,
  getConceptSummaries,
  getGuidedCollections,
  getPublishedConceptMetadata,
  getRecommendedGoalPaths,
  getStarterTracks,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import {
  localConceptProgressStore,
  PROGRESS_STORAGE_KEY,
} from "@/lib/progress";
import { getSubjectDisplayTitle } from "@/lib/i18n/content";
import zhHkMessages from "@/messages/zh-HK.json";

const navigationState = vi.hoisted(() => ({
  pathname: "/search",
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: navigationState.replace,
  }),
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Display ad</div>
  ),
}));

function getSubjectFilter() {
  return screen.getByRole("combobox", { name: /subject filter/i });
}

function getTopicFilter() {
  return screen.getByRole("combobox", { name: /topic filter/i });
}

function hasLinkForHref(href: string) {
  return screen
    .getAllByRole("link")
    .some((link) => link.getAttribute("href") === href);
}

describe("SearchPage", () => {
  const index = buildSiteSearchIndex({
    subjects: getSubjectDiscoverySummaries(),
    topics: getTopicDiscoverySummaries(),
    starterTracks: getStarterTracks(),
    guidedCollections: getGuidedCollections(),
    recommendedGoalPaths: getRecommendedGoalPaths(),
    concepts: getConceptSummaries(),
    conceptMetadataBySlug: buildConceptSearchMetadataBySlug(
      getPublishedConceptMetadata(),
    ),
  });
  const expandedSubjectSpotlights = buildExpandedSubjectSpotlights({
    subjects: getSubjectDiscoverySummaries(),
    guidedCollections: getGuidedCollections(),
    recommendedGoalPaths: getRecommendedGoalPaths(),
  });

  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    navigationState.searchParams = new URLSearchParams();
    navigationState.replace.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  function buildSearchPageProps(search = "") {
    const params = new URLSearchParams(search);

    return {
      index,
      initialQuery: params.get("q"),
      initialSubjectSlug: params.get("subject"),
      initialTopic: params.get("topic"),
      expandedSubjectSpotlights,
    } as const;
  }

  function renderSearchPageForUrl(search = "") {
    navigationState.searchParams = new URLSearchParams(search);

    return render(
      <SearchPage key={search || "default"} {...buildSearchPageProps(search)} />,
    );
  }

  function rerenderSearchPageForUrl(
    view: ReturnType<typeof render>,
    search = "",
  ) {
    navigationState.searchParams = new URLSearchParams(search);
    view.rerender(
      <SearchPage key={search || "default"} {...buildSearchPageProps(search)} />,
    );
  }

  it("hydrates subject-prefilled search state with canonical slug values", () => {
    render(
      <SearchPage
        index={index}
        initialSubjectSlug="math"
        expandedSubjectSpotlights={expandedSubjectSpotlights}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /search concepts, topic pages, tracks, and guided paths from one place/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Show Math topic pages and paths")).toBeInTheDocument();
    expect(getSubjectFilter()).toHaveValue("math");
    expect(getTopicFilter()).toHaveValue("all");
    expect(screen.getByPlaceholderText(/search inside math/i)).toBeInTheDocument();
    expect(screen.getByText("Use Subject for the broad branch first.")).toBeInTheDocument();
    expect(screen.getByText("Searching inside Math")).toBeInTheDocument();
    expect(document.querySelector('[data-visual-motif="subject-math"]')).not.toBeNull();
    expect(
      screen.getByText("Now showing topics inside Math. Add one when you want a tighter concept list."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You are already inside Math. Add a topic to narrow the concept list further, or type a title to jump straight to a page.",
      ),
    ).toBeInTheDocument();
    expect(hasLinkForHref("#search-route-disclosure")).toBe(true);
    expect(hasLinkForHref("/concepts/subjects/math")).toBe(true);
    expect(hasLinkForHref("/concepts/topics")).toBe(true);
    expect(screen.getByTestId("ad-slot-search.resultsDisplay")).toBeInTheDocument();
  });

  it("keeps concept browse behind disclosure when no query is active", async () => {
    const user = userEvent.setup();

    render(
      <SearchPage
        index={index}
        expandedSubjectSpotlights={expandedSubjectSpotlights}
      />,
    );

    expect(
      screen.getByText(
        "Start with Subject for the big branch. Then use Topic for the smaller area inside that subject, or type a title when you already know what you want.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Topic is the smaller map inside a subject. Pick a subject first when this list feels too wide.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Browse shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Jump to the browse layer you want.")).toBeInTheDocument();
    expect(hasLinkForHref("#search-concept-browse-disclosure")).toBe(true);
    expect(hasLinkForHref("#search-route-disclosure")).toBe(true);
    expect(hasLinkForHref("/concepts/subjects")).toBe(true);
    expect(hasLinkForHref("/concepts/topics")).toBe(true);

    await user.click(screen.getByText(/show concept browse/i));

    expect(screen.getByText("Jump within browse")).toBeInTheDocument();
    expect(hasLinkForHref("#search-browse-section-math")).toBe(true);
    expect(hasLinkForHref("#search-browse-section-physics")).toBe(true);
    expect(hasLinkForHref("/concepts/conservation-of-momentum")).toBe(true);
    expect(hasLinkForHref("/concepts/graph-transformations")).toBe(true);
  });

  it("groups subject-only browse into topic sections with jump links", () => {
    renderSearchPageForUrl("subject=physics");

    expect(screen.getByText("Jump within browse")).toBeInTheDocument();
    expect(hasLinkForHref("#search-browse-section-mechanics")).toBe(true);
    expect(hasLinkForHref("#search-browse-section-oscillations")).toBe(true);
    expect(screen.getByRole("link", { name: "Open Mechanics" })).toHaveAttribute(
      "href",
      "/concepts/topics/mechanics",
    );
  });

  it("keeps filtered browse close to the matching topic and subject pages", () => {
    renderSearchPageForUrl("subject=physics&topic=mechanics");

    const browseSection = screen
      .getByRole("heading", { level: 2, name: /mechanics concepts/i })
      .closest("section");

    expect(browseSection).not.toBeNull();
    expect(
      within(browseSection as HTMLElement).getByRole("link", { name: "Open Mechanics" }),
    ).toHaveAttribute("href", "/concepts/topics/mechanics");
    expect(
      within(browseSection as HTMLElement).getByRole("link", { name: "Open Physics" }),
    ).toHaveAttribute("href", "/concepts/subjects/physics");
  });

  it("returns concept and starter-track hits through the shared canonical route", async () => {
    const user = userEvent.setup();

    render(<SearchPage index={index} />);

    await user.type(
      screen.getByRole("searchbox", { name: /search the site/i }),
      "vectors",
    );

    expect(screen.getByText("Search scope")).toBeInTheDocument();
    expect(screen.getByText("Searching the full library")).toBeInTheDocument();
    expect(
      screen.getAllByText(/for "vectors"\./i),
    ).toHaveLength(1);
    expect(hasLinkForHref("/concepts/vectors-in-2d")).toBe(true);
    expect(hasLinkForHref("/tracks/vectors-and-motion-bridge")).toBe(true);
    expect(document.querySelector('[data-visual-motif="vectors-components"]')).not.toBeNull();

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenLastCalledWith(
        "/search?q=vectors",
        { scroll: false },
      );
    });
  });

  it("adds jump links when results span multiple result types", () => {
    renderSearchPageForUrl("q=vectors");

    expect(screen.getByText("Jump within results")).toBeInTheDocument();
    expect(screen.getByText("Go straight to the result type you want.")).toBeInTheDocument();
    expect(hasLinkForHref("#search-results-track")).toBe(true);
    expect(hasLinkForHref("#search-results-concept")).toBe(true);
  });

  it("suggests narrowing sitewide results into a matching subject branch", () => {
    renderSearchPageForUrl("q=motion");

    expect(screen.getByText("Refine this search")).toBeInTheDocument();
    expect(
      screen.getByText("Shorten the list by stepping into the strongest subject branch."),
    ).toBeInTheDocument();
    expect(hasLinkForHref("/search?q=motion&subject=physics")).toBe(true);
  });

  it("suggests narrowing subject results into a matching topic branch", () => {
    renderSearchPageForUrl("q=motion&subject=physics");

    expect(
      screen.getByText(
        "Shorten the list by stepping into the strongest topic inside this subject.",
      ),
    ).toBeInTheDocument();
    expect(hasLinkForHref("/search?q=motion&subject=physics&topic=mechanics")).toBe(true);
  });

  it("drops an incompatible topic filter when the subject changes", async () => {
    const user = userEvent.setup();
    const view = renderSearchPageForUrl("q=motion&subject=physics&topic=mechanics");

    expect(getSubjectFilter()).toHaveValue("physics");
    expect(getTopicFilter()).toHaveValue("mechanics");

    await user.selectOptions(getSubjectFilter(), "chemistry");

    expect(navigationState.replace).toHaveBeenLastCalledWith(
      "/search?q=motion&subject=chemistry",
      { scroll: false },
    );

    rerenderSearchPageForUrl(view, "q=motion&subject=chemistry");

    expect(getSubjectFilter()).toHaveValue("chemistry");
    expect(getTopicFilter()).toHaveValue("all");
  });

  it("offers a direct way to clear only the active topic filter", async () => {
    const user = userEvent.setup();

    renderSearchPageForUrl("q=motion&subject=physics&topic=mechanics");

    expect(getTopicFilter()).toHaveValue("mechanics");

    await user.click(
      screen.getAllByRole("button", { name: /clear topic filter/i })[0]!,
    );

    expect(navigationState.replace).toHaveBeenLastCalledWith(
      "/search?q=motion&subject=physics",
      { scroll: false },
    );
  });

  it("offers nearby recovery links when a filtered query finds nothing", () => {
    renderSearchPageForUrl("q=zzzzzz&subject=physics&topic=mechanics");

    expect(screen.getByText("Try one nearby page")).toBeInTheDocument();
    expect(hasLinkForHref("/concepts/topics/mechanics")).toBe(true);
    expect(hasLinkForHref("/concepts/subjects/physics")).toBe(true);
  });

  it("normalizes invalid subject/topic combinations safely", async () => {
    renderSearchPageForUrl("subject=chemistry&topic=mechanics");

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenLastCalledWith(
        "/search?subject=chemistry",
        { scroll: false },
      );
    });

    expect(getSubjectFilter()).toHaveValue("chemistry");
    expect(getTopicFilter()).toHaveValue("all");
  });

  it("surfaces progress-aware continue cues for saved work", () => {
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

    renderSearchPageForUrl("q=graph");

    expect(screen.getAllByText(/continue here/i).length).toBeGreaterThan(0);
    expect(hasLinkForHref("/concepts/graph-transformations")).toBe(true);
  });

  it("renders the search surface in zh-HK without breaking canonical slug filters", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const mathSubject = getSubjectDiscoverySummaries().find(
      (subject) => subject.slug === "math",
    );

    if (!mathSubject) {
      throw new Error("Expected math subject in discovery summaries");
    }

    render(
      <SearchPage
        index={index}
        initialSubjectSlug="math"
        expandedSubjectSpotlights={expandedSubjectSpotlights}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: zhHkMessages.SearchPage.hero.title,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        zhHkMessages.SearchPage.hero.searchInsideSubject.replace(
          "{subject}",
          getSubjectDisplayTitle(mathSubject, "zh-HK"),
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", {
        name: `${zhHkMessages.SearchPage.filters.subject} filter`,
      }),
    ).toHaveValue("math");
    expect(screen.getByText(zhHkMessages.SearchPage.filters.subjectHelp)).toBeInTheDocument();
    expect(
      screen.getByText(
        zhHkMessages.SearchPage.filters.topicHelpInsideSubject.replace(
          "{subject}",
          getSubjectDisplayTitle(mathSubject, "zh-HK"),
        ),
      ),
    ).toBeInTheDocument();
  });
});
