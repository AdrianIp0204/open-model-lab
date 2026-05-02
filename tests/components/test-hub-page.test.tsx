// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildConceptEntryAssessmentSessionDescriptor,
  buildPackAssessmentSessionDescriptor,
  buildTopicAssessmentSessionDescriptor,
  resetAssessmentSessionStoreForTests,
  saveAssessmentSession,
} from "@/lib/assessment-sessions";
import type { PersistedQuizRunnerFlowState, PersistedQuizRunnerSession } from "@/lib/assessment-sessions";
import { TestHubPage } from "@/components/tests/TestHubPage";
import {
  localConceptProgressStore,
  recordPackTestStarted,
  PROGRESS_STORAGE_KEY,
  recordConceptVisit,
  recordPackTestCompleted,
  recordQuickTestCompleted,
  recordQuickTestStarted,
  recordTopicTestStarted,
  recordTopicTestCompleted,
} from "@/lib/progress";
import type {
  ConceptTestCatalogEntry,
  PackTestCatalogEntry,
  TopicTestCatalogEntry,
} from "@/lib/test-hub";
import {
  buildPackTestSession,
  buildTopicTestSession,
  getPublishedConceptTestCatalog,
} from "@/lib/test-hub";

const packEntries: PackTestCatalogEntry[] = [
  {
    kind: "pack",
    id: "pack-test:physics-connected-models",
    order: 0,
    packSlug: "physics-connected-models",
    subjectSlug: "physics",
    subjectTitle: "Physics",
    title: "Physics Connections Pack",
    summary: "Connect motion, oscillation, wave behavior, and orbital reasoning across one compact physics assessment.",
    questionCount: 16,
    includedTopicSlugs: ["mechanics", "oscillations", "waves", "gravity-and-orbits"],
    includedTopicTitles: ["Mechanics", "Oscillations", "Waves", "Gravity and Orbits"],
    includedTopicCount: 4,
    includedConceptSlugs: [
      "vectors-components",
      "simple-harmonic-motion",
      "wave-speed-wavelength",
      "gravitational-fields",
    ],
    includedConceptCount: 4,
    bridgeQuestionCount: 2,
    testHref: "/tests/packs/physics-connected-models",
    reviewHref: "/concepts/subjects/physics",
  },
];

const conceptEntries: ConceptTestCatalogEntry[] = [
  {
    kind: "concept",
    id: "concept-test:simple-harmonic-motion",
    order: 0,
    conceptId: "concept-shm",
    conceptSlug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    shortTitle: "SHM",
    summary: "Watch one oscillator repeat cleanly.",
    subject: "Physics",
    topic: "Oscillations",
    difficulty: "Intro",
    questionCount: 5,
    testHref: "/tests/concepts/simple-harmonic-motion",
    reviewHref: "/concepts/simple-harmonic-motion#interactive-lab",
  },
  {
    kind: "concept",
    id: "concept-test:sorting-and-algorithmic-trade-offs",
    order: 1,
    conceptId: "concept-sorting-and-algorithmic-trade-offs",
    conceptSlug: "sorting-and-algorithmic-trade-offs",
    title: "Sorting and Algorithmic Trade-offs",
    shortTitle: "Sorting",
    summary: "Compare multiple sorting algorithms on the same list bench.",
    subject: "Computer Science",
    topic: "Algorithms and Search",
    difficulty: "Intro",
    questionCount: 5,
    testHref: "/tests/concepts/sorting-and-algorithmic-trade-offs",
    reviewHref: "/concepts/sorting-and-algorithmic-trade-offs#interactive-lab",
  },
];

const topicEntries: TopicTestCatalogEntry[] = [
  {
    kind: "topic",
    id: "topic-test:oscillations",
    order: 0,
    topicSlug: "oscillations",
    title: "Oscillations",
    summary: "Check the main oscillator ideas across the topic branch.",
    subject: "Physics",
    questionCount: 10,
    includedConceptSlugs: [
      "simple-harmonic-motion",
      "oscillation-energy",
      "damping-resonance",
    ],
    includedConceptCount: 3,
    authoredQuestionCount: 1,
    bridgeQuestionCount: 1,
    testHref: "/tests/topics/oscillations",
    reviewHref: "/concepts/topics/oscillations",
  },
];

describe("TestHubPage", () => {
  const resetTestHubState = () => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    resetAssessmentSessionStoreForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  };

  beforeEach(resetTestHubState);
  afterEach(resetTestHubState);

  it("renders topic tests and concept tests with the correct public links", () => {
    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /pick a test and start/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cross-topic packs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Topic tests" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concept tests" })).toBeInTheDocument();
    expect(screen.getByTestId("test-hub-quick-start")).toHaveTextContent("Start here");
    expect(screen.getByTestId("test-hub-progress-strip")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("test-hub-quick-start")
        .compareDocumentPosition(screen.getByTestId("test-hub-controls")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByTestId("test-hub-card-pack-physics-connected-models")).toBeInTheDocument();
    const packVisual = within(
      screen.getByTestId("test-hub-card-pack-physics-connected-models"),
    ).getByTestId("learning-visual");
    expect(packVisual).toHaveAttribute("data-visual-kind", "test");
    expect(packVisual).toHaveAttribute("data-visual-motif", "projectile-motion");
    expect(packVisual).toHaveAttribute("data-visual-overlay", "assessment");
    expect(packVisual).toHaveAttribute("data-visual-fallback", "false");
    const packStartLink = within(
      screen.getByTestId("test-hub-card-pack-physics-connected-models"),
    ).getByRole("link", {
      name: "Start pack",
    });
    expect(packStartLink).toHaveAttribute("href", "/tests/packs/physics-connected-models");
    expect(packStartLink).toHaveAccessibleDescription("Physics Connections Pack");
    expect(
      within(screen.getByTestId("test-hub-card-pack-physics-connected-models")).getByRole("link", {
        name: "Review subject",
      }),
    ).toHaveAttribute("href", "/concepts/subjects/physics");

    expect(screen.getByTestId("test-hub-card-topic-oscillations")).toBeInTheDocument();
    const topicVisual = within(
      screen.getByTestId("test-hub-card-topic-oscillations"),
    ).getByTestId("learning-visual");
    expect(topicVisual).toHaveAttribute("data-visual-kind", "test");
    expect(topicVisual).toHaveAttribute("data-visual-motif", "simple-harmonic-motion");
    expect(topicVisual).toHaveAttribute("data-visual-overlay", "assessment");
    expect(topicVisual).toHaveAttribute("data-visual-fallback", "false");
    const topicStartLink = within(
      screen.getByTestId("test-hub-card-topic-oscillations"),
    ).getByRole("link", {
      name: "Start topic test",
    });
    expect(topicStartLink).toHaveAttribute("href", "/tests/topics/oscillations");
    expect(topicStartLink).toHaveAccessibleDescription("Oscillations");
    expect(
      within(screen.getByTestId("test-hub-card-topic-oscillations")).getByRole("link", {
        name: "Review topic",
      }),
    ).toHaveAttribute("href", "/concepts/topics/oscillations");

    expect(screen.getByTestId("test-hub-card-concept-simple-harmonic-motion")).toBeInTheDocument();
    const conceptVisual = within(
      screen.getByTestId("test-hub-card-concept-simple-harmonic-motion"),
    ).getByTestId("learning-visual");
    expect(conceptVisual).toHaveAttribute("data-visual-kind", "test");
    expect(conceptVisual).toHaveAttribute("data-visual-motif", "simple-harmonic-motion");
    expect(conceptVisual).toHaveAttribute("data-visual-overlay", "assessment");
    expect(conceptVisual).toHaveAttribute("data-visual-fallback", "false");
    expect(
      within(screen.getByTestId("test-hub-card-concept-simple-harmonic-motion")).getByRole("link", {
        name: "Simple Harmonic Motion",
      }),
    ).toHaveAttribute("href", "/tests/concepts/simple-harmonic-motion");
    const conceptStartLink = within(
      screen.getByTestId("test-hub-card-concept-simple-harmonic-motion"),
    ).getByRole("link", {
      name: "Start concept test",
    });
    expect(conceptStartLink).toHaveAttribute("href", "/tests/concepts/simple-harmonic-motion");
    expect(conceptStartLink).toHaveAccessibleDescription("Simple Harmonic Motion");
  });

  it("renders aggregate progress and representative states across topic tests and concept tests", () => {
    recordQuickTestCompleted(
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
      },
      {
        incorrectAnswers: 0,
        totalQuestions: 5,
      },
    );
    recordTopicTestCompleted("oscillations", {
      incorrectAnswers: 2,
      totalQuestions: 10,
    });
    recordPackTestCompleted("physics-connected-models", {
      incorrectAnswers: 0,
      totalQuestions: 16,
    });

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(screen.getByTestId("test-hub-total-count")).toHaveTextContent("4");
    expect(screen.getByTestId("test-hub-completed-count")).toHaveTextContent("3");
    expect(screen.getByTestId("test-hub-clean-count")).toHaveTextContent("2");
    expect(screen.getByTestId("test-hub-remaining-count")).toHaveTextContent("1");
    expect(screen.getAllByText(/perfect score on the latest run/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/latest run missed 2 questions/i).length).toBeGreaterThanOrEqual(1);
    expect(
      within(screen.getByTestId("test-hub-card-pack-physics-connected-models")).getByRole("link", {
        name: "Retake pack",
      }),
    ).toHaveAttribute("href", "/tests/packs/physics-connected-models");
    expect(
      within(screen.getByTestId("test-hub-card-topic-oscillations")).getByRole("link", {
        name: "Retake topic test",
      }),
    ).toHaveAttribute("href", "/tests/topics/oscillations");
  });

  it("filters the combined catalog by search and subject", async () => {
    const user = userEvent.setup();

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(screen.getByTestId("test-hub-filter-summary")).toHaveTextContent(
      "Showing 4 of 4 published tests.",
    );

    await user.type(screen.getByRole("textbox", { name: "Search tests" }), "connections");
    expect(screen.getByTestId("test-hub-filter-summary")).toHaveTextContent(
      "Showing 1 of 4 published tests.",
    );
    expect(screen.getByTestId("test-hub-card-pack-physics-connected-models")).toBeInTheDocument();
    expect(
      screen.queryByTestId("test-hub-card-concept-sorting-and-algorithmic-trade-offs"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-hub-card-topic-oscillations")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search tests" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Subject filter" }), "Computer Science");

    expect(screen.getByTestId("test-hub-filter-summary")).toHaveTextContent(
      "Showing 1 of 4 published tests.",
    );
    expect(
      screen.getByTestId("test-hub-card-concept-sorting-and-algorithmic-trade-offs"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("test-hub-card-topic-oscillations")).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-hub-card-pack-physics-connected-models")).not.toBeInTheDocument();
  });

  it("reveals the compact full catalog directly after the controls", async () => {
    const user = userEvent.setup();
    const manyConceptEntries = getPublishedConceptTestCatalog().entries.slice(0, 11);
    const finalEntry = manyConceptEntries.at(-1)!;

    render(
      <TestHubPage
        packEntries={[]}
        conceptEntries={manyConceptEntries}
        topicEntries={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Show full catalog (11 tests)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Concept tests" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show full catalog (11 tests)" }));

    const catalogHeading = screen.getByRole("heading", { name: "Concept tests" });
    const suggestionsHeading = screen.getByRole("heading", { name: "Suggested tests" });

    expect(
      screen.getByTestId("test-hub-controls").compareDocumentPosition(catalogHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      catalogHeading.compareDocumentPosition(suggestionsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId(`test-hub-card-concept-${finalEntry.conceptSlug}`)).toBeInTheDocument();
  });

  it("keeps topic-test and pack completion state after a reload-style remount", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {},
        topicTests: {
          oscillations: {
            slug: "oscillations",
            completedAt: "2026-04-15T09:00:00.000Z",
            attemptCount: 1,
            lastIncorrectCount: 0,
            lastQuestionCount: 10,
          },
        },
        packTests: {
          "physics-connected-models": {
            slug: "physics-connected-models",
            completedAt: "2026-04-15T10:00:00.000Z",
            attemptCount: 1,
            lastIncorrectCount: 0,
            lastQuestionCount: 16,
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    const view = render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );
    expect(screen.getAllByText(/perfect score on the latest run/i).length).toBeGreaterThanOrEqual(2);

    view.unmount();
    localConceptProgressStore.resetForTests();
    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(screen.getAllByText(/perfect score on the latest run/i).length).toBeGreaterThanOrEqual(2);
  });

  it("renders personalized suggestions with reason labels grounded in recent activity", () => {
    recordConceptVisit({
      id: "concept-sorting-and-algorithmic-trade-offs",
      slug: "sorting-and-algorithmic-trade-offs",
      title: "Sorting and Algorithmic Trade-offs",
    });
    recordTopicTestStarted("oscillations");
    recordPackTestStarted("physics-connected-models");

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(screen.getByRole("heading", { name: "Suggested tests" })).toBeInTheDocument();
    expect(
      screen.getByTestId("test-hub-suggestion-topic-oscillations"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("test-hub-suggestion-topic-oscillations")).getByText(
        /continue your in-progress test/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("test-hub-suggestion-topic-oscillations")).getByRole("link", {
        name: "Continue topic test path",
      }),
    ).toHaveAttribute("href", "/tests/topics/oscillations");
  });

  it("prefers Resume test labels when an exact resumable session exists", () => {
    recordQuickTestStarted({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    recordTopicTestStarted("oscillations");
    recordPackTestStarted("physics-connected-models");

    const conceptQuiz = conceptEntries[0]!;
    const topicQuiz = topicEntries[0]!;
    const packQuiz = packEntries[0]!;

    const conceptSessionRecord: {
      session: PersistedQuizRunnerSession;
      flow: PersistedQuizRunnerFlowState;
    } = {
      session: {
        attemptId: "concept-attempt",
        seed: "concept-seed",
        questions: [
          {
            instanceId: "concept-question-1",
            canonicalQuestionId: "concept-question-1",
            kind: "static",
            type: "reasoning",
            prompt: "Concept prompt",
            choices: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
            correctChoiceId: "a",
            explanation: "Because.",
            formattedCorrectAnswer: "A",
          },
        ],
      },
      flow: {
        attemptNumber: 0,
        stage: "question",
        roundId: "initial",
        roundQuestionIds: ["concept-question-1"],
        questionIndex: 0,
        selectedChoiceId: "b",
        appliedQuestionId: null,
        roundAnswers: { "concept-question-1": "b" },
        initialMissedIds: [],
        finalIncorrectCount: 0,
        trackedCanonicalQuestionIds: [conceptQuiz.id],
      },
    };

    saveAssessmentSession(
      buildConceptEntryAssessmentSessionDescriptor(conceptQuiz, "en"),
      conceptSessionRecord,
    );

    const builtTopicSession = buildTopicTestSession("oscillations", {
      locale: "en",
      seed: "topic-test:oscillations:en:quiz-attempt:1",
    });
    saveAssessmentSession(
      buildTopicAssessmentSessionDescriptor(topicQuiz, "en"),
      {
        session: {
          attemptId: builtTopicSession.attemptId,
          seed: builtTopicSession.seed,
          questions: builtTopicSession.questions,
        },
        flow: {
          attemptNumber: 0,
          stage: "question",
          roundId: "initial",
          roundQuestionIds: builtTopicSession.questions.map((question) => question.instanceId),
          questionIndex: 0,
          selectedChoiceId: builtTopicSession.questions[0]!.choices[1]!.id,
          appliedQuestionId: null,
          roundAnswers: {
            [builtTopicSession.questions[0]!.instanceId]:
              builtTopicSession.questions[0]!.choices[1]!.id,
          },
          initialMissedIds: [],
          finalIncorrectCount: 0,
          trackedCanonicalQuestionIds: [builtTopicSession.questions[0]!.canonicalQuestionId],
        },
      },
    );

    const builtPackSession = buildPackTestSession("physics-connected-models", {
      locale: "en",
      seed: "pack-test:physics-connected-models:en:quiz-attempt:1",
    });
    saveAssessmentSession(
      buildPackAssessmentSessionDescriptor(packQuiz, "en"),
      {
        session: {
          attemptId: builtPackSession.attemptId,
          seed: builtPackSession.seed,
          questions: builtPackSession.questions,
        },
        flow: {
          attemptNumber: 0,
          stage: "question",
          roundId: "initial",
          roundQuestionIds: builtPackSession.questions.map((question) => question.instanceId),
          questionIndex: 0,
          selectedChoiceId: builtPackSession.questions[0]!.choices[1]!.id,
          appliedQuestionId: null,
          roundAnswers: {
            [builtPackSession.questions[0]!.instanceId]:
              builtPackSession.questions[0]!.choices[1]!.id,
          },
          initialMissedIds: [],
          finalIncorrectCount: 0,
          trackedCanonicalQuestionIds: [builtPackSession.questions[0]!.canonicalQuestionId],
        },
      },
    );

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(
      within(screen.getByTestId("test-hub-card-concept-simple-harmonic-motion")).getByRole("link", {
        name: "Resume concept test",
      }),
    ).toHaveAttribute("href", "/tests/concepts/simple-harmonic-motion");
    expect(
      within(screen.getByTestId("test-hub-card-concept-simple-harmonic-motion")).getByText(
        "Saved on this device",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("test-hub-card-topic-oscillations")).getByRole("link", {
        name: "Resume topic test",
      }),
    ).toHaveAttribute("href", "/tests/topics/oscillations");
    expect(
      within(screen.getByTestId("test-hub-card-pack-physics-connected-models")).getByRole("link", {
        name: "Resume pack",
      }),
    ).toHaveAttribute("href", "/tests/packs/physics-connected-models");
    expect(
      within(screen.getByTestId("test-hub-guided-track-oscillations")).getByTestId(
        "test-hub-guided-track-next-oscillations",
      ),
    ).toHaveTextContent("Resume test");
  });

  it("keeps Resume test labels after a local-storage round trip", () => {
    const topicQuiz = topicEntries[0]!;
    recordTopicTestStarted("oscillations");

    const builtTopicSession = buildTopicTestSession("oscillations", {
      locale: "en",
      seed: "topic-test:oscillations:en:quiz-attempt:1",
    });
    saveAssessmentSession(
      buildTopicAssessmentSessionDescriptor(topicQuiz, "en"),
      {
        session: {
          attemptId: builtTopicSession.attemptId,
          seed: builtTopicSession.seed,
          questions: builtTopicSession.questions,
        },
        flow: {
          attemptNumber: 0,
          stage: "question",
          roundId: "initial",
          roundQuestionIds: builtTopicSession.questions.map((question) => question.instanceId),
          questionIndex: 0,
          selectedChoiceId: builtTopicSession.questions[0]!.choices[1]!.id,
          appliedQuestionId: null,
          roundAnswers: {
            [builtTopicSession.questions[0]!.instanceId]:
              builtTopicSession.questions[0]!.choices[1]!.id,
          },
          initialMissedIds: [],
          finalIncorrectCount: 0,
          trackedCanonicalQuestionIds: [builtTopicSession.questions[0]!.canonicalQuestionId],
        },
      },
    );

    resetAssessmentSessionStoreForTests();
    localConceptProgressStore.resetForTests();

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(
      within(screen.getByTestId("test-hub-suggestion-topic-oscillations")).getByRole("link", {
        name: "Resume topic test",
      }),
    ).toHaveAttribute("href", "/tests/topics/oscillations");
    expect(
      within(screen.getByTestId("test-hub-card-topic-oscillations")).queryByText("Not started"),
    ).not.toBeInTheDocument();
  });

  it("falls back to started-without-resume wording when only started progress exists", () => {
    recordTopicTestStarted("oscillations");

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(
      within(screen.getByTestId("test-hub-suggestion-topic-oscillations")).getByRole("link", {
        name: "Continue topic test path",
      }),
    ).toHaveAttribute("href", "/tests/topics/oscillations");
    expect(
      within(screen.getByTestId("test-hub-card-topic-oscillations")).getByText("In progress"),
    ).toBeInTheDocument();
  });

  it("renders guided tracks with a stable next item and advances the next step after completion", () => {
    const guidedConceptEntries: ConceptTestCatalogEntry[] = [
      {
        kind: "concept",
        id: "concept-test:simple-harmonic-motion",
        order: 0,
        conceptId: "concept-shm",
        conceptSlug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
        shortTitle: "SHM",
        summary: "Watch one oscillator repeat cleanly.",
        subject: "Physics",
        topic: "Oscillations",
        difficulty: "Intro",
        questionCount: 5,
        testHref: "/tests/concepts/simple-harmonic-motion",
        reviewHref: "/concepts/simple-harmonic-motion#interactive-lab",
      },
      {
        kind: "concept",
        id: "concept-test:oscillation-energy",
        order: 1,
        conceptId: "concept-oscillation-energy",
        conceptSlug: "oscillation-energy",
        title: "Oscillation Energy",
        summary: "Track how kinetic and potential energy swap through one oscillator.",
        subject: "Physics",
        topic: "Oscillations",
        difficulty: "Intro",
        questionCount: 5,
        testHref: "/tests/concepts/oscillation-energy",
        reviewHref: "/concepts/oscillation-energy#interactive-lab",
      },
      {
        kind: "concept",
        id: "concept-test:damping-resonance",
        order: 2,
        conceptId: "concept-damping-resonance",
        conceptSlug: "damping-resonance",
        title: "Damping and Resonance",
        summary: "See losses and driving frequency on the same oscillator branch.",
        subject: "Physics",
        topic: "Oscillations",
        difficulty: "Intermediate",
        questionCount: 5,
        testHref: "/tests/concepts/damping-resonance",
        reviewHref: "/concepts/damping-resonance#interactive-lab",
      },
    ];

    const view = render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={guidedConceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(screen.getByRole("heading", { name: "Guided testing tracks" })).toBeInTheDocument();
    const trackCard = screen.getByTestId("test-hub-guided-track-oscillations");
    expect(
      within(trackCard).getByTestId("test-hub-guided-track-next-oscillations"),
    ).toHaveAttribute("href", "/tests/concepts/simple-harmonic-motion");

    view.unmount();
    localConceptProgressStore.resetForTests();
    recordQuickTestCompleted(
      {
        id: "concept-shm",
        slug: "simple-harmonic-motion",
        title: "Simple Harmonic Motion",
      },
      {
        incorrectAnswers: 0,
        totalQuestions: 5,
      },
    );

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={guidedConceptEntries}
        topicEntries={topicEntries}
      />,
    );

    expect(
      within(screen.getByTestId("test-hub-guided-track-oscillations")).getByTestId(
        "test-hub-guided-track-next-oscillations",
      ),
    ).toHaveAttribute("href", "/tests/concepts/oscillation-energy");
  });

  it("leaves Test Hub entry hrefs unprefixed for the locale-aware Link", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    recordTopicTestStarted("oscillations");

    render(
      <TestHubPage
        packEntries={packEntries}
        conceptEntries={conceptEntries}
        topicEntries={topicEntries}
      />,
    );

    const conceptCardHrefs = within(
      screen.getByTestId("test-hub-card-concept-simple-harmonic-motion"),
    )
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(conceptCardHrefs).toContain("/tests/concepts/simple-harmonic-motion");
    expect(conceptCardHrefs).toContain("/concepts/simple-harmonic-motion#interactive-lab");
    expect(conceptCardHrefs).not.toContain("/zh-HK/zh-HK/tests/concepts/simple-harmonic-motion");

    const topicCardHrefs = within(screen.getByTestId("test-hub-card-topic-oscillations"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(topicCardHrefs).toContain("/tests/topics/oscillations");
    expect(topicCardHrefs).toContain("/concepts/topics/oscillations");
    expect(topicCardHrefs).not.toContain("/zh-HK/zh-HK/tests/topics/oscillations");

    const packCardHrefs = within(
      screen.getByTestId("test-hub-card-pack-physics-connected-models"),
    )
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(packCardHrefs).toContain("/tests/packs/physics-connected-models");
    expect(packCardHrefs).toContain("/concepts/subjects/physics");
    expect(packCardHrefs).not.toContain("/zh-HK/zh-HK/tests/packs/physics-connected-models");

    const suggestionHrefs = within(screen.getByTestId("test-hub-suggestion-topic-oscillations"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(suggestionHrefs).toContain("/tests/topics/oscillations");
    expect(suggestionHrefs).toContain("/concepts/topics/oscillations");
    expect(suggestionHrefs).not.toContain("/zh-HK/zh-HK/tests/topics/oscillations");

    const trackCardHrefs = within(screen.getByTestId("test-hub-guided-track-oscillations"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(trackCardHrefs).toContain("/tests/concepts/simple-harmonic-motion");
    expect(trackCardHrefs).toContain("/concepts/topics/oscillations");
    expect(trackCardHrefs).not.toContain("/zh-HK/zh-HK/tests/concepts/simple-harmonic-motion");
  });
});
