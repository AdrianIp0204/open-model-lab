import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
} from "./helpers";

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
};

type ConceptFlowCase = {
  family: string;
  slug: string;
  title: string;
  exercise?: "time-playback" | "drag-affordance" | "circuit-toggle" | "graph-tab" | "compare" | "reset";
};

const onboardingStorageKey = "open-model-lab.onboarding.v1";
const onboardingDismissedState = {
  promptDismissed: true,
  disabled: false,
  completed: true,
  lastStep: 0,
  updatedAt: "2026-05-31T00:00:00.000Z",
} as const;

const viewportCases: ViewportCase[] = [
  {
    name: "phone-390x844",
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
  {
    name: "tablet-820x1180",
    width: 820,
    height: 1180,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const conceptFlowCases: ConceptFlowCase[] = [
  {
    family: "time playback",
    slug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    exercise: "time-playback",
  },
  {
    family: "direct-manipulation SVG",
    slug: "electric-fields",
    title: "Electric Fields",
    exercise: "drag-affordance",
  },
  {
    family: "circuit",
    slug: "basic-circuits",
    title: "Basic Circuits",
    exercise: "circuit-toggle",
  },
  {
    family: "graph/algorithm",
    slug: "frontier-and-visited-state-on-graphs",
    title: "Frontier and Visited State on Graphs",
    exercise: "graph-tab",
  },
  {
    family: "chemistry/pH",
    slug: "acid-base-ph-intuition",
    title: "Acid-Base / pH Intuition",
    exercise: "compare",
  },
  {
    family: "modern physics",
    slug: "photoelectric-effect",
    title: "Photoelectric Effect",
    exercise: "reset",
  },
  {
    family: "Maxwell-style synthesis",
    slug: "maxwells-equations-synthesis",
    title: "Maxwell's Equations Synthesis",
  },
];

async function newConceptPage(context: BrowserContext) {
  const page = await context.newPage();

  await page.addInitScript(
    ({ storageKey, onboardingState }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(onboardingState));
    },
    {
      storageKey: onboardingStorageKey,
      onboardingState: onboardingDismissedState,
    },
  );

  return page;
}

async function openConceptContext(browser: Browser, viewport: ViewportCase) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.deviceScaleFactor,
  });
  const page = await newConceptPage(context);
  const browserGuard = await installBrowserGuards(page);

  return { browserGuard, context, page };
}

async function firstVisible(locator: Locator) {
  const count = await locator.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);

    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  return null;
}

async function openCompactMenu(page: Page) {
  const menuButton = page.getByRole("button", { name: /open navigation menu/i });

  await expect(menuButton).toBeVisible();
  await expect(menuButton).toBeEnabled();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await menuButton.click();

    if (await page.getByRole("navigation", { name: /mobile primary/i }).isVisible().catch(() => false)) {
      return;
    }

    await page.waitForTimeout(250);
  }

  await expect(page.getByRole("navigation", { name: /mobile primary/i })).toBeVisible();
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

  return String(Math.abs(current - max) > Math.abs(current - min) ? max : min);
}

async function assertConceptReady(page: Page, routeCase: ConceptFlowCase) {
  await expect(page.getByRole("heading", { name: routeCase.title, exact: true })).toBeVisible();
  await expect(page.getByTestId("concept-v2-guided-live-lab")).toBeVisible();
  await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();
  await expect(page.getByTestId("simulation-shell-controls")).toBeVisible();
  await expect(page.getByTestId("simulation-shell-graphs")).toBeVisible();
  await expect(page.getByTestId("concept-v2-current-step-cue")).toBeVisible();
  await expect(page.getByText(/simulation loading/i)).toHaveCount(0);
}

async function exerciseStepNavigation(page: Page) {
  const stepSlot = page.getByTestId("concept-v2-step-card-slot");
  const progress = stepSlot.getByRole("progressbar", { name: "Lesson path" });
  const nextButton = stepSlot.getByTestId("concept-v2-rail-next-button");

  await expect(stepSlot).toBeVisible();
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(progress).toHaveAttribute("aria-valuenow", "2");

  const previousButton = stepSlot.locator('button[aria-label^="Previous step:"]').first();
  await expect(previousButton).toBeEnabled();
  await previousButton.click();
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
}

async function exerciseGraphTabSwitch(page: Page) {
  const moreGraphs = page.getByRole("button", { name: "More graphs" });

  if (await moreGraphs.isVisible().catch(() => false)) {
    await moreGraphs.click();
  }

  const tabs = page.locator('[id^="graph-tab-"]');
  const tabCount = await tabs.count();

  expect(tabCount, "Expected at least two graph tabs for graph-tab coverage.").toBeGreaterThan(1);

  for (let index = 0; index < tabCount; index += 1) {
    const tab = tabs.nth(index);

    if (
      (await tab.isVisible().catch(() => false)) &&
      (await tab.getAttribute("aria-selected")) !== "true"
    ) {
      await tab.scrollIntoViewIfNeeded();
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      return;
    }
  }

  throw new Error("No inactive visible graph tab was available to switch.");
}

async function exerciseCompareMode(page: Page) {
  const controls = page.getByTestId("simulation-shell-controls");
  const compareEntry = controls.getByTestId("control-panel-guided-compare-entry");

  await expect(compareEntry).toBeVisible();
  await compareEntry.getByRole("button", { name: "Compare mode" }).click();

  const compareTools = controls.getByTestId("control-panel-compare-tools");
  const slider = controls.getByRole("slider").first();
  const initialValue = await slider.inputValue();
  const changedValue = await chooseDifferentSliderValue(slider);

  await expect(compareTools).toContainText("Editing Setup");
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
  await compareTools.getByRole("button", { name: "Reset variant" }).click();
  await expect(slider).toHaveValue(initialValue);
  await compareTools.getByRole("button", { name: "Exit compare mode" }).click();
  await expect(compareTools).toHaveCount(0);
  await expect(compareEntry).toBeVisible();
}

async function exerciseReset(page: Page) {
  const controls = page.getByTestId("simulation-shell-controls");
  const slider = controls.getByRole("slider").first();
  const changedValue = await chooseDifferentSliderValue(slider);

  await slider.fill(changedValue);
  await expect(slider).toHaveValue(changedValue);
  await controls.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => slider.inputValue()).not.toBe(changedValue);
}

async function exerciseQuickCheck(page: Page) {
  const railChoices = page.getByTestId("concept-v2-rail-inline-check-choices");

  if (!(await railChoices.isVisible().catch(() => false))) {
    return;
  }

  const correctChoice = railChoices.getByRole("radio", {
    name: /The object cycles faster while the turning points stay at the same displacement/i,
  });

  await expect(railChoices).toHaveAttribute("role", "radiogroup");
  await expect(correctChoice).toHaveAttribute("aria-checked", "false");
  await correctChoice.click();
  await expect(correctChoice).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("concept-v2-rail-inline-check-choices-feedback")).toContainText(
    "Correct",
  );
}

async function exerciseCaseSpecificControl(page: Page, routeCase: ConceptFlowCase) {
  switch (routeCase.exercise) {
    case "time-playback": {
      const stageToggle = page.getByTestId("simulation-stage-playback-toggle");
      const initialToggleLabel = await stageToggle.getAttribute("aria-label");

      await expect(stageToggle).toBeVisible();
      await stageToggle.dispatchEvent("pointerup", {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
      });
      await expect.poll(() => stageToggle.getAttribute("aria-label")).not.toBe(initialToggleLabel);
      await exerciseQuickCheck(page);
      return;
    }
    case "drag-affordance": {
      const dragAffordance = page.getByTestId("simulation-stage-first-action-affordance");

      await expect(dragAffordance).toBeVisible();
      await expect(dragAffordance).toHaveAttribute("data-first-action-kind", "drag-probe");
      await dragAffordance.click();
      await expect(page.getByRole("button", { name: /probe/i }).first()).toBeFocused();
      return;
    }
    case "circuit-toggle": {
      const branchToggle = page.getByRole("checkbox", { name: "Use parallel branches" });
      const initialToggleChecked = await branchToggle.isChecked();

      await expect(branchToggle).toBeVisible();
      await branchToggle.press("Space");
      await expect(branchToggle).toBeChecked({ checked: !initialToggleChecked });
      return;
    }
    case "graph-tab":
      await exerciseGraphTabSwitch(page);
      return;
    case "compare":
      await exerciseCompareMode(page);
      return;
    case "reset":
      await exerciseReset(page);
      return;
    default:
      return;
  }
}

test.describe("OML-QA-055 concept page representative user flows", () => {
  test("covers guided lesson, graph, compare, reset, and simulation controls across concept families", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(420_000);

    for (const viewport of viewportCases) {
      const { browserGuard, context, page } = await openConceptContext(browser, viewport);

      try {
        for (const routeCase of conceptFlowCases) {
          await test.step(`${viewport.name} ${routeCase.family}: ${routeCase.slug}`, async () => {
            await gotoAndExpectOk(page, `/en/concepts/${routeCase.slug}`);
            await assertConceptReady(page, routeCase);
            await exerciseStepNavigation(page);
            await exerciseCaseSpecificControl(page, routeCase);
          });
        }

        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    }
  });

  test("covers header menu, help, theme, language, and signed-in shell variants on concept routes", async ({
    browser,
  }) => {
    const desktop = await openConceptContext(browser, { name: "desktop", width: 1440, height: 900 });

    try {
      await setHarnessSession(desktop.page, "signed-out");
      await gotoAndExpectOk(desktop.page, "/en/concepts/simple-harmonic-motion");
      await expect(desktop.page.getByRole("navigation", { name: "Primary", exact: true })).toBeVisible();
      await expect(desktop.page.locator('[data-onboarding-target="account-sync"]')).toContainText(
        "Sign in",
      );

      const themeToggle = desktop.page.getByTestId("theme-mode-toggle").first();
      await expect(themeToggle).toBeVisible();
      await themeToggle.click();
      await expect
        .poll(() => desktop.page.evaluate(() => document.documentElement.dataset.theme))
        .toBe("paper-lab");
      await expect
        .poll(() => desktop.page.evaluate(() => window.localStorage.getItem("oml-theme-mode")))
        .toBe("paper-lab");

      await desktop.page.getByRole("button", { name: "Open Help / Tutorial" }).click();
      const helpDialog = desktop.page.getByRole("dialog", { name: "Live concept page" });
      await expect(helpDialog).toContainText("live lab");
      await helpDialog.getByRole("button", { name: "Close Help / Tutorial" }).click();
      await expect(helpDialog).toHaveCount(0);

      const languageSwitcher = desktop.page.getByRole("combobox", { name: /change language/i });
      await languageSwitcher.selectOption("zh-HK");
      await expect(desktop.page).toHaveURL(/\/zh-HK\/concepts\/simple-harmonic-motion$/);
      await expect(desktop.page.locator("h1")).toBeVisible();
      await desktop.page.locator("select").first().selectOption("en");
      await expect(desktop.page).toHaveURL(/\/en\/concepts\/simple-harmonic-motion$/);

      await setHarnessSession(desktop.page, "signed-in-free");
      await gotoAndExpectOk(desktop.page, "/en/concepts/simple-harmonic-motion");
      await expect(desktop.page.locator('[data-onboarding-target="account-sync"]')).toContainText(
        "Free learner",
      );

      desktop.browserGuard.assertNoActionableIssues();
    } finally {
      await desktop.context.close();
    }

    const phone = await openConceptContext(browser, {
      name: "phone",
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });

    try {
      await gotoAndExpectOk(phone.page, "/en/concepts/simple-harmonic-motion");

      await openCompactMenu(phone.page);
      await expect(phone.page.getByRole("navigation", { name: /mobile primary/i })).toBeVisible();
      await expect(phone.page.getByRole("button", { name: /close navigation menu/i })).toBeVisible();
      await expect(await firstVisible(phone.page.getByTestId("theme-mode-toggle"))).not.toBeNull();
      await phone.page.keyboard.press("Escape");
      await expect(phone.page.getByRole("navigation", { name: /mobile primary/i })).toHaveCount(0);

      phone.browserGuard.assertNoActionableIssues();
    } finally {
      await phone.context.close();
    }
  });

  test("covers concept route reload, loading fallback, and invalid slug not-found states", async ({
    browser,
  }) => {
    const { browserGuard, context, page } = await openConceptContext(browser, {
      name: "desktop",
      width: 1440,
      height: 900,
    });

    try {
      let delayedSimulationChunk = false;

      await page.route(/\/_next\/static\/chunks\/.*(?:ConceptSimulationRenderer|simulations).*\.js/i, async (route) => {
        if (!delayedSimulationChunk) {
          delayedSimulationChunk = true;
          await new Promise((resolve) => setTimeout(resolve, 750));
        }

        await route.continue();
      });

      await gotoAndExpectOk(page, "/en/concepts/simple-harmonic-motion");
      await expect(page.getByText("Simulation loading")).toBeVisible();
      await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();
      expect(delayedSimulationChunk, "Expected to delay the deferred simulation chunk.").toBe(true);

      const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
      expect(reloadResponse?.ok(), `Reload returned ${reloadResponse?.status()}.`).toBeTruthy();
      await expect(page.getByRole("heading", { name: "Simple Harmonic Motion" })).toBeVisible();
      await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();

      const invalidResponse = await page.goto("/en/concepts/not-a-real-concept-oml-qa-055", {
        waitUntil: "domcontentloaded",
      });
      browserGuard.allowIssue(/404 \(Not Found\)/i);
      expect(invalidResponse?.status(), "Invalid concept slug should return not found.").toBe(404);
      await expect(page.locator("body")).toContainText(/404|not found/i);

      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
});
