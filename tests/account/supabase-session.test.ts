// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import * as billingEnv from "@/lib/billing/env";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getStoredAccountEntitlementForUserMock: vi.fn(),
  getAccountBillingSummaryForUserMock: vi.fn(),
  resolveDevAccountHarnessSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

vi.mock("@/lib/account/entitlements", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/entitlements")>(
    "@/lib/account/entitlements",
  );

  return {
    ...actual,
    getStoredAccountEntitlementForUser: mocks.getStoredAccountEntitlementForUserMock,
  };
});

vi.mock("@/lib/billing/store", () => ({
  getAccountBillingSummaryForUser: mocks.getAccountBillingSummaryForUserMock,
}));

vi.mock("@/lib/account/dev-harness", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/dev-harness")>(
    "@/lib/account/dev-harness",
  );

  return {
    ...actual,
    resolveDevAccountHarnessSession: mocks.resolveDevAccountHarnessSessionMock,
  };
});

function buildServerClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "premium@example.com",
            created_at: "2026-04-01T00:00:00.000Z",
            last_sign_in_at: "2026-04-03T00:00:00.000Z",
            user_metadata: {
              display_name: "Supporter learner",
            },
          },
        },
        error: null,
      }),
    },
  };
}

describe("account session helper", () => {
  afterEach(() => {
    mocks.createSupabaseServerClientMock.mockReset();
    mocks.getStoredAccountEntitlementForUserMock.mockReset();
    mocks.getAccountBillingSummaryForUserMock.mockReset();
    mocks.resolveDevAccountHarnessSessionMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("falls back to the default billing summary when billing storage is unavailable", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockResolvedValue(
      resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    );
    mocks.getAccountBillingSummaryForUserMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "user_billing_profiles" does not exist',
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      entitlement: {
        tier: "premium",
      },
      billing: {
        source: "manual",
        status: "active",
        canManageSubscription: false,
      },
      warnings: {
        billingUnavailable: true,
      },
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] billing summary unavailable during session resolution",
      expect.objectContaining({
        userId: "user-1",
        failureKind: "missing_relation",
        fallback: "default_account_billing_summary",
      }),
    );
  });

  it("falls back to the default signed-in entitlement when entitlement storage is unavailable", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => undefined);

    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockRejectedValue(
      {
        code: "42P01",
        message: 'relation "user_entitlements" does not exist',
      },
    );
    mocks.getAccountBillingSummaryForUserMock.mockResolvedValue({
      source: "none",
      status: "none",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      entitlement: {
        tier: "free",
        source: "account-default",
      },
      warnings: {
        entitlementUnavailable: true,
      },
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[account] entitlement unavailable during session resolution",
      expect.objectContaining({
        userId: "user-1",
        failureKind: "missing_relation",
        fallback: "default_signed_in_entitlement",
      }),
    );
    expect(consoleInfoMock).toHaveBeenCalledWith(
      "[account] session resolution completed signed in",
      expect.objectContaining({
        userId: "user-1",
        warningKeys: expect.arrayContaining(["entitlementUnavailable"]),
      }),
    );
  });

  it("keeps Premium active when Stripe billing is active even if the entitlement row is unavailable", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "user_entitlements" does not exist',
    });
    mocks.getAccountBillingSummaryForUserMock.mockResolvedValue({
      source: "stripe",
      status: "active",
      canStartCheckout: false,
      canManageSubscription: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-05-02T00:00:00.000Z",
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      entitlement: {
        tier: "premium",
        source: "billing-profile",
      },
      billing: {
        source: "stripe",
        status: "active",
      },
      warnings: {
        entitlementUnavailable: true,
      },
    });
  });

  it("drops stale Premium access when the Stripe billing profile now shows an ended subscription", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockResolvedValue(
      resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    );
    mocks.getAccountBillingSummaryForUserMock.mockResolvedValue({
      source: "stripe",
      status: "ended",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-05-02T00:00:00.000Z",
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      entitlement: {
        tier: "free",
        source: "billing-profile",
      },
      billing: {
        source: "stripe",
        status: "ended",
      },
    });
  });

  it("marks billing as not configured when Stripe env is absent but the signed-in page still resolves", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_PREMIUM_PRICE_ID", "");

    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockResolvedValue(
      resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    );
    mocks.getAccountBillingSummaryForUserMock.mockResolvedValue({
      source: "none",
      status: "none",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      billing: {
        canStartCheckout: true,
      },
      warnings: {
        billingNotConfigured: true,
        billingConfigIssues: [
          "missing_secret_key",
          "missing_webhook_secret",
          "missing_price_id",
        ],
      },
    });
  });

  it("falls back to the default signed-in entitlement when entitlement lookup crashes unexpectedly", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockRejectedValue(
      new TypeError("Cannot read properties of undefined"),
    );
    mocks.getAccountBillingSummaryForUserMock.mockResolvedValue({
      source: "none",
      status: "none",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      entitlement: {
        tier: "free",
        source: "account-default",
      },
      warnings: {
        entitlementUnavailable: true,
      },
    });
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[account] entitlement unavailable during session resolution",
      expect.objectContaining({
        userId: "user-1",
        failureKind: "unexpected_runtime",
        fallback: "default_signed_in_entitlement",
      }),
    );
    expect(mocks.getAccountBillingSummaryForUserMock).toHaveBeenCalledOnce();
  });

  it("degrades to billing unavailable when Stripe config evaluation throws", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue(buildServerClient());
    mocks.getStoredAccountEntitlementForUserMock.mockResolvedValue(
      resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    );
    mocks.getAccountBillingSummaryForUserMock.mockResolvedValue({
      source: "none",
      status: "none",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    vi.spyOn(billingEnv, "getStripeBillingConfig").mockImplementation(() => {
      throw new TypeError("Invalid URL");
    });

    const session = await getAccountSessionForCookieHeader("sb-auth-token=1");

    expect(session).toMatchObject({
      user: {
        email: "premium@example.com",
      },
      billing: {
        canStartCheckout: true,
      },
      warnings: {
        billingUnavailable: true,
      },
    });
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[account] billing config unavailable during session resolution",
      expect.objectContaining({
        userId: "user-1",
        fallback: "billing_actions_disabled",
      }),
    );
  });
});
