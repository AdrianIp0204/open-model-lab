// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConceptAchievementTrackerProvider,
  useConceptAchievementTracker,
} from "@/components/concepts/ConceptAchievementTracker";

const mocks = vi.hoisted(() => ({
  describeAccountAchievementRequestErrorMock: vi.fn(),
  dismissToastMock: vi.fn(),
  sendAccountAchievementEventBeaconMock: vi.fn(),
  sendAccountAchievementEventMock: vi.fn(),
  submitEventMock: vi.fn(),
  useAccountSessionMock: vi.fn(),
}));

vi.mock("@/components/account/AchievementCelebrationToasts", () => ({
  AchievementCelebrationToasts: () => null,
}));

vi.mock("@/lib/account/client", () => ({
  useAccountSession: (...args: unknown[]) => mocks.useAccountSessionMock(...args),
}));

vi.mock("@/lib/achievements/use-achievement-events", () => ({
  useAchievementEvents: () => ({
    toasts: [],
    submitEvent: mocks.submitEventMock,
    dismissToast: mocks.dismissToastMock,
  }),
}));

vi.mock("@/lib/achievements/client", () => ({
  describeAccountAchievementRequestError: (...args: unknown[]) =>
    mocks.describeAccountAchievementRequestErrorMock(...args),
  sendAccountAchievementEvent: (...args: unknown[]) =>
    mocks.sendAccountAchievementEventMock(...args),
  sendAccountAchievementEventBeacon: (...args: unknown[]) =>
    mocks.sendAccountAchievementEventBeaconMock(...args),
}));

function InteractionProbe() {
  const { markMeaningfulInteraction } = useConceptAchievementTracker();

  return (
    <button type="button" onClick={markMeaningfulInteraction}>
      Mark interaction
    </button>
  );
}

function QuestionAndChallengeProbe() {
  const { trackChallengeCompleted, trackQuestionAnswered } = useConceptAchievementTracker();

  return (
    <>
      <button type="button" onClick={() => trackQuestionAnswered("shm-qt-1")}>
        Track question answer
      </button>
      <button type="button" onClick={() => trackChallengeCompleted("shm-ch-1")}>
        Track challenge completion
      </button>
    </>
  );
}

function QuickTestProbe() {
  const { trackQuestionAnswered } = useConceptAchievementTracker();

  return (
    <button
      type="button"
      onClick={() => {
        ["pm-qt-1", "pm-qt-2", "pm-qt-3", "pm-qt-4"].forEach((questionId) =>
          trackQuestionAnswered(questionId),
        );
      }}
    >
      Complete quick test
    </button>
  );
}

describe("ConceptAchievementTrackerProvider", () => {
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
    document,
    "visibilityState",
  );
  const originalHasFocus = document.hasFocus;
  let visibilityState: DocumentVisibilityState = "visible";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T00:00:00.000Z"));
    visibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });
    document.hasFocus = () => true;
    mocks.useAccountSessionMock.mockReturnValue({
      status: "signed-in",
      user: { id: "user-1" },
    });
    mocks.submitEventMock.mockResolvedValue({ ok: true });
    mocks.sendAccountAchievementEventMock.mockResolvedValue({ ok: true });
    mocks.sendAccountAchievementEventBeaconMock.mockReturnValue(true);
    mocks.describeAccountAchievementRequestErrorMock.mockImplementation((error: unknown) => ({
      message: error instanceof Error ? error.message : null,
      code: null,
      eventType: null,
      status: null,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, "visibilityState", originalVisibilityDescriptor);
    }
    document.hasFocus = originalHasFocus;
    mocks.describeAccountAchievementRequestErrorMock.mockReset();
    mocks.dismissToastMock.mockReset();
    mocks.sendAccountAchievementEventBeaconMock.mockReset();
    mocks.sendAccountAchievementEventMock.mockReset();
    mocks.submitEventMock.mockReset();
    mocks.useAccountSessionMock.mockReset();
  });

  it("does not record passive time before any foreground activity", () => {
    render(
      <ConceptAchievementTrackerProvider conceptSlug="simple-harmonic-motion">
        <div>Concept page</div>
      </ConceptAchievementTrackerProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(mocks.submitEventMock).not.toHaveBeenCalled();
    expect(mocks.sendAccountAchievementEventMock).not.toHaveBeenCalled();
  });

  it("flushes meaningful interaction counts quickly without waiting for a time heartbeat", () => {
    render(
      <ConceptAchievementTrackerProvider conceptSlug="simple-harmonic-motion">
        <InteractionProbe />
      </ConceptAchievementTrackerProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Mark interaction" }).click();
      screen.getByRole("button", { name: "Mark interaction" }).click();
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(mocks.submitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "concept_engagement",
        conceptSlug: "simple-harmonic-motion",
        interactionCount: 2,
        sessionActiveStudySeconds: 0,
      }),
    );
  });

  it("counts quick-test answers and challenge completions as meaningful concept interactions", () => {
    render(
      <ConceptAchievementTrackerProvider conceptSlug="simple-harmonic-motion">
        <QuestionAndChallengeProbe />
      </ConceptAchievementTrackerProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Track question answer" }).click();
      screen.getByRole("button", { name: "Track challenge completion" }).click();
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(mocks.submitEventMock).toHaveBeenCalledWith({
      type: "question_answered",
      conceptSlug: "simple-harmonic-motion",
      questionId: "shm-qt-1",
    });
    expect(mocks.submitEventMock).toHaveBeenCalledWith({
      type: "challenge_completed",
      conceptSlug: "simple-harmonic-motion",
      challengeId: "shm-ch-1",
    });
    expect(mocks.submitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "concept_engagement",
        conceptSlug: "simple-harmonic-motion",
        interactionCount: 2,
        sessionActiveStudySeconds: 0,
      }),
    );
  });

  it("treats a full quick-test run as enough concept interaction to qualify the visit threshold", () => {
    render(
      <ConceptAchievementTrackerProvider conceptSlug="projectile-motion">
        <QuickTestProbe />
      </ConceptAchievementTrackerProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Complete quick test" }).click();
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(mocks.submitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "concept_engagement",
        conceptSlug: "projectile-motion",
        interactionCount: 4,
        sessionActiveStudySeconds: 0,
      }),
    );
  });

  it("accumulates precise foreground study time, pauses while hidden, and flushes on pagehide", () => {
    render(
      <ConceptAchievementTrackerProvider conceptSlug="simple-harmonic-motion">
        <div>Concept page</div>
      </ConceptAchievementTrackerProvider>,
    );

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
      vi.advanceTimersByTime(6_000);
    });

    expect(mocks.submitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "concept_engagement",
        conceptSlug: "simple-harmonic-motion",
        interactionCount: 0,
        sessionActiveStudySeconds: 5,
      }),
    );

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mocks.sendAccountAchievementEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "concept_engagement",
        conceptSlug: "simple-harmonic-motion",
        sessionActiveStudySeconds: 6,
      }),
      expect.objectContaining({ keepalive: true }),
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pointerdown"));
      vi.advanceTimersByTime(2_500);
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(mocks.sendAccountAchievementEventBeaconMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "concept_engagement",
        conceptSlug: "simple-harmonic-motion",
        sessionActiveStudySeconds: 8,
      }),
    );
  });

  it("logs a bounded warning when keepalive concept-engagement sync fails", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.sendAccountAchievementEventMock.mockRejectedValue(new Error("service role unavailable"));
    mocks.describeAccountAchievementRequestErrorMock.mockReturnValue({
      message: "service role unavailable",
      code: "achievements_not_configured",
      eventType: "concept_engagement",
      status: 503,
    });

    render(
      <ConceptAchievementTrackerProvider conceptSlug="simple-harmonic-motion">
        <div>Concept page</div>
      </ConceptAchievementTrackerProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      vi.advanceTimersByTime(6_000);
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] concept achievement engagement sync failed",
      expect.objectContaining({
        conceptSlug: "simple-harmonic-motion",
        eventType: "concept_engagement",
        transport: "keepalive",
        code: "achievements_not_configured",
        status: 503,
        message: "service role unavailable",
      }),
    );

    consoleWarnMock.mockRestore();
  });
});
