// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ToolsDirectoryRoute from "@/app/tools/ToolsDirectoryRoute";

function expectAnyLinkHref(name: RegExp, href: string) {
  expect(
    screen
      .getAllByRole("link", { name })
      .some((link) => link.getAttribute("href") === href),
  ).toBe(true);
}

describe("tools directory route", () => {
  it("renders the learning tools hub with circuit and chemistry entries", async () => {
    render(await ToolsDirectoryRoute());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /open specialized workspaces without leaving the main learning product behind/i,
      }),
    ).toBeInTheDocument();
    expectAnyLinkHref(/open circuit builder/i, "/circuit-builder");
    expectAnyLinkHref(/open reaction mind map/i, "/tools/chemistry-reaction-mind-map");
  });
});
