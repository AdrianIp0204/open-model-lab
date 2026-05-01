// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  ACTIVE_STUDY_IDLE_WINDOW_MS,
  createActiveStudySessionState,
  getActiveStudySeconds,
  pauseActiveStudySession,
  reconcileActiveStudySession,
  registerActiveStudyActivity,
} from "@/lib/achievements/active-study";

describe("active study session helpers", () => {
  it("accumulates precise active seconds until the idle cutoff", () => {
    let state = createActiveStudySessionState();

    state = registerActiveStudyActivity(state, 1_000);
    state = reconcileActiveStudySession(state, 11_400);
    expect(getActiveStudySeconds(state)).toBe(10);

    state = reconcileActiveStudySession(
      state,
      1_000 + ACTIVE_STUDY_IDLE_WINDOW_MS + 8_000,
    );
    expect(getActiveStudySeconds(state)).toBe(19);
  });

  it("starts a fresh active window after an idle gap without backfilling the gap", () => {
    let state = createActiveStudySessionState();

    state = registerActiveStudyActivity(state, 0);
    state = reconcileActiveStudySession(state, ACTIVE_STUDY_IDLE_WINDOW_MS + 5_000);
    expect(getActiveStudySeconds(state)).toBe(19);

    state = registerActiveStudyActivity(
      state,
      ACTIVE_STUDY_IDLE_WINDOW_MS + 10_000,
    );
    state = reconcileActiveStudySession(
      state,
      ACTIVE_STUDY_IDLE_WINDOW_MS + 16_000,
    );
    expect(getActiveStudySeconds(state)).toBe(25);
  });

  it("pauses immediately when the foreground session is explicitly stopped", () => {
    let state = createActiveStudySessionState();

    state = registerActiveStudyActivity(state, 0);
    state = pauseActiveStudySession(state, 7_200);
    expect(getActiveStudySeconds(state)).toBe(7);

    state = reconcileActiveStudySession(state, 40_000);
    expect(getActiveStudySeconds(state)).toBe(7);
  });
});
