// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAchievementEvents } from "@/lib/achievements/use-achievement-events";

const mocks = vi.hoisted(() => ({
  describeAccountAchievementRequestErrorMock: vi.fn(),
  submitAccountAchievementEventMock: vi.fn(),
}));

vi.mock("@/lib/achievements/client", () => ({
  describeAccountAchievementRequestError: (...args: unknown[]) =>
    mocks.describeAccountAchievementRequestErrorMock(...args),
  submitAccountAchievementEvent: (...args: unknown[]) =>
    mocks.submitAccountAchievementEventMock(...args),
}));

function AchievementEventProbe() {
  const { submitEvent } = useAchievementEvents();

  return (
    <button
      type="button"
      onClick={() => {
        void submitEvent({
          type: "question_answered",
          conceptSlug: "projectile-motion",
          questionId: "pm-qt-1",
        });
      }}
    >
      Submit achievement event
    </button>
  );
}

describe("useAchievementEvents", () => {
  afterEach(() => {
    mocks.describeAccountAchievementRequestErrorMock.mockReset();
    mocks.submitAccountAchievementEventMock.mockReset();
    vi.restoreAllMocks();
  });

  it("logs a bounded diagnostic warning instead of silently swallowing repeated event failures", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.submitAccountAchievementEventMock.mockRejectedValue(
      new Error("Achievement progress could not be recorded right now."),
    );
    mocks.describeAccountAchievementRequestErrorMock.mockReturnValue({
      message: "Achievement progress could not be recorded right now.",
      code: "achievements_not_configured",
      eventType: "question_answered",
      status: 503,
    });

    render(<AchievementEventProbe />);

    await act(async () => {
      screen.getByRole("button", { name: "Submit achievement event" }).click();
      await Promise.resolve();
      screen.getByRole("button", { name: "Submit achievement event" }).click();
      await Promise.resolve();
    });

    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] achievement event submission failed",
      expect.objectContaining({
        eventType: "question_answered",
        code: "achievements_not_configured",
        status: 503,
        message: "Achievement progress could not be recorded right now.",
      }),
    );

    consoleWarnMock.mockRestore();
  });
});
