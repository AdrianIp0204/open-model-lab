import { expect, test, type Page } from "@playwright/test";
import {
  installBrowserGuards,
  resetHarnessAchievements,
  seedHarnessAchievements,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const ACTIVE_STUDY_HOURS_TEXT = "Active study hours";
const REWARD_STUDY_HOURS_TARGET = 10;
const REWARD_REGION_NAME = "One-time Supporter starter reward";
const CONCEPT_SEED_HOURS = 174 / 3600;
const CHALLENGE_SEED_HOURS = 534 / 3600;
const ACTIVE_WAIT_MS = 14_000;

async function keepConceptSessionActive(page: Page, durationMs: number) {
  await page.mouse.move(200, 200);

  for (let elapsedMs = 0; elapsedMs < durationMs; elapsedMs += 4_000) {
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(4_000);
  }
}

async function expectRewardStudyHours(page: Page, expectedValue: string) {
  const reward = page.getByRole("region", { name: REWARD_REGION_NAME });
  await expect(reward.locator("dt").filter({ hasText: ACTIVE_STUDY_HOURS_TEXT })).toBeVisible();
  await expect(
    reward.locator("dd").filter({ hasText: `${expectedValue} / ${REWARD_STUDY_HOURS_TARGET}` }),
  ).toBeVisible();
}

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("records active study time from a signed-in concept page and shows it on the account reward surface", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    activeStudyHours: CONCEPT_SEED_HOURS,
    rewardState: "locked",
  });

  await page.goto("/concepts/simple-harmonic-motion", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Simple Harmonic Motion" }),
  ).toBeVisible();

  await keepConceptSessionActive(page, ACTIVE_WAIT_MS);

  await page.goto("/account", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Badges and study milestones" }),
  ).toBeVisible();
  await expectRewardStudyHours(page, "0.1");
});

test("keeps challenge-mode study time through navigation and shows the same canonical total on account", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    activeStudyHours: CHALLENGE_SEED_HOURS,
    rewardState: "locked",
  });

  await page.goto(
    "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot&phase=check#challenge-mode",
    {
    waitUntil: "domcontentloaded",
    },
  );
  await expect(
    page.getByRole("heading", { name: "Projectile Motion" }),
  ).toBeVisible();
  await expect(page.getByTestId("challenge-mode-full-panel")).toBeVisible();
  await page.evaluate(() => {
    document.getElementById("challenge-mode")?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  });
  await expect(page.getByTestId("challenge-mode-floating-panel")).toBeHidden();
  await page
    .getByTestId("challenge-mode-full-panel")
    .getByRole("button", { name: "Apply suggested start" })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const url = new URL(window.location.href);
        return {
          phase: url.searchParams.get("phase"),
          hash: url.hash,
        };
      }),
    )
    .toEqual({
      phase: null,
      hash: "#live-bench",
    });

  await keepConceptSessionActive(page, ACTIVE_WAIT_MS);

  await page.goto("/account", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Badges and study milestones" }),
  ).toBeVisible();
  await expectRewardStudyHours(page, "0.2");
});
