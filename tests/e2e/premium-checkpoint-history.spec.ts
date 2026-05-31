import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import {
  baseURL,
  gotoAndExpectOk,
  installBrowserGuards,
  resetHarnessAchievements,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const premiumHistorySeedSnapshot = {
  version: 1,
  concepts: {
    "projectile-motion": {
      conceptId: "concept-projectile-motion",
      slug: "projectile-motion",
      firstVisitedAt: "2026-04-01T09:00:00.000Z",
      completedQuickTestAt: "2026-04-01T09:20:00.000Z",
      completedChallenges: {
        "pm-ch-flat-far-shot": "2026-04-01T09:30:00.000Z",
      },
    },
    "wave-interference": {
      conceptId: "concept-wave-interference",
      slug: "wave-interference",
      firstVisitedAt: "2026-04-02T09:00:00.000Z",
      completedChallenges: {
        "wi-ch-find-dark-band": "2026-04-02T09:30:00.000Z",
      },
    },
  },
} as const;

const qaArtifactDir = path.join(process.cwd(), "output", "playwright", "qa");

let browserGuard: BrowserGuard;

async function saveQaScreenshot(locator: Locator, fileName: string) {
  await mkdir(qaArtifactDir, { recursive: true });
  await locator.screenshot({ path: path.join(qaArtifactDir, fileName) });
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("renders premium checkpoint history and mastery trends from synced progress", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-in-premium");
  await resetHarnessAchievements(page);

  const syncResponse = await page.context().request.put(`${baseURL}/api/account/progress`, {
    data: {
      snapshot: premiumHistorySeedSnapshot,
    },
  });

  expect(syncResponse.ok()).toBeTruthy();

  const syncPayload = (await syncResponse.json()) as {
    history?: {
      events?: Array<{ kind: string }>;
      masteryTimeline?: Array<unknown>;
    };
  };

  expect(syncPayload.history?.events?.length ?? 0).toBeGreaterThan(0);
  expect(syncPayload.history?.masteryTimeline?.length ?? 0).toBeGreaterThan(0);

  await gotoAndExpectOk(page, "/dashboard");
  const dashboardHistory = page.getByRole("region", {
    name: "Checkpoint history and mastery trends",
  });
  await expect(dashboardHistory).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Checkpoint history and mastery trends" }),
  ).toBeVisible();
  await expect(
    dashboardHistory.getByText("Trajectory checkpoint", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The latest checkpoint, challenge, and mastery moments",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved momentum over time" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The strongest subject trend right now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The clearest concept that still needs another pass" }),
  ).toBeVisible();
  const fullAnalyticsLink = dashboardHistory.getByRole("link", {
    name: "Open full analytics view",
  });
  await expect(fullAnalyticsLink).toBeVisible();
  await expect(fullAnalyticsLink).toHaveAttribute(
    "href",
    /\/dashboard\/analytics#checkpoint-history$/,
  );
  await saveQaScreenshot(
    dashboardHistory,
    "oml-qa-058-dashboard-checkpoint-history-desktop.png",
  );

  await fullAnalyticsLink.click();
  await expect(page).toHaveURL(/\/dashboard\/analytics#checkpoint-history$/);
  await expect(
    page.getByRole("heading", {
      name: "Review your saved learning signals without leaving the real product routes.",
    }),
  ).toBeVisible();
  const analyticsHistory = page.getByRole("region", {
    name: "Checkpoint history and mastery trends",
  });
  await expect(analyticsHistory).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Checkpoint history and mastery trends" }),
  ).toBeVisible();
  await expect(
    analyticsHistory.getByText("Interference checkpoint", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved momentum over time" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Subjects holding up well across recent work" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Concepts that are holding together well" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Concepts that still need another pass" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndExpectOk(page, "/dashboard");
  const phoneDashboardHistory = page.getByRole("region", {
    name: "Checkpoint history and mastery trends",
  });
  await expect(phoneDashboardHistory).toBeVisible();
  await expect(
    phoneDashboardHistory.getByRole("link", { name: "Open full analytics view" }),
  ).toBeVisible();
  await saveQaScreenshot(
    phoneDashboardHistory,
    "oml-qa-058-dashboard-checkpoint-history-phone.png",
  );
});
