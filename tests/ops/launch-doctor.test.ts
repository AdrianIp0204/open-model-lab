// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

async function importScriptModule(relativePath: string) {
  return import(pathToFileURL(path.resolve(process.cwd(), relativePath)).href);
}

function writeLaunchDoctorFixtureRepo(root: string, options?: { wranglerJsonc?: string }) {
  for (const relativePath of [
    "app/auth/confirm/route.ts",
    "app/auth/callback/page.tsx",
    "app/api/account/session/route.ts",
    "app/api/account/password/route.ts",
    "app/account/page.tsx",
    "app/account/reset-password/page.tsx",
    "app/pricing/page.tsx",
    "app/billing/page.tsx",
    "app/api/billing/checkout/route.ts",
    "app/api/billing/portal/route.ts",
    "app/api/billing/webhook/route.ts",
    "app/contact/page.tsx",
    "app/api/feedback/route.ts",
  ]) {
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "// fixture\n");
  }

  fs.writeFileSync(
    path.join(root, "wrangler.jsonc"),
    options?.wranglerJsonc ??
      `{
  "keep_vars": true,
  "secrets": {
    "required": [
      "RESEND_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET"
    ]
  },
  "vars": {
    "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL": "https://openmodellab.test"
  }
}`,
  );
}

describe("launch doctor", () => {
  it("builds a clean report for a fully configured staging environment", async () => {
    const { buildLaunchDoctorReport } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "open-model-lab-launch-doctor-clean-"),
    );

    try {
      writeLaunchDoctorFixtureRepo(tempRoot);
      fs.writeFileSync(
        path.join(tempRoot, ".dev.vars"),
        [
          "RESEND_API_KEY=re_test_feedback_key",
          "SUPABASE_SERVICE_ROLE_KEY=sb_service_role_key_123",
          "STRIPE_SECRET_KEY=sk_test_123",
          "STRIPE_WEBHOOK_SECRET=whsec_123",
        ].join("\n"),
      );

      const report = buildLaunchDoctorReport(tempRoot, {
        NODE_ENV: "development",
        NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: "https://openmodellab.test",
        NEXT_PUBLIC_SUPABASE_URL: "https://supabase.openmodellab.test",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_key_123",
        SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_key_123",
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_PREMIUM_PRICE_ID: "price_123",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
        NEXT_PUBLIC_FEEDBACK_EMAIL: "hello@openmodellab.test",
        RESEND_API_KEY: "re_test_feedback_key",
        FEEDBACK_FROM_EMAIL: "Open Model Lab <feedback@openmodellab.test>",
        FEEDBACK_TO_EMAIL: "inbox@openmodellab.test",
      });

      expect(report.summary.siteUrl).toBe("https://openmodellab.test");
      expect(report.summary.supabaseReady).toBe(true);
      expect(report.summary.stripeMode).toBe("test");
      expect(report.summary.stripeCheckoutReady).toBe(true);
      expect(report.summary.stripePortalReady).toBe(true);
      expect(report.summary.stripeWebhookReady).toBe(true);
      expect(report.summary.feedbackDeliveryReady).toBe(true);
      expect(report.summary.cloudflarePreviewParityReady).toBe(true);
      expect(report.findings.errors).toEqual([]);
      expect(report.findings.warnings).toEqual([]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("reports missing core auth envs as launch-blocking errors", async () => {
    const { buildLaunchDoctorReport } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const report = buildLaunchDoctorReport(process.cwd(), {
      NODE_ENV: "development",
    });

    expect(report.findings.errors.map((finding: { code: string }) => finding.code)).toEqual(
      expect.arrayContaining([
        "missing_site_url",
        "missing_supabase_url",
        "missing_supabase_publishable_key",
        "missing_supabase_service_role_key",
      ]),
    );
    expect(
      report.findings.warnings.map((finding: { code: string }) => finding.code),
    ).toEqual(
      expect.arrayContaining([
        "stripe_not_configured",
        "missing_public_feedback_email",
        "feedback_direct_delivery_not_configured",
      ]),
    );
  });

  it("flags partial Stripe and feedback config plus harness-only staging assumptions", async () => {
    const { buildLaunchDoctorReport } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const report = buildLaunchDoctorReport(process.cwd(), {
      NODE_ENV: "development",
      NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: "https://openmodellab.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.openmodellab.test",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_key_123",
      SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_key_123",
      STRIPE_SECRET_KEY: "sk_test_123",
      FEEDBACK_FROM_EMAIL: "not-an-email",
      FEEDBACK_TO_EMAIL: "support@openmodellab.test",
      ENABLE_DEV_ACCOUNT_HARNESS: "true",
    });

    expect(report.findings.errors.map((finding: { code: string }) => finding.code)).toEqual(
      expect.arrayContaining([
        "missing_stripe_price_id",
        "missing_stripe_webhook_secret",
        "missing_resend_api_key",
        "invalid_feedback_from_email",
      ]),
    );
    expect(
      report.findings.warnings.map((finding: { code: string }) => finding.code),
    ).toEqual(
      expect.arrayContaining([
        "missing_public_feedback_email",
        "dev_account_harness_enabled",
      ]),
    );
  });

  it("warns when the canonical site URL env uses the production www host", async () => {
    const { buildLaunchDoctorReport } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const report = buildLaunchDoctorReport(process.cwd(), {
      NODE_ENV: "production",
      NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: "https://www.openmodellab.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.openmodellab.test",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_key_123",
      SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_key_123",
      STRIPE_SECRET_KEY: "sk_live_123",
      STRIPE_PREMIUM_PRICE_ID: "price_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      NEXT_PUBLIC_FEEDBACK_EMAIL: "hello@openmodellab.test",
      RESEND_API_KEY: "re_test_feedback_key",
      FEEDBACK_FROM_EMAIL: "Open Model Lab <feedback@openmodellab.test>",
      FEEDBACK_TO_EMAIL: "inbox@openmodellab.test",
    });

    expect(report.summary.siteUrl).toBe("https://www.openmodellab.com");
    expect(
      report.findings.warnings.map((finding: { code: string }) => finding.code),
    ).toContain("site_url_uses_www_canonical");
  });

  it("loads Next-style env files without overriding explicit shell env values", async () => {
    const { loadLaunchDoctorEnv } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "open-model-lab-launch-doctor-"),
    );

    try {
      fs.writeFileSync(
        path.join(tempRoot, ".env.local"),
        [
          "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL=https://from-dotenv.test",
          "STRIPE_SECRET_KEY=sk_test_from_dotenv",
          "NEXT_PUBLIC_FEEDBACK_EMAIL=hello@dotenv.test",
        ].join("\n"),
      );

      const loadedEnv = loadLaunchDoctorEnv(tempRoot, {
        NODE_ENV: "development",
        NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: "https://from-shell.test",
      });

      expect(loadedEnv.NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL).toBe(
        "https://from-shell.test",
      );
      expect(loadedEnv.STRIPE_SECRET_KEY).toBe("sk_test_from_dotenv");
      expect(loadedEnv.NEXT_PUBLIC_FEEDBACK_EMAIL).toBe("hello@dotenv.test");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("warns when Cloudflare preview secrets are not mirrored into .dev.vars", async () => {
    const { buildLaunchDoctorReport } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "open-model-lab-launch-doctor-preview-"),
    );

    try {
      writeLaunchDoctorFixtureRepo(tempRoot);
      fs.writeFileSync(
        path.join(tempRoot, ".dev.vars"),
        ["NEXTJS_ENV=development", "STRIPE_SECRET_KEY=sk_test_preview_only"].join("\n"),
      );

      const report = buildLaunchDoctorReport(tempRoot, {
        NODE_ENV: "development",
        NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: "https://openmodellab.test",
        NEXT_PUBLIC_SUPABASE_URL: "https://supabase.openmodellab.test",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_key_123",
        SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_key_123",
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_PREMIUM_PRICE_ID: "price_123",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
        NEXT_PUBLIC_FEEDBACK_EMAIL: "hello@openmodellab.test",
        RESEND_API_KEY: "re_test_feedback_key",
        FEEDBACK_FROM_EMAIL: "Open Model Lab <feedback@openmodellab.test>",
        FEEDBACK_TO_EMAIL: "inbox@openmodellab.test",
      });

      expect(report.summary.cloudflarePreviewParityReady).toBe(false);
      expect(
        report.findings.warnings.map((finding: { code: string }) => finding.code),
      ).toContain("missing_dev_vars_secret_mirror");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("flags harness-enabled Cloudflare preview config and site-url drift", async () => {
    const { buildLaunchDoctorReport } = await importScriptModule(
      "scripts/launch-doctor.mjs",
    );
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "open-model-lab-launch-doctor-cutover-"),
    );

    try {
      writeLaunchDoctorFixtureRepo(tempRoot, {
        wranglerJsonc: `{
  "keep_vars": true,
  "secrets": {
    "required": [
      "RESEND_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET"
    ]
  },
  "vars": {
    "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL": "https://openmodellab.com"
  }
}`,
      });
      fs.writeFileSync(
        path.join(tempRoot, ".dev.vars"),
        [
          "NEXTJS_ENV=development",
          "RESEND_API_KEY=re_test_feedback_key",
          "SUPABASE_SERVICE_ROLE_KEY=sb_service_role_key_123",
          "STRIPE_SECRET_KEY=sk_test_123",
          "STRIPE_WEBHOOK_SECRET=whsec_123",
          "ENABLE_DEV_ACCOUNT_HARNESS=true",
          "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL=https://preview.openmodellab.test",
        ].join("\n"),
      );

      const report = buildLaunchDoctorReport(tempRoot, {
        NODE_ENV: "development",
        NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: "https://staging.openmodellab.test",
        NEXT_PUBLIC_SUPABASE_URL: "https://supabase.openmodellab.test",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_key_123",
        SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_key_123",
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_PREMIUM_PRICE_ID: "price_123",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
        NEXT_PUBLIC_FEEDBACK_EMAIL: "hello@openmodellab.test",
        RESEND_API_KEY: "re_test_feedback_key",
        FEEDBACK_FROM_EMAIL: "Open Model Lab <feedback@openmodellab.test>",
        FEEDBACK_TO_EMAIL: "inbox@openmodellab.test",
      });

      expect(report.summary.cloudflarePreviewParityReady).toBe(false);
      expect(
        report.findings.warnings.map((finding: { code: string }) => finding.code),
      ).toEqual(
        expect.arrayContaining([
          "dev_harness_enabled_in_dev_vars",
          "dev_vars_site_url_mismatch",
          "wrangler_site_url_mismatch",
        ]),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
