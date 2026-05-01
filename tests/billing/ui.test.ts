// @vitest-environment node

import { describe, expect, it } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  deriveBillingLifecycleStatus,
  deriveBillingReturnStatus,
  getBillingLifecycleLabel,
  getBillingLifecycleLabelWithDate,
  parseBillingReturnQueryState,
} from "@/lib/billing/ui";

describe("billing UI helpers", () => {
  it("maps manual premium separately from Stripe-backed billing", () => {
    expect(
      deriveBillingLifecycleStatus({
        entitlement: resolveAccountEntitlement({
          tier: "premium",
          source: "stored",
          updatedAt: "2026-04-02T00:00:00.000Z",
        }),
        billing: {
          source: "manual",
          status: "active",
          canStartCheckout: false,
          canManageSubscription: false,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        },
      }),
    ).toBe("manual_premium");
  });

  it("maps cancel-at-period-end subscriptions to a premium-ending state", () => {
    expect(
      deriveBillingLifecycleStatus({
        entitlement: resolveAccountEntitlement({
          tier: "premium",
          source: "stored",
          updatedAt: "2026-04-02T00:00:00.000Z",
        }),
        billing: {
          source: "stripe",
          status: "canceling",
          canStartCheckout: false,
          canManageSubscription: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: "2026-05-02T00:00:00.000Z",
        },
      }),
    ).toBe("active_canceling_at_period_end");
    expect(
      getBillingLifecycleLabelWithDate(
        "active_canceling_at_period_end",
        "2026-05-02T00:00:00.000Z",
      ),
    ).toBe("Active, cancels on May 2, 2026");
  });

  it("keeps the fallback label when the cancel date is unavailable", () => {
    expect(getBillingLifecycleLabel("active_canceling_at_period_end")).toBe(
      "Active until period end",
    );
  });

  it("maps past due subscriptions to payment issues without restoring premium access", () => {
    expect(
      deriveBillingLifecycleStatus({
        entitlement: resolveAccountEntitlement({
          tier: "free",
          source: "stored",
          updatedAt: "2026-04-02T00:00:00.000Z",
        }),
        billing: {
          source: "stripe",
          status: "past_due",
          canStartCheckout: false,
          canManageSubscription: true,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: "2026-05-02T00:00:00.000Z",
        },
      }),
    ).toBe("payment_issue");
  });

  it("parses billing return query states safely", () => {
    expect(parseBillingReturnQueryState("?billing=checkout-returned")).toBe(
      "checkout-returned",
    );
    expect(parseBillingReturnQueryState("?billing=portal-returned")).toBe(
      "portal-returned",
    );
    expect(parseBillingReturnQueryState("?billing=unknown")).toBeNull();
  });

  it("treats checkout-returned as incomplete when Stripe reports a payment issue", () => {
    expect(
      deriveBillingReturnStatus({
        queryState: "checkout-returned",
        lifecycleStatus: "payment_issue",
        phase: "resolved",
      }),
    ).toBe("checkout_return_incomplete");
  });

  it("keeps checkout-returned pending until a terminal billing state appears", () => {
    expect(
      deriveBillingReturnStatus({
        queryState: "checkout-returned",
        lifecycleStatus: "not_started",
        phase: "pending",
      }),
    ).toBe("checkout_return_pending");

    expect(
      deriveBillingReturnStatus({
        queryState: "checkout-returned",
        lifecycleStatus: "not_started",
        phase: "timed_out",
      }),
    ).toBe("checkout_return_still_processing");
  });
});
