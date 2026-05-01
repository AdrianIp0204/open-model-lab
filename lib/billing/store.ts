import {
  accountEntitlementTierSchema,
  type ResolvedAccountEntitlement,
  setStoredAccountEntitlementForUser,
} from "@/lib/account/entitlements";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import {
  getDefaultAccountBillingSummary,
  hasStripePremiumAccess,
  stripeSubscriptionStatusSchema,
  toAccountBillingSummaryFromStripe,
  type AccountBillingSummary,
  type StripeSubscriptionStatus,
} from "./model";

const USER_BILLING_PROFILES_TABLE = "user_billing_profiles";
const PROCESSED_STRIPE_EVENTS_TABLE = "processed_stripe_webhook_events";

export type StoredBillingProfileRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_cancel_at_period_end: boolean;
  stripe_subscription_current_period_end: string | null;
  stripe_last_event_created_at: string | null;
  updated_at: string | null;
};

type ProcessedStripeWebhookEventRow = {
  stripe_event_id: string;
  event_type: string;
  processed_at: string;
};

type BillingProfilePatch = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_subscription_cancel_at_period_end?: boolean;
  stripe_subscription_current_period_end?: string | null;
  stripe_last_event_created_at?: string | null;
};

function createBaseBillingProfileRow(userId: string): StoredBillingProfileRow {
  return {
    user_id: userId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_subscription_status: null,
    stripe_subscription_cancel_at_period_end: false,
    stripe_subscription_current_period_end: null,
    stripe_last_event_created_at: null,
    updated_at: null,
  };
}

function mergeBillingProfileRow(
  userId: string,
  existing: StoredBillingProfileRow | null,
  patch: BillingProfilePatch,
) {
  return {
    ...(existing ?? createBaseBillingProfileRow(userId)),
    ...patch,
    user_id: userId,
    updated_at: new Date().toISOString(),
  } satisfies StoredBillingProfileRow;
}

async function writeBillingProfileForUser(
  userId: string,
  patch: BillingProfilePatch,
) {
  const existing = await getStoredBillingProfileForUser(userId);
  const nextRow = mergeBillingProfileRow(userId, existing, patch);
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_BILLING_PROFILES_TABLE)
    .upsert(nextRow)
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_subscription_status, stripe_subscription_cancel_at_period_end, stripe_subscription_current_period_end, stripe_last_event_created_at, updated_at",
    )
    .single<StoredBillingProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

function buildBillingSummaryFromProfile(
  profile: StoredBillingProfileRow | null,
  entitlement: ResolvedAccountEntitlement,
): AccountBillingSummary {
  if (!profile) {
    return getDefaultAccountBillingSummary(entitlement);
  }

  const parsedStatus = stripeSubscriptionStatusSchema.safeParse(
    profile.stripe_subscription_status,
  );

  if (parsedStatus.success) {
    return toAccountBillingSummaryFromStripe({
      subscriptionStatus: parsedStatus.data,
      cancelAtPeriodEnd: profile.stripe_subscription_cancel_at_period_end,
      currentPeriodEnd: profile.stripe_subscription_current_period_end,
    });
  }

  if (profile.stripe_subscription_id) {
    return {
      source: "stripe",
      status: "incomplete",
      canStartCheckout: false,
      canManageSubscription: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: profile.stripe_subscription_current_period_end,
    };
  }

  return getDefaultAccountBillingSummary(entitlement);
}

export async function getStoredBillingProfileForUser(userId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_BILLING_PROFILES_TABLE)
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_subscription_status, stripe_subscription_cancel_at_period_end, stripe_subscription_current_period_end, stripe_last_event_created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<StoredBillingProfileRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getStoredBillingProfileForAuthenticatedUser(
  userId: string,
  cookieHeader: string | null,
) {
  const supabase = createSupabaseServerClient({ cookieHeader });
  const { data, error } = await supabase
    .from(USER_BILLING_PROFILES_TABLE)
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_subscription_status, stripe_subscription_cancel_at_period_end, stripe_subscription_current_period_end, stripe_last_event_created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<StoredBillingProfileRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getUserIdForStripeCustomer(customerId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_BILLING_PROFILES_TABLE)
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ user_id: string }>();

  if (error) {
    throw error;
  }

  return data?.user_id ?? null;
}

export async function getUserIdForStripeSubscriptionId(subscriptionId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(USER_BILLING_PROFILES_TABLE)
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle<{ user_id: string }>();

  if (error) {
    throw error;
  }

  return data?.user_id ?? null;
}

export async function getAccountBillingSummaryForUser(
  userId: string,
  entitlement: ResolvedAccountEntitlement,
  cookieHeader?: string | null,
) {
  const profile =
    cookieHeader !== undefined
      ? await getStoredBillingProfileForAuthenticatedUser(userId, cookieHeader)
      : await getStoredBillingProfileForUser(userId);

  return buildBillingSummaryFromProfile(profile, entitlement);
}

export async function linkStripeCustomerToUser(input: {
  userId: string;
  customerId: string;
  subscriptionId?: string | null;
}) {
  return writeBillingProfileForUser(input.userId, {
    stripe_customer_id: input.customerId,
    ...(input.subscriptionId !== undefined
      ? {
          stripe_subscription_id: input.subscriptionId,
        }
      : {}),
  });
}

export async function recordProcessedStripeWebhookEvent(input: {
  eventId: string;
  eventType: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from(PROCESSED_STRIPE_EVENTS_TABLE)
    .insert({
      stripe_event_id: input.eventId,
      event_type: input.eventType,
      processed_at: new Date().toISOString(),
    } satisfies ProcessedStripeWebhookEventRow);

  if (!error) {
    return true;
  }

  if ((error as { code?: string }).code === "23505") {
    return false;
  }

  throw error;
}

export async function deleteProcessedStripeWebhookEvent(eventId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from(PROCESSED_STRIPE_EVENTS_TABLE)
    .delete()
    .eq("stripe_event_id", eventId);

  if (error) {
    throw error;
  }
}

export async function applyStripeSubscriptionStateToUser(input: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string | null;
  subscriptionStatus: StripeSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  eventCreatedAt: string;
}) {
  const existing = await getStoredBillingProfileForUser(input.userId);

  if (
    existing?.stripe_last_event_created_at &&
    new Date(existing.stripe_last_event_created_at).getTime() >
      new Date(input.eventCreatedAt).getTime()
  ) {
    return {
      applied: false as const,
      stale: true as const,
      entitlementTier: accountEntitlementTierSchema.parse(
        hasStripePremiumAccess(input.subscriptionStatus) ? "premium" : "free",
      ),
    };
  }

  await writeBillingProfileForUser(input.userId, {
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    stripe_price_id: input.priceId,
    stripe_subscription_status: input.subscriptionStatus,
    stripe_subscription_cancel_at_period_end: input.cancelAtPeriodEnd,
    stripe_subscription_current_period_end: input.currentPeriodEnd,
    stripe_last_event_created_at: input.eventCreatedAt,
  });

  const entitlementTier = hasStripePremiumAccess(input.subscriptionStatus)
    ? "premium"
    : "free";

  await setStoredAccountEntitlementForUser(input.userId, entitlementTier);

  return {
    applied: true as const,
    stale: false as const,
    entitlementTier,
  };
}
