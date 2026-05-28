import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards, type BrowserGuard } from "./helpers";

type TargetFailure = {
  tag: string;
  role: string | null;
  label: string;
  width: number;
  height: number;
  ancestry: string;
};

const mobileConceptRoutes = [
  "/concepts/uniform-circular-motion",
  "/concepts/binary-search-halving-the-search-space",
  "/concepts/simple-harmonic-motion",
] as const;

const targetSelector = [
  "a[href]",
  "button",
  "[role='button']",
  "[role='tab']",
  "summary",
  "input[type='checkbox']",
  "input[type='range']",
  "select",
].join(",");

let browserGuard: BrowserGuard;

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

async function collectSmallVisibleTargets(page: Page): Promise<TargetFailure[]> {
  return page.locator(targetSelector).evaluateAll((elements) => {
    const viewportLimit = window.innerHeight * 1.5;

    function targetLabel(element: Element) {
      return (
        element.getAttribute("aria-label") ??
        element.getAttribute("title") ??
        element.textContent?.replace(/\s+/g, " ").trim() ??
        element.tagName.toLowerCase()
      );
    }

    function ancestryOf(element: Element) {
      const parts: string[] = [];
      let current: Element | null = element;

      while (current && parts.length < 4) {
        const id = current.id ? `#${current.id}` : "";
        const testId = current.getAttribute("data-testid");
        const testPart = testId ? `[data-testid="${testId}"]` : "";
        parts.push(`${current.tagName.toLowerCase()}${id}${testPart}`);
        current = current.parentElement;
      }

      return parts.join(" < ");
    }

    return elements
      .map((element): TargetFailure | null => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < viewportLimit &&
          rect.right > 0 &&
          rect.left < window.innerWidth;

        if (!visible) {
          return null;
        }

        const label = targetLabel(element);

        if (label === "Open Next.js Dev Tools") {
          return null;
        }

        if (rect.width >= 44 && rect.height >= 44) {
          return null;
        }

        return {
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute("role"),
          label,
          width: Number(rect.width.toFixed(1)),
          height: Number(rect.height.toFixed(1)),
          ancestry: ancestryOf(element),
        };
      })
      .filter((target): target is TargetFailure => target !== null);
  });
}

test("keeps first-screen mobile concept-page targets at the 44px touch floor", async ({
  page,
}) => {
  test.setTimeout(90_000);

  for (const route of mobileConceptRoutes) {
    await test.step(route, async () => {
      await gotoAndExpectOk(page, route);
      await expect(page.getByTestId("concept-live-lab")).toBeVisible();

      const failures = await collectSmallVisibleTargets(page);

      expect(
        failures,
        `${route} has visible interactive targets below 44px in the first 1.5 viewports:\n${JSON.stringify(failures, null, 2)}`,
      ).toEqual([]);
    });
  }
});
