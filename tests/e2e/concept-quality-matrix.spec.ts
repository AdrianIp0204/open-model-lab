import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import conceptsCatalog from "../../content/catalog/concepts.json";
import {
  assertConceptQualityGate,
  assertRepresentativeInteractionCoverage,
  buildConceptQualityReport,
  conceptQualityThresholds,
  renderConceptQualityMatrixMarkdown,
} from "../../scripts/concept-quality-matrix-core.mjs";
import { baseURL, installBrowserGuards } from "./helpers";

test.setTimeout(1_200_000);

type ConceptCatalogEntry = {
  slug: string;
  title: string;
  subject?: string;
  topic?: string;
  published?: boolean;
  status?: string;
};

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
};

type AuditIssue = {
  code: string;
  severity: "error" | "warning";
  detail: string;
};

const artifactDir = path.join(process.cwd(), "output", "concept-quality-matrix");
const latestDir = path.join(artifactDir, "latest");
const runDir = path.join(
  artifactDir,
  new Date().toISOString().replace(/[:.]/g, "-"),
);

const viewports: ViewportCase[] = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  {
    name: "phone-390x844",
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
];
const auditConcurrency = Math.max(
  1,
  Math.min(8, Number(process.env.OML_QA_046_CONCURRENCY ?? "1") || 1),
);
const onboardingStorageKey = "open-model-lab.onboarding.v1";
const conceptBenchOnboardingState = {
  promptDismissed: true,
  disabled: false,
  completed: true,
  lastStep: 0,
  updatedAt: "2026-04-27T00:00:00.000Z",
} as const;

const requiredPositions = {
  scene: '[data-testid="simulation-shell-scene"]',
  cue: '[data-testid="concept-v2-current-step-cue"]',
  controls: '[data-testid="simulation-shell-controls"]',
  graphs: '[data-testid="simulation-shell-graphs"]',
  lessonRail:
    '[data-testid="concept-v2-current-step-card"], [data-testid="concept-v2-step-rail"], [data-testid="concept-v2-step-support"]',
} as const;
const missingPositionIssueCodes: Record<keyof typeof requiredPositions, string> = {
  scene: "missing_scene",
  cue: "missing_current_step_cue",
  controls: "missing_controls",
  graphs: "missing_graphs",
  lessonRail: "missing_lesson_rail",
};

function selectedConcepts() {
  const published = (conceptsCatalog as ConceptCatalogEntry[])
    .filter((entry) => entry.published && entry.status !== "draft")
    .sort((first, second) => first.slug.localeCompare(second.slug));
  const slugFilter = (process.env.OML_QA_046_SLUGS ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const maxSlugs = Number(process.env.OML_QA_046_MAX_SLUGS ?? "0");
  const filtered = slugFilter.length
    ? published.filter((entry) => slugFilter.includes(entry.slug))
    : published;

  return Number.isInteger(maxSlugs) && maxSlugs > 0 ? filtered.slice(0, maxSlugs) : filtered;
}

async function installConceptBenchAuditState(page: Page) {
  await page.addInitScript(
    ({ storageKey, onboardingState }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(onboardingState));
    },
    {
      storageKey: onboardingStorageKey,
      onboardingState: conceptBenchOnboardingState,
    },
  );
}

async function installDeterministicIdleCallback(page: Page) {
  await page.addInitScript(() => {
    window.requestIdleCallback = (callback: IdleRequestCallback) =>
      window.setTimeout(
        () =>
          callback({
            didTimeout: false,
            timeRemaining: () => 50,
          }),
        1,
      );
    window.cancelIdleCallback = (handle: number) => window.clearTimeout(handle);
  });
}

async function createContextForViewport(browserContextFactory: {
  newContext: (options: {
    viewport: { width: number; height: number };
    isMobile?: boolean;
    hasTouch?: boolean;
    deviceScaleFactor?: number;
  }) => Promise<BrowserContext>;
}, viewport: ViewportCase) {
  return browserContextFactory.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.deviceScaleFactor,
  });
}

async function firstVisibleLocator(locator: Locator, options: { enabled?: boolean; limit?: number } = {}) {
  const count = Math.min(await locator.count().catch(() => 0), options.limit ?? 40);

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    const visible = await candidate.isVisible().catch(() => false);

    if (!visible) {
      continue;
    }

    if (options.enabled && !(await candidate.isEnabled().catch(() => false))) {
      continue;
    }

    return candidate;
  }

  return null;
}

async function auditRepresentativeInteraction(page: Page) {
  const benchTools = await firstVisibleLocator(page.getByTestId("concept-v2-bench-tools"));

  if (benchTools) {
    try {
      await benchTools.locator("summary").click({ timeout: 5_000 });
      await expect(benchTools).toHaveAttribute("open", "", { timeout: 5_000 });

      const tool = await firstVisibleLocator(
        benchTools.locator(
          [
            '[data-testid^="concept-v2-bench-tool-control-"]',
            '[data-testid^="concept-v2-bench-tool-graph-"]',
            '[data-testid^="concept-v2-bench-tool-overlay-"]',
            '[data-testid^="concept-v2-bench-tool-equation-"]',
            '[data-testid="concept-v2-bench-tool-prediction"]',
          ].join(", "),
        ),
        { enabled: true },
      );

      if (tool) {
        await tool.click({ timeout: 5_000 });
        const activeTool = page.getByTestId("concept-v2-bench-tool-active");
        await activeTool.waitFor({ state: "visible", timeout: 5_000 });

        return {
          status: "passed",
          target: "concept-v2-bench-tools",
          action: "open-and-select-tool",
          detail: "Opened the bench tool disclosure and selected the first available tool.",
        };
      }
    } catch (error) {
      return {
        status: "failed",
        target: "concept-v2-bench-tools",
        action: "open-and-select-tool",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const slider = await firstVisibleLocator(
    page.locator(
      [
        '[data-testid="simulation-shell-controls"] input[type="range"]:not([disabled])',
        '[data-testid="simulation-shell-transport"] input[type="range"]:not([disabled])',
      ].join(", "),
    ),
    { enabled: true },
  );

  if (slider) {
    try {
      const before = await slider.inputValue();
      await slider.focus();
      await page.keyboard.press("ArrowRight");
      let after = await slider.inputValue();

      if (after === before) {
        await page.keyboard.press("ArrowLeft");
        after = await slider.inputValue();
      }

      if (after !== before) {
        return {
          status: "passed",
          target: "simulation-shell-controls range",
          action: "keyboard-adjust-slider",
          detail: `Adjusted a visible range control from ${before} to ${after}.`,
        };
      }
    } catch (error) {
      return {
        status: "failed",
        target: "simulation-shell-controls range",
        action: "keyboard-adjust-slider",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const toggleLabel = await firstVisibleLocator(
    page.locator('[data-testid="simulation-shell-controls"] label:has(input[type="checkbox"]:not([disabled]))'),
  );

  if (toggleLabel) {
    try {
      const checkbox = toggleLabel.locator('input[type="checkbox"]').first();
      const before = await checkbox.isChecked();
      await toggleLabel.click({ timeout: 5_000 });
      const after = await checkbox.isChecked();

      if (after !== before) {
        return {
          status: "passed",
          target: "simulation-shell-controls checkbox",
          action: "toggle-checkbox",
          detail: "Toggled a visible simulation control checkbox.",
        };
      }
    } catch (error) {
      return {
        status: "failed",
        target: "simulation-shell-controls checkbox",
        action: "toggle-checkbox",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const localButton = await firstVisibleLocator(
    page.locator(
      [
        '[data-testid="simulation-shell-scene"] button:not([disabled])',
        '[data-testid="simulation-shell-controls"] button:not([disabled])',
        '[data-testid="simulation-shell-transport"] button:not([disabled])',
        '[data-testid="concept-v2-current-step-cue"] button:not([disabled])',
        '[data-testid="concept-v2-current-step-card"] button:not([disabled])',
        '[data-testid="concept-v2-step-support"] button:not([disabled])',
      ].join(", "),
    ),
    { enabled: true },
  );

  if (localButton) {
    try {
      const beforeUrl = page.url();
      await localButton.click({ timeout: 5_000 });
      await page.waitForTimeout(150);
      const afterUrl = page.url();

      if (afterUrl !== beforeUrl) {
        return {
          status: "failed",
          target: "local concept button",
          action: "click-button",
          detail: `Representative interaction changed URL from ${beforeUrl} to ${afterUrl}.`,
        };
      }

      return {
        status: "passed",
        target: "local concept button",
        action: "click-button",
        detail: "Clicked the first visible enabled local concept button without navigation.",
      };
    } catch (error) {
      return {
        status: "failed",
        target: "local concept button",
        action: "click-button",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    status: "skipped",
    detail: "No safe visible simulation, bench, cue, or step-control target was available in this viewport.",
  };
}

async function auditConceptViewport(page: Page, concept: ConceptCatalogEntry, viewport: ViewportCase) {
  const routePath = `/en/concepts/${concept.slug}`;
  const issues: AuditIssue[] = [];
  let route = { attempted: true, ok: false, status: null as number | null, path: routePath };

  try {
    const response = await page.goto(routePath, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    route = {
      attempted: true,
      ok: Boolean(response?.ok()),
      status: response?.status() ?? null,
      path: routePath,
    };
  } catch (error) {
    issues.push({
      code: "route_navigation_error",
      severity: "error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  await page.locator("h1").first().waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
  await page
    .locator('[data-testid="simulation-shell-scene"], [data-testid="concept-v2-current-step-cue"]')
    .first()
    .waitFor({ state: "visible", timeout: 12_000 })
    .catch(() => undefined);

  const metrics = await page.evaluate(
    ({ expectedTitle, selectors, thresholds, isMobile }) => {
      type PositionKey = keyof typeof selectors;

      function isVisibleElement(element: Element | null): element is HTMLElement {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        if (element.closest("[aria-hidden='true'], [hidden], .sr-only")) {
          return false;
        }

        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          rect.width > 1 &&
          rect.height > 1 &&
          styles.display !== "none" &&
          styles.visibility !== "hidden" &&
          Number(styles.opacity) !== 0
        );
      }

      function rectFor(selector: string) {
        const element = Array.from(document.querySelectorAll(selector)).find(isVisibleElement);

        if (!element) {
          return {
            visible: false,
            x: null,
            y: null,
            width: 0,
            height: 0,
            inViewport: false,
            text: "",
          };
        }

        const rect = element.getBoundingClientRect();

        return {
          visible: true,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          inViewport:
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth,
          text: element.innerText?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "",
        };
      }

      function visibleText(element: HTMLElement) {
        const pieces: string[] = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;

            if (!parent || !isVisibleElement(parent)) {
              return NodeFilter.FILTER_REJECT;
            }

            const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";

            return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          },
        });

        while (walker.nextNode()) {
          pieces.push(walker.currentNode.textContent?.replace(/\s+/g, " ").trim() ?? "");
        }

        return pieces.join(" ");
      }

      const h1Element = document.querySelector("h1");
      const h1 = {
        visible: isVisibleElement(h1Element),
        text: h1Element instanceof HTMLElement ? h1Element.innerText.replace(/\s+/g, " ").trim() : "",
        matchesTitle:
          h1Element instanceof HTMLElement &&
          h1Element.innerText.replace(/\s+/g, " ").trim().includes(expectedTitle),
      };
      const positions = Object.fromEntries(
        (Object.keys(selectors) as PositionKey[]).map((key) => [key, rectFor(selectors[key])]),
      );
      const main = document.querySelector("main") ?? document.body;
      const clippingSamples = Array.from(main.querySelectorAll<HTMLElement>("*"))
        .filter(isVisibleElement)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const styles = window.getComputedStyle(element);

          if (
            rect.bottom <= 0 ||
            rect.right <= 0 ||
            rect.top >= window.innerHeight ||
            rect.left >= window.innerWidth
          ) {
            return false;
          }

          if (element.closest("svg, canvas, [data-testid='simulation-shell-scene']")) {
            return false;
          }

          const clipsHorizontal =
            element.scrollWidth > element.clientWidth + 2 &&
            styles.overflowX !== "visible";
          const clipsVertical =
            element.scrollHeight > element.clientHeight + 2 &&
            styles.overflowY !== "visible";

          return (
            clipsHorizontal ||
            clipsVertical
          );
        })
        .slice(0, 12)
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            tag: element.tagName.toLowerCase(),
            testId: element.getAttribute("data-testid"),
            text: element.innerText?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "",
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scrollWidth: element.scrollWidth,
            scrollHeight: element.scrollHeight,
          };
        });
      const touchTargets = isMobile
        ? Array.from(
            main.querySelectorAll<HTMLElement>(
              "button, input, select, textarea, summary, [role='button'], [tabindex]:not([tabindex='-1'])",
            ),
          )
            .filter(isVisibleElement)
            .filter((element) => {
              const rect = element.getBoundingClientRect();

              return (
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < window.innerHeight &&
                rect.left < window.innerWidth &&
                (rect.width < thresholds.minTouchTargetPx ||
                  rect.height < thresholds.minTouchTargetPx)
              );
            })
            .slice(0, 12)
            .map((element) => {
              const rect = element.getBoundingClientRect();

              return {
                tag: element.tagName.toLowerCase(),
                type: element.getAttribute("type"),
                testId: element.getAttribute("data-testid"),
                label:
                  element.getAttribute("aria-label") ??
                  element.innerText?.replace(/\s+/g, " ").trim().slice(0, 80) ??
                  "",
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              };
            })
        : [];
      const text = visibleText(main);
      const localizedLeaks = text.match(/[\u4E00-\u9FFF]|v2\.|ConceptPage\./g) ?? [];
      const supportSurfaceSelectors = [
        '[data-testid="concept-v2-current-step-cue"]',
        '[data-testid="concept-v2-current-step-card"]',
        '[data-testid="concept-v2-step-support"]',
        '[data-testid="concept-v2-active-task-rail"]',
      ];
      const visibleSupportSurfaceCount = supportSurfaceSelectors
        .map((selector) => Array.from(document.querySelectorAll(selector)).some(isVisibleElement))
        .filter(Boolean).length;

      return {
        h1,
        positions,
        metrics: {
          horizontalOverflowPx: Math.max(
            0,
            Math.ceil(document.documentElement.scrollWidth - window.innerWidth),
          ),
          visibleClippingCount: clippingSamples.length,
          clippingSamples,
          tinyTouchTargetCount: touchTargets.length,
          tinyTouchTargets: touchTargets,
          localizedLeakCount: localizedLeaks.length,
          localizedLeakSamples: localizedLeaks.slice(0, 12),
          visibleSupportSurfaceCount,
        },
      };
    },
    {
      expectedTitle: concept.title,
      selectors: requiredPositions,
      thresholds: conceptQualityThresholds,
      isMobile: Boolean(viewport.isMobile),
    },
  );

  if (!route.ok) {
    issues.push({
      code: "route_not_ok",
      severity: "error",
      detail: `${routePath} returned ${route.status ?? "no response"}.`,
    });
  }

  if (!metrics.h1.visible) {
    issues.push({ code: "missing_h1", severity: "error", detail: "No visible h1 found." });
  } else if (!metrics.h1.matchesTitle) {
    issues.push({
      code: "h1_title_mismatch",
      severity: "warning",
      detail: `Expected h1 to include "${concept.title}", saw "${metrics.h1.text}".`,
    });
  }

  for (const [key, position] of Object.entries(metrics.positions)) {
    if (!position.visible) {
      issues.push({
        code: missingPositionIssueCodes[key as keyof typeof requiredPositions],
        severity: key === "scene" ? "error" : "warning",
        detail: `${key} surface was not visible.`,
      });
    }
  }

  if (
    metrics.positions.scene.visible &&
    typeof metrics.positions.scene.y === "number" &&
    metrics.positions.scene.y > conceptQualityThresholds.firstViewportY
  ) {
    issues.push({
      code: "scene_below_first_view",
      severity: "error",
      detail: `Scene starts at y=${metrics.positions.scene.y}.`,
    });
  }

  if (metrics.metrics.horizontalOverflowPx > conceptQualityThresholds.maxHorizontalOverflowPx) {
    issues.push({
      code: "page_horizontal_overflow",
      severity: "error",
      detail: `Document is ${metrics.metrics.horizontalOverflowPx}px wider than the viewport.`,
    });
  }

  if (metrics.metrics.visibleClippingCount > conceptQualityThresholds.maxVisibleClippingSamples) {
    issues.push({
      code: "visible_clipping",
      severity: "warning",
      detail: `${metrics.metrics.visibleClippingCount} visible element(s) appear clipped.`,
    });
  }

  if (metrics.metrics.tinyTouchTargetCount > conceptQualityThresholds.maxTinyTouchTargets) {
    issues.push({
      code: "tiny_touch_target",
      severity: "warning",
      detail: `${metrics.metrics.tinyTouchTargetCount} visible touch target(s) are below 44px.`,
    });
  }

  if (metrics.metrics.localizedLeakCount > 0) {
    issues.push({
      code: "localized_text_leak",
      severity: "warning",
      detail: `${metrics.metrics.localizedLeakCount} visible i18n/raw-key leak sample(s) found on the English route.`,
    });
  }

  if (
    metrics.metrics.visibleSupportSurfaceCount >
    conceptQualityThresholds.maxDuplicateSupportSurfaces
  ) {
    issues.push({
      code: "duplicate_support_surfaces",
      severity: "warning",
      detail: `${metrics.metrics.visibleSupportSurfaceCount} support surfaces are visible in the first viewport.`,
    });
  }

  const interaction = viewport.isMobile
    ? await auditRepresentativeInteraction(page)
    : { status: "not-run", detail: "Representative interaction is only sampled on phone." };

  if (interaction.status === "failed") {
    issues.push({
      code: "interaction_failed",
      severity: "error",
      detail: interaction.detail,
    });
  }

  return {
    viewport,
    route,
    h1: metrics.h1,
    positions: metrics.positions,
    metrics: metrics.metrics,
    interaction,
    issues,
  };
}

function expectSimpleHarmonicMotionCoreSurfaces(
  report: {
    rows: Array<{
      slug: string;
      viewportAudits: Array<Awaited<ReturnType<typeof auditConceptViewport>>>;
    }>;
  },
) {
  const simpleHarmonicMotionRow = report.rows.find(
    (row) => row.slug === "simple-harmonic-motion",
  );

  if (!simpleHarmonicMotionRow) {
    return;
  }

  for (const audit of simpleHarmonicMotionRow.viewportAudits) {
    const missingSurfaces = Object.keys(requiredPositions).filter((surface) => {
      const position = audit.positions?.[surface as keyof typeof requiredPositions];

      return !position?.visible;
    });

    expect(
      missingSurfaces,
      `simple-harmonic-motion ${audit.viewport.name} should expose the durable concept bench surfaces`,
    ).toEqual([]);
  }
}

test("OML-QA-046 writes a durable all-concept quality matrix", async ({ browser }) => {
  const concepts = selectedConcepts();
  const rows = concepts.map((concept) => ({
    slug: concept.slug,
    title: concept.title,
    subject: concept.subject,
    topic: concept.topic,
    viewportAudits: [] as Awaited<ReturnType<typeof auditConceptViewport>>[],
  }));

  expect(concepts.length, "Expected the quality matrix to cover at least one concept slug.").toBeGreaterThan(0);

  for (const viewport of viewports) {
    let nextRowIndex = 0;

    await Promise.all(
      Array.from({ length: Math.min(auditConcurrency, rows.length) }, async () => {
        const context = await createContextForViewport(browser, viewport);

        try {
          const page = await context.newPage();
          const browserGuard = await installBrowserGuards(page);

          try {
            await installConceptBenchAuditState(page);
            await installDeterministicIdleCallback(page);

            while (nextRowIndex < rows.length) {
              const rowIndex = nextRowIndex;
              nextRowIndex += 1;

              const row = rows[rowIndex];
              const concept = concepts.find((entry) => entry.slug === row.slug);

              if (!concept) {
                continue;
              }

              await test.step(`${viewport.name} ${concept.slug}`, async () => {
                row.viewportAudits.push(await auditConceptViewport(page, concept, viewport));
              });
            }

            browserGuard.assertNoActionableIssues();
          } finally {
            await page.close();
          }
        } finally {
          await context.close();
        }
      }),
    );
  }

  const report = buildConceptQualityReport({
    generatedAt: new Date().toISOString(),
    command: "pnpm concepts:qa-matrix",
    catalogCount: (conceptsCatalog as ConceptCatalogEntry[]).filter((entry) => entry.published && entry.status !== "draft").length,
    thresholds: conceptQualityThresholds,
    viewports,
    rows,
  });
  const markdown = renderConceptQualityMatrixMarkdown(report);

  fs.mkdirSync(runDir, { recursive: true });
  fs.rmSync(latestDir, { recursive: true, force: true });
  fs.mkdirSync(latestDir, { recursive: true });

  for (const dir of [runDir, latestDir]) {
    fs.writeFileSync(
      path.join(dir, "concept-page-quality-matrix.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "concept-page-quality-matrix.md"),
      markdown,
      "utf8",
    );
  }

  console.log(`OML-QA-046 matrix: ${path.relative(process.cwd(), latestDir)}`);
  console.log(JSON.stringify(report.summary, null, 2));

  expect(report.auditedCount).toBe(concepts.length);
  expect(report.catalogCount).toBeGreaterThanOrEqual(97);

  const routeFailures = report.rows.flatMap((row: { slug: string; viewportAudits: Array<{ route: { ok: boolean; status: number | null }; viewport: { name: string } }> }) =>
    row.viewportAudits
      .filter((audit) => !audit.route.ok)
      .map((audit) => `${row.slug} ${audit.viewport.name} ${audit.route.status ?? "no response"}`),
  );
  expect(routeFailures, routeFailures.join("\n")).toEqual([]);
  expectSimpleHarmonicMotionCoreSurfaces(report);

  if (process.env.OML_QA_046_FAIL_ON_UNPASSED === "1") {
    assertConceptQualityGate(report);
  }

  assertRepresentativeInteractionCoverage(report);
  expect(baseURL).toMatch(/^http/);
});
