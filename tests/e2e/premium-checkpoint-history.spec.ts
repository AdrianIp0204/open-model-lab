import { expect, test } from "@playwright/test";
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

let browserGuard: BrowserGuard;

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
  await expect(
    page.getByRole("heading", { name: "Cross-device checkpoint history and mastery" }),
  ).toBeVisible();
  await expect(page.getByText("Trajectory checkpoint")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where saved mastery is holding" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open full mastery view" }),
  ).toHaveAttribute("href", "/dashboard/analytics#checkpoint-history");

  await gotoAndExpectOk(page, "/dashboard/analytics");
  await expect(page.getByRole("heading", { name: "Learning analytics" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cross-device checkpoint history and mastery" }),
  ).toBeVisible();
  await expect(page.getByText("Interference checkpoint")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved change points over time" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where mastery looks stable" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Which concepts still need another pass" }),
  ).toBeVisible();
});
