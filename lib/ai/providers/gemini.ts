import "server-only";

import { checkAiCoachGrounding } from "../grounding";
import {
  aiCoachFallbackResponse,
  safeParseAiCoachResponseText,
} from "../response";
import { buildAiCoachPrompt, aiCoachResponseJsonSchema } from "../prompt";
import type { AiCoachRequest, AiCoachResponse } from "../types";

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
  failureReason?: string;
  attempts: number;
};

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

function fallbackResult(reason: string, attempts: number): GeminiCoachGenerationResult {
  return {
    response: aiCoachFallbackResponse,
    fallbackUsed: true,
    failureReason: reason,
    attempts,
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
    return fallbackResult("Gemini API key is not configured.", 0);
  }

  const model = getConfiguredGeminiModel();
  let lastFailureReason = "Gemini response could not be validated.";
  let attempts = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt;

    try {
      const prompt = buildAiCoachPrompt(request, { stricter: attempt > 1 });
      const payload = await callGemini(prompt, apiKey, model);
      const text = extractGeminiText(payload);

      if (!text) {
        lastFailureReason = "Gemini returned an empty response.";
        continue;
      }

      const parsed = safeParseAiCoachResponseText(text);

      if (!parsed.ok) {
        lastFailureReason = parsed.reason;
        continue;
      }

      const grounding = checkAiCoachGrounding({
        request,
        response: parsed.response,
      });

      if (!grounding.ok) {
        lastFailureReason = grounding.reason;
        continue;
      }

      return {
        response: parsed.response,
        fallbackUsed: false,
        attempts: attempt,
      };
    } catch (error) {
      lastFailureReason =
        error instanceof Error ? error.message : "Gemini request failed.";

      if (isRetryableGeminiError(error) && attempt < 2) {
        continue;
      }

      return fallbackResult(lastFailureReason, attempt);
    }
  }

  return fallbackResult(lastFailureReason, attempts);
}

export async function generateCoachResponseWithGemini(
  request: AiCoachRequest,
): Promise<AiCoachResponse> {
  const result = await generateCoachResponseWithGeminiResult(request);

  return result.response;
}
