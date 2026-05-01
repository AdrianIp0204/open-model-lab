import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
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
    pathname: "/about",
    heading: "Learning should feel like exploring a system, not memorizing disconnected pieces.",
    ctaTestId: "about-primary-cta",
    forbiddenNavName: /about sections/i,
  },
  {
    pathname: "/pricing",
    heading: "Core learning stays free. Supporter helps keep the project running.",
    ctaTestId: "pricing-primary-cta",
    sectionNavName: /pricing sections/i,
  },
] as const;

const pricingSectionNavLinks = [
  ["Compare free and Supporter", "#pricing-compare"],
  ["Access model", "#pricing-access-model"],
  ["Ads model", "#pricing-ad-model"],
  ["Plan actions", "#pricing-subscription-actions"],
  ["Billing details", "#pricing-billing-details"],
] as const;

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

async function expectPricingSectionNavUsable(page: Page, viewportCase: ViewportCase) {
  if (viewportCase.viewport.width >= 1024) {
    const sectionNav = page.getByRole("navigation", { name: /pricing sections/i });

    await expect(sectionNav).toBeVisible();

    for (const [name, href] of pricingSectionNavLinks) {
      await expect(sectionNav.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    await sectionNav.getByRole("link", { name: "Ads model" }).click();
    await expect(page).toHaveURL(/#pricing-ad-model$/);
    return;
  }

  await expect(page.getByText("Pricing sections").first()).toBeVisible();

  const mobileToggle = page.getByTestId("page-section-mobile-toggle");
  await expect(mobileToggle).toBeVisible();
  await mobileToggle.click();

  const mobilePanel = page.getByTestId("page-section-mobile-panel");
  await expect(mobilePanel).toBeVisible();

  for (const [name, href] of pricingSectionNavLinks) {
    await expect(mobilePanel.getByRole("link", { name })).toHaveAttribute("href", href);
  }

  await mobilePanel.getByRole("link", { name: "Ads model" }).click();
  await expect(page).toHaveURL(/#pricing-ad-model$/);
}

test.setTimeout(120_000);

test("keeps about sequential and pricing section navigation usable across responsive breakpoints", async ({
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

          if ("forbiddenNavName" in route) {
            await expect(
              page.getByRole("navigation", { name: route.forbiddenNavName }),
            ).toHaveCount(0);
          }

          const primaryCta = page.getByTestId(route.ctaTestId);
          await expect(primaryCta).toBeVisible();

          const ctaTop = await primaryCta.evaluate((element) =>
            element.getBoundingClientRect().top,
          );
          expect(ctaTop).toBeLessThan(viewportCase.viewport.height);

          if ("sectionNavName" in route) {
            await expectPricingSectionNavUsable(page, viewportCase);
          }

          browserGuard.assertNoActionableIssues();
        } finally {
          await context.close();
        }
      });
    }
  }
});
