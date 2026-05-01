import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { getConceptBySlug } from "@/lib/content";
import { resolveConceptPageGuidance } from "@/lib/content/concept-page-guidance";
import { localizeConceptContent } from "@/lib/i18n/concept-content";
import { buildConceptSimulationStateHref } from "@/lib/share-links";
import {
  DISCLOSURE_REPRESENTATIVE_CASES,
  DISCLOSURE_RESTORE_CASE,
  getDynamicFallbackLegacyCase,
  getSimulationUiRolloutReportCached,
} from "../helpers/concept-disclosure-fixtures";
import { baseURL, gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

const desktopViewport = {
  width: 1440,
  height: 900,
} as const;

async function openConceptPage(
  browser: Browser,
  pathname: string,
): Promise<{
  context: BrowserContext;
  page: Page;
  browserGuard: BrowserGuard;
}> {
  const context = await browser.newContext({
    viewport: desktopViewport,
    baseURL,
  });
  const page = await context.newPage();
  const browserGuard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, pathname);
  await expect(page.getByTestId("concept-hero-intro")).toBeVisible();
  await expect(page.getByTestId("concept-page-status-surface")).toBeVisible();
  await expect(page.getByTestId("concept-learning-phase-entry-rail")).toBeVisible();
  await expect(page.getByTestId("concept-live-lab")).toBeVisible();
  await expect(page.getByTestId("concept-guided-start-card")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("concept-runtime-explore-starter-guide")).toHaveCount(0);

  return { context, page, browserGuard };
}

function getExpectedGuidedStartAction(pathname: string) {
  const slug = pathname.split("/").at(-1);

  if (!slug) {
    return "";
  }

  const effectiveConcept = localizeConceptContent(getConceptBySlug(slug), "en");
  return resolveConceptPageGuidance(effectiveConcept)?.action ?? "";
}

function normalizeVisibleText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractAuthoredProseSegments(value: string) {
  const segments: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const delimiter = value.startsWith("$$", cursor)
      ? "$$"
      : value[cursor] === "$"
        ? "$"
        : null;

    if (!delimiter) {
      const nextMath = value.indexOf("$", cursor);
      const text = nextMath === -1 ? value.slice(cursor) : value.slice(cursor, nextMath);
      const normalizedText = normalizeVisibleText(text);

      if (normalizedText) {
        segments.push(normalizedText);
      }

      if (nextMath === -1) {
        break;
      }

      cursor = nextMath;
      continue;
    }

    const closingIndex = value.indexOf(delimiter, cursor + delimiter.length);
    if (closingIndex === -1) {
      const normalizedText = normalizeVisibleText(value.slice(cursor));

      if (normalizedText) {
        segments.push(normalizedText);
      }
      break;
    }

    cursor = closingIndex + delimiter.length;
  }

  return segments.filter((segment) => segment.length >= 4);
}

async function expectGuidedStartPromptToMatch(locator: Locator, authoredPrompt: string) {
  const actualText = normalizeVisibleText(await locator.innerText());
  const proseSegments = extractAuthoredProseSegments(authoredPrompt);
  let cursor = 0;

  expect(proseSegments.length).toBeGreaterThan(0);

  for (const segment of proseSegments) {
    const nextIndex = actualText.indexOf(segment, cursor);

    expect(
      nextIndex,
      `Expected guided-start prompt to include prose segment "${segment}" in order within "${actualText}"`,
    ).toBeGreaterThanOrEqual(0);

    cursor = nextIndex + segment.length;
  }
}

for (const routeCase of DISCLOSURE_REPRESENTATIVE_CASES) {
  test(`keeps Explore first load lighter and more explicit on ${routeCase.slug}`, async ({
    browser,
  }) => {
    const { context, page, browserGuard } = await openConceptPage(browser, `/concepts/${routeCase.slug}`);

    try {
      await expect(page.getByRole("heading", { name: routeCase.heading })).toBeVisible();
      const guidedStartCard = page.getByTestId("concept-guided-start-card");
      const liveLab = page.getByTestId("concept-live-lab");
      const entryRail = page.getByTestId("concept-learning-phase-entry-rail");
      const expectedPrompt = getExpectedGuidedStartAction(`/concepts/${routeCase.slug}`);

      await expect(entryRail).toContainText("Current stage");
      await expect(entryRail).toContainText("Try this first");
      await expect(guidedStartCard).toContainText("Try this first");
      await expectGuidedStartPromptToMatch(guidedStartCard, expectedPrompt);
      await expect(
        entryRail.getByTestId("concept-guided-start-card"),
      ).toBeVisible();

      const liveLabBox = await liveLab.boundingBox();
      const entryRailBox = await entryRail.boundingBox();

      expect(liveLabBox).not.toBeNull();
      expect(entryRailBox).not.toBeNull();
      expect(entryRailBox!.y).toBeLessThanOrEqual(liveLabBox!.y + 120);

      const controls = page.getByTestId("simulation-shell-controls");
      for (const control of routeCase.visibleControls) {
        await expect(
          controls.getByRole(control.role, { name: control.name }),
        ).toBeVisible();
      }
      for (const control of routeCase.hiddenControls) {
        await expect(
          controls.getByRole(control.role, { name: control.name }),
        ).toHaveCount(0);
      }

      for (const graphId of routeCase.visibleGraphTabs) {
        await expect(page.locator(`#graph-tab-${graphId}`)).toBeVisible();
      }
      for (const graphId of routeCase.hiddenGraphTabs) {
        await expect(page.locator(`#graph-tab-${graphId}`)).toHaveCount(0);
      }
      if (routeCase.hiddenGraphTabs.length > 0) {
        await expect(page.getByRole("button", { name: "More graphs" })).toBeVisible();
      }

      await expect(page.locator(`#graph-tab-${routeCase.activeGraphId}`)).toHaveAttribute(
        "aria-selected",
        "true",
      );
      browserGuard.assertNoActionableIssues();
    } finally {
      await context.close();
    }
  });
}

test("reset returns the shared Explore defaults on simple harmonic motion", async ({ browser }) => {
  const { context, page, browserGuard } = await openConceptPage(
    browser,
    "/concepts/simple-harmonic-motion",
  );

  try {
    const controls = page.getByTestId("simulation-shell-controls");

    await page.getByRole("button", { name: "More graphs" }).click();
    await page.locator("#graph-tab-velocity").click();
    await expect(page.locator("#graph-tab-velocity")).toHaveAttribute("aria-selected", "true");

    await controls.getByRole("button", { name: "More tools" }).click();
    await expect(controls.getByRole("slider", { name: "Phase" })).toBeVisible();
    await controls.getByRole("button", { name: "Reset" }).click();

    await expect(page.locator("#graph-tab-displacement")).toHaveAttribute("aria-selected", "true");
    await expect(controls.getByRole("slider", { name: "Phase" })).toHaveCount(0);
    await expect(controls.getByRole("button", { name: /Calm start/i })).toHaveCount(0);
    await expect(page.locator("#graph-tab-velocity")).toHaveCount(0);
    await expect(page.getByTestId("concept-guided-start-card")).toBeVisible();
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});

test("keeps fallback coverage aligned with the current rollout state", async () => {
  const fallbackCase = getDynamicFallbackLegacyCase();

  if (!fallbackCase) {
    const report = getSimulationUiRolloutReportCached();
    expect(report.remaining).toHaveLength(0);
    return;
  }

  throw new Error(
    `Expected the published disclosure backlog to be zero, but "${fallbackCase.slug}" still resolves as a fallback case.`,
  );
});

test("auto-expands hidden controls and graphs for a representative restored disclosure state", async ({
  browser,
}) => {
  const concept = getConceptBySlug(DISCLOSURE_RESTORE_CASE.slug);
  const href = buildConceptSimulationStateHref({
    source: {
      slug: concept.slug,
      simulation: {
        defaults: concept.simulation.defaults,
        presets: concept.simulation.presets,
        graphs: concept.graphs,
        overlays: concept.simulation.overlays,
      },
    },
    conceptSlug: concept.slug,
    state: {
      params: {
        ...concept.simulation.defaults,
        ...DISCLOSURE_RESTORE_CASE.patch,
      },
      activePresetId: null,
      activeGraphId: DISCLOSURE_RESTORE_CASE.activeGraphId,
      overlayValues: concept.simulation.overlays?.reduce<Record<string, boolean>>((accumulator, overlay) => {
        accumulator[overlay.id] = Boolean(overlay.defaultOn);
        return accumulator;
      }, {}) ?? {},
      focusedOverlayId: null,
      time: 0,
      timeSource: "live",
      compare: null,
    },
  });

  const { context, page, browserGuard } = await openConceptPage(browser, href);

  try {
    const controls = page.getByTestId("simulation-shell-controls");

    await expect(controls.getByRole("button", { name: "More tools" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(
      controls.getByRole(DISCLOSURE_RESTORE_CASE.hiddenControl.role, {
        name: DISCLOSURE_RESTORE_CASE.hiddenControl.name,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Hide graphs" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.locator(`#graph-tab-${DISCLOSURE_RESTORE_CASE.activeGraphId}`)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    browserGuard.assertNoActionableIssues();
  } finally {
    await context.close();
  }
});
