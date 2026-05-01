import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WhatToNoticePanel } from "@/components/concepts/WhatToNoticePanel";
import { getConceptBySlug } from "@/lib/content";

describe("WhatToNoticePanel", () => {
  it("renders the active prompt and supports next / hide / show flow", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("simple-harmonic-motion");
    const prompts = [
      {
        ...concept.noticePrompts.items[0],
        contextBadges: ["Graph: Displacement over time", "Paused at 0.80 s"],
        score: 12,
      },
      {
        ...concept.noticePrompts.items[1],
        contextBadges: [],
        score: 8,
      },
    ];
    const onNext = vi.fn();
    const onDismiss = vi.fn();
    const onShow = vi.fn();
    const onRestart = vi.fn();

    const { rerender } = render(
      <WhatToNoticePanel
        prompts={prompts}
        activePrompt={prompts[0]}
        activeIndex={0}
        controls={concept.simulation.controls}
        graphs={concept.graphs}
        overlays={concept.simulation.overlays ?? []}
        variableLinks={concept.variableLinks}
        onNext={onNext}
        onDismiss={onDismiss}
        onShow={onShow}
        onRestart={onRestart}
      />,
    );

    expect(screen.getByText(/What to notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Prompt 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/^Observation$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Graph: Displacement over time/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Paused at 0\.80 s/i).length).toBeGreaterThan(0);
    const relatedTargets = screen.getByRole("list", { name: "Related simulation targets" });
    expect(within(relatedTargets).getAllByRole("listitem").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /next prompt/i }));
    expect(onNext).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Hide prompts$/i }));
    expect(onDismiss).toHaveBeenCalled();

    rerender(
      <WhatToNoticePanel
        prompts={prompts}
        activePrompt={prompts[0]}
        activeIndex={0}
        controls={concept.simulation.controls}
        graphs={concept.graphs}
        overlays={concept.simulation.overlays ?? []}
        variableLinks={concept.variableLinks}
        hidden
        onNext={onNext}
        onDismiss={onDismiss}
        onShow={onShow}
        onRestart={onRestart}
      />,
    );

    expect(
      screen.getByText(/Open the prompt stack when you want a more guided read of the current setup/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prompt 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/^Observation$/i)).toBeInTheDocument();
    expect(screen.getByText(/Graph: Displacement over time/i)).toBeInTheDocument();
    expect(screen.getByText(/Paused at 0\.80 s/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open what to notice/i }));
    expect(onShow).toHaveBeenCalled();
  });
});
