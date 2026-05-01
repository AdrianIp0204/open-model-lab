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

vi.mock("@/components/account/PostConfirmationPasswordSetupPanel", () => ({
  PostConfirmationPasswordSetupPanel: () => {
    throw pendingPanel;
  },
}));

import CreatePasswordPage from "@/app/account/create-password/page";

describe("create password page", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("wraps the post-confirmation password step in a suspense fallback", async () => {
    render(await CreatePasswordPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /add a password or keep using email links/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/loading the confirmed account session for this browser/i),
    ).toBeInTheDocument();
  });

  it("renders zh-HK page chrome for the create-password route", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await CreatePasswordPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /加入密碼，或繼續使用電郵連結。/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/正在為這個瀏覽器載入已確認的帳戶登入階段。/i)).toBeInTheDocument();
  });
});
