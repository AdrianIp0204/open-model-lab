import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
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

type ConceptLearningPhaseId = "explore" | "understand" | "check";

type CalculusAcceptanceCase = {
  name: string;
  path: string;
  heading: string;
  explorePhrases: string[];
  understandPhrases: string[];
  checkPhrase: string;
  readNextLabel: string;
  readNextTitles: string[];
  firstReadNextTitle: string;
};

const desktopViewport: ViewportCase = {
  viewport: { width: 1440, height: 900 },
};

const phaseIds: ConceptLearningPhaseId[] = ["explore", "understand", "check"];

const calculusAcceptanceCases: CalculusAcceptanceCase[] = [
  {
    name: "limits branch opener",
    path: "/concepts/limits-and-continuity-approaching-a-value",
    heading: "Limits and Continuity / Approaching a Value",
    explorePhrases: [
      "A limit becomes teachable when the bench lets you watch approach happen",
      "distance-to-target control",
      "one-sided markers",
    ],
    understandPhrases: [
      "Use the live behavior case, the distance-to-target slider, and the one-sided graph together.",
      "Compare the limiting value with the plotted point",
    ],
    checkPhrase:
      "Answer from the one-sided markers, the finite-limit guide, and the actual point.",
    readNextLabel: "Continue through the calculus branch",
    readNextTitles: [
      "Optimization / Maxima, Minima, and Constraints",
      "Integral as Accumulation / Area",
    ],
    firstReadNextTitle: "Optimization / Maxima, Minima, and Constraints",
  },
  {
    name: "optimization branch middle",
    path: "/concepts/optimization-maxima-minima-and-constraints",
    heading: "Optimization / Maxima, Minima, and Constraints",
    explorePhrases: [
      "This bench fixes the perimeter at 24 meters",
      "square maximum is not a magic algebra trick",
    ],
    understandPhrases: [
      "Use the width slider, the height tradeoff graph, and the area / slope graphs together.",
      "Read the current height and area",
    ],
    checkPhrase:
      "Use the rectangle, the objective point, and the area-slope graph together.",
    readNextLabel: "Continue through the calculus branch",
    readNextTitles: ["Integral as Accumulation / Area"],
    firstReadNextTitle: "Integral as Accumulation / Area",
  },
  {
    name: "integral branch end",
    path: "/concepts/integral-as-accumulation-area",
    heading: "Integral as Accumulation / Area",
    explorePhrases: [
      "upper-bound slider",
      "shaded signed area",
      "accumulation graph",
    ],
    understandPhrases: [
      "Use the upper-bound slider, signed-area shading, and accumulation point together.",
      "Read the running total",
    ],
    checkPhrase:
      "Use the source graph, the shaded area, and the accumulation graph together.",
    readNextLabel: "Carry this graph-first lens onward",
    readNextTitles: ["Vectors in 2D"],
    firstReadNextTitle: "Vectors in 2D",
  },
];

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

async function expectActivePhase(page: Page, phaseId: ConceptLearningPhaseId) {
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

async function expectBenchSupportPhase(page: Page, phaseId: ConceptLearningPhaseId) {
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

test("keeps the authored calculus batch clear and coherent inside the phase-first shell", async ({
  browser,
}) => {
  test.slow();

  for (const routeCase of calculusAcceptanceCases) {
    await test.step(routeCase.name, async () => {
      const { context, page, browserGuard } = await openConceptPage(
        browser,
        routeCase.path,
        desktopViewport,
      );

      try {
        await recordLiveLabNode(page);
        await expectViewportStable(page);
        await expectPhaseShellLayoutStable(page);
        await expectActivePhase(page, "explore");
        await expectBenchSupportPhase(page, "explore");
        await expectBenchHandoff(page, {
          title: "What to notice",
          cta: "Open what to notice",
        });
        await expect(page.getByRole("heading", { name: routeCase.heading })).toBeVisible();
        await expect(page.getByTestId("concept-learning-phase-entry-rail")).toBeVisible();

        const entryRailBox = await page
          .getByTestId("concept-learning-phase-entry-rail")
          .boundingBox();
        const liveLabBox = await page.getByTestId("concept-live-lab").boundingBox();
        const lowerFlowBox = await page.getByTestId("concept-learning-phases").boundingBox();
        const benchUtilitiesBox = await page.getByTestId("concept-bench-utilities").boundingBox();
        const postPhaseSupportBox = await page
          .getByTestId("concept-post-phase-support")
          .boundingBox();
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

        await expect(
          page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='explore']"),
        ).toContainText("Bench: What to notice");
        await expect(
          page.locator(
            "[data-page-section-sidebar-column] [data-page-section-nav-group='understand']",
          ),
        ).toContainText("Bench: Guided overlay");
        await expect(
          page.locator("[data-page-section-sidebar-column] [data-page-section-nav-group='check']"),
        ).toContainText("Bench: Challenge mode");

        const summary = page.getByTestId("concept-learning-phase-summary");
        const explorePanel = page.locator("#concept-learning-phase-panel-explore");
        const understandPanel = page.locator("#concept-learning-phase-panel-understand");
        const checkPanel = page.locator("#concept-learning-phase-panel-check");

        await expect(summary).toContainText("Step 1 of 3");
        for (const phrase of routeCase.explorePhrases) {
          await expect(explorePanel).toContainText(phrase);
        }

        await page.locator("#concept-learning-phase-tab-understand").click();
        await expectActivePhase(page, "understand");
        await expectBenchSupportPhase(page, "understand");
        await expectBenchHandoff(page, {
          title: "Guided overlay",
          cta: "Jump to guided overlay",
        });
        await expect(summary).toContainText("Step 2 of 3");
        await expect(summary).toContainText("Worked examples");
        await expect(understandPanel).toContainText("Frozen walkthrough");
        for (const phrase of routeCase.understandPhrases) {
          await expect(understandPanel).toContainText(phrase);
        }

        await page.getByTestId("concept-learning-phase-next").click();
        await expectActivePhase(page, "check");
        await expectBenchSupportPhase(page, "check");
        await expectBenchHandoff(page, {
          title: "Challenge mode",
          cta: "Go to challenge mode",
        });
        await expect(summary).toContainText("Step 3 of 3");
        await expect(summary).toContainText(routeCase.readNextLabel);
        await expect(checkPanel).toContainText(routeCase.checkPhrase);
        await expect(page.locator("#mini-challenge")).toBeVisible();
        await expect(page.locator("#quick-test")).toBeVisible();

        const readNextSection = page.locator("#read-next");
        await expect(readNextSection).toContainText(routeCase.readNextLabel);
        await expect(readNextSection.getByRole("link").first()).toContainText(
          routeCase.firstReadNextTitle,
        );
        for (const title of routeCase.readNextTitles) {
          await expect(readNextSection).toContainText(title);
        }

        await expect(page.getByTestId("concept-bench-utilities")).toBeVisible();
        await expect(page.getByTestId("concept-post-phase-support")).toBeVisible();

        await expectLiveLabStable(page);
        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    });
  }
});

test("keeps the limits route truthful for phase query, top-rail switching, hash activation, and live-lab stability", async ({
  browser,
}) => {
  const routePath = "/concepts/limits-and-continuity-approaching-a-value";

  for (const phaseId of phaseIds) {
    await test.step(`loads with ?phase=${phaseId}`, async () => {
      const { context, page, browserGuard } = await openConceptPage(
        browser,
        `${routePath}?phase=${phaseId}`,
        desktopViewport,
      );

      try {
        await expectActivePhase(page, phaseId);
        await expectLocationState(page, { phase: phaseId });
        browserGuard.assertNoActionableIssues();
      } finally {
        await context.close();
      }
    });
  }

  await test.step("top rail click activates check and keeps the live lab stable", async () => {
    const { context, page, browserGuard } = await openConceptPage(
      browser,
      `${routePath}?phase=explore`,
      desktopViewport,
    );

    try {
      await recordLiveLabNode(page);
      await expectActivePhase(page, "explore");

      await page.locator("#concept-learning-phase-tab-check").click();
      await expectActivePhase(page, "check");
      await expectLocationState(page, { phase: "check" });
      await expect
        .poll(() => page.evaluate(() => window.scrollY > 0))
        .toBe(true);
      await expect(page.locator("#mini-challenge")).toBeVisible();
      await expectBenchHandoff(page, {
        title: "Challenge mode",
        cta: "Go to challenge mode",
      });

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

      await expectLiveLabStable(page);
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  await test.step("worked examples deep link activates understand", async () => {
    const { context, page, browserGuard } = await openConceptPage(
      browser,
      `${routePath}?phase=explore#worked-examples`,
      desktopViewport,
    );

    try {
      await expectActivePhase(page, "understand");
      await expectLocationState(page, { phase: "understand", hash: "worked-examples" });
      await expect(page.locator("#worked-examples")).toBeVisible();
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });

  await test.step("quick test deep link activates check", async () => {
    const { context, page, browserGuard } = await openConceptPage(
      browser,
      `${routePath}?phase=explore#quick-test`,
      desktopViewport,
    );

    try {
      await expectActivePhase(page, "check");
      await expectLocationState(page, { phase: "check", hash: "quick-test" });
      await expect(page.locator("#quick-test")).toBeVisible();
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
});
