"use client";

import { useCallback, useState } from "react";
import type {
  AiCoachMode,
  AiCoachRequest,
  AiCoachResponse,
  AiLearningContext,
} from "@/lib/ai/types";

type AiCoachErrorState = {
  code?: string;
  requestId?: string;
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
            requestId?: string;
          } | null;

          setResponse(null);
          setError({
            code: body?.code,
            requestId: body?.requestId,
          });
          return;
        }

        const nextResponse = (await result.json()) as AiCoachResponse;
        setResponse(nextResponse);
      } catch {
        setResponse(null);
        setError({
          code: "network_error",
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
