import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

const qaArtifactDir = path.join(process.cwd(), "output", "playwright", "qa");

const viewports = [
  { name: "phone", width: 390, height: 844, mobileNav: true },
  { name: "tablet", width: 820, height: 1180, mobileNav: true },
  { name: "desktop", width: 1280, height: 900, mobileNav: false },
  { name: "wide", width: 1600, height: 960, mobileNav: false },
] as const;

const routeCases = [
  {
    surface: "account",
    path: "/account",
    session: "signed-in-free",
    labels: {
      en: "Account sections",
      "zh-HK": "帳戶段落",
    },
  },
  {
    surface: "dashboard",
    path: "/dashboard",
    session: "signed-in-free",
    labels: {
      en: "Dashboard sections",
      "zh-HK": "控制台段落",
    },
  },
  {
    surface: "analytics",
    path: "/dashboard/analytics",
    session: "signed-in-premium",
    labels: {
      en: "Analytics sections",
      "zh-HK": "分析區段",
    },
  },
] as const;

const locales = ["en", "zh-HK"] as const;

let browserGuard: BrowserGuard;

test.setTimeout(120_000);

async function saveQaScreenshot(page: Page, fileName: string) {
  await mkdir(qaArtifactDir, { recursive: true });
  await page.screenshot({ path: path.join(qaArtifactDir, fileName) });
}

function localizePath(locale: (typeof locales)[number], pathname: string) {
  return locale === "en" ? pathname : `/zh-HK${pathname}`;
}

async function expectVisibleSectionNavControlsAtLeast44(page: Page) {
  const failures = await page.locator("[data-page-section-frame]").evaluateAll((frames) =>
    frames.flatMap((frame) =>
      Array.from(
        frame.querySelectorAll<HTMLElement>("[data-page-section-nav-control]"),
      ).flatMap((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0;

        if (!visible || (rect.width >= 44 && rect.height >= 44)) {
          return [];
        }

        return [
          {
            text: element.innerText.trim() || element.getAttribute("aria-label") || element.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        ];
      }),
    ),
  );

  expect(failures).toEqual([]);
}

async function expectVisibleRailHeadingsNotClipped(page: Page) {
  const failures = await page.locator("[data-page-section-rail-heading]").evaluateAll((headings) =>
    headings.flatMap((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0;

      if (!visible) {
        return [];
      }

      const clipped =
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1;

      return clipped
        ? [
            {
              text: element.textContent?.trim() ?? "",
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              scrollWidth: element.scrollWidth,
              scrollHeight: element.scrollHeight,
              clientWidth: element.clientWidth,
              clientHeight: element.clientHeight,
            },
          ]
        : [];
    }),
  );

  expect(failures).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("OML-QA-061 keeps account, dashboard, and analytics section nav labels and targets usable", async ({
  page,
}) => {
  for (const locale of locales) {
    for (const routeCase of routeCases) {
      await setHarnessSession(page, routeCase.session);

      for (const viewport of viewports) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await gotoAndExpectOk(page, localizePath(locale, routeCase.path));

        const expectedLabel = routeCase.labels[locale];

        if (viewport.mobileNav) {
          const toggle = page.getByTestId("page-section-mobile-toggle");
          await expect(toggle).toBeVisible();
          await expect(toggle).toHaveText(expectedLabel);
          await expect(toggle).toHaveAttribute("aria-label", expectedLabel);

          if (locale === "zh-HK") {
            await expect(toggle).not.toHaveText("概念段落");
          }

          await expectVisibleSectionNavControlsAtLeast44(page);
          await saveQaScreenshot(
            page,
            `oml-qa-061-${locale}-${routeCase.surface}-${viewport.name}.png`,
          );

          await toggle.click();
          await expect(page.getByTestId("page-section-mobile-panel")).toBeVisible();
          await expectVisibleSectionNavControlsAtLeast44(page);
        } else {
          await expect(page.getByRole("navigation", { name: expectedLabel })).toBeVisible();
          await expect(page.locator("[data-page-section-rail-heading]")).toContainText(
            expectedLabel,
          );
          await expectVisibleSectionNavControlsAtLeast44(page);
          await expectVisibleRailHeadingsNotClipped(page);
          await saveQaScreenshot(
            page,
            `oml-qa-061-${locale}-${routeCase.surface}-${viewport.name}.png`,
          );
        }
      }
    }
  }
});
