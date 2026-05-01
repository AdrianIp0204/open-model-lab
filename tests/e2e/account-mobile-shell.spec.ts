import { expect, test } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, setHarnessSession, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-in-free");
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("keeps the mobile account route focused on content instead of showing a persistent section-pill wall", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/account");

  await expect(page.getByRole("button", { name: /open navigation menu/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /change language/i })).not.toBeVisible();
  await expect(page.getByRole("link", { name: /continue learning/i })).not.toBeVisible();

  const sectionToggle = page.getByTestId("page-section-mobile-toggle");
  await expect(sectionToggle).toBeVisible();
  await expect(page.getByTestId("page-section-mobile-panel")).toHaveCount(0);

  const firstHeading = page.locator("main h1, main h2").first();
  await expect(firstHeading).toBeVisible();
  const headingTop = await firstHeading.evaluate((element) =>
    element.getBoundingClientRect().top,
  );
  expect(headingTop).toBeLessThan(844);

  await sectionToggle.click();
  await expect(page.getByTestId("page-section-mobile-panel")).toBeVisible();
  await expect(page.getByRole("link", { name: /overview/i })).toBeVisible();
});
