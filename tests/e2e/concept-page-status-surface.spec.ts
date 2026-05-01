import { expect, test, type Page } from "@playwright/test";
import {
  baseURL,
  gotoAndExpectOk,
  installBrowserGuards,
  seedLocalProgressSnapshot,
} from "./helpers";

const desktopViewport = { width: 1440, height: 900 } as const;

async function openConceptPage(pathname: string, page: Page) {
  await gotoAndExpectOk(page, pathname);
  await expect(page.getByTestId("concept-page-status-surface")).toBeVisible();
}

test.describe("concept page v2 status surface", () => {
  test("shows a fresh concept as not started and lands on the first guided step", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: desktopViewport,
      baseURL,
    });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/graph-transformations");

      await expect(page.getByTestId("concept-page-status-surface")).toHaveCount(0);
      await page
        .getByTestId("concept-v2-start-handoff")
        .getByRole("button", { name: /Start concept/ })
        .click();
      await expect(page).toHaveURL(/#guided-step-slide-the-parent-curve$/);
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Slide the parent curve",
      );
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("resumes an in-progress concept at the current guided step", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: desktopViewport,
      baseURL,
    });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      await seedLocalProgressSnapshot(page, {
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            slug: "simple-harmonic-motion",
            firstVisitedAt: "2026-04-17T08:00:00.000Z",
            usedCompareModeAt: "2026-04-17T08:10:00.000Z",
          },
        },
        topicTests: {},
        packTests: {},
      });

      await openConceptPage("/en/concepts/simple-harmonic-motion", page);

      await expect(page.getByTestId("concept-page-status-overall")).toContainText(
        "In progress",
      );
      await expect(page.getByTestId("concept-page-status-primary-cta")).toContainText(
        "Continue at Link the stage and graphs",
      );
      await page.getByTestId("concept-page-status-primary-cta").click();
      await expect(page).toHaveURL(/#guided-step-link-stage-and-graphs$/);
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Link the stage and graphs",
      );
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("promotes a next-step CTA after completion and keeps review on the concept page", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: desktopViewport,
      baseURL,
    });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      await seedLocalProgressSnapshot(page, {
        version: 1,
        concepts: {
          "graph-transformations": {
            slug: "graph-transformations",
            firstVisitedAt: "2026-04-17T08:00:00.000Z",
            manualCompletedAt: "2026-04-17T08:30:00.000Z",
          },
        },
        topicTests: {},
        packTests: {},
      });

      await openConceptPage("/en/concepts/graph-transformations", page);

      await expect(page.getByTestId("concept-page-status-overall")).toContainText(
        "Completed",
      );
      await expect(page.getByTestId("concept-page-status-primary-cta")).toContainText(
        /^Next concept:/,
      );
      await expect(page.getByTestId("concept-page-status-secondary-cta")).toContainText(
        "Review this concept",
      );
      const [statusBox, startHereBox, guidedLabBox] = await Promise.all([
        page.getByTestId("concept-page-status-surface").boundingBox(),
        page.getByTestId("concept-v2-start-here").boundingBox(),
        page.getByTestId("concept-v2-guided-live-lab").boundingBox(),
      ]);
      expect(statusBox).not.toBeNull();
      expect(startHereBox).not.toBeNull();
      expect(guidedLabBox).not.toBeNull();
      expect(statusBox!.height).toBeLessThan(300);
      expect(startHereBox!.y - (statusBox!.y + statusBox!.height)).toBeLessThan(160);
      expect(guidedLabBox!.y - (startHereBox!.y + startHereBox!.height)).toBeLessThan(96);
      await page.getByTestId("concept-page-status-secondary-cta").click();
      await expect(page).toHaveURL(/#guided-step-explain-a-reflection$/);
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps zh-HK status CTAs localized and routed to the same guided-step hashes", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: desktopViewport,
      baseURL,
    });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      await seedLocalProgressSnapshot(page, {
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            slug: "simple-harmonic-motion",
            firstVisitedAt: "2026-04-17T08:00:00.000Z",
            usedCompareModeAt: "2026-04-17T08:10:00.000Z",
          },
        },
        topicTests: {},
        packTests: {},
      });

      await openConceptPage("/zh-HK/concepts/simple-harmonic-motion", page);

      await expect(page.getByTestId("concept-page-status-surface")).toContainText("你的進度");
      await expect(page.getByTestId("concept-page-status-primary-cta")).toContainText(
        "從「Link the stage and graphs」繼續",
      );
      await page.getByTestId("concept-page-status-primary-cta").click();
      await expect(page).toHaveURL(/#guided-step-link-stage-and-graphs$/);
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
});
