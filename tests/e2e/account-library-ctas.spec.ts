import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const qaArtifactDir = path.join(process.cwd(), "output", "playwright", "qa");

const libraryPages = [
  {
    pathname: "/account/setups",
    primaryAction: "Find a live bench",
    secondaryAction: "Start here",
    sidewaysAction: "Open compare library",
    emptyTitle: "No saved setups yet.",
    emptyDescription: /Open a concept bench, adjust the live setup, then use Save setup/i,
    screenshotName: "saved-setups",
  },
  {
    pathname: "/account/compare-setups",
    primaryAction: "Find a compare bench",
    secondaryAction: "Start here",
    sidewaysAction: "Open saved setups",
    emptyTitle: "No saved compare setups yet.",
    emptyDescription: /Open a concept bench, enter Compare, set up A and B/i,
    screenshotName: "compare-setups",
  },
] as const;

const accountStates = [
  "signed-out",
  "signed-in-free",
  "signed-in-premium",
] as const;

const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

async function expectCreationFocusedLibraryEntry(
  page: Page,
  config: (typeof libraryPages)[number],
  state: (typeof accountStates)[number],
) {
  await setHarnessSession(page, state);
  await gotoAndExpectOk(page, config.pathname);

  await expect(
    page.getByRole("link", { name: config.primaryAction }).first(),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: config.secondaryAction }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: config.sidewaysAction })).toHaveCount(0);

  if (state === "signed-in-premium") {
    await expect(page.getByText(config.emptyTitle)).toBeVisible();
    await expect(page.getByText(config.emptyDescription)).toBeVisible();
    return;
  }

  await expect(page.getByRole("link", { name: "View Supporter plan" })).toBeVisible();
}

test("keeps saved-library entry CTAs creation-focused across account states", async ({
  page,
}) => {
  for (const state of accountStates) {
    for (const config of libraryPages) {
      await expectCreationFocusedLibraryEntry(page, config, state);
    }
  }
});

test("captures OML-QA-063 supporter first-viewport evidence", async ({ page }) => {
  fs.mkdirSync(qaArtifactDir, { recursive: true });
  await setHarnessSession(page, "signed-in-premium");

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const config of libraryPages) {
      await gotoAndExpectOk(page, config.pathname);

      await expect(
        page.getByRole("link", { name: config.primaryAction }).first(),
      ).toBeInViewport();
      await expect(page.getByText(config.emptyTitle)).toBeVisible();
      await expect(page.getByText(config.emptyDescription)).toBeVisible();

      await page.screenshot({
        path: path.join(
          qaArtifactDir,
          `oml-qa-063-${config.screenshotName}-${viewport.name}.png`,
        ),
        fullPage: false,
        animations: "disabled",
        caret: "initial",
      });
    }
  }
});
