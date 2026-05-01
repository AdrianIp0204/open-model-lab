// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/reconcile/route";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
  retrieveStripeCheckoutSessionMock: vi.fn(),
  retrieveStripeSubscriptionMock: vi.fn(),
  getStoredBillingProfileForUserMock: vi.fn(),
  getUserIdForStripeCustomerMock: vi.fn(),
  getUserIdForStripeSubscriptionIdMock: vi.fn(),
  linkStripeCustomerToUserMock: vi.fn(),
  applyStripeSubscriptionStateToUserMock: vi.fn(),
  markAchievementRewardUsedMock: vi.fn(),
  releaseAchievementRewardCheckoutClaimMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
}));

vi.mock("@/lib/billing/stripe", () => ({
  retrieveStripeCheckoutSession: mocks.retrieveStripeCheckoutSessionMock,
  retrieveStripeSubscription: mocks.retrieveStripeSubscriptionMock,
}));

vi.mock("@/lib/billing/store", () => ({
  getStoredBillingProfileForUser: mocks.getStoredBillingProfileForUserMock,
  getUserIdForStripeCustomer: mocks.getUserIdForStripeCustomerMock,
  getUserIdForStripeSubscriptionId: mocks.getUserIdForStripeSubscriptionIdMock,
  linkStripeCustomerToUser: mocks.linkStripeCustomerToUserMock,
  applyStripeSubscriptionStateToUser: mocks.applyStripeSubscriptionStateToUserMock,
}));

vi.mock("@/lib/achievements/service", () => ({
  markAchievementRewardUsed: mocks.markAchievementRewardUsedMock,
  releaseAchievementRewardCheckoutClaim:
    mocks.releaseAchievementRewardCheckoutClaimMock,
}));

function buildSignedInSession(overrides?: Record<string, unknown>) {
  return {
    user: {
      id: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
      createdAt: "2026-04-02T00:00:00.000Z",
      lastSignedInAt: "2026-04-02T00:00:00.000Z",
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
    ...overrides,
  };
}

function buildStripeCheckoutSession(overrides?: Record<string, unknown>) {
  return {
    object: "checkout.session",
    id: "cs_test_123",
    mode: "subscription",
    status: "complete",
    customer: "cus_test_123",
    subscription: "sub_test_123",
    client_reference_id: "user-1",
    metadata: {
      user_id: "user-1",
    },
    ...overrides,
  };
}

function buildStripeSubscription(overrides?: Record<string, unknown>) {
  return {
    object: "subscription",
    id: "sub_test_123",
    customer: "cus_test_123",
    status: "active",
    created: 1_712_000_100,
    cancel_at_period_end: false,
    current_period_end: 1_712_086_400,
    metadata: {
      user_id: "user-1",
    },
    items: {
      data: [
        {
          price: {
            id: "price_premium",
          },
        },
      ],
    },
    ...overrides,
  };
}

function buildStoredBillingProfile(overrides?: Record<string, unknown>) {
  return {
    user_id: "user-1",
    stripe_customer_id: "cus_test_123",
    stripe_subscription_id: "sub_test_123",
    stripe_price_id: "price_premium",
    stripe_subscription_status: "active",
    stripe_subscription_cancel_at_period_end: false,
    stripe_subscription_current_period_end: new Date(1_712_086_400 * 1000).toISOString(),
    stripe_last_event_created_at: "2026-04-02T00:00:00.000Z",
    updated_at: "2026-04-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("billing reconcile route", () => {
  afterEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("rejects signed-out requests", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/billing/reconcile", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "cs_test_123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("sign_in_required");
  });

  it("rejects a returned checkout session owned by another user", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInSession());
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue(
      buildStripeCheckoutSession({
        client_reference_id: "user-2",
        metadata: {
          user_id: "user-2",
        },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/billing/reconcile", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "cs_test_123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("session_not_owned");
    expect(mocks.retrieveStripeSubscriptionMock).not.toHaveBeenCalled();
  });

  it("rejects sessions that are not complete subscription checkouts", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInSession());
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue(
      buildStripeCheckoutSession({
        status: "open",
        subscription: null,
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/billing/reconcile", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "cs_test_123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("session_not_completed");
  });

  it("updates billing profile and entitlement when the Stripe session resolves to an active subscription", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInSession());
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue(buildStripeCheckoutSession());
    mocks.retrieveStripeSubscriptionMock.mockResolvedValue(buildStripeSubscription());
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue(null);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "premium",
    });

    const response = await POST(
      new Request("http://localhost/api/billing/reconcile", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "cs_test_123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      status: string;
      premiumGranted: boolean;
      entitlementTier: string;
      syncSource: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      status: "reconciled",
      premiumGranted: true,
      entitlementTier: "premium",
      syncSource: "return_reconciliation",
    });
    expect(mocks.linkStripeCustomerToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_test_123",
      subscriptionId: "sub_test_123",
    });
    expect(mocks.applyStripeSubscriptionStateToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_test_123",
      subscriptionId: "sub_test_123",
      priceId: "price_premium",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(1_712_086_400 * 1000).toISOString(),
      eventCreatedAt: new Date(1_712_000_100 * 1000).toISOString(),
    });
  });

  it("returns already_synced without rewriting billing when the webhook already applied the subscription", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(
      buildSignedInSession({
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
          currentPeriodEnd: new Date(1_712_086_400 * 1000).toISOString(),
        },
      }),
    );
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue(buildStripeCheckoutSession());
    mocks.retrieveStripeSubscriptionMock.mockResolvedValue(buildStripeSubscription());
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue(
      buildStoredBillingProfile(),
    );

    const response = await POST(
      new Request("http://localhost/api/billing/reconcile", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "cs_test_123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      status: string;
      premiumGranted: boolean;
      syncSource: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      status: "already_synced",
      premiumGranted: true,
      entitlementTier: "premium",
      syncSource: "webhook",
    });
    expect(mocks.linkStripeCustomerToUserMock).not.toHaveBeenCalled();
    expect(mocks.applyStripeSubscriptionStateToUserMock).not.toHaveBeenCalled();
  });
});
