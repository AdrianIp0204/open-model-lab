export type RescuePhase = "goal" | "diagnose" | "rescue" | "drill" | "sync";

export type RescueTopicStatus = "not-started" | "red" | "yellow" | "green";

export type RescueQuestionKind = "diagnostic" | "drill";

export type ExamRescueTopic = {
  slug: string;
  title: string;
  examSkill: string;
  commonFailure: string;
  rescueMove: string;
  equations?: string[];
};

export type RescueChoice = {
  id: string;
  label: string;
  misconceptionTag?: string;
};

export type RescueQuestion = {
  id: string;
  topicSlug: string;
  kind: RescueQuestionKind;
  prompt: string;
  setup?: string;
  choices: RescueChoice[];
  correctChoiceId: string;
  markSchemeNote: string;
  wrongFeedback: Record<string, string>;
};

export type ExamRescuePlan = {
  id: string;
  title: string;
  examBoard: string;
  qualification: string;
  unitCode: string;
  unitTitle: string;
  sourceLabel: string;
  sourceUrl: string;
  learnerPromise: string;
  defaultExamDate: string;
  topics: ExamRescueTopic[];
  diagnostic: RescueQuestion[];
  drill: RescueQuestion[];
};

export type TopicState = {
  topicSlug: string;
  status: RescueTopicStatus;
  diagnosticCorrect: number;
  diagnosticTotal: number;
  drillCorrect: number;
  drillTotal: number;
  lastAttemptAt?: string;
  misconceptionTags: string[];
};

export type RescueAttempt = {
  questionId: string;
  topicSlug: string;
  phase: RescueQuestionKind;
  selectedChoiceId: string;
  correct: boolean;
  misconceptionTag?: string;
  createdAt: string;
};

export type ExamRescueProgress = {
  version: 1;
  planId: string;
  examDate: string;
  targetGrade: string;
  activePhase: RescuePhase;
  selectedTopicSlug: string;
  topicStates: Record<string, TopicState>;
  attempts: RescueAttempt[];
  updatedAt: string;
};

export const EXAM_RESCUE_PROGRESS_KEY = "oml-exam-rescue-progress.v1";

export function createTopicState(topicSlug: string): TopicState {
  return {
    topicSlug,
    status: "not-started",
    diagnosticCorrect: 0,
    diagnosticTotal: 0,
    drillCorrect: 0,
    drillTotal: 0,
    misconceptionTags: [],
  };
}

export function createInitialExamRescueProgress(plan: ExamRescuePlan): ExamRescueProgress {
  const firstTopic = plan.topics[0]?.slug ?? "";

  return {
    version: 1,
    planId: plan.id,
    examDate: plan.defaultExamDate,
    targetGrade: "A",
    activePhase: "goal",
    selectedTopicSlug: firstTopic,
    topicStates: Object.fromEntries(
      plan.topics.map((topic) => [topic.slug, createTopicState(topic.slug)]),
    ),
    attempts: [],
    updatedAt: new Date().toISOString(),
  };
}

function statusFromScore(correct: number, total: number): RescueTopicStatus {
  if (total <= 0) {
    return "not-started";
  }

  const ratio = correct / total;

  if (ratio >= 0.8) {
    return "green";
  }

  if (ratio >= 0.5) {
    return "yellow";
  }

  return "red";
}

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function applyAttemptToProgress(
  progress: ExamRescueProgress,
  question: RescueQuestion,
  selectedChoiceId: string,
): ExamRescueProgress {
  const choice = question.choices.find((item) => item.id === selectedChoiceId);
  const correct = selectedChoiceId === question.correctChoiceId;
  const now = new Date().toISOString();
  const currentTopicState = progress.topicStates[question.topicSlug] ?? createTopicState(question.topicSlug);
  const nextDiagnosticTotal =
    question.kind === "diagnostic"
      ? currentTopicState.diagnosticTotal + 1
      : currentTopicState.diagnosticTotal;
  const nextDiagnosticCorrect =
    question.kind === "diagnostic" && correct
      ? currentTopicState.diagnosticCorrect + 1
      : currentTopicState.diagnosticCorrect;
  const nextDrillTotal =
    question.kind === "drill" ? currentTopicState.drillTotal + 1 : currentTopicState.drillTotal;
  const nextDrillCorrect =
    question.kind === "drill" && correct
      ? currentTopicState.drillCorrect + 1
      : currentTopicState.drillCorrect;
  const combinedCorrect = nextDiagnosticCorrect + nextDrillCorrect;
  const combinedTotal = nextDiagnosticTotal + nextDrillTotal;
  const nextState: TopicState = {
    ...currentTopicState,
    diagnosticCorrect: nextDiagnosticCorrect,
    diagnosticTotal: nextDiagnosticTotal,
    drillCorrect: nextDrillCorrect,
    drillTotal: nextDrillTotal,
    status: statusFromScore(combinedCorrect, combinedTotal),
    lastAttemptAt: now,
    misconceptionTags: uniq([
      ...currentTopicState.misconceptionTags,
      !correct && choice?.misconceptionTag ? choice.misconceptionTag : "",
    ]),
  };

  return {
    ...progress,
    topicStates: {
      ...progress.topicStates,
      [question.topicSlug]: nextState,
    },
    attempts: [
      ...progress.attempts,
      {
        questionId: question.id,
        topicSlug: question.topicSlug,
        phase: question.kind,
        selectedChoiceId,
        correct,
        misconceptionTag: !correct ? choice?.misconceptionTag : undefined,
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function getRescueScore(progress: ExamRescueProgress) {
  const states = Object.values(progress.topicStates);
  const green = states.filter((state) => state.status === "green").length;
  const yellow = states.filter((state) => state.status === "yellow").length;
  const red = states.filter((state) => state.status === "red").length;
  const started = states.filter((state) => state.status !== "not-started").length;

  return {
    green,
    yellow,
    red,
    started,
    total: states.length,
  };
}

export function getTopicState(progress: ExamRescueProgress, topicSlug: string) {
  return progress.topicStates[topicSlug] ?? createTopicState(topicSlug);
}
