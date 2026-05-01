import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

type ViewportCase = {
  viewport: {
    width: number;
    height: number;
  };
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
};

const desktopViewport: ViewportCase = {
  viewport: { width: 1440, height: 900 },
};

const tabletViewport: ViewportCase = {
  viewport: { width: 1024, height: 768 },
};

const mobileViewport: ViewportCase = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

const phaseIds = ["explore", "understand", "check"] as const;

async function openConceptPage(
  browser: Browser,
  pathname: string,
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
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, pathname);
  await expect(page.getByTestId("concept-learning-phase-entry-rail")).toBeVisible();
  await expect(page.getByTestId("concept-live-lab")).toBeVisible();
  await expect(page.getByTestId("concept-learning-phases")).toBeVisible();

  return { context, page, browserGuard };
}

async function expectViewportStable(page: Page) {
  const widthMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(widthMetrics.scrollWidth).toBeLessThanOrEqual(widthMetrics.innerWidth);
}

async function expectPhaseShellLayoutStable(page: Page) {
  const metrics = await page.evaluate(() => {
    const entryRail =
      document.querySelector<HTMLElement>('[data-testid="concept-learning-phase-entry-rail"]');
    const shell = document.querySelector<HTMLElement>('[data-testid="concept-learning-phases"]');
    const tablist = entryRail?.querySelector<HTMLElement>('[role="tablist"]') ?? null;
    const summary =
      shell?.querySelector<HTMLElement>('[data-testid="concept-learning-phase-summary"]') ??
      null;
    const tabs = entryRail
      ? Array.from(entryRail.querySelectorAll<HTMLElement>('[role="tab"]'))
      : [];
    const selectedTabs = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
    const panels = shell
      ? Array.from(shell.querySelectorAll<HTMLElement>('[role="tabpanel"]'))
      : [];
    const visiblePanels = panels.filter((panel) => !panel.hasAttribute("hidden"));
    const activePanel = visiblePanels[0] ?? null;

    return {
      entryRailClientWidth: entryRail?.clientWidth ?? 0,
      entryRailScrollWidth: entryRail?.scrollWidth ?? 0,
      shellClientWidth: shell?.clientWidth ?? 0,
      shellScrollWidth: shell?.scrollWidth ?? 0,
      tablistClientWidth: tablist?.clientWidth ?? 0,
      tablistScrollWidth: tablist?.scrollWidth ?? 0,
      summaryClientWidth: summary?.clientWidth ?? 0,
      summaryScrollWidth: summary?.scrollWidth ?? 0,
      activePanelClientWidth: activePanel?.clientWidth ?? 0,
      activePanelScrollWidth: activePanel?.scrollWidth ?? 0,
      selectedTabCount: selectedTabs.length,
      visiblePanelCount: visiblePanels.length,
    };
  });

  expect(metrics.selectedTabCount).toBe(1);
  expect(metrics.visiblePanelCount).toBe(1);
  expect(metrics.entryRailScrollWidth).toBeLessThanOrEqual(metrics.entryRailClientWidth + 1);
  expect(metrics.shellScrollWidth).toBeLessThanOrEqual(metrics.shellClientWidth + 1);
  expect(metrics.tablistScrollWidth).toBeLessThanOrEqual(metrics.tablistClientWidth + 1);
  expect(metrics.summaryScrollWidth).toBeLessThanOrEqual(metrics.summaryClientWidth + 1);
  expect(metrics.activePanelScrollWidth).toBeLessThanOrEqual(metrics.activePanelClientWidth + 1);
}

async function attachPhaseShellScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const screenshot = await page
    .locator('[data-testid="concept-learning-phases"]')
    .screenshot({
      animations: "disabled",
    });

  await testInfo.attach(name, {
    body: screenshot,
    contentType: "image/png",
  });
}

async function expectActivePhase(page: Page, phaseId: (typeof phaseIds)[number]) {
  for (const currentPhaseId of phaseIds) {
    const tab = page.locator(`#concept-learning-phase-tab-${currentPhaseId}`);
    const panel = page.locator(`#concept-learning-phase-panel-${currentPhaseId}`);
    const isActive = currentPhaseId === phaseId;

    await expect(tab).toHaveAttribute("aria-selected", isActive ? "true" : "false");

    if (isActive) {
      await expect(panel).toBeVisible();
      await expect(panel).not.toHaveAttribute("hidden", "");
      continue;
    }

    await expect(panel).toHaveAttribute("hidden", "");
  }
}

async function expectLocationState(page: Page, expected: { phase: string; hash?: string }) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const url = new URL(window.location.href);
        return {
          phase: url.searchParams.get("phase"),
          hash: url.hash,
        };
      }),
    )
    .toEqual({
      phase: expected.phase,
      hash: expected.hash ? `#${expected.hash}` : "",
    });
}

async function expectBenchSupportPhase(page: Page, phaseId: (typeof phaseIds)[number]) {
  await expect(page.getByTestId("concept-phase-bench-support")).toHaveAttribute(
    "data-active-phase",
    phaseId,
  );
}

async function expectBenchHandoff(
  page: Page,
  expected: {
    title: string;
    cta: string;
  },
) {
  const handoff = page.getByTestId("concept-learning-phase-bench-handoff");

  await expect(handoff).toBeVisible();
  await expect(handoff).toContainText(expected.title);
  await expect(page.getByTestId("concept-learning-phase-bench-cta")).toContainText(
    expected.cta,
  );
}

async function recordLiveLabNode(page: Page) {
  await page.evaluate(() => {
    (window as Window & { __conceptLiveLabNode?: Element | null }).__conceptLiveLabNode =
      document.querySelector('[data-testid="concept-live-lab"]');
  });
}

async function expectLiveLabStable(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const currentNode = document.querySelector('[data-testid="concept-live-lab"]');
        return currentNode ===
          (window as Window & { __conceptLiveLabNode?: Element | null }).__conceptLiveLabNode;
      }),
    )
    .toBe(true);
}

test("keeps the canonical concept flow stable on desktop with keyboard, progression, and grouped nav", async ({
  browser,
}) => {
  test.slow();
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/simple-harmonic-motion?phase=explore",
    desktopViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectViewportStable(page);
    await expectActivePhase(page, "explore");
    await expect
      .poll(() => page.locator('[role="tablist"]').count())
      .toBe(1);
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBe(0);

    const entryRailBox = await page.getByTestId("concept-learning-phase-entry-rail").boundingBox();
    const liveLabBox = await page.getByTestId("concept-live-lab").boundingBox();
    const lowerFlowBox = await page.getByTestId("concept-learning-phases").boundingBox();
    const benchUtilitiesBox = await page.getByTestId("concept-bench-utilities").boundingBox();
    const postPhaseSupportBox = await page.getByTestId("concept-post-phase-support").boundingBox();
    expect(entryRailBox).not.toBeNull();
    expect(liveLabBox).not.toBeNull();
    expect(lowerFlowBox).not.toBeNull();
    expect(benchUtilitiesBox).not.toBeNull();
    expect(postPhaseSupportBox).not.toBeNull();
    expect((entryRailBox?.y ?? 0) + (entryRailBox?.height ?? 0)).toBeLessThan(
      liveLabBox?.y ?? Number.POSITIVE_INFINITY,
    );
    expect((lowerFlowBox?.y ?? 0) + (lowerFlowBox?.height ?? 0)).toBeLessThan(
      benchUtilitiesBox?.y ?? Number.POSITIVE_INFINITY,
    );
    expect((benchUtilitiesBox?.y ?? 0) + (benchUtilitiesBox?.height ?? 0)).toBeLessThan(
      postPhaseSupportBox?.y ?? Number.POSITIVE_INFINITY,
    );
    await expectBenchSupportPhase(page, "explore");
    await expectBenchHandoff(page, {
      title: "What to notice",
      cta: "Open what to notice",
    });

    const desktopNavLinks = page.locator("[data-page-section-sidebar-column] nav a");
    await expect(desktopNavLinks.first()).toHaveText("Interactive lab");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='explore']"),
    ).toContainText("Explore");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='explore']"),
    ).toContainText("Bench: What to notice");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='understand']"),
    ).toContainText("Understand");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='understand']"),
    ).toContainText("Bench: Guided overlay");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='check']"),
    ).toContainText("Check + Continue");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='check']"),
    ).toContainText("Bench: Challenge mode");

    await page
      .locator(
        "[data-page-section-sidebar-column] [data-page-section-nav-group='understand'] a[href='#concept-bench-support-understand']",
      )
      .click();
    await expectActivePhase(page, "understand");
    await expectLocationState(page, {
      phase: "understand",
      hash: "concept-bench-support-understand",
    });
    await expectBenchSupportPhase(page, "understand");

    await page
      .locator(
        "[data-page-section-sidebar-column] [data-page-section-nav-group='check'] a[href='#challenge-mode']",
      )
      .click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "challenge-mode" });
    await expectBenchSupportPhase(page, "check");

    await page.locator("#concept-learning-phase-tab-explore").click();
    await expectActivePhase(page, "explore");
    await expectLocationState(page, { phase: "explore", hash: "short-explanation" });

    await page.locator("#concept-learning-phase-tab-explore").focus();
    await page.keyboard.press("ArrowRight");
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand", hash: "worked-examples" });
    await expectBenchSupportPhase(page, "understand");
    await expectBenchHandoff(page, {
      title: "Guided overlay",
      cta: "Jump to guided overlay",
    });
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ""))
      .toBe("concept-learning-phase-tab-understand");

    await page.locator("#concept-learning-phase-tab-check").click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "mini-challenge" });
    await expectBenchSupportPhase(page, "check");
    await expectBenchHandoff(page, {
      title: "Challenge mode",
      cta: "Go to challenge mode",
    });
    await expect
      .poll(() => page.evaluate(() => window.scrollY > 0))
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const summary = document.querySelector<HTMLElement>(
            '[data-testid="concept-learning-phase-summary"]',
          );

          if (!summary) {
            return false;
          }

          const rect = summary.getBoundingClientRect();

          return rect.top < window.innerHeight && rect.bottom > 0;
        }),
      )
      .toBe(true);

    await page.getByTestId("concept-learning-phase-previous").click();
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand", hash: "worked-examples" });
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""))
      .toContain("Understand");

    await page.getByTestId("concept-learning-phase-next").click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "mini-challenge" });
    await expect(
      page.locator(
        "[data-page-section-sidebar-column] [data-page-section-nav-group='check'] a[aria-current='step']",
      ),
    ).toContainText("Check + Continue");
    await expect(page.getByTestId("concept-learning-phase-completion")).toBeVisible();

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" }));
    const scrollBeforeBenchJump = await page.evaluate(() => window.scrollY);
    await page.getByTestId("concept-learning-phase-bench-cta").click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const target = document.getElementById("challenge-mode");

          if (!target) {
            return false;
          }

          const rect = target.getBoundingClientRect();

          return rect.top >= 0 && rect.top < window.innerHeight * 0.35;
        }),
      )
      .toBe(true);
    const scrollAfterBenchJump = await page.evaluate(() => window.scrollY);
    expect(scrollAfterBenchJump).toBeLessThan(scrollBeforeBenchJump);

    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps hash, phase query, and grouped desktop navigation truthful on deep links", async ({
  browser,
}) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/simple-harmonic-motion?phase=explore#worked-examples",
    desktopViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand", hash: "worked-examples" });

    await page
      .locator("[data-page-section-sidebar-column] [data-page-section-nav-group='check'] > a")
      .click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "mini-challenge" });
    await expect(page.locator("#mini-challenge")).toBeVisible();

    await page.locator("[data-page-section-sidebar-column] a[href='#quick-test']").click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "quick-test" });
    await expect(page.locator("#quick-test")).toBeVisible();

    await page.locator("#concept-learning-phase-tab-explore").click();
    await expectActivePhase(page, "explore");
    await expectLocationState(page, { phase: "explore", hash: "short-explanation" });

    await expectLiveLabStable(page);
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps the derivative route truthful for challenge-mode deep links and phase-owned bench support", async ({
  browser,
}) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/derivative-as-slope-local-rate-of-change#challenge-mode",
    desktopViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "challenge-mode" });
    await expectBenchSupportPhase(page, "check");
    await expectBenchHandoff(page, {
      title: "Challenge mode",
      cta: "Go to challenge mode",
    });
    await expect(page.locator("#challenge-mode")).toBeVisible();

    await expectLiveLabStable(page);
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("restores the correct phase from browser back and forward navigation", async ({
  browser,
}) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/simple-harmonic-motion?phase=understand#worked-examples",
    desktopViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand", hash: "worked-examples" });

    await gotoAndExpectOk(page, "/concepts/simple-harmonic-motion?phase=check#quick-test");
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "quick-test" });

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand", hash: "worked-examples" });

    await page.goForward({ waitUntil: "domcontentloaded" });
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "quick-test" });

    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps an additional concept shape stable under the shared phase shell", async ({
  browser,
}) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/vectors-components?phase=understand",
    desktopViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectViewportStable(page);
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand" });
    await expect(page.getByTestId("concept-learning-phase-summary")).toBeVisible();
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='understand']"),
    ).toContainText("Understand");

    await page.locator("#concept-learning-phase-tab-check").click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check" });

    await expectLiveLabStable(page);
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps an authored-override concept phase shell stable on desktop", async ({ browser }) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/uniform-circular-motion?phase=understand",
    desktopViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectViewportStable(page);
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand" });
    await expect(page.getByTestId("concept-learning-phase-summary")).toContainText("Step 2 of 3");
    await expect(
      page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='understand']"),
    ).toContainText("Understand");

    await page.locator("[data-page-section-sidebar-column] a[href='#quick-test']").click();
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check", hash: "quick-test" });

    await expectLiveLabStable(page);
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps the phase-first shell usable on mobile in zh-HK", async ({ browser }) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/zh-HK/concepts/simple-harmonic-motion?phase=check",
    mobileViewport,
  );

  try {
    await recordLiveLabNode(page);
    await expectViewportStable(page);
    await expectActivePhase(page, "check");
    await expectLocationState(page, { phase: "check" });

    await expect(page.locator("#concept-learning-phase-tab-explore")).toContainText("探索");
    await expect(page.locator("#concept-learning-phase-tab-understand")).toContainText("理解");
    await expect(page.locator("#concept-learning-phase-tab-check")).toContainText("檢查＋繼續");
    await expect(page.getByTestId("concept-learning-phase-summary")).toContainText("第 3 步");
    await expect(page.getByTestId("concept-learning-phase-completion")).toContainText(
      "概念流程完成",
    );

    await page.locator("[data-page-section-mobile-nav] > button").click();
    await expect(
      page.locator("[data-page-section-mobile-nav] [data-page-section-nav-group='explore']"),
    ).toContainText("探索");
    await expect(
      page.locator("[data-page-section-mobile-nav] [data-page-section-nav-group='understand']"),
    ).toContainText("理解");
    await expect(
      page.locator("[data-page-section-mobile-nav] [data-page-section-nav-group='check']"),
    ).toContainText("檢查＋繼續");

    await page
      .locator("[data-page-section-mobile-nav] nav")
      .getByRole("link", { name: "例題" })
      .click();
    await expectActivePhase(page, "understand");
    await expectLocationState(page, { phase: "understand", hash: "worked-examples" });
    await expect(page.locator("[data-page-section-mobile-nav] nav")).toHaveCount(0);

    await expectLiveLabStable(page);
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps the phase-first shell visually stable across representative responsive and locale states", async ({
  browser,
}, testInfo) => {
  test.slow();

  const visualCases = [
    {
      name: "canonical-explore-desktop",
      path: "/concepts/simple-harmonic-motion?phase=explore",
      viewportCase: desktopViewport,
      expectedPhase: "explore" as const,
      assertExtras: async (page: Page) => {
        await expect(page.getByTestId("concept-learning-phase-summary")).toContainText(
          "Step 1 of 3",
        );
        await expect(page.getByTestId("concept-learning-phase-summary")).toContainText(
          "This stage includes",
        );
      },
    },
    {
      name: "canonical-understand-desktop",
      path: "/concepts/simple-harmonic-motion?phase=understand",
      viewportCase: desktopViewport,
      expectedPhase: "understand" as const,
      assertExtras: async (page: Page) => {
        await expect(page.getByTestId("concept-learning-phase-summary")).toContainText(
          "Step 2 of 3",
        );
        await expect(page.getByTestId("concept-learning-phase-summary")).toContainText(
          "What to do here",
        );
      },
    },
    {
      name: "canonical-check-desktop",
      path: "/concepts/simple-harmonic-motion?phase=check",
      viewportCase: desktopViewport,
      expectedPhase: "check" as const,
      assertExtras: async (page: Page) => {
        await expect(page.getByTestId("concept-learning-phase-completion")).toBeVisible();
        await expect(page.getByTestId("concept-learning-phase-completion")).toContainText(
          "Concept flow complete",
        );
      },
    },
    {
      name: "override-understand-desktop",
      path: "/concepts/uniform-circular-motion?phase=understand",
      viewportCase: desktopViewport,
      expectedPhase: "understand" as const,
      assertExtras: async (page: Page) => {
        await expect(page.getByTestId("concept-learning-phase-summary")).toContainText(
          "Live circular-motion examples",
        );
      },
    },
    {
      name: "canonical-understand-tablet",
      path: "/concepts/simple-harmonic-motion?phase=understand",
      viewportCase: tabletViewport,
      expectedPhase: "understand" as const,
      assertExtras: async (page: Page) => {
        await expect(page.getByTestId("concept-learning-phase-next")).toBeVisible();
      },
    },
    {
      name: "canonical-check-mobile-zh-HK",
      path: "/zh-HK/concepts/simple-harmonic-motion?phase=check",
      viewportCase: mobileViewport,
      expectedPhase: "check" as const,
      assertExtras: async (page: Page) => {
        await expect(page.getByTestId("concept-learning-phase-summary")).toContainText("第 3 步");
        await expect(page.getByTestId("concept-learning-phase-completion")).toContainText(
          "概念流程完成",
        );
        await page.locator("[data-page-section-mobile-nav] > button").click();
        await expect(
          page.locator("[data-page-section-mobile-nav] [data-page-section-nav-group='check']"),
        ).toContainText("檢查＋繼續");

        const screenshot = await page.screenshot({
          animations: "disabled",
          fullPage: false,
        });

        await testInfo.attach("canonical-check-mobile-zh-HK-nav-open", {
          body: screenshot,
          contentType: "image/png",
        });

        await expect(page.locator("[data-page-section-mobile-nav] nav")).toBeVisible();
      },
    },
  ];

  for (const visualCase of visualCases) {
    await test.step(visualCase.name, async () => {
      const { context, page, browserGuard } = await openConceptPage(
        browser,
        visualCase.path,
        visualCase.viewportCase,
      );

      try {
        await recordLiveLabNode(page);
        await expectViewportStable(page);
        await expectActivePhase(page, visualCase.expectedPhase);
        await expectPhaseShellLayoutStable(page);
        await visualCase.assertExtras(page);
        await attachPhaseShellScreenshot(page, testInfo, `${visualCase.name}-phase-shell`);
        await expectLiveLabStable(page);
        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    });
  }
});
