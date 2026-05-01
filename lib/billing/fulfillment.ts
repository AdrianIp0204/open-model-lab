import { stripeSubscriptionStatusSchema, hasStripePremiumAccess } from "./model";
import type { StripeCheckoutSessionObject, StripeSubscriptionObject } from "./stripe";
import {
  applyStripeSubscriptionStateToUser,
  getUserIdForStripeCustomer,
  getUserIdForStripeSubscriptionId,
  type StoredBillingProfileRow,
} from "./store";
import { ACHIEVEMENT_REWARD_KEY } from "@/lib/achievements";
import {
  markAchievementRewardUsed,
  releaseAchievementRewardCheckoutClaim,
} from "@/lib/achievements/service";

export function toIsoFromUnixSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getUserIdFromMetadata(metadata: Record<string, string>) {
  const value = metadata.user_id?.trim();
  return value ? value : null;
}

export async function resolveUserIdForStripeCheckoutSession(
  session: StripeCheckoutSessionObject,
) {
  if (session.customer) {
    return (
      getUserIdFromMetadata(session.metadata) ??
      session.client_reference_id ??
      (typeof session.subscription === "string"
        ? await getUserIdForStripeSubscriptionId(session.subscription)
        : null) ??
      (await getUserIdForStripeCustomer(session.customer))
    );
  }

  return (
    getUserIdFromMetadata(session.metadata) ??
    session.client_reference_id ??
    (typeof session.subscription === "string"
      ? await getUserIdForStripeSubscriptionId(session.subscription)
      : null) ??
    null
  );
}

export async function resolveUserIdForStripeSubscription(
  subscription: StripeSubscriptionObject,
) {
  return (
    getUserIdFromMetadata(subscription.metadata) ??
    (await getUserIdForStripeSubscriptionId(subscription.id)) ??
    (await getUserIdForStripeCustomer(subscription.customer))
  );
}

export function getStripeSubscriptionPrimaryPriceId(
  subscription: StripeSubscriptionObject,
) {
  return subscription.items?.data[0]?.price?.id?.trim() || null;
}

function getStripeSubscriptionSnapshot(subscription: StripeSubscriptionObject) {
  const parsedStatus = stripeSubscriptionStatusSchema.safeParse(subscription.status);

  if (!parsedStatus.success) {
    return null;
  }

  return {
    subscriptionStatus: parsedStatus.data,
    priceId: getStripeSubscriptionPrimaryPriceId(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: toIsoFromUnixSeconds(subscription.current_period_end),
    rewardKey: subscription.metadata.reward_key?.trim() || null,
  };
}

function sessionUserHasRewardedPremiumAccess(input: {
  subscriptionStatus: string;
  rewardKey: string | null;
}) {
  return (
    input.rewardKey === ACHIEVEMENT_REWARD_KEY &&
    ["active", "trialing"].includes(input.subscriptionStatus)
  );
}

function subscriptionRewardClaimShouldBeReleased(input: {
  subscriptionStatus: string;
  rewardKey: string | null;
}) {
  return (
    input.rewardKey === ACHIEVEMENT_REWARD_KEY &&
    ["canceled", "incomplete_expired"].includes(input.subscriptionStatus)
  );
}

export function isBillingProfileSyncedToStripeSubscription(input: {
  billingProfile: StoredBillingProfileRow | null;
  entitlementTier: "free" | "premium";
  subscription: StripeSubscriptionObject;
}) {
  const subscriptionSnapshot = getStripeSubscriptionSnapshot(input.subscription);

  if (!input.billingProfile || !subscriptionSnapshot) {
    return false;
  }

  const expectedEntitlementTier = hasStripePremiumAccess(
    subscriptionSnapshot.subscriptionStatus,
  )
    ? "premium"
    : "free";

  return (
    input.entitlementTier === expectedEntitlementTier &&
    input.billingProfile.stripe_customer_id === input.subscription.customer &&
    input.billingProfile.stripe_subscription_id === input.subscription.id &&
    input.billingProfile.stripe_price_id === subscriptionSnapshot.priceId &&
    input.billingProfile.stripe_subscription_status ===
      subscriptionSnapshot.subscriptionStatus &&
    input.billingProfile.stripe_subscription_cancel_at_period_end ===
      subscriptionSnapshot.cancelAtPeriodEnd &&
    input.billingProfile.stripe_subscription_current_period_end ===
      subscriptionSnapshot.currentPeriodEnd
  );
}

export async function applyStripeSubscriptionForUser(input: {
  userId: string;
  subscription: StripeSubscriptionObject;
  eventCreatedAt: string;
}) {
  const subscriptionSnapshot = getStripeSubscriptionSnapshot(input.subscription);

  if (!subscriptionSnapshot) {
    return {
      handled: false as const,
      stale: false as const,
      entitlementTier: null,
      subscriptionStatus: null,
      reason: "unknown_subscription_status" as const,
    };
  }

  const result = await applyStripeSubscriptionStateToUser({
    userId: input.userId,
    customerId: input.subscription.customer,
    subscriptionId: input.subscription.id,
    priceId: subscriptionSnapshot.priceId,
    subscriptionStatus: subscriptionSnapshot.subscriptionStatus,
    cancelAtPeriodEnd: subscriptionSnapshot.cancelAtPeriodEnd,
    currentPeriodEnd: subscriptionSnapshot.currentPeriodEnd,
    eventCreatedAt: input.eventCreatedAt,
  });

  if (
    result.applied &&
    sessionUserHasRewardedPremiumAccess({
      subscriptionStatus: subscriptionSnapshot.subscriptionStatus,
      rewardKey: subscriptionSnapshot.rewardKey,
    })
  ) {
    await markAchievementRewardUsed({
      userId: input.userId,
      subscriptionId: input.subscription.id,
    });
  } else if (
    subscriptionRewardClaimShouldBeReleased({
      subscriptionStatus: subscriptionSnapshot.subscriptionStatus,
      rewardKey: subscriptionSnapshot.rewardKey,
    })
  ) {
    await releaseAchievementRewardCheckoutClaim({
      userId: input.userId,
    });
  }

  return {
    handled: result.applied,
    stale: result.stale,
    entitlementTier: result.entitlementTier,
    subscriptionStatus: subscriptionSnapshot.subscriptionStatus,
    reason: null,
  };
}
