import type { AiCoachMode, AiCoachRequest, AiLearningContext } from "./types";

const modeInstructions: Record<AiCoachMode, string> = {
  guide:
    "Tell the learner what to try first or next. Prefer manipulating one simulation control. Ask a prediction-style question.",
  hint:
    "Give a hint without revealing the answer. Ask the learner to test it.",
  explain:
    "Explain what the current state shows using page facts and simulation state. Still include a follow-up question.",
  ask:
    "Ask a conceptual or prediction question. Do not answer it yet.",
  "next-step":
    "Recommend the next page, simulation, or quiz step if the context supports it. Otherwise recommend the next simulation interaction.",
};

export function stripPersonalDataFromAiContext(
  context: AiLearningContext,
): AiLearningContext {
  const safeContext: AiLearningContext = { ...context };

  delete safeContext.userId;
  return safeContext;
}

export function buildAiCoachPrompt(
  request: AiCoachRequest,
  options: { stricter?: boolean } = {},
) {
  const safeContext = stripPersonalDataFromAiContext(request.context);
  const strictRetryInstruction = options.stricter
    ? "\nThis is a retry after validation failed. Use only exact formulas, control keys, and citation labels present in the supplied context."
    : "";

  return [
    "You are a page-aware learning coach for Open Model Lab.",
    "You are not a general chatbot.",
    "Use only the supplied context.",
    "Do not invent facts, formulas, simulation controls, values, graph names, page content, or external claims.",
    "Do not solve the whole task immediately.",
    "Give exactly one concrete action, one thing to observe, and one follow-up question.",
    "Keep the response short.",
    "Use the learner's selected language: en, zh-HK, zh-TW, or auto.",
    "Return valid JSON only.",
    "No markdown.",
    "No extra commentary outside JSON.",
    "No long explanations.",
    "No unsupported claims.",
    "No generic textbook lecture.",
    strictRetryInstruction,
    "",
    `Mode: ${request.mode}`,
    `Mode instructions: ${modeInstructions[request.mode]}`,
    "",
    "Output shape:",
    JSON.stringify(
      {
        action: "One concrete simulation or page action.",
        observe: "One thing to watch or notice.",
        question: "One learner-facing question.",
        citations: [
          {
            type: "page",
            label: "Specific page idea or learning objective",
          },
        ],
      },
      null,
      2,
    ),
    "",
    "Supplied context:",
    JSON.stringify(safeContext, null, 2),
  ].join("\n");
}

export const aiCoachResponseJsonSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      description: "One concrete simulation or page action.",
    },
    observe: {
      type: "string",
      description: "One thing the learner should watch or notice.",
    },
    question: {
      type: "string",
      description: "One learner-facing follow-up question.",
    },
    safetyNote: {
      type: "string",
      description: "Optional short safety note when a fallback or limitation applies.",
    },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["page", "simulation", "formula", "learning-flow"],
          },
          label: {
            type: "string",
          },
        },
        required: ["type", "label"],
      },
    },
  },
  required: ["action", "observe", "question", "citations"],
} as const;
