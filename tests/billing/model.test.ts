// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  deriveEntitlementTierFromBillingSummary,
  hasStripePremiumAccess,
  toAccountBillingSummaryFromStripe,
} from "@/lib/billing/model";

describe("billing model helpers", () => {
  it("treats active subscriptions as premium access", () => {
    expect(hasStripePremiumAccess("active")).toBe(true);
    expect(hasStripePremiumAccess("trialing")).toBe(true);
    expect(hasStripePremiumAccess("past_due")).toBe(false);
    expect(hasStripePremiumAccess("canceled")).toBe(false);
  });

  it("maps cancel-at-period-end subscriptions to canceling while preserving premium", () => {
    expect(
      toAccountBillingSummaryFromStripe({
        subscriptionStatus: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      }),
    ).toEqual({
      source: "stripe",
      status: "canceling",
      canStartCheckout: false,
      canManageSubscription: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-05-02T00:00:00.000Z",
    });
  });

  it("maps ended subscriptions back to checkout-eligible free billing state", () => {
    expect(
      toAccountBillingSummaryFromStripe({
        subscriptionStatus: "canceled",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      source: "stripe",
      status: "ended",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
  });

  it("derives the effective entitlement tier from Stripe-backed billing summaries", () => {
    expect(
      deriveEntitlementTierFromBillingSummary({
        source: "stripe",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toBe("premium");
    expect(
      deriveEntitlementTierFromBillingSummary({
        source: "stripe",
        status: "canceling",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      }),
    ).toBe("premium");
    expect(
      deriveEntitlementTierFromBillingSummary({
        source: "stripe",
        status: "past_due",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toBe("free");
    expect(
      deriveEntitlementTierFromBillingSummary({
        source: "stripe",
        status: "ended",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toBe("free");
    expect(
      deriveEntitlementTierFromBillingSummary({
        source: "manual",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toBeNull();
  });
});
