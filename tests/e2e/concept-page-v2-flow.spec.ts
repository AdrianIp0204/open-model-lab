"use strict";

import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";


async function newConceptFlowPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "open-model-lab.onboarding.v1",
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: true,
        lastStep: 0,
        updatedAt: "2026-04-27T00:00:00.000Z",
      }),
    );
  });

  return page;
}

async function expectNoRawMathLeak(locator: Locator) {
  await expect
    .poll(async () => locator.evaluate((node) => (node as HTMLElement).innerText))
    .not.toMatch(/\$/);
  await expect
    .poll(async () => locator.evaluate((node) => (node as HTMLElement).innerText))
    .not.toMatch(/\\(?:alpha|tau|theta|omega|phi|lambda|Delta|mathrm|sum)/);
}

async function chooseDifferentSliderValue(slider: Locator) {
  const [currentValue, minAttribute, maxAttribute] = await Promise.all([
    slider.inputValue(),
    slider.getAttribute("min"),
    slider.getAttribute("max"),
  ]);
  const min = minAttribute === null ? 0 : Number(minAttribute);
  const max = maxAttribute === null ? 10 : Number(maxAttribute);
  const current = Number(currentValue);
  const next = Math.abs(current - max) > Math.abs(current - min) ? max : min;

  return String(next);
}

test.describe("concept page v2 flow", () => {
  test("OML-QA-015 keeps a compact current-step cue inside the first usable bench viewport", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(360_000);

    const representativeSlugs = [
      "simple-harmonic-motion",
      "uniform-circular-motion",
      "projectile-motion",
      "electric-fields",
      "unit-circle-sine-cosine-from-rotation",
      "acid-base-ph-intuition",
    ] as const;
    const viewportCases = [
      { name: "desktop-1440x900", width: 1440, height: 900 },
      { name: "tablet-820x1180", width: 820, height: 1180 },
      { name: "phone-390x844", width: 390, height: 844 },
      { name: "phone-360x740", width: 360, height: 740 },
    ] as const;

    for (const viewport of viewportCases) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await newConceptFlowPage(context);
      const browserGuard = await installBrowserGuards(page);

      try {
        for (const slug of representativeSlugs) {
          await test.step(`${viewport.name} ${slug}`, async () => {
            await gotoAndExpectOk(page, `/en/concepts/${slug}`);

            const cue = page.getByTestId("concept-v2-current-step-cue");
            const count = page.getByTestId("concept-v2-current-step-cue-count");
            const goal = page.getByTestId("concept-v2-current-step-cue-goal");
            const action = page.getByTestId("concept-v2-current-step-cue-action");

            await expect(page.getByTestId("simulation-shell-first-action")).toHaveCount(0);
            await expect(page.getByTestId("concept-v2-guided-first-action")).toHaveCount(0);
            await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();
            await expect(cue).toBeVisible();
            await expect(cue).toContainText("Current step");
            await expect(count).toHaveText(/\d+ \/ \d+/);
            await expect(goal).not.toHaveText("");
            await expect(action).not.toHaveText("");

            const cueBox = await cue.boundingBox();
            expect(cueBox).not.toBeNull();
            expect(cueBox!.y).toBeGreaterThanOrEqual(0);
            expect(cueBox!.y).toBeLessThanOrEqual(viewport.height);
            expect(cueBox!.height).toBeLessThanOrEqual(150);

            await page.screenshot({
              path: testInfo.outputPath(`oml-qa-015-${viewport.name}-${slug}.png`),
              fullPage: false,
            });
          });
        }

        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    }
  });

  test("OML-QA-019 opens revealed bench tools from the current-step surface on phone", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);

    const representativeSlugs = [
      "simple-harmonic-motion",
      "uniform-circular-motion",
    ] as const;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const slug of representativeSlugs) {
        await test.step(slug, async () => {
          await gotoAndExpectOk(page, `/en/concepts/${slug}`);

          const tools = page.getByTestId("concept-v2-bench-tools");
          const activeTool = page.getByTestId("concept-v2-bench-tool-active");

          await expect(page.getByTestId("concept-v2-current-step-cue")).toBeVisible();
          await expect(tools).toBeVisible();
          await expect(tools).toBeInViewport();

          await page.locator('[data-testid^="concept-v2-bench-tool-control-"]').first().click();
          await expect(activeTool).toBeVisible();
          await expect(activeTool).toBeInViewport();
          await expect(activeTool).toContainText("Control");
          await expect
            .poll(() => page.evaluate(() => document.activeElement?.id ?? ""))
            .toMatch(/^control-/);

          await page.locator('[data-testid^="concept-v2-bench-tool-graph-"]').first().click();
          await expect(activeTool).toBeVisible();
          await expect(activeTool).toBeInViewport();
          await expect(activeTool).toContainText("Graph");

          await page.locator('[data-testid^="concept-v2-bench-tool-overlay-"]').first().click();
          await expect(activeTool).toBeVisible();
          await expect(activeTool).toBeInViewport();
          await expect(activeTool).toContainText("Overlay");

          await page.locator('[data-testid^="concept-v2-bench-tool-equation-"]').first().click();
          await expect(activeTool).toBeVisible();
          await expect(activeTool).toBeInViewport();
          await expect(activeTool).toContainText("Equation");

          await page.getByTestId("concept-v2-bench-tool-prediction").click();
          await expect(activeTool).toBeVisible();
          await expect(activeTool).toBeInViewport();
          await expect(activeTool).toContainText("Prediction prompt");
          await expect(activeTool.getByRole("button", { name: /Test prediction/i })).toBeDisabled();

          await page.screenshot({
            path: testInfo.outputPath(`oml-qa-019-phone-${slug}.png`),
            fullPage: false,
          });
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the first guided interaction viewport focused on the live bench without duplicate support", async ({
    browser,
  }) => {
    const viewportCases = [
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ] as const;

    for (const viewport of viewportCases) {
      const context = await browser.newContext({ viewport });
      const page = await newConceptFlowPage(context);
      const browserGuard = await installBrowserGuards(page);

      try {
        await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion");

        const guidedLiveLab = page.getByTestId("concept-v2-guided-live-lab");
        const focusStageShell = page.locator('[data-stage-tone="focus"]');
        const visualStage = page.getByTestId("simulation-shell-visual-stage");
        const scene = page.getByTestId("simulation-shell-scene");
        const controls = page.getByTestId("simulation-shell-controls");
        const activeTaskRail = page.getByTestId("concept-v2-active-task-rail");
        const guidedOverlayDock = page.getByTestId("concept-guided-overlay-dock");
        const equationMap = page.getByTestId("concept-equation-map-disclosure");
        const stepSlot = page.getByTestId("concept-v2-step-card-slot");
        const currentStepCard = page.getByTestId("concept-v2-current-step-card");
        const railInlineCheck = page.getByTestId("concept-v2-rail-inline-check");
        const secondaryGuidance = page.getByTestId(
          "concept-v2-current-step-secondary-guidance",
        );
        const stepMap = page.getByTestId("concept-v2-step-map");

        await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
        await expect(focusStageShell).toBeVisible();
        await expect(focusStageShell).toHaveClass(/simulation-shell--focus-stage/);
        await expect(visualStage).toBeVisible();
        await expect(guidedLiveLab).toBeVisible();
        await expect(activeTaskRail).toHaveCount(0);
        await expect(page.getByTestId("simulation-shell-first-action")).toHaveCount(0);
        await expect(page.getByTestId("concept-v2-guided-first-action")).toHaveCount(0);
        await expect(page.getByTestId("concept-v2-bench-brief")).toHaveCount(0);
        await expect(scene).toBeInViewport();
        await expect(controls).toBeInViewport();
        await expect(guidedOverlayDock).toBeVisible();
        await expect(guidedOverlayDock).toContainText("Guided overlay");
        await expect(guidedOverlayDock.getByRole("button", { name: /show overlay|hide overlay/i }).first()).toBeVisible();
        await expect(equationMap).toBeVisible();
        await expect(equationMap).toContainText("Full equation map");
        await expect(stepSlot).toBeVisible();
        await expect(currentStepCard).toBeVisible();
        await expect(currentStepCard).toContainText("Press play");
        await expect(railInlineCheck).toBeVisible();
        await expect(secondaryGuidance).toBeVisible();
        await expect(secondaryGuidance).not.toHaveAttribute("open");
        await expect(stepMap).toBeVisible();
        await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);

        const [visualStageBox, controlsBox, currentStepCardBox, stepMapBox] = await Promise.all([
          visualStage.boundingBox(),
          controls.boundingBox(),
          currentStepCard.boundingBox(),
          stepMap.boundingBox(),
        ]);

        expect(visualStageBox).not.toBeNull();
        expect(controlsBox).not.toBeNull();
        expect(currentStepCardBox).not.toBeNull();
        expect(stepMapBox).not.toBeNull();
        expect(visualStageBox!.width).toBeGreaterThan(controlsBox!.width * 2);
        expect(currentStepCardBox!.y).toBeLessThanOrEqual(stepMapBox!.y);

        await page.getByRole("button", { name: "Open Help / Tutorial" }).click();
        const helpDialog = page.getByRole("dialog", { name: "Live concept page" });
        await expect(helpDialog).toContainText("predict what will change");
        await expect(helpDialog).toContainText("goal, action, observation cue");

        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    }
  });

  test("keeps the live model first on phone-sized concept pages, then the guided action", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/projectile-motion");

      const scene = page.getByTestId("simulation-shell-scene");
      const controls = page.getByTestId("simulation-shell-controls");
      const benchEquations = page.getByTestId("simulation-shell-bench-equations");
      const currentStepCard = page.getByTestId("concept-v2-current-step-card");

      await expect(scene).toBeVisible();
      await expect(page.getByTestId("simulation-shell-first-action")).toHaveCount(0);
      await expect(page.getByTestId("concept-v2-guided-first-action")).toHaveCount(0);
      await expect(controls).toBeVisible();
      await expect(benchEquations).toBeVisible();
      await expect(currentStepCard).toContainText("Drag the launch vector");
      await expect(currentStepCard).toContainText("Start with Earth shot");

      const [sceneBox, controlsBox, benchEquationsBox, currentStepCardBox] = await Promise.all([
        scene.boundingBox(),
        controls.boundingBox(),
        benchEquations.boundingBox(),
        currentStepCard.boundingBox(),
      ]);

      expect(sceneBox).not.toBeNull();
      expect(controlsBox).not.toBeNull();
      expect(benchEquationsBox).not.toBeNull();
      expect(currentStepCardBox).not.toBeNull();
      expect(sceneBox!.y).toBeLessThan(controlsBox!.y);
      expect(controlsBox!.y).toBeLessThan(benchEquationsBox!.y);
      expect(benchEquationsBox!.y).toBeLessThan(currentStepCardBox!.y);

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("uses the shared concept bench shell beyond simple harmonic motion", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await newConceptFlowPage(context);
    await installBrowserGuards(page);

    const representativeSlugs = [
      "derivative-as-slope-local-rate-of-change",
      "acid-base-ph-intuition",
      "binary-search-halving-the-search-space",
      "electric-fields",
      "matrix-transformations",
      "reaction-rate-collision-theory",
      "frontier-and-visited-state-on-graphs",
      "conservation-of-momentum",
    ] as const;

    try {
      for (const slug of representativeSlugs) {
        await gotoAndExpectOk(page, `/en/concepts/${slug}`);

        const benchBrief = page.getByTestId("concept-v2-bench-brief");
        const visualStage = page.getByTestId("simulation-shell-visual-stage");
        const focusStageShell = page.locator('[data-stage-tone="focus"]');

        await expect(focusStageShell).toBeVisible();
        await expect(focusStageShell).toHaveClass(/simulation-shell--focus-stage/);
        await expect(visualStage).toBeVisible();
        await expect(benchBrief).toHaveCount(0);
        await expect(page.getByTestId("simulation-shell-first-action")).toHaveCount(0);
        await expect(page.getByTestId("concept-v2-guided-first-action")).toHaveCount(0);
        await expect(page.getByTestId("concept-v2-step-card-slot")).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });

  test("the first guided step is active by default on simple harmonic motion", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion");

      const stepSlot = page.getByTestId("concept-v2-step-card-slot");
      const railInlineCheck = page.getByTestId("concept-v2-rail-inline-check");
      const secondaryGuidance = page.getByTestId(
        "concept-v2-current-step-secondary-guidance",
      );

      await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
      await expect(stepSlot).toBeVisible();

      await expect(stepSlot).toContainText("See one full cycle");
      await expect(stepSlot.getByRole("progressbar", { name: "Lesson path" })).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
      await expect(stepSlot).toContainText("Current step");
      await expect(railInlineCheck).toContainText("Quick check");
      await expect(secondaryGuidance).not.toHaveAttribute("open");
      await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);
      await expect(stepSlot).toContainText("Now available");
      await expect(stepSlot).toContainText("Graph: Displacement over time");
      await expect(page.getByTestId("concept-v2-guided-live-lab")).toBeInViewport();
    } finally {
      await page.close().catch(() => undefined);
    }
  });

  test("OML-QA-017 lets guided rail inline checks answer with feedback on SHM and UCM", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    const cases = [
      {
        path: "/en/concepts/simple-harmonic-motion",
        firstStep: "See one full cycle",
        nextStep: "Link the stage and graphs",
        correctChoice: /The object cycles faster while the turning points stay at the same displacement/i,
      },
      {
        path: "/en/concepts/uniform-circular-motion",
        firstStep: "Read the turning vectors",
        nextStep: "Change angular speed",
        correctChoice: /Its velocity changes because the direction keeps changing/i,
      },
    ] as const;

    try {
      for (const item of cases) {
        await test.step(item.path, async () => {
          await gotoAndExpectOk(page, item.path);

          const stepSlot = page.getByTestId("concept-v2-step-card-slot");
          const railInlineCheck = page.getByTestId("concept-v2-rail-inline-check");
          const railChoices = page.getByTestId("concept-v2-rail-inline-check-choices");

          await expect(stepSlot).toContainText(item.firstStep);
          await expect(railInlineCheck).toBeVisible();
          await expect(railChoices).toHaveAttribute("role", "radiogroup");
          await expect(page.getByTestId("concept-secondary-prediction-flow")).toHaveCount(0);

          const selectedChoice = railChoices.getByRole("radio", {
            name: item.correctChoice,
          });
          await expect(selectedChoice).toHaveAttribute("aria-checked", "false");
          await selectedChoice.click();
          await expect(selectedChoice).toHaveAttribute("aria-checked", "true");
          await expect(
            page.getByTestId("concept-v2-rail-inline-check-choices-feedback"),
          ).toContainText("Correct");

          await stepSlot.getByTestId("concept-v2-rail-next-button").click();
          await expect(stepSlot).toContainText(item.nextStep);
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("OML-QA-018 exposes guided compare mode on desktop and phone benches", async ({
    browser,
  }) => {
    test.setTimeout(240_000);

    const cases = [
      {
        slug: "simple-harmonic-motion",
        firstStep: "See one full cycle",
      },
      {
        slug: "electric-fields",
        firstStep: "Read source sign first",
      },
      {
        slug: "acid-base-ph-intuition",
        firstStep: "Read the live mixture",
      },
    ] as const;
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "phone", width: 390, height: 844 },
    ] as const;

    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await newConceptFlowPage(context);
      const browserGuard = await installBrowserGuards(page);

      try {
        for (const item of cases) {
          await test.step(`${viewport.name} ${item.slug}`, async () => {
            await gotoAndExpectOk(page, `/en/concepts/${item.slug}`);

            const stepSlot = page.getByTestId("concept-v2-step-card-slot");
            const controls = page.getByTestId("simulation-shell-controls");
            const compareEntry = controls.getByTestId("control-panel-guided-compare-entry");

            await expect(stepSlot).toContainText(item.firstStep);
            await expect(compareEntry).toBeVisible();
            await compareEntry.getByRole("button", { name: "Compare mode" }).click();

            const compareTools = controls.getByTestId("control-panel-compare-tools");
            const slider = controls.getByRole("slider").first();
            const initialValue = await slider.inputValue();
            const changedValue = await chooseDifferentSliderValue(slider);

            await expect(compareTools).toContainText("Editing Setup B");
            await expect(compareTools.getByRole("tab", { name: /Setup.*A/i })).toBeVisible();
            await expect(compareTools.getByRole("tab", { name: /Setup.*B/i })).toHaveAttribute(
              "aria-selected",
              "true",
            );

            await slider.fill(changedValue);
            await expect(slider).toHaveValue(changedValue);

            await compareTools.getByRole("tab", { name: /Setup.*A/i }).click();
            await expect(slider).toHaveValue(initialValue);

            await compareTools.getByRole("tab", { name: /Setup.*B/i }).click();
            await expect(slider).toHaveValue(changedValue);

            await compareTools.getByRole("button", { name: "Swap setups" }).click();
            await expect(slider).toHaveValue(initialValue);

            await compareTools.getByRole("tab", { name: /Setup.*A/i }).click();
            await expect(slider).toHaveValue(changedValue);

            await compareTools.getByRole("button", { name: "Reset variant" }).click();
            await compareTools.getByRole("tab", { name: /Setup.*B/i }).click();
            await expect(slider).toHaveValue(changedValue);

            await compareTools.getByRole("button", { name: "Exit compare mode" }).click();
            await expect(controls.getByTestId("control-panel-compare-tools")).toHaveCount(0);
            await expect(controls.getByTestId("control-panel-guided-compare-entry")).toBeVisible();
            await expect(stepSlot).toContainText(item.firstStep);
          });
        }

        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    }
  });

  test("guided-step progression updates reveal cues and keeps focus sane on simple harmonic motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion#guided-step-see-one-full-cycle");

      const stepSlot = page.getByTestId("concept-v2-step-card-slot");

      await stepSlot.getByTestId("concept-v2-rail-next-button").focus();
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/#guided-step-link-stage-and-graphs$/);
      await expect(stepSlot).toContainText("Link the stage and graphs");
      await expect(stepSlot.getByRole("progressbar", { name: "Lesson path" })).toHaveAttribute(
        "aria-valuenow",
        "2",
      );
      await expect(stepSlot).toContainText("Graph: Velocity over time");
      await expect(stepSlot).toContainText("Graph: Acceleration over time");
      await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);
      await expect(stepSlot.getByTestId("concept-v2-rail-next-button")).toBeVisible();
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("the final guided step keeps wrap-up and secondary challenge actions visible on simple harmonic motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion#guided-step-link-stage-and-graphs");

      await page.getByTestId("concept-v2-rail-next-button").click();

      await expect(page).toHaveURL(/#guided-step-explain-the-restoring-rule$/);
      const wrapUp = page.getByTestId("concept-v2-wrap-up");
      await expect(wrapUp).toContainText("Open concept test");
      await expect(wrapUp).toContainText("More practice options");
      await expect(page.getByTestId("concept-v2-secondary-challenge")).toBeVisible();

      await page
        .getByTestId("concept-v2-complete-checkpoint")
        .getByRole("button", { name: /next step: wrap-up/i })
        .click();
      await expect(page).toHaveURL(/#concept-v2-wrap-up$/);
      await expect(wrapUp).toBeInViewport();
      await expect
        .poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? null))
        .toBe("concept-v2-wrap-up");

      await page.getByTestId("concept-v2-more-practice-options").locator("summary").click();
      await expect(page.getByTestId("concept-v2-more-practice-options")).not.toContainText(
        "Challenge mode",
      );
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("maps legacy phase and hash links to sensible v2 destinations", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion?phase=check#quick-test");
      await expect(page).toHaveURL(/#quick-test$/);
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Explain the restoring rule",
      );
      await expect(page.locator("#quick-test")).toBeVisible();

      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion?phase=check#challenge-mode");
      await expect(page).toHaveURL(/#challenge-mode$/);
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Explain the restoring rule",
      );
      await expect(page.getByTestId("concept-v2-secondary-challenge")).toBeVisible();
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("lands explicit challenge-mode URLs on a visible challenge surface", async ({ browser }) => {
    const routes = [
      "/en/concepts/rotational-inertia#challenge-mode",
      "/en/concepts/rotational-inertia?phase=check#challenge-mode",
    ] as const;

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const route of routes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);

          const challengePanel = page.getByTestId("challenge-mode-full-panel");
          await expect(page).toHaveURL(/#challenge-mode$/);
          await expect(challengePanel).toBeVisible();
          await expect(challengePanel).toBeInViewport();
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("wrap-up challenge action activates the check phase and visible challenge panel", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/rotational-inertia#concept-v2-wrap-up");

      const challengeAction = page.getByTestId("concept-v2-secondary-challenge");
      await expect(challengeAction).toBeVisible();
      await expect(challengeAction).toContainText("Challenge mode");

      await expect(challengeAction).toHaveAttribute(
        "href",
        /\/concepts\/rotational-inertia\?phase=check#challenge-mode$/,
      );

      await challengeAction.click();
      await expect(page).toHaveURL(/\/concepts\/rotational-inertia#challenge-mode$/);
      await expect(page.getByTestId("concept-phase-bench-support")).toHaveAttribute(
        "data-active-phase",
        "check",
      );
      await expect(page.getByTestId("challenge-mode-full-panel")).toBeVisible();
      await expect(page.getByTestId("challenge-mode-full-panel")).toBeInViewport();

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("renders authored inline math without leaking raw TeX on representative v2 routes", async ({
    browser,
  }) => {
    const routes = [
      "/en/concepts/rotational-inertia#challenge-mode",
      "/en/concepts/torque",
      "/en/concepts/derivative-as-slope-local-rate-of-change",
      "/en/concepts/integral-as-accumulation-area",
    ] as const;

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const route of routes) {
        await test.step(route, async () => {
          await gotoAndExpectOk(page, route);

          await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);

          if (route.includes("#challenge-mode")) {
            const challengePanel = page.getByTestId("challenge-mode-full-panel");
            await expect(challengePanel).toBeVisible();
            await expectNoRawMathLeak(challengePanel);
          } else {
            await expect(page.getByTestId("concept-v2-step-card-slot")).toBeVisible();
            await expectNoRawMathLeak(page.getByTestId("concept-v2-step-card-slot"));
            await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);
          }

          await page.getByTestId("concept-v2-wrap-up").scrollIntoViewIfNeeded();
          await expectNoRawMathLeak(page.getByTestId("concept-v2-wrap-up"));

          await page.getByTestId("concept-v2-reference").scrollIntoViewIfNeeded();
          await expectNoRawMathLeak(page.getByTestId("concept-v2-reference"));
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("renders zh-HK v2 shell chrome without leaking the core English labels", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/zh-HK/concepts/simple-harmonic-motion");

      const equationSnapshot = page.getByTestId("concept-v2-equation-snapshot");
      await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
      await expect(equationSnapshot).toContainText("公式速覽");
      await expect(page.getByTestId("concept-v2-wrap-up")).toContainText("總結");
      await expect(page.getByTestId("concept-v2-reference")).toContainText("參考與支援");
      await page.getByTestId("concept-bench-utilities").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("concept-bench-utilities")).toContainText("工作台工具與分享連結");
      await expect(page.getByTestId("concept-post-phase-support")).toContainText("進度與下一步");
      await expect(page.getByTestId("concept-bench-utilities")).not.toContainText(
        "Bench tools and share links",
      );

      await page.getByTestId("concept-v2-guided-live-lab").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("concept-v2-guided-live-lab")).toBeInViewport();

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("treats rotational inertia as an authored v2 route with an explicit first lesson step", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/rotational-inertia");

      await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);

      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Read the baseline rotor",
      );
      await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);

      await page.getByTestId("concept-v2-wrap-up").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("concept-v2-wrap-up")).toBeVisible();
      await page.getByTestId("concept-v2-reference").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("concept-v2-reference")).toBeVisible();

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("treats the new mechanics family routes as authored v2 lessons", async ({ browser }) => {
    const authoredMechanicsCases = [
      {
        route: "/en/concepts/angular-momentum",
        firstStep: "Read one rotor with both ingredients",
      },
      {
        route: "/en/concepts/rolling-motion",
        firstStep: "Read one no-slip run",
      },
    ] as const;

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const item of authoredMechanicsCases) {
        await test.step(item.route, async () => {
          await gotoAndExpectOk(page, item.route);

          await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
          await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
            item.firstStep,
          );
          await expect(page.getByTestId("concept-v2-wrap-up")).toBeVisible();
          await expect(page.getByTestId("concept-v2-reference")).toBeVisible();
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the authored mechanics handoff inside authored v2 routes", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/rotational-inertia");

      const wrapUp = page.getByTestId("concept-v2-wrap-up");
      await wrapUp.scrollIntoViewIfNeeded();
      await wrapUp.getByRole("link", { name: "Angular Momentum" }).first().click();

      await expect(page).toHaveURL(/\/en\/concepts\/angular-momentum$/);
      await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);

      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Read one rotor with both ingredients",
      );

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("smokes newly migrated authored V2 lessons across subjects", async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);

    const coverageCases = [
      {
        route: "/en/concepts/angular-momentum",
        firstStep: "Read one rotor with both ingredients",
      },
      {
        route: "/en/concepts/rolling-motion",
        firstStep: "Read one no-slip run",
      },
      {
        route: "/en/concepts/rotational-inertia",
        firstStep: "Read the baseline rotor",
      },
      {
        route: "/en/concepts/torque",
        firstStep: "Read one clear push",
      },
      {
        route: "/en/concepts/derivative-as-slope-local-rate-of-change",
        firstStep: "Read a secant first",
      },
      {
        route: "/en/concepts/concentration-and-dilution",
        firstStep: "Dilute one crowded beaker",
      },
      {
        route: "/en/concepts/breadth-first-search-and-layered-frontiers",
        firstStep: "Read the first layer",
      },
      {
        route: "/en/concepts/sorting-and-algorithmic-trade-offs",
        firstStep: "Read the first trace",
      },
      {
        route: "/en/concepts/optimization-maxima-minima-and-constraints",
        firstStep: "Read the constraint",
      },
      {
        route: "/en/concepts/vectors-in-2d",
        firstStep: "Read one arrow two ways",
      },
    ] as const;

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      for (const item of coverageCases) {
        await test.step(item.route, async () => {
          await gotoAndExpectOk(page, item.route);

          await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
          await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(item.firstStep);
          await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);
          await expect(page.getByTestId("concept-v2-wrap-up")).toBeVisible();
          await expect(page.getByTestId("concept-v2-reference")).toBeVisible();
        });
      }

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("keeps the formerly fallback oscillation energy route usable and student-first", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await newConceptFlowPage(context);
    const browserGuard = await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/oscillation-energy");

      await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);

      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Read the energy split",
      );
      await expect(page.getByTestId("concept-v2-step-support-slot")).toHaveCount(0);
      await expect(page.getByTestId("concept-v2-rail-inline-check")).toBeVisible();
      await expect(page.getByTestId("concept-v2-reference")).toBeVisible();
      await expect(page.getByTestId("concept-v2-wrap-up")).toBeVisible();
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
});
