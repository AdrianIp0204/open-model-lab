import { NextResponse } from "next/server";
import { type AppLocale, isAppLocale } from "@/i18n/routing";
import { isDevAccountHarnessFixtureUserId } from "@/lib/account/dev-harness";
import {
  describeOptionalAccountDependencyFailure,
  getAccountSessionForCookieHeader,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "@/lib/account/supabase";
import { ACHIEVEMENT_REWARD_KEY } from "@/lib/achievements";
import {
  attachAchievementRewardCheckoutSession,
  getAchievementRewardForCheckout,
  releaseAchievementRewardCheckoutClaim,
  reserveAchievementRewardForCheckout,
} from "@/lib/achievements/service";
import {
  describeStripeCheckoutConfigIssues,
  getStripeBillingConfig,
  getStripeCheckoutConfigDiagnostics,
} from "@/lib/billing/env";
import {
  createStripeCheckoutSession,
  createStripeCustomer,
  retrieveStripeCheckoutSession,
} from "@/lib/billing/stripe";
import {
  getStoredBillingProfileForUser,
  linkStripeCustomerToUser,
} from "@/lib/billing/store";

export const runtime = "nodejs";

type CheckoutFailureProvider = "stripe" | "supabase" | null;

function readErrorMessage(error: unknown) {
  if (typeof error === "string" && error) {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : null;
}

function readErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const name = (error as { name?: unknown }).name;
  return typeof name === "string" && name ? name : null;
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : null;
}

function readErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const details = (error as { details?: unknown }).details;
  return typeof details === "string" && details ? details : null;
}

function readErrorHint(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const hint = (error as { hint?: unknown }).hint;
  return typeof hint === "string" && hint ? hint : null;
}

function isSupabaseLikeErrorCode(code: string | null) {
  return Boolean(code && (/^PGRST/i.test(code) || /^[0-9A-Z]{5}$/i.test(code)));
}

function inferCheckoutFailureProvider(
  checkpoint: string,
  error: unknown,
): CheckoutFailureProvider {
  if (
    checkpoint.startsWith("billing_profile_") ||
    checkpoint.startsWith("reward_lookup_") ||
    checkpoint.startsWith("reward_reserve") ||
    checkpoint.startsWith("reward_claim_")
  ) {
    return "supabase";
  }

  if (
    checkpoint.startsWith("stripe_") ||
    checkpoint.startsWith("reward_checkout_session_")
  ) {
    return "stripe";
  }

  return isSupabaseLikeErrorCode(readErrorCode(error)) ? "supabase" : null;
}

function buildCheckoutFailurePayload(input: {
  checkpoint: string;
  error: unknown;
}) {
  const provider = inferCheckoutFailureProvider(input.checkpoint, input.error);
  const supabaseCode = readErrorCode(input.error);

  return {
    code: "checkout_session_failed",
    checkpoint: input.checkpoint,
    provider,
    error: readErrorMessage(input.error) ?? "Stripe checkout session could not be created.",
    name: readErrorName(input.error),
    supabaseCode:
      provider === "supabase" || isSupabaseLikeErrorCode(supabaseCode)
        ? supabaseCode
        : null,
    details: readErrorDetails(input.error),
    hint: readErrorHint(input.error),
  };
}

function logOptionalCheckoutDependencyFailure(input: {
  userId: string;
  checkpoint: string;
  error: unknown;
  fallback: string;
  relationName?: string;
}) {
  const failure = describeOptionalAccountDependencyFailure(
    input.error,
    input.relationName,
  );
  const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
    ? console.error
    : console.warn;

  log("[billing] checkout optional dependency unavailable", {
    userId: input.userId,
    checkpoint: input.checkpoint,
    provider: "supabase",
    failureKind: failure.kind,
    relationName: failure.relationName,
    code: failure.code,
    message: failure.message,
    details: readErrorDetails(input.error),
    hint: readErrorHint(input.error),
    fallback: input.fallback,
  });
}

function buildRewardCheckoutIdempotencyKey(userId: string, claimedAt: string | null) {
  return `open-model-lab-reward-checkout-${userId}-${claimedAt ?? "pending"}`;
}

async function continueReservedRewardCheckout(input: {
  userId: string;
  customerId: string;
  claimedAt: string | null;
  existingCheckoutSessionId: string | null;
  couponId: string | null;
  priceId: string;
  locale?: AppLocale;
  setCheckpoint: (checkpoint: string) => void;
}) {
  if (input.existingCheckoutSessionId) {
    input.setCheckpoint("reward_checkout_session_retrieval");
    const existingCheckoutSession = await retrieveStripeCheckoutSession(
      input.existingCheckoutSessionId,
    );

    if (existingCheckoutSession.metadata.reward_key !== ACHIEVEMENT_REWARD_KEY) {
      console.warn("[billing] reward claim points at a checkout session without reward metadata", {
        userId: input.userId,
        checkoutSessionId: input.existingCheckoutSessionId,
      });
      input.setCheckpoint("reward_claim_release_invalid_reward_metadata");
      await releaseAchievementRewardCheckoutClaim({
        userId: input.userId,
        checkoutSessionId: input.existingCheckoutSessionId,
      });
      return {
        checkoutSession: null,
        reusedExistingSession: false,
        completed: false,
        released: true,
      };
    } else if (existingCheckoutSession.status === "open") {
      if (!existingCheckoutSession.url) {
        throw new Error(
          "The discounted checkout session is still open, but Stripe did not return a resume URL.",
        );
      }

      return {
        checkoutSession: {
          id: existingCheckoutSession.id,
          url: existingCheckoutSession.url,
        },
        reusedExistingSession: true,
        completed: false,
        released: false,
      };
    } else if (existingCheckoutSession.status === "complete") {
      return {
        checkoutSession: null,
        reusedExistingSession: false,
        completed: true,
        released: false,
      };
    } else if (existingCheckoutSession.status === "expired") {
      input.setCheckpoint("reward_claim_release_expired_session");
      await releaseAchievementRewardCheckoutClaim({
        userId: input.userId,
        checkoutSessionId: existingCheckoutSession.id,
      });
      return {
        checkoutSession: null,
        reusedExistingSession: false,
        completed: false,
        released: true,
      };
    }
  }

  if (!input.couponId) {
    throw new Error(
      "The achievement reward is reserved on this account, but the deployment no longer has the Stripe reward coupon configured.",
    );
  }

  input.setCheckpoint("reward_checkout_session_creation");
  const checkoutSession = await createStripeCheckoutSession({
    userId: input.userId,
    customerId: input.customerId,
    rewardCouponId: input.couponId,
    rewardKey: ACHIEVEMENT_REWARD_KEY,
    idempotencyKey: buildRewardCheckoutIdempotencyKey(input.userId, input.claimedAt),
    ...(input.locale
      ? {
          locale: input.locale,
        }
      : {}),
  });
  input.setCheckpoint("reward_claim_checkout_session_attach");
  const attachedReward = await attachAchievementRewardCheckoutSession({
    userId: input.userId,
    checkoutSessionId: checkoutSession.id,
    couponId: input.couponId,
    priceId: input.priceId,
  });

  if (!attachedReward) {
    console.warn("[billing] reward checkout was created but the reserved claim row was not updated", {
      userId: input.userId,
      checkoutSessionId: checkoutSession.id,
    });
  }

  return {
    checkoutSession,
    reusedExistingSession: false,
    completed: false,
    released: false,
  };
}

function buildRewardPendingActivationResponse() {
  return NextResponse.json(
    {
      code: "reward_checkout_pending_activation",
      error:
        "The discounted checkout already completed. Wait for the Stripe subscription event to finish updating this account before starting checkout again.",
    },
    { status: 409 },
  );
}

async function readRequestedBillingLocale(request: Request): Promise<AppLocale | null> {
  try {
    const payload = (await request.json()) as { locale?: unknown } | null;
    return typeof payload?.locale === "string" && isAppLocale(payload.locale)
      ? payload.locale
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  console.info("[billing] checkout route started", {
    hasCookieHeader: Boolean(request.headers.get("cookie")?.trim()),
  });

  const requestedLocale = await readRequestedBillingLocale(request);
  const session = await getAccountSessionForCookieHeader(request.headers.get("cookie"));

  if (!session?.user) {
    return NextResponse.json(
      {
        code: "sign_in_required",
        error: "Sign in before starting Supporter checkout.",
      },
      { status: 401 },
    );
  }

  if (session.entitlement.tier === "premium") {
    return NextResponse.json(
      {
        code: "already_premium",
        error: "This account already has Supporter access.",
      },
      { status: 409 },
    );
  }

  if (!session.billing.canStartCheckout) {
    return NextResponse.json(
      {
        code: "billing_checkout_unavailable",
        error:
          session.billing.canManageSubscription
            ? "This account already has a Stripe subscription to manage."
            : "Supporter checkout is not available for this account right now.",
      },
      { status: 409 },
    );
  }

  const config = getStripeBillingConfig();
  const checkoutConfigDiagnostics = getStripeCheckoutConfigDiagnostics(config);

  if (!checkoutConfigDiagnostics.configured) {
    console.warn("[billing] checkout unavailable", {
      userId: session.user.id,
      issues: checkoutConfigDiagnostics.issues,
      hasSecretKey: checkoutConfigDiagnostics.hasSecretKey,
      hasPremiumPriceId: checkoutConfigDiagnostics.hasPremiumPriceId,
      checkoutSuccessUrlHost: checkoutConfigDiagnostics.checkoutSuccessUrlHost,
      checkoutCancelUrlHost: checkoutConfigDiagnostics.checkoutCancelUrlHost,
    });

    return NextResponse.json(
      {
        code: "billing_unavailable",
        error: describeStripeCheckoutConfigIssues(checkoutConfigDiagnostics.issues),
        configIssues: checkoutConfigDiagnostics.issues,
      },
      { status: 503 },
    );
  }

  if (isDevAccountHarnessFixtureUserId(session.user.id)) {
    return NextResponse.json(
      {
        code: "billing_requires_real_account",
        error:
          "The dev account harness is for local entitlement QA only. Use a real signed-in staging account to verify Stripe checkout.",
      },
      { status: 409 },
    );
  }

  const accountSession = session;
  let checkpoint = "billing_profile_lookup";

  async function getBillingProfileWithFallback(userId: string) {
    try {
      return await getStoredBillingProfileForUser(userId);
    } catch (error) {
      logOptionalCheckoutDependencyFailure({
        userId,
        checkpoint,
        error,
        relationName: "user_billing_profiles",
        fallback: "treating_billing_profile_as_unavailable",
      });
      return null;
    }
  }

  async function getRewardForCheckoutWithFallback(userId: string) {
    try {
      return await getAchievementRewardForCheckout({
        userId,
        entitlementTier: accountSession.entitlement.tier,
      });
    } catch (error) {
      logOptionalCheckoutDependencyFailure({
        userId,
        checkpoint,
        error,
        fallback: "continuing_checkout_without_reward_discount",
      });
      return null;
    }
  }

  async function linkStripeCustomerToUserWithFallback(input: {
    userId: string;
    customerId: string;
  }) {
    try {
      await linkStripeCustomerToUser(input);
    } catch (error) {
      logOptionalCheckoutDependencyFailure({
        userId: input.userId,
        checkpoint,
        error,
        relationName: "user_billing_profiles",
        fallback: "continuing_checkout_with_webhook_reconciliation",
      });
    }
  }

  try {
    checkpoint = "billing_profile_lookup";
    const billingProfile = await getBillingProfileWithFallback(accountSession.user.id);
    const rewardCouponId = config.achievementRewardCouponId;
    let customerId = billingProfile?.stripe_customer_id ?? null;

    if (!customerId) {
      checkpoint = "stripe_customer_creation";
      const customer = await createStripeCustomer({
        userId: accountSession.user.id,
        email: accountSession.user.email,
        displayName: accountSession.user.displayName,
      });
      customerId = customer.id;
      checkpoint = "billing_profile_link";
      await linkStripeCustomerToUserWithFallback({
        userId: accountSession.user.id,
        customerId,
      });
    }

    checkpoint = "reward_lookup_initial";
    let reward = await getRewardForCheckoutWithFallback(accountSession.user.id);

    if (reward?.status === "claimed") {
      const rewardCheckout = await continueReservedRewardCheckout({
        userId: accountSession.user.id,
        customerId,
        claimedAt: reward.claimed_at,
        existingCheckoutSessionId: reward.claim_checkout_session_id,
        couponId: rewardCouponId,
        priceId: config.premiumPriceId ?? "",
        ...(requestedLocale
          ? {
              locale: requestedLocale,
            }
          : {}),
        setCheckpoint(nextCheckpoint) {
          checkpoint = nextCheckpoint;
        },
      });

      if (rewardCheckout.released) {
        checkpoint = "reward_lookup_after_released_claim";
        reward = await getRewardForCheckoutWithFallback(accountSession.user.id);
      } else if (rewardCheckout.completed) {
        return buildRewardPendingActivationResponse();
      } else {
        if (!rewardCheckout.checkoutSession) {
          throw new Error("Reward checkout did not return a Stripe session.");
        }

        console.info("[billing] reused reserved reward checkout session", {
          userId: accountSession.user.id,
          hasExistingCustomer: Boolean(billingProfile?.stripe_customer_id),
          reusedExistingSession: rewardCheckout.reusedExistingSession,
        });

        return NextResponse.json({
          ok: true,
          url: rewardCheckout.checkoutSession.url,
        });
      }
    }

    if (reward?.status === "unlocked" && rewardCouponId) {
      checkpoint = "reward_reserve";
      const reservedReward = await reserveAchievementRewardForCheckout({
        userId: accountSession.user.id,
        entitlementTier: accountSession.entitlement.tier,
      });

      if (reservedReward) {
        const rewardCheckout = await continueReservedRewardCheckout({
          userId: accountSession.user.id,
          customerId,
          claimedAt: reservedReward.claimed_at,
          existingCheckoutSessionId: reservedReward.claim_checkout_session_id,
          couponId: rewardCouponId,
          priceId: config.premiumPriceId ?? "",
          ...(requestedLocale
            ? {
                locale: requestedLocale,
              }
            : {}),
          setCheckpoint(nextCheckpoint) {
            checkpoint = nextCheckpoint;
          },
        });

        if (rewardCheckout.released) {
          checkpoint = "reward_lookup_after_released_reservation";
          reward = await getRewardForCheckoutWithFallback(accountSession.user.id);
        } else if (rewardCheckout.completed) {
          return buildRewardPendingActivationResponse();
        } else {
          if (!rewardCheckout.checkoutSession) {
            throw new Error("Reward checkout did not return a Stripe session.");
          }

          console.info("[billing] reward checkout session created", {
            userId: accountSession.user.id,
            hasExistingCustomer: Boolean(billingProfile?.stripe_customer_id),
            reusedExistingSession: rewardCheckout.reusedExistingSession,
          });

          return NextResponse.json({
            ok: true,
            url: rewardCheckout.checkoutSession.url,
          });
        }
      }

      checkpoint = "reward_lookup_after_concurrent_reserve";
      reward = await getRewardForCheckoutWithFallback(accountSession.user.id);

      if (reward?.status === "claimed") {
        const rewardCheckout = await continueReservedRewardCheckout({
          userId: accountSession.user.id,
          customerId,
          claimedAt: reward.claimed_at,
          existingCheckoutSessionId: reward.claim_checkout_session_id,
          couponId: rewardCouponId,
          priceId: config.premiumPriceId ?? "",
          ...(requestedLocale
            ? {
                locale: requestedLocale,
              }
            : {}),
          setCheckpoint(nextCheckpoint) {
            checkpoint = nextCheckpoint;
          },
        });

        if (rewardCheckout.released) {
          checkpoint = "reward_lookup_after_recovered_concurrent_reserve";
          reward = await getRewardForCheckoutWithFallback(accountSession.user.id);
        } else if (rewardCheckout.completed) {
          return buildRewardPendingActivationResponse();
        } else {
          if (!rewardCheckout.checkoutSession) {
            throw new Error("Reward checkout did not return a Stripe session.");
          }

          console.info("[billing] reward checkout session recovered after concurrent reserve", {
            userId: accountSession.user.id,
            hasExistingCustomer: Boolean(billingProfile?.stripe_customer_id),
            reusedExistingSession: rewardCheckout.reusedExistingSession,
          });

          return NextResponse.json({
            ok: true,
            url: rewardCheckout.checkoutSession.url,
          });
        }
      }
    }

    checkpoint = "stripe_checkout_session_creation";
    const checkoutSession = await createStripeCheckoutSession({
      userId: accountSession.user.id,
      customerId,
      rewardCouponId: null,
      rewardKey: null,
      ...(requestedLocale
        ? {
            locale: requestedLocale,
          }
        : {}),
    });

    console.info("[billing] checkout session created", {
      userId: accountSession.user.id,
      hasExistingCustomer: Boolean(billingProfile?.stripe_customer_id),
      appliedRewardDiscount: false,
    });

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
    });
  } catch (error) {
    const failure = buildCheckoutFailurePayload({
      checkpoint,
      error,
    });

    console.error("[billing] checkout route failed", {
      userId: accountSession.user.id,
      checkpoint: failure.checkpoint,
      provider: failure.provider,
      message: failure.error,
      name: failure.name,
      supabaseCode: failure.supabaseCode,
      details: failure.details,
      hint: failure.hint,
    });

    return NextResponse.json(failure, { status: 502 });
  }
}
