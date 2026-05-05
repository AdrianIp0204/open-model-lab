import "server-only";

import { checkAiCoachGrounding } from "../grounding";
import {
  aiCoachFallbackResponse,
  safeParseAiCoachResponseText,
} from "../response";
import { buildAiCoachPrompt, aiCoachResponseJsonSchema } from "../prompt";
import type { AiCoachRequest, AiCoachResponse, AiTokenUsage } from "../types";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart = {
  text?: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GeminiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiRequestError";
    this.status = status;
  }
}

export type GeminiCoachGenerationResult = {
  response: AiCoachResponse;
  fallbackUsed: boolean;
  failureCode?: GeminiCoachFailureCode;
  failureReason?: string;
  attempts: number;
  usage?: AiTokenUsage;
};

export type GeminiCoachFailureCode =
  | "provider_unconfigured"
  | "provider_unavailable"
  | "response_validation_failed"
  | "grounding_failed";

function getConfiguredGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function buildGeminiGenerateContentUrl(model = getConfiguredGeminiModel()) {
  const trimmedModel = model.trim() || DEFAULT_GEMINI_MODEL;
  const modelPath =
    trimmedModel.startsWith("models/") || trimmedModel.startsWith("tunedModels/")
      ? trimmedModel
      : `models/${trimmedModel}`;

  return `${GEMINI_API_BASE_URL}/${modelPath}:generateContent`;
}

function extractGeminiText(payload: GeminiGenerateContentResponse) {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function readTokenCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : 0;
}

function extractGeminiUsageMetadata(
  payload: GeminiGenerateContentResponse,
): AiTokenUsage | null {
  if (!payload.usageMetadata) {
    return null;
  }

  const promptTokenCount = readTokenCount(payload.usageMetadata.promptTokenCount);
  const candidatesTokenCount = readTokenCount(payload.usageMetadata.candidatesTokenCount);
  const thoughtsTokenCount = readTokenCount(payload.usageMetadata.thoughtsTokenCount);
  const explicitTotalTokenCount = readTokenCount(payload.usageMetadata.totalTokenCount);
  const totalTokenCount =
    explicitTotalTokenCount || promptTokenCount + candidatesTokenCount + thoughtsTokenCount;

  if (totalTokenCount <= 0) {
    return null;
  }

  return {
    promptTokenCount,
    candidatesTokenCount,
    thoughtsTokenCount,
    totalTokenCount,
  };
}

function estimateTokenCountFromText(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

function estimateGeminiUsage(prompt: string, responseText: string): AiTokenUsage {
  const promptTokenCount = estimateTokenCountFromText(prompt);
  const candidatesTokenCount = responseText
    ? estimateTokenCountFromText(responseText)
    : 0;

  return {
    promptTokenCount,
    candidatesTokenCount,
    thoughtsTokenCount: 0,
    totalTokenCount: promptTokenCount + candidatesTokenCount,
    estimated: true,
  };
}

function addTokenUsage(left: AiTokenUsage | undefined, right: AiTokenUsage) {
  if (!left) {
    return { ...right };
  }

  return {
    promptTokenCount: left.promptTokenCount + right.promptTokenCount,
    candidatesTokenCount: left.candidatesTokenCount + right.candidatesTokenCount,
    thoughtsTokenCount: left.thoughtsTokenCount + right.thoughtsTokenCount,
    totalTokenCount: left.totalTokenCount + right.totalTokenCount,
    estimated: Boolean(left.estimated || right.estimated) || undefined,
  };
}

function fallbackResult(
  reason: string,
  attempts: number,
  usage?: AiTokenUsage,
  failureCode: GeminiCoachFailureCode = "provider_unavailable",
): GeminiCoachGenerationResult {
  return {
    response: aiCoachFallbackResponse,
    fallbackUsed: true,
    failureCode,
    failureReason: reason,
    attempts,
    ...(usage ? { usage } : {}),
  };
}

function isRetryableGeminiError(error: unknown) {
  if (error instanceof GeminiRequestError) {
    return (
      error.status === undefined ||
      error.status === 408 ||
      error.status === 409 ||
      error.status === 429 ||
      (error.status >= 500 && error.status <= 599)
    );
  }

  if (error instanceof SyntaxError) {
    return false;
  }

  return error instanceof Error;
}

async function callGemini(prompt: string, apiKey: string, model?: string) {
  const response = await fetch(buildGeminiGenerateContentUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      store: false,
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: aiCoachResponseJsonSchema,
      },
    }),
  });

  if (!response.ok) {
    throw new GeminiRequestError(
      `Gemini request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as GeminiGenerateContentResponse;
}

export async function generateCoachResponseWithGeminiResult(
  request: AiCoachRequest,
): Promise<GeminiCoachGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return fallbackResult(
      "Gemini API key is not configured.",
      0,
      undefined,
      "provider_unconfigured",
    );
  }

  const model = getConfiguredGeminiModel();
  let lastFailureReason = "Gemini response could not be validated.";
  let lastFailureCode: GeminiCoachFailureCode = "response_validation_failed";
  let attempts = 0;
  let accumulatedUsage: AiTokenUsage | undefined;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt;

    try {
      const prompt = buildAiCoachPrompt(request, { stricter: attempt > 1 });
      const payload = await callGemini(prompt, apiKey, model);
      const text = extractGeminiText(payload);
      const usage =
        extractGeminiUsageMetadata(payload) ?? estimateGeminiUsage(prompt, text);
      accumulatedUsage = addTokenUsage(accumulatedUsage, usage);

      if (!text) {
        lastFailureReason = "Gemini returned an empty response.";
        lastFailureCode = "response_validation_failed";
        continue;
      }

      const parsed = safeParseAiCoachResponseText(text);

      if (!parsed.ok) {
        lastFailureReason = parsed.reason;
        lastFailureCode = "response_validation_failed";
        continue;
      }

      const grounding = checkAiCoachGrounding({
        request,
        response: parsed.response,
      });

      if (!grounding.ok) {
        lastFailureReason = grounding.reason;
        lastFailureCode = "grounding_failed";
        continue;
      }

      return {
        response: parsed.response,
        fallbackUsed: false,
        attempts: attempt,
        usage: accumulatedUsage,
      };
    } catch (error) {
      lastFailureReason =
        error instanceof Error ? error.message : "Gemini request failed.";
      lastFailureCode = "provider_unavailable";

      if (isRetryableGeminiError(error) && attempt < 2) {
        continue;
      }

      return fallbackResult(
        lastFailureReason,
        attempt,
        accumulatedUsage,
        lastFailureCode,
      );
    }
  }

  return fallbackResult(
    lastFailureReason,
    attempts,
    accumulatedUsage,
    lastFailureCode,
  );
}

export async function generateCoachResponseWithGemini(
  request: AiCoachRequest,
): Promise<AiCoachResponse> {
  const result = await generateCoachResponseWithGeminiResult(request);

  return result.response;
}
