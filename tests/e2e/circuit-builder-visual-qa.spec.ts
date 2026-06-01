import { expect, test, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

type AccountState = "signed-in-free" | "signed-in-premium" | "signed-out";

const draftStorageKey = "open-model-lab.circuit-builder.draft.v1";
const localeHandoffStorageKey = "open-model-lab:circuit-builder-locale-handoff:v1";
const onboardingStorageKey = "open-model-lab.onboarding.v1";
const renderModeStorageKey = "open-model-lab:circuit-builder-render-mode:v1";
const localSavedCircuitsStorageKey = "open-model-lab.circuit-builder.saved-circuits.v1";

const viewports = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "wide", width: 1920, height: 1080, touch: false },
] as const;

const routes = [
  { name: "en", path: "/circuit-builder" },
  { name: "zh-HK", path: "/zh-HK/circuit-builder" },
] as const;

const accountStates = [
  {
    name: "signed-out",
    session: "signed-out" as const,
    pill: /Local draft|本機草稿/,
    primary: "local",
  },
  {
    name: "signed-in-free",
    session: "signed-in-free" as const,
    pill: /Local save|本機儲存/,
    primary: "local",
  },
  {
    name: "signed-in-premium",
    session: "signed-in-premium" as const,
    pill: /Account save available|可用帳戶儲存/,
    primary: "account",
  },
] as const satisfies readonly {
  name: AccountState;
  session: AccountState;
  pill: RegExp;
  primary: "account" | "local";
}[];

let browserGuard: BrowserGuard;

async function installCircuitBuilderStorageGuards(page: Page) {
  await page.addInitScript(
    ({ draftKey, handoffKey, localSavesKey, onboardingKey, renderModeKey }) => {
      window.localStorage.removeItem(draftKey);
      window.localStorage.removeItem(localSavesKey);
      window.localStorage.removeItem(renderModeKey);
      window.sessionStorage.removeItem(handoffKey);
      window.localStorage.setItem(
        onboardingKey,
        JSON.stringify({
          promptDismissed: true,
          disabled: false,
          completed: true,
          lastStep: 0,
          updatedAt: "2026-06-01T00:00:00.000Z",
        }),
      );
    },
    {
      draftKey: draftStorageKey,
      handoffKey: localeHandoffStorageKey,
      localSavesKey: localSavedCircuitsStorageKey,
      onboardingKey: onboardingStorageKey,
      renderModeKey: renderModeStorageKey,
    },
  );
}

async function openCircuitBuilder(page: Page, path = "/circuit-builder") {
  await gotoAndExpectOk(page, path);
  await expect(page.locator("[data-circuit-builder-ready]")).toBeVisible();
}

async function openSaveActions(page: Page) {
  const menu = page.locator('[data-circuit-toolbar-menu="saves"]');
  const button = menu.getByRole("button", { name: /Saves|儲存/ });
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
}

async function openFileActions(page: Page) {
  const menu = page.locator('[data-circuit-toolbar-menu="file"]');
  const button = menu.getByRole("button", { name: /File|檔案/ });
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
}

async function loadLdrPreset(page: Page) {
  await page.locator('[data-circuit-preset-button="ldr-explorer"]').click();
  await page.locator('[data-circuit-component-id="ldr-part"]').click();
}

function circuitDocumentFixture() {
  return {
    version: 1,
    environment: { temperatureC: 25, lightLevelPercent: 35 },
    view: { zoom: 0.78, offsetX: 76, offsetY: 92 },
    components: [
      {
        id: "battery-visual-qa",
        label: "Battery 1",
        type: "battery",
        x: 240,
        y: 320,
        rotation: 0,
        properties: { voltage: 9 },
      },
      {
        id: "bulb-visual-qa",
        label: "Light bulb 1",
        type: "lightBulb",
        x: 560,
        y: 320,
        rotation: 0,
        properties: { ratedVoltage: 6, ratedPower: 3 },
      },
    ],
    wires: [
      {
        id: "wire-positive-visual-qa",
        from: { componentId: "battery-visual-qa", terminal: "a" },
        to: { componentId: "bulb-visual-qa", terminal: "a" },
      },
      {
        id: "wire-negative-visual-qa",
        from: { componentId: "bulb-visual-qa", terminal: "b" },
        to: { componentId: "battery-visual-qa", terminal: "b" },
      },
    ],
  };
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentOverflow = document.documentElement.scrollWidth - viewportWidth;
    function isInsideIntentionalHorizontalScroller(element: HTMLElement) {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const parentStyle = window.getComputedStyle(parent);
        if (
          (parentStyle.overflowX === "auto" || parentStyle.overflowX === "scroll") &&
          parent.scrollWidth > parent.clientWidth + 1
        ) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    const visibleOffenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .flatMap((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          rect.bottom < 0 ||
          rect.top > window.innerHeight
        ) {
          return [];
        }
        if (rect.left >= -1 && rect.right <= viewportWidth + 1) {
          return [];
        }
        if (isInsideIntentionalHorizontalScroller(element)) {
          return [];
        }
        return [
          {
            tag: element.tagName.toLowerCase(),
            label:
              element.getAttribute("data-circuit-preset-button") ||
              element.getAttribute("data-circuit-save-state-kind") ||
              element.getAttribute("aria-label") ||
              element.textContent?.replace(/\s+/g, " ").trim().slice(0, 90) ||
              "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          },
        ];
      })
      .slice(0, 8);

    return {
      documentOverflow: Math.round(documentOverflow * 10) / 10,
      visibleOffenders,
    };
  });

  expect(overflow, context).toEqual({
    documentOverflow: 0,
    visibleOffenders: [],
  });
}

async function expectPrimaryTouchTargetsAtLeast(page: Page, context: string, minSize = 44) {
  const failures = await page.evaluate((minimum) => {
    const selectors = [
      "[data-circuit-preset-button]",
      "[data-circuit-palette-panel='mobile'] button",
      "[data-circuit-render-mode-option]",
      "[data-circuit-workspace-controls] button",
      "[data-circuit-toolbar] button",
      "[data-circuit-save-affordance] button",
      "[data-circuit-environment-control='mobile'] summary",
    ];

    return Array.from(document.querySelectorAll<HTMLElement>(selectors.join(",")))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.top <= window.innerHeight
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.textContent?.replace(/\s+/g, " ").trim() ||
            element.tagName.toLowerCase(),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      })
      .filter((entry) => entry.width < minimum || entry.height < minimum);
  }, minSize);

  expect(failures, context).toEqual([]);
}

async function expectTargetedTextNotClipped(page: Page, context: string) {
  const clipped = await page.evaluate(() => {
    const selectors = [
      "[data-circuit-workspace-empty-card] p",
      "[data-circuit-workspace-empty-card] button",
      "[data-circuit-save-affordance] span",
      "[data-circuit-save-affordance] button",
      "[data-circuit-toolbar-status] span",
      "[data-circuit-palette-empty] p",
      "[data-circuit-palette-empty] button",
      "[data-circuit-inline-recovery] p",
      "[data-circuit-inline-recovery] button",
    ];

    return Array.from(document.querySelectorAll<HTMLElement>(selectors.join(",")))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return [];
        }
        const clipsX =
          style.overflowX !== "visible" && element.scrollWidth > element.clientWidth + 1;
        const clipsY =
          style.overflowY !== "visible" && element.scrollHeight > element.clientHeight + 1;
        if (!clipsX && !clipsY) {
          return [];
        }
        return [
          {
            text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "",
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
          },
        ];
      })
      .slice(0, 12);
  });

  expect(clipped, context).toEqual([]);
}

async function expectReadableEmptyWorkspace(page: Page, context: string) {
  const metrics = await page.locator("[data-circuit-workspace-empty-card]").evaluate((element) => {
    function parseRgb(value: string) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        throw new Error(`Could not parse color: ${value}`);
      }
      const parts = match[1]!.split(",").map((part) => Number(part.trim()));
      return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
    }

    function channel(value: number) {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    }

    function luminance(color: { r: number; g: number; b: number }) {
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    }

    function composite(
      foreground: { r: number; g: number; b: number; a: number },
      background: { r: number; g: number; b: number; a: number },
    ) {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      };
    }

    function contrastRatio(
      foreground: { r: number; g: number; b: number; a: number },
      background: { r: number; g: number; b: number; a: number },
    ) {
      const resolvedForeground = foreground.a < 1 ? composite(foreground, background) : foreground;
      const light = Math.max(luminance(resolvedForeground), luminance(background));
      const dark = Math.min(luminance(resolvedForeground), luminance(background));
      return (light + 0.05) / (dark + 0.05);
    }

    const background = parseRgb(window.getComputedStyle(element).backgroundColor);
    const title = element.querySelector("[data-circuit-workspace-empty-title]");
    const subtitle = element.querySelector("[data-circuit-workspace-empty-subtitle]");
    const example = element.querySelector("[data-circuit-workspace-empty-example]");
    const action = element.querySelector("[data-circuit-workspace-empty-action]");
    if (!title || !subtitle || !example || !action) {
      throw new Error("Missing empty workspace instruction element.");
    }

    const actionStyle = window.getComputedStyle(action);
    return {
      titleContrast: contrastRatio(parseRgb(window.getComputedStyle(title).color), background),
      subtitleContrast: contrastRatio(parseRgb(window.getComputedStyle(subtitle).color), background),
      exampleContrast: contrastRatio(parseRgb(window.getComputedStyle(example).color), background),
      actionContrast: contrastRatio(parseRgb(actionStyle.color), parseRgb(actionStyle.backgroundColor)),
    };
  });

  expect(metrics.titleContrast, `${context} empty-state title contrast`).toBeGreaterThanOrEqual(7);
  expect(metrics.subtitleContrast, `${context} empty-state subtitle contrast`).toBeGreaterThanOrEqual(4.5);
  expect(metrics.exampleContrast, `${context} empty-state example contrast`).toBeGreaterThanOrEqual(4.5);
  expect(metrics.actionContrast, `${context} empty-state action contrast`).toBeGreaterThanOrEqual(7);
}

async function expectZhHkSurfaceHasNoStaleEnglish(page: Page, context: string) {
  const text = await page.locator("[data-circuit-builder-ready]").innerText();
  const forbidden = [
    /Build a live circuit/i,
    /Component library/i,
    /Circuit workspace/i,
    /Status and tools/i,
    /Search components/i,
    /Start with a source/i,
    /Save locally/i,
    /Save to account/i,
    /Circuit inspector/i,
    /Nothing selected/i,
    /Select mode/i,
  ].filter((pattern) => pattern.test(text));

  expect(
    forbidden.map((pattern) => pattern.source),
    context,
  ).toEqual([]);
}

async function getCircuitElementsOutsideWorkspace(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<SVGSVGElement>("[data-circuit-workspace-canvas]");
    if (!canvas) {
      throw new Error("Circuit workspace canvas was not rendered.");
    }
    const canvasRect = canvas.getBoundingClientRect();
    const tolerance = 1.5;

    return Array.from(
      document.querySelectorAll<SVGGraphicsElement>(
        "[data-circuit-component-id],[data-circuit-wire-id],[data-circuit-readout-chip]",
      ),
    ).flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return [];
      }
      const outside =
        rect.left < canvasRect.left - tolerance ||
        rect.right > canvasRect.right + tolerance ||
        rect.top < canvasRect.top - tolerance ||
        rect.bottom > canvasRect.bottom + tolerance;
      if (!outside) {
        return [];
      }
      return [
        {
          name:
            element.getAttribute("data-circuit-component-label") ||
            element.getAttribute("data-circuit-wire-id") ||
            `element-${index}`,
          rect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
          },
          workspace: {
            left: Math.round(canvasRect.left),
            right: Math.round(canvasRect.right),
            top: Math.round(canvasRect.top),
            bottom: Math.round(canvasRect.bottom),
          },
        },
      ];
    });
  });
}

async function expectCircuitInsideWorkspace(page: Page, context: string) {
  await expect
    .poll(() => getCircuitElementsOutsideWorkspace(page), {
      message: `${context} should fit inside the visible circuit workspace`,
    })
    .toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await installCircuitBuilderStorageGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("sweeps Circuit Builder first-view layout across account states, locales, and breakpoints", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);

  for (const accountState of accountStates) {
    await setHarnessSession(page, accountState.session);

    for (const route of routes) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openCircuitBuilder(page, route.path);

        const context = `${route.name} ${accountState.name} ${viewport.name}`;
        await expectNoHorizontalOverflow(page, context);
        await expectTargetedTextNotClipped(page, context);
        await expectReadableEmptyWorkspace(page, context);

        if (viewport.touch) {
          await expectPrimaryTouchTargetsAtLeast(page, context);
        }

        await page.locator('[data-circuit-preset-button="ldr-explorer"]').click();
        await expect(page.locator("[data-circuit-component-id]")).toHaveCount(4);
        await expectCircuitInsideWorkspace(page, `${context} save-affordance starter circuit`);

        const saveAffordance = page.locator("[data-circuit-save-affordance]").first();
        await expect(saveAffordance, `${context} save affordance`).toBeVisible();
        await expect(
          saveAffordance.locator("[data-circuit-save-state-pill]"),
          `${context} save state pill`,
        ).toContainText(accountState.pill);
        await expect(
          saveAffordance.locator("[data-circuit-primary-save-action]"),
          `${context} primary save action`,
        ).toHaveAttribute("data-circuit-primary-save-action", accountState.primary);

        if (route.name === "zh-HK") {
          await expectZhHkSurfaceHasNoStaleEnglish(page, context);
        }

        await page.screenshot({
          path: testInfo.outputPath(
            `circuit-builder-visual-matrix-${route.name}-${accountState.name}-${viewport.name}.png`,
          ),
          animations: "disabled",
          fullPage: false,
        });
      }
    }
  }
});

test("sweeps Circuit Builder core interaction states for visual QA regressions", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  for (const route of routes) {
    for (const viewport of viewports) {
      await setHarnessSession(page, "signed-out");
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openCircuitBuilder(page, route.path);
      await page.locator('[data-circuit-preset-button="starter-series"]').click();
      await expect(page.locator("[data-circuit-component-id]")).toHaveCount(5);
      await expectCircuitInsideWorkspace(page, `${route.name} starter preset ${viewport.name}`);
    }
  }

  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuitBuilder(page);
  const mobilePalette = page.locator('[data-circuit-palette-panel="mobile"]');
  await mobilePalette.getByLabel("Search components").fill("zzzz");
  await expect(mobilePalette.locator('[data-circuit-palette-empty="mobile"]')).toBeVisible();
  await expectTargetedTextNotClipped(page, "mobile empty component search");
  await expectPrimaryTouchTargetsAtLeast(page, "mobile empty component search");
  await page.screenshot({
    path: testInfo.outputPath("circuit-builder-visual-empty-search-phone.png"),
    animations: "disabled",
    fullPage: false,
  });

  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCircuitBuilder(page);
  await openFileActions(page);
  await page.locator('input[type="file"][aria-label="Load circuit JSON file"]').setInputFiles({
    name: "broken-circuit.json",
    mimeType: "application/json",
    buffer: Buffer.from("{not valid json"),
  });
  const fileRecovery = page.locator('[data-circuit-inline-recovery="file"]');
  await expect(fileRecovery).toBeVisible();
  await expect(fileRecovery).toBeInViewport();
  await expectTargetedTextNotClipped(page, "invalid import recovery");
  await expectNoHorizontalOverflow(page, "invalid import recovery");

  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCircuitBuilder(page);
  await loadLdrPreset(page);
  await openSaveActions(page);
  await page.getByRole("button", { name: "Save locally" }).click();
  await page.getByRole("textbox", { name: "Saved circuit name" }).fill("Visual QA local save");
  await page.getByRole("button", { name: "Save circuit" }).click();
  await expect(page.getByText("Visual QA local save", { exact: true }).last()).toBeVisible();
  await expectTargetedTextNotClipped(page, "local save panel");

  await setHarnessSession(page, "signed-in-premium");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCircuitBuilder(page);
  await loadLdrPreset(page);
  await openSaveActions(page);
  await page.getByRole("button", { name: "Save to account" }).click();
  await page.getByRole("textbox", { name: "Account save name" }).fill(`Visual QA account ${Date.now()}`);
  await page.getByRole("button", { name: "Save to account" }).click();
  await expect(page.locator("[data-circuit-save-state]").first()).toHaveAttribute(
    "data-circuit-save-state-kind",
    "account-save",
  );
  await expectTargetedTextNotClipped(page, "account save panel");

  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCircuitBuilder(page);
  await page.locator('input[type="file"][aria-label="Load circuit JSON file"]').setInputFiles({
    name: "modern-loop.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(circuitDocumentFixture())),
  });
  await page.getByRole("button", { name: "Modern" }).click();
  await expect(page.locator("[data-circuit-workspace-panel]")).toHaveAttribute(
    "data-circuit-render-mode",
    "modern",
  );
  await expect(page.locator('[data-circuit-modern-component="lightBulb"]')).toBeVisible();
  await expect(page.locator('[data-circuit-light-bulb-glow="on"]')).toBeVisible();
  await expectCircuitInsideWorkspace(page, "modern mode loaded loop");
  const environmentSummary = page.locator('[data-circuit-environment-control="desktop"] summary');
  if ((await page.locator('[data-circuit-environment-control="desktop"]').getAttribute("open")) === null) {
    await environmentSummary.click();
  }
  await page.getByRole("slider", { name: "Ambient temperature" }).press("End");
  await expect(page.getByRole("slider", { name: "Ambient temperature" })).toHaveValue("100");
  await expectNoHorizontalOverflow(page, "modern mode and environment controls");
  await page.screenshot({
    path: testInfo.outputPath("circuit-builder-visual-modern-environment-desktop.png"),
    animations: "disabled",
    fullPage: false,
  });

  await page.addInitScript(
    ({ draftKey, document }) => {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 1,
          savedAt: "2026-06-01T00:00:00.000Z",
          document,
        }),
      );
    },
    { draftKey: draftStorageKey, document: circuitDocumentFixture() },
  );
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuitBuilder(page, "/zh-HK/circuit-builder");
  const draftRecovery = page.getByRole("region", { name: "本機草稿復原" });
  await expect(draftRecovery).toBeVisible();
  await expect(draftRecovery).toBeInViewport();
  await expectZhHkSurfaceHasNoStaleEnglish(page, "zh-HK draft recovery");
  await expectPrimaryTouchTargetsAtLeast(page, "zh-HK draft recovery");
  await expectNoHorizontalOverflow(page, "zh-HK draft recovery");
  await draftRecovery.getByRole("button", { name: "還原草稿" }).click();
  await expect(page.getByRole("button", { name: "電池 1", exact: true })).toBeVisible();
});
