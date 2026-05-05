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

const aiControlValueSchema = z.union([z.number(), z.string(), z.boolean()]);

export const aiLearningContextSchema: z.ZodType<AiLearningContext> = z.strictObject({
  userId: z.string().min(1).optional(),
  language: aiLanguageSchema,
  page: z.strictObject({
    slug: z.string().min(1),
    title: z.string().min(1),
    subject: aiSubjectSchema,
    level: aiLevelSchema,
    learningObjectives: z.array(z.string().min(1)),
    keyIdeas: z.array(z.string().min(1)),
    formulas: z.array(z.string().min(1)).optional(),
    prerequisites: z.array(z.string().min(1)).optional(),
  }),
  simulation: z
    .strictObject({
      id: z.string().min(1),
      controls: z.record(z.string(), aiControlValueSchema),
      currentState: z.record(z.string(), z.unknown()),
      graphState: z.record(z.string(), z.unknown()).optional(),
      selectedMode: z.enum(["explore", "compare", "challenge", "prediction"]).optional(),
    })
    .optional(),
  learningFlow: z
    .strictObject({
      currentStepId: z.string().min(1).optional(),
      completedSteps: z.array(z.string().min(1)),
      quizAttempts: z
        .array(
          z.strictObject({
            questionId: z.string().min(1),
            correct: z.boolean(),
            selectedAnswer: z.string().min(1),
            misconceptionTag: z.string().min(1).optional(),
          }),
        )
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
  label: z.string().trim().min(1),
});

export const aiCoachResponseSchema: z.ZodType<AiCoachResponse> = z.strictObject({
  action: z.string().trim().min(1),
  observe: z.string().trim().min(1),
  question: z.string().trim().min(1),
  safetyNote: z.string().trim().min(1).optional(),
  citations: z.array(aiCoachCitationSchema).min(1),
});
