import { expect, test } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";

const representativeRoutes = [
  "/en/concepts/simple-harmonic-motion",
  "/en/concepts/graph-transformations",
  "/en/concepts/acid-base-ph-intuition",
  "/en/concepts/binary-search-halving-the-search-space",
] as const;

const reviewedMobileRoutes = [
  "/en/concepts/simple-harmonic-motion",
  "/en/concepts/vectors-components",
  "/en/concepts/wave-interference",
] as const;

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
      const startHere = page.getByTestId("concept-v2-start-here");
      const equationSnapshot = page.getByTestId("concept-v2-equation-snapshot");
      const guidedLab = page.getByTestId("concept-v2-guided-live-lab");

      await expect(title).toBeVisible();
      await expect(status).toHaveCount(0);
      await expect(startHere).toBeVisible();
      await expect(equationSnapshot).toBeVisible();
      await expect(guidedLab).toBeVisible();

      const [startHereBox, equationBox, guidedLabBox] = await Promise.all([
        startHere.boundingBox(),
        equationSnapshot.boundingBox(),
        guidedLab.boundingBox(),
      ]);

      expect(startHereBox).not.toBeNull();
      expect(equationBox).not.toBeNull();
      expect(guidedLabBox).not.toBeNull();
      expect(startHereBox!.y).toBeLessThan(guidedLabBox!.y);
      expect(Math.abs(equationBox!.y - startHereBox!.y)).toBeLessThan(128);
      expect(guidedLabBox!.y - Math.max(startHereBox!.y + startHereBox!.height, equationBox!.y + equationBox!.height)).toBeLessThan(72);

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps Start Here ahead of the guided live lab on representative desktop routes", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const route of representativeRoutes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);

          const startHere = page.getByTestId("concept-v2-start-here");
          const heroIntro = page.getByTestId("concept-hero-intro");
          const guidedLab = page.getByTestId("concept-v2-guided-live-lab");
          const wrapUp = page.getByTestId("concept-v2-wrap-up");
          const reference = page.getByTestId("concept-v2-reference");

          await expect(startHere).toBeVisible();
          await expect(heroIntro).toHaveCount(0);
          await expect(guidedLab).toBeVisible();
          await expect(wrapUp).toBeVisible();
          await expect(reference).toBeVisible();

          const [startHereBox, guidedLabBox, wrapUpBox, referenceBox] = await Promise.all([
            startHere.boundingBox(),
            guidedLab.boundingBox(),
            wrapUp.boundingBox(),
            reference.boundingBox(),
          ]);

          expect(startHereBox).not.toBeNull();
          expect(guidedLabBox).not.toBeNull();
          expect(wrapUpBox).not.toBeNull();
          expect(referenceBox).not.toBeNull();
          expect(startHereBox!.y + startHereBox!.height).toBeLessThan(guidedLabBox!.y);
          expect(guidedLabBox!.y + guidedLabBox!.height).toBeLessThan(wrapUpBox!.y);
          expect(wrapUpBox!.y + wrapUpBox!.height).toBeLessThan(referenceBox!.y);
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the mobile order student-first: Start Here, bench, wrap-up, then reference", async ({
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
          const startHere = page.getByTestId("concept-v2-start-here");
          const prerequisites = page.getByTestId("concept-v2-prerequisites");
          const startButton = startHere.getByRole("button", { name: "Start concept" });
          const lessonPreview = page.getByTestId("concept-v2-start-lesson-preview");
          const status = page.getByTestId("concept-page-status-surface");
          const equationSnapshot = page.getByTestId("concept-v2-equation-snapshot");
          const scene = page.getByTestId("simulation-shell-scene");
          const stepSlot = page.getByTestId("concept-v2-step-card-slot");
          const wrapUp = page.getByTestId("concept-v2-wrap-up");
          const reference = page.getByTestId("concept-v2-reference");

          await expect(title).toBeVisible();
          await expect(startHere).toBeVisible();
          await expect(prerequisites).toBeVisible();
          await expect(startButton).toBeVisible();
          await expect(lessonPreview).toBeVisible();
          await expect(status).toHaveCount(0);
          await expect(equationSnapshot).toBeVisible();
          await expect(scene).toBeVisible();
          await expect(stepSlot).toBeVisible();
          await expect(wrapUp).toBeVisible();
          await expect(reference).toBeVisible();

          const [
            titleBox,
            startHereBox,
            prerequisitesBox,
            startButtonBox,
            lessonPreviewBox,
            equationBox,
            sceneBox,
            stepSlotBox,
            wrapUpBox,
            referenceBox,
          ] = await Promise.all([
            title.boundingBox(),
            startHere.boundingBox(),
            prerequisites.boundingBox(),
            startButton.boundingBox(),
            lessonPreview.boundingBox(),
            equationSnapshot.boundingBox(),
            scene.boundingBox(),
            stepSlot.boundingBox(),
            wrapUp.boundingBox(),
            reference.boundingBox(),
          ]);

          expect(titleBox).not.toBeNull();
          expect(startHereBox).not.toBeNull();
          expect(prerequisitesBox).not.toBeNull();
          expect(startButtonBox).not.toBeNull();
          expect(lessonPreviewBox).not.toBeNull();
          expect(equationBox).not.toBeNull();
          expect(sceneBox).not.toBeNull();
          expect(stepSlotBox).not.toBeNull();
          expect(wrapUpBox).not.toBeNull();
          expect(referenceBox).not.toBeNull();

          expect(titleBox!.y).toBeLessThan(startHereBox!.y);
          expect(startButtonBox!.y).toBeLessThan(prerequisitesBox!.y);
          expect(startButtonBox!.height).toBeGreaterThanOrEqual(44);
          expect(startButtonBox!.y).toBeLessThan(lessonPreviewBox!.y);
          expect(startButtonBox!.y).toBeLessThan(equationBox!.y);
          expect(startHereBox!.y).toBeLessThan(sceneBox!.y);
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
