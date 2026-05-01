import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, setHarnessSession, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;
const onboardingStorageKey = "open-model-lab.onboarding.v1";

async function openCompactMenu(page: Page) {
  const menuButton = page.getByRole("button", { name: /open navigation menu/i });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toBeEnabled();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await menuButton.click();
    if (await page.getByRole("navigation", { name: /mobile primary/i }).count()) {
      break;
    }
    await page.waitForTimeout(250);
  }

  await expect(page.getByRole("navigation", { name: /mobile primary/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /close navigation menu/i })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("keeps wide desktop navigation visible and the compact menu working on smaller breakpoints while preserving footer grouping", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: true,
        lastStep: 0,
        updatedAt: "2026-05-02T00:00:00.000Z",
      }),
    );
  }, onboardingStorageKey);

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoAndExpectOk(page, "/");

  await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /open navigation menu/i })).toHaveCount(0);

  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByTestId("footer-trust-group")).toBeVisible();
  await expect(footer.getByTestId("footer-more-group")).toBeVisible();
  await expect(footer.getByRole("link", { name: "About" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Pricing" })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoAndExpectOk(page, "/");
  const laptopMenuButton = page.getByRole("button", { name: /open navigation menu/i });
  await expect(laptopMenuButton).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await gotoAndExpectOk(page, "/");
  await openCompactMenu(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/start");
  await openCompactMenu(page);
});
