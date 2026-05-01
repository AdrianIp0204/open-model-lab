// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/checkout/route";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { ACHIEVEMENT_REWARD_KEY } from "@/lib/achievements";

const mocks = vi.hoisted(() => ({
  describeOptionalAccountDependencyFailureMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getStripeBillingConfigMock: vi.fn(),
  getStripeCheckoutConfigDiagnosticsMock: vi.fn(),
  describeStripeCheckoutConfigIssuesMock: vi.fn(),
  createStripeCustomerMock: vi.fn(),
  createStripeCheckoutSessionMock: vi.fn(),
  retrieveStripeCheckoutSessionMock: vi.fn(),
  getStoredBillingProfileForUserMock: vi.fn(),
  linkStripeCustomerToUserMock: vi.fn(),
  getAchievementRewardForCheckoutMock: vi.fn(),
  reserveAchievementRewardForCheckoutMock: vi.fn(),
  attachAchievementRewardCheckoutSessionMock: vi.fn(),
  releaseAchievementRewardCheckoutClaimMock: vi.fn(),
  shouldLogOptionalAccountDependencyFailureAsErrorMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  describeOptionalAccountDependencyFailure: (...args: unknown[]) =>
    mocks.describeOptionalAccountDependencyFailureMock(...args),
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
  shouldLogOptionalAccountDependencyFailureAsError: (...args: unknown[]) =>
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock(...args),
}));

vi.mock("@/lib/billing/env", () => ({
  getStripeBillingConfig: mocks.getStripeBillingConfigMock,
  getStripeCheckoutConfigDiagnostics: mocks.getStripeCheckoutConfigDiagnosticsMock,
  describeStripeCheckoutConfigIssues: mocks.describeStripeCheckoutConfigIssuesMock,
}));

vi.mock("@/lib/billing/stripe", () => ({
  createStripeCustomer: mocks.createStripeCustomerMock,
  createStripeCheckoutSession: mocks.createStripeCheckoutSessionMock,
  retrieveStripeCheckoutSession: mocks.retrieveStripeCheckoutSessionMock,
}));

vi.mock("@/lib/billing/store", () => ({
  getStoredBillingProfileForUser: mocks.getStoredBillingProfileForUserMock,
  linkStripeCustomerToUser: mocks.linkStripeCustomerToUserMock,
}));

vi.mock("@/lib/achievements/service", () => ({
  getAchievementRewardForCheckout: mocks.getAchievementRewardForCheckoutMock,
  reserveAchievementRewardForCheckout: mocks.reserveAchievementRewardForCheckoutMock,
  attachAchievementRewardCheckoutSession: mocks.attachAchievementRewardCheckoutSessionMock,
  releaseAchievementRewardCheckoutClaim: mocks.releaseAchievementRewardCheckoutClaimMock,
}));

function buildSignedInFreeSession() {
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
  };
}

function buildRawPostgrestError() {
  return {
    code: "PGRST301",
    message: "JWT invalid",
    details: "Problem decoding the JWT",
    hint: null,
  };
}

describe("billing checkout route", () => {
  beforeEach(() => {
    mocks.describeOptionalAccountDependencyFailureMock.mockImplementation(
      (error: unknown, relationName?: string) => ({
        kind: "query_failed",
        code:
          error && typeof error === "object" && "code" in error && typeof error.code === "string"
            ? error.code
            : null,
        message:
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
            ? error.message
            : null,
        relationName: typeof relationName === "string" ? relationName : null,
      }),
    );
    mocks.shouldLogOptionalAccountDependencyFailureAsErrorMock.mockReturnValue(true);
  });

  afterEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("rejects signed-out users", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("sign_in_required");
  });

  it("rejects checkout when billing is not configured", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({});
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: false,
      issues: ["missing_price_id"],
      hasSecretKey: true,
      hasPremiumPriceId: false,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.describeStripeCheckoutConfigIssuesMock.mockReturnValue(
      "Supporter checkout is unavailable because the Supporter price id is missing.",
    );

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
      error: string;
      configIssues: string[];
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("billing_unavailable");
    expect(payload.error).toMatch(/supporter price id is missing/i);
    expect(payload.configIssues).toEqual(["missing_price_id"]);
  });

  it("rejects checkout when Stripe webhooks are not configured for entitlement sync", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({});
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: false,
      issues: ["missing_webhook_secret"],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.describeStripeCheckoutConfigIssuesMock.mockReturnValue(
      "Supporter checkout is unavailable because the Stripe webhook secret is missing.",
    );

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
      error: string;
      configIssues: string[];
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("billing_unavailable");
    expect(payload.error).toMatch(/webhook secret is missing/i);
    expect(payload.configIssues).toEqual(["missing_webhook_secret"]);
  });

  it("rejects dev harness fixture users before they hit real Stripe checkout", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      ...buildSignedInFreeSession(),
      user: {
        ...buildSignedInFreeSession().user,
        id: "dev-free-learner",
      },
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("billing_requires_real_account");
    expect(payload.error).toMatch(/real signed-in staging account/i);
    expect(mocks.createStripeCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("creates a checkout session for a signed-in free user with an existing customer", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue(null);
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.url).toBe("https://checkout.stripe.test/session");
    expect(mocks.createStripeCustomerMock).not.toHaveBeenCalled();
    expect(mocks.createStripeCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_existing",
      rewardCouponId: null,
      rewardKey: null,
    });
  });

  it("passes a requested locale through to Stripe checkout session creation", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      webhookSecret: "whsec_test",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue(null);
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_zh_hk",
      url: "https://checkout.stripe.test/session",
    });

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale: "zh-HK",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createStripeCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_existing",
      rewardCouponId: null,
      rewardKey: null,
      locale: "zh-HK",
    });
  });

  it("rejects checkout when the deployment return URLs are invalid", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      checkoutSuccessUrl: "http://localhost:3000/account?billing=checkout-returned",
      checkoutCancelUrl: "http://localhost:3000/pricing?billing=checkout-canceled#compare",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: false,
      issues: ["invalid_checkout_success_url", "invalid_checkout_cancel_url"],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "localhost:3000",
      checkoutCancelUrlHost: "localhost:3000",
    });
    mocks.describeStripeCheckoutConfigIssuesMock.mockReturnValue(
      "Supporter checkout is unavailable because the checkout success return URL is invalid and the checkout cancel return URL is invalid.",
    );

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
      configIssues: string[];
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("billing_unavailable");
    expect(payload.configIssues).toEqual([
      "invalid_checkout_success_url",
      "invalid_checkout_cancel_url",
    ]);
  });

  it("creates and stores a Stripe customer before checkout when the user has none", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      webhookSecret: "whsec_test",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue(null);
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue(null);
    mocks.createStripeCustomerMock.mockResolvedValue({
      id: "cus_created",
    });
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));

    expect(response.status).toBe(200);
    expect(mocks.createStripeCustomerMock).toHaveBeenCalledWith({
      userId: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
    });
    expect(mocks.linkStripeCustomerToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_created",
    });
  });

  it("continues checkout when the billing profile lookup throws a raw PostgREST object", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      webhookSecret: "whsec_test",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockRejectedValue(buildRawPostgrestError());
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue(null);
    mocks.createStripeCustomerMock.mockResolvedValue({
      id: "cus_created",
    });
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.createStripeCustomerMock).toHaveBeenCalledWith({
      userId: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
    });
    expect(mocks.createStripeCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_created",
      rewardCouponId: null,
      rewardKey: null,
    });
  });

  it("continues checkout when linking the Stripe customer to the billing profile throws a raw PostgREST object", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      webhookSecret: "whsec_test",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue(null);
    mocks.linkStripeCustomerToUserMock.mockRejectedValue(buildRawPostgrestError());
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue(null);
    mocks.createStripeCustomerMock.mockResolvedValue({
      id: "cus_created",
    });
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.linkStripeCustomerToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_created",
    });
    expect(mocks.createStripeCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_created",
      rewardCouponId: null,
      rewardKey: null,
    });
  });

  it("continues checkout without a reward coupon when reward lookup throws a raw PostgREST object", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      achievementRewardCouponId: "coupon_achievement_25",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockRejectedValue(buildRawPostgrestError());
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.createStripeCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_existing",
      rewardCouponId: null,
      rewardKey: null,
    });
  });

  it("returns the Stripe message when checkout session creation fails", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue(null);
    mocks.createStripeCheckoutSessionMock.mockRejectedValue(
      new Error("Stripe rejected the checkout session."),
    );

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
      checkpoint: string;
      provider: string | null;
      error: string;
      name: string | null;
      supabaseCode: string | null;
      details: string | null;
      hint: string | null;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("checkout_session_failed");
    expect(payload.checkpoint).toBe("stripe_checkout_session_creation");
    expect(payload.provider).toBe("stripe");
    expect(payload.error).toBe("Stripe rejected the checkout session.");
    expect(payload.name).toBe("Error");
    expect(payload.supabaseCode).toBeNull();
    expect(payload.details).toBeNull();
    expect(payload.hint).toBeNull();
  });

  it("returns a structured failure payload when a non-Error object escapes the strict checkout path", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      achievementRewardCouponId: "coupon_achievement_25",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue({
      status: "unlocked",
    });
    mocks.reserveAchievementRewardForCheckoutMock.mockRejectedValue(buildRawPostgrestError());

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
      checkpoint: string;
      provider: string | null;
      error: string;
      name: string | null;
      supabaseCode: string | null;
      details: string | null;
      hint: string | null;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("checkout_session_failed");
    expect(payload.checkpoint).toBe("reward_reserve");
    expect(payload.provider).toBe("supabase");
    expect(payload.error).toBe("JWT invalid");
    expect(payload.name).toBeNull();
    expect(payload.supabaseCode).toBe("PGRST301");
    expect(payload.details).toBe("Problem decoding the JWT");
    expect(payload.hint).toBeNull();
  });

  it("applies the earned discount server-side when the free user has an unlocked reward", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      achievementRewardCouponId: "coupon_achievement_25",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValueOnce({
      status: "unlocked",
    });
    mocks.reserveAchievementRewardForCheckoutMock.mockResolvedValue({
      status: "claimed",
      claimed_at: "2026-04-03T00:00:00.000Z",
      claim_checkout_session_id: null,
    });
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_reward_123",
      url: "https://checkout.stripe.test/reward-session",
    });
    mocks.attachAchievementRewardCheckoutSessionMock.mockResolvedValue({
      status: "claimed",
      claim_checkout_session_id: "cs_reward_123",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.createStripeCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_existing",
      rewardCouponId: "coupon_achievement_25",
      rewardKey: ACHIEVEMENT_REWARD_KEY,
      idempotencyKey: "open-model-lab-reward-checkout-user-1-2026-04-03T00:00:00.000Z",
    });
    expect(mocks.attachAchievementRewardCheckoutSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      checkoutSessionId: "cs_reward_123",
      couponId: "coupon_achievement_25",
      priceId: "price_premium",
    });
  });

  it("reuses the same discounted checkout when the reward is already claimed and the session is still open", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      achievementRewardCouponId: "coupon_achievement_25",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue({
      status: "claimed",
      claimed_at: "2026-04-03T00:00:00.000Z",
      claim_checkout_session_id: "cs_existing",
    });
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_existing",
      object: "checkout.session",
      status: "open",
      url: "https://checkout.stripe.test/existing",
      mode: "subscription",
      customer: "cus_existing",
      subscription: null,
      client_reference_id: "user-1",
      metadata: {
        user_id: "user-1",
        reward_key: ACHIEVEMENT_REWARD_KEY,
      },
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.url).toBe("https://checkout.stripe.test/existing");
    expect(mocks.createStripeCheckoutSessionMock).not.toHaveBeenCalled();
    expect(mocks.reserveAchievementRewardForCheckoutMock).not.toHaveBeenCalled();
  });

  it("does not burn the reward when the reserved checkout already expired", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      achievementRewardCouponId: "coupon_achievement_25",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock
      .mockResolvedValueOnce({
        status: "claimed",
        claimed_at: "2026-04-03T00:00:00.000Z",
        claim_checkout_session_id: "cs_expired",
      })
      .mockResolvedValueOnce({
        status: "unlocked",
      });
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_expired",
      object: "checkout.session",
      status: "expired",
      url: null,
      mode: "subscription",
      customer: "cus_existing",
      subscription: null,
      client_reference_id: "user-1",
      metadata: {
        user_id: "user-1",
        reward_key: ACHIEVEMENT_REWARD_KEY,
      },
    });
    mocks.releaseAchievementRewardCheckoutClaimMock.mockResolvedValue({
      status: "unlocked",
    });
    mocks.reserveAchievementRewardForCheckoutMock.mockResolvedValue({
      status: "claimed",
      claimed_at: "2026-04-03T00:10:00.000Z",
      claim_checkout_session_id: null,
    });
    mocks.createStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_reward_456",
      url: "https://checkout.stripe.test/restarted",
    });
    mocks.attachAchievementRewardCheckoutSessionMock.mockResolvedValue({
      status: "claimed",
      claim_checkout_session_id: "cs_reward_456",
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.url).toBe("https://checkout.stripe.test/restarted");
    expect(mocks.releaseAchievementRewardCheckoutClaimMock).toHaveBeenCalledWith({
      userId: "user-1",
      checkoutSessionId: "cs_expired",
    });
  });

  it("returns a pending activation error after a completed discounted checkout instead of creating another discount", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInFreeSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
      premiumPriceId: "price_premium",
      achievementRewardCouponId: "coupon_achievement_25",
    });
    mocks.getStripeCheckoutConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      hasPremiumPriceId: true,
      checkoutSuccessUrlHost: "openmodellab.com",
      checkoutCancelUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_existing",
    });
    mocks.getAchievementRewardForCheckoutMock.mockResolvedValue({
      status: "claimed",
      claimed_at: "2026-04-03T00:00:00.000Z",
      claim_checkout_session_id: "cs_complete",
    });
    mocks.retrieveStripeCheckoutSessionMock.mockResolvedValue({
      id: "cs_complete",
      object: "checkout.session",
      status: "complete",
      url: null,
      mode: "subscription",
      customer: "cus_existing",
      subscription: "sub_reward",
      client_reference_id: "user-1",
      metadata: {
        user_id: "user-1",
        reward_key: ACHIEVEMENT_REWARD_KEY,
      },
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("reward_checkout_pending_activation");
    expect(mocks.createStripeCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("rejects users who already have premium", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      ...buildSignedInFreeSession(),
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
    });

    const response = await POST(new Request("http://localhost/api/billing/checkout"));
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("already_premium");
  });
});
