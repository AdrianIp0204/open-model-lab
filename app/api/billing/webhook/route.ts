import { NextResponse } from "next/server";
import { getStripeBillingConfig, isStripeWebhookConfigured } from "@/lib/billing/env";
import { verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import { parseVerifiedStripeWebhookEvent, processStripeWebhookEvent } from "@/lib/billing/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getStripeBillingConfig();

  if (!isStripeWebhookConfigured(config) || !config.webhookSecret) {
    return NextResponse.json(
      {
        code: "billing_unavailable",
        error: "Stripe webhooks are not configured on this deployment yet.",
      },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (
    !verifyStripeWebhookSignature({
      payload,
      signatureHeader,
      secret: config.webhookSecret,
    })
  ) {
    return NextResponse.json(
      {
        code: "invalid_signature",
        error: "Stripe webhook signature verification failed.",
      },
      { status: 400 },
    );
  }

  let event;

  try {
    event = parseVerifiedStripeWebhookEvent(payload);
  } catch {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Stripe webhook payload was not valid JSON.",
      },
      { status: 400 },
    );
  }

  let result;

  try {
    result = await processStripeWebhookEvent(event);
  } catch (error) {
    console.error("[billing] webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      code:
        typeof error === "object" && error && "code" in error
          ? (error as { code?: unknown }).code
          : null,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        code: "webhook_processing_failed",
        error: "Stripe webhook processing could not be completed yet.",
      },
      { status: 500 },
    );
  }
  const responseBody: Record<string, unknown> = {
    ok: true,
    duplicate: result.duplicate ?? false,
    handled: result.handled ?? false,
  };

  if ("entitlementTier" in result && result.entitlementTier) {
    responseBody.entitlementTier = result.entitlementTier;
  }

  if ("reason" in result && result.reason) {
    responseBody.reason = result.reason;
  }

  if ("stale" in result && result.stale) {
    responseBody.stale = true;
  }

  return NextResponse.json(responseBody);
}
