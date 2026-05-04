import { addLocalePrefix, type AppLocale } from "@/i18n/routing";

export const STRIPE_API_VERSION = "2026-02-25.clover";
const PRODUCTION_BILLING_RETURN_URL_BASE = "https://openmodellab.com";
const LOCAL_BILLING_RETURN_URL_BASE = "http://localhost:3000";

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

export type StripeBillingConfigUrlOptions = {
  locale?: AppLocale;
  requestOrigin?: string | null;
  returnUrlBase?: string | null;
};

export type StripeBillingConfigIssue =
  | "missing_secret_key"
  | "missing_webhook_secret"
  | "missing_price_id"
  | "invalid_checkout_success_url"
  | "invalid_checkout_cancel_url"
  | "invalid_portal_return_url";

function normalizeBillingHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[(.*)\]$/, "$1");
}

function isLocalDevelopmentHostname(hostname: string) {
  const normalizedHostname = normalizeBillingHostname(hostname);

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "::1" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname.endsWith(".local")
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

function shouldDefaultBillingBaseToHttp(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  return (
    normalizedValue.startsWith("localhost") ||
    normalizedValue.startsWith("127.") ||
    normalizedValue.startsWith("0.0.0.0") ||
    normalizedValue.startsWith("[::1]") ||
    normalizedValue.startsWith("::1")
  );
}

function normalizeBillingReturnUrlBase(value: string | null | undefined) {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return null;
  }

  const valueWithProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(configuredValue)
    ? configuredValue
    : `${shouldDefaultBillingBaseToHttp(configuredValue) ? "http" : "https"}://${configuredValue}`;

  try {
    const parsedUrl = new URL(valueWithProtocol);
    parsedUrl.pathname = "/";
    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function readConfiguredBillingReturnUrlBase() {
  return (
    readEnv("OPEN_MODEL_LAB_BILLING_RETURN_URL_BASE") ??
    readEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL") ??
    readEnv("OPEN_MODEL_LAB_SITE_URL") ??
    readEnv("NEXT_PUBLIC_SITE_URL") ??
    readEnv("SITE_URL")
  );
}

function normalizeStripeBillingConfigUrlOptions(
  input?: AppLocale | StripeBillingConfigUrlOptions,
): StripeBillingConfigUrlOptions {
  return typeof input === "string" ? { locale: input } : input ?? {};
}

function getBillingReturnUrlBase(options: StripeBillingConfigUrlOptions) {
  return (
    normalizeBillingReturnUrlBase(options.returnUrlBase) ??
    normalizeBillingReturnUrlBase(options.requestOrigin) ??
    normalizeBillingReturnUrlBase(readConfiguredBillingReturnUrlBase()) ??
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_BILLING_RETURN_URL_BASE
      : LOCAL_BILLING_RETURN_URL_BASE)
  );
}

function buildBillingReturnUrl(
  path: string,
  options: StripeBillingConfigUrlOptions,
) {
  return new URL(
    localizeBillingReturnPath(path, options.locale),
    getBillingReturnUrlBase(options),
  ).toString();
}

export function buildStripeBillingConfigUrls(
  input?: AppLocale | StripeBillingConfigUrlOptions,
) {
  const options = normalizeStripeBillingConfigUrlOptions(input);

  return {
    checkoutSuccessUrl: buildBillingReturnUrl(
      "/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
      options,
    ),
    checkoutCancelUrl: buildBillingReturnUrl(
      "/pricing?billing=checkout-canceled#compare",
      options,
    ),
    portalReturnUrl: buildBillingReturnUrl(
      "/account?billing=portal-returned",
      options,
    ),
  };
}

export function getStripeBillingConfig(
  input?: AppLocale | StripeBillingConfigUrlOptions,
): StripeBillingConfig {
  return {
    apiBaseUrl: readEnv("STRIPE_API_BASE_URL") ?? "https://api.stripe.com",
    secretKey: readEnv("STRIPE_SECRET_KEY"),
    webhookSecret: readEnv("STRIPE_WEBHOOK_SECRET"),
    premiumPriceId: readEnv("STRIPE_PREMIUM_PRICE_ID"),
    achievementRewardCouponId: readEnv("STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID"),
    ...buildStripeBillingConfigUrls(input),
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
