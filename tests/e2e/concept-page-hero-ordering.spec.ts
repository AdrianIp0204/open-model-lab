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
      const reference = page.getByTestId("concept-v2-reference");
      const guidedLab = page.getByTestId("concept-v2-guided-live-lab");

      await expect(title).toBeVisible();
      await expect(status).toHaveCount(0);
      await expect(startHere).toBeVisible();
      await expect(equationSnapshot).toBeHidden();
      await expect(reference).toBeVisible();
      await expect(guidedLab).toBeVisible();

      const [startHereBox, guidedLabBox, referenceBox] = await Promise.all([
        startHere.boundingBox(),
        guidedLab.boundingBox(),
        reference.boundingBox(),
      ]);

      expect(startHereBox).not.toBeNull();
      expect(guidedLabBox).not.toBeNull();
      expect(referenceBox).not.toBeNull();
      expect(guidedLabBox!.y).toBeLessThan(startHereBox!.y);
      expect(startHereBox!.y + startHereBox!.height).toBeLessThan(referenceBox!.y);

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the guided live lab ahead of quieter post-bench lesson context", async ({
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
          expect(guidedLabBox!.y + guidedLabBox!.height).toBeLessThan(startHereBox!.y);
          expect(startHereBox!.y + startHereBox!.height).toBeLessThan(wrapUpBox!.y);
          expect(wrapUpBox!.y + wrapUpBox!.height).toBeLessThan(referenceBox!.y);
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the mobile order bench-first with lesson context below the lab", async ({
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
          const startButton = startHere.getByRole("button", { name: "Return to bench" });
          const lessonPreviewDisclosure = page.getByTestId(
            "concept-v2-start-lesson-disclosure",
          );
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
          await expect(lessonPreviewDisclosure).toBeVisible();
          await expect(status).toHaveCount(0);
          await expect(equationSnapshot).toBeHidden();
          await expect(scene).toBeVisible();
          await expect(stepSlot).toBeVisible();
          await expect(wrapUp).toBeVisible();
          await expect(reference).toBeVisible();

          const [
            titleBox,
            startHereBox,
            prerequisitesBox,
            startButtonBox,
            lessonPreviewDisclosureBox,
            sceneBox,
            stepSlotBox,
            wrapUpBox,
            referenceBox,
          ] = await Promise.all([
            title.boundingBox(),
            startHere.boundingBox(),
            prerequisites.boundingBox(),
            startButton.boundingBox(),
            lessonPreviewDisclosure.boundingBox(),
            scene.boundingBox(),
            stepSlot.boundingBox(),
            wrapUp.boundingBox(),
            reference.boundingBox(),
          ]);

          expect(titleBox).not.toBeNull();
          expect(startHereBox).not.toBeNull();
          expect(prerequisitesBox).not.toBeNull();
          expect(startButtonBox).not.toBeNull();
          expect(lessonPreviewDisclosureBox).not.toBeNull();
          expect(sceneBox).not.toBeNull();
          expect(stepSlotBox).not.toBeNull();
          expect(wrapUpBox).not.toBeNull();
          expect(referenceBox).not.toBeNull();

          expect(titleBox!.y).toBeLessThan(startHereBox!.y);
          expect(sceneBox!.y).toBeLessThan(stepSlotBox!.y);
          expect(stepSlotBox!.y).toBeLessThan(startHereBox!.y);
          expect(startButtonBox!.y).toBeLessThan(prerequisitesBox!.y);
          expect(startButtonBox!.height).toBeGreaterThanOrEqual(44);
          expect(startButtonBox!.y).toBeLessThan(lessonPreviewDisclosureBox!.y);
          expect(startHereBox!.y).toBeLessThan(wrapUpBox!.y);
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
