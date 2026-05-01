import { stripeSubscriptionStatusSchema } from "./model";
import { ACHIEVEMENT_REWARD_KEY } from "@/lib/achievements";
import {
  releaseAchievementRewardCheckoutClaim,
} from "@/lib/achievements/service";
import {
  parseStripeWebhookEvent,
  retrieveStripeSubscription,
  stripeCheckoutSessionSchema,
  stripeSubscriptionObjectSchema,
  type StripeWebhookEvent,
} from "./stripe";
import {
  applyStripeSubscriptionForUser,
  resolveUserIdForStripeCheckoutSession,
  resolveUserIdForStripeSubscription,
  toIsoFromUnixSeconds,
} from "./fulfillment";
import {
  deleteProcessedStripeWebhookEvent,
  linkStripeCustomerToUser,
  recordProcessedStripeWebhookEvent,
} from "./store";

function buildRetryableStripeWebhookError(reason: string) {
  const error = new Error(`retryable_stripe_webhook_${reason}`);
  (error as Error & { code?: string }).code = reason;
  return error;
}

export async function processStripeWebhookEvent(event: StripeWebhookEvent) {
  const shouldProcess = await recordProcessedStripeWebhookEvent({
    eventId: event.id,
    eventType: event.type,
  });

  if (!shouldProcess) {
    return {
      duplicate: true as const,
      handled: true as const,
    };
  }
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = stripeCheckoutSessionSchema.parse(event.data.object);

        if (session.mode !== "subscription" || !session.customer) {
          return {
            duplicate: false as const,
            handled: false as const,
            reason: "not_subscription_checkout",
          };
        }

        const userId = await resolveUserIdForStripeCheckoutSession(session);

        if (!userId) {
          throw buildRetryableStripeWebhookError("unknown_user");
        }

        await linkStripeCustomerToUser({
          userId,
          customerId: session.customer,
          subscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
        });

        if (typeof session.subscription === "string") {
          const subscription = await retrieveStripeSubscription(session.subscription);

          if (
            session.customer &&
            subscription.customer !== session.customer
          ) {
            throw new Error(
              "Stripe checkout session customer did not match the retrieved subscription customer.",
            );
          }

          const result = await applyStripeSubscriptionForUser({
            userId,
            subscription,
            eventCreatedAt:
              toIsoFromUnixSeconds(subscription.created) ??
              new Date(event.created * 1000).toISOString(),
          });

          if (!result.handled && !result.stale) {
            throw buildRetryableStripeWebhookError(
              result.reason ?? "unknown_subscription_status",
            );
          }

          return {
            duplicate: false,
            handled: result.handled,
            stale: result.stale,
            entitlementTier: result.entitlementTier,
          };
        }

        return {
          duplicate: false as const,
          handled: true as const,
        };
      }
      case "checkout.session.expired": {
        const session = stripeCheckoutSessionSchema.parse(event.data.object);

        if (
          session.metadata.reward_key !== ACHIEVEMENT_REWARD_KEY ||
          !session.customer
        ) {
          return {
            duplicate: false as const,
            handled: false as const,
            reason: "not_reward_checkout",
          };
        }

        const userId = await resolveUserIdForStripeCheckoutSession(session);

        if (!userId) {
          throw buildRetryableStripeWebhookError("unknown_user");
        }

        await releaseAchievementRewardCheckoutClaim({
          userId,
          checkoutSessionId: session.id,
        });

        return {
          duplicate: false as const,
          handled: true as const,
        };
      }
      case "customer.subscription.created":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = stripeSubscriptionObjectSchema.parse(event.data.object);
        const parsedStatus = stripeSubscriptionStatusSchema.safeParse(subscription.status);

        if (!parsedStatus.success) {
          throw buildRetryableStripeWebhookError("unknown_subscription_status");
        }

        const userId = await resolveUserIdForStripeSubscription(subscription);

        if (!userId) {
          throw buildRetryableStripeWebhookError("unknown_user");
        }

        const result = await applyStripeSubscriptionForUser({
          userId,
          subscription,
          eventCreatedAt: new Date(event.created * 1000).toISOString(),
        });

        if (!result.handled && !result.stale) {
          throw buildRetryableStripeWebhookError(
            result.reason ?? "unknown_subscription_status",
          );
        }

        return {
          duplicate: false,
          handled: result.handled,
          stale: result.stale,
          entitlementTier: result.entitlementTier,
        };
      }
      default:
        return {
          duplicate: false as const,
          handled: false as const,
          reason: "ignored_event_type",
        };
    }
  } catch (error) {
    await deleteProcessedStripeWebhookEvent(event.id);
    throw error;
  }
}

export function parseVerifiedStripeWebhookEvent(payload: string) {
  return parseStripeWebhookEvent(payload);
}
