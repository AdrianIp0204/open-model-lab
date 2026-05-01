import { expect, test, type Locator } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  seedLocalProgressSnapshot,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const mobileProgressSnapshot = {
  version: 1,
  concepts: {
    "projectile-motion": {
      conceptId: "concept-projectile-motion",
      slug: "projectile-motion",
      firstVisitedAt: "2026-04-02T08:00:00.000Z",
      lastVisitedAt: "2026-04-06T08:05:00.000Z",
      lastInteractedAt: "2026-04-06T08:05:00.000Z",
      completedChallenges: {
        "pm-ch-flat-far-shot": "2026-04-05T08:00:00.000Z",
        "pm-ch-apex-freeze": "2026-04-06T08:00:00.000Z",
      },
    },
    "uniform-circular-motion": {
      conceptId: "concept-uniform-circular-motion",
      slug: "uniform-circular-motion",
      firstVisitedAt: "2026-04-04T08:00:00.000Z",
      lastVisitedAt: "2026-04-04T08:10:00.000Z",
    },
  },
} as const;

const dashboardMobileViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
] as const;

const auditedMobileRoutes = [
  "/start",
  "/search",
  "/pricing",
  "/account",
  "/concepts/projectile-motion",
  "/tracks/motion-and-circular-motion",
  "/guided/waves-evidence-loop",
] as const;

let browserGuard: BrowserGuard;

async function expectReadableOnDarkLinks(locator: Locator) {
  const count = await locator.count();

  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const link = locator.nth(index);
    await expect(link).toBeVisible();

    const styles = await link.evaluate((element) => {
      const computed = getComputedStyle(element);

      return {
        text: element.textContent?.trim() ?? "",
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    expect(
      styles.color,
      `Expected "${styles.text}" to keep the light on-dark foreground.`,
    ).toBe("rgb(255, 253, 247)");
    expect(
      styles.color,
      `Expected "${styles.text}" to avoid matching its dark pill background.`,
    ).not.toBe(styles.backgroundColor);
  }
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("dashboard next-step prompt CTAs keep readable mobile contrast across common phone widths", async ({
  page,
}) => {
  await seedLocalProgressSnapshot(page, mobileProgressSnapshot);
  await setHarnessSession(page, "signed-in-free");

  for (const viewport of dashboardMobileViewports) {
    await page.setViewportSize(viewport);
    await gotoAndExpectOk(page, "/dashboard");
    await page.waitForLoadState("networkidle");

    await expectReadableOnDarkLinks(page.locator("a.bg-ink-950, button.bg-ink-950"));
  }
});

test("other audited mobile dark-pill links keep the shared on-dark foreground contract", async ({
  page,
}) => {
  await seedLocalProgressSnapshot(page, mobileProgressSnapshot);
  await setHarnessSession(page, "signed-in-free");
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of auditedMobileRoutes) {
    await gotoAndExpectOk(page, route);
    await page.waitForLoadState("networkidle");
    await expectReadableOnDarkLinks(page.locator("a.bg-ink-950, button.bg-ink-950"));
  }
});
