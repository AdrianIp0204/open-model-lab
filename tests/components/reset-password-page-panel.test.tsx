// @vitest-environment jsdom

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPagePanel } from "@/components/account/ResetPasswordPagePanel";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const updateAccountPasswordMock = vi.fn();
const useAccountSessionMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/lib/account/client", () => ({
  updateAccountPassword: (...args: unknown[]) => updateAccountPasswordMock(...args),
  useAccountSession: () => useAccountSessionMock(),
}));

describe("ResetPasswordPagePanel", () => {
  beforeEach(() => {
    updateAccountPasswordMock.mockResolvedValue({ ok: true });
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
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
    updateAccountPasswordMock.mockReset();
    useAccountSessionMock.mockReset();
    useSearchParamsMock.mockReset();
  });

  it("lets a verified recovery return set a new password in-browser", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPagePanel />);

    expect(screen.getAllByText("Password must be at least 8 characters").length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(updateAccountPasswordMock).toHaveBeenCalledWith("new-password-123");
  });

  it("blocks short passwords on the reset-password step", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPagePanel />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");

    expect(screen.getByRole("button", { name: "Save new password" })).toBeDisabled();
    expect(updateAccountPasswordMock).not.toHaveBeenCalled();
  });

  it("shows a bounded expired-link state when the recovery callback failed", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("auth=expired"));

    render(<ResetPasswordPagePanel />);

    expect(screen.getByText(/that recovery link expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to account" })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("shows an auth-unavailable state when recovery email config is missing on this deployment", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("auth=unavailable"));

    render(<ResetPasswordPagePanel />);

    expect(
      screen.getByText(/password recovery is not configured on this deployment/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to account" })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("shows a harness warning instead of the password form when the dev harness is active", () => {
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

    render(<ResetPasswordPagePanel />);

    expect(
      screen.getByText(/real recovery links are disabled while the dev harness is active/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open dev account harness" })).toHaveAttribute(
      "href",
      "/dev/account-harness",
    );
  });

  it("localizes reset completion links in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
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
      noticeMessage: "密碼已更新。",
      magicLinkCooldownExpiresAt: null,
    });

    render(<ResetPasswordPagePanel />);

    expect(screen.getByText(/密碼已更新。/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /帳戶/i })).toHaveAttribute(
      "href",
      "/zh-HK/account",
    );
    expect(screen.getByRole("link", { name: /控制台/i })).toHaveAttribute(
      "href",
      "/zh-HK/dashboard",
    );
  });

  it("renders zh-HK recovery copy without leaking the raw English reset title", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    useSearchParamsMock.mockReturnValue(new URLSearchParams("auth=expired"));

    render(<ResetPasswordPagePanel />);

    expect(screen.getByText(/這個重設連結已過期。/i)).toBeInTheDocument();
    expect(screen.queryByText(/that recovery link expired/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /返回帳戶/i })).toHaveAttribute(
      "href",
      "/zh-HK/account",
    );
  });
});
