// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { processStripeWebhookEvent } from "@/lib/billing/webhooks";

const mocks = vi.hoisted(() => ({
  recordProcessedStripeWebhookEventMock: vi.fn(),
  deleteProcessedStripeWebhookEventMock: vi.fn(),
  getUserIdForStripeCustomerMock: vi.fn(),
  getUserIdForStripeSubscriptionIdMock: vi.fn(),
  linkStripeCustomerToUserMock: vi.fn(),
  applyStripeSubscriptionStateToUserMock: vi.fn(),
  retrieveStripeSubscriptionMock: vi.fn(),
  markAchievementRewardUsedMock: vi.fn(),
  releaseAchievementRewardCheckoutClaimMock: vi.fn(),
}));

vi.mock("@/lib/billing/store", () => ({
  recordProcessedStripeWebhookEvent: mocks.recordProcessedStripeWebhookEventMock,
  deleteProcessedStripeWebhookEvent: mocks.deleteProcessedStripeWebhookEventMock,
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

vi.mock("@/lib/billing/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/billing/stripe")>(
    "@/lib/billing/stripe",
  );

  return {
    ...actual,
    retrieveStripeSubscription: mocks.retrieveStripeSubscriptionMock,
  };
});

describe("processStripeWebhookEvent", () => {
  afterEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("dedupes replayed webhook events", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(false);

    const result = await processStripeWebhookEvent({
      id: "evt_dup",
      type: "customer.subscription.updated",
      created: 1_712_000_000,
      data: {
        object: {},
      },
    });

    expect(result).toEqual({
      duplicate: true,
      handled: true,
    });
  });

  it("falls back to the stored subscription id when Stripe metadata and customer linking are missing", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.getUserIdForStripeCustomerMock.mockResolvedValue(null);
    mocks.getUserIdForStripeSubscriptionIdMock.mockResolvedValue("user-1");
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "premium",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_fallback",
      type: "customer.subscription.updated",
      created: 1_712_000_100,
      data: {
        object: {
          object: "subscription",
          id: "sub_fallback",
          customer: "cus_unknown",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: 1_712_086_400,
          metadata: {},
          items: {
            data: [
              {
                price: {
                  id: "price_premium",
                },
              },
            ],
          },
        },
      },
    });

    expect(mocks.getUserIdForStripeSubscriptionIdMock).toHaveBeenCalledWith(
      "sub_fallback",
    );
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "premium",
    });
  });

  it("links the Stripe customer and applies the live subscription state on checkout completion", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.retrieveStripeSubscriptionMock.mockResolvedValue({
      object: "subscription",
      id: "sub_checkout",
      customer: "cus_checkout",
      status: "active",
      created: 1_712_000_050,
      cancel_at_period_end: false,
      current_period_end: 1_712_086_400,
      metadata: {
        user_id: "user-1",
        reward_key: "premium-first-month-25-off",
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
    });
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "premium",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_checkout",
      type: "checkout.session.completed",
      created: 1_712_000_000,
      data: {
        object: {
          object: "checkout.session",
          id: "cs_test_123",
          mode: "subscription",
          customer: "cus_checkout",
          subscription: "sub_checkout",
          client_reference_id: "user-1",
          metadata: {
            user_id: "user-1",
            reward_key: "premium-first-month-25-off",
          },
        },
      },
    });

    expect(mocks.linkStripeCustomerToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_checkout",
      subscriptionId: "sub_checkout",
    });
    expect(mocks.retrieveStripeSubscriptionMock).toHaveBeenCalledWith("sub_checkout");
    expect(mocks.applyStripeSubscriptionStateToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_checkout",
      subscriptionId: "sub_checkout",
      priceId: "price_premium",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(1_712_086_400 * 1000).toISOString(),
      eventCreatedAt: new Date(1_712_000_050 * 1000).toISOString(),
    });
    expect(mocks.markAchievementRewardUsedMock).toHaveBeenCalledWith({
      userId: "user-1",
      subscriptionId: "sub_checkout",
    });
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "premium",
    });
  });

  it("releases a claimed reward when Stripe expires the checkout session", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);

    const result = await processStripeWebhookEvent({
      id: "evt_checkout_expired",
      type: "checkout.session.expired",
      created: 1_712_000_000,
      data: {
        object: {
          object: "checkout.session",
          id: "cs_reward_123",
          mode: "subscription",
          customer: "cus_checkout",
          subscription: null,
          client_reference_id: "user-1",
          metadata: {
            user_id: "user-1",
            reward_key: "premium-first-month-25-off",
          },
        },
      },
    });

    expect(mocks.releaseAchievementRewardCheckoutClaimMock).toHaveBeenCalledWith({
      userId: "user-1",
      checkoutSessionId: "cs_reward_123",
    });
    expect(mocks.markAchievementRewardUsedMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      duplicate: false,
      handled: true,
    });
  });

  it("marks the earned reward as used only after the subscription becomes active", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "premium",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_active_reward",
      type: "customer.subscription.updated",
      created: 1_712_000_100,
      data: {
        object: {
          object: "subscription",
          id: "sub_active",
          customer: "cus_active",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: 1_712_086_400,
          metadata: {
            user_id: "user-1",
            reward_key: "premium-first-month-25-off",
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
        },
      },
    });

    expect(mocks.markAchievementRewardUsedMock).toHaveBeenCalledWith({
      userId: "user-1",
      subscriptionId: "sub_active",
    });
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "premium",
    });
  });

  it("grants premium from an active subscription update without a reward", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "premium",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_active",
      type: "customer.subscription.updated",
      created: 1_712_000_100,
      data: {
        object: {
          object: "subscription",
          id: "sub_active",
          customer: "cus_active",
          status: "active",
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
        },
      },
    });

    expect(mocks.applyStripeSubscriptionStateToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_active",
      subscriptionId: "sub_active",
      priceId: "price_premium",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(1_712_086_400 * 1000).toISOString(),
      eventCreatedAt: new Date(1_712_000_100 * 1000).toISOString(),
    });
    expect(mocks.markAchievementRewardUsedMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "premium",
    });
  });

  it("keeps premium active while marking cancel-at-period-end subscriptions as canceling", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "premium",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_canceling",
      type: "customer.subscription.updated",
      created: 1_712_000_150,
      data: {
        object: {
          object: "subscription",
          id: "sub_canceling",
          customer: "cus_active",
          status: "active",
          cancel_at_period_end: true,
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
        },
      },
    });

    expect(mocks.applyStripeSubscriptionStateToUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_active",
      subscriptionId: "sub_canceling",
      priceId: "price_premium",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(1_712_086_400 * 1000).toISOString(),
      eventCreatedAt: new Date(1_712_000_150 * 1000).toISOString(),
    });
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "premium",
    });
  });

  it("revokes premium when Stripe marks the subscription canceled", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "free",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_deleted",
      type: "customer.subscription.deleted",
      created: 1_712_000_200,
      data: {
        object: {
          object: "subscription",
          id: "sub_deleted",
          customer: "cus_active",
          status: "canceled",
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
        },
      },
    });

    expect(mocks.applyStripeSubscriptionStateToUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        subscriptionStatus: "canceled",
      }),
    );
    expect(mocks.markAchievementRewardUsedMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "free",
    });
  });

  it("applies dedicated paused subscription events from Stripe billing changes", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "free",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_paused",
      type: "customer.subscription.paused",
      created: 1_712_000_225,
      data: {
        object: {
          object: "subscription",
          id: "sub_paused",
          customer: "cus_active",
          status: "paused",
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
        },
      },
    });

    expect(mocks.applyStripeSubscriptionStateToUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        subscriptionStatus: "paused",
      }),
    );
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "free",
    });
  });

  it("releases a claimed reward when a rewarded subscription expires before activation", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.applyStripeSubscriptionStateToUserMock.mockResolvedValue({
      applied: true,
      stale: false,
      entitlementTier: "free",
    });

    const result = await processStripeWebhookEvent({
      id: "evt_sub_incomplete_expired",
      type: "customer.subscription.updated",
      created: 1_712_000_250,
      data: {
        object: {
          object: "subscription",
          id: "sub_incomplete_expired",
          customer: "cus_active",
          status: "incomplete_expired",
          cancel_at_period_end: false,
          current_period_end: 1_712_086_400,
          metadata: {
            user_id: "user-1",
            reward_key: "premium-first-month-25-off",
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
        },
      },
    });

    expect(mocks.releaseAchievementRewardCheckoutClaimMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(mocks.markAchievementRewardUsedMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      duplicate: false,
      handled: true,
      stale: false,
      entitlementTier: "free",
    });
  });

  it("treats unresolved entitlement-affecting subscription events as retryable instead of acking them", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.getUserIdForStripeCustomerMock.mockResolvedValue(null);
    mocks.getUserIdForStripeSubscriptionIdMock.mockResolvedValue(null);

    await expect(
      processStripeWebhookEvent({
        id: "evt_sub_unknown_user",
        type: "customer.subscription.updated",
        created: 1_712_000_260,
        data: {
          object: {
            object: "subscription",
            id: "sub_unknown_user",
            customer: "cus_unknown",
            status: "active",
            cancel_at_period_end: false,
            current_period_end: 1_712_086_400,
            metadata: {},
            items: {
              data: [
                {
                  price: {
                    id: "price_premium",
                  },
                },
              ],
            },
          },
        },
      }),
    ).rejects.toThrow(/retryable_stripe_webhook_unknown_user/i);

    expect(mocks.deleteProcessedStripeWebhookEventMock).toHaveBeenCalledWith(
      "evt_sub_unknown_user",
    );
  });

  it("removes the processed marker when downstream handling fails", async () => {
    mocks.recordProcessedStripeWebhookEventMock.mockResolvedValue(true);
    mocks.linkStripeCustomerToUserMock.mockRejectedValue(new Error("store_failed"));

    await expect(
      processStripeWebhookEvent({
        id: "evt_retryable",
        type: "checkout.session.completed",
        created: 1_712_000_000,
        data: {
          object: {
            object: "checkout.session",
            id: "cs_retryable",
            mode: "subscription",
            customer: "cus_retryable",
            subscription: "sub_retryable",
            client_reference_id: "user-1",
            metadata: {
              user_id: "user-1",
            },
          },
        },
      }),
    ).rejects.toThrow("store_failed");

    expect(mocks.deleteProcessedStripeWebhookEventMock).toHaveBeenCalledWith(
      "evt_retryable",
    );
  });
});
