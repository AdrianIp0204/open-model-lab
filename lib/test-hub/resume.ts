import type { AssessmentSessionMatch } from "@/lib/assessment-sessions";
import type { TestHubProgressState } from "./progress";

export type TestHubAssessmentActionKind =
  | "resume"
  | "continue"
  | "retake"
  | "start"
  | "open";

export type AssessmentDisplayStateKind =
  | "loading"
  | "resume"
  | "started"
  | "completed"
  | "not-started";

export function resolveAssessmentDisplayState(input: {
  progress: TestHubProgressState;
  resumeMatch: AssessmentSessionMatch | null;
  ready: boolean;
}) {
  if (!input.ready) {
    return "loading" satisfies AssessmentDisplayStateKind;
  }

  if (input.progress.status === "completed") {
    return "completed" satisfies AssessmentDisplayStateKind;
  }

  if (input.resumeMatch?.status === "resume") {
    return "resume" satisfies AssessmentDisplayStateKind;
  }

  if (input.progress.hasStartedAssessmentWithoutCompletion) {
    return "started" satisfies AssessmentDisplayStateKind;
  }

  return "not-started" satisfies AssessmentDisplayStateKind;
}

export function resolveTestHubAssessmentActionKind(input: {
  progress: TestHubProgressState;
  resumeMatch: AssessmentSessionMatch | null;
  ready: boolean;
}) {
  if (!input.ready) {
    return "open" satisfies TestHubAssessmentActionKind;
  }

  if (input.resumeMatch?.status === "resume") {
    return "resume" satisfies TestHubAssessmentActionKind;
  }

  if (input.progress.hasStartedAssessmentWithoutCompletion) {
    return "continue" satisfies TestHubAssessmentActionKind;
  }

  if (input.progress.status === "completed") {
    return "retake" satisfies TestHubAssessmentActionKind;
  }

  return "start" satisfies TestHubAssessmentActionKind;
}

export function sortSuggestionsForResumePriority<T extends { progress: TestHubProgressState }>(
  suggestions: T[],
  getResumeMatch: (suggestion: T) => AssessmentSessionMatch | null,
) {
  return [...suggestions].sort((left, right) => {
    const leftResume = getResumeMatch(left)?.status === "resume" ? 1 : 0;
    const rightResume = getResumeMatch(right)?.status === "resume" ? 1 : 0;

    if (leftResume !== rightResume) {
      return rightResume - leftResume;
    }

    return 0;
  });
}
