// @vitest-environment jsdom

import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPagePanel } from "@/components/account/AccountPagePanel";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const pushMock = vi.fn();
const initializeAccountSessionMock = vi.fn();
const requestMagicLinkMock = vi.fn();
const requestPasswordResetMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signOutAccountMock = vi.fn();
const updateAccountPasswordMock = vi.fn();
const useAccountSessionMock = vi.fn();
const forceProgressSyncMock = vi.fn();
const useProgressSnapshotMock = vi.fn();
const useProgressSyncStateMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/lib/account/client", () => ({
  initializeAccountSession: (...args: unknown[]) => initializeAccountSessionMock(...args),
  requestMagicLink: (...args: unknown[]) => requestMagicLinkMock(...args),
  requestPasswordReset: (...args: unknown[]) => requestPasswordResetMock(...args),
  signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
  signOutAccount: (...args: unknown[]) => signOutAccountMock(...args),
  updateAccountPassword: (...args: unknown[]) => updateAccountPasswordMock(...args),
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/lib/progress", () => ({
  forceProgressSync: (...args: unknown[]) => forceProgressSyncMock(...args),
  useProgressSnapshot: () => useProgressSnapshotMock(),
  useProgressSyncState: () => useProgressSyncStateMock(),
}));

vi.mock("@/components/account/PremiumSubscriptionActions", () => ({
  PremiumSubscriptionActions: ({
    billingUnavailable,
  }: {
    billingUnavailable?: boolean;
  }) => <div>{billingUnavailable ? "Billing unavailable controls" : "Billing controls"}</div>,
}));

vi.mock("@/components/account/AchievementsSection", () => ({
  AchievementsSection: () => <div>Achievements section</div>,
}));

describe("AccountPagePanel", () => {
  beforeEach(() => {
    globalThis.__TEST_ROUTER_PUSH__ = pushMock;
    initializeAccountSessionMock.mockResolvedValue(undefined);
    requestMagicLinkMock.mockResolvedValue({
      ok: true,
      message: "Check your inbox and spam for a sign-in link.",
    });
    requestPasswordResetMock.mockResolvedValue({
      ok: true,
      message:
        "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
    });
    signInWithPasswordMock.mockResolvedValue({ ok: true });
    signOutAccountMock.mockResolvedValue(undefined);
    updateAccountPasswordMock.mockResolvedValue({ ok: true });
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {},
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "local",
      lastMergeSummary: null,
      savedContinueLearningState: null,
      lastSyncedAt: null,
      errorMessage: null,
    });
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
  });

  afterEach(() => {
    globalThis.__TEST_ROUTER_PUSH__ = undefined;
    pushMock.mockReset();
    initializeAccountSessionMock.mockReset();
    requestMagicLinkMock.mockReset();
    requestPasswordResetMock.mockReset();
    signInWithPasswordMock.mockReset();
    signOutAccountMock.mockReset();
    updateAccountPasswordMock.mockReset();
    useAccountSessionMock.mockReset();
    forceProgressSyncMock.mockReset();
    useProgressSnapshotMock.mockReset();
    useProgressSyncStateMock.mockReset();
    useSearchParamsMock.mockReset();
    vi.useRealTimers();
  });

  it("shows distinct returning-user and first-time email-link sections", () => {
    render(<AccountPagePanel />);
    const nav = screen.getByRole("navigation", { name: "Account sections" });

    expect(
      screen.getByRole("heading", {
        name: /returning users with a password can sign in directly/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/email links stay available for first-time and passwordless accounts/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email for password sign-in")).toBeInTheDocument();
    expect(screen.getByLabelText("Email for sign-in link")).toBeInTheDocument();
    expect(screen.getByLabelText("Email for password reset")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(
      screen.getByText(/first-time or passwordless sign-in/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email me a sign-in link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send password-reset email" })).toBeInTheDocument();
    expect(screen.getByText("Local-first")).toBeInTheDocument();
    expect(screen.getByText("Signed-in sync")).toBeInTheDocument();
    expect(screen.queryByText("What sync keeps")).not.toBeInTheDocument();
    expect(screen.queryByText("First sign-in")).not.toBeInTheDocument();
    expect(screen.getByText(/reset a password for an existing account/i)).toBeInTheDocument();
    expect(screen.getAllByText(/supporter/i).length).toBeGreaterThan(0);
    expect(
      within(nav).getByRole("link", { name: "Password sign-in for returning users" }),
    ).toHaveAttribute("href", "#account-password-sign-in");
    expect(
      within(nav).getByRole("link", { name: "Supporter and billing" }),
    ).toHaveAttribute("href", "#account-premium-billing");
  });

  it("shows inline validation for malformed email before password sign-in", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for password sign-in"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    expect(signInWithPasswordMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("shows required-field feedback before password sign-in", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    expect(signInWithPasswordMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
  });

  it("keeps the 8-character password rule visible and blocks short password sign-in attempts", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for password sign-in"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("shows a loading label while password sign-in is in flight", () => {
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
      pendingAction: "password-sign-in",
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });

  it("shows a bounded incorrect-credentials message for failed password sign-in", () => {
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
      errorCode: "invalid_credentials",
      errorMessage: "Incorrect email or password",
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByRole("alert")).toHaveTextContent("Incorrect email or password");
  });

  it("shows a clear email-not-registered message for password sign-in failures", () => {
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
      errorCode: "email_not_registered",
      errorMessage:
        "No account was found for that email. Use the email-link path below to create or confirm it first.",
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByText(/no account was found for that email/i)).toBeInTheDocument();
  });

  it("shows a clear email-confirmation message for unconfirmed password sign-in attempts", () => {
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
      errorCode: "email_not_confirmed",
      errorMessage:
        "Confirm the account from the email link first, then sign in with a password.",
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByText(/confirm the account from the email link first/i)).toBeInTheDocument();
  });

  it("shows a bounded unavailable message when password sign-in is offline on this deployment", () => {
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
      errorCode: "auth_unavailable",
      errorMessage: "Sign-in is unavailable right now.",
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByText("Sign-in is unavailable right now.")).toBeInTheDocument();
  });

  it("submits password sign-in and routes into the signed-in dashboard flow", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for password sign-in"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    expect(signInWithPasswordMock).toHaveBeenCalledWith(
      "student@example.com",
      "password-123",
      "/dashboard",
    );
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("preserves the requested next route for password sign-in and email-link requests", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel nextPath="/concepts/projectile-motion" />);

    await user.type(screen.getByLabelText("Email for password sign-in"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    expect(signInWithPasswordMock).toHaveBeenCalledWith(
      "student@example.com",
      "password-123",
      "/concepts/projectile-motion",
    );
    expect(pushMock).toHaveBeenCalledWith("/concepts/projectile-motion");

    await user.clear(screen.getByLabelText("Email for sign-in link"));
    await user.type(screen.getByLabelText("Email for sign-in link"), "first-timer@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));

    expect(requestMagicLinkMock).toHaveBeenCalledWith(
      "first-timer@example.com",
      "/concepts/projectile-motion",
    );
  });

  it("keeps sign-in-link cooldown messaging for the alternate magic-link path", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T00:00:00.000Z"));

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
      noticeMessage: "Check your email for a sign-in link.",
      magicLinkCooldownExpiresAt: Date.now() + 5 * 60 * 1000,
    });

    render(<AccountPagePanel />);

    expect(screen.getByRole("button", { name: "Wait to resend" })).toBeDisabled();
    expect(screen.getByText(/you can request another sign-in link in 5:00/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("uses the first-time email-link field for passwordless sign-in", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for sign-in link"), "first-timer@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));

    expect(requestMagicLinkMock).toHaveBeenCalledWith(
      "first-timer@example.com",
      "/dashboard",
    );
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("shows inline validation before sending an email sign-in link", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for sign-in link"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));

    expect(requestMagicLinkMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("shows the same inline validation before sending a password-reset email", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for password reset"), "still-not-an-email");
    await user.click(screen.getByRole("button", { name: "Send password-reset email" }));

    expect(requestPasswordResetMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("keeps forgot-password separate from the magic-link email field", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for sign-in link"), "first-timer@example.com");
    await user.type(screen.getByLabelText("Email for password reset"), "student@example.com");
    await user.click(screen.getByRole("button", { name: "Send password-reset email" }));

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      "student@example.com",
      "/account/reset-password",
    );
    expect(requestMagicLinkMock).not.toHaveBeenCalled();
  });

  it("shows a clear forgot-password success state", async () => {
    const user = userEvent.setup();

    render(<AccountPagePanel />);

    await user.type(screen.getByLabelText("Email for password reset"), "student@example.com");
    await user.click(screen.getByRole("button", { name: "Send password-reset email" }));

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      "student@example.com",
      "/account/reset-password",
    );
    expect(screen.getByText(/password-reset email has been sent/i)).toBeInTheDocument();
    expect(screen.getByText(/check your inbox and spam/i)).toBeInTheDocument();
  });

  it("preserves the active locale in auth continuation requests", async () => {
    const user = userEvent.setup();
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<AccountPagePanel />);

    const [, magicLinkEmailInput, passwordResetEmailInput] = screen.getAllByRole("textbox");
    const [, magicLinkSubmitButton, passwordResetSubmitButton] = Array.from(
      document.querySelectorAll<HTMLButtonElement>('form button[type="submit"]'),
    );

    expect(magicLinkEmailInput).toBeDefined();
    expect(passwordResetEmailInput).toBeDefined();
    expect(magicLinkSubmitButton).toBeDefined();
    expect(passwordResetSubmitButton).toBeDefined();

    await user.type(magicLinkEmailInput!, "first-timer@example.com");
    await user.click(magicLinkSubmitButton!);
    await user.type(passwordResetEmailInput!, "student@example.com");
    await user.click(passwordResetSubmitButton!);

    expect(requestMagicLinkMock).toHaveBeenCalledWith(
      "first-timer@example.com",
      "/zh-HK/dashboard",
    );
    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      "student@example.com",
      "/zh-HK/account/reset-password",
    );
  }, 10_000);

  it("keeps long email values visible inside the separate auth inputs", async () => {
    const longEmail =
      "very.long.student.alias.for-layout-checking+open-model-lab-auth@example-domain-for-testing.com";

    render(<AccountPagePanel />);

    const magicLinkInput = screen.getByLabelText("Email for sign-in link");
    const resetInput = screen.getByLabelText("Email for password reset");

    fireEvent.change(magicLinkInput, { target: { value: longEmail } });
    fireEvent.change(resetInput, { target: { value: longEmail } });

    expect(magicLinkInput).toHaveValue(longEmail);
    expect(resetInput).toHaveValue(longEmail);
  });

  it("shows a clear forgot-password failure state", async () => {
    const user = userEvent.setup();

    requestPasswordResetMock.mockResolvedValueOnce({
      ok: false,
      code: "auth_redirect_unavailable",
      message:
        "Password-reset email is blocked by the current Supabase redirect settings. Add this deployment origin and /auth/confirm to the Supabase Auth Site URL and allowed redirect URLs.",
    });

    render(<AccountPagePanel />);

    fireEvent.change(screen.getByLabelText("Email for password reset"), {
      target: { value: "student@example.com" },
    });
    await user.click(screen.getByRole("button", { name: "Send password-reset email" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/supabase redirect settings/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/\/auth\/confirm/i);
  });

  it("shows a loading state for forgot-password requests and disables duplicate submits", () => {
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
      pendingAction: "password-reset",
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByRole("button", { name: "Sending reset email..." })).toBeDisabled();
    expect(screen.getByText(/requesting the recovery email/i)).toBeInTheDocument();
  });

  it("surfaces a small signed-in password management card for free accounts", () => {
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

    render(<AccountPagePanel />);
    const nav = screen.getByRole("navigation", { name: "Account sections" });

    expect(screen.getByText("Free tier")).toBeInTheDocument();
    expect(
      screen.getByText(
        /your core learning progress syncs with this account across devices/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
    expect(screen.getByText("Sync status")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Study plans" })).toHaveAttribute(
      "href",
      "/account/study-plans",
    );
    expect(screen.getByRole("heading", { name: "Add or change a password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save password" })).toBeInTheDocument();
    expect(screen.getAllByText("Password must be at least 8 characters").length).toBeGreaterThan(0);
    expect(
      within(nav).getByRole("link", { name: "Free tier scope" }),
    ).toHaveAttribute("href", "#account-free-scope");
  });

  it("surfaces signed-in premium accounts with password management and sign-out", () => {
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
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "stripe",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
      warnings: null,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByText("Supporter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Study plans" })).toHaveAttribute(
      "href",
      "/account/study-plans",
    );
    expect(screen.getByRole("heading", { name: "Keep password sign-in available" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("calls sign out from the signed-in account state", async () => {
    const user = userEvent.setup();

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

    render(<AccountPagePanel />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutAccountMock).toHaveBeenCalledOnce();
  });

  it("disables live auth actions when the dev harness override is active", () => {
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
      authMode: "dev-harness",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    expect(screen.getByText(/dev harness override active/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open dev account harness" })).toHaveAttribute(
      "href",
      "/dev/account-harness",
    );
    expect(screen.getByRole("button", { name: "Sign in with password" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Email me a sign-in link" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send password-reset email" })).toBeDisabled();
  });

  it("offers a recovery-email fallback when password changes require reauthentication", async () => {
    const user = userEvent.setup();

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
      errorCode: "reauthentication_needed",
      errorMessage:
        "This project currently requires recent authentication before password changes.",
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    });

    render(<AccountPagePanel />);

    await user.click(
      screen.getByRole("button", { name: "Email me a password-reset link instead" }),
    );

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      "student@example.com",
      "/account/reset-password",
    );
  });

  it("shows a bounded auth-unavailable notice when provider email auth is not configured", () => {
    render(<AccountPagePanel authState="unavailable" />);

    expect(
      screen.getByText(/real email sign-in and password-recovery links are not configured/i),
    ).toBeInTheDocument();
  });

  it("mounts the billing return panel on the signed-out account page when Stripe returns with a billing query state", () => {
    render(<AccountPagePanel billingReturnQueryState="checkout-returned" />);

    expect(screen.getByText("Billing controls")).toBeInTheDocument();
  });

  it("localizes known fixture account names on the zh-HK signed-in account surface", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Free learner",
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

    render(<AccountPagePanel />);

    expect(screen.getByRole("heading", { name: /免費學習者/i })).toBeInTheDocument();
    expect(screen.queryByText("Free learner")).not.toBeInTheDocument();
  });
});
