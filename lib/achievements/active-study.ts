import { ACHIEVEMENT_STUDY_HEARTBEAT_SECONDS } from "./constants";

export const ACTIVE_STUDY_IDLE_WINDOW_MS =
  ACHIEVEMENT_STUDY_HEARTBEAT_SECONDS * 1000 + 4_000;

export type ActiveStudySessionState = {
  activeStudyMs: number;
  lastActivityAtMs: number | null;
  lastCountedAtMs: number | null;
};

export function createActiveStudySessionState(
  initialActiveStudyMs = 0,
): ActiveStudySessionState {
  return {
    activeStudyMs: Math.max(0, initialActiveStudyMs),
    lastActivityAtMs: null,
    lastCountedAtMs: null,
  };
}

export function registerActiveStudyActivity(
  state: ActiveStudySessionState,
  nowMs: number,
  idleWindowMs = ACTIVE_STUDY_IDLE_WINDOW_MS,
): ActiveStudySessionState {
  const hasActiveWindow =
    state.lastActivityAtMs !== null &&
    state.lastCountedAtMs !== null &&
    nowMs <= state.lastActivityAtMs + idleWindowMs;

  return {
    ...state,
    lastActivityAtMs: nowMs,
    lastCountedAtMs: hasActiveWindow ? state.lastCountedAtMs : nowMs,
  };
}

export function reconcileActiveStudySession(
  state: ActiveStudySessionState,
  nowMs: number,
  idleWindowMs = ACTIVE_STUDY_IDLE_WINDOW_MS,
): ActiveStudySessionState {
  if (state.lastActivityAtMs === null || state.lastCountedAtMs === null) {
    return state;
  }

  const activeUntilMs = Math.min(nowMs, state.lastActivityAtMs + idleWindowMs);

  if (activeUntilMs <= state.lastCountedAtMs) {
    return state;
  }

  return {
    ...state,
    activeStudyMs: state.activeStudyMs + (activeUntilMs - state.lastCountedAtMs),
    lastCountedAtMs: activeUntilMs,
  };
}

export function pauseActiveStudySession(
  state: ActiveStudySessionState,
  nowMs: number,
  idleWindowMs = ACTIVE_STUDY_IDLE_WINDOW_MS,
): ActiveStudySessionState {
  const reconciled = reconcileActiveStudySession(state, nowMs, idleWindowMs);

  return {
    ...reconciled,
    lastActivityAtMs: null,
    lastCountedAtMs: null,
  };
}

export function getActiveStudySeconds(state: ActiveStudySessionState) {
  return Math.floor(state.activeStudyMs / 1000);
}
