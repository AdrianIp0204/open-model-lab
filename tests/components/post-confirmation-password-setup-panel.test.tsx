// @vitest-environment jsdom

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { PostConfirmationPasswordSetupPanel } from "@/components/account/PostConfirmationPasswordSetupPanel";

const pushMock = vi.fn();
const updateAccountPasswordMock = vi.fn();
const useAccountSessionMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/lib/account/client", () => ({
  updateAccountPassword: (...args: unknown[]) => updateAccountPasswordMock(...args),
  useAccountSession: () => useAccountSessionMock(),
}));

describe("PostConfirmationPasswordSetupPanel", () => {
  beforeEach(() => {
    updateAccountPasswordMock.mockResolvedValue({ ok: true });
    useSearchParamsMock.mockReturnValue(new URLSearchParams("next=%2Fdashboard"));
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
      warnings: null,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });
  });

  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    pushMock.mockReset();
    updateAccountPasswordMock.mockReset();
    useAccountSessionMock.mockReset();
    useSearchParamsMock.mockReset();
  });

  it("renders the optional password step with a skip path back to dashboard", () => {
    render(<PostConfirmationPasswordSetupPanel />);

    expect(screen.getByText(/add a password before you continue/i)).toBeInTheDocument();
    expect(screen.getByText(/adding a password is optional but recommended/i)).toBeInTheDocument();
    expect(screen.getAllByText("Password must be at least 8 characters").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/you can skip this and keep using email-link sign-in later/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("saves a password and continues to the requested next route", async () => {
    const user = userEvent.setup();

    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("next=%2Fconcepts%2Fprojectile-motion"),
    );

    render(<PostConfirmationPasswordSetupPanel />);

    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "Save password and continue" }));

    expect(updateAccountPasswordMock).toHaveBeenCalledWith("new-password-123");
    expect(pushMock).toHaveBeenCalledWith("/concepts/projectile-motion");
  });

  it("keeps the saved-password continue route localized in zh-HK", async () => {
    const user = userEvent.setup();
    globalThis.__TEST_LOCALE__ = "zh-HK";

    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("next=%2Fconcepts%2Fprojectile-motion"),
    );

    render(<PostConfirmationPasswordSetupPanel />);

    await user.type(screen.getByLabelText("新密碼"), "new-password-123");
    await user.type(screen.getByLabelText("確認新密碼"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "儲存密碼並繼續" }));

    expect(updateAccountPasswordMock).toHaveBeenCalledWith("new-password-123");
    expect(pushMock).toHaveBeenCalledWith("/zh-HK/concepts/projectile-motion");
  });

  it("blocks short passwords before submitting the post-confirmation setup step", async () => {
    const user = userEvent.setup();

    render(<PostConfirmationPasswordSetupPanel />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");

    expect(screen.getByRole("button", { name: "Save password and continue" })).toBeDisabled();
    expect(updateAccountPasswordMock).not.toHaveBeenCalled();
  });

  it("shows a bounded fallback when the confirmed session is missing", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
      billing: null,
      warnings: null,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<PostConfirmationPasswordSetupPanel />);

    expect(screen.getByText(/finish the email confirmation first/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to account" })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("shows a dev-harness warning instead of the live password form", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
      warnings: null,
      authMode: "dev-harness",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<PostConfirmationPasswordSetupPanel />);

    expect(
      screen.getByText(/real password setup is disabled while the dev harness is active/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open dev account harness" })).toHaveAttribute(
      "href",
      "/dev/account-harness",
    );
  });

  it("renders zh-HK create-password copy without leaking the English hero copy", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<PostConfirmationPasswordSetupPanel />);

    expect(screen.getByText(/先加入密碼，再繼續。/i)).toBeInTheDocument();
    expect(screen.queryByText(/add a password before you continue/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "跳去控制台" })).toHaveAttribute(
      "href",
      "/zh-HK/dashboard",
    );
  });
});
