import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";

const representativeRoutes = [
  "/en/concepts/simple-harmonic-motion",
  "/en/concepts/graph-transformations",
  "/en/concepts/acid-base-ph-intuition",
  "/en/concepts/binary-search-halving-the-search-space",
] as const;

const postBenchQaRoutes = [
  "/en/concepts/simple-harmonic-motion",
  "/en/concepts/uniform-circular-motion",
  "/en/concepts/electric-fields",
  "/en/concepts/acid-base-ph-intuition",
  "/en/concepts/binary-search-halving-the-search-space",
] as const;

const reviewedMobileRoutes = [
  "/en/concepts/simple-harmonic-motion",
  "/en/concepts/vectors-components",
  "/en/concepts/wave-interference",
] as const;

async function completeGuidedSteps(page: Page) {
  const nextButton = page.getByTestId("concept-v2-rail-next-button");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if ((await page.evaluate(() => window.location.hash)) === "#concept-v2-wrap-up") {
      return;
    }

    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
  }

  await expect(page).toHaveURL(/#concept-v2-wrap-up$/);
}

test.describe("concept page v2 ordering", () => {
  test("keeps the desktop top band compact with fresh-start status hidden", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion");

      const title = page.getByRole("heading", { name: "Simple Harmonic Motion" });
      const status = page.getByTestId("concept-page-status-surface");
      const equationSnapshot = page.getByTestId("concept-v2-equation-snapshot");
      const reference = page.getByTestId("concept-v2-reference");
      const guidedLab = page.getByTestId("concept-v2-guided-live-lab");

      await expect(title).toBeVisible();
      await expect(status).toHaveCount(0);
      await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
      await expect(equationSnapshot).toBeHidden();
      await expect(reference).toBeVisible();
      await expect(guidedLab).toBeVisible();

      const [guidedLabBox, referenceBox] = await Promise.all([
        guidedLab.boundingBox(),
        reference.boundingBox(),
      ]);

      expect(guidedLabBox).not.toBeNull();
      expect(referenceBox).not.toBeNull();
      expect(guidedLabBox!.y + guidedLabBox!.height).toBeLessThan(referenceBox!.y);

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the guided live lab ahead of wrap-up and reference support", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const route of representativeRoutes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);

          const heroIntro = page.getByTestId("concept-hero-intro");
          const guidedLab = page.getByTestId("concept-v2-guided-live-lab");
          const wrapUp = page.getByTestId("concept-v2-wrap-up");
          const reference = page.getByTestId("concept-v2-reference");

          await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
          await expect(heroIntro).toHaveCount(0);
          await expect(guidedLab).toBeVisible();
          await expect(wrapUp).toBeVisible();
          await expect(reference).toBeVisible();

          const [guidedLabBox, wrapUpBox, referenceBox] = await Promise.all([
            guidedLab.boundingBox(),
            wrapUp.boundingBox(),
            reference.boundingBox(),
          ]);

          expect(guidedLabBox).not.toBeNull();
          expect(wrapUpBox).not.toBeNull();
          expect(referenceBox).not.toBeNull();
          expect(guidedLabBox!.y + guidedLabBox!.height).toBeLessThan(wrapUpBox!.y);
          expect(wrapUpBox!.y + wrapUpBox!.height).toBeLessThan(referenceBox!.y);
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps one post-bench IA after completing representative guided paths", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const route of postBenchQaRoutes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);
          await completeGuidedSteps(page);

          const wrapUp = page.getByTestId("concept-v2-wrap-up");
          const reference = page.getByTestId("concept-v2-reference");
          const postBenchTools = page.getByTestId("concept-post-bench-tools");

          await expect(wrapUp).toBeVisible();
          await expect(reference).toBeVisible();
          await expect(postBenchTools).toBeVisible();
          await expect(page.getByTestId("concept-v2-primary-practice-action")).toHaveCount(1);
          await expect(page.getByTestId("concept-v2-reference")).toHaveCount(1);
          await expect(page.getByTestId("concept-post-bench-tools")).toHaveCount(1);
          await expect(page.getByTestId("concept-bench-utilities")).toHaveCount(0);
          await expect(page.getByTestId("concept-post-phase-support")).toHaveCount(0);

          const sectionOrder = await page
            .locator(
              [
                '[data-testid="concept-v2-wrap-up"]',
                '[data-testid="concept-v2-reference"]',
                '[data-testid="concept-post-bench-tools"]',
                '[data-testid="concept-bench-utilities"]',
                '[data-testid="concept-post-phase-support"]',
              ].join(", "),
            )
            .evaluateAll((elements) =>
              elements.map((element) => element.getAttribute("data-testid")),
            );

          expect(sectionOrder).toEqual([
            "concept-v2-wrap-up",
            "concept-v2-reference",
            "concept-post-bench-tools",
          ]);

          const [wrapUpBox, referenceBox, toolsBox] = await Promise.all([
            wrapUp.boundingBox(),
            reference.boundingBox(),
            postBenchTools.boundingBox(),
          ]);

          expect(wrapUpBox).not.toBeNull();
          expect(referenceBox).not.toBeNull();
          expect(toolsBox).not.toBeNull();
          expect(wrapUpBox!.y + wrapUpBox!.height).toBeLessThan(referenceBox!.y);
          expect(referenceBox!.y + referenceBox!.height).toBeLessThan(toolsBox!.y);
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the mobile order bench-first with no late start context", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const route of reviewedMobileRoutes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);

          const title = page.getByTestId("concept-v2-hero-title");
          const status = page.getByTestId("concept-page-status-surface");
          const equationSnapshot = page.getByTestId("concept-v2-equation-snapshot");
          const scene = page.getByTestId("simulation-shell-scene");
          const stepSlot = page.getByTestId("concept-v2-step-card-slot");
          const wrapUp = page.getByTestId("concept-v2-wrap-up");
          const reference = page.getByTestId("concept-v2-reference");

          await expect(title).toBeVisible();
          await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
          await expect(status).toHaveCount(0);
          await expect(equationSnapshot).toBeHidden();
          await expect(scene).toBeVisible();
          await expect(stepSlot).toBeVisible();
          await expect(wrapUp).toBeVisible();
          await expect(reference).toBeVisible();

          const [
            titleBox,
            sceneBox,
            stepSlotBox,
            wrapUpBox,
            referenceBox,
          ] = await Promise.all([
            title.boundingBox(),
            scene.boundingBox(),
            stepSlot.boundingBox(),
            wrapUp.boundingBox(),
            reference.boundingBox(),
          ]);

          expect(titleBox).not.toBeNull();
          expect(sceneBox).not.toBeNull();
          expect(stepSlotBox).not.toBeNull();
          expect(wrapUpBox).not.toBeNull();
          expect(referenceBox).not.toBeNull();

          expect(titleBox!.y).toBeLessThan(sceneBox!.y);
          expect(sceneBox!.y).toBeLessThan(stepSlotBox!.y);
          expect(stepSlotBox!.y).toBeLessThan(wrapUpBox!.y);
          expect(wrapUpBox!.y).toBeLessThan(referenceBox!.y);

          const horizontalOverflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(horizontalOverflow).toBeLessThanOrEqual(1);
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
});
