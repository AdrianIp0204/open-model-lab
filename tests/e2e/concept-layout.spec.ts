import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

test.setTimeout(90_000);

type ViewportCase = {
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
  userAgent?: string;
};

const conceptPath = "/concepts/simple-harmonic-motion";
const conceptTitle = "Simple Harmonic Motion";
const ucmConceptPath = "/en/concepts/uniform-circular-motion";
const ucmConceptTitle = "Uniform Circular Motion";
const viewportCases: ViewportCase[] = [
  { name: "desktop-1440x900", viewport: { width: 1440, height: 900 } },
  { name: "tablet-landscape-1024x768", viewport: { width: 1024, height: 768 } },
  {
    name: "mobile-390x844",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
];

async function openConceptPage(
  browser: Browser,
  viewportCase: ViewportCase,
  path = conceptPath,
  title = conceptTitle,
): Promise<{
  context: BrowserContext;
  page: Page;
  browserGuard: BrowserGuard;
}> {
  const context = await browser.newContext({
    viewport: viewportCase.viewport,
    isMobile: viewportCase.isMobile,
    hasTouch: viewportCase.hasTouch,
    deviceScaleFactor: viewportCase.deviceScaleFactor,
    userAgent: viewportCase.userAgent,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, path);
  await expect(page.locator("h1", { hasText: title })).toBeVisible();

  return { context, page, browserGuard };
}

async function openConceptPageFromHome(
  browser: Browser,
  viewportCase: ViewportCase,
): Promise<{
  context: BrowserContext;
  page: Page;
  browserGuard: BrowserGuard;
}> {
  const context = await browser.newContext({
    viewport: viewportCase.viewport,
    isMobile: viewportCase.isMobile,
    hasTouch: viewportCase.hasTouch,
    deviceScaleFactor: viewportCase.deviceScaleFactor,
    userAgent: viewportCase.userAgent,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/");
  await expect(
    page.getByRole("heading", {
      name: "Learn science by changing live simulations.",
    }),
  ).toBeVisible();

  const conceptLink = page
    .locator(`a[href$="${conceptPath}"]`)
    .filter({ hasText: /Start SHM|Open SHM|Simple Harmonic Motion/ })
    .first();
  await expect(conceptLink).toBeVisible();
  await Promise.all([
    page.waitForURL(new RegExp(`${conceptPath.replace(/\//g, "\\/")}$`), {
      timeout: 15_000,
    }),
    conceptLink.click(),
  ]);
  await expect(page.locator("h1", { hasText: conceptTitle })).toBeVisible();

  return { context, page, browserGuard };
}

async function assertInitialViewportLayout(
  page: Page,
  viewportCase: ViewportCase,
  testInfo: TestInfo,
) {
  const scene = page.getByTestId("simulation-shell-scene");
  const controls = page.getByTestId("simulation-shell-controls");
  const graphs = page.getByTestId("simulation-shell-graphs");
  const benchEquations = page.getByTestId("bench-equation-strip");
  const benchEquationsSlot = page.getByTestId("simulation-shell-bench-equations");
  const firstAction = page.getByTestId("simulation-shell-first-action");
  const controlsLink = page.getByTestId("simulation-shell-controls-link");
  const guidedStepSlot = page.getByTestId("concept-v2-step-card-slot");
  const firstPrimaryControl = controls.locator('input[type="range"], input[type="checkbox"]').first();

  await expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0);
  await expect(scene).toBeVisible();
  await expect(controls).toBeVisible();
  await expect(graphs).toBeVisible();
  await expect(benchEquations).toBeVisible();
  await expect(benchEquations).toHaveAttribute("data-equation-variant", "hud");
  await expect(benchEquations).toHaveAttribute("data-equation-layout", "compact-inline");
  await expect(benchEquations).not.toContainText(/Key relationship/i);
  await expect(benchEquationsSlot).toBeVisible();
  await expect(firstAction).toBeVisible();
  if (viewportCase.viewport.width < 640) {
    await expect(controlsLink).toBeVisible();
    await expect(controlsLink).toHaveAttribute("href", "#concept-live-controls");
  }
  await expect(guidedStepSlot).toBeVisible();
  await expect(firstPrimaryControl).toBeVisible();

  const [
    sceneBox,
    controlsBox,
    graphsBox,
    benchEquationsBox,
    benchEquationsSlotBox,
    firstActionBox,
    guidedStepBox,
    firstPrimaryControlBox,
  ] = await Promise.all([
    scene.boundingBox(),
    controls.boundingBox(),
    graphs.boundingBox(),
    benchEquations.boundingBox(),
    benchEquationsSlot.boundingBox(),
    firstAction.boundingBox(),
    guidedStepSlot.boundingBox(),
    firstPrimaryControl.boundingBox(),
  ]);

  expect(sceneBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(graphsBox).not.toBeNull();
  expect(benchEquationsBox).not.toBeNull();
  expect(benchEquationsSlotBox).not.toBeNull();
  expect(firstActionBox).not.toBeNull();
  expect(guidedStepBox).not.toBeNull();
  expect(firstPrimaryControlBox).not.toBeNull();

  const widthMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(widthMetrics.scrollWidth).toBe(widthMetrics.innerWidth);
  expect(sceneBox!.y).toBeLessThan(viewportCase.viewport.height);
  if (viewportCase.viewport.width >= 640) {
    expect(controlsBox!.y).toBeLessThan(viewportCase.viewport.height);
    expect(firstActionBox!.y).toBeLessThan(viewportCase.viewport.height);
    expect(firstPrimaryControlBox!.y).toBeLessThan(viewportCase.viewport.height);
  } else {
    expect(sceneBox!.y).toBeLessThan(graphsBox!.y);
    expect(graphsBox!.y).toBeLessThan(controlsBox!.y);
    expect(controlsBox!.y).toBeLessThan(guidedStepBox!.y);
    expect(firstActionBox!.y).toBeLessThan(guidedStepBox!.y);
    expect(firstPrimaryControlBox!.y).toBeLessThan(guidedStepBox!.y);
  }
  expect(guidedStepBox!.y).toBeGreaterThan(controlsBox!.y);

  if (
    firstPrimaryControlBox!.y < viewportCase.viewport.height &&
    firstPrimaryControlBox!.y + firstPrimaryControlBox!.height > 0
  ) {
    const firstPrimaryControlUnblocked = await firstPrimaryControl.evaluate((control) => {
      const rect = control.getBoundingClientRect();
      const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
      const topElement = document.elementFromPoint(x, y);
      const controls = document.querySelector('[data-testid="simulation-shell-controls"]');

      return Boolean(
        topElement &&
          (control === topElement ||
            control.contains(topElement) ||
            topElement.contains(control) ||
            controls?.contains(topElement)),
      );
    });

    expect(firstPrimaryControlUnblocked).toBe(true);
  }

  if (viewportCase.viewport.width >= 1366) {
    expect(benchEquationsBox!.x).toBeGreaterThanOrEqual(sceneBox!.x);
    expect(benchEquationsBox!.y).toBeGreaterThanOrEqual(sceneBox!.y);
    expect(benchEquationsBox!.x + benchEquationsBox!.width).toBeLessThanOrEqual(
      sceneBox!.x + sceneBox!.width + 1,
    );
    expect(benchEquationsBox!.y + benchEquationsBox!.height).toBeLessThanOrEqual(
      sceneBox!.y + sceneBox!.height + 1,
    );
    expect(benchEquationsBox!.width).toBeLessThanOrEqual(290);
    expect(benchEquationsBox!.height).toBeLessThanOrEqual(120);
    if (viewportCase.viewport.width >= 640) {
      expect(graphsBox!.y).toBeLessThan(controlsBox!.y + controlsBox!.height);
    }
  }

  const screenshot = await page.screenshot({
    animations: "disabled",
    fullPage: false,
  });

  await testInfo.attach(`concept-layout-${viewportCase.name}`, {
    body: screenshot,
    contentType: "image/png",
  });
}

test("keeps the guided live lab reachable and the primary bench surfaces visible across representative viewports", async ({
  browser,
}, testInfo) => {
  for (const viewportCase of viewportCases) {
    await test.step(viewportCase.name, async () => {
      const { context, page } = await openConceptPage(browser, viewportCase);

      try {
        await assertInitialViewportLayout(page, viewportCase, testInfo);
      } finally {
        await context.close();
      }
    });
  }
});

test("opens Uniform Circular Motion directly into a lab-first bench on desktop and mobile", async ({
  browser,
}, testInfo) => {
  const ucmViewportCases = [
    viewportCases.find((item) => item.name === "desktop-1440x900"),
    viewportCases.find((item) => item.name === "mobile-390x844"),
  ].filter((item): item is ViewportCase => Boolean(item));

  for (const viewportCase of ucmViewportCases) {
    await test.step(viewportCase.name, async () => {
      const { context, page, browserGuard } = await openConceptPage(
        browser,
        viewportCase,
        ucmConceptPath,
        ucmConceptTitle,
      );

      try {
        await assertInitialViewportLayout(page, viewportCase, testInfo);
        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    });
  }
});

test("keeps additional physics, math, computing, and chemistry concepts lab-first", async ({
  browser,
}, testInfo) => {
  const desktopCase = viewportCases.find((item) => item.name === "desktop-1440x900");
  expect(desktopCase, "Expected the desktop-1440x900 viewport case to exist.").toBeTruthy();

  const routes = [
    {
      path: "/en/concepts/simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    },
    {
      path: "/en/concepts/graph-transformations",
      title: "Graph Transformations",
    },
    {
      path: "/en/concepts/binary-search-halving-the-search-space",
      title: "Binary Search / Halving the Search Space",
    },
    {
      path: "/en/concepts/acid-base-ph-intuition",
      title: "Acid-Base / pH Intuition",
    },
  ];

  for (const route of routes) {
    await test.step(route.path, async () => {
      const { context, page, browserGuard } = await openConceptPage(
        browser,
        desktopCase!,
        route.path,
        route.title,
      );

      try {
        await assertInitialViewportLayout(page, desktopCase!, testInfo);
        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    });
  }
});

test("renders topic-specific clickable visuals on concept discovery", async ({
  page,
}) => {
  const browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
  await gotoAndExpectOk(page, "/en/concepts");

  const ucmCard = page
    .locator('a[href$="/concepts/uniform-circular-motion"]')
    .filter({
      has: page.locator('[data-testid="learning-visual"][data-visual-motif="uniform-circular-motion"]'),
    })
    .first();
  const graphCard = page
    .locator('a[href$="/concepts/graph-transformations"]')
    .filter({
      has: page.locator('[data-testid="learning-visual"][data-visual-motif="graph-transformations"]'),
    })
    .first();

  await expect(ucmCard).toBeVisible();
  await expect(graphCard).toBeVisible();
  await expect(
    ucmCard.locator('[data-testid="learning-visual"]'),
  ).toHaveAttribute("data-visual-fallback", "false");
  await expect(
    ucmCard.locator('[data-testid="learning-visual"]'),
  ).toHaveAttribute("data-visual-fallback-kind", "topic-specific");
  await expect(
    page.locator('[data-testid="learning-visual"][data-visual-fallback-kind="generic"]'),
  ).toHaveCount(0);

  await Promise.all([
    page.waitForURL(/\/en\/concepts\/uniform-circular-motion$/),
    ucmCard.locator('[data-testid="learning-visual"]').click(),
  ]);
  browserGuard.assertNoActionableIssues();
});

test("keeps the tests and practice hub visual-first with clickable visual cards", async ({
  page,
}) => {
  const browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
  await gotoAndExpectOk(page, "/en/tests");

  await expect(page.getByTestId("test-hub-quick-start")).toBeVisible();
  await expect(
    page.locator('[data-testid="test-hub-quick-start-action"], a[href*="/tests/"]').first(),
  ).toBeVisible();
  await expect(page.locator('a:has([data-testid="learning-visual"])').first()).toBeVisible();

  const widthMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(widthMetrics.scrollWidth).toBe(widthMetrics.innerWidth);
  browserGuard.assertNoActionableIssues();
});

test("renders challenge cards with meaningful visuals and readable unit text", async ({
  page,
}) => {
  const browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");
  await gotoAndExpectOk(page, "/en/challenges");

  await page.getByRole("searchbox", { name: /search/i }).fill("short-period force band");

  const card = page.locator("article", {
    has: page.getByRole("heading", { name: /short-period force band/i }),
  }).first();

  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-card-visual-layout", "compact-side");
  await expect(
    card.locator(
      '[data-testid="learning-visual"][data-visual-kind="challenge"][data-visual-motif="uniform-circular-motion"][data-visual-overlay="challenge"]',
    ),
  ).toBeVisible();
  await expect(card).toContainText(/2\.2 s/i);
  await expect(card).not.toContainText(/\\mathrm|\\,|\$/);
  browserGuard.assertNoActionableIssues();
});

test("keeps zh-HK challenge and tests hubs visually covered", async ({ page }) => {
  const browserGuard = await installBrowserGuards(page);
  await setHarnessSession(page, "signed-out");

  await gotoAndExpectOk(page, "/zh-HK/challenges");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-HK");
  await expect(
    page.locator(
      'article[data-card-visual-layout="compact-side"] [data-testid="learning-visual"][data-visual-kind="challenge"]',
    ).first(),
  ).toBeVisible();

  await gotoAndExpectOk(page, "/zh-HK/tests");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-HK");
  await expect(page.getByTestId("test-hub-quick-start")).toBeVisible();
  await expect(
    page.locator('[data-testid="learning-visual"][data-visual-overlay="assessment"]').first(),
  ).toBeVisible();
  browserGuard.assertNoActionableIssues();
});

test("shows a meaningful visual entry and first action on the circuit builder", async ({
  page,
}) => {
  const browserGuard = await installBrowserGuards(page);
  await gotoAndExpectOk(page, "/en/circuit-builder");

  await expect(
    page.locator('[data-testid="learning-visual"][data-visual-motif="circuit"]'),
  ).toBeVisible();
  await expect(page.locator("[data-circuit-builder-ready]")).toBeVisible();
  await expect(page.locator("[data-circuit-builder-row]")).toBeVisible();

  const widthMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(widthMetrics.scrollWidth).toBe(widthMetrics.innerWidth);
  browserGuard.assertNoActionableIssues();
});

test("keeps zh-HK homepage and concept pages mobile-rendered with the shared lab-first shell", async ({
  browser,
}) => {
  const viewportCase = viewportCases.find((item) => item.name === "mobile-390x844");
  expect(viewportCase, "Expected the mobile-390x844 viewport case to exist.").toBeTruthy();

  const context = await browser.newContext({
    viewport: viewportCase!.viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  try {
    await setHarnessSession(page, "signed-out");
    await gotoAndExpectOk(page, "/zh-HK");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-HK");
    await expect(page.locator('[data-onboarding-target="home-start-actions"]')).toBeVisible();

    await gotoAndExpectOk(page, "/zh-HK/concepts/uniform-circular-motion");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-HK");
    await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();
    await expect(page.getByTestId("simulation-shell-controls")).toBeVisible();

    const widthMetrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(widthMetrics.scrollWidth).toBe(widthMetrics.innerWidth);
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps the mobile V2 lesson order sane for a migrated chemistry concept", async ({
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
    await gotoAndExpectOk(page, "/concepts/acid-base-ph-intuition");
    await expect(
      page.locator("h1", { hasText: "Acid-Base / pH Intuition" }),
    ).toBeVisible();

    const scene = page.getByTestId("simulation-shell-scene");
    const controls = page.getByTestId("simulation-shell-controls");
    const stepCardSlot = page.getByTestId("concept-v2-step-card-slot");
    const graphs = page.getByTestId("simulation-shell-graphs");
    const wrapUp = page.getByTestId("concept-v2-wrap-up");
    const reference = page.getByTestId("concept-v2-reference");
    const firstPrimaryControl = controls.locator('input[type="range"], input[type="checkbox"]').first();

    await Promise.all([
      expect(page.getByTestId("concept-v2-start-here")).toHaveCount(0),
      expect(scene).toBeVisible(),
      expect(controls).toBeVisible(),
      expect(stepCardSlot).toBeVisible(),
      expect(graphs).toBeVisible(),
      expect(wrapUp).toBeVisible(),
      expect(reference).toBeVisible(),
      expect(firstPrimaryControl).toBeVisible(),
    ]);

    const [
      sceneBox,
      controlsBox,
      stepCardBox,
      firstPrimaryControlBox,
      graphsBox,
      wrapUpBox,
      referenceBox,
    ] = await Promise.all([
      scene.boundingBox(),
      controls.boundingBox(),
      stepCardSlot.boundingBox(),
      firstPrimaryControl.boundingBox(),
      graphs.boundingBox(),
      wrapUp.boundingBox(),
      reference.boundingBox(),
    ]);

    expect(sceneBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(stepCardBox).not.toBeNull();
    expect(firstPrimaryControlBox).not.toBeNull();
    expect(graphsBox).not.toBeNull();
    expect(wrapUpBox).not.toBeNull();
    expect(referenceBox).not.toBeNull();

    expect(sceneBox!.y).toBeLessThan(controlsBox!.y);
    expect(sceneBox!.y).toBeLessThan(graphsBox!.y);
    expect(graphsBox!.y).toBeLessThan(controlsBox!.y);
    expect(firstPrimaryControlBox!.y).toBeLessThan(stepCardBox!.y);
    expect(graphsBox!.y).toBeLessThan(wrapUpBox!.y);
    expect(wrapUpBox!.y).toBeLessThan(referenceBox!.y);

    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("navigates from home into a concept on mobile and reaches a stable lab shell", async ({
  browser,
}) => {
  const viewportCase = viewportCases.find((item) => item.name === "mobile-390x844");
  expect(viewportCase, "Expected the mobile-390x844 viewport case to exist.").toBeTruthy();

  const { context, page, browserGuard } = await openConceptPageFromHome(
    browser,
    viewportCase!,
  );

  try {
    await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();
    await expect(page.getByTestId("simulation-shell-controls")).toBeVisible();
    await expect(page.getByTestId("concept-v2-step-card-slot")).toBeVisible();
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("shows the iPhone Safari manual-load CTA on home navigation and mounts the bench after tap", async ({
  browser,
}) => {
  const iphoneSafariViewport: ViewportCase = {
    name: "iphone-safari-390x844",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  };

  const { context, page, browserGuard } = await openConceptPageFromHome(
    browser,
    iphoneSafariViewport,
  );

  try {
    await expect(
      page.getByRole("button", { name: /load live lab/i }),
    ).toBeVisible();
    await expect(page.getByTestId("simulation-shell-scene")).toHaveCount(0);
    await expect(page.getByTestId("simulation-shell-controls")).toHaveCount(0);

    await page.getByRole("button", { name: /load live lab/i }).click();

    await expect(page.getByTestId("simulation-shell-scene")).toBeVisible();
    await expect(page.getByTestId("simulation-shell-controls")).toBeVisible();
    await expect(page.getByTestId("concept-v2-step-card-slot")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${conceptPath.replace(/\//g, "\\/")}$`));
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});
