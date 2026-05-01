import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

type ViewportCase = {
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
};

const viewportCases: ViewportCase[] = [
  { name: "desktop-1440x900", viewport: { width: 1440, height: 900 } },
  { name: "tablet-landscape-1024x768", viewport: { width: 1024, height: 768 } },
  { name: "tablet-portrait-768x1024", viewport: { width: 768, height: 1024 } },
  {
    name: "mobile-390x844",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
];

const routeCases = [
  {
    pathname: "/guided",
    heading: "Follow a short path when you want the order chosen for you.",
    primaryCtaTestId: "guided-primary-cta",
    forbiddenNavName: /guided collection sections/i,
  },
  {
    pathname: "/guided/waves-evidence-loop",
    heading: "Waves Evidence Loop",
    primaryCtaTestId: "guided-detail-primary-cta",
    forbiddenNavName: /waves evidence loop sections|collection sections/i,
  },
  {
    pathname: "/tracks/motion-and-circular-motion",
    heading: "Motion and Circular Motion",
    primaryCtaTestId: "track-primary-cta",
    forbiddenNavName: /motion and circular motion sections/i,
  },
  {
    pathname: "/challenges",
    heading: "Pick a bounded task, then open the exact concept bench that can solve it.",
    primaryCtaTestId: "challenge-primary-cta",
    forbiddenNavName: /challenge sections/i,
  },
] as const;

test.setTimeout(120_000);

async function openRoute(
  browser: Browser,
  viewportCase: ViewportCase,
  pathname: string,
): Promise<{
  context: BrowserContext;
  page: Page;
  browserGuard: BrowserGuard;
}> {
  const context = await browser.newContext({
    viewport: viewportCase.viewport,
    isMobile: viewportCase.isMobile,
    hasTouch: viewportCase.hasTouch,
    deviceScaleFactor: viewportCase.deviceScaleFactor,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  await setHarnessSession(page, "signed-out");
  await gotoAndExpectOk(page, pathname);

  return { context, page, browserGuard };
}

test("keeps the guided, track, and challenge surfaces rail-free with a visible next action across key widths", async ({
  browser,
}) => {
  for (const viewportCase of viewportCases) {
    for (const route of routeCases) {
      await test.step(`${route.pathname} @ ${viewportCase.name}`, async () => {
        const { context, page, browserGuard } = await openRoute(
          browser,
          viewportCase,
          route.pathname,
        );

        try {
          await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
          await expect(page.getByRole("navigation", { name: route.forbiddenNavName })).toHaveCount(
            0,
          );

          const primaryCta = page.getByTestId(route.primaryCtaTestId);
          await expect(primaryCta).toBeVisible();

          const ctaBox = await primaryCta.boundingBox();
          expect(ctaBox).not.toBeNull();
          expect(ctaBox!.y).toBeLessThan(viewportCase.viewport.height);

          browserGuard.assertNoActionableIssues();
        } finally {
          await context.close();
        }
      });
    }
  }
});
