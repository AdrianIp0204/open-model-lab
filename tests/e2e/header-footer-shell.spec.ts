import { expect, test } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, setHarnessSession, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("keeps the menu toggle off wide desktop and working on smaller breakpoints while preserving footer grouping", async ({
  page,
}) => {
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
  await expect(page.getByRole("button", { name: /open navigation menu/i })).toHaveCount(0);

  await page.setViewportSize({ width: 768, height: 1024 });
  await gotoAndExpectOk(page, "/");
  const tabletMenuButton = page.getByRole("button", { name: /open navigation menu/i });
  await expect(tabletMenuButton).toBeVisible();
  await tabletMenuButton.click();
  await expect(page.getByRole("navigation", { name: /mobile primary/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /close navigation menu/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/start");
  const mobileMenuButton = page.getByRole("button", { name: /open navigation menu/i });
  await expect(mobileMenuButton).toBeVisible();
  await mobileMenuButton.click();
  await expect(page.getByRole("navigation", { name: /mobile primary/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /close navigation menu/i })).toBeVisible();
});
