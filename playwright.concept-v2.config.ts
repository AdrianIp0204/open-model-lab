import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
const resolvedPort = Number(process.env.PLAYWRIGHT_PORT ?? "3201");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${resolvedPort}`;
process.env.PLAYWRIGHT_BASE_URL = baseURL;
process.env.PLAYWRIGHT_PORT = `${resolvedPort}`;

const accountStorePath = path.join(
  process.cwd(),
  "output",
  "playwright",
  `concept-v2-account-store-${Date.now()}.json`,
);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "**/concept-layout.spec.ts",
    "**/concept-page-status-surface.spec.ts",
    "**/concept-page-hero-ordering.spec.ts",
    "**/concept-page-v2-flow.spec.ts",
  ],
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/playwright/concept-v2-report" }],
  ],
  outputDir: "output/playwright/concept-v2-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start --hostname 127.0.0.1 --port ${resolvedPort}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ENABLE_DEV_ACCOUNT_HARNESS: "true",
      NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: baseURL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_playwright",
      STRIPE_WEBHOOK_SECRET:
        process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_playwright",
      STRIPE_PREMIUM_PRICE_ID:
        process.env.STRIPE_PREMIUM_PRICE_ID ?? "price_playwright",
      STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID:
        process.env.STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID ?? "coupon_playwright",
      OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH: path.join(
        process.cwd(),
        "output",
        "playwright",
        "dev-account-harness.json",
      ),
      OPEN_MODEL_LAB_ACCOUNT_STORE_PATH: accountStorePath,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
