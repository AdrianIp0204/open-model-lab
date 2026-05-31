// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import zhHkMessages from "@/messages/zh-HK.json";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => mocks.cookiesMock(),
}));

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

vi.mock("@/components/account/AccountPagePanel", () => ({
  AccountPagePanel: ({
    leadIn,
    authState,
    nextPath,
    initialAuthMode,
    initialSession,
  }: {
    leadIn: ReactNode;
    authState?: string | null;
    nextPath?: string | null;
    initialAuthMode: string;
    initialSession?: { user?: { email?: string } } | null;
  }) => (
    <div>
      {leadIn}
      <div>Auth state: {authState ?? "none"}</div>
      <div>Next path: {nextPath ?? "none"}</div>
      <div>Auth mode: {initialAuthMode}</div>
      <div>Session: {initialSession?.user?.email ?? "signed-out"}</div>
    </div>
  ),
}));

vi.mock("@/lib/account/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/supabase")>(
    "@/lib/account/supabase",
  );

  return {
    ...actual,
    getAccountSessionForCookieHeader: (...args: unknown[]) =>
      mocks.getAccountSessionForCookieHeaderMock(...args),
  };
});

import AccountPage from "@/app/account/AccountRoute";

describe("account page", () => {
  afterEach(() => {
    mocks.cookiesMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
  });

  it("passes the signed-in free route lead-in and account preload state into the account panel", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth=1",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: { email: "student@example.com" },
      entitlement: { tier: "free" },
    });

    render(
      await AccountPage({
        searchParams: Promise.resolve({
          auth: "expired",
          next: "/dashboard",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /signed in on the free tier\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/core learning progress is syncing through student@example\.com/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Auth state: expired")).toBeInTheDocument();
    expect(screen.getByText("Next path: /dashboard")).toBeInTheDocument();
    expect(screen.getByText("Auth mode: supabase")).toBeInTheDocument();
    expect(screen.getByText("Session: student@example.com")).toBeInTheDocument();
  });

  it("renders the localized account lead-in in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    render(await AccountPage({ localeOverride: "zh-HK" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: zhHkMessages.AccountPage.hero.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(zhHkMessages.AccountPage.hero.description)).toBeInTheDocument();
    expect(screen.getByText("Auth state: none")).toBeInTheDocument();
    expect(screen.getByText("Auth mode: supabase")).toBeInTheDocument();
    expect(screen.getByText("Session: signed-out")).toBeInTheDocument();
  });

  it("renders the localized signed-in Supporter route lead-in in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "open-model-lab-dev-account=signed-in-premium",
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: { email: "premium.fixture@openmodellab.local" },
      entitlement: { tier: "premium" },
    });

    render(await AccountPage({ localeOverride: "zh-HK" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: zhHkMessages.AccountPage.hero.signedInPremium.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/核心學習進度正透過 premium\.fixture@openmodellab\.local/),
    ).toBeInTheDocument();
    expect(screen.getByText("Session: premium.fixture@openmodellab.local")).toBeInTheDocument();
  });
});
