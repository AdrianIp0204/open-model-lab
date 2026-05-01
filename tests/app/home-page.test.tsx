// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", () => ({
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
  getGuidedCollections: () => [
    {
      slug: "mechanics-basics",
      title: "Mechanics basics",
      summary: "One compact mechanics collection.",
      path: "/guided/mechanics-basics",
      concepts: [],
    },
  ],
  getPublishedConceptMetadata: () => [],
  getConceptSummaries: () => [
    {
      id: "concept-vectors",
      slug: "vectors-components",
      title: "Vectors and Components",
      shortTitle: "Vectors",
      summary: "Read one vector and its components.",
      topic: "Mechanics",
      subject: "Physics",
      accent: "sky",
      estimatedStudyMinutes: 12,
      highlights: ["Components"],
    },
  ],
  getStarterTrackDiscoveryHighlights: () => [
    {
      slug: "motion-and-circular-motion",
      title: "Motion and Circular Motion",
      summary: "Follow one short mechanics path.",
      concepts: [{ slug: "vectors-components", subject: "Physics", topic: "Mechanics", title: "Vectors and Components" }],
      heroTrack: true,
    },
  ],
  getStarterTrackCatalogMetrics: () => ({
    totalTracks: 1,
  }),
  getStarterTracks: () => [
    {
      slug: "motion-and-circular-motion",
      title: "Motion and Circular Motion",
      summary: "Follow one short mechanics path.",
      concepts: [{ slug: "vectors-components", subject: "Physics", topic: "Mechanics", title: "Vectors and Components" }],
      heroTrack: true,
    },
  ],
  getSubjectDiscoverySummaries: () => [
    {
      slug: "physics",
      title: "Physics",
      description: "Physics overview.",
      path: "/concepts/subjects/physics",
    },
  ],
  getTopicDiscoverySummaries: () => [
    {
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
      relatedTopics: [],
    },
  ],
}));

vi.mock("@/components/concepts/concept-catalog", () => ({
  decorateConceptSummaries: (concepts: unknown) => concepts,
  getFeaturedConcepts: (concepts: Array<unknown>) => concepts,
  getQuickStartConcept: (concepts: Array<unknown>) => concepts[0] ?? null,
}));

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
    action,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    action?: ReactNode;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

vi.mock("@/components/motion", () => ({
  MotionSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MotionStaggerGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Display ad</div>
  ),
  MultiplexAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Multiplex ad</div>
  ),
}));

vi.mock("@/components/home/HomeHeroLivePreview", () => ({
  HomeHeroLivePreview: () => <div>Live preview</div>,
}));

import HomePage from "@/app/_localized/home-page";

describe("home page", () => {
  it("renders a calmer hero with one primary action model and lower-emphasis follow-ups", async () => {
    globalThis.__TEST_LOCALE__ = "en";
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /start from one live model, then learn by changing it/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /open one simulation, keep the graph and controls in view, and follow the next idea only when it helps/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/start here chooses the first move\. browse and search stay close when you want more control/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /the live bench stays first so the next step comes from the model instead of from a pile of route choices/i,
      ),
    ).toBeInTheDocument();

    const primaryActions = screen.getByRole("navigation", {
      name: /primary home actions/i,
    });
    expect(within(primaryActions).getAllByRole("link")).toHaveLength(3);
    expect(within(primaryActions).getByRole("link", { name: "Start here" })).toHaveAttribute(
      "href",
      "/start",
    );
    expect(within(primaryActions).getByRole("link", { name: "Browse library" })).toHaveAttribute(
      "href",
      "/concepts",
    );
    expect(within(primaryActions).getByRole("link", { name: "Search" })).toHaveAttribute(
      "href",
      "/search",
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /preview each route before you commit/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /open these panels when you want a few examples first\. the main route links stay visible above/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/preview guided starts/i)).toBeInTheDocument();
    expect(screen.getByText(/preview subject and topic maps/i)).toBeInTheDocument();
    expect(screen.getByText(/preview challenge practice/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Send feedback" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByTestId("ad-slot-home.heroBelow")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-home.discoveryMid")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-home.footerMultiplex")).toBeInTheDocument();
  });

  it("renders zh-HK hero copy from the active locale without a separate route implementation", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /先從一個即時模型開始，再透過改動去理解它/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "開始學習" })).toHaveAttribute(
      "href",
      "/start",
    );
    expect(screen.getByRole("link", { name: "瀏覽概念庫" })).toHaveAttribute(
      "href",
      "/concepts",
    );
  });
});
