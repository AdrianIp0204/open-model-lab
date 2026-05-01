import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";

async function disableOnboardingPrompt(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "open-model-lab.onboarding.v1",
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: false,
        lastStep: 0,
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}

async function waitForStableChemistryGraph(page: Page) {
  await page.waitForFunction(() => {
    const viewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');
    const minimapWindow = document.querySelector(
      '[data-testid="chem-minimap-visible-window"]',
    );

    if (!(viewport instanceof HTMLElement) || !(minimapWindow instanceof SVGElement)) {
      return false;
    }

    const sample = JSON.stringify({
      scale: viewport.getAttribute("data-chem-scale"),
      width: Math.round(viewport.getBoundingClientRect().width),
      height: Math.round(viewport.getBoundingClientRect().height),
      minimapWidth: minimapWindow.getAttribute("data-chem-window-width"),
      minimapHeight: minimapWindow.getAttribute("data-chem-window-height"),
    });

    const win = window as Window & {
      __chemGraphStableSample?: string;
      __chemGraphStableSince?: number;
    };
    const now = performance.now();

    if (win.__chemGraphStableSample !== sample) {
      win.__chemGraphStableSample = sample;
      win.__chemGraphStableSince = now;
      return false;
    }

    return now - (win.__chemGraphStableSince ?? now) >= 150;
  });
}

test("chemistry reaction mind map keeps the graph viewport clipped inside the split panel on widescreen layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1900, height: 930 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/tools/chemistry-reaction-mind-map");
  await page.getByTestId("chemistry-worksurface").scrollIntoViewIfNeeded();
  await waitForStableChemistryGraph(page);

  const bounds = await page.evaluate(() => {
    const worksurface = document.querySelector('[data-testid="chemistry-worksurface"]');
    const viewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');
    const footer = document.querySelector("footer");

    if (
      !(worksurface instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      !(footer instanceof HTMLElement)
    ) {
      return null;
    }

    const worksurfaceRect = worksurface.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    return {
      worksurfaceBottom: worksurfaceRect.bottom,
      viewportBottom: viewportRect.bottom,
      viewportHeight: viewportRect.height,
      footerTop: footerRect.top,
    };
  });

  if (!bounds) {
    throw new Error("Chemistry worksurface bounds were not available.");
  }

  expect(bounds.viewportHeight).toBeGreaterThanOrEqual(400);
  expect(bounds.viewportBottom).toBeLessThanOrEqual(bounds.worksurfaceBottom + 1);
  expect(bounds.footerTop).toBeGreaterThan(bounds.worksurfaceBottom - 1);

  guard.assertNoActionableIssues();
});

test("chemistry reaction mind map supports focused camera, route exploration, and localized details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 1000 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/tools/chemistry-reaction-mind-map");
  await page.getByTestId("chemistry-worksurface").scrollIntoViewIfNeeded();
  await waitForStableChemistryGraph(page);

  const viewport = page.getByTestId("chemistry-graph-viewport");
  const inspector = page.getByTestId("chemistry-inspector-scroll");
  await expect(viewport).toBeVisible();
  const minimap = page.getByTestId("chem-graph-minimap");
  await expect(minimap).toBeVisible();
  await expect(page.getByTestId("chem-graph-flow-structure")).toBeAttached();
  await expect(page.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
    "data-chem-flow-tone",
    "source",
  );
  await expect(page.getByTestId("chem-graph-flow-spine")).toHaveAttribute(
    "data-chem-flow-spine",
    "reactant-to-product",
  );
  await expect(page.getByTestId("chem-graph-flow-spine-checkpoint-3")).toBeAttached();
  await expect(page.getByTestId("chem-minimap-flow-band-product")).toHaveAttribute(
    "data-chem-flow-tone",
    "sink",
  );
  await expect(page.getByTestId("chem-minimap-flow-spine")).toBeAttached();
  await expect(minimap).toHaveAttribute("data-chem-minimap-camera-mode", "graph");
  const minimapVisibleWindow = page.getByTestId("chem-minimap-visible-window");
  await expect(minimapVisibleWindow).toHaveAttribute("data-chem-minimap-window", "viewport");
  const initialMinimapWindow = {
    width: Number(await minimapVisibleWindow.getAttribute("data-chem-window-width")),
    height: Number(await minimapVisibleWindow.getAttribute("data-chem-window-height")),
  };
  expect(initialMinimapWindow.width).toBeGreaterThan(0);
  expect(initialMinimapWindow.height).toBeGreaterThan(0);
  await expect(page.getByTestId("chem-zoom-in")).toBeVisible();
  await expect(page.getByTestId("chem-zoom-out")).toBeVisible();
  await expect(page.getByTestId("chem-fit-view")).toBeVisible();
  const zoomSlider = page.getByTestId("chem-zoom-slider");
  await expect(zoomSlider).toBeVisible();
  await expect(zoomSlider).toHaveAttribute("min", "42");
  await expect(zoomSlider).toHaveAttribute("max", "225");

  const fitScale = await viewport.getAttribute("data-chem-scale");
  await expect(zoomSlider).toHaveValue(String(Math.round(Number(fitScale) * 100)));
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "full-graph");
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "compact",
  );
  await expect(
    page.getByTestId("chem-edge-endpoints-alkene-to-alcohol-hydration"),
  ).toHaveClass(/hidden/);

  await page.getByTestId("chem-edge-alkene-to-alcohol-hydration").focus();
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "detailed",
  );
  await expect(page.getByTestId("chem-edge-endpoints-alkene-to-alcohol-hydration")).toHaveClass(
    /block/,
  );
  await page.getByTestId("chem-fit-view").focus();

  await page.getByTestId("chem-zoom-in").click();
  await expect(viewport).not.toHaveAttribute("data-chem-scale", fitScale ?? "");
  const zoomedScale = await viewport.getAttribute("data-chem-scale");
  await expect(zoomSlider).toHaveValue(String(Math.round(Number(zoomedScale) * 100)));
  await zoomSlider.fill("120");
  await expect(viewport).toHaveAttribute("data-chem-scale", "1.200");
  await expect(page.getByTestId("chem-zoom-status")).toContainText("120%");
  const zoomedMinimapWindow = {
    width: Number(await minimapVisibleWindow.getAttribute("data-chem-window-width")),
    height: Number(await minimapVisibleWindow.getAttribute("data-chem-window-height")),
  };
  expect(
    zoomedMinimapWindow.width < initialMinimapWindow.width ||
      zoomedMinimapWindow.height < initialMinimapWindow.height,
  ).toBe(true);
  await expect(page.getByTestId("chem-pan-affordance")).toHaveAttribute(
    "data-chem-pan-edges",
    /left.*right.*top.*bottom/,
  );
  await expect(page.getByTestId("chem-pan-affordance-right")).toHaveClass(
    /opacity-100/,
  );
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "detailed",
  );

  const initialOffsetX = await viewport.getAttribute("data-chem-offset-x");
  await viewport.focus();
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(() => viewport.getAttribute("data-chem-offset-x"))
    .not.toBe(initialOffsetX);

  await page.getByTestId("chem-fit-view").click();
  await expect(viewport).toHaveAttribute("data-chem-scale", fitScale ?? "");
  await expect(minimapVisibleWindow).toHaveAttribute(
    "data-chem-window-width",
    String(initialMinimapWindow.width),
  );
  await expect(minimapVisibleWindow).toHaveAttribute(
    "data-chem-window-height",
    String(initialMinimapWindow.height),
  );

  await page.getByTestId("chem-node-alcohol").focus();
  await expect(viewport).toHaveAttribute("data-chem-trace-active", "true");
  await expect(page.getByTestId("chem-trace-preview")).toBeVisible();
  await expect(page.getByTestId("chem-trace-preview")).toContainText(/Alcohol/);
  await expect(page.getByTestId("chem-trace-preview")).toContainText(/7 connected pathways/);
  await expect(page.getByTestId("chem-node-pathway-count-alcohol")).toHaveAttribute(
    "data-chem-pathway-count-label",
    "4 incoming · 3 outgoing",
  );
  await expect(page.getByTestId("chem-node-alcohol")).toHaveAttribute(
    "data-chem-pathway-bias",
    "incoming-heavy",
  );
  await expect(page.getByTestId("chem-node-pathway-bias-alcohol")).toHaveAttribute(
    "data-chem-pathway-bias",
    "incoming-heavy",
  );
  await expect(page.getByTestId("chem-node-pathway-balance-alcohol")).toHaveAttribute(
    "data-chem-incoming-share",
    "57",
  );
  await expect(page.getByTestId("chem-node-pathway-balance-alcohol")).toHaveAttribute(
    "data-chem-outgoing-share",
    "43",
  );
  await expect(page.getByTestId("chem-node-pathway-incoming-alcohol")).toHaveText(/4 in/);
  await expect(page.getByTestId("chem-node-pathway-outgoing-alcohol")).toHaveText(/3 out/);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("chem-node-details")).toBeVisible();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "node");
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "active-context");
  const nodeScale = await viewport.getAttribute("data-chem-scale");
  expect(Number(nodeScale)).toBeGreaterThan(Number(fitScale));

  const windowScrollBefore = await page.evaluate(() => window.scrollY);
  const inspectorBox = await inspector.boundingBox();
  if (!inspectorBox) {
    throw new Error("Chemistry inspector did not return a bounding box.");
  }

  await page.mouse.move(
    inspectorBox.x + inspectorBox.width / 2,
    inspectorBox.y + Math.min(220, inspectorBox.height - 40),
  );
  await inspector.evaluate((element) => {
    element.scrollTop = 240;
  });

  const inspectorState = await inspector.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(inspectorState.overflowY).toBe("auto");
  expect(inspectorState.scrollHeight).toBeGreaterThan(inspectorState.clientHeight);
  expect(inspectorState.scrollTop).toBeGreaterThan(0);

  const windowScrollAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(windowScrollAfter - windowScrollBefore)).toBeLessThanOrEqual(4);

  const graphRect = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  expect(graphRect.bottom).toBeGreaterThan(0);

  await page.getByText("Clear selection").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "full-graph");
  await expect(viewport).toHaveAttribute("data-chem-scale", fitScale ?? "");

  await page.getByTestId("chem-route-start").selectOption("alkene");
  await page.getByTestId("chem-route-target").selectOption("carboxylic-acid");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chemistry-route-panel")).toBeVisible();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "route");
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "active-context");
  const routeProgress = page.getByTestId("chem-route-progress");
  await expect(routeProgress).toBeVisible();
  await expect(routeProgress).toHaveAttribute("data-chem-route-step-count", "3");
  await expect(routeProgress).toContainText(/alkene.*carboxylic acid.*3 steps/i);
  await expect(minimap).toHaveAttribute("data-chem-minimap-camera-mode", "route");
  await expect(page.getByTestId("chem-minimap-active-scope")).toHaveAttribute(
    "data-chem-camera-frame-tone",
    "route",
  );
  await expect(page.getByTestId("chem-route-progress-step-1")).toHaveText("1");
  await expect(page.getByTestId("chem-route-progress-step-3")).toHaveText("3");
  const routeScale = await viewport.getAttribute("data-chem-scale");
  expect(Number(routeScale)).toBeGreaterThan(Number(fitScale));
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /route: alkene to carboxylic acid \(3 steps\)/i,
  );
  await expect(page.getByTestId("chem-node-alkene")).toHaveAttribute(
    "data-chem-route-context",
    "endpoint",
  );
  await expect(page.getByTestId("chem-node-alkene")).toHaveAttribute(
    "data-chem-route-step",
    "1",
  );
  await expect(page.getByTestId("chem-node-route-step-alkene")).toHaveText("1");
  await expect(page.getByTestId("chem-node-route-stage-alkene")).toHaveText(/start/i);
  await expect(page.getByTestId("chem-node-route-stage-alkene")).toHaveAttribute(
    "data-chem-route-stage-label",
    "Start",
  );
  await expect(page.getByTestId("chem-node-alcohol")).toHaveAttribute(
    "data-chem-route-context",
    "route",
  );
  await expect(page.getByTestId("chem-node-route-step-alcohol")).toHaveText("2");
  await expect(page.getByTestId("chem-node-route-stage-alcohol")).toHaveText(/step 2/i);
  await expect(page.getByTestId("chem-node-carboxylic-acid")).toHaveAttribute(
    "data-chem-route-step",
    "4",
  );
  await expect(page.getByTestId("chem-node-route-step-carboxylic-acid")).toHaveText("4");
  await expect(page.getByTestId("chem-node-route-stage-carboxylic-acid")).toHaveText(/target/i);
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-route-context",
    "route",
  );
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-route-step",
    "1",
  );
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "detailed",
  );
  await expect(
    page.getByTestId("chem-edge-route-step-alkene-to-alcohol-hydration"),
  ).toHaveText("1");
  await expect(page.getByTestId("chem-edge-path-alkene-to-alcohol-hydration")).toHaveAttribute(
    "pointer-events",
    "none",
  );
  await expect(page.getByTestId("chem-edge-hitbox-alkene-to-alcohol-hydration")).toHaveAttribute(
    "pointer-events",
    "stroke",
  );
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /representative-example step/i,
  );

  await page.locator('[data-testid^="chem-route-step-"] button').nth(1).click();
  await expect(page.getByTestId("chem-edge-details")).toBeVisible();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "edge");
  await expect(page.getByTestId("chem-edge-details")).toContainText(/primary alcohols only/i);
  await expect(page.getByText(/^Ionic equation$/i)).toHaveCount(0);
  await page.getByTestId("chem-route-view-results").click();

  await page.getByTestId("chem-route-start").selectOption("alcohol");
  await page.getByTestId("chem-route-target").selectOption("ester");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /needs extra co-reactant/i,
  );
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /also needs: alcohol family/i,
  );
  await page.locator('[data-testid^="chem-route-step-"] button').last().click();
  await expect(page.getByTestId("chem-edge-details")).toContainText(
    /concentrated sulfuric acid/i,
  );
  await expect(
    page
      .getByTestId("chem-edge-details")
      .locator('[data-chem-notation-source="H2SO4(l)"]'),
  ).toHaveCount(1);
  await expect(
    page
      .getByTestId("chem-edge-details")
      .locator(
        '[data-chem-notation-source="CH3COOH(l) + CH3CH2OH(l) <=> CH3COOCH2CH3(l) + H2O(l)"]',
      ),
  ).toHaveCount(1);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-node-alcohol").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation").click();
  await expect(page.getByTestId("chemistry-compare-panel")).toBeVisible();
  await page.getByTestId("chem-compare-show-routes").click();
  await expect(page.getByTestId("chemistry-route-panel")).toBeVisible();
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /route: alcohol to aldehyde \(1 step\)/i,
  );

  await gotoAndExpectOk(page, "/zh-HK/tools/chemistry-reaction-mind-map");
  await page.getByTestId("chemistry-worksurface").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("chem-graph-legend")).toContainText(/圖例/);
  await expect(page.getByTestId("chem-camera-status")).toContainText(/視圖：完整反應圖譜/);
  await expect(page.getByTestId("chem-scope-status")).toContainText(/目前視圖有/);
  await expect(page.getByTestId("chem-preview-status")).toContainText(/預覽：/);
  await page.getByTestId("chem-node-alcohol").focus();
  await expect(page.getByTestId("chem-node-pathway-count-alcohol")).toHaveAttribute(
    "data-chem-pathway-count-label",
    "4 入 · 3 出",
  );
  await expect(page.getByTestId("chem-node-pathway-incoming-alcohol")).toHaveText(/4 入/);
  await expect(page.getByTestId("chem-node-pathway-outgoing-alcohol")).toHaveText(/3 出/);
  await page.getByTestId("chem-route-start").selectOption("alcohol");
  await page.getByTestId("chem-route-target").selectOption("ester");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toContainText(/路線路徑/);
  await expect(page.getByTestId("chem-minimap-camera-mode-label")).toHaveText(/路線/);
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(/路線 1/);
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /路線：由 醇 到 酯/,
  );
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /需要額外共反應物/,
  );
  await page.locator('[data-testid^="chem-route-step-"] button').last().click();
  await expect(page.getByTestId("chem-edge-details")).toContainText(/醇家族/);
  await expect(page.getByTestId("chem-edge-details")).toContainText(/代表性例子/);
  await expect(page.getByTestId("chem-edge-details")).toContainText(/濃硫酸/);
  await expect(
    page
      .getByTestId("chem-edge-details")
      .locator('[data-chem-notation-source="H2SO4(l)"]'),
  ).toHaveCount(1);

  guard.assertNoActionableIssues();
});
