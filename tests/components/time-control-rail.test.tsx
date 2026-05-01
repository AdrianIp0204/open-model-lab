import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeControlRail } from "@/components/simulations/TimeControlRail";

describe("TimeControlRail", () => {
  it("renders a compact transport strip with scrub and optional reset", async () => {
    const user = userEvent.setup();
    const onTogglePlay = vi.fn();
    const onStepBackward = vi.fn();
    const onStepForward = vi.fn();
    const onScrub = vi.fn();
    const onReset = vi.fn();

    render(
      <TimeControlRail
        currentTime={1.25}
        maxTime={4}
        isPlaying={false}
        note="Paused at t = 1.25 s"
        onTogglePlay={onTogglePlay}
        onStepBackward={onStepBackward}
        onStepForward={onStepForward}
        onScrub={onScrub}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole("button", { name: "Play simulation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step backward" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step forward" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset time" })).toBeInTheDocument();
    expect(screen.getByLabelText("Scrub through time")).toHaveValue("1.25");
    expect(screen.getByText("Paused at t = 1.25 s")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play simulation" }));
    await user.click(screen.getByRole("button", { name: "Step backward" }));
    await user.click(screen.getByRole("button", { name: "Step forward" }));
    await user.click(screen.getByRole("button", { name: "Reset time" }));

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
    expect(onStepBackward).toHaveBeenCalledTimes(1);
    expect(onStepForward).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("calls scrub handlers and respects disabled stepping", async () => {
    const onScrub = vi.fn();

    render(
      <TimeControlRail
        currentTime={2}
        maxTime={6}
        isPlaying
        canStep={false}
        canScrub
        onTogglePlay={vi.fn()}
        onStepBackward={vi.fn()}
        onStepForward={vi.fn()}
        onScrub={onScrub}
      />,
    );

    expect(screen.getByRole("button", { name: "Step backward" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Step forward" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Scrub through time"), { target: { value: "3.5" } });

    expect(onScrub).toHaveBeenLastCalledWith(3.5);
  });

  it("can disable playback for static concepts while still showing the transport strip", () => {
    render(
      <TimeControlRail
        currentTime={0}
        maxTime={0}
        isPlaying={false}
        canPlay={false}
        canStep={false}
        canScrub={false}
        note="Static ray diagram"
        onTogglePlay={vi.fn()}
        onStepBackward={vi.fn()}
        onStepForward={vi.fn()}
        onScrub={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Play simulation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Step backward" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Step forward" })).toBeDisabled();
    expect(screen.getByLabelText("Scrub through time")).toBeDisabled();
  });
});
