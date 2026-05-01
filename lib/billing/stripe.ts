import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import {
  STRIPE_API_VERSION,
  buildStripeBillingConfigUrls,
  getStripeBillingConfig,
} from "./env";

const stripeEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().int().nonnegative(),
  data: z.object({
    object: z.unknown(),
  }),
});

const stripeMetadataSchema = z.record(z.string(), z.string()).default({});

export const stripeCheckoutSessionSchema = z.object({
  object: z.literal("checkout.session"),
  id: z.string().min(1),
  mode: z.string().nullable().optional(),
  status: z.enum(["open", "complete", "expired"]).nullable().optional(),
  url: z.string().nullable().optional(),
  customer: z.string().nullable().optional(),
  subscription: z.union([z.string(), z.null()]).optional(),
  client_reference_id: z.union([z.string(), z.null()]).optional(),
  metadata: stripeMetadataSchema.nullish().transform((value) => value ?? {}),
});

export const stripeSubscriptionObjectSchema = z.object({
  object: z.literal("subscription"),
  id: z.string().min(1),
  customer: z.string().min(1),
  status: z.string().min(1),
  created: z.number().int().nonnegative().nullable().optional(),
  cancel_at_period_end: z.boolean().optional().default(false),
  current_period_end: z.number().int().nonnegative().nullable().optional(),
  metadata: stripeMetadataSchema.nullish().transform((value) => value ?? {}),
  items: z
    .object({
      data: z.array(
        z.object({
          price: z
            .object({
              id: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
        }),
      ),
    })
    .optional(),
});

export type StripeWebhookEvent = z.infer<typeof stripeEventSchema>;
export type StripeCheckoutSessionObject = z.infer<typeof stripeCheckoutSessionSchema>;
export type StripeSubscriptionObject = z.infer<
  typeof stripeSubscriptionObjectSchema
>;

type StripeRequestResponse = {
  id: string;
  url?: string | null;
};

function buildStripeAuthHeaders(secretKey: string, extraHeaders?: HeadersInit) {
  return {
    authorization: `Bearer ${secretKey}`,
    "stripe-version": STRIPE_API_VERSION,
    ...extraHeaders,
  } satisfies HeadersInit;
}

async function stripeFormPost(
  path: string,
  form: URLSearchParams,
  options: {
    idempotencyKey?: string;
  } = {},
) {
  const config = getStripeBillingConfig();

  if (!config.secretKey) {
    throw new Error("stripe_not_configured");
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: buildStripeAuthHeaders(config.secretKey, {
      "content-type": "application/x-www-form-urlencoded",
      ...(options.idempotencyKey
        ? { "idempotency-key": options.idempotencyKey }
        : {}),
    }),
    body: form.toString(),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | StripeRequestResponse
    | {
        error?: {
          message?: string;
          type?: string;
        };
      }
    | null;

  if (!response.ok) {
    const stripeError =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object"
        ? payload.error
        : null;
    const message =
      stripeError &&
      "message" in stripeError &&
      typeof stripeError.message === "string"
        ? stripeError.message
        : "Stripe request failed.";

    throw new Error(message);
  }

  return payload as StripeRequestResponse;
}

async function stripeGet(path: string) {
  const config = getStripeBillingConfig();

  if (!config.secretKey) {
    throw new Error("stripe_not_configured");
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "GET",
    headers: buildStripeAuthHeaders(config.secretKey),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | {
        error?: {
          message?: string;
          type?: string;
        };
      }
    | null;

  if (!response.ok) {
    const stripeError =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object"
        ? payload.error
        : null;
    const message =
      stripeError &&
      "message" in stripeError &&
      typeof stripeError.message === "string"
        ? stripeError.message
        : "Stripe request failed.";

    throw new Error(message);
  }

  return payload;
}

export async function createStripeCustomer(input: {
  userId: string;
  email: string;
  displayName: string;
}) {
  const form = new URLSearchParams();
  form.set("email", input.email);
  form.set("name", input.displayName);
  form.set("metadata[user_id]", input.userId);
  form.set("metadata[source]", "open-model-lab");

  const payload = await stripeFormPost("/v1/customers", form, {
    idempotencyKey: `open-model-lab-customer-${input.userId}`,
  });

  return {
    id: payload.id,
  };
}

export async function createStripeCheckoutSession(input: {
  userId: string;
  customerId: string;
  rewardCouponId?: string | null;
  rewardKey?: string | null;
  idempotencyKey?: string;
  locale?: AppLocale;
}) {
  const config = getStripeBillingConfig();
  const urls = buildStripeBillingConfigUrls(input.locale);

  if (!config.premiumPriceId) {
    throw new Error("stripe_not_configured");
  }

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("customer", input.customerId);
  form.set("client_reference_id", input.userId);
  form.set("success_url", urls.checkoutSuccessUrl);
  form.set("cancel_url", urls.checkoutCancelUrl);
  form.set("line_items[0][price]", config.premiumPriceId);
  form.set("line_items[0][quantity]", "1");
  form.set("metadata[user_id]", input.userId);
  form.set("metadata[plan]", "premium");
  form.set("subscription_data[metadata][user_id]", input.userId);
  form.set("subscription_data[metadata][plan]", "premium");

  if (input.rewardCouponId) {
    form.set("discounts[0][coupon]", input.rewardCouponId);
  }

  if (input.rewardKey) {
    form.set("metadata[reward_key]", input.rewardKey);
    form.set("subscription_data[metadata][reward_key]", input.rewardKey);
  }

  const payload = await stripeFormPost("/v1/checkout/sessions", form, {
    idempotencyKey: input.idempotencyKey,
  });

  if (!payload.url) {
    throw new Error("Stripe checkout session did not include a redirect URL.");
  }

  return {
    id: payload.id,
    url: payload.url,
  };
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const payload = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);

  return stripeCheckoutSessionSchema.parse(payload);
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  const payload = await stripeGet(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);

  return stripeSubscriptionObjectSchema.parse(payload);
}

export async function createStripeBillingPortalSession(input: {
  customerId: string;
  locale?: AppLocale;
}) {
  const urls = buildStripeBillingConfigUrls(input.locale);
  const form = new URLSearchParams();
  form.set("customer", input.customerId);
  form.set("return_url", urls.portalReturnUrl);

  const payload = await stripeFormPost("/v1/billing_portal/sessions", form);

  if (!payload.url) {
    throw new Error("Stripe billing portal session did not include a redirect URL.");
  }

  return {
    id: payload.id,
    url: payload.url,
  };
}

function parseStripeSignatureHeader(signatureHeader: string | null) {
  if (!signatureHeader) {
    return null;
  }

  const timestamp = signatureHeader
    .split(",")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("t="))
    ?.slice(2);
  const signatures = signatureHeader
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.slice(3))
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  const numericTimestamp = Number(timestamp);

  if (!Number.isFinite(numericTimestamp)) {
    return null;
  }

  return {
    timestamp: numericTimestamp,
    signatures,
  };
}

function constantTimeMatchesSignature(expectedHex: string, candidateHex: string) {
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const candidateBuffer = Buffer.from(candidateHex, "hex");

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function verifyStripeWebhookSignature(input: {
  payload: string;
  signatureHeader: string | null;
  secret: string;
  nowMs?: number;
  toleranceSeconds?: number;
}) {
  const parsedHeader = parseStripeSignatureHeader(input.signatureHeader);

  if (!parsedHeader) {
    return false;
  }

  const toleranceSeconds = input.toleranceSeconds ?? 300;
  const nowMs = input.nowMs ?? Date.now();
  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - parsedHeader.timestamp);

  if (ageSeconds > toleranceSeconds) {
    return false;
  }

  const expectedSignature = createHmac("sha256", input.secret)
    .update(`${parsedHeader.timestamp}.${input.payload}`, "utf8")
    .digest("hex");

  return parsedHeader.signatures.some((signature) =>
    constantTimeMatchesSignature(expectedSignature, signature),
  );
}

export function parseStripeWebhookEvent(payload: string) {
  return stripeEventSchema.parse(JSON.parse(payload));
}
