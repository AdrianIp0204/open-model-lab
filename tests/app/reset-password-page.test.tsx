// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

const pendingPanel = new Promise<never>(() => {});

vi.mock("@/components/account/ResetPasswordPagePanel", () => ({
  ResetPasswordPagePanel: () => {
    throw pendingPanel;
  },
}));

import ResetPasswordPage from "@/app/account/reset-password/page";

describe("reset password page", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("wraps the reset-password panel in a suspense fallback for production rendering", async () => {
    render(await ResetPasswordPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /set a new password on the website\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/loading the recovery session for this browser\./i)).toBeInTheDocument();
  });

  it("renders zh-HK page chrome for the reset-password route", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await ResetPasswordPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /在網站內設定新密碼。/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/正在為這個瀏覽器載入重設驗證階段。/i)).toBeInTheDocument();
  });
});
