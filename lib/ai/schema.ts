import { z } from "zod";
import type {
  AiCoachCitation,
  AiCoachRequest,
  AiCoachResponse,
  AiLearningContext,
} from "./types";

export const aiLanguageSchema = z.enum(["en", "zh-HK", "zh-TW", "auto"]);
export const aiSubjectSchema = z.enum(["physics", "chemistry", "math", "biology"]);
export const aiLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const aiCoachModeSchema = z.enum([
  "guide",
  "hint",
  "explain",
  "ask",
  "next-step",
]);
export const aiCoachCitationTypeSchema = z.enum([
  "page",
  "simulation",
  "formula",
  "learning-flow",
]);

const MAX_AI_SHORT_TEXT_LENGTH = 160;
const MAX_AI_MEDIUM_TEXT_LENGTH = 320;
const MAX_AI_LONG_TEXT_LENGTH = 800;
const MAX_AI_OBJECTIVES = 12;
const MAX_AI_KEY_IDEAS = 16;
const MAX_AI_FORMULAS = 16;
const MAX_AI_PREREQUISITES = 12;
const MAX_AI_COMPLETED_STEPS = 40;
const MAX_AI_QUIZ_ATTEMPTS = 20;
const MAX_AI_CITATIONS = 6;
const MAX_AI_RECORD_KEYS = 40;
const MAX_AI_RECORD_JSON_LENGTH = 6_000;
export const MAX_AI_COACH_REQUEST_BYTES = 64_000;

const aiShortTextSchema = z.string().trim().min(1).max(MAX_AI_SHORT_TEXT_LENGTH);
const aiMediumTextSchema = z.string().trim().min(1).max(MAX_AI_MEDIUM_TEXT_LENGTH);
const aiLongTextSchema = z.string().trim().min(1).max(MAX_AI_LONG_TEXT_LENGTH);

const aiControlValueSchema = z.union([
  z.number(),
  z.string().max(MAX_AI_MEDIUM_TEXT_LENGTH),
  z.boolean(),
]);

function safeJsonLength(value: unknown) {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function boundedAiRecordSchema<T extends z.ZodTypeAny>(
  valueSchema: T,
  label: string,
) {
  return z
    .record(z.string().min(1).max(MAX_AI_SHORT_TEXT_LENGTH), valueSchema)
    .superRefine((value, context) => {
      if (Object.keys(value).length > MAX_AI_RECORD_KEYS) {
        context.addIssue({
          code: "custom",
          message: `${label} has too many keys.`,
        });
      }

      if (safeJsonLength(value) > MAX_AI_RECORD_JSON_LENGTH) {
        context.addIssue({
          code: "custom",
          message: `${label} is too large.`,
        });
      }
    });
}

export const aiLearningContextSchema: z.ZodType<AiLearningContext> = z.strictObject({
  userId: aiShortTextSchema.optional(),
  language: aiLanguageSchema,
  page: z.strictObject({
    slug: aiShortTextSchema,
    title: aiMediumTextSchema,
    subject: aiSubjectSchema,
    level: aiLevelSchema,
    learningObjectives: z.array(aiLongTextSchema).min(1).max(MAX_AI_OBJECTIVES),
    keyIdeas: z.array(aiLongTextSchema).min(1).max(MAX_AI_KEY_IDEAS),
    formulas: z.array(aiMediumTextSchema).max(MAX_AI_FORMULAS).optional(),
    prerequisites: z.array(aiMediumTextSchema).max(MAX_AI_PREREQUISITES).optional(),
  }),
  simulation: z
    .strictObject({
      id: aiShortTextSchema,
      controls: boundedAiRecordSchema(aiControlValueSchema, "simulation.controls"),
      currentState: boundedAiRecordSchema(z.unknown(), "simulation.currentState"),
      graphState: boundedAiRecordSchema(z.unknown(), "simulation.graphState").optional(),
      selectedMode: z.enum(["explore", "compare", "challenge", "prediction"]).optional(),
    })
    .optional(),
  learningFlow: z
    .strictObject({
      currentStepId: aiShortTextSchema.optional(),
      completedSteps: z.array(aiShortTextSchema).max(MAX_AI_COMPLETED_STEPS),
      quizAttempts: z
        .array(
          z.strictObject({
            questionId: aiShortTextSchema,
            correct: z.boolean(),
            selectedAnswer: aiMediumTextSchema,
            misconceptionTag: aiMediumTextSchema.optional(),
          }),
        )
        .max(MAX_AI_QUIZ_ATTEMPTS)
        .optional(),
    })
    .optional(),
});

export const aiCoachRequestSchema: z.ZodType<AiCoachRequest> = z.strictObject({
  mode: aiCoachModeSchema,
  context: aiLearningContextSchema,
});

export const aiCoachCitationSchema: z.ZodType<AiCoachCitation> = z.strictObject({
  type: aiCoachCitationTypeSchema,
  label: aiMediumTextSchema,
});

export const aiCoachResponseSchema: z.ZodType<AiCoachResponse> = z.strictObject({
  action: aiLongTextSchema,
  observe: aiLongTextSchema,
  question: aiLongTextSchema,
  safetyNote: aiLongTextSchema.optional(),
  citations: z.array(aiCoachCitationSchema).min(1).max(MAX_AI_CITATIONS),
});
