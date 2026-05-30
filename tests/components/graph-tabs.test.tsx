import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GraphTabs } from "@/components/graphs";

describe("GraphTabs", () => {
  const tabs = [
    {
      id: "displacement",
      label: "Displacement",
      xLabel: "Time",
      yLabel: "Position",
      series: ["x(t)"],
    },
    {
      id: "velocity",
      label: "Velocity",
      xLabel: "Time",
      yLabel: "Speed",
      series: ["v(t)"],
    },
    {
      id: "energy",
      label: "Energy",
      xLabel: "Time",
      yLabel: "Energy",
      series: ["E(t)"],
    },
  ];

  it("keeps legacy full graph-tab visibility when no primary tab ids are authored", () => {
    render(
      <GraphTabs
        tabs={tabs}
        activeId="displacement"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /Displacement/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Velocity/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Energy/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more graphs/i })).not.toBeInTheDocument();
  });

  it("lets long phone graph labels wrap inside an intentional horizontal tab scroller", () => {
    render(
      <GraphTabs
        tabs={[
          {
            id: "terminal-voltage",
            label: "Terminal voltage and internal drop vs load resistance",
            xLabel: "Load resistance",
            yLabel: "Terminal voltage and internal drop",
            series: ["V_terminal", "V_internal"],
          },
          ...tabs,
        ]}
        activeId="terminal-voltage"
        onChange={vi.fn()}
      />,
    );

    const tabList = screen.getByRole("tablist", { name: /graph/i });
    expect(tabList).toHaveClass(
      "overflow-x-auto",
      "overscroll-x-contain",
      "[scrollbar-width:thin]",
    );

    const longTab = screen.getByRole("tab", {
      name: /Terminal voltage and internal drop vs load resistance/i,
    });
    expect(longTab).toHaveClass(
      "w-[min(18rem,calc(100vw-3.5rem))]",
      "snap-start",
    );
    expect(
      within(longTab)
        .getByText("Terminal voltage and internal drop vs load resistance")
        .closest(".whitespace-normal"),
    ).toHaveClass("whitespace-normal", "break-words", "[overflow-wrap:anywhere]");
    expect(
      within(longTab).getByText("Load resistance").closest(".whitespace-normal"),
    ).toHaveClass("whitespace-normal", "break-words", "[overflow-wrap:anywhere]");
  });

  it("shows only primary graphs by default and tucks the rest behind a disclosure", async () => {
    const user = userEvent.setup();

    render(
      <GraphTabs
        tabs={tabs}
        activeId="displacement"
        primaryTabIds={["displacement"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /Displacement/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Velocity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Energy/i })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /more graphs/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tab", { name: /Velocity/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Energy/i })).toBeInTheDocument();
  });

  it("auto-expands when the active graph is tucked behind the secondary disclosure", () => {
    render(
      <GraphTabs
        tabs={tabs}
        activeId="energy"
        primaryTabIds={["displacement"]}
        onChange={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("button", { name: /hide graphs/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tab", { name: /Energy/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("auto-expands when an explicit auto-reveal graph needs to be visible", () => {
    render(
      <GraphTabs
        tabs={tabs}
        activeId="displacement"
        highlightedTabIds={["velocity"]}
        autoRevealTabIds={["velocity"]}
        primaryTabIds={["displacement"]}
        onChange={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("button", { name: /hide graphs/i });
    const panel = screen.getByRole("tab", { name: /Velocity/i }).closest("#graph-tabs-secondary-panel");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByRole("tab", { name: /Velocity/i })).toBeInTheDocument();
  });
});
