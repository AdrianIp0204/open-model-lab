import type {
  ConceptContent,
  ConceptQuickTestQuestion,
  ConceptQuickTestQuestionType,
  ConceptQuickTestShowMeAction,
  ConceptWorkedExample,
} from "@/lib/content";

export type ConceptQuizMode = "static" | "generated" | "hybrid";

export type ConceptQuizQuestionType =
  | ConceptQuickTestQuestionType
  | "calculation"
  | "worked-example";

export type QuizChoice = {
  id: string;
  label: string;
};

export type QuizGiven = {
  id: string;
  label: string;
  symbol?: string;
  value: string;
  unit?: string;
};

export type QuizParameterSnapshot = {
  params: Record<string, string | number | boolean>;
  time: number;
  activePresetId: string | null;
  answerSource: "result" | "variable";
  answerVariableId?: string;
  note?: string;
};

export type QuizGenerationSource =
  | "explicit-template"
  | "derived-worked-example"
  | "built-in-exact-angle"
  | "fallback-misconception";

export type StaticQuizQuestionDefinition = {
  kind: "static";
  id: string;
  canonicalQuestionId: string;
  type: ConceptQuizQuestionType;
  prompt: string;
  choices: QuizChoice[];
  correctChoiceId: string;
  explanation: string;
  showMeAction?: ConceptQuickTestShowMeAction;
  selectedWrongExplanations?: Record<string, string>;
};

export type WorkedExampleResultQuizTemplateDefinition = {
  kind: "worked-example-result";
  id: string;
  exampleId: string;
  questionType: Extract<ConceptQuizQuestionType, "calculation" | "worked-example">;
};

export type ExactAngleRadiansQuizTemplateDefinition = {
  kind: "exact-angle-radians";
  id: string;
  questionType: Extract<ConceptQuizQuestionType, "calculation">;
};

export type MisconceptionCheckQuizTemplateDefinition = {
  kind: "misconception-check";
  id: string;
  questionType: Extract<ConceptQuizQuestionType, "worked-example" | "reasoning">;
};

export type AuthoredGeneratedQuizTemplateDefinition =
  | WorkedExampleResultQuizTemplateDefinition
  | ExactAngleRadiansQuizTemplateDefinition;

export type GeneratedQuizQuestionTemplateDefinition = (
  | WorkedExampleResultQuizTemplateDefinition
  | ExactAngleRadiansQuizTemplateDefinition
  | MisconceptionCheckQuizTemplateDefinition
) & {
  canonicalTemplateId: string;
  origin: QuizGenerationSource;
  isParameterized: boolean;
};

export type ConceptQuizDefinition = {
  conceptId: ConceptContent["id"];
  conceptSlug: ConceptContent["slug"];
  mode: ConceptQuizMode;
  questionCount: number;
  staticQuestions: StaticQuizQuestionDefinition[];
  templates: GeneratedQuizQuestionTemplateDefinition[];
};

export type QuizCanonicalQuestionDescriptor = {
  canonicalQuestionId: string;
  versionSource:
    | StaticQuizQuestionDefinition
    | {
        template: GeneratedQuizQuestionTemplateDefinition;
        slotIndex: number;
      };
};

export type QuizQuestionInstance = {
  instanceId: string;
  canonicalQuestionId: string;
  kind: "static" | "generated";
  type: ConceptQuizQuestionType;
  prompt: string;
  givens?: QuizGiven[];
  choices: QuizChoice[];
  correctChoiceId: string;
  explanation: string;
  formattedCorrectAnswer: string;
  showMeAction?: ConceptQuickTestShowMeAction;
  selectedWrongExplanations?: Record<string, string>;
  templateId?: string;
  parameterSnapshot?: QuizParameterSnapshot;
  generationSource?: QuizGenerationSource;
  isParameterized?: boolean;
};

export type ConceptQuizSession = {
  attemptId: string;
  seed: string;
  definition: ConceptQuizDefinition;
  questions: QuizQuestionInstance[];
};

export type QuizQuestionAttemptRecord = {
  canonicalQuestionId: string;
  instanceId: string;
  choiceId: string;
  isCorrect: boolean;
};

export type QuizRoundId = "initial" | "retry";

export type QuizRoundOutcome = {
  roundId: QuizRoundId;
  answers: QuizQuestionAttemptRecord[];
  missedInstanceIds: string[];
};

export type QuizInstantiationOptions = {
  locale?: "en" | "zh-HK";
  seed: string;
};

export type QuizWorkedExampleResolution = {
  example: ConceptWorkedExample;
  prompt: string;
  steps: Array<{ id: string; label: string; content: string }>;
  resultLabel: string;
  resultContent: string;
  interpretation?: string;
  variableValues: Record<string, string>;
};

export type QuickTestQuestionAuthoring = ConceptQuickTestQuestion;
