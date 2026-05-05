// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ToolsDirectoryRoute from "@/app/tools/ToolsDirectoryRoute";

describe("tools directory route", () => {
  it("renders the learning tools hub with circuit and chemistry entries", async () => {
    render(await ToolsDirectoryRoute());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /open specialized workspaces without leaving the main learning product behind/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open circuit builder/i })
        .some((link) => link.getAttribute("href") === "/circuit-builder"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open reaction mind map/i })
        .some((link) => link.getAttribute("href") === "/tools/chemistry-reaction-mind-map"),
    ).toBe(true);
  });
});
