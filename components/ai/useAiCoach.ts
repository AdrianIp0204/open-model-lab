"use client";

import { useCallback, useState } from "react";
import type {
  AiCoachMode,
  AiCoachRequest,
  AiCoachResponse,
  AiLearningContext,
} from "@/lib/ai/types";

type AiCoachErrorState = {
  message: string;
  code?: string;
};

export function useAiCoach() {
  const [response, setResponse] = useState<AiCoachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AiCoachErrorState | null>(null);

  const requestCoach = useCallback(
    async (mode: AiCoachMode, context: AiLearningContext) => {
      const payload: AiCoachRequest = { mode, context };

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetch("/api/ai/coach", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!result.ok) {
          const body = (await result.json().catch(() => null)) as {
            code?: string;
            error?: string;
          } | null;
          const code = body?.code;
          const message =
            code === "ai_features_disabled"
              ? "The AI coach is not enabled for this deployment."
              : code === "rate_limited"
                ? "The AI coach needs a short break before another request."
                : "The AI coach is unavailable right now.";

          setResponse(null);
          setError({ message, code });
          return;
        }

        const nextResponse = (await result.json()) as AiCoachResponse;
        setResponse(nextResponse);
      } catch {
        setResponse(null);
        setError({
          message: "The AI coach is unavailable right now.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    response,
    isLoading,
    error,
    requestCoach,
    reset,
  };
}
