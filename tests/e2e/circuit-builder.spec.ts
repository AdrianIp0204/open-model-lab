import { expect, test, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

let browserGuard: BrowserGuard;
const draftStorageKey = "open-model-lab.circuit-builder.draft.v1";
const onboardingStorageKey = "open-model-lab.onboarding.v1";

async function suppressOnboardingPrompt(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: true,
        lastStep: 0,
        updatedAt: "2026-04-27T00:00:00.000Z",
      }),
    );
  }, onboardingStorageKey);
}

async function openCircuitBuilder(page: Page) {
  await gotoAndExpectOk(page, "/circuit-builder");
  await expect(page.locator("[data-circuit-builder-ready]")).toBeVisible();
}

async function clearWorkspaceFromControls(page: Page) {
  const workspaceControls = page.locator("[data-circuit-workspace-controls]");
  await workspaceControls.getByRole("button", { name: "Clear workspace" }).click();
  await workspaceControls.getByRole("button", { name: "Confirm clear" }).click();
}

async function loadCircuitDocument(page: Page, name: string, document: unknown) {
  await page.locator('input[type="file"][aria-label="Load circuit JSON file"]').setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.getByRole("status")).toContainText("Loaded");
}

async function buildSimpleLoop(page: Page) {
  await loadCircuitDocument(page, "simple-loop.json", {
    version: 1,
    environment: { temperatureC: 25, lightLevelPercent: 35 },
    view: { zoom: 0.78, offsetX: 76, offsetY: 92 },
    components: [
      {
        id: "battery-simple",
        label: "Battery 1",
        type: "battery",
        x: 240,
        y: 320,
        rotation: 90,
        properties: { voltage: 9 },
      },
      {
        id: "resistor-simple",
        label: "Resistor 1",
        type: "resistor",
        x: 560,
        y: 224,
        rotation: 0,
        properties: { resistance: 12 },
      },
    ],
    wires: [
      {
        id: "w1",
        from: { componentId: "battery-simple", terminal: "a" },
        to: { componentId: "resistor-simple", terminal: "a" },
      },
      {
        id: "w2",
        from: { componentId: "resistor-simple", terminal: "b" },
        to: { componentId: "battery-simple", terminal: "b" },
      },
    ],
  });
}

async function buildThermistorLoop(page: Page) {
  await page.getByRole("button", { name: "Thermistor temperature explorer" }).click();
  await page.getByRole("button", { name: "Thermistor 1", exact: true }).click();
}

async function loadLdrPreset(page: Page) {
  await page.getByRole("button", { name: "LDR light explorer" }).click();
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
}

async function openDesktopEnvironmentControl(page: Page) {
  const control = page.locator('[data-circuit-environment-control="desktop"]').first();
  if ((await control.getAttribute("open")) !== null) {
    return;
  }

  await control.locator("summary").click();
}

async function openSaveActions(page: Page) {
  const button = page
    .locator('[data-circuit-toolbar-menu="saves"]')
    .getByRole("button", { name: "Saves" });
  const fileButton = page
    .locator('[data-circuit-toolbar-menu="file"]')
    .getByRole("button", { name: "File" });
  if ((await fileButton.getAttribute("aria-expanded")) === "true") {
    await fileButton.click();
  }
  if ((await button.getAttribute("aria-expanded")) === "true") {
    return;
  }
  await button.click();
}

async function openFileActions(page: Page) {
  const menu = page.locator('[data-circuit-toolbar-menu="file"]');
  const button = menu.getByRole("button", { name: "File" });
  const saveButton = page
    .locator('[data-circuit-toolbar-menu="saves"]')
    .getByRole("button", { name: "Saves" });
  if ((await saveButton.getAttribute("aria-expanded")) === "true") {
    await saveButton.click();
  }
  if ((await button.getAttribute("aria-expanded")) === "true") {
    return;
  }
  await button.click();
  await expect(menu.getByRole("button", { name: "Download JSON", exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await suppressOnboardingPrompt(page);
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("supports pointer drag movement, toolbar rotation, and svg export from the live desktop workspace", async ({
  page,
}, testInfo) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await expect(
    page.getByRole("heading", {
      name: "Build a live circuit and explain what it is doing.",
    }),
  ).toBeVisible();

  await buildSimpleLoop(page);

  const battery = page.getByRole("button", { name: "Battery 1", exact: true });
  const resistor = page.getByRole("button", { name: "Resistor 1", exact: true });
  await battery.click();
  await expect(page.getByRole("heading", { name: "Battery 1" })).toBeVisible();
  await resistor.click();
  await expect(page.getByRole("heading", { name: "Resistor 1" })).toBeVisible();
  await expect(resistor).toBeVisible();

  const positionX = page.getByRole("spinbutton", { name: "Position X" }).first();
  const positionY = page.getByRole("spinbutton", { name: "Position Y" }).first();
  const beforeX = await positionX.inputValue();
  const beforeY = await positionY.inputValue();

  const box = await resistor.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 80, {
    steps: 12,
  });
  await page.mouse.up();

  const afterX = await positionX.inputValue();
  const afterY = await positionY.inputValue();
  expect(afterX).not.toBe(beforeX);
  expect(afterY).not.toBe(beforeY);

  await page.getByRole("button", { name: "Rotate selected" }).click();
  await expect(page.getByRole("status")).toContainText("rotated");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).click(),
  ]);
  const svgPath = testInfo.outputPath("circuit-builder-desktop.svg");
  await download.saveAs(svgPath);
  const svg = await fs.readFile(svgPath, "utf8");

  expect(svg).toContain(`translate(${afterX} ${afterY}) rotate(90)`);
});

test("keeps the builder row visible on desktop, scrolls the palette internally, and uses the compact workspace environment control", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  const builderRow = page.locator("[data-circuit-builder-row]");
  const workspacePanel = page.locator("[data-circuit-workspace-panel]");
  const palettePanel = page.locator('[data-circuit-palette-panel="desktop"]');
  const paletteScroll = page.locator('[data-circuit-palette-scroll="desktop"]');
  const workspaceBox = await workspacePanel.boundingBox();
  const paletteBox = await palettePanel.boundingBox();

  expect(workspaceBox).not.toBeNull();
  expect(paletteBox).not.toBeNull();
  expect(workspaceBox!.y).toBeLessThan(620);
  expect(Math.abs((workspaceBox?.height ?? 0) - (paletteBox?.height ?? 0))).toBeLessThan(48);
  await expect(builderRow).toBeVisible();

  const initialWindowScrollY = await page.evaluate(() => window.scrollY);
  const canScrollInternally = await paletteScroll.evaluate(
    (element) => element.scrollHeight > element.clientHeight,
  );
  expect(canScrollInternally).toBeTruthy();

  await paletteScroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.waitForFunction(() => {
    const element = document.querySelector("[data-circuit-palette-scroll]");
    return element instanceof HTMLElement && element.scrollTop > 0;
  });
  expect(await page.evaluate(() => window.scrollY)).toBe(initialWindowScrollY);
  await expect(page.getByRole("button", { name: "Add Fuse" })).toBeVisible();

  await page.getByRole("button", { name: "Thermistor temperature explorer" }).click();
  await page.getByRole("button", { name: "Thermistor 1", exact: true }).click();
  const environmentSummary = page.locator(
    '[data-circuit-environment-control="desktop"] summary',
  );
  await expect(environmentSummary).toBeVisible();
  const environmentBox = await environmentSummary.boundingBox();
  expect(environmentBox).not.toBeNull();
  expect(environmentBox!.y).toBeLessThan((workspaceBox?.y ?? 0) + 80);
  await environmentSummary.click();
  await page.getByRole("slider", { name: "Ambient temperature" }).press("End");
  await expect(
    page.getByLabel("Circuit inspector").first().getByText(/current ambient temperature of 100\s*°?\s*C/i),
  ).toBeVisible();
});

test("searches the desktop component library, adds a lower component quickly, and clears from the workspace controls with undo recovery", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  const desktopPalette = page.locator('[data-circuit-palette-panel="desktop"]');
  const workspaceControls = page.locator("[data-circuit-workspace-controls]");
  const initialWindowScrollY = await page.evaluate(() => window.scrollY);

  await desktopPalette.getByLabel("Search components").fill("fuse");
  await expect(desktopPalette.getByRole("button", { name: "Add Fuse" })).toBeVisible();
  await expect(desktopPalette.getByRole("button", { name: "Add Battery", exact: true })).toHaveCount(0);
  await desktopPalette.getByRole("button", { name: "Add Fuse" }).click();

  await expect(page.getByRole("button", { name: "Fuse 1", exact: true })).toBeVisible();
  expect(
    await page.evaluate((initial) => Math.abs(window.scrollY - initial), initialWindowScrollY),
  ).toBeLessThanOrEqual(100);

  await expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).toBeVisible();
  await clearWorkspaceFromControls(page);
  await expect(page.getByRole("button", { name: "Fuse 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeDisabled();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Fuse 1", exact: true })).toBeVisible();
});

test("keeps toolbar groups compact and usable on a narrower laptop viewport", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1180, height: 900 });
  await openCircuitBuilder(page);

  const toolbar = page.locator("[data-circuit-toolbar]");
  const historyGroup = page.locator('[data-circuit-toolbar-group="history"]');
  const selectionGroup = page.locator('[data-circuit-toolbar-group="selection"]');
  const savesMenu = page.locator('[data-circuit-toolbar-menu="saves"]');
  const fileGroup = page.locator('[data-circuit-toolbar-group="file"]');
  const toolbarBox = await toolbar.boundingBox();

  await expect(toolbar).toBeVisible();
  await expect(historyGroup).toBeVisible();
  await expect(selectionGroup).toBeVisible();
  await expect(savesMenu).toBeVisible();
  await expect(fileGroup).toBeVisible();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox!.height).toBeLessThan(132);

  await page.getByRole("button", { name: "LDR light explorer" }).click();
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Rotate selected" })).toBeEnabled();

  await openSaveActions(page);
  await expect(page.getByRole("button", { name: "Save locally" })).toBeEnabled();

  await openFileActions(page);
  const fileMenu = page.locator('[data-circuit-toolbar-menu="file"]');
  await expect(fileMenu.getByRole("button", { name: "Download JSON", exact: true })).toBeVisible();
  await expect(fileMenu.getByRole("button", { name: "Load JSON", exact: true })).toBeVisible();
  await expect(fileMenu.getByRole("button", { name: "Copy JSON state", exact: true })).toBeVisible();
});

test("updates thermistor inspector values when ambient temperature changes through the live UI", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await buildThermistorLoop(page);
  await openDesktopEnvironmentControl(page);

  const inspector = page.getByLabel("Circuit inspector").first();
  const effectiveResistanceCard = inspector.getByText("Effective resistance").first().locator("..");
  const beforeText = await effectiveResistanceCard.textContent();

  await page.getByRole("slider", { name: "Ambient temperature" }).press("End");

  const afterText = await effectiveResistanceCard.textContent();
  expect(afterText).not.toBe(beforeText);
  await expect(inspector.getByText(/current ambient temperature of 100\s*°?\s*C/i)).toBeVisible();
});

test("updates LDR inspector values when ambient light intensity changes through the live UI", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await loadLdrPreset(page);
  await openDesktopEnvironmentControl(page);

  const inspector = page.getByLabel("Circuit inspector").first();
  const effectiveResistanceCard = inspector.getByText("Effective resistance").first().locator("..");
  const beforeText = await effectiveResistanceCard.textContent();

  await page.getByRole("slider", { name: "Light intensity" }).press("End");

  const afterText = await effectiveResistanceCard.textContent();
  expect(afterText).not.toBe(beforeText);
  await expect(inspector.getByText(/current light intensity of 100%/i)).toBeVisible();
  await expect(inspector.getByRole("img", { name: /LDR response/i })).toBeVisible();
});

test("round-trips a saved circuit json through download and import without losing ambient or export behavior", async ({
  page,
}, testInfo) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await loadLdrPreset(page);
  await page.getByRole("button", { name: "Rotate selected" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("status")).toContainText(/Undid/i);

  const [undoSvgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).first().click(),
  ]);
  const undoSvgPath = testInfo.outputPath("circuit-builder-undo.svg");
  await undoSvgDownload.saveAs(undoSvgPath);
  const undoSvg = await fs.readFile(undoSvgPath, "utf8");
  expect(undoSvg).toMatch(/data-component-id="ldr-part"[^>]*transform="translate\(\d+ 224\) rotate\(0\)"/);

  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.getByRole("status")).toContainText(/Redid/i);
  await openDesktopEnvironmentControl(page);
  await page.getByRole("slider", { name: "Light intensity" }).press("End");
  await page.getByRole("button", { name: "Thermistor temperature explorer" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("button", { name: "Light-dependent resistor 1", exact: true })).toBeVisible();

  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    (async () => {
      await openFileActions(page);
      await page
        .locator('[data-circuit-toolbar-menu="file"]')
        .getByRole("button", { name: "Download JSON", exact: true })
        .click();
    })(),
  ]);
  const jsonPath = testInfo.outputPath("circuit-builder-round-trip.json");
  await jsonDownload.saveAs(jsonPath);

  await clearWorkspaceFromControls(page);
  await expect(page.getByRole("button", { name: "Download SVG" }).first()).toBeDisabled();

  await page
    .locator('input[type="file"][aria-label="Load circuit JSON file"]')
    .setInputFiles(jsonPath);

  await expect(page.getByRole("status")).toContainText("Loaded");
  await expect(page.getByRole("slider", { name: "Light intensity" })).toHaveValue("100");

  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  const inspector = page.getByLabel("Circuit inspector").first();
  await expect(inspector.getByText(/current light intensity of 100%/i)).toBeVisible();
  await expect(inspector.getByText("Ambient-linked").first()).toBeVisible();

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).first().click(),
  ]);
  const svgPath = testInfo.outputPath("circuit-builder-round-trip.svg");
  await svgDownload.saveAs(svgPath);
  const svg = await fs.readFile(svgPath, "utf8");

  expect(svg).toContain("@ 100% light");
  expect(svg).toMatch(/data-component-id="ldr-part"[^>]*transform="translate\(\d+ 224\) rotate\(90\)"/);
});

test("restores a local autosaved draft after reload without breaking ambient or svg behavior", async ({
  page,
}, testInfo) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await loadLdrPreset(page);
  await openDesktopEnvironmentControl(page);
  await page.getByRole("slider", { name: "Light intensity" }).press("End");
  await page.waitForFunction((key) => Boolean(window.localStorage.getItem(key)), draftStorageKey);

  await page.reload();
  await expect(page.getByRole("region", { name: "Local draft recovery" })).toBeVisible();
  await page.getByRole("button", { name: "Restore draft" }).click();

  await openDesktopEnvironmentControl(page);
  await expect(page.getByRole("slider", { name: "Light intensity" })).toHaveValue("100");
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  const inspector = page.getByLabel("Circuit inspector").first();
  await expect(inspector.getByText(/current light intensity of 100%/i)).toBeVisible();

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).first().click(),
  ]);
  const svgPath = testInfo.outputPath("circuit-builder-restored-draft.svg");
  await svgDownload.saveAs(svgPath);
  const svg = await fs.readFile(svgPath, "utf8");

  expect(svg).toContain("@ 100% light");
});

test("saves a named local circuit and reopens it after replacing the current document", async ({
  page,
}, testInfo) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await loadLdrPreset(page);
  await openDesktopEnvironmentControl(page);
  await page.getByRole("slider", { name: "Light intensity" }).press("ArrowRight");
  await openSaveActions(page);
  await page.getByRole("button", { name: "Save locally" }).click();
  await page.getByRole("textbox", { name: "Saved circuit name" }).fill("Browser save");
  await page.getByRole("button", { name: "Save circuit" }).click();
  await expect(page.getByText("Browser save", { exact: true }).last()).toBeVisible();

  await page.getByRole("button", { name: "Thermistor temperature explorer" }).click();
  await expect(
    page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Open saved circuit Browser save", exact: true }).click();
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  const inspector = page.getByLabel("Circuit inspector").first();
  await expect(inspector.getByText(/current light intensity of 21%/i)).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("button", { name: "Thermistor 1", exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  await expect(inspector.getByText(/current light intensity of 21%/i)).toBeVisible();

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).first().click(),
  ]);
  const svgPath = testInfo.outputPath("circuit-builder-saved-library.svg");
  await svgDownload.saveAs(svgPath);
  const svg = await fs.readFile(svgPath, "utf8");

  expect(svg).toContain("@ 21% light");
});

test("saves and reopens an account-backed circuit for an eligible user", async ({
  page,
}, testInfo) => {
  await setHarnessSession(page, "signed-in-premium");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);
  const saveTitle = `Account browser save ${Date.now()}`;

  await loadLdrPreset(page);
  await openDesktopEnvironmentControl(page);
  await page.getByRole("slider", { name: "Light intensity" }).press("End");
  await openSaveActions(page);
  await page.getByRole("button", { name: "Save to account" }).click();
  await page.getByRole("textbox", { name: "Account save name" }).fill(saveTitle);
  await page.getByRole("button", { name: "Save to account" }).click();
  await expect(page.getByText(saveTitle, { exact: true }).last()).toBeVisible();
  await openSaveActions(page);
  await expect(page.getByRole("button", { name: "Update account save" })).toBeEnabled();

  await page.reload();
  await expect(page.getByText(saveTitle, { exact: true }).last()).toBeVisible();

  await page.getByRole("button", { name: "Thermistor temperature explorer" }).click();
  await expect(
    page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: `Open account save ${saveTitle}`, exact: true }).click();
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  const inspector = page.getByLabel("Circuit inspector").first();
  await expect(inspector.getByText(/current light intensity of 100%/i)).toBeVisible();
  await openDesktopEnvironmentControl(page);
  await page.getByRole("slider", { name: "Light intensity" }).press("Home");
  await openSaveActions(page);
  await page.getByRole("button", { name: "Update account save" }).click();

  await page.reload();
  await expect(page.getByText(saveTitle, { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: `Open account save ${saveTitle}`, exact: true }).click();
  await page.getByRole("button", { name: "Light-dependent resistor 1", exact: true }).click();
  await expect(inspector.getByText(/current light intensity of 0%/i)).toBeVisible();

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).first().click(),
  ]);
  const svgPath = testInfo.outputPath("circuit-builder-account-save.svg");
  await svgDownload.saveAs(svgPath);
  const svg = await fs.readFile(svgPath, "utf8");

  expect(svg).toContain("@ 0% light");
});

test("selects a wire through the actual workspace hit target and deletes it coherently", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 1440, height: 980 });
  await openCircuitBuilder(page);

  await buildSimpleLoop(page);

  await page.getByRole("button", {
    name: /Select Wire linking Battery 1 positive terminal to Resistor 1 terminal A/i,
  }).click();

  await expect(page.getByText(/Wire linking .* selected/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Rotate selected" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Delete selected", exact: true })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Selected connection" }).first()).toBeVisible();
  await expect(page.getByText("Ideal connection").first()).toBeVisible();

  const connections = page.getByRole("region", { name: "Connections" });
  await expect(connections.getByRole("button")).toHaveCount(2);

  await page.getByRole("button", { name: "Delete selected", exact: true }).click();

  await expect(connections.getByRole("button")).toHaveCount(1);
  await expect(page.getByText("Nothing selected")).toBeVisible();
  await expect(page.getByText(/unconnected terminal/i).first()).toBeVisible();
});

test("keeps the component library, workspace, inspector, export actions, and connections reachable on a narrow mobile viewport", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuitBuilder(page);

  const libraryDisclosure = page.locator("summary").filter({ hasText: "Component library" }).first();
  const inspectorDisclosure = page.locator("summary").filter({ hasText: "Inspector" }).first();

  await expect(libraryDisclosure).toBeVisible();
  await expect(page.getByRole("region", { name: "Circuit workspace" })).toBeVisible();
  await expect(inspectorDisclosure).toBeVisible();
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeVisible();
  const mobilePalette = page.locator('[data-circuit-palette-panel="mobile"]');
  if (!(await mobilePalette.getByLabel("Search components").isVisible())) {
    await libraryDisclosure.click();
  }
  await mobilePalette.getByLabel("Search components").fill("ldr");
  await expect(
    mobilePalette.getByRole("button", { name: "Add Light-dependent resistor" }),
  ).toBeVisible();
  await expect(mobilePalette.getByRole("button", { name: "Add Fuse", exact: true })).toHaveCount(0);
  await mobilePalette.getByRole("button", { name: "Clear" }).click();
  const mobileEnvironmentSummary = page.locator(
    '[data-circuit-environment-control="mobile"] summary',
  );
  await expect(mobileEnvironmentSummary).toBeVisible();
  await mobileEnvironmentSummary.click();
  await expect(page.getByRole("slider", { name: "Ambient temperature" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Light intensity" })).toBeVisible();
  await openSaveActions(page);
  await expect(page.getByRole("button", { name: "Save locally" })).toBeVisible();

  await page.getByRole("button", { name: "Add Battery" }).first().click();
  await page.getByRole("button", { name: "Starter series loop" }).click();
  await page.getByRole("button", { name: "Battery 1", exact: true }).click();

  await expect(page.getByRole("region", { name: "Connections" })).toBeVisible();
  const selectedInspectorHeading = page.getByRole("heading", { name: "Battery 1" });
  if (!(await selectedInspectorHeading.isVisible())) {
    await inspectorDisclosure.click();
  }
  await expect(selectedInspectorHeading).toBeVisible();
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeEnabled();
});
