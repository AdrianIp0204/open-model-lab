import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import {
  applyStripeSubscriptionForUser,
  isBillingProfileSyncedToStripeSubscription,
  resolveUserIdForStripeCheckoutSession,
  toIsoFromUnixSeconds,
} from "@/lib/billing/fulfillment";
import {
  retrieveStripeCheckoutSession,
  retrieveStripeSubscription,
} from "@/lib/billing/stripe";
import {
  getStoredBillingProfileForUser,
  linkStripeCustomerToUser,
} from "@/lib/billing/store";

export const runtime = "nodejs";

const billingCheckoutReturnReconciliationRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const session = await getAccountSessionForCookieHeader(request.headers.get("cookie"));

  if (!session?.user) {
    return NextResponse.json(
      {
        code: "sign_in_required",
        error: "Sign in before reconciling a returned Stripe checkout session.",
      },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Billing reconciliation payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = billingCheckoutReturnReconciliationRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Billing reconciliation payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const checkoutSession = await retrieveStripeCheckoutSession(parsed.data.sessionId);

    if (checkoutSession.mode !== "subscription") {
      return NextResponse.json(
        {
          code: "session_not_subscription_checkout",
          error: "That Stripe checkout session does not represent a subscription checkout.",
        },
        { status: 409 },
      );
    }

    if (checkoutSession.status !== "complete" || !checkoutSession.subscription) {
      return NextResponse.json(
        {
          code: "session_not_completed",
          error:
            "That Stripe checkout session has not completed a subscription yet, so Supporter cannot be reconciled from the return page.",
        },
        { status: 409 },
      );
    }

    const sessionOwnerUserId = await resolveUserIdForStripeCheckoutSession(checkoutSession);

    if (sessionOwnerUserId !== session.user.id) {
      console.warn("[billing] checkout return reconciliation rejected session ownership", {
        userId: session.user.id,
        checkoutSessionId: checkoutSession.id,
        sessionOwnerUserId,
      });

      return NextResponse.json(
        {
          code: "session_not_owned",
          error: "That Stripe checkout session does not belong to the signed-in account.",
        },
        { status: 403 },
      );
    }

    const subscription = await retrieveStripeSubscription(checkoutSession.subscription);

    if (
      checkoutSession.customer &&
      subscription.customer !== checkoutSession.customer
    ) {
      return NextResponse.json(
        {
          code: "subscription_customer_mismatch",
          error:
            "The returned Stripe subscription does not match the checkout session customer.",
        },
        { status: 409 },
      );
    }

    const existingBillingProfile = await getStoredBillingProfileForUser(session.user.id);

    if (
      isBillingProfileSyncedToStripeSubscription({
        billingProfile: existingBillingProfile,
        entitlementTier: session.entitlement.tier,
        subscription,
      })
    ) {
      return NextResponse.json({
        ok: true,
        status: "already_synced",
        premiumGranted: session.entitlement.tier === "premium",
        entitlementTier: session.entitlement.tier,
        syncSource: "webhook",
      });
    }

    await linkStripeCustomerToUser({
      userId: session.user.id,
      customerId: subscription.customer,
      subscriptionId: subscription.id,
    });

    const result = await applyStripeSubscriptionForUser({
      userId: session.user.id,
      subscription,
      eventCreatedAt:
        toIsoFromUnixSeconds(subscription.created) ?? new Date().toISOString(),
    });

    if (!result.handled && !result.stale) {
      return NextResponse.json(
        {
          code: result.reason ?? "unknown_subscription_status",
          error: "Stripe returned a subscription with a status this deployment cannot apply.",
        },
        { status: 409 },
      );
    }

    if (result.stale) {
      return NextResponse.json({
        ok: true,
        status: "already_synced",
        premiumGranted: session.entitlement.tier === "premium",
        entitlementTier: session.entitlement.tier,
        syncSource: "webhook",
      });
    }

    console.info("[billing] checkout return reconciliation applied", {
      userId: session.user.id,
      checkoutSessionId: checkoutSession.id,
      subscriptionId: subscription.id,
      subscriptionStatus: result.subscriptionStatus,
      entitlementTier: result.entitlementTier,
      syncSource: "return_reconciliation",
    });

    return NextResponse.json({
      ok: true,
      status: "reconciled",
      premiumGranted: result.entitlementTier === "premium",
      entitlementTier: result.entitlementTier,
      syncSource: "return_reconciliation",
    });
  } catch (error) {
    console.error("[billing] checkout return reconciliation failed", {
      userId: session.user.id,
      sessionId: parsed.data.sessionId,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        code: "reconciliation_failed",
        error: "Stripe checkout could not be reconciled from the return page.",
      },
      { status: 502 },
    );
  }
}
