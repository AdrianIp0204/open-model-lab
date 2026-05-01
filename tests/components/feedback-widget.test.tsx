import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import zhHkMessages from "@/messages/zh-HK.json";

describe("FeedbackWidget", () => {
  it("opens a compact feedback panel with the current page context", async () => {
    const user = userEvent.setup();

    render(
      <FeedbackWidget
        context={{
          pageType: "concept",
          pagePath: "/concepts/simple-harmonic-motion",
          pageTitle: "Simple Harmonic Motion",
          conceptId: "concept-shm",
          conceptSlug: "simple-harmonic-motion",
          conceptTitle: "Simple Harmonic Motion",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^feedback$/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByLabelText(/feedback type/i)).toBeInTheDocument();
    expect(await screen.findByText(/simple harmonic motion/i)).toBeInTheDocument();
  });

  it("supports escape-to-close and restores focus to the trigger", async () => {
    const user = userEvent.setup();

    render(
      <FeedbackWidget
        context={{
          pageType: "home",
          pagePath: "/",
          pageTitle: "Home",
        }}
      />,
    );

    const trigger = screen.getByRole("button", { name: /^feedback$/i });

    await user.click(trigger);

    const closeButton = await screen.findByRole("button", { name: /close/i });
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("renders the widget shell in zh-HK when the locale changes", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const user = userEvent.setup();

    render(
      <FeedbackWidget
        context={{
          pageType: "home",
          pagePath: "/",
          pageTitle: "首頁",
        }}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: zhHkMessages.FeedbackWidget.label,
    });

    await user.click(trigger);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: zhHkMessages.FeedbackWidget.actions.close })).toBeInTheDocument();
  });
});
