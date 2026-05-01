import { z } from "zod";
import type { QuizQuestionInstance, QuizRoundId } from "@/lib/quiz";

export const ASSESSMENT_SESSION_STORAGE_KEY = "open-model-lab.assessment-sessions.v1";
export const ASSESSMENT_SESSION_STORAGE_VERSION = 1;

export type AssessmentSessionKind = "concept" | "topic" | "pack";
export type AssessmentSessionLocale = "en" | "zh-HK";
export type AssessmentSessionStage = "question" | "round-summary";

export type AssessmentSessionDescriptor = {
  kind: AssessmentSessionKind;
  assessmentId: string;
  locale: AssessmentSessionLocale;
  routeHref: string;
  definitionKey: string;
  title: string;
};

export type PersistedQuizRunnerSession = {
  attemptId: string;
  seed: string;
  questions: QuizQuestionInstance[];
};

export type PersistedQuizRunnerFlowState = {
  attemptNumber: number;
  stage: AssessmentSessionStage;
  roundId: QuizRoundId;
  roundQuestionIds: string[];
  questionIndex: number;
  selectedChoiceId: string | null;
  appliedQuestionId: string | null;
  roundAnswers: Record<string, string>;
  initialMissedIds: string[];
  finalIncorrectCount: number;
  trackedCanonicalQuestionIds: string[];
};

export type PersistedAssessmentSessionRecord = {
  version: typeof ASSESSMENT_SESSION_STORAGE_VERSION;
  kind: AssessmentSessionKind;
  assessmentId: string;
  locale: AssessmentSessionLocale;
  routeHref: string;
  definitionKey: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  session: PersistedQuizRunnerSession;
  flow: PersistedQuizRunnerFlowState;
};

export type PersistedAssessmentSessionStoreSnapshot = {
  version: typeof ASSESSMENT_SESSION_STORAGE_VERSION;
  sessions: Record<string, PersistedAssessmentSessionRecord>;
};

export type AssessmentSessionMatch =
  | { status: "none" }
  | { status: "stale"; record: PersistedAssessmentSessionRecord }
  | { status: "resume"; record: PersistedAssessmentSessionRecord };

const quizChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
}).passthrough();

const quizGivenSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  symbol: z.string().min(1).optional(),
  value: z.string().min(1),
  unit: z.string().min(1).optional(),
}).passthrough();

const questionParameterSnapshotSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  time: z.number(),
  activePresetId: z.string().min(1).nullable(),
  answerSource: z.enum(["result", "variable"]),
  answerVariableId: z.string().min(1).nullable().optional(),
  note: z.string().nullable().optional(),
}).passthrough();

const quizQuestionInstanceSchema = z.object({
  instanceId: z.string().min(1),
  canonicalQuestionId: z.string().min(1),
  kind: z.enum(["static", "generated"]),
  type: z.string().min(1),
  prompt: z.string().min(1),
  givens: z.array(quizGivenSchema).optional(),
  choices: z.array(quizChoiceSchema).min(2),
  correctChoiceId: z.string().min(1),
  explanation: z.string().min(1),
  formattedCorrectAnswer: z.string().min(1),
  showMeAction: z.unknown().optional(),
  selectedWrongExplanations: z.record(z.string(), z.string().min(1)).optional(),
  templateId: z.string().min(1).optional(),
  parameterSnapshot: questionParameterSnapshotSchema.optional(),
  generationSource: z.string().min(1).optional(),
  isParameterized: z.boolean().optional(),
}).passthrough();

const persistedQuizRunnerSessionSchema = z.object({
  attemptId: z.string().min(1),
  seed: z.string().min(1),
  questions: z.array(quizQuestionInstanceSchema).min(1),
}).passthrough();

const persistedQuizRunnerFlowStateSchema = z.object({
  attemptNumber: z.number().int().min(0),
  stage: z.enum(["question", "round-summary"]),
  roundId: z.enum(["initial", "retry"]),
  roundQuestionIds: z.array(z.string().min(1)),
  questionIndex: z.number().int().min(0),
  selectedChoiceId: z.string().min(1).nullable(),
  appliedQuestionId: z.string().min(1).nullable(),
  roundAnswers: z.record(z.string(), z.string()),
  initialMissedIds: z.array(z.string().min(1)),
  finalIncorrectCount: z.number().int().min(0),
  trackedCanonicalQuestionIds: z.array(z.string().min(1)),
}).passthrough();

const persistedAssessmentSessionRecordSchema = z.object({
  version: z.literal(ASSESSMENT_SESSION_STORAGE_VERSION),
  kind: z.enum(["concept", "topic", "pack"]),
  assessmentId: z.string().min(1),
  locale: z.enum(["en", "zh-HK"]),
  routeHref: z.string().min(1),
  definitionKey: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  session: persistedQuizRunnerSessionSchema,
  flow: persistedQuizRunnerFlowStateSchema,
}).passthrough();

const persistedAssessmentSessionStoreSnapshotSchema = z.object({
  version: z.literal(ASSESSMENT_SESSION_STORAGE_VERSION),
  sessions: z.record(z.string(), persistedAssessmentSessionRecordSchema),
}).passthrough();

export function buildAssessmentSessionStorageEntryKey(
  descriptor: Pick<AssessmentSessionDescriptor, "kind" | "assessmentId" | "locale">,
) {
  return `${descriptor.kind}:${descriptor.locale}:${descriptor.assessmentId}`;
}

export function createEmptyAssessmentSessionStoreSnapshot(): PersistedAssessmentSessionStoreSnapshot {
  return {
    version: ASSESSMENT_SESSION_STORAGE_VERSION,
    sessions: {},
  };
}

export function normalizeAssessmentSessionStoreSnapshot(
  value: unknown,
): PersistedAssessmentSessionStoreSnapshot {
  const parsed = persistedAssessmentSessionStoreSnapshotSchema.safeParse(value);

  if (!parsed.success) {
    return createEmptyAssessmentSessionStoreSnapshot();
  }

  return parsed.data as PersistedAssessmentSessionStoreSnapshot;
}

export function getPersistedAssessmentSessionMatch(
  snapshot: PersistedAssessmentSessionStoreSnapshot,
  descriptor: AssessmentSessionDescriptor,
): AssessmentSessionMatch {
  const key = buildAssessmentSessionStorageEntryKey(descriptor);
  const record = snapshot.sessions[key];

  if (!record) {
    return { status: "none" };
  }

  if (
    record.version !== ASSESSMENT_SESSION_STORAGE_VERSION ||
    record.definitionKey !== descriptor.definitionKey ||
    record.routeHref !== descriptor.routeHref
  ) {
    return {
      status: "stale",
      record,
    };
  }

  const sessionQuestionIds = new Set(record.session.questions.map((question) => question.instanceId));
  const hasInvalidRoundQuestionId = record.flow.roundQuestionIds.some(
    (questionId) => !sessionQuestionIds.has(questionId),
  );
  const hasInvalidQuestionIndex =
    record.flow.questionIndex < 0 ||
    record.flow.questionIndex >= record.flow.roundQuestionIds.length;

  if (hasInvalidRoundQuestionId || hasInvalidQuestionIndex) {
    return {
      status: "stale",
      record,
    };
  }

  return {
    status: "resume",
    record,
  };
}
