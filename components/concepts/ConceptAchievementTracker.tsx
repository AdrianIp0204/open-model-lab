"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { AchievementCelebrationToasts } from "@/components/account/AchievementCelebrationToasts";
import { useAccountSession } from "@/lib/account/client";
import {
  getActiveStudySeconds,
  pauseActiveStudySession,
  reconcileActiveStudySession,
  registerActiveStudyActivity,
  createActiveStudySessionState,
} from "@/lib/achievements/active-study";
import {
  describeAccountAchievementRequestError,
  sendAccountAchievementEvent,
  sendAccountAchievementEventBeacon,
} from "@/lib/achievements/client";
import type {
  ConceptEngagementAchievementEvent,
} from "@/lib/achievements/types";
import { useAchievementEvents } from "@/lib/achievements/use-achievement-events";

type ConceptAchievementTrackerValue = {
  markMeaningfulInteraction: () => void;
  trackQuestionAnswered: (questionId: string) => void;
  trackChallengeCompleted: (challengeId: string) => void;
};

const ConceptAchievementTrackerContext =
  createContext<ConceptAchievementTrackerValue | null>(null);

const noopTrackerValue: ConceptAchievementTrackerValue = {
  markMeaningfulInteraction: () => {},
  trackQuestionAnswered: () => {},
  trackChallengeCompleted: () => {},
};

const ACTIVE_STUDY_RECONCILE_INTERVAL_MS = 1_000;
const ACTIVE_STUDY_SYNC_INTERVAL_MS = 5_000;
const CONCEPT_SYNC_FAILURE_LOG_WINDOW_MS = 30_000;

function createClientSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `concept-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function isWindowFocused() {
  return typeof document === "undefined" || typeof document.hasFocus !== "function"
    ? true
    : document.hasFocus();
}

export function ConceptAchievementTrackerProvider({
  conceptSlug,
  children,
}: {
  conceptSlug: string;
  children: ReactNode;
}) {
  const session = useAccountSession();
  const signedIn = session.status === "signed-in" && Boolean(session.user);
  const { toasts, submitEvent, dismissToast } = useAchievementEvents({
    enabled: signedIn,
  });
  const sessionIdRef = useRef(createClientSessionId());
  const interactionCountRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const studySessionRef = useRef(createActiveStudySessionState());
  const lastSubmittedInteractionCountRef = useRef(0);
  const lastSubmittedStudySecondsRef = useRef(0);
  const lastSuccessfulSyncAtRef = useRef(0);
  const lastSyncFailureLogRef = useRef<{
    loggedAt: number;
    signature: string;
  } | null>(null);
  const visibilityRef = useRef(true);
  const focusRef = useRef(true);

  const reconcileStudyTime = useCallback(() => {
    studySessionRef.current = reconcileActiveStudySession(
      studySessionRef.current,
      Date.now(),
    );
  }, []);

  const pauseStudyTime = useCallback(() => {
    studySessionRef.current = pauseActiveStudySession(
      studySessionRef.current,
      Date.now(),
    );
  }, []);

  const registerForegroundActivity = useCallback(() => {
    if (!visibilityRef.current || !focusRef.current) {
      return;
    }

    studySessionRef.current = registerActiveStudyActivity(
      studySessionRef.current,
      Date.now(),
    );
  }, []);

  const buildConceptEngagementEvent = useCallback((): ConceptEngagementAchievementEvent => {
    reconcileStudyTime();

    return {
      type: "concept_engagement",
      conceptSlug,
      sessionId: sessionIdRef.current,
      interactionCount: interactionCountRef.current,
      heartbeatSlot: null,
      sessionActiveStudySeconds: getActiveStudySeconds(studySessionRef.current),
    };
  }, [conceptSlug, reconcileStudyTime]);

  const logConceptEngagementFailure = useCallback(
    (transport: "default" | "keepalive" | "beacon", error: unknown) => {
      const details = describeAccountAchievementRequestError(error);
      const signature = `${transport}:${details.code ?? ""}:${details.message ?? ""}`;
      const previous = lastSyncFailureLogRef.current;
      const now = Date.now();

      if (
        previous &&
        previous.signature === signature &&
        now - previous.loggedAt < CONCEPT_SYNC_FAILURE_LOG_WINDOW_MS
      ) {
        return;
      }

      lastSyncFailureLogRef.current = {
        loggedAt: now,
        signature,
      };

      console.warn("[account] concept achievement engagement sync failed", {
        conceptSlug,
        sessionId: sessionIdRef.current,
        eventType: "concept_engagement",
        transport,
        code: details.code,
        status: details.status,
        message: details.message,
      });
    },
    [conceptSlug],
  );

  const flushConceptEngagement = useCallback(
    async (transport: "default" | "keepalive" | "beacon" = "default") => {
      if (!signedIn) {
        return null;
      }

      const event = buildConceptEngagementEvent();
      const hasUnsyncedInteraction =
        event.interactionCount > lastSubmittedInteractionCountRef.current;
      const hasUnsyncedStudyTime =
        (event.sessionActiveStudySeconds ?? 0) > lastSubmittedStudySecondsRef.current;

      if (!hasUnsyncedInteraction && !hasUnsyncedStudyTime) {
        return null;
      }

      if (transport === "beacon") {
        if (sendAccountAchievementEventBeacon(event)) {
          return true;
        }

        try {
          await sendAccountAchievementEvent(event, { keepalive: true });
          return true;
        } catch (error) {
          logConceptEngagementFailure("beacon", error);
          return null;
        }
      }

      try {
        const response =
          transport === "keepalive"
            ? await sendAccountAchievementEvent(event, { keepalive: true })
            : await submitEvent(event);

        if (response) {
          lastSubmittedInteractionCountRef.current = Math.max(
            lastSubmittedInteractionCountRef.current,
            event.interactionCount,
          );
          lastSubmittedStudySecondsRef.current = Math.max(
            lastSubmittedStudySecondsRef.current,
            event.sessionActiveStudySeconds ?? 0,
          );
          lastSuccessfulSyncAtRef.current = Date.now();
        }

        return response;
      } catch (error) {
        logConceptEngagementFailure(transport, error);
        return null;
      }
    },
    [buildConceptEngagementEvent, logConceptEngagementFailure, signedIn, submitEvent],
  );

  const scheduleInteractionFlush = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      void flushConceptEngagement();
    }, 500);
  }, [flushConceptEngagement]);

  const noteMeaningfulInteraction = useCallback(() => {
    registerForegroundActivity();
    interactionCountRef.current += 1;
    scheduleInteractionFlush();
  }, [registerForegroundActivity, scheduleInteractionFlush]);

  const value = useMemo<ConceptAchievementTrackerValue>(
    () => ({
      markMeaningfulInteraction: () => {
        noteMeaningfulInteraction();
      },
      trackQuestionAnswered: (questionId: string) => {
        noteMeaningfulInteraction();
        void submitEvent({
          type: "question_answered",
          conceptSlug,
          questionId,
        });
      },
      trackChallengeCompleted: (challengeId: string) => {
        noteMeaningfulInteraction();
        void submitEvent({
          type: "challenge_completed",
          conceptSlug,
          challengeId,
        });
      },
    }),
    [conceptSlug, noteMeaningfulInteraction, submitEvent],
  );

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    visibilityRef.current = isDocumentVisible();
    focusRef.current = isWindowFocused();
    lastSuccessfulSyncAtRef.current = Date.now();

    const handleForegroundActivity = () => {
      registerForegroundActivity();
    };
    const handleVisibilityChange = () => {
      const nextVisible = isDocumentVisible();

      if (!nextVisible && visibilityRef.current) {
        pauseStudyTime();
        void flushConceptEngagement("keepalive");
      }

      visibilityRef.current = nextVisible;
    };
    const handleWindowBlur = () => {
      if (!focusRef.current) {
        return;
      }

      pauseStudyTime();
      focusRef.current = false;
      void flushConceptEngagement("keepalive");
    };
    const handleWindowFocus = () => {
      focusRef.current = true;
    };
    const handlePageHide = () => {
      pauseStudyTime();
      void flushConceptEngagement("beacon");
    };

    window.addEventListener("pointerdown", handleForegroundActivity, { passive: true });
    window.addEventListener("keydown", handleForegroundActivity, { passive: true });
    window.addEventListener("touchstart", handleForegroundActivity, { passive: true });
    window.addEventListener("wheel", handleForegroundActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pagehide", handlePageHide);

    const intervalId = window.setInterval(() => {
      if (!visibilityRef.current || !focusRef.current) {
        return;
      }

      reconcileStudyTime();
      if (Date.now() - lastSuccessfulSyncAtRef.current >= ACTIVE_STUDY_SYNC_INTERVAL_MS) {
        void flushConceptEngagement();
      }
    }, ACTIVE_STUDY_RECONCILE_INTERVAL_MS);

    return () => {
      window.removeEventListener("pointerdown", handleForegroundActivity);
      window.removeEventListener("keydown", handleForegroundActivity);
      window.removeEventListener("touchstart", handleForegroundActivity);
      window.removeEventListener("wheel", handleForegroundActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.clearInterval(intervalId);
      pauseStudyTime();
      void flushConceptEngagement("beacon");
    };
  }, [
    flushConceptEngagement,
    pauseStudyTime,
    reconcileStudyTime,
    registerForegroundActivity,
    signedIn,
  ]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  return (
    <ConceptAchievementTrackerContext.Provider value={value}>
      {children}
      <AchievementCelebrationToasts toasts={toasts} onDismiss={dismissToast} />
    </ConceptAchievementTrackerContext.Provider>
  );
}

export function useConceptAchievementTracker() {
  const context = useContext(ConceptAchievementTrackerContext);
  return context ?? noopTrackerValue;
}
