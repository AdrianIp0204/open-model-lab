import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const accountStorePath = path.join(
  process.cwd(),
  "output",
  "playwright",
  `account-store-${Date.now()}.json`,
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/playwright/report" }],
  ],
  outputDir: "output/playwright/test-results",
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
    command: "pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ENABLE_DEV_ACCOUNT_HARNESS: "true",
      NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: baseURL,
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_test_playwright",
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
