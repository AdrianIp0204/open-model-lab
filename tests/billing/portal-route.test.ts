// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/portal/route";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getStripeBillingConfigMock: vi.fn(),
  getStripeBillingPortalConfigDiagnosticsMock: vi.fn(),
  describeStripeBillingPortalConfigIssuesMock: vi.fn(),
  createStripeBillingPortalSessionMock: vi.fn(),
  getStoredBillingProfileForUserMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
}));

vi.mock("@/lib/billing/env", () => ({
  getStripeBillingConfig: mocks.getStripeBillingConfigMock,
  getStripeBillingPortalConfigDiagnostics:
    mocks.getStripeBillingPortalConfigDiagnosticsMock,
  describeStripeBillingPortalConfigIssues:
    mocks.describeStripeBillingPortalConfigIssuesMock,
}));

vi.mock("@/lib/billing/stripe", () => ({
  createStripeBillingPortalSession: mocks.createStripeBillingPortalSessionMock,
}));

vi.mock("@/lib/billing/store", () => ({
  getStoredBillingProfileForUser: mocks.getStoredBillingProfileForUserMock,
}));

function buildSignedInPremiumSession() {
  return {
    user: {
      id: "user-1",
      email: "premium@example.com",
      displayName: "Supporter Student",
      createdAt: "2026-04-02T00:00:00.000Z",
      lastSignedInAt: "2026-04-02T00:00:00.000Z",
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
  };
}

describe("billing portal route", () => {
  afterEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("rejects signed-out users", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/billing/portal"));
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("sign_in_required");
  });

  it("rejects management when billing is not configured", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInPremiumSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({});
    mocks.getStripeBillingPortalConfigDiagnosticsMock.mockReturnValue({
      configured: false,
      issues: ["invalid_portal_return_url"],
      hasSecretKey: true,
      portalReturnUrlHost: "localhost:3000",
    });
    mocks.describeStripeBillingPortalConfigIssuesMock.mockReturnValue(
      "Subscription management is unavailable because the billing portal return URL is invalid.",
    );

    const response = await POST(new Request("http://localhost/api/billing/portal"));
    const payload = (await response.json()) as {
      code: string;
      error: string;
      configIssues: string[];
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("billing_unavailable");
    expect(payload.error).toMatch(/billing portal return url is invalid/i);
    expect(payload.configIssues).toEqual(["invalid_portal_return_url"]);
  });

  it("rejects management when Stripe webhooks are not configured for portal updates", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInPremiumSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({});
    mocks.getStripeBillingPortalConfigDiagnosticsMock.mockReturnValue({
      configured: false,
      issues: ["missing_webhook_secret"],
      hasSecretKey: true,
      portalReturnUrlHost: "openmodellab.com",
    });
    mocks.describeStripeBillingPortalConfigIssuesMock.mockReturnValue(
      "Subscription management is unavailable because the Stripe webhook secret is missing.",
    );

    const response = await POST(new Request("http://localhost/api/billing/portal"));
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

  it("rejects dev harness fixture users before they hit real Stripe billing portal", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      ...buildSignedInPremiumSession(),
      user: {
        ...buildSignedInPremiumSession().user,
        id: "dev-premium-learner",
      },
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
    });
    mocks.getStripeBillingPortalConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      portalReturnUrlHost: "openmodellab.com",
    });

    const response = await POST(new Request("http://localhost/api/billing/portal"));
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("billing_requires_real_account");
    expect(payload.error).toMatch(/real signed-in staging account/i);
    expect(mocks.createStripeBillingPortalSessionMock).not.toHaveBeenCalled();
  });

  it("creates a billing portal session for an eligible premium account", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInPremiumSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
    });
    mocks.getStripeBillingPortalConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      portalReturnUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_premium",
    });
    mocks.createStripeBillingPortalSessionMock.mockResolvedValue({
      id: "bps_123",
      url: "https://billing.stripe.test/session",
    });

    const response = await POST(new Request("http://localhost/api/billing/portal"));
    const payload = (await response.json()) as {
      ok: boolean;
      url: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.url).toBe("https://billing.stripe.test/session");
    expect(mocks.createStripeBillingPortalSessionMock).toHaveBeenCalledWith({
      customerId: "cus_premium",
    });
  });

  it("passes a requested locale through to Stripe billing portal session creation", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(buildSignedInPremiumSession());
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
    });
    mocks.getStripeBillingPortalConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      portalReturnUrlHost: "openmodellab.com",
    });
    mocks.getStoredBillingProfileForUserMock.mockResolvedValue({
      stripe_customer_id: "cus_premium",
    });
    mocks.createStripeBillingPortalSessionMock.mockResolvedValue({
      id: "bps_zh_hk",
      url: "https://billing.stripe.test/session",
    });

    const response = await POST(
      new Request("http://localhost/api/billing/portal", {
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
    expect(mocks.createStripeBillingPortalSessionMock).toHaveBeenCalledWith({
      customerId: "cus_premium",
      locale: "zh-HK",
    });
  });

  it("rejects accounts without a manageable Stripe subscription", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      ...buildSignedInPremiumSession(),
      billing: {
        source: "manual",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });
    mocks.getStripeBillingConfigMock.mockReturnValue({
      secretKey: "sk_test_123",
    });
    mocks.getStripeBillingPortalConfigDiagnosticsMock.mockReturnValue({
      configured: true,
      issues: [],
      hasSecretKey: true,
      portalReturnUrlHost: "openmodellab.com",
    });

    const response = await POST(new Request("http://localhost/api/billing/portal"));
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("billing_management_unavailable");
  });
});
