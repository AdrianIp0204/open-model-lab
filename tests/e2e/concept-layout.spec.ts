import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

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

  await gotoAndExpectOk(page, conceptPath);
  await expect(page.locator("h1", { hasText: conceptTitle })).toBeVisible();

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
      name: "Start from one live model, then learn by changing it.",
    }),
  ).toBeVisible();

  await page.locator(`a[href$="${conceptPath}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${conceptPath.replace(/\//g, "\\/")}$`));
  await expect(page.locator("h1", { hasText: conceptTitle })).toBeVisible();

  return { context, page, browserGuard };
}

async function assertInitialViewportLayout(
  page: Page,
  viewportCase: ViewportCase,
  testInfo: TestInfo,
) {
  const startHere = page.getByTestId("concept-v2-start-here");
  const lessonPreviewCards = startHere
    .getByTestId("concept-v2-start-lesson-preview-list")
    .locator("li");
  const scene = page.getByTestId("simulation-shell-scene");
  const controls = page.getByTestId("simulation-shell-controls");
  const graphs = page.getByTestId("simulation-shell-graphs");
  const guidedStepSlot = page.getByTestId("concept-v2-step-card-slot");
  const firstPrimaryControl = controls.locator('input[type="range"], input[type="checkbox"]').first();

  await expect(startHere).toBeVisible();
  await expect(scene).toBeVisible();
  await expect(controls).toBeVisible();
  await expect(graphs).toBeVisible();
  await expect(guidedStepSlot).toBeVisible();
  await expect(firstPrimaryControl).toBeVisible();

  const [sceneBox, controlsBox, graphsBox, firstPrimaryControlBox] = await Promise.all([
    scene.boundingBox(),
    controls.boundingBox(),
    graphs.boundingBox(),
    firstPrimaryControl.boundingBox(),
  ]);

  expect(sceneBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(graphsBox).not.toBeNull();
  expect(firstPrimaryControlBox).not.toBeNull();

  const widthMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(widthMetrics.scrollWidth).toBe(widthMetrics.innerWidth);

  if (viewportCase.viewport.width < 640) {
    const [firstPreviewCardBox, secondPreviewCardBox] = await Promise.all([
      lessonPreviewCards.nth(0).boundingBox(),
      lessonPreviewCards.nth(1).boundingBox(),
    ]);

    expect(firstPreviewCardBox).not.toBeNull();
    expect(secondPreviewCardBox).not.toBeNull();
    expect(secondPreviewCardBox!.y).toBeGreaterThan(firstPreviewCardBox!.y + 8);
  }

  if (viewportCase.viewport.width >= 1366) {
    const verticalGap = graphsBox!.y - (sceneBox!.y + sceneBox!.height);
    expect(verticalGap).toBeLessThan(96);
    expect(graphsBox!.y).toBeLessThan(controlsBox!.y + controlsBox!.height);
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

    const startHere = page.getByTestId("concept-v2-start-here");
    const scene = page.getByTestId("simulation-shell-scene");
    const controls = page.getByTestId("simulation-shell-controls");
    const stepCardSlot = page.getByTestId("concept-v2-step-card-slot");
    const graphs = page.getByTestId("simulation-shell-graphs");
    const wrapUp = page.getByTestId("concept-v2-wrap-up");
    const reference = page.getByTestId("concept-v2-reference");
    const firstPrimaryControl = controls.locator('input[type="range"], input[type="checkbox"]').first();

    await Promise.all([
      expect(startHere).toBeVisible(),
      expect(scene).toBeVisible(),
      expect(controls).toBeVisible(),
      expect(stepCardSlot).toBeVisible(),
      expect(graphs).toBeVisible(),
      expect(wrapUp).toBeVisible(),
      expect(reference).toBeVisible(),
      expect(firstPrimaryControl).toBeVisible(),
    ]);

    const [
      startHereBox,
      sceneBox,
      controlsBox,
      stepCardBox,
      firstPrimaryControlBox,
      graphsBox,
      wrapUpBox,
      referenceBox,
    ] = await Promise.all([
      startHere.boundingBox(),
      scene.boundingBox(),
      controls.boundingBox(),
      stepCardSlot.boundingBox(),
      firstPrimaryControl.boundingBox(),
      graphs.boundingBox(),
      wrapUp.boundingBox(),
      reference.boundingBox(),
    ]);

    expect(startHereBox).not.toBeNull();
    expect(sceneBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(stepCardBox).not.toBeNull();
    expect(firstPrimaryControlBox).not.toBeNull();
    expect(graphsBox).not.toBeNull();
    expect(wrapUpBox).not.toBeNull();
    expect(referenceBox).not.toBeNull();

    expect(startHereBox!.y).toBeLessThan(sceneBox!.y);
    expect(sceneBox!.y).toBeLessThan(controlsBox!.y);
    expect(controlsBox!.y).toBeLessThan(graphsBox!.y);
    expect(stepCardBox!.y).toBeLessThan(firstPrimaryControlBox!.y);
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
