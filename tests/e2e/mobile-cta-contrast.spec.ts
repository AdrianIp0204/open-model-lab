import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
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

type AuditedMobileRoute = {
  pathname: string;
  ready: (page: Page) => Locator;
};

const auditedMobileRoutes: AuditedMobileRoute[] = [
  {
    pathname: "/start",
    ready: (page) => page.getByTestId("start-primary-cta"),
  },
  {
    pathname: "/search",
    ready: (page) => page.getByTestId("search-primary-cta"),
  },
  {
    pathname: "/pricing",
    ready: (page) => page.getByTestId("pricing-primary-cta"),
  },
  {
    pathname: "/account",
    ready: (page) => page.locator("#account-overview"),
  },
  {
    pathname: "/concepts/projectile-motion",
    ready: (page) => page.getByTestId("concept-live-lab"),
  },
  {
    pathname: "/tracks/motion-and-circular-motion",
    ready: (page) => page.getByTestId("track-primary-cta"),
  },
  {
    pathname: "/guided/waves-evidence-loop",
    ready: (page) => page.getByTestId("guided-detail-primary-cta"),
  },
];

const auditedMobileViewport = {
  width: 390,
  height: 844,
} as const;

let browserGuard: BrowserGuard;

async function expectReadableOnDarkLinks(locator: Locator) {
  const count = await locator.count();
  let visibleCount = 0;

  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const link = locator.nth(index);

    if (!(await link.isVisible())) {
      continue;
    }

    visibleCount += 1;

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

  expect(visibleCount).toBeGreaterThan(0);
}

async function openAuditedMobileRoute(
  browser: Browser,
  route: AuditedMobileRoute,
): Promise<{
  browserGuard: BrowserGuard;
  context: BrowserContext;
  page: Page;
}> {
  const context = await browser.newContext({
    viewport: auditedMobileViewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);
  let opened = false;

  try {
    await seedLocalProgressSnapshot(page, mobileProgressSnapshot);
    await setHarnessSession(page, "signed-in-free");
    await gotoAndExpectOk(page, route.pathname);
    await expect(page.locator("#content")).toBeVisible();
    await expect(route.ready(page)).toBeVisible();
    opened = true;
  } finally {
    if (!opened) {
      await context.close();
    }
  }

  return { browserGuard, context, page };
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
    await expect(page.locator("#content")).toBeVisible();

    await expectReadableOnDarkLinks(page.locator("a.bg-ink-950, button.bg-ink-950"));
  }
});

test("other audited mobile dark-pill links keep the shared on-dark foreground contract", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  for (const route of auditedMobileRoutes) {
    await test.step(route.pathname, async () => {
      const { browserGuard: routeGuard, context, page } =
        await openAuditedMobileRoute(browser, route);

      try {
        await expectReadableOnDarkLinks(page.locator("a.bg-ink-950, button.bg-ink-950"));
        routeGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    });
  }
});
