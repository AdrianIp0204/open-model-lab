import { addLocalePrefix, type AppLocale } from "@/i18n/routing";
import { getAbsoluteUrl } from "@/lib/metadata/site";

export const STRIPE_API_VERSION = "2026-02-25.clover";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export type StripeBillingConfig = {
  apiBaseUrl: string;
  secretKey: string | null;
  webhookSecret: string | null;
  premiumPriceId: string | null;
  achievementRewardCouponId: string | null;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  portalReturnUrl: string;
};

export type StripeBillingConfigIssue =
  | "missing_secret_key"
  | "missing_webhook_secret"
  | "missing_price_id"
  | "invalid_checkout_success_url"
  | "invalid_checkout_cancel_url"
  | "invalid_portal_return_url";

function isLocalDevelopmentHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  );
}

function isValidStripeReturnUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    if (
      process.env.NODE_ENV === "production" &&
      isLocalDevelopmentHostname(url.hostname)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function readUrlHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function formatIssueList(reasons: string[]) {
  if (reasons.length === 0) {
    return "billing configuration is incomplete";
  }

  if (reasons.length === 1) {
    return reasons[0]!;
  }

  if (reasons.length === 2) {
    return `${reasons[0]} and ${reasons[1]}`;
  }

  return `${reasons.slice(0, -1).join(", ")}, and ${reasons.at(-1)}`;
}

export function describeStripeBillingConfigIssue(issue: StripeBillingConfigIssue) {
  switch (issue) {
    case "missing_secret_key":
      return "the Stripe secret key is missing";
    case "missing_webhook_secret":
      return "the Stripe webhook secret is missing";
    case "missing_price_id":
      return "the Supporter price id is missing";
    case "invalid_checkout_success_url":
      return "the checkout success return URL is invalid";
    case "invalid_checkout_cancel_url":
      return "the checkout cancel return URL is invalid";
    case "invalid_portal_return_url":
      return "the billing portal return URL is invalid";
  }
}

export function getStripeCheckoutConfigIssues(
  config = getStripeBillingConfig(),
) {
  const issues: StripeBillingConfigIssue[] = [];

  if (!config.secretKey) {
    issues.push("missing_secret_key");
  }

  if (!config.webhookSecret) {
    issues.push("missing_webhook_secret");
  }

  if (!config.premiumPriceId) {
    issues.push("missing_price_id");
  }

  if (!isValidStripeReturnUrl(config.checkoutSuccessUrl)) {
    issues.push("invalid_checkout_success_url");
  }

  if (!isValidStripeReturnUrl(config.checkoutCancelUrl)) {
    issues.push("invalid_checkout_cancel_url");
  }

  return issues;
}

export function getStripeBillingPortalConfigIssues(
  config = getStripeBillingConfig(),
) {
  const issues: StripeBillingConfigIssue[] = [];

  if (!config.secretKey) {
    issues.push("missing_secret_key");
  }

  if (!config.webhookSecret) {
    issues.push("missing_webhook_secret");
  }

  if (!isValidStripeReturnUrl(config.portalReturnUrl)) {
    issues.push("invalid_portal_return_url");
  }

  return issues;
}

export function describeStripeCheckoutConfigIssues(
  issues: StripeBillingConfigIssue[],
) {
  const reasons = issues.map(describeStripeBillingConfigIssue);

  return `Supporter checkout is unavailable because ${formatIssueList(reasons)}.`;
}

export function describeStripeBillingPortalConfigIssues(
  issues: StripeBillingConfigIssue[],
) {
  const reasons = issues.map(describeStripeBillingConfigIssue);

  return `Subscription management is unavailable because ${formatIssueList(reasons)}.`;
}

export function getStripeCheckoutConfigDiagnostics(
  config = getStripeBillingConfig(),
) {
  const issues = getStripeCheckoutConfigIssues(config);

  return {
    configured: issues.length === 0,
    issues,
    hasSecretKey: Boolean(config.secretKey),
    hasPremiumPriceId: Boolean(config.premiumPriceId),
    checkoutSuccessUrlHost: readUrlHost(config.checkoutSuccessUrl),
    checkoutCancelUrlHost: readUrlHost(config.checkoutCancelUrl),
  };
}

export function getStripeBillingPortalConfigDiagnostics(
  config = getStripeBillingConfig(),
) {
  const issues = getStripeBillingPortalConfigIssues(config);

  return {
    configured: issues.length === 0,
    issues,
    hasSecretKey: Boolean(config.secretKey),
    portalReturnUrlHost: readUrlHost(config.portalReturnUrl),
  };
}

const BILLING_RETURN_URL_BASE = "https://openmodellab.local";

function localizeBillingReturnPath(path: string, locale?: AppLocale) {
  if (!locale || locale === "en") {
    return path;
  }

  const url = new URL(path, BILLING_RETURN_URL_BASE);
  return `${addLocalePrefix(url.pathname, locale)}${url.search}${url.hash}`;
}

export function buildStripeBillingConfigUrls(locale?: AppLocale) {
  return {
    checkoutSuccessUrl: getAbsoluteUrl(
      localizeBillingReturnPath(
        "/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
        locale,
      ),
    ),
    checkoutCancelUrl: getAbsoluteUrl(
      localizeBillingReturnPath("/pricing?billing=checkout-canceled#compare", locale),
    ),
    portalReturnUrl: getAbsoluteUrl(
      localizeBillingReturnPath("/account?billing=portal-returned", locale),
    ),
  };
}

export function getStripeBillingConfig(): StripeBillingConfig {
  return {
    apiBaseUrl: readEnv("STRIPE_API_BASE_URL") ?? "https://api.stripe.com",
    secretKey: readEnv("STRIPE_SECRET_KEY"),
    webhookSecret: readEnv("STRIPE_WEBHOOK_SECRET"),
    premiumPriceId: readEnv("STRIPE_PREMIUM_PRICE_ID"),
    achievementRewardCouponId: readEnv("STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID"),
    ...buildStripeBillingConfigUrls(),
  };
}

export function isStripeCheckoutConfigured(config = getStripeBillingConfig()) {
  return getStripeCheckoutConfigIssues(config).length === 0;
}

export function isStripeBillingPortalConfigured(config = getStripeBillingConfig()) {
  return getStripeBillingPortalConfigIssues(config).length === 0;
}

export function isStripeWebhookConfigured(config = getStripeBillingConfig()) {
  return Boolean(config.secretKey && config.webhookSecret);
}
