import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  seedLocalProgressSnapshot,
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

const seededProgressSnapshot = {
  version: 1,
  concepts: {
    "graph-transformations": {
      conceptId: "concept-graph-transformations",
      slug: "graph-transformations",
      firstVisitedAt: "2026-04-04T09:00:00.000Z",
      lastVisitedAt: "2026-04-04T09:05:00.000Z",
      lastInteractedAt: "2026-04-04T09:05:00.000Z",
    },
  },
} as const;

const routeCases = [
  {
    pathname: "/start",
    heading: "Choose one bounded first step without guessing.",
    headingLevel: 1,
    primaryCtaTestId: "start-primary-cta",
    expectsFilters: false,
  },
  {
    pathname: "/concepts",
    heading: "Search fast, then keep the main results in view.",
    headingLevel: 1,
    primaryCtaTestId: "library-primary-cta",
    expectsFilters: true,
  },
  {
    pathname: "/search",
    heading: "Search concepts, topic pages, tracks, and guided paths from one place.",
    headingLevel: 1,
    primaryCtaTestId: "search-primary-cta",
    expectsFilters: true,
  },
  {
    pathname: "/concepts/subjects/physics",
    heading: "Physics",
    headingLevel: 1,
    primaryCtaTestId: "subject-primary-cta",
    expectsFilters: false,
  },
  {
    pathname: "/concepts/topics/mechanics",
    heading: "Mechanics",
    headingLevel: 1,
    primaryCtaTestId: "topic-primary-cta",
    expectsFilters: false,
  },
] as const;

test.setTimeout(180_000);

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

  await seedLocalProgressSnapshot(page, seededProgressSnapshot);
  await setHarnessSession(page, "signed-out");
  await gotoAndExpectOk(page, pathname);

  return { context, page, browserGuard };
}

test("keeps public discovery routes rail-free with visible next steps across key widths", async ({
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
          await expect(
            page.getByRole("heading", {
              name: route.heading,
              level: route.headingLevel,
            }),
          ).toBeVisible();
          await expect(page.getByRole("navigation", { name: /sections|jump within/i })).toHaveCount(
            0,
          );

          const primaryCta = page.getByTestId(route.primaryCtaTestId);
          await expect(primaryCta).toBeVisible();

          const ctaTop = await primaryCta.evaluate((element) =>
            element.getBoundingClientRect().top,
          );
          expect(ctaTop).toBeLessThan(viewportCase.viewport.height);

          if (route.expectsFilters) {
            await expect(page.getByRole("combobox", { name: /subject filter/i })).toBeVisible();
          }

          browserGuard.assertNoActionableIssues();
        } finally {
          await context.close();
        }
      });
    }
  }
});
