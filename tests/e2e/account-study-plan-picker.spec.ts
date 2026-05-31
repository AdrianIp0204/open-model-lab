import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  baseURL,
  gotoAndExpectOk,
  installBrowserGuards,
  seedLocalProgressSnapshot,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const qaArtifactDir = path.join(process.cwd(), "output", "playwright", "qa");

const viewportCases = [
  {
    name: "desktop",
    width: 1440,
    height: 900,
    thirdItem: {
      kind: "guided-collection",
      topic: "waves",
      search: "waves evidence",
      testId: "study-plan-picker-option-guided-collection:waves-evidence-loop",
      title: "Waves Evidence Loop",
    },
  },
  {
    name: "phone",
    width: 390,
    height: 844,
    thirdItem: {
      kind: "goal-path",
      topic: "waves",
      search: "wave intuition",
      testId: "study-plan-picker-option-goal-path:waves-intuition",
      title: "Build wave intuition from one oscillator outward",
    },
  },
] as const;

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

async function resetSavedStudyPlans(page: Page) {
  const response = await page.context().request.get(`${baseURL}/api/account/study-plans`);

  if (!response.ok()) {
    return;
  }

  const payload = (await response.json()) as {
    items?: Array<{ id: string }>;
  };

  for (const item of payload.items ?? []) {
    await page.context().request.delete(`${baseURL}/api/account/study-plans`, {
      data: { id: item.id },
    });
  }
}

async function addCatalogItem(
  page: Page,
  item: {
    kind: string;
    topic: string;
    search: string;
    testId: string;
    title: string;
    progress?: "all" | "recent" | "recommended";
  },
) {
  await page.getByTestId("study-plan-picker-kind-filter").selectOption(item.kind);
  await page.getByTestId("study-plan-picker-subject-filter").selectOption("physics");
  await page.getByTestId("study-plan-picker-topic-filter").selectOption(item.topic);
  await page
    .getByTestId("study-plan-picker-progress-filter")
    .selectOption(item.progress ?? "all");
  await page.getByTestId("study-plan-picker-search").fill(item.search);

  const option = page.getByTestId(item.testId);
  await expect(option).toBeVisible();
  await option.click();

  await expect(page.getByTestId("study-plan-selected-item-preview")).toContainText(
    item.title,
  );
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByTestId("study-plan-selected-route-preview")).toContainText(
    item.title,
  );
  await page.getByTestId("study-plan-picker-search").fill("");
}

test("builds saved study plans with searchable catalog filters on desktop and phone", async ({
  page,
}) => {
  fs.mkdirSync(qaArtifactDir, { recursive: true });

  for (const viewport of viewportCases) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await setHarnessSession(page, "signed-in-premium");
    await resetSavedStudyPlans(page);
    await seedLocalProgressSnapshot(page, {
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-05-30T08:00:00.000Z",
          lastVisitedAt: "2026-05-30T08:15:00.000Z",
          quickTestLastIncorrectCount: 2,
        },
      },
    });

    await gotoAndExpectOk(page, "/account/study-plans");

    const planTitle = `QA 064 ${viewport.name} plan`;
    await page.getByLabel("Plan name").fill(planTitle);
    await page
      .getByLabel("Summary")
      .fill("Search-built plan covering a concept, track, and route item.");

    await addCatalogItem(page, {
      kind: "concept",
      topic: "mechanics",
      progress: "recommended",
      search: "projectile",
      testId: "study-plan-picker-option-concept:projectile-motion",
      title: "Projectile Motion",
    });
    await addCatalogItem(page, {
      kind: "track",
      topic: "mechanics",
      search: "motion circular",
      testId: "study-plan-picker-option-track:motion-and-circular-motion",
      title: "Motion and Circular Motion",
    });
    await addCatalogItem(page, viewport.thirdItem);

    const routePreview = page.getByTestId("study-plan-selected-route-preview");
    await expect(routePreview).toContainText("3 items");
    await routePreview.scrollIntoViewIfNeeded();
    await expect(routePreview).toBeInViewport();
    await page.screenshot({
      path: path.join(
        qaArtifactDir,
        `oml-qa-064-study-plans-${viewport.name}-builder.png`,
      ),
      fullPage: false,
      animations: "disabled",
      caret: "initial",
    });

    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.getByText(`Saved "${planTitle}".`)).toBeVisible();
    await expect(page.getByRole("heading", { name: planTitle })).toBeVisible();

    await gotoAndExpectOk(page, "/dashboard");

    const dashboardPlan = page.getByRole("heading", { name: planTitle });
    await expect(dashboardPlan).toBeVisible();
    await dashboardPlan.scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: "Manage study plans" })).toBeVisible();
    await page.screenshot({
      path: path.join(
        qaArtifactDir,
        `oml-qa-064-study-plans-${viewport.name}-dashboard.png`,
      ),
      fullPage: false,
      animations: "disabled",
      caret: "initial",
    });
  }
});
