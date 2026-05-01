import { describe, expect, it } from "vitest";
import { resolveTestHubAssessmentActionKind, sortSuggestionsForResumePriority } from "@/lib/test-hub";
import type { TestHubProgressState, TestHubSuggestion } from "@/lib/test-hub";
import type { AssessmentSessionMatch } from "@/lib/assessment-sessions";

const baseProgress: TestHubProgressState = {
  status: "not-started",
  latestResult: null,
  latestIncorrectCount: null,
  attempts: 0,
  startedAt: null,
  completedAt: null,
  hasConceptActivityWithoutFinishedTest: false,
  hasStartedAssessmentWithoutCompletion: false,
};

function buildSuggestion(input: {
  id: string;
  progress: TestHubProgressState;
}): TestHubSuggestion {
  return {
    id: input.id,
    kind: "concept",
    entry: {
      kind: "concept",
      id: input.id,
      order: 0,
      conceptId: input.id,
      conceptSlug: input.id,
      title: input.id,
      summary: input.id,
      subject: "Physics",
      topic: "Mechanics",
      difficulty: "Intro",
      questionCount: 5,
      testHref: `/tests/concepts/${input.id}`,
      reviewHref: `/concepts/${input.id}#interactive-lab`,
    },
    progress: input.progress,
    reasonKind: "recent-test-activity",
  };
}

describe("test hub resume affordances", () => {
  it("prefers exact resume over generic continue for started assessments", () => {
    const progress: TestHubProgressState = {
      ...baseProgress,
      startedAt: "2026-04-18T08:00:00.000Z",
      hasStartedAssessmentWithoutCompletion: true,
    };
    const resumeMatch: AssessmentSessionMatch = {
      status: "resume",
      record: {
        version: 1,
        kind: "concept",
        assessmentId: "basic-circuits",
        locale: "en",
        routeHref: "/tests/concepts/basic-circuits",
        definitionKey: "definition:v1",
        title: "Basic Circuits",
        createdAt: "2026-04-18T08:00:00.000Z",
        updatedAt: "2026-04-18T08:05:00.000Z",
        session: {
          attemptId: "attempt",
          seed: "seed",
          questions: [],
        },
        flow: {
          attemptNumber: 0,
          stage: "question",
          roundId: "initial",
          roundQuestionIds: [],
          questionIndex: 0,
          selectedChoiceId: null,
          appliedQuestionId: null,
          roundAnswers: {},
          initialMissedIds: [],
          finalIncorrectCount: 0,
          trackedCanonicalQuestionIds: [],
        },
      },
    };

    expect(
      resolveTestHubAssessmentActionKind({
        progress,
        resumeMatch,
        ready: true,
      }),
    ).toBe("resume");
  });

  it("falls back to continue when started progress exists without an exact session", () => {
    expect(
      resolveTestHubAssessmentActionKind({
        progress: {
          ...baseProgress,
          startedAt: "2026-04-18T08:00:00.000Z",
          hasStartedAssessmentWithoutCompletion: true,
        },
        resumeMatch: { status: "none" },
        ready: true,
      }),
    ).toBe("continue");
  });

  it("does not treat completed sessions as resumable", () => {
    expect(
      resolveTestHubAssessmentActionKind({
        progress: {
          ...baseProgress,
          status: "completed",
          completedAt: "2026-04-18T08:10:00.000Z",
          latestResult: "clean",
          attempts: 1,
        },
        resumeMatch: { status: "none" },
        ready: true,
      }),
    ).toBe("retake");
  });

  it("prioritizes suggestions with exact resume sessions over other suggestions", () => {
    const started = buildSuggestion({
      id: "started",
      progress: {
        ...baseProgress,
        hasStartedAssessmentWithoutCompletion: true,
        startedAt: "2026-04-18T08:00:00.000Z",
      },
    });
    const resumable = buildSuggestion({
      id: "resumable",
      progress: {
        ...baseProgress,
        hasStartedAssessmentWithoutCompletion: true,
        startedAt: "2026-04-18T07:00:00.000Z",
      },
    });

    const ordered = sortSuggestionsForResumePriority([started, resumable], (suggestion) =>
      suggestion.id === "resumable"
        ? ({
            status: "resume",
            record: {
              version: 1,
              kind: "concept",
              assessmentId: "resumable",
              locale: "en",
              routeHref: "/tests/concepts/resumable",
              definitionKey: "definition:v1",
              title: "Resumable",
              createdAt: "2026-04-18T07:00:00.000Z",
              updatedAt: "2026-04-18T07:05:00.000Z",
              session: {
                attemptId: "attempt",
                seed: "seed",
                questions: [],
              },
              flow: {
                attemptNumber: 0,
                stage: "question",
                roundId: "initial",
                roundQuestionIds: [],
                questionIndex: 0,
                selectedChoiceId: null,
                appliedQuestionId: null,
                roundAnswers: {},
                initialMissedIds: [],
                finalIncorrectCount: 0,
                trackedCanonicalQuestionIds: [],
              },
            },
          } satisfies AssessmentSessionMatch)
        : ({ status: "none" } satisfies AssessmentSessionMatch),
    );

    expect(ordered[0]?.id).toBe("resumable");
  });
});
