// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildStripeBillingConfigUrls,
  describeStripeCheckoutConfigIssues,
  getStripeBillingConfig,
  getStripeBillingPortalConfigIssues,
  getStripeCheckoutConfigIssues,
  isStripeCheckoutConfigured,
  isStripeWebhookConfigured,
  type StripeBillingConfig,
} from "@/lib/billing/env";

function buildConfig(overrides?: Partial<StripeBillingConfig>): StripeBillingConfig {
  return {
    apiBaseUrl: "https://api.stripe.com",
    secretKey: "sk_test_123",
    webhookSecret: "whsec_123",
    premiumPriceId: "price_123",
    achievementRewardCouponId: null,
    checkoutSuccessUrl: "https://openmodellab.com/account?billing=checkout-returned",
    checkoutCancelUrl: "https://openmodellab.com/pricing?billing=checkout-canceled#compare",
    portalReturnUrl: "https://openmodellab.com/account?billing=portal-returned",
    ...overrides,
  };
}

describe("billing env helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats checkout as configured when the Stripe secret, webhook secret, price id, and return URLs are present", () => {
    const config = buildConfig();

    expect(getStripeCheckoutConfigIssues(config)).toEqual([]);
    expect(isStripeCheckoutConfigured(config)).toBe(true);
    expect(isStripeWebhookConfigured(config)).toBe(true);
  });

  it("reports missing Stripe webhook secrets for hosted billing flows", () => {
    const config = buildConfig({
      webhookSecret: null,
    });

    expect(getStripeCheckoutConfigIssues(config)).toContain("missing_webhook_secret");
    expect(getStripeBillingPortalConfigIssues(config)).toContain(
      "missing_webhook_secret",
    );
    expect(isStripeCheckoutConfigured(config)).toBe(false);
    expect(isStripeWebhookConfigured(config)).toBe(false);
  });

  it("reports missing Stripe secret keys for checkout", () => {
    const config = buildConfig({
      secretKey: null,
    });

    expect(getStripeCheckoutConfigIssues(config)).toContain("missing_secret_key");
  });

  it("reports missing Supporter price ids for checkout", () => {
    const config = buildConfig({
      premiumPriceId: null,
    });

    expect(getStripeCheckoutConfigIssues(config)).toContain("missing_price_id");
    expect(
      describeStripeCheckoutConfigIssues(getStripeCheckoutConfigIssues(config)),
    ).toMatch(/supporter price id is missing/i);
  });

  it("includes the checkout session placeholder in the success return URL", () => {
    expect(getStripeBillingConfig().checkoutSuccessUrl).toContain(
      "/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
    );
  });

  it("builds locale-prefixed Stripe return URLs when a locale is provided", () => {
    const urls = buildStripeBillingConfigUrls("zh-HK");

    expect(urls.checkoutSuccessUrl).toContain(
      "/zh-HK/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.checkoutCancelUrl).toContain(
      "/zh-HK/pricing?billing=checkout-canceled#compare",
    );
    expect(urls.portalReturnUrl).toContain("/zh-HK/account?billing=portal-returned");
  });

  it("treats localhost return URLs as invalid for production checkout", () => {
    vi.stubEnv("NODE_ENV", "production");

    const config = buildConfig({
      checkoutSuccessUrl: "http://localhost:3000/account?billing=checkout-returned",
      checkoutCancelUrl: "http://localhost:3000/pricing?billing=checkout-canceled#compare",
    });

    expect(getStripeCheckoutConfigIssues(config)).toEqual([
      "invalid_checkout_success_url",
      "invalid_checkout_cancel_url",
    ]);
    expect(isStripeCheckoutConfigured(config)).toBe(false);
  });

  it("treats localhost portal return URLs as invalid for production subscription management", () => {
    vi.stubEnv("NODE_ENV", "production");

    const config = buildConfig({
      portalReturnUrl: "http://localhost:3000/account?billing=portal-returned",
    });

    expect(getStripeBillingPortalConfigIssues(config)).toEqual([
      "invalid_portal_return_url",
    ]);
  });
});
