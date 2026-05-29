import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

const auditedRoutes = [
  "/zh-HK/concepts/derivative-as-slope-local-rate-of-change",
  "/zh-HK/concepts/simple-harmonic-motion",
  "/zh-HK/pricing",
  "/zh-HK/search",
] as const;

const unsafeZhHkFallbackPatterns = [
  /項目@/u,
  /開啟模式項目/u,
  /項目\s+項目/u,
  /項目\s+is\b/iu,
  /項目\s+in\b/iu,
  /\bon\s+項目/iu,
  /\bto\s+項目/iu,
] as const;

type ThemeMode = "dark-lab" | "paper-lab";

let browserGuard: BrowserGuard;

async function installThemeMode(page: Page, mode: ThemeMode) {
  await page.addInitScript((themeMode) => {
    window.localStorage.setItem("oml-theme-mode", themeMode);
    if (document.documentElement) {
      document.documentElement.dataset.theme = themeMode;
    }
  }, mode);
}

async function expectZhHkVisibleTextIntegrity(page: Page, route: string, themeMode: ThemeMode) {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, route);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", themeMode);

  const bodyText = await page.locator("body").innerText();

  for (const pattern of unsafeZhHkFallbackPatterns) {
    expect(
      bodyText,
      `${route} in ${themeMode} must not contain unsafe zh-HK fallback pattern ${pattern}.`,
    ).not.toMatch(pattern);
  }

  expect(
    bodyText,
    `${route} in ${themeMode} should keep support email text readable.`,
  ).toMatch(/\b[A-Z0-9._%+-]+@openmodellab\.(?:example|com|local)\b/iu);

  const supportMailtoHrefs = await page
    .locator('a[href^="mailto:"]')
    .evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href") ?? "",
        text: (link.textContent ?? "").replace(/\s+/gu, " ").trim(),
      })),
    );

  expect(
    supportMailtoHrefs.length,
    `${route} in ${themeMode} should expose at least one support mailto link.`,
  ).toBeGreaterThan(0);

  for (const link of supportMailtoHrefs) {
    expect(link.href, `${route} in ${themeMode} has a corrupted mailto href.`).toMatch(
      /^mailto:[A-Z0-9._%+-]+@openmodellab\.(?:example|com|local)$/iu,
    );
    expect(link.text, `${route} in ${themeMode} has corrupted visible email text.`).toMatch(
      /^[A-Z0-9._%+-]+@openmodellab\.(?:example|com|local)$/iu,
    );
  }
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

for (const themeMode of ["paper-lab", "dark-lab"] as const) {
  test(`keeps zh-HK mobile visible text from using unsafe item fallbacks in ${themeMode}`, async ({
    page,
  }) => {
    await installThemeMode(page, themeMode);

    for (const route of auditedRoutes) {
      await test.step(route, async () => {
        await expectZhHkVisibleTextIntegrity(page, route, themeMode);
      });
    }
  });
}
