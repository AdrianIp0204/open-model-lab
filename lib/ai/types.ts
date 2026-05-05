export type AiLearningContext = {
  userId?: string;
  language: "en" | "zh-HK" | "zh-TW" | "auto";
  page: {
    slug: string;
    title: string;
    subject: "physics" | "chemistry" | "math" | "biology";
    level: "beginner" | "intermediate" | "advanced";
    learningObjectives: string[];
    keyIdeas: string[];
    formulas?: string[];
    prerequisites?: string[];
  };
  simulation?: {
    id: string;
    controls: Record<string, number | string | boolean>;
    currentState: Record<string, unknown>;
    graphState?: Record<string, unknown>;
    selectedMode?: "explore" | "compare" | "challenge" | "prediction";
  };
  learningFlow?: {
    currentStepId?: string;
    completedSteps: string[];
    quizAttempts?: Array<{
      questionId: string;
      correct: boolean;
      selectedAnswer: string;
      misconceptionTag?: string;
    }>;
  };
};

export type AiCoachMode =
  | "guide"
  | "hint"
  | "explain"
  | "ask"
  | "next-step";

export type AiCoachRequest = {
  mode: AiCoachMode;
  context: AiLearningContext;
};

export type AiCoachCitation = {
  type: "page" | "simulation" | "formula" | "learning-flow";
  label: string;
};

export type AiCoachResponse = {
  action: string;
  observe: string;
  question: string;
  safetyNote?: string;
  citations: AiCoachCitation[];
};

export type AiTokenUsage = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
  estimated?: boolean;
};
