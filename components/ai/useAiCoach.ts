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

function getAiCoachErrorMessage(code: string | undefined) {
  switch (code) {
    case "ai_features_disabled":
      return "The AI coach is not enabled for this deployment.";
    case "ai_auth_required":
      return "Sign in with a Supporter account to use the AI coach.";
    case "ai_premium_required":
      return "AI Coach is a Supporter feature because model calls have real API cost.";
    case "ai_monthly_quota_exceeded":
      return "This account has reached the monthly AI Coach limit.";
    case "rate_limited":
      return "The AI coach needs a short break before another request.";
    default:
      return "The AI coach is unavailable right now.";
  }
}

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
          const message = getAiCoachErrorMessage(code);

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
