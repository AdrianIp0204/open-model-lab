import { z } from "zod";
import type {
  AccountEntitlementTier,
  ResolvedAccountEntitlement,
} from "@/lib/account/entitlements";

export const stripeSubscriptionStatusSchema = z.enum([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

export type StripeSubscriptionStatus = z.infer<typeof stripeSubscriptionStatusSchema>;

export const accountBillingSummaryStatusSchema = z.enum([
  "none",
  "active",
  "canceling",
  "past_due",
  "incomplete",
  "ended",
]);

export type AccountBillingSummaryStatus = z.infer<
  typeof accountBillingSummaryStatusSchema
>;

export type AccountBillingSummary = {
  source: "none" | "manual" | "stripe";
  status: AccountBillingSummaryStatus;
  canStartCheckout: boolean;
  canManageSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

export function getDefaultAccountBillingSummary(
  entitlement: ResolvedAccountEntitlement,
): AccountBillingSummary {
  if (entitlement.tier === "premium") {
    return {
      source: "manual",
      status: "active",
      canStartCheckout: false,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
  }

  return {
    source: "none",
    status: "none",
    canStartCheckout: true,
    canManageSubscription: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}

export function hasStripePremiumAccess(status: StripeSubscriptionStatus) {
  return status === "active" || status === "trialing";
}

export function toAccountBillingSummaryFromStripe(input: {
  subscriptionStatus: StripeSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}): AccountBillingSummary {
  switch (input.subscriptionStatus) {
    case "active":
    case "trialing":
      return {
        source: "stripe",
        status: input.cancelAtPeriodEnd ? "canceling" : "active",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        currentPeriodEnd: input.currentPeriodEnd,
      };
    case "past_due":
    case "unpaid":
      return {
        source: "stripe",
        status: "past_due",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        currentPeriodEnd: input.currentPeriodEnd,
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        source: "stripe",
        status: "incomplete",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: input.currentPeriodEnd,
      };
    case "canceled":
    case "paused":
    default:
      return {
        source: "stripe",
        status: "ended",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: input.currentPeriodEnd,
      };
  }
}

export function deriveEntitlementTierFromBillingSummary(
  billing: AccountBillingSummary | null,
): AccountEntitlementTier | null {
  if (!billing || billing.source !== "stripe") {
    return null;
  }

  switch (billing.status) {
    case "active":
    case "canceling":
      return "premium";
    case "past_due":
    case "incomplete":
    case "ended":
      return "free";
    default:
      return null;
  }
}
