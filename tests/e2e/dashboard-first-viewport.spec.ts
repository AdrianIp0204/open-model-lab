import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  resetPlaywrightHarnessProgressStore,
  seedSyncedProgressSnapshot,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const qaArtifactDir = path.join(process.cwd(), "output", "playwright", "qa");

const mobileProgressSnapshot = {
  version: 1,
  concepts: {
    "projectile-motion": {
      conceptId: "concept-projectile-motion",
      slug: "projectile-motion",
      firstVisitedAt: "2026-04-03T09:00:00.000Z",
      lastVisitedAt: "2026-04-05T09:10:00.000Z",
      lastInteractedAt: "2026-04-05T09:10:00.000Z",
      completedChallenges: {
        "pm-ch-flat-far-shot": "2026-04-05T09:15:00.000Z",
      },
    },
    "wave-interference": {
      conceptId: "concept-wave-interference",
      slug: "wave-interference",
      firstVisitedAt: "2026-04-04T10:00:00.000Z",
      lastVisitedAt: "2026-04-05T10:10:00.000Z",
      lastInteractedAt: "2026-04-05T10:10:00.000Z",
      usedChallengeModeAt: "2026-04-05T10:10:00.000Z",
      startedChallenges: {
        "wi-ch-find-dark-band": "2026-04-05T10:10:00.000Z",
      },
    },
  },
};

let browserGuard: BrowserGuard;

async function saveQaScreenshot(page: Page, fileName: string) {
  await mkdir(qaArtifactDir, { recursive: true });
  await page.screenshot({ path: path.join(qaArtifactDir, fileName), fullPage: false });
}

async function expectInFirstViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBeLessThanOrEqual(
    viewport?.height ?? 0,
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );

    return scrollWidth - window.innerWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoLeftEdgeClipping(page: Page, testIds: string[]) {
  const selector = testIds.map((id) => `[data-testid="${id}"]`).join(",");
  const failures = await page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0;

      if (!visible || (rect.left >= 12 && rect.right <= window.innerWidth + 1)) {
        return [];
      }

      return [
        {
          testId: element.getAttribute("data-testid"),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth: window.innerWidth,
        },
      ];
    }),
  );

  expect(failures).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await resetPlaywrightHarnessProgressStore();
  await page.setViewportSize({ width: 390, height: 844 });
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

async function prepareSignedInPage(
  page: Page,
  state: "signed-in-free" | "signed-in-premium",
  pathname: string,
) {
  await setHarnessSession(page, state);
  await seedSyncedProgressSnapshot(page, mobileProgressSnapshot);
  await gotoAndExpectOk(page, pathname);
}

test("OML-QA-062 shows a free dashboard phone action and signal before the fold", async ({
  page,
}) => {
  await prepareSignedInPage(page, "signed-in-free", "/dashboard");
  await expectInFirstViewport(page, page.getByTestId("dashboard-first-primary-action"));
  await expectInFirstViewport(page, page.getByTestId("dashboard-first-signal"));
  await expectNoLeftEdgeClipping(page, [
    "dashboard-first-move",
    "dashboard-first-signal",
  ]);
  await expectNoHorizontalOverflow(page);
  await saveQaScreenshot(page, "oml-qa-062-free-dashboard-phone.png");
});

test("OML-QA-062 shows a premium dashboard phone action and signal before the fold", async ({
  page,
}) => {
  await prepareSignedInPage(page, "signed-in-premium", "/dashboard");
  await expectInFirstViewport(page, page.getByTestId("dashboard-first-primary-action"));
  await expectInFirstViewport(page, page.getByTestId("dashboard-first-signal"));
  await expectNoLeftEdgeClipping(page, [
    "dashboard-first-move",
    "dashboard-first-signal",
  ]);
  await expectNoHorizontalOverflow(page);
  await saveQaScreenshot(page, "oml-qa-062-premium-dashboard-phone.png");
});

test("OML-QA-062 keeps locked free analytics padded and action-led on phone", async ({
  page,
}) => {
  await prepareSignedInPage(page, "signed-in-free", "/dashboard/analytics");
  await expectInFirstViewport(page, page.getByTestId("analytics-locked-primary-action"));
  await expectInFirstViewport(page, page.getByTestId("analytics-locked-first-signal"));
  await expectNoLeftEdgeClipping(page, [
    "analytics-locked-first-move",
    "analytics-locked-first-signal",
  ]);
  await expectNoHorizontalOverflow(page);
  await saveQaScreenshot(page, "oml-qa-062-free-analytics-phone.png");
});

test("OML-QA-062 shows a premium analytics phone action and signal before the fold", async ({
  page,
}) => {
  await prepareSignedInPage(page, "signed-in-premium", "/dashboard/analytics");
  await expectInFirstViewport(page, page.getByTestId("analytics-first-primary-action"));
  await expectInFirstViewport(page, page.getByTestId("analytics-first-signal"));
  await expectNoLeftEdgeClipping(page, [
    "analytics-first-move",
    "analytics-first-signal",
  ]);
  await expectNoHorizontalOverflow(page);
  await saveQaScreenshot(page, "oml-qa-062-premium-analytics-phone.png");
});
