"use client";

import { useCallback, useRef, useState } from "react";
import {
  describeAccountAchievementRequestError,
  submitAccountAchievementEvent,
} from "./client";
import type {
  AccountAchievementEvent,
  AchievementToastSummary,
} from "./types";

const ACHIEVEMENT_EVENT_FAILURE_LOG_WINDOW_MS = 30_000;

export function useAchievementEvents(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [toasts, setToasts] = useState<AchievementToastSummary[]>([]);
  const lastFailureLogRef = useRef<{
    loggedAt: number;
    signature: string;
  } | null>(null);

  const logEventFailure = useCallback((event: AccountAchievementEvent, error: unknown) => {
    const details = describeAccountAchievementRequestError(error);
    const signature = `${event.type}:${details.code ?? ""}:${details.message ?? ""}`;
    const previous = lastFailureLogRef.current;
    const now = Date.now();

    if (
      previous &&
      previous.signature === signature &&
      now - previous.loggedAt < ACHIEVEMENT_EVENT_FAILURE_LOG_WINDOW_MS
    ) {
      return;
    }

    lastFailureLogRef.current = {
      loggedAt: now,
      signature,
    };

    console.warn("[account] achievement event submission failed", {
      eventType: event.type,
      code: details.code,
      status: details.status,
      message: details.message,
    });
  }, []);

  const submitEvent = useCallback(async (event: AccountAchievementEvent) => {
    if (!enabled) {
      return null;
    }

    try {
      const response = await submitAccountAchievementEvent(event);

      if (response.newlyEarnedAchievements.length) {
        setToasts((current) => {
          const nextByKey = new Map(
            current.map((toast) => [`${toast.key}:${toast.earnedAt ?? ""}`, toast] as const),
          );

          for (const toast of response.newlyEarnedAchievements) {
            nextByKey.set(`${toast.key}:${toast.earnedAt ?? ""}`, toast);
          }

          return Array.from(nextByKey.values());
        });
      }

      return response;
    } catch (error) {
      logEventFailure(event, error);
      return null;
    }
  }, [enabled, logEventFailure]);

  const dismissToast = useCallback((key: string, earnedAt: string | null) => {
    setToasts((current) =>
      current.filter(
        (toast) => toast.key !== key || (toast.earnedAt ?? null) !== (earnedAt ?? null),
      ),
    );
  }, []);

  return {
    toasts,
    submitEvent,
    dismissToast,
  };
}
