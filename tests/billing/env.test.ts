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

  it("builds Stripe return URLs from an official Cloudflare preview request origin", () => {
    const previewOrigin =
      "https://fix-seo-indexability-canonical-homepage-openmodellab.dreamresearcher0204.workers.dev";
    const urls = buildStripeBillingConfigUrls({
      requestOrigin: previewOrigin,
    });

    expect(urls.checkoutSuccessUrl).toBe(
      `${previewOrigin}/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}`,
    );
    expect(urls.checkoutCancelUrl).toBe(
      `${previewOrigin}/pricing?billing=checkout-canceled#compare`,
    );
    expect(urls.portalReturnUrl).toBe(`${previewOrigin}/account?billing=portal-returned`);
  });

  it("builds Stripe return URLs from a configured allowed preview request origin", () => {
    vi.stubEnv(
      "OPEN_MODEL_LAB_BILLING_ALLOWED_RETURN_ORIGINS",
      "https://preview-openmodellab.example",
    );

    const urls = buildStripeBillingConfigUrls({
      requestOrigin: "https://preview-openmodellab.example",
    });

    expect(urls.checkoutSuccessUrl).toBe(
      "https://preview-openmodellab.example/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.checkoutCancelUrl).toBe(
      "https://preview-openmodellab.example/pricing?billing=checkout-canceled#compare",
    );
    expect(urls.portalReturnUrl).toBe(
      "https://preview-openmodellab.example/account?billing=portal-returned",
    );
  });

  it("does not trust arbitrary request origins for Stripe return URLs", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OPEN_MODEL_LAB_BILLING_ALLOWED_RETURN_ORIGINS", "");
    vi.stubEnv("OPEN_MODEL_LAB_BILLING_RETURN_URL_BASE", "");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SITE_URL", "");

    const urls = buildStripeBillingConfigUrls({
      requestOrigin: "https://attacker.example",
    });

    expect(urls.checkoutSuccessUrl).toBe(
      "http://localhost:3000/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.checkoutCancelUrl).toBe(
      "http://localhost:3000/pricing?billing=checkout-canceled#compare",
    );
    expect(urls.portalReturnUrl).toBe(
      "http://localhost:3000/account?billing=portal-returned",
    );
    expect(Object.values(urls).some((url) => url.startsWith("https://attacker.example"))).toBe(
      false,
    );
  });

  it("uses a local billing return URL base outside production when no origin or env is available", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OPEN_MODEL_LAB_BILLING_ALLOWED_RETURN_ORIGINS", "");
    vi.stubEnv("OPEN_MODEL_LAB_BILLING_RETURN_URL_BASE", "");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SITE_URL", "");

    const urls = buildStripeBillingConfigUrls();

    expect(urls.checkoutSuccessUrl).toBe(
      "http://localhost:3000/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.checkoutCancelUrl).toBe(
      "http://localhost:3000/pricing?billing=checkout-canceled#compare",
    );
    expect(urls.portalReturnUrl).toBe(
      "http://localhost:3000/account?billing=portal-returned",
    );
    expect(Object.values(urls).some((url) => url.startsWith("https://openmodellab.com"))).toBe(
      false,
    );
  });

  it("falls back to the production billing return URL base in production when no origin or env is available", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPEN_MODEL_LAB_BILLING_ALLOWED_RETURN_ORIGINS", "");
    vi.stubEnv("OPEN_MODEL_LAB_BILLING_RETURN_URL_BASE", "");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SITE_URL", "");

    const urls = buildStripeBillingConfigUrls();

    expect(urls.checkoutSuccessUrl).toBe(
      "https://openmodellab.com/account?billing=checkout-returned&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.checkoutCancelUrl).toBe(
      "https://openmodellab.com/pricing?billing=checkout-canceled#compare",
    );
    expect(urls.portalReturnUrl).toBe(
      "https://openmodellab.com/account?billing=portal-returned",
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
      checkoutSuccessUrl: "http://127.4.5.6:3000/account?billing=checkout-returned",
      checkoutCancelUrl: "http://[::1]:3000/pricing?billing=checkout-canceled#compare",
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
