// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConceptLearningSurfaceTestCta } from "@/components/tests/ConceptLearningSurfaceTestCta";
import {
  buildConceptEntryAssessmentSessionDescriptor,
  resetAssessmentSessionStoreForTests,
  saveAssessmentSession,
} from "@/lib/assessment-sessions";
import { getConceptBySlug } from "@/lib/content";
import { localConceptProgressStore, type ProgressSnapshot } from "@/lib/progress";
import { buildConceptQuizSession } from "@/lib/quiz";
import { getPublishedConceptTestEntryBySlug } from "@/lib/test-hub";

function renderCta(snapshot: ProgressSnapshot, progressReady = true) {
  return render(
    <ConceptLearningSurfaceTestCta
      conceptSlug="basic-circuits"
      snapshot={snapshot}
      progressReady={progressReady}
      className="test-link"
      testId="learning-surface-test-cta"
    />,
  );
}

describe("ConceptLearningSurfaceTestCta", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    resetAssessmentSessionStoreForTests();
  });

  it("renders Take test for a supported concept with no saved test state", () => {
    renderCta({
      version: 1,
      concepts: {},
      topicTests: {},
      packTests: {},
    });

    expect(screen.getByTestId("learning-surface-test-cta")).toHaveTextContent("Take test");
    expect(screen.getByTestId("learning-surface-test-cta")).toHaveAttribute(
      "href",
      "/tests/concepts/basic-circuits",
    );
  });

  it("renders Continue this test path when only started-at exists", () => {
    renderCta({
      version: 1,
      concepts: {
        "basic-circuits": {
          conceptId: "concept-basic-circuits",
          slug: "basic-circuits",
          quickTestStartedAt: "2026-04-18T08:00:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    });

    expect(screen.getByTestId("learning-surface-test-cta")).toHaveTextContent(
      "Continue this test path",
    );
  });

  it("renders Resume test when an exact resumable session exists", () => {
    const entry = getPublishedConceptTestEntryBySlug("basic-circuits");

    if (!entry) {
      throw new Error("Expected published concept test entry for basic-circuits");
    }

    const concept = getConceptBySlug(entry.conceptSlug);
    const descriptor = buildConceptEntryAssessmentSessionDescriptor(entry, "en");
    const session = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });
    const wrongChoice = session.questions[0]!.choices.find(
      (choice) => choice.id !== session.questions[0]!.correctChoiceId,
    )!;

    saveAssessmentSession(descriptor, {
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
    });

    renderCta({
      version: 1,
      concepts: {
        "basic-circuits": {
          conceptId: "concept-basic-circuits",
          slug: "basic-circuits",
          quickTestStartedAt: "2026-04-18T08:00:00.000Z",
        },
      },
      topicTests: {},
      packTests: {},
    });

    expect(screen.getByTestId("learning-surface-test-cta")).toHaveTextContent("Resume test");
  });

  it("renders Retake test when the concept test is completed", () => {
    renderCta({
      version: 1,
      concepts: {
        "basic-circuits": {
          conceptId: "concept-basic-circuits",
          slug: "basic-circuits",
          completedQuickTestAt: "2026-04-18T08:00:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
      },
      topicTests: {},
      packTests: {},
    });

    expect(screen.getByTestId("learning-surface-test-cta")).toHaveTextContent("Retake test");
  });

  it("defers the CTA while progress readiness is still pending", () => {
    renderCta(
      {
        version: 1,
        concepts: {},
        topicTests: {},
        packTests: {},
      },
      false,
    );

    expect(screen.queryByTestId("learning-surface-test-cta")).not.toBeInTheDocument();
  });

  it("renders zh-HK labels while passing a raw href to the locale-aware Link", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    renderCta({
      version: 1,
      concepts: {},
      topicTests: {},
      packTests: {},
    });

    expect(screen.getByTestId("learning-surface-test-cta")).toHaveTextContent("開始測驗");
    expect(screen.getByTestId("learning-surface-test-cta")).toHaveAttribute(
      "href",
      "/tests/concepts/basic-circuits",
    );
  });
});
