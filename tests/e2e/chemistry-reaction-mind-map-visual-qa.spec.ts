import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

const routes = [
  { name: "en", path: "/tools/chemistry-reaction-mind-map" },
  { name: "zh-HK", path: "/zh-HK/tools/chemistry-reaction-mind-map" },
] as const;

const viewports = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "desktop", width: 1366, height: 768, touch: false },
  { name: "wide", width: 1900, height: 930, touch: false },
] as const;

const chemistryCriticalTouchTargetSelector = [
  '[data-testid="chem-zoom-slider-control"]',
  '[data-testid="chem-zoom-slider"]',
  '[data-testid="chem-zoom-out"]',
  '[data-testid="chem-zoom-in"]',
  '[data-testid="chem-fit-view"]',
  '[data-testid="chem-route-start"]',
  '[data-testid="chem-route-target"]',
  '[data-testid="chem-route-search"]',
  '[data-testid="chem-route-clear"]',
  '[data-testid="chem-route-view-results"]',
  '[data-testid="chem-route-back-to-map"]',
  '[data-testid="chem-route-panel-clear"]',
  '[data-testid="chem-compare-exit"]',
  '[data-testid="chem-compare-swap"]',
  '[data-testid="chem-compare-show-routes"]',
  '[data-testid="feedback-widget-trigger"]',
  'button[data-testid^="chem-route-select-"]',
  'button[data-testid^="chem-route-node-"]',
  'article[data-testid^="chem-route-step-"] > button',
  'details[data-testid^="chem-route-step-notes-"] > summary',
  'button[data-chem-hit-target="pathway-label"]',
].join(",");

async function disableOnboardingPrompt(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "open-model-lab.onboarding.v1",
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: true,
        lastStep: 0,
        updatedAt: "2026-06-02T00:00:00.000Z",
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
      x: viewport.getAttribute("data-chem-offset-x"),
      y: viewport.getAttribute("data-chem-offset-y"),
      camera: viewport.getAttribute("data-chem-camera-mode"),
      width: Math.round(viewport.getBoundingClientRect().width),
      height: Math.round(viewport.getBoundingClientRect().height),
      minimapWidth: minimapWindow.getAttribute("data-chem-window-width"),
      minimapHeight: minimapWindow.getAttribute("data-chem-window-height"),
    });
    const win = window as Window & {
      __chemVisualQaStableSample?: string;
      __chemVisualQaStableSince?: number;
    };
    const now = performance.now();

    if (win.__chemVisualQaStableSample !== sample) {
      win.__chemVisualQaStableSample = sample;
      win.__chemVisualQaStableSince = now;
      return false;
    }

    return now - (win.__chemVisualQaStableSince ?? now) >= 250;
  });
}

async function openChemistryTool(page: Page, path: string) {
  await gotoAndExpectOk(page, path);
  await expect(page.getByTestId("chemistry-worksurface")).toBeVisible();
  await expect(page.getByTestId("chemistry-graph-viewport")).toBeVisible();
  await waitForStableChemistryGraph(page);
}

async function openHydrationEdgeDetails(page: Page) {
  await page.getByTestId("chem-edge-alkene-to-alcohol-hydration").evaluate((element) => {
    if (!(element instanceof HTMLButtonElement)) {
      throw new Error("Hydration edge trigger is not a button.");
    }

    element.click();
  });
  await expect(page.getByTestId("chem-edge-details")).toBeVisible();
}

async function openRouteResults(page: Page, start: string, target: string) {
  await page.getByTestId("chemistry-route-controls").scrollIntoViewIfNeeded();
  await page.getByTestId("chem-route-start").selectOption(start);
  await page.getByTestId("chem-route-target").selectOption(target);
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chemistry-route-panel")).toBeVisible();
  await waitForStableChemistryGraph(page);
}

async function expectNoDocumentHorizontalOverflow(page: Page, context: string) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentOverflow = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ) - viewportWidth;

    function isInsideIntentionalHorizontalScroller(element: HTMLElement) {
      if (element.closest('[data-testid="chemistry-graph-viewport"]')) {
        return true;
      }

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
          Number(style.opacity) === 0 ||
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
            testId: element.getAttribute("data-testid"),
            tag: element.tagName.toLowerCase(),
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.replace(/\s+/g, " ").trim().slice(0, 90) ||
              "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          },
        ];
      })
      .slice(0, 10);

    return {
      documentOverflow: Math.max(0, Math.round(documentOverflow * 10) / 10),
      visibleOffenders,
    };
  });

  expect(overflow, context).toEqual({
    documentOverflow: 0,
    visibleOffenders: [],
  });
}

async function expectCriticalTextNotClipped(page: Page, context: string) {
  const clipped = await page.evaluate(() => {
    const selectors = [
      "[data-chem-learning-copy]",
      '[data-testid="chemistry-selection-summary"]',
      '[data-testid="chemistry-route-controls"] label',
      '[data-testid="chemistry-route-controls"] button',
      '[data-testid="chemistry-default-state"] h2',
      '[data-testid="chemistry-default-state"] p',
      '[data-testid="chem-node-details"] h2',
      '[data-testid="chem-node-details"] button',
      '[data-testid="chem-edge-details"] h2',
      '[data-testid="chem-edge-details"] button',
      '[data-testid="chemistry-compare-panel"] h2',
      '[data-testid="chemistry-compare-panel"] h3',
      '[data-testid="chemistry-compare-panel"] button',
      '[data-testid="chemistry-route-panel"] h2',
      '[data-testid="chemistry-route-panel"] button',
      '[data-testid="chem-route-no-results"] p',
      '[data-testid^="chem-route-step-"] p',
    ];

    return Array.from(document.querySelectorAll<HTMLElement>(selectors.join(",")))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          rect.bottom < 0 ||
          rect.top > window.innerHeight
        ) {
          return [];
        }

        const lineClamp =
          style.getPropertyValue("-webkit-line-clamp") ||
          style.getPropertyValue("line-clamp");
        const clippedX =
          style.overflowX !== "visible" && element.scrollWidth > element.clientWidth + 2;
        const clippedY =
          style.overflowY !== "visible" && element.scrollHeight > element.clientHeight + 2;
        const ellipsized = style.textOverflow === "ellipsis";
        const clamped =
          lineClamp !== "" &&
          lineClamp !== "none" &&
          lineClamp !== "unset" &&
          lineClamp !== "initial" &&
          lineClamp !== "auto";

        if (!clippedX && !clippedY && !ellipsized && !clamped) {
          return [];
        }

        return [
          {
            testId: element.getAttribute("data-testid"),
            text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "",
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            textOverflow: style.textOverflow,
            lineClamp,
          },
        ];
      })
      .slice(0, 12);
  });

  expect(clipped, context).toEqual([]);
}

async function expectPhoneMapInFirstViewport(page: Page, context: string) {
  const firstViewport = await page.evaluate(() => {
    const graphViewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');
    const routeControls = document.querySelector('[data-testid="chemistry-route-controls"]');
    const visibleNodeCount = Array.from(
      document.querySelectorAll('[data-testid^="chem-node-"]'),
    ).filter((element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return (
        rect.right > 0 &&
        rect.left < window.innerWidth &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight
      );
    }).length;

    if (!(graphViewport instanceof HTMLElement) || !(routeControls instanceof HTMLElement)) {
      return null;
    }

    const graphRect = graphViewport.getBoundingClientRect();
    const routeRect = routeControls.getBoundingClientRect();

    return {
      graphTop: Math.round(graphRect.top),
      graphBottom: Math.round(graphRect.bottom),
      graphHeight: Math.round(graphRect.height),
      routeControlsTop: Math.round(routeRect.top),
      viewportHeight: window.innerHeight,
      visibleNodeCount,
    };
  });

  expect(firstViewport, `${context} first viewport metrics`).not.toBeNull();
  expect(firstViewport?.graphTop, `${context} graph starts before fold`).toBeLessThan(
    firstViewport?.viewportHeight ?? 0,
  );
  expect(firstViewport?.graphBottom, `${context} graph has meaningful first-screen area`).toBeGreaterThan(
    360,
  );
  expect(firstViewport?.graphHeight, `${context} graph height`).toBeGreaterThanOrEqual(320);
  expect(firstViewport?.routeControlsTop, `${context} route controls follow map`).toBeGreaterThan(
    firstViewport?.graphTop ?? 0,
  );
  expect(firstViewport?.visibleNodeCount, `${context} visible graph content`).toBeGreaterThan(0);
}

async function expectTouchTargets(page: Page, context: string) {
  const failures = await page.locator(chemistryCriticalTouchTargetSelector).evaluateAll(
    (elements, minimum) => {
      const isVisible = (element: Element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth
        );
      };

      return elements.flatMap((element) => {
        if (!isVisible(element)) {
          return [];
        }

        const rect = element.getBoundingClientRect();
        const visualLabel = element.querySelector('[data-chem-label-role="pathway-secondary"]');
        const hasLargerHitArea =
          visualLabel instanceof HTMLElement &&
          isVisible(visualLabel) &&
          rect.width >= Number(minimum) - 0.5 &&
          rect.height >= Number(minimum) - 0.5;

        if (
          rect.width >= Number(minimum) - 0.5 &&
          rect.height >= Number(minimum) - 0.5
        ) {
          return [];
        }

        if (hasLargerHitArea) {
          return [];
        }

        return [
          {
            testId: element.getAttribute("data-testid"),
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.replace(/\s+/g, " ").trim() ||
              element.tagName.toLowerCase(),
            width: Number(rect.width.toFixed(1)),
            height: Number(rect.height.toFixed(1)),
          },
        ];
      });
    },
    44,
  );

  expect(
    failures,
    `${context} critical touch targets below 44px:\n${JSON.stringify(failures, null, 2)}`,
  ).toEqual([]);
}

async function expectComparePanelFits(page: Page, context: string) {
  const issues = await page.getByTestId("chemistry-compare-panel").evaluate((panel) => {
    const panelElement = panel as HTMLElement;
    const panelRect = panelElement.getBoundingClientRect();
    const panelIssues =
      panelElement.scrollWidth > panelElement.clientWidth + 1
        ? [
            `panel:${panelElement.scrollWidth}/${panelElement.clientWidth}`,
          ]
        : [];
    const childIssues = Array.from(
      panelElement.querySelectorAll<HTMLElement>(
        '[data-testid^="chem-compare-column-"], [data-testid="chem-compare-family-grid"], button, h2, h3',
      ),
    ).flatMap((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return [];
      }

      return [
        rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1
          ? `${element.getAttribute("data-testid") ?? element.textContent?.trim()}:outside-panel`
          : null,
        element.scrollWidth > element.clientWidth + 1
          ? `${element.getAttribute("data-testid") ?? element.textContent?.trim()}:overflow-x`
          : null,
      ].filter((issue): issue is string => Boolean(issue));
    });

    return [...panelIssues, ...childIssues].slice(0, 12);
  });

  expect(issues, context).toEqual([]);
}

async function expectFeedbackPlacement(page: Page, activeTargetTestId: string, context: string) {
  await expect(page.locator('[data-feedback-placement="inline"]')).toHaveCount(1);
  await expect(page.locator('[data-feedback-placement="floating"]')).toHaveCount(0);
  await expect(page.getByTestId("feedback-widget-trigger")).toHaveCount(1);

  const layout = await page.evaluate((targetTestId) => {
    const widget = document.querySelector("[data-feedback-placement]");
    const trigger = document.querySelector('[data-testid="feedback-widget-trigger"]');
    const inspector = document.querySelector('[data-testid="chemistry-inspector-scroll"]');
    const activeTarget = document.querySelector(`[data-testid="${targetTestId}"]`);

    function box(element: Element | null) {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
      };
    }

    function overlaps(
      first: NonNullable<ReturnType<typeof box>>,
      second: NonNullable<ReturnType<typeof box>>,
    ) {
      return !(
        first.right <= second.left ||
        second.right <= first.left ||
        first.bottom <= second.top ||
        second.bottom <= first.top
      );
    }

    const triggerBox = box(trigger);
    const inspectorBox = box(inspector);
    const activeTargetBox = box(activeTarget);
    const activeTargetPointBlockers =
      activeTarget instanceof HTMLElement && activeTargetBox
        ? [
            {
              name: "lower-left",
              x: activeTargetBox.left + 22,
              y: activeTargetBox.bottom - 36,
            },
            {
              name: "lower-right",
              x: activeTargetBox.right - 22,
              y: activeTargetBox.bottom - 36,
            },
            {
              name: "center",
              x: (activeTargetBox.left + activeTargetBox.right) / 2,
              y: (activeTargetBox.top + activeTargetBox.bottom) / 2,
            },
          ].flatMap((point) => {
            const x = Math.min(Math.max(point.x, 1), window.innerWidth - 1);
            const y = Math.min(Math.max(point.y, 1), window.innerHeight - 1);
            const blocker = document
              .elementsFromPoint(x, y)
              .find(
                (element) =>
                  element instanceof HTMLElement &&
                  element.tagName !== "HTML" &&
                  element.tagName !== "BODY" &&
                  element !== activeTarget &&
                  !activeTarget.contains(element) &&
                  !element.contains(activeTarget),
              );

            if (!blocker) {
              return [];
            }

            return [
              {
                point: point.name,
                tagName: blocker.tagName.toLowerCase(),
                testId: blocker.getAttribute("data-testid"),
                ariaLabel: blocker.getAttribute("aria-label"),
                id: blocker.id,
              },
            ];
          })
        : [];

    return {
      placement:
        widget instanceof HTMLElement ? widget.getAttribute("data-feedback-placement") : null,
      widgetPosition: widget instanceof HTMLElement ? getComputedStyle(widget).position : null,
      trigger: triggerBox,
      inspector: inspectorBox,
      activeTarget: activeTargetBox,
      overlapsInspector: triggerBox && inspectorBox ? overlaps(triggerBox, inspectorBox) : null,
      activeTargetPointBlockers,
    };
  }, activeTargetTestId);

  expect(layout.placement, `${context} feedback placement`).toBe("inline");
  expect(layout.widgetPosition, `${context} feedback position`).not.toBe("fixed");
  expect(layout.trigger, `${context} feedback trigger`).not.toBeNull();
  expect(layout.inspector, `${context} inspector`).not.toBeNull();
  expect(layout.activeTarget, `${context} active target`).not.toBeNull();
  expect(layout.overlapsInspector, `${context} feedback overlaps inspector`).toBe(false);
  expect(layout.activeTargetPointBlockers, `${context} active target point blockers`).toEqual([]);
}

async function expectZhHkCriticalCopy(page: Page, context: string) {
  const surfaceText = await page.getByTestId("chemistry-worksurface").innerText();
  const forbidden = [
    /Fit view/i,
    /View results/i,
    /Clear route/i,
    /Show routes/i,
    /Back to map/i,
    /Exit compare/i,
    /Swap sides/i,
    /Start family/i,
    /Target family/i,
  ].filter((pattern) => pattern.test(surfaceText));

  expect(
    forbidden.map((pattern) => pattern.source),
    `${context} stale English critical controls`,
  ).toEqual([]);
  await expect(page.getByTestId("chem-fit-view"), `${context} fit copy`).toHaveText("重置視角");
  await expect(page.getByTestId("chem-route-search"), `${context} search copy`).toHaveText(
    "搜尋路線",
  );
}

async function auditVisibleState(
  page: Page,
  context: string,
  options: {
    activeTargetTestId?: string;
    compare?: boolean;
    locale: "en" | "zh-HK";
    touch: boolean;
  },
) {
  await expectNoDocumentHorizontalOverflow(page, context);
  await expectCriticalTextNotClipped(page, context);

  if (options.touch) {
    await expectTouchTargets(page, context);
  }

  if (options.compare) {
    await expectComparePanelFits(page, context);
  }

  if (options.activeTargetTestId) {
    await page.getByTestId(options.activeTargetTestId).scrollIntoViewIfNeeded();
    await expectFeedbackPlacement(page, options.activeTargetTestId, context);
  }

  if (options.locale === "zh-HK") {
    await expectZhHkCriticalCopy(page, context);
  }
}

let browserGuard: BrowserGuard;

test.use({
  hasTouch: true,
});

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await disableOnboardingPrompt(page);
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("OML-QA-083 sweeps Chemistry Reaction Mind Map visual QA states across locales and breakpoints", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);

  for (const route of routes) {
    for (const viewport of viewports) {
      const baseContext = `${route.name} ${viewport.name}`;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openChemistryTool(page, route.path);

      if (viewport.name === "phone") {
        await expectPhoneMapInFirstViewport(page, `${baseContext} initial`);
      }
      await auditVisibleState(page, `${baseContext} initial`, {
        locale: route.name,
        touch: viewport.touch,
      });
      await page.screenshot({
        path: testInfo.outputPath(`oml-qa-083-${route.name}-${viewport.name}-initial.png`),
        animations: "disabled",
        fullPage: false,
      });

      await page.getByTestId("chem-node-alcohol").evaluate((element) => {
        if (!(element instanceof HTMLButtonElement)) {
          throw new Error("Alcohol node trigger is not a button.");
        }

        element.click();
      });
      await expect(page.getByTestId("chem-node-details")).toBeVisible();
      await auditVisibleState(page, `${baseContext} selected node`, {
        activeTargetTestId: "chem-node-details",
        locale: route.name,
        touch: viewport.touch,
      });

      await openHydrationEdgeDetails(page);
      await auditVisibleState(page, `${baseContext} selected edge`, {
        activeTargetTestId: "chem-edge-details",
        locale: route.name,
        touch: viewport.touch,
      });

      await page.getByTestId("chem-edge-compare-groups").click();
      await expect(page.getByTestId("chemistry-compare-panel")).toBeVisible();
      await auditVisibleState(page, `${baseContext} compare`, {
        activeTargetTestId: "chemistry-compare-panel",
        compare: true,
        locale: route.name,
        touch: viewport.touch,
      });
      await page.screenshot({
        path: testInfo.outputPath(`oml-qa-083-${route.name}-${viewport.name}-compare.png`),
        animations: "disabled",
        fullPage: false,
      });

      await openRouteResults(page, "alkene", "carboxylic-acid");
      await auditVisibleState(page, `${baseContext} route results`, {
        activeTargetTestId: "chemistry-route-panel",
        locale: route.name,
        touch: viewport.touch,
      });
      await page.screenshot({
        path: testInfo.outputPath(`oml-qa-083-${route.name}-${viewport.name}-route-results.png`),
        animations: "disabled",
        fullPage: false,
      });

      await openRouteResults(page, "amide", "alkane");
      await expect(page.getByTestId("chem-route-no-results")).toBeVisible();
      await auditVisibleState(page, `${baseContext} no route`, {
        activeTargetTestId: "chem-route-no-results",
        locale: route.name,
        touch: viewport.touch,
      });

      await page.getByTestId("chem-route-clear").click();
      await expect(page.getByTestId("chemistry-default-state")).toBeVisible();
      await page.locator("#chemistry-route-map").scrollIntoViewIfNeeded();
      await page.getByTestId("chem-zoom-in").click();
      await page.getByTestId("chem-edge-alkene-to-alcohol-hydration").focus();
      await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toBeFocused();
      await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
        "data-chem-label-density",
        "detailed",
      );
      await auditVisibleState(page, `${baseContext} zoom and keyboard focus`, {
        locale: route.name,
        touch: viewport.touch,
      });
    }
  }
});
