// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({
    children,
    feedbackContext,
  }: {
    children: ReactNode;
    feedbackContext?: { pageTitle: string };
  }) => (
    <div>
      <div data-testid="feedback-title">{feedbackContext?.pageTitle}</div>
      {children}
    </div>
  ),
}));

import CircuitBuilderRoute from "@/app/circuit-builder/page";

describe("circuit builder route", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("renders the dedicated circuit builder page inside the public route shell", async () => {
    render(await CircuitBuilderRoute());

    expect(screen.getByTestId("feedback-title")).toHaveTextContent("Circuit Builder");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /build a live circuit and explain what it is doing/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add Battery" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Starter series loop/i })).toBeInTheDocument();
  });

  it("localizes the route metadata context in zh-HK without changing the builder surface yet", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await CircuitBuilderRoute());

    expect(screen.getByTestId("feedback-title")).toHaveTextContent("電路搭建器");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /build a live circuit and explain what it is doing/i,
      }),
    ).toBeInTheDocument();
  });
});
