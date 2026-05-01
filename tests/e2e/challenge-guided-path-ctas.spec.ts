import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;

function getGuidedPathCard(page: Page, title: string) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: title, level: 3 }),
  }).first();
}

async function expectGuidedPathsAnchored(page: Page) {
  await expect(page).toHaveURL(/\/en\/challenges#challenge-guided-paths$/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const section = document.getElementById("challenge-guided-paths");

        if (!(section instanceof HTMLElement)) {
          return false;
        }

        const rect = section.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight * 0.35;
      }),
    )
    .toBe(true);
}

async function expectChallengeBrowserAnchored(page: Page, trackSlug: string) {
  await expect(page).toHaveURL(
    new RegExp(`/en/challenges\\?track=${trackSlug}#challenge-browser$`),
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const section = document.getElementById("challenge-browser");

        if (!(section instanceof HTMLElement)) {
          return false;
        }

        const rect = section.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight * 0.35;
      }),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("open first challenge uses the canonical first challenge for the path and back returns to guided paths", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/challenges#challenge-guided-paths");
  await expectGuidedPathsAnchored(page);

  const motionPathCard = getGuidedPathCard(page, "Motion and Circular Motion");
  await expect(motionPathCard).toBeVisible();

  await Promise.all([
    page.waitForURL(
      /\/en\/concepts\/vectors-components\?challenge=vc-ch-equal-components#challenge-mode$/,
      {
        timeout: 20_000,
      },
    ),
    motionPathCard.getByRole("link", { name: /open first challenge/i }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: "Vectors and Components", level: 1 }),
  ).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expectGuidedPathsAnchored(page);
});

test("show path challenges opens the browser section with the path filter applied", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/challenges#challenge-guided-paths");
  await expectGuidedPathsAnchored(page);

  const motionPathCard = getGuidedPathCard(page, "Motion and Circular Motion");
  await expect(motionPathCard).toBeVisible();

  await motionPathCard.getByRole("link", { name: /show path challenges/i }).click();

  await expectChallengeBrowserAnchored(page, "motion-and-circular-motion");
  const browserSection = page.locator("#challenge-browser");

  await expect(
    browserSection.getByRole("heading", { name: "Flat long shot", level: 3 }),
  ).toBeVisible();
  await expect(
    browserSection.getByRole("heading", { name: "Real-image target", level: 3 }),
  ).toHaveCount(0);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expectGuidedPathsAnchored(page);
});

test("show path challenges is keyboard-activatable and not a no-op", async ({ page }) => {
  await gotoAndExpectOk(page, "/en/challenges#challenge-guided-paths");

  const motionPathCard = getGuidedPathCard(page, "Motion and Circular Motion");
  const showPathChallengesLink = motionPathCard.getByRole("link", {
    name: /show path challenges/i,
  });

  await expect(showPathChallengesLink).toBeVisible();
  await showPathChallengesLink.focus();
  await page.keyboard.press("Enter");

  await expectChallengeBrowserAnchored(page, "motion-and-circular-motion");
  await expect(
    page.locator("#challenge-browser").getByRole("heading", {
      name: "Flat long shot",
      level: 3,
    }),
  ).toBeVisible();
});
