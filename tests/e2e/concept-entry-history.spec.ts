import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

let browserGuard: BrowserGuard;

async function expectChallengeBrowserAnchored(page: Page) {
  await expect(page).toHaveURL(/\/en\/challenges#challenge-browser$/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const browserSection = document.getElementById("challenge-browser");

        if (!(browserSection instanceof HTMLElement)) {
          return false;
        }

        const rect = browserSection.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight * 0.35;
      }),
    )
    .toBe(true);
}

function getConceptCardLink(page: Page, title: string) {
  const matchingCard = page.locator("article").filter({ hasText: title }).first();
  return page.locator("a").filter({ has: matchingCard }).first();
}

test.beforeEach(async ({ page }) => {
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("returns from concept entry to the concept library on the first back press and forward keeps URL/UI in sync", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/concepts");

  const simpleHarmonicMotionCard = getConceptCardLink(page, "Simple Harmonic Motion");

  await expect(simpleHarmonicMotionCard).toBeVisible();
  await simpleHarmonicMotionCard.click();

  await expect(page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion$/);
  await expect(
    page.getByRole("heading", { name: "Simple Harmonic Motion", level: 1 }),
  ).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/en\/concepts$/);
  await expect(
    page.getByRole("heading", {
      name: "Browse concepts, then open the live page.",
      level: 1,
    }),
  ).toBeVisible();

  await page.goForward({ waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion$/);
  await expect(
    page.getByRole("heading", { name: "Simple Harmonic Motion", level: 1 }),
  ).toBeVisible();
});

test("track-filtered concept library restores the open track filter after back navigation", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/concepts?track=functions-and-change");

  const moreFiltersSelect = page.getByRole("combobox", { name: /more filters filter/i });
  await expect(moreFiltersSelect).toBeVisible();
  await expect(moreFiltersSelect).toHaveValue("functions-and-change");

  const graphTransformationsCard = getConceptCardLink(page, "Graph Transformations");
  await expect(graphTransformationsCard).toBeVisible();
  await graphTransformationsCard.click();

  await expect(page).toHaveURL(/\/en\/concepts\/graph-transformations$/);
  await expect(
    page.getByRole("heading", { name: "Graph Transformations", level: 1 }),
  ).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/en\/concepts\?track=functions-and-change$/);
  await expect(moreFiltersSelect).toBeVisible();
  await expect(moreFiltersSelect).toHaveValue("functions-and-change");
  await expect(page.getByText("Functions and Change")).toBeVisible();
});

test("returns from concept entry to the challenge browser hash on the first back press and forward restores the concept page", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/challenges#challenge-browser");
  await expectChallengeBrowserAnchored(page);

  const challengeBrowser = page.locator("#challenge-browser");
  await challengeBrowser.getByRole("link", { name: /open concept/i }).first().click();

  await expect(page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion$/);
  await expect(
    page.getByRole("heading", { name: "Simple Harmonic Motion", level: 1 }),
  ).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expectChallengeBrowserAnchored(page);

  await page.goForward({ waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion$/);
  await expect(
    page.getByRole("heading", { name: "Simple Harmonic Motion", level: 1 }),
  ).toBeVisible();
});

test("filtered computer-science concept cards navigate from the card surface for Binary Search and BFS", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/concepts");

  await page.getByRole("button", { name: /^Computer Science/i }).click();
  await expect(page).toHaveURL(/\/en\/concepts\?subject=computer-science$/);

  const binarySearchCard = getConceptCardLink(
    page,
    "Binary Search / Halving the Search Space",
  );
  await expect(binarySearchCard).toBeVisible();
  await binarySearchCard.click();

  await expect(page).toHaveURL(/\/en\/concepts\/binary-search-halving-the-search-space$/);
  await expect(
    page.getByRole("heading", {
      name: "Binary Search / Halving the Search Space",
      level: 1,
    }),
  ).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/en\/concepts\?subject=computer-science$/);

  const bfsCard = getConceptCardLink(
    page,
    "Breadth-First Search and Layered Frontiers",
  );
  await expect(bfsCard).toBeVisible();
  await bfsCard.click();

  await expect(page).toHaveURL(/\/en\/concepts\/breadth-first-search-and-layered-frontiers$/);
  await expect(
    page.getByRole("heading", {
      name: "Breadth-First Search and Layered Frontiers",
      level: 1,
    }),
  ).toBeVisible();
});

test("phase and section navigation do not consume an extra browser back step before leaving the concept page", async ({
  page,
}) => {
  await gotoAndExpectOk(page, "/en/concepts");

  const simpleHarmonicMotionCard = getConceptCardLink(page, "Simple Harmonic Motion");

  await simpleHarmonicMotionCard.click();
  await expect(page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion$/);

  await page.locator("#concept-learning-phase-tab-check").click();
  await expect(page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion\?phase=check$/);

  await page
    .locator("[data-page-section-sidebar-column]")
    .getByRole("link", { name: "Worked examples" })
    .click();
  await expect(page).toHaveURL(
    /\/en\/concepts\/simple-harmonic-motion\?phase=understand#worked-examples$/,
  );

  await page.goBack({ waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/en\/concepts$/);
  await expect(
    page.getByRole("heading", {
      name: "Browse concepts, then open the live page.",
      level: 1,
    }),
  ).toBeVisible();
});

test("direct concept deep links still load the intended concept and phase", async ({ page }) => {
  await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion?phase=check#quick-test");

  await expect(
    page.getByRole("heading", { name: "Simple Harmonic Motion", level: 1 }),
  ).toBeVisible();
  await expect(page.locator("#concept-learning-phase-tab-check")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#concept-learning-phase-panel-check")).toBeVisible();
  await expect(page.locator("#quick-test")).toBeVisible();
});
