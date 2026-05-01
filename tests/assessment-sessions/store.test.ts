// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  ASSESSMENT_SESSION_STORAGE_KEY,
  buildAssessmentSessionStorageEntryKey,
  clearAssessmentSession,
  createEmptyAssessmentSessionStoreSnapshot,
  getPersistedAssessmentSessionMatch,
  localAssessmentSessionStore,
  normalizeAssessmentSessionStoreSnapshot,
  resetAssessmentSessionStoreForTests,
  saveAssessmentSession,
  type AssessmentSessionDescriptor,
  type PersistedQuizRunnerFlowState,
  type PersistedQuizRunnerSession,
} from "@/lib/assessment-sessions";
import { getConceptBySlug } from "@/lib/content";
import { buildConceptQuizSession } from "@/lib/quiz";

const descriptor: AssessmentSessionDescriptor = {
  kind: "concept",
  assessmentId: "basic-circuits",
  locale: "en",
  routeHref: "/tests/concepts/basic-circuits",
  definitionKey: "definition:v1",
  title: "Basic Circuits",
};

const persistedSession: PersistedQuizRunnerSession = {
  attemptId: "attempt:test",
  seed: "basic-circuits:en:quiz-attempt:1",
  questions: [
    {
      instanceId: "question-1",
      canonicalQuestionId: "question-1",
      kind: "static",
      type: "reasoning",
      prompt: "What happens next?",
      choices: [
        { id: "a", label: "Choice A" },
        { id: "b", label: "Choice B" },
      ],
      correctChoiceId: "a",
      explanation: "Because A is correct.",
      formattedCorrectAnswer: "Choice A",
    },
  ],
};

const persistedFlow: PersistedQuizRunnerFlowState = {
  attemptNumber: 0,
  stage: "question",
  roundId: "initial",
  roundQuestionIds: ["question-1"],
  questionIndex: 0,
  selectedChoiceId: "b",
  appliedQuestionId: null,
  roundAnswers: {
    "question-1": "b",
  },
  initialMissedIds: [],
  finalIncorrectCount: 0,
  trackedCanonicalQuestionIds: ["question-1"],
};

describe("assessment session store", () => {
  afterEach(() => {
    window.localStorage.clear();
    resetAssessmentSessionStoreForTests();
  });

  it("serializes and restores an exact persisted assessment session", () => {
    saveAssessmentSession(descriptor, {
      session: persistedSession,
      flow: persistedFlow,
    });
    resetAssessmentSessionStoreForTests();

    const snapshot = localAssessmentSessionStore.getSnapshot();
    const match = getPersistedAssessmentSessionMatch(snapshot, descriptor);

    expect(match).toMatchObject({
      status: "resume",
      record: {
        routeHref: descriptor.routeHref,
        session: {
          attemptId: persistedSession.attemptId,
        },
        flow: {
          selectedChoiceId: "b",
          roundAnswers: {
            "question-1": "b",
          },
        },
      },
    });
  });

  it("round-trips a real generated concept session through local storage", () => {
    const concept = getConceptBySlug("escape-velocity");
    const realDescriptor: AssessmentSessionDescriptor = {
      kind: "concept",
      assessmentId: concept.slug,
      locale: "en",
      routeHref: `/tests/concepts/${concept.slug}`,
      definitionKey: "real-definition",
      title: concept.title,
    };
    const realSession = buildConceptQuizSession(concept, {
      seed: `${concept.slug}:en:quiz-attempt:1`,
      locale: "en",
    });

    saveAssessmentSession(realDescriptor, {
      session: {
        attemptId: realSession.attemptId,
        seed: realSession.seed,
        questions: realSession.questions,
      },
      flow: {
        attemptNumber: 0,
        stage: "question",
        roundId: "initial",
        roundQuestionIds: realSession.questions.map((question) => question.instanceId),
        questionIndex: 0,
        selectedChoiceId: realSession.questions[0]!.choices[0]!.id,
        appliedQuestionId: null,
        roundAnswers: {
          [realSession.questions[0]!.instanceId]: realSession.questions[0]!.choices[0]!.id,
        },
        initialMissedIds: [],
        finalIncorrectCount: 0,
        trackedCanonicalQuestionIds: [realSession.questions[0]!.canonicalQuestionId],
      },
    });

    resetAssessmentSessionStoreForTests();

    const snapshot = localAssessmentSessionStore.getSnapshot();
    const restored = snapshot.sessions[buildAssessmentSessionStorageEntryKey(realDescriptor)];

    expect(restored).toBeDefined();
    expect(restored?.session.questions.length).toBe(realSession.questions.length);
  });

  it("invalidates stale session snapshots when the version or definition no longer matches", () => {
    const staleSnapshot = {
      version: 1,
      sessions: {
        [buildAssessmentSessionStorageEntryKey(descriptor)]: {
          version: 1,
          kind: "concept",
          assessmentId: "basic-circuits",
          locale: "en",
          routeHref: "/tests/concepts/basic-circuits",
          definitionKey: "definition:stale",
          title: "Basic Circuits",
          createdAt: "2026-04-18T09:00:00.000Z",
          updatedAt: "2026-04-18T09:05:00.000Z",
          session: persistedSession,
          flow: persistedFlow,
        },
      },
    };

    window.localStorage.setItem(ASSESSMENT_SESSION_STORAGE_KEY, JSON.stringify(staleSnapshot));
    resetAssessmentSessionStoreForTests();

    const snapshot = localAssessmentSessionStore.getSnapshot();
    const match = getPersistedAssessmentSessionMatch(snapshot, descriptor);

    expect(match.status).toBe("stale");
  });

  it("drops malformed round/question references during normalization", () => {
    const malformedSnapshot = {
      version: 1,
      sessions: {
        [buildAssessmentSessionStorageEntryKey(descriptor)]: {
          version: 1,
          kind: "concept",
          assessmentId: "basic-circuits",
          locale: "en",
          routeHref: "/tests/concepts/basic-circuits",
          definitionKey: descriptor.definitionKey,
          title: "Basic Circuits",
          createdAt: "2026-04-18T09:00:00.000Z",
          updatedAt: "2026-04-18T09:05:00.000Z",
          session: persistedSession,
          flow: {
            ...persistedFlow,
            roundQuestionIds: ["missing-question"],
          },
        },
      },
    };

    const normalized = normalizeAssessmentSessionStoreSnapshot(malformedSnapshot);
    const match = getPersistedAssessmentSessionMatch(normalized, descriptor);

    expect(match.status).toBe("stale");
  });

  it("clears completed or restarted sessions cleanly", () => {
    saveAssessmentSession(descriptor, {
      session: persistedSession,
      flow: persistedFlow,
    });

    clearAssessmentSession(descriptor);

    const snapshot = localAssessmentSessionStore.getSnapshot();
    expect(snapshot.sessions).toEqual({});
  });

  it("returns an empty snapshot when local storage is missing or invalid", () => {
    window.localStorage.setItem(ASSESSMENT_SESSION_STORAGE_KEY, "{not-json");
    resetAssessmentSessionStoreForTests();

    expect(localAssessmentSessionStore.getSnapshot()).toEqual(
      createEmptyAssessmentSessionStoreSnapshot(),
    );
  });
});
