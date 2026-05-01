import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConceptLibraryBrowser } from "@/components/concepts/ConceptLibraryBrowser";
import type { ConceptSummary } from "@/components/concepts/concept-catalog";
import type { SubjectDiscoverySummary, TopicDiscoverySummary } from "@/lib/content";
import { getStarterTrackBySlug } from "@/lib/content";
import {
  getConceptDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitle,
} from "@/lib/i18n/content";
import {
  createEmptyProgressSnapshot,
  localConceptProgressStore,
  recordConceptVisit,
} from "@/lib/progress";
import zhHkMessages from "@/messages/zh-HK.json";

const navigationState = vi.hoisted(() => ({
  pathname: "/concepts",
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

const guidedTrack = getStarterTrackBySlug("motion-and-circular-motion");
const mathTrack = getStarterTrackBySlug("functions-and-change");
const starterTracks = [guidedTrack, mathTrack];

const conceptCatalog: ConceptSummary[] = [
  {
    id: "concept-vectors-components",
    slug: "vectors-components",
    title: "Vectors and Components",
    shortTitle: "Vectors",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "Intro",
    sequence: 10,
    summary: "Rotate and scale a live vector, then decompose it into components.",
    accent: "sky",
    highlights: ["Components"],
    tags: ["vectors", "components"],
    recommendedNext: [{ slug: "projectile-motion", reasonLabel: "Builds on this" }],
  },
  {
    id: "concept-projectile-motion",
    slug: "projectile-motion",
    title: "Projectile Motion",
    shortTitle: "Projectile",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "Intro",
    sequence: 12,
    summary: "Follow a launch through space and graphs.",
    accent: "coral",
    highlights: ["Trajectory"],
    tags: ["trajectory", "kinematics"],
  },
  {
    id: "concept-uniform-circular-motion",
    slug: "uniform-circular-motion",
    title: "Uniform Circular Motion",
    shortTitle: "UCM",
    subject: "Physics",
    topic: "Oscillations",
    difficulty: "Intro",
    sequence: 14,
    summary: "Track constant speed while the direction keeps changing.",
    accent: "sky",
    highlights: ["Centripetal acceleration"],
    tags: ["circular motion"],
  },
  {
    id: "concept-shm",
    slug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    shortTitle: "SHM",
    subject: "Physics",
    topic: "Oscillations",
    difficulty: "Intro",
    sequence: 16,
    summary: "Watch one oscillator repeat cleanly.",
    accent: "teal",
    highlights: ["Amplitude"],
    heroConcept: true,
    tags: ["oscillation"],
  },
  {
    id: "concept-graph-transformations",
    slug: "graph-transformations",
    title: "Graph Transformations",
    shortTitle: "Graph transforms",
    subject: "Math",
    topic: "Functions",
    difficulty: "Intro",
    sequence: 70,
    summary: "Shift, stretch, and reflect one parent graph with live controls.",
    accent: "amber",
    highlights: ["Parent function"],
    tags: ["functions", "transformations"],
  },
  {
    id: "concept-derivative-slope",
    slug: "derivative-as-slope-local-rate-of-change",
    title: "Derivative as Slope / Local Rate of Change",
    shortTitle: "Derivative as slope",
    subject: "Math",
    topic: "Calculus",
    difficulty: "Intro",
    sequence: 72,
    summary: "Tighten a secant into a tangent and read local rate of change.",
    accent: "teal",
    highlights: ["Tangent slope"],
    tags: ["calculus", "derivative"],
  },
];

function getEstimatedStudyMinutes(concepts: ConceptSummary[]) {
  return concepts.reduce((sum, concept) => sum + (concept.estimatedStudyMinutes ?? 0), 0);
}

const mechanicsConcepts = conceptCatalog.filter((concept) => concept.topic === "Mechanics");
const oscillationsConcepts = conceptCatalog.filter((concept) => concept.topic === "Oscillations");
const functionsConcepts = conceptCatalog.filter((concept) => concept.topic === "Functions");
const calculusConcepts = conceptCatalog.filter((concept) => concept.topic === "Calculus");

const topicSummaries: TopicDiscoverySummary[] = [
  {
    subject: "Physics",
    slug: "mechanics",
    title: "Mechanics",
    description: "Mechanics concepts.",
    introduction: "Mechanics concepts.",
    accent: "sky",
    conceptCount: mechanicsConcepts.length,
    estimatedStudyMinutes: getEstimatedStudyMinutes(mechanicsConcepts),
    sourceTopics: ["Mechanics"],
    subtopics: [],
    concepts: mechanicsConcepts,
    featuredConcepts: mechanicsConcepts,
    starterTracks: [guidedTrack],
    recommendedStarterTracks: [guidedTrack],
    relatedTopics: [],
    groups: [
      {
        id: "mechanics",
        title: "Mechanics",
        concepts: mechanicsConcepts,
        conceptCount: mechanicsConcepts.length,
        estimatedStudyMinutes: getEstimatedStudyMinutes(mechanicsConcepts),
      },
    ],
  },
  {
    subject: "Physics",
    slug: "oscillations",
    title: "Oscillations",
    description: "Oscillation concepts.",
    introduction: "Oscillation concepts.",
    accent: "teal",
    conceptCount: oscillationsConcepts.length,
    estimatedStudyMinutes: getEstimatedStudyMinutes(oscillationsConcepts),
    sourceTopics: ["Oscillations"],
    subtopics: [],
    concepts: oscillationsConcepts,
    featuredConcepts: oscillationsConcepts,
    starterTracks: [guidedTrack],
    recommendedStarterTracks: [guidedTrack],
    relatedTopics: [],
    groups: [
      {
        id: "oscillations",
        title: "Oscillations",
        concepts: oscillationsConcepts,
        conceptCount: oscillationsConcepts.length,
        estimatedStudyMinutes: getEstimatedStudyMinutes(oscillationsConcepts),
      },
    ],
  },
  {
    subject: "Math",
    slug: "functions",
    title: "Functions",
    description: "Functions concepts.",
    introduction: "Functions concepts.",
    accent: "amber",
    conceptCount: functionsConcepts.length,
    estimatedStudyMinutes: getEstimatedStudyMinutes(functionsConcepts),
    sourceTopics: ["Functions"],
    subtopics: [],
    concepts: functionsConcepts,
    featuredConcepts: functionsConcepts,
    starterTracks: [mathTrack],
    recommendedStarterTracks: [mathTrack],
    relatedTopics: [],
    groups: [
      {
        id: "functions",
        title: "Functions",
        concepts: functionsConcepts,
        conceptCount: functionsConcepts.length,
        estimatedStudyMinutes: getEstimatedStudyMinutes(functionsConcepts),
      },
    ],
  },
  {
    subject: "Math",
    slug: "calculus",
    title: "Calculus",
    description: "Calculus concepts.",
    introduction: "Calculus concepts.",
    accent: "teal",
    conceptCount: calculusConcepts.length,
    estimatedStudyMinutes: getEstimatedStudyMinutes(calculusConcepts),
    sourceTopics: ["Calculus"],
    subtopics: [],
    concepts: calculusConcepts,
    featuredConcepts: calculusConcepts,
    starterTracks: [mathTrack],
    recommendedStarterTracks: [mathTrack],
    relatedTopics: [],
    groups: [
      {
        id: "calculus",
        title: "Calculus",
        concepts: calculusConcepts,
        conceptCount: calculusConcepts.length,
        estimatedStudyMinutes: getEstimatedStudyMinutes(calculusConcepts),
      },
    ],
  },
];

const subjectSummaries: SubjectDiscoverySummary[] = [
  {
    slug: "physics",
    title: "Physics",
    description: "Physics concepts.",
    introduction: "Physics concepts.",
    accent: "sky",
    path: "/concepts/subjects/physics",
    conceptCount: conceptCatalog.filter((concept) => concept.subject === "Physics").length,
    topicCount: 2,
    starterTrackCount: 1,
    bridgeTrackCount: 0,
    estimatedStudyMinutes: getEstimatedStudyMinutes(
      conceptCatalog.filter((concept) => concept.subject === "Physics"),
    ),
    concepts: conceptCatalog.filter((concept) => concept.subject === "Physics"),
    featuredConcepts: mechanicsConcepts,
    topics: topicSummaries.filter((topic) => topic.subject === "Physics"),
    featuredTopics: topicSummaries.filter((topic) => topic.subject === "Physics"),
    starterTracks: [guidedTrack],
    featuredStarterTracks: [guidedTrack],
    bridgeStarterTracks: [],
  },
  {
    slug: "math",
    title: "Math",
    description: "Math concepts.",
    introduction: "Math concepts.",
    accent: "amber",
    path: "/concepts/subjects/math",
    conceptCount: conceptCatalog.filter((concept) => concept.subject === "Math").length,
    topicCount: 2,
    starterTrackCount: 1,
    bridgeTrackCount: 0,
    estimatedStudyMinutes: getEstimatedStudyMinutes(
      conceptCatalog.filter((concept) => concept.subject === "Math"),
    ),
    concepts: conceptCatalog.filter((concept) => concept.subject === "Math"),
    featuredConcepts: functionsConcepts,
    topics: topicSummaries.filter((topic) => topic.subject === "Math"),
    featuredTopics: topicSummaries.filter((topic) => topic.subject === "Math"),
    starterTracks: [mathTrack],
    featuredStarterTracks: [mathTrack],
    bridgeStarterTracks: [],
  },
];

const baseProps = {
  concepts: conceptCatalog,
  starterTracks,
  subjects: subjectSummaries,
  topics: topicSummaries,
} as const;

describe("ConceptLibraryBrowser", () => {
  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    navigationState.searchParams = new URLSearchParams();
    navigationState.replace.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("filters by search, topic, and starter-track controls", async () => {
    const user = userEvent.setup();

    render(<ConceptLibraryBrowser {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText(
        /search concepts, subjects, topics, tracks, tags, or ideas/i,
      ),
      "trajectory",
    );
    expect(screen.getAllByText("Projectile Motion").length).toBeGreaterThan(0);
    expect(screen.queryByText("Vectors and Components")).not.toBeInTheDocument();

    await user.clear(
      screen.getByPlaceholderText(
        /search concepts, subjects, topics, tracks, tags, or ideas/i,
      ),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /subject filter/i }),
      "math",
    );

    expect(screen.getAllByText("Graph Transformations").length).toBeGreaterThan(0);
    expect(screen.queryByText("Vectors and Components")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /reset all/i })[0]);
    await user.click(screen.getAllByText(/more filters/i)[0]);
    await user.selectOptions(
      screen.getByRole("combobox", { name: /more filters filter/i }),
      "motion-and-circular-motion",
    );

    expect(screen.getAllByText("Uniform Circular Motion").length).toBeGreaterThan(0);
  });

  it("hydrates canonical subject slug state from the URL", () => {
    navigationState.searchParams = new URLSearchParams("subject=math&sort=title");

    render(<ConceptLibraryBrowser {...baseProps} />);

    expect(screen.getAllByText(/showing: Math \| Title/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Graph Transformations").length).toBeGreaterThan(0);
    expect(screen.queryByText("Vectors and Components")).not.toBeInTheDocument();
  });

  it("adds subject jump links in the default grouped library view", () => {
    render(<ConceptLibraryBrowser {...baseProps} />);

    expect(screen.getByText("Jump within the library")).toBeInTheDocument();
    expect(screen.getByText("Go straight to the subject branch you want.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /physics4 concepts/i }),
    ).toHaveAttribute("href", "#concept-library-subject-physics");
    expect(
      screen.getByRole("link", { name: /math2 concepts/i }),
    ).toHaveAttribute("href", "#concept-library-subject-math");
  });

  it("shows focused clear actions while filters still return matching concepts", async () => {
    const user = userEvent.setup();

    render(<ConceptLibraryBrowser {...baseProps} />);

    await user.type(
      screen.getByPlaceholderText(
        /search concepts, subjects, topics, tracks, tags, or ideas/i,
      ),
      "trajectory",
    );

    expect(screen.getAllByRole("button", { name: /clear search/i }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /clear search/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Vectors and Components").length).toBeGreaterThan(0);
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /subject filter/i }),
      "math",
    );

    expect(
      screen.getAllByRole("button", { name: /reset subject and topic/i }).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /reset subject and topic/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Vectors and Components").length).toBeGreaterThan(0);
    });
  });

  it("writes canonical subject slugs back into the URL", async () => {
    const user = userEvent.setup();

    render(
      <ConceptLibraryBrowser
        {...baseProps}
        quickStartConcept={conceptCatalog[3]}
        guidedTrack={guidedTrack}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /subject filter/i }),
      "math",
    );

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenLastCalledWith(
        "/concepts?subject=math",
        { scroll: false },
      );
    });
  });

  it("keeps track filters visible when they hydrate from the URL", () => {
    navigationState.searchParams = new URLSearchParams("track=functions-and-change");

    render(<ConceptLibraryBrowser {...baseProps} />);

    expect(screen.getByRole("combobox", { name: /more filters filter/i })).toHaveValue(
      "functions-and-change",
    );
    expect(
      screen.getAllByText(getStarterTrackDisplayTitle(mathTrack, "en")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Graph Transformations").length).toBeGreaterThan(0);
    expect(screen.queryByText("Vectors and Components")).not.toBeInTheDocument();
  });

  it("turns saved progress into continue and next-step recommendations", () => {
    recordConceptVisit({
      id: "concept-vectors-components",
      slug: "vectors-components",
      title: "Vectors and Components",
    });

    render(
      <ConceptLibraryBrowser
        {...baseProps}
        quickStartConcept={conceptCatalog[3]}
        guidedTrack={guidedTrack}
      />,
    );

    expect(screen.getByRole("link", { name: /continue concept/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
    expect(screen.getByRole("link", { name: /open next concept/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion",
    );
  });

  it("renders synced progress cues and focused reset actions for empty states", async () => {
    const syncedSnapshot = createEmptyProgressSnapshot();
    syncedSnapshot.concepts["simple-harmonic-motion"] = {
      conceptId: "concept-shm",
      slug: "simple-harmonic-motion",
      firstVisitedAt: "2026-03-29T13:37:27.815Z",
      lastVisitedAt: "2026-03-29T13:53:35.346Z",
      lastInteractedAt: "2026-03-29T13:52:38.767Z",
    };

    const user = userEvent.setup();

    render(
      <ConceptLibraryBrowser
        {...baseProps}
        quickStartConcept={conceptCatalog[3]}
        guidedTrack={guidedTrack}
        initialSyncedSnapshot={syncedSnapshot}
      />,
    );

    expect(screen.getAllByText(/saved progress/i).length).toBeGreaterThan(0);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /subject filter/i }),
      "math",
    );
    await user.type(
      screen.getByRole("textbox", { name: /search concepts/i }),
      "velocity",
    );

    expect(screen.getByText(/no concepts match/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /clear search/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /reset subject and topic/i }).length).toBeGreaterThan(0);
  });

  it("renders localized library chrome in zh-HK while keeping canonical filters stable", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    navigationState.searchParams = new URLSearchParams("subject=math");
    const mathSubject = subjectSummaries.find((subject) => subject.slug === "math");

    if (!mathSubject) {
      throw new Error("Expected math subject in test summaries");
    }

    render(<ConceptLibraryBrowser {...baseProps} />);

    expect(screen.getByText(zhHkMessages.ConceptLibrary.hero.title)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        zhHkMessages.ConceptLibrary.hero.searchInsideSubject.replace(
          "{subject}",
          getSubjectDisplayTitle(mathSubject, "zh-HK"),
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(getConceptDisplayTitle(conceptCatalog[4], "zh-HK")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(getConceptDisplayTitle(conceptCatalog[0], "zh-HK")),
    ).not.toBeInTheDocument();
  });
});
