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

test.describe("concept page v2 flow", () => {
  test("keeps the first guided interaction viewport focused on the step summary and guided actions", async ({
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
        await page.getByRole("button", { name: "Start concept" }).click();

        const stepSlot = page.getByTestId("concept-v2-step-card-slot");
        const currentStepCard = page.getByTestId("concept-v2-current-step-card");
        const railInlineCheck = page.getByTestId("concept-v2-rail-inline-check");
        const stepMap = page.getByTestId("concept-v2-step-map");

        await expect(page).toHaveURL(/#guided-step-see-one-full-cycle$/);
        await expect(page.getByTestId("concept-v2-guided-live-lab")).toBeVisible();
        await expect(stepSlot).toBeInViewport();
        await expect(currentStepCard).toBeInViewport();
        await expect(railInlineCheck).toBeInViewport();
        await expect(stepMap).toBeInViewport();

        const [currentStepCardBox, stepMapBox] = await Promise.all([
          currentStepCard.boundingBox(),
          stepMap.boundingBox(),
        ]);

        expect(currentStepCardBox).not.toBeNull();
        expect(stepMapBox).not.toBeNull();
        expect(currentStepCardBox!.y).toBeLessThanOrEqual(stepMapBox!.y);

        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    }
  });

  test("start learning enters the live lab and activates the first guided step on simple harmonic motion", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await newConceptFlowPage(context);
    await installBrowserGuards(page);

    try {
      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion");

      const startHere = page.getByTestId("concept-v2-start-here");
      const stepSlot = page.getByTestId("concept-v2-step-card-slot");
      const stepSupport = page.getByTestId("concept-v2-step-support-slot");

      await expect(startHere).toBeVisible();
      await expect(stepSlot).toBeVisible();
      await expect(startHere.getByRole("button", { name: "Start concept" })).toBeVisible();
      await startHere.getByRole("button", { name: "Start concept" }).click();
      await expect(page).toHaveURL(/#guided-step-see-one-full-cycle$/);

      await expect(stepSlot).toContainText("See one full cycle");
      await expect(stepSlot.getByRole("progressbar", { name: "Lesson path" })).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
      await expect(stepSlot).toContainText("Current step");
      await expect(stepSupport).toContainText("Quick check");
      await expect(stepSupport.getByTestId("concept-v2-inline-check")).toBeVisible();
      await expect(stepSupport).toContainText("Now available");
      await expect(stepSupport).toContainText("Graph: Displacement over time");
      await expect(page.getByTestId("concept-v2-guided-live-lab")).toBeInViewport();
    } finally {
      await page.close().catch(() => undefined);
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
      const stepSupport = page.getByTestId("concept-v2-step-support-slot");

      await stepSlot.getByRole("button", { name: "Next step" }).focus();
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/#guided-step-link-stage-and-graphs$/);
      await expect(stepSlot).toContainText("Link the stage and graphs");
      await expect(stepSlot.getByRole("progressbar", { name: "Lesson path" })).toHaveAttribute(
        "aria-valuenow",
        "2",
      );
      await expect(stepSupport).toContainText("Graph: Velocity over time");
      await expect(stepSupport).toContainText("Graph: Acceleration over time");
      await expect(stepSupport.getByTestId("concept-v2-inline-check")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? null))
        .toMatch(/^(guided-live-lab|live-bench|concept-v2-current-step-heading)$/);
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

      await page
        .getByTestId("concept-v2-step-support-next")
        .getByRole("button", { name: /next step/i })
        .click();

      await expect(page).toHaveURL(/#guided-step-explain-the-restoring-rule$/);
      const wrapUp = page.getByTestId("concept-v2-wrap-up");
      await expect(wrapUp).toContainText("Open concept test");
      await expect(wrapUp).toContainText("More practice options");
      await expect(page.getByTestId("concept-v2-secondary-challenge")).toBeVisible();

      await page
        .getByTestId("concept-v2-complete-checkpoint")
        .getByRole("button", { name: "Wrap-up: Ready to wrap up" })
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

          await expectNoRawMathLeak(page.getByTestId("concept-v2-start-here"));

          if (route.includes("#challenge-mode")) {
            const challengePanel = page.getByTestId("challenge-mode-full-panel");
            await expect(challengePanel).toBeVisible();
            await expectNoRawMathLeak(challengePanel);
          } else {
            await page.getByRole("button", { name: "Start concept" }).click();
            await expect(page.getByTestId("concept-v2-step-card-slot")).toBeVisible();
            await expectNoRawMathLeak(page.getByTestId("concept-v2-step-card-slot"));
            await expectNoRawMathLeak(page.getByTestId("concept-v2-step-support-slot"));
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

      const startHere = page.getByTestId("concept-v2-start-here");
      const equationSnapshot = page.getByTestId("concept-v2-equation-snapshot");
      await expect(startHere).toContainText("開始概念");
      await expect(startHere).toContainText("預計時間");
      await expect(equationSnapshot).toContainText("公式速覽");
      await expect(startHere).not.toContainText("Start here");
      await expect(page.getByTestId("concept-v2-wrap-up")).toContainText("總結");
      await expect(page.getByTestId("concept-v2-reference")).toContainText("參考與支援");
      await page.getByTestId("concept-bench-utilities").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("concept-bench-utilities")).toContainText("工作台工具與分享連結");
      await expect(page.getByTestId("concept-post-phase-support")).toContainText("進度與下一步");
      await expect(page.getByTestId("concept-bench-utilities")).not.toContainText(
        "Bench tools and share links",
      );

      await startHere.getByRole("button", { name: "開始概念" }).click();
      await expect(page).toHaveURL(/#guided-step-see-one-full-cycle$/);
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

      await expect(page.getByTestId("concept-v2-start-here")).toBeVisible();
      await page.getByRole("button", { name: "Start concept" }).click();

      await expect(page).toHaveURL(/#guided-step-/);
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Read the baseline rotor",
      );
      await expect(page.getByTestId("concept-v2-step-support-slot")).toBeVisible();

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

          await expect(page.getByTestId("concept-v2-start-here")).toBeVisible();
          await page.getByRole("button", { name: "Start concept" }).click();
          await expect(page).toHaveURL(/#guided-step-/);
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
      await expect(page.getByTestId("concept-v2-start-here")).toBeVisible();

      await page.getByRole("button", { name: "Start concept" }).click();
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Read one rotor with both ingredients",
      );

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  test("smokes newly migrated authored V2 lessons across subjects", async ({ browser }) => {
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
        firstStep: "Read one crowded beaker",
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

          await expect(page.getByTestId("concept-v2-start-here")).toBeVisible();
          await page.getByRole("button", { name: "Start concept" }).click();

          await expect(page).toHaveURL(/#guided-step-/);
          await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(item.firstStep);
          await expect(page.getByTestId("concept-v2-step-support-slot")).toBeVisible();
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

      const startHere = page.getByTestId("concept-v2-start-here");
      await expect(startHere).toBeVisible();
      await startHere.getByRole("button", { name: "Start concept" }).click();

      await expect(page).toHaveURL(/#guided-step-read-the-energy-split$/);
      await expect(page.getByTestId("concept-v2-step-card-slot")).toContainText(
        "Read the energy split",
      );
      await expect(
        page.getByTestId("concept-v2-step-support-slot").getByTestId("concept-v2-inline-check"),
      ).toBeVisible();
      await expect(page.getByTestId("concept-v2-reference")).toBeVisible();
      await expect(page.getByTestId("concept-v2-wrap-up")).toBeVisible();
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
});
