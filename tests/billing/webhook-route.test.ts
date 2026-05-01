// @vitest-environment node

import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/webhook/route";

const mocks = vi.hoisted(() => ({
  getStripeBillingConfigMock: vi.fn(),
  isStripeWebhookConfiguredMock: vi.fn(),
  parseVerifiedStripeWebhookEventMock: vi.fn(),
  processStripeWebhookEventMock: vi.fn(),
}));

vi.mock("@/lib/billing/env", () => ({
  getStripeBillingConfig: mocks.getStripeBillingConfigMock,
  isStripeWebhookConfigured: mocks.isStripeWebhookConfiguredMock,
}));

vi.mock("@/lib/billing/webhooks", () => ({
  parseVerifiedStripeWebhookEvent: mocks.parseVerifiedStripeWebhookEventMock,
  processStripeWebhookEvent: mocks.processStripeWebhookEventMock,
}));

function signStripePayload(payload: string, secret: string, timestamp: number) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

describe("billing webhook route", () => {
  afterEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("rejects requests when Stripe webhooks are not configured", async () => {
    mocks.getStripeBillingConfigMock.mockReturnValue({});
    mocks.isStripeWebhookConfiguredMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("billing_unavailable");
  });

  it("rejects invalid webhook signatures", async () => {
    mocks.getStripeBillingConfigMock.mockReturnValue({
      webhookSecret: "whsec_test",
      secretKey: "sk_test",
    });
    mocks.isStripeWebhookConfiguredMock.mockReturnValue(true);

    const response = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "t=123,v1=invalid",
        },
        body: JSON.stringify({
          id: "evt_bad",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_signature");
  });

  it("verifies the signature and processes the event", async () => {
    const payload = JSON.stringify({
      id: "evt_valid",
      type: "customer.subscription.updated",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {},
      },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookSecret = "whsec_test";

    mocks.getStripeBillingConfigMock.mockReturnValue({
      webhookSecret,
      secretKey: "sk_test",
    });
    mocks.isStripeWebhookConfiguredMock.mockReturnValue(true);
    mocks.parseVerifiedStripeWebhookEventMock.mockReturnValue({
      id: "evt_valid",
      type: "customer.subscription.updated",
      created: timestamp,
      data: {
        object: {},
      },
    });
    mocks.processStripeWebhookEventMock.mockResolvedValue({
      duplicate: false,
      handled: true,
      entitlementTier: "premium",
    });

    const response = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": signStripePayload(payload, webhookSecret, timestamp),
        },
        body: payload,
      }),
    );
    const json = (await response.json()) as {
      ok: boolean;
      handled: boolean;
      entitlementTier: string;
    };

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.handled).toBe(true);
    expect(json.entitlementTier).toBe("premium");
    expect(mocks.parseVerifiedStripeWebhookEventMock).toHaveBeenCalledWith(payload);
    expect(mocks.processStripeWebhookEventMock).toHaveBeenCalledOnce();
  });

  it("returns 500 so Stripe can retry when webhook processing is not complete yet", async () => {
    const payload = JSON.stringify({
      id: "evt_retry",
      type: "customer.subscription.updated",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {},
      },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookSecret = "whsec_test";

    mocks.getStripeBillingConfigMock.mockReturnValue({
      webhookSecret,
      secretKey: "sk_test",
    });
    mocks.isStripeWebhookConfiguredMock.mockReturnValue(true);
    mocks.parseVerifiedStripeWebhookEventMock.mockReturnValue({
      id: "evt_retry",
      type: "customer.subscription.updated",
      created: timestamp,
      data: {
        object: {},
      },
    });
    mocks.processStripeWebhookEventMock.mockRejectedValue(
      Object.assign(new Error("retryable_stripe_webhook_unknown_user"), {
        code: "unknown_user",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": signStripePayload(payload, webhookSecret, timestamp),
        },
        body: payload,
      }),
    );
    const json = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(500);
    expect(json.code).toBe("webhook_processing_failed");
  });
});
