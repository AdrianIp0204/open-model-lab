// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getOptionalStoredProgressForCookieHeaderMock: vi.fn(),
  concept: {
    id: "concept-vectors",
    slug: "vectors-components",
    title: "Vectors and Components",
    shortTitle: "Vectors",
    summary: "Read one vector and its components.",
    topic: "Mechanics",
    accent: "sky",
    estimatedStudyMinutes: 12,
    highlights: ["Components"],
  },
  starterTrack: {
    slug: "motion-and-circular-motion",
    title: "Motion and Circular Motion",
    summary: "Follow one short mechanics path.",
    concepts: [{ slug: "vectors-components" }],
    heroTrack: true,
  },
  guidedCollection: {
    slug: "mechanics-basics",
    title: "Mechanics basics",
    summary: "One compact mechanics collection.",
    path: "/guided/mechanics-basics",
  },
  topicSummary: {
    slug: "mechanics",
    title: "Mechanics",
    subject: "Physics",
    description: "Mechanics overview.",
    concepts: [
      {
        slug: "vectors-components",
        title: "Vectors and Components",
        summary: "Read one vector and its components.",
      },
    ],
    starterTracks: [
      {
        slug: "motion-and-circular-motion",
        title: "Motion and Circular Motion",
        summary: "Follow one short mechanics path.",
      },
    ],
  },
  subjectSummary: {
    slug: "physics",
    title: "Physics",
    description: "Physics overview.",
    path: "/concepts/subjects/physics",
  },
  goalPath: {
    slug: "goal-start-mechanics",
    title: "Start mechanics cleanly",
  },
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookiesMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: () => undefined,
  }),
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/lib/account/server-store", () => ({
  getOptionalStoredProgressForCookieHeader: mocks.getOptionalStoredProgressForCookieHeaderMock,
}));

vi.mock("@/lib/content", () => ({
  buildExpandedSubjectSpotlights: () => [],
  getConceptCatalogMetrics: () => ({
    totalConcepts: 1,
    totalTopics: 1,
    estimatedStudyMinutes: 12,
  }),
  getChallengeDiscoveryMetrics: () => ({
    totalChallenges: 4,
  }),
  getGuidedCollectionCatalogMetrics: () => ({
    totalCollections: 1,
    totalSteps: 3,
    totalCoveredConcepts: 1,
    totalEstimatedStudyMinutes: 25,
  }),
  getGuidedCollections: () => [mocks.guidedCollection],
  getPublishedConceptMetadata: () => [],
  getConceptSummaries: () => [mocks.concept],
  getStarterTrackDiscoveryHighlights: () => [mocks.starterTrack],
  getStarterTrackCatalogMetrics: () => ({
    totalTracks: 1,
  }),
  getStarterTracks: () => [mocks.starterTrack],
  getSubjectDiscoverySummaries: () => [mocks.subjectSummary],
  getTopicDiscoverySummaries: () => [mocks.topicSummary],
  getConceptTopics: () => ["Mechanics"],
  getRecommendedGoalPaths: () => [mocks.goalPath],
  getChallengeDiscoveryIndex: () => ({
    entries: [],
    topics: [mocks.topicSummary],
    tracks: [mocks.starterTrack],
  }),
}));

vi.mock("@/components/concepts/concept-catalog", () => ({
  decorateConceptSummaries: (concepts: unknown) => concepts,
  getFeaturedConcepts: (concepts: Array<unknown>) => concepts,
  getQuickStartConcept: (concepts: Array<unknown>) => concepts[0] ?? null,
}));

vi.mock("@/lib/metadata", () => ({
  buildCollectionPageJsonLd: () => ({}),
  buildItemListJsonLd: () => ({}),
  buildOrganizationJsonLd: () => ({}),
  buildPageMetadata: () => ({}),
  buildWebApplicationJsonLd: () => ({}),
  buildBreadcrumbJsonLd: () => ({}),
  buildWebsiteJsonLd: () => ({}),
  getAbsoluteUrl: (path: string) => `http://localhost${path}`,
  getLocaleAbsoluteUrl: (path: string, locale: string) => `http://localhost/${locale}${path === "/" ? "" : path}`,
  serializeJsonLd: () => "{}",
}));

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`} />
  ),
  InArticleAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`} />
  ),
  MultiplexAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`} />
  ),
}));

vi.mock("@/components/progress/HomeContinueLearningSurface", () => ({
  HomeContinueLearningSurface: () => <div>Continue learning</div>,
}));

vi.mock("@/components/concepts/ConceptTile", () => ({
  ConceptTile: ({ concept }: { concept: { title: string } }) => <div>{concept.title}</div>,
}));

vi.mock("@/components/concepts/StarterTrackEntryLink", () => ({
  StarterTrackEntryLink: ({ track }: { track: { title: string } }) => <a href={`/tracks/${track.title}`}>{track.title}</a>,
}));

vi.mock("@/components/concepts/StarterTrackCard", () => ({
  StarterTrackCard: ({ track }: { track: { title: string } }) => <div>{track.title}</div>,
}));

vi.mock("@/components/concepts/TopicDiscoveryCard", () => ({
  TopicDiscoveryCard: ({ topic }: { topic: { title: string } }) => <div>{topic.title}</div>,
}));

vi.mock("@/components/concepts/SubjectDiscoveryCard", () => ({
  SubjectDiscoveryCard: ({ subject }: { subject: { title: string } }) => <div>{subject.title}</div>,
}));

vi.mock("@/components/guided/GuidedCollectionCard", () => ({
  GuidedCollectionCard: ({ collection }: { collection: { title: string } }) => <div>{collection.title}</div>,
}));

vi.mock("@/components/guided/GuidedCollectionsHub", () => ({
  GuidedCollectionsHub: () => <div>Guided collections hub</div>,
}));

vi.mock("@/components/concepts/ConceptLibraryBrowser", () => ({
  ConceptLibraryBrowser: () => <div>Concept browser</div>,
}));

vi.mock("@/components/progress/ContinueLearningSection", () => ({
  ContinueLearningSection: () => <div>Continue section</div>,
}));

vi.mock("@/components/progress/ReviewQueueSection", () => ({
  ReviewQueueSection: () => <div>Review section</div>,
}));

vi.mock("@/components/guided/RecommendedGoalPathList", () => ({
  RecommendedGoalPathList: () => <div>Goal paths</div>,
}));

vi.mock("@/components/challenges/ChallengeDiscoveryHub", () => ({
  ChallengeDiscoveryHub: () => <div>Challenge hub</div>,
}));

import HomePage from "@/app/_localized/home-page";
import AboutPage from "@/app/about/AboutRoute";
import ConceptsPage from "@/app/concepts/ConceptsRoute";
import GuidedCollectionsPage from "@/app/guided/GuidedCollectionsRoute";
import TopicDirectoryPage from "@/app/concepts/topics/TopicDirectoryRoute";
import SubjectDirectoryPage from "@/app/concepts/subjects/page";
import ChallengeHubPage from "@/app/challenges/ChallengesRoute";
import PricingPage from "@/app/pricing/PricingRoute";
import zhHkMessages from "@/messages/zh-HK.json";

describe("discovery ad placements", () => {
  afterEach(() => {
    mocks.cookiesMock.mockReset();
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockReset();
  });

  it("renders ad slots on the allowed discovery pages", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });

    render(await HomePage());
    expect(screen.getByTestId("ad-slot-home.heroBelow")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-home.discoveryMid")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-home.footerMultiplex")).toBeInTheDocument();

    render(await ConceptsPage());
    expect(screen.getByTestId("ad-slot-library.browserDisplay")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-library.footerMultiplex")).toBeInTheDocument();

    render(await TopicDirectoryPage());
    expect(screen.getByTestId("ad-slot-topicDirectory.headerDisplay")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-topicDirectory.footerMultiplex")).toBeInTheDocument();

    render(await SubjectDirectoryPage());
    expect(screen.getByTestId("ad-slot-subjectDirectory.headerDisplay")).toBeInTheDocument();

    render(await GuidedCollectionsPage());
    expect(screen.getByTestId("ad-slot-guided.headerDisplay")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-guided.footerMultiplex")).toBeInTheDocument();
  });

  it("keeps excluded surfaces free of ad slots", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });

    render(
      await ChallengeHubPage({
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.queryByTestId(/ad-slot-/)).not.toBeInTheDocument();

    render(await PricingPage());
    expect(screen.queryByTestId(/ad-slot-/)).not.toBeInTheDocument();

    render(await AboutPage());
    expect(screen.queryByTestId(/ad-slot-/)).not.toBeInTheDocument();
  });

  it("keeps public discovery routes renderable when optional synced progress is unavailable", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: true,
    });

    render(await ConceptsPage());
    expect(screen.getAllByText("Concept browser").length).toBeGreaterThan(0);

    render(
      await ChallengeHubPage({
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("Challenge hub")).toBeInTheDocument();
  });

  it("localizes the guided directory route body in zh-HK", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await GuidedCollectionsPage({ localeOverride: "zh-HK" }));

    expect(
      screen.getByText(zhHkMessages.GuidedCollectionsPage.metrics.collectionsDescription),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zhHkMessages.GuidedCollectionsPage.metrics.minutesDescription),
    ).toBeInTheDocument();
  });
});
