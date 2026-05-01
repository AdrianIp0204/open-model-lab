// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";

describe("DisclosurePanel", () => {
  it("keeps user-opened state stable across rerenders", () => {
    const { rerender } = render(
      <DisclosurePanel title="Progress and next steps" summary="Keep progress visible.">
        <p>Synced progress card</p>
      </DisclosurePanel>,
    );

    const trigger = screen.getByText("Progress and next steps").closest("summary");
    const disclosure = trigger?.closest("details");

    expect(trigger).not.toBeNull();
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByText("Synced progress card")).not.toBeVisible();

    fireEvent.click(trigger as HTMLElement);

    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("Synced progress card")).toBeVisible();

    rerender(
      <DisclosurePanel title="Progress and next steps" summary="Keep progress visible.">
        <p>Synced progress card</p>
      </DisclosurePanel>,
    );

    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("Synced progress card")).toBeVisible();
  });

  it("opens when defaultOpen changes from false to true", () => {
    const { rerender } = render(
      <DisclosurePanel title="Inspector" summary="Component details.">
        <p>Selected component details</p>
      </DisclosurePanel>,
    );

    const trigger = screen.getByText("Inspector").closest("summary");
    const disclosure = trigger?.closest("details");

    expect(disclosure).not.toHaveAttribute("open");

    rerender(
      <DisclosurePanel title="Inspector" summary="Component details." defaultOpen>
        <p>Selected component details</p>
      </DisclosurePanel>,
    );

    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("Selected component details")).toBeVisible();
  });
});
