import { aiCoachResponseSchema } from "./schema";
import type { AiCoachResponse } from "./types";

export const aiCoachFallbackResponse: AiCoachResponse = {
  action: "Try changing one control in the simulation while keeping the others fixed.",
  observe: "Watch which value or graph changes first.",
  question: "What do you think caused that change?",
  safetyNote:
    "The AI response could not be validated, so this safe fallback was used.",
  citations: [{ type: "page", label: "current concept page" }],
};

export type AiCoachParseResult =
  | {
      ok: true;
      response: AiCoachResponse;
    }
  | {
      ok: false;
      reason: string;
    };

function stripFencedJson(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedMatch?.[1]?.trim() ?? trimmed;
}

function extractJsonObject(raw: string) {
  const unfenced = stripFencedJson(raw);

  if (unfenced.startsWith("{") && unfenced.endsWith("}")) {
    return unfenced;
  }

  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return unfenced.slice(firstBrace, lastBrace + 1);
  }

  return unfenced;
}

export function parseAiCoachResponseText(raw: string): AiCoachResponse {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as unknown;

  return aiCoachResponseSchema.parse(parsed);
}

export function safeParseAiCoachResponseText(raw: string): AiCoachParseResult {
  try {
    return {
      ok: true,
      response: parseAiCoachResponseText(raw),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "AI response parse failed.",
    };
  }
}

export function parseAiCoachResponseOrFallback(raw: string): {
  response: AiCoachResponse;
  fallbackUsed: boolean;
  failureReason?: string;
} {
  const parsed = safeParseAiCoachResponseText(raw);

  if (parsed.ok) {
    return {
      response: parsed.response,
      fallbackUsed: false,
    };
  }

  return {
    response: aiCoachFallbackResponse,
    fallbackUsed: true,
    failureReason: parsed.reason,
  };
}
