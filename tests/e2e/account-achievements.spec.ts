import { expect, test, type Page } from "@playwright/test";
import {
  installBrowserGuards,
  resetHarnessAchievements,
  seedHarnessAchievements,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const challengeCompletionKeys = [
  "angular-momentum:angular-momentum-ch-wide-same-l",
  "angular-momentum:angular-momentum-ch-compare-same-l",
  "angular-momentum:angular-momentum-ch-end-angle",
  "atomic-spectra:as-ch-two-visible-emission",
  "atomic-spectra:as-ch-match-absorption-notches",
  "basic-circuits:bc-ch-full-voltage-parallel-pair",
  "beats:beats-ch-slow-pulses",
];

const trackSlugs = [
  "motion-and-circular-motion",
  "rotational-mechanics",
  "gravity-and-orbits",
  "oscillations-and-energy",
  "fluid-and-pressure",
  "waves",
  "thermodynamics-and-kinetic-theory",
];
const REWARD_STUDY_HOURS_TARGET = 10;
const REWARD_REGION_NAME = "One-time Supporter starter reward";
const ONBOARDING_STORAGE_KEY = "open-model-lab.onboarding.v1";

async function suppressOnboardingPrompt(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: true,
        lastStep: 0,
        updatedAt: "2026-04-27T00:00:00.000Z",
      }),
    );
  }, ONBOARDING_STORAGE_KEY);
}

async function openAccount(page: Page) {
  await page.goto("/account");
  await expect(
    page.getByRole("heading", {
      name: "Signing in is optional. Supporter is a separate plan.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: REWARD_REGION_NAME }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Badges and study milestones" }),
  ).toBeVisible({ timeout: 15_000 });
}

function rewardCard(page: Page) {
  return page.getByRole("region", { name: REWARD_REGION_NAME });
}

function milestoneGroup(page: Page, title: string) {
  return page.getByRole("region", { name: title });
}

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("renders the signed-in free locked state with milestone groups", async ({ page }) => {
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    conceptVisitCount: 3,
    questionAnswerCount: 9,
    distinctChallengeCompletionCount: 1,
    activeStudyHours: 0.5,
    rewardState: "locked",
  });

  await openAccount(page);

  const reward = rewardCard(page);
  await expect(reward.getByText("Locked", { exact: true })).toBeVisible();
  await expect(
    reward.getByText(
      new RegExp(
        `either 30 distinct challenge modes or ${REWARD_STUDY_HOURS_TARGET} active study hours while your account is free`,
        "i",
      ),
    ),
  ).toBeVisible();
  await expect(reward).toContainText("You do not need both.");
  await expect(reward.locator("dt").filter({ hasText: "Challenge modes" })).toBeVisible();
  await expect(reward.locator("dd").filter({ hasText: "1 / 30" })).toBeVisible();
  await expect(reward.locator("dt").filter({ hasText: "Active study hours" })).toBeVisible();
  await expect(
    reward.locator("dd").filter({ hasText: `0.5 / ${REWARD_STUDY_HOURS_TARGET}` }),
  ).toBeVisible();
  await expect(reward.getByText("Pinned to locked by the dev harness fixture.")).toBeVisible();
  await expect(milestoneGroup(page, "Concept visits")).toBeVisible();
  await expect(milestoneGroup(page, "Questions answered")).toBeVisible();
  await expect(milestoneGroup(page, "Challenge modes completed")).toBeVisible();
  await expect(milestoneGroup(page, "Learning tracks completed")).toBeVisible();
  await expect(milestoneGroup(page, "Active study time")).toBeVisible();
  await expect(
    milestoneGroup(page, "Challenge modes completed").getByText("Unlocks reward"),
  ).toBeVisible();
  await expect(
    milestoneGroup(page, "Active study time").getByText("Unlocks reward"),
  ).toBeVisible();
  await expect(
    reward.getByRole("button", { name: "Claim reward and start Supporter" }),
  ).toHaveCount(0);
});

test("shows the unlocked reward CTA for an eligible free user and starts checkout initiation", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    distinctChallengeCompletionCount: 30,
    activeStudyHours: REWARD_STUDY_HOURS_TARGET,
    rewardState: "unlocked",
  });

  let checkoutCalls = 0;
  await page.route("**/api/billing/checkout", async (route) => {
    checkoutCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        url: "/pricing?billing=e2e-achievement-reward",
      }),
    });
  });

  await openAccount(page);

  const reward = rewardCard(page);
  await expect(reward.getByText("Unlocked", { exact: true })).toBeVisible();
  await expect(
    reward.getByText(/applied automatically at checkout from this account/i),
  ).toBeVisible();
  await expect(reward.getByText(/do not need to enter a coupon code/i)).toBeVisible();
  const cta = reward.getByRole("button", { name: "Claim reward and start Supporter" });
  await expect(cta).toBeVisible();

  await cta.click();

  await expect(page).toHaveURL(/\/pricing\?billing=e2e-achievement-reward$/);
  expect(checkoutCalls).toBe(1);
});

test("renders the claimed reward state as resumable without duplicate claim wording", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    distinctChallengeCompletionCount: 30,
    rewardState: "claimed",
  });

  await openAccount(page);

  const reward = rewardCard(page);
  await expect(reward.getByText("Claimed", { exact: true })).toBeVisible();
  await expect(
    reward.getByText(/discounted checkout was already reserved/i),
  ).toBeVisible();
  await expect(
    reward.getByRole("button", { name: "Resume discounted checkout" }),
  ).toBeVisible();
  await expect(
    reward.getByRole("button", { name: "Claim reward and start Supporter" }),
  ).toHaveCount(0);
});

test("renders the expired reward state clearly for a signed-in free user", async ({ page }) => {
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    distinctChallengeCompletionCount: 30,
    rewardState: "expired",
  });

  await openAccount(page);

  const reward = rewardCard(page);
  await expect(reward.getByText("Expired", { exact: true })).toBeVisible();
  await expect(reward.getByText(/expired on/i)).toBeVisible();
  await expect(
    reward.getByRole("button", { name: /Supporter/i }),
  ).toHaveCount(0);
});

test("keeps achievements visible for premium users while hiding the reward CTA", async ({ page }) => {
  await setHarnessSession(page, "signed-in-premium");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    conceptVisitCount: 12,
    questionAnswerCount: 60,
    distinctChallengeCompletionCount: 30,
    distinctTrackCompletionCount: 3,
    activeStudyHours: REWARD_STUDY_HOURS_TARGET,
    rewardState: "unlocked",
  });

  await openAccount(page);

  const reward = rewardCard(page);
  await expect(reward.getByText("Supporter active")).toBeVisible();
  await expect(milestoneGroup(page, "Questions answered")).toBeVisible();
  await expect(
    reward.getByRole("button", { name: /Supporter/i }),
  ).toHaveCount(0);
});

test("keeps long named badge lists collapsed until the learner expands them", async ({ page }) => {
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    challengeCompletionKeys,
    trackSlugs,
    rewardState: "locked",
  });

  await openAccount(page);

  const challengeGroup = page.getByRole("region", { name: "Challenge completion badges" });
  const toggle = challengeGroup.getByRole("button", { name: /Show \d+ more badges/ }).first();
  const collapsedCount = await challengeGroup.locator("article").count();

  await expect(toggle).toBeVisible();
  await toggle.click();

  const collapseButton = challengeGroup.getByRole("button", { name: "Show fewer badges" });
  await expect(collapseButton).toBeVisible();
  await expect(collapseButton).toHaveAttribute("aria-expanded", "true");

  const expandedCount = await challengeGroup.locator("article").count();
  expect(expandedCount).toBeGreaterThan(collapsedCount);
});

test("shows the achievement toast live region after a real signed-in question answer", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-in-free");
  await resetHarnessAchievements(page);
  await seedHarnessAchievements(page, {
    questionAnswerCount: 9,
    rewardState: "locked",
  });
  await suppressOnboardingPrompt(page);

  const sessionResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/account/session") && response.request().method() === "GET",
  );
  await page.goto("/concepts/projectile-motion#quick-test");
  await sessionResponse;
  const quickTest = page.locator('[data-testid="quiz-question-stage"]:visible').first();
  await expect(quickTest).toBeVisible();
  await expect(quickTest.getByText(/Question 1 of/i)).toBeVisible();

  await quickTest.locator('[data-testid^="quiz-choice-"]').first().click();

  const toast = page.getByRole("status").filter({ hasText: "Badge earned" });
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("10 questions milestone");
  await expect(page.locator("[aria-live=\"polite\"]").filter({ has: toast })).toBeVisible();
});
