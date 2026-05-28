import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, setHarnessSession, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;
const onboardingStorageKey = "open-model-lab.onboarding.v1";
const desktopBrandViewports = [
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
] as const;
const desktopBrandRoutes = [
  "/",
  "/concepts/simple-harmonic-motion",
  "/tools/chemistry-reaction-mind-map",
  "/circuit-builder",
] as const;

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

async function expectReadableDesktopBrand(page: Page) {
  const desktopHeaderBar = page.locator("header > div").first();
  const brandLink = page.getByRole("link", { name: /^open model lab$/i });

  await expect(brandLink).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toBeVisible();
  await expect(desktopHeaderBar.getByTestId("theme-mode-toggle")).toBeVisible();
  await expect(page.getByRole("link", { name: /^start learning$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^sign in$/i })).toBeVisible();

  const metrics = await brandLink.evaluate((brandElement) => {
    const titleElement = Array.from(brandElement.querySelectorAll("span")).find(
      (element) => element.textContent?.trim() === "Open Model Lab",
    );
    const subtitleElement = brandElement.querySelector('span[aria-hidden="true"]');
    const navElement = document.querySelector('[data-onboarding-target="main-navigation"]');
    const helpElement = document.querySelector('[data-onboarding-target="help-entry"]');

    if (
      !(titleElement instanceof HTMLElement) ||
      !(subtitleElement instanceof HTMLElement) ||
      !(navElement instanceof HTMLElement) ||
      !(helpElement instanceof HTMLElement)
    ) {
      return null;
    }

    const brandRect = brandElement.getBoundingClientRect();
    const navRect = navElement.getBoundingClientRect();
    const helpRect = helpElement.getBoundingClientRect();

    return {
      titleClientWidth: titleElement.clientWidth,
      titleScrollWidth: titleElement.scrollWidth,
      subtitleDisplay: getComputedStyle(subtitleElement).display,
      brandRight: Math.round(brandRect.right),
      navLeft: Math.round(navRect.left),
      navRight: Math.round(navRect.right),
      helpLeft: Math.round(helpRect.left),
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics, "Expected desktop header brand metrics to be available.").not.toBeNull();
  expect(metrics!.titleScrollWidth).toBeLessThanOrEqual(metrics!.titleClientWidth + 1);
  expect(metrics!.subtitleDisplay).toBe("none");
  expect(metrics!.brandRight).toBeLessThan(metrics!.navLeft);
  expect(metrics!.navRight).toBeLessThan(metrics!.helpLeft);
  expect(metrics!.documentScrollWidth).toBeLessThanOrEqual(metrics!.viewportWidth);
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

test("keeps the header brand readable on common desktop widths without displacing navigation", async ({
  page,
}) => {
  test.setTimeout(60_000);

  for (const viewport of desktopBrandViewports) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      for (const route of desktopBrandRoutes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);
          await expectReadableDesktopBrand(page);
        });
      }
    });
  }
});
