import { act } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingExperience } from "@/components/onboarding/OnboardingExperience";
import { dispatchOpenOnboardingHelp } from "@/lib/onboarding/events";
import { ONBOARDING_PREFERENCES_STORAGE_KEY } from "@/lib/onboarding/preferences";

function seedPreferences(value: Record<string, unknown>) {
  window.localStorage.setItem(
    ONBOARDING_PREFERENCES_STORAGE_KEY,
    JSON.stringify(value),
  );
}

async function showAutomaticPrompt() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

async function openManualHelp() {
  const trigger = document.createElement("button");
  trigger.textContent = "Help";
  document.body.appendChild(trigger);
  trigger.focus();

  act(() => {
    dispatchOpenOnboardingHelp(trigger);
  });

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  return trigger;
}

describe("OnboardingExperience", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.localStorage.clear();
    globalThis.__TEST_PATHNAME__ = undefined;
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("shows the first-time prompt and starts a non-blocking tour", async () => {
    vi.useFakeTimers();
    globalThis.__TEST_PATHNAME__ = "/search";

    render(<OnboardingExperience />);
    await showAutomaticPrompt();

    expect(screen.getByRole("dialog", { name: /take a quick look around/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start quick tour/i }));

    expect(
      screen.getByRole("dialog", { name: /start with the current page/i }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(ONBOARDING_PREFERENCES_STORAGE_KEY)).toContain(
      '"promptDismissed":true',
    );
  });

  it("persists Skip for now so the automatic prompt does not repeat", async () => {
    vi.useFakeTimers();
    globalThis.__TEST_PATHNAME__ = "/search";
    const { rerender } = render(<OnboardingExperience />);

    await showAutomaticPrompt();
    fireEvent.click(screen.getByRole("button", { name: /skip onboarding prompt/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(ONBOARDING_PREFERENCES_STORAGE_KEY)).toContain(
      '"promptDismissed":true',
    );

    rerender(<OnboardingExperience />);
    await showAutomaticPrompt();

    expect(
      screen.queryByRole("dialog", { name: /take a quick look around/i }),
    ).not.toBeInTheDocument();
  });

  it("suppresses automatic prompts after Don't show again but keeps manual help available", async () => {
    vi.useFakeTimers();
    globalThis.__TEST_PATHNAME__ = "/search";

    render(<OnboardingExperience />);
    await showAutomaticPrompt();
    fireEvent.click(screen.getByRole("button", { name: /do not show/i }));

    expect(window.localStorage.getItem(ONBOARDING_PREFERENCES_STORAGE_KEY)).toContain(
      '"disabled":true',
    );

    await openManualHelp();

    expect(screen.getByRole("dialog", { name: /search and discovery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start quick tour/i })).toBeInTheDocument();
  });

  it("keeps the automatic prompt off the home page while manual help stays available", async () => {
    vi.useFakeTimers();
    globalThis.__TEST_PATHNAME__ = "/";

    render(<OnboardingExperience />);
    await showAutomaticPrompt();

    expect(
      screen.queryByRole("dialog", { name: /take a quick look around/i }),
    ).not.toBeInTheDocument();

    await openManualHelp();

    expect(screen.getByRole("dialog", { name: /^home$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start quick tour/i })).toBeInTheDocument();
  });

  it("shows contextual help for the current route", async () => {
    seedPreferences({ promptDismissed: true });
    globalThis.__TEST_PATHNAME__ = "/search";

    render(<OnboardingExperience />);
    await openManualHelp();

    expect(
      screen.getByRole("dialog", { name: /search and discovery/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/subject and topic filters narrow browsing/i)).toBeInTheDocument();
  });

  it("renders the onboarding prompt and help copy in zh-HK", async () => {
    vi.useFakeTimers();
    seedPreferences({ promptDismissed: true });
    globalThis.__TEST_LOCALE__ = "zh-HK";
    globalThis.__TEST_PATHNAME__ = "/search";

    render(<OnboardingExperience />);
    await openManualHelp();

    expect(screen.getByRole("dialog", { name: "搜尋與探索" })).toBeInTheDocument();
    expect(screen.getByText("學科與主題篩選可縮窄瀏覽範圍，不需要另外開一個目錄。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "開始這一頁的快速導覽" })).toBeInTheDocument();

    cleanup();
    window.localStorage.clear();

    globalThis.__TEST_PATHNAME__ = "/search";
    render(<OnboardingExperience />);
    await showAutomaticPrompt();

    expect(screen.getByRole("dialog", { name: "先快速認識一下。" })).toBeInTheDocument();
    expect(screen.getByText("知道即時實驗台、練習、搜尋與進度工具在哪裡，會更容易用好 Open Model Lab。這個導覽很短，而且完全可選。")).toBeInTheDocument();
  });

  it("supports tour next, previous, and escape controls", async () => {
    const user = userEvent.setup();
    seedPreferences({ promptDismissed: true });
    globalThis.__TEST_PATHNAME__ = "/";

    render(
      <>
        <main data-onboarding-target="page-content">Main content</main>
        <nav data-onboarding-target="main-navigation">Primary navigation</nav>
        <OnboardingExperience />
      </>,
    );

    await openManualHelp();
    await user.click(screen.getByRole("button", { name: /start quick tour/i }));

    expect(
      screen.getByRole("dialog", { name: /start with the current page/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to next tutorial step/i }));

    expect(
      screen.getByRole("dialog", { name: /move across the main surfaces/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to previous tutorial step/i }));

    expect(
      screen.getByRole("dialog", { name: /start with the current page/i }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("uses chemistry-tool-specific walkthrough steps when the workspace targets are present", async () => {
    const user = userEvent.setup();
    seedPreferences({ promptDismissed: true });
    globalThis.__TEST_PATHNAME__ = "/tools/chemistry-reaction-mind-map";

    render(
      <>
        <main data-onboarding-target="page-content">Chemistry tool</main>
        <section data-onboarding-target="chemistry-graph">Reaction map</section>
        <section data-onboarding-target="chemistry-route-controls">Route controls</section>
        <aside data-onboarding-target="chemistry-inspector">Inspector</aside>
        <nav data-onboarding-target="main-navigation">Primary navigation</nav>
        <button data-onboarding-target="help-entry">Help</button>
        <OnboardingExperience />
      </>,
    );

    await openManualHelp();
    await user.click(screen.getByRole("button", { name: /start quick tour/i }));

    expect(
      screen.getByRole("dialog", { name: /start with the current page/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to next tutorial step/i }));

    expect(
      screen.getByRole("dialog", { name: /inspect the reaction map/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to next tutorial step/i }));

    expect(
      screen.getByRole("dialog", { name: /trace routes between families/i }),
    ).toBeInTheDocument();
  });

  it("falls back gracefully when route-specific walkthrough targets are missing", async () => {
    const user = userEvent.setup();
    seedPreferences({ promptDismissed: true });
    globalThis.__TEST_PATHNAME__ = "/concepts/simple-harmonic-motion";

    render(<OnboardingExperience />);
    await openManualHelp();
    await user.click(screen.getByRole("button", { name: /start quick tour/i }));

    expect(
      screen.getByRole("dialog", { name: /start with the current page/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/use the live lab first/i)).not.toBeInTheDocument();
  });
});
