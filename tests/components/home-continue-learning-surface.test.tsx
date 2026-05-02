// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeContinueLearningSurface } from "@/components/progress/HomeContinueLearningSurface";
import type { ConceptSummary } from "@/components/concepts/concept-catalog";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  buildConceptEntryAssessmentSessionDescriptor,
  saveAssessmentSession,
} from "@/lib/assessment-sessions";
import {
  getConceptBySlug,
  getStarterTrackBySlug,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import zhHkMessages from "@/messages/zh-HK.json";
import {
  buildSavedContinueLearningState,
  PROGRESS_STORAGE_KEY,
  localConceptProgressStore,
  markConceptCompleted,
  recordChallengeCompleted,
  recordConceptVisit,
} from "@/lib/progress";
import { buildConceptQuizSession } from "@/lib/quiz";
import { getPublishedConceptTestEntryBySlug } from "@/lib/test-hub";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

const starterTracks = [getStarterTrackBySlug("motion-and-circular-motion")];
const electromagnetismStarterTracks = [
  getStarterTrackBySlug("electricity"),
  getStarterTrackBySlug("magnetic-fields"),
];
const topicSummaries = getTopicDiscoverySummaries();

const concepts: ConceptSummary[] = [
  {
    id: "concept-vectors-components",
    slug: "vectors-components",
    title: "Vectors and Components",
    shortTitle: "Vectors",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "Intro",
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
    summary: "Follow a launch through space and graphs.",
    accent: "coral",
    highlights: ["Trajectory"],
    tags: ["trajectory", "kinematics"],
    prerequisites: ["vectors-components"],
  },
  {
    id: "concept-uniform-circular-motion",
    slug: "uniform-circular-motion",
    title: "Uniform Circular Motion",
    shortTitle: "UCM",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "Intro",
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
    summary: "Watch one oscillator repeat cleanly.",
    accent: "teal",
    highlights: ["Amplitude"],
    heroConcept: true,
    tags: ["oscillation"],
  },
];

const electromagnetismConcepts: ConceptSummary[] = [
  {
    id: "concept-magnetic-fields",
    slug: "magnetic-fields",
    title: "Magnetic Fields",
    shortTitle: "B-Fields",
    subject: "Physics",
    topic: "Electromagnetism",
    difficulty: "Intro",
    summary: "Read the circular field pattern around current-carrying wires.",
    accent: "teal",
    highlights: ["B-field patterns"],
    tags: ["magnetic", "field"],
  },
];

describe("HomeContinueLearningSurface", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    vi.unstubAllGlobals();
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    fetchMock.mockReset();
    useAccountSessionMock.mockReset();
  });

  it("surfaces resume, current-track, and next-recommended actions from local progress", () => {
    recordConceptVisit({
      id: "concept-vectors-components",
      slug: "vectors-components",
      title: "Vectors and Components",
    });

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /resume saved work or take the next bounded step/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("home-primary-concept-cta-vectors-components")).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
    expect(screen.getByTestId("home-primary-test-cta-vectors-components")).toHaveTextContent(
      "Take test",
    );
    expect(screen.getByTestId("home-primary-test-cta-vectors-components")).toHaveAttribute(
      "href",
      "/tests/concepts/vectors-components",
    );
    expect(
      within(screen.getByRole("link", { name: "Vectors and Components" })).getByTestId(
        "learning-visual",
      ),
    ).toHaveAttribute("data-visual-motif", "vectors-components");
    expect(screen.getByRole("link", { name: /continue with vectors/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
    expect(screen.getByRole("link", { name: /continue track/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion",
    );
    expect(screen.getByRole("link", { name: /open next concept/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion",
    );
    expect(screen.getByText(/builds on this from vectors and components/i)).toBeInTheDocument();
  });

  it("surfaces quick-test review follow-up with the current shared label copy", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(screen.getByText(/^quick test$/i)).toBeInTheDocument();
    expect(screen.getByTestId("home-follow-up-primary-action-projectile-motion")).toHaveAttribute(
      "href",
      "/concepts/projectile-motion#quick-test",
    );
    expect(
      screen.getAllByText(/quick test has ended with missed questions 2 times in a row/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/recovery path/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /review vectors/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
  });

  it("shows a resume-aware standalone test CTA on the primary concept card", async () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
            quickTestStartedAt: "2026-03-27T10:05:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();
    const entry = getPublishedConceptTestEntryBySlug("vectors-components");

    if (!entry) {
      throw new Error("Expected vectors-components concept test entry");
    }

    const concept = getConceptBySlug("vectors-components");
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const wrongChoice = session.questions[0]!.choices.find(
      (choice) => choice.id !== session.questions[0]!.correctChoiceId,
    )!;

    saveAssessmentSession(
      buildConceptEntryAssessmentSessionDescriptor(entry, "en"),
      {
        session: {
          attemptId: session.attemptId,
          seed: session.seed,
          questions: session.questions,
        },
        flow: {
          attemptNumber: 0,
          stage: "question",
          roundId: "initial",
          roundQuestionIds: session.questions.map((question) => question.instanceId),
          questionIndex: 0,
          selectedChoiceId: wrongChoice.id,
          appliedQuestionId: null,
          roundAnswers: {
            [session.questions[0]!.instanceId]: wrongChoice.id,
          },
          initialMissedIds: [],
          finalIncorrectCount: 0,
          trackedCanonicalQuestionIds: [session.questions[0]!.canonicalQuestionId],
        },
      },
    );

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(screen.getByTestId("home-primary-test-cta-vectors-components")).toHaveTextContent(
      "Resume test",
    );
  });

  it("keeps a bounded follow-up card available when wave interference still needs another pass", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            manualCompletedAt: "2026-03-27T09:00:00.000Z",
            lastVisitedAt: "2026-03-27T09:05:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={[
          ...concepts,
          {
            id: "concept-wave-interference",
            slug: "wave-interference",
            title: "Wave Interference",
            shortTitle: "Interference",
            subject: "Physics",
            topic: "Oscillations",
            difficulty: "Intro",
            summary: "See constructive and destructive overlap in one shared wave picture.",
            accent: "sky",
            highlights: ["Path difference"],
            tags: ["interference"],
          },
        ]}
        starterTracks={[starterTracks[0], getStarterTrackBySlug("waves")]}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(screen.getByRole("link", { name: /review concept/i })).toHaveAttribute(
      "href",
      "/concepts/wave-interference",
    );
    expect(screen.getByRole("link", { name: /open track recap/i })).toHaveAttribute(
      "href",
      "/tracks/waves?mode=recap",
    );
  });

  it("renders synced continue-learning state before local progress is present", () => {
    const syncedState = buildSavedContinueLearningState(
      {
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
        },
      },
      {
        concepts,
        starterTracks,
        computedAt: "2026-03-27T10:05:00.000Z",
      },
    );

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
        initialSyncedContinueLearningState={syncedState}
      />,
    );

    expect(screen.getAllByText("Synced").length).toBeGreaterThan(0);
    expect(screen.getByTestId("home-primary-concept-cta-vectors-components")).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
    expect(screen.getByRole("link", { name: /continue with vectors/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
    expect(screen.getAllByText("Last active Mar 27").length).toBeGreaterThan(0);
  });

  it("does not reuse the synced primary concept as a duplicate follow-up card", () => {
    const syncedSnapshot = {
      version: 1 as const,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-03-27T10:00:00.000Z",
          lastVisitedAt: "2026-03-27T10:05:00.000Z",
          completedQuickTestAt: "2026-03-27T10:06:00.000Z",
          quickTestAttemptCount: 2,
          quickTestLastIncorrectCount: 2,
          quickTestMissStreak: 2,
          quickTestLastMissedAt: "2026-03-27T10:06:00.000Z",
        },
      },
    };
    const syncedState = buildSavedContinueLearningState(syncedSnapshot, {
      concepts,
      starterTracks,
      computedAt: "2026-03-27T10:07:00.000Z",
    });

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
        initialSyncedContinueLearningState={syncedState}
        initialSyncedSnapshot={syncedSnapshot}
      />,
    );

    expect(screen.getByTestId("home-primary-concept-cta-projectile-motion")).toHaveAttribute(
      "href",
      "/concepts/projectile-motion",
    );
    expect(screen.queryByText(/quick-test follow-up/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /retry quick test/i })).not.toBeInTheDocument();
  });

  it("uses a merged browser-plus-account snapshot when local progress already exists", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            firstVisitedAt: "2026-03-27T10:20:00.000Z",
            lastVisitedAt: "2026-03-27T10:25:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "vectors-components": {
              conceptId: "concept-vectors-components",
              slug: "vectors-components",
              manualCompletedAt: "2026-03-27T10:00:00.000Z",
            },
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              manualCompletedAt: "2026-03-27T10:10:00.000Z",
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/2 of 5 moments complete/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open checkpoint/i })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        ),
    ).toBe(true);
  });

  it("falls back to direct-start concept and starter-track entry before any progress exists", () => {
    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(screen.getByTestId("home-first-visit-concept-cta-simple-harmonic-motion")).toHaveAttribute(
      "href",
      "/concepts/simple-harmonic-motion",
    );
    expect(screen.getByRole("link", { name: /start motion and circular motion/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion",
    );
  });

  it("prefers the authored hero track for first-visit fallback guidance when one is present", () => {
    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={[
          getStarterTrackBySlug("motion-and-circular-motion"),
          getStarterTrackBySlug("gravity-and-orbits"),
        ]}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(screen.getByRole("link", { name: /start gravity and orbits/i })).toHaveAttribute(
      "href",
      "/tracks/gravity-and-orbits",
    );
  });

  it("sends completed current tracks to the completion page", () => {
    markConceptCompleted({
      id: "concept-vectors-components",
      slug: "vectors-components",
      title: "Vectors and Components",
    });
    markConceptCompleted({
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });
    markConceptCompleted({
      id: "concept-uniform-circular-motion",
      slug: "uniform-circular-motion",
      title: "Uniform Circular Motion",
    });
    recordChallengeCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      "pm-ch-flat-far-shot",
    );
    recordChallengeCompleted(
      {
        id: "concept-uniform-circular-motion",
        slug: "uniform-circular-motion",
        title: "Uniform Circular Motion",
      },
      "ucm-ch-match-period-change-pull",
    );

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(screen.getByRole("link", { name: /open completion page/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion/complete",
    );
    expect(screen.getByRole("link", { name: /open recap/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion?mode=recap",
    );
    expect(document.body.textContent).not.toContain("cleared.Uniform");
    expect(document.body.textContent).toContain(
      "2 checkpoints cleared. Use the completion page",
    );
  });

  it("adds actionable prerequisite-track guidance when local progress is already in an advanced branch", () => {
    recordConceptVisit({
      id: "concept-magnetic-fields",
      slug: "magnetic-fields",
      title: "Magnetic Fields",
    });

    render(
      <HomeContinueLearningSurface
        concepts={electromagnetismConcepts}
        starterTracks={electromagnetismStarterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={electromagnetismConcepts[0]}
      />,
    );

    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open recommended track/i })).toHaveAttribute(
      "href",
      "/tracks/electricity",
    );
  });

  it("can add a saved compare setup recovery action to the follow-up card when no catalog remediation path is stronger", async () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "saved-compare-1",
            conceptSlug: "compare-practice",
            name: "Baseline vs variant",
            updatedAt: "2026-03-27T12:00:00.000Z",
            setupALabel: "Baseline",
            setupBLabel: "Variant",
            href: "/concepts/compare-practice?state=v1.saved&experiment=v1.saved#live-bench",
          },
        ],
      }),
    });
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
          "compare-practice": {
            conceptId: "concept-compare-practice",
            slug: "compare-practice",
            manualCompletedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={[
          concepts[0],
          {
            id: "concept-compare-practice",
            slug: "compare-practice",
            title: "Compare Practice",
            shortTitle: "Compare Practice",
            subject: "Physics",
            topic: "Mechanics",
            difficulty: "Intro",
            summary: "Use compare mode to test one bench against another.",
            accent: "teal",
            highlights: ["Compare mode"],
            tags: ["compare"],
          },
        ]}
        starterTracks={[]}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[0]}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/saved compare setup/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("link", { name: /open saved setup/i })).toHaveAttribute(
      "href",
      "/concepts/compare-practice?state=v1.saved&experiment=v1.saved#live-bench",
    );
  });

  it("shows sign-in and pricing paths for signed-out continue-learning sessions", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[0]}
      />,
    );

    expect(screen.getByText("Advanced review stays bounded")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.getByRole("link", { name: /sign in for sync/i })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows one premium study-power notice for signed-in free accounts", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[0]}
      />,
    );

    expect(screen.getByText(/free browsing still keeps the core progress flow/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.queryByRole("link", { name: /sign in for sync/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders zh-HK progress follow-up copy without leaking English quick-test prose", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <HomeContinueLearningSurface
        concepts={concepts}
        starterTracks={starterTracks}
        topicSummaries={topicSummaries}
        quickStartConcept={concepts[3]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: zhHkMessages.HomeContinueLearning.heading.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("home-primary-test-cta-vectors-components"),
    ).toHaveTextContent("開始測驗");
    expect(
      screen.getByText(zhHkMessages.ProgressCopy.reviewReasons.missedChecks),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: zhHkMessages.ProgressCopy.actions.retryQuickTest }),
    ).toHaveAttribute("href", "/zh-HK/concepts/projectile-motion#quick-test");
    expect(screen.queryByText(/quick test has ended with missed questions/i)).not.toBeInTheDocument();
  });
});
